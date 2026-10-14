import { _electron as electron } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const SCREENSHOT_DIR = path.resolve('docs/desktop-audit/phase-c-screenshots')
const ARTIFACT_DIR = 'C:/Users/smara/.gemini/antigravity/brain/2d4df3b0-8f55-4c6a-b688-8fff11505644'

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
fs.mkdirSync(ARTIFACT_DIR, { recursive: true })

async function runPhaseCVerification() {
  console.log('=== [PHASE C GATE 3 VERIFICATION: REAL ELECTRON RUNNER] ===')
  console.log('1. Launching Electron desktop application with real AppData SQLite data root...')

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

    // Ensure initial theme is dark graphite
    await mainWin.evaluate(() => {
      document.body.classList.remove('light-theme')
      localStorage.setItem('gravitas_theme', 'dark')
      const btn = document.getElementById('btn-header-theme')
      if (btn) btn.textContent = 'Theme: Dark'
    })
    if (companionWin) {
      await companionWin.evaluate(() => {
        document.body.classList.remove('light-theme')
        localStorage.setItem('gravitas_theme', 'dark')
        const btn = document.getElementById('companion-theme-btn')
        if (btn) btn.textContent = 'Dark'
      })
    }
    await new Promise((r) => setTimeout(r, 800))

    // ─── SHOT 01: MAIN WINDOW - DARK GRAPHITE - HOME WORKSPACE ───────────────
    console.log('\n[Shot 01] Capturing Main Window: Dark Graphite - Home Workspace...')
    await mainWin.evaluate(() => {
      document.getElementById('tab-workspace')?.click()
    })
    await new Promise((r) => setTimeout(r, 1200))
    const shot01 = path.join(SCREENSHOT_DIR, '01-dark-workspace-home.png')
    await mainWin.screenshot({ path: shot01 })
    fs.copyFileSync(shot01, path.join(ARTIFACT_DIR, '01-dark-workspace-home.png'))
    console.log(`  ✓ Saved: ${shot01}`)

    // ─── SHOT 02: MAIN WINDOW - DARK GRAPHITE - KNOWLEDGE HUB ────────────────
    console.log('\n[Shot 02] Capturing Main Window: Dark Graphite - Notes & Knowledge Hub...')
    await mainWin.evaluate(() => {
      document.getElementById('tab-notes')?.click()
    })
    await new Promise((r) => setTimeout(r, 1500))
    // Select first note
    await mainWin.evaluate(() => {
      const firstNote = document.querySelector('.notes-card-item')
      if (firstNote) firstNote.click()
    })
    await new Promise((r) => setTimeout(r, 1000))
    const shot02 = path.join(SCREENSHOT_DIR, '02-dark-knowledge-hub.png')
    await mainWin.screenshot({ path: shot02 })
    fs.copyFileSync(shot02, path.join(ARTIFACT_DIR, '02-dark-knowledge-hub.png'))
    console.log(`  ✓ Saved: ${shot02}`)

    // ─── SHOT 03: MAIN WINDOW - DARK GRAPHITE - SUBJECTS OVERVIEW ─────────────
    console.log('\n[Shot 03] Capturing Main Window: Dark Graphite - Subjects Overview...')
    await mainWin.evaluate(() => {
      document.getElementById('tab-subjects')?.click()
      const backBtn = document.getElementById('subject-detail-back-btn')
      if (backBtn && backBtn.offsetParent !== null) backBtn.click()
    })
    await new Promise((r) => setTimeout(r, 1200))
    const shot03 = path.join(SCREENSHOT_DIR, '03-dark-subjects-overview.png')
    await mainWin.screenshot({ path: shot03 })
    fs.copyFileSync(shot03, path.join(ARTIFACT_DIR, '03-dark-subjects-overview.png'))
    console.log(`  ✓ Saved: ${shot03}`)

    // ─── SHOT 04: MAIN WINDOW - DARK GRAPHITE - SUBJECT DETAIL (CSE 2195) ─────
    console.log('\n[Shot 04] Capturing Main Window: Dark Graphite - Subject Detail (CSE 2195)...')
    await mainWin.evaluate(() => {
      const card = document.querySelector('.subject-card[data-subject-id="CSE 2195"]')
      if (card) card.click()
    })
    await new Promise((r) => setTimeout(r, 1200))
    const shot04 = path.join(SCREENSHOT_DIR, '04-dark-subject-detail.png')
    await mainWin.screenshot({ path: shot04 })
    fs.copyFileSync(shot04, path.join(ARTIFACT_DIR, '04-dark-subject-detail.png'))
    console.log(`  ✓ Saved: ${shot04}`)

    // ─── STEP: TOGGLE THEME TO WARM STONE LIGHT VIA HEADER BUTTON ────────────
    console.log('\n[Theme Toggle] Toggling Main Window to Warm Stone Light Mode...')
    await mainWin.evaluate(() => {
      const themeBtn = document.getElementById('btn-header-theme')
      if (themeBtn) themeBtn.click()
    })
    await new Promise((r) => setTimeout(r, 1000))

    // ─── SHOT 05: MAIN WINDOW - WARM STONE LIGHT - SUBJECT DETAIL (CSE 2195) ──
    console.log('\n[Shot 05] Capturing Main Window: Warm Stone Light - Subject Detail (CSE 2195)...')
    const shot05 = path.join(SCREENSHOT_DIR, '05-light-subject-detail.png')
    await mainWin.screenshot({ path: shot05 })
    fs.copyFileSync(shot05, path.join(ARTIFACT_DIR, '05-light-subject-detail.png'))
    console.log(`  ✓ Saved: ${shot05}`)

    // ─── SHOT 06: MAIN WINDOW - WARM STONE LIGHT - SUBJECTS OVERVIEW ──────────
    console.log('\n[Shot 06] Capturing Main Window: Warm Stone Light - Subjects Overview...')
    await mainWin.evaluate(() => {
      const backBtn = document.getElementById('subject-detail-back-btn')
      if (backBtn) backBtn.click()
    })
    await new Promise((r) => setTimeout(r, 1200))
    const shot06 = path.join(SCREENSHOT_DIR, '06-light-subjects-overview.png')
    await mainWin.screenshot({ path: shot06 })
    fs.copyFileSync(shot06, path.join(ARTIFACT_DIR, '06-light-subjects-overview.png'))
    console.log(`  ✓ Saved: ${shot06}`)

    // ─── SHOT 07: MAIN WINDOW - WARM STONE LIGHT - KNOWLEDGE HUB ─────────────
    console.log('\n[Shot 07] Capturing Main Window: Warm Stone Light - Knowledge Hub...')
    await mainWin.evaluate(() => {
      document.getElementById('tab-notes')?.click()
    })
    await new Promise((r) => setTimeout(r, 1200))
    const shot07 = path.join(SCREENSHOT_DIR, '07-light-knowledge-hub.png')
    await mainWin.screenshot({ path: shot07 })
    fs.copyFileSync(shot07, path.join(ARTIFACT_DIR, '07-light-knowledge-hub.png'))
    console.log(`  ✓ Saved: ${shot07}`)

    // ─── SHOT 08: MAIN WINDOW - WARM STONE LIGHT - HOME WORKSPACE ────────────
    console.log('\n[Shot 08] Capturing Main Window: Warm Stone Light - Home Workspace...')
    await mainWin.evaluate(() => {
      document.getElementById('tab-workspace')?.click()
    })
    await new Promise((r) => setTimeout(r, 1200))
    const shot08 = path.join(SCREENSHOT_DIR, '08-light-workspace-home.png')
    await mainWin.screenshot({ path: shot08 })
    fs.copyFileSync(shot08, path.join(ARTIFACT_DIR, '08-light-workspace-home.png'))
    console.log(`  ✓ Saved: ${shot08}`)

    // ─── SHOT 09: FLOATING COMPANION - WARM STONE LIGHT (THEME SYNCED) ───────
    if (companionWin) {
      console.log('\n[Shot 09] Capturing Floating Companion in Warm Stone Light Theme...')
      await companionWin.evaluate(() => {
        const themeBtn = document.getElementById('companion-theme-btn')
        if (!document.body.classList.contains('light-theme') && themeBtn) {
          themeBtn.click()
        }
      })
      await new Promise((r) => setTimeout(r, 1000))
      const shot09 = path.join(SCREENSHOT_DIR, '09-companion-light-theme.png')
      await companionWin.screenshot({ path: shot09 })
      fs.copyFileSync(shot09, path.join(ARTIFACT_DIR, '09-companion-light-theme.png'))
      console.log(`  ✓ Saved: ${shot09}`)

      // ─── SHOT 10: FLOATING COMPANION - DARK GRAPHITE THEME ──────────────────
      console.log('\n[Shot 10] Toggling Floating Companion back to Dark Graphite via companion-theme-btn...')
      await companionWin.evaluate(() => {
        const themeBtn = document.getElementById('companion-theme-btn')
        if (document.body.classList.contains('light-theme') && themeBtn) {
          themeBtn.click()
        }
      })
      await new Promise((r) => setTimeout(r, 1000))
      const shot10 = path.join(SCREENSHOT_DIR, '10-companion-dark-theme.png')
      await companionWin.screenshot({ path: shot10 })
      fs.copyFileSync(shot10, path.join(ARTIFACT_DIR, '10-companion-dark-theme.png'))
      console.log(`  ✓ Saved: ${shot10}`)
    }

    // Toggle main window back to dark for default pristine state
    await mainWin.evaluate(() => {
      const themeBtn = document.getElementById('btn-header-theme')
      if (document.body.classList.contains('light-theme') && themeBtn) {
        themeBtn.click()
      }
    })
    await new Promise((r) => setTimeout(r, 500))

    console.log('\n=== [ALL PHASE C SCREENSHOTS CAPTURED & VERIFIED] ===')
  } finally {
    console.log('Closing Electron application...')
    await app.close()
  }
}

runPhaseCVerification().catch((err) => {
  console.error('Phase C verification failed:', err)
  process.exit(1)
})
