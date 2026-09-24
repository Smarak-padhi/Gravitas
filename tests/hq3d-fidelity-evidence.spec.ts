/**
 * Wave 12F: North-Star Visual Fidelity Proof Playwright Evidence Suite
 * "One Bay Before The Building"
 *
 * Captures all 12 authoritative screenshot proofs into docs/3d-hq/evidence/12f-fidelity/:
 * 01-before-floor2-wide.png (copied baseline from ae98c4f)
 * 02-after-floor2-wide-day.png
 * 03-frontend-bay-day.png
 * 04-frontend-character-medium.png
 * 05-frontend-workstation-detail.png
 * 06-frontend-bay-evening.png
 * 07-frontend-bay-night-idle.png
 * 08-backend-vs-frontend-comparison.png
 * 09-building-overview-after.png
 * 10-1366x768-floor2.png
 * 11-reduced-motion.png
 * 12-runtime-working-state.png (DETERMINISTIC_INTEGRATION)
 *
 * Audits performance before and after at identical deterministic camera angles.
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
const evidenceDir = join(__dirname, '../docs/3d-hq/evidence/12f-fidelity')

class Wave12fControlledHarness implements AgentHarness {
  public readonly id = 'wave12f-fidelity-harness'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'Wave 12F fidelity test harness ready',
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    return new Promise((resolve) => {
      // Hold execution open for 3000ms so worker is actively running in DETERMINISTIC_INTEGRATION mode
      setTimeout(() => {
        resolve({
          executionId: request.executionId,
          harnessId: this.id,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 3000,
          exitCode: 0,
          terminationReason: 'COMPLETED',
          stdout: `Executed task ${request.taskId}`,
          stderr: '',
          stdoutTruncated: false,
          stderrTruncated: false,
          worktreePath: request.worktreePath,
        })
      }, 3000)
    })
  }
}

test.describe.serial('Wave 12F: North-Star Visual Fidelity Proof Suite', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let viteServer: ViteDevServer
  let SERVER_PORT: number
  let VITE_PORT: number
  let service: RunService
  let harness: Wave12fControlledHarness

  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-w12f-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-w12f-runtime-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'HQ Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'hq@test.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'hq-w12f-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    harness = new Wave12fControlledHarness()

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_w12f_test',
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

  async function collapseRunsRail(page: Page) {
    const collapseBtn = page.locator('button[title="Collapse Runs Panel"]')
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click()
    }
  }

  async function setAtmosphere(page: Page, mode: 'DAY' | 'EVENING' | 'NIGHT') {
    const testId = `hq-atmosphere-${mode.toLowerCase()}`
    const btn = page.locator(`[data-testid="${testId}"]`)
    if (await btn.isVisible()) {
      await btn.click()
    } else {
      await page.evaluate((m) => {
        ;(window as any).__hqDirector?.setAtmosphere(m)
      }, mode)
    }
    await page.waitForTimeout(500)
  }

  async function setFraming(
    page: Page,
    target: [number, number, number],
    position: [number, number, number],
    instant = true
  ) {
    await page.evaluate(
      ({ tgt, pos, snap }) => {
        const rig = (window as any).__hqDirector?.cameraRig
        if (rig) {
          rig.setFraming(
            {
              name: 'w12f-custom',
              target: tgt,
              position: pos,
            },
            snap
          )
        }
      },
      { tgt: target, pos: position, snap: instant }
    )
    await page.waitForTimeout(500)
  }

  // Helper to transition camera to preset
  async function framePreset(
    page: Page,
    presetType: 'overview' | 'room' | 'workstation' | 'character' | 'elevator',
    key?: string
  ) {
    await page.evaluate(
      ({ type, k }) => {
        const director = (window as any).__hqDirector
        if (!director) return
        if (type === 'overview') {
          director.cameraRig.setFraming(
            {
              position: [-14.0, 15.0, -44.0],
              target: [0.5, 12.6, 0.0],
              fov: 32,
            },
            true
          )
        } else if (type === 'room' && k) {
          director.frameRoom(k)
        } else if (type === 'workstation' && k) {
          director.frameWorkstation(k)
        } else if (type === 'character' && k) {
          director.frameCharacter(k)
        }
      },
      { type: presetType, k: key }
    )
    await page.waitForTimeout(600)
  }

  test('02-after-floor2-wide-day: Floor 2 Wide Overview (Day)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'room', 'AGENT_OPERATIONS')

    await page.screenshot({ path: join(evidenceDir, '02-after-floor2-wide-day.png'), fullPage: true })
  })

  test('03-frontend-bay-day: Frontend Engineer Hero Bay (Day)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'workstation', 'frontend')

    await page.screenshot({ path: join(evidenceDir, '03-frontend-bay-day.png'), fullPage: true })
  })

  test('04-frontend-character-medium: Frontend Character Medium Shot', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    // Three-quarter side profile framing from center of Floor 2
    await setFraming(page, [-3.5, 8.15, 0.85], [0.0, 8.55, 0.95])

    await page.screenshot({ path: join(evidenceDir, '04-frontend-character-medium.png'), fullPage: true })
  })

  test('05-frontend-workstation-detail: Workstation Detail Shot', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    // Elevated high-angle three-quarter perspective showcasing beveled oak desk, keyboard, mouse, tablet, monitors, lamp, mug
    await setFraming(page, [-3.5, 7.85, 0.6], [0.0, 9.4, 0.85])

    await page.screenshot({ path: join(evidenceDir, '05-frontend-workstation-detail.png'), fullPage: true })
  })

  test('06-frontend-bay-evening: Frontend Engineer Hero Bay (Evening)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'EVENING')
    await framePreset(page, 'workstation', 'frontend')

    await page.screenshot({ path: join(evidenceDir, '06-frontend-bay-evening.png'), fullPage: true })
  })

  test('07-frontend-bay-night-idle: Frontend Engineer Hero Bay (Night Idle)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'NIGHT')
    await framePreset(page, 'workstation', 'frontend')

    await page.screenshot({ path: join(evidenceDir, '07-frontend-bay-night-idle.png'), fullPage: true })
  })

  test('08-backend-vs-frontend-comparison: Backend vs Frontend Comparison', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    // Shot framing both frontend and backend workstations side by side
    await setFraming(page, [0.0, 8.2, 0.6], [-2.0, 9.6, -7.5])

    await page.screenshot({ path: join(evidenceDir, '08-backend-vs-frontend-comparison.png'), fullPage: true })
  })

  test('09-building-overview-after: Full Building Overview After Hero Bay Integration', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'overview')

    await page.screenshot({ path: join(evidenceDir, '09-building-overview-after.png'), fullPage: true })
  })

  test('10-1366x768-floor2: Responsive 1366x768 Viewport on Floor 2', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'room', 'AGENT_OPERATIONS')

    await page.screenshot({ path: join(evidenceDir, '10-1366x768-floor2.png'), fullPage: true })
  })

  test('11-reduced-motion: Accessibility Reduced Motion Mode', async ({ page }: { page: Page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    await setAtmosphere(page, 'DAY')
    await framePreset(page, 'workstation', 'frontend')

    await page.screenshot({ path: join(evidenceDir, '11-reduced-motion.png'), fullPage: true })
  })

  test('12-runtime-working-state: Deterministic Integration Working State', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await collapseRunsRail(page)

    // Trigger run via service directly to engage worker without modal overlay
    await service.createRun({
      goal: 'Deterministic integration run for Frontend Engineer',
    })

    await setAtmosphere(page, 'DAY')
    // Elevated three-quarter perspective where active IDE screens, indicators, and desk are clearly visible
    await setFraming(page, [-3.5, 7.85, 0.6], [0.0, 9.4, 0.85])
    await page.waitForTimeout(1000)

    // Labeled DETERMINISTIC_INTEGRATION
    await page.screenshot({ path: join(evidenceDir, '12-runtime-working-state.png'), fullPage: true })
  })

  test('Performance Telemetry: Record After Metrics at Identical Camera', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()

    // 1. Day Overview Telemetry
    await setAtmosphere(page, 'DAY')
    await setFraming(page, [0.0, 10.5, 0.0], [0.0, 14.5, -21.0])
    await page.waitForTimeout(1000)

    const dayOverviewStats = await page.evaluate(() => {
      return (window as any).__hqDirector?.getPerformanceStats()
    })
    console.log('--- W12F AFTER DAY OVERVIEW PERFORMANCE ---', JSON.stringify(dayOverviewStats))

    // 2. Floor 2 Wide Telemetry
    await setFraming(page, [0.0, 7.8, 0.0], [0.0, 9.6, -9.2])
    await page.waitForTimeout(1000)

    const floor2Stats = await page.evaluate(() => {
      return (window as any).__hqDirector?.getPerformanceStats()
    })
    console.log('--- W12F AFTER FLOOR 2 HERO ROOM PERFORMANCE ---', JSON.stringify(floor2Stats))

    // 3. Frontend Bay Detail Telemetry
    await setFraming(page, [-3.5, 7.9, 0.7], [-2.1, 8.85, -2.2])
    await page.waitForTimeout(1000)

    const frontendBayStats = await page.evaluate(() => {
      return (window as any).__hqDirector?.getPerformanceStats()
    })
    console.log('--- W12F AFTER FRONTEND HERO BAY PERFORMANCE ---', JSON.stringify(frontendBayStats))
  })
})
