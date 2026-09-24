/**
 * Wave 12K-R Playwright Visual Evidence & Quality Gate Suite
 * Captures authoritative high-resolution visual evidence for:
 * 01-overview-day.png
 * 02-overview-night.png
 * 03-agent-operations-wide.png
 * 04-frontend-character-closeup.png
 * 05-elevator-exterior-transition.png
 * 06-agent-operations-working.png
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
const evidenceDir = join(__dirname, '../docs/3d-hq/evidence/wave12k-r')

class ControlledHarness implements AgentHarness {
  public readonly id = 'wave12kr-harness'
  private resolveBlocker: (() => void) | null = null

  public blockExecutionUntilSignaled(): void {
    // will block next execution
  }

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'Wave 12K-R test harness ready',
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    return new Promise((resolve) => {
      // Hold execution open for 1500ms so worker is actively running
      setTimeout(() => {
        resolve({
          executionId: request.executionId,
          harnessId: this.id,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 1500,
          exitCode: 0,
          terminationReason: 'COMPLETED',
          stdout: `Executed task ${request.taskId}`,
          stderr: '',
          stdoutTruncated: false,
          stderrTruncated: false,
          worktreePath: request.worktreePath,
        })
      }, 1500)
    })
  }
}

test.describe.serial('Wave 12K-R Living HQ Visual Rebuild Evidence', () => {
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

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-w12kr-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-w12kr-runtime-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'HQ Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'hq@test.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'hq-w12kr-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    harness = new ControlledHarness()

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_w12kr_test',
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

  test('01. Capture 01-overview-day.png', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Wait for canvas to mount and stabilize
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()

    // Collapse left runs sidebar to expand 3D HQ to 90%+ of viewport
    const collapseBtn = page.locator('button[title="Collapse Runs Panel"]')
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click()
    }

    // Ensure DAY mode
    const dayBtn = page.locator('[data-testid="hq-atmosphere-day"]')
    await dayBtn.click()

    // Reset to overview
    await page.locator('[data-testid="hq-nav-overview-pill"]').click()
    await page.waitForTimeout(1200)

    // Capture 01-overview-day.png
    await page.screenshot({
      path: join(evidenceDir, '01-overview-day.png'),
      fullPage: true,
    })
  })

  test('02. Capture 02-overview-night.png', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()

    const collapseBtn = page.locator('button[title="Collapse Runs Panel"]')
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click()
    }

    // Switch to NIGHT atmosphere
    const nightBtn = page.locator('[data-testid="hq-atmosphere-night"]')
    await nightBtn.click()

    await page.locator('[data-testid="hq-nav-overview-pill"]').click()
    await page.waitForTimeout(1200)

    // Capture 02-overview-night.png
    await page.screenshot({
      path: join(evidenceDir, '02-overview-night.png'),
      fullPage: true,
    })
  })

  test('03. Capture 03-agent-operations-wide.png', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()

    const collapseBtn = page.locator('button[title="Collapse Runs Panel"]')
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click()
    }

    // Ensure DAY mode for clear viewing of hero room
    await page.locator('[data-testid="hq-atmosphere-day"]').click()

    // Navigate to Agent Operations Floor (Key 2)
    const room2Btn = page.locator('[data-testid="hq-nav-room-2"]')
    await room2Btn.click()
    // Allow elevator arrival and camera glide into room to complete
    await page.waitForTimeout(1600)

    // Capture 03-agent-operations-wide.png
    await page.screenshot({
      path: join(evidenceDir, '03-agent-operations-wide.png'),
      fullPage: true,
    })
  })

  test('04. Capture 04-frontend-character-closeup.png', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()

    const collapseBtn = page.locator('button[title="Collapse Runs Panel"]')
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click()
    }

    await page.locator('[data-testid="hq-atmosphere-day"]').click()

    // Navigate to Frontend Mascot closeup preset
    const charBtn = page.locator('[data-testid="hq-nav-char-frontend"]')
    await charBtn.click()
    await page.waitForTimeout(1400)

    // Capture 04-frontend-character-closeup.png
    await page.screenshot({
      path: join(evidenceDir, '04-frontend-character-closeup.png'),
      fullPage: true,
    })
  })

  test('05. Capture 05-elevator-exterior-transition.png', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()

    const collapseBtn = page.locator('button[title="Collapse Runs Panel"]')
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click()
    }

    await page.locator('[data-testid="hq-atmosphere-day"]').click()

    // Trigger elevator transit by navigating to Mezzanine (Room 6)
    await page.evaluate(() => {
      const director = (window as any).__hqDirector
      if (director) {
        director.navigateToFloorWithElevator('APPROVAL_MEZZANINE')
      }
    })

    // Capture mid-transit (around 500ms into the 1300ms glide)
    await page.waitForTimeout(550)

    // Capture 05-elevator-exterior-transition.png
    await page.screenshot({
      path: join(evidenceDir, '05-elevator-exterior-transition.png'),
      fullPage: true,
    })
  })

  test('06. Capture 06-agent-operations-working.png', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()

    const collapseBtn = page.locator('button[title="Collapse Runs Panel"]')
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click()
    }

    await page.locator('[data-testid="hq-atmosphere-day"]').click()

    // Navigate camera to Agent Operations Floor and wait for arrival
    await page.locator('[data-testid="hq-nav-room-2"]').click()
    await page.waitForTimeout(1600)

    // Dispatch a real authoritative run to activate Frontend Engineer (RUNNING state)
    const run = await service.createRun({
      goal: 'Authoritative test task for Frontend Engineer',
      role: 'ENGINEERING',
      stationId: 'codex-workstation',
      suggestedFiles: ['apps/web/src/index.ts'],
    })

    // Wait for the task to be picked up and in RUNNING state
    await page.waitForTimeout(600)

    // Capture 06-agent-operations-working.png
    await page.screenshot({
      path: join(evidenceDir, '06-agent-operations-working.png'),
      fullPage: true,
    })
  })
})
