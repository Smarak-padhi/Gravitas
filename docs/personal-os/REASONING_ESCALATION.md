# Personal OS Reasoning Escalation & Sovereign Gate (Wave 12I)

## 1. Architectural Boundary Contract

A foundational principle of Gravitas is that **autonomous reasoning is an expensive escalation, not a default state**.

```
[ Scheduled Trigger / Event ]
              │
              ▼
    [ Deterministic Action ]  (Exit code 0? Clean diff?)
              │
        ┌─────┴─────┐
      Pass         Fail / Requires Architecture
        │                   │
        ▼                   ▼
  [ Success Log ]    [ Reasoning Escalation Gate ]
                            │
                            ├─► Authority: READ / SAFE_WRITE (Auto-spawn bounded worker)
                            │
                            └─► Authority: MUTATE (HALT: Human Sovereign Approval)
```

## 2. Escalation Rules

1. **Deterministic Execution (Default)**:
   - Routine commands (`npm test`, `git status`, `git clean`) run as pure sub-processes.
   - Cost: $0.00 / 0 tokens.
   - Inference latency: 0ms.

2. **Escalation to Reasoning Role**:
   - If a test fails, code drift is detected, or complex diff synthesis is needed, the background job may generate an execution escalation.
   - The escalation constructs a formal `ExecutionContract` specifying:
     - Target Role: `role:engineering:backend-engineer`, `role:engineering:frontend-engineer`, or `role:strategy:chief-planner`.
     - Target Harness: Bound worktree harness with mutation isolation.
     - Budget: Explicit token limit and timeout.

3. **Sovereign Human Approval Gate**:
   - If the reasoning worker or job action requests a commit or mutation to a primary branch (`main` / `master`), the run halts in `WAITING_APPROVAL`.
   - The run manifests on the 3D Headquarters Approval Plinth and the Automations UI "Needs Approval" dashboard.
   - No code is committed to the authoritative branch without explicit, cryptographically verifiable human sign-off (`approveTask` / `approveJobRun`).
   - If rejected, the candidate is discarded into the failure hold with full audit records preserved.
