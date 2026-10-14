import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACT_DIR = 'C:/Users/smara/.gemini/antigravity/brain/3350c4d9-6ea0-45ca-aac9-280e00b5e1cf'
const SCREENSHOT_DIR = path.resolve('docs/website/screenshots')
const VIDEO_DIR = path.resolve('docs/website')
const VIDEO_SUBDIR = path.resolve('docs/website/videos')

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
fs.mkdirSync(VIDEO_DIR, { recursive: true })
fs.mkdirSync(VIDEO_SUBDIR, { recursive: true })

async function runVisualAcceptance() {
  console.log('=== STARTING REFERENCE-DRIVEN VISUAL ACCEPTANCE SUITE (V2.1) ===')
  const browser = await chromium.launch({ headless: true })
  const siteUrl = 'file://' + path.resolve('site/index.html').replace(/\\/g, '/')

  // ─── 1. RECORD DEDICATED 20-SECOND HERO SCULPTURE VIDEO ───────────────
  console.log('\n[PHASE 1] Recording 20-second hero sculpture motion video (Dark + Light)...')
  const heroVideoContext = await browser.newContext({
    recordVideo: {
      dir: VIDEO_SUBDIR,
      size: { width: 1440, height: 900 }
    },
    viewport: { width: 1440, height: 900 }
  })
  const heroPage = await heroVideoContext.newPage()
  await heroPage.goto(siteUrl, { waitUntil: 'domcontentloaded' })
  await heroPage.waitForTimeout(2000)

  // Part A: Dark Mode Motion & Pointer Response (0-10s)
  console.log('  - Hero Dark Mode: subtle pointer inertia across dark titanium monolith...')
  await heroPage.mouse.move(900, 400)
  await heroPage.waitForTimeout(1500)
  await heroPage.mouse.move(1150, 320)
  await heroPage.waitForTimeout(2000)
  await heroPage.mouse.move(1280, 520)
  await heroPage.waitForTimeout(2000)
  await heroPage.mouse.move(720, 450)
  await heroPage.waitForTimeout(2500)

  // Part B: Toggle to Tactile Light Mode (10s)
  console.log('  - Toggling theme to Brushed Titanium Light Mode...')
  await heroPage.evaluate(() => document.getElementById('theme-toggle-btn').click())
  await heroPage.waitForTimeout(1500)

  // Part C: Light Mode Motion (10-20s)
  console.log('  - Hero Light Mode: architectural platinum shading with directional shadows...')
  await heroPage.mouse.move(1100, 380)
  await heroPage.waitForTimeout(2500)
  await heroPage.mouse.move(1220, 480)
  await heroPage.waitForTimeout(2500)
  await heroPage.mouse.move(980, 420)
  await heroPage.waitForTimeout(3000)

  const heroVideoObj = heroPage.video()
  await heroPage.close()
  await heroVideoContext.close()

  let finalHeroVideoPath = null
  if (heroVideoObj) {
    const origHeroVideo = await heroVideoObj.path().catch(() => null)
    if (origHeroVideo && fs.existsSync(origHeroVideo)) {
      finalHeroVideoPath = path.join(VIDEO_SUBDIR, 'hero-sculpture-20s.webm')
      const rootHeroVideoPath = path.join(VIDEO_DIR, 'hero-sculpture-20s.webm')
      fs.copyFileSync(origHeroVideo, finalHeroVideoPath)
      fs.copyFileSync(origHeroVideo, rootHeroVideoPath)
      console.log(`[PASS] 20-second Hero video saved: ${finalHeroVideoPath}`)
    }
  }

  // ─── 2. RECORD 30-60 SECOND COMPREHENSIVE WALKTHROUGH VIDEO ──────────
  console.log('\n[PHASE 2] Recording 30-60 second interactive walkthrough video...')
  const videoContext = await browser.newContext({
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1440, height: 900 }
    },
    viewport: { width: 1440, height: 900 }
  })

  const vPage = await videoContext.newPage()
  
  // Track external requests
  const externalRequests = []
  vPage.on('request', req => {
    const url = req.url()
    if (!url.startsWith('file://') && !url.startsWith('data:')) {
      externalRequests.push(url)
    }
  })

  // Track console errors
  const consoleErrors = []
  vPage.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await vPage.goto(siteUrl, { waitUntil: 'domcontentloaded' })
  await vPage.waitForTimeout(2000) // Watch hero sculpture breathe

  // 1. Hero background & CTA Hover
  console.log('  - Moving mouse across hero architectural monolith...')
  await vPage.mouse.move(720, 450)
  await vPage.waitForTimeout(800)
  await vPage.mouse.move(1050, 350)
  await vPage.waitForTimeout(1000)
  await vPage.mouse.move(1180, 500)
  await vPage.waitForTimeout(1000)

  // Primary Liquid Metal CTA Hover
  console.log('  - Hovering Primary Liquid Metal Button ("View Desktop Preview")...')
  const heroPrimary = await vPage.$('#hero-primary-cta')
  if (heroPrimary) {
    await heroPrimary.hover()
    await vPage.waitForTimeout(1200)
  }

  // Secondary Interactive Hover Button Hover
  console.log('  - Hovering Secondary Interactive Hover Button...')
  const heroSecondary = await vPage.$('#hero-secondary-cta')
  if (heroSecondary) {
    await heroSecondary.hover()
    await vPage.waitForTimeout(1200)
  }

  // 2. Smooth Scroll to Product Showcase
  console.log('  - Scrolling to Authentic Product Showcase...')
  await vPage.evaluate(() => document.getElementById('product').scrollIntoView({ behavior: 'smooth' }))
  await vPage.waitForTimeout(1500)

  // Switch Gallery Slides
  console.log('  - Cycling Authentic Screenshot Gallery...')
  const nextGalleryBtn = await vPage.$('#btn-gallery-next')
  if (nextGalleryBtn) {
    await nextGalleryBtn.click()
    await vPage.waitForTimeout(1200)
    await nextGalleryBtn.click()
    await vPage.waitForTimeout(1200)
  }

  // 3. Smooth Scroll to Study Guardian 3D Folder Intake
  console.log('  - Scrolling to Study Guardian Folder Interaction...')
  await vPage.evaluate(() => document.getElementById('study-guardian').scrollIntoView({ behavior: 'smooth' }))
  await vPage.waitForTimeout(1500)

  // Trigger 3D Folder Intake
  console.log('  - Triggering 3D folder flap open & sample file intake...')
  const folder = await vPage.$('#interactive-folder')
  if (folder) {
    await folder.hover()
    await vPage.waitForTimeout(800)
    await folder.click()
    await vPage.waitForTimeout(1200)
  }

  // Switch to Sample 3: CSE 2195 Data Science
  console.log('  - Switching to verified course sample CSE 2195 Data Science...')
  const sample3Btn = await vPage.$('button[data-sample="datascience"]')
  if (sample3Btn) {
    await sample3Btn.click()
    await vPage.waitForTimeout(1200)
  }

  // Click Simulate Approval Barrier
  console.log('  - Testing Simulate Approval barrier...')
  const approveBtn = await vPage.$('#btn-approve-mutation')
  if (approveBtn) {
    await approveBtn.click()
    await vPage.waitForTimeout(1200)
  }

  // 4. Smooth Scroll to Knowledge Hub & Tasks
  console.log('  - Scrolling to Knowledge Hub & Fancy Todo Checkboxes...')
  await vPage.evaluate(() => document.getElementById('knowledge-hub').scrollIntoView({ behavior: 'smooth' }))
  await vPage.waitForTimeout(1500)

  // Toggle Fancy Checkboxes
  console.log('  - Checking Fancy Checkboxes (toggling task completion)...')
  const task1 = await vPage.$('.task-item[data-task-id="t1"]')
  const task3 = await vPage.$('.task-item[data-task-id="t3"]')
  if (task1) {
    await task1.click()
    await vPage.waitForTimeout(800)
  }
  if (task3) {
    await task3.click()
    await vPage.waitForTimeout(1000)
  }

  // 5. Smooth Scroll to Companion HUD
  console.log('  - Scrolling to Companion Voice PTT HUD...')
  await vPage.evaluate(() => document.getElementById('companion').scrollIntoView({ behavior: 'smooth' }))
  await vPage.waitForTimeout(1500)

  // Hold Voice PTT
  console.log('  - Simulating Push-To-Talk voice dictation & waveform...')
  const pttBtn = await vPage.$('#btn-ptt-trigger')
  if (pttBtn) {
    await vPage.mouse.move(250, 500)
    await vPage.evaluate(() => {
      document.getElementById('btn-ptt-trigger').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    await vPage.waitForTimeout(2000)
    await vPage.evaluate(() => {
      document.getElementById('btn-ptt-trigger').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })
    await vPage.waitForTimeout(1200)
  }

  // 6. Smooth Scroll to Sovereignty & Final CTA
  console.log('  - Scrolling to Sovereignty Matrix & Final CTA...')
  await vPage.evaluate(() => document.getElementById('sovereignty').scrollIntoView({ behavior: 'smooth' }))
  await vPage.waitForTimeout(1500)

  // 7. Theme Toggle: Dark to Tactile Parchment Light
  console.log('  - Toggling architectural theme to Tactile Parchment Light...')
  await vPage.evaluate(() => document.getElementById('theme-toggle-btn').click())
  await vPage.waitForTimeout(1800)

  // Scroll back to top to show Parchment Light Hero
  await vPage.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await vPage.waitForTimeout(2000)

  // Close video context to finalize webm
  const videoObj = vPage.video()
  await vPage.close()
  await videoContext.close()

  let finalWalkthroughPath = null
  if (videoObj) {
    const origVideo = await videoObj.path().catch(() => null)
    if (origVideo && fs.existsSync(origVideo)) {
      finalWalkthroughPath = path.join(VIDEO_DIR, 'walkthrough-video.webm')
      const v2WalkthroughPath = path.join(VIDEO_DIR, 'walkthrough-v2.webm')
      fs.copyFileSync(origVideo, finalWalkthroughPath)
      fs.copyFileSync(origVideo, v2WalkthroughPath)
      console.log(`[PASS] Final walkthrough video saved: ${finalWalkthroughPath} and ${v2WalkthroughPath}`)
    }
  }

  // ─── 3. VIEWPORT RESPONSIVE SCREENSHOTS & OVERFLOW CHECKS ────────────
  console.log('\n[PHASE 3] Capturing responsive viewports & verifying zero overflow...')
  const viewports = [
    { name: 'desktop-dark-1440', legacyName: '01-site-desktop-dark-1440', width: 1440, height: 900, light: false, isHeroOnly: false },
    { name: '01-site-desktop-dark-hero', legacyName: null, width: 1440, height: 900, light: false, isHeroOnly: true },
    { name: 'desktop-light-1440', legacyName: '02-site-desktop-light-1440', width: 1440, height: 900, light: true, isHeroOnly: false },
    { name: '02-site-desktop-light-hero', legacyName: null, width: 1440, height: 900, light: true, isHeroOnly: true },
    { name: 'tablet-dark-768', legacyName: '03-site-tablet-dark-768', width: 768, height: 1024, light: false, isHeroOnly: false },
    { name: 'mobile-dark-390', legacyName: '04-site-mobile-dark-390', width: 390, height: 844, light: false, isHeroOnly: false },
    { name: '04-site-mobile-dark-hero', legacyName: null, width: 390, height: 844, light: false, isHeroOnly: true },
    { name: 'mobile-light-390', legacyName: '05-site-mobile-light-390', width: 390, height: 844, light: true, isHeroOnly: false },
    { name: '05-site-mobile-light-hero', legacyName: null, width: 390, height: 844, light: true, isHeroOnly: true }
  ]

  const overflowResults = []

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
    await page.goto(siteUrl, { waitUntil: 'domcontentloaded' })
    if (vp.light) {
      await page.evaluate(() => document.body.classList.add('light-theme'))
    } else {
      await page.evaluate(() => document.body.classList.remove('light-theme'))
    }
    await page.waitForTimeout(1000)

    if (!vp.isHeroOnly) {
      // Check horizontal overflow
      const overflowCheck = await page.evaluate(() => {
        const scrollW = document.documentElement.scrollWidth
        const innerW = window.innerWidth
        return { scrollW, innerW, hasOverflow: scrollW > innerW }
      })
      overflowResults.push({ ...vp, ...overflowCheck })
      console.log(`  [${vp.name}] ${vp.width}px: scrollWidth=${overflowCheck.scrollW}px (Overflow: ${overflowCheck.hasOverflow ? 'FAIL' : 'PASS'})`)
    }

    const shotPath = path.join(SCREENSHOT_DIR, `${vp.name}.png`)
    await page.screenshot({ path: shotPath, fullPage: !vp.isHeroOnly })
    console.log(`  Captured screenshot: ${shotPath}`)

    if (vp.legacyName) {
      const legPath = path.join(SCREENSHOT_DIR, `${vp.legacyName}.png`)
      fs.copyFileSync(shotPath, legPath)
    }

    await page.close()
  }

  // ─── 4. FOCUSED STATE CAPTURES (HOVER, FOLDER ACTIVE, CHECKBOXES) ─────
  console.log('\n[PHASE 4] Capturing focused interaction states...')
  const statePage = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await statePage.goto(siteUrl, { waitUntil: 'domcontentloaded' })
  await statePage.waitForTimeout(1000)

  // 4A. Primary & Secondary CTA Hover State
  await statePage.hover('#hero-primary-cta')
  const ctaShot = path.join(SCREENSHOT_DIR, 'state-hover-cta.png')
  await statePage.screenshot({ path: ctaShot })
  console.log(`  Captured CTA hover state: ${ctaShot}`)

  // 4B. Active 3D Folder State
  await statePage.evaluate(() => {
    document.getElementById('study-guardian').scrollIntoView()
    document.getElementById('interactive-folder').classList.add('active-intake')
  })
  await statePage.waitForTimeout(800)
  const folderShot = path.join(SCREENSHOT_DIR, 'state-folder-active.png')
  await statePage.screenshot({ path: folderShot })
  console.log(`  Captured active folder state: ${folderShot}`)

  // 4C. Fancy Todo Checkbox Completed State
  await statePage.evaluate(() => {
    document.getElementById('knowledge-hub').scrollIntoView()
    document.querySelectorAll('.task-item').forEach(t => t.classList.add('checked'))
    document.getElementById('completed-count').textContent = '4'
    document.getElementById('progress-fill').style.width = '100%'
  })
  await statePage.waitForTimeout(800)
  const taskShot = path.join(SCREENSHOT_DIR, 'state-tasks-completed.png')
  await statePage.screenshot({ path: taskShot })
  console.log(`  Captured completed tasks state: ${taskShot}`)

  // 4D. Reduced Motion State
  const rmContext = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 900 }
  })
  const rmPage = await rmContext.newPage()
  await rmPage.goto(siteUrl, { waitUntil: 'domcontentloaded' })
  await rmPage.waitForTimeout(1000)
  const rmShot = path.join(SCREENSHOT_DIR, 'state-reduced-motion.png')
  await rmPage.screenshot({ path: rmShot })
  console.log(`  Captured reduced motion state: ${rmShot}`)
  await rmContext.close()

  await statePage.close()
  await browser.close()

  // ─── 5. MIRROR ALL ARTIFACTS TO BRAIN ARTIFACT FOLDER ────────────────
  console.log(`\nMirroring all verification assets to Brain directory: ${ARTIFACT_DIR}`)
  const sFiles = fs.readdirSync(SCREENSHOT_DIR)
  for (const f of sFiles) {
    fs.copyFileSync(path.join(SCREENSHOT_DIR, f), path.join(ARTIFACT_DIR, f))
  }
  if (finalWalkthroughPath && fs.existsSync(finalWalkthroughPath)) {
    fs.copyFileSync(finalWalkthroughPath, path.join(ARTIFACT_DIR, 'walkthrough-video.webm'))
    fs.copyFileSync(finalWalkthroughPath, path.join(ARTIFACT_DIR, 'walkthrough-v2.webm'))
  }
  if (finalHeroVideoPath && fs.existsSync(finalHeroVideoPath)) {
    fs.copyFileSync(finalHeroVideoPath, path.join(ARTIFACT_DIR, 'hero-sculpture-20s.webm'))
  }
  console.log('Mirrored all fresh screenshots and videos to Brain directory.')

  // ─── 6. SUMMARY OF QUALITY GATES ─────────────────────────────────────
  console.log('\n==================================================')
  console.log('VISUAL ACCEPTANCE & QUALITY GATE SUMMARY:')
  console.log(`- External runtime requests: ${externalRequests.length} (PASS: ${externalRequests.length === 0})`)
  console.log(`- Console errors: ${consoleErrors.length} (PASS: ${consoleErrors.length === 0})`)
  const hasAnyOverflow = overflowResults.some(r => r.hasOverflow)
  console.log(`- Responsive horizontal overflow: ${hasAnyOverflow ? 'FAIL' : 'PASS (0px on all viewports)'}`)
  console.log(`- 20-second Hero video generated: ${finalHeroVideoPath ? 'YES' : 'NO'}`)
  console.log(`- Walkthrough video generated: ${finalWalkthroughPath ? 'YES' : 'NO'}`)
  console.log('==================================================\n')
}

runVisualAcceptance().catch(e => {
  console.error('Acceptance suite failed:', e)
  process.exit(1)
})
