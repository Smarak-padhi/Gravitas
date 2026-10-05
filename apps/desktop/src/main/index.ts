/**
 * GRAVITAS D0/D1 — Electron Main Process Entry Point
 *
 * Implements security baseline:
 * - nodeIntegration: false
 * - contextIsolation: true
 * - sandbox: true
 * - webSecurity: true
 * - will-navigate blocked
 * - windowOpenHandler denied
 * - CSP: default-src 'self', no unsafe-eval, no remote scripts
 */

import { app, BrowserWindow, ipcMain, utilityProcess, session, Tray, Menu, nativeImage } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { DesktopSupervisor } from './supervisor.js'
import type { KernelLifecycleStatus, SafeDesktopError, OperatorIntent, DesktopLifecycleState } from '../types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PRELOAD_PATH = join(__dirname, '../preload/index.cjs')
const RENDERER_HTML_PATH = join(__dirname, '../renderer/index.html')
const KERNEL_HOST_PATH = join(__dirname, '../kernel-host/index.mjs')
const TRAY_ICON_PATH = join(__dirname, '../../assets/tray-icon.png')

let mainWindow: BrowserWindow | null = null
let supervisor: DesktopSupervisor | null = null
let tray: Tray | null = null
let isQuittingApp = false
let lifecycleState: DesktopLifecycleState = 'WINDOW_OPEN'

export function getLifecycleState(): DesktopLifecycleState {
  return lifecycleState
}

export function setLifecycleState(state: DesktopLifecycleState): void {
  lifecycleState = state
}

export function configureSecurityPolicies(): void {
  // 1. Content Security Policy header enforcement
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'self';",
        ],
      },
    })
  })
}

export function createDesktopWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!mainWindow.isVisible()) {
      mainWindow.show()
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
    setLifecycleState('WINDOW_OPEN')
    return mainWindow
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
      allowRunningInsecureContent: false,
      preload: PRELOAD_PATH,
    },
  })

  // 2. Strict navigation policy: block unrequested navigation and window opening
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault()
    }
  })

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  // Wave D2 Deterministic Close Policy: Close hides window instead of destroying application
  win.on('close', (event) => {
    if (!isQuittingApp) {
      event.preventDefault()
      win.hide()
      setLifecycleState('WINDOW_HIDDEN')
    }
  })

  win.loadFile(RENDERER_HTML_PATH)
  win.once('ready-to-show', () => {
    win.show()
    setLifecycleState('WINDOW_OPEN')
  })

  mainWindow = win
  return win
}

export function restoreCommandCenter(): BrowserWindow {
  const win = createDesktopWindow()
  if (win && !win.isDestroyed()) {
    win.show()
    win.focus()
    setLifecycleState('WINDOW_OPEN')
    // Trigger fresh projection request for restored window
    win.webContents.send('gravitas:projection-update', 'OVERVIEW')
  }
  return win
}

export function hideCommandCenter(): void {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    mainWindow.hide()
    setLifecycleState('WINDOW_HIDDEN')
  }
}

export async function quitDesktopApp(): Promise<void> {
  if (isQuittingApp) {
    return
  }
  isQuittingApp = true
  setLifecycleState('QUIT_REQUESTED')

  if (supervisor && supervisor.getStatus() !== 'STOPPED') {
    setLifecycleState('KERNEL_STOPPING')
    await supervisor.shutdown()
  }

  if (tray) {
    tray.destroy()
    tray = null
  }

  setLifecycleState('APP_EXITING')
  app.exit(0)
}

export function updateTrayMenu(statusText: string = 'READY'): void {
  if (!tray) return

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Command Center',
      click: () => {
        restoreCommandCenter()
      },
    },
    { type: 'separator' },
    {
      label: `Kernel Status: ${statusText}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Quit GRAVITAS',
      click: () => {
        quitDesktopApp()
      },
    },
  ])

  tray.setToolTip(`GRAVITAS — Status: ${statusText}`)
  tray.setContextMenu(contextMenu)
}

export function createDesktopTray(): Tray | null {
  try {
    let icon: Electron.NativeImage
    try {
      icon = nativeImage.createFromPath(TRAY_ICON_PATH)
      if (icon.isEmpty()) {
        icon = nativeImage.createEmpty()
      }
    } catch {
      icon = nativeImage.createEmpty()
    }

    const t = new Tray(icon)
    t.on('double-click', () => {
      restoreCommandCenter()
    })

    tray = t
    updateTrayMenu('STARTING')
    return t
  } catch (err) {
    console.error('Tray creation failed:', err)
    return null
  }
}

export function initMainIpc(sup: DesktopSupervisor, winGetter: () => BrowserWindow | null): void {
  ipcMain.handle('gravitas:get-health', async () => {
    return sup.getHealth()
  })

  ipcMain.handle('gravitas:get-snapshot', async () => {
    return sup.getSnapshot()
  })

  ipcMain.handle('gravitas:get-overview', async () => {
    return sup.getOverview()
  })

  ipcMain.handle('gravitas:get-work-hierarchy', async () => {
    return sup.getWorkHierarchy()
  })

  ipcMain.handle('gravitas:get-task-detail', async (_event, taskId: string) => {
    return sup.getTaskDetail(taskId)
  })

  ipcMain.handle('gravitas:get-execution', async () => {
    return sup.getExecution()
  })

  ipcMain.handle('gravitas:get-verification', async (_event, planId?: string) => {
    return sup.getVerification(planId)
  })

  ipcMain.handle('gravitas:get-approval-queue', async () => {
    return sup.getApprovalQueue()
  })

  ipcMain.handle('gravitas:get-system', async () => {
    return sup.getSystem()
  })

  ipcMain.handle('gravitas:get-activity', async () => {
    return sup.getActivity()
  })

  ipcMain.handle('gravitas:submit-intent', async (_event, intent: OperatorIntent) => {
    return sup.submitIntent(intent)
  })

  // D2 Lifecycle IPC Methods (Strictly typed, zero generic execution)
  ipcMain.handle('gravitas:hide-window', async () => {
    hideCommandCenter()
  })

  ipcMain.handle('gravitas:quit-app', async () => {
    await quitDesktopApp()
  })
}

export async function bootstrapDesktopApp(): Promise<void> {
  // Single-instance lock
  const gotLock = app.requestSingleInstanceLock()
  if (!gotLock) {
    app.quit()
    return
  }

  app.on('second-instance', () => {
    restoreCommandCenter()
  })

  await app.whenReady()
  configureSecurityPolicies()

  supervisor = new DesktopSupervisor({
    forkProcess: () => {
      const child = utilityProcess.fork(KERNEL_HOST_PATH)
      return {
        postMessage: (msg: unknown) => child.postMessage(msg),
        on: (event: string, listener: any) => child.on(event as any, listener),
        kill: () => child.kill(),
        pid: child.pid,
      }
    },
    onStatusChange: (status: KernelLifecycleStatus) => {
      updateTrayMenu(status)
      mainWindow?.webContents.send('gravitas:kernel-status', status)
    },
    onError: (err: SafeDesktopError) => {
      updateTrayMenu('DEGRADED')
      mainWindow?.webContents.send('gravitas:kernel-error', err)
    },
    onProjectionUpdate: (projectionType: string) => {
      mainWindow?.webContents.send('gravitas:projection-update', projectionType)
    },
  })

  initMainIpc(supervisor, () => mainWindow)
  mainWindow = createDesktopWindow()
  createDesktopTray()

  await supervisor.start()
  updateTrayMenu(supervisor.getStatus())

  app.on('before-quit', async (e) => {
    if (!isQuittingApp) {
      e.preventDefault()
      await quitDesktopApp()
    }
  })

  app.on('window-all-closed', () => {
    // Wave D2: closing window does NOT quit application; DesktopSupervisor and Kernel remain running
  })
}

// Auto-bootstrap when running as electron main app
if (process.type === 'browser') {
  bootstrapDesktopApp().catch((err) => {
    console.error('Failed to bootstrap Gravitas Desktop:', err)
  })
}
