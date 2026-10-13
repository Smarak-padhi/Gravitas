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

import type { DoctorReport } from '@gravitas/core'
export type { DoctorReport }

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
  readonly kernelInstanceId?: string
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
    readonly candidateModelsCount?: number
    readonly candidateModelIds?: readonly string[]
    readonly defaultModel: string
    readonly costPolicy: string
    readonly outOfPocketUsd: number
    readonly paidFallbackPermitted: false
  } | undefined
  readonly onboardingSummary?: {
    readonly completed: boolean
    readonly operatingMode: 'DETERMINISTIC_ONLY' | 'ASSISTED'
    readonly selectedHarnesses: readonly string[]
    readonly providerConfigured: boolean
    readonly isPortableDataRoot: boolean
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

export interface ConfigureProviderRequest extends BaseProtocolMessage {
  readonly type: 'CONFIGURE_PROVIDER_REQUEST'
  readonly requestId: string
  readonly expectedKernelPid?: number
  readonly expectedKernelInstanceId?: string
  readonly kernelInstanceId?: string
  readonly op: 'CONFIGURE' | 'REVOKE'
  readonly generation: number
  readonly providerId: 'nvidia-nim'
  readonly apiKey: string
}

export interface ConfigureProviderResponse extends BaseProtocolMessage {
  readonly type: 'CONFIGURE_PROVIDER_RESPONSE'
  readonly requestId: string
  readonly kernelPid: number
  readonly kernelInstanceId: string
  readonly op: 'CONFIGURE' | 'REVOKE'
  readonly generation: number
  readonly success: boolean
  readonly providerId: 'nvidia-nim'
  readonly maskedHandle: string
  readonly status: 'METADATA_VALIDATED' | 'AUTH_REQUIRED'
  readonly error?: string
}

export interface DesktopModelDispatchPayload {
  readonly workSessionId?: string | undefined
  readonly modelId?: string | undefined
  readonly prompt: string
  readonly messages?: readonly { readonly role: 'system' | 'user' | 'assistant'; readonly content: string }[] | undefined
  readonly maxTokens?: number | undefined
  readonly temperature?: number | undefined
  readonly timeoutMs?: number | undefined
}

export interface DesktopModelDispatchResult {
  readonly success: boolean
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly executionId: string
  readonly provider: string
  readonly requestedModel: string
  readonly actualModel: string
  readonly terminationStatus: 'COMPLETED' | 'ERROR' | 'TIMED_OUT' | 'CANCELLED'
  readonly outputContent?: string | undefined
  readonly errorTaxonomy?: string | undefined
  readonly errorMessage?: string | undefined
  readonly tokenUsage?: {
    readonly promptTokens: number
    readonly completionTokens: number
    readonly totalTokens: number
  } | undefined
}

export interface DispatchModelRequest extends BaseProtocolMessage {
  readonly type: 'DISPATCH_MODEL_REQUEST'
  readonly requestId: string
  readonly workSessionId?: string | undefined
  readonly modelId?: string | undefined
  readonly prompt: string
  readonly messages?: readonly { readonly role: 'system' | 'user' | 'assistant'; readonly content: string }[] | undefined
  readonly maxTokens?: number | undefined
  readonly temperature?: number | undefined
  readonly timeoutMs?: number | undefined
}

import type {
  IdeaRecord,
  KnowledgeCollection,
  KnowledgeTaskStatus,
  KnowledgeLinkRecord,
  StudySubjectSummary,
  KnowledgeFilterInput,
  MarkdownExportResult,
  SaveIdeaInput,
  UpdateIdeaInput,
  DeleteIdeaResult,
} from './assistant/ideasVault.js'
import type {
  AssistantIntentKind,
} from './assistant/commandParser.js'
import type {
  AppLaunchResult,
  NotepadAutomationResult,
} from './assistant/appLauncher.js'
import type {
  VoiceSttStatusProjection,
  PttSessionStartResult,
  PttTranscriptionResult,
} from './assistant/voiceStt.js'
import type {
  AssistantCapabilityRecord,
  ImprovementProposal,
  CapabilityFeedbackItem,
} from './assistant/capabilityRegistry.js'

export type {
  IdeaRecord,
  KnowledgeCollection,
  KnowledgeTaskStatus,
  KnowledgeLinkRecord,
  StudySubjectSummary,
  KnowledgeFilterInput,
  MarkdownExportResult,
  SaveIdeaInput,
  UpdateIdeaInput,
  DeleteIdeaResult,
  AssistantIntentKind,
  AppLaunchResult,
  NotepadAutomationResult,
  VoiceSttStatusProjection,
  PttSessionStartResult,
  PttTranscriptionResult,
  AssistantCapabilityRecord,
  ImprovementProposal,
  CapabilityFeedbackItem,
}

export interface DispatchModelResponse extends BaseProtocolMessage, DesktopModelDispatchResult {
  readonly type: 'DISPATCH_MODEL_RESPONSE'
  readonly requestId: string
}

export interface D1ProjectionUpdatedNotification extends BaseProtocolMessage {
  readonly type: 'PROJECTION_UPDATED'
  readonly projectionType: string
}

// ─── V1-F-01 / V1-F-02 Floating Companion & Knowledge Hub IPC Contracts ──────

export type CompanionVisualState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'ERROR'
  | 'CANCELLED'

export interface AssistantCommandPayload {
  readonly commandId?: string | undefined
  readonly input: string
  readonly saveApproved?: boolean | undefined
}

export interface AssistantCommandResult {
  readonly commandId: string
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly intentKind: AssistantIntentKind
  readonly status: 'SUCCESS' | 'ERROR' | 'CANCELLED' | 'CONFIRMATION_REQUIRED'
  readonly terminalState: 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'WAITING_CONFIRMATION'
  readonly message: string
  readonly savedIdea?: IdeaRecord | undefined
  readonly ideas?: readonly IdeaRecord[] | undefined
  readonly launchedApp?: AppLaunchResult | undefined
  readonly notepadAutomation?: NotepadAutomationResult | undefined
  readonly linkedRecord?: KnowledgeLinkRecord | undefined
  readonly markdownExport?: MarkdownExportResult | undefined
  readonly improvementProposal?: ImprovementProposal | undefined
  readonly pendingDeleteIdea?: IdeaRecord | undefined
  readonly pendingApprovalCommand?: string | undefined
}

export interface ExecuteAssistantCommandRequest extends BaseProtocolMessage {
  readonly type: 'EXECUTE_ASSISTANT_COMMAND_REQUEST'
  readonly requestId: string
  readonly commandId?: string | undefined
  readonly input: string
  readonly saveApproved?: boolean | undefined
}

export interface ExecuteAssistantCommandResponse extends BaseProtocolMessage {
  readonly type: 'EXECUTE_ASSISTANT_COMMAND_RESPONSE'
  readonly requestId: string
  readonly result: AssistantCommandResult
}

export interface CancelAssistantCommandResult {
  readonly cancelled: boolean
  readonly commandId: string
  readonly terminalState: 'CANCELLED'
  readonly message: string
}

export interface CancelAssistantCommandRequest extends BaseProtocolMessage {
  readonly type: 'CANCEL_ASSISTANT_COMMAND_REQUEST'
  readonly requestId: string
  readonly commandId?: string | undefined
}

export interface CancelAssistantCommandResponse extends BaseProtocolMessage {
  readonly type: 'CANCEL_ASSISTANT_COMMAND_RESPONSE'
  readonly requestId: string
  readonly result: CancelAssistantCommandResult
}

export type IdeasVaultRequestPayload =
  | { readonly action: 'SAVE'; readonly input: SaveIdeaInput }
  | { readonly action: 'LIST'; readonly filter?: KnowledgeFilterInput | undefined }
  | { readonly action: 'SEARCH'; readonly query: string }
  | { readonly action: 'GET'; readonly id: string }
  | { readonly action: 'UPDATE'; readonly input: UpdateIdeaInput }
  | { readonly action: 'DELETE'; readonly id: string; readonly confirmed: boolean }
  | { readonly action: 'COMPLETE_TASK'; readonly id: string; readonly completed: boolean }
  | {
      readonly action: 'LINK_ITEMS'
      readonly sourceId: string
      readonly targetId: string
      readonly relationship?: string | undefined
    }
  | { readonly action: 'UNLINK_ITEMS'; readonly sourceId: string; readonly targetId: string }
  | { readonly action: 'LIST_SUBJECTS' }
  | { readonly action: 'EXPORT_MARKDOWN'; readonly targetDirectory?: string | undefined }
  | { readonly action: 'IMPORT_MARKDOWN'; readonly markdownContent: string }

export interface IdeasVaultOperationRequest extends BaseProtocolMessage {
  readonly type: 'IDEAS_VAULT_REQUEST'
  readonly requestId: string
  readonly payload: IdeasVaultRequestPayload
}

export interface IdeasVaultOperationResult {
  readonly success: boolean
  readonly action: IdeasVaultRequestPayload['action']
  readonly idea?: IdeaRecord | null | undefined
  readonly ideas?: readonly IdeaRecord[] | undefined
  readonly subjects?: readonly StudySubjectSummary[] | undefined
  readonly linkRecord?: KnowledgeLinkRecord | undefined
  readonly markdownExport?: MarkdownExportResult | undefined
  readonly deleteResult?: DeleteIdeaResult | undefined
  readonly errorMessage?: string | undefined
}

export interface IdeasVaultOperationResponse extends BaseProtocolMessage {
  readonly type: 'IDEAS_VAULT_RESPONSE'
  readonly requestId: string
  readonly result: IdeasVaultOperationResult
}

export type VoicePttRequestPayload =
  | { readonly action: 'STATUS' }
  | { readonly action: 'START'; readonly userInitiated: boolean }
  | { readonly action: 'STOP'; readonly pttSessionId: string; readonly audioSampleBase64?: string | undefined }
  | { readonly action: 'CANCEL' }

export interface VoicePttRequest extends BaseProtocolMessage {
  readonly type: 'VOICE_PTT_REQUEST'
  readonly requestId: string
  readonly payload: VoicePttRequestPayload
}

export interface VoicePttOperationResult {
  readonly action: VoicePttRequestPayload['action']
  readonly statusProjection: VoiceSttStatusProjection
  readonly startResult?: PttSessionStartResult | undefined
  readonly transcriptionResult?: PttTranscriptionResult | undefined
}

export interface VoicePttResponse extends BaseProtocolMessage {
  readonly type: 'VOICE_PTT_RESPONSE'
  readonly requestId: string
  readonly result: VoicePttOperationResult
}

export type CapabilityRegistryRequestPayload =
  | { readonly action: 'LIST' }
  | {
      readonly action: 'FEEDBACK'
      readonly capabilityId: string
      readonly rating: 'POSITIVE' | 'NEGATIVE'
      readonly comment: string
    }

export interface CapabilityRegistryRequest extends BaseProtocolMessage {
  readonly type: 'CAPABILITY_REGISTRY_REQUEST'
  readonly requestId: string
  readonly payload: CapabilityRegistryRequestPayload
}

export interface CapabilityRegistryResult {
  readonly capabilities: readonly AssistantCapabilityRecord[]
  readonly proposals: readonly ImprovementProposal[]
  readonly recordedFeedback?: CapabilityFeedbackItem | undefined
}

export interface CapabilityRegistryResponse extends BaseProtocolMessage {
  readonly type: 'CAPABILITY_REGISTRY_RESPONSE'
  readonly requestId: string
  readonly result: CapabilityRegistryResult
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
  | ConfigureProviderRequest
  | DispatchModelRequest
  | ExecuteAssistantCommandRequest
  | CancelAssistantCommandRequest
  | IdeasVaultOperationRequest
  | VoicePttRequest
  | CapabilityRegistryRequest

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
  | ConfigureProviderResponse
  | DispatchModelResponse
  | ExecuteAssistantCommandResponse
  | CancelAssistantCommandResponse
  | IdeasVaultOperationResponse
  | VoicePttResponse
  | CapabilityRegistryResponse

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

export interface OnboardingStateProjection {
  readonly completed: boolean
  readonly completedAt?: string | undefined
  readonly step: string
  readonly operatingMode: 'DETERMINISTIC_ONLY' | 'ASSISTED'
  readonly selectedHarnesses: readonly string[]
  readonly providerConfigured: boolean
  readonly dataRoot: string
  readonly isTest?: boolean | undefined
}

export interface SaveOnboardingPayload {
  readonly completed: boolean
  readonly step?: string | undefined
  readonly operatingMode?: 'DETERMINISTIC_ONLY' | 'ASSISTED' | undefined
  readonly selectedHarnesses?: readonly string[] | undefined
}

export interface ConfigureProviderPayload {
  readonly providerId: 'nvidia-nim'
  readonly apiKey: string
}

export interface ConfigureProviderResult {
  readonly success: boolean
  readonly providerId: string
  readonly maskedHandle: string
  readonly status: 'METADATA_VALIDATED' | 'AUTH_REQUIRED'
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
  getOnboarding(): Promise<OnboardingStateProjection>
  saveOnboarding(payload: SaveOnboardingPayload): Promise<boolean>
  runDoctor(): Promise<DoctorReport>
  configureProvider(payload: ConfigureProviderPayload): Promise<ConfigureProviderResult>
  dispatchModel(payload: DesktopModelDispatchPayload): Promise<DesktopModelDispatchResult>
  restartKernel(): Promise<boolean>
  requestHideWindow(): Promise<void>
  requestQuitApplication(): Promise<void>
  onKernelStatus(callback: (status: KernelLifecycleStatus) => void): () => void
  onKernelError(callback: (err: SafeDesktopError) => void): () => void
  onProjectionUpdate(callback: (projectionType: string) => void): () => void

  // V1-F-01 Floating Companion, Ideas Vault, Voice PTT & Supervised Capabilities
  executeAssistantCommand?(payload: AssistantCommandPayload): Promise<AssistantCommandResult>
  cancelAssistantCommand?(commandId?: string): Promise<CancelAssistantCommandResult>
  saveIdea?(input: SaveIdeaInput): Promise<IdeaRecord>
  listIdeas?(): Promise<readonly IdeaRecord[]>
  searchIdeas?(query: string): Promise<readonly IdeaRecord[]>
  getIdea?(id: string): Promise<IdeaRecord | null>
  updateIdea?(input: UpdateIdeaInput): Promise<IdeaRecord>
  deleteIdea?(id: string, confirmed: boolean): Promise<DeleteIdeaResult>
  getVoiceSttStatus?(): Promise<VoiceSttStatusProjection>
  startPushToTalk?(userInitiated: boolean): Promise<PttSessionStartResult>
  stopPushToTalk?(pttSessionId: string, audioSampleBase64?: string): Promise<PttTranscriptionResult>
  cancelPushToTalk?(): Promise<VoiceSttStatusProjection>
  getAssistantCapabilities?(): Promise<CapabilityRegistryResult>
  submitCapabilityFeedback?(capabilityId: string, rating: 'POSITIVE' | 'NEGATIVE', comment: string): Promise<CapabilityRegistryResult>
  toggleCompanionWindow?(): Promise<{ visible: boolean }>
  hideCompanionWindow?(): Promise<{ visible: boolean }>
}

declare global {
  interface Window {
    gravitasDesktop?: GravitasDesktopBridge
  }
}
