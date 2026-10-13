import { validateDispatchPayload } from '../dispatchValidation.js'
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
  type OnboardingStateProjection,
  type SaveOnboardingPayload,
  type ConfigureProviderPayload,
  type ConfigureProviderResult,
  type ConfigureProviderRequest,
  type ConfigureProviderResponse,
  type DesktopModelDispatchPayload,
  type DesktopModelDispatchResult,
  type DispatchModelRequest,
  type DispatchModelResponse,
  type AssistantCommandPayload,
  type AssistantCommandResult,
  type CancelAssistantCommandResult,
  type IdeaRecord,
  type SaveIdeaInput,
  type UpdateIdeaInput,
  type DeleteIdeaResult,
  type IdeasVaultOperationResult,
  type VoiceSttStatusProjection,
  type PttSessionStartResult,
  type PttTranscriptionResult,
  type VoicePttOperationResult,
  type CapabilityRegistryResult,
} from '../types.js'

import {
  resolveGravitasDataRoot,
  readGravitasConfig,
  writeGravitasConfig,
  runGravitasDoctor,
  type DoctorReport,
} from '@gravitas/core'
import { ModelCredentialBroker } from '@gravitas/gateways'

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
  readonly dataRoot?: string
}

interface PendingRequestEntry {
  readonly requestId: string
  readonly resolve: (val: any) => void
  readonly reject: (err: any) => void
  readonly timer: NodeJS.Timeout
  readonly processRef: ProcessBridge
  readonly generation: number
  readonly kernelInstanceId?: string
  readonly opSequence?: number
  readonly providerId?: string
  readonly op?: 'CONFIGURE' | 'REVOKE'
}

export class DesktopSupervisor {
  private status: KernelLifecycleStatus = 'NOT_STARTED'
  private kernelProcess?: ProcessBridge
  private kernelPid: number = 0
  private kernelInstanceId?: string
  private kernelNodeVersion: string = ''
  private generation: number = 0
  private providerOpSequence: number = 0
  private executionProviderConfigured: boolean = false
  private readonly pendingRequests = new Map<string, PendingRequestEntry>()
  private readonly forkProcess: () => ProcessBridge
  private readonly onStatusChange?: (status: KernelLifecycleStatus) => void
  private onError?: (err: SafeDesktopError) => void
  private onProjectionUpdate?: (projectionType: string) => void
  private readonly protocolVersion: string
  private readonly dataRoot: string
  private isShuttingDown = false
  private isStarting = false

  constructor(opts: DesktopSupervisorOptions = {}) {
    this.forkProcess = opts.forkProcess ?? (() => {
      throw new Error('No forkProcess implementation provided to DesktopSupervisor')
    })
    this.onStatusChange = opts.onStatusChange
    this.onError = opts.onError
    this.onProjectionUpdate = opts.onProjectionUpdate
    this.protocolVersion = opts.protocolVersion ?? D0_PROTOCOL_VERSION
    this.dataRoot = opts.dataRoot ?? resolveGravitasDataRoot().dataRoot
  }

  public getDataRoot(): string {
    return this.dataRoot
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

  public getKernelInstanceId(): string | undefined {
    return this.kernelInstanceId
  }

  public getGeneration(): number {
    return this.generation
  }

  public getMainPid(): number {
    return process.pid
  }

  public isExecutionCredentialReady(providerId: string = 'nvidia-nim'): boolean {
    if (providerId !== 'nvidia-nim') return false
    if (this.status !== 'READY') return false
    if (!this.kernelProcess) return false
    if (!this.kernelInstanceId) return false
    if (!this.executionProviderConfigured) return false
    const handle = ModelCredentialBroker.getInstance().getCredentialHandle('nvidia-nim')
    return handle.isAvailable
  }

  private setStatus(status: KernelLifecycleStatus): void {
    if (this.status !== status) {
      this.status = status
      this.onStatusChange?.(status)
    }
  }

  private clearPendingRequestsForHost(reason: string, targetProcess?: ProcessBridge): void {
    for (const [reqId, entry] of this.pendingRequests.entries()) {
      if (!targetProcess || entry.processRef === targetProcess) {
        clearTimeout(entry.timer)
        this.pendingRequests.delete(reqId)
        entry.reject(new Error(`Kernel host terminated before responding: ${reason}`))
      }
    }
  }

  private handleHostTermination(
    eventProcess: ProcessBridge,
    reason: string,
    errorCode?: string,
    isError?: boolean
  ): void {
    // 1. Clear and reject pending requests for the terminating process
    this.clearPendingRequestsForHost(reason, eventProcess)

    // 2. Only mutate active state if the event originated from the CURRENT active process
    if (this.kernelProcess === eventProcess) {
      this.kernelProcess = undefined
      this.kernelInstanceId = undefined
      this.kernelPid = 0
      this.executionProviderConfigured = false

      if (this.isShuttingDown || this.status === 'STOPPING') {
        this.setStatus('STOPPED')
      } else if (isError) {
        this.setStatus('FAILED')
        this.onError?.({
          code: errorCode ?? 'KERNEL_PROCESS_ERROR',
          message: reason,
        })
      } else {
        this.setStatus('OFFLINE')
        this.onError?.({
          code: 'KERNEL_UNEXPECTED_EXIT',
          message: reason,
        })
      }
    }
  }

  public async start(): Promise<void> {
    if (this.kernelProcess || this.isStarting || this.status === 'STOPPING') {
      // Single supervisor: prevent duplicate Kernel creation, concurrent launches, or resurrection during shutdown
      return
    }

    this.isStarting = true
    this.isShuttingDown = false
    this.setStatus('STARTING')
    this.generation++
    this.kernelInstanceId = undefined
    this.executionProviderConfigured = false

    try {
      this.kernelProcess = this.forkProcess()
      this.kernelPid = this.kernelProcess.pid ?? 0
      const activeProcess = this.kernelProcess

      this.kernelProcess.on('message', (msg: unknown) => {
        if (this.kernelProcess === activeProcess) {
          this.handleKernelMessage(msg)
        }
      })

      this.kernelProcess.on('exit', (code: number) => {
        this.handleHostTermination(activeProcess, `Kernel process exited unexpectedly with code ${code}`)
      })

      this.kernelProcess.on('error', (err: Error) => {
        this.handleHostTermination(activeProcess, err.message, 'KERNEL_PROCESS_ERROR', true)
      })
    } catch (err) {
      this.kernelProcess = undefined
      this.setStatus('FAILED')
      this.onError?.({
        code: 'STARTUP_FAILURE',
        message: (err as Error).message,
      })
    } finally {
      this.isStarting = false
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
        this.kernelInstanceId = msg.kernelInstanceId
        this.setStatus('READY')
        void this.syncCredentialsToKernel().catch((err) => {
          this.onError?.({
            code: 'CREDENTIAL_SYNC_FAILED',
            message: `Credential synchronization error: ${(err as Error).message}`,
          })
        })
        break
      }

      case 'HEALTH_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg)
        }
        break
      }

      case 'SNAPSHOT_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.snapshot)
        }
        break
      }

      case 'GET_OVERVIEW_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_WORK_HIERARCHY_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_TASK_DETAIL_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_EXECUTION_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_VERIFICATION_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_APPROVAL_QUEUE_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_SYSTEM_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'GET_ACTIVITY_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.projection)
        }
        break
      }

      case 'OPERATOR_INTENT_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
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
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)
          p.resolve(true)
        }
        break
      }

      case 'CONFIGURE_PROVIDER_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)

          if (
            msg.providerId !== 'nvidia-nim' ||
            (p.kernelInstanceId && msg.kernelInstanceId !== p.kernelInstanceId) ||
            (p.generation !== undefined && msg.generation !== p.generation) ||
            (p.op && msg.op !== p.op)
          ) {
            p.reject(new Error(`Corrupted or mismatched CONFIGURE_PROVIDER_RESPONSE: op=${msg.op}, inst=${msg.kernelInstanceId}`))
            break
          }

          if (p.opSequence !== undefined && p.opSequence < this.providerOpSequence) {
            // Superseded response; caller resolves, but state mutation ignored
            p.resolve(msg)
            break
          }

          p.resolve(msg)
        } else {
          this.onError?.({
            code: 'UNSOLICITED_PROVIDER_ACK',
            message: `Received unexpected or duplicate provider ACK for requestId: ${msg.requestId}`,
          })
        }
        break
      }

      case 'DISPATCH_MODEL_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg)
        }
        break
      }

      case 'EXECUTE_ASSISTANT_COMMAND_RESPONSE':
      case 'CANCEL_ASSISTANT_COMMAND_RESPONSE':
      case 'IDEAS_VAULT_RESPONSE':
      case 'VOICE_PTT_RESPONSE':
      case 'CAPABILITY_REGISTRY_RESPONSE': {
        const p = this.pendingRequests.get(msg.requestId)
        if (p) {
          clearTimeout(p.timer)
          this.pendingRequests.delete(msg.requestId)
          p.resolve(msg.result)
        }
        break
      }

      case 'KERNEL_ERROR': {
        if (msg.correlationId && this.pendingRequests.has(msg.correlationId)) {
          const p = this.pendingRequests.get(msg.correlationId)!
          clearTimeout(p.timer)
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

  private sendToKernel<T>(
    msg: MainToKernelMessage,
    requestId: string,
    timeoutMs = 10000,
    meta?: {
      opSequence?: number
      providerId?: string
      op?: 'CONFIGURE' | 'REVOKE'
      generation?: number
      kernelInstanceId?: string
    }
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.kernelProcess || this.status === 'OFFLINE' || this.status === 'FAILED' || this.status === 'STOPPED') {
        return reject(new Error('Kernel process is not running or is offline'))
      }

      const activeProcess = this.kernelProcess
      const activeGen = this.generation
      const activeInst = this.kernelInstanceId

      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`Kernel request timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      this.pendingRequests.set(requestId, {
        requestId,
        resolve: (val) => {
          clearTimeout(timer)
          resolve(val)
        },
        reject: (err) => {
          clearTimeout(timer)
          reject(err)
        },
        timer,
        processRef: activeProcess,
        generation: meta?.generation ?? activeGen,
        kernelInstanceId: meta?.kernelInstanceId ?? activeInst,
        opSequence: meta?.opSequence,
        providerId: meta?.providerId,
        op: meta?.op,
      })

      activeProcess.postMessage(msg)
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
        modelIntelligenceSummary: {
          providerStatus: 'AUTH_REQUIRED',
          qualifiedModelsCount: 0,
          qualifiedModelIds: [],
          candidateModelsCount: 3,
          candidateModelIds: [
            'meta/llama-3.1-8b-instruct',
            'meta/llama-3.1-70b-instruct',
            'mistralai/mixtral-8x7b-instruct-v0.1',
          ],
          defaultModel: 'meta/llama-3.1-8b-instruct (unprobed)',
          costPolicy: 'STRICT_ZERO_DOLLAR_FREE',
          outOfPocketUsd: 0,
          paidFallbackPermitted: false,
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

  private async syncCredentialsToKernel(): Promise<boolean> {
    if (!this.kernelProcess || this.status !== 'READY') {
      this.executionProviderConfigured = false
      return false
    }
    const handle = ModelCredentialBroker.getInstance().getCredentialHandle('nvidia-nim')
    if (handle.isAvailable && handle.credentialRef) {
      const secret = ModelCredentialBroker.getInstance().resolveSecret(handle.credentialRef)
      if (secret) {
        const requestId = `req_sync_${randomUUID().slice(0, 8)}`
        const opSeq = ++this.providerOpSequence
        const currentGen = this.generation
        const currentInst = this.kernelInstanceId
        try {
          const res = await this.sendToKernel<ConfigureProviderResponse>(
            {
              type: 'CONFIGURE_PROVIDER_REQUEST',
              protocolVersion: D1_PROTOCOL_VERSION,
              requestId,
              expectedKernelPid: this.kernelPid,
              expectedKernelInstanceId: currentInst,
              kernelInstanceId: currentInst,
              op: 'CONFIGURE',
              generation: currentGen,
              providerId: 'nvidia-nim',
              apiKey: secret,
              timestamp: new Date().toISOString(),
            },
            requestId,
            3000,
            {
              opSequence: opSeq,
              providerId: 'nvidia-nim',
              op: 'CONFIGURE',
              generation: currentGen,
              kernelInstanceId: currentInst,
            }
          )

          if (
            res.success &&
            res.providerId === 'nvidia-nim' &&
            res.kernelInstanceId === currentInst &&
            res.generation === currentGen &&
            opSeq === this.providerOpSequence
          ) {
            this.executionProviderConfigured = true
            return true
          } else {
            this.executionProviderConfigured = false
            this.onError?.({
              code: 'CREDENTIAL_SYNC_REJECTED',
              message: `Execution host rejected credential synchronization: ${res.error || res.maskedHandle}`,
            })
            return false
          }
        } catch (err) {
          this.executionProviderConfigured = false
          this.onError?.({
            code: 'CREDENTIAL_SYNC_FAILED',
            message: `Failed to synchronize credentials to execution host: ${(err as Error).message}`,
          })
          return false
        }
      }
    }
    this.executionProviderConfigured = false
    return false
  }

  public async getOnboarding(): Promise<OnboardingStateProjection> {
    const cfg = readGravitasConfig(this.dataRoot)
    const paths = resolveGravitasDataRoot(this.dataRoot)
    const isTest = process.env.NODE_ENV === 'test' || paths.isTestOverride
    return {
      completed: cfg.onboarding.completed,
      completedAt: cfg.onboarding.completedAt,
      step: cfg.onboarding.step,
      operatingMode: cfg.onboarding.operatingMode,
      selectedHarnesses: cfg.onboarding.selectedHarnesses,
      providerConfigured: this.isExecutionCredentialReady('nvidia-nim'),
      dataRoot: this.dataRoot,
      isTest,
    }
  }

  public async saveOnboarding(payload: SaveOnboardingPayload): Promise<boolean> {
    try {
      const current = readGravitasConfig(this.dataRoot)
      const step = (payload.step as any) ?? current.onboarding.step
      writeGravitasConfig(this.dataRoot, {
        onboarding: {
          ...current.onboarding,
          completed: payload.completed,
          completedAt: payload.completed ? (current.onboarding.completedAt ?? new Date().toISOString()) : undefined,
          step,
          operatingMode: payload.operatingMode ?? current.onboarding.operatingMode,
          selectedHarnesses: payload.selectedHarnesses ?? current.onboarding.selectedHarnesses,
        },
      })
      return true
    } catch {
      return false
    }
  }

  public async runDoctor(): Promise<DoctorReport> {
    return runGravitasDoctor({ customDataRoot: this.dataRoot })
  }

  public async configureProvider(payload: ConfigureProviderPayload): Promise<ConfigureProviderResult> {
    if (!payload || typeof payload !== 'object' || typeof payload.providerId !== 'string' ||
        (payload.apiKey !== undefined && (typeof payload.apiKey !== 'string' || payload.apiKey.length > 4096 || /[\r\n\x00]/.test(payload.apiKey)))) throw new Error('Invalid provider configuration')
    if (payload.providerId !== 'nvidia-nim') {
      return {
        success: false,
        providerId: payload.providerId,
        maskedHandle: '[UNSUPPORTED_PROVIDER]',
        status: 'AUTH_REQUIRED',
      }
    }

    const key = (payload.apiKey || '').trim()
    const op: 'CONFIGURE' | 'REVOKE' = key ? 'CONFIGURE' : 'REVOKE'
    const opSeq = ++this.providerOpSequence
    const currentGeneration = this.generation
    const currentInstanceId = this.kernelInstanceId
    const currentProcess = this.kernelProcess

    if (op === 'REVOKE') {
      ModelCredentialBroker.getInstance().clearSecret('nvidia-nim')
      this.executionProviderConfigured = false
      const current = readGravitasConfig(this.dataRoot)
      writeGravitasConfig(this.dataRoot, {
        onboarding: {
          ...current.onboarding,
          providerConfigured: false,
        },
      })

      // Forward revocation to execution host if active
      if (currentProcess && this.status === 'READY') {
        const requestId = `req_prov_clear_${randomUUID().slice(0, 8)}`
        try {
          await this.sendToKernel<ConfigureProviderResponse>(
            {
              type: 'CONFIGURE_PROVIDER_REQUEST',
              protocolVersion: D1_PROTOCOL_VERSION,
              requestId,
              expectedKernelPid: this.kernelPid,
              expectedKernelInstanceId: currentInstanceId,
              kernelInstanceId: currentInstanceId,
              op: 'REVOKE',
              generation: currentGeneration,
              providerId: 'nvidia-nim',
              apiKey: '',
              timestamp: new Date().toISOString(),
            },
            requestId,
            3000,
            {
              opSequence: opSeq,
              providerId: 'nvidia-nim',
              op: 'REVOKE',
              generation: currentGeneration,
              kernelInstanceId: currentInstanceId,
            }
          )
        } catch {
          // Revocation acknowledged locally even if execution process unreachable
        }
      }

      return {
        success: true,
        providerId: 'nvidia-nim',
        maskedHandle: '[NO_CREDENTIAL]',
        status: 'AUTH_REQUIRED',
      }
    }

    // Register into volatile in-memory broker only in Main process (zero disk persistence)
    ModelCredentialBroker.getInstance().registerSecret('nvidia-nim', key)
    const handle = ModelCredentialBroker.getInstance().getCredentialHandle('nvidia-nim')
    const current = readGravitasConfig(this.dataRoot)
    writeGravitasConfig(this.dataRoot, {
      onboarding: {
        ...current.onboarding,
        providerConfigured: true,
      },
    })

    // Forward to execution process if active
    if (currentProcess && this.status === 'READY') {
      const requestId = `req_prov_set_${randomUUID().slice(0, 8)}`
      try {
        const kernelRes = await this.sendToKernel<ConfigureProviderResponse>(
          {
            type: 'CONFIGURE_PROVIDER_REQUEST',
            protocolVersion: D1_PROTOCOL_VERSION,
            requestId,
            expectedKernelPid: this.kernelPid,
            expectedKernelInstanceId: currentInstanceId,
            kernelInstanceId: currentInstanceId,
            op: 'CONFIGURE',
            generation: currentGeneration,
            providerId: 'nvidia-nim',
            apiKey: key,
            timestamp: new Date().toISOString(),
          },
          requestId,
          5000,
          {
            opSequence: opSeq,
            providerId: 'nvidia-nim',
            op: 'CONFIGURE',
            generation: currentGeneration,
            kernelInstanceId: currentInstanceId,
          }
        )

        if (
          !kernelRes.success ||
          kernelRes.providerId !== 'nvidia-nim' ||
          kernelRes.kernelInstanceId !== this.kernelInstanceId ||
          kernelRes.generation !== this.generation ||
          (this.kernelPid && kernelRes.kernelPid !== this.kernelPid)
        ) {
          this.executionProviderConfigured = false
          return {
            success: false,
            providerId: 'nvidia-nim',
            maskedHandle: kernelRes.maskedHandle || '[HANDOFF_REJECTED]',
            status: 'AUTH_REQUIRED',
          }
        }

        if (opSeq === this.providerOpSequence) {
          this.executionProviderConfigured = true
        }
      } catch {
        this.executionProviderConfigured = false
        return {
          success: false,
          providerId: 'nvidia-nim',
          maskedHandle: '[IPC_HANDOFF_FAILED]',
          status: 'AUTH_REQUIRED',
        }
      }
    } else {
      this.executionProviderConfigured = false
    }

    return {
      success: true,
      providerId: 'nvidia-nim',
      maskedHandle: handle.redactedPreview,
      status: 'METADATA_VALIDATED',
    }
  }

  public async dispatchModel(payload: DesktopModelDispatchPayload): Promise<DesktopModelDispatchResult> {
    validateDispatchPayload(payload)
    if (this.status !== 'READY') {
      return {
        success: false,
        workSessionId: payload.workSessionId ?? '',
        runId: '',
        taskId: '',
        executionId: '',
        provider: 'nvidia-nim',
        requestedModel: payload.modelId ?? 'meta/llama-3.1-8b-instruct',
        actualModel: payload.modelId ?? 'meta/llama-3.1-8b-instruct',
        terminationStatus: 'ERROR',
        errorTaxonomy: 'KERNEL_OFFLINE',
        errorMessage: `Kernel is not ready (status=${this.status})`,
      }
    }

    const requestId = randomUUID()
    const reqMsg: DispatchModelRequest = {
      type: 'DISPATCH_MODEL_REQUEST',
      protocolVersion: this.protocolVersion,
      requestId,
      timestamp: new Date().toISOString(),
      workSessionId: payload.workSessionId,
      modelId: payload.modelId,
      prompt: payload.prompt,
      messages: payload.messages,
      maxTokens: payload.maxTokens,
      temperature: payload.temperature,
      timeoutMs: payload.timeoutMs,
    }

    const timeout = (payload.timeoutMs ?? 30000) + 5000
    return this.sendToKernel<DispatchModelResponse>(reqMsg, requestId, timeout)
  }

  // ─── V1-F-01 Floating Companion & Ideas Vault Methods ──────────────────────

  public async executeAssistantCommand(payload: AssistantCommandPayload): Promise<AssistantCommandResult> {
    if (!payload || typeof payload.input !== 'string' || payload.input.length > 32768) {
      throw new Error('Invalid assistant command payload')
    }
    const requestId = `req_asst_cmd_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<AssistantCommandResult>(
      {
        type: 'EXECUTE_ASSISTANT_COMMAND_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        commandId: payload.commandId,
        input: payload.input,
        timestamp: new Date().toISOString(),
      },
      requestId,
      20000
    )
  }

  public async cancelAssistantCommand(commandId?: string): Promise<CancelAssistantCommandResult> {
    const requestId = `req_asst_cancel_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<CancelAssistantCommandResult>(
      {
        type: 'CANCEL_ASSISTANT_COMMAND_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        commandId,
        timestamp: new Date().toISOString(),
      },
      requestId,
      5000
    )
  }

  public async saveIdea(input: SaveIdeaInput): Promise<IdeaRecord> {
    const requestId = `req_vault_save_${randomUUID().slice(0, 8)}`
    const res = await this.sendToKernel<IdeasVaultOperationResult>(
      {
        type: 'IDEAS_VAULT_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        payload: { action: 'SAVE', input },
        timestamp: new Date().toISOString(),
      },
      requestId
    )
    if (!res.success || !res.idea) {
      throw new Error(res.errorMessage || 'Failed to save idea')
    }
    return res.idea
  }

  public async listIdeas(): Promise<readonly IdeaRecord[]> {
    const requestId = `req_vault_list_${randomUUID().slice(0, 8)}`
    const res = await this.sendToKernel<IdeasVaultOperationResult>(
      {
        type: 'IDEAS_VAULT_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        payload: { action: 'LIST' },
        timestamp: new Date().toISOString(),
      },
      requestId
    )
    if (!res.success) {
      throw new Error(res.errorMessage || 'Failed to list ideas')
    }
    return res.ideas ?? []
  }

  public async searchIdeas(query: string): Promise<readonly IdeaRecord[]> {
    const requestId = `req_vault_search_${randomUUID().slice(0, 8)}`
    const res = await this.sendToKernel<IdeasVaultOperationResult>(
      {
        type: 'IDEAS_VAULT_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        payload: { action: 'SEARCH', query },
        timestamp: new Date().toISOString(),
      },
      requestId
    )
    if (!res.success) {
      throw new Error(res.errorMessage || 'Failed to search ideas')
    }
    return res.ideas ?? []
  }

  public async getIdea(id: string): Promise<IdeaRecord | null> {
    const requestId = `req_vault_get_${randomUUID().slice(0, 8)}`
    const res = await this.sendToKernel<IdeasVaultOperationResult>(
      {
        type: 'IDEAS_VAULT_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        payload: { action: 'GET', id },
        timestamp: new Date().toISOString(),
      },
      requestId
    )
    if (!res.success) {
      throw new Error(res.errorMessage || 'Failed to get idea')
    }
    return res.idea ?? null
  }

  public async updateIdea(input: UpdateIdeaInput): Promise<IdeaRecord> {
    const requestId = `req_vault_upd_${randomUUID().slice(0, 8)}`
    const res = await this.sendToKernel<IdeasVaultOperationResult>(
      {
        type: 'IDEAS_VAULT_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        payload: { action: 'UPDATE', input },
        timestamp: new Date().toISOString(),
      },
      requestId
    )
    if (!res.success || !res.idea) {
      throw new Error(res.errorMessage || 'Failed to update idea')
    }
    return res.idea
  }

  public async deleteIdea(id: string, confirmed: boolean): Promise<DeleteIdeaResult> {
    if (confirmed !== true) {
      throw new Error('Deletion requires explicit user confirmation (confirmed === true)')
    }
    const requestId = `req_vault_del_${randomUUID().slice(0, 8)}`
    const res = await this.sendToKernel<IdeasVaultOperationResult>(
      {
        type: 'IDEAS_VAULT_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        payload: { action: 'DELETE', id, confirmed },
        timestamp: new Date().toISOString(),
      },
      requestId
    )
    if (!res.deleteResult) {
      throw new Error(res.errorMessage || 'Failed to delete idea')
    }
    return res.deleteResult
  }

  public async getVoiceSttStatus(): Promise<VoiceSttStatusProjection> {
    const requestId = `req_ptt_stat_${randomUUID().slice(0, 8)}`
    const res = await this.sendToKernel<VoicePttOperationResult>(
      {
        type: 'VOICE_PTT_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        payload: { action: 'STATUS' },
        timestamp: new Date().toISOString(),
      },
      requestId
    )
    return res.statusProjection
  }

  public async startPushToTalk(userInitiated: boolean): Promise<PttSessionStartResult> {
    if (userInitiated !== true) {
      throw new Error('Silent microphone capture is forbidden: Push-to-Talk requires explicit userInitiated=true')
    }
    const requestId = `req_ptt_start_${randomUUID().slice(0, 8)}`
    const res = await this.sendToKernel<VoicePttOperationResult>(
      {
        type: 'VOICE_PTT_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        payload: { action: 'START', userInitiated: true },
        timestamp: new Date().toISOString(),
      },
      requestId
    )
    if (!res.startResult) {
      throw new Error('Failed to start Push-to-Talk session')
    }
    return res.startResult
  }

  public async stopPushToTalk(pttSessionId: string, audioSampleBase64?: string): Promise<PttTranscriptionResult> {
    const requestId = `req_ptt_stop_${randomUUID().slice(0, 8)}`
    const res = await this.sendToKernel<VoicePttOperationResult>(
      {
        type: 'VOICE_PTT_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        payload: { action: 'STOP', pttSessionId, audioSampleBase64 },
        timestamp: new Date().toISOString(),
      },
      requestId
    )
    if (!res.transcriptionResult) {
      throw new Error('Failed to stop Push-to-Talk session')
    }
    return res.transcriptionResult
  }

  public async cancelPushToTalk(): Promise<VoiceSttStatusProjection> {
    const requestId = `req_ptt_cancel_${randomUUID().slice(0, 8)}`
    const res = await this.sendToKernel<VoicePttOperationResult>(
      {
        type: 'VOICE_PTT_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        payload: { action: 'CANCEL' },
        timestamp: new Date().toISOString(),
      },
      requestId
    )
    return res.statusProjection
  }

  public async getAssistantCapabilities(): Promise<CapabilityRegistryResult> {
    const requestId = `req_cap_list_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<CapabilityRegistryResult>(
      {
        type: 'CAPABILITY_REGISTRY_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        payload: { action: 'LIST' },
        timestamp: new Date().toISOString(),
      },
      requestId
    )
  }

  public async submitCapabilityFeedback(
    capabilityId: string,
    rating: 'POSITIVE' | 'NEGATIVE',
    comment: string
  ): Promise<CapabilityRegistryResult> {
    const requestId = `req_cap_fb_${randomUUID().slice(0, 8)}`
    return this.sendToKernel<CapabilityRegistryResult>(
      {
        type: 'CAPABILITY_REGISTRY_REQUEST',
        protocolVersion: D1_PROTOCOL_VERSION,
        requestId,
        payload: { action: 'FEEDBACK', capabilityId, rating, comment },
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
    this.executionProviderConfigured = false
    this.clearPendingRequestsForHost('Supervisor shutdown initiated', this.kernelProcess)

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
    this.kernelInstanceId = undefined
    this.isShuttingDown = false
  }
}
