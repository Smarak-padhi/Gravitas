import { _electron as electron } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const SCREENSHOT_DIR = path.resolve('docs/design-r4/screenshots')
const ARTIFACT_DIR = 'C:/Users/smara/.gemini/antigravity/brain/7930c730-572d-478d-9199-97c38db8f42b'

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function runCapture() {
  console.log('Launching Electron via Playwright...')
  const app = await electron.launch({
    args: [path.resolve('apps/desktop')],
    env: { ...process.env, NODE_ENV: 'test', GRAVITAS_HEADLESS_TEST: 'true' },
  })

  try {
    await new Promise((r) => setTimeout(r, 1500))
    const windows = app.windows()
    const win = windows.find((w) => w.url().includes('index.html')) || (await app.firstWindow())

    await win.setViewportSize({ width: 1280, height: 800 })
    await win.waitForLoadState('domcontentloaded')

    // 1. Open Onboarding on Screen 1 (Dark Mode, 1280x800)
    await win.evaluate(() => {
      document.body.classList.remove('light-theme')
      const btn = document.getElementById('btn-header-onboarding')
      btn?.click()
    })
    // Give WebGL texture and font a moment to render
    await new Promise((r) => setTimeout(r, 1000))

    const p1 = path.join(SCREENSHOT_DIR, '01-proto-welcome-dark-1280x800.png')
    await win.screenshot({ path: p1 })
    console.log('Captured:', p1)

    // Capture animation frame 2 (t+1.5s) to verify shader motion
    await new Promise((r) => setTimeout(r, 1500))
    const p1Anim2 = path.join(SCREENSHOT_DIR, '01-proto-welcome-dark-anim-frame2.png')
    await win.screenshot({ path: p1Anim2 })
    console.log('Captured anim frame 2:', p1Anim2)

    // Capture animation frame 3 (t+3.0s)
    await new Promise((r) => setTimeout(r, 1500))
    const p1Anim3 = path.join(SCREENSHOT_DIR, '01-proto-welcome-dark-anim-frame3.png')
    await win.screenshot({ path: p1Anim3 })
    console.log('Captured anim frame 3:', p1Anim3)

    // 2. Compact View (1024x700 Dark)
    await win.setViewportSize({ width: 1024, height: 700 })
    await new Promise((r) => setTimeout(r, 600))
    const p2 = path.join(SCREENSHOT_DIR, '02-proto-welcome-dark-1024x700.png')
    await win.screenshot({ path: p2 })
    console.log('Captured:', p2)

    // 3. Welcome Screen (Light Mode, 1280x800)
    await win.setViewportSize({ width: 1280, height: 800 })
    await win.evaluate(() => {
      document.body.classList.add('light-theme')
    })
    await new Promise((r) => setTimeout(r, 600))
    const p3 = path.join(SCREENSHOT_DIR, '03-proto-welcome-light-1280x800.png')
    await win.screenshot({ path: p3 })
    console.log('Captured:', p3)

    // 4. Personalize Screen (Screen 2)
    await win.evaluate(() => {
      document.getElementById('ob-btn-get-started')?.click()
    })
    await new Promise((r) => setTimeout(r, 500))
    const p4 = path.join(SCREENSHOT_DIR, '04-proto-personalize-light-1280x800.png')
    await win.screenshot({ path: p4 })
    console.log('Captured:', p4)

    // 5. Phone Setup Screen (Screen 3)
    await win.evaluate(() => {
      document.getElementById('onboarding-btn-next')?.click()
    })
    await new Promise((r) => setTimeout(r, 500))
    const p5 = path.join(SCREENSHOT_DIR, '05-proto-phone-setup-light-1280x800.png')
    await win.screenshot({ path: p5 })
    console.log('Captured:', p5)

    // 6. Home Workspace (Light Mode, 1280x800)
    await win.evaluate(() => {
      const d = document.getElementById('onboarding-dialog')
      d?.close()
    })
    await new Promise((r) => setTimeout(r, 800))
    const p6 = path.join(SCREENSHOT_DIR, '06-proto-home-light-1280x800.png')
    await win.screenshot({ path: p6 })
    console.log('Captured:', p6)

    // 7. Home Workspace (Dark Mode, 1280x800)
    await win.evaluate(() => {
      document.body.classList.remove('light-theme')
    })
    await new Promise((r) => setTimeout(r, 800))
    const p7 = path.join(SCREENSHOT_DIR, '07-proto-home-dark-1280x800.png')
    await win.screenshot({ path: p7 })
    console.log('Captured:', p7)

    // 8. Notes Sub-View (Dark Mode, 1280x800)
    await win.evaluate(() => {
      const btn = document.getElementById('tab-notes')
      btn?.click()
    })
    await new Promise((r) => setTimeout(r, 500))
    const p8 = path.join(SCREENSHOT_DIR, '08-proto-notes-dark-1280x800.png')
    await win.screenshot({ path: p8 })
    console.log('Captured:', p8)

    // 9. Tasks Sub-View (Dark Mode, 1280x800)
    await win.evaluate(() => {
      const btn = document.getElementById('tab-tasks')
      btn?.click()
    })
    await new Promise((r) => setTimeout(r, 500))
    const p9 = path.join(SCREENSHOT_DIR, '09-proto-tasks-dark-1280x800.png')
    await win.screenshot({ path: p9 })
    console.log('Captured:', p9)

    // 10. Subjects Sub-View (Dark Mode, 1280x800)
    await win.evaluate(() => {
      const btn = document.getElementById('tab-subjects')
      btn?.click()
    })
    await new Promise((r) => setTimeout(r, 500))
    const p10 = path.join(SCREENSHOT_DIR, '10-proto-subjects-dark-1280x800.png')
    await win.screenshot({ path: p10 })
    console.log('Captured:', p10)

    // 11. Notes Sub-View (Light Mode, 1280x800)
    await win.evaluate(() => {
      document.body.classList.add('light-theme')
      const btn = document.getElementById('tab-notes')
      btn?.click()
    })
    await new Promise((r) => setTimeout(r, 500))
    const p11 = path.join(SCREENSHOT_DIR, '11-proto-notes-light-1280x800.png')
    await win.screenshot({ path: p11 })
    console.log('Captured:', p11)

    // 12. Tasks Sub-View (Light Mode, 1280x800)
    await win.evaluate(() => {
      const btn = document.getElementById('tab-tasks')
      btn?.click()
    })
    await new Promise((r) => setTimeout(r, 500))
    const p12 = path.join(SCREENSHOT_DIR, '12-proto-tasks-light-1280x800.png')
    await win.screenshot({ path: p12 })
    console.log('Captured:', p12)

    // 13. Subjects Sub-View (Light Mode, 1280x800)
    await win.evaluate(() => {
      const btn = document.getElementById('tab-subjects')
      btn?.click()
    })
    await new Promise((r) => setTimeout(r, 500))
    const p13 = path.join(SCREENSHOT_DIR, '13-proto-subjects-light-1280x800.png')
    await win.screenshot({ path: p13 })
    console.log('Captured:', p13)

    // 14. Floating Companion Window (Dark Mode)
    await win.evaluate(() => {
      const companionBtn = document.getElementById('btn-toggle-companion')
      companionBtn?.click()
    })
    await new Promise((r) => setTimeout(r, 1200))

    let compWin = app.windows().find((w) => w.url().includes('companion.html'))
    if (compWin) {
      await compWin.evaluate(() => {
        document.body.classList.remove('light-theme')
      })
      await new Promise((r) => setTimeout(r, 400))
      const p14 = path.join(SCREENSHOT_DIR, '14-proto-companion-dark.png')
      await compWin.screenshot({ path: p14 })
      console.log('Captured:', p14)

      // 15. Floating Companion Window (Light Mode)
      await compWin.evaluate(() => {
        document.body.classList.add('light-theme')
      })
      await new Promise((r) => setTimeout(r, 400))
      const p15 = path.join(SCREENSHOT_DIR, '15-proto-companion-light.png')
      await compWin.screenshot({ path: p15 })
      console.log('Captured:', p15)
    } else {
      console.warn('Companion window not found in open windows list.')
    }

    // Copy all to artifact directory for artifact embedding
    if (fs.existsSync(ARTIFACT_DIR)) {
      const files = fs.readdirSync(SCREENSHOT_DIR).filter((f) => f.endsWith('.png'))
      for (const f of files) {
        fs.copyFileSync(path.join(SCREENSHOT_DIR, f), path.join(ARTIFACT_DIR, f))
      }
      console.log(`Copied ${files.length} screenshots to artifacts directory.`)
    }
  } finally {
    await app.close()
    console.log('Closed Electron app.')
  }
}

runCapture().catch((err) => {
  console.error('Capture failed:', err)
  process.exit(1)
})
