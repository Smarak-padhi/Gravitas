/**
 * Gravitas Wave 12H-R Visual Evidence & Performance Telemetry Suite
 *
 * Captures all 15 required proofs for Human Visual Review:
 * 01-character-family.png: Mascot species family (Frontend, Backend, Reviewer) on neutral background
 * 02-floor2-idle-day.png: Floor 2 in peaceful ambient day
 * 03-floor2-working.png: Frontend actively typing with focus expression
 * 04-task-complete-expression.png: Frontend task complete perk-up expression (^ ^ eyes)
 * 05-small-packet-handoff.png: Small sealed T-142 packet in parabolic flight
 * 06-reviewer-receive.png: Reviewer receiving T-142 at workbench
 * 07-verification-pass.png: Verification passed, smiling expression, waiting approval
 * 08-verification-fail.png: Verification failure case, concerned slump expression
 * 09-floor2-evening.png: Floor 2 golden architectural evening light
 * 10-floor2-night.png: Cozy illuminated warm night with dormant monitors
 * 11-agent-inspector.png: Docked contextual inspector with non-contradictory status
 * 12-tower-context.png: Building overview context
 * 13-before-after-floor2.png: Recomposed dollhouse Floor 2 view
 * 14-character-scale-40px.png: Mascot family at 40px CSS height (small scale proof)
 * 15-character-scale-80px.png: Mascot family at 80px CSS height (medium scale proof)
 *
 * Measures performance telemetry (FPS, frame time, draw calls, triangles, geometries, textures).
 * Validates debug controls gating rule (hidden in normal mode, visible with ?debug=hybrid).
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
const evidenceDir = join(__dirname, '../docs/3d-hq/evidence/12h-r')

class HybridTestHarness implements AgentHarness {
  public readonly id = 'hybrid-harness'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'Wave 12H-R test harness ready',
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      exitCode: 0,
      stdout: 'Wave 12H-R executed successfully\n',
      stderr: '',
      failureReason: undefined,
    }
  }

  public async abort(): Promise<void> {}
}

test.describe('Wave 12H-R Character Language + Lighting Proof Suite', () => {
  let server: GravitasServer
  let viteServer: ViteDevServer
  let fixtureRepoPath: string
  let runtimeRoot: string
  let SERVER_PORT: number
  let VITE_PORT: number
  let service: RunService
  let harness: HybridTestHarness

  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-12hr-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-12hr-runtime-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'HQ Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'hq@test.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'hq-12hr-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    harness = new HybridTestHarness()

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_12hr_test',
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

  test('Captures 15 authoritative visual proofs and measures performance telemetry', async ({
    page,
  }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width: 1600, height: 900 })

    // ----------------------------------------------------
    // PROOF 01: Character Species Family on Neutral Background
    // ----------------------------------------------------
    await page.goto(`http://127.0.0.1:${VITE_PORT}?preview=characters&height=128`)
    await page.waitForSelector('[data-testid="gravitas-character-family-showcase"]', { timeout: 15000 })
    await page.waitForTimeout(600)
    await page.screenshot({
      path: join(evidenceDir, '01-character-family.png'),
    })

    // ----------------------------------------------------
    // PROOF 14: Character Scale at 40px CSS Height (Small Scale Proof)
    // ----------------------------------------------------
    await page.goto(`http://127.0.0.1:${VITE_PORT}?preview=characters&height=40&labels=false`)
    await page.waitForSelector('[data-testid="gravitas-character-family-showcase"]', { timeout: 15000 })
    await page.waitForTimeout(600)
    await page.screenshot({
      path: join(evidenceDir, '14-character-scale-40px.png'),
    })

    // ----------------------------------------------------
    // PROOF 15: Character Scale at 80px CSS Height (Medium Scale Proof)
    // ----------------------------------------------------
    await page.goto(`http://127.0.0.1:${VITE_PORT}?preview=characters&height=80`)
    await page.waitForSelector('[data-testid="gravitas-character-family-showcase"]', { timeout: 15000 })
    await page.waitForTimeout(600)
    await page.screenshot({
      path: join(evidenceDir, '15-character-scale-80px.png'),
    })

    // ----------------------------------------------------
    // Verify Debug Scenario Controls Gating (Section 21 & 27)
    // ----------------------------------------------------
    // Normal mode without ?debug=hybrid must NOT render scenario toolbar
    await page.goto(`http://127.0.0.1:${VITE_PORT}`)
    await page.waitForSelector('[data-testid="living-hq-canvas-container"]', { timeout: 15000 })
    await page.waitForTimeout(800)

    const hybridBtn = page.locator('[data-testid="mode-hybrid-btn"]')
    await hybridBtn.click()
    await page.waitForTimeout(600)

    const normalToolbar = page.locator('[data-testid="hybrid-scenario-toolbar"]')
    await expect(normalToolbar).not.toBeVisible()

    // Now navigate with ?debug=hybrid: scenario controls must be visible
    await page.goto(`http://127.0.0.1:${VITE_PORT}?debug=hybrid`)
    await page.waitForSelector('[data-testid="living-hq-canvas-container"]', { timeout: 15000 })
    await page.waitForTimeout(800)

    const hybridDebugBtn = page.locator('[data-testid="mode-hybrid-btn"]')
    await hybridDebugBtn.click()
    await page.waitForTimeout(600)

    const debugToolbar = page.locator('[data-testid="hybrid-scenario-toolbar"]')
    await expect(debugToolbar).toBeVisible()

    // ----------------------------------------------------
    // PROOF 02: Floor 2 Idle Day
    // ----------------------------------------------------
    const resetIdleBtn = page.locator('[data-testid="scenario-reset-idle"]')
    await resetIdleBtn.click()
    await page.waitForTimeout(800)

    // Set Day Atmosphere
    const dayBtn = page.locator('[data-testid="hq-atmosphere-day"]')
    await dayBtn.click()
    await page.waitForTimeout(600)

    await page.screenshot({
      path: join(evidenceDir, '02-floor2-idle-day.png'),
    })

    // Telemetry: DAY
    const dayStats = await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      return dir ? dir.getPerformanceStats() : null
    })
    console.log('[Telemetry: Floor 2 DAY]', dayStats)

    // ----------------------------------------------------
    // PROOF 03: Floor 2 Working (Frontend working on T-142)
    // ----------------------------------------------------
    const playHandoffBtn = page.locator('[data-testid="scenario-golden-handoff"]')
    await playHandoffBtn.click()
    // t = 600ms: Frontend is typing actively with focused expression
    await page.waitForTimeout(600)

    const feAgent = page.locator('[data-testid="hybrid-agent-role:engineering:frontend-engineer"]')
    await expect(feAgent).toHaveAttribute('data-agent-state', 'WORKING')

    await page.screenshot({
      path: join(evidenceDir, '03-floor2-working.png'),
    })

    // ----------------------------------------------------
    // PROOF 04: Task Complete Expression (Frontend perk-up)
    // ----------------------------------------------------
    // t = 1850ms: Frontend finishes work, perks up into happy completed state
    await page.waitForTimeout(1250)
    await expect(feAgent).toHaveAttribute('data-agent-state', 'COMPLETED')

    await page.screenshot({
      path: join(evidenceDir, '04-task-complete-expression.png'),
    })

    // ----------------------------------------------------
    // PROOF 05: Small Sealed Packet Handoff in Mid-Flight
    // ----------------------------------------------------
    // t = 2400ms: Packet has been in transit for ~550ms, mid-flight parabolic arc
    await page.waitForTimeout(550)

    const packet = page.locator('[data-testid="hybrid-task-artifact"]')
    await expect(packet).toBeVisible()

    await page.screenshot({
      path: join(evidenceDir, '05-small-packet-handoff.png'),
    })

    // ----------------------------------------------------
    // PROOF 06: Reviewer Receive & Reviewing
    // ----------------------------------------------------
    // t = 3500ms: Packet lands at Reviewer, Reviewer begins verification
    await page.waitForTimeout(1100)
    const reviewerAgent = page.locator('[data-testid="hybrid-agent-role:quality:independent-reviewer"]')
    await expect(reviewerAgent).toHaveAttribute('data-agent-state', 'REVIEWING')

    await page.screenshot({
      path: join(evidenceDir, '06-reviewer-receive.png'),
    })

    // ----------------------------------------------------
    // PROOF 07: Verification Passed / Waiting Approval
    // ----------------------------------------------------
    // t = 5800ms: Reviewer finishes verification (takes 2400ms), WAITING_APPROVAL
    await page.waitForTimeout(2300)
    await expect(reviewerAgent).toHaveAttribute('data-agent-state', 'WAITING_APPROVAL')

    await page.screenshot({
      path: join(evidenceDir, '07-verification-pass.png'),
    })

    // ----------------------------------------------------
    // PROOF 08: Verification Fail Case
    // ----------------------------------------------------
    const testFailBtn = page.locator('[data-testid="scenario-verification-failed"]')
    await testFailBtn.click()
    // Wait for failure event to process
    await page.waitForTimeout(1400)
    await expect(reviewerAgent).toHaveAttribute('data-agent-state', 'FAILED')

    await page.screenshot({
      path: join(evidenceDir, '08-verification-fail.png'),
    })

    // ----------------------------------------------------
    // PROOF 11: Agent Inspector (Docked with Consistent Non-Contradictory Copy)
    // ----------------------------------------------------
    // Click on Reviewer (in FAILED state) to open Inspector
    await reviewerAgent.click()
    await page.waitForTimeout(500)

    const inspector = page.locator('[data-testid="hybrid-contextual-inspector"]')
    await expect(inspector).toBeVisible()

    const inspectorStatusText = page.locator('[data-testid="inspector-agent-status-text"]')
    const statusContent = await inspectorStatusText.textContent()
    // Verify it says "Execution halted on T-142", NOT "Working on..."
    expect(statusContent).toContain('Execution halted on T-142')
    expect(statusContent?.toLowerCase()).not.toContain('working')

    await page.screenshot({
      path: join(evidenceDir, '11-agent-inspector.png'),
    })

    // Close inspector
    const closeBtn = page.locator('button[aria-label="Close inspector"]')
    await closeBtn.click()
    await page.waitForTimeout(400)

    // Reset to clean idle state for peaceful atmosphere proofs
    await resetIdleBtn.click()
    await page.waitForTimeout(600)

    // ----------------------------------------------------
    // PROOF 09: Floor 2 Evening Lighting
    // ----------------------------------------------------
    const eveBtn = page.locator('[data-testid="hq-atmosphere-evening"]')
    await eveBtn.click()
    await page.waitForTimeout(800)

    await page.screenshot({
      path: join(evidenceDir, '09-floor2-evening.png'),
    })

    // Telemetry: EVENING
    const eveStats = await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      return dir ? dir.getPerformanceStats() : null
    })
    console.log('[Telemetry: Floor 2 EVENING]', eveStats)

    // ----------------------------------------------------
    // PROOF 10: Floor 2 Night Lighting (Warm interior pools, dark exterior, dormant monitors)
    // ----------------------------------------------------
    const nightBtn = page.locator('[data-testid="hq-atmosphere-night"]')
    await nightBtn.click()
    await page.waitForTimeout(800)

    await page.screenshot({
      path: join(evidenceDir, '10-floor2-night.png'),
    })

    // Telemetry: NIGHT
    const nightStats = await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      return dir ? dir.getPerformanceStats() : null
    })
    console.log('[Telemetry: Floor 2 NIGHT]', nightStats)

    // ----------------------------------------------------
    // PROOF 12: Tower Context (Overview camera)
    // ----------------------------------------------------
    const overviewBtn = page.locator('[data-testid="hq-nav-overview-pill"]')
    await overviewBtn.click()
    await dayBtn.click()
    await page.waitForTimeout(1200)

    await page.screenshot({
      path: join(evidenceDir, '12-tower-context.png'),
    })

    // ----------------------------------------------------
    // PROOF 13: Before / After Recomposed Floor 2 View
    // ----------------------------------------------------
    const room2Btn = page.locator('[data-testid="hq-nav-room-2"]')
    await room2Btn.click()
    // Wait for elevator transit transition to complete fully (1800ms)
    await page.waitForTimeout(2200)

    await page.screenshot({
      path: join(evidenceDir, '13-before-after-floor2.png'),
    })

    // Save Telemetry Summary to Evidence Directory
    const telemetryReport = {
      timestamp: new Date().toISOString(),
      viewport: '1600x900',
      day: dayStats,
      evening: eveStats,
      night: nightStats,
      targetWave12HReference: {
        viewport: '1600x900',
        fps: 60,
        frameTimeMs: 16.7,
        drawCalls: 484,
        triangles: 29802,
        geometries: 549,
        textures: 23,
      },
    }

    await writeFile(
      join(evidenceDir, 'telemetry-summary.json'),
      JSON.stringify(telemetryReport, null, 2),
      'utf8'
    )
  })
})
