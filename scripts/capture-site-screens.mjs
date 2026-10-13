import { chromium } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const SCREENSHOT_DIR = path.resolve('docs/website/screenshots')
const ARTIFACT_DIR = 'C:/Users/smara/.gemini/antigravity/brain/3350c4d9-6ea0-45ca-aac9-280e00b5e1cf'

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function runCapture() {
  console.log('Launching headless Chromium for website capture...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const sitePath = 'file://' + path.resolve('site/index.html').replace(/\\/g, '/')
  console.log('Navigating to:', sitePath)
  await page.goto(sitePath, { waitUntil: 'load' })
  await page.waitForTimeout(1000)

  // 1. Desktop Dark Full Page (1440x900)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.evaluate(() => {
    document.body.classList.remove('light-theme')
  })
  await page.waitForTimeout(600)
  const p1 = path.join(SCREENSHOT_DIR, '01-site-desktop-dark-1440.png')
  await page.screenshot({ path: p1, fullPage: true })
  console.log('Captured:', p1)

  // 2. Desktop Dark First Viewport (1440x900)
  const p1Hero = path.join(SCREENSHOT_DIR, '01-site-desktop-dark-hero.png')
  await page.screenshot({ path: p1Hero })
  console.log('Captured:', p1Hero)

  // 3. Desktop Light Full Page (1440x900)
  await page.evaluate(() => {
    document.body.classList.add('light-theme')
  })
  await page.waitForTimeout(600)
  const p2 = path.join(SCREENSHOT_DIR, '02-site-desktop-light-1440.png')
  await page.screenshot({ path: p2, fullPage: true })
  console.log('Captured:', p2)

  // 4. Desktop Light First Viewport (1440x900)
  const p2Hero = path.join(SCREENSHOT_DIR, '02-site-desktop-light-hero.png')
  await page.screenshot({ path: p2Hero })
  console.log('Captured:', p2Hero)

  // 5. Tablet Dark Viewport (768x1024)
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.evaluate(() => {
    document.body.classList.remove('light-theme')
  })
  await page.waitForTimeout(600)
  const p3 = path.join(SCREENSHOT_DIR, '03-site-tablet-dark-768.png')
  await page.screenshot({ path: p3, fullPage: true })
  console.log('Captured:', p3)

  // 6. Mobile Dark Viewport (390x844 - iPhone 14/15 size)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(600)
  const p4 = path.join(SCREENSHOT_DIR, '04-site-mobile-dark-390.png')
  await page.screenshot({ path: p4, fullPage: true })
  console.log('Captured:', p4)

  // 7. Mobile Light Viewport (390x844)
  await page.evaluate(() => {
    document.body.classList.add('light-theme')
  })
  await page.waitForTimeout(600)
  const p5 = path.join(SCREENSHOT_DIR, '05-site-mobile-light-390.png')
  await page.screenshot({ path: p5, fullPage: true })
  console.log('Captured:', p5)

  await browser.close()

  // Copy captured images to brain artifact directory for display
  if (fs.existsSync(ARTIFACT_DIR)) {
    const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'))
    for (const f of files) {
      fs.copyFileSync(path.join(SCREENSHOT_DIR, f), path.join(ARTIFACT_DIR, f))
    }
    console.log(`Copied ${files.length} screenshots to artifact directory.`)
  }
}

runCapture().catch(e => {
  console.error(e)
  process.exit(1)
})
