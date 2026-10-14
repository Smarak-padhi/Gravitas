import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACT_DIR = 'C:/Users/smara/.gemini/antigravity/brain/3350c4d9-6ea0-45ca-aac9-280e00b5e1cf'
const DOCS_DIR = path.resolve('docs/website')
const SCREENSHOT_DIR = path.resolve('docs/website/screenshots')
const VIDEO_DIR = path.resolve('docs/website/videos')

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
fs.mkdirSync(VIDEO_DIR, { recursive: true })

const candidates = [
  {
    id: 'candidate-a-sculptural-obsidian',
    name: 'Candidate A: Sculptural Obsidian',
    file: 'site/hero-v2-candidate-a.html'
  },
  {
    id: 'candidate-b-fluid-silk',
    name: 'Candidate B: Fluid Silk',
    file: 'site/hero-v2-candidate-b.html'
  }
]

async function recordCandidate(browser, candidate) {
  console.log(`\n======================================================`)
  console.log(`RECORDING: ${candidate.name}`)
  console.log(`File: ${candidate.file}`)
  console.log(`======================================================`)

  const fileUrl = 'file://' + path.resolve(candidate.file).replace(/\\/g, '/')

  // 1. Desktop 1440x900 (10 second interactive recording)
  console.log(`\n[${candidate.id}] 1. Desktop 1440x900 capture & 10s video...`)
  const desktopContext = await browser.newContext({
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1440, height: 900 }
    },
    viewport: { width: 1440, height: 900 }
  })

  const dPage = await desktopContext.newPage()
  
  // Track console errors
  const consoleErrors = []
  dPage.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await dPage.goto(fileUrl, { waitUntil: 'domcontentloaded' })
  await dPage.waitForTimeout(2000) // Initial ambient breathing

  // Pointer movement to demonstrate shader reactivity
  await dPage.mouse.move(800, 450)
  await dPage.waitForTimeout(800)
  await dPage.mouse.move(1050, 320)
  await dPage.waitForTimeout(1000)
  await dPage.mouse.move(1200, 520)
  await dPage.waitForTimeout(1000)

  // Primary CTA Hover
  const cta1 = await dPage.$('#hero-primary-cta')
  if (cta1) {
    await cta1.hover()
    await dPage.waitForTimeout(1200)
  }

  // Secondary CTA Hover
  const cta2 = await dPage.$('#hero-secondary-cta')
  if (cta2) {
    await cta2.hover()
    await dPage.waitForTimeout(1200)
  }

  // Toggle to Light Theme to verify light mode shader
  const themeBtn = await dPage.$('#theme-btn')
  if (themeBtn) {
    await themeBtn.click()
    await dPage.waitForTimeout(1200)
    
    // Save Light Mode Desktop Screenshot
    const shotLight = path.join(SCREENSHOT_DIR, `${candidate.id}-desktop-light-1440.png`)
    await dPage.screenshot({ path: shotLight })
    const artLight = path.join(ARTIFACT_DIR, `${candidate.id}-desktop-light-1440.png`)
    fs.copyFileSync(shotLight, artLight)
    console.log(`  - Saved desktop light screenshot: ${shotLight}`)

    // Toggle back to dark
    await themeBtn.click()
    await dPage.waitForTimeout(1000)
  }

  // Save Dark Mode Desktop Screenshot
  const shotDark = path.join(SCREENSHOT_DIR, `${candidate.id}-desktop-dark-1440.png`)
  await dPage.screenshot({ path: shotDark })
  const artDark = path.join(ARTIFACT_DIR, `${candidate.id}-desktop-dark-1440.png`)
  fs.copyFileSync(shotDark, artDark)
  console.log(`  - Saved desktop dark screenshot: ${shotDark}`)

  // Measure FPS
  const fps = await dPage.evaluate(() => {
    return new Promise(resolve => {
      let frames = 0
      const start = performance.now()
      function count() {
        frames++
        if (performance.now() - start < 1000) {
          requestAnimationFrame(count)
        } else {
          resolve(Math.round((frames * 1000) / (performance.now() - start)))
        }
      }
      requestAnimationFrame(count)
    })
  })
  console.log(`  - Measured live FPS: ${fps}`)

  const dVideo = dPage.video()
  await dPage.close()
  await desktopContext.close()

  if (dVideo) {
    const rawVidPath = await dVideo.path().catch(() => null)
    if (rawVidPath && fs.existsSync(rawVidPath)) {
      const destVideo = path.join(VIDEO_DIR, `${candidate.id}-desktop-1440.webm`)
      fs.copyFileSync(rawVidPath, destVideo)
      const artVideo = path.join(ARTIFACT_DIR, `${candidate.id}-desktop-1440.webm`)
      fs.copyFileSync(rawVidPath, artVideo)
      console.log(`  - Saved desktop video: ${destVideo}`)
    }
  }

  // 2. Mobile 390x844 (8-10 second recording)
  console.log(`\n[${candidate.id}] 2. Mobile 390x844 capture & video...`)
  const mobileContext = await browser.newContext({
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 390, height: 844 }
    },
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  })

  const mPage = await mobileContext.newPage()
  await mPage.goto(fileUrl, { waitUntil: 'domcontentloaded' })
  await mPage.waitForTimeout(2500)

  // Touch scroll & interaction
  await mPage.touchscreen.tap(200, 300)
  await mPage.waitForTimeout(1000)

  // Save Mobile Dark Screenshot
  const mShotDark = path.join(SCREENSHOT_DIR, `${candidate.id}-mobile-dark-390.png`)
  await mPage.screenshot({ path: mShotDark })
  const mArtDark = path.join(ARTIFACT_DIR, `${candidate.id}-mobile-dark-390.png`)
  fs.copyFileSync(mShotDark, mArtDark)
  console.log(`  - Saved mobile dark screenshot: ${mShotDark}`)

  // Toggle theme on mobile
  const mThemeBtn = await mPage.$('#theme-btn')
  if (mThemeBtn) {
    await mThemeBtn.click()
    await mPage.waitForTimeout(1200)

    const mShotLight = path.join(SCREENSHOT_DIR, `${candidate.id}-mobile-light-390.png`)
    await mPage.screenshot({ path: mShotLight })
    const mArtLight = path.join(ARTIFACT_DIR, `${candidate.id}-mobile-light-390.png`)
    fs.copyFileSync(mShotLight, mArtLight)
    console.log(`  - Saved mobile light screenshot: ${mShotLight}`)

    await mThemeBtn.click()
    await mPage.waitForTimeout(1500)
  }

  const mVideo = mPage.video()
  await mPage.close()
  await mobileContext.close()

  if (mVideo) {
    const rawMVidPath = await mVideo.path().catch(() => null)
    if (rawMVidPath && fs.existsSync(rawMVidPath)) {
      const destMVideo = path.join(VIDEO_DIR, `${candidate.id}-mobile-390.webm`)
      fs.copyFileSync(rawMVidPath, destMVideo)
      const artMVideo = path.join(ARTIFACT_DIR, `${candidate.id}-mobile-390.webm`)
      fs.copyFileSync(rawMVidPath, artMVideo)
      console.log(`  - Saved mobile video: ${destMVideo}`)
    }
  }

  return { fps, consoleErrors }
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const results = {}

  for (const cand of candidates) {
    results[cand.id] = await recordCandidate(browser, cand)
  }

  await browser.close()
  console.log('\n======================================================')
  console.log('RECORDING & BENCHMARK COMPLETE')
  console.log(JSON.stringify(results, null, 2))
  console.log('======================================================')
}

run().catch(err => {
  console.error('Recording error:', err)
  process.exit(1)
})
