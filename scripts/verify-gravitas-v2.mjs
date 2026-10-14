import { _electron as electron } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const EVIDENCE_DIR = path.resolve('docs/gravitas2-evidence')
const VIDEO_DIR = path.resolve('docs/gravitas2-evidence/videos')
const ARTIFACT_DIR = path.resolve('C:/Users/smara/.gemini/antigravity/brain/afee62a1-9ee8-4f51-a67b-3b74c41b1f63')

fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
fs.mkdirSync(VIDEO_DIR, { recursive: true })
fs.mkdirSync(ARTIFACT_DIR, { recursive: true })

async function runGravitasV2Verification() {
  console.log('=== [GRAVITAS 2.0: FIRST VERTICAL SLICE INTERACTION RECORDING & SCREENSHOT SUITE] ===')
  console.log('Launching Electron desktop application at 1280x800 with active video recording...')

  const app = await electron.launch({
    args: [path.resolve('apps/desktop')],
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1280, height: 800 }
    },
    env: {
      ...process.env,
      GRAVITAS_OPEN_COMPANION: '0',
    }
  })

  try {
    await new Promise((r) => setTimeout(r, 2000))
    const allWindows = app.windows()
    console.log(`Discovered ${allWindows.length} Electron window(s).`)

    const mainWin = allWindows.find((w) => w.url().includes('index.html')) || (await app.firstWindow())
    await mainWin.setViewportSize({ width: 1280, height: 800 })
    await mainWin.waitForLoadState('domcontentloaded')
    await new Promise((r) => setTimeout(r, 1500))

    // Close any legacy onboarding dialog if present
    await mainWin.evaluate(() => {
      const dialog = document.getElementById('onboarding-dialog')
      if (dialog && dialog.open) dialog.close()
    })

    // ─── STEP 1: CAPTURE CREATIVE STUDIO HOMEPAGE ─────────────────────────────
    console.log('\n[Step 1] Capturing Cozy Dark Studio Homepage (1280x800)...')
    await mainWin.mouse.move(640, 250)
    await new Promise((r) => setTimeout(r, 1000))
    const shot1 = path.join(EVIDENCE_DIR, '01-creative-studio-home.png')
    await mainWin.screenshot({ path: shot1 })
    fs.copyFileSync(shot1, path.join(ARTIFACT_DIR, '01-creative-studio-home.png'))
    console.log(`  Saved: ${shot1}`)

    // ─── STEP 2: WORKFLOW 1: "What's due today?" ──────────────────────────────
    console.log('\n[Step 2] Executing Workflow 1: "What\'s due today?"...')
    const inputSelector = 'input[placeholder*="Ask anything"]'
    await mainWin.click(inputSelector)
    await mainWin.fill(inputSelector, "What's due today?")
    await new Promise((r) => setTimeout(r, 500))
    await mainWin.press(inputSelector, 'Enter')
    await new Promise((r) => setTimeout(r, 2500))

    const shot2 = path.join(EVIDENCE_DIR, '02-due-today-spatial-panel.png')
    await mainWin.screenshot({ path: shot2 })
    fs.copyFileSync(shot2, path.join(ARTIFACT_DIR, '02-due-today-spatial-panel.png'))
    console.log(`  Saved: ${shot2}`)

    // ─── STEP 3: WORKFLOW 2: "Open my Algorithms notes" ───────────────────────
    console.log('\n[Step 3] Executing Workflow 2: "Open my Algorithms notes"...')
    await mainWin.click(inputSelector)
    await mainWin.fill(inputSelector, 'Open my Algorithms notes')
    await new Promise((r) => setTimeout(r, 500))
    await mainWin.press(inputSelector, 'Enter')
    await new Promise((r) => setTimeout(r, 2500))

    // Type an edit into note editor and save
    const textarea = await mainWin.$('textarea')
    if (textarea) {
      await textarea.click()
      await textarea.type('\n\n// Verified in studio slice at ' + new Date().toLocaleTimeString())
      await new Promise((r) => setTimeout(r, 800))
      // Click save button
      await mainWin.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'))
        const saveBtn = buttons.find((b) => b.textContent?.includes('Save Note'))
        if (saveBtn) saveBtn.click()
      })
      await new Promise((r) => setTimeout(r, 1200))
    }

    const shot3 = path.join(EVIDENCE_DIR, '03-algorithms-notes-editor.png')
    await mainWin.screenshot({ path: shot3 })
    fs.copyFileSync(shot3, path.join(ARTIFACT_DIR, '03-algorithms-notes-editor.png'))
    console.log(`  Saved: ${shot3}`)

    // ─── STEP 4: WORKFLOW 3: "Open Netflix" ───────────────────────────────────
    console.log('\n[Step 4] Executing Workflow 3: "Open Netflix"...')
    await mainWin.click(inputSelector)
    await mainWin.fill(inputSelector, 'Open Netflix')
    await new Promise((r) => setTimeout(r, 500))
    await mainWin.press(inputSelector, 'Enter')
    await new Promise((r) => setTimeout(r, 2500))

    const shot4 = path.join(EVIDENCE_DIR, '04-netflix-entertainment-action.png')
    await mainWin.screenshot({ path: shot4 })
    fs.copyFileSync(shot4, path.join(ARTIFACT_DIR, '04-netflix-entertainment-action.png'))
    console.log(`  Saved: ${shot4}`)

    // ─── STEP 5: ON-DEMAND THREE.JS LIVING OFFICE ─────────────────────────────
    console.log('\n[Step 5] Opening 3D Office on demand from navigation...')
    await mainWin.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const officeBtn = buttons.find((b) => b.textContent?.includes('3D Office'))
      if (officeBtn) officeBtn.click()
    })
    await new Promise((r) => setTimeout(r, 3000))

    const shot5 = path.join(EVIDENCE_DIR, '05-threejs-office-ondemand.png')
    await mainWin.screenshot({ path: shot5 })
    fs.copyFileSync(shot5, path.join(ARTIFACT_DIR, '05-threejs-office-ondemand.png'))
    console.log(`  Saved: ${shot5}`)

    // ─── STEP 6: RETURN TO CHAT & FINAL POLISH WALKTHROUGH ────────────────────
    console.log('\n[Step 6] Navigating back to Studio Chat...')
    await mainWin.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const chatBtn = buttons.find((b) => b.textContent?.includes('Studio Chat'))
      if (chatBtn) chatBtn.click()
    })
    await new Promise((r) => setTimeout(r, 1500))

    // Obtain the recorded video
    const page = mainWin
    const video = page.video()
    console.log('\nWaiting for video buffer to finalize...')
    await app.close()

    if (video) {
      const videoPath = await video.path()
      const targetVideo = path.join(EVIDENCE_DIR, 'gravitas-2.0-studio-interaction.webm')
      fs.copyFileSync(videoPath, targetVideo)
      fs.copyFileSync(videoPath, path.join(ARTIFACT_DIR, 'gravitas-2.0-studio-interaction.webm'))
      console.log(`  Saved interaction recording to: ${targetVideo}`)
    }

    console.log('\n=== VERIFICATION AND RECORDING COMPLETE ===')
  } catch (err) {
    console.error('Verification failed:', err)
    await app.close()
    throw err
  }
}

runGravitasV2Verification().catch((err) => {
  console.error(err)
  process.exit(1)
})
