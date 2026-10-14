/**
 * GRAVITAS D0/D1 — Preload Bridge
 *
 * Exposes a narrow typed API on window.gravitasDesktop via contextBridge.
 *
 * Invariants:
 * - PRELOAD EXPOSES ALLOWLISTED API ONLY
 * - ZERO DIRECT ACCESS TO IPCRenderer, PROCESS, REQUIRE, FS, CHILD_PROCESS, OR SQLITE
 * - NO GENERIC DISPATCH / NO EXECUTE STRING / NO RUN PROMPT
 */

import { contextBridge, ipcRenderer } from 'electron'
import type {
  GravitasDesktopBridge,
  HealthProjection,
  DesktopKernelSnapshot,
  KernelLifecycleStatus,
  SafeDesktopError,
  OverviewProjection,
  WorkHierarchyProjection,
  TaskDetailProjection,
  ExecutionProjection,
  VerificationProjection,
  ApprovalQueueProjection,
  SystemProjection,
  ActivityProjection,
  OperatorIntent,
  IntentResult,
  DesktopModelDispatchPayload,
  DesktopModelDispatchResult,
} from '../types.js'

const bridge: GravitasDesktopBridge = {
  getHealth: async (): Promise<HealthProjection> => {
    return ipcRenderer.invoke('gravitas:get-health')
  },

  getSnapshot: async (): Promise<DesktopKernelSnapshot> => {
    return ipcRenderer.invoke('gravitas:get-snapshot')
  },

  getOverview: async (): Promise<OverviewProjection> => {
    return ipcRenderer.invoke('gravitas:get-overview')
  },

  getWorkHierarchy: async (): Promise<WorkHierarchyProjection> => {
    return ipcRenderer.invoke('gravitas:get-work-hierarchy')
  },

  getTaskDetail: async (taskId: string): Promise<TaskDetailProjection | null> => {
    return ipcRenderer.invoke('gravitas:get-task-detail', taskId)
  },

  getExecution: async (): Promise<ExecutionProjection> => {
    return ipcRenderer.invoke('gravitas:get-execution')
  },

  getVerification: async (planId?: string): Promise<VerificationProjection | null> => {
    return ipcRenderer.invoke('gravitas:get-verification', planId)
  },

  getApprovalQueue: async (): Promise<ApprovalQueueProjection> => {
    return ipcRenderer.invoke('gravitas:get-approval-queue')
  },

  getSystem: async (): Promise<SystemProjection> => {
    return ipcRenderer.invoke('gravitas:get-system')
  },

  getActivity: async (): Promise<ActivityProjection> => {
    return ipcRenderer.invoke('gravitas:get-activity')
  },

  submitIntent: async (intent: OperatorIntent): Promise<IntentResult> => {
    return ipcRenderer.invoke('gravitas:submit-intent', intent)
  },

  getOnboarding: async () => {
    return ipcRenderer.invoke('gravitas:get-onboarding')
  },

  saveOnboarding: async (payload) => {
    return ipcRenderer.invoke('gravitas:save-onboarding', payload)
  },

  runDoctor: async () => {
    return ipcRenderer.invoke('gravitas:run-doctor')
  },

  configureProvider: async (payload) => {
    return ipcRenderer.invoke('gravitas:configure-provider', payload)
  },

  dispatchModel: async (payload: DesktopModelDispatchPayload): Promise<DesktopModelDispatchResult> => {
    return ipcRenderer.invoke('gravitas:dispatch-model', payload)
  },

  restartKernel: async (): Promise<boolean> => {
    return ipcRenderer.invoke('gravitas:restart-kernel')
  },

  requestHideWindow: async (): Promise<void> => {
    return ipcRenderer.invoke('gravitas:hide-window')
  },

  requestQuitApplication: async (): Promise<void> => {
    return ipcRenderer.invoke('gravitas:quit-app')
  },

  onKernelStatus: (callback: (status: KernelLifecycleStatus) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: KernelLifecycleStatus) => {
      callback(status)
    }
    ipcRenderer.on('gravitas:kernel-status', handler)
    return () => {
      ipcRenderer.removeListener('gravitas:kernel-status', handler)
    }
  },

  onKernelError: (callback: (err: SafeDesktopError) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, err: SafeDesktopError) => {
      callback(err)
    }
    ipcRenderer.on('gravitas:kernel-error', handler)
    return () => {
      ipcRenderer.removeListener('gravitas:kernel-error', handler)
    }
  },

  onProjectionUpdate: (callback: (projectionType: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, projectionType: string) => {
      callback(projectionType)
    }
    ipcRenderer.on('gravitas:projection-update', handler)
    return () => {
      ipcRenderer.removeListener('gravitas:projection-update', handler)
    }
  },

  // V1-F-01 / V1-F-02 Floating Companion & Unified Knowledge Hub
  executeAssistantCommand: async (payload) => {
    return ipcRenderer.invoke('gravitas:assistant-command', payload)
  },

  cancelAssistantCommand: async (commandId?: string) => {
    return ipcRenderer.invoke('gravitas:assistant-cancel', commandId)
  },

  saveIdea: async (input) => {
    return ipcRenderer.invoke('gravitas:vault-save-idea', input)
  },

  listIdeas: async (filter) => {
    return ipcRenderer.invoke('gravitas:vault-list-ideas', filter)
  },

  searchIdeas: async (query: string) => {
    return ipcRenderer.invoke('gravitas:vault-search-ideas', query)
  },

  getIdea: async (id: string) => {
    return ipcRenderer.invoke('gravitas:vault-get-idea', id)
  },

  updateIdea: async (input) => {
    return ipcRenderer.invoke('gravitas:vault-update-idea', input)
  },

  deleteIdea: async (id: string, confirmed: boolean) => {
    return ipcRenderer.invoke('gravitas:vault-delete-idea', { id, confirmed })
  },

  completeTask: async (id: string, completed: boolean) => {
    return ipcRenderer.invoke('gravitas:vault-complete-task', { id, completed })
  },

  linkKnowledgeItems: async (sourceId: string, targetId: string, relationship?: string) => {
    return ipcRenderer.invoke('gravitas:vault-link-items', { sourceId, targetId, relationship })
  },

  unlinkKnowledgeItems: async (sourceId: string, targetId: string) => {
    return ipcRenderer.invoke('gravitas:vault-unlink-items', { sourceId, targetId })
  },

  listStudySubjects: async () => {
    return ipcRenderer.invoke('gravitas:vault-list-subjects')
  },

  exportKnowledgeMarkdown: async (targetDirectory?: string) => {
    return ipcRenderer.invoke('gravitas:vault-export-markdown', targetDirectory)
  },

  importKnowledgeMarkdown: async (markdownContent: string) => {
    return ipcRenderer.invoke('gravitas:vault-import-markdown', markdownContent)
  },

  getVoiceSttStatus: async () => {
    return ipcRenderer.invoke('gravitas:voice-ptt-status')
  },

  startPushToTalk: async (userInitiated: boolean) => {
    return ipcRenderer.invoke('gravitas:voice-ptt-start', userInitiated)
  },

  stopPushToTalk: async (pttSessionId: string, audioSampleBase64?: string) => {
    return ipcRenderer.invoke('gravitas:voice-ptt-stop', { pttSessionId, audioSampleBase64 })
  },

  cancelPushToTalk: async () => {
    return ipcRenderer.invoke('gravitas:voice-ptt-cancel')
  },

  getAssistantCapabilities: async () => {
    return ipcRenderer.invoke('gravitas:assistant-capabilities')
  },

  submitCapabilityFeedback: async (capabilityId: string, rating: 'POSITIVE' | 'NEGATIVE', comment: string) => {
    return ipcRenderer.invoke('gravitas:assistant-feedback', { capabilityId, rating, comment })
  },

  executeStudyGuardianOperation: async (payload) => {
    return ipcRenderer.invoke('gravitas:study-guardian-op', payload)
  },

  selectInboxFolder: async () => {
    return ipcRenderer.invoke('gravitas:select-inbox-folder')
  },

  toggleCompanionWindow: async () => {
    return ipcRenderer.invoke('gravitas:toggle-companion')
  },

  hideCompanionWindow: async () => {
    return ipcRenderer.invoke('gravitas:hide-companion')
  },

  showMainWindow: async (target?: { surface: string; targetId?: string; tab?: string; assignmentId?: string }) => {
    return ipcRenderer.invoke('gravitas:show-main-window', target)
  },

  onNavigateTarget: (callback: (target: { surface: string; targetId?: string; tab?: string; assignmentId?: string }) => void) => {
    const sub = (_event: any, target: { surface: string; targetId?: string; tab?: string; assignmentId?: string }) => callback(target)
    ipcRenderer.on('gravitas:navigate-target', sub)
    return () => {
      ipcRenderer.removeListener('gravitas:navigate-target', sub)
    }
  },

  setTheme: async (theme: 'light' | 'dark') => {
    return ipcRenderer.invoke('gravitas:set-theme', theme)
  },

  onThemeChanged: (callback: (theme: 'light' | 'dark') => void) => {
    const sub = (_event: any, theme: 'light' | 'dark') => callback(theme)
    ipcRenderer.on('gravitas:theme-changed', sub)
    return () => {
      ipcRenderer.removeListener('gravitas:theme-changed', sub)
    }
  },
}

contextBridge.exposeInMainWorld('gravitasDesktop', bridge)
