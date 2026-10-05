# GRAVITAS — WAVE K0 ADVERSARIAL REVIEW
## 20 Attack Vectors, Failure Modes & Empirical Mitigations (Cycle 2 Hardening)

**Status**: ADVERSARIALLY AUDITED & VERIFIED  
**Scope**: WorkSession Kernel (`packages/core/src/kernel/`)  
**Verdict**: 20/20 Attack Scenarios Mitigated and Tested (Plus 5 Subprocess Fault Injection Scenarios)

---

### Attack 01: Malicious Command Replay with Mutated Payload or Semantic Redirection
- **Vector**: An attacker or rogue process re-sends a known `commandId` but alters the payload, command type, target aggregate, or expected revision to execute unauthorized state changes under an existing authorization.
- **Defense**: SHA-256 semantic fingerprint hashing. The kernel canonicalizes the entire command envelope (deeply sorted JSON payload, `commandType`, `targetAggregateId`, `workSessionId`, `expectedRevision`). If any semantic attribute differs, `CommandConflictError` is thrown fail-closed.
- **Verification**: Verified in `TEST 09`, `ADV 01`, and `CRASH-B`.

### Attack 02: Phantom Updates via Stale Optimistic Concurrency
- **Vector**: Two concurrent workers issue updates to the same WorkSession aggregate based on stale state.
- **Defense**: Every mutation command accepts `expectedRevision`. If the aggregate revision in SQLite does not match, transaction aborts with `RevisionConflictError`.
- **Verification**: Verified in `TEST 10` and `ADV 02`.

### Attack 03: Process Crash During Transaction Writing (Partial Writes)
- **Vector**: Host process terminates abruptly mid-mutation, potentially leaving dangling rows in `work_sessions` without matching `runs` or `durable_events`.
- **Defense**: All state changes and audit events are wrapped inside `BEGIN IMMEDIATE TRANSACTION; ... COMMIT;`. SQLite WAL crash-recovery automatically discards uncommitted frames.
- **Verification**: Verified in `TEST 11`, `ADV 03`, and `CRASH-A`.

### Attack 04: Orphaned Task Left in RUNNING State Across Power Cut
- **Vector**: System loses power while tasks are executing; on restart tasks remain marked as `RUNNING` forever.
- **Defense**: `StartupReconciler` automatically scans `tasks` on kernel boot, detects interrupted tasks, transitions them to `INTERRUPTED`, and logs durable recovery events.
- **Verification**: Verified in `ADV 04` and `CRASH-E`.

### Attack 05: Auto-Advancing Past Human Approval on Reboot
- **Vector**: Rebooting the server causes pending human approvals to be bypassed or auto-approved.
- **Defense**: `StartupReconciler` explicitly identifies `WAITING_APPROVAL` sessions and leaves them strictly preserved in `WAITING_APPROVAL` without mutation.
- **Verification**: Verified in `ADV 05` and `CRASH-D`.

### Attack 06: Active WorkSession Without Supervisors on Startup
- **Vector**: Session marked `ACTIVE` restarts with zero running workers, masquerading as live.
- **Defense**: Reconciler flags orphaned active sessions as `RECOVERY_REQUIRED`, preventing invalid automated dispatch.
- **Verification**: Verified in `ADV 06` and `CRASH-E`.

### Attack 07: Stale Lock Hijack After Hard Kernel Crash & PID Reuse
- **Vector**: Hard power-off leaves a `kernel.lock` file on disk. A new process with the same PID might accidentally inherit it, or an orphaned lock might permanently brick restarts.
- **Defense**: `DataRootLock` binds `instanceId`, `pid`, `processStartTimeMs`, `processExecPath`, and `dataRoot`. PID verification checks `process.kill(lock.pid, 0)`. If the OS confirms the PID no longer exists (`ESRCH`), the stale lock is safely reclaimed via atomic recreation.
- **Verification**: Verified in `ADV 07`.

### Attack 08: Split-Brain Dual Writer Execution
- **Vector**: Two independent kernel instances target the same directory concurrently, causing database corruption.
- **Defense**: Atomic OS file creation with `O_CREAT | O_EXCL` (`wx` flag) guarantees mutual exclusion. Live process probing prevents a second instance from seizing an active lock held by a live PID, raising `DataRootLockedError` fail-closed.
- **Verification**: Verified in `TEST 25` and `ADV 08`.

### Attack 09: Silent Operation on Corrupted Database File
- **Vector**: Database file undergoes bit rot or partial truncation.
- **Defense**: On startup, `PRAGMA integrity_check;` is executed. Any corruption or malformed header throws `DatabaseCorruptionError` and aborts boot.
- **Verification**: Verified in `ADV 09`.

### Attack 10: Premature Execution on Future Database Version
- **Vector**: A downgrade to older kernel code runs on a database migrated by a future version.
- **Defense**: `inspectSchema` asserts database version $\le$ code version. If `currentVersion > 1`, throws `SchemaVersionUnsupportedError`.
- **Verification**: Verified in `TEST 14` and `ADV 10`.

### Attack 11: Out-of-Order Concurrent Event Writes
- **Vector**: Concurrent async commands emit events whose sequence numbers arrive out of order.
- **Defense**: Event sequencing is driven entirely by SQLite `INTEGER PRIMARY KEY AUTOINCREMENT` inside atomic write transactions.
- **Verification**: Verified in `TEST 07` and `ADV 11`.

### Attack 12–14: Escape from Terminal States
- **Vector**: Commands attempt to revive or mutate a session in `COMPLETED`, `CANCELLED`, or `FAILED` state.
- **Defense**: The FSM transition table marks terminal states as absorbing sinks with zero valid outbound transitions. Transitions throw `InvalidWorkSessionTransitionError`.
- **Verification**: Verified in `ADV 12`, `ADV 13`, and `ADV 14`.

### Attack 15: Executing Commands on Stopped Kernel
- **Vector**: Subsystems attempt to dispatch mutations during or after kernel shutdown.
- **Defense**: Lifecycle guard `assertReady()` throws `KernelNotReadyError` if lifecycle is not `READY`.
- **Verification**: Verified in `ADV 15`.

### Attack 16: Subscriber Starvation via Multiple Listeners
- **Vector**: Multiple event subscribers listen to the event bus; event delivery drops or skips handlers.
- **Defense**: Live event dispatcher iterates isolated callback set synchronously per emitted event.
- **Verification**: Verified in `ADV 16`.

### Attack 17: Rogue Subscriber Crashing Kernel Execution
- **Vector**: A buggy or hostile subscriber throws an unhandled exception inside its event listener.
- **Defense**: The kernel wraps subscriber callbacks in a `try...catch` block. Subscriber errors are safely caught and logged without aborting command execution.
- **Verification**: Verified in `ADV 17`.

### Attack 18: Uncontrolled Double-Start Race Condition
- **Vector**: Calling `kernel.start()` concurrently twice creates duplicate locks or double-initializes SQLite.
- **Defense**: `start()` lifecycle check short-circuits gracefully if already in `READY` state.
- **Verification**: Verified in `ADV 18`.

### Attack 19: Payload Injection via Extreme JSON & Unicode
- **Vector**: Massive payloads (50KB+) containing quotes, backslashes, escape sequences, and emojis corrupt JSON parsing or break column constraints.
- **Defense**: Strict JSON canonicalization and parameter-bound SQLite queries preserve all characters faithfully.
- **Verification**: Verified in `ADV 19`.

### Attack 20: Premature Lock Expiration During Long Transactions
- **Vector**: A lock timeout falsely assumes an instance died while performing heavy processing.
- **Defense**: `lock.touch()` updates `lastHeartbeatAt` timestamp, validating that the file's `instanceId` matches before touching.
- **Verification**: Verified in `ADV 20`.
