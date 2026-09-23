/**
 * Gravitas Personal OS Background Execution Kernel — Deterministic Job Runner
 *
 * Wave 12I Architectural Specification
 *
 * Implements:
 * 1. Bounded concurrency worker pool.
 * 2. Governance check: Autonomy (L0-L4) & Authority (READ, SAFE_WRITE vs WAITING_APPROVAL).
 * 3. Execution budget & timeout enforcement (maxRuntimeMs).
 * 4. Append-only attempt tracking (JobRunAttempt).
 * 5. Bounded retry policy evaluation (NONE, FIXED, EXPONENTIAL).
 * 6. Clean lifecycle and AbortController integration.
 */

import type {
  BackgroundJob,
  JobRun,
  JobRunAttempt,
  JobRunStatus,
  Clock,
} from '@gravitas/core'
import type { JobStore } from './jobStore.js'
import { ActionExecutor, type ActionResult } from './actionExecutor.js'
import { NotificationBus } from './notificationBus.js'

export interface JobRunnerOptions {
  readonly store: JobStore
  readonly executor: ActionExecutor
  readonly notificationBus: NotificationBus
  readonly clock: Clock
  readonly maxConcurrency?: number | undefined
}

export class JobRunner {
  private readonly store: JobStore
  private readonly executor: ActionExecutor
  private readonly notificationBus: NotificationBus
  private readonly clock: Clock
  private readonly maxConcurrency: number

  private activeRunCount: number = 0
  private readonly activeAbortControllers: Map<string, AbortController> = new Map()

  public constructor(options: JobRunnerOptions) {
    this.store = options.store
    this.executor = options.executor
    this.notificationBus = options.notificationBus
    this.clock = options.clock
    this.maxConcurrency = options.maxConcurrency ?? 5
  }

  public getActiveRunCount(): number {
    return this.activeRunCount
  }

  public canAcceptRun(): boolean {
    return this.activeRunCount < this.maxConcurrency
  }

  /**
   * Execute an atomically claimed JobRun.
   */
  public async executeRun(job: BackgroundJob, run: JobRun): Promise<JobRun> {
    if (this.activeRunCount >= this.maxConcurrency) {
      throw new Error(`CONCURRENCY_EXCEEDED: Runner at maximum capacity (${this.maxConcurrency})`)
    }

    this.activeRunCount++
    const abortController = new AbortController()
    this.activeAbortControllers.set(run.id, abortController)

    const startedAt = this.clock.now().toISOString()

    // 1. Initial State: Transition to RUNNING
    let currentRun: JobRun = {
      ...run,
      status: 'RUNNING',
      startedAt,
    }
    this.store.updateRun(currentRun)

    // 2. Authority & Governance Evaluation
    if (job.requiredAuthority !== 'READ' && job.requiredAuthority !== 'SAFE_WRITE') {
      const finishedAt = this.clock.now().toISOString()
      currentRun = {
        ...currentRun,
        status: 'WAITING_APPROVAL',
        finishedAt,
        errorCode: 'APPROVAL_REQUIRED',
        resultSummary: `Action requires elevated authority [${job.requiredAuthority}]. Staged for sovereign operator approval.`,
      }
      this.store.updateRun(currentRun)
      this.recordAttempt(currentRun, startedAt, finishedAt, 'WAITING_APPROVAL', currentRun.resultSummary)
      this.finalizeRunCleanup(run.id)
      return currentRun
    }

    // 3. Autonomy Level Evaluation
    if (job.autonomyLevel === 'L0') {
      const finishedAt = this.clock.now().toISOString()
      currentRun = {
        ...currentRun,
        status: 'SUCCEEDED',
        finishedAt,
        resultSummary: `L0 Autonomy: Suggestion formulated for job ${job.title}. Zero mutation executed.`,
      }
      this.store.updateRun(currentRun)
      this.recordAttempt(currentRun, startedAt, finishedAt, 'SUCCEEDED')
      this.finalizeRunCleanup(run.id)
      return currentRun
    }

    // 4. Execution with Runtime Budget Timeout
    const timeoutMs = job.executionBudget.maxRuntimeMs ?? 60000
    let timeoutId: NodeJS.Timeout | undefined

    const timeoutPromise = new Promise<ActionResult>((resolve) => {
      timeoutId = setTimeout(() => {
        abortController.abort()
        resolve({
          success: false,
          resultSummary: `Execution timed out after ${timeoutMs}ms`,
          errorCode: 'TIMEOUT',
          reasoningUsed: false,
        })
      }, timeoutMs)
    })

    try {
      const actionPromise = this.executor.execute(job.action, abortController.signal)
      const actionResult = await Promise.race([actionPromise, timeoutPromise])

      if (timeoutId) clearTimeout(timeoutId)

      const finishedAt = this.clock.now().toISOString()

      // 5. Result Evaluation & State Transition
      if (actionResult.success) {
        // Emit notification if requested
        const createdNotifs: string[] = []
        if (actionResult.notificationToEmit) {
          const notif = await this.notificationBus.publish({
            severity: (actionResult.notificationToEmit.severity as any) ?? 'INFO',
            title: actionResult.notificationToEmit.title,
            body: actionResult.notificationToEmit.message,
            source: { type: 'JOB', id: job.id, runId: run.id },
            jobId: job.id,
            runId: run.id,
            deliveryPolicy: job.notificationPolicy.deliveryPolicy,
            quietHours: job.notificationPolicy.quietHours,
            dedupeKey: `job:${job.id}:${run.occurrenceKey}`,
          })
          createdNotifs.push(notif.id)
        }

        currentRun = {
          ...currentRun,
          status: 'SUCCEEDED',
          finishedAt,
          resultCode: actionResult.resultCode ?? 'SUCCESS',
          resultSummary: actionResult.resultSummary,
          errorCode: undefined,
          reasoningUsed: actionResult.reasoningUsed,
          roleId: actionResult.roleId,
          harnessId: actionResult.harnessId,
          tokenUsage: actionResult.tokenUsage,
          monetaryCost: actionResult.monetaryCost,
          createdNotificationIds: createdNotifs,
        }

        this.store.updateRun(currentRun)
        this.recordAttempt(currentRun, startedAt, finishedAt, 'SUCCEEDED')

        // Update JobDefinition lastRunAt (BackgroundJob remains ENABLED!)
        this.store.updateJob(job.id, {
          lastRunAt: finishedAt,
        })
      } else {
        // Evaluate Retry Policy
        const isCancelled = actionResult.errorCode === 'CANCELLED'
        const isAuthDenied = actionResult.errorCode === 'AUTHORITY_DENIED'
        const canRetry =
          !isCancelled &&
          !isAuthDenied &&
          job.retryPolicy.mode !== 'NONE' &&
          currentRun.attempt < job.retryPolicy.maxAttempts

        const runStatus: JobRunStatus = canRetry ? 'RETRY_PENDING' : 'FAILED'

        currentRun = {
          ...currentRun,
          status: runStatus,
          finishedAt,
          resultCode: actionResult.resultCode,
          resultSummary: actionResult.resultSummary,
          errorCode: actionResult.errorCode ?? 'ACTION_ERROR',
          reasoningUsed: actionResult.reasoningUsed,
        }

        this.store.updateRun(currentRun)
        this.recordAttempt(currentRun, startedAt, finishedAt, runStatus, actionResult.resultSummary)
      }

      this.finalizeRunCleanup(run.id)
      return currentRun
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)

      const finishedAt = this.clock.now().toISOString()
      currentRun = {
        ...currentRun,
        status: 'FAILED',
        finishedAt,
        errorCode: 'INTERNAL_ERROR',
        resultSummary: `Execution error: ${(err as Error).message}`,
      }

      this.store.updateRun(currentRun)
      this.recordAttempt(currentRun, startedAt, finishedAt, 'FAILED', currentRun.resultSummary)
      this.finalizeRunCleanup(run.id)
      return currentRun
    }
  }

  private recordAttempt(
    run: JobRun,
    startedAt: string,
    finishedAt: string,
    status: JobRunStatus,
    errorSummary?: string
  ): void {
    const attemptRecord: JobRunAttempt = {
      runId: run.id,
      attemptNumber: run.attempt,
      startedAt,
      finishedAt,
      status,
      errorSummary,
    }
    this.store.recordRunAttempt(attemptRecord)
  }

  private finalizeRunCleanup(runId: string): void {
    this.activeAbortControllers.delete(runId)
    this.activeRunCount = Math.max(0, this.activeRunCount - 1)
  }

  public abortRun(runId: string): boolean {
    const controller = this.activeAbortControllers.get(runId)
    if (controller) {
      controller.abort()
      return true
    }
    return false
  }

  public shutdown(): void {
    for (const controller of this.activeAbortControllers.values()) {
      controller.abort()
    }
    this.activeAbortControllers.clear()
    this.activeRunCount = 0
  }
}
