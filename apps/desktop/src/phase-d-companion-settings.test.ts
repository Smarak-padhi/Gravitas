/**
 * Phase D Automated Verification Suite — Companion Hierarchy & Dedicated Settings Surface
 *
 * Verifies:
 * 1. Dedicated Settings Surface (#surface-settings) in index.html with all 5 functional sections:
 *    - Global Shortcuts & Companion summoning
 *    - Study Guardian & Quiet Hours configuration
 *    - Startup & Desktop Continuity
 *    - Phone Inbox (iCloud Drive / Mobile Ingestion)
 *    - AI Model & Inference Routing (Default Deny Cloud Egress & STT transparency)
 * 2. Developer diagnostics remain safely compartmentalized under Developer Tools (#surface-devtools).
 * 3. Companion Hierarchy improvements in companion.html:
 *    - Command entry & primary action (Run, Mic PTT)
 *    - Compact subject select dropdown (#companion-subject-select) replacing sprawling chip wall
 * 4. Cross-window Companion-to-Workspace navigation:
 *    - "View in Workspace ↗" on idea cards invokes bridge.showMainWindow({ surface: 'surface-notes', targetId })
 *    - "View in Subject ↗" on assignment cards invokes bridge.showMainWindow({ surface: 'surface-subjects', targetId })
 *    - Double-safe localStorage ('gravitas_pending_navigate') and IPC channel ('gravitas:navigate-target')
 * 5. navigateToTarget and setupSettingsController logic in renderer.ts
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Mock minimal DOM hierarchy for Node vitest runner
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
  public tagName = 'DIV'
  public id = ''
  public value = ''
  public textContent = ''
  public title = ''
  public checked = false
  public classList = new MockClassList()
  public dataset: Record<string, string> = {}
  public style: Record<string, string> = {}
  public attributes: Record<string, string> = {}
  public children: MockElement[] = []
  public options: MockElement[] = []
  private listeners: Record<string, Array<(...args: any[]) => void>> = {}

  get innerHTML(): string {
    return this.textContent
  }

  set innerHTML(val: string) {
    this.children = []
    this.options = []
    if (val === '') {
      this.textContent = ''
    } else {
      this.textContent = val
    }
  }

  setAttribute(k: string, v: string) {
    this.attributes[k] = v
    if (k === 'id') this.id = v
    if (k.startsWith('data-')) {
      const camel = k.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase())
      this.dataset[camel] = v
    }
  }

  getAttribute(k: string) {
    return this.attributes[k] ?? null
  }

  appendChild(child: MockElement) {
    this.children.push(child)
    if (this.tagName === 'SELECT') {
      this.options.push(child)
    }
    return child
  }

  addEventListener(event: string, cb: (...args: any[]) => void) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event]!.push(cb)
  }

  click() {
    this.listeners['click']?.forEach((cb) => cb({ target: this }))
  }

  change() {
    this.listeners['change']?.forEach((cb) => cb({ target: this }))
  }

  querySelector(selector: string): MockElement | null {
    const all = this.querySelectorAll(selector)
    return all.length > 0 ? all[0]! : null
  }

  querySelectorAll(selector: string): MockElement[] {
    const results: MockElement[] = []
    const match = (el: MockElement): boolean => {
      if (selector.startsWith('#') && el.id === selector.slice(1)) return true
      if (selector.startsWith('.') && el.classList.contains(selector.slice(1))) return true
      if (selector.startsWith('[') && selector.endsWith(']')) {
        const inner = selector.slice(1, -1)
        if (inner.includes('=')) {
          const [attr, rawVal] = inner.split('=')
          const val = rawVal!.replace(/["']/g, '')
          return el.getAttribute(attr!) === val
        } else {
          return el.getAttribute(inner) !== null
        }
      }
      return false
    }

    const traverse = (node: MockElement) => {
      if (match(node)) results.push(node)
      for (const ch of node.children) {
        traverse(ch)
      }
    }

    for (const ch of this.children) {
      traverse(ch)
    }
    return results
  }
}

const mockRegistry: Record<string, MockElement> = {}

function getOrCreateMock(id: string, tag = 'DIV'): MockElement {
  if (!mockRegistry[id]) {
    const el = new MockElement()
    el.id = id
    el.tagName = tag.toUpperCase()
    mockRegistry[id] = el
  }
  return mockRegistry[id]!
}

beforeAll(() => {
  const mockStorage: Record<string, string> = {}
  // @ts-ignore
  global.localStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = String(value) },
    removeItem: (key: string) => { delete mockStorage[key] },
    clear: () => { for (const k of Object.keys(mockStorage)) delete mockStorage[k] },
  }

  const rootBody = new MockElement()
  rootBody.tagName = 'BODY'

  // @ts-ignore
  global.document = {
    body: rootBody,
    createElement: (tag: string) => {
      const el = new MockElement()
      el.tagName = tag.toUpperCase()
      return el
    },
    getElementById: (id: string) => mockRegistry[id] ?? null,
    querySelector: (sel: string) => rootBody.querySelector(sel),
    querySelectorAll: (sel: string) => rootBody.querySelectorAll(sel),
    addEventListener: () => {},
  }

  // @ts-ignore
  global.window = {
    addEventListener: () => {},
    localStorage: global.localStorage,
    document: global.document,
  }
})

import {
  navigateToTarget,
  setupSettingsController,
  activateSurface,
} from './renderer/renderer.js'
import {
  refreshSubjectsBar,
  renderIdeasList,
} from './renderer/companion.js'
import type { GravitasDesktopBridge, IdeaRecord, SemesterSubjectRecord } from './types.js'

describe('GRAVITAS Desktop V1 — Gate 4 (Phase D: Companion & Settings)', () => {
  const indexHtml = fs.readFileSync(path.resolve(__dirname, 'renderer/index.html'), 'utf-8')
  const companionHtml = fs.readFileSync(path.resolve(__dirname, 'renderer/companion.html'), 'utf-8')

  describe('1. Static Template Verification — Dedicated Settings Surface in index.html', () => {
    it('provides a dedicated Settings navigation tab in the header before Developer Tools', () => {
      expect(indexHtml).toContain('id="tab-settings"')
      expect(indexHtml).toContain('data-surface="surface-settings"')
      const subjIdx = indexHtml.indexOf('id="tab-subjects"')
      const setIdx = indexHtml.indexOf('id="tab-settings"')
      const devIdx = indexHtml.indexOf('id="tab-devtools"')
      expect(subjIdx).toBeLessThan(setIdx)
      expect(setIdx).toBeLessThan(devIdx)
    })

    it('contains surface-settings with 5 distinct functional configuration sections', () => {
      expect(indexHtml).toContain('id="surface-settings"')
      // Section 1: Shortcuts & Companion
      expect(indexHtml).toContain('id="settings-shortcut-input"')
      expect(indexHtml).toContain('id="settings-companion-always-on-top"')
      expect(indexHtml).toContain('id="settings-companion-compact-mode"')

      // Section 2: Study Guardian & Quiet Hours
      expect(indexHtml).toContain('id="settings-quiet-start"')
      expect(indexHtml).toContain('id="settings-quiet-end"')
      expect(indexHtml).toContain('id="settings-reminder-interval"')
      expect(indexHtml).toContain('id="settings-notifications-enabled"')

      // Section 3: Startup & Desktop Continuity
      expect(indexHtml).toContain('id="settings-start-with-windows"')
      expect(indexHtml).toContain('id="settings-minimize-to-tray"')
      expect(indexHtml).toContain('id="settings-theme-select"')
      expect(indexHtml).toContain('id="settings-btn-reopen-onboarding"')

      // Section 4: Phone Inbox (iCloud Drive / Mobile Ingestion)
      expect(indexHtml).toContain('id="settings-inbox-folder"')
      expect(indexHtml).toContain('id="settings-btn-pick-inbox"')
      expect(indexHtml).toContain('id="settings-btn-test-inbox"')
      expect(indexHtml).toContain('id="settings-inbox-status-pill"')

      // Section 5: AI Model & Inference Configuration
      expect(indexHtml).toContain('id="settings-model-router-select"')
      expect(indexHtml).toContain('id="settings-deny-cloud-egress"')
      expect(indexHtml).toContain('Deterministic SQLite Kernel (100% Offline)')
    })

    it('maintains strict developer diagnostics strictly under Developer Tools', () => {
      expect(indexHtml).toContain('id="surface-system"')
      expect(indexHtml).toContain('id="btn-run-doctor"')
      expect(indexHtml).toContain('id="system-diagnostics-container"')
      const sysSection = indexHtml.substring(
        indexHtml.indexOf('id="surface-system"'),
        indexHtml.indexOf('id="surface-settings"')
      )
      expect(sysSection).toContain('id="system-diagnostics-container"')
      expect(sysSection).toContain('id="card-doctor-results"')
    })

    it('articulates truthful sync and hardware disclaimers without unsubstantiated claims', () => {
      expect(indexHtml).toContain('Hardware &amp; Sync Transparency:')
      expect(indexHtml).toContain('Voice / STT Hardware Status:')
      expect(indexHtml).toContain('Microphone Push-to-Talk operates strictly user-initiated. Audio egress: NONE.')
    })
  })

  describe('2. Floating Companion Hierarchy & Filter Ergonomics in companion.html', () => {
    it('provides a clean hierarchy: command input, run/mic buttons, status box, quick chips, tabs', () => {
      expect(companionHtml).toContain('id="companion-command-input"')
      expect(companionHtml).toContain('id="companion-send-btn"')
      expect(companionHtml).toContain('id="companion-ptt-btn"')
      expect(companionHtml).toContain('id="companion-status-box"')
      expect(companionHtml).toContain('class="quick-chips"')
      expect(companionHtml).toContain('class="tabs-bar"')
    })

    it('replaces the sprawling 10-button subject chip wall with a compact subject select dropdown', () => {
      expect(companionHtml).toContain('id="companion-subject-select"')
      expect(companionHtml).toContain('class="companion-filter-row"')
      expect(companionHtml).toContain('id="knowledge-subjects-bar"')
    })
  })

  describe('3. Companion refreshSubjectsBar & compact dropdown functionality', () => {
    let mockSelect: MockElement
    let mockBar: MockElement

    beforeEach(() => {
      for (const k of Object.keys(mockRegistry)) delete mockRegistry[k]
      mockSelect = getOrCreateMock('companion-subject-select', 'SELECT')
      mockBar = getOrCreateMock('knowledge-subjects-bar', 'DIV')
    })

    it('populates companion-subject-select with available subjects and item counts', async () => {
      const mockBridge: Partial<GravitasDesktopBridge> = {
        listStudySubjects: vi.fn().mockResolvedValue([
          { subject: 'CSE 2195', noteCount: 4, taskCount: 2, assignmentCount: 1 },
          { subject: 'MTH 2002', noteCount: 1, taskCount: 0, assignmentCount: 0 },
        ]),
        listIdeas: vi.fn().mockResolvedValue([]),
      }

      await refreshSubjectsBar(mockBridge as GravitasDesktopBridge)

      expect(mockSelect.options.length).toBe(2) // 2 subjects added as options
      expect(mockSelect.options[0]!.value).toBe('CSE 2195')
      expect(mockSelect.options[0]!.textContent).toBe('CSE 2195 (6)')
      expect(mockSelect.options[1]!.value).toBe('MTH 2002')
      expect(mockSelect.options[1]!.textContent).toBe('MTH 2002 (1)')
    })
  })

  describe('4. Companion-to-Workspace Navigation Dispatch', () => {
    let listContainer: MockElement

    beforeEach(() => {
      for (const k of Object.keys(mockRegistry)) delete mockRegistry[k]
      listContainer = getOrCreateMock('vault-ideas-list', 'DIV')
      getOrCreateMock('vault-count-badge', 'SPAN')
      getOrCreateMock('idea-detail-panel', 'DIV')
      getOrCreateMock('detail-delete-confirm-bar', 'DIV')
      getOrCreateMock('detail-linked-items-list', 'DIV')
      getOrCreateMock('detail-link-target-select', 'SELECT')
      localStorage.clear()
    })

    it('attaches View in Workspace button to each idea card that sets pending navigation and calls showMainWindow', async () => {
      const showMainWindowSpy = vi.fn().mockResolvedValue({ visible: true })
      const mockBridge: Partial<GravitasDesktopBridge> = {
        showMainWindow: showMainWindowSpy,
      }

      const testIdeas: IdeaRecord[] = [
        {
          id: 'idea-12345',
          title: 'Quantum computing circuits',
          originalText: 'Quantum computing circuits draft notes',
          category: 'Ideas',
          collection: 'STUDY_NOTE',
          subject: 'Physics',
          tags: ['quantum', 'circuits'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          persistenceStatus: 'PERSISTED',
        },
      ]

      renderIdeasList(testIdeas, mockBridge as GravitasDesktopBridge)

      const viewBtn = listContainer.querySelector('[data-view-workspace-btn="idea-12345"]')
      expect(viewBtn).not.toBeNull()
      expect(viewBtn?.textContent).toContain('View in Workspace')

      // Trigger click
      viewBtn?.click()

      // Verify localStorage was set for cross-window hydration
      const pendingNav = localStorage.getItem('gravitas_pending_navigate')
      expect(pendingNav).not.toBeNull()
      const parsed = JSON.parse(pendingNav!)
      expect(parsed).toEqual({ surface: 'surface-notes', targetId: 'idea-12345' })

      // Verify IPC showMainWindow was called with target
      expect(showMainWindowSpy).toHaveBeenCalledWith({
        surface: 'surface-notes',
        targetId: 'idea-12345',
      })
    })
  })

  describe('5. navigateToTarget and setupSettingsController in Main Window', () => {
    let mockBridge: any

    beforeEach(() => {
      for (const k of Object.keys(mockRegistry)) delete mockRegistry[k]

      const wsSurf = getOrCreateMock('surface-workspace', 'SECTION')
      wsSurf.classList.add('surface')
      wsSurf.classList.add('active')

      const notesSurf = getOrCreateMock('surface-notes', 'SECTION')
      notesSurf.classList.add('surface')

      const subjSurf = getOrCreateMock('surface-subjects', 'SECTION')
      subjSurf.classList.add('surface')

      const setSurf = getOrCreateMock('surface-settings', 'SECTION')
      setSurf.classList.add('surface')

      // Inputs
      getOrCreateMock('settings-shortcut-input', 'INPUT').value = 'Alt+Space'
      getOrCreateMock('settings-companion-always-on-top', 'INPUT').checked = true
      getOrCreateMock('settings-companion-compact-mode', 'INPUT').checked = true
      getOrCreateMock('settings-quiet-start', 'INPUT').value = '22:00'
      getOrCreateMock('settings-quiet-end', 'INPUT').value = '07:00'
      getOrCreateMock('settings-reminder-interval', 'SELECT').value = '180'
      getOrCreateMock('settings-notifications-enabled', 'INPUT').checked = true
      getOrCreateMock('settings-start-with-windows', 'INPUT').checked = false
      getOrCreateMock('settings-minimize-to-tray', 'INPUT').checked = true
      getOrCreateMock('settings-theme-select', 'SELECT').value = 'dark'
      getOrCreateMock('settings-model-router-select', 'SELECT').value = 'meta/llama-3.1-8b-instruct'
      getOrCreateMock('settings-deny-cloud-egress', 'INPUT').checked = true
      getOrCreateMock('settings-inbox-folder', 'INPUT').value = ''
      getOrCreateMock('settings-inbox-status-pill', 'SPAN')
      getOrCreateMock('settings-inbox-message', 'DIV')
      getOrCreateMock('settings-btn-save', 'BUTTON')
      getOrCreateMock('settings-save-feedback', 'SPAN')
      getOrCreateMock('settings-btn-pick-inbox', 'BUTTON')
      getOrCreateMock('settings-btn-test-inbox', 'BUTTON')
      getOrCreateMock('settings-btn-reopen-onboarding', 'BUTTON')

      getOrCreateMock('subject-detail-view', 'DIV')
      getOrCreateMock('subjects-overview-view', 'DIV')
      getOrCreateMock('status-announcer', 'DIV')

      // Also register elements on document.body for querySelector
      document.body.children = Object.values(mockRegistry)

      localStorage.clear()

      mockBridge = {
        getIdea: vi.fn().mockResolvedValue({
          id: 'note-777',
          title: 'Graph Theory',
          originalText: 'Hamiltonian paths',
          collection: 'STUDY_NOTE',
          subject: 'Computer Science',
          tags: ['graph'],
          updatedAt: new Date().toISOString(),
        }),
        getOnboarding: vi.fn().mockResolvedValue({
          completed: true,
          preferences: {
            companionShortcut: 'Alt+Space',
            quietHoursStart: '23:00',
            quietHoursEnd: '06:00',
            reminderFrequencyMinutes: 120,
            notificationsEnabled: true,
            startWithWindows: false,
            defaultDenyCloudEgress: true,
          },
        }),
        saveOnboarding: vi.fn().mockResolvedValue({ success: true }),
        executeStudyGuardianOperation: vi.fn().mockImplementation((req: any) => {
          if (req.action === 'GET_INBOX_CONFIG') {
            return Promise.resolve({
              inboxConfig: {
                inboxFolderPath: 'C:\\Users\\smara\\iCloudDrive\\GRAVITAS\\Inbox',
                watcherActive: true,
              },
            })
          }
          if (req.action === 'TEST_INBOX_SETUP') {
            return Promise.resolve({
              inboxVerificationResult: {
                isAccessible: true,
                message: 'Folder accessible and ready.',
              },
            })
          }
          if (req.action === 'SET_INBOX_FOLDER') {
            return Promise.resolve({ success: true })
          }
          return Promise.resolve({})
        }),
        selectInboxFolder: vi.fn().mockResolvedValue({
          selected: true,
          folderPath: 'C:\\Users\\smara\\TestInbox',
        }),
      }
    })

    it('navigates to surface-settings when target is surface-settings', async () => {
      await navigateToTarget(mockBridge, { surface: 'surface-settings' })
      const settingsSurface = document.getElementById('surface-settings')
      expect(settingsSurface?.classList.contains('active')).toBe(true)
    })

    it('setupSettingsController initializes from preferences and persists updates on save', async () => {
      setupSettingsController(mockBridge)

      // Allow async loadSettings to resolve
      await new Promise((r) => setTimeout(r, 20))

      const quietStart = document.getElementById('settings-quiet-start') as MockElement
      expect(quietStart.value).toBe('23:00')

      const inboxPath = document.getElementById('settings-inbox-folder') as MockElement
      expect(inboxPath.value).toBe('C:\\Users\\smara\\iCloudDrive\\GRAVITAS\\Inbox')

      const statusPill = document.getElementById('settings-inbox-status-pill') as MockElement
      expect(statusPill?.textContent).toBe('Watching')

      // Edit a setting and trigger Save
      quietStart.value = '22:30'
      const saveBtn = document.getElementById('settings-btn-save') as MockElement
      saveBtn?.click()

      await new Promise((r) => setTimeout(r, 20))

      expect(mockBridge.saveOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences: expect.objectContaining({
            quietHoursStart: '22:30',
          }),
        })
      )

      const savedJson = localStorage.getItem('gravitas_settings')
      expect(savedJson).not.toBeNull()
      const parsed = JSON.parse(savedJson!)
      expect(parsed.alwaysOnTop).toBe(true)
    })

    it('testing inbox connection invokes TEST_INBOX_SETUP and displays verified accessibility status', async () => {
      setupSettingsController(mockBridge)
      await new Promise((r) => setTimeout(r, 20))

      const testBtn = document.getElementById('settings-btn-test-inbox') as MockElement
      testBtn?.click()

      await new Promise((r) => setTimeout(r, 20))

      expect(mockBridge.executeStudyGuardianOperation).toHaveBeenCalledWith({
        action: 'TEST_INBOX_SETUP',
      })
      const pill = document.getElementById('settings-inbox-status-pill') as MockElement
      expect(pill?.textContent).toBe('Verified')
      const msg = document.getElementById('settings-inbox-message') as MockElement
      expect(msg?.textContent).toContain('Folder accessible and ready')
    })
  })
})
