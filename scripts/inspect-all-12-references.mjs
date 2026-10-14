import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACT_DIR = 'C:/Users/smara/.gemini/antigravity/brain/3350c4d9-6ea0-45ca-aac9-280e00b5e1cf'
const SCREENSHOT_DIR = path.resolve('docs/references/screenshots')
const VIDEO_DIR = path.resolve('docs/references/videos')
const DATA_DIR = path.resolve('docs/references/data')

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
fs.mkdirSync(VIDEO_DIR, { recursive: true })
fs.mkdirSync(DATA_DIR, { recursive: true })

const REFERENCES = [
  {
    id: 'skiper-ui',
    name: 'Skiper UI Component Gallery',
    url: 'https://skiper-ui.com/',
    type: 'gallery',
    expectedTech: 'CSS / React / Tailwind'
  },
  {
    id: 'hero-dithering-card',
    name: 'Hero Dithering Card',
    url: 'https://21st.dev/@moazamtrade/components/hero-dithering-card',
    type: 'hero-background',
    expectedTech: 'Canvas / Dithering Shader'
  },
  {
    id: 'animated-shader-hero',
    name: 'Animated Shader Hero',
    url: 'https://21st.dev/@ravikatiyar162/components/animated-shader-hero',
    type: 'hero-background',
    expectedTech: 'WebGL / Fragment Shader'
  },
  {
    id: 'prisma-hero',
    name: 'Prisma Hero',
    url: 'https://21st.dev/@rahil1202/components/prisma-hero',
    type: 'hero-background',
    expectedTech: 'WebGL / Three.js / Canvas'
  },
  {
    id: 'liquid-sculpture-hero',
    name: 'Liquid Sculpture Hero',
    url: 'https://docs.21st.dev/community/components?preview=%2F%40gughigug%2Fcomponents%2Fliquid-sculpture-hero',
    type: 'hero-background',
    expectedTech: 'WebGL / Three.js / Shader'
  },
  {
    id: 'pixel-text-fill',
    name: 'Pixel Text Fill',
    url: 'https://docs.21st.dev/@hyperiux/components/pixel-text-fill',
    type: 'typography',
    expectedTech: 'Canvas / CSS Grid / SVG'
  },
  {
    id: 'shimmering-text',
    name: 'Shimmering Text',
    url: 'https://docs.21st.dev/community/components/s/text?preview=%2F%40ElevenLabs%2Fcomponents%2Fshimmering-text',
    type: 'typography',
    expectedTech: 'CSS Mask / Keyframe Gradient'
  },
  {
    id: 'liquid-metal-button',
    name: 'Liquid Metal Button',
    url: 'https://docs.21st.dev/community/components?q=buttons&preview=%2F%40johuniq%2Fcomponents%2Fliquid-metal-button',
    type: 'button',
    expectedTech: 'WebGL / SVG Displacement / CSS'
  },
  {
    id: 'fancy-todo-checkbox',
    name: 'Fancy Todo Checkbox',
    url: 'https://docs.21st.dev/@originui/components/checkbox/fancy-todo-checkbox',
    type: 'control',
    expectedTech: 'CSS / SVG Checkbox'
  },
  {
    id: 'interactive-hover-button',
    name: 'Interactive Hover Button',
    url: 'https://docs.21st.dev/@dillionverma/components/interactive-hover-button',
    type: 'button',
    expectedTech: 'CSS / Tailwind / Translate'
  },
  {
    id: 'agentic-factory-3d',
    name: 'Agentic Factory 3D',
    url: 'https://docs.21st.dev/community/components?q=interactions&preview=%2F%40eugeneshilow%2Fcomponents%2Fagentic-factory-3d',
    type: 'interaction',
    expectedTech: 'Three.js / Canvas 3D'
  },
  {
    id: 'folder-interaction',
    name: 'Folder Interaction',
    url: 'https://docs.21st.dev/community/components?q=interactions&preview=%2F%400xUrvish%2Fcomponents%2Ffolder-interaction',
    type: 'interaction',
    expectedTech: 'Framer Motion / CSS 3D Transform'
  }
]

async function inspectReference(browser, ref) {
  console.log(`\n==================================================`)
  console.log(`[${ref.id}] ${ref.name}`)
  console.log(`URL: ${ref.url}`)
  console.log(`==================================================`)

  const context = await browser.newContext({
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1280, height: 720 }
    },
    viewport: { width: 1280, height: 720 }
  })
  
  const page = await context.newPage()
  
  let resultData = {
    id: ref.id,
    name: ref.name,
    url: ref.url,
    category: ref.type,
    timestamp: new Date().toISOString(),
    status: 200,
    technique: 'UNKNOWN',
    iframeUrl: null,
    iframeHtmlLength: 0,
    canvasCount: 0,
    hasWebGL: false,
    hasThreeJs: false,
    hasSvgAnimation: false,
    hasCssAnimation: false,
    fontFamilies: [],
    colors: [],
    transitions: [],
    extractedClasses: [],
    previewHtmlSample: null,
    videoPath: null,
    notes: ''
  }

  try {
    const res = await page.goto(ref.url, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => {
      console.log(`[${ref.id}] Goto note: ${e.message}`)
      return null
    })
    resultData.status = res ? res.status() : 200
    
    // Wait for content & iframes to mount
    await page.waitForTimeout(3000)

    // Capture resting screenshot at 1280x720
    const restScreenshotPath = path.join(SCREENSHOT_DIR, `${ref.id}-rest.png`)
    await page.screenshot({ path: restScreenshotPath })
    console.log(`[${ref.id}] Saved rest screenshot: ${restScreenshotPath}`)

    // Inspect iframes
    const frames = page.frames()
    let targetFrame = page
    for (const frame of frames) {
      const fUrl = frame.url()
      if (fUrl.includes('cdn.21st.dev') || fUrl.includes('bundle') || (fUrl !== ref.url && fUrl !== 'about:blank')) {
        targetFrame = frame
        resultData.iframeUrl = fUrl
        console.log(`[${ref.id}] Found candidate frame: ${fUrl}`)
        break
      }
    }

    // Inspect inside target frame or page
    const frameAnalysis = await targetFrame.evaluate(() => {
      const canvases = Array.from(document.querySelectorAll('canvas'))
      let webgl = false
      canvases.forEach(c => {
        try {
          if (c.getContext('webgl') || c.getContext('webgl2') || c.getContext('experimental-webgl')) {
            webgl = true
          }
        } catch (_) {}
      })
      
      const svgs = Array.from(document.querySelectorAll('svg'))
      const buttons = Array.from(document.querySelectorAll('button'))
      const inputs = Array.from(document.querySelectorAll('input'))
      
      // Look for scripts and Three.js
      const html = document.documentElement.outerHTML
      const hasThree = html.includes('THREE') || html.includes('three.module') || html.includes('three') || html.includes('threejs')
      
      // Look for styles, fonts, and transitions
      const allElements = Array.from(document.querySelectorAll('*'))
      const fonts = new Set()
      const colors = new Set()
      const transitions = new Set()
      const classes = new Set()
      
      allElements.slice(0, 100).forEach(el => {
        try {
          if (el.className && typeof el.className === 'string') {
            el.className.split(' ').forEach(cls => {
              if (cls && (cls.includes('transition') || cls.includes('animate') || cls.includes('duration') || cls.includes('ease') || cls.includes('hover:') || cls.includes('scale') || cls.includes('translate'))) {
                classes.add(cls)
              }
            })
          }
          const s = window.getComputedStyle(el)
          if (s.fontFamily) fonts.add(s.fontFamily)
          if (s.color) colors.add(s.color)
          if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(s.backgroundColor)
          if (s.transition && s.transition !== 'all 0s ease 0s' && s.transition !== 'none') transitions.add(s.transition)
        } catch (_) {}
      })

      return {
        canvasCount: canvases.length,
        hasWebGL: webgl,
        hasThreeJs: hasThree,
        svgCount: svgs.length,
        buttonCount: buttons.length,
        inputCount: inputs.length,
        fonts: Array.from(fonts).slice(0, 5),
        colors: Array.from(colors).slice(0, 10),
        transitions: Array.from(transitions).slice(0, 5),
        classes: Array.from(classes).slice(0, 20),
        bodySnippet: document.body ? document.body.innerHTML.slice(0, 1500) : '',
        htmlLength: html.length
      }
    }).catch(e => ({ error: e.message }))

    if (!frameAnalysis.error) {
      resultData.canvasCount = frameAnalysis.canvasCount
      resultData.hasWebGL = frameAnalysis.hasWebGL
      resultData.hasThreeJs = frameAnalysis.hasThreeJs
      resultData.fontFamilies = frameAnalysis.fonts
      resultData.colors = frameAnalysis.colors
      resultData.transitions = frameAnalysis.transitions
      resultData.extractedClasses = frameAnalysis.classes
      resultData.previewHtmlSample = frameAnalysis.bodySnippet
      resultData.iframeHtmlLength = frameAnalysis.htmlLength
      
      if (frameAnalysis.hasWebGL) {
        resultData.technique = 'WebGL Shader / 3D Canvas'
      } else if (frameAnalysis.canvasCount > 0) {
        resultData.technique = 'HTML5 2D Canvas'
      } else if (frameAnalysis.svgCount > 0 && frameAnalysis.transitions.length > 0) {
        resultData.technique = 'SVG + CSS Transitions'
      } else {
        resultData.technique = 'CSS / Tailwind Animations'
      }
    }

    // Perform interactive gestures (hover, mouse movement, click) with short timeouts
    console.log(`[${ref.id}] Performing interactions...`)
    await page.mouse.move(300, 300)
    await page.waitForTimeout(400)
    await page.mouse.move(640, 360)
    await page.waitForTimeout(600)
    await page.mouse.move(700, 400)
    await page.waitForTimeout(600)

    try {
      const interactiveEl = await targetFrame.$('button, input[type="checkbox"], [role="button"], canvas, a, .group')
      if (interactiveEl) {
        await interactiveEl.hover({ timeout: 1500 }).catch(() => {})
        await page.waitForTimeout(1000)
        
        // Active screenshot
        const activeScreenshotPath = path.join(SCREENSHOT_DIR, `${ref.id}-active.png`)
        await page.screenshot({ path: activeScreenshotPath })
        console.log(`[${ref.id}] Saved active screenshot: ${activeScreenshotPath}`)
        
        await interactiveEl.click({ timeout: 1500 }).catch(() => {})
        await page.waitForTimeout(1000)
      } else {
        const activeScreenshotPath = path.join(SCREENSHOT_DIR, `${ref.id}-active.png`)
        await page.screenshot({ path: activeScreenshotPath })
      }
    } catch (e) {
      console.log(`[${ref.id}] Interactive gesture note:`, e.message)
    }

    // Mobile viewport test (390x844)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(1000)
    const mobileScreenshotPath = path.join(SCREENSHOT_DIR, `${ref.id}-mobile.png`)
    await page.screenshot({ path: mobileScreenshotPath })
    console.log(`[${ref.id}] Saved mobile screenshot: ${mobileScreenshotPath}`)

  } catch (err) {
    console.error(`[${ref.id}] Error during inspection:`, err.message)
    resultData.status = 'ERROR'
    resultData.notes = err.message
  } finally {
    const videoObj = page.video()
    await page.close()
    await context.close()
    
    if (videoObj) {
      const originalVideoPath = await videoObj.path().catch(() => null)
      if (originalVideoPath && fs.existsSync(originalVideoPath)) {
        const destVideoPath = path.join(VIDEO_DIR, `${ref.id}.webm`)
        try {
          fs.copyFileSync(originalVideoPath, destVideoPath)
          console.log(`[${ref.id}] Saved video: ${destVideoPath}`)
          resultData.videoPath = destVideoPath
        } catch (e) {
          console.log(`[${ref.id}] Video copy error:`, e.message)
        }
      }
    }
    
    const dataFilePath = path.join(DATA_DIR, `${ref.id}.json`)
    fs.writeFileSync(dataFilePath, JSON.stringify(resultData, null, 2))
    console.log(`[${ref.id}] Saved inspection data: ${dataFilePath}`)
  }
}

async function runAll() {
  console.log(`Starting Reference Inspection Suite for ${REFERENCES.length} references...`)
  const browser = await chromium.launch({ headless: true })
  
  for (const ref of REFERENCES) {
    await inspectReference(browser, ref)
  }
  
  await browser.close()
  
  // Mirror screenshots and videos to brain artifact directory
  console.log(`\nMirroring reference artifacts to Brain directory: ${ARTIFACT_DIR}`)
  const sFiles = fs.readdirSync(SCREENSHOT_DIR)
  for (const f of sFiles) {
    fs.copyFileSync(path.join(SCREENSHOT_DIR, f), path.join(ARTIFACT_DIR, f))
  }
  const vFiles = fs.readdirSync(VIDEO_DIR)
  for (const f of vFiles) {
    fs.copyFileSync(path.join(VIDEO_DIR, f), path.join(ARTIFACT_DIR, f))
  }
  
  console.log(`Successfully inspected all ${REFERENCES.length} references!`)
}

runAll().catch(e => {
  console.error('Fatal error in inspection suite:', e)
  process.exit(1)
})
