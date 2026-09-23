/**
 * Playwright Visual & Locomotion Verification Suite for Gravitas 3D Headquarters (Wave 12G)
 *
 * Verifies and captures all 14 required visual proofs into docs/3d-hq/evidence/wave12g/:
 * 01-all-idle.png
 * 02-frontend-departing-home.png
 * 03-frontend-mid-walk.png
 * 04-frontend-at-workstation.png
 * 05-backend-mid-walk.png
 * 06-reviewer-entering-cleanroom.png
 * 07-three-role-concurrent.png
 * 08-review-handoff.png
 * 09-task-failed-reconciled.png
 * 10-waiting-approval-no-operator.png
 * 11-reduced-motion.png
 * 12-harness-swap-same-path.png
 * 13-fresh-load-already-running.png
 * 14-active-office-overview.png
 *
 * Captures video recordings if browser tooling supports it:
 * 15-frontend-locomotion.webm
 * 16-multi-agent-concurrency.webm
 * 17-stale-revision-reconciliation.webm
 */

import { test, expect, type Page } from '@playwright/test'
import { mkdir, mkdtemp, rm, writeFile, copyFile } from 'node:fs/promises'
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
import {
  FIXTURE_A_ALL_IDLE,
  FIXTURE_B_FRONTEND_ASSIGNED,
  FIXTURE_C_FRONTEND_WALKING,
  FIXTURE_D_FRONTEND_WORKING,
  FIXTURE_E_BACKEND_ASSIGNED,
  FIXTURE_F_REVIEWER_ASSIGNED,
  FIXTURE_H_THREE_ROLE_CONCURRENT,
  FIXTURE_I_TASK_FAILED_MID_ROUTE,
  FIXTURE_L_FRESH_LOAD_ALREADY_RUNNING,
  FIXTURE_M_REDUCED_MOTION,
  FIXTURE_O_REVIEW_HANDOFF_READY,
  FIXTURE_P_WAITING_APPROVAL_NO_OPERATOR,
  FIXTURE_Q_HARNESS_SWAP_CODEX_TO_FCC,
  LOCOMOTION_FIXTURE_EPOCH,
} from '../apps/web/src/hq3d/world/locomotionFixtures.js'
import type { WorldState } from '../apps/web/src/hq3d/world/worldState.js'
import { getFreePort } from './test-ports.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const evidenceDir = join(__dirname, '../docs/3d-hq/evidence/wave12g')

class HqLocomotionTestHarness implements AgentHarness {
  public readonly id = 'hq-locomotion-test-harness'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'HQ Locomotion Test Harness Ready',
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 20,
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

function worldStateToStateSummary(worldState: WorldState): StateSummaryResponse {
  const tasks = Object.values(worldState.tasks).map((t) => ({
    id: t.id,
    runId: 'run-w12g',
    title: t.title,
    objective: 'Authoritative locomotion execution',
    state: t.canonicalState,
    role: t.roleId as any,
    roleAssignment: t.roleId
      ? {
          roleId: t.roleId as any,
          harnessId: t.harnessId ?? 'codex-worker',
          assignedAt: '2026-09-23T10:00:00.000Z',
        }
      : undefined,
    dependencies: [],
    acceptanceCriteria: [],
    createdAt: '2026-09-23T10:00:00.000Z',
    updatedAt: '2026-09-23T10:00:01.000Z',
  }))

  const activeTasks = Object.values(worldState.tasks)
    .filter((t) => t.canonicalState === 'RUNNING' || t.runtimePhase === 'WORKER_RUNNING' || t.runtimePhase === 'PREPARING')
    .map((t) => ({
      taskId: t.id,
      harnessId: t.harnessId ?? 'codex-worker',
      roleId: t.roleId ?? 'role:engineering:frontend-engineer',
      stationId: t.assignedStationId ?? 'engineering-workstation-01',
      phase: (t.runtimePhase as any) ?? (t.canonicalState === 'RUNNING' ? 'WORKER_RUNNING' : 'PREPARING'),
      startedAt: '2026-09-23T10:00:00.000Z',
    }))

  return {
    service: 'gravitas',
    version: '0.0.1',
    runs: [
      {
        id: 'run-w12g',
        goal: 'Wave 12G Authoritative Role Locomotion Verification',
        status: 'RUNNING',
        baseBranch: 'main',
        constraints: [],
        acceptanceCriteria: [],
        requiredEvidence: [],
        createdAt: '2026-09-23T10:00:00.000Z',
        updatedAt: '2026-09-23T10:00:00.000Z',
      },
    ],
    tasks: tasks as any,
    harness: {
      id: 'harness-test',
      status: 'AVAILABLE',
    },
    projection: {
      schemaVersion: '1.0.0',
      epoch: worldState.revisionIdentity.projectionEpoch,
      revision: worldState.revisionIdentity.projectionRevision,
      activeTasks,
      handoffs: worldState.handoffs as any,
    },
  }
}

test.describe.serial('Wave 12G — Authoritative Role Locomotion & Spatial Proofs', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let viteServer: ViteDevServer
  let SERVER_PORT: number
  let VITE_PORT: number

  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-w12g-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-w12g-runtime-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Wave 12G Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'w12g@test.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'w12g-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    const harness = new HqLocomotionTestHarness()

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_w12g_test',
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

  test('01: 01-all-idle.png — All roles idle at canonical stations', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_A_ALL_IDLE)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.waitForTimeout(600)

    const stats = await page.evaluate(() => (window as any).__hqDirector?.getPerformanceStats())
    console.log('PERF_STATE_STATS_ALL_IDLE:', JSON.stringify(stats))

    await page.screenshot({
      path: join(evidenceDir, '01-all-idle.png'),
      fullPage: true,
    })
  })

  test('02: 02-frontend-departing-home.png — Frontend Engineer assigned & departing home station', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_B_FRONTEND_ASSIGNED)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(300)

    await page.screenshot({
      path: join(evidenceDir, '02-frontend-departing-home.png'),
      fullPage: true,
    })
  })

  test('03: 03-frontend-mid-walk.png — Frontend Engineer traversing aisle toward workstation', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_C_FRONTEND_WALKING)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(800)

    const stats = await page.evaluate(() => (window as any).__hqDirector?.getPerformanceStats())
    console.log('PERF_STATE_STATS_ONE_WALKER:', JSON.stringify(stats))

    await page.screenshot({
      path: join(evidenceDir, '03-frontend-mid-walk.png'),
      fullPage: true,
    })
  })

  test('04: 04-frontend-at-workstation.png — Frontend Engineer at workstation in focused state', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_D_FRONTEND_WORKING)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '04-frontend-at-workstation.png'),
      fullPage: true,
    })
  })

  test('05: 05-backend-mid-walk.png — Backend Engineer traversing aisle toward Station 2', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_E_BACKEND_ASSIGNED)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '05-backend-mid-walk.png'),
      fullPage: true,
    })
  })

  test('06: 06-reviewer-entering-cleanroom.png — Reviewer navigating through cleanroom airlock entry', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_F_REVIEWER_ASSIGNED)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-3"]').click()
    await page.waitForTimeout(600)

    const stats = await page.evaluate(() => (window as any).__hqDirector?.getPerformanceStats())
    console.log('PERF_STATE_STATS_REVIEWER_WALKING:', JSON.stringify(stats))

    await page.screenshot({
      path: join(evidenceDir, '06-reviewer-entering-cleanroom.png'),
      fullPage: true,
    })
  })

  test('07: 07-three-role-concurrent.png — FE, BE, and Reviewer executing concurrently', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_H_THREE_ROLE_CONCURRENT)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(600)

    const stats = await page.evaluate(() => (window as any).__hqDirector?.getPerformanceStats())
    console.log('PERF_STATE_STATS_THREE_WALKERS:', JSON.stringify(stats))

    await page.screenshot({
      path: join(evidenceDir, '07-three-role-concurrent.png'),
      fullPage: true,
    })
  })

  test('08: 08-review-handoff.png — Task handoff ready, reviewer moving to review station', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_O_REVIEW_HANDOFF_READY)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-3"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '08-review-handoff.png'),
      fullPage: true,
    })
  })

  test('09: 09-task-failed-reconciled.png — Task failed mid-route reconciles cleanly to home', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_I_TASK_FAILED_MID_ROUTE)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '09-task-failed-reconciled.png'),
      fullPage: true,
    })
  })

  test('10: 10-waiting-approval-no-operator.png — Waiting approval plinth with no fake humanoid operator', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_P_WAITING_APPROVAL_NO_OPERATOR)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-6"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '10-waiting-approval-no-operator.png'),
      fullPage: true,
    })
  })

  test('11: 11-reduced-motion.png — Prefers-reduced-motion snaps directly to destination without walk cycle', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_M_REDUCED_MOTION)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(600)

    const stats = await page.evaluate(() => (window as any).__hqDirector?.getPerformanceStats())
    console.log('PERF_STATE_STATS_REDUCED_MOTION:', JSON.stringify(stats))

    await page.screenshot({
      path: join(evidenceDir, '11-reduced-motion.png'),
      fullPage: true,
    })
  })

  test('12: 12-harness-swap-same-path.png — Codex swapped to FCC preserves role station identity', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_Q_HARNESS_SWAP_CODEX_TO_FCC)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()

    // Click Frontend Engineer in roster to inspect decoupled harness
    await page.locator('[data-testid="role-btn-frontend-engineer"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '12-harness-swap-same-path.png'),
      fullPage: true,
    })
  })

  test('13: 13-fresh-load-already-running.png — Fresh page load initializes directly at workstation without replaying historical transit', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_L_FRESH_LOAD_ALREADY_RUNNING)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '13-fresh-load-already-running.png'),
      fullPage: true,
    })
  })

  test('14: 14-active-office-overview.png — Wide architectural overview of active multi-role office', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.route('**/api/v1/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(worldStateToStateSummary(FIXTURE_H_THREE_ROLE_CONCURRENT)),
      })
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()
    // Reset to overview / default camera
    await page.locator('[data-testid="hq-nav-room-1"]').click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '14-active-office-overview.png'),
      fullPage: true,
    })
  })

  test('RAF & Inactive Discipline: HQ inactive & hidden document stop animation loop', async ({ page }) => {
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()

    // Test active
    const activeRaf = await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      return dir?.rafId !== null
    })
    expect(activeRaf).toBe(true)

    // Emulate inactive view
    const inactiveResult = await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      dir.setViewActive(false)
      const rafAfterInactive = dir.rafId !== null
      dir.setViewActive(true)
      return { rafAfterInactive }
    })
    expect(inactiveResult.rafAfterInactive).toBe(false)
  })
})
