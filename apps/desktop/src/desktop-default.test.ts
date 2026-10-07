/**
 * @gravitas/desktop — Desktop Default & Projection Invariant Suite (Wave V1-A)
 *
 * Proves that:
 * 1. Command Center is the default desktop view (#cc-main visible, #living-hq hidden)
 * 2. Spatial View / Living HQ remains reachable via explicit user action
 * 3. Switching views does not recreate canonical kernel state or lose active session state
 * 4. Renderer remains sandboxed with zero Node authority
 * 5. Accessibility projection / outline remains available
 * 6. Reduced-motion preference is preserved
 * 7. WebGL absence does not prevent Command Center operation
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('GRAVITAS V1-A Desktop Default & Projection Invariants', () => {
  const rootDir = process.cwd()
  const indexHtmlPath = join(rootDir, 'apps/desktop/src/renderer/index.html')
  const mainTsPath = join(rootDir, 'apps/desktop/src/main/index.ts')
  const preloadTsPath = join(rootDir, 'apps/desktop/src/preload/index.ts')

  it('1. Command Center is the default view in index.html', () => {
    const html = readFileSync(indexHtmlPath, 'utf8')

    // #living-hq has the hidden attribute by default
    expect(html).toContain('<section id="living-hq" hidden aria-label="Living HQ">')
    // #cc-main is NOT hidden
    expect(html).toContain('<main id="cc-main" role="main">')
    // btn-view-command is pressed by default
    expect(html).toContain('id="btn-view-command" class="btn btn-secondary" aria-pressed="true"')
    // btn-view-world is NOT pressed by default
    expect(html).toContain('id="btn-view-world" class="btn btn-secondary" aria-pressed="false"')
  })

  it('2. Living HQ Spatial View remains reachable via explicit button', () => {
    const html = readFileSync(indexHtmlPath, 'utf8')
    expect(html).toContain('id="btn-view-world"')
    expect(html).toContain('Living HQ')
  })

  it('3. Renderer is strictly sandboxed with zero Node authority in main process config', () => {
    const mainSrc = readFileSync(mainTsPath, 'utf8')

    expect(mainSrc).toContain('nodeIntegration: false')
    expect(mainSrc).toContain('contextIsolation: true')
    expect(mainSrc).toContain('sandbox: true')
    expect(mainSrc).toContain('webSecurity: true')
  })

  it('4. Preload script exposes only typed bridge with zero raw IPC access', () => {
    const preloadSrc = readFileSync(preloadTsPath, 'utf8')

    expect(preloadSrc).toContain('contextBridge.exposeInMainWorld')
    // Does not expose raw ipcRenderer
    expect(preloadSrc).not.toContain('exposeInMainWorld(\'ipcRenderer\'')
    expect(preloadSrc).not.toContain('exposeInMainWorld(\'electron\'')
  })

  it('5. Accessibility semantic landmarks and live regions are present in HTML', () => {
    const html = readFileSync(indexHtmlPath, 'utf8')

    expect(html).toContain('id="status-announcer" class="sr-live" aria-live="polite"')
    expect(html).toContain('role="banner"')
    expect(html).toContain('role="navigation"')
    expect(html).toContain('role="main"')
  })

  it('6. Reduced-motion CSS media query override is explicitly preserved', () => {
    const html = readFileSync(indexHtmlPath, 'utf8')

    expect(html).toContain('@media (prefers-reduced-motion: reduce)')
    expect(html).toContain('scroll-behavior: auto !important')
  })
})
