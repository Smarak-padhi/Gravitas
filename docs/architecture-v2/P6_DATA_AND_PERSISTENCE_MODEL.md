# GRAVITAS — TARGET DATA & PERSISTENCE MODEL
## Comprehensive SQLite Schema, Entity Relations, Durability Policies, and Cross-Resource Protocols (Hardened Edition)

**Document Status:** CANONICAL TARGET SPECIFICATION (Wave P6 — Hardened)  
**Date:** 2026-10-01  
**Target Engine:** Node.js v24.13.0 built-in `node:sqlite DatabaseSync`  
**Storage File:** `.gravitas/gravitas.db` (WAL Mode enabled)  
**Governing Invariants:**
- $\mathbf{ONE\ CANONICAL\ OWNER\ PER\ MUTABLE\ DOMAIN}$
- $\mathbf{WORKER\ PROCESS \neq CANONICAL\ DATABASE\ WRITER}$
- $\mathbf{DURABILITY \neq IN\text{-}MEMORY\ CACHE}$
- $\mathbf{TIMEOUT \neq FAILURE}$
- $\mathbf{PROCESS\ TERMINATED \neq EXTERNAL\ SIDE\ EFFECT\ REVERSED}$

---

## 1. Single Canonical Writer Model & Persistence Engine

### 1.1 Architectural Writer Rule
$$\mathbf{WORKER\ PROCESS \neq CANONICAL\ DATABASE\ WRITER}$$
The GRAVITAS Kernel process is the **sole writer** to `.gravitas/gravitas.db`. Worker subprocesses and desktop shells NEVER open direct write connections to the database file. All state updates flow through typed Kernel command envelopes, validated by the kernel state machine before executing synchronous SQLite write transactions.

### 1.2 Persistence Policies

```typescript
export interface SQLiteContentionPolicy {
  readonly busyTimeoutMs: number          // [NON-NORMATIVE EXAMPLE: 5000ms; REQUIRES_K_PHASE_CALIBRATION]
  readonly maxRetries: number             // [NON-NORMATIVE EXAMPLE: 3; REQUIRES_K_PHASE_CALIBRATION]
  readonly retryBackoffMs: number         // [NON-NORMATIVE EXAMPLE: 50ms; REQUIRES_K_PHASE_CALIBRATION]
  readonly onContentionTimeout: 'ABORT' | 'WAIT_WITH_ALERT'
}

export interface SQLiteDurabilityPolicy {
  readonly journalMode: 'WAL'             // WAL mode for concurrent readers and single writer
  readonly synchronous: 'NORMAL' | 'FULL' // NORMAL default (NVMe optimized); FULL configurable for strict power-loss safety
  readonly foreignKeys: boolean           // true (enforces schema referential integrity)
}
```

### 1.3 SQL Injection Defense Contract
- **Contract:**
  1. `UNTRUSTED VALUES MUST USE BOUND PARAMETERS`: All user input, task titles, tool arguments, branch names, and string variables MUST be passed using parameter binding (`?` positional or `@param` named). Dynamic string interpolation into SQL query bodies is strictly forbidden.
  2. `DYNAMIC SQL STRUCTURE MUST COME FROM TRUSTED ENUMERATED/VALIDATED SOURCES`: Dynamic identifiers (table names, column names for sorting, migration scripts) must be drawn exclusively from hardcoded TypeScript enum constants or compile-time whitelists.

---

## 2. Complete SQLite Schema DDL (Hardened)

```sql
-- ============================================================================
-- 0. SCHEMA METADATA & MIGRATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL
);

-- ============================================================================
-- 1. WORK SESSIONS & GOALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  repository_root TEXT NOT NULL,
  base_branch TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_status ON work_sessions(status);

-- ============================================================================
-- 2. RUNS (PLANS & DAGs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  work_session_id TEXT NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  plan_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'PAUSED', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
  auto_pause_on_approval INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  failure_reason TEXT,
  telemetry_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_runs_session ON runs(work_session_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);

-- ============================================================================
-- 3. TASKS (WITH EXTENDED RECOVERY STATES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_role_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN (
    'PENDING', 'READY', 'ASSIGNED', 'RUNNING', 'VERIFYING',
    'WAITING_APPROVAL', 'APPROVED', 'SUCCEEDED', 'FAILED',
    'DEPENDENCY_FAILED', 'CANCELLED', 'INTERRUPTED',
    'RECOVERY_REQUIRED', 'UNKNOWN_EXTERNAL_OUTCOME', 'BILLING_STATE_CHANGED'
  )),
  requires_human_approval INTEGER NOT NULL DEFAULT 0,
  worktree_path TEXT,
  worktree_state TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (worktree_state IN (
    'ACTIVE', 'COMPLETED_PENDING_EVIDENCE', 'FAILED_RETAINED',
    'APPROVED_FOR_CLEANUP', 'QUARANTINED', 'CLEANED'
  )),
  base_commit_sha TEXT,
  verified_commit_sha TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 2,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  error_code TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_run ON tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
CREATE INDEX IF NOT EXISTS idx_tasks_role ON tasks(assigned_role_id);

-- ============================================================================
-- 4. TASK DEPENDENCIES (DAG EDGES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  is_blocking INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (task_id, depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_deps_parent ON task_dependencies(depends_on_task_id);

-- ============================================================================
-- 5. TASK STATE TRANSITIONS (AUDIT HISTORY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_state_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_transitions_task ON task_state_transitions(task_id);

-- ============================================================================
-- 6. EXECUTOR LEASES
-- ============================================================================
CREATE TABLE IF NOT EXISTS executor_leases (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  executor_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  harness_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  process_pid INTEGER,
  leased_at TEXT NOT NULL,
  heartbeat_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'RELEASED', 'EXPIRED', 'REVOKED'))
);

CREATE INDEX IF NOT EXISTS idx_leases_status_expiry ON executor_leases(status, expires_at);

-- ============================================================================
-- 7. CAPABILITY GRANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS capability_grants (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  capability_id TEXT NOT NULL,
  authority_scope TEXT NOT NULL,
  authorized_by TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  revoked_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_capability_grants_task ON capability_grants(task_id);

-- ============================================================================
-- 8. TOOL INVOCATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tool_invocations (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  action TEXT NOT NULL,
  requested_arguments_json TEXT NOT NULL,
  sanitized_arguments_json TEXT NOT NULL,
  cost_category TEXT NOT NULL CHECK (cost_category IN ('FREE_LOCAL', 'INCLUDED_ACCOUNT', 'BILLABLE_METERED')),
  incremental_spend REAL NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL CHECK (status IN ('REQUESTED', 'AUTHORIZED', 'EXECUTING', 'COMPLETED', 'FAILED', 'BLOCKED')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  result_summary TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_tool_invocations_task ON tool_invocations(task_id);

-- ============================================================================
-- 9. HARNESS INVOCATIONS (PROCESS LIFECYCLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS harness_invocations (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  harness_type TEXT NOT NULL,
  command_line TEXT NOT NULL,
  process_pid INTEGER NOT NULL,
  windows_job_object_id TEXT,
  started_at TEXT NOT NULL,
  exited_at TEXT,
  exit_code INTEGER,
  token_usage_json TEXT NOT NULL DEFAULT '{}'
);

-- ============================================================================
-- 10. EVIDENCE BUNDLES & ARTIFACTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS evidence_bundles (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  commit_sha TEXT NOT NULL,
  evidence_digest_sha256 TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('PASSED', 'FAILED', 'INCONCLUSIVE')),
  test_count INTEGER NOT NULL DEFAULT 0,
  passed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_artifacts (
  id TEXT PRIMARY KEY,
  bundle_id TEXT NOT NULL REFERENCES evidence_bundles(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('TEST_LOG', 'DIFF', 'SCREENSHOT', 'DOM_SNAPSHOT', 'AST_REPORT', 'BROWSER_QA')),
  file_path TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  is_staged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artifacts_bundle ON evidence_artifacts(bundle_id);

-- ============================================================================
-- 11. APPROVALS (CONTEXTUALLY BOUND)
-- ============================================================================
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  work_session_id TEXT NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  base_commit_sha TEXT NOT NULL,
  candidate_commit_sha TEXT NOT NULL,
  evidence_digest_sha256 TEXT NOT NULL,
  policy_version INTEGER NOT NULL,
  capability_grant_snapshot_digest TEXT NOT NULL,
  authorized_scope TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('PENDING', 'APPROVED', 'REJECTED')),
  decision_by TEXT,
  decision_at TEXT,
  rejection_reason TEXT,
  is_stale INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_approvals_decision ON approvals(decision);

-- ============================================================================
-- 12. RUN-LEVEL INTEGRATION CANDIDATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_candidates (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE REFERENCES runs(id) ON DELETE CASCADE,
  candidate_branch TEXT NOT NULL,
  head_commit_sha TEXT NOT NULL,
  strategy TEXT NOT NULL CHECK (strategy IN ('FAST_FORWARD', 'CHERRY_PICK', 'THREE_WAY_MERGE', 'PATCH_EXPORT')),
  verification_status TEXT NOT NULL,
  materialized_at TEXT,
  human_signoff_by TEXT,
  human_signoff_at TEXT
);

-- ============================================================================
-- 13. DURABLE BACKGROUND JOBS
-- ============================================================================
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('INTERVAL', 'CRON', 'EVENT_TRIGGERED', 'MANUAL')),
  schedule_expression TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_params_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('ENABLED', 'PAUSED', 'DISABLED')),
  next_run_at TEXT,
  last_run_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_next_run ON jobs(status, next_run_at);

CREATE TABLE IF NOT EXISTS occurrence_claims (
  occurrence_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  claimed_at TEXT NOT NULL,
  claimed_by_process INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT')),
  completed_at TEXT,
  error_message TEXT
);

-- ============================================================================
-- 14. CANONICAL AUDIT EVENTS (14-POINT PROVENANCE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  sequence_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  work_session_id TEXT REFERENCES work_sessions(id) ON DELETE SET NULL,
  run_id TEXT REFERENCES runs(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  actor_executor_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  causation_id TEXT,
  correlation_id TEXT,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_task ON events(task_id);
CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

-- ============================================================================
-- 15. OPERATION-AWARE IDEMPOTENCY RECORDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS idempotency_records (
  key TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL,
  target_resource TEXT NOT NULL,
  work_session_id TEXT,
  run_id TEXT,
  task_id TEXT,
  authorized_scope TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMMITTED', 'FAILED', 'UNKNOWN_EXTERNAL_OUTCOME')),
  result_json TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON idempotency_records(expires_at);

-- ============================================================================
-- 16. QUALIFICATION SNAPSHOTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS qualification_snapshots (
  id TEXT PRIMARY KEY,
  surface_id TEXT NOT NULL,
  qualification_state TEXT NOT NULL,
  evidence_summary TEXT NOT NULL,
  probed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
```

---

## 3. Cross-Resource Consistency Protocols

### 3.1 Git $\leftrightarrow$ SQLite Two-Phase Reconciliation Protocol
Git commits and SQLite transactions cannot participate in a single shared ACID transaction. Rather than claiming two-phase protocols "prevent" desynchronization, the architecture ensures that **partial states are detectable and reconcilable**:
1. **Phase 1 (Git Prepare):** Task commit is created on `task/<taskId>` branch in the isolated worktree. Commit SHA is captured in memory.
2. **Phase 2 (SQLite Commit):**
   ```sql
   BEGIN IMMEDIATE;
   UPDATE tasks SET verified_commit_sha = @sha, state = 'SUCCEEDED' WHERE id = @taskId;
   INSERT INTO events (id, event_type, task_id, payload_json, timestamp) VALUES (@evId, 'TaskSucceeded', @taskId, @payload, @now);
   COMMIT;
   ```
3. **Reconciliation of Partial States:**
   - **`GIT_COMMIT_SUCCEEDED_DB_RECORD_FAILED`:** Git commit exists on `task/<taskId>` branch, but SQLite has no record or records task as `RUNNING`/`INTERRUPTED`. Startup Reconciler audits Git branch, detects unrecorded commit SHA, and completes DB record or transitions to `RECOVERY_REQUIRED` for operator review.
   - **`DB_EXPECTATION_EXISTS_GIT_OBJECT_MISSING`:** SQLite records `verified_commit_sha = <sha>`, but `git cat-file -e <sha>` fails in the repository object database. Startup Reconciler flags this as a critical missing-object anomaly, transitions task to `RECOVERY_REQUIRED`, blocks dependent merges, and alerts operator. No evidence is automatically destroyed.

### 3.2 Filesystem $\leftrightarrow$ SQLite Staged Artifact Protocol
SQLite and NTFS do NOT share a single atomic transaction. Cross-resource atomicity across filesystem files and SQLite records is physically unavailable on host OSs.
$$\mathbf{CROSS\text{-}RESOURCE\ ATOMICITY\ IS\ UNAVAILABLE}$$
$$\mathbf{PARTIAL\ STATES\ MUST\ BE\ DETECTABLE + RECONCILABLE}$$

The staged protocol sequences writes:
$$\text{TEMP WRITE} \rightarrow \text{FSYNC / FINALIZE} \rightarrow \text{COMPUTE HASH} \rightarrow \text{SQLITE COMMIT} \rightarrow \text{RENAME TO VISIBLE}$$

There is an unavoidable crash window between the SQLite commit and the filesystem rename. The Startup Reconciler handles all 5 partial states:
- **Case A (Temp artifact exists; DB metadata does NOT exist):** Detects unreferenced temporary artifact in `.gravitas/evidence/tmp/`; quarantines or safely cleans according to `WorktreeRetentionPolicy`.
- **Case B (DB metadata exists; Temp artifact exists; Final artifact does NOT exist):** Occurs if process crashed immediately post-commit before rename. Reconciler verifies temp file digest against committed `content_sha256`. If valid, it completes the rename to final path; if corrupt, marks evidence `RECOVERY_REQUIRED`.
- **Case C (Final artifact exists; DB metadata does NOT exist):** Unreferenced artifact found on disk. Quarantined; never silently promoted to canonical status.
- **Case D (DB metadata exists; Final artifact exists; Digest matches):** Normal consistent state.
- **Case E (DB metadata exists; Final artifact exists; Digest does NOT match):** Critical integrity violation. Marks task `INTEGRITY_CHECK_FAILED`, quarantines file, and halts dependent approval and integration.
