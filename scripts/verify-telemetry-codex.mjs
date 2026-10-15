/**
 * GRAVITAS 2.0 — Telemetry Codex & Visual Foundation E2E Verification
 *
 * Captures genuine Windows Electron window screenshots for:
 * 1. Sanctuary Index (Personal Field Journal) at 1280x800
 * 2. Ada Study Folio in Slate Theme (Markdown & KaTeX) at 1280x800
 * 3. Ada Study Folio in Vellum Theme (Archival Parchment & KaTeX) at 1280x800
 * 4. 300px Companion Dialogue Flap docked alongside workspace at 1280x800
 * 5. Grav Character Prototype (Brass & Basalt Silhouette) at 1280x800
 * 6. Responsive 1024x640 Overflow Check for Sanctuary Index
 * 7. Responsive 1024x640 Overflow Check for Ada Study Folio
 */

import path from 'node:path'
import fs from 'node:fs'
import { _electron as electron } from 'playwright'

const EVIDENCE_DIR = path.resolve('docs/gravitas2-evidence/telemetry-codex')
const VIDEO_DIR = path.resolve('docs/gravitas2-evidence/videos')
const ARTIFACT_DIR = path.resolve('C:/Users/smara/.gemini/antigravity/brain/2d7706bf-d058-4b00-bc7f-59a689a21085')

fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
fs.mkdirSync(VIDEO_DIR, { recursive: true })
fs.mkdirSync(ARTIFACT_DIR, { recursive: true })

function saveEvidence(filename, buffer) {
  const localPath = path.join(EVIDENCE_DIR, filename)
  const artifactPath = path.join(ARTIFACT_DIR, filename)
  fs.writeFileSync(localPath, buffer)
  fs.writeFileSync(artifactPath, buffer)
  console.log(`[EVIDENCE SAVED] ${filename}`)
}

async function runTelemetryCodexVerification() {
  console.log('=== [GRAVITAS 2.0: TELEMETRY CODEX VISUAL VERIFICATION] ===')

  console.log('Launching Electron desktop application...')
  const app = await electron.launch({
    args: [path.resolve('apps/desktop')],
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1280, height: 800 },
    },
    env: {
      ...process.env,
      NODE_ENV: 'test',
      GRAVITAS_OPEN_COMPANION: '0',
    },
  })

  try {
    await new Promise((r) => setTimeout(r, 2500))
    const allWindows = app.windows()
    console.log(`Discovered ${allWindows.length} Electron window(s).`)

    const mainWin = allWindows.find((w) => w.url().includes('index.html')) || (await app.firstWindow())
    await mainWin.setViewportSize({ width: 1280, height: 800 })
    await mainWin.waitForLoadState('domcontentloaded')
    mainWin.on('console', (msg) => console.log('RENDERER LOG:', msg.type(), msg.text()))
    mainWin.on('pageerror', (err) => console.log('RENDERER ERROR:', err))
    await new Promise((r) => setTimeout(r, 1500))

    // Close any legacy onboarding dialog if present
    await mainWin.evaluate(() => {
      const dialog = document.getElementById('onboarding-dialog')
      if (dialog && dialog.open) dialog.close()
    })

    // ─── 1. SANCTUARY INDEX (1280x800) ───
    console.log('1. Verifying Sanctuary Index at 1280x800...')
    await mainWin.waitForSelector('#sanctuary-index', { timeout: 10000 })
    await new Promise((r) => setTimeout(r, 1000))

    const sanctuaryBuf = await mainWin.screenshot({ fullPage: false })
    saveEvidence('01-sanctuary-index-1280x800.png', sanctuaryBuf)

    // ─── 2. ADA STUDY FOLIO (SLATE THEME, 1280x800) ───
    console.log('2. Navigating to Ada Study Folio (Slate Theme)...')
    await mainWin.click('#spine-nav-ada-folio')
    await mainWin.waitForSelector('#ada-study-folio', { timeout: 10000 })
    await new Promise((r) => setTimeout(r, 1000))

    const adaSlateBuf = await mainWin.screenshot({ fullPage: false })
    saveEvidence('02-ada-study-folio-slate-1280x800.png', adaSlateBuf)

    // ─── 3. ADA STUDY FOLIO (VELLUM THEME, 1280x800) ───
    console.log('3. Switching to Vellum Archival Theme...')
    await mainWin.click('#spine-toggle-folio-theme')
    await new Promise((r) => setTimeout(r, 1000))

    const adaVellumBuf = await mainWin.screenshot({ fullPage: false })
    saveEvidence('03-ada-study-folio-vellum-1280x800.png', adaVellumBuf)

    // Toggle back to Slate theme for subsequent captures
    await mainWin.click('#spine-toggle-folio-theme')
    await new Promise((r) => setTimeout(r, 600))

    // ─── 4. 300PX COMPANION DIALOGUE FLAP (1280x800) ───
    console.log('4. Opening 300px Companion Dialogue Flap alongside Workspace...')
    await mainWin.click('#spine-toggle-dialogue-flap')
    await mainWin.waitForSelector('#companion-dialogue-flap', { timeout: 10000 })
    await new Promise((r) => setTimeout(r, 1000))

    // Send a sample question into dialogue flap to demonstrate interaction
    await mainWin.fill('#flap-input-field', 'Summarize the Master Theorem recurrence for MergeSort.')
    await mainWin.click('#flap-send-btn')
    await new Promise((r) => setTimeout(r, 1200))

    const dialogueFlapBuf = await mainWin.screenshot({ fullPage: false })
    saveEvidence('04-companion-dialogue-flap-1280x800.png', dialogueFlapBuf)

    // Close the dialogue flap
    await mainWin.click('#flap-close-btn')
    await new Promise((r) => setTimeout(r, 600))

    // ─── 5. GRAV CHARACTER PROTOTYPE (1280x800) ───
    console.log('5. Navigating to Grav Character Prototype Inspector...')
    await mainWin.click('#spine-nav-grav-prototype')
    await mainWin.waitForSelector('#grav-prototype-inspector', { timeout: 10000 })
    await new Promise((r) => setTimeout(r, 1000))

    const gravProtoBuf = await mainWin.screenshot({ fullPage: false })
    saveEvidence('05-grav-character-prototype-1280x800.png', gravProtoBuf)

    // ─── 6. RESPONSIVE 1024x640 OVERFLOW CHECK (SANCTUARY INDEX) ───
    console.log('6. Checking Sanctuary Index at 1024x640...')
    await mainWin.setViewportSize({ width: 1024, height: 640 })
    await mainWin.click('#spine-nav-sanctuary')
    await mainWin.waitForSelector('#sanctuary-index', { timeout: 10000 })
    await new Promise((r) => setTimeout(r, 1000))

    const sanctuary1024Buf = await mainWin.screenshot({ fullPage: false })
    saveEvidence('06-sanctuary-index-1024x640-overflow.png', sanctuary1024Buf)

    // ─── 7. RESPONSIVE 1024x640 OVERFLOW CHECK (ADA STUDY FOLIO) ───
    console.log('7. Checking Ada Study Folio at 1024x640...')
    await mainWin.click('#spine-nav-ada-folio')
    await mainWin.waitForSelector('#ada-study-folio', { timeout: 10000 })
    await new Promise((r) => setTimeout(r, 1000))

    const ada1024Buf = await mainWin.screenshot({ fullPage: false })
    saveEvidence('07-ada-folio-1024x640-overflow.png', ada1024Buf)

    console.log('=== [TELEMETRY CODEX E2E VERIFICATION COMPLETE] ===')
  } finally {
    await app.close()
  }
}

runTelemetryCodexVerification().catch((err) => {
  console.error('[E2E VERIFICATION ERROR]:', err)
  process.exit(1)
})
