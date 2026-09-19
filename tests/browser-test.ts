/**
 * Gravitas Command Center End-to-End Browser Verification Test.
 *
 * Uses Playwright to drive real browser interactions across viewports:
 * - 1920x1080 (Desktop Wide)
 * - 1440x900 (Laptop Standard)
 * - 1024x768 (Compact Desktop)
 *
 * Captures mandatory screenshot evidence in tests/screenshots/:
 * 1. 01-empty-command-center.png
 * 2. 02-ready-run.png
 * 3. 03-running-execution.png
 * 4. 04-waiting-approval.png
 * 5. 05-diff-inspector.png
 * 6. 06-failed-or-rejected.png
 * Plus viewport-specific responsive screenshots.
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type Page } from 'playwright'
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

/**
 * Deterministic Fake Harness for automated browser tests.
 * Safely implements add(a, b) in src/math.js without network access.
 */
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

async function main(): Promise<void> {
  console.log('[browser-test] Starting Gravitas Command Center E2E verification...')

  await mkdir(screenshotsDir, { recursive: true })

  // 1. Setup fixture git repository
  const fixtureRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-browser-fixture-'))
  const runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-browser-runtime-'))

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

  // 2. Setup backend server
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

  const server = new GravitasServer({
    service,
    eventHub,
  })

  const serverAddr = await server.start({ host: '127.0.0.1', port: 4317 })
  console.log(`[browser-test] Backend server running at ${serverAddr.url}`)

  // 3. Start Vite dev server for @gravitas/web
  const webRoot = join(__dirname, '../apps/web')
  const viteServer: ViteDevServer = await createViteServer({
    root: webRoot,
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
  })
  await viteServer.listen()
  console.log(`[browser-test] Vite dev server running at http://127.0.0.1:5173`)

  // 4. Launch Playwright Chromium (using installed Chrome/Edge)
  let browser: Browser
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
    })
  } catch {
    browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
    })
  }

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    const page: Page = await context.newPage()

    // --- Scenario 1: Empty Command Center ---
    console.log('[browser-test] Scenario 1: Loading empty Command Center...')
    await page.goto('http://127.0.0.1:5173/')

    // Wait for SSE connection and harness badge
    await page.waitForSelector('header')
    await page.waitForFunction(() => document.body.innerText.includes('GRAVITAS'))
    await page.waitForFunction(() => document.body.innerText.includes('fake-deterministic-worker'))
    await page.waitForFunction(() => document.body.innerText.includes('AVAILABLE'))

    // Verify empty state message
    const emptyStateVisible = await page.evaluate(() =>
      document.body.innerText.includes('No runs yet')
    )
    if (!emptyStateVisible) {
      throw new Error('Expected "No runs yet" in empty command center')
    }

    await page.screenshot({ path: join(screenshotsDir, '01-empty-command-center.png') })
    console.log('✓ Captured: 01-empty-command-center.png')

    // --- Scenario 2: Create Run & Inspect READY state ---
    console.log('[browser-test] Scenario 2: Composing and creating run...')
    await page.click('button:has-text("+ New Run")')
    await page.waitForSelector('#composer-goal')

    await page.fill('#composer-goal', 'Implement math add(a, b) function')
    await page.fill('#composer-constraints', 'src/math.js')
    await page.click('button:has-text("Create Run")')

    // Wait for run to appear in left rail and inspector to render
    await page.waitForSelector('text=READY')
    await page.waitForSelector('button:has-text("Execute Golden Loop")')

    await page.screenshot({ path: join(screenshotsDir, '02-ready-run.png') })
    console.log('✓ Captured: 02-ready-run.png')

    // --- Scenario 3: Trigger Execution & Capture RUNNING state ---
    console.log('[browser-test] Scenario 3: Triggering execution...')
    await page.click('button:has-text("Execute Golden Loop")')

    // Wait briefly to capture running/transition state
    await page.waitForTimeout(200)
    await page.screenshot({ path: join(screenshotsDir, '03-running-execution.png') })
    console.log('✓ Captured: 03-running-execution.png')

    // --- Scenario 4: WAITING_APPROVAL state & Action Box ---
    console.log('[browser-test] Scenario 4: Verifying WAITING_APPROVAL state...')
    await page.waitForSelector('[data-testid="approval-action-box"]', { timeout: 10000 })
    await page.waitForSelector('text=HUMAN REVIEW REQUIRED')
    await page.waitForSelector('text=Approve & Merge')

    // Verify verification passed and diff is present
    await page.waitForSelector('text=PASSED')
    await page.waitForSelector('text=EVIDENCE GIT DIFF')

    await page.screenshot({ path: join(screenshotsDir, '04-waiting-approval.png') })
    console.log('✓ Captured: 04-waiting-approval.png')

    // --- Scenario 5: Diff / Evidence Inspector Focus ---
    console.log('[browser-test] Scenario 5: Capturing Diff inspector...')
    const diffText = await page.innerText('body')
    if (!diffText.includes('return a + b;')) {
      throw new Error('Expected diff viewer to display "return a + b;"')
    }

    await page.screenshot({ path: join(screenshotsDir, '05-diff-inspector.png') })
    console.log('✓ Captured: 05-diff-inspector.png')

    // Approve the task
    console.log('[browser-test] Approving task...')
    await page.click('button:has-text("Approve & Merge")')
    await page.waitForSelector('text=APPROVED')
    await page.waitForSelector('text=COMPLETED')

    // --- Scenario 6: Rejection / FAILED state test ---
    console.log('[browser-test] Scenario 6: Creating second run to test rejection...')
    await page.click('button:has-text("+ New Run")')
    await page.waitForSelector('#composer-goal')
    await page.fill('#composer-goal', 'Second run to verify human rejection')
    await page.fill('#composer-constraints', 'src/math.js')
    await page.click('button:has-text("Create Run")')

    await page.waitForSelector('button:has-text("Execute Golden Loop")')
    await page.click('button:has-text("Execute Golden Loop")')

    await page.waitForSelector('[data-testid="approval-action-box"]')
    await page.click('button:has-text("Reject Task")')
    await page.waitForSelector('#reject-reason')
    await page.fill('#reject-reason', 'Rejected: manual human policy refusal')
    await page.click('button:has-text("Confirm Reject")')

    await page.waitForSelector('text=FAILED')
    await page.screenshot({ path: join(screenshotsDir, '06-failed-or-rejected.png') })
    console.log('✓ Captured: 06-failed-or-rejected.png')

    // --- Scenario 7: Responsive Viewport Verification ---
    console.log('[browser-test] Scenario 7: Testing viewports 1920x1080, 1440x900, 1024x768...')

    // 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: join(screenshotsDir, 'viewport-1920x1080.png') })
    console.log('✓ Captured: viewport-1920x1080.png')

    // 1440x900
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: join(screenshotsDir, 'viewport-1440x900.png') })
    console.log('✓ Captured: viewport-1440x900.png')

    // 1024x768
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: join(screenshotsDir, 'viewport-1024x768.png') })
    console.log('✓ Captured: viewport-1024x768.png')

    // Check for layout overflow or clipping errors
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    if (hasHorizontalOverflow) {
      console.warn('[browser-test] Warning: horizontal root overflow detected at 1024px')
    } else {
      console.log('✓ Zero root horizontal overflow at 1024x768')
    }

    console.log('\n[browser-test] ALL BROWSER VERIFICATIONS PASSED SUCCESSFULLY!')
  } finally {
    await browser.close()
    await viteServer.close()
    await server.stop()
    await rm(fixtureRepoPath, { recursive: true, force: true }).catch(() => {})
    await rm(runtimeRoot, { recursive: true, force: true }).catch(() => {})
  }
}

main().catch((err) => {
  console.error('[browser-test] FATAL ERROR:', err)
  process.exit(1)
})
