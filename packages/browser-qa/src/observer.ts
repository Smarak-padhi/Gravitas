/**
 * Playwright Browser QA Observer.
 *
 * Attaches event listeners to Playwright Page to record:
 * - Uncaught page exceptions
 * - Console error messages
 * - Failed HTTP requests (status >= 400)
 */

import type { BrowserQaObservation } from '@gravitas/core'
import type { Page } from '@playwright/test'

export interface RecordedFailedRequest {
  readonly url: string
  readonly status: number
  readonly statusText: string
}

export class BrowserQaObserver {
  private readonly consoleErrors: string[] = []
  private readonly pageErrors: string[] = []
  private readonly failedRequests: RecordedFailedRequest[] = []

  public attach(page: Page): void {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text())
      }
    })

    page.on('pageerror', (err) => {
      this.pageErrors.push(err.message || String(err))
    })

    page.on('response', (response) => {
      const status = response.status()
      if (status >= 400) {
        this.failedRequests.push({
          url: response.url(),
          status,
          statusText: response.statusText(),
        })
      }
    })
  }

  public getObservation(): BrowserQaObservation {
    return {
      consoleErrors: Object.freeze([...this.consoleErrors]),
      pageErrors: Object.freeze([...this.pageErrors]),
      failedRequests: Object.freeze([...this.failedRequests]),
    }
  }

  public clear(): void {
    this.consoleErrors.length = 0
    this.pageErrors.length = 0
    this.failedRequests.length = 0
  }
}
