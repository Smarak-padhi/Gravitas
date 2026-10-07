/**
 * GRAVITAS D0/D1 — Desktop Shell Types & IPC Protocol Contracts
 *
 * Core architectural invariants:
 * - DESKTOP_UI != KERNEL
 * - RENDERER != PRIVILEGED_KERNEL
 * - UI != CANONICAL_STATE
 * - MAIN != CANONICAL_STATE_AUTHORITY
 * - RENDERER_LIFETIME != KERNEL_CANONICAL_LIFETIME
 * - ROLE != EXECUTOR != HARNESS != MODEL != PROVIDER != GATEWAY != PROCESS
 * - WORKER_SUCCESS != VERIFIED_SUCCESS
 * - TOOL_SUCCESS != VERIFIED_SUCCESS
 * - VERIFICATION_PASS != HUMAN_APPROVAL
 * - HASH != SIGNATURE
 * - HASH != EXTERNAL_TRUST
 * - HASH != IMMUTABILITY
 * - EVIDENCE_BUNDLE != TRUSTED_EVIDENCE
 * - HUMAN_APPROVAL != AUTO_MERGE / AUTO_DEPLOY / AUTO_RELEASE
 */

export const D0_PROTOCOL_VERSION = 'd0.1'
export const D1_PROTOCOL_VERSION = 'd1.0'
export const D2_PROTOCOL_VERSION = 'd2.0'
export const D3_PROTOCOL_VERSION = 'd3.0'
export const D4_PROTOCOL_VERSION = 'd4.0'

export type DesktopLifecycleState =
  | 'WINDOW_OPEN'
  | 'WINDOW_HIDDEN'
  | 'WINDOW_DESTROYED'
  | 'BACKGROUND_ACTIVE'
  | 'QUIT_REQUESTED'
  | 'KERNEL_STOPPING'
  | 'APP_EXITING'

export type KernelLifecycleStatus =
  | 'NOT_STARTED'
  | 'STARTING'
  | 'READY'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'FAILED'
  | 'STOPPING'
  | 'STOPPED'

// ─── Main <-> Kernel Host Protocol Messages ────────────────────────────────

export interface BaseProtocolMessage {
  readonly protocolVersion: string
  readonly timestamp: string
}

export interface HelloMessage extends BaseProtocolMessage {
  readonly type: 'HELLO'
  readonly kernelPid: number
  readonly nodeVersion: string
  readonly electronVersion?: string
}

export interface HealthRequest extends BaseProtocolMessage {
  readonly type: 'HEALTH_REQUEST'
  readonly requestId: string
}

export interface HealthResponse extends BaseProtocolMessage {
  readonly type: 'HEALTH_RESPONSE'
  readonly requestId: string
  readonly status: KernelLifecycleStatus
  readonly kernelPid: number
  readonly nodeVersion: string
  readonly activeSessionCount: number
  readonly schemaVersion: number
  readonly startedAt: string
  readonly safeDiagnosticContext?: string
}

export interface SnapshotRequest extends BaseProtocolMessage {
  readonly type: 'SNAPSHOT_REQUEST'
  readonly requestId: string
}

export interface DesktopWorkSessionSummary {
  readonly id: string
  readonly status: string
  readonly taskCount: number
  readonly activeJobCount: number
  readonly createdAt: string
  readonly revision?: number
}

export interface DesktopKernelSnapshot {
  readonly canonicalAuthority: 'KERNEL_UTILITY_PROCESS'
  readonly projectionTimestamp: string
  readonly totalSessions: number
  readonly sessions: readonly DesktopWorkSessionSummary[]
}

export interface SnapshotResponse extends BaseProtocolMessage {
  readonly type: 'SNAPSHOT_RESPONSE'
  readonly requestId: string
  readonly snapshot: DesktopKernelSnapshot
}

export interface ShutdownRequest extends BaseProtocolMessage {
  readonly type: 'SHUTDOWN_REQUEST'
  readonly requestId: string
}

export interface ShutdownAck extends BaseProtocolMessage {
  readonly type: 'SHUTDOWN_ACK'
  readonly requestId: string
}

export interface KernelErrorMessage extends BaseProtocolMessage {
  readonly type: 'KERNEL_ERROR'
  readonly errorCode: string
  readonly safeMessage: string
  readonly correlationId?: string
}

// ─── D1 Projection Models ───────────────────────────────────────────────────

export interface OverviewProjection {
  readonly kernelStatus: KernelLifecycleStatus
  readonly activeWorkSessionsCount: number
  readonly activeRunsCount: number
  readonly activeTasksCount: number
  readonly waitingApprovalCount: number
  readonly failedOrRecoveryCount: number
  readonly runningExecutionsCount: number
  readonly blockedAuthorityCount: number
  readonly blockedCostCount: number
  readonly generatedAt: string
  readonly canonicalRevision: number
  readonly recentActivitySummary: readonly string[]
}

export interface WorkHierarchyTaskItem {
  readonly id: string
  readonly runId: string
  readonly workSessionId: string
  readonly title: string
  readonly state: string
  readonly assignedRoleId: string
  readonly requiresApproval: boolean
  readonly createdAt: string
  readonly updatedAt: string
  readonly revision: number
}

export interface WorkHierarchyRunItem {
  readonly id: string
  readonly workSessionId: string
  readonly goal: string
  readonly state: string
  readonly createdAt: string
  readonly tasks: readonly WorkHierarchyTaskItem[]
  readonly revision: number
}

export interface WorkHierarchySessionItem {
  readonly id: string
  readonly state: string
  readonly revision: number
  readonly createdAt: string
  readonly updatedAt: string
  readonly runs: readonly WorkHierarchyRunItem[]
}

export interface WorkHierarchyProjection {
  readonly canonicalAuthority: 'KERNEL_UTILITY_PROCESS'
  readonly generatedAt: string
  readonly sessions: readonly WorkHierarchySessionItem[]
}

export interface TaskDetailProjection {
  readonly task: WorkHierarchyTaskItem
  readonly causalChain: {
    readonly workSessionId: string
    readonly runId: string
    readonly taskId: string
    readonly parentTaskId?: string
  }
  readonly executionContext?: {
    readonly executorId: string
    readonly roleId: string
    readonly harnessId: string
    readonly status: string
  }
  readonly workerResult?: {
    readonly resultSummary: string
    readonly outputText: string
    readonly completedAt: string
  }
  readonly verificationRef?: {
    readonly planId: string
    readonly verdict: string
  }
}

export interface ExecutionItem {
  readonly executionId: string
  readonly taskId: string
  readonly roleId: string
  readonly executorId: string
  readonly harnessId: string
  readonly surface: string
  readonly provider: string
  readonly model: string
  readonly processId: string
  readonly qualificationStatus: 'QUALIFIED' | 'DISCOVERED' | 'NOT_QUALIFIED'
  readonly readinessStatus: 'READY' | 'NOT_READY'
  readonly costEligibility: 'FREE_OPEN_SOURCE_LOCAL' | 'OPERATOR_INCLUDED_ACCOUNT' | 'UNKNOWN_COST' | 'PAID_BLOCKED'
  readonly dispatchAuthorization: 'AUTHORIZED' | 'DENIED'
  readonly grantedCapabilities: readonly string[]
  readonly status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED'
  readonly startedAt: string
  readonly completedAt?: string
  readonly boundedOutput: string
}

export interface ExecutionProjection {
  readonly generatedAt: string
  readonly executions: readonly ExecutionItem[]
}

export interface VerificationCriterionProjection {
  readonly criterionId: string
  readonly revision: number
  readonly label: string
  readonly kind: string
  readonly author: string
}

export interface VerificationProjection {
  readonly planId: string
  readonly taskId: string
  readonly workSessionId: string
  readonly runId: string
  readonly criteria: readonly VerificationCriterionProjection[]
  readonly verifierAssignmentsCount: number
  readonly findingsSummary: readonly string[]
  readonly verdict: 'VERIFIED_PASS' | 'INCONCLUSIVE' | 'FAIL'
  readonly workerReportedStatus: string
  readonly supervisorSessionStatus: string
  readonly independenceClass: 'STRUCTURAL' | 'NOT_PROVEN'
  readonly humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL' | 'HUMAN_APPROVED' | 'HUMAN_REJECTED' | 'NOT_REQUIRED'
  readonly limitations: readonly string[]
  readonly unknowns: readonly string[]
  readonly trustStatus: 'NOT_TRUSTED_EVIDENCE'
  readonly manifestCoreDigest: {
    readonly algorithm: 'sha256'
    readonly digestHex: string
    readonly semantics: 'CHANGE_DETECTION_RELATIVE_TO_REFERENCE_DIGEST'
    readonly isDigitalSignature: false
    readonly confersExternalTrust: false
    readonly confersImmutability: false
  }
  readonly generatedAt: string
  readonly revision: number
}

export interface ApprovalQueueItem {
  readonly queueItemId: string
  readonly itemType: 'VERIFICATION_GATE' | 'ARCHITECTURE_DECISION' | 'RECOVERY_GATE'
  readonly targetId: string // e.g. planId, arenaId, or sessionId
  readonly currentRevision: number
  readonly sourceWorkSessionId: string
  readonly sourceRunId?: string
  readonly sourceTaskId?: string
  readonly technicalOutcome: string
  readonly reportVerdict?: string
  readonly limitations: readonly string[]
  readonly unknowns: readonly string[]
  readonly requestedAction: string
  readonly consequences: string
  readonly status: 'WAITING_APPROVAL' | 'APPROVED' | 'REJECTED'
  readonly createdAt: string
}

export interface ApprovalQueueProjection {
  readonly generatedAt: string
  readonly totalPending: number
  readonly items: readonly ApprovalQueueItem[]
}

export interface SystemProjection {
  readonly supervisorStatus: KernelLifecycleStatus
  readonly kernelStatus: KernelLifecycleStatus
  readonly kernelPid: number
  readonly mainPid: number
  readonly protocolVersion: string
  readonly electronVersion: string
  readonly nodeVersion: string
  readonly dataRootSanitized: string
  readonly schemaVersion: number
  readonly activeHarnessCount: number
  readonly harnessReadinessSummary: Readonly<Record<string, string>>
  readonly toolRegistrySummary: readonly string[]
  readonly costPolicySummary: {
    readonly defaultTier: 'FREE_OPEN_SOURCE_LOCAL'
    readonly paidFallbackPermitted: false
    readonly autonomousPaymentAuthority: false
  }
  readonly modelIntelligenceSummary?: {
    readonly providerStatus: 'AVAILABLE' | 'AUTH_REQUIRED' | 'UNCONFIGURED'
    readonly qualifiedModelsCount: number
    readonly qualifiedModelIds: readonly string[]
    readonly defaultModel: string
    readonly costPolicy: string
    readonly outOfPocketUsd: number
    readonly paidFallbackPermitted: false
  } | undefined
  readonly recentErrors: readonly string[]
}

export interface ActivityEventItem {
  readonly sequenceNumber: number
  readonly eventId: string
  readonly aggregateType: string
  readonly aggregateId: string
  readonly eventType: string
  readonly occurredAt: string
  readonly summary: string
}

export interface ActivityProjection {
  readonly generatedAt: string
  readonly events: readonly ActivityEventItem[]
}

// ─── Operator Intent Contracts ──────────────────────────────────────────────

export type OperatorActorKind = 'HUMAN_OPERATOR'

export interface OperatorActor {
  readonly kind: OperatorActorKind
  readonly operatorId: string
}

export interface RecordHumanDecisionIntent {
  readonly intentType: 'RECORD_HUMAN_DECISION'
  readonly actor: OperatorActor
  readonly targetId: string // planId or queueItemId
  readonly decision: 'APPROVED' | 'REJECTED'
  readonly rationale: string
  readonly expectedRevision?: number
  readonly correlationId: string
  readonly timestamp: string
}

export interface CancelTaskIntent {
  readonly intentType: 'CANCEL_TASK'
  readonly actor: OperatorActor
  readonly targetId: string // taskId
  readonly expectedRevision?: number
  readonly reason: string
  readonly correlationId: string
  readonly timestamp: string
}

export interface RefreshProjectionIntent {
  readonly intentType: 'REFRESH_PROJECTION'
  readonly actor: OperatorActor
  readonly targetId: string // projection name or all
  readonly correlationId: string
  readonly timestamp: string
}

export type OperatorIntent =
  | RecordHumanDecisionIntent
  | CancelTaskIntent
  | RefreshProjectionIntent

export interface IntentResult {
  readonly correlationId: string
  readonly success: boolean
  readonly targetId: string
  readonly intentType: string
  readonly newRevision?: number
  readonly status: 'ACCEPTED' | 'REJECTED' | 'CONFLICT' | 'DENIED'
  readonly safeMessage: string
  /** Invariants verified in result */
  readonly authorizesMerge: false
  readonly authorizesRelease: false
  readonly authorizesDeploy: false
}

// ─── D1 IPC Messages (Main <-> Kernel) ───────────────────────────────────────

export interface D1GetOverviewRequest extends BaseProtocolMessage {
  readonly type: 'GET_OVERVIEW_REQUEST'
  readonly requestId: string
}

export interface D1GetOverviewResponse extends BaseProtocolMessage {
  readonly type: 'GET_OVERVIEW_RESPONSE'
  readonly requestId: string
  readonly projection: OverviewProjection
}

export interface D1GetWorkHierarchyRequest extends BaseProtocolMessage {
  readonly type: 'GET_WORK_HIERARCHY_REQUEST'
  readonly requestId: string
}

export interface D1GetWorkHierarchyResponse extends BaseProtocolMessage {
  readonly type: 'GET_WORK_HIERARCHY_RESPONSE'
  readonly requestId: string
  readonly projection: WorkHierarchyProjection
}

export interface D1GetTaskDetailRequest extends BaseProtocolMessage {
  readonly type: 'GET_TASK_DETAIL_REQUEST'
  readonly requestId: string
  readonly taskId: string
}

export interface D1GetTaskDetailResponse extends BaseProtocolMessage {
  readonly type: 'GET_TASK_DETAIL_RESPONSE'
  readonly requestId: string
  readonly projection: TaskDetailProjection | null
}

export interface D1GetExecutionRequest extends BaseProtocolMessage {
  readonly type: 'GET_EXECUTION_REQUEST'
  readonly requestId: string
}

export interface D1GetExecutionResponse extends BaseProtocolMessage {
  readonly type: 'GET_EXECUTION_RESPONSE'
  readonly requestId: string
  readonly projection: ExecutionProjection
}

export interface D1GetVerificationRequest extends BaseProtocolMessage {
  readonly type: 'GET_VERIFICATION_REQUEST'
  readonly requestId: string
  readonly planId?: string
}

export interface D1GetVerificationResponse extends BaseProtocolMessage {
  readonly type: 'GET_VERIFICATION_RESPONSE'
  readonly requestId: string
  readonly projection: VerificationProjection | null
}

export interface D1GetApprovalQueueRequest extends BaseProtocolMessage {
  readonly type: 'GET_APPROVAL_QUEUE_REQUEST'
  readonly requestId: string
}

export interface D1GetApprovalQueueResponse extends BaseProtocolMessage {
  readonly type: 'GET_APPROVAL_QUEUE_RESPONSE'
  readonly requestId: string
  readonly projection: ApprovalQueueProjection
}

export interface D1GetSystemRequest extends BaseProtocolMessage {
  readonly type: 'GET_SYSTEM_REQUEST'
  readonly requestId: string
}

export interface D1GetSystemResponse extends BaseProtocolMessage {
  readonly type: 'GET_SYSTEM_RESPONSE'
  readonly requestId: string
  readonly projection: SystemProjection
}

export interface D1GetActivityRequest extends BaseProtocolMessage {
  readonly type: 'GET_ACTIVITY_REQUEST'
  readonly requestId: string
}

export interface D1GetActivityResponse extends BaseProtocolMessage {
  readonly type: 'GET_ACTIVITY_RESPONSE'
  readonly requestId: string
  readonly projection: ActivityProjection
}

export interface D1OperatorIntentRequest extends BaseProtocolMessage {
  readonly type: 'OPERATOR_INTENT_REQUEST'
  readonly requestId: string
  readonly intent: OperatorIntent
}

export interface D1OperatorIntentResponse extends BaseProtocolMessage {
  readonly type: 'OPERATOR_INTENT_RESPONSE'
  readonly requestId: string
  readonly result: IntentResult
}

export interface D1ProjectionUpdatedNotification extends BaseProtocolMessage {
  readonly type: 'PROJECTION_UPDATED'
  readonly projectionType: string
}

export type D1MainToKernelMessage =
  | HealthRequest
  | SnapshotRequest
  | ShutdownRequest
  | D1GetOverviewRequest
  | D1GetWorkHierarchyRequest
  | D1GetTaskDetailRequest
  | D1GetExecutionRequest
  | D1GetVerificationRequest
  | D1GetApprovalQueueRequest
  | D1GetSystemRequest
  | D1GetActivityRequest
  | D1OperatorIntentRequest

export type D1KernelToMainMessage =
  | HelloMessage
  | HealthResponse
  | SnapshotResponse
  | ShutdownAck
  | KernelErrorMessage
  | D1GetOverviewResponse
  | D1GetWorkHierarchyResponse
  | D1GetTaskDetailResponse
  | D1GetExecutionResponse
  | D1GetVerificationResponse
  | D1GetApprovalQueueResponse
  | D1GetSystemResponse
  | D1GetActivityResponse
  | D1OperatorIntentResponse
  | D1ProjectionUpdatedNotification

export type MainToKernelMessage = D1MainToKernelMessage
export type KernelToMainMessage = D1KernelToMainMessage

// ─── Renderer-Facing Projections & Preload Bridge ──────────────────────────

export interface HealthProjection {
  readonly status: KernelLifecycleStatus
  readonly desktopRuntime: 'Electron'
  readonly protocolVersion: string
  readonly kernelPid: number
  readonly mainPid: number
  readonly nodeVersion: string
  readonly activeSessionCount: number
  readonly safeDiagnostic?: string
}

export interface SafeDesktopError {
  readonly code: string
  readonly message: string
}

/**
 * Allowlisted Preload API exposed on `window.gravitasDesktop`.
 * Strictly typed, zero direct Node/IPC primitive exposure.
 */
export interface GravitasDesktopBridge {
  getHealth(): Promise<HealthProjection>
  getSnapshot(): Promise<DesktopKernelSnapshot>
  getOverview(): Promise<OverviewProjection>
  getWorkHierarchy(): Promise<WorkHierarchyProjection>
  getTaskDetail(taskId: string): Promise<TaskDetailProjection | null>
  getExecution(): Promise<ExecutionProjection>
  getVerification(planId?: string): Promise<VerificationProjection | null>
  getApprovalQueue(): Promise<ApprovalQueueProjection>
  getSystem(): Promise<SystemProjection>
  getActivity(): Promise<ActivityProjection>
  submitIntent(intent: OperatorIntent): Promise<IntentResult>
  requestHideWindow(): Promise<void>
  requestQuitApplication(): Promise<void>
  onKernelStatus(callback: (status: KernelLifecycleStatus) => void): () => void
  onKernelError(callback: (err: SafeDesktopError) => void): () => void
  onProjectionUpdate(callback: (projectionType: string) => void): () => void
}

declare global {
  interface Window {
    gravitasDesktop?: GravitasDesktopBridge
  }
}
