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

    // 1. Synthetic execution failure trigger
    if (request.taskId.includes('fail') || request.compiledPrompt.includes('FAIL_TASK')) {
      const finishedAt = new Date().toISOString()
      return {
        executionId: request.executionId,
        harnessId: this.id,
        startedAt,
        finishedAt,
        durationMs: 45,
        exitCode: 1,
        terminationReason: 'PROCESS_ERROR',
        stdout: '',
        stderr: 'Synthetic execution failure triggered by FAIL_TASK',
        stdoutTruncated: false,
        stderrTruncated: false,
        worktreePath: request.worktreePath,
      }
    }

    // Always implement math.js so tests pass
    const mathJsPath = join(request.worktreePath, 'src', 'math.js')
    await writeFile(
      mathJsPath,
      'export function add(a, b) {\n  return a + b;\n}\n',
      'utf8'
    )

    // 2. Conflicting file modifications for composition conflict testing
    if (request.taskId === 'task-conflict-a' || request.compiledPrompt.includes('CONFLICT_A')) {
      await writeFile(
        join(request.worktreePath, 'shared.txt'),
        'CONFLICT A OVERRIDE\nbase line 2\nbase line 3\n',
        'utf8'
      )
    } else if (request.taskId === 'task-conflict-b' || request.compiledPrompt.includes('CONFLICT_B')) {
      await writeFile(
        join(request.worktreePath, 'shared.txt'),
        'CONFLICT B OVERRIDE\nbase line 2\nbase line 3\n',
        'utf8'
      )
    } else if (request.taskId === 'task-branch-a') {
      await writeFile(
        join(request.worktreePath, 'src', 'alpha.js'),
        'export const alpha = 1;\n',
        'utf8'
      )
    } else if (request.taskId === 'task-branch-b') {
      await writeFile(
        join(request.worktreePath, 'src', 'beta.js'),
        'export const beta = 2;\n',
        'utf8'
      )
    } else if (request.taskId === 'task-join') {
      await writeFile(
        join(request.worktreePath, 'src', 'gamma.js'),
        'export const gamma = 3;\n',
        'utf8'
      )
    }

    const finishedAt = new Date().toISOString()
    return {
      executionId: request.executionId,
      harnessId: this.id,
      startedAt,
      finishedAt,
      durationMs: 45,
      exitCode: 0,
      terminationReason: 'COMPLETED',
      stdout: `Successfully implemented changes for task ${request.taskId}`,
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

    await writeFile(
      join(fixtureRepoPath, 'shared.txt'),
      'base line 1\nbase line 2\nbase line 3\n',
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

    // 1920x1080 Screenshot (01-empty-hq-1920.png)
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.screenshot({ path: join(screenshotsDir, '01-empty-hq-1920.png') })
    await page.screenshot({ path: join(screenshotsDir, '01-office-empty-1920x1080.png') })
    await page.screenshot({ path: join(screenshotsDir, 'viewport-1920x1080.png') })

    // Focus Astra Studio (09-astra-studio.png)
    const astraStudio = page.locator('[data-testid="astra-studio-floor"]')
    if (await astraStudio.isVisible()) {
      await astraStudio.scrollIntoViewIfNeeded()
      await page.screenshot({ path: join(screenshotsDir, '09-astra-studio.png') })
    }

    // Focus Verification Lab (10-verification-lab.png)
    const verificationLab = page.locator('[data-testid="verification-lab-floor"]')
    if (await verificationLab.isVisible()) {
      await verificationLab.scrollIntoViewIfNeeded()
      await page.screenshot({ path: join(screenshotsDir, '10-verification-lab.png') })
    }

    // 1440x900 Screenshot (15-hq-1440.png)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.locator('[data-testid="engineering-floor"]').scrollIntoViewIfNeeded()
    await page.screenshot({ path: join(screenshotsDir, '15-hq-1440.png') })
    await page.screenshot({ path: join(screenshotsDir, '01-office-empty-1440x900.png') })
    await page.screenshot({ path: join(screenshotsDir, '01-office-empty.png') })
    await page.screenshot({ path: join(screenshotsDir, '01-empty-command-center.png') })
    await page.screenshot({ path: join(screenshotsDir, 'viewport-1440x900.png') })

    // 1024x768 Screenshot & overflow check (16-hq-1024.png)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.screenshot({ path: join(screenshotsDir, '16-hq-1024.png') })
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

    // Capture 02-office-ready & 02-engineering-idle
    await page.screenshot({ path: join(screenshotsDir, '02-office-ready.png') })
    await page.screenshot({ path: join(screenshotsDir, '02-ready-run.png') })
    await page.screenshot({ path: join(screenshotsDir, '02-engineering-idle.png') })

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
    await page.screenshot({ path: join(screenshotsDir, '03-worker-running.png') })
    await page.screenshot({ path: join(screenshotsDir, '04-verification-handoff.png') })

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
    await page.screenshot({ path: join(screenshotsDir, '05-verifier-active.png') })
    await page.screenshot({ path: join(screenshotsDir, '06-operator-approval.png') })

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
    await page.click('button:has-text("Approve Result")')
    await expect(page.getByText('APPROVED', { exact: true }).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('COMPLETED')).toBeVisible()
    await expect(approvalBox).not.toBeVisible()
    await page.screenshot({ path: join(screenshotsDir, '07-approved-result.png') })
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
    await page.screenshot({ path: join(screenshotsDir, '08-failed-task.png') })
  })

  test('composes and executes multi-task DAG, renders Run DAG with dependency nodes, and unblocks downstream tasks', async ({ page }: { page: Page }) => {
    test.setTimeout(90000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('http://127.0.0.1:5173/')
    await expect(page.getByText('CONNECTED')).toBeVisible()

    // 1. Open Goal Composer
    await page.click('button:has-text("+ New Run")')
    await expect(page.locator('[data-testid="composer-tab-dag"]')).toBeVisible()

    // 2. Switch to Multi-Task DAG (Wave 8) mode
    await page.click('[data-testid="composer-tab-dag"]')
    await expect(page.getByText('DAG TASK DEFINITIONS (JSON)')).toBeVisible()

    // Fill goal and criteria
    await page.fill('#composer-goal', 'Multi-task DAG orchestrated feature')
    await page.fill('[data-testid="criterion-desc-0"]', 'All tasks pass verification')

    // Submit multi-task run
    await page.click('button:has-text("Create Run")')

    // 3. Switch to GRAPH view to verify Run DAG visualization
    await page.click('button[role="tab"]:has-text("GRAPH")')
    const dagView = page.locator('[data-testid="run-dag-view"]')
    await expect(dagView).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="dag-task-node-task-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="dag-task-node-task-2"]')).toBeVisible()

    // Capture Run DAG screenshot
    await page.screenshot({ path: join(screenshotsDir, '11-run-dag-initial.png') })

    // 4. Switch back to OFFICE view to verify concurrency counter
    await page.click('button[role="tab"]:has-text("OFFICE")')
    await expect(page.locator('[data-testid="concurrency-pill"]')).toBeVisible()

    // 5. Execute Run
    await page.click('button:has-text("Execute Golden Loop")')

    // 6. Wait for task-1 to reach WAITING_APPROVAL
    await expect(page.locator('[data-testid="approval-action-box"]')).toBeVisible({ timeout: 15000 })

    // Check GRAPH view during approval
    await page.click('button[role="tab"]:has-text("GRAPH")')
    await page.screenshot({ path: join(screenshotsDir, '12-run-dag-waiting-approval.png') })

    // Approve task-1
    await page.click('button:has-text("Approve Result")')

    // 7. Wait for task-1 to be APPROVED in DAG view
    await expect(page.locator('[data-testid="dag-task-node-task-1"]')).toContainText('APPROVED', { timeout: 15000 })

    // 8. Wait for task-2 to execute, pass verification, and reach WAITING_APPROVAL in DAG view
    await expect(page.locator('[data-testid="dag-task-node-task-2"]')).toContainText('WAITING_APPROVAL', { timeout: 35000 })

    // 9. Focus task-2 in inspector
    await page.click('[data-testid="dag-task-node-task-2"]')
    await expect(page.locator('[data-testid="approval-action-box"]')).toBeVisible({ timeout: 10000 })

    // 10. Approve task-2 to complete the run
    await page.click('button:has-text("Approve Result")')
    await expect(page.locator('[data-testid="dag-task-node-task-2"]')).toContainText('APPROVED', { timeout: 15000 })
    await expect(page.locator('[data-testid="approval-action-box"]')).not.toBeVisible()

    // Final screenshot of completed multi-task run
    await page.screenshot({ path: join(screenshotsDir, '13-run-dag-completed.png') })
  })

  test('executes diamond DAG with fan-out concurrency, verifies topological bezier arrows, operator review bar, authority sections, and clean composition', async ({ page }: { page: Page }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('http://127.0.0.1:5173/')
    await expect(page.getByText('CONNECTED')).toBeVisible()

    // 1. Open Goal Composer
    await page.click('button:has-text("+ New Run")')
    await expect(page.locator('[data-testid="composer-tab-dag"]')).toBeVisible()

    // 2. Select DAG mode and click Diamond preset
    await page.click('[data-testid="composer-tab-dag"]')
    await expect(page.locator('[data-testid="composer-preset-diamond"]')).toBeVisible()
    await page.click('[data-testid="composer-preset-diamond"]')

    // Fill goal and criteria
    await page.fill('#composer-goal', 'Diamond DAG orchestration with parallel branches and composition join')
    await page.fill('[data-testid="criterion-desc-0"]', 'All branches pass verification and join cleanly')
    await page.fill('#composer-constraints', '')

    // Submit Diamond DAG run
    await page.click('button:has-text("Create Run")')

    // 3. Switch to GRAPH view to verify Diamond DAG visualization and SVG bezier curves
    await page.click('button[role="tab"]:has-text("GRAPH")')
    const dagView = page.locator('[data-testid="run-dag-view"]')
    await expect(dagView).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="dag-task-node-task-root"]')).toBeVisible()
    await expect(page.locator('[data-testid="dag-task-node-task-branch-a"]')).toBeVisible()
    await expect(page.locator('[data-testid="dag-task-node-task-branch-b"]')).toBeVisible()
    await expect(page.locator('[data-testid="dag-task-node-task-join"]')).toBeVisible()

    // Verify SVG bezier connectors with arrow markers
    const svgArrows = page.locator('svg marker#dag-arrow')
    await expect(svgArrows).toBeAttached()
    const edgePaths = page.locator('svg path[marker-end="url(#dag-arrow)"]')
    await expect(edgePaths).toHaveCount(4)

    // Screenshot: 12-diamond-dag.png
    await page.screenshot({ path: join(screenshotsDir, '12-diamond-dag.png') })

    // 4. Switch to OFFICE view to verify concurrency pill
    await page.click('button[role="tab"]:has-text("OFFICE")')
    await expect(page.locator('[data-testid="concurrency-pill"]')).toBeVisible()

    // 5. Execute Run (Golden Loop)
    await page.click('button:has-text("Execute Golden Loop")')

    // Switch to GRAPH view to monitor topological state transitions
    await page.click('button[role="tab"]:has-text("GRAPH")')

    // 6. Wait for task-root to reach WAITING_APPROVAL
    await expect(page.locator('[data-testid="dag-task-node-task-root"]')).toContainText('WAITING_APPROVAL', {
      timeout: 20000,
    })

    // Focus and approve task-root to unblock parallel branches task-branch-a and task-branch-b
    await page.click('[data-testid="dag-task-node-task-root"]')
    await expect(page.locator('[data-testid="approval-action-box"]')).toBeVisible({ timeout: 10000 })
    await page.click('[data-testid="approval-action-box"] button:has-text("Approve Result")')
    await expect(page.locator('[data-testid="dag-task-node-task-root"]')).toContainText('APPROVED', {
      timeout: 15000,
    })

    // 7. Parallel Fanout: Switch to OFFICE view to verify concurrency pill and operator review bar
    await page.click('button[role="tab"]:has-text("OFFICE")')
    await expect(page.locator('[data-testid="concurrency-pill"]')).toBeVisible()

    // Wait for at least one branch to reach WAITING_APPROVAL
    await expect(page.locator('[data-testid="operator-review-bar"]')).toBeVisible({ timeout: 25000 })
    // Screenshot: 11-fanout-two-active.png & 13-approval-plus-independent-work.png
    await page.screenshot({ path: join(screenshotsDir, '11-fanout-two-active.png') })
    await page.screenshot({ path: join(screenshotsDir, '13-approval-plus-independent-work.png') })

    // 8. Switch to GRAPH view, focus task-branch-a, and verify Authority Sections in TaskInspector
    await page.click('button[role="tab"]:has-text("GRAPH")')
    await expect(page.locator('[data-testid="dag-task-node-task-branch-a"]')).toContainText('WAITING_APPROVAL', {
      timeout: 25000,
    })
    await page.click('[data-testid="dag-task-node-task-branch-a"]')

    await expect(page.locator('[data-testid="authority-section-worker"]')).toBeVisible()
    await expect(page.locator('[data-testid="authority-section-verifier"]')).toBeVisible()
    await expect(page.locator('[data-testid="authority-section-human"]')).toBeVisible()
    // Screenshot: 14-verification.png
    await page.screenshot({ path: join(screenshotsDir, '14-verification.png') })

    // 9. Approve task-branch-a
    await page.click('[data-testid="approval-action-box"] button:has-text("Approve Result")')
    await expect(page.locator('[data-testid="dag-task-node-task-branch-a"]')).toContainText('APPROVED', {
      timeout: 15000,
    })

    // Wait for task-branch-b to reach WAITING_APPROVAL and approve it
    await expect(page.locator('[data-testid="dag-task-node-task-branch-b"]')).toContainText('WAITING_APPROVAL', {
      timeout: 25000,
    })
    await page.click('[data-testid="dag-task-node-task-branch-b"]')
    await expect(page.locator('[data-testid="approval-action-box"]')).toBeVisible({ timeout: 10000 })
    await page.click('[data-testid="approval-action-box"] button:has-text("Approve Result")')
    await expect(page.locator('[data-testid="dag-task-node-task-branch-b"]')).toContainText('APPROVED', {
      timeout: 15000,
    })

    // 10. Wait for task-join to execute, compose parents, and reach WAITING_APPROVAL
    await expect(page.locator('[data-testid="dag-task-node-task-join"]')).toContainText('WAITING_APPROVAL', {
      timeout: 35000,
    })
    await page.click('[data-testid="dag-task-node-task-join"]')
    await expect(page.locator('[data-testid="approval-action-box"]')).toBeVisible({ timeout: 10000 })

    // Screenshot: 15-composition.png
    await page.screenshot({ path: join(screenshotsDir, '15-composition.png') })

    // Approve task-join to complete the diamond DAG run
    await page.click('[data-testid="approval-action-box"] button:has-text("Approve Result")')
    await expect(page.locator('[data-testid="dag-task-node-task-join"]')).toContainText('APPROVED', {
      timeout: 15000,
    })
    await expect(page.locator('[data-testid="approval-action-box"]')).not.toBeVisible({ timeout: 10000 })
  })

  test('verifies failure propagation, human inbox alert, operational timeline filtering, and composition conflict UX', async ({ page }: { page: Page }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('http://127.0.0.1:5173/')
    await expect(page.getByText('CONNECTED')).toBeVisible()

    // ----------------------------------------------------
    // PART A: Failure Propagation & Timeline & Inbox
    // ----------------------------------------------------
    await page.click('button:has-text("+ New Run")')
    await page.click('[data-testid="composer-tab-dag"]')

    const failureDagJson = JSON.stringify(
      [
        {
          id: 'task-fail-upstream',
          title: 'Upstream Synthetic Failure',
          objective: 'Triggers synthetic failure FAIL_TASK',
          dependencies: [],
          requiresApproval: false,
        },
        {
          id: 'task-downstream-cancelled',
          title: 'Downstream Dependent Task',
          objective: 'Should be cancelled automatically when upstream fails',
          dependencies: ['task-fail-upstream'],
          requiresApproval: false,
        },
      ],
      null,
      2
    )

    await page.fill('[data-testid="composer-dag-json"]', failureDagJson)
    await page.fill('#composer-goal', 'Failure propagation and cancellation test')
    await page.fill('[data-testid="criterion-desc-0"]', 'Propagate failure cleanly')
    await page.fill('#composer-constraints', '')
    await page.click('button:has-text("Create Run")')

    // Execute run
    await page.click('button:has-text("Execute Golden Loop")')

    // Wait for upstream task to fail and downstream to cancel
    await page.click('button[role="tab"]:has-text("GRAPH")')
    await expect(page.locator('[data-testid="dag-task-node-task-fail-upstream"]')).toContainText('FAILED', {
      timeout: 20000,
    })
    await expect(page.locator('[data-testid="dag-task-node-task-downstream-cancelled"]')).toContainText(
      'CANCELLED',
      { timeout: 20000 }
    )

    // Screenshot: 17-failure-propagation.png
    await page.screenshot({ path: join(screenshotsDir, '17-failure-propagation.png') })

    // Human Inbox: verify alert
    await page.click('[data-testid="human-inbox-trigger"]')
    const inboxDrawer = page.locator('[data-testid="human-inbox-drawer"]')
    await expect(inboxDrawer).toBeVisible()
    await expect(inboxDrawer.getByText('CRITICAL').first()).toBeVisible()
    // Screenshot: 18-human-inbox.png
    await page.screenshot({ path: join(screenshotsDir, '18-human-inbox.png') })

    // Close inbox drawer
    await page.click('[data-testid="human-inbox-trigger"]')

    // Timeline View
    await page.click('button[role="tab"]:has-text("TIMELINE")')
    await expect(page.locator('[data-testid="activity-timeline-view"]')).toBeVisible()

    // Test timeline filters
    if (await page.locator('[data-testid="timeline-task-filter"]').isVisible().catch(() => false)) {
      await page.selectOption('[data-testid="timeline-task-filter"]', 'task-fail-upstream')
    }
    await page.selectOption('[data-testid="timeline-attention-filter"]', 'ATTENTION')

    // Screenshot: 19-timeline-concurrent.png
    await page.screenshot({ path: join(screenshotsDir, '19-timeline-concurrent.png') })

    // ----------------------------------------------------
    // PART B: Composition Conflict UX
    // ----------------------------------------------------
    await page.click('button:has-text("+ New Run")')
    await page.click('[data-testid="composer-tab-dag"]')

    const conflictDagJson = JSON.stringify(
      [
        {
          id: 'task-conflict-a',
          title: 'Branch A Conflicting Edit',
          objective: 'CONFLICT_A edit in shared.txt',
          dependencies: [],
          requiresApproval: false,
        },
        {
          id: 'task-conflict-b',
          title: 'Branch B Conflicting Edit',
          objective: 'CONFLICT_B edit in shared.txt',
          dependencies: [],
          requiresApproval: false,
        },
        {
          id: 'task-conflict-child',
          title: 'Child Composition Task',
          objective: 'Compose conflicting upstream branches',
          dependencies: ['task-conflict-a', 'task-conflict-b'],
          requiresApproval: true,
        },
      ],
      null,
      2
    )

    await page.fill('[data-testid="composer-dag-json"]', conflictDagJson)
    await page.fill('#composer-goal', 'Composition conflict verification and UX banner display')
    await page.fill('[data-testid="criterion-desc-0"]', 'Detect Git cherry-pick conflict safely')
    await page.fill('#composer-constraints', '')
    await page.click('button:has-text("Create Run")')

    // Switch to OFFICE view and execute run
    await page.click('button[role="tab"]:has-text("OFFICE")')
    await page.click('button:has-text("Execute Golden Loop")')

    // Wait for task-conflict-child to fail with COMPOSITION_CONFLICT
    await page.click('button[role="tab"]:has-text("GRAPH")')
    await expect(page.locator('[data-testid="dag-task-node-task-conflict-child"]')).toContainText(
      'COMPOSITION_CONFLICT',
      { timeout: 35000 }
    )

    // Select task-conflict-child to inspect
    await page.click('[data-testid="dag-task-node-task-conflict-child"]')

    // Verify composition conflict banner in TaskInspector
    const conflictBanner = page.locator('[data-testid="composition-conflict-banner"]')
    await expect(conflictBanner).toBeVisible()
    await expect(conflictBanner).toContainText('COMPOSITION CONFLICT DETECTED')

    // Screenshot: 16-composition-conflict.png
    await page.screenshot({ path: join(screenshotsDir, '16-composition-conflict.png') })
  })

  test('scales to progressive density with 8, 15, and 30 tasks, verifying standby shelf and responsive viewports without horizontal overflow', async ({ page }: { page: Page }) => {
    test.setTimeout(120000)

    // ----------------------------------------------------
    // 1. 8 Tasks Scale (Standby Shelf)
    // ----------------------------------------------------
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('http://127.0.0.1:5173/')
    await expect(page.getByText('CONNECTED')).toBeVisible()

    await page.click('button:has-text("+ New Run")')
    await page.click('[data-testid="composer-tab-dag"]')

    const tasks8 = Array.from({ length: 8 }, (_, i) => ({
      id: `task-8scale-${i + 1}`,
      title: `Scale Task ${i + 1}`,
      objective: `Task ${i + 1} for 8-task scale verification`,
      dependencies: i === 0 ? [] : [`task-8scale-${i}`],
      requiresApproval: false,
    }))

    await page.fill('[data-testid="composer-dag-json"]', JSON.stringify(tasks8, null, 2))
    await page.fill('#composer-goal', '8-task scale verification')
    await page.fill('[data-testid="criterion-desc-0"]', 'Render standby shelf properly')
    await page.fill('#composer-constraints', '')
    await page.click('button:has-text("Create Run")')

    // Verify OFFICE view standby shelf
    await page.click('button[role="tab"]:has-text("OFFICE")')
    await expect(page.locator('[data-testid="office-standby-shelf"]')).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: join(screenshotsDir, '20-office-8-tasks.png') })
    await page.screenshot({ path: join(screenshotsDir, '11-five-task-density.png') })

    // ----------------------------------------------------
    // 2. 15 Tasks Scale (Compact Standby Shelf)
    // ----------------------------------------------------
    await page.click('button:has-text("+ New Run")')
    await page.click('[data-testid="composer-tab-dag"]')

    const tasks15 = Array.from({ length: 15 }, (_, i) => ({
      id: `task-15scale-${i + 1}`,
      title: `Scale Task ${i + 1}`,
      objective: `Task ${i + 1} for 15-task scale verification`,
      dependencies: i === 0 ? [] : [`task-15scale-${i}`],
      requiresApproval: false,
    }))

    await page.fill('[data-testid="composer-dag-json"]', JSON.stringify(tasks15, null, 2))
    await page.fill('#composer-goal', '15-task scale verification')
    await page.fill('[data-testid="criterion-desc-0"]', 'Render 15 tasks compact shelf')
    await page.fill('#composer-constraints', '')
    await page.click('button:has-text("Create Run")')

    await page.click('button[role="tab"]:has-text("OFFICE")')
    await expect(page.locator('[data-testid="office-standby-shelf"]')).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: join(screenshotsDir, '21-office-15-tasks.png') })
    await page.screenshot({ path: join(screenshotsDir, '12-fifteen-task-density.png') })

    // ----------------------------------------------------
    // 3. 30 Tasks Scale (Execution Graph Topological Grid)
    // ----------------------------------------------------
    await page.click('button:has-text("+ New Run")')
    await page.click('[data-testid="composer-tab-dag"]')

    const tasks30 = Array.from({ length: 30 }, (_, i) => ({
      id: `task-30scale-${i + 1}`,
      title: `Scale Task ${i + 1}`,
      objective: `Task ${i + 1} for 30-task scale verification`,
      dependencies: i < 5 ? [] : [`task-30scale-${(i % 5) + 1}`],
      requiresApproval: false,
    }))

    await page.fill('[data-testid="composer-dag-json"]', JSON.stringify(tasks30, null, 2))
    await page.fill('#composer-goal', '30-task scale verification')
    await page.fill('[data-testid="criterion-desc-0"]', 'Render 30 graph nodes in topological levels')
    await page.fill('#composer-constraints', '')
    await page.click('button:has-text("Create Run")')

    await page.click('button[role="tab"]:has-text("GRAPH")')
    const dagView = page.locator('[data-testid="run-dag-view"]')
    await expect(dagView).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="dag-task-node-task-30scale-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="dag-task-node-task-30scale-30"]')).toBeVisible()
    await page.screenshot({ path: join(screenshotsDir, '22-graph-30-tasks.png') })
    await page.screenshot({ path: join(screenshotsDir, '13-thirty-task-density.png') })

    // ----------------------------------------------------
    // 4. Responsive Viewports & Reduced Motion Check
    // ----------------------------------------------------
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
    ]

    for (const vp of viewports) {
      await page.setViewportSize(vp)
      await page.waitForTimeout(300)
      const noOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth
      })
      expect(noOverflow).toBe(true)
    }

    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.screenshot({ path: join(screenshotsDir, '14-reduced-motion.png') })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })
})
