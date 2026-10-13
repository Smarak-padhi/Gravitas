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

import { app, BrowserWindow, ipcMain, utilityProcess, session, Tray, Menu, nativeImage, globalShortcut } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { DesktopSupervisor } from './supervisor.js'
import { resolveGravitasDataRoot } from '@gravitas/core'
import type { KernelLifecycleStatus, SafeDesktopError, OperatorIntent, DesktopLifecycleState } from '../types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PRELOAD_PATH = join(__dirname, '../preload/index.cjs')
const RENDERER_HTML_PATH = join(__dirname, '../renderer/index.html')
const COMPANION_HTML_PATH = join(__dirname, '../renderer/companion.html')
const KERNEL_HOST_PATH = join(__dirname, '../kernel-host/index.mjs')
const TRAY_ICON_PATH = join(__dirname, '../../assets/tray-icon.png')

export const DEFAULT_COMPANION_SHORTCUT = 'CommandOrControl+Shift+Space'
export const FALLBACK_COMPANION_SHORTCUT = 'Alt+Shift+G'

let mainWindow: BrowserWindow | null = null
let companionWindow: BrowserWindow | null = null
let supervisor: DesktopSupervisor | null = null
let tray: Tray | null = null
let isQuittingApp = false
let lifecycleState: DesktopLifecycleState = 'WINDOW_OPEN'
let registeredCompanionShortcut: string | null = null

export function getLifecycleState(): DesktopLifecycleState {
  return lifecycleState
}

export function setLifecycleState(state: DesktopLifecycleState): void {
  lifecycleState = state
}

export function getCompanionWindow(): BrowserWindow | null {
  return companionWindow
}

export function getRegisteredCompanionShortcut(): string | null {
  return registeredCompanionShortcut
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

  // 2. Strict navigation policy: block all in-app navigation away from canonical application document
  win.webContents.on('will-navigate', (event, url) => {
    try {
      const allowedUrl = pathToFileURL(RENDERER_HTML_PATH).href
      if (url !== allowedUrl) {
        event.preventDefault()
      }
    } catch {
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

/**
 * V1-F-01: Creates or returns the small, draggable, always-on-top Floating Desktop Companion window.
 */
export function createCompanionWindow(showImmediately = false): BrowserWindow {
  if (companionWindow && !companionWindow.isDestroyed()) {
    if (showImmediately) {
      companionWindow.show()
      companionWindow.focus()
    }
    return companionWindow
  }

  const win = new BrowserWindow({
    width: 420,
    height: 560,
    minWidth: 340,
    minHeight: 420,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    show: false,
    title: 'GRAVITAS Companion',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: PRELOAD_PATH,
    },
  })

  win.setAlwaysOnTop(true, 'floating')

  win.webContents.on('will-navigate', (event, url) => {
    try {
      const allowedUrl = pathToFileURL(COMPANION_HTML_PATH).href
      if (url !== allowedUrl) {
        event.preventDefault()
      }
    } catch {
      event.preventDefault()
    }
  })

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  win.on('close', (event) => {
    if (!isQuittingApp) {
      event.preventDefault()
      win.hide()
    }
  })

  win.loadFile(COMPANION_HTML_PATH)
  win.once('ready-to-show', () => {
    if (showImmediately) {
      win.show()
      win.focus()
    }
  })

  companionWindow = win
  return win
}

export function showCompanionWindow(): BrowserWindow {
  const win = createCompanionWindow(true)
  if (!win.isDestroyed()) {
    win.show()
    win.focus()
    win.webContents.send('gravitas:projection-update', 'IDEAS_VAULT')
  }
  return win
}

export function hideCompanionWindow(): void {
  if (companionWindow && !companionWindow.isDestroyed() && companionWindow.isVisible()) {
    companionWindow.hide()
  }
}

export function toggleCompanionWindow(): { visible: boolean; window: BrowserWindow } {
  if (companionWindow && !companionWindow.isDestroyed() && companionWindow.isVisible()) {
    companionWindow.hide()
    return { visible: false, window: companionWindow }
  }
  const win = showCompanionWindow()
  return { visible: true, window: win }
}

export function registerCompanionShortcut(
  shortcut: string = DEFAULT_COMPANION_SHORTCUT,
  onTrigger?: () => void
): boolean {
  try {
    if (!globalShortcut || typeof globalShortcut.register !== 'function') {
      return false
    }
    const handler = onTrigger ?? (() => {
      toggleCompanionWindow()
    })
    let ok = globalShortcut.register(shortcut, handler)
    if (ok) {
      registeredCompanionShortcut = shortcut
      return true
    }
    if (shortcut !== FALLBACK_COMPANION_SHORTCUT) {
      ok = globalShortcut.register(FALLBACK_COMPANION_SHORTCUT, handler)
      if (ok) {
        registeredCompanionShortcut = FALLBACK_COMPANION_SHORTCUT
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

export function unregisterCompanionShortcuts(): void {
  try {
    if (globalShortcut && typeof globalShortcut.unregisterAll === 'function') {
      globalShortcut.unregisterAll()
    }
  } catch {}
  registeredCompanionShortcut = null
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

  unregisterCompanionShortcuts()

  if (supervisor && supervisor.getStatus() !== 'STOPPED') {
    setLifecycleState('KERNEL_STOPPING')
    await supervisor.shutdown()
  }

  if (companionWindow && !companionWindow.isDestroyed()) {
    companionWindow.destroy()
    companionWindow = null
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
      label: 'Toggle Floating Companion (Ctrl+Shift+Space)',
      click: () => {
        toggleCompanionWindow()
      },
    },
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

function isAuthorizedWindowFrame(
  event: Electron.IpcMainInvokeEvent,
  targetWindow: BrowserWindow | null,
  expectedHtmlPath: string
): boolean {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return false
  }
  if (!event.sender || event.sender !== targetWindow.webContents) {
    return false
  }
  if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame) {
    return false
  }
  if (event.senderFrame.parent !== null) {
    return false
  }
  try {
    const allowedUrl = pathToFileURL(expectedHtmlPath).href
    if (event.senderFrame.url !== allowedUrl) {
      return false
    }
  } catch {
    return false
  }
  return true
}

export function isAuthorizedRestartCaller(
  event: Electron.IpcMainInvokeEvent,
  activeWindow: BrowserWindow | null,
  activeCompanionWindow?: BrowserWindow | null
): boolean {
  if (isAuthorizedWindowFrame(event, activeWindow, RENDERER_HTML_PATH)) {
    return true
  }
  if (isAuthorizedWindowFrame(event, activeWindow, COMPANION_HTML_PATH)) {
    return true
  }
  if (activeCompanionWindow && isAuthorizedWindowFrame(event, activeCompanionWindow, COMPANION_HTML_PATH)) {
    return true
  }
  return false
}

export function initMainIpc(
  sup: DesktopSupervisor,
  winGetter: () => BrowserWindow | null,
  companionWinGetter: () => BrowserWindow | null = () => companionWindow
): void {
  const handle: typeof ipcMain.handle = (channel, listener) => {
    if (typeof (ipcMain as any).removeHandler === 'function') {
      ;(ipcMain as any).removeHandler(channel)
    }
    return ipcMain.handle(channel, (event, ...args) => {
      if (!isAuthorizedRestartCaller(event, winGetter(), companionWinGetter())) {
        throw new Error('Unauthorized GRAVITAS IPC caller')
      }
      return listener(event, ...args)
    })
  }
  handle('gravitas:get-health', async () => {
    return sup.getHealth()
  })

  handle('gravitas:get-snapshot', async () => {
    return sup.getSnapshot()
  })

  handle('gravitas:get-overview', async () => {
    return sup.getOverview()
  })

  handle('gravitas:get-work-hierarchy', async () => {
    return sup.getWorkHierarchy()
  })

  handle('gravitas:get-task-detail', async (_event, taskId: string) => {
    return sup.getTaskDetail(taskId)
  })

  handle('gravitas:get-execution', async () => {
    return sup.getExecution()
  })

  handle('gravitas:get-verification', async (_event, planId?: string) => {
    return sup.getVerification(planId)
  })

  handle('gravitas:get-approval-queue', async () => {
    return sup.getApprovalQueue()
  })

  handle('gravitas:get-system', async () => {
    return sup.getSystem()
  })

  handle('gravitas:get-activity', async () => {
    return sup.getActivity()
  })

  handle('gravitas:submit-intent', async (_event, intent: OperatorIntent) => {
    return sup.submitIntent(intent)
  })

  // V1-C Onboarding, Doctor & Provider Configuration IPC Handlers
  handle('gravitas:get-onboarding', async () => {
    return sup.getOnboarding()
  })

  handle('gravitas:save-onboarding', async (_event, payload) => {
    return sup.saveOnboarding(payload)
  })

  handle('gravitas:run-doctor', async () => {
    return sup.runDoctor()
  })

  handle('gravitas:configure-provider', async (_event, payload) => {
    return sup.configureProvider(payload)
  })

  handle('gravitas:dispatch-model', async (_event, payload) => {
    return sup.dispatchModel(payload)
  })

  handle('gravitas:restart-kernel', async (event) => {
    const activeWindow = winGetter()
    if (!isAuthorizedRestartCaller(event, activeWindow, companionWinGetter())) {
      throw new Error('Unauthorized restart request: caller is not an active authorized application frame')
    }
    await sup.start()
    return sup.getStatus() === 'READY' || sup.getStatus() === 'STARTING'
  })

  // V1-F-01 Floating Companion, Ideas Vault, Voice PTT & Supervised Capabilities IPC Handlers
  handle('gravitas:assistant-command', async (_event, payload) => {
    return sup.executeAssistantCommand(payload)
  })

  handle('gravitas:assistant-cancel', async (_event, commandId?: string) => {
    return sup.cancelAssistantCommand(commandId)
  })

  handle('gravitas:vault-save-idea', async (_event, input) => {
    return sup.saveIdea(input)
  })

  handle('gravitas:vault-list-ideas', async (_event, filter) => {
    return sup.listIdeas(filter)
  })

  handle('gravitas:vault-search-ideas', async (_event, query: string) => {
    return sup.searchIdeas(query)
  })

  handle('gravitas:vault-get-idea', async (_event, id: string) => {
    return sup.getIdea(id)
  })

  handle('gravitas:vault-update-idea', async (_event, input) => {
    return sup.updateIdea(input)
  })

  handle('gravitas:vault-delete-idea', async (_event, payload: { id: string; confirmed: boolean }) => {
    return sup.deleteIdea(payload?.id, payload?.confirmed)
  })

  handle('gravitas:vault-complete-task', async (_event, payload: { id: string; completed: boolean }) => {
    return sup.completeTask(payload?.id, payload?.completed ?? true)
  })

  handle('gravitas:vault-link-items', async (_event, payload: { sourceId: string; targetId: string; relationship?: string }) => {
    return sup.linkKnowledgeItems(payload?.sourceId, payload?.targetId, payload?.relationship)
  })

  handle('gravitas:vault-unlink-items', async (_event, payload: { sourceId: string; targetId: string }) => {
    return sup.unlinkKnowledgeItems(payload?.sourceId, payload?.targetId)
  })

  handle('gravitas:vault-list-subjects', async () => {
    return sup.listStudySubjects()
  })

  handle('gravitas:vault-export-markdown', async (_event, targetDir?: string) => {
    return sup.exportKnowledgeMarkdown(targetDir)
  })

  handle('gravitas:vault-import-markdown', async (_event, markdown: string) => {
    return sup.importKnowledgeMarkdown(markdown)
  })

  handle('gravitas:voice-ptt-status', async () => {
    return sup.getVoiceSttStatus()
  })

  handle('gravitas:voice-ptt-start', async (_event, userInitiated: boolean) => {
    return sup.startPushToTalk(userInitiated)
  })

  handle('gravitas:voice-ptt-stop', async (_event, payload: { pttSessionId: string; audioSampleBase64?: string }) => {
    return sup.stopPushToTalk(payload?.pttSessionId, payload?.audioSampleBase64)
  })

  handle('gravitas:voice-ptt-cancel', async () => {
    return sup.cancelPushToTalk()
  })

  handle('gravitas:assistant-capabilities', async () => {
    return sup.getAssistantCapabilities()
  })

  handle('gravitas:assistant-feedback', async (_event, payload: { capabilityId: string; rating: 'POSITIVE' | 'NEGATIVE'; comment: string }) => {
    return sup.submitCapabilityFeedback(payload?.capabilityId, payload?.rating, payload?.comment)
  })

  handle('gravitas:toggle-companion', async () => {
    const res = toggleCompanionWindow()
    return { visible: res.visible }
  })

  handle('gravitas:hide-companion', async () => {
    hideCompanionWindow()
    return { visible: false }
  })

  // D2 Lifecycle IPC Methods (Strictly typed, zero generic execution)
  handle('gravitas:hide-window', async () => {
    hideCommandCenter()
  })

  handle('gravitas:quit-app', async () => {
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

  const customDataRoot = process.env['GRAVITAS_DATA_ROOT'] || resolveGravitasDataRoot().dataRoot

  supervisor = new DesktopSupervisor({
    dataRoot: customDataRoot,
    forkProcess: () => {
      const child = utilityProcess.fork(KERNEL_HOST_PATH, [], {
        env: {
          ...process.env,
          GRAVITAS_DATA_ROOT: customDataRoot,
        },
      })
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
      companionWindow?.webContents.send('gravitas:kernel-status', status)
    },
    onError: (err: SafeDesktopError) => {
      updateTrayMenu('DEGRADED')
      mainWindow?.webContents.send('gravitas:kernel-error', err)
      companionWindow?.webContents.send('gravitas:kernel-error', err)
    },
    onProjectionUpdate: (projectionType: string) => {
      mainWindow?.webContents.send('gravitas:projection-update', projectionType)
      companionWindow?.webContents.send('gravitas:projection-update', projectionType)
    },
  })

  initMainIpc(supervisor, () => mainWindow, () => companionWindow)
  mainWindow = createDesktopWindow()
  companionWindow = createCompanionWindow(process.env['GRAVITAS_OPEN_COMPANION'] === '1')
  registerCompanionShortcut()
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
