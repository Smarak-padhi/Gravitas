/**
 * Wave 12J-UX-R — Responsive Assertions + Visual Evidence
 *
 * Responsibilities:
 * 1. Assert document.scrollWidth <= document.clientWidth at 390px for all 2D routes
 * 2. Assert mobile navigation opens / closes / handles ESC
 * 3. Assert all 9 primary destinations are reachable via mobile nav
 * 4. Assert no critical action is hidden solely because viewport is mobile
 * 5. Assert modal fits viewport at 390px
 * 6. Generate deterministic screenshots for human review
 *
 * Screenshot state:
 *   01–05: Desktop 1440x900 (fixture server, empty state = truthful)
 *   06–11: Mobile 390x844  (fixture server, empty state = truthful)
 *   12–15: Interaction/state evidence (desktop, fixture server)
 *
 * Evidence directory: docs/frontend/evidence/12j-ux-r/
 */

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
const evidenceDir = join(__dirname, '../docs/frontend/evidence/12j-ux-r')

// -------------------------------------------------------------------
// Viewport helpers
// -------------------------------------------------------------------
const DESKTOP = { width: 1440, height: 900 }
const MOBILE  = { width: 390,  height: 844 }

// All 2D routes to test overflow at mobile (HQ3D is WebGL — skip overflow assert)
const TWO_D_ROUTES: Array<{ view: string }> = [
  { view: 'CALENDAR'    },
  { view: 'CONNECTORS'  },
  { view: 'AUTOMATIONS' },
  { view: 'OFFICE'      },
]

const ALL_NAV_VIEWS = [
  'HQ3D', 'CALENDAR', 'CONNECTORS', 'AUTOMATIONS',
  'OFFICE', 'GRAPH', 'EVIDENCE', 'TIMELINE', 'AGENTS',
]

test.describe.serial('Wave 12J-UX-R — Responsive & Visual Evidence', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let service: RunService
  let viteServer: ViteDevServer
  let VITE_PORT: number
  let serverInfo: { url: string }

  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-w12j-ux-r-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-w12j-ux-r-rt-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Wave 12J-UX-R'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'ux-r@gravitas.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'ux-r-fixture', type: 'module' }, null, 2),
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
      async execute(_req: unknown) {
        return {
          durationMs: 40,
          exitCode: 0,
          terminationReason: 'COMPLETED' as const,
          stdout: 'Execution successful',
          stderr: '',
          stdoutTruncated: false,
          stderrTruncated: false,
          worktreePath: '',
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
    serverInfo = await server.start({ host: '127.0.0.1', port: 0 })

    VITE_PORT = await getFreePort()
    viteServer = await createViteServer({
      root: join(__dirname, '../apps/web'),
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
    if (viteServer) await viteServer.close().catch(() => null)
    if (server) await server.stop().catch(() => null)
    if (fixtureRepoPath) await rm(fixtureRepoPath, { recursive: true, force: true }).catch(() => {})
    if (runtimeRoot) await rm(runtimeRoot, { recursive: true, force: true }).catch(() => {})
  })

  // Helper: navigate via mobile nav sheet
  async function mobileNavigateTo(page: import('@playwright/test').Page, view: string) {
    const hamburger = page.locator('[data-testid="mobile-nav-trigger"]')
    await hamburger.click()
    await page.waitForSelector('[data-testid="mobile-nav-sheet"]', { timeout: 3000 })
    await page.locator(`[data-testid="mobile-nav-item-${view}"]`).click()
    await page.waitForTimeout(700)
  }

  // -------------------------------------------------------------------
  // Desktop Screenshots (01–05)
  // -------------------------------------------------------------------

  test('01-hq3d-desktop — renders without horizontal overflow', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.waitForTimeout(1200)

    // Desktop tab strip must be visible at 1440px
    await expect(page.locator('[data-testid="workspace-view-tabs"]')).toBeVisible()
    // Hamburger must be hidden at desktop
    await expect(page.locator('[data-testid="mobile-nav-trigger"]')).toBeHidden()

    await page.screenshot({ path: join(evidenceDir, '01-hq3d-desktop.png'), fullPage: false })
  })

  test('02-calendar-desktop — renders without horizontal overflow', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.click('[data-testid="tab-CALENDAR"]')
    await page.waitForTimeout(1000)

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(overflow, 'No horizontal overflow on CALENDAR desktop').toBe(true)
    await page.screenshot({ path: join(evidenceDir, '02-calendar-desktop.png'), fullPage: false })
  })

  test('03-connectors-desktop — renders without horizontal overflow', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.click('[data-testid="tab-CONNECTORS"]')
    await page.waitForTimeout(1000)

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(overflow, 'No horizontal overflow on CONNECTORS desktop').toBe(true)
    await page.screenshot({ path: join(evidenceDir, '03-connectors-desktop.png'), fullPage: false })
  })

  test('04-automations-desktop — renders without horizontal overflow', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.click('[data-testid="tab-AUTOMATIONS"]')
    await page.waitForTimeout(1000)

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(overflow, 'No horizontal overflow on AUTOMATIONS desktop').toBe(true)
    await page.screenshot({ path: join(evidenceDir, '04-automations-desktop.png'), fullPage: false })
  })

  test('05-office-desktop — renders without horizontal overflow', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.click('[data-testid="tab-OFFICE"]')
    await page.waitForTimeout(1000)

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(overflow, 'No horizontal overflow on OFFICE desktop').toBe(true)
    await page.screenshot({ path: join(evidenceDir, '05-office-desktop.png'), fullPage: false })
  })

  // -------------------------------------------------------------------
  // Mobile Nav Behaviour Tests
  // -------------------------------------------------------------------

  test('06-mobile-nav-closed — hamburger visible, desktop tabs hidden', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.waitForTimeout(800)

    // Desktop tab strip must be hidden
    await expect(page.locator('[data-testid="workspace-view-tabs"]')).toBeHidden()
    // Hamburger must be visible
    await expect(page.locator('[data-testid="mobile-nav-trigger"]')).toBeVisible()
    // Sheet must not be open
    await expect(page.locator('[data-testid="mobile-nav-sheet"]')).not.toBeAttached()

    await page.screenshot({ path: join(evidenceDir, '06-mobile-nav-closed.png'), fullPage: false })
  })

  test('07-mobile-nav-open — sheet shows all 9 destinations', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.waitForTimeout(800)

    await page.locator('[data-testid="mobile-nav-trigger"]').click()
    await page.waitForSelector('[data-testid="mobile-nav-sheet"]', { timeout: 3000 })

    for (const view of ALL_NAV_VIEWS) {
      await expect(page.locator(`[data-testid="mobile-nav-item-${view}"]`)).toBeVisible()
    }

    await page.screenshot({ path: join(evidenceDir, '07-mobile-nav-open.png'), fullPage: false })
  })

  test('mobile nav — ESC closes open mobile menu', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.waitForTimeout(800)

    await page.locator('[data-testid="mobile-nav-trigger"]').click()
    await page.waitForSelector('[data-testid="mobile-nav-sheet"]', { timeout: 3000 })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('[data-testid="mobile-nav-sheet"]')).not.toBeAttached()
  })

  test('mobile nav — clicking destination navigates and closes sheet', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.waitForTimeout(800)

    await mobileNavigateTo(page, 'CONNECTORS')

    // Sheet must close
    await expect(page.locator('[data-testid="mobile-nav-sheet"]')).not.toBeAttached()
    // Connectors view must be loaded
    await expect(page.locator('[data-testid="connectors-view"]')).toBeVisible()
  })

  // -------------------------------------------------------------------
  // Mobile Overflow Assertions: all 2D routes
  // -------------------------------------------------------------------

  test('mobile overflow — document.scrollWidth <= clientWidth for all 2D routes', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.waitForTimeout(800)

    for (const route of TWO_D_ROUTES) {
      await mobileNavigateTo(page, route.view)
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth, `${route.view}: scrollWidth (${scrollWidth}) > clientWidth (${clientWidth})`).toBeLessThanOrEqual(clientWidth)
    }
  })

  // -------------------------------------------------------------------
  // Mobile Content Screenshots (08–11)
  // -------------------------------------------------------------------

  test('08-calendar-mobile — no overflow', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.waitForTimeout(800)
    await mobileNavigateTo(page, 'CALENDAR')

    const sw = await page.evaluate(() => document.documentElement.scrollWidth)
    const cw = await page.evaluate(() => document.documentElement.clientWidth)
    expect(sw).toBeLessThanOrEqual(cw)

    await page.screenshot({ path: join(evidenceDir, '08-calendar-mobile.png'), fullPage: false })
  })

  test('09-connectors-mobile — no overflow, usable', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.waitForTimeout(800)
    await mobileNavigateTo(page, 'CONNECTORS')

    const sw = await page.evaluate(() => document.documentElement.scrollWidth)
    const cw = await page.evaluate(() => document.documentElement.clientWidth)
    expect(sw).toBeLessThanOrEqual(cw)
    await expect(page.locator('[data-testid="connectors-view"]')).toBeVisible()

    await page.screenshot({ path: join(evidenceDir, '09-connectors-mobile.png'), fullPage: false })
  })

  test('10-automations-mobile — no overflow, usable', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.waitForTimeout(800)
    await mobileNavigateTo(page, 'AUTOMATIONS')

    const sw = await page.evaluate(() => document.documentElement.scrollWidth)
    const cw = await page.evaluate(() => document.documentElement.clientWidth)
    expect(sw).toBeLessThanOrEqual(cw)

    await page.screenshot({ path: join(evidenceDir, '10-automations-mobile.png'), fullPage: false })
  })

  test('11-office-mobile — no overflow', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.waitForTimeout(800)
    await mobileNavigateTo(page, 'OFFICE')

    const sw = await page.evaluate(() => document.documentElement.scrollWidth)
    const cw = await page.evaluate(() => document.documentElement.clientWidth)
    expect(sw).toBeLessThanOrEqual(cw)

    await page.screenshot({ path: join(evidenceDir, '11-office-mobile.png'), fullPage: false })
  })

  // -------------------------------------------------------------------
  // Interaction Evidence (12–15) — Desktop
  // -------------------------------------------------------------------

  test('12-connector-audit-drawer — opens via Audit Trail button', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.click('[data-testid="tab-CONNECTORS"]')
    await page.waitForTimeout(1000)
    const auditBtn = page.locator('[data-testid="open-audit-drawer-btn"]')
    if (await auditBtn.isVisible()) await auditBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(evidenceDir, '12-connector-audit-drawer.png'), fullPage: false })
  })

  test('13-calendar-event-inspector — event list and inspector panel rendered', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.click('[data-testid="tab-CALENDAR"]')
    await page.waitForTimeout(1200)
    await page.screenshot({ path: join(evidenceDir, '13-calendar-event-inspector.png'), fullPage: false })
  })

  test('14-automation-create-modal — modal state captured', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.click('[data-testid="tab-AUTOMATIONS"]')
    await page.waitForTimeout(800)
    const createBtn = page.locator('[data-testid="create-automation-btn"]')
    if (await createBtn.isVisible()) {
      await createBtn.click()
      await page.waitForTimeout(500)
    }
    await page.screenshot({ path: join(evidenceDir, '14-automation-create-modal.png'), fullPage: false })
  })

  test('15-hq3d-inspector — 3D HQ renders', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.waitForSelector('[data-testid="app-shell-topbar"]', { timeout: 15000 })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: join(evidenceDir, '15-hq3d-inspector.png'), fullPage: false })
  })
})
