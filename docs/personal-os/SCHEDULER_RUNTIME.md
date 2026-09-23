# Personal OS Scheduler Runtime Specification (Wave 12I)

## 1. Zero-Inference Architecture

The Gravitas Personal OS Scheduler executes background operations with zero token consumption and zero persistent LLM loop.
The scheduler operates as a deterministic temporal process:
- Tick interval: 1,000ms.
- Pure time arithmetic (`Date.now()`, cron parsing, interval step).
- Atomic persistence with native SQLite WAL (`DatabaseSync`).

## 2. Occurrence Claiming Semantics

To guarantee exactly-once execution across multi-threaded or clustered environments without race conditions, the scheduler uses atomic SQLite uniqueness constraints:

```sql
CREATE TABLE IF NOT EXISTS occurrence_claims (
  job_id TEXT NOT NULL,
  occurrence_key TEXT NOT NULL,
  run_id TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  PRIMARY KEY (job_id, occurrence_key)
);
```

### Claim Protocol:
1. `claimOccurrence({ jobId, occurrenceKey, scheduledFor })`:
   - Enters `BEGIN IMMEDIATE;` transaction.
   - Attempts insertion into `occurrence_claims`.
   - If a duplicate `(job_id, occurrence_key)` exists, the insert throws a PRIMARY KEY constraint violation.
   - Transaction rolls back; `{ claimed: false }` is returned.
   - If successful, inserts a `JobRun` in `READY` status, commits transaction, and returns `{ claimed: true, run }`.
2. This guarantees that duplicate cron triggers, clock skews, or simultaneous ticks can never cause double execution.

## 3. Non-Blocking Execution Model

The scheduler tick loop does not block on long-running actions:
- When a job run is acquired, it is handed off to `JobRunner.executeRun(run, job)`.
- The runner executes asynchronously in the background.
- Active promises are tracked in an internal `Set<Promise<void>>`.
- Next scheduler ticks proceed immediately without delay.

## 4. Graceful Shutdown & Interrupted Run Recovery

### Graceful Teardown:
```typescript
await scheduler.stop();
await scheduler.waitForActiveRuns();
store.close();
```
- Stops the tick timer.
- Waits for currently running actions to cleanly finish or timeout.
- Flushes SQLite WAL and closes database connection idempotently.

### Restart Recovery (Crash Survival):
If the server crashes or the process is killed abruptly while a job is running:
1. On startup, `RunService` calls `reconcileInterruptedRuns()`.
2. The store queries for runs where `status IN ('RUNNING', 'READY')`.
3. Interrupted runs are transitioned to `status: 'RESTART_ABORTED'` with an explanatory error summary:
   `"Run interrupted by server restart/crash."`
4. The job definition remains `ENABLED` and computes its next future occurrence, resuming normal scheduling without human intervention.
