# CURRENT RUNTIME TRACE

**Wave:** P2 — Current Backend Forensics  
**Status:** COMPLETE / TRACE VERIFIED AGAINST SOURCE  
**Date:** 2026-09-30  
**Repository Branch:** `feat/v0-golden-loop`  
**Git Commit Baseline:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariant:** `ROLE ≠ EXECUTOR ≠ HARNESS ≠ MODEL ≠ PROVIDER ≠ GATEWAY ≠ PROCESS`

---

## 1. End-to-End Runtime Lifecycle Trace

This document traces the sixteen architectural stages of a GRAVITAS run, providing dual classification:
- **Source Reality**: Structural implementation status within the repository.
- **Runtime Verification**: Live execution status during Wave P2 (conducted without `node_modules`).

```
Goal
  │ [Stage 1: Source=IMPLEMENTED, Runtime=BLOCKED_BY_DEPENDENCIES]
  ▼
Planning
  │ [Stage 2: Source=MISSING (Autonomous), Runtime=NOT_EXECUTED]
  ▼
Task / DAG
  │ [Stage 3: Source=IMPLEMENTED, Runtime=BLOCKED_BY_DEPENDENCIES]
  ▼
Scheduler
  │ [Stage 4: Source=IMPLEMENTED, Runtime=BLOCKED_BY_DEPENDENCIES]
  ▼
Role Resolution
  │ [Stage 5: Source=DECLARED_ONLY / BYPASSED, Runtime=NOT_EXECUTED]
  ▼
Capability Grant
  │ [Stage 6: Source=PARTIAL (Metadata check), Runtime=BLOCKED_BY_DEPENDENCIES]
  ▼
Harness / Provider
  │ [Stage 7: Source=IMPLEMENTED (Single Harness), Runtime=BLOCKED_BY_DEPENDENCIES]
  ▼
Worktree / Execution
  │ [Stage 8: Source=IMPLEMENTED, Runtime=BLOCKED_BY_DEPENDENCIES]
  ▼
Candidate
  │ [Stage 9: Source=IMPLEMENTED, Runtime=BLOCKED_BY_DEPENDENCIES]
  ▼
Cleanup (Pre-verification)
  │ [Stage 10: Source=IMPLEMENTED, Runtime=BLOCKED_BY_DEPENDENCIES]
  ▼
Verifier (Deterministic)
  │ [Stage 11: Source=IMPLEMENTED, Runtime=BLOCKED_BY_DEPENDENCIES]
  ▼
Browser QA (Playwright)
  │ [Stage 12: Source=IMPLEMENTED, Runtime=BLOCKED_BY_DEPENDENCIES]
  ▼
Evidence Bundling
  │ [Stage 13: Source=IMPLEMENTED (Manifest Hashing), Runtime=BLOCKED_BY_DEPENDENCIES]
  ▼
WAITING_APPROVAL
  │ [Stage 14: Source=IMPLEMENTED, Runtime=BLOCKED_BY_DEPENDENCIES]
  ▼
Human Decision
  │ [Stage 15: Source=IMPLEMENTED, Runtime=BLOCKED_BY_DEPENDENCIES]
  ▼
Integration / Materialization
    [Stage 16: Source=PARTIAL (Task Commits Only; No Run Merge), Runtime=NOT_EXECUTED]
```

---

## 2. Detailed Stage-by-Stage Forensics

### Stage 1: Goal Ingestion
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Location**: `apps/server/src/service.ts:300-345` (`RunService.createRun`)
- **Caller**: `POST /api/v1/runs` in `apps/server/src/app.ts:191`
- **Downstream Effect**: Creates a new `Run` instance in state `CREATED`, stores it in `InMemoryRegistry`, and publishes `run.created` event on `EventHub`.
- **Implementation Reality**:
  - Validates `repository` path exists on disk (`existsSync(repository)`).
  - Validates Git base branch (`resolveHeadSha(repository, baseBranch)` via `@gravitas/git`).
  - Calls `createExecutionContract` (`packages/core/src/contract.ts:45`) to create an immutable `ExecutionContract`.
  - Generates run ID: `run_${Date.now()}_${randomUUID().slice(0, 8)}`.

### Stage 2: Planning (Goal to DAG Decomposition)
- **Source Reality**: `MISSING` (Autonomous Planning) / `IMPLEMENTED` (Deterministic Validation)
- **Runtime Verification**: `NOT_EXECUTED`
- **Source Location**: `apps/server/src/service.ts:375-410` (`RunService.createRun`)
- **Caller**: `service.createRun(body)`
- **Downstream Effect**: Initializes `Task` instances in `InMemoryRegistry`.
- **Implementation Reality**:
  - **No Autonomous Planner**: The system does NOT prompt an LLM planner agent to decompose high-level goals into tasks.
  - If the client supplies `tasks: [...]` or `plan: {...}` in the HTTP request body, the server accepts them directly and validates them with `validateRunPlan` (`packages/orchestrator/src/validator.ts:37`).
  - If the client omits tasks, the server falls back to generating a single dummy task:
    ```typescript
    // apps/server/src/service.ts:383-398
    const defaultTaskId = `task_${Date.now()}_${randomUUID().slice(0, 8)}`
    initialTasks.push({
      id: defaultTaskId,
      title: 'Execute Goal',
      objective: goal,
      role: 'role:engineering:backend-engineer',
      ...
    })
    ```
  - Autonomous dynamic planning is entirely missing from the backend server runtime.

### Stage 3: Task / DAG Creation & Validation
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Location**: `packages/orchestrator/src/validator.ts:37` (`validateRunPlan`), `packages/core/src/dependencies.ts:40` (`topologicalSortTasks`)
- **Caller**: `service.createRun()`, `service.executeRun()`
- **Downstream Effect**: Sets initial task states: `READY` if 0 dependencies, or `BLOCKED` if dependencies exist.
- **Implementation Reality**:
  - Validates task IDs are unique and non-empty.
  - Checks for cyclical dependencies using DFS topological sort.
  - Ensures all declared dependencies exist in the task set.
  - Rejects duplicate edges or self-referential dependencies with `InvalidRunPlanError`.

### Stage 4: Scheduler Dispatch
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Location**: `packages/orchestrator/src/scheduler.ts:240-580` (`BoundedScheduler.execute`, `dispatchTask`)
- **Caller**: `POST /api/v1/runs/:runId/execute` $\rightarrow$ `RunService.executeRun()` $\rightarrow$ `scheduler.execute()`
- **Downstream Effect**: Bounded concurrency execution loop selecting `READY` tasks and launching workers.
- **Implementation Reality**:
  - Enforces `plan.maxConcurrency` (default: 2 concurrent tasks).
  - Main loop:
    ```typescript
    while (this.isRunning && (this.readyQueue.length > 0 || this.runningTasks.size > 0)) {
      while (this.runningTasks.size < this.maxConcurrency && this.readyQueue.length > 0) {
        const nextTaskId = this.readyQueue.shift()!
        void this.dispatchTask(nextTaskId)
      }
      await this.waitForSignal()
    }
    ```
  - Asynchronous event-driven wakeups via `wakeUp()` latch upon task completion, failure, or approval.

### Stage 5: Role Resolution
- **Source Reality**: `DECLARED_ONLY` / `BYPASSED`
- **Runtime Verification**: `NOT_EXECUTED`
- **Source Location**: `packages/core/src/roles.ts:121` (`CANONICAL_ROLE_DEFINITIONS`), `packages/orchestrator/src/scheduler.ts:658`
- **Caller**: `scheduler.dispatchTask()`
- **Downstream Effect**: Passes `role` string to prompt compiler; bypassed for harness selection.
- **Implementation Reality**:
  - `@gravitas/core/src/roles.ts` defines 5 canonical reasoning roles with department, responsibilities, capabilities, and prohibited authorities.
  - `gravitas-agent-specs/agents/` defines 25 specialized agent Markdown files.
  - However, at runtime, the scheduler does **NOT** resolve a specialized executor, model, or harness for the task's role.
  - Instead, the scheduler executes whatever single harness was injected into `BoundedScheduler` constructor (`this.harness.execute(...)` at `scheduler.ts:746`).
  - The role identifier is only passed as a text string into the prompt compiler (`compiler.ts:48`).
  - Invariant violation: `ROLE = HARNESS` (all roles funnel into the same harness).

### Stage 6: Capability Grant Verification
- **Source Reality**: `PARTIAL`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Location**: `packages/orchestrator/src/scheduler.ts:596-608`, `packages/agents/src/grants.ts:85` (`CapabilityGrantManager.requestGrant`)
- **Caller**: `scheduler.dispatchTask()`
- **Downstream Effect**: Verifies requested capabilities against role definition; fails task if grant is refused.
- **Implementation Reality**:
  - If `taskDef.requiredCapabilities` is defined, the scheduler queries `agentRegistry.requestGrant({ taskId, requiredCapabilities, role })`.
  - `CapabilityGrantManager` checks if the role's declared capabilities permit the request in memory.
  - **Containment Distinction**: This is an in-memory metadata validation check prior to launch. No GRAVITAS-enforced OS-level sandbox or containment boundary was identified for spawned harness subprocesses; their effective authority inherits the launching environment except where externally constrained.

### Stage 7: Harness & Provider Execution
- **Source Reality**: `IMPLEMENTED` (Single Global Harness Injected)
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Location**: `packages/orchestrator/src/scheduler.ts:746-756`, `packages/harnesses/src/free-claude-code.ts:40`, `packages/harnesses/src/claude-code.ts:47`, `packages/harnesses/src/codex.ts:44`
- **Caller**: `scheduler.dispatchTask()`
- **Downstream Effect**: Launches child process, runs agent with compiled prompt, captures output logs and duration.
- **Implementation Reality**:
  - Compiles prompt via `compilePrompt` (`packages/prompts/src/compiler.ts:25`).
  - Resolves inference route via `router.resolveRoute` (`packages/gateways/src/router.ts:72`). Defaults to `DIRECT` transport.
  - Calls `await this.harness.execute(...)`.
  - Process execution (`packages/harnesses/src/process.ts:60`):
    - Sets working directory to isolated task worktree path.
    - Spawns subprocess with timeout (default: 60,000ms).
    - On Windows, process termination is enforced via `taskkill.exe /PID <pid> /T /F`.
    - Captures stdout/stderr up to `DEFAULT_MAX_OUTPUT_BYTES` (512KB).

### Stage 8: Worktree Allocation & Isolation
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Location**: `packages/orchestrator/src/composition.ts:96-179` (`composeTaskWorktree`), `packages/git/src/worktree.ts:45` (`allocateWorktree`)
- **Caller**: `scheduler.dispatchTask()` (Step 2)
- **Downstream Effect**: Creates directory `<runtimeRoot>/worktrees/run_<runId>/task_<taskId>` and isolated task branch `gravitas/run_<runId>/task_<taskId>`.
- **Implementation Reality**:
  - **Root Tasks (0 parents)**: Branched from run `baseRef`.
  - **Single Parent (1 parent)**: Branched from parent task's verified result commit SHA.
  - **Multi-Parent (>1 parents)**: Branched from `parent[0]`, then sequentially cherry-picks `parent[1..n]` commits in declared dependency order.
  - If a cherry-pick conflict occurs:
    - Runs `git cherry-pick --abort`.
    - Deletes worktree directory.
    - Emits `task.composition_conflict` event.
    - Fails task with `COMPOSITION_CONFLICT`.

### Stage 9: Candidate Generation & Mutation Capture
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Location**: `packages/orchestrator/src/scheduler.ts:784-810`, `packages/harnesses/src/mutation.ts:74` (`captureWorktreeMutation`)
- **Caller**: `scheduler.dispatchTask()` (Step 6)
- **Downstream Effect**: Produces `MutationCapture` recording modified, added, and deleted files, with SHA256 hashes.
- **Implementation Reality**:
  - Takes a filesystem snapshot before harness execution (`takeWorktreeSnapshot`).
  - Diffs against post-execution filesystem state (`captureWorktreeMutation`).
  - Validates mutations against `allowedPaths` (from run constraints).
  - If an unconstrained file was modified, sets `isWithinAllowedScope = false`.

### Stage 10: Cleanup (Pre-Verification)
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Location**: `packages/harnesses/src/process.ts:160-220` (`killProcessTree`), `packages/orchestrator/src/composition.ts:157-168`
- **Caller**: Subprocess exit handlers, composition error handlers
- **Downstream Effect**: Terminates lingering background worker processes, cleans locks.
- **Implementation Reality**:
  - Ensures the agent process tree is killed before verifier execution begins.
  - Leaves task worktree files intact on disk for independent verification.

### Stage 11: Independent Deterministic Verification
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Location**: `packages/orchestrator/src/scheduler.ts:816-845`, `packages/verifier/src/verifier.ts:39` (`executeVerification`)
- **Caller**: `scheduler.dispatchTask()` (Step 8)
- **Downstream Effect**: Task transitions to `VERIFYING`, runs verification plan, produces `VerificationResult`.
- **Implementation Reality**:
  - Uses `taskDef.verificationPlan`, falling back to run plan or default check (`process.exit(0)`).
  - Executes each configured test command out-of-band in the task worktree.
  - Verifies mandatory command exit codes (`exitCode === 0`).
  - Calls `applyVerificationOutcome` (`packages/verifier/src/state-authority.ts:33`).
  - If verifier fails, task immediately transitions to `FAILED`.

### Stage 12: Browser QA Verification
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Location**: `packages/orchestrator/src/scheduler.ts:863-950`, `packages/browser-qa/src/runner.ts:46` (`executeBrowserQa`)
- **Caller**: `scheduler.dispatchTask()` (Step 9)
- **Downstream Effect**: Executes Playwright test contract, captures screenshot artifacts.
- **Implementation Reality**:
  - Triggered only if `taskDef.browserQa` is specified.
  - Launches headless Playwright Chromium instance.
  - Executes action sequence (`navigate`, `fill`, `click`, `assertVisible`, `screenshot`).
  - Restricted strictly to `localhost` / `127.0.0.1` URLs via `packages/browser-qa/src/security.ts:25`.
  - Saves screenshots to `<runtimeRoot>/scratch/<runId>/<taskId>/browser-qa-screenshots/`.
  - If Browser QA assertions fail, task transitions to `FAILED`.

### Stage 13: Evidence Bundling
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Location**: `packages/orchestrator/src/scheduler.ts:956-1002`, `packages/verifier/src/evidence.ts:45` (`writeEvidenceBundle`)
- **Caller**: `scheduler.dispatchTask()` (Step 10)
- **Downstream Effect**: Writes integrity hashes and manifest to disk; emits `evidence.created` event.
- **Implementation Reality**:
  - Writes to `<runtimeRoot>/runs/<runId>/tasks/<taskId>/`:
    - `evidence-manifest.json` (SHA256 hashes of individual artifacts)
    - `evidence-manifest.sha256` (SHA256 hash of manifest file)
    - `worker.json` (harness stdout/stderr and execution metadata)
    - `diff.patch` (worktree diff against base SHA)
    - `verification.json` (verifier test results)
    - `prompt.txt` (exact compiled prompt submitted to worker)
  - Stores `TaskEvidenceRef` in `InMemoryRegistry`.
  - **Evidence Boundary**: Provides integrity hashing, change detection, and manifest generation. Does not provide external trust anchoring, cryptographic digital signing, or append-only storage.

### Stage 14: WAITING_APPROVAL State
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Location**: `packages/orchestrator/src/scheduler.ts:1005-1008`
- **Caller**: `scheduler.dispatchTask()` (Step 11)
- **Downstream Effect**: Task state set to `WAITING_APPROVAL`, worktree preserved, scheduler auto-pauses.
- **Implementation Reality**:
  - If `task.requiresApproval !== false` (default is `true`), task enters `WAITING_APPROVAL`.
  - The task's worktree is preserved on disk so the human reviewer can inspect files directly.
  - BoundedScheduler pauses dispatch of downstream dependent tasks.

### Stage 15: Human Decision (Approve / Reject)
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Location**: `apps/server/src/service.ts:651-750` (`approveTask`, `rejectTask`), `packages/orchestrator/src/scheduler.ts:1040-1127`
- **Caller**: `POST /api/v1/runs/:runId/tasks/:taskId/approve` or `reject`
- **Downstream Effect**: Resolves approval gate; triggers commit creation or failure propagation.
- **Implementation Reality**:
  - **On Approve**:
    1. Calls `materializeVerifiedResult` to commit worktree changes to the isolated task branch.
    2. Transitions task from `WAITING_APPROVAL` to `APPROVED`.
    3. Deletes the task worktree directory from disk (`cleanWorktree`).
    4. Unlocks downstream tasks whose dependencies are now fulfilled (`unlockDownstreamTasks`).
    5. Wakes up the scheduler (`wakeUp()` / `execute()`).
  - **On Reject**:
    1. Transitions task from `WAITING_APPROVAL` to `FAILED`.
    2. Deletes the task worktree directory from disk (`cleanWorktree`).
    3. Propagates failure to downstream tasks with `DEPENDENCY_FAILED`.
    4. Wakes up the scheduler.

### Stage 16: Integration & Materialization
- **Source Reality**: `PARTIAL`
- **Runtime Verification**: `NOT_EXECUTED`
- **Source Location**: `packages/orchestrator/src/composition.ts:40-77` (`materializeVerifiedResult`)
- **Caller**: `scheduler.approveTask()` or auto-materialization on `SUCCEEDED`
- **Downstream Effect**: Commits staged files to the isolated task branch.
- **Implementation Reality**:
  - **Implemented**: `materializeVerifiedResult` runs `git add -A` and `git commit -m "gravitas: verified result <taskId>"` within the task worktree. It resolves and returns the resulting 40-character commit SHA on the isolated task branch `gravitas/run_<runId>/task_<taskId>`.
  - **Missing**: There is **no run-level integration mechanism**. When all tasks complete and the run transitions to `COMPLETED`:
    - The commits exist on isolated task branches (`gravitas/run_<runId>/task_<taskId>`).
    - Verified task results are not integrated back into `baseBranch` at run completion.
    - No merge commit is created, no rebase is performed, and no GitHub/GitLab Pull Request is generated.

---

## 3. Summary of Trace Classifications

| Stage | Name | Source Reality | Runtime Verification | Primary Source Evidence |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Goal Ingestion | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | `apps/server/src/service.ts:300` |
| 2 | Planning | `MISSING` | `NOT_EXECUTED` | `apps/server/src/service.ts:383` (Fallback single task) |
| 3 | Task / DAG | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | `packages/orchestrator/src/validator.ts:37` |
| 4 | Scheduler | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | `packages/orchestrator/src/scheduler.ts:240` |
| 5 | Role Resolution | `DECLARED_ONLY` | `NOT_EXECUTED` | `packages/core/src/roles.ts:121` (Scheduler ignores role for harness) |
| 6 | Capability Grant | `PARTIAL` | `BLOCKED_BY_DEPENDENCIES` | `packages/agents/src/grants.ts:85` (Metadata check; no OS sandbox) |
| 7 | Harness / Provider | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | `packages/harnesses/src/free-claude-code.ts:40` |
| 8 | Worktree Allocation | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | `packages/orchestrator/src/composition.ts:96` |
| 9 | Candidate / Mutation | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | `packages/harnesses/src/mutation.ts:74` |
| 10 | Cleanup | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | `packages/harnesses/src/process.ts:160` |
| 11 | Verifier | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | `packages/verifier/src/verifier.ts:39` |
| 12 | Browser QA | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | `packages/browser-qa/src/runner.ts:46` |
| 13 | Evidence Bundling | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | `packages/verifier/src/evidence.ts:45` (Manifest hashing) |
| 14 | WAITING_APPROVAL | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | `packages/orchestrator/src/scheduler.ts:1005` |
| 15 | Human Decision | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | `apps/server/src/service.ts:651` |
| 16 | Integration / Materialization | `PARTIAL` | `NOT_EXECUTED` | `packages/orchestrator/src/composition.ts:40` (Task commit only) |
