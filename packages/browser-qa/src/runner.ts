/**
 * Deterministic Playwright Browser QA Runner.
 *
 * Invariants:
 * 1. Strictly ZERO AI browser agents (browser-use, Stagehand, LLM vision clickers).
 * 2. 100% deterministic, step-by-step Playwright action sequence execution.
 * 3. Bounded to local loopback origins (127.0.0.1 and localhost).
 * 4. Captures console errors, page errors, network failures, and screenshot artifacts.
 * 5. Guarantees browser process teardown in all error states (zero zombie processes).
 */

import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  BrowserQaAction,
  BrowserQaContract,
  BrowserQaResult,
  BrowserQaStepResult,
} from '@gravitas/core'
import { validateContract } from './dsl.js'
import { BrowserQaObserver } from './observer.js'
import { validateTargetUrl } from './security.js'

export interface ExecuteBrowserQaOptions {
  readonly taskId: string
  readonly contract: BrowserQaContract
  readonly screenshotDir?: string | undefined
  readonly headless?: boolean | undefined
  readonly defaultTimeoutMs?: number | undefined
  readonly channel?: string | undefined
}

export const DEFAULT_STEP_TIMEOUT_MS = 5000

/**
 * Executes a deterministic BrowserQaContract using Playwright.
 */
export async function executeBrowserQa(options: ExecuteBrowserQaOptions): Promise<BrowserQaResult> {
  const {
    taskId,
    contract: rawContract,
    screenshotDir,
    headless = true,
    defaultTimeoutMs = DEFAULT_STEP_TIMEOUT_MS,
  } = options

  // Validate contract and actions
  const contract = validateContract(rawContract)

  if (screenshotDir) {
    await mkdir(screenshotDir, { recursive: true })
  }

  const startTime = Date.now()
  const stepResults: BrowserQaStepResult[] = []
  const recordedScreenshots: { name: string; path: string }[] = []

  let browser: Browser | undefined
  let context: BrowserContext | undefined
  let page: Page | undefined
  let overallStatus: 'PASSED' | 'FAILED' = 'PASSED'
  let executionError: string | undefined

  const observer = new BrowserQaObserver()

  const channel = options.channel ?? process.env['PLAYWRIGHT_CHANNEL'] ?? 'chrome'

  try {
    // Launch isolated Chromium instance (using host channel chrome with standard fallback)
    try {
      browser = await chromium.launch({
        headless,
        channel,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
    } catch {
      browser = await chromium.launch({
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
    }

    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    })

    page = await context.newPage()
    observer.attach(page)

    // Execute actions sequentially
    for (let i = 0; i < contract.actions.length; i++) {
      const action = contract.actions[i]!
      const stepStartTime = Date.now()
      let stepError: string | undefined

      try {
        await executeStep(page, action, {
          contract,
          screenshotDir,
          defaultTimeoutMs,
          onScreenshot: (record) => recordedScreenshots.push(record),
        })
      } catch (err) {
        stepError = (err as Error).message || String(err)
        overallStatus = 'FAILED'
        executionError = `Step ${i + 1} (${action.type}) failed: ${stepError}`
      }

      stepResults.push({
        stepIndex: i + 1,
        action,
        status: stepError ? 'FAILED' : 'PASSED',
        durationMs: Date.now() - stepStartTime,
        ...(stepError ? { error: stepError } : {}),
      })

      // Fail-fast on first step failure
      if (overallStatus === 'FAILED') {
        break
      }
    }
  } catch (err) {
    overallStatus = 'FAILED'
    executionError = (err as Error).message || String(err)
  } finally {
    // Guaranteed process cleanup
    try {
      if (context) await context.close()
    } catch {
      // Best effort
    }
    try {
      if (browser) await browser.close()
    } catch {
      // Best effort
    }
  }

  const durationMs = Date.now() - startTime

  return Object.freeze({
    taskId,
    contractId: contract.id,
    status: overallStatus,
    durationMs,
    steps: Object.freeze(stepResults),
    observations: observer.getObservation(),
    screenshots: Object.freeze(recordedScreenshots),
    ...(executionError ? { error: executionError } : {}),
    timestamp: new Date().toISOString(),
  })
}

interface StepExecutionContext {
  readonly contract: BrowserQaContract
  readonly screenshotDir?: string | undefined
  readonly defaultTimeoutMs: number
  readonly onScreenshot: (record: { name: string; path: string; base64?: string }) => void
}

async function executeStep(
  page: Page,
  action: BrowserQaAction,
  ctx: StepExecutionContext
): Promise<void> {
  const timeout = action.type !== 'navigate' && 'timeoutMs' in action && action.timeoutMs
    ? action.timeoutMs
    : ctx.defaultTimeoutMs

  switch (action.type) {
    case 'navigate': {
      // Security check on target URL
      validateTargetUrl(action.url, ctx.contract.allowedOrigins)
      await page.goto(action.url, {
        waitUntil: 'load',
        timeout,
      })
      break
    }

    case 'click': {
      await page.click(action.selector, { timeout })
      break
    }

    case 'fill': {
      await page.fill(action.selector, action.value, { timeout })
      break
    }

    case 'assertVisible': {
      await page.waitForSelector(action.selector, {
        state: 'visible',
        timeout,
      })
      break
    }

    case 'assertText': {
      await page.waitForSelector(action.selector, { state: 'visible', timeout })
      const element = page.locator(action.selector)
      const text = await element.innerText({ timeout })
      const expected = action.expected

      if (action.exact) {
        if (text.trim() !== expected.trim()) {
          throw new Error(
            `Expected text in '${action.selector}' to exactly equal '${expected}', but got '${text.trim()}'`
          )
        }
      } else {
        if (!text.includes(expected)) {
          throw new Error(
            `Expected text in '${action.selector}' to contain '${expected}', but got '${text.trim()}'`
          )
        }
      }
      break
    }

    case 'screenshot': {
      if (!ctx.screenshotDir) {
        throw new Error("Cannot capture screenshot: 'screenshotDir' was not configured")
      }
      const destPath = join(ctx.screenshotDir, action.name)
      const buffer = await page.screenshot({ path: destPath })
      ctx.onScreenshot({ name: action.name, path: destPath, base64: buffer.toString('base64') })
      break
    }
  }
}
