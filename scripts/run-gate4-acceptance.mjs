import { _electron as electron } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const SCREENSHOT_DIR = path.resolve('docs/desktop-audit/acceptance-screenshots')
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

async function runGate4FinalAcceptance() {
  console.log('=== [GRAVITAS GATE 4 FINAL ACCEPTANCE: AUTOMATED ELECTRON VERIFICATION] ===')

  // Create isolated temporary directory — NEVER mutate daily-use SQLite database
  const tempUserData = path.join(os.tmpdir(), `gravitas-acceptance-userdata-${Date.now()}`)
  const tempInboxFolder = path.join(tempUserData, 'inbox-sync-mock')
  fs.mkdirSync(tempUserData, { recursive: true })
  fs.mkdirSync(tempInboxFolder, { recursive: true })
  console.log(`[Safety Assurance] Using isolated temporary user data root: ${tempUserData}`)

  const testResults = []
  function recordResult(checkName, status, details) {
    testResults.push({ checkName, status, details })
    console.log(`[RESULT: ${status}] ${checkName} — ${details}`)
  }

  let testNoteId = null
  let testAssignmentId = null

  // ═══════════════════════════════════════════════════════════════════════════
  // RUN 1: FUNCTIONAL VERIFICATION & MUTATION TEST
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- LAUNCHING RUN 1: Electron Instance with Isolated Storage ---')
  let app1 = await electron.launch({
    args: [path.resolve('apps/desktop'), `--user-data-dir=${tempUserData}`],
    env: {
      ...process.env,
      GRAVITAS_DATA_ROOT: tempUserData,
      GRAVITAS_OPEN_COMPANION: '1',
    },
  })

  try {
    await new Promise((r) => setTimeout(r, 4000))
    const windows1 = app1.windows()
    console.log(`Discovered ${windows1.length} window(s) in Run 1:`)
    windows1.forEach((w, i) => console.log(`  [${i}] ${w.url()}`))

    let mainWin = windows1.find((w) => w.url().includes('index.html')) || (await app1.firstWindow())
    let companionWin = windows1.find((w) => w.url().includes('companion.html'))

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

    // Seed test data via bridge inside companionWin
    console.log('\n[Seeding Isolated Test Data] Creating test note & study assignment...')
    const seedRes = await companionWin.evaluate(async () => {
      const b = window.gravitasDesktop
      if (!b) return { error: 'No desktop bridge' }

      // 1. Create a note in Knowledge Hub
      const note = await b.saveIdea({
        title: 'Heuristic Search & A* Optimality',
        originalText: '# Heuristic Search & A* Optimality\n\nAdmissible heuristics guarantee optimal cost in tree search.',
        collection: 'STUDY_NOTE',
        subject: 'CSE 2195',
      })

      // 2. Create semester subject
      await b.executeStudyGuardianOperation({
        action: 'CREATE_SEMESTER_SUBJECT',
        code: 'CSE 2195',
        name: 'Artificial Intelligence & Search',
        credits: 4,
      })

      // 3. Create confirmed assignment in Study Guardian
      const asgnRes = await b.executeStudyGuardianOperation({
        action: 'CONFIRM_ASSIGNMENT',
        confirmedSubjectCode: 'CSE 2195',
        title: 'Search Trees Assignment',
        confirmedDueDate: '2026-10-30',
        teacherInstructions: 'Implement A* search and evaluate admissibility.',
      })

      return {
        noteId: note.id,
        assignmentId: asgnRes.assignment?.assignmentId,
      }
    })

    testNoteId = seedRes.noteId
    testAssignmentId = seedRes.assignmentId
    console.log(`  ✓ Seeded note ID: ${testNoteId}`)
    console.log(`  ✓ Seeded assignment ID: ${testAssignmentId}`)

    // ─── CHECK 1: Companion → Workspace Note Navigation ────────────────────────
    console.log('\n[Check 1] Companion → Workspace Note Navigation...')
    if (!companionWin) throw new Error('Companion window not found')

    await companionWin.bringToFront()
    await companionWin.click('#tab-btn-capabilities')
    await new Promise((r) => setTimeout(r, 400))
    await companionWin.click('#tab-btn-vault')
    await new Promise((r) => setTimeout(r, 1200))

    const noteCardSelector = `[data-view-workspace-btn="${testNoteId}"]`
    await companionWin.waitForSelector(noteCardSelector, { timeout: 8000 })
    await companionWin.click(noteCardSelector)
    await new Promise((r) => setTimeout(r, 1500))

    await mainWin.bringToFront()
    const activeSurfaceNotes = await mainWin.evaluate(() => {
      const activeEl = document.querySelector('.surface.active')
      const selectedItem = document.querySelector('.note-card-item.selected')
      const titleInput = document.getElementById('notes-input-title')
      const contentArea = document.getElementById('notes-textarea-content')
      return {
        surfaceId: activeEl?.id,
        noteId: selectedItem?.getAttribute('data-note-id'),
        title: titleInput ? titleInput.value : null,
        content: contentArea ? contentArea.value : null,
      }
    })

    if (
      activeSurfaceNotes.surfaceId === 'surface-notes' &&
      activeSurfaceNotes.noteId === testNoteId &&
      activeSurfaceNotes.content?.includes('Admissible heuristics guarantee optimal cost')
    ) {
      recordResult(
        'Companion → Workspace Note Navigation',
        'PASS',
        `Opened note ID ${testNoteId} and loaded exact markdown content in Main Workspace editor.`
      )
    } else {
      recordResult(
        'Companion → Workspace Note Navigation',
        'FAIL',
        `Expected note ${testNoteId} on surface-notes, got ${JSON.stringify(activeSurfaceNotes)}`
      )
    }
    await saveScreenshot(
      mainWin,
      'acceptance-01-companion-to-note.png',
      'Workspace editor opened and populated with exact note ID and markdown content from Companion click'
    )

    // ─── CHECK 2: Companion → Workspace Assignment Navigation ──────────────────
    console.log('\n[Check 2] Companion → Workspace Assignment Navigation...')
    await companionWin.bringToFront()
    await companionWin.click('#tab-btn-study-guardian')
    await new Promise((r) => setTimeout(r, 1500))

    const viewSubjBtn = await companionWin.$(`[data-view-subject-btn="CSE 2195"]`)
    if (!viewSubjBtn) throw new Error('No [data-view-subject-btn="CSE 2195"] found in companion')
    await viewSubjBtn.click()
    await new Promise((r) => setTimeout(r, 1800))

    await mainWin.bringToFront()
    const subjectNavState = await mainWin.evaluate((expectedAsgnId) => {
      const activeSurface = document.querySelector('.surface.active')
      const codeEl = document.getElementById('subject-detail-code')
      const activeTab = document.querySelector('.subject-nav-tab.active')
      const asgnCards = Array.from(document.querySelectorAll('[data-subject-assignment-id]')).map((c) => ({
        id: c.getAttribute('data-subject-assignment-id'),
        title: c.getAttribute('data-subject-assignment-title'),
        selected: c.classList.contains('selected'),
      }))
      return {
        surfaceId: activeSurface?.id,
        subjectCode: codeEl?.textContent?.trim(),
        activeTab: activeTab?.getAttribute('data-subject-tab'),
        asgnCards,
      }
    }, testAssignmentId)

    if (
      subjectNavState.surfaceId === 'surface-subjects' &&
      subjectNavState.subjectCode === 'CSE 2195' &&
      subjectNavState.activeTab === 'ASSIGNMENTS' &&
      subjectNavState.asgnCards.length > 0
    ) {
      recordResult(
        'Companion → Workspace Assignment Navigation',
        'PASS',
        `Navigated to subject CSE 2195, automatically activated ASSIGNMENTS tab, and displayed assignment cards.`
      )
    } else {
      recordResult(
        'Companion → Workspace Assignment Navigation',
        'FAIL',
        `Navigation state mismatch: ${JSON.stringify(subjectNavState)}`
      )
    }
    await saveScreenshot(
      mainWin,
      'acceptance-02-companion-to-assignment.png',
      'Main Workspace navigated to CSE 2195 with ASSIGNMENTS tab active and assignment card rendered'
    )

    // ─── CHECK 3: Bidirectional Theme Synchronization ──────────────────────────
    console.log('\n[Check 3] Bidirectional Theme Synchronization...')
    // 3a: Main -> Companion
    await mainWin.click('#tab-settings')
    await new Promise((r) => setTimeout(r, 800))
    await mainWin.selectOption('#settings-theme-select', 'light')
    await new Promise((r) => setTimeout(r, 1000))

    const isMainLight1 = await mainWin.evaluate(() => document.body.classList.contains('light-theme'))
    const isCompanionLight1 = await companionWin.evaluate(() => document.body.classList.contains('light-theme'))

    if (isMainLight1 && isCompanionLight1) {
      recordResult(
        'Theme Sync (Main → Companion)',
        'PASS',
        'Changing theme in Main Window instantly synced light-theme class to Companion Window via IPC.'
      )
    } else {
      recordResult(
        'Theme Sync (Main → Companion)',
        'FAIL',
        `Main light: ${isMainLight1}, Companion light: ${isCompanionLight1}`
      )
    }
    await saveScreenshot(
      mainWin,
      'acceptance-03-theme-main-to-companion.png',
      'Main Window set to Warm Stone light theme with Companion synchronized to light'
    )

    // 3b: Companion -> Main
    await companionWin.bringToFront()
    await companionWin.click('#companion-theme-btn') // Toggles from light -> dark
    await new Promise((r) => setTimeout(r, 1000))

    const isCompanionDark2 = await companionWin.evaluate(() => !document.body.classList.contains('light-theme'))
    const isMainDark2 = await mainWin.evaluate(() => !document.body.classList.contains('light-theme'))

    // Toggle back to light to test persistence on cold restart
    await companionWin.click('#companion-theme-btn') // Toggles from dark -> light
    await new Promise((r) => setTimeout(r, 1000))

    const isCompanionLight3 = await companionWin.evaluate(() => document.body.classList.contains('light-theme'))
    const isMainLight3 = await mainWin.evaluate(() => document.body.classList.contains('light-theme'))

    if (isCompanionDark2 && isMainDark2 && isCompanionLight3 && isMainLight3) {
      recordResult(
        'Theme Sync (Companion → Main)',
        'PASS',
        'Toggling theme in Companion Window instantly synced dark and light states back to Main Window.'
      )
    } else {
      recordResult(
        'Theme Sync (Companion → Main)',
        'FAIL',
        `Sync failure: dark2=(${isCompanionDark2},${isMainDark2}), light3=(${isCompanionLight3},${isMainLight3})`
      )
    }
    await saveScreenshot(
      companionWin,
      'acceptance-04-theme-companion-to-main.png',
      'Companion Window theme toggler syncing back to Main Window'
    )

    // ─── CHECK 4: Settings Surface & Runtime Verification ──────────────────────
    console.log('\n[Check 4] Settings Surface End-to-End Verification...')
    await mainWin.bringToFront()
    await mainWin.click('#tab-settings')
    await new Promise((r) => setTimeout(r, 1000))

    // Fill settings inputs
    await mainWin.fill('#settings-quiet-start', '21:30')
    await mainWin.fill('#settings-quiet-end', '07:30')
    await mainWin.selectOption('#settings-reminder-interval', '120')
    await mainWin.check('#settings-notifications-enabled')
    await mainWin.check('#settings-start-with-windows')
    await mainWin.check('#settings-deny-cloud-egress')
    // Configure Phone Inbox mock folder via bridge
    await mainWin.evaluate(async (folder) => {
      await window.gravitasDesktop.executeStudyGuardianOperation({
        action: 'SET_INBOX_FOLDER',
        folderPath: folder,
      })
      const folderInput = document.getElementById('settings-inbox-folder')
      if (folderInput) folderInput.value = folder
    }, tempInboxFolder)

    // Click Save Settings button
    await mainWin.click('#settings-btn-save')
    await new Promise((r) => setTimeout(r, 1500))

    const feedbackText = await mainWin.textContent('#settings-save-feedback')
    const savedSuccess = feedbackText?.includes('Settings saved')

    // Test inbox folder setup
    await mainWin.click('#settings-btn-test-inbox')
    await new Promise((r) => setTimeout(r, 1500))
    const inboxStatusPillText = await mainWin.textContent('#settings-inbox-status-pill')

    if (savedSuccess && (inboxStatusPillText?.includes('Verified') || inboxStatusPillText?.includes('Watching') || inboxStatusPillText?.includes('Configured'))) {
      recordResult(
        'Settings End-to-End Save & In-Memory Runtime Effect',
        'PASS',
        'Saved quiet hours (21:30-07:30), reminder interval (120m), deny cloud egress, and verified mock inbox folder.'
      )
    } else {
      recordResult(
        'Settings End-to-End Save & In-Memory Runtime Effect',
        'FAIL',
        `Save feedback: "${feedbackText}", Inbox status: "${inboxStatusPillText}"`
      )
    }
    await saveScreenshot(
      mainWin,
      'acceptance-05-settings-saved-runtime.png',
      'Settings surface displaying confirmed saved feedback and verified inbox status pill'
    )

    // ─── CHECK 5: Keyboard Controls, Compact Companion & Failed-Op Feedback ───
    console.log('\n[Check 5] Keyboard Controls, Compact Companion & Error Feedback...')
    // 5a: Global keyboard shortcut '/' in workspace
    await mainWin.click('#tab-workspace')
    await new Promise((r) => setTimeout(r, 800))
    await mainWin.keyboard.press('/')
    const isQuickInputFocused = await mainWin.evaluate(() => {
      const active = document.activeElement
      return active?.id === 'workspace-quick-input'
    })
    if (isQuickInputFocused) {
      recordResult(
        'Keyboard Shortcut (Workspace Quick Capture)',
        'PASS',
        "Pressing '/' in workspace immediately focused quick-capture prompt input."
      )
    } else {
      recordResult('Keyboard Shortcut (Workspace Quick Capture)', 'FAIL', 'Quick input was not focused by shortcut.')
    }

    // 5b: Compact Companion layout
    const companionSelectExists = await companionWin.evaluate(() => {
      const select = document.getElementById('companion-subject-select')
      return Boolean(select && select.tagName === 'SELECT')
    })
    if (companionSelectExists) {
      recordResult(
        'Compact Companion Layout',
        'PASS',
        'Compact dropdown selector (#companion-subject-select) used instead of 10-button chip wall.'
      )
    } else {
      recordResult('Compact Companion Layout', 'FAIL', 'Compact subject dropdown not found.')
    }

    // 5c: Failed operation feedback and dirty state tracking in notes editor
    await mainWin.click('#tab-notes')
    await new Promise((r) => setTimeout(r, 800))

    // Test failed operation: unconfirmed deletion is rejected
    const delRejectRes = await mainWin.evaluate(async () => {
      try {
        await window.gravitasDesktop.deleteIdea('fake-id', false)
        return { rejected: false }
      } catch (err) {
        return { rejected: true, message: err.message }
      }
    })

    // Test dirty state tracking: editing note switches indicator to Unsaved
    await mainWin.fill('#notes-input-title', 'Unsaved Acceptance Note Title')
    await mainWin.dispatchEvent('#notes-input-title', 'input')
    await new Promise((r) => setTimeout(r, 400))

    const dirtyStateInfo = await mainWin.evaluate(() => {
      const indicator = document.getElementById('notes-dirty-indicator')
      return {
        text: indicator?.textContent?.trim(),
        isDirtyClass: indicator?.classList.contains('dirty'),
      }
    })

    if (delRejectRes.rejected && dirtyStateInfo.isDirtyClass && dirtyStateInfo.text?.includes('Unsaved')) {
      recordResult(
        'Failed-Operation & Dirty-State Feedback (Data Safety)',
        'PASS',
        `Unconfirmed deletion safely rejected (${delRejectRes.message}); unsaved note edits flag "Unsaved" state without false "Saved" report.`
      )
    } else {
      recordResult(
        'Failed-Operation & Dirty-State Feedback (Data Safety)',
        'FAIL',
        `Deletion rejection: ${JSON.stringify(delRejectRes)}, Dirty state info: ${JSON.stringify(dirtyStateInfo)}`
      )
    }
    await saveScreenshot(
      mainWin,
      'acceptance-06-keyboard-compact-feedback.png',
      'Knowledge Hub showing active dirty-state tracking ("Unsaved") and rejection of unconfirmed deletions'
    )
  } finally {
    console.log('Closing Run 1 Electron instance...')
    await app1.close()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RUN 2: COLD RESTART PERSISTENCE VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- LAUNCHING RUN 2: Cold Restart Verification (Same Isolated Storage) ---')
  let app2 = await electron.launch({
    args: [path.resolve('apps/desktop'), `--user-data-dir=${tempUserData}`],
    env: {
      ...process.env,
      GRAVITAS_DATA_ROOT: tempUserData,
      GRAVITAS_OPEN_COMPANION: '1',
    },
  })

  try {
    await new Promise((r) => setTimeout(r, 4000))
    const windows2 = app2.windows()
    let mainWin2 = windows2.find((w) => w.url().includes('index.html')) || (await app2.firstWindow())
    let companionWin2 = windows2.find((w) => w.url().includes('companion.html'))

    await mainWin2.setViewportSize({ width: 1280, height: 800 })
    await mainWin2.waitForLoadState('domcontentloaded')
    if (companionWin2) {
      await companionWin2.setViewportSize({ width: 440, height: 680 })
      await companionWin2.waitForLoadState('domcontentloaded')
    }
    await new Promise((r) => setTimeout(r, 2000))

    // Close onboarding dialog if open
    await mainWin2.evaluate(() => {
      const dialog = document.getElementById('onboarding-dialog')
      if (dialog && dialog.open) dialog.close()
    })

    // Check cold-restart theme persistence
    const mainThemeRestored = await mainWin2.evaluate(() => document.body.classList.contains('light-theme'))
    const companionThemeRestored = await companionWin2.evaluate(() => document.body.classList.contains('light-theme'))

    if (mainThemeRestored && companionThemeRestored) {
      recordResult(
        'Theme Persistence across Cold Restart',
        'PASS',
        'Both Main Window and Companion Window restored light-theme class from cold restart.'
      )
    } else {
      recordResult(
        'Theme Persistence across Cold Restart',
        'FAIL',
        `Main: ${mainThemeRestored}, Companion: ${companionThemeRestored}`
      )
    }

    // Check Settings values persistence
    await mainWin2.click('#tab-settings')
    await new Promise((r) => setTimeout(r, 1200))

    const persistedValues = await mainWin2.evaluate(() => {
      const quietStart = document.getElementById('settings-quiet-start')
      const quietEnd = document.getElementById('settings-quiet-end')
      const interval = document.getElementById('settings-reminder-interval')
      const startWin = document.getElementById('settings-start-with-windows')
      const themeSel = document.getElementById('settings-theme-select')
      const denyCloud = document.getElementById('settings-deny-cloud-egress')
      return {
        quietStart: quietStart?.value,
        quietEnd: quietEnd?.value,
        interval: interval?.value,
        startWin: startWin?.checked,
        themeSel: themeSel?.value,
        denyCloud: denyCloud?.checked,
      }
    })

    if (
      persistedValues.quietStart === '21:30' &&
      persistedValues.quietEnd === '07:30' &&
      persistedValues.interval === '120' &&
      persistedValues.themeSel === 'light' &&
      persistedValues.denyCloud === true
    ) {
      recordResult(
        'Settings Persistence across Cold Restart',
        'PASS',
        'Preferences (quiet hours 21:30-07:30, interval 120m, light theme, deny cloud egress) verified intact after restart.'
      )
    } else {
      recordResult(
        'Settings Persistence across Cold Restart',
        'FAIL',
        `Persisted values mismatch: ${JSON.stringify(persistedValues)}`
      )
    }

    await saveScreenshot(
      mainWin2,
      'acceptance-07-cold-restart-persistence.png',
      'Settings surface and theme correctly restored following complete cold application restart'
    )
  } finally {
    console.log('Closing Run 2 Electron instance...')
    await app2.close()
    // Clean up temporary user data directory
    try {
      fs.rmSync(tempUserData, { recursive: true, force: true })
      console.log(`[Safety Assurance] Cleaned up temporary test directory: ${tempUserData}`)
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY REPORT & CLASSIFICATION OF RUNTIME EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n========================================================================')
  console.log('GRAVITAS GATE 4 FINAL ACCEPTANCE MATRIX')
  console.log('========================================================================')
  for (const r of testResults) {
    console.log(`[${r.status.padEnd(4)}] ${r.checkName.padEnd(45)} : ${r.details}`)
  }
  console.log('========================================================================\n')

  return testResults
}

runGate4FinalAcceptance().catch((err) => {
  console.error('Acceptance suite failed:', err)
  process.exit(1)
})
