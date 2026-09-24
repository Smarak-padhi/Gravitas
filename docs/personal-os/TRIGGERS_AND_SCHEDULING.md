# Gravitas Triggers & Scheduling Architecture (Wave 12C.5)

## 1. Separation of Scheduling Concerns

To avoid overloading a single orchestrator component, Gravitas strictly delineates four distinct temporal and event dispatch subsystems:

```
                                 ┌─────────────────────────────────┐
                                 │     EXTERNAL & TIMED INPUTS     │
                                 │  (Cron, Webhooks, User, System) │
                                 └────────────────┬────────────────┘
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 │                                │                                │
                 ▼                                ▼                                ▼
    ┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
    │    Reminder Scheduler    │    │    Condition Watcher     │    │   Background Job Queue   │
    │  - Pure cron / wall-time │    │  - State predicates      │    │  - High-throughput I/O   │
    │  - Hydration, stretch    │    │  - Deadline alerts       │    │  - Downloads, indexing   │
    │  - Calendar alerts       │    │  - Invariant monitors    │    │  - Checksum verification │
    └────────────┬─────────────┘    └─────────────┬────────────┘    └─────────────┬────────────┘
                 │                                │                               │
                 │ Event Trigger                  │ Condition Fired               │ I/O Completed
                 └────────────────────────────────┼───────────────────────────────┘
                                                  │
                                                  ▼
                                    ┌───────────────────────────┐
                                    │     Bounded Scheduler     │
                                    │   (DAG Task Orchestrator) │
                                    │  - FSM lifecycle engine   │
                                    │  - Worker qualification   │
                                    │  - Verification gates     │
                                    └───────────────────────────┘
```

---

## 2. Subsystem Definitions & Boundaries

### 1. Task Scheduler (`BoundedScheduler`)
- **Nature:** Foundational multi-agent DAG orchestrator (implemented in `@gravitas/orchestrator`).
- **Responsibility:** Manages task lifecycle FSM (`PLANNED` -> `READY` -> `RUNNING` -> `VERIFYING` -> `WAITING_APPROVAL` -> `SUCCEEDED` / `APPROVED` / `FAILED`).
- **Evolution Strategy:** **The existing `BoundedScheduler` is preserved unchanged in Wave 12C.5.** It remains the authoritative engine for task execution and dependency satisfaction.

### 2. Reminder Scheduler (`ReminderService`)
- **Nature:** High-efficiency, non-blocking cron evaluation service.
- **Responsibility:** Evaluates recurring time schedules (e.g., `"0 9 * * 1-5"`, `"*/45 * * * *"`).
- **Behavior:** Fires lightweight notification events or triggers `PersonalCoach` evaluations. Consumes zero inference tokens.

### 3. Condition Watcher (`ConditionWatcherService`)
- **Nature:** Periodic predicate evaluator.
- **Responsibility:** Evaluates logical assertions against structured system memory (e.g., `isAcademicAssignmentDueSoon()`, `hasUnapprovedCandidateBranches()`).
- **Behavior:** When a predicate transitions from `FALSE` to `TRUE`, it emits a typed condition event to the orchestrator or notification bus.

### 4. Background Job Queue (`BackgroundJobQueue`)
- **Nature:** Async FIFO worker pool for CPU/IO-bound background operations.
- **Responsibility:** Manages non-LLM background jobs (HTTP file downloads, zip extraction, vector indexing, image thumbnailing).
- **Isolation:** Keeps heavy I/O workloads completely separate from the LLM execution pipeline.

---

## 3. Preservation of Existing Scheduler Invariants

The existing `@gravitas/orchestrator` implementation already enforces:
1. Concurrency limits per run (`maxConcurrency`).
2. Topological dependency ordering (tasks run only when satisfying prerequisites).
3. Independent verification before approval.
4. Mutation detection and change scope auditing.

The new scheduling components (`ReminderService`, `ConditionWatcher`, `BackgroundJobQueue`) wrap *around* the scheduler as trigger sources—**they do not alter the internal core scheduler state machine.**

---

## 4. Calendar Scheduling Ground Truth (Wave 12J)

In Wave 12J, the `JobScheduler` directly drives deterministic calendar monitoring:
- **`job-calendar-agenda`**: Runs on daily cron (`0 8 * * *`) to fetch the day's agenda.
- **`job-calendar-reminder`**: Runs on 15-minute interval (`900s`) to scan for imminent events.
- **`job-calendar-conflict-check`**: Runs on 1-hour interval (`3600s`) to scan for overlapping appointments.
- All actions execute via `CONNECTOR_READ` with zero LLM inference.
