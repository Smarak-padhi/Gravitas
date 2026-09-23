/**
 * Gravitas Personal OS Background Execution Kernel — SQLite JobStore Implementation
 *
 * Wave 12I Architectural Specification
 *
 * Implements:
 * 1. Versioned schema migrations (schema_metadata table).
 * 2. Atomic occurrence claiming (UNIQUE constraint on occurrence_claims).
 * 3. PRAGMA foreign_keys = ON, PRAGMA journal_mode = WAL.
 * 4. Interrupted run recovery (reconcileInterruptedRuns).
 * 5. Driver isolation: uses Node.js native node:sqlite DatabaseSync without leaking driver details.
 */

import { DatabaseSync } from 'node:sqlite'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type {
  BackgroundJob,
  JobDefinitionStatus,
  JobRun,
  JobRunAttempt,
  PersonalOsNotification,
} from '@gravitas/core'
import type {
  JobStore,
  JobFilter,
  NotificationFilter,
  ClaimOccurrenceParams,
  ClaimOccurrenceResult,
} from './jobStore.js'

export const CURRENT_SCHEMA_VERSION = 1

export class SqliteJobStore implements JobStore {
  private readonly db: DatabaseSync

  public constructor(databasePath: string = ':memory:') {
    try {
      if (databasePath !== ':memory:') {
        const dir = path.dirname(path.resolve(databasePath))
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
      }
      this.db = new DatabaseSync(databasePath)
      this.initPragmas()
      this.runMigrations()
    } catch (err) {
      throw new Error(`PERSONAL_OS_STORE_UNAVAILABLE: Failed to initialize SQLite JobStore at ${databasePath}: ${(err as Error).message}`)
    }
  }

  private initPragmas(): void {
    this.db.exec('PRAGMA foreign_keys = ON;')
    this.db.exec('PRAGMA journal_mode = WAL;')
    this.db.exec('PRAGMA busy_timeout = 5000;')
  }

  private runMigrations(): void {
    // 1. Schema metadata table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_metadata (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `)

    const currentVersionRow = this.db.prepare('SELECT MAX(version) as max_v FROM schema_metadata').get() as { max_v?: number } | undefined
    const currentVersion = currentVersionRow?.max_v ?? 0

    if (currentVersion < 1) {
      this.db.exec('BEGIN IMMEDIATE;')
      try {
        // Migration v1
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS background_jobs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            kind TEXT NOT NULL,
            status TEXT NOT NULL,
            trigger_json TEXT NOT NULL,
            action_json TEXT NOT NULL,
            autonomy_level TEXT NOT NULL,
            required_authority TEXT NOT NULL,
            context_domains_json TEXT NOT NULL,
            execution_budget_json TEXT NOT NULL,
            retry_policy_json TEXT NOT NULL,
            notification_policy_json TEXT NOT NULL,
            next_run_at TEXT,
            last_run_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_jobs_status ON background_jobs(status);
          CREATE INDEX IF NOT EXISTS idx_jobs_next_run ON background_jobs(next_run_at);
          CREATE INDEX IF NOT EXISTS idx_jobs_kind ON background_jobs(kind);

          CREATE TABLE IF NOT EXISTS occurrence_claims (
            job_id TEXT NOT NULL,
            occurrence_key TEXT NOT NULL,
            run_id TEXT NOT NULL,
            claimed_at TEXT NOT NULL,
            PRIMARY KEY (job_id, occurrence_key),
            FOREIGN KEY (job_id) REFERENCES background_jobs(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS job_runs (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            occurrence_key TEXT NOT NULL,
            scheduled_for TEXT NOT NULL,
            status TEXT NOT NULL,
            attempt INTEGER NOT NULL,
            started_at TEXT,
            finished_at TEXT,
            result_code TEXT,
            result_summary TEXT,
            error_code TEXT,
            reasoning_used INTEGER NOT NULL,
            role_id TEXT,
            harness_id TEXT,
            token_usage_json TEXT,
            monetary_cost REAL,
            created_notification_ids_json TEXT NOT NULL,
            FOREIGN KEY (job_id) REFERENCES background_jobs(id) ON DELETE CASCADE
          );

          CREATE INDEX IF NOT EXISTS idx_runs_job_id ON job_runs(job_id);
          CREATE INDEX IF NOT EXISTS idx_runs_status ON job_runs(status);
          CREATE INDEX IF NOT EXISTS idx_runs_scheduled_for ON job_runs(scheduled_for);

          CREATE TABLE IF NOT EXISTS job_run_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            attempt_number INTEGER NOT NULL,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            status TEXT NOT NULL,
            error_summary TEXT,
            FOREIGN KEY (run_id) REFERENCES job_runs(id) ON DELETE CASCADE
          );

          CREATE INDEX IF NOT EXISTS idx_attempts_run_id ON job_run_attempts(run_id);

          CREATE TABLE IF NOT EXISTS personal_os_notifications (
            id TEXT PRIMARY KEY,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            source_json TEXT NOT NULL,
            job_id TEXT,
            run_id TEXT,
            delivery_policy TEXT NOT NULL,
            delivery_state TEXT NOT NULL,
            deliver_after TEXT,
            dedupe_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            read_at TEXT
          );

          CREATE INDEX IF NOT EXISTS idx_notifs_delivery ON personal_os_notifications(delivery_state);
          CREATE INDEX IF NOT EXISTS idx_notifs_dedupe ON personal_os_notifications(dedupe_key);
          CREATE INDEX IF NOT EXISTS idx_notifs_created ON personal_os_notifications(created_at);

          INSERT INTO schema_metadata (version, applied_at)
          VALUES (1, '${new Date().toISOString()}');
        `)
        this.db.exec('COMMIT;')
      } catch (err) {
        this.db.exec('ROLLBACK;')
        throw err
      }
    }
  }

  public getSchemaVersion(): number {
    const row = this.db.prepare('SELECT MAX(version) as max_v FROM schema_metadata').get() as { max_v?: number } | undefined
    return row?.max_v ?? 0
  }

  // ==========================================================================
  // Background Job Definitions
  // ==========================================================================

  public saveJob(job: BackgroundJob): void {
    const stmt = this.db.prepare(`
      INSERT INTO background_jobs (
        id, title, description, kind, status, trigger_json, action_json,
        autonomy_level, required_authority, context_domains_json,
        execution_budget_json, retry_policy_json, notification_policy_json,
        next_run_at, last_run_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        kind = excluded.kind,
        status = excluded.status,
        trigger_json = excluded.trigger_json,
        action_json = excluded.action_json,
        autonomy_level = excluded.autonomy_level,
        required_authority = excluded.required_authority,
        context_domains_json = excluded.context_domains_json,
        execution_budget_json = excluded.execution_budget_json,
        retry_policy_json = excluded.retry_policy_json,
        notification_policy_json = excluded.notification_policy_json,
        next_run_at = excluded.next_run_at,
        last_run_at = excluded.last_run_at,
        updated_at = excluded.updated_at;
    `)

    stmt.run(
      job.id,
      job.title,
      job.description ?? null,
      job.kind,
      job.status,
      JSON.stringify(job.trigger),
      JSON.stringify(job.action),
      (job as any).autonomyLevel ?? 'L1',
      (job as any).requiredAuthority ?? (job as any).authorityClass ?? 'READ',
      JSON.stringify((job as any).contextDomains ?? ['SYSTEM']),
      JSON.stringify((job as any).executionBudget ?? (job as any).budget ?? { maxRuntimeMs: 30000, maxAttempts: 1 }),
      JSON.stringify((job as any).retryPolicy ?? { mode: 'NONE', maxAttempts: 1, delayMs: 0 }),
      JSON.stringify((job as any).notificationPolicy ?? { deliveryPolicy: 'IMMEDIATE' }),
      job.nextRunAt ?? null,
      job.lastRunAt ?? null,
      job.createdAt ?? new Date().toISOString(),
      job.updatedAt ?? new Date().toISOString()
    )
  }

  public getJob(id: string): BackgroundJob | null {
    const row = this.db.prepare('SELECT * FROM background_jobs WHERE id = ?').get(id) as Record<string, any> | undefined
    if (!row) return null
    return this.mapJobRow(row)
  }

  public listJobs(filter?: JobFilter): BackgroundJob[] {
    let sql = 'SELECT * FROM background_jobs WHERE 1=1'
    const params: any[] = []

    if (filter?.status) {
      sql += ' AND status = ?'
      params.push(filter.status)
    }
    if (filter?.kind) {
      sql += ' AND kind = ?'
      params.push(filter.kind)
    }
    sql += ' ORDER BY created_at DESC'

    const rows = this.db.prepare(sql).all(...params) as Array<Record<string, any>>
    return rows.map((r) => this.mapJobRow(r))
  }

  public updateJobStatus(id: string, status: JobDefinitionStatus): void {
    const now = new Date().toISOString()
    this.db.prepare('UPDATE background_jobs SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id)
  }

  public updateJob(id: string, patch: Partial<BackgroundJob>): void {
    const existing = this.getJob(id)
    if (!existing) {
      throw new Error(`Job not found: ${id}`)
    }

    const updated: BackgroundJob = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }

    this.saveJob(updated)
  }

  private mapJobRow(row: any): BackgroundJob {
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      kind: row.kind,
      status: row.status,
      trigger: JSON.parse(row.trigger_json),
      action: JSON.parse(row.action_json),
      autonomyLevel: row.autonomy_level,
      requiredAuthority: row.required_authority,
      contextDomains: JSON.parse(row.context_domains_json),
      executionBudget: JSON.parse(row.execution_budget_json),
      retryPolicy: JSON.parse(row.retry_policy_json),
      notificationPolicy: JSON.parse(row.notification_policy_json),
      nextRunAt: row.next_run_at ?? undefined,
      lastRunAt: row.last_run_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  // ==========================================================================
  // Occurrence Claiming (Atomic SQLite UNIQUE Constraint)
  // ==========================================================================

  public claimOccurrence(params: ClaimOccurrenceParams): ClaimOccurrenceResult {
    const runId = params.runId ?? `run_${params.jobId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const nowIso = new Date().toISOString()

    this.db.exec('BEGIN IMMEDIATE;')
    try {
      // 1. Try atomic claim insert
      const claimStmt = this.db.prepare(`
        INSERT INTO occurrence_claims (job_id, occurrence_key, run_id, claimed_at)
        VALUES (?, ?, ?, ?);
      `)
      claimStmt.run(params.jobId, params.occurrenceKey, runId, nowIso)

      // 2. If claimed, instantiate initial JobRun record in READY status
      const initialRun: JobRun = {
        id: runId,
        jobId: params.jobId,
        occurrenceKey: params.occurrenceKey,
        scheduledFor: params.scheduledFor,
        status: 'READY',
        attempt: 1,
        startedAt: undefined,
        finishedAt: undefined,
        reasoningUsed: false,
        createdNotificationIds: [],
      }

      this.insertRunRecord(initialRun)

      this.db.exec('COMMIT;')
      return { claimed: true, run: initialRun }
    } catch {
      // Constraint violation (duplicate occurrence key) or error
      this.db.exec('ROLLBACK;')
      return { claimed: false }
    }
  }

  public getOccurrenceClaim(jobId: string, occurrenceKey: string): { runId: string; claimedAt: string } | null {
    const row = this.db.prepare(`
      SELECT run_id, claimed_at FROM occurrence_claims
      WHERE job_id = ? AND occurrence_key = ?
    `).get(jobId, occurrenceKey) as { run_id: string; claimed_at: string } | undefined

    if (!row) return null
    return {
      runId: row.run_id,
      claimedAt: row.claimed_at,
    }
  }

  // ==========================================================================
  // Job Run Execution Tracking & Attempts
  // ==========================================================================

  private insertRunRecord(run: JobRun): void {
    const stmt = this.db.prepare(`
      INSERT INTO job_runs (
        id, job_id, occurrence_key, scheduled_for, status, attempt,
        started_at, finished_at, result_code, result_summary, error_code,
        reasoning_used, role_id, harness_id, token_usage_json, monetary_cost,
        created_notification_ids_json
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      );
    `)

    stmt.run(
      run.id,
      run.jobId,
      run.occurrenceKey,
      run.scheduledFor,
      run.status,
      run.attempt,
      run.startedAt ?? null,
      run.finishedAt ?? null,
      run.resultCode ?? null,
      run.resultSummary ?? null,
      run.errorCode ?? null,
      run.reasoningUsed ? 1 : 0,
      run.roleId ?? null,
      run.harnessId ?? null,
      run.tokenUsage ? JSON.stringify(run.tokenUsage) : null,
      run.monetaryCost ?? null,
      JSON.stringify(run.createdNotificationIds)
    )
  }

  public getRun(id: string): JobRun | null {
    const row = this.db.prepare('SELECT * FROM job_runs WHERE id = ?').get(id) as Record<string, any> | undefined
    if (!row) return null
    return this.mapRunRow(row)
  }

  public getRunsForJob(jobId: string, limit: number = 50): JobRun[] {
    const rows = this.db.prepare(`
      SELECT * FROM job_runs WHERE job_id = ? ORDER BY scheduled_for DESC LIMIT ?
    `).all(jobId, limit) as Array<Record<string, any>>
    return rows.map((r) => this.mapRunRow(r))
  }

  public listRecentRuns(limit: number = 50): JobRun[] {
    const rows = this.db.prepare(`
      SELECT * FROM job_runs ORDER BY scheduled_for DESC LIMIT ?
    `).all(limit) as Array<Record<string, any>>
    return rows.map((r) => this.mapRunRow(r))
  }

  public updateRun(run: JobRun): void {
    const stmt = this.db.prepare(`
      UPDATE job_runs SET
        status = ?,
        attempt = ?,
        started_at = ?,
        finished_at = ?,
        result_code = ?,
        result_summary = ?,
        error_code = ?,
        reasoning_used = ?,
        role_id = ?,
        harness_id = ?,
        token_usage_json = ?,
        monetary_cost = ?,
        created_notification_ids_json = ?
      WHERE id = ?;
    `)

    stmt.run(
      run.status,
      run.attempt,
      run.startedAt ?? null,
      run.finishedAt ?? null,
      run.resultCode ?? null,
      run.resultSummary ?? null,
      run.errorCode ?? null,
      run.reasoningUsed ? 1 : 0,
      run.roleId ?? null,
      run.harnessId ?? null,
      run.tokenUsage ? JSON.stringify(run.tokenUsage) : null,
      run.monetaryCost ?? null,
      JSON.stringify(run.createdNotificationIds),
      run.id
    )
  }

  public recordRunAttempt(attempt: JobRunAttempt): void {
    const stmt = this.db.prepare(`
      INSERT INTO job_run_attempts (
        run_id, attempt_number, started_at, finished_at, status, error_summary
      ) VALUES (?, ?, ?, ?, ?, ?);
    `)

    stmt.run(
      attempt.runId,
      attempt.attemptNumber,
      attempt.startedAt,
      attempt.finishedAt ?? null,
      attempt.status,
      attempt.errorSummary ?? null
    )
  }

  public getRunAttempts(runId: string): JobRunAttempt[] {
    const rows = this.db.prepare(`
      SELECT * FROM job_run_attempts WHERE run_id = ? ORDER BY attempt_number ASC
    `).all(runId) as Array<Record<string, any>>

    return rows.map((r: any) => ({
      runId: r.run_id,
      attemptNumber: r.attempt_number,
      startedAt: r.started_at,
      finishedAt: r.finished_at ?? undefined,
      status: r.status,
      errorSummary: r.error_summary ?? undefined,
    }))
  }

  private mapRunRow(row: any): JobRun {
    return {
      id: row.id,
      jobId: row.job_id,
      occurrenceKey: row.occurrence_key,
      scheduledFor: row.scheduled_for,
      status: row.status,
      attempt: row.attempt,
      startedAt: row.started_at ?? undefined,
      finishedAt: row.finished_at ?? undefined,
      resultCode: row.result_code ?? undefined,
      resultSummary: row.result_summary ?? undefined,
      errorCode: row.error_code ?? undefined,
      reasoningUsed: Boolean(row.reasoning_used),
      roleId: row.role_id ?? undefined,
      harnessId: row.harness_id ?? undefined,
      tokenUsage: row.token_usage_json ? JSON.parse(row.token_usage_json) : undefined,
      monetaryCost: row.monetary_cost ?? undefined,
      createdNotificationIds: JSON.parse(row.created_notification_ids_json ?? '[]'),
    }
  }

  // ==========================================================================
  // Notifications
  // ==========================================================================

  public saveNotification(notification: PersonalOsNotification): void {
    const stmt = this.db.prepare(`
      INSERT INTO personal_os_notifications (
        id, severity, title, body, source_json, job_id, run_id,
        delivery_policy, delivery_state, deliver_after, dedupe_key,
        created_at, read_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        delivery_state = excluded.delivery_state,
        deliver_after = excluded.deliver_after,
        read_at = excluded.read_at;
    `)

    stmt.run(
      notification.id,
      notification.severity,
      notification.title,
      notification.body,
      JSON.stringify(notification.source),
      notification.jobId ?? null,
      notification.runId ?? null,
      notification.deliveryPolicy,
      notification.deliveryState,
      notification.deliverAfter ?? null,
      notification.dedupeKey,
      notification.createdAt,
      notification.readAt ?? null
    )
  }

  public getNotification(id: string): PersonalOsNotification | null {
    const row = this.db.prepare('SELECT * FROM personal_os_notifications WHERE id = ?').get(id) as Record<string, any> | undefined
    if (!row) return null
    return this.mapNotificationRow(row)
  }

  public findNotificationByDedupeKey(dedupeKey: string, sinceIso: string): PersonalOsNotification | null {
    const row = this.db.prepare(`
      SELECT * FROM personal_os_notifications
      WHERE dedupe_key = ? AND created_at >= ?
      ORDER BY created_at DESC LIMIT 1
    `).get(dedupeKey, sinceIso) as Record<string, any> | undefined

    if (!row) return null
    return this.mapNotificationRow(row)
  }

  public listNotifications(filter?: NotificationFilter): PersonalOsNotification[] {
    let sql = 'SELECT * FROM personal_os_notifications WHERE 1=1'
    const params: any[] = []

    if (filter?.unreadOnly) {
      sql += ' AND read_at IS NULL'
    }
    if (filter?.severity) {
      sql += ' AND severity = ?'
      params.push(filter.severity)
    }

    sql += ' ORDER BY created_at DESC'

    if (filter?.limit) {
      sql += ' LIMIT ?'
      params.push(filter.limit)
    }

    const rows = this.db.prepare(sql).all(...params) as Array<Record<string, any>>
    return rows.map((r) => this.mapNotificationRow(r))
  }

  public markNotificationRead(id: string, readAt?: string): void {
    const timestamp = readAt ?? new Date().toISOString()
    this.db.prepare('UPDATE personal_os_notifications SET read_at = ? WHERE id = ?').run(timestamp, id)
  }

  public markAllNotificationsRead(readAt?: string): number {
    const timestamp = readAt ?? new Date().toISOString()
    const result = this.db.prepare('UPDATE personal_os_notifications SET read_at = ? WHERE read_at IS NULL').run(timestamp)
    return Number(result.changes)
  }

  public updateNotificationDeliveryState(
    id: string,
    state: PersonalOsNotification['deliveryState'],
    deliverAfter?: string
  ): void {
    this.db.prepare(`
      UPDATE personal_os_notifications
      SET delivery_state = ?, deliver_after = ?
      WHERE id = ?
    `).run(state, deliverAfter ?? null, id)
  }

  private mapNotificationRow(row: any): PersonalOsNotification {
    return {
      id: row.id,
      severity: row.severity,
      title: row.title,
      body: row.body,
      source: JSON.parse(row.source_json),
      jobId: row.job_id ?? undefined,
      runId: row.run_id ?? undefined,
      deliveryPolicy: row.delivery_policy,
      deliveryState: row.delivery_state,
      deliverAfter: row.deliver_after ?? undefined,
      dedupeKey: row.dedupe_key,
      createdAt: row.created_at,
      readAt: row.read_at ?? undefined,
    }
  }

  // ==========================================================================
  // Startup Reconciliation: Interrupted Run Recovery
  // ==========================================================================

  public reconcileInterruptedRuns(nowIso?: string): number {
    const timestamp = nowIso ?? new Date().toISOString()
    const result = this.db.prepare(`
      UPDATE job_runs
      SET status = 'FAILED', error_code = 'PROCESS_INTERRUPTED', finished_at = ?
      WHERE status IN ('RUNNING', 'READY')
    `).run(timestamp)

    return Number(result.changes)
  }

  private isClosed = false

  public close(): void {
    if (this.isClosed) return
    this.isClosed = true
    try {
      this.db.close()
    } catch {
      // Ignore if already closed
    }
  }
}
