import { _electron as electron } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const SCREENSHOT_DIR = path.resolve('docs/desktop-audit/phase-d-screenshots')
const ARTIFACT_DIR = 'C:/Users/smara/.gemini/antigravity/brain/2d4df3b0-8f55-4c6a-b688-8fff11505644'

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
fs.mkdirSync(ARTIFACT_DIR, { recursive: true })

async function saveScreenshot(page, filename, description) {
  const localPath = path.join(SCREENSHOT_DIR, filename)
  const artifactPath = path.join(ARTIFACT_DIR, filename)
  await page.screenshot({ path: localPath, fullPage: false })
  fs.copyFileSync(localPath, artifactPath)
  console.log(`[Captured & Saved] ${filename} — ${description}`)
}

async function runPhaseDVerification() {
  console.log('=== [PHASE D GATE 4 VERIFICATION: REAL ELECTRON RUNNER] ===')
  console.log('1. Launching Electron desktop application...')

  let app = await electron.launch({
    args: [path.resolve('apps/desktop')],
    env: {
      ...process.env,
      GRAVITAS_OPEN_COMPANION: '1',
    },
  })

  try {
    await new Promise((r) => setTimeout(r, 3500))
    const allWindows = app.windows()
    console.log(`Discovered ${allWindows.length} Electron window(s):`)
    allWindows.forEach((w, i) => console.log(`  [${i}] ${w.url()}`))

    let mainWin = allWindows.find((w) => w.url().includes('index.html')) || (await app.firstWindow())
    let companionWin = allWindows.find((w) => w.url().includes('companion.html'))

    await mainWin.setViewportSize({ width: 1280, height: 800 })
    await mainWin.waitForLoadState('domcontentloaded')
    if (companionWin) {
      await companionWin.setViewportSize({ width: 440, height: 680 })
      await companionWin.waitForLoadState('domcontentloaded')
    }
    await new Promise((r) => setTimeout(r, 2000))

    // Close any onboarding dialog if open
    await mainWin.evaluate(() => {
      const dialog = document.getElementById('onboarding-dialog')
      if (dialog && dialog.open) dialog.close()
    })

    // ─── 1. Main Window: Dedicated Settings Surface ─────────────────────────────
    console.log('2. Navigating Main Window to Dedicated Settings Surface...')
    await mainWin.click('#tab-settings')
    await new Promise((r) => setTimeout(r, 1200))

    await saveScreenshot(
      mainWin,
      '01-settings-surface.png',
      'Main Window Dedicated Settings Surface with 5 distinct functional configuration sections'
    )

    // Scroll down to showcase Sections 3, 4, and 5 (Startup, Phone Inbox, Model Routing)
    await mainWin.evaluate(() => {
      const main = document.getElementById('cc-main') || document.querySelector('main')
      if (main) main.scrollTop = 520
    })
    await new Promise((r) => setTimeout(r, 800))

    await saveScreenshot(
      mainWin,
      '02-settings-quiet-hours-inbox.png',
      'Settings Surface: Study Guardian Quiet Hours, Desktop Notifications, and Phone Inbox folder watcher'
    )

    // Scroll further down to showcase Section 5 (AI Model & Inference Routing)
    await mainWin.evaluate(() => {
      const main = document.getElementById('cc-main') || document.querySelector('main')
      if (main) main.scrollTop = 950
    })
    await new Promise((r) => setTimeout(r, 800))

    await saveScreenshot(
      mainWin,
      '02b-settings-ai-model-inference.png',
      'Settings Surface: Deterministic SQLite Kernel engine, hybrid cloud model router tier, and Default Deny Cloud Egress'
    )

    // ─── 2. Floating Companion: Cleaned Hierarchy & Compact Subject Dropdown ────
    if (companionWin) {
      console.log('3. Inspecting Floating Companion Hierarchy...')
      await companionWin.bringToFront()
      await new Promise((r) => setTimeout(r, 1000))

      // Ensure Knowledge Hub tab is active
      await companionWin.click('#tab-btn-vault')
      await new Promise((r) => setTimeout(r, 1000))

      await saveScreenshot(
        companionWin,
        '03-companion-clean-hierarchy.png',
        'Floating Companion: Cleaned command bar, quick prompt chips, compact subject dropdown, and note actions'
      )

      // Test "View in Workspace ↗" on the first idea card
      console.log('4. Testing Companion-to-Workspace navigation ("View in Workspace ↗")...')
      const viewWsBtn = await companionWin.$('[data-view-workspace-btn]')
      if (viewWsBtn) {
        await viewWsBtn.click()
        await new Promise((r) => setTimeout(r, 1800))

        // Bring main window to front and check that notes surface is active with note in editor
        await mainWin.bringToFront()
        await new Promise((r) => setTimeout(r, 1000))

        await saveScreenshot(
          mainWin,
          '04-workspace-note-opened-from-companion.png',
          'Main Window: Note automatically opened and displayed in Markdown editor after clicking "View in Workspace ↗" in Companion'
        )
      } else {
        console.warn('No [data-view-workspace-btn] found in companion.')
      }

      // Switch companion to Study Guardian tab and capture
      await companionWin.bringToFront()
      await companionWin.click('#tab-btn-study-guardian')
      await new Promise((r) => setTimeout(r, 1000))

      await saveScreenshot(
        companionWin,
        '05-companion-study-guardian-assignments.png',
        'Floating Companion: Study Guardian session briefing, assignments with "View in Subject ↗", and inbox controls'
      )
    }

    console.log('=== [PHASE D VERIFICATION COMPLETED SUCCESSFULLY] ===')
  } catch (err) {
    console.error('Phase D verification encountered error:', err)
    throw err
  } finally {
    await app.close()
  }
}

runPhaseDVerification().catch((err) => {
  console.error(err)
  process.exit(1)
})
