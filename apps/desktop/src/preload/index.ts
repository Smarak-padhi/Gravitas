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

  // V1-F-01 Floating Companion & Ideas Vault
  executeAssistantCommand: async (payload) => {
    return ipcRenderer.invoke('gravitas:assistant-command', payload)
  },

  cancelAssistantCommand: async (commandId?: string) => {
    return ipcRenderer.invoke('gravitas:assistant-cancel', commandId)
  },

  saveIdea: async (input) => {
    return ipcRenderer.invoke('gravitas:vault-save-idea', input)
  },

  listIdeas: async () => {
    return ipcRenderer.invoke('gravitas:vault-list-ideas')
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

  toggleCompanionWindow: async () => {
    return ipcRenderer.invoke('gravitas:toggle-companion')
  },

  hideCompanionWindow: async () => {
    return ipcRenderer.invoke('gravitas:hide-companion')
  },
}

contextBridge.exposeInMainWorld('gravitasDesktop', bridge)
