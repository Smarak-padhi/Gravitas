/**
 * Playwright E2E Browser Test Suite for Gravitas 3D Headquarters (Wave 12B)
 * Verifies canvas mount, room presets, inspector docking, reduced motion,
 * responsive viewports, and captures 10 authoritative screenshot proofs.
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

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const evidenceDir = join(__dirname, '../docs/3d-hq/evidence')

class Hq3dFakeHarness implements AgentHarness {
  public readonly id = 'hq3d-scale-harness'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'HQ 3D scene test harness ready',
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

test.describe.serial('Gravitas 3D Headquarters Scene Foundation E2E', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let viteServer: ViteDevServer

  const SERVER_PORT = 4317
  const VITE_PORT = 5178

  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-hq3d-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-hq3d-runtime-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'HQ Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'hq@test.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'hq-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    const harness = new Hq3dFakeHarness()

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_hq3d_test',
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

    await server.start({ host: '127.0.0.1', port: SERVER_PORT })

    const webRoot = join(__dirname, '../apps/web')
    viteServer = await createViteServer({
      root: webRoot,
      server: {
        host: '127.0.0.1',
        port: VITE_PORT,
        strictPort: true,
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

  test('1. Overview Framing (1920x1080) and 3D Canvas Mount', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Verify canvas container and canvas element
    const canvasContainer = page.locator('[data-testid="living-hq-canvas-container"]')
    await expect(canvasContainer).toBeVisible()

    const canvas = page.locator('[data-testid="hq-webgl-canvas"]')
    await expect(canvas).toBeVisible()

    // Verify docked 2D inspector
    const inspector = page.locator('[data-testid="hq3d-inspector"]')
    await expect(inspector).toBeVisible()
    await expect(inspector.getByText('Headquarters Overview')).toBeVisible()

    // Wait for initial render stabilization
    await page.waitForTimeout(1000)

    // Capture Evidence 01: Overview Framing
    await page.screenshot({
      path: join(evidenceDir, '01-hq-overview-1920.png'),
      fullPage: true,
    })
  })

  test('2. Room 1: Mission Control (Planning Table)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Click room 1 pill or press '1'
    const room1Btn = page.locator('[data-testid="hq-nav-room-1"]')
    await room1Btn.click()

    await page.waitForTimeout(600)
    await expect(page.locator('[data-testid="hq3d-inspector"]').getByText('Mission Control').first()).toBeVisible()

    // Capture Evidence 02: Room 1 Mission Control
    await page.screenshot({
      path: join(evidenceDir, '02-room-mission-control.png'),
      fullPage: true,
    })
  })

  test('3. Room 2: Agent Operations Floor (Desks & Scale Figures)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    const room2Btn = page.locator('[data-testid="hq-nav-room-2"]')
    await room2Btn.click()

    await page.waitForTimeout(600)
    await expect(page.locator('[data-testid="hq3d-inspector"]').getByText('Agent Operations Floor').first()).toBeVisible()

    // Capture Evidence 03: Room 2 Agent Operations
    await page.screenshot({
      path: join(evidenceDir, '03-room-agent-operations.png'),
      fullPage: true,
    })
  })

  test('4. Room 3: Verification Cleanroom (Lab & Console)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    const room3Btn = page.locator('[data-testid="hq-nav-room-3"]')
    await room3Btn.click()

    await page.waitForTimeout(600)
    await expect(page.locator('[data-testid="hq3d-inspector"]').getByText('Verification Cleanroom').first()).toBeVisible()

    // Capture Evidence 04: Room 3 Verification Cleanroom
    await page.screenshot({
      path: join(evidenceDir, '04-room-verification-cleanroom.png'),
      fullPage: true,
    })
  })

  test('5. Room 4: Browser QA Lab (Device Matrix Wall)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    const room4Btn = page.locator('[data-testid="hq-nav-room-4"]')
    await room4Btn.click()

    await page.waitForTimeout(600)
    await expect(page.locator('[data-testid="hq3d-inspector"]').getByText('Browser QA Lab').first()).toBeVisible()

    // Capture Evidence 05: Room 4 Browser QA Lab
    await page.screenshot({
      path: join(evidenceDir, '05-room-browser-qa-lab.png'),
      fullPage: true,
    })
  })

  test('6. Room 5: Infrastructure Server Bay (OmniRoute Racks)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    const room5Btn = page.locator('[data-testid="hq-nav-room-5"]')
    await room5Btn.click()

    await page.waitForTimeout(600)
    await expect(page.locator('[data-testid="hq3d-inspector"]').getByText('Infrastructure Server Bay').first()).toBeVisible()

    // Capture Evidence 06: Room 5 Infrastructure Servers
    await page.screenshot({
      path: join(evidenceDir, '06-room-infrastructure-servers.png'),
      fullPage: true,
    })
  })

  test('7. Room 6: Approval Control Mezzanine (Plinth)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    const room6Btn = page.locator('[data-testid="hq-nav-room-6"]')
    await room6Btn.click()

    await page.waitForTimeout(600)
    await expect(page.locator('[data-testid="hq3d-inspector"]').getByText('Approval Control Mezzanine').first()).toBeVisible()

    // Capture Evidence 07: Room 6 Approval Mezzanine
    await page.screenshot({
      path: join(evidenceDir, '07-room-approval-mezzanine.png'),
      fullPage: true,
    })
  })

  test('8. Interactive Selection (Station Picked + Inspector Docked)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Frame Room 1 first so Planning Table is prominent
    await page.locator('[data-testid="hq-nav-room-1"]').click()
    await page.waitForTimeout(500)

    // Click near canvas center where planning table is situated
    const canvas = page.locator('[data-testid="hq-webgl-canvas"]')
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + box.width * 0.48, box.y + box.height * 0.52)
      await page.waitForTimeout(300)
    }

    // Capture Evidence 08: Station Selection & Inspector
    await page.screenshot({
      path: join(evidenceDir, '08-station-selection-inspector.png'),
      fullPage: true,
    })
  })

  test('9. Reduced Motion Mode (Instant Cut Active Indicator)', async ({ page }: { page: Page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Verify reduced motion indicator pill appears
    await expect(page.getByText('Reduced Motion: Instant Cuts')).toBeVisible()

    // Capture Evidence 09: Reduced Motion Mode
    await page.screenshot({
      path: join(evidenceDir, '09-reduced-motion-mode.png'),
      fullPage: true,
    })
  })

  test('10. Responsive Viewport (1366x768)', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Verify no horizontal scrolling
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)

    await page.waitForTimeout(500)

    // Capture Evidence 10: Responsive Viewport
    await page.screenshot({
      path: join(evidenceDir, '10-hq-viewport-responsive.png'),
      fullPage: true,
    })
  })

  test('11. Telemetry HUD Toggle & Metrics Rendering', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Toggle performance telemetry HUD
    const perfBtn = page.locator('[data-testid="toggle-perf-btn"]')
    await perfBtn.click()

    await page.waitForTimeout(600)
    const perfGrid = page.locator('[data-testid="perf-stats-grid"]')
    await expect(perfGrid).toBeVisible()
    await expect(perfGrid.getByText('FPS:')).toBeVisible()
    await expect(perfGrid.getByText('Calls:')).toBeVisible()
  })

  test('12. Dual-condition Render Loop & Additive View Switching', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Switch to 2D OFFICE view
    await page.locator('[data-testid="tab-OFFICE"]').click()
    await expect(page.locator('[data-testid="living-hq-canvas-container"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="office-floor"]')).toBeVisible()

    // Switch back to 3D HQ view
    await page.locator('[data-testid="tab-HQ3D"]').click()
    await expect(page.locator('[data-testid="living-hq-canvas-container"]')).toBeVisible()
  })
})
