# Personal OS Job Runtime Specification (Wave 12I)

## 1. Overview & Architectural Boundaries

The Personal OS Job Runtime provides durable, deterministic execution for recurring and automated tasks within the Gravitas kernel. Unlike traditional autonomous agent architectures that keep a high-cost language model continuously in an event loop, the Gravitas Personal OS runtime uses a zero-inference deterministic kernel built on SQLite WAL and temporal math.

## 2. Dual Finite State Machines (FSM)

Wave 12I strictly separates **Durable Job Definition Lifecycle** from **Individual Job Run Execution Lifecycle**.

### 2.1 JobDefinitionStatus
The durable lifecycle of a background job definition:
```
       ┌───────────┐
       │   DRAFT   │
       └─────┬─────┘
             │ activate
             ▼
       ┌───────────┐  pause   ┌───────────┐
       │  ENABLED  │ ◄──────► │  PAUSED   │
       └─────┬─────┘  resume  └───────────┘
             │
             │ cancel
             ▼
       ┌───────────┐
       │ CANCELLED │
       └───────────┘
```
- **DRAFT**: Created but not yet scheduled.
- **ENABLED**: Active in the scheduler; future occurrences are computed and scheduled.
- **PAUSED**: Temporarily suspended; next scheduled occurrence is cleared or frozen.
- **CANCELLED**: Permanently halted; no further occurrences are evaluated.

### 2.2 JobRunStatus
The ephemeral lifecycle of a single execution attempt:
```
       ┌───────────┐
       │   READY   │
       └─────┬─────┘
             │ trigger / acquire
             ▼
       ┌───────────┐  escalation  ┌──────────────────┐
       │  RUNNING  │ ───────────► │ WAITING_APPROVAL │
       └─────┬─────┘              └────────┬─────────┘
             │                             │ approve / reject
             ├──────────────┬──────────────┤
             ▼              ▼              ▼
       ┌───────────┐  ┌───────────┐  ┌───────────┐
       │ COMPLETED │  │  FAILED   │  │ CANCELLED │
       └───────────┘  └───────────┘  └───────────┘
```
- **READY**: Occurrence atomically claimed in SQLite (`occurrence_claims`), awaiting dispatch.
- **RUNNING**: Actively executing action in the background.
- **WAITING_APPROVAL**: Execution paused pending sovereign human authorization for mutating actions.
- **COMPLETED**: Action finished successfully with exit code 0 or successful payload.
- **FAILED**: Action encountered a non-zero exit code, unhandled error, or timeout.
- **CANCELLED**: Run aborted by operator or system shutdown.
- **RESTART_ABORTED**: Interrupted run reconciled upon server restart.

## 3. Triggers

The kernel supports four deterministic trigger kinds:
1. **MANUAL**: Triggered strictly on-demand by an operator or external API call.
2. **ONE_TIME**: Executes once at `scheduledAt` (ISO 8601 UTC).
3. **INTERVAL**: Executes every `intervalSeconds` (minimum 60s).
4. **CRON**: Standard 5-part cron expression (`minute hour dom month dow`) with timezone resolution and DST awareness.

## 4. Deterministic Actions

All actions are sandboxed and strictly validate containment:
- **RUN_COMMAND**: Executes verified system commands within registered repositories (`repo:core`, `repo:default`). Arbitrary shell piping is disallowed.
- **FILE_OPERATION**: Performs read-only inspection (`STAT`, `HASH`, `EXISTS`) within allowed filesystem roots.
- **REPOSITORY_CHECK**: Runs deterministic git integrity verification on registered repos.
- **EMIT_NOTIFICATION**: Directly sends a personal notification to the Gravitas Notification Bus.
- **GIT_COMMIT_MUTATION**: Creates an isolated branch commit; mandates `SAFE_WRITE` or `MUTATE` authority and halts for Human Sovereign Approval.

## 5. Execution Budgets & Authority

- **Execution Budget**: Defines `maxRuntimeMs` (hard timeout killed with SIGTERM/SIGKILL) and `maxAttempts` (exponential backoff retry boundary).
- **Authority Classes**:
  - `READ`: Completely safe, side-effect free inspection. Runs automatically.
  - `SAFE_WRITE`: Local isolated modifications (e.g. scratch branch). Runs automatically unless policy escalates.
  - `MUTATE`: Base branch modification or external side effects. Strictly requires human approval (`WAITING_APPROVAL`).
  - `ADMIN`: Infrastructure reconfiguration. Strictly requires human approval.
