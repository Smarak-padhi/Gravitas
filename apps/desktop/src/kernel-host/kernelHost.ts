import { validateDispatchPayload } from '../dispatchValidation.js'
/**
 * GRAVITAS D0/D1 — Kernel Host Engine
 *
 * Runs inside Electron utilityProcess (or Node child process).
 * Owns the single canonical writer connection to WorkSessionKernel.
 * Responds to bounded IPC messages and emits typed lifecycle events.
 *
 * Invariants:
 * - KERNEL = CANONICAL_STATE_AUTHORITY
 * - RENDERER != PRIVILEGED_KERNEL
 * - UI != CANONICAL_STATE
 * - HUMAN_APPROVAL != AUTO_MERGE / AUTO_DEPLOY / AUTO_RELEASE
 * - ROLE != EXECUTOR != HARNESS != MODEL != PROVIDER != GATEWAY != PROCESS
 * - HASH != SIGNATURE
 * - EVIDENCE_BUNDLE != TRUSTED_EVIDENCE
 */

import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { WorkSessionKernel, type WorkSessionSnapshot } from '@gravitas/core/kernel'
import { resolveGravitasDataRoot, readGravitasConfig } from '@gravitas/core'
import {
  authorizeOfflineNvidiaDispatch,
  ModelCapabilityHistory,
  ModelCredentialBroker,
  ModelRegistry,
  ModelRouter,
  NvidiaNimAdapter,
  getNvidiaProviderDescriptor,
  NVIDIA_PROVIDER_ID,
  verifyK3DispatchGrant,
  type K3DispatchCapabilityGrant,
  type ProviderChatMessage,
  type ProviderInferenceRequest,
  type TaskModelRequirements,
} from '@gravitas/gateways'
import {
  D0_PROTOCOL_VERSION,
  D1_PROTOCOL_VERSION,
  D2_PROTOCOL_VERSION,
  D3_PROTOCOL_VERSION,
  D4_PROTOCOL_VERSION,
  type KernelLifecycleStatus,
  type MainToKernelMessage,
  type KernelToMainMessage,
  type HealthResponse,
  type SnapshotResponse,
  type DesktopKernelSnapshot,
  type DesktopWorkSessionSummary,
  type OverviewProjection,
  type WorkHierarchyProjection,
  type WorkHierarchySessionItem,
  type WorkHierarchyRunItem,
  type WorkHierarchyTaskItem,
  type TaskDetailProjection,
  type ExecutionProjection,
  type ExecutionItem,
  type VerificationProjection,
  type ApprovalQueueProjection,
  type ApprovalQueueItem,
  type SystemProjection,
  type ActivityProjection,
  type ActivityEventItem,
  type OperatorIntent,
  type IntentResult,
  type RecordHumanDecisionIntent,
  type CancelTaskIntent,
  type ConfigureProviderRequest,
  type ConfigureProviderResponse,
  type DispatchModelRequest,
  type DispatchModelResponse,
  type DesktopModelDispatchResult,
  type ExecuteAssistantCommandRequest,
  type CancelAssistantCommandRequest,
  type IdeasVaultOperationRequest,
  type StudyGuardianOperationRequest,
  type VoicePttRequest,
  type CapabilityRegistryRequest,
  type AssistantCommandResult,
  type CancelAssistantCommandResult,
  type IdeasVaultOperationResult,
  type StudyGuardianOperationResult,
  type VoicePttOperationResult,
  type CapabilityRegistryResult,
} from '../types.js'
import {
  IdeasVaultStore,
  AssistantCapabilityRegistry,
  parseAssistantCommand,
  AllowlistedAppLauncher,
  OfflineVoiceController,
  ICloudAssignmentInbox,
  StudyGuardianService,
  resolveSemesterSubjectQuery,
  OnboardingService,
  type CustomAppSpawnFn,
  type LocalOfflineTranscriberFn,
  type AuthorizedLocalAnswerGenerator,
} from '../assistant/index.js'

export interface KernelHostOptions {
  readonly dbPath?: string
  readonly dataRoot?: string
  readonly onMessage?: (msg: KernelToMainMessage) => void
  readonly initialDiagnosticContext?: string
  readonly pid?: number
  readonly kernelInstanceId?: string
  readonly customFetch?: typeof fetch | undefined
  readonly nvidiaAdapter?: NvidiaNimAdapter | undefined
  readonly shutdownDrainTimeoutMs?: number | undefined
  readonly kernelCommandTimeoutMs?: number | undefined
  readonly customAppSpawn?: CustomAppSpawnFn | undefined
  readonly customLocalTranscriber?: LocalOfflineTranscriberFn | undefined
  readonly enabledAssistantCapabilities?: readonly string[] | undefined
  readonly localAnswerGenerator?: AuthorizedLocalAnswerGenerator | undefined
}

const DEFAULT_PATTERNS: readonly RegExp[] = [
  /\b(?:sk|ghp|gho|xox[bap])-?[A-Za-z0-9_-]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi,
]

export function sanitizeText(text: string): string {
  if (!text) return ''
  let out = text
  for (const p of DEFAULT_PATTERNS) {
    const rx = p.global ? p : new RegExp(p.source, p.flags + 'g')
    out = out.replace(rx, '[REDACTED]')
  }
  return ModelCredentialBroker.getInstance().redactSensitive(out)
}

export interface StoredVerificationPlan {
  readonly planId: string
  readonly taskId: string
  readonly workSessionId: string
  readonly runId: string
  readonly criteria: readonly { criterionId: string; revision: number; label: string; kind: string; author: string }[]
  readonly verifierAssignmentsCount: number
  readonly findingsSummary: readonly string[]
  verdict: 'VERIFIED_PASS' | 'INCONCLUSIVE' | 'FAIL'
  workerReportedStatus: string
  supervisorSessionStatus: string
  readonly independenceClass: 'STRUCTURAL' | 'NOT_PROVEN'
  humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL' | 'HUMAN_APPROVED' | 'HUMAN_REJECTED' | 'NOT_REQUIRED'
  readonly limitations: readonly string[]
  readonly unknowns: readonly string[]
  revision: number
  readonly createdAt: string
}

export interface StoredApprovalItem {
  readonly queueItemId: string
  readonly itemType: 'VERIFICATION_GATE' | 'ARCHITECTURE_DECISION' | 'RECOVERY_GATE'
  readonly targetId: string
  revision: number
  readonly sourceWorkSessionId: string
  readonly sourceRunId?: string
  readonly sourceTaskId?: string
  readonly technicalOutcome: string
  readonly reportVerdict?: string
  readonly limitations: readonly string[]
  readonly unknowns: readonly string[]
  readonly requestedAction: string
  readonly consequences: string
  status: 'WAITING_APPROVAL' | 'APPROVED' | 'REJECTED'
  readonly createdAt: string
}

export class KernelHost {
  private readonly kernel: WorkSessionKernel
  private readonly sendMessage: (msg: KernelToMainMessage) => void
  private status: KernelLifecycleStatus = 'NOT_STARTED'
  private readonly startedAt: string
  private diagnosticContext?: string
  private readonly pid: number
  private readonly kernelInstanceId: string
  private readonly dataRoot: string
  private readonly modelRegistry: ModelRegistry
  private readonly modelRouter: ModelRouter
  private readonly customFetch?: typeof fetch | undefined
  private readonly nvidiaAdapter?: NvidiaNimAdapter | undefined
  private readonly shutdownDrainTimeoutMs: number
  private readonly kernelCommandTimeoutMs: number
  private ideasVault?: IdeasVaultStore | undefined
  private capabilityRegistry?: AssistantCapabilityRegistry | undefined
  private icloudInbox?: ICloudAssignmentInbox | undefined
  private studyGuardian?: StudyGuardianService | undefined
  private onboardingService?: OnboardingService | undefined
  private readonly localAnswerGenerator?: AuthorizedLocalAnswerGenerator | undefined
  private readonly appLauncher: AllowlistedAppLauncher
  private readonly voiceController: OfflineVoiceController

  // Canonical auxiliary stores managed under single writer
  private readonly verificationPlans = new Map<string, StoredVerificationPlan>()
  private readonly approvalQueue = new Map<string, StoredApprovalItem>()
  private readonly executionRegistry = new Map<string, ExecutionItem>()
  private recentErrors: string[] = []
  private readonly activeDispatches = new Map<string, AbortController>()
  private readonly inFlightDispatchTasks = new Map<string, string>()

  constructor(opts: KernelHostOptions = {}) {
    this.startedAt = new Date().toISOString()
    this.diagnosticContext = opts.initialDiagnosticContext
    this.pid = opts.pid ?? process.pid
    this.kernelInstanceId = opts.kernelInstanceId ?? randomUUID()
    this.sendMessage = opts.onMessage ?? ((msg) => {
      if (process.parentPort) {
        process.parentPort.postMessage(msg)
      }
    })

    this.customFetch = opts.customFetch
    this.nvidiaAdapter = opts.nvidiaAdapter
    this.shutdownDrainTimeoutMs = opts.shutdownDrainTimeoutMs ?? 200
    this.kernelCommandTimeoutMs = opts.kernelCommandTimeoutMs ?? 5000
    this.modelRegistry = ModelRegistry.getInstance()
    this.modelRouter = new ModelRouter({ registry: this.modelRegistry })

    this.dataRoot = opts.dataRoot ?? opts.dbPath ?? process.env.GRAVITAS_DATA_ROOT ?? resolveGravitasDataRoot().dataRoot
    this.kernel = new WorkSessionKernel({
      dataRoot: this.dataRoot,
    })
    this.appLauncher = new AllowlistedAppLauncher({
      customSpawn: opts.customAppSpawn,
      enabledCapabilities: opts.enabledAssistantCapabilities,
    })
    this.voiceController = new OfflineVoiceController({
      dataRoot: this.dataRoot,
      customLocalTranscriber: opts.customLocalTranscriber,
    })
    this.localAnswerGenerator = opts.localAnswerGenerator

    // Seed default execution harness data for K1/K2/K3 projections
    this.seedExecutionRegistry()
  }

  public getInstanceId(): string {
    return this.kernelInstanceId
  }

  private seedExecutionRegistry(): void {
    const ex1: ExecutionItem = {
      executionId: 'exec_k1_agy_01',
      taskId: 'task_sample_01',
      roleId: 'role:engineering:backend-engineer',
      executorId: 'executor_agy_node24',
      harnessId: 'harness:antigravity:host',
      surface: 'CLI',
      provider: 'Google Antigravity',
      model: 'gemini-2.5-pro',
      processId: 'proc_1042',
      qualificationStatus: 'QUALIFIED',
      readinessStatus: 'READY',
      costEligibility: 'FREE_OPEN_SOURCE_LOCAL',
      dispatchAuthorization: 'AUTHORIZED',
      grantedCapabilities: ['fs:read', 'fs:write:worktree', 'git:commit'],
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date(Date.now() - 3500000).toISOString(),
      boundedOutput: 'Compilation and unit tests verified cleanly within bounded worktree.',
    }
    this.executionRegistry.set(ex1.executionId, ex1)
  }

  public async start(): Promise<void> {
    this.status = 'STARTING'
    try {
      await this.kernel.start()
      // A terminated utility process cannot resume an in-flight transport.
      for (const session of this.kernel.listWorkSessions()) {
        for (const task of this.kernel.getWorkSessionSnapshot(session.id).tasks) {
          if (['RUNNING', 'INTERRUPTED'].includes(task.state) && task.title.startsWith('Model Dispatch:')) {
            await this.kernel.execute({ commandId: randomUUID(), commandType: 'TRANSITION_TASK', workSessionId: session.id,
              payload: { taskId: task.id, toState: 'RECOVERY_REQUIRED', reason: 'Provider transport interrupted by host restart' } })
          }
        }
      }
      const observationStore = this.kernel.getModelObservationStore()
      ModelCapabilityHistory.getInstance(observationStore)
      this.status = 'READY'
      this.sendMessage({
        type: 'HELLO',
        protocolVersion: D1_PROTOCOL_VERSION,
        kernelPid: this.pid,
        kernelInstanceId: this.kernelInstanceId,
        nodeVersion: process.version,
        electronVersion: process.versions?.electron,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      this.status = 'FAILED'
      const safe = sanitizeText((err as Error).message)
      this.recentErrors.push(safe)
      this.sendMessage({
        type: 'KERNEL_ERROR',
        protocolVersion: D1_PROTOCOL_VERSION,
        errorCode: 'BOOTSTRAP_FAILURE',
        safeMessage: safe,
        timestamp: new Date().toISOString(),
      })
    }
  }

  public getStatus(): KernelLifecycleStatus {
    return this.status
  }

  public async stop(): Promise<void> {
    await this.shutdown()
  }

  public getKernel(): WorkSessionKernel {
    return this.kernel
  }

  public setDiagnosticContext(ctx: string): void {
    this.diagnosticContext = ctx
  }

  /**
   * Helper to seed or register a test approval fixture.
   */
  public registerVerificationFixture(params: {
    planId: string
    taskId: string
    workSessionId: string
    runId: string
    verdict: 'VERIFIED_PASS' | 'INCONCLUSIVE' | 'FAIL'
    humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL' | 'HUMAN_APPROVED' | 'HUMAN_REJECTED' | 'NOT_REQUIRED'
    revision?: number
  }): StoredVerificationPlan {
    const plan: StoredVerificationPlan = {
      planId: params.planId,
      taskId: params.taskId,
      workSessionId: params.workSessionId,
      runId: params.runId,
      criteria: [
        {
          criterionId: `crit_${params.planId}_01`,
          revision: 1,
          label: 'Exact artifact content matches expected digest',
          kind: 'EXACT_ARTIFACT_CONTENT',
          author: 'PLAN_AUTHOR',
        },
      ],
      verifierAssignmentsCount: 1,
      findingsSummary: [`Finding: criterion crit_${params.planId}_01 evaluated with verdict ${params.verdict}`],
      verdict: params.verdict,
      workerReportedStatus: 'COMPLETED',
      supervisorSessionStatus: 'ACCEPTED',
      independenceClass: 'STRUCTURAL',
      humanApprovalState: params.humanApprovalState,
      limitations: ['Verification bounded to test worktree; external network unverified'],
      unknowns: ['Vendor proprietary weights not verifiable'],
      revision: params.revision ?? 1,
      createdAt: new Date().toISOString(),
    }
    this.verificationPlans.set(plan.planId, plan)

    if (params.humanApprovalState === 'WAITING_FOR_HUMAN_APPROVAL') {
      const qItem: StoredApprovalItem = {
        queueItemId: `queue_${params.planId}`,
        itemType: 'VERIFICATION_GATE',
        targetId: params.planId,
        revision: plan.revision,
        sourceWorkSessionId: params.workSessionId,
        sourceRunId: params.runId,
        sourceTaskId: params.taskId,
        technicalOutcome: `Worker succeeded, verifier verdict is ${params.verdict}`,
        reportVerdict: params.verdict,
        limitations: plan.limitations,
        unknowns: plan.unknowns,
        requestedAction: 'Authorize completion without automated merge or deploy',
        consequences: 'Decision is recorded into canonical audit trail. Does not auto-merge or auto-deploy.',
        status: 'WAITING_APPROVAL',
        createdAt: new Date().toISOString(),
      }
      this.approvalQueue.set(qItem.queueItemId, qItem)
    }

    return plan
  }

  public registerExecutionFixture(item: ExecutionItem): void {
    this.executionRegistry.set(item.executionId, item)
  }

  // ─── Projection Generators ────────────────────────────────────────────────

  public generateOverviewProjection(): OverviewProjection {
    let sessions: readonly any[] = []
    let totalTasks = 0
    let totalRuns = 0
    let failedOrRecovery = 0

    try {
      sessions = this.kernel.listWorkSessions()
      for (const s of sessions) {
        if (s.state === 'RECOVERY_REQUIRED' || s.state === 'FAILED') {
          failedOrRecovery++
        }
        const snap = this.kernel.getWorkSessionSnapshot(s.id)
        totalRuns += snap.runs.length
        totalTasks += snap.tasks.length
      }
    } catch {
      // Degraded or starting
    }

    let waitingApproval = 0
    for (const item of this.approvalQueue.values()) {
      if (item.status === 'WAITING_APPROVAL') waitingApproval++
    }

    const recentEvents = this.getRecentAuditEvents(5)
    const recentActivitySummary = recentEvents.map((e) => `[${e.aggregateType}] ${e.eventType}: ${e.aggregateId}`)

    return {
      kernelStatus: this.status,
      activeWorkSessionsCount: sessions.filter((s) => s.state === 'ACTIVE' || s.state === 'CREATED').length,
      activeRunsCount: totalRuns,
      activeTasksCount: totalTasks,
      waitingApprovalCount: waitingApproval,
      failedOrRecoveryCount: failedOrRecovery,
      runningExecutionsCount: 0,
      blockedAuthorityCount: 0,
      blockedCostCount: 0,
      generatedAt: new Date().toISOString(),
      canonicalRevision: sessions.reduce((acc, s) => acc + (s.revision || 0), 1),
      recentActivitySummary,
    }
  }

  public generateWorkHierarchyProjection(): WorkHierarchyProjection {
    const sessionItems: WorkHierarchySessionItem[] = []

    try {
      const sessions = this.kernel.listWorkSessions()
      for (const s of sessions) {
        const snap = this.kernel.getWorkSessionSnapshot(s.id)
        const runs: WorkHierarchyRunItem[] = snap.runs.map((r) => {
          const runTasks: WorkHierarchyTaskItem[] = snap.tasks
            .filter((t) => t.runId === r.id)
            .map((t) => ({
              id: t.id,
              runId: t.runId,
              workSessionId: t.workSessionId,
              title: t.title,
              state: t.state,
              assignedRoleId: t.assignedRoleId,
              requiresApproval: t.requiresApproval,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
              revision: 1,
            }))

          return {
            id: r.id,
            workSessionId: r.workSessionId,
            goal: r.goal,
            state: r.status,
            createdAt: r.createdAt,
            tasks: runTasks,
            revision: 1,
          }
        })

        sessionItems.push({
          id: s.id,
          state: s.state,
          revision: s.revision,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          runs,
        })
      }
    } catch {
      // Degraded / starting
    }

    return {
      canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
      generatedAt: new Date().toISOString(),
      sessions: sessionItems,
    }
  }

  public generateTaskDetailProjection(taskId: string): TaskDetailProjection | null {
    try {
      const sessions = this.kernel.listWorkSessions()
      for (const s of sessions) {
        const snap = this.kernel.getWorkSessionSnapshot(s.id)
        const task = snap.tasks.find((t) => t.id === taskId)
        if (task) {
          const matchingPlan = Array.from(this.verificationPlans.values()).find((p) => p.taskId === taskId)
          const matchingExec = Array.from(this.executionRegistry.values()).find((e) => e.taskId === taskId)
          return {
            task: {
              id: task.id,
              runId: task.runId,
              workSessionId: task.workSessionId,
              title: task.title,
              state: task.state,
              assignedRoleId: task.assignedRoleId,
              requiresApproval: task.requiresApproval,
              createdAt: task.createdAt,
              updatedAt: task.updatedAt,
              revision: 1,
            },
            causalChain: {
              workSessionId: task.workSessionId,
              runId: task.runId,
              taskId: task.id,
            },
            executionContext: {
              executorId: matchingExec?.executorId ?? 'executor_agy_node24',
              roleId: task.assignedRoleId,
              harnessId: matchingExec?.harnessId ?? 'harness:antigravity:host',
              status: task.state === 'SUCCEEDED' ? 'COMPLETED' : (task.state === 'FAILED' ? 'FAILED' : 'READY'),
            },
            workerResult: {
              resultSummary: `Execution of ${task.title} finished with state ${task.state}`,
              outputText: sanitizeText(matchingExec?.boundedOutput ?? `Worker stdout output for task ${task.id}`),
              completedAt: matchingExec?.completedAt ?? task.updatedAt,
            },
            verificationRef: matchingPlan
              ? {
                  planId: matchingPlan.planId,
                  verdict: matchingPlan.verdict,
                }
              : undefined,
          }
        }
      }
    } catch {
      // Not found or error
    }
    return null
  }

  public generateExecutionProjection(): ExecutionProjection {
    return {
      generatedAt: new Date().toISOString(),
      executions: Array.from(this.executionRegistry.values()),
    }
  }

  public generateVerificationProjection(planId?: string): VerificationProjection | null {
    let plan: StoredVerificationPlan | undefined
    if (planId) {
      plan = this.verificationPlans.get(planId)
    } else {
      plan = Array.from(this.verificationPlans.values())[0]
    }

    if (!plan) return null

    return {
      planId: plan.planId,
      taskId: plan.taskId,
      workSessionId: plan.workSessionId,
      runId: plan.runId,
      criteria: plan.criteria,
      verifierAssignmentsCount: plan.verifierAssignmentsCount,
      findingsSummary: plan.findingsSummary,
      verdict: plan.verdict,
      workerReportedStatus: plan.workerReportedStatus,
      supervisorSessionStatus: plan.supervisorSessionStatus,
      independenceClass: plan.independenceClass,
      humanApprovalState: plan.humanApprovalState,
      limitations: plan.limitations,
      unknowns: plan.unknowns,
      trustStatus: 'NOT_TRUSTED_EVIDENCE',
      manifestCoreDigest: {
        algorithm: 'sha256',
        digestHex: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        semantics: 'CHANGE_DETECTION_RELATIVE_TO_REFERENCE_DIGEST',
        isDigitalSignature: false,
        confersExternalTrust: false,
        confersImmutability: false,
      },
      generatedAt: new Date().toISOString(),
      revision: plan.revision,
    }
  }

  public generateApprovalQueueProjection(): ApprovalQueueProjection {
    const items: ApprovalQueueItem[] = Array.from(this.approvalQueue.values()).map((it) => ({
      queueItemId: it.queueItemId,
      itemType: it.itemType,
      targetId: it.targetId,
      currentRevision: it.revision,
      sourceWorkSessionId: it.sourceWorkSessionId,
      sourceRunId: it.sourceRunId,
      sourceTaskId: it.sourceTaskId,
      technicalOutcome: it.technicalOutcome,
      reportVerdict: it.reportVerdict,
      limitations: it.limitations,
      unknowns: it.unknowns,
      requestedAction: it.requestedAction,
      consequences: it.consequences,
      status: it.status,
      createdAt: it.createdAt,
    }))
    const pending = items.filter((it) => it.status === 'WAITING_APPROVAL').length
    return {
      generatedAt: new Date().toISOString(),
      totalPending: pending,
      items,
    }
  }

  public generateSystemProjection(): SystemProjection {
    const config = readGravitasConfig(this.dataRoot)
    const paths = resolveGravitasDataRoot(this.dataRoot)

    return {
      supervisorStatus: this.status,
      kernelStatus: this.status,
      kernelPid: this.pid,
      mainPid: process.pid,
      protocolVersion: D1_PROTOCOL_VERSION,
      electronVersion: process.versions?.electron ?? 'N/A',
      nodeVersion: process.version,
      dataRootSanitized: sanitizeText(this.dataRoot),
      schemaVersion: 1,
      activeHarnessCount: 1,
      harnessReadinessSummary: {
        'harness:antigravity:host': 'READY',
      },
      toolRegistrySummary: ['fs:read', 'fs:write:worktree', 'git:commit'],
      costPolicySummary: {
        defaultTier: 'FREE_OPEN_SOURCE_LOCAL',
        paidFallbackPermitted: false,
        autonomousPaymentAuthority: false,
      },
      modelIntelligenceSummary: {
        providerStatus: (process.env.NVIDIA_API_KEY || process.env.NIM_API_KEY || ModelCredentialBroker.getInstance().getCredentialHandle('nvidia-nim').isAvailable) ? 'AVAILABLE' : 'AUTH_REQUIRED',
        qualifiedModelsCount: this.modelRegistry.listQualifiedModels().length,
        qualifiedModelIds: this.modelRegistry.listQualifiedModels().map((m) => m.id),
        candidateModelsCount: 3,
        candidateModelIds: [
          'meta/llama-3.1-8b-instruct',
          'meta/llama-3.1-70b-instruct',
          'mistralai/mixtral-8x7b-instruct-v0.1',
        ],
        defaultModel: this.modelRegistry.listQualifiedModels().length > 0
          ? this.modelRegistry.listQualifiedModels()[0].id
          : 'meta/llama-3.1-8b-instruct (unprobed)',
        costPolicy: 'STRICT_ZERO_DOLLAR_FREE',
        outOfPocketUsd: 0,
        paidFallbackPermitted: false,
      },
      onboardingSummary: {
        completed: Boolean(config.onboarding?.completed),
        operatingMode: config.onboarding?.operatingMode ?? 'DETERMINISTIC_ONLY',
        selectedHarnesses: config.onboarding?.selectedHarnesses ?? ['harness:antigravity:host'],
        providerConfigured: Boolean(config.onboarding?.providerConfigured) && ModelCredentialBroker.getInstance().getCredentialHandle('nvidia-nim').isAvailable,
        isPortableDataRoot: !paths.isTestOverride,
      },
      recentErrors: [...this.recentErrors],
    }
  }

  public generateActivityProjection(): ActivityProjection {
    const recentEvents = this.getRecentAuditEvents(50)
    const events: ActivityEventItem[] = recentEvents.map((e) => ({
      sequenceNumber: e.sequenceNumber,
      eventId: e.eventId,
      aggregateType: e.aggregateType,
      aggregateId: e.aggregateId,
      eventType: e.eventType,
      occurredAt: e.occurredAt,
      summary: `Aggregate ${e.aggregateType}:${e.aggregateId} transition: ${e.eventType}`,
    }))

    return {
      generatedAt: new Date().toISOString(),
      events,
    }
  }

  private getRecentAuditEvents(limit = 20): readonly any[] {
    try {
      return this.kernel.getEventsSince(0, limit)
    } catch {
      return []
    }
  }

  // ─── Intent Handling ──────────────────────────────────────────────────────

  public async handleOperatorIntent(intent: OperatorIntent): Promise<IntentResult> {
    const correlationId = intent.correlationId || randomUUID()

    // 1. Validate actor kind: only HUMAN_OPERATOR with non-empty operatorId
    if (!intent.actor || intent.actor.kind !== 'HUMAN_OPERATOR' || !intent.actor.operatorId?.trim()) {
      return {
        correlationId,
        success: false,
        targetId: intent.targetId || 'UNKNOWN',
        intentType: intent.intentType || 'UNKNOWN',
        status: 'DENIED',
        safeMessage: 'Only an authorized HUMAN_OPERATOR may submit operator intents. Machine actors prohibited.',
        authorizesMerge: false,
        authorizesRelease: false,
        authorizesDeploy: false,
      }
    }

    // 2. Validate intent structure
    if (!intent.intentType || !intent.targetId) {
      return {
        correlationId,
        success: false,
        targetId: intent.targetId || 'UNKNOWN',
        intentType: intent.intentType || 'UNKNOWN',
        status: 'REJECTED',
        safeMessage: 'Malformed operator intent: missing required fields.',
        authorizesMerge: false,
        authorizesRelease: false,
        authorizesDeploy: false,
      }
    }

    switch (intent.intentType) {
      case 'RECORD_HUMAN_DECISION': {
        const decIntent = intent as RecordHumanDecisionIntent
        const targetId = decIntent.targetId

        // Look for plan in verificationPlans or in approvalQueue
        let plan = this.verificationPlans.get(targetId)
        let queueItem = Array.from(this.approvalQueue.values()).find(
          (q) => q.targetId === targetId || q.queueItemId === targetId
        )

        if (!plan && queueItem) {
          plan = this.verificationPlans.get(queueItem.targetId)
        }

        if (!plan && !queueItem) {
          return {
            correlationId,
            success: false,
            targetId,
            intentType: intent.intentType,
            status: 'REJECTED',
            safeMessage: `Wrong-target intent: verification target '${targetId}' not found.`,
            authorizesMerge: false,
            authorizesRelease: false,
            authorizesDeploy: false,
          }
        }

        const currentRev = plan ? plan.revision : queueItem!.revision
        // Stale revision check
        if (decIntent.expectedRevision !== undefined && decIntent.expectedRevision !== currentRev) {
          return {
            correlationId,
            success: false,
            targetId,
            intentType: intent.intentType,
            status: 'CONFLICT',
            safeMessage: `Stale expected revision. Target revision is ${currentRev}, intent specified ${decIntent.expectedRevision}. Fail closed.`,
            authorizesMerge: false,
            authorizesRelease: false,
            authorizesDeploy: false,
          }
        }

        // Epistemological invariant check:
        // APPROVAL requires VERIFIED_PASS! Cannot approve INCONCLUSIVE or FAIL!
        if (decIntent.decision === 'APPROVED') {
          if (plan && plan.verdict !== 'VERIFIED_PASS') {
            return {
              correlationId,
              success: false,
              targetId,
              intentType: intent.intentType,
              status: 'DENIED',
              safeMessage: `Cannot record APPROVAL for report with verdict '${plan.verdict}'. Only VERIFIED_PASS can be approved.`,
              authorizesMerge: false,
              authorizesRelease: false,
              authorizesDeploy: false,
            }
          }
        }

        // Apply mutation
        const newRev = currentRev + 1
        if (plan) {
          plan.revision = newRev
          plan.humanApprovalState = decIntent.decision === 'APPROVED' ? 'HUMAN_APPROVED' : 'HUMAN_REJECTED'
        }
        if (queueItem) {
          queueItem.revision = newRev
          queueItem.status = decIntent.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED'
        }

        // Record durable event in kernel
        try {
          await this.kernel.execute({
            commandId: `cmd_human_decision_${correlationId.slice(0, 8)}`,
            commandType: 'RECORD_HUMAN_DECISION',
            workSessionId: plan?.workSessionId ?? queueItem?.sourceWorkSessionId,
            payload: {
              targetId,
              decision: decIntent.decision,
              operatorId: decIntent.actor.operatorId,
              rationale: sanitizeText(decIntent.rationale),
              previousRevision: currentRev,
              newRevision: newRev,
              authorizesMerge: false,
              authorizesRelease: false,
              authorizesDeploy: false,
            },
          })
        } catch {
          // Event recorded or fallback
        }

        // Emit projection update notification to supervisor
        this.sendMessage({
          type: 'PROJECTION_UPDATED',
          protocolVersion: D1_PROTOCOL_VERSION,
          projectionType: 'APPROVAL_QUEUE',
          timestamp: new Date().toISOString(),
        })

        return {
          correlationId,
          success: true,
          targetId,
          intentType: intent.intentType,
          newRevision: newRev,
          status: 'ACCEPTED',
          safeMessage: `Human decision '${decIntent.decision}' recorded successfully by operator '${decIntent.actor.operatorId}'. No merge or deploy authorized.`,
          authorizesMerge: false,
          authorizesRelease: false,
          authorizesDeploy: false,
        }
      }

      case 'CANCEL_TASK': {
        const cancelIntent = intent as CancelTaskIntent
        this.activeDispatches.get(cancelIntent.targetId)?.abort()
        try {
          await this.kernel.execute({
            commandId: `cmd_cancel_task_${correlationId.slice(0, 8)}`,
            commandType: 'TRANSITION_TASK',
            payload: {
              taskId: cancelIntent.targetId,
              targetState: 'CANCELLED',
              reason: sanitizeText(cancelIntent.reason),
            },
          })

          this.sendMessage({
            type: 'PROJECTION_UPDATED',
            protocolVersion: D1_PROTOCOL_VERSION,
            projectionType: 'WORK_HIERARCHY',
            timestamp: new Date().toISOString(),
          })

          return {
            correlationId,
            success: true,
            targetId: cancelIntent.targetId,
            intentType: intent.intentType,
            status: 'ACCEPTED',
            safeMessage: `Task '${cancelIntent.targetId}' cancelled.`,
            authorizesMerge: false,
            authorizesRelease: false,
            authorizesDeploy: false,
          }
        } catch (err) {
          return {
            correlationId,
            success: false,
            targetId: cancelIntent.targetId,
            intentType: intent.intentType,
            status: 'REJECTED',
            safeMessage: sanitizeText((err as Error).message),
            authorizesMerge: false,
            authorizesRelease: false,
            authorizesDeploy: false,
          }
        }
      }

      case 'REFRESH_PROJECTION': {
        return {
          correlationId,
          success: true,
          targetId: intent.targetId,
          intentType: intent.intentType,
          status: 'ACCEPTED',
          safeMessage: `Projection '${intent.targetId}' refreshed.`,
          authorizesMerge: false,
          authorizesRelease: false,
          authorizesDeploy: false,
        }
      }

      default: {
        return {
          correlationId,
          success: false,
          targetId: (intent as any).targetId,
          intentType: String((intent as any).intentType),
          status: 'REJECTED',
          safeMessage: `Unknown intent type '${String((intent as any).intentType)}'.`,
          authorizesMerge: false,
          authorizesRelease: false,
          authorizesDeploy: false,
        }
      }
    }
  }

  // ─── Production Model Dispatch (Wave V1-E) ────────────────────────────────

  public async dispatchModel(req: DispatchModelRequest): Promise<DesktopModelDispatchResult> {
    let workSessionId = ''
    let runId = ''
    let taskId = ''
    const controller = new AbortController()
    const dispatchKey = randomUUID()
    this.activeDispatches.set(dispatchKey, controller)

    const awaitBounded = async <T>(
      operation: Promise<T>,
      timeoutMs: number,
      abortMessage: string,
      timeoutMessage: string
    ): Promise<T> => {
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined
      let abortGraceHandle: ReturnType<typeof setTimeout> | undefined
      let onAbortListener: (() => void) | undefined
      const guardPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
        onAbortListener = () => {
          abortGraceHandle = setTimeout(() => reject(new Error(abortMessage)), 25)
        }
        if (controller.signal.aborted) {
          onAbortListener()
        } else {
          controller.signal.addEventListener('abort', onAbortListener, { once: true })
        }
      })
      void guardPromise.catch(() => {})
      try {
        return await Promise.race([operation, guardPromise])
      } finally {
        if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
        if (abortGraceHandle !== undefined) clearTimeout(abortGraceHandle)
        if (onAbortListener !== undefined) {
          controller.signal.removeEventListener('abort', onAbortListener)
        }
      }
    }

    const command = async (input: Parameters<WorkSessionKernel['execute']>[0]) => {
      const cmdTimeoutMs = Math.min(req?.timeoutMs ?? this.kernelCommandTimeoutMs, this.kernelCommandTimeoutMs)
      const result = await awaitBounded(
        this.kernel.execute(input),
        cmdTimeoutMs,
        'Dispatch cancelled',
        'Kernel command timed out'
      )
      if (!result.success) throw new Error('Kernel command failed')
      return result
    }

    try {
      validateDispatchPayload(req)
      if (this.status !== 'READY') throw new Error('Kernel is not ready')
      const targetModelId = req.modelId ?? 'meta/llama-3.1-8b-instruct'

      // 1. Model Catalog Validation
      const modelDesc = this.modelRegistry.getModel(targetModelId)
      if (!modelDesc) {
        return {
          success: false,
          workSessionId: req.workSessionId ?? '',
          runId: '',
          taskId: '',
          executionId: '',
          provider: 'nvidia-nim',
          requestedModel: sanitizeText(targetModelId),
          actualModel: sanitizeText(targetModelId),
          terminationStatus: 'ERROR',
          errorTaxonomy: 'MODEL_NOT_FOUND',
          errorMessage: 'Unsupported model. Model is not registered in catalog.',
        }
      }

      // 2. Provider credential verification
      const broker = ModelCredentialBroker.getInstance()
      const credHandle = broker.getCredentialHandle(modelDesc.providerId)
      if (!credHandle.isAvailable) {
        return {
          success: false,
          workSessionId: req.workSessionId ?? '',
          runId: '',
          taskId: '',
          executionId: '',
          provider: modelDesc.providerId,
          requestedModel: sanitizeText(targetModelId),
          actualModel: sanitizeText(targetModelId),
          terminationStatus: 'ERROR',
          errorTaxonomy: 'AUTH_REQUIRED',
          errorMessage: 'No NVIDIA API credentials configured in broker. Authentication required.',
        }
      }

      // 3. Deterministic ModelRouter Resolution (without premature qualification)
      this.modelRegistry.registerProvider(getNvidiaProviderDescriptor())
      const routeReq: TaskModelRequirements = {
        taskDomain: 'code_generation',
        taskComplexityClass: 'MEDIUM',
        preferredTier: targetModelId.includes('70b') ? 'FRONTIER' : 'FAST',
        requestedModelId: targetModelId,
      }
      let decision = this.modelRouter.resolveModel(routeReq)
      if (
        (!decision.selectedModel || !decision.selectedProvider) &&
        this.customFetch &&
        decision.qualificationDecision === 'NO_QUALIFIED_MODEL'
      ) {
        // Clearly distinguished offline-test route for metadata-validated models; never promotes qualificationState
        decision = this.modelRouter.resolveOfflineTestModel(routeReq)
      }
      if (!decision.selectedModel || !decision.selectedProvider) {
        const errorTaxonomy =
          decision.qualificationDecision === 'AUTH_REQUIRED'
            ? 'AUTH_REQUIRED'
            : decision.costDecision === 'PAID_BLOCKED' || decision.costDecision === 'COST_UNKNOWN_BLOCKED'
              ? 'COST_BLOCKED'
              : 'DISPATCH_REJECTED'
        return {
          success: false,
          workSessionId: req.workSessionId ?? '',
          runId: '',
          taskId: '',
          executionId: '',
          provider: modelDesc.providerId,
          requestedModel: sanitizeText(targetModelId),
          actualModel: sanitizeText(targetModelId),
          terminationStatus: 'ERROR',
          errorTaxonomy,
          errorMessage: sanitizeText(`Model router rejected selection: ${decision.reason}`),
        }
      }

      // Mock inference does not qualify production models. Live transport is disabled.
      if (!this.customFetch) throw new Error('Live NVIDIA egress is disabled; offline transport required')
      const selectedModel = decision.selectedModel
      const selectedProvider = decision.selectedProvider

      // 4. Ensure WorkSession, Run, and Task exist in canonical kernel
      workSessionId = req.workSessionId ?? ''
      if (workSessionId) {
        const session = this.kernel.getWorkSession(workSessionId)
        if (!session || !['CREATED', 'READY', 'ACTIVE'].includes(session.state)) throw new Error('Invalid or terminal WorkSession')
      }
      if (!workSessionId) {
        workSessionId = `ws_nim_${randomUUID().slice(0, 8)}`
        await command({
          commandId: `cmd_create_ws_${randomUUID().slice(0, 8)}`,
          commandType: 'CREATE_WORKSESSION',
          workSessionId,
          payload: {
            id: workSessionId,
            title: `NVIDIA Model Dispatch Session`,
            objective: 'Offline NVIDIA inference awaiting independent verification',
            repositoryRoot: this.dataRoot,
            baseBranch: 'main',
          },
        })
      }

      runId = `run_${randomUUID().slice(0, 8)}`
      await command({
        commandId: `cmd_create_run_${randomUUID().slice(0, 8)}`,
        commandType: 'CREATE_RUN',
        workSessionId,
        payload: {
          runId,
          workSessionId,
          goal: `Inference Run: ${selectedModel}`,
        },
      })

      taskId = `task_${randomUUID().slice(0, 8)}`
      this.activeDispatches.set(taskId, controller)
      this.inFlightDispatchTasks.set(taskId, workSessionId)

      await command({
        commandId: `cmd_create_task_${randomUUID().slice(0, 8)}`,
        commandType: 'CREATE_TASK',
        workSessionId,
        payload: {
          taskId,
          runId,
          workSessionId,
          title: `Model Dispatch: ${selectedModel}`,
          assignedRoleId: 'role:engineering:backend-engineer',
        },
      })

      await command({
        commandId: `cmd_trans_task_running_${randomUUID().slice(0, 8)}`,
        commandType: 'TRANSITION_TASK',
        workSessionId,
        payload: {
          taskId,
          toState: 'RUNNING',
          reason: `Model dispatch initiated for ${selectedModel}`,
        },
      })

      // 5. Construct K3 Dispatch CapabilityGrant
      const grant = authorizeOfflineNvidiaDispatch({
        subjectId: this.kernelInstanceId,
        workSessionId,
        runId,
        taskId,
        model: selectedModel,
      })

      // 6. Execute through production NvidiaNimAdapter
      const adapter = this.nvidiaAdapter ?? new NvidiaNimAdapter({
        credentialBroker: broker,
        fetchFn: this.customFetch,
      })

      const messages: ProviderChatMessage[] = req.messages
        ? [...req.messages]
        : [{ role: 'user', content: req.prompt }]

      const inferenceReq: ProviderInferenceRequest = {
        model: selectedModel,
        messages,
        maxTokens: req.maxTokens ?? 1024,
        temperature: req.temperature ?? 0.2,
        credentialRef: 'vault:cred:nvidia-nim',
        capabilityGrant: grant,
      }

      if (controller.signal.aborted) throw new Error('Dispatch cancelled')
      const effectiveTimeoutMs = req.timeoutMs ?? 30000
      const adapterRes = await awaitBounded(
        adapter.execute(inferenceReq, {
          timeoutMs: effectiveTimeoutMs,
          signal: controller.signal,
        }),
        effectiveTimeoutMs + 50,
        'Dispatch cancelled',
        `Request timed out after ${effectiveTimeoutMs}ms`
      )

      const executionId = `exec_nim_${randomUUID().slice(0, 8)}`
      const isSuccess = adapterRes.terminationStatus === 'COMPLETED' && !controller.signal.aborted

      // 7. Transition Task & Record Execution (Evidence-Based Claims)
      await command({
        commandId: `cmd_trans_task_finish_${randomUUID().slice(0, 8)}`,
        commandType: 'TRANSITION_TASK',
        workSessionId,
        payload: {
          taskId,
          toState: controller.signal.aborted ? 'CANCELLED' : isSuccess ? 'VERIFYING' : 'FAILED',
          reason: isSuccess
            ? `Model inference completed: ${adapterRes.actualModel}`
            : sanitizeText(adapterRes.errorMessage ?? 'Model inference failed'),
        },
      })

      const latestModelDesc = this.modelRegistry.getModel(selectedModel) ?? modelDesc
      const isQualifiedEvidence =
        decision.qualificationDecision === 'QUALIFIED' &&
        latestModelDesc.qualificationState === 'QUALIFIED'
      const qualificationStatus: ExecutionItem['qualificationStatus'] = isQualifiedEvidence
        ? 'QUALIFIED'
        : latestModelDesc.qualificationState === 'DISCOVERED'
          ? 'DISCOVERED'
          : 'NOT_QUALIFIED'
      const readinessStatus: ExecutionItem['readinessStatus'] =
        isQualifiedEvidence && latestModelDesc.availability === 'AVAILABLE'
          ? 'READY'
          : 'NOT_READY'
      const costEligibility: ExecutionItem['costEligibility'] =
        decision.costDecision === 'PAID_BLOCKED' ||
        adapterRes.errorTaxonomy === 'COST_BLOCKED' ||
        latestModelDesc.costClass === 'PAID'
          ? 'PAID_BLOCKED'
          : isQualifiedEvidence &&
              decision.costDecision === 'FREE_APPROVED' &&
              latestModelDesc.costClass === 'ZERO_DOLLAR_FREE'
            ? latestModelDesc.source === 'LOCAL'
              ? 'FREE_OPEN_SOURCE_LOCAL'
              : 'OPERATOR_INCLUDED_ACCOUNT'
            : 'UNKNOWN_COST'

      const grantVerification = verifyK3DispatchGrant({
        grant,
        expectedProvider: selectedProvider,
        endpointUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
        model: selectedModel,
        credentialRef: credHandle.credentialRef,
      })
      const isDispatchAuthorized =
        grantVerification.authorized &&
        adapterRes.errorTaxonomy !== 'CAPABILITY_GRANT_REQUIRED' &&
        adapterRes.errorTaxonomy !== 'AUTH_REQUIRED'

      const execItem: ExecutionItem = {
        executionId,
        taskId,
        roleId: 'role:engineering:backend-engineer',
        executorId: 'executor_utility_process',
        harnessId: 'harness:nvidia:nim',
        surface: 'DESKTOP',
        provider: selectedProvider,
        model: adapterRes.actualModel || selectedModel,
        processId: `proc_${this.pid}`,
        qualificationStatus,
        readinessStatus,
        costEligibility,
        dispatchAuthorization: isDispatchAuthorized ? 'AUTHORIZED' : 'DENIED',
        grantedCapabilities: isDispatchAuthorized ? [...grant.grantedCapabilities] : [],
        status:
          !isDispatchAuthorized || adapterRes.errorTaxonomy === 'COST_BLOCKED'
            ? 'BLOCKED'
            : isSuccess
              ? 'COMPLETED'
              : 'FAILED',
        startedAt: new Date(Date.now() - adapterRes.latencyMs).toISOString(),
        completedAt: new Date().toISOString(),
        boundedOutput: sanitizeText(
          isSuccess
            ? (adapterRes.outputContent ?? '')
            : (adapterRes.errorMessage ?? 'Model execution failed')
        ),
      }
      this.executionRegistry.set(executionId, execItem)

      // Notify listeners of state mutation
      this.sendMessage({
        type: 'PROJECTION_UPDATED',
        protocolVersion: D1_PROTOCOL_VERSION,
        projectionType: 'WORK_HIERARCHY',
        timestamp: new Date().toISOString(),
      })
      this.sendMessage({
        type: 'PROJECTION_UPDATED',
        protocolVersion: D1_PROTOCOL_VERSION,
        projectionType: 'EXECUTION',
        timestamp: new Date().toISOString(),
      })
      this.sendMessage({
        type: 'PROJECTION_UPDATED',
        protocolVersion: D1_PROTOCOL_VERSION,
        projectionType: 'OVERVIEW',
        timestamp: new Date().toISOString(),
      })

      return {
        success: isSuccess,
        workSessionId,
        runId,
        taskId,
        executionId,
        provider: selectedProvider,
        requestedModel: selectedModel,
        actualModel: adapterRes.actualModel || selectedModel,
        terminationStatus: controller.signal.aborted ? 'CANCELLED' : adapterRes.terminationStatus,
        outputContent: sanitizeText(adapterRes.outputContent ?? ''),
        errorTaxonomy: adapterRes.errorTaxonomy,
        errorMessage: sanitizeText(adapterRes.errorMessage ?? ''),
        tokenUsage: adapterRes.tokenUsage,
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Dispatch failed'
      const isTimedOut = !controller.signal.aborted && errMessage.startsWith('Request timed out after')
      if (taskId) {
        try {
          const fallbackState =
            this.status === 'STOPPING' || this.status === 'STOPPED'
              ? controller.signal.aborted
                ? 'CANCELLED'
                : 'RECOVERY_REQUIRED'
              : controller.signal.aborted
                ? 'CANCELLED'
                : 'FAILED'
          let fallbackTimer: ReturnType<typeof setTimeout> | undefined
          try {
            const fallbackRes = await Promise.race([
              this.kernel.execute({
                commandId: randomUUID(),
                commandType: 'TRANSITION_TASK',
                workSessionId,
                payload: { taskId, toState: fallbackState, reason: 'Dispatch failed safely' },
              }),
              new Promise<never>((_, reject) => {
                fallbackTimer = setTimeout(() => reject(new Error('Fallback transition timed out')), 50)
              }),
            ])
            if (!fallbackRes.success) {
              this.recentErrors.push('Dispatch recovery requires kernel restart')
            }
          } finally {
            if (fallbackTimer !== undefined) clearTimeout(fallbackTimer)
          }
        } catch {
          this.recentErrors.push('Dispatch recovery requires kernel restart')
        }
      }
      return {
        success: false,
        workSessionId,
        runId,
        taskId,
        executionId: '',
        provider: 'nvidia-nim',
        requestedModel: typeof req?.modelId === 'string' ? sanitizeText(req.modelId) : '',
        actualModel: '',
        terminationStatus: controller.signal.aborted
          ? 'CANCELLED'
          : isTimedOut
            ? 'TIMED_OUT'
            : 'ERROR',
        errorTaxonomy: controller.signal.aborted
          ? 'CANCELLED'
          : isTimedOut
            ? 'TIMEOUT'
            : 'DISPATCH_REJECTED',
        errorMessage: sanitizeText(errMessage),
      }
    } finally {
      this.activeDispatches.delete(taskId)
      this.activeDispatches.delete(dispatchKey)
      this.inFlightDispatchTasks.delete(taskId)
    }
  }

  // ─── IPC Message Dispatcher ───────────────────────────────────────────────

  public async handleMessage(msg: unknown): Promise<void> {
    if (!msg || typeof msg !== 'object') {
      this.sendMessage({
        type: 'KERNEL_ERROR',
        protocolVersion: D1_PROTOCOL_VERSION,
        errorCode: 'MALFORMED_MESSAGE',
        safeMessage: 'Received non-object message payload.',
        timestamp: new Date().toISOString(),
      })
      return
    }

    const m = msg as Partial<MainToKernelMessage>

    // 1. Protocol version validation
    if (
      m.protocolVersion !== D0_PROTOCOL_VERSION &&
      m.protocolVersion !== D1_PROTOCOL_VERSION &&
      m.protocolVersion !== D2_PROTOCOL_VERSION &&
      m.protocolVersion !== D3_PROTOCOL_VERSION &&
      m.protocolVersion !== D4_PROTOCOL_VERSION
    ) {
      this.sendMessage({
        type: 'KERNEL_ERROR',
        protocolVersion: D1_PROTOCOL_VERSION,
        errorCode: 'PROTOCOL_MISMATCH',
        safeMessage: `Expected protocol version ${D0_PROTOCOL_VERSION}, ${D1_PROTOCOL_VERSION}, ${D2_PROTOCOL_VERSION}, ${D3_PROTOCOL_VERSION}, or ${D4_PROTOCOL_VERSION}, got ${String(m.protocolVersion)}`,
        correlationId: m.requestId,
        timestamp: new Date().toISOString(),
      })
      return
    }

    // 2. Dispatch known message types
    switch (m.type) {
      case 'HEALTH_REQUEST': {
        const sessions = this.kernel.getLifecycleState() === 'READY' ? this.kernel.listWorkSessions() : []
        const res: HealthResponse = {
          type: 'HEALTH_RESPONSE',
          protocolVersion: m.protocolVersion!,
          requestId: m.requestId!,
          status: this.status,
          kernelPid: this.pid,
          nodeVersion: process.version,
          activeSessionCount: sessions.length,
          schemaVersion: 1,
          startedAt: this.startedAt,
          safeDiagnosticContext: this.diagnosticContext ? sanitizeText(this.diagnosticContext) : undefined,
          timestamp: new Date().toISOString(),
        }
        this.sendMessage(res)
        break
      }

      case 'SNAPSHOT_REQUEST': {
        const rawSessions = this.kernel.getLifecycleState() === 'READY' ? this.kernel.listWorkSessions() : []
        const sessions: DesktopWorkSessionSummary[] = rawSessions.map((s) => ({
          id: s.id,
          status: s.state,
          taskCount: 0,
          activeJobCount: 0,
          createdAt: s.createdAt,
          revision: s.revision,
        }))
        const snapshot: DesktopKernelSnapshot = {
          canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
          projectionTimestamp: new Date().toISOString(),
          totalSessions: sessions.length,
          sessions,
        }
        const res: SnapshotResponse = {
          type: 'SNAPSHOT_RESPONSE',
          protocolVersion: m.protocolVersion!,
          requestId: m.requestId!,
          snapshot,
          timestamp: new Date().toISOString(),
        }
        this.sendMessage(res)
        break
      }

      case 'GET_OVERVIEW_REQUEST': {
        this.sendMessage({
          type: 'GET_OVERVIEW_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: m.requestId!,
          projection: this.generateOverviewProjection(),
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'GET_WORK_HIERARCHY_REQUEST': {
        this.sendMessage({
          type: 'GET_WORK_HIERARCHY_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: m.requestId!,
          projection: this.generateWorkHierarchyProjection(),
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'GET_TASK_DETAIL_REQUEST': {
        this.sendMessage({
          type: 'GET_TASK_DETAIL_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: m.requestId!,
          projection: this.generateTaskDetailProjection((m as any).taskId),
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'GET_EXECUTION_REQUEST': {
        this.sendMessage({
          type: 'GET_EXECUTION_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: m.requestId!,
          projection: this.generateExecutionProjection(),
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'GET_VERIFICATION_REQUEST': {
        this.sendMessage({
          type: 'GET_VERIFICATION_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: m.requestId!,
          projection: this.generateVerificationProjection((m as any).planId),
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'GET_APPROVAL_QUEUE_REQUEST': {
        this.sendMessage({
          type: 'GET_APPROVAL_QUEUE_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: m.requestId!,
          projection: this.generateApprovalQueueProjection(),
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'GET_SYSTEM_REQUEST': {
        this.sendMessage({
          type: 'GET_SYSTEM_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: m.requestId!,
          projection: this.generateSystemProjection(),
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'GET_ACTIVITY_REQUEST': {
        this.sendMessage({
          type: 'GET_ACTIVITY_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: m.requestId!,
          projection: this.generateActivityProjection(),
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'OPERATOR_INTENT_REQUEST': {
        const intent = (m as any).intent as OperatorIntent
        const result = await this.handleOperatorIntent(intent)
        this.sendMessage({
          type: 'OPERATOR_INTENT_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: m.requestId!,
          result,
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'CONFIGURE_PROVIDER_REQUEST': {
        const req = m as ConfigureProviderRequest
        const op = req.op ?? 'CONFIGURE'
        const generation = req.generation ?? 0

        if (req.expectedKernelInstanceId && req.expectedKernelInstanceId !== this.kernelInstanceId) {
          this.sendMessage({
            type: 'CONFIGURE_PROVIDER_RESPONSE',
            protocolVersion: D1_PROTOCOL_VERSION,
            requestId: req.requestId,
            kernelPid: this.pid,
            kernelInstanceId: this.kernelInstanceId,
            op,
            generation,
            success: false,
            providerId: req.providerId,
            maskedHandle: '[INSTANCE_MISMATCH]',
            status: 'AUTH_REQUIRED',
            error: `Kernel instance mismatch: expected ${req.expectedKernelInstanceId}, got ${this.kernelInstanceId}`,
            timestamp: new Date().toISOString(),
          })
          break
        }

        if (req.expectedKernelPid && req.expectedKernelPid !== this.pid) {
          this.sendMessage({
            type: 'CONFIGURE_PROVIDER_RESPONSE',
            protocolVersion: D1_PROTOCOL_VERSION,
            requestId: req.requestId,
            kernelPid: this.pid,
            kernelInstanceId: this.kernelInstanceId,
            op,
            generation,
            success: false,
            providerId: req.providerId,
            maskedHandle: '[HOST_MISMATCH]',
            status: 'AUTH_REQUIRED',
            error: `Host instance mismatch: expected PID ${req.expectedKernelPid}, got ${this.pid}`,
            timestamp: new Date().toISOString(),
          })
          break
        }

        if (req.providerId !== 'nvidia-nim') {
          this.sendMessage({
            type: 'CONFIGURE_PROVIDER_RESPONSE',
            protocolVersion: D1_PROTOCOL_VERSION,
            requestId: req.requestId,
            kernelPid: this.pid,
            kernelInstanceId: this.kernelInstanceId,
            op,
            generation,
            success: false,
            providerId: req.providerId,
            maskedHandle: '[UNSUPPORTED_PROVIDER]',
            status: 'AUTH_REQUIRED',
            error: `Unsupported provider: ${req.providerId}`,
            timestamp: new Date().toISOString(),
          })
          break
        }

        if (!['CONFIGURE', 'REVOKE'].includes(op) || (req.apiKey !== undefined && typeof req.apiKey !== 'string')) {
          this.sendMessage({ type: 'CONFIGURE_PROVIDER_RESPONSE', protocolVersion: D1_PROTOCOL_VERSION,
            requestId: req.requestId, kernelPid: this.pid, kernelInstanceId: this.kernelInstanceId,
            op: 'CONFIGURE', generation, success: false, providerId: 'nvidia-nim', maskedHandle: '[ERROR]',
            status: 'AUTH_REQUIRED', error: 'Invalid provider configuration', timestamp: new Date().toISOString() })
          break
        }
        const key = (req.apiKey || '').trim()
        if (op === 'REVOKE' || !key) {
          for (const controller of this.activeDispatches.values()) controller.abort()
          ModelCredentialBroker.getInstance().clearSecret('nvidia-nim')
          this.sendMessage({
            type: 'CONFIGURE_PROVIDER_RESPONSE',
            protocolVersion: D1_PROTOCOL_VERSION,
            requestId: req.requestId,
            kernelPid: this.pid,
            kernelInstanceId: this.kernelInstanceId,
            op: 'REVOKE',
            generation,
            success: true,
            providerId: 'nvidia-nim',
            maskedHandle: '[NO_CREDENTIAL]',
            status: 'AUTH_REQUIRED',
            timestamp: new Date().toISOString(),
          })
          break
        }

        try {
          ModelCredentialBroker.getInstance().registerSecret('nvidia-nim', key)
          const handle = ModelCredentialBroker.getInstance().getCredentialHandle('nvidia-nim')
          this.sendMessage({
            type: 'CONFIGURE_PROVIDER_RESPONSE',
            protocolVersion: D1_PROTOCOL_VERSION,
            requestId: req.requestId,
            kernelPid: this.pid,
            kernelInstanceId: this.kernelInstanceId,
            op: 'CONFIGURE',
            generation,
            success: true,
            providerId: 'nvidia-nim',
            maskedHandle: handle.redactedPreview,
            status: 'METADATA_VALIDATED',
            timestamp: new Date().toISOString(),
          })
        } catch (err) {
          this.sendMessage({
            type: 'CONFIGURE_PROVIDER_RESPONSE',
            protocolVersion: D1_PROTOCOL_VERSION,
            requestId: req.requestId,
            kernelPid: this.pid,
            kernelInstanceId: this.kernelInstanceId,
            op: 'CONFIGURE',
            generation,
            success: false,
            providerId: req.providerId,
            maskedHandle: '[ERROR]',
            status: 'AUTH_REQUIRED',
            error: sanitizeText((err as Error).message),
            timestamp: new Date().toISOString(),
          })
        }
        break
      }

      case 'DISPATCH_MODEL_REQUEST': {
        const req = m as DispatchModelRequest
        const result = await this.dispatchModel(req)
        this.sendMessage({
          type: 'DISPATCH_MODEL_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: req.requestId,
          ...result,
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'EXECUTE_ASSISTANT_COMMAND_REQUEST': {
        const req = m as ExecuteAssistantCommandRequest
        const result = await this.executeAssistantCommand(req)
        this.sendMessage({
          type: 'EXECUTE_ASSISTANT_COMMAND_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: req.requestId,
          result,
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'CANCEL_ASSISTANT_COMMAND_REQUEST': {
        const req = m as CancelAssistantCommandRequest
        const result = await this.cancelAssistantCommand(req.commandId)
        this.sendMessage({
          type: 'CANCEL_ASSISTANT_COMMAND_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: req.requestId,
          result,
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'IDEAS_VAULT_REQUEST': {
        const req = m as IdeasVaultOperationRequest
        const result = this.handleIdeasVaultOperation(req.payload)
        this.sendMessage({
          type: 'IDEAS_VAULT_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: req.requestId,
          result,
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'STUDY_GUARDIAN_REQUEST': {
        const req = m as StudyGuardianOperationRequest
        const result = await this.handleStudyGuardianOperation(req.payload)
        this.sendMessage({
          type: 'STUDY_GUARDIAN_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: req.requestId,
          result,
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'VOICE_PTT_REQUEST': {
        const req = m as VoicePttRequest
        const result = await this.handleVoicePttOperation(req.payload)
        this.sendMessage({
          type: 'VOICE_PTT_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: req.requestId,
          result,
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'CAPABILITY_REGISTRY_REQUEST': {
        const req = m as CapabilityRegistryRequest
        const result = this.handleCapabilityRegistryOperation(req.payload)
        this.sendMessage({
          type: 'CAPABILITY_REGISTRY_RESPONSE',
          protocolVersion: D1_PROTOCOL_VERSION,
          requestId: req.requestId,
          result,
          timestamp: new Date().toISOString(),
        })
        break
      }

      case 'SHUTDOWN_REQUEST': {
        await this.shutdown()
        this.sendMessage({
          type: 'SHUTDOWN_ACK',
          protocolVersion: m.protocolVersion!,
          requestId: m.requestId!,
          timestamp: new Date().toISOString(),
        })
        break
      }

      default: {
        this.sendMessage({
          type: 'KERNEL_ERROR',
          protocolVersion: (m as any).protocolVersion || D1_PROTOCOL_VERSION,
          errorCode: 'UNKNOWN_MESSAGE_TYPE',
          safeMessage: `Unknown message type: ${String((m as { type?: string }).type)}`,
          correlationId: (m as any).requestId,
          timestamp: new Date().toISOString(),
        })
      }
    }
  }

  // ─── V1-F-01 / V1-G-01 Floating Companion, Ideas Vault & Study Guardian ──

  public getIdeasVault(): IdeasVaultStore {
    if (!this.ideasVault) {
      this.ideasVault = new IdeasVaultStore(this.dataRoot)
    }
    return this.ideasVault
  }

  public getCapabilityRegistry(): AssistantCapabilityRegistry {
    if (!this.capabilityRegistry) {
      const vault = this.getIdeasVault()
      this.capabilityRegistry = new AssistantCapabilityRegistry(vault.getDatabase())
    }
    return this.capabilityRegistry
  }

  public getICloudInbox(): ICloudAssignmentInbox {
    if (!this.icloudInbox) {
      const vault = this.getIdeasVault()
      this.icloudInbox = new ICloudAssignmentInbox({
        vault,
        dataRoot: this.dataRoot,
      })
    }
    return this.icloudInbox
  }

  public getStudyGuardian(): StudyGuardianService {
    if (!this.studyGuardian) {
      const vault = this.getIdeasVault()
      const inbox = this.getICloudInbox()
      this.studyGuardian = new StudyGuardianService({
        vault,
        inbox,
        localAnswerGenerator: this.localAnswerGenerator,
      })
    }
    return this.studyGuardian
  }

  public getOnboardingService(): OnboardingService {
    if (!this.onboardingService) {
      this.onboardingService = new OnboardingService(
        this.getICloudInbox(),
        this.getIdeasVault(),
        this.dataRoot
      )
    }
    return this.onboardingService
  }

  public getVoiceController(): OfflineVoiceController {
    return this.voiceController
  }

  public async executeAssistantCommand(req: {
    readonly commandId?: string | undefined
    readonly input: string
    readonly saveApproved?: boolean | undefined
    readonly targetAssignmentId?: string | undefined
  }): Promise<AssistantCommandResult> {
    const commandId = req.commandId && req.commandId.trim() ? req.commandId.trim() : `cmd_asst_${randomUUID().slice(0, 8)}`
    const intent = parseAssistantCommand(req.input)

    const workSessionId = `ws_companion_${randomUUID().slice(0, 8)}`
    const runId = `run_companion_${randomUUID().slice(0, 8)}`
    const taskId = `task_companion_${randomUUID().slice(0, 8)}`
    const controller = new AbortController()

    this.activeDispatches.set(commandId, controller)
    this.activeDispatches.set(taskId, controller)
    this.inFlightDispatchTasks.set(taskId, workSessionId)

    try {
      await this.kernel.execute({
        commandId: `cmd_ws_${commandId}`,
        commandType: 'CREATE_WORKSESSION',
        workSessionId,
        payload: {
          id: workSessionId,
          title: 'Desktop Companion Action',
          objective: sanitizeText(`Assistant command: ${req.input.slice(0, 120)}`),
          repositoryRoot: this.dataRoot,
          baseBranch: 'main',
        },
      })

      await this.kernel.execute({
        commandId: `cmd_run_${commandId}`,
        commandType: 'CREATE_RUN',
        workSessionId,
        payload: {
          runId,
          workSessionId,
          goal: sanitizeText(`Execute ${intent.kind}`),
        },
      })

      await this.kernel.execute({
        commandId: `cmd_task_${commandId}`,
        commandType: 'CREATE_TASK',
        workSessionId,
        payload: {
          taskId,
          runId,
          workSessionId,
          title: sanitizeText(`Companion: ${intent.kind}`),
          assignedRoleId: 'role:engineering:backend-engineer',
        },
      })

      await this.kernel.execute({
        commandId: `cmd_run_state_${commandId}`,
        commandType: 'TRANSITION_TASK',
        workSessionId,
        payload: {
          taskId,
          toState: 'RUNNING',
          reason: `Executing assistant intent ${intent.kind}`,
        },
      })

      if (controller.signal.aborted) {
        throw new Error('CANCELLED_BY_OPERATOR')
      }

      const completeKernelTask = async (reason: string) => {
        await this.kernel.execute({
          commandId: `cmd_done_${commandId}`,
          commandType: 'TRANSITION_TASK',
          workSessionId,
          payload: {
            taskId,
            toState: 'SUCCEEDED',
            reason: sanitizeText(reason),
          },
        })
      }

      const emitVaultUpdate = () => {
        this.sendMessage({
          type: 'PROJECTION_UPDATED',
          protocolVersion: D1_PROTOCOL_VERSION,
          projectionType: 'IDEAS_VAULT',
          timestamp: new Date().toISOString(),
        })
      }

      switch (intent.kind) {
        case 'SAVE_IDEA': {
          const savedIdea = this.getIdeasVault().saveIdea({
            originalText: intent.ideaText,
          })
          const ideas = this.getIdeasVault().listIdeas()
          await completeKernelTask(`Saved idea ${savedIdea.id}`)
          emitVaultUpdate()
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: `Saved idea "${savedIdea.title}" to Local Ideas Vault.`,
            savedIdea,
            ideas,
          }
        }

        case 'ADD_STUDY_NOTE': {
          const vault = this.getIdeasVault()
          const savedNote = vault.saveStudyNote({
            title: intent.topic
              ? `${intent.subject}: ${intent.topic}`
              : `${intent.subject} Notes`,
            originalText: intent.noteText,
            subject: intent.subject,
            topic: intent.topic,
          })
          const ideas = vault.listIdeas()
          await completeKernelTask(`Saved study note ${savedNote.id} under ${intent.subject}`)
          emitVaultUpdate()
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: `Added study note "${savedNote.title}" to ${savedNote.subject} in Knowledge Hub.`,
            savedIdea: savedNote,
            ideas,
          }
        }

        case 'CREATE_PROJECT': {
          const vault = this.getIdeasVault()
          const relatedIdeas = vault
            .searchIdeas(intent.projectTitle)
            .filter((i) => i.collection === 'IDEA')
            .map((i) => i.id)
          const savedProject = vault.createProject({
            title: intent.projectTitle,
            originalText: intent.rawInput,
            summary: intent.description,
            linkedItemIds: relatedIdeas,
          })
          const ideas = vault.listIdeas()
          await completeKernelTask(`Created project ${savedProject.id}`)
          emitVaultUpdate()
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: `Created project "${savedProject.title}" in Knowledge Hub.`,
            savedIdea: savedProject,
            ideas,
          }
        }

        case 'CREATE_TASK': {
          const vault = this.getIdeasVault()
          const projects = vault.listItems({ collection: 'PROJECT' })
          const defaultProject = projects[0]?.id ?? null
          const savedTask = vault.createTask({
            title: intent.taskTitle,
            originalText: intent.originalText,
            dueDate: intent.dueDateExpression,
            subject: intent.subject,
            topic: intent.topic,
            projectId: defaultProject,
          })
          const ideas = vault.listIdeas()
          await completeKernelTask(`Created task ${savedTask.id}`)
          emitVaultUpdate()
          const dueSuffix = savedTask.dueDate ? ` (due ${savedTask.dueDate})` : ''
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: `Added task "${savedTask.title}"${dueSuffix} to Knowledge Hub.`,
            savedIdea: savedTask,
            ideas,
          }
        }

        case 'COMPLETE_TASK': {
          const vault = this.getIdeasVault()
          const target = vault.findItemByTitleOrId(intent.targetQueryOrId)
          if (!target) {
            await this.kernel.execute({
              commandId: `cmd_fail_${commandId}`,
              commandType: 'TRANSITION_TASK',
              workSessionId,
              payload: {
                taskId,
                toState: 'FAILED',
                reason: `Task not found: ${intent.targetQueryOrId}`,
              },
            })
            return {
              commandId,
              workSessionId,
              runId,
              taskId,
              intentKind: intent.kind,
              status: 'ERROR',
              terminalState: 'FAILED',
              message: `No task found matching "${intent.targetQueryOrId}".`,
            }
          }
          const updated = vault.setTaskCompletion(target.id, true)
          const ideas = vault.listIdeas()
          await completeKernelTask(`Completed task ${updated.id}`)
          emitVaultUpdate()
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: `Marked task "${updated.title}" as DONE.`,
            savedIdea: updated,
            ideas,
          }
        }

        case 'LIST_UNFINISHED_TASKS': {
          const tasks = this.getIdeasVault().listUnfinishedTasks()
          await completeKernelTask(`Listed ${tasks.length} unfinished tasks`)
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message:
              tasks.length > 0
                ? `Showing ${tasks.length} unfinished task(s): ${tasks.map((t) => `${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ''}`).join(', ')}.`
                : 'You have no unfinished tasks in Knowledge Hub.',
            ideas: tasks,
          }
        }

        case 'LIST_COLLECTION': {
          const items = this.getIdeasVault().listItems({
            collection: intent.collection,
            subject: intent.subject,
          })
          await completeKernelTask(`Listed ${items.length} Knowledge Hub items`)
          const label = intent.subject
            ? `${intent.subject} notes`
            : intent.collection === 'PROJECT'
              ? 'projects'
              : intent.collection === 'PLAN_TASK'
                ? 'tasks'
                : 'study notes'
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message:
              items.length > 0
                ? `Showing ${items.length} ${label} from Knowledge Hub.`
                : `No ${label} found in Knowledge Hub.`,
            ideas: items,
          }
        }

        case 'LINK_ITEMS': {
          const vault = this.getIdeasVault()
          const src = vault.findItemByTitleOrId(intent.sourceQuery)
          const tgt = vault.findItemByTitleOrId(intent.targetQuery)
          if (!src || !tgt) {
            await this.kernel.execute({
              commandId: `cmd_fail_${commandId}`,
              commandType: 'TRANSITION_TASK',
              workSessionId,
              payload: {
                taskId,
                toState: 'FAILED',
                reason: 'Could not resolve items to link',
              },
            })
            return {
              commandId,
              workSessionId,
              runId,
              taskId,
              intentKind: intent.kind,
              status: 'ERROR',
              terminalState: 'FAILED',
              message: `Could not find both "${intent.sourceQuery}" and "${intent.targetQuery}" to link.`,
            }
          }
          const linkedRecord = vault.linkItems(src.id, tgt.id, 'related')
          const ideas = vault.listIdeas()
          await completeKernelTask(`Linked ${src.id} <-> ${tgt.id}`)
          emitVaultUpdate()
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: `Linked "${src.title}" (${src.collection}) with "${tgt.title}" (${tgt.collection}).`,
            linkedRecord,
            ideas,
          }
        }

        case 'EXPORT_MARKDOWN': {
          const markdownExport = this.getIdeasVault().exportAllToMarkdownDirectory()
          await completeKernelTask(`Exported ${markdownExport.exportedCount} items to Markdown`)
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: `Exported ${markdownExport.exportedCount} Knowledge Hub item(s) to Markdown at "${markdownExport.exportDirectory}".`,
            markdownExport,
          }
        }

        case 'LIST_IDEAS': {
          const ideas = this.getIdeasVault().listIdeas()
          await completeKernelTask(`Listed ${ideas.length} ideas`)
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message:
              ideas.length > 0
                ? `Showing ${ideas.length} saved item(s) from Local Knowledge Hub.`
                : 'Your Local Knowledge Hub is currently empty.',
            ideas,
          }
        }

        case 'SEARCH_IDEAS': {
          const ideas = this.getIdeasVault().searchIdeas(intent.query)
          await completeKernelTask(`Searched ideas for "${intent.query}" (${ideas.length} matches)`)
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message:
              ideas.length > 0
                ? `Found ${ideas.length} matching item(s) for "${intent.query}": "${ideas[0]!.originalText}"`
                : `No saved items matched "${intent.query}".`,
            ideas,
          }
        }

        case 'LAUNCH_APP': {
          const launchedApp = await this.appLauncher.launchApp(intent.appId, controller.signal)
          if (controller.signal.aborted) {
            throw new Error('CANCELLED_BY_OPERATOR')
          }
          await completeKernelTask(`Launched allowlisted app ${launchedApp.displayName}`)
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: launchedApp.message,
            launchedApp,
          }
        }

        case 'OPEN_ENTERTAINMENT': {
          await completeKernelTask(`Requested approved entertainment service: ${intent.displayName}`)
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: `Opening ${intent.displayName} (${intent.url}) in your desktop browser.`,
            entertainmentAction: {
              service: intent.service,
              url: intent.url,
              displayName: intent.displayName,
            },
          }
        }

        case 'AUTOMATE_NOTEPAD': {
          const approvedDir = join(this.dataRoot, 'approved-notes')
          const notepadRes = await this.appLauncher.executeNotepadAutomation({
            textToType: intent.textToType,
            requiresSaveApproval: intent.requiresSaveApproval,
            saveApproved: req.saveApproved,
            approvedDirectory: approvedDir,
            fileName: 'gravitas-hello.txt',
            signal: controller.signal,
          })

          if (notepadRes.status === 'CONFIRMATION_REQUIRED') {
            await this.kernel.execute({
              commandId: `cmd_wait_${commandId}`,
              commandType: 'TRANSITION_TASK',
              workSessionId,
              payload: {
                taskId,
                toState: 'WAITING_APPROVAL',
                reason: 'Awaiting explicit operator approval to save Notepad file to disk',
              },
            })
            return {
              commandId,
              workSessionId,
              runId,
              taskId,
              intentKind: intent.kind,
              status: 'CONFIRMATION_REQUIRED',
              terminalState: 'WAITING_CONFIRMATION',
              message: notepadRes.message,
              notepadAutomation: notepadRes,
              pendingApprovalCommand: req.input,
            }
          }

          await completeKernelTask(`Automated Notepad and saved to ${notepadRes.savedFilePath}`)
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: notepadRes.message,
            notepadAutomation: notepadRes,
          }
        }

        case 'DELETE_IDEA_PROMPT': {
          const vault = this.getIdeasVault()
          const target = vault.getIdea(intent.targetQueryOrId) ?? vault.searchIdeas(intent.targetQueryOrId)[0]
          if (!target) {
            await this.kernel.execute({
              commandId: `cmd_fail_${commandId}`,
              commandType: 'TRANSITION_TASK',
              workSessionId,
              payload: {
                taskId,
                toState: 'FAILED',
                reason: `No idea found matching "${intent.targetQueryOrId}"`,
              },
            })
            return {
              commandId,
              workSessionId,
              runId,
              taskId,
              intentKind: intent.kind,
              status: 'ERROR',
              terminalState: 'FAILED',
              message: `No idea found matching "${intent.targetQueryOrId}".`,
            }
          }

          await this.kernel.execute({
            commandId: `cmd_wait_${commandId}`,
            commandType: 'TRANSITION_TASK',
            workSessionId,
            payload: {
              taskId,
              toState: 'WAITING_APPROVAL',
              reason: `Awaiting explicit user confirmation to delete idea ${target.id}`,
            },
          })

          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'CONFIRMATION_REQUIRED',
            terminalState: 'WAITING_CONFIRMATION',
            message: `Confirmation required to delete "${target.title}". Use the Confirm Delete button to proceed.`,
            pendingDeleteIdea: target,
          }
        }

        case 'SIMULATE_LONG_TASK': {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              controller.signal.removeEventListener('abort', onAbort)
              resolve()
            }, intent.durationMs)
            const onAbort = () => {
              clearTimeout(timer)
              reject(new Error('CANCELLED_BY_OPERATOR'))
            }
            if (controller.signal.aborted) {
              onAbort()
            } else {
              controller.signal.addEventListener('abort', onAbort, { once: true })
            }
          })

          await completeKernelTask('Completed long assistant task')

          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: 'Completed analysis task.',
          }
        }

        case 'SHOW_ASSIGNMENTS': {
          const guardian = this.getStudyGuardian()
          const assignments = guardian.listAssignments()
          const unfinished = assignments.filter((a) => a.status !== 'COMPLETED')
          await completeKernelTask(`Listed ${assignments.length} assignments`)
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message:
              assignments.length > 0
                ? `Showing ${assignments.length} assignment(s) (${unfinished.length} unfinished): ${assignments
                    .map((a) => `${a.subjectCode} - ${a.title} [${a.progressPercent}%, ${a.status}]`)
                    .join('; ')}.`
                : 'You have no tracked assignments in Study Guardian yet.',
            assignments,
          }
        }

        case 'DUE_THIS_WEEK': {
          const guardian = this.getStudyGuardian()
          const dueAssignments = guardian.listDueThisWeek()
          await completeKernelTask(`Listed ${dueAssignments.length} assignments due this week`)
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message:
              dueAssignments.length > 0
                ? `Due within the next 7 days (${dueAssignments.length}): ${dueAssignments
                    .map((a) => `${a.subjectCode} - ${a.title} (due ${a.dueDate}, ${a.progressPercent}%)`)
                    .join('; ')}.`
                : 'No assignments have confirmed due dates within the next 7 days.',
            assignments: dueAssignments,
          }
        }

        case 'DUE_TODAY': {
          const today = new Date().toISOString().slice(0, 10)
          const vaultTasks = this.getIdeasVault().listUnfinishedTasks().filter((t) => t.dueDate === today)
          const guardian = this.getStudyGuardian()
          const assignmentsToday = guardian.listAssignments().filter((a) => a.dueDate.startsWith(today) && a.status !== 'COMPLETED')
          await completeKernelTask(`Found ${vaultTasks.length} task(s) and ${assignmentsToday.length} assignment(s) due today`)
          const count = vaultTasks.length + assignmentsToday.length
          const summaryParts: string[] = []
          if (vaultTasks.length > 0) {
            summaryParts.push(...vaultTasks.map((t) => `Task: ${t.title}`))
          }
          if (assignmentsToday.length > 0) {
            summaryParts.push(...assignmentsToday.map((a) => `Assignment: ${a.subjectCode} — ${a.title}`))
          }
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message:
              count > 0
                ? `You have ${count} item(s) due today: ${summaryParts.join('; ')}.`
                : 'Nothing is due today! Your schedule is completely clear.',
            ideas: vaultTasks,
            assignments: assignmentsToday,
          }
        }

        case 'SHOW_SUBJECT_ASSIGNMENTS': {
          const inbox = this.getICloudInbox()
          const guardian = this.getStudyGuardian()
          const resolvedSubject = inbox.getSemesterSubject(intent.subjectQuery)
          const matches = guardian.listAssignments({
            subjectCode: resolvedSubject ? resolvedSubject.code : intent.subjectQuery,
          })
          await completeKernelTask(
            `Listed ${matches.length} assignments for "${resolvedSubject?.code ?? intent.subjectQuery}"`
          )
          const subjectLabel = resolvedSubject
            ? `${resolvedSubject.code} — ${resolvedSubject.name}`
            : intent.subjectQuery
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message:
              matches.length > 0
                ? `Showing ${matches.length} assignment(s) for ${subjectLabel}: ${matches
                    .map((a) => `${a.title} [${a.progressPercent}%, ${a.status}]`)
                    .join('; ')}.`
                : `No assignments found for ${subjectLabel}.`,
            assignments: matches,
          }
        }

        case 'UPDATE_ASSIGNMENT_PROGRESS': {
          const guardian = this.getStudyGuardian()
          let targetId = req.targetAssignmentId
          if (!targetId) {
            const candidates = guardian.findMatchingAssignments(intent.targetQuery, true)
            if (candidates.length === 0) {
              const proposal = this.getCapabilityRegistry().recordFailedAttempt({
                capabilityId: 'cap:study:subject-classification',
                triggerCommand: req.input,
                failureReason: `No active assignment matched "${intent.targetQuery}"`,
                suggestedImprovement: `Add subject/assignment alias mapping for "${intent.targetQuery}" after human review.`,
              })
              await this.kernel.execute({
                commandId: `cmd_fail_${commandId}`,
                commandType: 'TRANSITION_TASK',
                workSessionId,
                payload: {
                  taskId,
                  toState: 'FAILED',
                  reason: `No active assignment matched "${intent.targetQuery}"`,
                },
              })
              return {
                commandId,
                workSessionId,
                runId,
                taskId,
                intentKind: intent.kind,
                status: 'ERROR',
                terminalState: 'FAILED',
                message: `No unfinished assignment matched "${intent.targetQuery}".`,
                improvementProposal: proposal,
              }
            }
            if (candidates.length > 1) {
              await this.kernel.execute({
                commandId: `cmd_wait_${commandId}`,
                commandType: 'TRANSITION_TASK',
                workSessionId,
                payload: {
                  taskId,
                  toState: 'WAITING_APPROVAL',
                  reason: `Multiple assignments matched "${intent.targetQuery}"; clarification required`,
                },
              })
              return {
                commandId,
                workSessionId,
                runId,
                taskId,
                intentKind: intent.kind,
                status: 'CLARIFICATION_REQUIRED',
                terminalState: 'WAITING_CONFIRMATION',
                message: `Multiple unfinished assignments matched "${intent.targetQuery}" (${candidates
                  .map((c) => `${c.subjectCode}: ${c.title}`)
                  .join(', ')}). Please clarify which assignment to update to ${intent.progressPercent}%.`,
                clarificationCandidates: candidates,
                pendingApprovalCommand: req.input,
              }
            }
            targetId = candidates[0]!.assignmentId
          }

          const updated = guardian.updateAssignmentProgress(targetId, intent.progressPercent)
          const assignments = guardian.listAssignments()
          await completeKernelTask(`Updated assignment ${updated.assignmentId} progress to ${updated.progressPercent}%`)
          emitVaultUpdate()
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: `Updated "${updated.title}" (${updated.subjectCode}) to ${updated.progressPercent}% (${updated.status}).`,
            updatedAssignment: updated,
            assignments,
          }
        }

        case 'SNOOZE_ASSIGNMENT_REMINDER': {
          const guardian = this.getStudyGuardian()
          let targetId = req.targetAssignmentId
          if (!targetId) {
            const candidates = intent.targetQuery
              ? guardian.findMatchingAssignments(intent.targetQuery, true)
              : guardian.listAssignments({ unfinishedOnly: true })
            if (candidates.length === 0) {
              await this.kernel.execute({
                commandId: `cmd_fail_${commandId}`,
                commandType: 'TRANSITION_TASK',
                workSessionId,
                payload: {
                  taskId,
                  toState: 'FAILED',
                  reason: 'No unfinished assignment found to snooze reminder',
                },
              })
              return {
                commandId,
                workSessionId,
                runId,
                taskId,
                intentKind: intent.kind,
                status: 'ERROR',
                terminalState: 'FAILED',
                message: 'No unfinished assignment found to schedule a reminder.',
              }
            }
            if (candidates.length > 1) {
              await this.kernel.execute({
                commandId: `cmd_wait_${commandId}`,
                commandType: 'TRANSITION_TASK',
                workSessionId,
                payload: {
                  taskId,
                  toState: 'WAITING_APPROVAL',
                  reason: 'Multiple unfinished assignments matched reminder command; clarification required',
                },
              })
              return {
                commandId,
                workSessionId,
                runId,
                taskId,
                intentKind: intent.kind,
                status: 'CLARIFICATION_REQUIRED',
                terminalState: 'WAITING_CONFIRMATION',
                message: `Multiple unfinished assignments found (${candidates
                  .map((c) => `${c.subjectCode}: ${c.title}`)
                  .join(', ')}). Please clarify which assignment to remind you about (${intent.whenExpression}).`,
                clarificationCandidates: candidates,
                pendingApprovalCommand: req.input,
              }
            }
            targetId = candidates[0]!.assignmentId
          }

          const updated = guardian.snoozeAssignmentByExpression(targetId, intent.whenExpression)
          const assignments = guardian.listAssignments()
          await completeKernelTask(`Snoozed reminder for ${updated.assignmentId} until ${updated.snoozedUntil}`)
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: `Scheduled reminder for "${updated.title}" (${updated.subjectCode}) at ${updated.snoozedUntil}.`,
            updatedAssignment: updated,
            assignments,
          }
        }

        case 'COMPLETE_ASSIGNMENT': {
          const guardian = this.getStudyGuardian()
          let targetId = req.targetAssignmentId
          if (!targetId) {
            const candidates = intent.targetQuery
              ? guardian.findMatchingAssignments(intent.targetQuery, true)
              : guardian.listAssignments({ unfinishedOnly: true })
            if (candidates.length === 0) {
              await this.kernel.execute({
                commandId: `cmd_fail_${commandId}`,
                commandType: 'TRANSITION_TASK',
                workSessionId,
                payload: {
                  taskId,
                  toState: 'FAILED',
                  reason: 'No unfinished assignment matched completion request',
                },
              })
              return {
                commandId,
                workSessionId,
                runId,
                taskId,
                intentKind: intent.kind,
                status: 'ERROR',
                terminalState: 'FAILED',
                message: 'No matching unfinished assignment found to mark complete.',
              }
            }
            if (candidates.length > 1) {
              await this.kernel.execute({
                commandId: `cmd_wait_${commandId}`,
                commandType: 'TRANSITION_TASK',
                workSessionId,
                payload: {
                  taskId,
                  toState: 'WAITING_APPROVAL',
                  reason: 'Multiple unfinished assignments matched completion command; clarification required',
                },
              })
              return {
                commandId,
                workSessionId,
                runId,
                taskId,
                intentKind: intent.kind,
                status: 'CLARIFICATION_REQUIRED',
                terminalState: 'WAITING_CONFIRMATION',
                message: `Multiple unfinished assignments matched (${candidates
                  .map((c) => `${c.subjectCode}: ${c.title}`)
                  .join(', ')}). Please clarify which assignment to mark complete.`,
                clarificationCandidates: candidates,
                pendingApprovalCommand: req.input,
              }
            }
            targetId = candidates[0]!.assignmentId
          }

          const updated = guardian.markAssignmentCompleted(targetId)
          const assignments = guardian.listAssignments()
          await completeKernelTask(`Marked assignment ${updated.assignmentId} completed`)
          emitVaultUpdate()
          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'SUCCESS',
            terminalState: 'SUCCEEDED',
            message: `Marked assignment "${updated.title}" (${updated.subjectCode}) as COMPLETED (100%). Follow-up reminders stopped.`,
            updatedAssignment: updated,
            assignments,
          }
        }

        case 'BLOCKED_APP': {
          const proposal = this.getCapabilityRegistry().recordFailedAttempt({
            capabilityId: 'cap:desktop:launch-app',
            triggerCommand: intent.rawInput,
            failureReason: intent.reason,
            suggestedImprovement: `Operator requested launching "${intent.requestedApp}". Propose human-reviewed allowlist evaluation without granting automatic shell or OS execution privileges.`,
          })

          await this.kernel.execute({
            commandId: `cmd_fail_${commandId}`,
            commandType: 'TRANSITION_TASK',
            workSessionId,
            payload: {
              taskId,
              toState: 'FAILED',
              reason: intent.reason,
            },
          })

          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'ERROR',
            terminalState: 'FAILED',
            message: intent.reason,
            improvementProposal: proposal,
          }
        }

        case 'UNKNOWN_COMMAND': {
          const proposal = this.getCapabilityRegistry().recordFailedAttempt({
            capabilityId: 'cap:assistant:nl-command',
            triggerCommand: intent.rawInput || req.input,
            failureReason: intent.reason,
            suggestedImprovement: `Unrecognized natural-language command "${(intent.rawInput || req.input).slice(0, 120)}". Propose adding a deterministic intent pattern after human review.`,
          })

          await this.kernel.execute({
            commandId: `cmd_fail_${commandId}`,
            commandType: 'TRANSITION_TASK',
            workSessionId,
            payload: {
              taskId,
              toState: 'FAILED',
              reason: intent.reason,
            },
          })

          return {
            commandId,
            workSessionId,
            runId,
            taskId,
            intentKind: intent.kind,
            status: 'ERROR',
            terminalState: 'FAILED',
            message: intent.reason,
            improvementProposal: proposal,
          }
        }
      }
    } catch (err) {
      const errMessage = (err as Error).message || 'Assistant command failed'
      const isCancelled = controller.signal.aborted || errMessage.includes('CANCELLED')

      try {
        await this.kernel.execute({
          commandId: `cmd_term_${randomUUID().slice(0, 8)}`,
          commandType: 'TRANSITION_TASK',
          workSessionId,
          payload: {
            taskId,
            toState: isCancelled ? 'CANCELLED' : 'FAILED',
            reason: sanitizeText(errMessage),
          },
        })
      } catch {}

      if (isCancelled) {
        return {
          commandId,
          workSessionId,
          runId,
          taskId,
          intentKind: intent.kind,
          status: 'CANCELLED',
          terminalState: 'CANCELLED',
          message: 'Action cancelled by operator. Safe terminal state (CANCELLED) reached.',
        }
      }

      const proposal = this.getCapabilityRegistry().recordFailedAttempt({
        capabilityId: intent.kind === 'LAUNCH_APP' ? 'cap:desktop:launch-app' : 'cap:assistant:nl-command',
        triggerCommand: req.input,
        failureReason: errMessage,
        suggestedImprovement: `Task failed with "${errMessage}". Recorded for human review.`,
      })

      return {
        commandId,
        workSessionId,
        runId,
        taskId,
        intentKind: intent.kind,
        status: 'ERROR',
        terminalState: 'FAILED',
        message: sanitizeText(errMessage),
        improvementProposal: proposal,
      }
    } finally {
      this.activeDispatches.delete(commandId)
      this.activeDispatches.delete(taskId)
      this.inFlightDispatchTasks.delete(taskId)
    }
  }

  public async cancelAssistantCommand(commandId?: string): Promise<CancelAssistantCommandResult> {
    this.voiceController.cancelPushToTalk()

    if (commandId && this.activeDispatches.has(commandId)) {
      const ctrl = this.activeDispatches.get(commandId)!
      ctrl.abort()
      return {
        cancelled: true,
        commandId,
        terminalState: 'CANCELLED',
        message: `Cancelled active command ${commandId}. Safe terminal state (CANCELLED) verified.`,
      }
    }

    let abortedCount = 0
    for (const ctrl of this.activeDispatches.values()) {
      ctrl.abort()
      abortedCount++
    }

    return {
      cancelled: true,
      commandId: commandId || (abortedCount > 0 ? 'ACTIVE_COMMAND' : 'IDLE_SAFE'),
      terminalState: 'CANCELLED',
      message:
        abortedCount > 0
          ? 'Cancelled active action immediately. Safe terminal state (CANCELLED) verified.'
          : 'Stopped assistant activity. Companion is in safe terminal state (CANCELLED).',
    }
  }

  public handleIdeasVaultOperation(
    payload: IdeasVaultOperationRequest['payload']
  ): IdeasVaultOperationResult {
    try {
      const vault = this.getIdeasVault()
      switch (payload.action) {
        case 'SAVE': {
          const idea = vault.saveIdea(payload.input)
          return {
            success: true,
            action: 'SAVE',
            idea,
            ideas: vault.listIdeas(),
          }
        }
        case 'LIST': {
          return {
            success: true,
            action: 'LIST',
            ideas: payload.filter ? vault.listItems(payload.filter) : vault.listIdeas(),
          }
        }
        case 'SEARCH': {
          return {
            success: true,
            action: 'SEARCH',
            ideas: vault.searchIdeas(payload.query),
          }
        }
        case 'GET': {
          return {
            success: true,
            action: 'GET',
            idea: vault.getIdea(payload.id),
          }
        }
        case 'UPDATE': {
          const idea = vault.updateIdea(payload.input)
          return {
            success: true,
            action: 'UPDATE',
            idea,
            ideas: vault.listIdeas(),
          }
        }
        case 'DELETE': {
          const deleteResult = vault.deleteIdea(payload.id, payload.confirmed)
          return {
            success: deleteResult.deleted,
            action: 'DELETE',
            deleteResult,
            ideas: vault.listIdeas(),
          }
        }
        case 'COMPLETE_TASK': {
          const idea = vault.setTaskCompletion(payload.id, payload.completed)
          return {
            success: true,
            action: 'COMPLETE_TASK',
            idea,
            ideas: vault.listIdeas(),
          }
        }
        case 'LINK_ITEMS': {
          const linkRecord = vault.linkItems(
            payload.sourceId,
            payload.targetId,
            payload.relationship
          )
          return {
            success: true,
            action: 'LINK_ITEMS',
            linkRecord,
            ideas: vault.listIdeas(),
          }
        }
        case 'UNLINK_ITEMS': {
          const ok = vault.unlinkItems(payload.sourceId, payload.targetId)
          return {
            success: ok,
            action: 'UNLINK_ITEMS',
            ideas: vault.listIdeas(),
          }
        }
        case 'LIST_SUBJECTS': {
          return {
            success: true,
            action: 'LIST_SUBJECTS',
            subjects: vault.listSubjects(),
          }
        }
        case 'EXPORT_MARKDOWN': {
          const markdownExport = vault.exportAllToMarkdownDirectory(payload.targetDirectory)
          return {
            success: true,
            action: 'EXPORT_MARKDOWN',
            markdownExport,
          }
        }
        case 'IMPORT_MARKDOWN': {
          const idea = vault.importFromMarkdown(payload.markdownContent)
          return {
            success: true,
            action: 'IMPORT_MARKDOWN',
            idea,
            ideas: vault.listIdeas(),
          }
        }
      }
    } catch (err) {
      return {
        success: false,
        action: payload.action,
        errorMessage: sanitizeText((err as Error).message),
      }
    }
  }

  public async handleStudyGuardianOperation(
    payload: StudyGuardianOperationRequest['payload']
  ): Promise<StudyGuardianOperationResult> {
    try {
      const inbox = this.getICloudInbox()
      const guardian = this.getStudyGuardian()

      switch (payload.action) {
        case 'LIST_SEMESTER_SUBJECTS': {
          return {
            success: true,
            action: 'LIST_SEMESTER_SUBJECTS',
            semesterSubjects: inbox.listSemesterSubjects(),
          }
        }
        case 'GET_SUBJECT_WORKSPACE': {
          return {
            success: true,
            action: 'GET_SUBJECT_WORKSPACE',
            subjectWorkspace: inbox.getSubjectWorkspace(payload.subjectCodeOrQuery),
          }
        }
        case 'UPDATE_SEMESTER_SUBJECT': {
          const subjectRecord = inbox.updateSemesterSubject({
            code: payload.code,
            name: payload.name,
            credits: payload.credits,
            keywords: payload.keywords,
            notes: payload.notes,
          })
          return {
            success: true,
            action: 'UPDATE_SEMESTER_SUBJECT',
            subjectRecord,
            semesterSubjects: inbox.listSemesterSubjects(),
          }
        }
        case 'ADD_SUBJECT_ENTRY': {
          const subjectEntry = inbox.addSubjectSectionEntry({
            subjectCode: payload.subjectCode,
            bucket: payload.bucket,
            title: payload.title,
            originalContent: payload.originalContent,
            generatedOrEditedContent: payload.generatedOrEditedContent,
            linkedAssignmentId: payload.linkedAssignmentId,
            attachmentPath: payload.attachmentPath,
          })
          return {
            success: true,
            action: 'ADD_SUBJECT_ENTRY',
            subjectEntry,
            subjectWorkspace: inbox.getSubjectWorkspace(payload.subjectCode),
          }
        }
        case 'GET_INBOX_CONFIG': {
          return {
            success: true,
            action: 'GET_INBOX_CONFIG',
            inboxConfig: inbox.getInboxConfig(),
          }
        }
        case 'SET_INBOX_FOLDER': {
          const inboxConfig = inbox.setInboxFolder(payload.folderPath, {
            startWatcher: payload.startWatcher,
            maxFileSizeBytes: payload.maxFileSizeBytes,
          })
          return {
            success: true,
            action: 'SET_INBOX_FOLDER',
            inboxConfig,
          }
        }
        case 'SCAN_INBOX': {
          const inboxScan = await inbox.scanAndReconcileInbox(payload.customFolderPath)
          for (const errItem of inboxScan.errorRecords) {
            this.getCapabilityRegistry().recordFailedAttempt({
              capabilityId: 'cap:study:inbox-import',
              triggerCommand: `import:${errItem.sourceFileName}`,
              failureReason: errItem.errorMessage ?? errItem.status,
              suggestedImprovement: `Review inbox file failure (${errItem.status}) for "${errItem.sourceFileName}".`,
            })
          }
          for (const draft of inboxScan.createdDrafts) {
            if (draft.extractionStatus === 'NEEDS_MANUAL_REVIEW') {
              this.getCapabilityRegistry().recordFailedAttempt({
                capabilityId: 'cap:study:assignment-extraction',
                triggerCommand: `extract:${draft.title}`,
                failureReason: draft.extractionNote,
                suggestedImprovement: `Enhance local extraction heuristics or syllabus keywords for "${draft.title}" after human review.`,
              })
            }
          }
          return {
            success: true,
            action: 'SCAN_INBOX',
            inboxScan,
            inboxConfig: inbox.getInboxConfig(),
            inboxImports: inbox.listInboxImports(),
            assignmentDrafts: inbox.listAssignmentDrafts(),
          }
        }
        case 'LIST_INBOX_IMPORTS': {
          return {
            success: true,
            action: 'LIST_INBOX_IMPORTS',
            inboxImports: inbox.listInboxImports(),
            assignmentDrafts: inbox.listAssignmentDrafts(),
          }
        }
        case 'LIST_ASSIGNMENT_DRAFTS': {
          return {
            success: true,
            action: 'LIST_ASSIGNMENT_DRAFTS',
            assignmentDrafts: inbox.listAssignmentDrafts(),
          }
        }
        case 'CONFIRM_ASSIGNMENT': {
          const assignment = guardian.createOrConfirmAssignment({
            draftId: payload.draftId,
            title: payload.title,
            confirmedSubjectCode: payload.confirmedSubjectCode,
            confirmedDueDate: payload.confirmedDueDate,
            teacherInstructions: payload.teacherInstructions,
            subtasks: payload.subtasks,
            reminderIntervalMinutes: payload.reminderIntervalMinutes,
            quietHoursStart: payload.quietHoursStart,
            quietHoursEnd: payload.quietHoursEnd,
          })
          return {
            success: true,
            action: 'CONFIRM_ASSIGNMENT',
            assignment,
            assignments: guardian.listAssignments(),
            assignmentDrafts: inbox.listAssignmentDrafts(),
          }
        }
        case 'LIST_ASSIGNMENTS': {
          return {
            success: true,
            action: 'LIST_ASSIGNMENTS',
            assignments: guardian.listAssignments({
              subjectCode: payload.subjectCode,
              status: payload.status,
              unfinishedOnly: payload.unfinishedOnly,
            }),
          }
        }
        case 'LIST_DUE_THIS_WEEK': {
          return {
            success: true,
            action: 'LIST_DUE_THIS_WEEK',
            assignments: guardian.listDueThisWeek(),
          }
        }
        case 'UPDATE_PROGRESS': {
          const assignment = guardian.updateAssignmentProgress(
            payload.assignmentId,
            payload.progressPercent
          )
          return {
            success: true,
            action: 'UPDATE_PROGRESS',
            assignment,
            assignments: guardian.listAssignments(),
          }
        }
        case 'COMPLETE_ASSIGNMENT': {
          const assignment = guardian.markAssignmentCompleted(payload.assignmentId)
          return {
            success: true,
            action: 'COMPLETE_ASSIGNMENT',
            assignment,
            assignments: guardian.listAssignments(),
          }
        }
        case 'CONFIGURE_REMINDER': {
          const assignment = guardian.configureReminderSettings({
            assignmentId: payload.assignmentId,
            reminderIntervalMinutes: payload.reminderIntervalMinutes,
            snoozedUntil: payload.snoozedUntil,
            paused: payload.paused,
            quietHoursStart: payload.quietHoursStart,
            quietHoursEnd: payload.quietHoursEnd,
          })
          return {
            success: true,
            action: 'CONFIGURE_REMINDER',
            assignment,
            assignments: guardian.listAssignments(),
          }
        }
        case 'EVALUATE_REMINDERS': {
          const reminderEvaluation = guardian.evaluateReminders(
            payload.referenceTimeIso ? new Date(payload.referenceTimeIso) : new Date(),
            { ignoreQuietHours: payload.ignoreQuietHours }
          )
          return {
            success: true,
            action: 'EVALUATE_REMINDERS',
            reminderEvaluation,
          }
        }
        case 'LIST_REMINDER_HISTORY': {
          return {
            success: true,
            action: 'LIST_REMINDER_HISTORY',
            reminderHistory: guardian.listReminderHistory(payload.assignmentId),
          }
        }
        case 'GET_SESSION_BRIEFING': {
          const sessionBriefing = guardian.getSessionBriefing(payload.trigger ?? 'APP_STARTUP')
          return {
            success: true,
            action: 'GET_SESSION_BRIEFING',
            sessionBriefing,
          }
        }
        case 'PREPARE_ANSWER_DRAFT': {
          const answerDraftResult = await guardian.prepareAnswerDraft(payload.assignmentId)
          return {
            success: true,
            action: 'PREPARE_ANSWER_DRAFT',
            answerDraftResult,
            studyAnswers: guardian.listStudyAnswers({ assignmentId: payload.assignmentId }),
          }
        }
        case 'SAVE_STUDY_ANSWER': {
          const studyAnswer = guardian.saveStudyAnswer({
            assignmentId: payload.assignmentId,
            answerDraftText: payload.answerDraftText,
            title: payload.title,
          })
          return {
            success: true,
            action: 'SAVE_STUDY_ANSWER',
            studyAnswer,
            studyAnswers: guardian.listStudyAnswers({ assignmentId: payload.assignmentId }),
          }
        }
        case 'LIST_STUDY_ANSWERS': {
          return {
            success: true,
            action: 'LIST_STUDY_ANSWERS',
            studyAnswers: guardian.listStudyAnswers({
              assignmentId: payload.assignmentId,
              subjectCode: payload.subjectCode,
            }),
          }
        }
        case 'CREATE_SEMESTER_SUBJECT': {
          const subjectRecord = inbox.createSemesterSubject({
            code: payload.code,
            name: payload.name,
            credits: payload.credits,
            keywords: payload.keywords,
            notes: payload.notes,
          })
          return {
            success: true,
            action: 'CREATE_SEMESTER_SUBJECT',
            subjectRecord,
            semesterSubjects: inbox.listSemesterSubjects(),
          }
        }
        case 'APPLY_PERSONA_SETUP': {
          const onboarding = this.getOnboardingService()
          const result = onboarding.applyPersonaSetup({
            persona: payload.persona,
            customSubjects: payload.customSubjects,
            useSevenSubjectTemplate: payload.useSevenSubjectTemplate,
          })
          return {
            success: result.success,
            action: 'APPLY_PERSONA_SETUP',
            personaSetupResult: result,
            semesterSubjects: inbox.listSemesterSubjects(),
          }
        }
        case 'TEST_INBOX_SETUP': {
          const onboarding = this.getOnboardingService()
          const verification = await onboarding.verifyInbox({
            folderPath: payload.folderPath,
            checkType: payload.checkType,
          })
          return {
            success: verification.isAccessible,
            action: 'TEST_INBOX_SETUP',
            inboxVerificationResult: verification,
            inboxConfig: inbox.getInboxConfig(),
          }
        }
        case 'EXECUTE_FIRST_SUCCESS': {
          const onboarding = this.getOnboardingService()
          const firstSuccess = onboarding.executeFirstSuccessAction({
            successAction: payload.successAction,
            title: payload.title,
            text: payload.text,
            subjectCode: payload.subjectCode,
            dueDate: payload.dueDate,
          })
          return {
            success: firstSuccess.success,
            action: 'EXECUTE_FIRST_SUCCESS',
            firstSuccessResult: firstSuccess,
            assignments: guardian.listAssignments(),
          }
        }
        case 'RESET_ONBOARDING': {
          const onboarding = this.getOnboardingService()
          onboarding.resetOnboarding()
          return {
            success: true,
            action: 'RESET_ONBOARDING',
          }
        }
      }
    } catch (err) {
      return {
        success: false,
        action: payload.action,
        errorMessage: sanitizeText((err as Error).message),
      }
    }
  }

  public async handleVoicePttOperation(
    payload: VoicePttRequest['payload']
  ): Promise<VoicePttOperationResult> {
    switch (payload.action) {
      case 'STATUS': {
        return {
          action: 'STATUS',
          statusProjection: this.voiceController.getStatus(),
        }
      }
      case 'START': {
        const startResult = this.voiceController.startPushToTalk(payload.userInitiated)
        return {
          action: 'START',
          statusProjection: this.voiceController.getStatus(),
          startResult,
        }
      }
      case 'STOP': {
        const transcriptionResult = await this.voiceController.stopPushToTalk({
          pttSessionId: payload.pttSessionId,
          audioSampleBase64: payload.audioSampleBase64,
        })
        return {
          action: 'STOP',
          statusProjection: this.voiceController.getStatus(),
          transcriptionResult,
        }
      }
      case 'CANCEL': {
        this.voiceController.cancelPushToTalk()
        return {
          action: 'CANCEL',
          statusProjection: this.voiceController.getStatus(),
        }
      }
    }
  }

  public handleCapabilityRegistryOperation(
    payload: CapabilityRegistryRequest['payload']
  ): CapabilityRegistryResult {
    const reg = this.getCapabilityRegistry()
    if (payload.action === 'FEEDBACK') {
      const recordedFeedback = reg.recordUserFeedback({
        capabilityId: payload.capabilityId,
        rating: payload.rating,
        comment: payload.comment,
      })
      return {
        capabilities: reg.listCapabilities(),
        proposals: reg.listImprovementProposals(),
        recordedFeedback,
      }
    }
    return {
      capabilities: reg.listCapabilities(),
      proposals: reg.listImprovementProposals(),
    }
  }

  public async shutdown(): Promise<void> {
    this.status = 'STOPPING'
    this.voiceController.cancelPushToTalk()
    if (this.icloudInbox) {
      this.icloudInbox.stopWatcher()
      this.icloudInbox = undefined
    }
    this.studyGuardian = undefined
    for (const controller of this.activeDispatches.values()) {
      controller.abort()
    }
    const deadline = Date.now() + this.shutdownDrainTimeoutMs
    while (this.activeDispatches.size > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    if (this.activeDispatches.size > 0) {
      for (const [stuckTaskId, stuckWsId] of this.inFlightDispatchTasks.entries()) {
        let recoverTimer: ReturnType<typeof setTimeout> | undefined
        try {
          await Promise.race([
            this.kernel.execute({
              commandId: `cmd_shutdown_recover_${randomUUID().slice(0, 8)}`,
              commandType: 'TRANSITION_TASK',
              workSessionId: stuckWsId,
              payload: {
                taskId: stuckTaskId,
                toState: 'RECOVERY_REQUIRED',
                reason: 'Dispatch did not settle before host shutdown deadline; recovery required',
              },
            }),
            new Promise<never>((_, reject) => {
              recoverTimer = setTimeout(() => reject(new Error('Shutdown recovery transition timed out')), 50)
            }),
          ])
        } catch {
          this.recentErrors.push('Shutdown drain deadline exceeded; kernel recovery required on restart')
        } finally {
          if (recoverTimer !== undefined) clearTimeout(recoverTimer)
        }
      }
      this.activeDispatches.clear()
      this.inFlightDispatchTasks.clear()
    }
    if (this.ideasVault) {
      this.ideasVault.close()
      this.ideasVault = undefined
      this.capabilityRegistry = undefined
    }
    ModelCapabilityHistory.getInstance().detachDurableWriter()
    let kernelShutdownTimer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        this.kernel.shutdown(),
        new Promise<void>((resolve) => {
          kernelShutdownTimer = setTimeout(resolve, this.shutdownDrainTimeoutMs)
        }),
      ])
    } finally {
      if (kernelShutdownTimer !== undefined) clearTimeout(kernelShutdownTimer)
    }
    this.status = 'STOPPED'
  }
}
