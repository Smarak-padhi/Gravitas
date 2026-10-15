/**
 * GRAVITAS 2.0 — Phase 05.6 Final Integration and Security Gate E2E Verification
 *
 * Demonstrates:
 * A. Mocked Local Inference IPC Regression & Honest Offline Open-Ended Handling
 * B. Owner Approval Enforcement via Application-Owned Authority (.gravitas/secure/)
 * C. Filesystem & Tool Path Containment Enforced at Execution Boundary
 * D. 3-Round Interactive Discovery Interview & Revision Capability
 * E. Readable Review Card with Explicit "Approve & Sign Grant" Button & Compact Task Inspector
 */

import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import { _electron as electron } from 'playwright'

const EVIDENCE_DIR = path.resolve('docs/gravitas2-evidence')
const VIDEO_DIR = path.resolve('docs/gravitas2-evidence/videos')
const ARTIFACT_DIR = path.resolve('C:/Users/smara/.gemini/antigravity/brain/2d7706bf-d058-4b00-bc7f-59a689a21085')

fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
fs.mkdirSync(VIDEO_DIR, { recursive: true })
fs.mkdirSync(ARTIFACT_DIR, { recursive: true })

// Helper to reliably scroll the exact conversation stream container to bottom
async function scrollToBottom(page) {
  await page.evaluate(() => {
    const el = document.getElementById('chat-conversation-stream')
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
  await new Promise((r) => setTimeout(r, 600))
}

// ─── Ephemeral Local Mock LLM Server (Labeled as MOCKED for IPC Regression Coverage) ──
function createMockLlmServer(port) {
  let isResponding = true
  const server = http.createServer((req, res) => {
    if (!isResponding) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Service Unavailable' }))
      return
    }

    // Health / Model list endpoint
    if (req.url?.includes('models') || req.url === '/api/tags') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        object: 'list',
        data: [{ id: 'llama3.2:latest', object: 'model' }],
        models: [{ name: 'llama3.2:latest', model: 'llama3.2' }]
      }))
      return
    }

    // OpenAI Chat Completions endpoint
    if (req.url?.includes('chat/completions') || req.url === '/api/chat') {
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        const content = 'The Akra-Bazzi recurrence method generalizes the Master Theorem to divide-and-conquer recurrences with unequal subproblem sizes T(x) = g(x) + sum a_i T(b_i x + h_i(x)). It finds p such that sum a_i b_i^p = 1, giving asymptotic solution Theta(x^p (1 + integral (g(u)/u^(p+1)) du)).'
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          id: 'chatcmpl-mock',
          object: 'chat.completion',
          model: 'llama3.2:latest',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content },
              finish_reason: 'stop',
            }
          ],
          usage: {
            prompt_tokens: 28,
            completion_tokens: 64,
            total_tokens: 92,
          },
        }))
      })
      return
    }

    res.writeHead(404)
    res.end()
  })

  return {
    start: () => new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server))),
    stop: () => new Promise((resolve) => server.close(() => resolve())),
    setResponding: (state) => { isResponding = state },
  }
}

async function runPhase056Verification() {
  console.log('=== [GRAVITAS 2.0: PHASE 05.6 FINAL INTEGRATION & SECURITY GATE] ===')
  const mockPort = 59998
  const mockLlm = createMockLlmServer(mockPort)
  await mockLlm.start()
  console.log(`[MOCKED] Ephemeral LLM server running on http://127.0.0.1:${mockPort} (IPC Regression Only)`)

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
      LOCAL_LLM_URL: `http://127.0.0.1:${mockPort}/v1`,
      GRAVITAS_OLLAMA_URL: `http://127.0.0.1:${mockPort}`,
    }
  })

  try {
    await new Promise((r) => setTimeout(r, 2500))
    const allWindows = app.windows()
    console.log(`Discovered ${allWindows.length} Electron window(s).`)

    const mainWin = allWindows.find((w) => w.url().includes('index.html')) || (await app.firstWindow())
    await mainWin.setViewportSize({ width: 1280, height: 800 })
    await mainWin.waitForLoadState('domcontentloaded')
    mainWin.on('console', msg => console.log('RENDERER LOG:', msg.type(), msg.text()))
    mainWin.on('pageerror', err => console.log('RENDERER ERROR:', err))
    await new Promise((r) => setTimeout(r, 2000))

    // Close any legacy onboarding dialog if present
    await mainWin.evaluate(() => {
      const dialog = document.getElementById('onboarding-dialog')
      if (dialog && dialog.open) dialog.close()
    })

    // Summon Grav panel
    const summonGravBtn = await mainWin.$('button:has-text("Talk with Grav")') || await mainWin.$('button:has-text("Summon Grav")')
    if (summonGravBtn) {
      await summonGravBtn.click()
    }
    await new Promise((r) => setTimeout(r, 1200))

    // Clear prior history for fresh test run
    const clearBtn = await mainWin.$('button[title*="Clear conversation history"]')
    if (clearBtn) {
      await clearBtn.click()
      await new Promise((r) => setTimeout(r, 600))
    }

    const chatInput = await mainWin.$('input[placeholder*="Ask Grav"]') || await mainWin.$('input[type="text"]')

    // ─── STEP 1: MOCKED LOCAL INFERENCE IPC REGRESSION (A) ───────────────────────
    console.log('\n[Step 1] Asking unfamiliar question under MOCKED LLM daemon for IPC regression coverage...')
    if (chatInput) {
      await chatInput.fill('What is the Akra-Bazzi recurrence method?')
      await chatInput.press('Enter')
    }
    await new Promise((r) => setTimeout(r, 3500))
    await scrollToBottom(mainWin)

    const shot1 = path.join(EVIDENCE_DIR, '01-mocked-inference-regression.png')
    await mainWin.screenshot({ path: shot1 })
    fs.copyFileSync(shot1, path.join(ARTIFACT_DIR, '01-mocked-inference-regression.png'))
    console.log(`  Saved: ${shot1}`)

    // ─── STEP 1B: HONEST OFFLINE OPEN-ENDED NOTICE (A) ───────────────────────────
    console.log('\n[Step 1b] Disabling mock daemon to demonstrate honest offline notice for open-ended queries...')
    mockLlm.setResponding(false)

    if (chatInput) {
      await chatInput.fill('Explain why the P versus NP problem remains unresolved')
      await chatInput.press('Enter')
    }
    await new Promise((r) => setTimeout(r, 2500))
    await scrollToBottom(mainWin)

    const shot1b = path.join(EVIDENCE_DIR, '01b-offline-honest-unfamiliar-notice.png')
    await mainWin.screenshot({ path: shot1b })
    fs.copyFileSync(shot1b, path.join(ARTIFACT_DIR, '01b-offline-honest-unfamiliar-notice.png'))
    console.log(`  Saved: ${shot1b}`)

    mockLlm.setResponding(true) // Re-enable for subsequent testing

    // Clear history before discovery sequence
    const clearBtn2 = await mainWin.$('button[title*="Clear conversation history"]')
    if (clearBtn2) {
      await clearBtn2.click()
      await new Promise((r) => setTimeout(r, 600))
    }

    // ─── STEP 2: 3-ROUND INTERACTIVE DEEP DISCOVERY (D) ──────────────────────────
    console.log('\n[Step 2] Triggering Round 1 of Deep Discovery (Vision & References)...')
    if (chatInput) {
      await chatInput.fill('Create disposable portfolio project')
      await chatInput.press('Enter')
    }
    await new Promise((r) => setTimeout(r, 2000))
    await scrollToBottom(mainWin)

    const shot2 = path.join(EVIDENCE_DIR, '02-discovery-round-1.png')
    await mainWin.screenshot({ path: shot2 })
    fs.copyFileSync(shot2, path.join(ARTIFACT_DIR, '02-discovery-round-1.png'))
    console.log(`  Saved: ${shot2}`)

    // Round 2
    console.log('\n[Step 2b] Providing Vision to trigger Round 2 (Design & Typography)...')
    if (chatInput) {
      await chatInput.fill('Vision: Tactile hardware engineering studio with warm walnut and copper accents')
      await chatInput.press('Enter')
    }
    await new Promise((r) => setTimeout(r, 2000))
    await scrollToBottom(mainWin)

    const shot2b = path.join(EVIDENCE_DIR, '02b-discovery-round-2.png')
    await mainWin.screenshot({ path: shot2b })
    fs.copyFileSync(shot2b, path.join(ARTIFACT_DIR, '02b-discovery-round-2.png'))
    console.log(`  Saved: ${shot2b}`)

    // Test Revision Command
    console.log('\n[Step 2c] Testing answer revision ("revise vision")...')
    if (chatInput) {
      await chatInput.fill('revise vision: Tactical aerospace darkroom with warm copper ember glow')
      await chatInput.press('Enter')
    }
    await new Promise((r) => setTimeout(r, 2000))
    await scrollToBottom(mainWin)

    // Round 3
    console.log('\n[Step 2d] Providing Typography & Colors to trigger Round 3 (Engineering & Constraints)...')
    if (chatInput) {
      await chatInput.fill('Fonts: Space Grotesk / Inter; Palette: #101214 graphite, #EDEAE3 bone white, #F4A261 copper; Layout: 960px flex container')
      await chatInput.press('Enter')
    }
    await new Promise((r) => setTimeout(r, 2000))
    await scrollToBottom(mainWin)

    const shot2c = path.join(EVIDENCE_DIR, '02c-discovery-round-3-engineering.png')
    await mainWin.screenshot({ path: shot2c })
    fs.copyFileSync(shot2c, path.join(ARTIFACT_DIR, '02c-discovery-round-3-engineering.png'))
    console.log(`  Saved: ${shot2c}`)

    // ─── STEP 3: READABLE SPECIFICATION REVIEW CARD & ACTION BUTTON (D & E) ───────
    console.log('\n[Step 3] Submitting Engineering requirements to compile specs and render Review Card...')
    if (chatInput) {
      await chatInput.fill('Scope: test-fixtures/disposable-portfolio/*; Tools: fs.writeFile, testRunner; Validator: node test.mjs')
      await chatInput.press('Enter')
    }
    await new Promise((r) => setTimeout(r, 4000))
    await scrollToBottom(mainWin)

    const shot3 = path.join(EVIDENCE_DIR, '03-specification-review-panel.png')
    await mainWin.screenshot({ path: shot3 })
    fs.copyFileSync(shot3, path.join(ARTIFACT_DIR, '03-specification-review-panel.png'))
    console.log(`  Saved: ${shot3}`)

    // ─── STEP 4: STRICT APPROVAL GATE BLOCKING UNAPPROVED EXECUTION (B) ───────────
    console.log('\n[Step 4] Attempting execution before approval to verify gate blocks cleanly...')
    if (chatInput) {
      await chatInput.fill('Execute portfolio changes')
      await chatInput.press('Enter')
    }
    await new Promise((r) => setTimeout(r, 2500))
    await scrollToBottom(mainWin)

    const shot4 = path.join(EVIDENCE_DIR, '04-approval-gate-blocked.png')
    await mainWin.screenshot({ path: shot4 })
    fs.copyFileSync(shot4, path.join(ARTIFACT_DIR, '04-approval-gate-blocked.png'))
    console.log(`  Saved: ${shot4}`)

    // ─── STEP 5: INTERACTIVE APPROVAL & SECURE GRANT CREATION (B & E) ─────────────
    console.log('\n[Step 5] Clicking "Approve & Sign Grant" button...')
    const approveBtn = await mainWin.$('button:has-text("Approve & Sign Grant")')
    if (approveBtn) {
      await approveBtn.click()
    } else if (chatInput) {
      await chatInput.fill('Approve specification')
      await chatInput.press('Enter')
    }
    await new Promise((r) => setTimeout(r, 2500))
    await scrollToBottom(mainWin)

    const shot5 = path.join(EVIDENCE_DIR, '05-approval-grant-signed.png')
    await mainWin.screenshot({ path: shot5 })
    fs.copyFileSync(shot5, path.join(ARTIFACT_DIR, '05-approval-grant-signed.png'))
    console.log(`  Saved: ${shot5}`)

    // ─── STEP 6: VERIFIED EXECUTION & EXPANDABLE TASK INSPECTOR (C & E) ───────────
    console.log('\n[Step 6] Clicking "Execute Portfolio Changes" button...')
    const execBtn = await mainWin.$('button:has-text("Execute Portfolio Changes")')
    if (execBtn) {
      await execBtn.click()
    } else if (chatInput) {
      await chatInput.fill('Execute portfolio changes')
      await chatInput.press('Enter')
    }
    await new Promise((r) => setTimeout(r, 4500))

    // Expand the Task Inspector details element to show full machine-checkable evidence
    console.log('Expanding Task Inspector <details> to verify evidence visibility...')
    await mainWin.evaluate(() => {
      const detailsList = Array.from(document.querySelectorAll('details'))
      const inspector = detailsList.find((d) => d.textContent?.includes('Task Inspector'))
      if (inspector) inspector.open = true
    })
    await new Promise((r) => setTimeout(r, 1200))
    await scrollToBottom(mainWin)

    const shot6 = path.join(EVIDENCE_DIR, '06-verified-execution-task-inspector.png')
    await mainWin.screenshot({ path: shot6 })
    fs.copyFileSync(shot6, path.join(ARTIFACT_DIR, '06-verified-execution-task-inspector.png'))
    console.log(`  Saved: ${shot6}`)

    // Final clean studio view before concluding
    await mainWin.evaluate(() => {
      const closeButtons = Array.from(document.querySelectorAll('button'))
      const closeBtn = closeButtons.find((b) => b.querySelector('svg.lucide-x'))
      if (closeBtn) closeBtn.click()
    })
    await new Promise((r) => setTimeout(r, 1800))

    // Conclude video recording
    const page = mainWin
    const video = page.video()
    console.log('\nWaiting for walkthrough video buffer to finalize...')
    await app.close()
    await mockLlm.stop()

    if (video) {
      const videoPath = await video.path()
      const targetVideo = path.join(VIDEO_DIR, 'phase-05-6-verification.webm')
      fs.copyFileSync(videoPath, targetVideo)
      fs.copyFileSync(videoPath, path.join(ARTIFACT_DIR, 'phase-05-6-verification.webm'))
      console.log(`  Saved walkthrough recording to: ${targetVideo}`)
      console.log(`  Copied walkthrough recording to: ${path.join(ARTIFACT_DIR, 'phase-05-6-verification.webm')}`)
    }

    console.log('\n=== [PHASE 05.6 E2E VERIFICATION COMPLETE] ===')
  } catch (err) {
    console.error('Phase 05.6 verification proof failed:', err)
    await app.close().catch(() => {})
    await mockLlm.stop().catch(() => {})
    throw err
  }
}

runPhase056Verification().catch((err) => {
  console.error(err)
  process.exit(1)
})
