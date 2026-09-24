import { test, expect } from '@playwright/test'
import { join } from 'node:path'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer, ViteDevServer } from 'vite'
import { executeGit } from '@gravitas/git'
import {
  EventHub,
  GravitasServer,
  InMemoryRegistry,
  RunService,
} from '../apps/server/src/index.js'
import { getFreePort } from './test-ports.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const beforeEvidenceDir = join(__dirname, '../docs/frontend/evidence/before')

test.describe.serial('Wave 12J-UX — Before Baseline Visual Proofs', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let service: RunService
  let viteServer: ViteDevServer
  let VITE_PORT: number
  let serverUrl: string

  test.beforeAll(async () => {
    await mkdir(beforeEvidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-w12j-ux-before-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-w12j-ux-before-rt-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Wave 12J-UX Baseline'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'ux@gravitas.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'ux-baseline-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)

    class MockHarness {
      public readonly id = 'mock-harness'
      async availability() {
        return { status: 'AVAILABLE' as const, installed: true, usableNoninteractive: true }
      }
      async execute(req: any) {
        return {
          durationMs: 40,
          exitCode: 0,
          terminationReason: 'COMPLETED' as const,
          stdout: 'Execution successful',
          stderr: '',
          stdoutTruncated: false,
          stderrTruncated: false,
          worktreePath: req.worktreePath,
        }
      }
    }

    service = new RunService({
      registry,
      eventHub,
      harness: new MockHarness() as any,
      runtimeRoot,
      defaultRepository: fixtureRepoPath,
      seedCalendarJobs: true,
    })

    server = new GravitasServer({ service, eventHub })
    const serverInfo = await server.start({ host: '127.0.0.1', port: 0 })
    serverUrl = serverInfo.url
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

  test('01: 01-home-or-primary-operations', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(beforeEvidenceDir, '01-home-or-primary-operations.png'), fullPage: true })
  })

  test('02: 02-hq-overview', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    const hqTab = page.locator('button:has-text("HQ 3D")')
    if (await hqTab.isVisible()) {
      await hqTab.click()
      await page.waitForTimeout(1000)
    }
    await page.screenshot({ path: join(beforeEvidenceDir, '02-hq-overview.png'), fullPage: true })
  })

  test('03: 03-hq-agent-operations', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    const hqTab = page.locator('button:has-text("HQ 3D")')
    if (await hqTab.isVisible()) {
      await hqTab.click()
      await page.keyboard.press('1')
      await page.waitForTimeout(1000)
    }
    await page.screenshot({ path: join(beforeEvidenceDir, '03-hq-agent-operations.png'), fullPage: true })
  })

  test('04: 04-hq-server-bay', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    const hqTab = page.locator('button:has-text("HQ 3D")')
    if (await hqTab.isVisible()) {
      await hqTab.click()
      await page.keyboard.press('5')
      await page.waitForTimeout(1000)
    }
    await page.screenshot({ path: join(beforeEvidenceDir, '04-hq-server-bay.png'), fullPage: true })
  })

  test('05: 05-calendar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    const calTab = page.locator('button:has-text("CALENDAR")')
    await expect(calTab).toBeVisible()
    await calTab.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(beforeEvidenceDir, '05-calendar.png'), fullPage: true })
  })

  test('06: 06-calendar-event-inspector', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("CALENDAR")').click()
    const firstEvent = page.locator('[data-testid^="event-card-"]').first()
    if (await firstEvent.isVisible()) {
      await firstEvent.click()
      await page.waitForTimeout(400)
    }
    await page.screenshot({ path: join(beforeEvidenceDir, '06-calendar-event-inspector.png'), fullPage: true })
  })

  test('07: 07-connectors', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("CONNECTORS")').click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(beforeEvidenceDir, '07-connectors.png'), fullPage: true })
  })

  test('08: 08-connector-audit', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("CONNECTORS")').click()
    const openAuditBtn = page.locator('[data-testid="open-audit-drawer-btn"]')
    if (await openAuditBtn.isVisible()) {
      await openAuditBtn.click()
      await page.waitForTimeout(400)
    }
    await page.screenshot({ path: join(beforeEvidenceDir, '08-connector-audit.png'), fullPage: true })
  })

  test('09: 09-automations', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(beforeEvidenceDir, '09-automations.png'), fullPage: true })
  })

  test('10: 10-approval-required', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    const waitingTab = page.locator('button:has-text("Waiting Approval")')
    if (await waitingTab.isVisible()) {
      await waitingTab.click()
      await page.waitForTimeout(300)
    }
    await page.screenshot({ path: join(beforeEvidenceDir, '10-approval-required.png'), fullPage: true })
  })

  test('11: 11-empty-state', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    const pausedFilter = page.locator('button:has-text("PAUSED")')
    if (await pausedFilter.isVisible()) {
      await pausedFilter.click()
      await page.waitForTimeout(300)
    }
    await page.screenshot({ path: join(beforeEvidenceDir, '11-empty-state.png'), fullPage: true })
  })

  test('12: 12-error-or-disconnected-state', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("CONNECTORS")').click()
    const checkHealthBtn = page.locator('[data-testid="check-health-btn"]')
    if (await checkHealthBtn.isVisible()) {
      await checkHealthBtn.click()
      await page.waitForTimeout(400)
    }
    await page.screenshot({ path: join(beforeEvidenceDir, '12-error-or-disconnected-state.png'), fullPage: true })
  })

  test('13: 13-tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(beforeEvidenceDir, '13-tablet.png'), fullPage: true })
  })

  test('14: 14-mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(beforeEvidenceDir, '14-mobile.png'), fullPage: true })
  })
})
