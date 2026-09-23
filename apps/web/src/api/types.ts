/**
 * Web Client API Types for Gravitas Command Center
 */

import type {
  BrowserQaResult,
  ExecutionContract,
  GravitasEvent,
  GravitasEventType,
  PromptLayerName,
  Run,
  RunStatus,
  Task,
  TaskState,
  BackgroundJob,
  JobRun,
  PersonalOsNotification,
  JobDefinitionStatus,
  JobRunStatus,
  JobTrigger,
  JobAction,
  NotificationSeverity,
  NotificationDeliveryState,
} from '@gravitas/core'
import type {
  LayerMetadata,
  ProjectPromptContext,
  PromptLayerPreview,
  PromptPreviewRequest,
  PromptPreviewResponse,
  TaskPromptResponse,
} from '@gravitas/prompts'

import type {
  RunPlan,
  TaskPlanDefinition,
} from '@gravitas/orchestrator'

export type {
  BrowserQaResult,
  ExecutionContract,
  GravitasEvent,
  GravitasEventType,
  LayerMetadata,
  ProjectPromptContext,
  PromptLayerName,
  PromptLayerPreview,
  PromptPreviewRequest,
  PromptPreviewResponse,
  Run,
  RunPlan,
  RunStatus,
  Task,
  TaskPlanDefinition,
  TaskPromptResponse,
  TaskState,
  BackgroundJob,
  JobRun,
  PersonalOsNotification,
  JobDefinitionStatus,
  JobRunStatus,
  JobTrigger,
  JobAction,
  NotificationSeverity,
  NotificationDeliveryState,
}

export interface HealthResponse {
  readonly status: 'ok'
  readonly service: 'gravitas'
  readonly version: string
  readonly timestamp: string
}

export interface StateSummaryResponse {
  readonly service: 'gravitas'
  readonly version: string
  readonly runs: readonly Run[]
  readonly tasks: readonly Task[]
  readonly harness: {
    readonly id: string
    readonly status: string
    readonly message?: string | undefined
  }
  readonly projection?: RuntimeProjectionSnapshot | undefined
}

export type RuntimeTaskPhase = 'PREPARING' | 'WORKER_RUNNING' | 'CLEANUP' | 'VERIFYING' | 'BROWSER_QA'

export interface RuntimeRouteProjection {
  readonly transport: 'DIRECT' | 'GATEWAY'
  readonly active: boolean
  readonly gatewayId?: string | null
  readonly requestedProvider?: string | null
  readonly requestedModel?: string | null
  readonly actualProvider?: string | null
  readonly actualModel?: string | null
  readonly providerFallbackOccurred: boolean
  readonly transportFallbackOccurred: boolean
}

export interface RuntimeTaskProjection {
  readonly taskId: string
  readonly phase: RuntimeTaskPhase
  readonly roleId?: string | null | undefined
  readonly harnessId?: string | null | undefined
  readonly workerIdentity?: string | null
  readonly route?: RuntimeRouteProjection
  readonly verification?: {
    readonly status: 'RUNNING' | 'PASSED' | 'FAILED'
  }
  readonly browserQa?: {
    readonly status: 'RUNNING' | 'PASSED' | 'FAILED'
  }
}

export interface RuntimeHandoffProjection {
  readonly handoffId: string
  readonly kind: 'DEPENDENCY' | 'REVIEW' | 'INTEGRATION' | 'VERIFICATION' | 'APPROVAL'
  readonly sourceTaskId: string
  readonly targetTaskId: string
  readonly sourceRoleId?: string | null | undefined
  readonly targetRoleId?: string | null | undefined
  readonly state: 'BLOCKED' | 'READY' | 'IN_PROGRESS' | 'SATISFIED' | 'FAILED'
  readonly reasonCode?: string | undefined
}

export type ArtifactCustodyLocation =
  | 'PRODUCER_DESK'
  | 'REVIEW_INBOX'
  | 'REVIEW_BENCH'
  | 'INTEGRATION_INBOX'
  | 'INTEGRATION_BENCH'
  | 'APPROVAL_PLINTH'
  | 'COMPLETED_TRAY'
  | 'FAILURE_HOLD'
  | 'NEUTRAL_HOLD'

export interface RuntimeArtifactProjection {
  readonly artifactId: string
  readonly sourceTaskId: string
  readonly sourceRoleId?: string | null | undefined
  readonly sourceHarnessId?: string | null | undefined
  readonly commitSha?: string | null | undefined
  readonly verificationState:
    | 'UNVERIFIED'
    | 'VERIFYING'
    | 'VERIFIED'
    | 'FAILED'
  readonly reviewState:
    | 'NOT_REQUIRED'
    | 'PENDING'
    | 'IN_REVIEW'
    | 'PASSED'
    | 'CHANGES_REQUIRED'
  readonly integrationState:
    | 'NOT_READY'
    | 'READY'
    | 'PREPARING'
    | 'PREPARED'
    | 'CONFLICT'
    | 'INTEGRATED'
  readonly currentCustody: ArtifactCustodyLocation
}

export interface RuntimeProjectionSnapshot {
  readonly schemaVersion: string
  readonly epoch: string
  readonly revision: number
  readonly activeTasks: readonly RuntimeTaskProjection[]
  readonly handoffs?: readonly RuntimeHandoffProjection[] | undefined
  readonly artifacts?: readonly RuntimeArtifactProjection[] | undefined
  readonly backgroundJobs?: readonly BackgroundJob[] | undefined
  readonly recentJobRuns?: readonly JobRun[] | undefined
  readonly personalNotifications?: readonly PersonalOsNotification[] | undefined
}

export interface RunDetailResponse {
  readonly run: Run
  readonly contract: ExecutionContract
  readonly tasks: readonly Task[]
  readonly recentEvents: readonly GravitasEvent[]
}

export interface TaskDetailResponse {
  readonly task: Task
  readonly mutationSummary?: {
    readonly allowedChanges: readonly string[]
    readonly unexpectedChanges: readonly string[]
    readonly headMutated: boolean
    readonly isScopeCompliant: boolean
  } | undefined
  readonly verificationSummary?: {
    readonly status: string
    readonly totalCommands: number
    readonly passedCommands: number
    readonly failedCommands: number
  } | undefined
  readonly browserQa?: BrowserQaResult | undefined
  readonly evidenceAvailable: boolean
}

export interface AgentCapabilityItem {
  readonly id: string
  readonly domain: string
  readonly description: string
}

export interface AgentDescriptor {
  readonly id: string
  readonly name: string
  readonly provider: string
  readonly defaultRole: string
  readonly capabilities: readonly string[]
  readonly qualificationStatus: 'INSTALLED' | 'READY' | 'DEGRADED' | 'UNQUALIFIED' | 'DISABLED'
  readonly qualificationNotes?: string | undefined
  readonly isProductionQualified: boolean
  readonly maxConcurrency?: number | undefined
}

export interface TaskEvidenceResponse {
  readonly runId: string
  readonly taskId: string
  readonly manifest: {
    readonly schemaVersion: string
    readonly runId: string
    readonly taskId: string
    readonly recordedAt: string
    readonly worker: {
      readonly harnessId: string
      readonly durationMs: number
      readonly exitCode: number
      readonly terminationReason: string
    }
    readonly mutation: {
      readonly allowedChanges: readonly string[]
      readonly unexpectedChanges: readonly string[]
      readonly headMutated: boolean
      readonly diffSha256: string
    }
    readonly verification: {
      readonly planId: string
      readonly status: string
      readonly commands: readonly {
        readonly commandId: string
        readonly executable: string
        readonly args: readonly string[]
        readonly exitCode: number
        readonly durationMs: number
        readonly terminationReason: string
      }[]
    }
  }
  readonly artifactFiles: readonly string[]
}

export interface TaskEvidenceDiffResponse {
  readonly runId: string
  readonly taskId: string
  readonly diff: string
}

export interface AcceptanceCriterionInput {
  readonly id?: string | undefined
  readonly description: string
  readonly verificationMethod?: string | undefined
}

export interface RequiredEvidenceInput {
  readonly id?: string | undefined
  readonly type: 'GIT_DIFF' | 'TEST_REPORT' | 'COMMAND_LOG' | 'SCREENSHOT' | 'BROWSER_TRACE' | string
  readonly description: string
  readonly mandatory: boolean
}

export interface CreateRunInput {
  readonly goal: string
  readonly repository?: string | undefined
  readonly baseBranch?: string | undefined
  readonly constraints?: readonly string[] | undefined
  readonly acceptanceCriteria?: readonly AcceptanceCriterionInput[] | undefined
  readonly requiredEvidence?: readonly RequiredEvidenceInput[] | undefined
  readonly requiresApproval?: boolean | undefined
  readonly projectContext?: ProjectPromptContext | undefined
  readonly maxConcurrency?: number | undefined
  readonly tasks?: readonly TaskPlanDefinition[] | undefined
  readonly plan?: RunPlan | undefined
}

export interface CreateRunResponse {
  readonly runId: string
  readonly contractId: string
  readonly tasks: readonly Task[]
  readonly run: Run
}

export interface ApiErrorPayload {
  readonly error: {
    readonly code: string
    readonly message: string
    readonly requestId: string
  }
}
