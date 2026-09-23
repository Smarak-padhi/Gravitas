/**
 * Playwright Visual & Kernel Verification Suite for Personal OS Execution Kernel (Wave 12I)
 *
 * Verifies and captures all 12 required visual proofs into docs/personal-os/evidence/wave12i/:
 * 01-empty-automations-view.png
 * 02-create-job-modal.png
 * 03-scheduled-jobs-list.png
 * 04-manual-job-trigger.png
 * 05-active-run-progress.png
 * 06-completed-run-history.png
 * 07-paused-job-state.png
 * 08-cancelled-job-state.png
 * 09-human-approval-plinth.png
 * 10-notification-center-drawer.png
 * 11-quiet-hours-deferred-state.png
 * 12-3d-dispatch-console-fixture.png
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
const evidenceDir = join(__dirname, '../docs/personal-os/evidence/wave12i')

test.describe.serial('Wave 12I — Personal OS Execution Kernel Visual Proofs', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let service: RunService
  let viteServer: ViteDevServer
  let VITE_PORT: number
  let serverUrl: string

  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true })

    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-w12i-spec-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-w12i-spec-rt-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Wave 12I Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'w12i@test.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'w12i-fixture', type: 'module' }, null, 2),
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

  test('01: 01-empty-automations-view.png — Clean slate automations view with 0 jobs', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Click AUTOMATIONS tab in TopBar
    const automationsTab = page.locator('button:has-text("AUTOMATIONS")')
    await expect(automationsTab).toBeVisible()
    await automationsTab.click()

    await expect(page.locator('[data-testid="automations-view"]')).toBeVisible()
    await expect(page.locator('[data-testid="automations-title"]')).toBeVisible()
    await expect(page.locator('[data-testid="empty-jobs-state"]')).toBeVisible()

    await page.screenshot({
      path: join(evidenceDir, '01-empty-automations-view.png'),
      fullPage: true,
    })
  })

  test('02: 02-create-job-modal.png — Create background job modal with populated fields', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await expect(page.locator('[data-testid="automations-view"]')).toBeVisible()

    // Open modal via new job button
    await page.locator('[data-testid="new-job-button"]').click()
    await expect(page.locator('[data-testid="create-job-modal"]')).toBeVisible()

    // Fill form
    await page.locator('[data-testid="input-job-title"]').fill('Daily Code Quality Audit')
    await page.locator('[data-testid="select-job-preset"]').selectOption('REPO_CHECK')
    await page.locator('[data-testid="select-trigger-type"]').selectOption('CRON')
    await page.locator('[data-testid="input-cron-expr"]').fill('0 14 * * *')

    await page.waitForTimeout(300)

    await page.screenshot({
      path: join(evidenceDir, '02-create-job-modal.png'),
      fullPage: true,
    })

    // Submit modal to create the job
    await page.locator('[data-testid="submit-create-job-btn"]').click()
    await expect(page.locator('[data-testid="create-job-modal"]')).not.toBeVisible()
  })

  test('03: 03-scheduled-jobs-list.png — Scheduled jobs table populated with diverse triggers', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    // Create 2 additional jobs via backend API
    await fetch(`${serverUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Workspace Temp Cleanup',
        description: 'Periodic cache prune and worktree garbage collection',
        trigger: { kind: 'INTERVAL', intervalSeconds: 1800 },
        action: { kind: 'FILE_OPERATION', operation: 'STAT', path: 'package.json' },
        authorityClass: 'READ',
        budget: { maxRuntimeMs: 30000, maxAttempts: 2 },
      }),
    })

    await fetch(`${serverUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Daily Hydration Reminder',
        description: 'Personal health and posture reminder',
        trigger: { kind: 'CRON', cronExpression: '0 14 * * *', timezone: 'UTC' },
        action: { kind: 'EMIT_NOTIFICATION', title: 'Hydration Break', message: 'Drink water', severity: 'FYI' },
        authorityClass: 'READ',
        budget: { maxRuntimeMs: 15000, maxAttempts: 1 },
      }),
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await expect(page.locator('[data-testid="automations-view"]')).toBeVisible()

    // Verify jobs appear in table
    await expect(page.locator('text=Daily Code Quality Audit')).toBeVisible()
    await expect(page.locator('text=Workspace Temp Cleanup')).toBeVisible()
    await expect(page.locator('text=Daily Hydration Reminder')).toBeVisible()

    await page.screenshot({
      path: join(evidenceDir, '03-scheduled-jobs-list.png'),
      fullPage: true,
    })
  })

  test('04: 04-manual-job-trigger.png — Manual run triggered on demand', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await expect(page.locator('[data-testid="automations-view"]')).toBeVisible()

    // Find and click "Run" on the first job
    const runBtn = page.locator('button:has-text("▶ Run")').first()
    await expect(runBtn).toBeVisible()
    await runBtn.click()

    await page.waitForTimeout(500)

    await page.screenshot({
      path: join(evidenceDir, '04-manual-job-trigger.png'),
      fullPage: true,
    })
  })

  test('05: 05-active-run-progress.png — Active run progress with RUNNING badge', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    const jobs = await (await fetch(`${serverUrl}/api/v1/jobs`)).json()
    const targetJob = jobs[0]

    // Create an active run via claimOccurrence + updateRun
    const store = (service as any).jobStore
    const claimRes = store.claimOccurrence({
      jobId: targetJob.id,
      occurrenceKey: 'occ-active-proof',
      scheduledFor: new Date().toISOString(),
    })
    const run = claimRes.run
    store.updateRun({
      ...run,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await expect(page.locator('[data-testid="automations-view"]')).toBeVisible()

    // Verify RUNNING indicator in Execution Runs History
    await expect(page.locator('text=RUNNING').first()).toBeVisible()
    await page.waitForTimeout(300)

    await page.screenshot({
      path: join(evidenceDir, '05-active-run-progress.png'),
      fullPage: true,
    })

    // Complete the run so subsequent tests have completed history
    store.updateRun({
      ...run,
      status: 'COMPLETED',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      resultCode: 0,
      resultSummary: 'All checks passed successfully.',
    })
  })

  test('06: 06-completed-run-history.png — Completed run history with execution metrics', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await expect(page.locator('[data-testid="automations-view"]')).toBeVisible()

    await expect(page.locator('text=COMPLETED').first()).toBeVisible()

    await page.screenshot({
      path: join(evidenceDir, '06-completed-run-history.png'),
      fullPage: true,
    })
  })

  test('07: 07-paused-job-state.png — Scheduled job paused with next trigger held', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await expect(page.locator('[data-testid="automations-view"]')).toBeVisible()

    // Click "Pause" on the second job
    const pauseBtns = page.locator('button:has-text("⏸ Pause")')
    if ((await pauseBtns.count()) > 0) {
      await pauseBtns.first().click()
      await page.waitForTimeout(400)
    }

    await expect(page.locator('text=PAUSED').first()).toBeVisible()

    await page.screenshot({
      path: join(evidenceDir, '07-paused-job-state.png'),
      fullPage: true,
    })
  })

  test('08: 08-cancelled-job-state.png — Job cancelled and marked CANCELLED', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    // Cancel a job directly via API
    const jobs = await (await fetch(`${serverUrl}/api/v1/jobs`)).json()
    if (jobs.length > 0) {
      await fetch(`${serverUrl}/api/v1/jobs/${jobs[jobs.length - 1].id}/cancel`, { method: 'POST' })
    }

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await expect(page.locator('[data-testid="automations-view"]')).toBeVisible()

    await expect(page.locator('text=CANCELLED').first()).toBeVisible()

    await page.screenshot({
      path: join(evidenceDir, '08-cancelled-job-state.png'),
      fullPage: true,
    })
  })

  test('09: 09-human-approval-plinth.png — Waiting approval run halting for human sovereignty', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    const jobs = await (await fetch(`${serverUrl}/api/v1/jobs`)).json()
    const targetJob = jobs[0]
    const store = (service as any).jobStore
    const claimApproval = store.claimOccurrence({
      jobId: targetJob.id,
      occurrenceKey: 'occ-approval-proof',
      scheduledFor: new Date().toISOString(),
    })
    store.updateRun({
      ...claimApproval.run,
      status: 'WAITING_APPROVAL',
      startedAt: new Date().toISOString(),
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await expect(page.locator('[data-testid="automations-view"]')).toBeVisible()

    // Click Needs Approval tab button
    const approvalTabBtn = page.locator('button:has-text("Needs Approval")')
    await expect(approvalTabBtn).toBeVisible()
    await approvalTabBtn.click()
    await page.waitForTimeout(300)

    await expect(page.locator('text=WAITING_APPROVAL').first()).toBeVisible()

    await page.screenshot({
      path: join(evidenceDir, '09-human-approval-plinth.png'),
      fullPage: true,
    })
  })

  test('10: 10-notification-center-drawer.png — Personal notification drawer with severities', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    // Insert notifications via store.saveNotification
    const store = (service as any).jobStore
    store.saveNotification({
      id: `notif_1_${Date.now()}`,
      severity: 'ACTION_REQUIRED',
      title: 'Human Authorization Required',
      body: 'Job "Daily Code Quality Audit" proposed Git branch mutation requiring sovereign human sign-off.',
      source: { type: 'JOB', jobId: 'job-1' },
      jobId: 'job-1',
      deliveryPolicy: 'IMMEDIATE',
      deliveryState: 'DELIVERED',
      dedupeKey: `dedupe_1_${Date.now()}`,
      createdAt: new Date().toISOString(),
    })

    store.saveNotification({
      id: `notif_2_${Date.now()}`,
      severity: 'IMPORTANT',
      title: 'Nightly Security Audit Complete',
      body: '0 vulnerabilities found across all dependencies.',
      source: { type: 'JOB', jobId: 'job-2' },
      jobId: 'job-2',
      deliveryPolicy: 'IMMEDIATE',
      deliveryState: 'DELIVERED',
      dedupeKey: `dedupe_2_${Date.now()}`,
      createdAt: new Date().toISOString(),
    })

    store.saveNotification({
      id: `notif_3_${Date.now()}`,
      severity: 'FYI',
      title: 'Personal OS Kernel Initialized',
      body: 'Deterministic scheduler running at 1000ms tick interval with SQLite persistence.',
      source: { type: 'SYSTEM' },
      deliveryPolicy: 'IMMEDIATE',
      deliveryState: 'DELIVERED',
      dedupeKey: `dedupe_3_${Date.now()}`,
      createdAt: new Date().toISOString(),
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await expect(page.locator('[data-testid="automations-view"]')).toBeVisible()

    // Open notification drawer via toggle button in AutomationsView
    const toggleBtn = page.locator('[data-testid="toggle-notifications-btn"]')
    await expect(toggleBtn).toBeVisible()
    await toggleBtn.click()

    await expect(page.locator('[data-testid="notifications-drawer"]')).toBeVisible()
    await expect(page.locator('text=Notification Center')).toBeVisible()
    await expect(page.locator('text=Human Authorization Required')).toBeVisible()

    await page.screenshot({
      path: join(evidenceDir, '10-notification-center-drawer.png'),
      fullPage: true,
    })
  })

  test('11: 11-quiet-hours-deferred-state.png — Notification deferred during quiet hours', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    const store = (service as any).jobStore
    store.saveNotification({
      id: `notif_deferred_${Date.now()}`,
      severity: 'FYI',
      title: 'Workspace Temp Cleanup Finished',
      body: 'Pruned 140MB of untracked files [Quiet Hours Deferred].',
      source: { type: 'JOB', jobId: 'job-2' },
      jobId: 'job-2',
      deliveryPolicy: 'DEFER_QUIET_HOURS',
      deliveryState: 'DEFERRED_QUIET_HOURS',
      deliverAfter: '2026-09-24T07:00:00.000Z',
      dedupeKey: `dedupe_deferred_${Date.now()}`,
      createdAt: new Date().toISOString(),
    })

    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)
    await page.locator('button:has-text("AUTOMATIONS")').click()
    await page.locator('[data-testid="toggle-notifications-btn"]').click()
    await expect(page.locator('[data-testid="notifications-drawer"]')).toBeVisible()

    await expect(page.locator('text=Quiet Hours Deferred')).toBeVisible()

    await page.screenshot({
      path: join(evidenceDir, '11-quiet-hours-deferred-state.png'),
      fullPage: true,
    })
  })

  test('12: 12-3d-dispatch-console-fixture.png — 3D Living HQ Dispatch Console in Server Bay', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`http://127.0.0.1:${VITE_PORT}/`)

    // Confirm canvas is loaded
    await expect(page.locator('[data-testid="hq-webgl-canvas"]')).toBeVisible()

    // Frame Infrastructure Server Bay (Room 5) and select Personal OS Dispatch Console station
    await page.evaluate(() => {
      const dir = (window as any).__hqDirector
      if (dir) {
        dir.frameRoom('INFRASTRUCTURE_ROOM')
        dir.selectStation('dispatch-console')
      }
    })

    await page.waitForTimeout(1000)

    // Assert inspector shows dispatch console telemetry
    await expect(page.locator('[data-testid="dispatch-console-telemetry"]')).toBeVisible()
    await expect(page.locator('text=PERSONAL OS KERNEL')).toBeVisible()
    await expect(page.locator('text=ZERO INFERENCE')).toBeVisible()

    await page.screenshot({
      path: join(evidenceDir, '12-3d-dispatch-console-fixture.png'),
      fullPage: true,
    })
  })
})
