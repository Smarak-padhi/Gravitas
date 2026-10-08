/**
 * Gravitas WorkSession Kernel — Single Canonical SQLite Writer
 *
 * Implements:
 * - ONE CANONICAL OWNER PER MUTABLE DOMAIN
 * - WORKER PROCESS != CANONICAL DATABASE WRITER
 * - WAL mode with BEGIN IMMEDIATE transactions
 * - Parameterized queries for SQL injection safety
 */

import { DatabaseSync } from 'node:sqlite'
import * as path from 'node:path'
import * as fs from 'node:fs'
import type { WorkSession, WorkSessionRun, WorkSessionTask, WorkSessionState } from '../domain/worksession.js'
import type { AppendEventParams, DurableEvent } from '../domain/events.js'
import type { CommandReceipt } from '../domain/commands.js'
import type { DurableJob, DurableJobState } from '../domain/jobs.js'
import { DatabaseCorruptionError } from '../domain/errors.js'
import { initializeOrMigrateSchema } from './schema.js'

export interface SQLiteContentionPolicy {
  /**
   * Maximum duration in milliseconds SQLite waits on a locked table before failing.
   * [NON_NORMATIVE_INITIAL_DEFAULT: 5000ms]
   * REQUIRES_OPERATIONAL_CALIBRATION
   */
  readonly busyTimeoutMs: number
}

export interface SQLiteDurabilityPolicy {
  /**
   * Disk synchronization mode.
   * [NON_NORMATIVE_INITIAL_DEFAULT: 'NORMAL']
   * Deliberate operational policy balancing commit latency with crash resilience.
   * REQUIRES_OPERATIONAL_CALIBRATION
   */
  readonly synchronous: 'NORMAL' | 'FULL'
}

/**
 * Well-known brand symbol for authoritative K5 receipts issued by @gravitas/verifier.
 * Prevents generic in-process callers from manufacturing unverified receipts.
 */
export const K5_AUTHORITY_BRAND = Symbol.for('gravitas.k5.authority')

export interface K5ReceiptRecord {
  readonly receiptId: string
  readonly planId: string
  readonly workSessionId: string
  readonly taskId: string
  readonly runId: string
  readonly attemptNumber: number
  readonly verdict: 'VERIFIED_PASS' | 'VERIFIED_FAIL'
  readonly commandsCount: number
  readonly passedCommandsCount: number
  readonly failedCommandsCount: number
  readonly completedAt: string
  readonly issuedAt: string
  readonly superseded: boolean
}

export interface DurableModelObservation {
  readonly observationId: string
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly attemptNumber: number
  readonly providerId: string
  readonly modelId: string
  readonly taskDomain: string
  readonly taskComplexity: string
  readonly qualificationIdentity: string
  readonly k5PlanId: string
  readonly k5ReceiptId: string
  readonly verifiedOutcome: 'VERIFIED_PASS' | 'VERIFIED_FAIL'
  readonly latencyMs: number
  readonly promptTokens: number
  readonly completionTokens: number
  readonly totalTokens: number
  readonly failureClass?: string | undefined
  readonly schemaVersion: number
  readonly createdAt: string
}

/**
 * Narrow persistence port for model capability observations and K5 receipts.
 * Keeps raw database access restricted while providing durable storage.
 */
export interface DurableModelObservationStore {
  insertK5Receipt(receipt: K5ReceiptRecord): void
  getK5Receipt(receiptId: string): K5ReceiptRecord | undefined
  listK5ReceiptsForTask(taskId: string): readonly K5ReceiptRecord[]
  listAllK5Receipts(): readonly K5ReceiptRecord[]
  markK5ReceiptSuperseded(receiptId: string): void
  insertModelObservation(obs: DurableModelObservation): void
  getModelObservation(observationId: string): DurableModelObservation | undefined
  getModelObservationByReceiptId(receiptId: string): DurableModelObservation | undefined
  listModelObservations(): readonly DurableModelObservation[]
  listModelObservationsForModel(providerId: string, modelId: string): readonly DurableModelObservation[]
}

export interface SqliteWriterOptions {
  readonly databasePath: string
  readonly contentionPolicy?: SQLiteContentionPolicy | undefined
  readonly durabilityPolicy?: SQLiteDurabilityPolicy | undefined
  readonly busyTimeoutMs?: number | undefined // Backward-compatibility convenience
  readonly synchronous?: 'NORMAL' | 'FULL' | undefined // Backward-compatibility convenience
}

export class SqliteWriter implements DurableModelObservationStore {
  private readonly db: DatabaseSync
  private readonly databasePath: string
  private readonly contentionPolicy: SQLiteContentionPolicy
  private readonly durabilityPolicy: SQLiteDurabilityPolicy

  public constructor(options: SqliteWriterOptions) {
    this.databasePath = path.resolve(options.databasePath)
    this.contentionPolicy = options.contentionPolicy ?? {
      busyTimeoutMs: options.busyTimeoutMs ?? 5000,
    }
    this.durabilityPolicy = options.durabilityPolicy ?? {
      synchronous: options.synchronous ?? 'NORMAL',
    }

    const dir = path.dirname(this.databasePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    try {
      this.db = new DatabaseSync(this.databasePath)
      this.initPragmas(this.contentionPolicy.busyTimeoutMs, this.durabilityPolicy.synchronous)
      initializeOrMigrateSchema(this.db, this.databasePath)
    } catch (err: any) {
      if (err instanceof DatabaseCorruptionError) {
        throw err
      }
      const msg = String(err?.message || err)
      if (msg.includes('file is not a database') || msg.includes('corrupt') || msg.includes('malformed')) {
        throw new DatabaseCorruptionError(this.databasePath, msg)
      }
      throw err
    }
  }

  private initPragmas(busyTimeoutMs: number, synchronous: 'NORMAL' | 'FULL'): void {
    this.db.exec('PRAGMA foreign_keys = ON;')
    this.db.exec('PRAGMA journal_mode = WAL;')
    this.db.exec(`PRAGMA busy_timeout = ${Number(busyTimeoutMs)};`)
    this.db.exec(`PRAGMA synchronous = ${synchronous};`)
  }

  public getContentionPolicy(): SQLiteContentionPolicy {
    return this.contentionPolicy
  }

  public getDurabilityPolicy(): SQLiteDurabilityPolicy {
    return this.durabilityPolicy
  }

  public getDatabasePath(): string {
    return this.databasePath
  }

  public getRawDb(): DatabaseSync {
    return this.db
  }

  public transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      const result = fn()
      this.db.exec('COMMIT;')
      return result
    } catch (err) {
      try {
        this.db.exec('ROLLBACK;')
      } catch {
        // Rollback might fail if transaction was aborted by SQLite
      }
      throw err
    }
  }

  // --- WorkSession persistence ---

  public insertWorkSession(session: WorkSession): void {
    const stmt = this.db.prepare(`
      INSERT INTO work_sessions (
        id, title, objective, repository_root, base_branch, state,
        revision, created_at, updated_at, terminal_reason,
        recovery_metadata_json, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `)
    stmt.run(
      session.id,
      session.title,
      session.objective,
      session.repositoryRoot,
      session.baseBranch,
      session.state,
      session.revision,
      session.createdAt,
      session.updatedAt,
      session.terminalReason ?? null,
      JSON.stringify(session.recoveryMetadata ?? {}),
      JSON.stringify(session.metadata ?? {})
    )
  }

  public updateWorkSessionState(
    id: string,
    state: WorkSessionState,
    revision: number,
    updatedAt: string,
    terminalReason?: string | undefined,
    recoveryMetadata?: Record<string, unknown> | undefined
  ): void {
    const stmt = this.db.prepare(`
      UPDATE work_sessions
      SET state = ?, revision = ?, updated_at = ?, terminal_reason = ?, recovery_metadata_json = ?
      WHERE id = ?;
    `)
    stmt.run(
      state,
      revision,
      updatedAt,
      terminalReason ?? null,
      JSON.stringify(recoveryMetadata ?? {}),
      id
    )
  }

  public getWorkSession(id: string): WorkSession | undefined {
    const stmt = this.db.prepare('SELECT * FROM work_sessions WHERE id = ?;')
    const row = stmt.get(id) as Record<string, unknown> | undefined
    if (!row) {
      return undefined
    }
    return this.mapWorkSessionRow(row)
  }

  public listWorkSessions(): readonly WorkSession[] {
    const stmt = this.db.prepare('SELECT * FROM work_sessions ORDER BY created_at DESC;')
    const rows = stmt.all() as Record<string, unknown>[]
    return rows.map((r) => this.mapWorkSessionRow(r))
  }

  private mapWorkSessionRow(row: Record<string, unknown>): WorkSession {
    const obj = String(row['objective'])
    return {
      id: String(row['id']),
      title: String(row['title']),
      objective: obj,
      goal: obj,
      repositoryRoot: String(row['repository_root']),
      baseBranch: String(row['base_branch']),
      state: row['state'] as WorkSessionState,
      revision: Number(row['revision']),
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
      terminalReason: row['terminal_reason'] ? String(row['terminal_reason']) : undefined,
      recoveryMetadata: JSON.parse(String(row['recovery_metadata_json'] || '{}')),
      metadata: JSON.parse(String(row['metadata_json'] || '{}')),
    }
  }

  // --- Runs & Tasks persistence ---

  public insertRun(run: WorkSessionRun): void {
    const stmt = this.db.prepare(`
      INSERT INTO runs (id, work_session_id, goal, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?);
    `)
    stmt.run(run.id, run.workSessionId, run.goal, run.status, run.createdAt, run.updatedAt)
  }

  public getRun(id: string): WorkSessionRun | undefined {
    const stmt = this.db.prepare('SELECT * FROM runs WHERE id = ?;')
    const row = stmt.get(id) as Record<string, unknown> | undefined
    if (!row) return undefined
    return {
      id: String(row['id']),
      workSessionId: String(row['work_session_id']),
      goal: String(row['goal']),
      status: row['status'] as WorkSessionRun['status'],
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    }
  }

  public listRunsForSession(sessionId: string): readonly WorkSessionRun[] {
    const stmt = this.db.prepare('SELECT * FROM runs WHERE work_session_id = ? ORDER BY created_at ASC;')
    const rows = stmt.all(sessionId) as Record<string, unknown>[]
    return rows.map((row) => ({
      id: String(row['id']),
      workSessionId: String(row['work_session_id']),
      goal: String(row['goal']),
      status: row['status'] as WorkSessionRun['status'],
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    }))
  }

  public insertTask(task: WorkSessionTask): void {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, run_id, work_session_id, title, state, assigned_role_id,
        requires_approval, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `)
    stmt.run(
      task.id,
      task.runId,
      task.workSessionId,
      task.title,
      task.state,
      task.assignedRoleId,
      task.requiresApproval ? 1 : 0,
      task.createdAt,
      task.updatedAt
    )
  }

  public updateTaskState(taskId: string, state: WorkSessionTask['state'], updatedAt: string): void {
    const stmt = this.db.prepare('UPDATE tasks SET state = ?, updated_at = ? WHERE id = ?;')
    stmt.run(state, updatedAt, taskId)
  }

  public getTask(id: string): WorkSessionTask | undefined {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?;')
    const row = stmt.get(id) as Record<string, unknown> | undefined
    if (!row) return undefined
    return this.mapTaskRow(row)
  }

  public listTasksForSession(sessionId: string): readonly WorkSessionTask[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE work_session_id = ? ORDER BY created_at ASC;')
    const rows = stmt.all(sessionId) as Record<string, unknown>[]
    return rows.map((r) => this.mapTaskRow(r))
  }

  public listTasksForRun(runId: string): readonly WorkSessionTask[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE run_id = ? ORDER BY created_at ASC;')
    const rows = stmt.all(runId) as Record<string, unknown>[]
    return rows.map((r) => this.mapTaskRow(r))
  }

  private mapTaskRow(row: Record<string, unknown>): WorkSessionTask {
    return {
      id: String(row['id']),
      runId: String(row['run_id']),
      workSessionId: String(row['work_session_id']),
      title: String(row['title']),
      state: row['state'] as WorkSessionTask['state'],
      assignedRoleId: String(row['assigned_role_id']),
      requiresApproval: Number(row['requires_approval']) === 1,
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    }
  }

  // --- Durable Events persistence ---

  public appendDurableEvent(params: AppendEventParams): DurableEvent {
    const eventId = params.eventId ?? `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const occurredAt = params.occurredAt ?? new Date().toISOString()
    const payloadJson = JSON.stringify(params.payload ?? {})

    const stmt = this.db.prepare(`
      INSERT INTO durable_events (
        event_id, aggregate_type, aggregate_id, event_type, aggregate_revision,
        occurred_at, command_id, correlation_id, causation_id, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING sequence_id;
    `)

    const row = stmt.get(
      eventId,
      params.aggregateType,
      params.aggregateId,
      params.eventType,
      params.aggregateRevision,
      occurredAt,
      params.commandId ?? null,
      params.correlationId ?? null,
      params.causationId ?? null,
      payloadJson
    ) as { sequence_id: number }

    return {
      sequenceId: row.sequence_id,
      sequenceNumber: row.sequence_id,
      eventId,
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      eventType: params.eventType,
      aggregateRevision: params.aggregateRevision,
      occurredAt,
      commandId: params.commandId,
      correlationId: params.correlationId,
      causationId: params.causationId,
      payload: params.payload,
    }
  }

  public listEventsForAggregate(aggregateType: string, aggregateId: string): readonly DurableEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM durable_events
      WHERE aggregate_type = ? AND aggregate_id = ?
      ORDER BY sequence_id ASC;
    `)
    const rows = stmt.all(aggregateType, aggregateId) as Record<string, unknown>[]
    return rows.map((r) => this.mapEventRow(r))
  }

  public listEventsSince(lastSequenceId: number, limit = 500): readonly DurableEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM durable_events
      WHERE sequence_id > ?
      ORDER BY sequence_id ASC
      LIMIT ?;
    `)
    const rows = stmt.all(lastSequenceId, limit) as Record<string, unknown>[]
    return rows.map((r) => this.mapEventRow(r))
  }

  public getLatestEventSequence(): number {
    const row = this.db.prepare('SELECT MAX(sequence_id) as max_seq FROM durable_events;').get() as { max_seq: number | null } | undefined
    return row?.max_seq ?? 0
  }

  private mapEventRow(row: Record<string, unknown>): DurableEvent {
    return {
      sequenceId: Number(row['sequence_id']),
      sequenceNumber: Number(row['sequence_id']),
      eventId: String(row['event_id']),
      aggregateType: row['aggregate_type'] as DurableEvent['aggregateType'],
      aggregateId: String(row['aggregate_id']),
      eventType: String(row['event_type']),
      aggregateRevision: Number(row['aggregate_revision']),
      occurredAt: String(row['occurred_at']),
      commandId: row['command_id'] ? String(row['command_id']) : undefined,
      correlationId: row['correlation_id'] ? String(row['correlation_id']) : undefined,
      causationId: row['causation_id'] ? String(row['causation_id']) : undefined,
      payload: JSON.parse(String(row['payload_json'] || '{}')),
    }
  }

  // --- Command Receipts (Idempotency) ---

  public getCommandReceipt(commandId: string): CommandReceipt | undefined {
    const stmt = this.db.prepare('SELECT * FROM command_receipts WHERE command_id = ?;')
    const row = stmt.get(commandId) as Record<string, unknown> | undefined
    if (!row) return undefined
    return {
      commandId: String(row['command_id']),
      commandType: String(row['command_type']),
      targetAggregateId: String(row['target_aggregate_id']),
      expectedRevision: row['expected_revision'] != null ? Number(row['expected_revision']) : undefined,
      requestHash: String(row['request_hash']),
      status: row['status'] as CommandReceipt['status'],
      resultJson: String(row['result_json']),
      createdAt: String(row['created_at']),
    }
  }

  public insertCommandReceipt(receipt: CommandReceipt): void {
    const stmt = this.db.prepare(`
      INSERT INTO command_receipts (
        command_id, command_type, target_aggregate_id, expected_revision,
        request_hash, status, result_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `)
    stmt.run(
      receipt.commandId,
      receipt.commandType,
      receipt.targetAggregateId,
      receipt.expectedRevision ?? null,
      receipt.requestHash,
      receipt.status,
      receipt.resultJson,
      receipt.createdAt
    )
  }

  // --- Durable Jobs ---

  public insertDurableJob(job: DurableJob): void {
    const stmt = this.db.prepare(`
      INSERT INTO durable_jobs (
        id, job_type, work_session_id, state, payload_json,
        lease_owner, leased_at, lease_expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `)
    stmt.run(
      job.id,
      job.jobType,
      job.workSessionId ?? null,
      job.state,
      JSON.stringify(job.payload ?? {}),
      job.leaseOwner ?? null,
      job.leasedAt ?? null,
      job.leaseExpiresAt ?? null,
      job.createdAt,
      job.updatedAt
    )
  }

  public updateJobLease(
    jobId: string,
    state: DurableJobState,
    leaseOwner: string | null,
    leasedAt: string | null,
    leaseExpiresAt: string | null,
    updatedAt: string
  ): void {
    const stmt = this.db.prepare(`
      UPDATE durable_jobs
      SET state = ?, lease_owner = ?, leased_at = ?, lease_expires_at = ?, updated_at = ?
      WHERE id = ?;
    `)
    stmt.run(state, leaseOwner, leasedAt, leaseExpiresAt, updatedAt, jobId)
  }

  public getDurableJob(jobId: string): DurableJob | undefined {
    const stmt = this.db.prepare('SELECT * FROM durable_jobs WHERE id = ?;')
    const row = stmt.get(jobId) as Record<string, unknown> | undefined
    if (!row) return undefined
    return this.mapJobRow(row)
  }

  public listJobsForSession(sessionId: string): readonly DurableJob[] {
    const stmt = this.db.prepare('SELECT * FROM durable_jobs WHERE work_session_id = ? ORDER BY created_at ASC;')
    const rows = stmt.all(sessionId) as Record<string, unknown>[]
    return rows.map((r) => this.mapJobRow(r))
  }

  public listActiveOrInterruptedJobs(): readonly DurableJob[] {
    const stmt = this.db.prepare("SELECT * FROM durable_jobs WHERE state IN ('PENDING', 'LEASED') ORDER BY created_at ASC;")
    const rows = stmt.all() as Record<string, unknown>[]
    return rows.map((r) => this.mapJobRow(r))
  }

  public listJobsByState(state: string): readonly DurableJob[] {
    const stmt = this.db.prepare('SELECT * FROM durable_jobs WHERE state = ? ORDER BY created_at ASC;')
    const rows = stmt.all(state) as Record<string, unknown>[]
    return rows.map((r) => this.mapJobRow(r))
  }

  private mapJobRow(row: Record<string, unknown>): DurableJob {
    return {
      id: String(row['id']),
      jobType: String(row['job_type']),
      workSessionId: String(row['work_session_id']),
      state: row['state'] as DurableJobState,
      payload: JSON.parse(String(row['payload_json'] || '{}')),
      leaseOwner: row['lease_owner'] ? String(row['lease_owner']) : undefined,
      leasedAt: row['leased_at'] ? String(row['leased_at']) : undefined,
      leaseExpiresAt: row['lease_expires_at'] ? String(row['lease_expires_at']) : undefined,
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    }
  }

  // --- K5 Verification Receipts ---

  public insertK5Receipt(receipt: K5ReceiptRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO k5_verification_receipts (
        receipt_id, plan_id, work_session_id, task_id, run_id, attempt_number,
        verdict, commands_count, passed_commands_count, failed_commands_count,
        completed_at, issued_at, superseded
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `)
    stmt.run(
      receipt.receiptId,
      receipt.planId,
      receipt.workSessionId,
      receipt.taskId,
      receipt.runId,
      receipt.attemptNumber,
      receipt.verdict,
      receipt.commandsCount,
      receipt.passedCommandsCount,
      receipt.failedCommandsCount,
      receipt.completedAt,
      receipt.issuedAt,
      receipt.superseded ? 1 : 0
    )
  }

  public getK5Receipt(receiptId: string): K5ReceiptRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM k5_verification_receipts WHERE receipt_id = ?;')
    const row = stmt.get(receiptId) as Record<string, unknown> | undefined
    if (!row) return undefined
    return this.mapK5ReceiptRow(row)
  }

  public listK5ReceiptsForTask(taskId: string): readonly K5ReceiptRecord[] {
    const stmt = this.db.prepare('SELECT * FROM k5_verification_receipts WHERE task_id = ? ORDER BY issued_at ASC;')
    const rows = stmt.all(taskId) as Record<string, unknown>[]
    return rows.map((r) => this.mapK5ReceiptRow(r))
  }

  public listAllK5Receipts(): readonly K5ReceiptRecord[] {
    const stmt = this.db.prepare('SELECT * FROM k5_verification_receipts ORDER BY issued_at ASC;')
    const rows = stmt.all() as Record<string, unknown>[]
    return rows.map((r) => this.mapK5ReceiptRow(r))
  }

  public markK5ReceiptSuperseded(receiptId: string): void {
    const stmt = this.db.prepare('UPDATE k5_verification_receipts SET superseded = 1 WHERE receipt_id = ?;')
    stmt.run(receiptId)
  }

  private mapK5ReceiptRow(row: Record<string, unknown>): K5ReceiptRecord {
    return {
      receiptId: String(row['receipt_id']),
      planId: String(row['plan_id']),
      workSessionId: String(row['work_session_id']),
      taskId: String(row['task_id']),
      runId: String(row['run_id']),
      attemptNumber: Number(row['attempt_number']),
      verdict: row['verdict'] as 'VERIFIED_PASS' | 'VERIFIED_FAIL',
      commandsCount: Number(row['commands_count']),
      passedCommandsCount: Number(row['passed_commands_count']),
      failedCommandsCount: Number(row['failed_commands_count']),
      completedAt: String(row['completed_at']),
      issuedAt: String(row['issued_at']),
      superseded: Number(row['superseded']) === 1,
    }
  }

  // --- Durable Model Observations ---

  public insertModelObservation(obs: DurableModelObservation): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO model_observations (
        observation_id, work_session_id, run_id, task_id, attempt_number,
        provider_id, model_id, task_domain, task_complexity, qualification_identity,
        k5_plan_id, k5_receipt_id, verified_outcome, latency_ms,
        prompt_tokens, completion_tokens, total_tokens, failure_class,
        schema_version, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `)
    stmt.run(
      obs.observationId,
      obs.workSessionId,
      obs.runId,
      obs.taskId,
      obs.attemptNumber,
      obs.providerId,
      obs.modelId,
      obs.taskDomain,
      obs.taskComplexity,
      obs.qualificationIdentity,
      obs.k5PlanId,
      obs.k5ReceiptId,
      obs.verifiedOutcome,
      obs.latencyMs,
      obs.promptTokens,
      obs.completionTokens,
      obs.totalTokens,
      obs.failureClass ?? null,
      obs.schemaVersion,
      obs.createdAt
    )
  }

  public getModelObservation(observationId: string): DurableModelObservation | undefined {
    const stmt = this.db.prepare('SELECT * FROM model_observations WHERE observation_id = ?;')
    const row = stmt.get(observationId) as Record<string, unknown> | undefined
    if (!row) return undefined
    return this.mapModelObservationRow(row)
  }

  public getModelObservationByReceiptId(receiptId: string): DurableModelObservation | undefined {
    const stmt = this.db.prepare('SELECT * FROM model_observations WHERE k5_receipt_id = ?;')
    const row = stmt.get(receiptId) as Record<string, unknown> | undefined
    if (!row) return undefined
    return this.mapModelObservationRow(row)
  }

  public listModelObservations(): readonly DurableModelObservation[] {
    const stmt = this.db.prepare('SELECT * FROM model_observations ORDER BY created_at ASC;')
    const rows = stmt.all() as Record<string, unknown>[]
    return rows.map((r) => this.mapModelObservationRow(r))
  }

  public listModelObservationsForModel(providerId: string, modelId: string): readonly DurableModelObservation[] {
    const stmt = this.db.prepare('SELECT * FROM model_observations WHERE provider_id = ? AND model_id = ? ORDER BY created_at ASC;')
    const rows = stmt.all(providerId, modelId) as Record<string, unknown>[]
    return rows.map((r) => this.mapModelObservationRow(r))
  }

  private mapModelObservationRow(row: Record<string, unknown>): DurableModelObservation {
    return {
      observationId: String(row['observation_id']),
      workSessionId: String(row['work_session_id']),
      runId: String(row['run_id']),
      taskId: String(row['task_id']),
      attemptNumber: Number(row['attempt_number']),
      providerId: String(row['provider_id']),
      modelId: String(row['model_id']),
      taskDomain: String(row['task_domain']),
      taskComplexity: String(row['task_complexity']),
      qualificationIdentity: String(row['qualification_identity']),
      k5PlanId: String(row['k5_plan_id']),
      k5ReceiptId: String(row['k5_receipt_id']),
      verifiedOutcome: row['verified_outcome'] as 'VERIFIED_PASS' | 'VERIFIED_FAIL',
      latencyMs: Number(row['latency_ms']),
      promptTokens: Number(row['prompt_tokens']),
      completionTokens: Number(row['completion_tokens']),
      totalTokens: Number(row['total_tokens']),
      failureClass: row['failure_class'] ? String(row['failure_class']) : undefined,
      schemaVersion: Number(row['schema_version'] ?? 1),
      createdAt: String(row['created_at']),
    }
  }

  public close(): void {
    try {
      this.db.close()
    } catch {
      // Ignore if already closed
    }
  }
}
