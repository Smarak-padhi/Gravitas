/**
 * Types and API contracts for @gravitas/server.
 * Local HTTP API and live event stream control plane.
 */

import type {
  BrowserQaResult,
  ExecutionContract,
  GravitasEvent,
  Run,
  Task,
} from '@gravitas/core'
import type {
  ProjectPromptContext,
  PromptPreviewRequest,
  PromptPreviewResponse,
  TaskPromptResponse,
} from '@gravitas/prompts'
import type { MutationCapture } from '@gravitas/harnesses'
import type { EvidenceManifest, VerificationPlan, VerificationResult } from '@gravitas/verifier'
import type { RunPlan, TaskPlanDefinition } from '@gravitas/orchestrator'

export type {
  RunPlan,
  TaskPlanDefinition,
} from '@gravitas/orchestrator'

// Re-export prompt types for server API consumers
export type {
  ProjectPromptContext,
  PromptPreviewRequest,
  PromptPreviewResponse,
  TaskPromptResponse,
} from '@gravitas/prompts'

/**
 * Standard API error envelope.
 * Stack traces and sensitive host paths are strictly prohibited.
 */
export interface ApiErrorEnvelope {
  readonly error: {
    readonly code: string
    readonly message: string
    readonly requestId: string
  }
}

/**
 * Registry-controlled reference to task evidence artifacts.
 */
export interface TaskEvidenceRef {
  readonly runId: string
  readonly taskId: string
  readonly evidenceDir: string
  readonly manifestPath: string
  readonly artifactFiles: readonly string[]
  readonly createdAt: string
}

/**
 * Payload for POST /api/v1/runs.
 */
export interface CreateRunInput {
  readonly goal: string
  readonly repository?: string | undefined
  readonly baseBranch?: string | undefined
  readonly constraints?: readonly string[] | undefined
  readonly acceptanceCriteria?: readonly {
    readonly id?: string | undefined
    readonly description: string
    readonly verificationMethod?: string | undefined
  }[] | undefined
  readonly requiredEvidence?: readonly {
    readonly id?: string | undefined
    readonly type: 'GIT_DIFF' | 'TEST_REPORT' | 'COMMAND_LOG' | 'SCREENSHOT' | 'BROWSER_TRACE' | (string & {})
    readonly description: string
    readonly mandatory: boolean
  }[] | undefined
  readonly verificationPlan?: VerificationPlan | undefined
  readonly requiresApproval?: boolean | undefined
  /**
   * Project-level prompt context injected into the PROJECT layer of the compiled prompt.
   * Explicit trusted input — not automatically scraped from repository files.
   * Must NOT contain secrets, API keys, or credential-bearing material.
   */
  readonly projectContext?: ProjectPromptContext | undefined
  readonly maxConcurrency?: number | undefined
  readonly tasks?: readonly TaskPlanDefinition[] | undefined
  readonly plan?: RunPlan | undefined
}

/**
 * Options for executing a run.
 */
export interface ExecuteRunOptions {
  readonly runtimeRoot?: string | undefined
  readonly timeoutMs?: number | undefined
}

/**
 * Response payload for POST /api/v1/runs.
 */
export interface CreateRunResponse {
  readonly runId: string
  readonly contractId: string
  readonly tasks: readonly Task[]
  readonly run: Run
}

/**
 * Detailed run representation returned by GET /api/v1/runs/:runId.
 */
export interface RunDetailResponse {
  readonly run: Run
  readonly contract: ExecutionContract
  readonly tasks: readonly Task[]
  readonly recentEvents: readonly GravitasEvent[]
}

/**
 * Detailed task representation returned by GET /api/v1/runs/:runId/tasks/:taskId.
 */
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

/**
 * Evidence representation returned by GET /api/v1/runs/:runId/tasks/:taskId/evidence.
 */
export interface TaskEvidenceResponse {
  readonly runId: string
  readonly taskId: string
  readonly manifest: EvidenceManifest
  readonly artifactFiles: readonly string[]
}

/**
 * Payload for POST /api/v1/runs/:runId/tasks/:taskId/approve.
 */
export interface ApproveTaskInput {
  readonly reviewer?: string | undefined
}

/**
 * Payload for POST /api/v1/runs/:runId/tasks/:taskId/reject.
 */
export interface RejectTaskInput {
  readonly reason?: string | undefined
}

/**
 * Health response returned by GET /api/v1/health.
 */
export interface HealthResponse {
  readonly status: 'ok'
  readonly service: 'gravitas'
  readonly version: string
  readonly timestamp: string
}

/**
 * Diff representation returned by GET /api/v1/runs/:runId/tasks/:taskId/evidence/diff.
 */
export interface TaskEvidenceDiffResponse {
  readonly runId: string
  readonly taskId: string
  readonly diff: string
}

export type {
  RuntimeExecutionPhase,
  RuntimeTaskProjection,
  RuntimeRouteProjection,
  RuntimeVerificationProjection,
  RuntimeBrowserQaProjection,
  RuntimeProjectionSnapshot,
} from './projection.js'

/**
 * State summary returned by GET /api/v1/state.
 */
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
  readonly projection: import('./projection.js').RuntimeProjectionSnapshot
}

/**
 * Options for starting the HTTP server.
 */
export interface ServerOptions {
  readonly host?: string | undefined
  readonly port?: number | undefined
}

/**
 * Running server handle info.
 */
export interface ServerAddressInfo {
  readonly host: string
  readonly port: number
  readonly url: string
}
