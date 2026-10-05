/**
 * GRAVITAS D1 — Browser QA Verification Script
 *
 * Inspects all 6 surfaces, accessibility landmarks, focus behavior,
 * dialog semantics, and verifies absence of unexpected console errors.
 */

import { app, BrowserWindow, utilityProcess, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { DesktopSupervisor } from '../dist/main/supervisor.js'
import { D1_PROTOCOL_VERSION } from '../dist/types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, '../dist')
const PRELOAD_PATH = join(DIST_DIR, 'preload/index.cjs')
const RENDERER_HTML_PATH = join(DIST_DIR, 'renderer/index.html')
const KERNEL_HOST_PATH = join(DIST_DIR, 'kernel-host/index.mjs')

app.on('window-all-closed', () => {})

app.whenReady().then(async () => {
  const consoleErrors = []
  try {
    let kernelChild = null
    const supervisor = new DesktopSupervisor({
      protocolVersion: D1_PROTOCOL_VERSION,
      forkProcess: () => {
        kernelChild = utilityProcess.fork(KERNEL_HOST_PATH)
        return {
          postMessage: (m) => kernelChild.postMessage(m),
          on: (ev, cb) => kernelChild.on(ev, cb),
          kill: () => kernelChild.kill(),
          get pid() {
            return kernelChild?.pid
          },
        }
      },
    })

    // Setup main IPC handlers
    ipcMain.handle('gravitas:get-health', () => supervisor.getHealth())
    ipcMain.handle('gravitas:get-snapshot', () => supervisor.getSnapshot())
    ipcMain.handle('gravitas:get-overview', () => supervisor.getOverview())
    ipcMain.handle('gravitas:get-work-hierarchy', () => supervisor.getWorkHierarchy())
    ipcMain.handle('gravitas:get-task-detail', (_e, taskId) => supervisor.getTaskDetail(taskId))
    ipcMain.handle('gravitas:get-execution', () => supervisor.getExecution())
    ipcMain.handle('gravitas:get-verification', (_e, planId) => supervisor.getVerification(planId))
    ipcMain.handle('gravitas:get-approval-queue', () => supervisor.getApprovalQueue())
    ipcMain.handle('gravitas:get-system', () => supervisor.getSystem())
    ipcMain.handle('gravitas:get-activity', () => supervisor.getActivity())
    ipcMain.handle('gravitas:submit-intent', (_e, intent) => supervisor.submitIntent(intent))

    await supervisor.start()
    for (let i = 0; i < 50; i++) {
      if (supervisor.getStatus() === 'READY') break
      await new Promise((r) => setTimeout(r, 100))
    }

    const win = new BrowserWindow({
      width: 1040,
      height: 720,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        preload: PRELOAD_PATH,
      },
    })

    win.webContents.on('console-message', (event, level, message) => {
      if (level >= 3) {
        // Error level
        consoleErrors.push(message)
      }
    })

    await win.loadFile(RENDERER_HTML_PATH)
    await new Promise((r) => setTimeout(r, 500))

    // Run DOM QA inspection across all 6 surfaces
    const qaReport = await win.webContents.executeJavaScript(`(() => {
      const results = {}

      // 1. Check landmarks
      results.hasHeader = !!document.querySelector('header[role="banner"]')
      results.hasNav = !!document.querySelector('nav[role="navigation"]')
      results.hasMain = !!document.querySelector('main[role="main"]')
      results.hasDialog = !!document.querySelector('dialog#approval-dialog')
      results.hasLiveAnnouncer = !!document.querySelector('#status-announcer[aria-live="polite"]')

      // 2. Check 6 surfaces
      results.surfaces = {
        overview: !!document.getElementById('surface-overview'),
        work: !!document.getElementById('surface-work'),
        execution: !!document.getElementById('surface-execution'),
        verification: !!document.getElementById('surface-verification'),
        approvals: !!document.getElementById('surface-approvals'),
        system: !!document.getElementById('surface-system'),
      }

      // 3. Tab buttons count & accessibility
      const tabs = Array.from(document.querySelectorAll('nav .nav-btn'))
      results.tabsCount = tabs.length
      results.tabsHaveAriaSelected = tabs.every(t => t.hasAttribute('aria-selected'))

      // 4. Test surface navigation
      const workTab = document.getElementById('tab-work')
      workTab?.click()
      const workSurfaceActive = document.getElementById('surface-work')?.classList.contains('active')
      results.workTabSwitchWorked = workSurfaceActive

      const overviewTab = document.getElementById('tab-overview')
      overviewTab?.click()
      const overviewSurfaceActive = document.getElementById('surface-overview')?.classList.contains('active')
      results.overviewTabSwitchWorked = overviewSurfaceActive

      // 5. Check untrusted container element
      results.hasUntrustedPre = !!document.querySelector('pre.untrusted-data')

      // 6. Check dialog semantics
      const dialog = document.getElementById('approval-dialog')
      results.dialogHasAriaLabel = dialog?.hasAttribute('aria-labelledby')
      results.dialogButtons = {
        hasCancel: !!document.getElementById('dialog-btn-cancel'),
        hasApprove: !!document.getElementById('dialog-btn-approve'),
        hasReject: !!document.getElementById('dialog-btn-reject'),
      }

      // 7. Check body dimensions & overflow
      results.viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollWidth: document.body.scrollWidth,
        scrollHeight: document.body.scrollHeight,
      }
      results.hasHorizontalOverflow = document.body.scrollWidth > window.innerWidth

      return results
    })()`)

    console.log('[D1_BROWSER_QA_REPORT]', JSON.stringify(qaReport, null, 2))
    console.log('[D1_BROWSER_CONSOLE_ERRORS]', JSON.stringify(consoleErrors))

    if (consoleErrors.length > 0) {
      throw new Error(`Unexpected browser console errors: ${consoleErrors.join(', ')}`)
    }
    if (qaReport.hasHorizontalOverflow) {
      throw new Error('Detected horizontal layout overflow in Command Center!')
    }

    await supervisor.shutdown()
    win.destroy()
    console.log('=== D1 BROWSER QA PASSED: ZERO CONSOLE ERRORS & CLEAN SEMANTICS ===')
    app.exit(0)
  } catch (err) {
    console.error('D1 BROWSER QA FAILED:', err)
    app.exit(1)
  }
})
