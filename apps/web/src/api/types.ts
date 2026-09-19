/**
 * Web Client API Types for Gravitas Command Center
 */

import type {
  ExecutionContract,
  GravitasEvent,
  Run,
  RunStatus,
  Task,
  TaskState,
} from '@gravitas/core'

export type { ExecutionContract, GravitasEvent, Run, RunStatus, Task, TaskState }

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
  readonly evidenceAvailable: boolean
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
