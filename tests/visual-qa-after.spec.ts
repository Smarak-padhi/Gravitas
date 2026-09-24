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
const afterEvidenceDir = join(__dirname, '../docs/frontend/evidence/after')

test.describe.serial('Wave 12J-UX — After Uplift Visual Proofs', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let service: RunService
  let viteServer: ViteDevServer
  let VITE_PORT: number
  let serverUrl: string

  test.beforeAll(async () => {
    await mkdir(afterEvidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-w12j-ux-after-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-w12j-ux-after-rt-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Wave 12J-UX Uplift'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'ux@gravitas.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'ux-uplift-fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial uplift baseline'] })

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

  test('01-home-or-primary-operations', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(afterEvidenceDir, '01-home-or-primary-operations.png') })
  })

  test('02-hq-overview', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    const hqTab = page.locator('button:has-text("HQ 3D")')
    if (await hqTab.isVisible()) {
      await hqTab.click()
    }
    await page.waitForTimeout(1000)
    await page.screenshot({ path: join(afterEvidenceDir, '02-hq-overview.png') })
  })

  test('03-hq-agent-operations', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.keyboard.press('Digit2')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: join(afterEvidenceDir, '03-hq-agent-operations.png') })
  })

  test('04-hq-server-bay', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.keyboard.press('Digit5')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: join(afterEvidenceDir, '04-hq-server-bay.png') })
  })

  test('05-calendar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    const calTab = page.locator('button:has-text("CALENDAR")')
    await expect(calTab).toBeVisible()
    await calTab.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(afterEvidenceDir, '05-calendar.png') })
  })

  test('06-calendar-event-inspector', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("CALENDAR")').click()
    await page.waitForTimeout(400)
    const firstCard = page.locator('[data-testid^="event-card-"]').first()
    if (await firstCard.isVisible()) {
      await firstCard.click()
    }
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(afterEvidenceDir, '06-calendar-event-inspector.png') })
  })

  test('07-connectors', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("CONNECTORS")').click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(afterEvidenceDir, '07-connectors.png') })
  })

  test('08-connector-audit', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("CONNECTORS")').click()
    await page.waitForTimeout(400)
    const auditBtn = page.locator('[data-testid="open-audit-drawer-btn"]')
    if (await auditBtn.isVisible()) {
      await auditBtn.click()
    }
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(afterEvidenceDir, '08-connector-audit.png') })
  })

  test('09-automations', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(afterEvidenceDir, '09-automations.png') })
  })

  test('10-approval-required', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await page.waitForTimeout(400)
    const approvalTab = page.locator('[data-testid="tab-waiting-approval"]')
    if (await approvalTab.isVisible()) {
      await approvalTab.click()
    }
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(afterEvidenceDir, '10-approval-required.png') })
  })

  test('11-empty-state', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await page.waitForTimeout(400)
    const cancelledFilter = page.locator('[data-testid="filter-cancelled"]')
    if (await cancelledFilter.isVisible()) {
      await cancelledFilter.click()
    }
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(afterEvidenceDir, '11-empty-state.png') })
  })

  test('12-error-or-disconnected-state', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("CONNECTORS")').click()
    await page.waitForTimeout(400)
    const googleTab = page.locator('[data-testid="connector-tab-calendar-google"]')
    if (await googleTab.isVisible()) {
      await googleTab.click()
    }
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(afterEvidenceDir, '12-error-or-disconnected-state.png') })
  })

  test('13-tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(afterEvidenceDir, '13-tablet.png') })
  })

  test('14-mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(afterEvidenceDir, '14-mobile.png') })
  })
})
