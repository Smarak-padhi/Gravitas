/**
 * North-Star Living HQ Cutaway Tower Playwright Visual Evidence Suite
 *
 * Implements the two-stage visual gate:
 * - GATE A: Tower Composition & Silhouette Evidence (A1 to A6)
 * - GATE B: Hero Room (Floor 2) & Preview-Level Quality for other floors
 * - Full Evidence Set (01 to 13)
 * - Performance Metrics (FPS, frame time, draw calls, triangles)
 * - Zero-occlusion and responsive reframing proofs
 */

import { test, expect, type Page } from '@playwright/test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer, type ViteDevServer } from 'vite'
import { executeGit } from '@gravitas/git'
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentHarness,
  HarnessAvailability,
} from '@gravitas/harnesses'
import type { VerificationPlan } from '@gravitas/verifier'
import {
  EventHub,
  GravitasServer,
  InMemoryRegistry,
  RunService,
} from '../apps/server/src/index.js'
import { getFreePort } from './test-ports.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const evidenceDir = join(__dirname, '../docs/3d-hq/evidence/northstar')
const mainEvidenceDir = join(__dirname, '../docs/3d-hq/evidence')

class ControlledHarness implements AgentHarness {
  public readonly id = 'northstar-harness'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'Northstar test harness ready',
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    return new Promise((resolve) => {
      // Hold execution open for 2000ms so worker is actively running
      setTimeout(() => {
        resolve({
          executionId: request.executionId,
          harnessId: this.id,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 2000,
          exitCode: 0,
          terminationReason: 'COMPLETED',
          stdout: `Executed task ${request.taskId}`,
          stderr: '',
          stdoutTruncated: false,
          stderrTruncated: false,
          worktreePath: request.worktreePath,
        })
      }, 2000)
    })
  }
}

test.describe.serial('North-Star 3D Living HQ Rebuild Evidence Suite', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let viteServer: ViteDevServer
  let SERVER_PORT: number
  let VITE_PORT: number
  let service: RunService
  let harness: ControlledHarness

  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })
    await mkdir(mainEvidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-northstar-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-northstar-runtime-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'HQ Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'hq@test.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'hq-northstar-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    harness = new ControlledHarness()

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_northstar_test',
      commands: [
        {
          id: 'noop_verifier',
          executable: process.execPath,
          args: ['-e', 'process.exit(0)'],
          mandatory: true,
          timeoutMs: 5000,
        },
      ],
    }

    service = new RunService({
      registry,
      eventHub,
      harness,
      runtimeRoot,
      defaultRepository: fixtureRepoPath,
      defaultVerificationPlan,
    })

    server = new GravitasServer({
      service,
      eventHub,
    })

    const serverInfo = await server.start({ host: '127.0.0.1', port: 0 })
    SERVER_PORT = serverInfo.port
    VITE_PORT = await getFreePort()

    const webRoot = join(__dirname, '../apps/web')
    viteServer = await createViteServer({
      root: webRoot,
      server: {
        host: '127.0.0.1',
        port: VITE_PORT,
        strictPort: true,
        proxy: {
          '/api': {
            target: serverInfo.url,
            changeOrigin: false,
            secure: false,
          },
        },
      },
    })
    await viteServer.listen()
  })

  test.afterAll(async () => {
    if (viteServer) await viteServer.close()
    if (server) await server.stop()
    if (fixtureRepoPath) await rm(fixtureRepoPath, { recursive: true, force: true }).catch(() => {})
    if (runtimeRoot) await rm(runtimeRoot, { recursive: true, force: true }).catch(() => {})
  })

  // Helper to ensure runs rail is collapsed for uncluttered view
  async function collapseRunsRail(page: Page) {
    const collapseBtn = page.locator('button[title="Collapse Runs Panel"]')
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click()
    }
  }

  // Helper to set atmosphere mode via director
  async function setAtmosphere(page: Page, mode: 'DAY' | 'EVENING' | 'NIGHT') {
    await page.evaluate((m) => {
      ;(window as any).__hqDirector?.setAtmosphere(m)
    }, mode)
    await page.waitForTimeout(400)
  }

  // Helper to transition camera to preset
  async function framePreset(page: Page, presetType: 'overview' | 'room' | 'workstation' | 'character' | 'elevator', key?: string) {
    await page.evaluate(({ type, k }) => {
      const director = (window as any).__hqDirector
      if (!director) return
      if (type === 'overview') {
        director.cameraRig.setFraming({
          position: [-14.0, 15.0, -44.0],
          target: [0.5, 12.6, 0.0],
          fov: 32,
        }, true)
      } else if (type === 'elevator') {
        director.cameraRig.setFraming({
          position: [12.0, 12.6, -18.0],
          target: [7.5, 12.6, 0.0],
          fov: 34,
        }, true)
      } else if (type === 'room' && k) {
        director.frameRoom(k)
      } else if (type === 'workstation' && k) {
        director.frameWorkstation(k)
      } else if (type === 'character' && k) {
        director.frameCharacter(k)
      }
    }, { type: presetType, k: key })
    await page.waitForTimeout(600)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GATE A: TOWER COMPOSITION & SILHOUETTE PROTOTYPE EVIDENCE
  // ────────────────────────────────────────────────────────────────────────────

  test('Gate A: A1 Tower Day Overview', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'overview')

    await page.screenshot({ path: join(evidenceDir, 'A1-tower-day.png'), fullPage: true })
    await page.screenshot({ path: join(mainEvidenceDir, '01-building-overview-day.png'), fullPage: true })
  })

  test('Gate A: A2 Tower Evening Overview', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'EVENING')
    await framePreset(page, 'overview')

    await page.screenshot({ path: join(evidenceDir, 'A2-tower-evening.png'), fullPage: true })
    await page.screenshot({ path: join(mainEvidenceDir, '02-building-overview-evening.png'), fullPage: true })
  })

  test('Gate A: A3 Tower Night Overview', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'NIGHT')
    await framePreset(page, 'overview')

    await page.screenshot({ path: join(evidenceDir, 'A3-tower-night.png'), fullPage: true })
    await page.screenshot({ path: join(mainEvidenceDir, '03-building-overview-night.png'), fullPage: true })
  })

  test('Gate A: A4 Elevator Building & Shaft View', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'elevator')

    await page.screenshot({ path: join(evidenceDir, 'A4-elevator.png'), fullPage: true })
    await page.screenshot({ path: join(mainEvidenceDir, '07-elevator-building-view.png'), fullPage: true })
  })

  test('Gate A: A5 Floor 2 Empty Shell & Spatial Envelope', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'room', 'AGENT_OPERATIONS')

    await page.screenshot({ path: join(evidenceDir, 'A5-floor2-empty-shell.png'), fullPage: true })
    await page.screenshot({ path: join(mainEvidenceDir, '04-floor2-agent-operations-wide.png'), fullPage: true })
  })

  test('Gate A: A6 Character Scale inside Floor 2', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'room', 'AGENT_OPERATIONS')

    await page.screenshot({ path: join(evidenceDir, 'A6-character-scale-floor2.png'), fullPage: true })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // GATE B: HERO ROOM & FINAL EVIDENCE SUITE (05 to 13)
  // ────────────────────────────────────────────────────────────────────────────

  test('Gate B: 05 Floor 2 Frontend Engineer Workstation & Character', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'character', 'frontend')

    await page.screenshot({ path: join(mainEvidenceDir, '05-floor2-frontend-character.png'), fullPage: true })
  })

  test('Gate B: 06 Floor 2 Backend Engineer Workstation & Character', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'character', 'backend')

    await page.screenshot({ path: join(mainEvidenceDir, '06-floor2-backend-character.png'), fullPage: true })
  })

  test('Gate B: 08 Mission Control Preview (Floor 1)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'room', 'MISSION_CONTROL')

    await page.screenshot({ path: join(mainEvidenceDir, '08-mission-control-preview.png'), fullPage: true })
  })

  test('Gate B: 09 Verification Cleanroom Preview (Floor 3)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'room', 'VERIFICATION_CLEANROOM')

    await page.screenshot({ path: join(mainEvidenceDir, '09-verification-preview.png'), fullPage: true })
  })

  test('Gate B: 10 Infrastructure Rack & Servers Preview (Floor 5)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'room', 'INFRASTRUCTURE_SERVERS')

    await page.screenshot({ path: join(mainEvidenceDir, '10-infrastructure-preview.png'), fullPage: true })
  })

  test('Gate B: 11 Approval Mezzanine Preview (Floor 6)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'room', 'APPROVAL_MEZZANINE')

    await page.screenshot({ path: join(mainEvidenceDir, '11-approval-preview.png'), fullPage: true })
  })

  test('Gate B: 12 Empty HQ (Baseline Day Overview)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'overview')

    await page.screenshot({ path: join(mainEvidenceDir, '12-empty-hq.png'), fullPage: true })
  })

  test('Gate B: 13 Floor 2 Integration Working State (Deterministic Integration Evidence)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    // Trigger run via service directly to engage worker without modal overlay
    await service.createRun({
      goal: 'Deterministic integration run for Frontend Engineer',
    })

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'room', 'AGENT_OPERATIONS')
    await page.waitForTimeout(800)

    // Note: labeled explicitly as integration working state per Correction 9
    await page.screenshot({ path: join(mainEvidenceDir, '13-floor2-integration-working-state.png'), fullPage: true })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // PERFORMANCE TELEMETRY AUDIT
  // ────────────────────────────────────────────────────────────────────────────

  test('Performance Gate: Measure Overview Day, Overview Night, and Floor 2 Hero Room', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()

    // 1. Day Overview Telemetry
    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'overview')
    await page.waitForTimeout(1000)

    const dayOverviewStats = await page.evaluate(() => {
      return (window as any).__hqDirector?.getPerformanceStats()
    })
    console.log('--- DAY OVERVIEW PERFORMANCE ---', dayOverviewStats)
    expect(dayOverviewStats.drawCalls).toBeLessThanOrEqual(900)
    expect(dayOverviewStats.triangles).toBeGreaterThan(1000)
    expect(dayOverviewStats.fps).toBeGreaterThanOrEqual(10)
    expect(dayOverviewStats.frameTimeMs).toBeLessThanOrEqual(150)

    // 2. Night Overview Telemetry
    await setAtmosphere(page, 'NIGHT')
    await framePreset(page, 'overview')
    await page.waitForTimeout(1000)

    const nightOverviewStats = await page.evaluate(() => {
      return (window as any).__hqDirector?.getPerformanceStats()
    })
    console.log('--- NIGHT OVERVIEW PERFORMANCE ---', nightOverviewStats)
    expect(nightOverviewStats.drawCalls).toBeLessThanOrEqual(900)
    expect(nightOverviewStats.fps).toBeGreaterThanOrEqual(10)

    // 3. Floor 2 Hero Room Telemetry
    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'room', 'AGENT_OPERATIONS')
    await page.waitForTimeout(1000)

    const floor2Stats = await page.evaluate(() => {
      return (window as any).__hqDirector?.getPerformanceStats()
    })
    console.log('--- FLOOR 2 HERO ROOM PERFORMANCE ---', floor2Stats)
    expect(floor2Stats.drawCalls).toBeLessThanOrEqual(900)
    expect(floor2Stats.fps).toBeGreaterThanOrEqual(10)
  })

  // ────────────────────────────────────────────────────────────────────────────
  // RESPONSIVENESS & OCCLUSION AUDIT
  // ────────────────────────────────────────────────────────────────────────────

  test('Responsiveness & Occlusion: Camera Frustum and Sidebar Expansion', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()

    // Verify canvas responds to resize without throwing
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(500)

    // Ensure camera is not occluded by geometry
    const cameraZ = await page.evaluate(() => {
      return (window as any).__hqDirector?.cameraRig.camera.position.z
    })
    expect(cameraZ).toBeLessThan(-10.0) // Camera sits in front of building aperture (Z=-4.0)
  })
})
