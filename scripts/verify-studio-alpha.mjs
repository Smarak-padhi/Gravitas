import { _electron as electron } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const EVIDENCE_DIR = path.resolve('docs/gravitas2-evidence')
const VIDEO_DIR = path.resolve('docs/gravitas2-evidence/videos')
const ARTIFACT_DIR = path.resolve('C:/Users/smara/.gemini/antigravity/brain/2d7706bf-d058-4b00-bc7f-59a689a21085')

fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
fs.mkdirSync(VIDEO_DIR, { recursive: true })
fs.mkdirSync(ARTIFACT_DIR, { recursive: true })

async function runStudioAlphaVerification() {
  console.log('=== [GRAVITAS 2.0: LIVING STUDIO ALPHA VERIFICATION & WALKTHROUGH RECORDING] ===')
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
    await new Promise((r) => setTimeout(r, 2500))
    const allWindows = app.windows()
    console.log(`Discovered ${allWindows.length} Electron window(s).`)

    const mainWin = allWindows.find((w) => w.url().includes('index.html')) || (await app.firstWindow())
    await mainWin.setViewportSize({ width: 1280, height: 800 })
    await mainWin.waitForLoadState('domcontentloaded')
    await new Promise((r) => setTimeout(r, 2000))

    // Close any legacy onboarding dialog if present
    await mainWin.evaluate(() => {
      const dialog = document.getElementById('onboarding-dialog')
      if (dialog && dialog.open) dialog.close()
    })

    // ─── STEP 1: CAPTURE CLEAN 2D STUDIO HOME SCREEN (ALL PANELS COLLAPSED) ──────
    console.log('\n[Step 1] Capturing Clean Studio Home Screen (1280x800)...')
    await mainWin.mouse.move(640, 360)
    await new Promise((r) => setTimeout(r, 3000))
    const shot1 = path.join(EVIDENCE_DIR, '01-clean-studio.png')
    await mainWin.screenshot({ path: shot1 })
    fs.copyFileSync(shot1, path.join(ARTIFACT_DIR, '01-clean-studio.png'))
    console.log(`  Saved: ${shot1}`)

    // ─── STEP 2: SUMMON MULTI-AGENT SPECIALIST CONVERSATION SURFACE ─────────────
    console.log('\n[Step 2] Summoning Multi-Agent Specialist Conversation surface on demand...')
    const summonGravBtn = await mainWin.$('button:has-text("Talk with Grav")') || await mainWin.$('button:has-text("Summon Grav")')
    if (summonGravBtn) {
      await summonGravBtn.click()
    }
    await new Promise((r) => setTimeout(r, 1500))

    // Click "Due Today" quick prompt chip
    console.log('Clicking "Due Today" prompt chip...')
    const dueTodayChip = await mainWin.$('button:has-text("Due Today")')
    if (dueTodayChip) {
      await dueTodayChip.click()
    }
    await new Promise((r) => setTimeout(r, 2000))

    // Click "25m Focus" to trigger Focus Sprint
    console.log('Clicking "25m Focus" prompt chip to trigger focus timer...')
    const focusChip = await mainWin.$('button:has-text("25m Focus")')
    if (focusChip) {
      await focusChip.click()
    }
    await new Promise((r) => setTimeout(r, 2000))

    // Switch Specialist tab to "Ada"
    console.log('Switching specialist tab to Ada...')
    const adaTab = await mainWin.$('button:has-text("Ada")')
    if (adaTab) {
      await adaTab.click()
    }
    await new Promise((r) => setTimeout(r, 1500))

    // Click "Quiz: Master Theorem" in Ada's quick prompts to trigger KaTeX math rendering
    console.log('Requesting Master Theorem quiz from Ada (LaTeX Math)...')
    const quizChip = await mainWin.$('button:has-text("Quiz: Master Theorem")')
    if (quizChip) {
      await quizChip.click()
    }
    await new Promise((r) => setTimeout(r, 3500))

    const shot2 = path.join(EVIDENCE_DIR, '02-grav-chat-floating.png')
    await mainWin.screenshot({ path: shot2 })
    fs.copyFileSync(shot2, path.join(ARTIFACT_DIR, '02-grav-chat-floating.png'))
    console.log(`  Saved: ${shot2}`)

    // Close conversation surface
    await mainWin.evaluate(() => {
      const closeButtons = Array.from(document.querySelectorAll('button'))
      const closeBtn = closeButtons.find((b) => b.querySelector('svg.lucide-x'))
      if (closeBtn) closeBtn.click()
    })
    await new Promise((r) => setTimeout(r, 1200))

    // ─── STEP 3: OPEN ADA'S KNOWLEDGE HUB, FLASHCARDS & NOTES (SQLITE WAL) ──────
    console.log('\n[Step 3] Opening Ada\'s Knowledge Hub, Spaced Repetition Decks & Notes...')
    const notesBtn = await mainWin.$('button:has-text("Notes")') || await mainWin.$('div:has-text("Study & Notes")')
    if (notesBtn) {
      await notesBtn.click()
    }
    await new Promise((r) => setTimeout(r, 1500))

    // Toggle Preview mode to demonstrate rendered Markdown and KaTeX math formulas (Gate B3)
    console.log('Toggling Preview Mode to display rendered Markdown & KaTeX Math...')
    const previewBtn = await mainWin.$('button:has-text("Preview")')
    if (previewBtn) {
      await previewBtn.click()
    }
    await new Promise((r) => setTimeout(r, 1200))

    // Click "Flashcards" tab to demonstrate Phase 05 Spaced Repetition Active Recall Deck
    console.log('Switching to Flashcards Mode in Ada\'s Knowledge Hub...')
    const flashcardsBtn = await mainWin.$('button:has-text("Flashcards")')
    if (flashcardsBtn) {
      await flashcardsBtn.click()
    }
    await new Promise((r) => setTimeout(r, 1200))

    // Type into active recall scratchpad before revealing
    const scratchpad = await mainWin.$('textarea[placeholder*="Type your derivation"]')
    if (scratchpad) {
      await scratchpad.fill('T(n) = aT(n/b) + f(n). Compare f(n) with n^(log_b a). Case 1 if f(n) is polynomial smaller, Case 2 if equal, Case 3 if polynomial larger with regularity condition.')
    }
    await new Promise((r) => setTimeout(r, 800))

    // Click "Reveal Solution" on flashcard
    console.log('Clicking "Reveal Solution & Active-Recall Formula" button...')
    const revealBtn = await mainWin.$('button:has-text("Reveal Solution")')
    if (revealBtn) {
      await revealBtn.click()
    }
    await new Promise((r) => setTimeout(r, 1500))

    const shot3b = path.join(EVIDENCE_DIR, '03b-ada-flashcards-recall.png')
    await mainWin.screenshot({ path: shot3b })
    fs.copyFileSync(shot3b, path.join(ARTIFACT_DIR, '03b-ada-flashcards-recall.png'))
    console.log(`  Saved: ${shot3b}`)

    // Click "Good (3d)" confidence rating to record review
    console.log('Clicking "Good (3d)" recall confidence rating...')
    const goodRatingBtn = await mainWin.$('button:has-text("Good (3d)")')
    if (goodRatingBtn) {
      await goodRatingBtn.click()
    }
    await new Promise((r) => setTimeout(r, 1200))

    // Switch back to Preview mode to show note and linked coursework tasks
    if (previewBtn) {
      await previewBtn.click()
    }
    await new Promise((r) => setTimeout(r, 1200))

    // Click "Export Obsidian" to demonstrate Obsidian YAML Frontmatter export
    console.log('Clicking "Obsidian" export button...')
    const exportBtn = await mainWin.$('button:has-text("Obsidian")')
    if (exportBtn) {
      await exportBtn.click()
    }
    await new Promise((r) => setTimeout(r, 1200))

    const shot3 = path.join(EVIDENCE_DIR, '03-ada-notes-panel.png')
    await mainWin.screenshot({ path: shot3 })
    fs.copyFileSync(shot3, path.join(ARTIFACT_DIR, '03-ada-notes-panel.png'))
    console.log(`  Saved: ${shot3}`)

    // Close Ada's notes panel
    await mainWin.evaluate(() => {
      const closeButtons = Array.from(document.querySelectorAll('button'))
      const closeBtn = closeButtons.find((b) => b.querySelector('svg.lucide-x'))
      if (closeBtn) closeBtn.click()
    })
    await new Promise((r) => setTimeout(r, 1200))

    // ─── STEP 4: CIPHER AGENDA, ENGINEERING PROJECTS & TASK ADDER ───────────────
    console.log('\n[Step 4] Opening Cipher\'s Agenda & Engineering Projects...')
    const agendaBtn = await mainWin.$('button:has-text("Agenda")')
    if (agendaBtn) {
      await agendaBtn.click()
    }
    await new Promise((r) => setTimeout(r, 1500))

    // Click "Engineering Projects" tab to demonstrate Phase 05 project tracking
    console.log('Switching to Engineering Projects tab...')
    const projectsTab = await mainWin.$('button:has-text("Engineering Projects")')
    if (projectsTab) {
      await projectsTab.click()
    }
    await new Promise((r) => setTimeout(r, 2000))

    // Switch back to Tasks tab and add a new practice task via quick adder
    console.log('Switching to Tasks & Coursework tab and adding a task...')
    const tasksTab = await mainWin.$('button:has-text("Tasks & Coursework")')
    if (tasksTab) {
      await tasksTab.click()
    }
    await new Promise((r) => setTimeout(r, 1000))

    const taskInput = await mainWin.$('input[placeholder*="Add new task"]')
    if (taskInput) {
      await taskInput.fill('Verify B+ Tree Latch Crabbing Protocol')
      const addBtn = await mainWin.$('button:has-text("Add")')
      if (addBtn) await addBtn.click()
    }
    await new Promise((r) => setTimeout(r, 1200))

    // Click visible checkbox on first task in the active floating panel to complete
    await mainWin.evaluate(() => {
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'))
      const visible = checkboxes.find((el) => el.offsetParent !== null)
      if (visible) visible.click()
    })
    await new Promise((r) => setTimeout(r, 1500))

    // Close Cipher's panel to view the activity bubble in the studio
    await mainWin.evaluate(() => {
      const closeButtons = Array.from(document.querySelectorAll('button'))
      const closeBtn = closeButtons.find((b) => b.querySelector('svg.lucide-x'))
      if (closeBtn) closeBtn.click()
    })
    await new Promise((r) => setTimeout(r, 1500))

    // Click interactive Coffee Mug on Grav's desk to demonstrate prop hotspot micro-interaction
    await mainWin.evaluate(() => {
      const coffeeBtn = document.querySelector('button[aria-label*="Coffee Mug"]')
      if (coffeeBtn) coffeeBtn.click()
    })
    await new Promise((r) => setTimeout(r, 2000))

    const shot4 = path.join(EVIDENCE_DIR, '04-activity-bubble.png')
    await mainWin.screenshot({ path: shot4 })
    fs.copyFileSync(shot4, path.join(ARTIFACT_DIR, '04-activity-bubble.png'))
    console.log(`  Saved: ${shot4}`)

    // ─── STEP 5: MUSIC-CORNER CONCEPT IN CHILL ZONE ───────────────────────────
    console.log('\n[Step 5] Opening Chill Corner & Music Concept Player...')
    const musicCorner = await mainWin.$('div[aria-label*="Chill Lounge"]') || await mainWin.$('button:has-text("Music Concept")')
    if (musicCorner) {
      await musicCorner.click()
    }
    await new Promise((r) => setTimeout(r, 2500))

    const shot5 = path.join(EVIDENCE_DIR, '05-music-corner.png')
    await mainWin.screenshot({ path: shot5 })
    fs.copyFileSync(shot5, path.join(ARTIFACT_DIR, '05-music-corner.png'))
    console.log(`  Saved: ${shot5}`)

    // Close Music panel
    await mainWin.evaluate(() => {
      const closeButtons = Array.from(document.querySelectorAll('button'))
      const closeBtn = closeButtons.find((b) => b.querySelector('svg.lucide-x'))
      if (closeBtn) closeBtn.click()
    })
    await new Promise((r) => setTimeout(r, 1500))

    // ─── STEP 6: LAZY-LOADED THREE.JS 3D OFFICE VIEWPORT ──────────────────────
    console.log('\n[Step 6] Opening Lazy-Loaded Three.js 3D Office Viewport...')
    const officeBtn = await mainWin.$('button:has-text("3D Office")')
    if (officeBtn) {
      await officeBtn.click()
    }
    // Allow WebGL context and 3D mesh animation to render multiple frames
    await new Promise((r) => setTimeout(r, 4500))

    const shot6 = path.join(EVIDENCE_DIR, '06-threejs-office.png')
    await mainWin.screenshot({ path: shot6 })
    fs.copyFileSync(shot6, path.join(ARTIFACT_DIR, '06-threejs-office.png'))
    console.log(`  Saved: ${shot6}`)

    // Close 3D Office (cleanly unmounting WebGL to save GPU resources)
    console.log('Closing 3D Office and returning cleanly to Living Studio...')
    await mainWin.evaluate(() => {
      const closeButtons = Array.from(document.querySelectorAll('button'))
      const closeBtn = closeButtons.find((b) => b.querySelector('svg.lucide-x'))
      if (closeBtn) closeBtn.click()
    })
    await new Promise((r) => setTimeout(r, 2000))

    // Final calm studio view before concluding video
    await mainWin.mouse.move(640, 360)
    await new Promise((r) => setTimeout(r, 3000))

    // Obtain the recorded video
    const page = mainWin
    const video = page.video()
    console.log('\nWaiting for video buffer to finalize...')
    await app.close()

    if (video) {
      const videoPath = await video.path()
      const targetVideo = path.join(EVIDENCE_DIR, 'studio-alpha-walkthrough.webm')
      fs.copyFileSync(videoPath, targetVideo)
      fs.copyFileSync(videoPath, path.join(ARTIFACT_DIR, 'studio-alpha-walkthrough.webm'))
      console.log(`  Saved walkthrough recording to: ${targetVideo}`)
      console.log(`  Copied walkthrough recording to: ${path.join(ARTIFACT_DIR, 'studio-alpha-walkthrough.webm')}`)
    }

    console.log('\n=== STUDIO ALPHA VERIFICATION AND RECORDING COMPLETE ===')
  } catch (err) {
    console.error('Studio Alpha verification failed:', err)
    await app.close()
    throw err
  }
}

runStudioAlphaVerification().catch((err) => {
  console.error(err)
  process.exit(1)
})
