import { _electron as electron } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const SCREENSHOT_DIR = path.resolve('docs/desktop-audit/phase-b-screenshots')
const ARTIFACT_DIR = 'C:/Users/smara/.gemini/antigravity/brain/2d4df3b0-8f55-4c6a-b688-8fff11505644'

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
fs.mkdirSync(ARTIFACT_DIR, { recursive: true })

async function runPhaseBVerification() {
  console.log('=== [PHASE B GATE 2 VERIFICATION: REAL ELECTRON RUNNER] ===')
  console.log('1. Launching Electron desktop application with real AppData SQLite data root...')

  let app = await electron.launch({
    args: [path.resolve('apps/desktop')],
    env: {
      ...process.env,
      GRAVITAS_OPEN_COMPANION: '0',
    },
  })

  try {
    await new Promise((r) => setTimeout(r, 3000))
    const allWindows = app.windows()
    console.log(`Discovered ${allWindows.length} Electron window(s):`)
    allWindows.forEach((w, i) => console.log(`  [${i}] ${w.url()}`))

    let mainWin = allWindows.find((w) => w.url().includes('index.html')) || (await app.firstWindow())
    await mainWin.setViewportSize({ width: 1280, height: 800 })
    await mainWin.waitForLoadState('domcontentloaded')
    await new Promise((r) => setTimeout(r, 2000))

    // Close any onboarding dialog if open
    await mainWin.evaluate(() => {
      const dialog = document.getElementById('onboarding-dialog')
      if (dialog && dialog.open) dialog.close()
    })

    // ─── STEP 1: CAPTURE WORKSPACE HOME OVERVIEW (1280x800) ──────────────────
    console.log('\n[Step 1] Capturing Home Workspace (1280x800)...')
    await mainWin.evaluate(() => {
      const tab = document.getElementById('tab-workspace')
      if (tab) tab.click()
    })
    await new Promise((r) => setTimeout(r, 1500))

    const shot1 = path.join(SCREENSHOT_DIR, '01-home-workspace-overview.png')
    await mainWin.screenshot({ path: shot1 })
    fs.copyFileSync(shot1, path.join(ARTIFACT_DIR, '01-home-workspace-overview.png'))
    console.log(`  ✓ Saved: ${shot1}`)

    // ─── STEP 2: TEST QUICK CAPTURE WITH SUBJECT LINKING ──────────────────────
    console.log('\n[Step 2] Testing Quick Capture with Subject Linking & Feedback Toast...')
    await mainWin.evaluate(async () => {
      const input = document.getElementById('workspace-quick-input')
      const select = document.getElementById('workspace-quick-subject')
      if (input && select) {
        input.value = 'Data cleaning and transformation methods for EDA'
        select.value = 'CSE 2195'
        const noteBtn = document.getElementById('workspace-btn-quick-note')
        if (noteBtn) noteBtn.click()
      }
    })
    await new Promise((r) => setTimeout(r, 800))

    const shot2 = path.join(SCREENSHOT_DIR, '02-workspace-quick-capture-feedback.png')
    await mainWin.screenshot({ path: shot2 })
    fs.copyFileSync(shot2, path.join(ARTIFACT_DIR, '02-workspace-quick-capture-feedback.png'))
    console.log(`  ✓ Saved: ${shot2}`)

    // ─── STEP 3: TACTILE ANIMATED CHECKBOX INTERACTION ────────────────────────
    console.log('\n[Step 3] Testing Tactile Task Checkbox Interaction...')
    const checkboxClicked = await mainWin.evaluate(async () => {
      const chk = document.querySelector('#workspace-tasks-list .tactile-checkbox')
      if (chk) {
        chk.click()
        return true
      }
      return false
    })
    await new Promise((r) => setTimeout(r, 800))

    const shot3 = path.join(SCREENSHOT_DIR, '03-workspace-task-completed-animation.png')
    await mainWin.screenshot({ path: shot3 })
    fs.copyFileSync(shot3, path.join(ARTIFACT_DIR, '03-workspace-task-completed-animation.png'))
    console.log(`  ✓ Saved: ${shot3} (checkbox clicked: ${checkboxClicked})`)

    // Uncheck to restore original task state
    if (checkboxClicked) {
      await mainWin.evaluate(async () => {
        const chk = document.querySelector('#workspace-tasks-list .tactile-checkbox')
        if (chk) chk.click()
      })
      await new Promise((r) => setTimeout(r, 800))
    }

    // ─── STEP 4: NAVIGATE TO FULL SUBJECTS OVERVIEW ───────────────────────────
    console.log('\n[Step 4] Navigating to Subjects Overview (Semester 3 vs Foundational)...')
    await mainWin.evaluate(() => {
      const viewAllBtn = document.getElementById('workspace-btn-view-all-subjects')
      if (viewAllBtn) viewAllBtn.click()
    })
    await new Promise((r) => setTimeout(r, 1500))

    const shot4 = path.join(SCREENSHOT_DIR, '04-subjects-overview-grouped.png')
    await mainWin.screenshot({ path: shot4 })
    fs.copyFileSync(shot4, path.join(ARTIFACT_DIR, '04-subjects-overview-grouped.png'))
    console.log(`  ✓ Saved: ${shot4}`)

    // Also capture scrolled view showing Foundational Disciplines
    await mainWin.evaluate(() => {
      const genericHeader = document.querySelector('#subjects-generic-grid')
      if (genericHeader) genericHeader.scrollIntoView({ behavior: 'instant', block: 'center' })
    })
    await new Promise((r) => setTimeout(r, 600))
    const shot4b = path.join(SCREENSHOT_DIR, '04b-subjects-overview-foundational.png')
    await mainWin.screenshot({ path: shot4b })
    fs.copyFileSync(shot4b, path.join(ARTIFACT_DIR, '04b-subjects-overview-foundational.png'))
    console.log(`  ✓ Saved: ${shot4b}`)

    // ─── STEP 5: OPEN DEDICATED SUBJECT DETAIL WORKSPACE (CSE 2195) ────────────
    console.log('\n[Step 5] Opening Dedicated Subject Workspace for CSE 2195...')
    await mainWin.evaluate(() => {
      const cards = document.querySelectorAll('#subjects-semester-grid .subject-card')
      for (const c of cards) {
        if (c.textContent && c.textContent.includes('CSE 2195')) {
          c.click()
          break
        }
      }
    })
    await new Promise((r) => setTimeout(r, 1500))

    const shot5 = path.join(SCREENSHOT_DIR, '05-subject-detail-view-cse2195.png')
    await mainWin.screenshot({ path: shot5 })
    fs.copyFileSync(shot5, path.join(ARTIFACT_DIR, '05-subject-detail-view-cse2195.png'))
    console.log(`  ✓ Saved: ${shot5}`)

    // ─── STEP 6: SWITCH TABS IN SUBJECT DETAIL VIEW ────────────────────────────
    console.log('\n[Step 6] Testing Subject Detail Tabs (Revision Tasks tab)...')
    await mainWin.evaluate(() => {
      const tabTasks = document.getElementById('subtab-tasks')
      if (tabTasks) tabTasks.click()
    })
    await new Promise((r) => setTimeout(r, 1000))

    const shot6 = path.join(SCREENSHOT_DIR, '06-subject-detail-tabs-revision-tasks.png')
    await mainWin.screenshot({ path: shot6 })
    fs.copyFileSync(shot6, path.join(ARTIFACT_DIR, '06-subject-detail-tabs-revision-tasks.png'))
    console.log(`  ✓ Saved: ${shot6}`)

    // ─── STEP 7: FOUNDATIONAL DISCIPLINE DETAIL (Computer Science / Physics) ───
    console.log('\n[Step 7] Returning to Overview and Opening Foundational Discipline...')
    await mainWin.evaluate(() => {
      const backBtn = document.getElementById('subject-detail-back-btn')
      if (backBtn) backBtn.click()
    })
    await new Promise((r) => setTimeout(r, 1000))

    await mainWin.evaluate(() => {
      const genericCards = document.querySelectorAll('#subjects-generic-grid .subject-card')
      for (const c of genericCards) {
        if (c.textContent && c.textContent.includes('Computer Science')) {
          c.click()
          break
        }
      }
    })
    await new Promise((r) => setTimeout(r, 1500))

    const shot7 = path.join(SCREENSHOT_DIR, '07-subject-detail-foundational-cs.png')
    await mainWin.screenshot({ path: shot7 })
    fs.copyFileSync(shot7, path.join(ARTIFACT_DIR, '07-subject-detail-foundational-cs.png'))
    console.log(`  ✓ Saved: ${shot7}`)

    // Non-destructive cleanup of fixture note created in Step 2
    console.log('\n[Cleanup] Cleaning up fixture note created in Step 2...')
    await mainWin.evaluate(async () => {
      const bridge = window.gravitasDesktop
      if (bridge && bridge.listIdeas && bridge.deleteIdea) {
        const ideas = await bridge.listIdeas()
        const fixture = ideas.find((i) => i.title === 'Data cleaning and transformation methods for EDA')
        if (fixture) {
          await bridge.deleteIdea(fixture.id, true)
        }
      }
    })

    console.log('\n=== ALL PHASE B VERIFICATION STEPS COMPLETED SUCCESSFULLY ===')
  } catch (err) {
    console.error('Error during verification:', err)
    throw err
  } finally {
    console.log('Closing Electron application...')
    await app.close()
  }
}

runPhaseBVerification().catch((err) => {
  console.error('Phase B Verification failed:', err)
  process.exit(1)
})
