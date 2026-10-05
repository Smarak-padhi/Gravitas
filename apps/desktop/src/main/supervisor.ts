/**
 * GRAVITAS D0/D1 — Desktop Supervisor
 *
 * Runs in Electron Main Process.
 * Supervises window lifecycle, utilityProcess lifecycle, and typed IPC routing.
 *
 * Invariant: DesktopSupervisor is NOT canonical state authority.
 */

import { randomUUID } from 'node:crypto'
import {
  D0_PROTOCOL_VERSION,
  D1_PROTOCOL_VERSION,
  type KernelLifecycleStatus,
  type HealthProjection,
  type DesktopKernelSnapshot,
  type SafeDesktopError,
  type MainToKernelMessage,
  type KernelToMainMessage,
  type HealthResponse,
  type OverviewProjection,
  type WorkHierarchyProjection,
  type TaskDetailProjection,
  type ExecutionProjection,
  type VerificationProjection,
  type ApprovalQueueProjection,
  type SystemProjection,
  type ActivityProjection,
  type OperatorIntent,
  type IntentResult,
} from '../types.js'

export interface ProcessBridge {
  postMessage(msg: unknown): void
  on(event: 'message', listener: (msg: unknown) => void): void
  on(event: 'exit', listener: (code: number) => void): void
  on(event: 'error', listener: (err: Error) => void): void
  kill?(): void
  readonly pid?: number
}

export interface DesktopSupervisorOptions {
  readonly forkProcess?: () => ProcessBridge
  readonly onStatusChange?: (status: KernelLifecycleStatus) => void
  readonly onError?: (err: SafeDesktopError) => void
  readonly onProjectionUpdate?: (projectionType: string) => void
  readonly protocolVersion?: string
}

export class DesktopSupervisor {
  private status: KernelLifecycleStatus = 'NOT_STARTED'
  private kernelProcess?: ProcessBridge
  private kernelPid: number = 0
  private kernelNodeVersion: string = ''
  private readonly pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>()
  private readonly forkProcess: () => ProcessBridge
  private readonly onStatusChange?: (status: KernelLifecycleStatus) => void
  private onError?: (err: SafeDesktopError) => void
  private onProjectionUpdate?: (projectionType: string) => void
  private readonly protocolVersion: string
  private isShuttingDown = false

  constructor(opts: DesktopSupervisorOptions = {}) {
    this.forkProcess = opts.forkProcess ?? (() => {
      throw new Error('No forkProcess implementation provided to DesktopSupervisor')
    })
    this.onStatusChange = opts.onStatusChange
    this.onError = opts.onError
    this.onProjectionUpdate = opts.onProjectionUpdate
    this.protocolVersion = opts.protocolVersion ?? D0_PROTOCOL_VERSION
  }

  public setOnProjectionUpdate(listener: (projectionType: string) => void): void {
    this.onProjectionUpdate = listener
  }

  public getStatus(): KernelLifecycleStatus {
    return this.status
  }

  public getKernelPid(): number {
    return this.kernelPid
  }

  public getMainPid(): number {
    return process.pid
  }

  private setStatus(status: KernelLifecycleStatus): void {
    if (this.status !== status) {
      this.status = status
      this.onStatusChange?.(status)
    }
  }

  public async start(): Promise<void> {
    if (this.kernelProcess) {
      // Single supervisor: prevent duplicate Kernel creation
      return
    }

    this.setStatus('STARTING')

    try {
      this.kernelProcess = this.forkProcess()
      this.kernelPid = this.kernelProcess.pid ?? 0

      this.kernelProcess.on('message', (msg: unknown) => {
        this.handleKernelMessage(msg)
      })

      this.kernelProcess.on('exit', (code: number) => {
        if (!this.isShuttingDown) {
          this.setStatus('OFFLINE')
          this.onError?.({
            code: 'KERNEL_UNEXPECTED_EXIT',
            message: `Kernel process exited unexpectedly with code ${code}`,
          })
        } else {
          this.setStatus('STOPPED')
        }
      })

      this.kernelProcess.on('error', (err: Error) => {
        this.setStatus('FAILED')
        this.onError?.({
          code: 'KERNEL_PROCESS_ERROR',
          message: err.message,
        })
      })
    } catch (err) {
      this.setStatus('FAILED')
      this.onError?.({
        code: 'STARTUP_FAILURE',
        message: (err as Error).message,
      })
    }
  }

  private handleKernelMessage(raw: unknown): void {
    if (!raw || typeof raw !== 'object') {
      this.onError?.({ code: 'MALFORMED_IPC', message: 'Received non-object message from Kernel' })
      return
    }

    const msg = raw as KernelToMainMessage

    switch (msg.type) {
      case 'HELLO': {
        this.kernelPid = msg.kernelPid
        this.kernelNodeVersion = msg.nodeVersion
        this.setStatus('READY')
        break
      }

      case 'HEALTH_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg)
        }
        break
      }

      case 'SNAPSHOT_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.snapshot)
        }
        break
      }

      case 'GET_OVERVIEW_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_WORK_HIERARCHY_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_TASK_DETAIL_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_EXECUTION_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_VERIFICATION_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_APPROVAL_QUEUE_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_SYSTEM_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_ACTIVITY_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'OPERATOR_INTENT_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.result)
        }
        break
      }

      case 'PROJECTION_UPDATED': {
        this.onProjectionUpdate?.(msg.projectionType)
        break
      }

      case 'SHUTDOWN_ACK': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          this.pendingRequests.delete(msg.requestId)
          p.resolve(true)
        }
        break
      }

      case 'KERNEL_ERROR': {
        if (msg.correlationId && this.pendingRequests.has(msg.correlationId)) {
          const p = this.pendingRequests.get(msg.correlationId)!
          this.pendingRequests.delete(msg.correlationId)
          p.reject(new Error(msg.safeMessage))
        }
        this.onError?.({ code: msg.errorCode, message: msg.safeMessage })
        break
      }

      default: {
        this.onError?.({ code: 'UNKNOWN_MESSAGE', message: `Unknown message from kernel` })
      }
    }
  }

  private sendToKernel<T>(msg: MainToKernelMessage, requestId: string, timeoutMs = 10000): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.kernelProcess || this.status === 'OFFLINE' || this.status === 'FAILED' || this.status === 'STOPPED') {
        return reject(new Error('Kernel process is not running or is offline'))
      }

      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`Kernel request timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      this.pendingRequests.set(requestId, {
        resolve: (val) => {
          clearTimeout(timer)
          resolve(val)
        },
        reject: (err) => {
          clearTimeout(timer)
          reject(err)
        },
      })

      this.kernelProcess.postMessage(msg)
    })
  }

  public async getHealth(): Promise<HealthProjection> {
    if (this.status !== 'READY') {
      return {
        status: this.status,
        desktopRuntime: 'Electron',
        protocolVersion: this.protocolVersion,
        kernelPid: this.kernelPid,
        mainPid: process.pid,
        nodeVersion: this.kernelNodeVersion || process.version,
        activeSessionCount: 0,
      }
    }

    const requestId = `req_health_${randomUUID().slice(0, 8)}`
    const res = await this.sendToKernel<HealthResponse>(
      {
        type: 'HEALTH_REQUEST',
        protocolVersion: this.protocolVersion,
        requestId,
        timestamp: new Date().toISOString(),
      },
      requestId
    )

    return {
      status: res.status,
      desktopRuntime: 'Electron',
      protocolVersion: res.protocolVersion,
      kernelPid: res.kernelPid,
      mainPid: process.pid,
      nodeVersion: res.nodeVersion,
      activeSessionCount: res.activeSessionCount,
      safeDiagnostic: res.safeDiagnosticContext,
    }
  }

  public async getSnapshot(): Promise<DesktopKernelSnapshot> {
    const requestId = `req_snap_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<DesktopKernelSnapshot>(
      {
        type: 'SNAPSHOT_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        timestamp: new Date().toISOString(),
      },
      requestId
    )
  }

  public async getOverview(): Promise<OverviewProjection> {
    if (this.status !== 'READY') {
      return {
        kernelStatus: this.status,
        activeWorkSessionsCount: 0,
        activeRunsCount: 0,
        activeTasksCount: 0,
        waitingApprovalCount: 0,
        failedOrRecoveryCount: 0,
        runningExecutionsCount: 0,
        blockedAuthorityCount: 0,
        blockedCostCount: 0,
        generatedAt: new Date().toISOString(),
        canonicalRevision: 0,
        recentActivitySummary: [`[KERNEL] Status is ${this.status} (no fabricated data)`],
      }
    }

    const requestId = `req_overview_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<OverviewProjection>(
      {
        type: 'GET_OVERVIEW_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        timestamp: new Date().toISOString(),
      },
      requestId
    )
  }

  public async getWorkHierarchy(): Promise<WorkHierarchyProjection> {
    if (this.status !== 'READY') {
      return {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: new Date().toISOString(),
        sessions: [],
      }
    }

    const requestId = `req_work_hier_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<WorkHierarchyProjection>(
      {
        type: 'GET_WORK_HIERARCHY_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        timestamp: new Date().toISOString(),
      },
      requestId
    )
  }

  public async getTaskDetail(taskId: string): Promise<TaskDetailProjection | null> {
    if (this.status !== 'READY') return null

    const requestId = `req_task_detail_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<TaskDetailProjection | null>(
      {
        type: 'GET_TASK_DETAIL_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        taskId,
        timestamp: new Date().toISOString(),
      },
      requestId
    )
  }

  public async getExecution(): Promise<ExecutionProjection> {
    if (this.status !== 'READY') {
      return {
        generatedAt: new Date().toISOString(),
        executions: [],
      }
    }

    const requestId = `req_exec_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<ExecutionProjection>(
      {
        type: 'GET_EXECUTION_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        timestamp: new Date().toISOString(),
      },
      requestId
    )
  }

  public async getVerification(planId?: string): Promise<VerificationProjection | null> {
    if (this.status !== 'READY') return null

    const requestId = `req_verif_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<VerificationProjection | null>(
      {
        type: 'GET_VERIFICATION_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        planId,
        timestamp: new Date().toISOString(),
      },
      requestId
    )
  }

  public async getApprovalQueue(): Promise<ApprovalQueueProjection> {
    if (this.status !== 'READY') {
      return {
        generatedAt: new Date().toISOString(),
        totalPending: 0,
        items: [],
      }
    }

    const requestId = `req_appr_queue_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<ApprovalQueueProjection>(
      {
        type: 'GET_APPROVAL_QUEUE_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        timestamp: new Date().toISOString(),
      },
      requestId
    )
  }

  public async getSystem(): Promise<SystemProjection> {
    if (this.status !== 'READY') {
      return {
        supervisorStatus: this.status,
        kernelStatus: this.status,
        kernelPid: this.kernelPid,
        mainPid: process.pid,
        protocolVersion: D1_PROTOCOL_VERSION,
        electronVersion: process.versions?.electron ?? 'N/A',
        nodeVersion: process.version,
        dataRootSanitized: '[OFFLINE]',
        schemaVersion: 1,
        activeHarnessCount: 0,
        harnessReadinessSummary: {},
        toolRegistrySummary: [],
        costPolicySummary: {
          defaultTier: 'FREE_OPEN_SOURCE_LOCAL',
          paidFallbackPermitted: false,
          autonomousPaymentAuthority: false,
        },
        recentErrors: ['Kernel offline'],
      }
    }

    const requestId = `req_system_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<SystemProjection>(
      {
        type: 'GET_SYSTEM_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        timestamp: new Date().toISOString(),
      },
      requestId
    )
  }

  public async getActivity(): Promise<ActivityProjection> {
    if (this.status !== 'READY') {
      return {
        generatedAt: new Date().toISOString(),
        events: [],
      }
    }

    const requestId = `req_activity_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<ActivityProjection>(
      {
        type: 'GET_ACTIVITY_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        timestamp: new Date().toISOString(),
      },
      requestId
    )
  }

  public async submitIntent(intent: OperatorIntent): Promise<IntentResult> {
    if (this.status !== 'READY') {
      return {
        correlationId: intent.correlationId || randomUUID(),
        success: false,
        targetId: intent.targetId || 'UNKNOWN',
        intentType: intent.intentType || 'UNKNOWN',
        status: 'DENIED',
        safeMessage: 'Cannot submit operator intent while Kernel is offline or not ready.',
        authorizesMerge: false,
        authorizesRelease: false,
        authorizesDeploy: false,
      }
    }

    const requestId = `req_intent_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<IntentResult>(
      {
        type: 'OPERATOR_INTENT_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        intent,
        timestamp: new Date().toISOString(),
      },
      requestId
    )
  }

  public async shutdown(): Promise<void> {
    if (this.status === 'STOPPED') {
      return
    }
    if (this.isShuttingDown) {
      // Already shutting down; avoid duplicate shutdown requests
      return
    }
    this.isShuttingDown = true
    this.setStatus('STOPPING')

    if (this.kernelProcess) {
      try {
        const requestId = `req_shut_${randomUUID().slice(0, 8)}`
        await this.sendToKernel(
          {
            type: 'SHUTDOWN_REQUEST',
            protocolVersion: D1_PROTOCOL_VERSION,
            requestId,
            timestamp: new Date().toISOString(),
          },
          requestId,
          3000
        )
      } catch {
        // Fallback kill if graceful shutdown timed out
        this.kernelProcess.kill?.()
      }
    }

    this.setStatus('STOPPED')
    this.kernelProcess = undefined
  }
}
