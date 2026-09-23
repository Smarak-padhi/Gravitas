/**
 * Gravitas Personal OS Background Execution Kernel — Deterministic Job Scheduler
 *
 * Wave 12I Architectural Specification
 *
 * Implements:
 * 1. Schedule evaluation & due occurrence calculation.
 * 2. Atomic occurrence claiming via JobStore (preventing duplicate ticks/runs).
 * 3. Bounded scheduler cadence (e.g. 1000ms tick, zero millisecond polling loops).
 * 4. Explicit lifecycle (start, stop, tick) with zero timer leaks.
 * 5. Manual run triggering with explicit occurrence identity.
 * 6. BackgroundJob status remains ENABLED across recurring occurrences.
 */

import type {
  JobRun,
  Clock,
} from '@gravitas/core'
import type { JobStore } from './jobStore.js'
import { calculateNextRunAt } from './scheduleCalculator.js'
import { JobRunner } from './jobRunner.js'

export interface JobSchedulerOptions {
  readonly store: JobStore
  readonly runner: JobRunner
  readonly clock: Clock
  readonly tickIntervalMs?: number | undefined
}

export class JobScheduler {
  private readonly store: JobStore
  private readonly runner: JobRunner
  private readonly clock: Clock
  private readonly tickIntervalMs: number

  private timerId: NodeJS.Timeout | null = null
  private isTicking: boolean = false
  private isRunning: boolean = false
  private activeRunPromises = new Set<Promise<any>>()

  public constructor(options: JobSchedulerOptions) {
    this.store = options.store
    this.runner = options.runner
    this.clock = options.clock
    this.tickIntervalMs = options.tickIntervalMs ?? 1000
  }

  public async waitForActiveRuns(): Promise<void> {
    await Promise.all(Array.from(this.activeRunPromises))
  }

  public start(): void {
    if (this.isRunning) return
    this.isRunning = true

    this.timerId = setInterval(() => {
      this.tick().catch((err) => {
        // Scheduler tick error boundary: log and continue next tick
        console.error('[JobScheduler] Tick error:', err)
      })
    }, this.tickIntervalMs)
  }

  public stop(): void {
    this.isRunning = false
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
    this.runner.shutdown()
  }

  public isActive(): boolean {
    return this.isRunning
  }

  /**
   * Deterministic scheduler tick.
   * Can be invoked directly in unit tests using a FakeClock.
   */
  public async tick(): Promise<JobRun[]> {
    if (this.isTicking) return []
    this.isTicking = true

    const executedRuns: JobRun[] = []
    const now = this.clock.now()
    const nowMs = now.getTime()
    const nowIso = now.toISOString()

    try {
      // 1. Fetch enabled jobs
      const jobs = this.store.listJobs({ status: 'ENABLED' })

      for (const job of jobs) {
        // Compute nextRunAt if not set
        let targetNextRun = job.nextRunAt
        if (!targetNextRun) {
          targetNextRun = calculateNextRunAt(job.trigger, this.clock, job.lastRunAt)
          if (targetNextRun) {
            this.store.updateJob(job.id, { nextRunAt: targetNextRun })
          }
        }

        // Check if due
        if (targetNextRun && new Date(targetNextRun).getTime() <= nowMs) {
          const occurrenceKey = `${job.id}:${targetNextRun}`

          // 2. Atomic Occurrence Claim
          const claim = this.store.claimOccurrence({
            jobId: job.id,
            occurrenceKey,
            scheduledFor: targetNextRun,
          })

          if (claim.claimed && claim.run) {
            // 3. Immediately advance the job's next occurrence in the store
            const futureRunAt = calculateNextRunAt(job.trigger, this.clock, nowIso)
            this.store.updateJob(job.id, { nextRunAt: futureRunAt })

            // 4. Dispatch claimed run to runner
            const runPromise = this.runner.executeRun(job, claim.run)
            executedRuns.push(claim.run)
            this.activeRunPromises.add(runPromise)
            // Non-blocking background execution
            runPromise
              .catch((err) => {
                console.error(`[JobScheduler] Run ${claim.run!.id} failed unexpectedly:`, err)
              })
              .finally(() => {
                this.activeRunPromises.delete(runPromise)
              })
          }
        }
      }

      // 5. Evaluate any RETRY_PENDING runs
      const recentRuns = this.store.listRecentRuns(20)
      for (const run of recentRuns) {
        if (run.status === 'RETRY_PENDING') {
          const job = this.store.getJob(run.jobId)
          if (job && job.status === 'ENABLED' && this.runner.canAcceptRun()) {
            const nextAttempt = run.attempt + 1
            const updatedRun: JobRun = {
              ...run,
              status: 'READY',
              attempt: nextAttempt,
            }
            this.store.updateRun(updatedRun)
            const runPromise = this.runner.executeRun(job, updatedRun)
            executedRuns.push(updatedRun)
            this.activeRunPromises.add(runPromise)
            runPromise
              .catch(() => {})
              .finally(() => {
                this.activeRunPromises.delete(runPromise)
              })
          }
        }
      }

      return executedRuns
    } finally {
      this.isTicking = false
    }
  }

  /**
   * Triggers an explicit manual execution of a BackgroundJob.
   *
   * @param jobId The target background job ID
   * @param runCommandId Optional client idempotency / command identifier
   */
  public async triggerManualRun(jobId: string, runCommandId?: string): Promise<JobRun> {
    const job = this.store.getJob(jobId)
    if (!job) {
      throw new Error(`JOB_NOT_FOUND: Background job ${jobId} not found`)
    }

    if (job.status === 'CANCELLED') {
      throw new Error(`JOB_CANCELLED: Cannot trigger cancelled job ${jobId}`)
    }

    const commandId = runCommandId ?? `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const occurrenceKey = `manual:${jobId}:${commandId}`
    const nowIso = this.clock.now().toISOString()

    const claim = this.store.claimOccurrence({
      jobId,
      occurrenceKey,
      scheduledFor: nowIso,
    })

    if (!claim.claimed || !claim.run) {
      // Idempotency: return existing run if double-submitted with same command ID
      const existingRuns = this.store.getRunsForJob(jobId, 10)
      const existing = existingRuns.find((r) => r.occurrenceKey === occurrenceKey)
      if (existing) {
        return existing
      }
      throw new Error(`OCCURRENCE_ALREADY_CLAIMED: Manual occurrence ${occurrenceKey} is already claimed`)
    }

    // Execute run synchronously or asynchronously
    return this.runner.executeRun(job, claim.run)
  }
}
