# GRAVITAS K2 — GOLDEN LOOP EXECUTION EVIDENCE

**Wave**: K2 — Supervisor ↔ Worker Closed-Loop Orchestration  
**Status**: EMPIRICALLY VERIFIED & AUDITED  
**Execution Timestamp**: 2026-10-02T10:19:01.000Z  
**Host Platform**: `win32` (Windows 11)  
**Node.js Runtime**: `v24.13.0`  

---

## 1. Test Environment & State Category

- **State Category**: Isolated temporary SQLite data root via `mkdtemp(join(tmpdir(), 'gravitas-k2-kernel-'))`.
- **Selected Execution Surface**: `powershell-local`
- **Harness Classification**:
  - `HarnessKind = PROCESS`
  - `CostClass = OPERATOR_INCLUDED_HOST_RUNTIME`
  - `OperationalState = READY`
  - `DispatchAuthorization = DISPATCH_AUTHORIZED`
  - `ExecutionMode = DETERMINISTIC_ONLY`
  - `AIPromptDispatch = FORBIDDEN`
- **Monetary Spend**: `$0.00` (`AUTONOMOUS_INCREMENTAL_SPEND = 0`).

---

## 2. Ordered Golden Loop Trace (24 Stages)

The closed loop executes the canonical 24 stages in strict order:

```text
01. WorkSession created:
    Command: CREATE_WORKSESSION -> WorkSession entity initialized at revision 1.
    [ID: ws_k2_3c76c994]

02. Objective accepted:
    Objective: "Write-Output \"GRAVITAS_K2_PASS\"" -> bound to WorkSession goal.

03. Run created:
    Command: CREATE_RUN -> Run aggregate created with goal.
    [ID: run_ea94c933]

04. Supervisor iteration started:
    Iteration: 1 -> Evaluated by BoundedSupervisorEngine against session state.

05. Structured Supervisor decision produced:
    Decision: DISPATCH_TASK [Reason: INITIAL_DISPATCH]
    TargetRole: "role:engineering:backend-engineer"
    TargetExecutor: "executor:backend:primary"

06. Supervisor decision persisted / durably represented:
    Task aggregate initialized in K0 SQLite database.

07. Task created / selected:
    Command: CREATE_TASK -> Task entity inserted in PENDING state.
    [ID: task_c1fcc61b]

08. Role requirement resolved:
    "role:engineering:backend-engineer" -> Mapped to primary backend execution profile.

09. Executor resolved:
    Profile: "executor:backend:primary" (allowed capabilities: filesystemRead, filesystemWrite, shellExecution).

10. Harness resolution started:
    Resolver requests eligible harness matching profile preferred list: ['powershell-local', 'agy', 'codex'].

11. K1 qualification/readiness/cost/dispatch eligibility evaluated:
    - powershell-local: QUALIFIED=true, READY=true, COST=OPERATOR_INCLUDED_HOST_RUNTIME, DISPATCH=DISPATCH_AUTHORIZED.
    - agy / codex: UNKNOWN_COST / unauthenticated -> skipped fail-closed.

12. Eligible Harness selected:
    Selected: `powershell-local` (no security/containment downgrade).

13. Durable execution job created / tracked:
    Work envelope bound to task aggregate and iteration record.

14. Lease claimed:
    Single active owner claimed per execution boundary.

15. WorkerAssignment constructed:
    Assignment: asg_a4ae7ca3 (workingDirectory: repository root, timeoutMs: 30000).

16. Worker / process started:
    Child process spawned: powershell.exe with arguments `-NoProfile`, `-NonInteractive`, `-Command`, `-`.

17. Process execution completed:
    Script executed via stdin; standard output captured; process exited cleanly.

18. K1 ExecutionResult produced:
    Exit code: 0; stdout: "GRAVITAS_K2_PASS\r\n"; stderr: ""; durationMs: 424.

19. WorkerResult normalized:
    Status: WORKER_REPORTED_SUCCESS; executionId: "exec_5dedb998"; provenanceDigest computed.

20. K0 typed command persisted canonical task / result transition:
    Command: TRANSITION_TASK -> task_c1fcc61b transitioned to SUCCEEDED.

21. Canonical state re-read:
    WorkSessionSnapshot loaded from K0 writer: task verified in SUCCEEDED state.

22. Supervisor evaluated persisted result:
    Input: state + latestResult (WORKER_REPORTED_SUCCESS).
    Contract check: exitCode == 0, output non-empty.

23. Next structured decision produced:
    Decision: COMPLETE_OBJECTIVE [Reason: ALL_TASKS_COMPLETED]
    Rationale: "Task execution succeeded and verified against execution contracts. Objective complete."

24. Expected terminal state reached:
    WorkSession closed-loop session status: COMPLETED.
    Total iterations: 1, Total executions: 1, Total retries: 0.
```

---

## 3. Transient Failure → Retry → Success Scenario (Test 17)

- **Attempt 1**:
  - Worker returns `WORKER_REPORTED_FAILURE` (error: `"Network blip"`).
  - Supervisor evaluates failure: classified as `TRANSIENT_FAILURE`.
  - Retry budget checked: `totalRetries (0) < maxTaskRetries (1)`.
  - Supervisor emits `RETRY_TASK`.
- **Attempt 2**:
  - Worker returns `WORKER_REPORTED_SUCCESS` (output: `"Success on retry"`).
  - Supervisor evaluates success: emits `COMPLETE_OBJECTIVE`.
  - Metrics: `attempt count = 2`, `totalRetries = 1`, `replan count = 0`.
  - Invariant proven: `RETRY != REPLAN`.

---

## 4. Policy Block & Zero-Spend Scenario (Tests 08, 09, 20)

- **Condition**: Harness marked `UNKNOWN_COST` or `UNAUTHENTICATED`.
- **Behavior**:
  - `HarnessRegistry.selectHarness()` filters candidate out.
  - `ExecutorHarnessResolver.resolve()` throws fail-closed error.
  - Zero process dispatch attempted.
  - Zero retries initiated.
  - No fallback to paid or uncontained surfaces.

---

## 5. Unknown External Outcome Scenario (CRASH-C / Test 33d, 45)

- **Sequence**:
  - External process dispatched $\rightarrow$ orchestrator crashes or loses contact before result persistence $\rightarrow$ status cannot be verified.
- **Handling**:
  - Status normalized to `UNKNOWN_EXTERNAL_OUTCOME`.
  - **BLIND RETRY FORBIDDEN**: System does not re-dispatch or re-execute.
  - Supervisor emits `WAIT_FOR_HUMAN` [Reason: `UNKNOWN_EXTERNAL_OUTCOME`].
  - Escalates to sovereign human operator.
