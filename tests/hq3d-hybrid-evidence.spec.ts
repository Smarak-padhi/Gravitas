/**
 * Wave 12H Playwright Visual Evidence & Performance Telemetry Suite
 *
 * Captures authoritative high-resolution screenshots for the 10 required hybrid states:
 * 01-hybrid-floor2-idle.png
 * 02-hybrid-floor2-working.png
 * 03-hybrid-frontend-status-bubble.png
 * 04-hybrid-task-handoff.png
 * 05-hybrid-reviewer-received.png
 * 06-hybrid-verification-failed.png
 * 07-hybrid-waiting-approval.png
 * 08-hybrid-night-floor2.png
 * 09-hybrid-agent-inspector.png
 * 10-hybrid-tower-overview.png
 *
 * Also gathers authoritative rendering telemetry (draw calls, triangles, geometries, textures, FPS).
 */

import { test, expect } from '@playwright/test'
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
const evidenceDir = join(__dirname, '../docs/3d-hq/evidence/12h-hybrid')

class HybridTestHarness implements AgentHarness {
  public readonly id = 'hybrid-harness'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'Wave 12H test harness ready',
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 50,
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

test.describe.serial('Wave 12H Hybrid HQ Visual Evidence Suite', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let viteServer: ViteDevServer
  let SERVER_PORT: number
  let VITE_PORT: number
  let service: RunService
  let harness: HybridTestHarness

  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-hybrid-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-hybrid-runtime-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'HQ Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'hq@test.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'hq-hybrid-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    harness = new HybridTestHarness()

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_hybrid_test',
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
  })

  test('Captures 10 authoritative visual proofs and measures performance telemetry', async ({
    page,
  }) => {
    test.setTimeout(120000)
    // 1600x900 viewport for crisp management-sim composition
    await page.setViewportSize({ width: 1600, height: 900 })

    await page.goto(`http://127.0.0.1:${VITE_PORT}`)
    await page.waitForSelector('[data-testid="living-hq-canvas-container"]', { timeout: 15000 })
    await page.waitForTimeout(1000)

    // Ensure 3D View is active
    const canvas = page.locator('[data-testid="hq-webgl-canvas"]')
    await expect(canvas).toBeVisible()

    // Navigate to Floor 2 in Hybrid mode
    const hybridBtn = page.locator('[data-testid="mode-hybrid-btn"]')
    await hybridBtn.click()
    await page.waitForTimeout(800)

    // Ensure Floor 2 Hybrid diorama is mounted
    const diorama = page.locator('[data-testid="floor2-hybrid-diorama"]')
    await expect(diorama).toBeVisible()

    // ----------------------------------------------------
    // PROOF 01: Hybrid Floor 2 Idle
    // ----------------------------------------------------
    const resetIdleBtn = page.locator('[data-testid="scenario-reset-idle"]')
    await resetIdleBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({
      path: join(evidenceDir, '01-hybrid-floor2-idle.png'),
    })

    // Measure Hybrid Telemetry
    const hybridStats = await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      return dir ? dir.getPerformanceStats() : null
    })
    console.log('[Telemetry: Hybrid Floor 2]', hybridStats)

    // ----------------------------------------------------
    // PROOF 02: Hybrid Floor 2 Working (Frontend typing on T-142)
    // ----------------------------------------------------
    const handoffBtn = page.locator('[data-testid="scenario-golden-handoff"]')
    await handoffBtn.click()
    await page.waitForTimeout(600) // During Frontend typing
    await page.screenshot({
      path: join(evidenceDir, '02-hybrid-floor2-working.png'),
    })

    // ----------------------------------------------------
    // PROOF 03: Frontend Status Bubble
    // ----------------------------------------------------
    await page.waitForTimeout(1400) // Frontend finishes, bubble appears
    await page.screenshot({
      path: join(evidenceDir, '03-hybrid-frontend-status-bubble.png'),
    })

    // ----------------------------------------------------
    // PROOF 04: Task Handoff in flight
    // ----------------------------------------------------
    // The task card glides over 1400ms
    await page.waitForTimeout(500)
    await page.screenshot({
      path: join(evidenceDir, '04-hybrid-task-handoff.png'),
    })

    // ----------------------------------------------------
    // PROOF 05: Reviewer Received & Reviewing
    // ----------------------------------------------------
    await page.waitForTimeout(1000) // Reached Reviewer desk, Reviewer reviews with loupe
    await page.screenshot({
      path: join(evidenceDir, '05-hybrid-reviewer-received.png'),
    })

    // ----------------------------------------------------
    // PROOF 07: Waiting Approval (Verification Passed)
    // ----------------------------------------------------
    await page.waitForTimeout(2800) // Review completes, WAITING_APPROVAL green seal
    await page.screenshot({
      path: join(evidenceDir, '07-hybrid-waiting-approval.png'),
    })

    // ----------------------------------------------------
    // PROOF 06: Verification Failed Case
    // ----------------------------------------------------
    const failBtn = page.locator('[data-testid="scenario-verification-failed"]')
    await failBtn.click()
    await page.waitForTimeout(1400)
    await page.screenshot({
      path: join(evidenceDir, '06-hybrid-verification-failed.png'),
    })

    // ----------------------------------------------------
    // PROOF 08: Night Floor 2 Atmosphere
    // ----------------------------------------------------
    const nightBtn = page.locator('[data-testid="hq-atmosphere-night"]')
    await nightBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({
      path: join(evidenceDir, '08-hybrid-night-floor2.png'),
    })
    // Reset to Day
    const dayBtn = page.locator('[data-testid="hq-atmosphere-day"]')
    await dayBtn.click()
    await page.waitForTimeout(400)

    // ----------------------------------------------------
    // PROOF 09: Agent Inspector (Click Frontend Engineer)
    // ----------------------------------------------------
    const feAgent = page.locator('[data-testid="hybrid-agent-role:engineering:frontend-engineer"]')
    await feAgent.click()
    await page.waitForTimeout(400)
    const inspector = page.locator('[data-testid="hybrid-contextual-inspector"]')
    await expect(inspector).toBeVisible()
    await page.screenshot({
      path: join(evidenceDir, '09-hybrid-agent-inspector.png'),
    })

    // Close Inspector
    const closeBtn = inspector.locator('button[aria-label="Close inspector"]')
    await closeBtn.click()
    await page.waitForTimeout(300)

    // ----------------------------------------------------
    // PROOF 10: 3D Tower Overview
    // ----------------------------------------------------
    const overviewPill = page.locator('[data-testid="hq-nav-overview-pill"]')
    await overviewPill.click()
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: join(evidenceDir, '10-hybrid-tower-overview.png'),
    })

    // Measure 3D Experimental Telemetry on Floor 2 for comparison
    const f2RoomBtn = page.locator('[data-testid="hq-nav-room-2"]')
    await f2RoomBtn.click()
    await page.waitForTimeout(600)
    const mode3dBtn = page.locator('[data-testid="mode-3d-btn"]')
    await mode3dBtn.click()
    await page.waitForTimeout(800)

    const hero3dStats = await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      return dir ? dir.getPerformanceStats() : null
    })
    console.log('[Telemetry: 3D Experimental Hero Bay]', hero3dStats)

    // Write Performance Comparison Report
    const perfReport = {
      timestamp: new Date().toISOString(),
      viewport: { width: 1600, height: 900 },
      hybridFloor2: hybridStats,
      hero3dFloor2: hero3dStats,
      summary: {
        drawCallsDelta: (hybridStats?.drawCalls ?? 0) - (hero3dStats?.drawCalls ?? 0),
        trianglesDelta: (hybridStats?.triangles ?? 0) - (hero3dStats?.triangles ?? 0),
        geometriesDelta: (hybridStats?.geometries ?? 0) - (hero3dStats?.geometries ?? 0),
      },
    }

    await writeFile(
      join(evidenceDir, 'performance-comparison.json'),
      JSON.stringify(perfReport, null, 2),
      'utf8'
    )
  })
})
