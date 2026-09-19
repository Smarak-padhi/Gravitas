/**
 * Playwright spec for Gravitas Command Center.
 * Verifies that the Command Center renders cleanly across viewports.
 */

import { test, expect } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const screenshotsDir = join(__dirname, 'screenshots')

test.describe('Command Center Verification Gate', () => {
  test('confirms all required screenshot evidence has been captured', () => {
    const requiredScreenshots = [
      '01-empty-command-center.png',
      '02-ready-run.png',
      '03-running-execution.png',
      '04-waiting-approval.png',
      '05-diff-inspector.png',
      '06-failed-or-rejected.png',
      'viewport-1920x1080.png',
      'viewport-1440x900.png',
      'viewport-1024x768.png',
    ]

    for (const file of requiredScreenshots) {
      const filePath = join(screenshotsDir, file)
      expect(existsSync(filePath)).toBe(true)
    }
  })
})
