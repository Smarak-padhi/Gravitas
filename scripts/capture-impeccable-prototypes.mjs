import { _electron as electron } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const SCREENSHOT_DIR = path.resolve('docs/impeccable-prototypes')
const ARTIFACT_DIR = 'C:/Users/smara/.gemini/antigravity/brain/7930c730-572d-478d-9199-97c38db8f42b'

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function captureDirection(dirName, indexFile, compFile) {
  console.log(`--- Capturing Direction ${dirName} ---`)
  // Temporarily swap index.html and companion.html
  const origIndex = fs.readFileSync('apps/desktop/src/renderer/index.html', 'utf8')
  const origComp = fs.readFileSync('apps/desktop/src/renderer/companion.html', 'utf8')

  fs.writeFileSync('apps/desktop/src/renderer/index.html', fs.readFileSync(`apps/desktop/src/renderer/${indexFile}`, 'utf8'))
  fs.writeFileSync('apps/desktop/src/renderer/companion.html', fs.readFileSync(`apps/desktop/src/renderer/${compFile}`, 'utf8'))

  const app = await electron.launch({
    args: [path.resolve('apps/desktop')],
    env: { ...process.env, NODE_ENV: 'test', GRAVITAS_HEADLESS_TEST: 'true' },
  })

  try {
    await new Promise((r) => setTimeout(r, 1500))
    const win = (await app.firstWindow())

    await win.setViewportSize({ width: 1280, height: 800 })
    await win.waitForLoadState('domcontentloaded')

    // Dark Home
    await win.evaluate(() => {
      document.body.classList.remove('light-theme')
      const d = document.getElementById('onboarding-dialog')
      d?.close()
    })
    await new Promise((r) => setTimeout(r, 800))
    const darkPath = path.join(SCREENSHOT_DIR, `${dirName}-home-dark.png`)
    await win.screenshot({ path: darkPath })
    console.log('Captured:', darkPath)

    // Light Home
    await win.evaluate(() => {
      document.body.classList.add('light-theme')
    })
    await new Promise((r) => setTimeout(r, 800))
    const lightPath = path.join(SCREENSHOT_DIR, `${dirName}-home-light.png`)
    await win.screenshot({ path: lightPath })
    console.log('Captured:', lightPath)

    // Companion Window
    await win.evaluate(() => {
      const btn = document.getElementById('btn-toggle-companion')
      btn?.click()
    })
    await new Promise((r) => setTimeout(r, 1200))

    const compWin = app.windows().find((w) => w.url().includes('companion.html'))
    if (compWin) {
      // Companion Dark
      await compWin.evaluate(() => {
        document.body.classList.remove('light-theme')
      })
      await new Promise((r) => setTimeout(r, 500))
      const compDarkPath = path.join(SCREENSHOT_DIR, `${dirName}-companion-dark.png`)
      await compWin.screenshot({ path: compDarkPath })
      console.log('Captured:', compDarkPath)

      // Companion Light
      await compWin.evaluate(() => {
        document.body.classList.add('light-theme')
      })
      await new Promise((r) => setTimeout(r, 500))
      const compLightPath = path.join(SCREENSHOT_DIR, `${dirName}-companion-light.png`)
      await compWin.screenshot({ path: compLightPath })
      console.log('Captured:', compLightPath)
    }
  } finally {
    await app.close()
    // Restore originals
    fs.writeFileSync('apps/desktop/src/renderer/index.html', origIndex)
    fs.writeFileSync('apps/desktop/src/renderer/companion.html', origComp)
  }
}

async function runAll() {
  await captureDirection('direction-a-architectural', 'proto-a-index.html', 'proto-a-companion.html')
  await captureDirection('direction-b-monolith', 'proto-b-index.html', 'proto-b-companion.html')
  await captureDirection('direction-c-nordic', 'proto-c-index.html', 'proto-c-companion.html')

  // Copy all captured pngs to ARTIFACT_DIR
  if (fs.existsSync(ARTIFACT_DIR)) {
    const files = fs.readdirSync(SCREENSHOT_DIR).filter((f) => f.endsWith('.png'))
    for (const f of files) {
      fs.copyFileSync(path.join(SCREENSHOT_DIR, f), path.join(ARTIFACT_DIR, f))
    }
    console.log(`Copied ${files.length} prototypes to artifacts directory.`)
  }
}

runAll().catch((e) => {
  console.error(e)
  process.exit(1)
})
