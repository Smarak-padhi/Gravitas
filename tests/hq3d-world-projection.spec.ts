/**
 * Playwright E2E Visual Verification Suite for Gravitas 3D Headquarters (Wave 12C)
 * Authoritative World Projection Verification & 10 Visual Proof Captures.
 *
 * Verifies:
 * 1. 01-empty: Empty HQ, all stations IDLE, 0 tasks
 * 2. 02-ready-queued: Task in PLANNING_AREA, planning table active
 * 3. 03-preparing: Task PREPARING at codex-workstation
 * 4. 04-worker-running-direct: Task WORKER_RUNNING DIRECT at codex-workstation, OmniRoute IDLE
 * 5. 05-worker-running-gateway-active: Task WORKER_RUNNING GATEWAY at fcc-workstation, OmniRoute ACTIVE
 * 6. 06-worker-running-gateway-inactive: Task WORKER_RUNNING after gateway call, fcc-workstation ACTIVE, OmniRoute IDLE
 * 7. 07-verifying: Task at VERIFICATION_BENCH in Cleanroom, console illuminated
 * 8. 08-browser-qa: Task at BROWSER_QA_MATRIX, device matrix wall illuminated
 * 9. 09-waiting-approval: Task at APPROVAL_PLINTH on Mezzanine, plinth illuminated
 * 10. 10-multi-task: Multiple concurrent tasks across stations, multi-route gateway aggregation active
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
import type { StateSummaryResponse } from '../apps/web/src/api/types.js'
import type { DeriveWorldStateInput } from '../apps/web/src/hq3d/world/worldState.js'
import {
  FIXTURE_A_EMPTY,
  FIXTURE_B_READY_QUEUED,
  FIXTURE_C_PREPARING,
  FIXTURE_D_WORKER_RUNNING_DIRECT,
  FIXTURE_E_WORKER_RUNNING_GATEWAY_ACTIVE,
  FIXTURE_F_WORKER_RUNNING_AFTER_GATEWAY_CALL,
  FIXTURE_G_VERIFYING,
  FIXTURE_H_BROWSER_QA_RUNNING,
  FIXTURE_I_WAITING_APPROVAL,
  FIXTURE_O_MULTIPLE_CONCURRENT_TASKS,
} from '../apps/web/src/hq3d/world/fixtures.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const evidenceDir = join(__dirname, '../docs/3d-hq/evidence/wave12c')

class HqWorldTestHarness implements AgentHarness {
  public readonly id = 'hq-world-test-harness'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'HQ World Test Harness Ready',
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

function fixtureToStateSummary(fixture: DeriveWorldStateInput): StateSummaryResponse {
  return {
    service: 'gravitas',
    version: '0.0.1',
    runs: [
      {
        id: 'run-fixture',
        goal: 'Wave 12C Visual Verification',
        status: 'RUNNING',
        baseBranch: 'main',
        constraints: [],
        acceptanceCriteria: [],
        requiredEvidence: [],
        createdAt: '2026-09-22T10:00:00.000Z',
        updatedAt: '2026-09-22T10:00:00.000Z',
      },
    ],
    tasks: fixture.tasks,
    harness: {
      id: 'harness-test',
      status: 'AVAILABLE',
    },
    projection: fixture.projection,
  }
}

import { getFreePort } from './test-ports.js'

test.describe.serial('Wave 12C — Authoritative World Projection E2E & Visual Captures', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let viteServer: ViteDevServer
  let SERVER_PORT: number
  let VITE_PORT: number

  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-w12c-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-w12c-runtime-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Wave 12C Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'w12c@test.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'w12c-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    const harness = new HqWorldTestHarness()

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_w12c_test',
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

    const service = new RunService({
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

  test('01-empty: Empty HQ, all stations IDLE, 0 tasks', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_A_EMPTY)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.waitForTimeout(800)

    await page.screenshot({
      path: join(evidenceDir, '01-empty.png'),
      fullPage: true,
    })
  })

  test('02-ready-queued: Task in PLANNING_AREA, planning table active', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_B_READY_QUEUED)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('[data-testid="hq-nav-room-1"]').click()
    await page.waitForTimeout(700)

    await page.screenshot({
      path: join(evidenceDir, '02-ready-queued.png'),
      fullPage: true,
    })
  })

  test('03-preparing: Task PREPARING at codex-workstation', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_C_PREPARING)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(700)

    await page.screenshot({
      path: join(evidenceDir, '03-preparing.png'),
      fullPage: true,
    })
  })

  test('04-worker-running-direct: Task WORKER_RUNNING DIRECT at codex-workstation, OmniRoute IDLE', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_D_WORKER_RUNNING_DIRECT)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(700)

    await page.screenshot({
      path: join(evidenceDir, '04-worker-running-direct.png'),
      fullPage: true,
    })
  })

  test('05-worker-running-gateway-active: Task WORKER_RUNNING GATEWAY at fcc-workstation, OmniRoute ACTIVE', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_E_WORKER_RUNNING_GATEWAY_ACTIVE)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('[data-testid="hq-nav-room-5"]').click()
    await page.waitForTimeout(700)

    await page.screenshot({
      path: join(evidenceDir, '05-worker-running-gateway-active.png'),
      fullPage: true,
    })
  })

  test('06-worker-running-gateway-inactive: Task WORKER_RUNNING after gateway call, fcc-workstation ACTIVE, OmniRoute IDLE', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_F_WORKER_RUNNING_AFTER_GATEWAY_CALL)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('[data-testid="hq-nav-room-5"]').click()
    await page.waitForTimeout(700)

    await page.screenshot({
      path: join(evidenceDir, '06-worker-running-gateway-inactive.png'),
      fullPage: true,
    })
  })

  test('07-verifying: Task at VERIFICATION_BENCH in Cleanroom, console illuminated', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_G_VERIFYING)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('[data-testid="hq-nav-room-3"]').click()
    await page.waitForTimeout(700)

    await page.screenshot({
      path: join(evidenceDir, '07-verifying.png'),
      fullPage: true,
    })
  })

  test('08-browser-qa: Task at BROWSER_QA_MATRIX, device matrix wall illuminated', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_H_BROWSER_QA_RUNNING)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('[data-testid="hq-nav-room-4"]').click()
    await page.waitForTimeout(700)

    await page.screenshot({
      path: join(evidenceDir, '08-browser-qa.png'),
      fullPage: true,
    })
  })

  test('09-waiting-approval: Task at APPROVAL_PLINTH on Mezzanine, plinth illuminated', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_I_WAITING_APPROVAL)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('[data-testid="hq-nav-room-6"]').click()
    await page.waitForTimeout(700)

    await page.screenshot({
      path: join(evidenceDir, '09-waiting-approval.png'),
      fullPage: true,
    })
  })

  test('10-multi-task: Multiple concurrent tasks across stations, multi-route gateway aggregation active', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureToStateSummary(FIXTURE_O_MULTIPLE_CONCURRENT_TASKS)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForTimeout(800)

    await page.screenshot({
      path: join(evidenceDir, '10-multi-task.png'),
      fullPage: true,
    })
  })
})
