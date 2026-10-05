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
}

contextBridge.exposeInMainWorld('gravitasDesktop', bridge)
