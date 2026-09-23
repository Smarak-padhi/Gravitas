/**
 * Gravitas Personal OS Background Execution Kernel — Abstract JobStore Interface
 *
 * Wave 12I Architectural Specification
 *
 * Strict Invariant:
 * The rest of Gravitas must not know which SQLite driver backs persistence.
 * All persistence is gated behind this contract.
 */

import type {
  BackgroundJob,
  JobDefinitionStatus,
  JobRun,
  JobRunAttempt,
  PersonalOsNotification,
} from '@gravitas/core'

export interface JobFilter {
  readonly status?: JobDefinitionStatus | undefined
  readonly kind?: string | undefined
}

export interface NotificationFilter {
  readonly unreadOnly?: boolean | undefined
  readonly severity?: string | undefined
  readonly limit?: number | undefined
}

export interface ClaimOccurrenceParams {
  readonly jobId: string
  readonly occurrenceKey: string
  readonly scheduledFor: string
  readonly runId?: string | undefined
}

export interface ClaimOccurrenceResult {
  readonly claimed: boolean
  readonly run?: JobRun | undefined
}

export interface JobStore {
  /**
   * Save or insert a BackgroundJob definition.
   */
  saveJob(job: BackgroundJob): void

  /**
   * Retrieve a BackgroundJob by ID.
   */
  getJob(id: string): BackgroundJob | null

  /**
   * List all BackgroundJobs, optionally filtered.
   */
  listJobs(filter?: JobFilter): BackgroundJob[]

  /**
   * Update the status of a BackgroundJob.
   */
  updateJobStatus(id: string, status: JobDefinitionStatus): void

  /**
   * Update mutable fields of a BackgroundJob (title, schedule, nextRunAt, lastRunAt, budgets, etc.).
   */
  updateJob(id: string, patch: Partial<BackgroundJob>): void

  /**
   * Atomically claim an occurrence. Returns claimed: false if already claimed.
   */
  claimOccurrence(params: ClaimOccurrenceParams): ClaimOccurrenceResult

  /**
   * Look up an existing occurrence claim by jobId and occurrenceKey.
   */
  getOccurrenceClaim(jobId: string, occurrenceKey: string): { runId: string; claimedAt: string } | null

  /**
   * Retrieve a JobRun by ID.
   */
  getRun(id: string): JobRun | null

  /**
   * List JobRuns for a given job ID.
   */
  getRunsForJob(jobId: string, limit?: number): JobRun[]

  /**
   * List all recent JobRuns.
   */
  listRecentRuns(limit?: number): JobRun[]

  /**
   * Update a JobRun's state, timestamps, attempts, results, or error codes.
   */
  updateRun(run: JobRun): void

  /**
   * Append a JobRunAttempt to historical execution tracking.
   */
  recordRunAttempt(attempt: JobRunAttempt): void

  /**
   * Get all attempts for a given run ID.
   */
  getRunAttempts(runId: string): JobRunAttempt[]

  /**
   * Save or insert a PersonalOsNotification.
   */
  saveNotification(notification: PersonalOsNotification): void

  /**
   * Retrieve a PersonalOsNotification by ID.
   */
  getNotification(id: string): PersonalOsNotification | null

  /**
   * Find an existing notification by dedupeKey created within a given time window.
   */
  findNotificationByDedupeKey(dedupeKey: string, sinceIso: string): PersonalOsNotification | null

  /**
   * List notifications, optionally filtered.
   */
  listNotifications(filter?: NotificationFilter): PersonalOsNotification[]

  /**
   * Mark a notification as read.
   */
  markNotificationRead(id: string, readAt?: string): void

  /**
   * Mark all unread notifications as read.
   */
  markAllNotificationsRead(readAt?: string): number

  /**
   * Update notification delivery state (e.g. DEFERRED -> DELIVERED).
   */
  updateNotificationDeliveryState(
    id: string,
    state: PersonalOsNotification['deliveryState'],
    deliverAfter?: string
  ): void

  /**
   * Reconcile interrupted RUNNING runs on server restart.
   * Marks any RUNNING runs as FAILED with PROCESS_INTERRUPTED.
   */
  reconcileInterruptedRuns(nowIso?: string): number

  /**
   * Close the underlying database connection.
   */
  close(): void
}
