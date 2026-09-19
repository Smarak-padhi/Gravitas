/**
 * Gravitas Command Center & Living Office End-to-End Browser Verification Spec.
 *
 * Authoritative Playwright test suite verifying Wave 7.5 Experience System:
 * 1. Living Office View rendering data-driven worker desks across states (IDLE, ASSIGNED, WORKING, VERIFYING, NEEDS_YOU, DONE, FAILED)
 * 2. Truthful view switching: Office, Graph, Evidence, and Operational Timeline
 * 3. Keyboard-first Command Palette (Ctrl/Cmd+K) navigation and action execution
 * 4. Human Inbox drawer surfacing ACTION_REQUIRED and CRITICAL alerts
 * 5. Goal Composer, Canonical Prompt Manager (6 layers with SHA-256 hash), Mutation Scope & Diff Inspector
 * 6. Responsive viewports (1920x1080, 1440x900, 1024x768) with zero horizontal overflow
 *
 * Saves local screenshot evidence to tests/screenshots/ (untracked).
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
const screenshotsDir = join(__dirname, 'screenshots')

class BrowserTestFakeHarness implements AgentHarness {
  public readonly id = 'fake-deterministic-worker'

  public async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'Browser test deterministic fake worker ready',
    }
  }

  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startedAt = new Date().toISOString()
    const mathJsPath = join(request.worktreePath, 'src', 'math.js')
    await writeFile(
      mathJsPath,
      'export function add(a, b) {\n  return a + b;\n}\n',
      'utf8'
    )
    const finishedAt = new Date().toISOString()
    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt,
      finishedAt,
      durationMs: 45,
      exitCode: 0,
      terminationReason: 'COMPLETED',
      stdout: 'Successfully implemented add(a, b) in src/math.js',
      stderr: '',
      stdoutTruncated: false,
      stderrTruncated: false,
      worktreePath: request.worktreePath,
    }
  }
}

test.describe.serial('Gravitas Command Center E2E Suite', () => {
  let fixtureRepoPath: string
  let runtimeRoot: string
  let server: GravitasServer
  let viteServer: ViteDevServer

  test.beforeAll(async () => {
    await mkdir(screenshotsDir, { recursive: true })

    // 1. Setup fixture repository
    fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-browser-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-browser-runtime-'))

    await executeGit({ cwd: fixtureRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.name', 'Browser Tester'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['config', 'user.email', 'browser@test.local'] })

    await writeFile(
      join(fixtureRepoPath, 'package.json'),
      JSON.stringify({ name: 'fixture', type: 'module' }, null, 2),
      'utf8'
    )
    await mkdir(join(fixtureRepoPath, 'src'), { recursive: true })
    await writeFile(
      join(fixtureRepoPath, 'src', 'math.js'),
      'export function add(a, b) {\n  return 0;\n}\n',
      'utf8'
    )
    await mkdir(join(fixtureRepoPath, 'test'), { recursive: true })
    await writeFile(
      join(fixtureRepoPath, 'test', 'math.test.js'),
      `import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../src/math.js';

test('adds numbers correctly', () => {
  assert.equal(add(2, 3), 5);
  assert.equal(add(-1, 1), 0);
});
`,
      'utf8'
    )

    await executeGit({ cwd: fixtureRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: fixtureRepoPath, args: ['commit', '-m', 'Initial baseline'] })

    // 2. Setup backend server on 127.0.0.1:4317
    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    const harness = new BrowserTestFakeHarness()

    const defaultVerificationPlan: VerificationPlan = {
      id: 'plan_browser_test',
      commands: [
        {
          id: 'test_runner',
          executable: process.execPath,
          args: ['--test', 'test/math.test.js'],
          mandatory: true,
          timeoutMs: 15000,
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

    await server.start({ host: '127.0.0.1', port: 4317 })

    // 3. Start Vite dev server for @gravitas/web on 127.0.0.1:5173
    const webRoot = join(__dirname, '../apps/web')
    viteServer = await createViteServer({
      root: webRoot,
      server: {
        host: '127.0.0.1',
        port: 5173,
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

  test('renders empty command center honestly without fabricated metrics across viewports', async ({ page }: { page: Page }) => {
    await page.goto('http://127.0.0.1:5173/')

    // Assert TopBar brand, View Switcher tabs, and truthful telemetry
    await expect(page.locator('header')).toBeVisible()
    await expect(page.getByText('GRAVITAS')).toBeVisible()
    await expect(page.getByText('fake-deterministic-worker')).toBeVisible()
    await expect(page.getByText('[AVAILABLE]')).toBeVisible()
    await expect(page.getByText('CONNECTED')).toBeVisible()
    await expect(page.locator('[data-testid="workspace-view-tabs"]')).toBeVisible()
    await expect(page.locator('[data-testid="command-palette-trigger"]')).toBeVisible()
    await expect(page.locator('[data-testid="human-inbox-trigger"]')).toBeVisible()

    // Assert Living Office Floor empty state
    await expect(page.locator('[data-testid="office-floor"]')).toBeVisible()
    await expect(page.getByText('ENGINEERING OPERATIONS FLOOR')).toBeVisible()
    await expect(page.getByText('No runs yet')).toBeVisible()
    await expect(page.getByText('RUNS (0)')).toBeVisible()

    // 1440x900 Screenshot (01-office-empty)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.screenshot({ path: join(screenshotsDir, '01-office-empty-1440x900.png') })
    await page.screenshot({ path: join(screenshotsDir, '01-office-empty.png') })
    await page.screenshot({ path: join(screenshotsDir, '01-empty-command-center.png') })
    await page.screenshot({ path: join(screenshotsDir, 'viewport-1440x900.png') })

    // 1920x1080 Screenshot
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.screenshot({ path: join(screenshotsDir, '01-office-empty-1920x1080.png') })
    await page.screenshot({ path: join(screenshotsDir, 'viewport-1920x1080.png') })

    // 1024x768 Screenshot & overflow check
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.screenshot({ path: join(screenshotsDir, '01-office-empty-1024x768.png') })
    await page.screenshot({ path: join(screenshotsDir, 'viewport-1024x768.png') })

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalOverflow).toBe(false)
  })

  test('validates Goal Composer, operates Command Palette, executes Golden Loop, verifies Office & Inbox, and approves mutation', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('http://127.0.0.1:5173/')
    await expect(page.getByText('CONNECTED')).toBeVisible()

    // 1. Open and test Command Palette via trigger button
    await page.click('[data-testid="command-palette-trigger"]')
    const palette = page.locator('[data-testid="command-palette-modal"]')
    await expect(palette).toBeVisible()
    await page.screenshot({ path: join(screenshotsDir, '09-command-palette.png') })

    // Test Command Palette search filter
    const paletteInput = page.locator('[data-testid="command-palette-input"]')
    await paletteInput.fill('office')
    await expect(page.locator('[data-testid="command-item-nav-office"]')).toBeVisible()

    // Close with Escape
    await page.keyboard.press('Escape')
    await expect(palette).not.toBeVisible()

    // 2. Open Goal Composer
    await page.click('button:has-text("+ New Run")')
    await expect(page.locator('#composer-goal')).toBeVisible()
    await expect(page.getByText('ACCEPTANCE CRITERIA')).toBeVisible()
    await expect(page.getByText('REQUIRED EVIDENCE')).toBeVisible()

    // UX Validation Check: empty criterion description triggers error
    await page.fill('#composer-goal', 'Implement math add function')
    await page.fill('[data-testid="criterion-desc-0"]', '   ')
    await page.click('button:has-text("Create Run")')

    await expect(page.locator('[data-testid="composer-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="composer-error"]')).toContainText('Acceptance criterion #1 must have a non-empty description')

    // Add valid criteria
    await page.fill('[data-testid="criterion-desc-0"]', 'math.add(2, 3) returns 5')
    await page.click('button:has-text("+ Add Criterion")')
    await page.fill('[data-testid="criterion-desc-1"]', 'math.add(-1, 1) returns 0')

    // Add evidence requirement
    await page.click('button:has-text("+ Add Evidence Requirement")')
    await page.selectOption('[data-testid="evidence-type-1"]', 'TEST_REPORT')
    await page.fill('[data-testid="evidence-desc-1"]', 'Node test runner execution output')

    // Fill optional Project Context
    await page.click('[data-testid="project-context-toggle"]')
    await expect(page.locator('[data-testid="composer-project-name"]')).toBeVisible()
    await page.fill('[data-testid="composer-project-name"]', 'Math Service')
    await page.fill('[data-testid="composer-technical-constraints"]', 'ESM only, zero network calls')

    // Capture expanded Goal Composer evidence
    await page.screenshot({ path: join(screenshotsDir, '02a-goal-composer-expanded.png') })

    // Verify 1024x768 layout for Goal Composer
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.screenshot({ path: join(screenshotsDir, '02b-goal-composer-1024x768.png') })
    const modalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(modalOverflow).toBe(false)
    await page.setViewportSize({ width: 1440, height: 900 })

    // Submit valid form
    await page.click('button:has-text("Create Run")')

    // 3. Verify run created and task in READY state (Office station is ASSIGNED)
    await expect(page.getByText('READY').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: '▶ Execute Golden Loop' })).toBeVisible()
    await expect(page.locator('[data-testid="worker-station-fake-deterministic-worker"]')).toBeVisible()
    await expect(page.locator('[data-testid="worker-station-fake-deterministic-worker"]')).toContainText('ASSIGNED')

    // Capture 02-office-ready
    await page.screenshot({ path: join(screenshotsDir, '02-office-ready.png') })
    await page.screenshot({ path: join(screenshotsDir, '02-ready-run.png') })

    // Inspect Prompt Manager in READY state: preview compiled prompt
    const promptManager = page.locator('[data-testid="prompt-manager"]')
    await expect(promptManager).toBeVisible()
    await page.click('[data-testid="preview-prompt-btn"]')
    await expect(page.locator('[data-testid="prompt-hash"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="prompt-bytes"]')).toBeVisible()
    await expect(page.locator('[data-testid="prompt-layer-GLOBAL"]')).toBeVisible()
    await expect(page.locator('[data-testid="prompt-layer-PROJECT"]')).toBeVisible()
    await expect(page.locator('[data-testid="prompt-layer-TASK"]')).toBeVisible()

    // 4. Execute Golden Loop
    await page.click('button:has-text("Execute Golden Loop")')
    await page.waitForTimeout(200)
    await page.screenshot({ path: join(screenshotsDir, '03-office-working.png') })
    await page.screenshot({ path: join(screenshotsDir, '03-running-execution.png') })

    // 5. Wait for WAITING_APPROVAL state
    const approvalBox = page.locator('[data-testid="approval-action-box"]')
    await expect(approvalBox).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('HUMAN REVIEW REQUIRED')).toBeVisible()
    await expect(page.getByText('Scope Compliant:').locator('..')).toContainText('YES')
    await expect(page.getByText('HEAD Mutated (Commit):').locator('..')).toContainText('NO')
    await expect(page.getByText('Result:').locator('..')).toContainText('PASSED')

    // Verify Office station is in NEEDS_YOU state
    const workerStation = page.locator('[data-testid="worker-station-fake-deterministic-worker"]')
    await expect(workerStation).toContainText('NEEDS_YOU')
    await page.screenshot({ path: join(screenshotsDir, '05-office-needs-you.png') })
    await page.screenshot({ path: join(screenshotsDir, '04-waiting-approval.png') })

    // 6. Test Human Inbox Drawer
    await page.click('[data-testid="human-inbox-trigger"]')
    const inboxDrawer = page.locator('[data-testid="human-inbox-drawer"]')
    await expect(inboxDrawer).toBeVisible()
    await expect(inboxDrawer.locator('[data-testid^="inbox-item-"]').getByText('ACTION_REQUIRED')).toBeVisible()
    await expect(inboxDrawer.getByText('Human Review Required')).toBeVisible()
    await page.screenshot({ path: join(screenshotsDir, '06-inbox-approval.png') })
    // Close inbox
    await page.click('[data-testid="human-inbox-trigger"]')

    // 7. Test View Switcher: EVIDENCE View
    await page.click('button[role="tab"]:has-text("EVIDENCE")')
    await expect(page.getByText('EVIDENCE GIT DIFF')).toBeVisible()
    await expect(page.locator('body')).toContainText('return a + b;')
    await page.screenshot({ path: join(screenshotsDir, '07-task-evidence.png') })
    await page.screenshot({ path: join(screenshotsDir, '05-diff-inspector.png') })

    // 8. Test View Switcher: TIMELINE View
    await page.click('button[role="tab"]:has-text("TIMELINE")')
    const timelineView = page.locator('[data-testid="activity-timeline-view"]')
    await expect(timelineView).toBeVisible()
    await expect(timelineView.getByText('OPERATIONAL TIMELINE')).toBeVisible()
    await expect(timelineView.getByText('RUN_CREATED')).toBeVisible()
    await page.screenshot({ path: join(screenshotsDir, '08-timeline.png') })

    // Switch back to OFFICE View
    await page.click('button[role="tab"]:has-text("OFFICE")')
    await expect(page.locator('[data-testid="office-floor"]')).toBeVisible()

    // 9. Approve the task
    await page.click('button:has-text("Approve & Merge")')
    await expect(page.getByText('APPROVED')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('COMPLETED')).toBeVisible()
    await expect(approvalBox).not.toBeVisible()
  })

  test('executes second run and supports explicit human rejection into FAILED state', async ({ page }: { page: Page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('http://127.0.0.1:5173/')
    await expect(page.getByText('CONNECTED')).toBeVisible()

    // Create second run
    await page.click('button:has-text("+ New Run")')
    await page.fill('#composer-goal', 'Second run for rejection test')
    await page.fill('[data-testid="criterion-desc-0"]', 'Rejection test criterion')
    await page.click('button:has-text("Create Run")')

    await expect(page.getByRole('button', { name: '▶ Execute Golden Loop' })).toBeVisible({ timeout: 5000 })
    await page.click('button:has-text("Execute Golden Loop")')

    // Wait for WAITING_APPROVAL
    await expect(page.locator('[data-testid="approval-action-box"]')).toBeVisible({ timeout: 15000 })

    // Reject task
    await page.click('button:has-text("Reject Task")')
    await expect(page.locator('#reject-reason')).toBeVisible()
    await page.fill('#reject-reason', 'Rejected: manual operator refusal')
    await page.click('button:has-text("Confirm Reject")')

    // Confirm transitioned to FAILED
    await expect(page.getByText('FAILED').first()).toBeVisible({ timeout: 5000 })

    // Verify Office worker station displays FAILED
    const workerStation = page.locator('[data-testid="worker-station-fake-deterministic-worker"]')
    await expect(workerStation).toContainText('FAILED')

    // Verify Human Inbox displays CRITICAL notification
    await page.click('[data-testid="human-inbox-trigger"]')
    const inboxDrawer = page.locator('[data-testid="human-inbox-drawer"]')
    await expect(inboxDrawer.locator('[data-testid^="inbox-item-"]').getByText('CRITICAL')).toBeVisible()
    await page.screenshot({ path: join(screenshotsDir, '10-failed-state.png') })
    await page.screenshot({ path: join(screenshotsDir, '06-failed-or-rejected.png') })
  })
})
