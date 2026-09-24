/**
 * Playwright Visual & Integration Verification Suite for Connector Kernel + Calendar Foundation (Wave 12J)
 *
 * Verifies and captures all required visual proofs into docs/personal-os/evidence/wave12j/:
 * 01-connectors-overview.png
 * 02-connector-accounts-and-capabilities.png
 * 03-add-account-modal.png
 * 04-audit-trail-drawer.png
 * 05-calendar-timeline-view.png
 * 06-calendar-event-detail.png
 * 07-automations-calendar-presets.png
 * 08-3d-hq-zone5-server-bay.png
 */

import { test, expect } from '@playwright/test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer, type ViteDevServer } from 'vite'
import { executeGit } from '@gravitas/git'
import {
  EventHub,
  GravitasServer,
  InMemoryRegistry,
  RunService,
} from '../apps/server/src/index.js'
import { getFreePort } from './test-ports.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const evidenceDir = join(__dirname, '../docs/personal-os/evidence/wave12j')

test.describe.serial('Wave 12J — Connector Kernel & Calendar Foundation Visual Proofs', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let service: RunService
  let viteServer: ViteDevServer
  let VITE_PORT: number
  let serverUrl: string

  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-w12j-spec-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-w12j-spec-rt-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Wave 12J Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'w12j@test.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'w12j-fixture', type: 'module' }, null, 2),
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

  test('01: 01-connectors-overview.png — Connectors registry overview with Google Calendar & Mock provider', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Navigate to CONNECTORS tab
    const connectorsTab = page.locator('button:has-text("CONNECTORS")')
    await expect(connectorsTab).toBeVisible()
    await connectorsTab.click()

    await expect(page.locator('[data-testid="connectors-view"]')).toBeVisible()
    await expect(page.locator('[data-testid="connectors-title"]')).toContainText('Connected External Capabilities')

    // Expect Google Calendar tab and Mock Calendar tab
    await expect(page.locator('[data-testid="connector-tab-calendar-google"]')).toBeVisible()
    await expect(page.locator('[data-testid="connector-tab-calendar-mock"]')).toBeVisible()

    await page.waitForTimeout(400)

    await page.screenshot({
      path: join(evidenceDir, '01-connectors-overview.png'),
      fullPage: true,
    })
  })

  test('02: 02-connector-accounts-and-capabilities.png — Account list and capabilities table', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("CONNECTORS")').click()
    await expect(page.locator('[data-testid="connectors-view"]')).toBeVisible()

    // Select Mock Calendar connector
    await page.locator('[data-testid="connector-tab-calendar-mock"]').click()

    // Assert accounts section and capability items
    await expect(page.locator('[data-testid="account-item-account-mock-default"]')).toBeVisible()
    await expect(page.locator('[data-testid="capability-item-calendar.calendars.read"]')).toBeVisible()
    await expect(page.locator('[data-testid="capability-item-calendar.events.read"]')).toBeVisible()
    await expect(page.locator('[data-testid="capability-item-calendar.event.read"]')).toBeVisible()

    await page.waitForTimeout(300)

    await page.screenshot({
      path: join(evidenceDir, '02-connector-accounts-and-capabilities.png'),
      fullPage: true,
    })
  })

  test('03: 03-add-account-modal.png — Connect / provision account modal', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("CONNECTORS")').click()
    await expect(page.locator('[data-testid="connectors-view"]')).toBeVisible()

    // Click "+ Connect Account"
    await page.locator('button:has-text("+ Connect Account")').click()
    await expect(page.locator('[data-testid="add-account-modal"]')).toBeVisible()

    // Populate mock fields
    await page.locator('[data-testid="input-account-id"]').fill('acc-secondary-calendar')
    await page.locator('[data-testid="input-account-label"]').fill('Secondary Work Calendar')
    await page.locator('[data-testid="input-access-token"]').fill('ya29.sample_synthetic_token_xyz')

    await page.waitForTimeout(300)

    await page.screenshot({
      path: join(evidenceDir, '03-add-account-modal.png'),
      fullPage: true,
    })

    // Submit form
    await page.locator('[data-testid="submit-account-btn"]').click()
    await expect(page.locator('[data-testid="add-account-modal"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="account-item-acc-secondary-calendar"]')).toBeVisible()
  })

  test('04: 04-audit-trail-drawer.png — Sanitized audit trail drawer (zero credentials/tokens)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("CONNECTORS")').click()
    await expect(page.locator('[data-testid="connectors-view"]')).toBeVisible()

    // Trigger Health Check
    await page.locator('[data-testid="check-health-btn"]').click()
    await expect(page.locator('[data-testid="health-status-banner"]')).toBeVisible()

    // Open Audit Trail
    await page.locator('[data-testid="open-audit-drawer-btn"]').click()
    await expect(page.locator('[data-testid="audit-trail-drawer"]')).toBeVisible()

    // Assert that audit entries exist and contain sanitized summaries
    const auditEntries = page.locator('[data-testid="audit-entry"]')
    await expect(auditEntries.first()).toBeVisible()

    // Assert no raw tokens are displayed anywhere in the audit text
    const auditDrawerText = await page.locator('[data-testid="audit-trail-drawer"]').innerText()
    expect(auditDrawerText).not.toContain('ya29.sample_synthetic_token_xyz')
    expect(auditDrawerText).not.toContain('client_secret')
    expect(auditDrawerText).not.toContain('refresh_token')

    await page.waitForTimeout(300)

    await page.screenshot({
      path: join(evidenceDir, '04-audit-trail-drawer.png'),
      fullPage: true,
    })

    // Close audit drawer
    await page.locator('[data-testid="close-audit-drawer-btn"]').click()
    await expect(page.locator('[data-testid="audit-trail-drawer"]')).not.toBeVisible()
  })

  test('05: 05-calendar-timeline-view.png — Calendar timeline view with filters and event cards', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Navigate to CALENDAR tab
    const calendarTab = page.locator('button:has-text("CALENDAR")')
    await expect(calendarTab).toBeVisible()
    await calendarTab.click()

    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible()
    await expect(page.locator('[data-testid="calendar-select"]')).toBeVisible()

    // Expect event cards to be populated
    const eventCards = page.locator('[data-testid^="event-card-"]')
    await expect(eventCards.first()).toBeVisible()

    // Click 'UPCOMING' filter
    await page.locator('[data-testid="filter-btn-UPCOMING"]').click()
    await page.waitForTimeout(300)

    // Click 'ALL' filter
    await page.locator('[data-testid="filter-btn-ALL"]').click()
    await page.waitForTimeout(300)

    await page.screenshot({
      path: join(evidenceDir, '05-calendar-timeline-view.png'),
      fullPage: true,
    })
  })

  test('06: 06-calendar-event-detail.png — Calendar event inspector details panel', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("CALENDAR")').click()
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible()

    // Click the first event card to select it
    const firstEvent = page.locator('[data-testid^="event-card-"]').first()
    await expect(firstEvent).toBeVisible()
    await firstEvent.click()

    // Assert event detail inspector panel
    await expect(page.locator('[data-testid="event-detail-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="event-detail-title"]')).toBeVisible()
    await expect(page.locator('[data-testid="event-detail-time"]')).toBeVisible()

    await page.waitForTimeout(300)

    await page.screenshot({
      path: join(evidenceDir, '06-calendar-event-detail.png'),
      fullPage: true,
    })
  })

  test('07: 07-automations-calendar-presets.png — Automations console with calendar job presets', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Navigate to AUTOMATIONS tab
    const automationsTab = page.locator('button:has-text("AUTOMATIONS")')
    await expect(automationsTab).toBeVisible()
    await automationsTab.click()

    await expect(page.locator('[data-testid="automations-view"]')).toBeVisible()

    // Assert seeded calendar background jobs
    await expect(page.locator('text=Morning Agenda Summary')).toBeVisible()
    await expect(page.locator('text=Calendar Event Reminder')).toBeVisible()
    await expect(page.locator('text=Calendar Conflict Detection')).toBeVisible()

    // Open Create Job modal to show presets
    await page.locator('[data-testid="new-job-button"]').click()
    await expect(page.locator('[data-testid="create-job-modal"]')).toBeVisible()

    // Select CALENDAR_AGENDA preset
    await page.locator('[data-testid="select-job-preset"]').selectOption('CALENDAR_AGENDA')
    await page.locator('[data-testid="input-job-title"]').fill('Executive Morning Calendar Briefing')

    await page.waitForTimeout(300)

    await page.screenshot({
      path: join(evidenceDir, '07-automations-calendar-presets.png'),
      fullPage: true,
    })

    await page.locator('[data-testid="close-create-modal"]').click()
  })

  test('08: 08-3d-hq-zone5-server-bay.png — 3D Headquarters Zone 5 Server Bay / External Capabilities', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Navigate to HQ 3D tab
    const hqTab = page.locator('button:has-text("HQ 3D")')
    await expect(hqTab).toBeVisible()
    await hqTab.click()

    await expect(page.locator('canvas')).toBeVisible()

    // Switch camera to Room 5 (Infrastructure Server Bay) by pressing '5'
    await page.keyboard.press('5')
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: join(evidenceDir, '08-3d-hq-zone5-server-bay.png'),
      fullPage: true,
    })
  })
})
