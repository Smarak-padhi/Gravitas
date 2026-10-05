# P3 ARCHITECTURE SCENARIOS: 10 CONCRETE OPERATIONAL TRACES
## End-to-End Walkthroughs Validating Invariants, Policies, Structural Independence & Fail-Closed Fallback

**Wave:** P3 — Role / Agent Interaction Architecture  
**Date:** 2026-09-30  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants:**
$$\mathbf{ROLE \neq EXECUTOR \neq HARNESS \neq MODEL \neq PROVIDER \neq GATEWAY \neq PROCESS}$$
$$\mathbf{INTERACTION\ POSITION \neq LOGICAL\ ROLE \neq QUALIFIED\ EXECUTOR}$$

---

## 1. Scenario Walkthrough Methodology

For every scenario, execution is traced across the full 10-point architectural chain:
$$\text{Task} \rightarrow \text{Role} \rightarrow \text{Executor} \rightarrow \text{Harness} \rightarrow \text{Gateway?} \rightarrow \text{Provider} \rightarrow \text{Model} \rightarrow \text{Process} \rightarrow \text{Evidence} \rightarrow \text{Review} \rightarrow \text{Outcome}$$

Every scenario evaluates:
- Architectural classification (`[INVARIANT]`, `[ARCHITECTURAL CONTRACT]`, `[CONFIGURABLE POLICY]`, etc.).
- Explicit policy enforcement (`InteractionBudget`, `RevisionBudget`, `TokenBudget`, `FinancialBudget`, `IndependencePolicy`, `TimeoutPolicies`).
- Multi-dimensional safe fallback and qualification vs dynamic readiness.
- Accurate evidence-quality provenance recording without fabrication.

---

## Scenario A: Standard Engineering Task (Same-Model Reviewer under Structural Independence)

### Context & Objective
Implement a typed health check endpoint in `apps/server/src/app.ts`. The cluster has only one qualified model family (`anthropic-claude`). Tests structural independence without model diversity.

### 10-Point Architectural Trace
1. **Task**: `task_eng_001` (`title`: "Add /healthz route", `runId`: `run_101`). Governed by default `TaskOperationalPolicy` (`maxTotalTurns: 8`, `maxRevisions: 3`).
2. **Role**: Resolved to `role:engineering:backend-engineer`. Responsibilities: REST API endpoints, TypeScript types. Prohibited authorities: `HUMAN_APPROVAL_BYPASS`, `INDEPENDENT_REVIEW`.
3. **Executor**: Assigned to `executor:be-worker-1` (Lease `lease_101_01`, fence token `1`).
4. **Harness**: Selected `ClaudeCodeHarness` (Qualification: `QUALIFIED`, Dynamic Readiness: `READY`, Containment: `L2_WORKTREE_RESTRICTED`).
5. **Gateway**: `DIRECT` transport (no proxy routing needed).
6. **Provider**: `anthropic`.
7. **Model**: `claude-3-7-sonnet-20250219`.
8. **Process**: Subprocess spawned (PID `15432`, cwd: `<runtimeRoot>/worktrees/run_101/task_eng_001`).
9. **Evidence**: Worker commits to isolated task branch `gravitas/run_101/task_eng_001`. Emits `CandidateResult`. Files modified: `apps/server/src/app.ts`. Verifier runs `npm test` out-of-band via `service:verification:deterministic-runner`; exit code `0`. Evidence manifest generated with SHA-256 digests.
10. **Review (Structural Independence Validation)**:
    - Cluster lacks a distinct model family (no OpenAI or Gemini available).
    - Kernel applies `IndependencePolicy`:
      - Distinct Logical Role: `role:quality:independent-reviewer` $\neq$ `role:engineering:backend-engineer` [PASSED]
      - Distinct Executor Instance: `executor:rev-01` $\neq$ `executor:be-worker-1` [PASSED]
      - Isolated Session Context: Reviewer spawned with clean prompt and candidate diff; zero worker conversation memory [PASSED]
      - Independent Prompt Derivation: Prompt compiled directly from acceptance criteria by Kernel [PASSED]
      - Mechanical Verification: `npm test` exit code 0 verified mechanically [PASSED]
    - Reviewer returns `ReviewResult(status: 'ACCEPTED')`.
11. **Outcome**: Task transitions to `WAITING_APPROVAL`. Human operator reviews evidence bundle on Mezzanine and clicks Approve. Task materializes verified result commit. Downstream tasks unlock.

---

## Scenario B: Supervisor Delegates Independent Subtasks to Multiple Workers (Worktree Concurrency & Mutex)

### Context & Objective
Goal: "Build Authentication & User Settings". Chief Planner decomposes into 2 parallel subtasks: `task_auth` and `task_settings`. Tests worktree concurrency and serialization of shared Git object mutations.

### 10-Point Architectural Trace
1. **Task**: `task_auth` and `task_settings` created under `run_102`. Both have 0 dependencies; ready queue has 2 tasks. BoundedScheduler `maxConcurrency = 2`.
2. **Role**:
   - `task_auth`: `role:engineering:backend-engineer`.
   - `task_settings`: `role:engineering:frontend-engineer`.
3. **Executor**:
   - `task_auth` $\rightarrow$ `executor:be-worker-1` (Lease `lease_102_01`).
   - `task_settings` $\rightarrow$ `executor:fe-worker-2` (Lease `lease_102_02`).
4. **Harness**: Both execute on `ClaudeCodeHarness`.
5. **Gateway**: `DIRECT` transport.
6. **Provider**: `anthropic`.
7. **Model**: `claude-3-7-sonnet-20250219`.
8. **Process & Concurrency Serialization**:
   - `task_auth`: PID `16104`, isolated worktree `<runtimeRoot>/worktrees/run_102/task_auth`.
   - `task_settings`: PID `16108`, isolated worktree `<runtimeRoot>/worktrees/run_102/task_settings`.
   - Both tasks invoke `git worktree add` concurrently. `AsyncRepositoryMutex` serializes the creation calls, preventing `.git/packed-refs.lock` sharing violations on Windows NTFS.
9. **Evidence**: Each worker produces independent branch commits:
   - `gravitas/run_102/task_auth` (SHA `a1b2c3d...`)
   - `gravitas/run_102/task_settings` (SHA `e5f6a7b...`)
10. **Review**: Dispatched concurrently to independent reviewer profiles.
11. **Outcome**: Both pass independent review. Downstream integration task `task_integration` composes both commits sequentially via `composeTaskWorktree` under repository mutex without conflict.

---

## Scenario C: Worker Asks Specialist for Advice (Cyclic Wait Prevention via Wait-For Graph)

### Context & Objective
Worker implementing SQLite migrations needs bounded advice from Pattern Librarian on schema PRAGMAs. Tests blocking dependency modeling and cycle avoidance.

### 10-Point Architectural Trace
1. **Task**: `task_db_003` (`run_103`, assigned to `executor:be-worker-1`).
2. **Interaction**:
   - Worker does NOT open free-form chat.
   - Worker emits structured `ClarificationRequest` message to Kernel directed to `profile:architecture:pattern-librarian`.
3. **Wait-For Graph Evaluation**:
   - Kernel models potential wait edge: $(\text{Worker}, \text{Specialist}) \in E_W$.
   - Kernel runs cycle detection on $G_W$: no cycle found.
   - Kernel registers edge with advisory timeout governed by `WaitTimeoutPolicy.advisoryWaitTimeoutMs = 120,000ms`.
4. **Specialist Execution**:
   - Kernel routes request to Specialist Executor `executor:pattern-scout-1`.
   - Specialist runs read-only analysis over `docs/` and prior migrations.
   - Specialist replies with `ProgressUpdate(advice: "Use PRAGMA journal_mode = WAL, PRAGMA foreign_keys = ON; version in schema_metadata.")`.
5. **Advisory Invariant Enforcement**:
   - Edge $(\text{Worker}, \text{Specialist})$ pruned from $G_W$.
   - Specialist *cannot* mutate the worktree, cannot commit code, and cannot reassign the task.
6. **Worker Continuation**: Worker receives typed response from Kernel, applies convention in its isolated worktree.
7. **Outcome**: Worker submits candidate; review passes cleanly with consultation provenance preserved.

---

## Scenario D: Worker Submits Candidate; Reviewer Rejects; Budget Exhaustion Escalation

### Context & Objective
Worker repeatedly introduces regressions across revisions. Tests `RevisionBudget` and `FinancialBudget` exhaustion triggering clean escalation.

### 10-Point Architectural Trace
1. **Initial Submission**: Worker (`executor:be-worker-1`, Revision `0`) submits `CandidateResult`.
2. **Review & Rejection 1**: Independent Reviewer detects missing null checks; emits `Critique(verdict: 'REJECTED')`. Revision counter increments $0 \rightarrow 1 \le \text{RevisionBudget.maxRevisions} (3)$.
3. **Revisions 2 & 3**: Worker attempts fixes but introduces type errors. Reviewer rejects both. Revision counter reaches $3$.
4. **Budget Exhaustion Check**:
   - On fourth submission attempt or subsequent failure, Kernel checks `revisionIndex > RevisionBudget.maxRevisions` ($4 > 3$).
   - Concurrently, task cumulative cost reaches $\$2.48$, approaching `FinancialBudget.maxCostCeilingUsd = $2.50`.
5. **Deterministic Freezing**:
   - Kernel suppresses further automated `CorrectionRequest` dispatch.
   - Synthesizes `Escalation` message:
     ```json
     {
       "reason": "MAX_REVISIONS_EXCEEDED",
       "diagnosticMessage": "Task failed independent review across 3 revision loops. Cumulative cost: $2.48 USD. Automated loops exhausted.",
       "attemptedMitigations": ["Review pass 1", "Review pass 2", "Review pass 3"]
     }
     ```
   - Task execution lease is paused; active timeouts frozen.
6. **Outcome**: Task transitions to `ESCALATED`. Operator on Mezzanine reviews side-by-side diffs, failure logs, and cost breakdown, deciding to reassign or manually guide the task.

---

## Scenario E: Preferred Harness Unavailable (Multi-Dimensional Safe Fallback & Fail-Closed Gate)

### Context & Objective
Task prefers `ClaudeCodeHarness`, but Claude Code CLI is unauthenticated. Secondary candidate is unavailable. Tests multi-dimensional safe fallback and fail-closed behavior when qualification or readiness is missing.

### 10-Point Architectural Trace
1. **Task**: `task_ui_004` requires `role:engineering:frontend-engineer` (minimum containment level: `L2_WORKTREE_RESTRICTED`).
2. **Executor**: `executor:fe-worker-1` (Profile specifies preference: `["claude-code", "fcc", "agy"]`).
3. **Harness Resolution & Readiness Evaluation**:
   - Primary candidate `claude-code` probed: state is `INSTALLED` (Unauthenticated).
     - *Dispatch Eligibility*: Ineligible! (Requires dynamic operational state `READY`).
   - Secondary candidate `fcc` probed: state is `INSTALLED` (`fcc-server` not running, port 8082 unreachable).
     - *Dispatch Eligibility*: Ineligible!
   - Tertiary candidate `agy` probed: state is `CAPABILITY_PROBED`.
     - *Eligibility Check*: `agy` has not completed `CONTAINMENT_TESTED` (containment `--sandbox` unproven against hostile mutations). Current dynamic readiness: `NOT_READY`.
     - *Multi-Dimensional Safe Fallback Rule*: Fallback must NEVER silently downgrade qualification, dynamic readiness, or containment guarantees!
     - Because `agy` $\neq \text{'READY'}$ and lacks verified $L2$ containment, the selector **fails closed**.
4. **Deterministic Halting**:
   - The selector refuses to dispatch to an uncontained or non-ready surface.
   - Emits structured rejection ledger explaining why all candidates failed eligibility.
   - Task transitions to `BLOCKED_NO_QUALIFIED_HARNESS`.
5. **Provenance**: Recorded in `ExecutionProvenance`:
   `{ "status": "BLOCKED", "harnessId": null, "rejectionReason": "ALL_CANDIDATES_INELIGIBLE", "failedCandidates": ["claude-code", "fcc", "agy"] }`.
6. **Outcome**: System prevents security downgrade and silent failure loops. Explicit human escalation alert is rendered on Mezzanine prompting operator to authenticate Claude Code or launch FCC daemon.

---

## Scenario F: QUALIFIED Harness is Currently Unreachable (Dynamic Readiness vs Static Qualification)

### Context & Objective
A harness was statically certified at server startup as `QUALIFIED` for $L2$ containment, but its background daemon crashed or network disconnected before dispatch. Tests dynamic readiness enforcement.

### 10-Point Architectural Trace
1. **Task**: `task_api_006` requires $L2$ containment and Node runtime capabilities.
2. **Candidate Evaluation**:
   - Harness `FCC` has static certification: `qualificationState = QUALIFIED`.
   - Dispatcher executes pre-flight availability check: `fcc.probeAvailability()`.
   - Daemon connection fails with `ECONNREFUSED 127.0.0.1:8082`.
   - Dynamic readiness state transitions to `NOT_READY` (`isHealthy = false`).
3. **Selection Filtering**:
   - Selector evaluates: `desc.qualificationState === 'READY'` $\implies$ `FALSE`.
   - Candidate is rejected from immediate dispatch despite static `QUALIFIED` status.
4. **Safe Fallback or Halt**:
   - If alternative ready candidate exists (e.g. `ClaudeCodeHarness` at `READY`): dispatches with fallback provenance.
   - If no other candidate is `READY`: fails closed with `BLOCKED_NO_QUALIFIED_HARNESS`.
5. **Outcome**: The system never dispatches tasks to offline or zombie daemons. Provenance accurately records the reachability failure.

---

## Scenario G: Architecture Arena Dissent (Arbitration Turn & Sovereign Human Decision)

### Context & Objective
Architecture Arena deliberation on state management: Frontend Specialist recommends Redux Toolkit; Desktop Runtime Specialist recommends lightweight NanoStores. Tests multi-specialist dissent resolution.

### 10-Point Architectural Trace
1. **Task**: `task_arch_007` (Architecture decision on UI state store).
2. **Interaction**:
   - Specialist A (`03-FRONTEND-ENGINEER`) submits Proposal A emphasizing DevTools ecosystem.
   - Specialist B (`23-DESKTOP-RUNTIME-ENGINEER`) submits Proposal B emphasizing startup footprint.
3. **Conflict Detection**:
   - Kernel detects mutually exclusive architectural proposals on same decision target.
4. **Arbitration Step**:
   - Kernel invokes `role:strategy:chief-planner` in **Arbitration Turn** ($N_{\text{arbitration}} = 1$).
   - Chief Planner evaluates proposals against master plan memory constraints.
   - Planner determines that trade-offs require human business alignment.
5. **Human Escalation Gate**:
   - Kernel creates `ApprovalRequest` to Human Operator on Mezzanine displaying side-by-side comparison.
6. **Outcome**: Human Operator selects NanoStores with explicit override policy recorded in ADR register. Workflow proceeds deterministically without deadlock.

---

## Scenario H: Mid-Flight Authentication Expiration & Dynamic Re-Qualification

### Context & Objective
Harness was `READY` at task dispatch, but OAuth token expires mid-flight during a multi-stage execution. Tests reactive error handling and qualification downgrade.

### 10-Point Architectural Trace
1. **Task**: `task_long_008` executing via `ClaudeCodeHarness`.
2. **Mid-Flight Failure**: Subprocess terminates with exit code 1; stderr contains `OAuth access token expired`.
3. **Reactive Handling**:
   - Failure classified as `HARNESS_UNAUTHENTICATED`.
   - Kernel immediately updates `ClaudeCodeHarness` runtime descriptor: `qualificationState = INSTALLED`, `isHealthy = false`.
   - Worktree state rolled back to baseline commit via `git reset --hard baseCommitSha`.
4. **Safe Fallback Attempt**:
   - Kernel queries registry for alternative `READY` harnesses meeting containment level.
   - If alternative exists: re-dispatches with incremented fence token and fallback reason logged.
   - If no alternative exists: halts closed and escalates to human operator for re-authentication.
5. **Outcome**: Mid-flight auth failure does not corrupt worktree or strand task in running state; registry state is dynamically updated to prevent subsequent tasks from failing.

---

## Scenario I: Human Cancels Run During Multi-Agent Activity (Reviewer Activity Cancellation)

### Context & Objective
Human operator clicks "Cancel Run" on UI while 2 workers and 1 independent reviewer are actively executing. Tests prompt cancellation across positions.

### 10-Point Architectural Trace
1. **Operator Action**: `POST /api/v1/runs/run_105/cancel`.
2. **Kernel Broadcast**:
   - Kernel transitions Run state to `CANCELLED`.
   - Sends typed `Cancellation` envelopes to all active task execution leases:
     - Worker 1 (PID `18100`)
     - Worker 2 (PID `18104`)
     - Reviewer 1 (PID `18112`, executing in `VERIFYING` state).
3. **Process Tree Termination**:
   - For every active process tree, Kernel invokes atomic termination handle (Job Object close or tree kill).
   - Stdio pipes closed; child processes destroyed.
4. **Worktree Cleanup**:
   - Active worktree directories unlinked and removed under `AsyncRepositoryMutex`.
   - Task branches preserved in Git for forensics, marked `CANCELLED`.
5. **Lease Invalidation**:
   - All active leases transitioned to `TERMINATED`.
   - Stale lease reaper verifies no lingering locks remain.
6. **Outcome**: Entire run halts cleanly in $< 500\text{ms}$. Zero zombie processes or corrupted Git refs remain.

---

## Scenario J: Pre-Execution OS Sandboxing & Unprovable Provenance Honesty

### Context & Objective
Adversarial prompt injection in upstream task output attempts to command worker to read `~/.ssh/id_rsa`. Tests pre-execution OS sandboxing and honest provenance representation of vendor-unprovable fields.

### 10-Point Architectural Trace
1. **Task**: `task_fe_009` receives upstream context package containing adversarial prompt injection.
2. **Pre-Execution OS Sandboxing**:
   - Worker subprocess spawned with candidate OS sandbox: Windows AppContainer / Restricted Token with Restricting SIDs and Deny DACLs, network disabled (`LOOPBACK_ONLY`), filesystem write permissions bounded strictly to `<runtimeRoot>/worktrees/run_106/task_fe_009`. (Note: LowIL alone enforces No-Write-Up under Windows MIC; preventing unauthorized reads of host secrets requires AppContainer capability isolation or Restricting SIDs / Deny DACLs).
3. **Host Interception**:
   - Malicious script attempts to read host SSH key `C:\Users\smara\.ssh\id_rsa`.
   - Windows OS kernel denies file read with `ERROR_ACCESS_DENIED` (exit code 5) via AppContainer capability isolation / Restricting SID sandbox.
4. **Post-Hoc Verification**:
   - `captureWorktreeMutation` diffs worktree; verifies worktree is clean.
   - Out-of-scope breach attempt logged.
5. **Provenance Generation (Honest Evidence Quality)**:
   - Provenance record generated answering all 14 questions:
     - `task`, `role`, `executor`, `harness`, `workspace`: `[REQUIRED PROVENANCE FIELD]` populated deterministically.
     - `model.checkpointDigest`: Explicitly populated as `{ status: 'UNPROVEN', reason: 'VENDOR_PROPRIETARY_BLACKBOX' }` without hallucinating weight hashes.
     - `inputs.systemPromptSha256`: Explicitly marked `UNPROVEN` if using closed CLI binary.
     - `telemetry.cpuUserMs`: Observable host telemetry recorded.
6. **Outcome**: Security breach prevented at OS level before file read could succeed. Audit record honestly reflects verified evidence without fabricating provider internal telemetry.

---

## 2. Summary of Scenario Verification

| Scenario | Architectural Dimension Tested | Primary Invariant Enforced | Provenance Evidence Quality |
| :--- | :--- | :--- | :--- |
| **A: Standard Task** | Same-Model Structural Independence | Role $\neq$ Executor; Session isolation | All required fields populated |
| **B: Multi-Worker** | Worktree Concurrency & Lock Safety | Worktree Isolation; Mutex serialization | Distinct branch commits and diffs |
| **C: Specialist Advice** | Blocking Dependency Modeling ($G_W$) | Advisory vs Execution; Cycle avoidance | Consultation logged without file mutations |
| **D: Budget Exhaustion** | Bounded Loops & Financial Ceilings | Turn & Budget Boundedness | Exhaustion reason logged in diagnostic ledger |
| **E: Harness Fallback** | Multi-Dimensional Safe Fallback | Non-Downgrade Invariant; Fail-closed | Multi-criteria elimination proof |
| **F: QUALIFIED vs READY** | Dynamic Operational Readiness | Inactive/unreachable surfaces ineligible | Reachability failure recorded honestly |
| **G: Dissent & Arbitration** | Sovereign Escalation Gate | Human Sovereignty over architectural choices | Side-by-side proposal comparison |
| **H: Mid-Flight Auth Expiry** | Reactive Qualification Downgrade | Dynamic Readiness; Fail-closed rollback | Status downgrade to NOT_READY logged |
| **I: Run Cancellation** | Clean Multi-Position Teardown | Zero Zombie Processes; Atomic cleanup | All leases transitioned to TERMINATED |
| **J: Containment & Provenance** | Pre-Execution Sandboxing & Honest Auditing | Kernel Containment; Zero Fabrications | Checkpoint digest marked UNPROVEN |
