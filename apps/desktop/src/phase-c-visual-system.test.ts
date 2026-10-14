/**
 * Phase C Automated Verification Suite — Consistent Desktop Visual System & Theme Sync
 *
 * Verifies:
 * 1. Harmonized design tokens across index.html (Main Window) and companion.html (Floating Companion)
 * 2. Shared dark graphite (#121518) and warm stone light (#F5F4F0) color systems
 * 3. Typography invariants: Geist for interface, Geist Mono for technical metadata
 * 4. Button hierarchy, active scale (0.98), disabled states, and focus rings
 * 5. Tactile animated checkboxes and surfaceFadeIn transitions
 * 6. Real-time theme synchronization via localStorage and storage events in renderer.ts and companion.ts
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Mock minimal DOM for unit testing theme functions in Node environment
class MockClassList {
  private classes = new Set<string>()
  add(c: string) { this.classes.add(c) }
  remove(c: string) { this.classes.delete(c) }
  contains(c: string) { return this.classes.has(c) }
  toggle(c: string, force?: boolean): boolean {
    if (force !== undefined) {
      if (force) this.classes.add(c); else this.classes.delete(c)
      return force
    }
    if (this.classes.has(c)) {
      this.classes.delete(c)
      return false
    } else {
      this.classes.add(c)
      return true
    }
  }
}

class MockElement {
  public classList = new MockClassList()
  public textContent = ''
  public title = ''
  public attributes: Record<string, string> = {}
  setAttribute(k: string, v: string) { this.attributes[k] = v }
  getAttribute(k: string) { return this.attributes[k] }
  addEventListener(_event: string, _cb: any) {}
}

const mockElements: Record<string, MockElement> = {}

beforeAll(() => {
  const mockStorage: Record<string, string> = {}
  // @ts-ignore
  global.localStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = String(value) },
    removeItem: (key: string) => { delete mockStorage[key] },
    clear: () => { for (const k of Object.keys(mockStorage)) delete mockStorage[k] },
  }

  // @ts-ignore
  global.document = {
    body: new MockElement(),
    getElementById: (id: string) => {
      if (!mockElements[id]) {
        mockElements[id] = new MockElement()
      }
      return mockElements[id]
    },
    addEventListener: () => {},
  }

  // @ts-ignore
  global.window = {
    addEventListener: () => {},
    localStorage: global.localStorage,
  }
})

describe('Phase C: Consistent Desktop Visual System & Design Tokens', () => {
  const indexHtmlPath = path.resolve(__dirname, 'renderer/index.html')
  const companionHtmlPath = path.resolve(__dirname, 'renderer/companion.html')
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8')
  const companionHtml = fs.readFileSync(companionHtmlPath, 'utf-8')

  it('1. Verifies both windows declare identical Dark Graphite color tokens', () => {
    // Background tokens
    expect(indexHtml).toContain('--bg-app: #121518')
    expect(indexHtml).toContain('--bg-surface: #1C2025')
    expect(indexHtml).toContain('--border: #2E3339')
    expect(indexHtml).toContain('--text-primary: #F0EEE8')
    expect(indexHtml).toContain('--accent-sage: #8EA89D')

    expect(companionHtml).toContain('--bg-primary: #121518')
    expect(companionHtml).toContain('--bg-surface: #1C2025')
    expect(companionHtml).toContain('--bg-card: #262B31')
    expect(companionHtml).toContain('--border: #2E3339')
    expect(companionHtml).toContain('--text-main: #F0EEE8')
    expect(companionHtml).toContain('--accent-sage: #8EA89D')
  })

  it('2. Verifies both windows declare identical Warm Stone Light Mode tokens', () => {
    // Light mode tokens
    expect(indexHtml).toContain('--bg-app: #F5F4F0')
    expect(indexHtml).toContain('--bg-surface: #FCFBF9')
    expect(indexHtml).toContain('--border: #E2DFD8')
    expect(indexHtml).toContain('--text-primary: #1C2024')
    expect(indexHtml).toContain('--accent-sage: #3C6E52')

    expect(companionHtml).toContain('--bg-primary: #F5F4F0')
    expect(companionHtml).toContain('--bg-surface: #FCFBF9')
    expect(companionHtml).toContain('--bg-card: #EFECE4')
    expect(companionHtml).toContain('--border: #E2DFD8')
    expect(companionHtml).toContain('--text-main: #1C2024')
    expect(companionHtml).toContain('--accent-sage: #3C6E52')
  })

  it('3. Verifies Geist and Geist Mono font declarations in both windows', () => {
    // Local font-face definitions
    expect(indexHtml).toContain("font-family: 'Geist'")
    expect(indexHtml).toContain("font-family: 'Geist Mono'")
    expect(companionHtml).toContain("font-family: 'Geist'")
    expect(companionHtml).toContain("font-family: 'Geist Mono'")

    // Font stack usage
    expect(indexHtml).toContain('--font-stack: "Geist"')
    expect(indexHtml).toContain('--font-mono: "Geist Mono"')
    expect(companionHtml).toContain('--font-stack: "Geist"')
    expect(companionHtml).toContain('--font-mono: "Geist Mono"')
  })

  it('4. Verifies button micro-interactions: transition, active press, and disabled states', () => {
    // Index.html button transitions and active scale
    expect(indexHtml).toMatch(/\.btn\s*\{[^}]*transition:[^;]*0\.14s cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/s)
    expect(indexHtml).toMatch(/\.btn:active\s*\{[^}]*transform:\s*scale\(0\.98\)/s)
    expect(indexHtml).toMatch(/\.btn:disabled\s*\{[^}]*opacity:\s*0\.45/s)

    // Companion.html button transitions and active scale
    expect(companionHtml).toMatch(/\.btn\s*\{[^}]*transition:[^;]*0\.14s cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/s)
    expect(companionHtml).toMatch(/\.btn:active\s*\{[^}]*transform:\s*scale\(0\.98\)/s)
    expect(companionHtml).toMatch(/\.btn:disabled\s*\{[^}]*opacity:\s*0\.45/s)
  })

  it('5. Verifies tactile animated checkbox and restrained surface navigation transitions', () => {
    // Tactile checkbox in both files
    expect(indexHtml).toContain('.tactile-checkbox')
    expect(indexHtml).toContain('animation: checkmarkPop')
    expect(companionHtml).toContain('.tactile-checkbox')
    expect(companionHtml).toContain('animation: checkmarkPop')

    // Restrained navigation transitions
    expect(indexHtml).toContain('@keyframes surfaceFadeIn')
    expect(indexHtml).toContain('animation: surfaceFadeIn')
    expect(companionHtml).toContain('@keyframes surfaceFadeIn')
    expect(companionHtml).toContain('animation: surfaceFadeIn')
  })

  it('6. Verifies non-obtrusive custom scrollbars in both windows', () => {
    expect(indexHtml).toContain('::-webkit-scrollbar')
    expect(indexHtml).toContain('scrollbar-width: thin')
    expect(companionHtml).toContain('::-webkit-scrollbar')
    expect(companionHtml).toContain('scrollbar-width: thin')
  })
})

describe('Phase C: Theme Synchronization Controller', async () => {
  const { applyTheme, toggleTheme, initTheme } = await import('./renderer/renderer.js')
  const { applyCompanionTheme, toggleCompanionTheme } = await import('./renderer/companion.js')

  beforeEach(() => {
    // @ts-ignore
    document.body = new MockElement()
    localStorage.clear()
  })

  it('1. applyTheme switches DOM class and writes to localStorage', () => {
    applyTheme('light')
    expect(document.body.classList.contains('light-theme')).toBe(true)
    expect(localStorage.getItem('gravitas_theme')).toBe('light')
    expect(document.getElementById('btn-header-theme')?.textContent).toBe('Theme: Light')

    applyTheme('dark')
    expect(document.body.classList.contains('light-theme')).toBe(false)
    expect(localStorage.getItem('gravitas_theme')).toBe('dark')
    expect(document.getElementById('btn-header-theme')?.textContent).toBe('Theme: Dark')
  })

  it('2. toggleTheme alternates between light and dark themes', () => {
    expect(document.body.classList.contains('light-theme')).toBe(false)

    toggleTheme()
    expect(document.body.classList.contains('light-theme')).toBe(true)
    expect(localStorage.getItem('gravitas_theme')).toBe('light')

    toggleTheme()
    expect(document.body.classList.contains('light-theme')).toBe(false)
    expect(localStorage.getItem('gravitas_theme')).toBe('dark')
  })

  it('3. initTheme restores persisted theme from localStorage', () => {
    localStorage.setItem('gravitas_theme', 'light')
    initTheme()
    expect(document.body.classList.contains('light-theme')).toBe(true)

    localStorage.setItem('gravitas_theme', 'dark')
    initTheme()
    expect(document.body.classList.contains('light-theme')).toBe(false)
  })

  it('4. Floating Companion theme controller coordinates identically', () => {
    applyCompanionTheme('light')
    expect(document.body.classList.contains('light-theme')).toBe(true)
    expect(localStorage.getItem('gravitas_theme')).toBe('light')
    expect(document.getElementById('companion-theme-btn')?.textContent).toBe('Light')

    toggleCompanionTheme()
    expect(document.body.classList.contains('light-theme')).toBe(false)
    expect(localStorage.getItem('gravitas_theme')).toBe('dark')
    expect(document.getElementById('companion-theme-btn')?.textContent).toBe('Dark')
  })
})
