/**
 * Gravitas Personal OS Background Execution Kernel — Core Domain Contracts
 *
 * Wave 12I Architectural Specification
 *
 * Strict Invariants:
 * 1. BACKGROUND JOB != AGENT ROLE
 * 2. BACKGROUND JOB != LLM LOOP
 * 3. SCHEDULER != REASONING MODEL
 * 4. NOTIFICATION != AGENT
 * 5. JOB DEFINITION (durable desired behavior) != JOB RUN (one execution attempt)
 * 6. IDLE PERSONAL OS INFERENCE COST = 0 TOKENS
 */

import type { NotificationSeverity } from './notifications.js'
import type { AgentRoleId } from './roles.js'

// ============================================================================
// 1. Job Definition & Run States (Strict FSM Separation)
// ============================================================================

export type JobDefinitionStatus =
  | 'DRAFT'
  | 'ENABLED'
  | 'PAUSED'
  | 'CANCELLED'

export type JobRunStatus =
  | 'SCHEDULED'
  | 'READY'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'RETRY_PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT'
  | 'BUDGET_EXCEEDED'

export type BackgroundJobKind =
  | 'REMINDER'
  | 'CHECK'
  | 'FILE_OPERATION'
  | 'REPOSITORY_CHECK'
  | 'SUMMARY'
  | 'RESEARCH'
  | 'CONNECTOR_SYNC'
  | 'NOTIFICATION'
  | 'MAINTENANCE'

export type JobErrorCode =
  | 'VALIDATION_ERROR'
  | 'SCHEDULE_ERROR'
  | 'ACTION_ERROR'
  | 'TIMEOUT'
  | 'BUDGET_EXCEEDED'
  | 'AUTHORITY_DENIED'
  | 'APPROVAL_REQUIRED'
  | 'CANCELLED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'PROCESS_INTERRUPTED'
  | 'INTERNAL_ERROR'

// ============================================================================
// 2. Triggers & Schedules
// ============================================================================

export interface ManualTrigger {
  readonly type: 'MANUAL'
}

export interface OneTimeTrigger {
  readonly type: 'ONE_TIME'
  readonly runAt: string // ISO 8601 UTC
  readonly timezone: string // IANA timezone name (e.g. 'Asia/Kolkata')
}

export interface IntervalTrigger {
  readonly type: 'INTERVAL'
  readonly intervalSeconds: number // Minimum 60s in production
  readonly anchorAt: string // ISO 8601 UTC
  readonly timezone: string // IANA timezone name
}

export interface CronTrigger {
  readonly type: 'CRON'
  readonly expression: string // Standard 5-part cron: 'min hour dom month dow'
  readonly timezone: string // IANA timezone name
}

export interface UnsupportedTrigger {
  readonly type: 'CONDITION' | 'EVENT'
  readonly reason: 'UNSUPPORTED_IN_WAVE_12I'
}

export type JobTrigger =
  | ManualTrigger
  | OneTimeTrigger
  | IntervalTrigger
  | CronTrigger
  | UnsupportedTrigger

// ============================================================================
// 3. Actions & Security Bounded Definitions
// ============================================================================

export interface EmitNotificationAction {
  readonly type: 'EMIT_NOTIFICATION'
  readonly title: string
  readonly message: string
  readonly severity: NotificationSeverity
}

export interface RepositoryCheckAction {
  readonly type: 'REPOSITORY_CHECK'
  readonly repositoryId: string // Registered server-side repository ID
  readonly checkType: 'STATUS' | 'DIRTY' | 'BRANCH'
}

export interface FileOperationAction {
  readonly type: 'FILE_OPERATION'
  readonly path: string // Validated against capability-scoped AllowedFileRoots
  readonly operation: 'EXISTS' | 'STAT'
}

export interface NoopAction {
  readonly type: 'NOOP'
  readonly message?: string | undefined
}

export interface InvokeRoleAction {
  readonly type: 'INVOKE_ROLE'
  readonly roleId: AgentRoleId | string
  readonly taskTemplateId: string // Bounded registered template ID, never free-form prompt
  readonly inputRef: string // Reference to verified input payload
  readonly reasoningBudget?: number | undefined // Token budget ceiling
}

export type JobAction =
  | EmitNotificationAction
  | RepositoryCheckAction
  | FileOperationAction
  | NoopAction
  | InvokeRoleAction

// ============================================================================
// 4. Governance: Authority & Autonomy
// ============================================================================

import type { AuthorityClass as RoleAuthorityClass } from './roles.js'

export type JobAuthorityClass =
  | 'READ'
  | 'SAFE_WRITE'
  | 'EXTERNAL_WRITE'
  | 'DESTRUCTIVE'
  | 'FINANCIAL'
  | RoleAuthorityClass

export type AuthorityClass = JobAuthorityClass

export type AutonomyLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4'

export interface JobExecutionBudget {
  readonly maxRuntimeMs: number
  readonly maxAttempts: number
  readonly tokenBudget?: number | undefined
  readonly monetaryBudget?: number | undefined
  readonly concurrencyGroup?: string | undefined
}

export interface RetryPolicy {
  readonly mode: 'NONE' | 'FIXED' | 'EXPONENTIAL'
  readonly maxAttempts: number
  readonly delayMs: number
  readonly maxDelayMs?: number | undefined
}

export interface QuietHoursWindow {
  readonly start: string // HH:mm (e.g. '23:00')
  readonly end: string // HH:mm (e.g. '07:00')
  readonly timezone: string // IANA timezone
  readonly bypassOnActionRequired: boolean
}

export interface JobNotificationPolicy {
  readonly deliveryPolicy: 'IMMEDIATE' | 'DIGEST' | 'SILENT' | 'QUIET_HOURS_AWARE'
  readonly quietHours?: QuietHoursWindow | undefined
}

// ============================================================================
// 5. Canonical Background Job & Job Run Models
// ============================================================================

export interface BackgroundJob {
  readonly id: string
  readonly title: string
  readonly description?: string | undefined
  readonly kind: BackgroundJobKind
  readonly status: JobDefinitionStatus

  readonly trigger: JobTrigger
  readonly action: JobAction

  readonly autonomyLevel: AutonomyLevel
  readonly requiredAuthority: AuthorityClass

  readonly contextDomains: readonly string[]
  readonly executionBudget: JobExecutionBudget
  readonly retryPolicy: RetryPolicy
  readonly notificationPolicy: JobNotificationPolicy

  readonly createdAt: string
  readonly updatedAt: string

  readonly nextRunAt?: string | undefined // ISO 8601 UTC
  readonly lastRunAt?: string | undefined // ISO 8601 UTC
}

export interface JobRunAttempt {
  readonly runId: string
  readonly attemptNumber: number
  readonly startedAt: string
  readonly finishedAt?: string | undefined
  readonly status: JobRunStatus
  readonly errorSummary?: string | undefined
}

export interface JobRun {
  readonly id: string
  readonly jobId: string
  readonly occurrenceKey: string // Deterministic idempotency key: `${jobId}:${occurrenceTime}`
  readonly scheduledFor: string // ISO 8601 UTC

  readonly status: JobRunStatus
  readonly attempt: number

  readonly startedAt?: string | undefined
  readonly finishedAt?: string | undefined

  readonly resultCode?: string | undefined
  readonly resultSummary?: string | undefined
  readonly errorCode?: JobErrorCode | undefined

  readonly reasoningUsed: boolean
  readonly roleId?: AgentRoleId | string | undefined
  readonly harnessId?: string | undefined

  readonly tokenUsage?: {
    readonly promptTokens: number
    readonly completionTokens: number
    readonly totalTokens: number
  } | undefined
  readonly monetaryCost?: number | undefined

  readonly createdNotificationIds: readonly string[]
}

// ============================================================================
// 6. Notification Bus Contracts
// ============================================================================

export type NotificationDeliveryState =
  | 'PENDING'
  | 'DEFERRED'
  | 'DELIVERED'
  | 'SUPPRESSED'

export interface PersonalOsNotification {
  readonly id: string
  readonly severity: NotificationSeverity
  readonly title: string
  readonly body: string
  readonly source: {
    readonly type: 'JOB' | 'SYSTEM' | 'OPERATOR'
    readonly id?: string | undefined
    readonly runId?: string | undefined
  }
  readonly jobId?: string | undefined
  readonly runId?: string | undefined

  readonly createdAt: string
  readonly readAt?: string | null | undefined

  readonly deliveryPolicy: 'IMMEDIATE' | 'DIGEST' | 'SILENT' | 'QUIET_HOURS_AWARE'
  readonly deliveryState: NotificationDeliveryState
  readonly deliverAfter?: string | undefined // When deferred by quiet hours

  readonly dedupeKey: string
}

// ============================================================================
// 7. Time Abstraction (Testing & Determinism)
// ============================================================================

export interface Clock {
  now(): Date
}

export class SystemClock implements Clock {
  public now(): Date {
    return new Date()
  }
}

export class FakeClock implements Clock {
  private currentTime: Date

  public constructor(initialTime: string | Date = '2026-09-23T12:00:00.000Z') {
    this.currentTime = typeof initialTime === 'string' ? new Date(initialTime) : new Date(initialTime)
  }

  public now(): Date {
    return new Date(this.currentTime.getTime())
  }

  public set(time: string | Date): void {
    this.currentTime = typeof time === 'string' ? new Date(time) : new Date(time)
  }

  public advance(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms)
  }
}
