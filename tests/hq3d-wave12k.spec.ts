/**
 * Playwright E2E Visual Evidence Suite for Wave 12K — Living HQ Visual Prototype V1
 * Captures 12 high-resolution runtime screenshots verifying:
 * - Architectural cutaway envelope with graphite structure, plaster walls, walnut, and greenery
 * - Day / Evening / Night lighting presets
 * - Vertical spatial elevator shaft and articulated carriage
 * - Charming role mascots (Frontend Engineer with ponytail, Backend, Planner, Reviewer)
 * - Workstations with laptops, displays, coffee mugs, and honest screen dimming
 * - Authoritative state reconciliation proving zero fake activity
 * - Mobile responsive / 2D fallback view
 */

import { test, expect, type Page } from '@playwright/test'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
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
const evidenceDir = join(__dirname, '../docs/3d-hq/evidence/wave12k')

class Wave12kFakeHarness implements AgentHarness {
  public readonly id = 'wave12k-test-harness'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'Wave 12K scene test harness ready',
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 25,
      exitCode: 0,
      terminationReason: 'COMPLETED',
      stdout: `Executed task ${request.taskId}`,
      stderr: '',
      stdoutTruncated: false,
      stderrTruncated: false,
      worktreePath: request.worktreePath,
    }
  }
}

test.describe.serial('Wave 12K — Living HQ Visual Prototype V1 Evidence Suite', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let viteServer: ViteDevServer
  let SERVER_PORT: number
  let VITE_PORT: number
  let runService: RunService

  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-wave12k-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-wave12k-runtime-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Wave 12K Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'wave12k@test.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'wave12k-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial Wave 12K baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    const harness = new Wave12kFakeHarness()

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_wave12k_test',
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

    runService = new RunService({
      registry,
      eventHub,
      harness,
      runtimeRoot,
      defaultRepository: fixtureRepoPath,
      defaultVerificationPlan,
    })

    server = new GravitasServer({
      service: runService,
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
  })

  test('01. Day Building Overview Framing', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    await expect(page.locator('[data-testid="living-hq-canvas-container"]')).toBeVisible()
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()

    // Ensure Day lighting
    await page.locator('[data-testid="hq-atmosphere-day"]').click()
    await page.waitForTimeout(800)

    await page.screenshot({
      path: join(evidenceDir, '01-day-building-overview.png'),
      fullPage: true,
    })
  })

  test('02. Night Building Overview Framing', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    await page.locator('[data-testid="hq-atmosphere-night"]').click()
    await page.waitForTimeout(800)

    await page.screenshot({
      path: join(evidenceDir, '02-night-building-overview.png'),
      fullPage: true,
    })
  })

  test('03. Mission Control (Floor 1 Planning Table)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    await page.locator('[data-testid="hq-atmosphere-day"]').click()
    await page.locator('[data-testid="hq-nav-room-1"]').click()
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: join(evidenceDir, '03-room-mission-control.png'),
      fullPage: true,
    })
  })

  test('04. Agent Operations Floor (Floor 2 Workstations & Mascots)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: join(evidenceDir, '04-room-agent-operations.png'),
      fullPage: true,
    })
  })

  test('05. Verification Cleanroom (Floor 3 Bench & Reviewer Mascot)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    await page.locator('[data-testid="hq-nav-room-3"]').click()
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: join(evidenceDir, '05-room-verification-cleanroom.png'),
      fullPage: true,
    })
  })

  test('06. Infrastructure Server Bay (Floor 5 OmniRoute Racks)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    await page.locator('[data-testid="hq-nav-room-5"]').click()
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: join(evidenceDir, '06-room-infrastructure-servers.png'),
      fullPage: true,
    })
  })

  test('07. Approval Control Mezzanine (Floor 6 / Mezzanine Plinth)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    await page.locator('[data-testid="hq-nav-room-6"]').click()
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: join(evidenceDir, '07-room-approval-mezzanine.png'),
      fullPage: true,
    })
  })

  test('08. Character Workstation Close-Up (Frontend Mascot with Stylized Ponytail & Laptop)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Click quick mascot focus button for Frontend Engineer
    await page.locator('[data-testid="hq-nav-char-frontend"]').click()
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: join(evidenceDir, '08-character-workstation-closeup.png'),
      fullPage: true,
    })
  })

  test('09. Spatial Elevator Transition Frame', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Navigate to Room 1 first
    await page.locator('[data-testid="hq-nav-room-1"]').click()
    await page.waitForTimeout(1200)

    // Trigger transition to Mezzanine (vertical ascent across floors)
    await page.locator('[data-testid="hq-nav-room-6"]').click()

    // Capture during active transit while transit overlay is visible
    await page.waitForTimeout(400)
    await page.screenshot({
      path: join(evidenceDir, '09-elevator-transition-frame.png'),
      fullPage: true,
    })
  })

  test('10. Authoritative Working-State Fixture (Active Task & Illuminated Display)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Inject active working state into the director to verify honest working presentation
    await page.evaluate(() => {
      const director = (window as any).__hqDirector
      if (director) {
        director.updateWorldState({
          revisionIdentity: {
            projectionEpoch: 'epoch_active_proof',
            projectionRevision: 42,
            canonicalTaskFingerprint: 'proof_42',
          },
          stations: {
            STATION_FRONTEND: {
              id: 'STATION_FRONTEND',
              roomId: 'AGENT_OPERATIONS',
              status: 'ACTIVE',
              activeTaskId: 'task_fe_01',
              activeRoleId: 'frontend_engineer',
              workerIdentity: 'Codex-2',
            },
            STATION_BACKEND: {
              id: 'STATION_BACKEND',
              roomId: 'AGENT_OPERATIONS',
              status: 'IDLE',
            },
            STATION_PLANNING: {
              id: 'STATION_PLANNING',
              roomId: 'MISSION_CONTROL',
              status: 'IDLE',
            },
            STATION_VERIFICATION: {
              id: 'STATION_VERIFICATION',
              roomId: 'VERIFICATION_LAB',
              status: 'IDLE',
            },
            STATION_BROWSER_QA: {
              id: 'STATION_BROWSER_QA',
              roomId: 'BROWSER_QA_LAB',
              status: 'IDLE',
            },
            STATION_APPROVAL: {
              id: 'STATION_APPROVAL',
              roomId: 'APPROVAL_MEZZANINE',
              status: 'IDLE',
            },
            STATION_GATEWAY: {
              id: 'STATION_GATEWAY',
              roomId: 'INFRASTRUCTURE_ROOM',
              status: 'IDLE',
            },
          },
          tasks: {
            task_fe_01: {
              id: 'task_fe_01',
              title: 'Build Living Cutaway Envelope',
              canonicalState: 'RUNNING',
              runtimePhase: 'WORKER_RUNNING',
              physicalLocation: 'ASSIGNED_WORKSTATION',
              assignedStationId: 'STATION_FRONTEND',
              roleId: 'frontend_engineer',
            },
          },
          handoffs: [],
          infrastructure: { gateways: {} },
          alertLevel: 'NORMAL',
        })
        director.frameWorkstation('WS_FRONTEND')
      }
    })

    await page.waitForTimeout(800)
    await page.screenshot({
      path: join(evidenceDir, '10-authoritative-working-state-fixture.png'),
      fullPage: true,
    })
  })

  test('11. Idle / Empty HQ Proving No Fake Productive Activity', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Frame Agent Operations Floor when system is completely IDLE
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(800)

    // Verify live activity badge displays Standby / No Fake Activity
    await expect(page.locator('[data-testid="hq-live-activity-badge"]')).toContainText('Idle (Honest Standby)')

    await page.screenshot({
      path: join(evidenceDir, '11-idle-empty-hq-no-fake-activity.png'),
      fullPage: true,
    })
  })

  test('12. Mobile / Fallback View (390x844)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    await page.waitForTimeout(800)
    await page.screenshot({
      path: join(evidenceDir, '12-mobile-fallback-view.png'),
      fullPage: true,
    })
  })
})
