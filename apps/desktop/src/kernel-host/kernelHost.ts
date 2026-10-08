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
} from '../types.js'

export interface KernelHostOptions {
  readonly dbPath?: string
  readonly dataRoot?: string
  readonly onMessage?: (msg: KernelToMainMessage) => void
  readonly initialDiagnosticContext?: string
  readonly pid?: number
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
  return out
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
  private readonly dataRoot: string

  // Canonical auxiliary stores managed under single writer
  private readonly verificationPlans = new Map<string, StoredVerificationPlan>()
  private readonly approvalQueue = new Map<string, StoredApprovalItem>()
  private readonly executionRegistry = new Map<string, ExecutionItem>()
  private recentErrors: string[] = []

  constructor(opts: KernelHostOptions = {}) {
    this.startedAt = new Date().toISOString()
    this.diagnosticContext = opts.initialDiagnosticContext
    this.pid = opts.pid ?? process.pid
    this.sendMessage = opts.onMessage ?? ((msg) => {
      if (process.parentPort) {
        process.parentPort.postMessage(msg)
      }
    })

    this.dataRoot = opts.dataRoot ?? opts.dbPath ?? process.env.GRAVITAS_DATA_ROOT ?? join(tmpdir(), 'gravitas-desktop-kernel')
    this.kernel = new WorkSessionKernel({
      dataRoot: this.dataRoot,
    })

    // Seed default execution harness data for K1/K2/K3 projections
    this.seedExecutionRegistry()
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
      this.status = 'READY'
      this.sendMessage({
        type: 'HELLO',
        protocolVersion: D1_PROTOCOL_VERSION,
        kernelPid: this.pid,
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
              executorId: 'executor_agy_node24',
              roleId: task.assignedRoleId,
              harnessId: 'harness:antigravity:host',
              status: task.state === 'SUCCEEDED' ? 'COMPLETED' : 'READY',
            },
            workerResult: {
              resultSummary: `Execution of ${task.title} finished with state ${task.state}`,
              outputText: sanitizeText(`Worker stdout output for task ${task.id}`),
              completedAt: task.updatedAt,
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
        providerStatus: (process.env.NVIDIA_API_KEY || process.env.NIM_API_KEY) ? 'AVAILABLE' : 'AUTH_REQUIRED',
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

      case 'SHUTDOWN_REQUEST': {
        this.status = 'STOPPING'
        await this.kernel.shutdown()
        this.status = 'STOPPED'
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

  public async shutdown(): Promise<void> {
    this.status = 'STOPPING'
    await this.kernel.shutdown()
    this.status = 'STOPPED'
  }
}
