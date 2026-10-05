/**
 * Gravitas WorkSession Kernel — Startup Reconciler
 *
 * Implements crash recovery scanning and state reconciliation.
 * Invariants:
 * - PROCESS RESTART != WORKSESSION RESET
 * - CRASH RECOVERY != SUCCESS
 * - RECONCILED != SILENTLY REPAIRED
 * - UNKNOWN != ASSUMED
 * - STARTUP RECONCILIATION IS IDEMPOTENT
 */

import type { SqliteWriter } from '../persistence/sqliteWriter.js'

export interface ReconciliationReport {
  readonly reconciledAt: string
  readonly interruptedTasksCount: number
  readonly interruptedSessionsCount: number
  readonly recoveredJobsCount: number
  readonly preservedApprovalSessionsCount: number
}

export class StartupReconciler {
  private readonly writer: SqliteWriter

  public constructor(writer: SqliteWriter) {
    this.writer = writer
  }

  public reconcile(): ReconciliationReport {
    return this.writer.transaction(() => {
      const now = new Date().toISOString()
      let interruptedTasksCount = 0
      let interruptedSessionsCount = 0
      let recoveredJobsCount = 0
      let preservedApprovalSessionsCount = 0

      // 1. Scan tasks in RUNNING state
      const db = this.writer.getRawDb()
      const runningTasks = db.prepare(
        "SELECT * FROM tasks WHERE state = 'RUNNING';"
      ).all() as Record<string, unknown>[]

      for (const t of runningTasks) {
        const taskId = String(t['id'])
        const workSessionId = String(t['work_session_id'])
        this.writer.updateTaskState(taskId, 'INTERRUPTED', now)
        this.writer.appendDurableEvent({
          aggregateType: 'TASK',
          aggregateId: taskId,
          eventType: 'TASK_STATE_CHANGED',
          aggregateRevision: 1,
          occurredAt: now,
          payload: {
            fromState: 'RUNNING',
            toState: 'INTERRUPTED',
            workSessionId,
            reason: 'KERNEL_STARTUP_RECONCILIATION_CRASH_DETECTED',
          },
        })
        interruptedTasksCount++
      }

      // 2. Scan work_sessions in ACTIVE state
      const activeSessions = db.prepare(
        "SELECT * FROM work_sessions WHERE state = 'ACTIVE';"
      ).all() as Record<string, unknown>[]

      for (const s of activeSessions) {
        const sessionId = String(s['id'])
        const revision = Number(s['revision']) + 1
        this.writer.updateWorkSessionState(
          sessionId,
          'RECOVERY_REQUIRED',
          revision,
          now,
          'INTERRUPTED_PROCESS_CRASH_DETECTED',
          {
            reconciledAt: now,
            previousState: 'ACTIVE',
            reason: 'Kernel restarted while session was ACTIVE',
          }
        )
        this.writer.appendDurableEvent({
          aggregateType: 'WORKSESSION',
          aggregateId: sessionId,
          eventType: 'WORKSESSION_STATE_CHANGED',
          aggregateRevision: revision,
          occurredAt: now,
          payload: {
            fromState: 'ACTIVE',
            toState: 'RECOVERY_REQUIRED',
            reason: 'INTERRUPTED_PROCESS_CRASH_DETECTED',
          },
        })
        interruptedSessionsCount++
      }

      // 3. Verify WAITING_APPROVAL sessions are preserved
      const approvalSessions = db.prepare(
        "SELECT COUNT(*) as count FROM work_sessions WHERE state = 'WAITING_APPROVAL';"
      ).get() as { count: number }
      preservedApprovalSessionsCount = approvalSessions.count

      // 4. Scan durable_jobs in LEASED state
      const leasedJobs = db.prepare(
        "SELECT * FROM durable_jobs WHERE state = 'LEASED';"
      ).all() as Record<string, unknown>[]

      for (const j of leasedJobs) {
        const jobId = String(j['id'])
        const workSessionId = String(j['work_session_id'])
        this.writer.updateJobLease(jobId, 'EXPIRED', null, null, null, now)
        this.writer.appendDurableEvent({
          aggregateType: 'JOB',
          aggregateId: jobId,
          eventType: 'JOB_EXPIRED',
          aggregateRevision: 1,
          occurredAt: now,
          payload: {
            jobId,
            workSessionId,
            reason: 'STARTUP_RECONCILER_LEASE_EXPIRED_AFTER_RESTART',
          },
        })
        recoveredJobsCount++
      }

      // 5. Append top-level reconciliation event if mutations occurred
      const totalMutations = interruptedTasksCount + interruptedSessionsCount + recoveredJobsCount
      if (totalMutations > 0) {
        this.writer.appendDurableEvent({
          aggregateType: 'KERNEL',
          aggregateId: 'system',
          eventType: 'RECONCILIATION_COMPLETED',
          aggregateRevision: 1,
          occurredAt: now,
          payload: {
            interruptedTasksCount,
            interruptedSessionsCount,
            recoveredJobsCount,
            preservedApprovalSessionsCount,
          },
        })
      }

      return {
        reconciledAt: now,
        interruptedTasksCount,
        interruptedSessionsCount,
        recoveredJobsCount,
        preservedApprovalSessionsCount,
      }
    })
  }
}
