/**
 * Gravitas WorkSession Kernel — SQLite Schema DDL & Version Manager
 *
 * Enforces explicit schema migrations, PRAGMA checks, and schema version detection.
 * Distinguishes:
 * - NEW_DATABASE
 * - SUPPORTED_SCHEMA
 * - MIGRATION_REQUIRED
 * - UNSUPPORTED_NEWER_SCHEMA
 * - CORRUPT_OR_INVALID_STATE
 */

import type { DatabaseSync } from 'node:sqlite'
import * as crypto from 'node:crypto'
import {
  DatabaseCorruptionError,
  SchemaVersionUnsupportedError,
} from '../domain/errors.js'

export const CURRENT_KERNEL_SCHEMA_VERSION = 1

export type SchemaStatus =
  | 'NEW_DATABASE'
  | 'SUPPORTED_SCHEMA'
  | 'MIGRATION_REQUIRED'
  | 'UNSUPPORTED_NEWER_SCHEMA'
  | 'CORRUPT_OR_INVALID_STATE'

export interface SchemaInspectionResult {
  readonly status: SchemaStatus
  readonly currentVersion: number
  readonly targetVersion: number
}

export const SCHEMA_V1_DDL = `
-- 0. Schema metadata
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL
);

-- 1. WorkSessions
CREATE TABLE IF NOT EXISTS work_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  repository_root TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'main',
  state TEXT NOT NULL CHECK (state IN ('CREATED', 'READY', 'ACTIVE', 'WAITING_APPROVAL', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'RECOVERY_REQUIRED')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  terminal_reason TEXT,
  recovery_metadata_json TEXT NOT NULL DEFAULT '{}',
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_state ON work_sessions(state);

-- 2. Runs (bounded for WorkSession durability)
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  work_session_id TEXT NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'PAUSED', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_session ON runs(work_session_id);

-- 3. Tasks (bounded for WorkSession durability)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  work_session_id TEXT NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN (
    'PENDING', 'READY', 'ASSIGNED', 'RUNNING', 'VERIFYING',
    'WAITING_APPROVAL', 'APPROVED', 'SUCCEEDED', 'FAILED',
    'CANCELLED', 'INTERRUPTED', 'RECOVERY_REQUIRED'
  )),
  assigned_role_id TEXT NOT NULL,
  requires_approval INTEGER NOT NULL DEFAULT 0 CHECK (requires_approval IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(work_session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_run ON tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);

-- 4. Durable Events (ordered domain truth with monotonic sequence_id)
CREATE TABLE IF NOT EXISTS durable_events (
  sequence_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  aggregate_type TEXT NOT NULL CHECK (aggregate_type IN ('WORKSESSION', 'RUN', 'TASK', 'JOB', 'KERNEL')),
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_revision INTEGER NOT NULL CHECK (aggregate_revision >= 1),
  occurred_at TEXT NOT NULL,
  command_id TEXT,
  correlation_id TEXT,
  causation_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_events_aggregate ON durable_events(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_events_sequence ON durable_events(sequence_id);

-- 5. Command Receipts (operation-aware idempotency)
CREATE TABLE IF NOT EXISTS command_receipts (
  command_id TEXT PRIMARY KEY,
  command_type TEXT NOT NULL,
  target_aggregate_id TEXT NOT NULL,
  expected_revision INTEGER CHECK (expected_revision IS NULL OR expected_revision >= 0),
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('COMMITTED', 'FAILED')),
  result_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

-- 6. Durable Jobs (survives process crash/restart)
CREATE TABLE IF NOT EXISTS durable_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  work_session_id TEXT REFERENCES work_sessions(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('PENDING', 'LEASED', 'COMPLETED', 'FAILED', 'EXPIRED')),
  payload_json TEXT NOT NULL DEFAULT '{}',
  lease_owner TEXT,
  leased_at TEXT,
  lease_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_state ON durable_jobs(state);
CREATE INDEX IF NOT EXISTS idx_jobs_session ON durable_jobs(work_session_id);

-- 7. K5 Verification Receipts (independent deterministic verification authority)
CREATE TABLE IF NOT EXISTS k5_verification_receipts (
  receipt_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  work_session_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  verdict TEXT NOT NULL CHECK (verdict IN ('VERIFIED_PASS', 'VERIFIED_FAIL')),
  commands_count INTEGER NOT NULL DEFAULT 0,
  passed_commands_count INTEGER NOT NULL DEFAULT 0,
  failed_commands_count INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  superseded INTEGER NOT NULL DEFAULT 0 CHECK (superseded IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_k5_receipts_session ON k5_verification_receipts(work_session_id);
CREATE INDEX IF NOT EXISTS idx_k5_receipts_task ON k5_verification_receipts(task_id);
CREATE INDEX IF NOT EXISTS idx_k5_receipts_plan ON k5_verification_receipts(plan_id);

-- 8. Model Execution Observations (durable empirical evidence bound to K5 receipts)
CREATE TABLE IF NOT EXISTS model_observations (
  observation_id TEXT PRIMARY KEY,
  work_session_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  task_domain TEXT NOT NULL,
  task_complexity TEXT NOT NULL,
  qualification_identity TEXT NOT NULL,
  k5_plan_id TEXT NOT NULL,
  k5_receipt_id TEXT NOT NULL REFERENCES k5_verification_receipts(receipt_id) ON DELETE CASCADE,
  verified_outcome TEXT NOT NULL CHECK (verified_outcome IN ('VERIFIED_PASS', 'VERIFIED_FAIL')),
  latency_ms INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  failure_class TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_model_obs_session ON model_observations(work_session_id);
CREATE INDEX IF NOT EXISTS idx_model_obs_task ON model_observations(task_id);
CREATE INDEX IF NOT EXISTS idx_model_obs_model ON model_observations(provider_id, model_id);
CREATE INDEX IF NOT EXISTS idx_model_obs_receipt ON model_observations(k5_receipt_id);
`

export function inspectSchema(db: DatabaseSync, databasePath: string): SchemaInspectionResult {
  // Check SQLite integrity
  try {
    const integrityQuery = db.prepare('PRAGMA integrity_check;')
    const rows = integrityQuery.all() as { integrity_check?: string }[]
    if (rows.length === 0 || rows[0]?.integrity_check !== 'ok') {
      const errMessage = rows.map((r) => r.integrity_check).join(', ')
      throw new DatabaseCorruptionError(databasePath, errMessage || 'integrity_check failed')
    }
  } catch (err) {
    if (err instanceof DatabaseCorruptionError) {
      throw err
    }
    throw new DatabaseCorruptionError(databasePath, (err as Error).message)
  }

  // Check if schema_migrations exists
  const tableCheck = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations';"
  ).all()

  if (tableCheck.length === 0) {
    // Check if there are any other tables
    const userTables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
    ).all()

    if (userTables.length === 0) {
      return {
        status: 'NEW_DATABASE',
        currentVersion: 0,
        targetVersion: CURRENT_KERNEL_SCHEMA_VERSION,
      }
    }

    return {
      status: 'CORRUPT_OR_INVALID_STATE',
      currentVersion: 0,
      targetVersion: CURRENT_KERNEL_SCHEMA_VERSION,
    }
  }

  const latestRow = db.prepare(
    'SELECT MAX(version) AS max_version FROM schema_migrations;'
  ).get() as { max_version: number | null } | undefined

  const maxVersion = latestRow?.max_version ?? 0

  if (maxVersion === CURRENT_KERNEL_SCHEMA_VERSION) {
    return {
      status: 'SUPPORTED_SCHEMA',
      currentVersion: maxVersion,
      targetVersion: CURRENT_KERNEL_SCHEMA_VERSION,
    }
  }

  if (maxVersion < CURRENT_KERNEL_SCHEMA_VERSION) {
    return {
      status: 'MIGRATION_REQUIRED',
      currentVersion: maxVersion,
      targetVersion: CURRENT_KERNEL_SCHEMA_VERSION,
    }
  }

  // maxVersion > CURRENT_KERNEL_SCHEMA_VERSION
  throw new SchemaVersionUnsupportedError(databasePath, maxVersion, CURRENT_KERNEL_SCHEMA_VERSION)
}

export function initializeOrMigrateSchema(db: DatabaseSync, databasePath: string): void {
  const inspection = inspectSchema(db, databasePath)

  if (inspection.status === 'SUPPORTED_SCHEMA') {
    // Ensure newly introduced tables in schema v1 exist (idempotent addition)
    db.exec(`
      CREATE TABLE IF NOT EXISTS k5_verification_receipts (
        receipt_id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        work_session_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        verdict TEXT NOT NULL CHECK (verdict IN ('VERIFIED_PASS', 'VERIFIED_FAIL')),
        commands_count INTEGER NOT NULL DEFAULT 0,
        passed_commands_count INTEGER NOT NULL DEFAULT 0,
        failed_commands_count INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT NOT NULL,
        issued_at TEXT NOT NULL,
        superseded INTEGER NOT NULL DEFAULT 0 CHECK (superseded IN (0, 1))
      );
      CREATE INDEX IF NOT EXISTS idx_k5_receipts_session ON k5_verification_receipts(work_session_id);
      CREATE INDEX IF NOT EXISTS idx_k5_receipts_task ON k5_verification_receipts(task_id);
      CREATE INDEX IF NOT EXISTS idx_k5_receipts_plan ON k5_verification_receipts(plan_id);

      CREATE TABLE IF NOT EXISTS model_observations (
        observation_id TEXT PRIMARY KEY,
        work_session_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        provider_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        task_domain TEXT NOT NULL,
        task_complexity TEXT NOT NULL,
        qualification_identity TEXT NOT NULL,
        k5_plan_id TEXT NOT NULL,
        k5_receipt_id TEXT NOT NULL REFERENCES k5_verification_receipts(receipt_id) ON DELETE CASCADE,
        verified_outcome TEXT NOT NULL CHECK (verified_outcome IN ('VERIFIED_PASS', 'VERIFIED_FAIL')),
        latency_ms INTEGER NOT NULL DEFAULT 0,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        failure_class TEXT,
        schema_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_model_obs_session ON model_observations(work_session_id);
      CREATE INDEX IF NOT EXISTS idx_model_obs_task ON model_observations(task_id);
      CREATE INDEX IF NOT EXISTS idx_model_obs_model ON model_observations(provider_id, model_id);
      CREATE INDEX IF NOT EXISTS idx_model_obs_receipt ON model_observations(k5_receipt_id);
    `)
    return
  }

  if (inspection.status === 'NEW_DATABASE' || inspection.status === 'MIGRATION_REQUIRED') {
    db.exec('BEGIN IMMEDIATE TRANSACTION;')
    try {
      db.exec(SCHEMA_V1_DDL)

      const checksum = crypto.createHash('sha256').update(SCHEMA_V1_DDL).digest('hex')
      const insertMigration = db.prepare(
        'INSERT OR REPLACE INTO schema_migrations (version, name, applied_at, checksum_sha256) VALUES (?, ?, ?, ?);'
      )
      insertMigration.run(1, 'v1_initial_worksession_kernel', new Date().toISOString(), checksum)

      db.exec('COMMIT;')
    } catch (err) {
      db.exec('ROLLBACK;')
      throw err
    }
  }
}
