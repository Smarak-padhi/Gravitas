# GRAVITAS — WAVE K0 PERSISTENCE & RECOVERY CONTRACT
## SQLite Engine, Pragmas, Single-Writer Lock, Schema Versioning & Startup Reconciliation

**Status**: FROZEN SPECIFICATION & VERIFIED IMPLEMENTATION  
**Module**: `packages/core/src/kernel/persistence/` & `packages/core/src/kernel/reconciliation/`

---

## 1. SQLite Engine, Concurrency Configuration & Durability Boundaries

Implemented in [`packages/core/src/kernel/persistence/sqliteWriter.ts`](file:///c:/Users/smara/Desktop/Multi-agent/packages/core/src/kernel/persistence/sqliteWriter.ts) using native Node 24 `node:sqlite.DatabaseSync`.

### Explicit SQLite Policy Contracts
The kernel does not treat numeric tuning values as immutable architectural laws. Instead, it exposes formal policy contracts:

- **`SQLiteContentionPolicy`**:
  Configures busy timeout wait durations:
  - `busyTimeoutMs`: Default initialized to `5000` ms (`[NON_NORMATIVE_INITIAL_DEFAULT]`, `REQUIRES_OPERATIONAL_CALIBRATION`).
- **`SQLiteDurabilityPolicy`**:
  Configures disk synchronization behavior:
  - `synchronous`: Default initialized to `'NORMAL'` (`[NON_NORMATIVE_INITIAL_DEFAULT]`, `REQUIRES_OPERATIONAL_CALIBRATION`).

Every SQLite connection initialized by `SqliteWriter` executes:
```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = <policy.busyTimeoutMs>;
PRAGMA synchronous = <policy.synchronous>;
```

### Durability Boundaries & Precise Failure Classification
GRAVITAS rigorously enforces the core durability taxonomy:
```
TRANSACTION_ATOMICITY ≠ DATABASE_CONSISTENCY ≠ APPLICATION_CRASH_DURABILITY ≠ OS_CRASH_DURABILITY ≠ POWER_LOSS_DURABILITY
```

Under this taxonomy, SQLite's documented failure and durability model is defined as:

1. **TRANSACTION ATOMICITY**:
   All state modifications (WorkSession mutation, Run/Task updates, durable audit event appends, and idempotency command receipts) are bound within a single immediate SQLite transaction:
   ```sql
   BEGIN IMMEDIATE TRANSACTION;
   -- WorkSession update + DurableEvent append + CommandReceipt insert
   COMMIT;
   ```
   If any invariant fails or an unhandled exception occurs, `ROLLBACK;` is executed cleanly, leaving zero partial state.

2. **DATABASE CONSISTENCY**:
   Guaranteed by SQLite WAL mode and foreign key enforcement (`PRAGMA foreign_keys = ON;`). Under SQLite's documented model, database consistency is preserved across crashes and power loss (uncommitted or incomplete transactions cannot corrupt the valid page structure). Startup verification runs `PRAGMA integrity_check;` to fail closed if the physical database file is corrupted or truncated.

3. **APPLICATION PROCESS CRASH**:
   Committed SQLite transactions remain durable across application-process crashes. In WAL mode, committed frames have been written into the OS page cache or disk, so sudden termination of the Node.js/GRAVITAS process does not lose committed transactions.

4. **OS CRASH / POWER LOSS WITH WAL + `synchronous = NORMAL`**:
   Database consistency is preserved under SQLite's documented model, but recent committed transactions MAY be rolled back because the WAL file is not synchronized (fsync/FlushFileBuffers) after every transaction commit. In WAL mode with `synchronous = NORMAL`, SQLite syncs the WAL file only during checkpoints and certain log rollovers. Therefore, an unclean OS crash or power cut before synchronization can cause transactions committed since the last sync to be lost upon subsequent recovery/wal-index replay, while leaving the database itself fully consistent and uncorrupted.

5. **CHECKPOINTING BEHAVIOR**:
   Checkpointing transfers WAL content toward the main database and performs synchronization according to SQLite's WAL and checkpoint behavior. It does not mean all transactions committed prior to the most recent checkpoint were magically power-loss durable before synchronization occurred; rather, checkpointing is the structured mechanism by which WAL pages are consolidated into the main database and synced.

6. **WAL + `synchronous = FULL`**:
   Adds a WAL sync after each transaction commit and provides stronger recent-commit durability across power loss. Operating environments requiring absolute single-transaction fsync guarantees across power failure may configure `synchronous = 'FULL'`.

7. **HARDWARE & FILESYSTEM FAILURES**:
   SQLite cannot defend against broken drive controller firmware that lies about write completion, hardware storage degradation, or concurrent uncoordinated external out-of-process file deletion. GRAVITAS assumes standard POSIX/Win32 filesystem flush semantics.

---

## 2. Hardened Single-Writer Data Root Lock (`kernel.lock`)

Implemented in [`packages/core/src/kernel/persistence/dataRootLock.ts`](file:///c:/Users/smara/Desktop/Multi-agent/packages/core/src/kernel/persistence/dataRootLock.ts).

### Purpose & Scope
Enforces **ONE CANONICAL OWNER PER DATA ROOT** (Local Single-Host Ownership).
*Notice*: This mechanism provides local host-level mutual exclusion; it does not claim to be a distributed lock across remote networks.

```json
{
  "instanceId": "inst_1790870123456_a1b2c3d4e5f6",
  "kernelId": "kernel_1790870123456_a1b2c3d4e5f6",
  "pid": 4624,
  "processStartTimeMs": 1790869058085,
  "processExecPath": "C:\\Program Files\\nodejs\\node.exe",
  "dataRoot": "C:\\Users\\smara\\AppData\\Local\\Gravitas\\data",
  "acquiredAt": "2026-10-01T15:46:45.000Z",
  "lastHeartbeatAt": "2026-10-01T15:46:45.000Z",
  "hostname": "DESKTOP-GRAVITAS"
}
```

### Hardening & Mitigations:
1. **Atomic Simultaneous Acquisition**:
   Uses atomic OS file creation (`fs.openSync` with `O_CREAT | O_EXCL`, flag `'wx'`). If two kernel instances launch simultaneously, exactly one acquires the file handle; the other encounters `EEXIST` and inspects ownership.
2. **PID Reuse & Process Identity Binding**:
   Binds `instanceId`, `pid`, `processStartTimeMs`, `processExecPath`, and `dataRoot`. PID verification checks `process.kill(lock.pid, 0)`:
   - If the OS reports `ESRCH`, the process is dead.
   - If the process is alive on the OS, the lock fails closed.
3. **Malformed / Truncated Lock File Handling**:
   If `kernel.lock` contains empty or corrupted JSON, the kernel checks file modification time (`mtimeMs`). If recently modified ($< 5\text{s}$), it fails closed with `DataRootLockedError` (mid-write race protection). If older than 5 seconds, it reclaims the orphaned file.
4. **Heartbeat Maintenance**:
   Active instances refresh `lastHeartbeatAt` via `lock.touch()`, but heartbeat updates verify that the file's `instanceId` still matches the current instance, preventing accidental resurrection of overwritten locks.

---

## 3. Schema DDL & Versioning

Implemented in [`packages/core/src/kernel/persistence/schema.ts`](file:///c:/Users/smara/Desktop/Multi-agent/packages/core/src/kernel/persistence/schema.ts).

### Current Schema Version: `1`

### Tables:
1. **`schema_migrations`**:
   - `version INTEGER PRIMARY KEY`, `applied_at TEXT NOT NULL`, `description TEXT NOT NULL`.
2. **`work_sessions`**:
   - `id TEXT PRIMARY KEY`, `title TEXT NOT NULL`, `objective TEXT NOT NULL`, `repository_root TEXT NOT NULL`, `base_branch TEXT NOT NULL`, `state TEXT NOT NULL`, `revision INTEGER NOT NULL DEFAULT 1`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`, `terminal_reason TEXT`, `recovery_metadata_json TEXT`, `metadata_json TEXT`.
3. **`runs`**:
   - `id TEXT PRIMARY KEY`, `work_session_id TEXT NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE`, `goal TEXT NOT NULL`, `status TEXT NOT NULL`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`.
4. **`tasks`**:
   - `id TEXT PRIMARY KEY`, `run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE`, `work_session_id TEXT NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE`, `title TEXT NOT NULL`, `state TEXT NOT NULL`, `assigned_role_id TEXT`, `requires_approval INTEGER NOT NULL DEFAULT 0`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`.
5. **`durable_events`**:
   - `sequence_id INTEGER PRIMARY KEY AUTOINCREMENT`, `event_id TEXT NOT NULL UNIQUE`, `aggregate_type TEXT NOT NULL`, `aggregate_id TEXT NOT NULL`, `event_type TEXT NOT NULL`, `aggregate_revision INTEGER NOT NULL`, `occurred_at TEXT NOT NULL`, `command_id TEXT`, `correlation_id TEXT`, `causation_id TEXT`, `payload_json TEXT NOT NULL`.
6. **`command_receipts`**:
   - `command_id TEXT PRIMARY KEY`, `command_type TEXT NOT NULL`, `target_aggregate_id TEXT NOT NULL`, `expected_revision INTEGER`, `request_hash TEXT NOT NULL`, `status TEXT NOT NULL`, `result_json TEXT NOT NULL`, `created_at TEXT NOT NULL`.
7. **`durable_jobs`**:
   - `id TEXT PRIMARY KEY`, `job_type TEXT NOT NULL`, `work_session_id TEXT REFERENCES work_sessions(id) ON DELETE CASCADE`, `state TEXT NOT NULL`, `payload_json TEXT NOT NULL`, `lease_owner TEXT`, `leased_at TEXT`, `lease_expires_at TEXT`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`.

### Integrity Check & Future Version Policy
- On opening an existing database, executes `PRAGMA integrity_check;`. If output is not `'ok'`, throws `DatabaseCorruptionError`.
- If database schema version is greater than code version (`currentVersion > CODE_VERSION`), throws `SchemaVersionUnsupportedError` without attempting destructive downgrade.

---

## 4. Startup Reconciliation Engine

Implemented in [`packages/core/src/kernel/reconciliation/startupReconciler.ts`](file:///c:/Users/smara/Desktop/Multi-agent/packages/core/src/kernel/reconciliation/startupReconciler.ts).

Executed automatically inside `kernel.start()` immediately after schema verification and lock acquisition:

1. **Interrupted Tasks**: Scans `tasks` where `state = 'RUNNING'`. Transitions them to `INTERRUPTED` and appends `TASK_INTERRUPTED` event with crash reason.
2. **Interrupted WorkSessions**: Scans `work_sessions` where `state = 'ACTIVE'`. Transitions them to `RECOVERY_REQUIRED` and appends `WORKSESSION_RECOVERY_REQUIRED` event.
3. **Preservation of Approval Gates**: Scans `work_sessions` where `state = 'WAITING_APPROVAL'`. Preserves them strictly intact; does **not** auto-advance or fail them.
4. **Expired Job Leases**: Scans `durable_jobs` where `state = 'LEASED'`. Transitions them to `EXPIRED`, resets lease ownership, and appends `JOB_EXPIRED` event.
5. **Idempotence**: If no uncommitted, running, or leased records exist, reconciler performs zero mutations and appends zero events.
