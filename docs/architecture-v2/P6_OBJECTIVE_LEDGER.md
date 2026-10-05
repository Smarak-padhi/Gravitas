# GRAVITAS — WAVE P6 OBJECTIVE LEDGER (HARDENING LOOP)
## Target Backend Architecture & Control Plane Decision Tracking

**Status:** COMPLETE — FINAL MICRO-CORRECTIONS APPLIED — READY FOR HUMAN REVIEW  
**Wave:** P6 — Target Backend Architecture  
**Date:** 2026-10-01  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants:**
- $\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$
- $\text{CAPABILITY} \neq \text{TOOL} \neq \text{TRANSPORT} \neq \text{CREDENTIAL} \neq \text{AUTHORITY}$
- $\text{TOOL DECLARATION} \neq \text{TOOL QUALIFICATION} \neq \text{TOOL AUTHORIZATION} \neq \text{TOOL EXECUTION}$
- $\text{DISCOVERY} \neq \text{INSTALLATION} \neq \text{AUTHENTICATION} \neq \text{TRUST}$
- $\text{ARCHITECTURE CONTRACT} \neq \text{CURRENT IMPLEMENTATION}$
- $\text{VISUAL WORLD} = \text{PROJECTION OF RUNTIME STATE}$
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$
- $\mathbf{AGENT\_PAYMENT\_AUTHORITY = NONE}$
- $\mathbf{UNKNOWN \neq ASSUMED}$
- $\mathbf{HUMAN\ DECISION \neq AGENT\ CONSENSUS}$
- $\mathbf{P6\ TARGET\ ARCHITECTURE \neq CURRENT\ P2\ RUNTIME}$
- $\mathbf{DURABILITY \neq IN\text{-}MEMORY\ CACHE}$
- $\mathbf{EVENT\ DELIVERY \neq STATE\ AUTHORITY}$
- $\mathbf{SCHEDULER \neq PERSISTENCE}$
- $\mathbf{QUEUE \neq STATE\ MACHINE}$
- $\mathbf{ONE\ CANONICAL\ OWNER\ PER\ MUTABLE\ DOMAIN}$
- $\mathbf{PROCESS\ LIFECYCLE\ CONTAINMENT \neq AUTHORITY\ CONTAINMENT}$
- $\mathbf{WORKER\ PROCESS \neq CANONICAL\ DATABASE\ WRITER}$
- $\mathbf{TIMEOUT \neq FAILURE}$
- $\mathbf{PROCESS\ TERMINATED \neq EXTERNAL\ SIDE\ EFFECT\ REVERSED}$
- $\mathbf{ARCHITECTURE\ DECISION\ READY \neq IMPLEMENTATION\ EMPIRICALLY\ PROVEN}$
- $\mathbf{CROSS\text{-}RESOURCE\ ATOMICITY\ IS\ UNAVAILABLE}$
- $\mathbf{PARTIAL\ STATES\ MUST\ BE\ DETECTABLE\ +\ RECONCILABLE}$
- $\mathbf{POLICY\ SHAPE\ =\ ARCHITECTURAL}$
- $\mathbf{UNVALIDATED\ NUMERIC\ DEFAULT\ =\ NON\text{-}NORMATIVE}$

---

## 1. Lifecycle Progression States
`REOPENED` $\to$ `RESEARCHED` $\to$ `HARDENED` $\to$ `SCENARIO_VALIDATED` $\to$ `ADVERSARIALLY_REVIEWED` $\to$ `COMPLETE`

---

## 2. Evidence Classification Standard

Every decision and claim in Wave P6 is rigorously classified under one of the following evidence tiers:
1. **`LIVE_HOST_PROBE`**: Directly verified via empirical command execution on the host machine during Wave P6.
2. **`REPOSITORY_OBSERVATION`**: Directly observed in tracked or untracked repository code and manifests.
3. **`OFFICIAL_PLATFORM_CAPABILITY`**: Documented feature of Node.js v24 runtime, Windows OS, or SQLite specifications.
4. **`APPROVED_PRIOR_CONTRACT`**: Governed by human-approved architectural invariants from Waves P0 through P5.
5. **`ARCHITECTURAL_INFERENCE`**: Logically derived design requirement based on system constraints.
6. **`REQUIRES_K_PHASE_VALIDATION`**: Architectural decision is clear and decision-ready, but full operational validation is deferred to Phase K implementation.

---

## 3. Reopened Architectural Decisions (Hardening Ledger)

| # | Architecture Domain | Target Decision / Hardened Contract | Evidence Tier | Hardening Status | Primary Artifact Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Overall Kernel Architecture** | Modular Local-First Kernel: Supervisor/Worker Loop + Durable WorkSession Coordinator + Pluggable Adapters | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `TARGET_BACKEND_ARCHITECTURE.md` |
| **02** | **Process Topology** | Multi-Process Architecture: Core Kernel Service (Node.js) + Ephemeral Worker Subprocesses; Windows Job Objects for process lifecycle, NOT security sandbox | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `TARGET_BACKEND_ARCHITECTURE.md`, `P6_SECURITY_REVIEW.md` |
| **03** | **Persistence Model** | Embedded SQLite via built-in `node:sqlite DatabaseSync` (WAL mode, `SQLiteContentionPolicy`, configurable `synchronous`); numeric defaults marked `[NON-NORMATIVE EXAMPLE; REQUIRES_K_PHASE_CALIBRATION]`; `better-sqlite3` classified as unprobed/uninstalled with native addon dependency risk | `LIVE_HOST_PROBE` + `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P6_DATA_AND_PERSISTENCE_MODEL.md`, `P6_BACKEND_DECISION_PACKET.md` |
| **04** | **Canonical Source of Truth** | SQLite ACID Database (`gravitas.db`) owns all mutable state; **Single Canonical Writer Model**: Kernel writes, workers NEVER open canonical DB | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `TARGET_BACKEND_ARCHITECTURE.md`, `P6_DATA_AND_PERSISTENCE_MODEL.md` |
| **05** | **Event Architecture** | State + Persistent Audit Event Log (`events` table); State commit + event failure = transaction rollback; ephemeral in-process EventEmitter (`AT_MOST_ONCE`); global autoincrement commit ordering | `ARCHITECTURAL_INFERENCE` + `REQUIRES_K_PHASE_VALIDATION` | `COMPLETE` | `P6_EVENTING_AND_JOB_MODEL.md` |
| **06** | **Scheduling Architecture** | Dependency DAG Scheduler with DB-backed Task states, lease claims, Wait-For Graph cycle detection; concurrency governed by `ConcurrencyPolicy` (numeric defaults marked `[NON-NORMATIVE EXAMPLE; REQUIRES_K_PHASE_CALIBRATION]`) | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `TARGET_BACKEND_ARCHITECTURE.md` |
| **07** | **Durable Job Execution** | SQLite-backed job queue with atomic occurrence claims (`occurrence_claims` table), heartbeat leasing, and restart reconciliation (`AT_LEAST_ONCE`) | `REPOSITORY_OBSERVATION` + `REQUIRES_K_PHASE_VALIDATION` | `COMPLETE` | `P6_EVENTING_AND_JOB_MODEL.md` |
| **08** | **State-Machine Architecture** | Explicit deterministic FSMs for WorkSession, Run, Task, ExecutorLease, and Approval; crash recovery distinguishes `INTERRUPTED`, `RECOVERY_REQUIRED`, `UNKNOWN_EXTERNAL_OUTCOME` | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `TARGET_BACKEND_ARCHITECTURE.md`, `P6_FAILURE_RECOVERY_AND_IDEMPOTENCY.md` |
| **09** | **Role/Executor/Harness Resolution**| Dynamic 3-stage resolution: Task $\to$ Role $\to$ Executor $\to$ Harness; dynamic dispatch-time readiness revalidation (reachability, auth, quota, billing) | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `TARGET_BACKEND_ARCHITECTURE.md` |
| **10** | **Tool Registry Integration** | Capability-First Tool Registry: Task capability requirement $\to$ ToolRegistry $\to$ Scope $\to$ CostEligibility $\to$ Human Gate | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `TARGET_BACKEND_ARCHITECTURE.md` |
| **11** | **Capability Enforcement Contracts**| Strict 8-dimension containment layers: Process Lifecycle, Filesystem, Network, Credential, Tool Authority, Worktree, OS Token, External Side Effects; path validation != filesystem sandbox | `APPROVED_PRIOR_CONTRACT` + `REQUIRES_K_PHASE_VALIDATION` | `COMPLETE` | `TARGET_BACKEND_ARCHITECTURE.md`, `P6_SECURITY_REVIEW.md` |
| **12** | **Worktree/Execution Lifecycle** | `WorktreeRetentionPolicy` (ACTIVE, COMPLETED_PENDING_EVIDENCE, FAILED_RETAINED, APPROVED_FOR_CLEANUP, QUARANTINED, CLEANED); no blind `remove --force` | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `TARGET_BACKEND_ARCHITECTURE.md`, `P6_FAILURE_RECOVERY_AND_IDEMPOTENCY.md` |
| **13** | **Evidence Architecture** | Staged artifact protocol (`TEMP WRITE` $\to$ `FSYNC` $\to$ `HASH` $\to$ `DB COMMIT` $\to$ `RENAME`); cross-resource atomicity unavailable; partial states explicitly modeled (Cases A through E) | `ARCHITECTURAL_INFERENCE` + `REQUIRES_K_PHASE_VALIDATION` | `COMPLETE` | `P6_DATA_AND_PERSISTENCE_MODEL.md`, `TARGET_BACKEND_ARCHITECTURE.md` |
| **14** | **Approval Architecture** | Durable Human Approval bound to `taskId`, `candidateCommitSha`, `evidenceDigest`, `authorizedScope`, `runId`, `workSessionId`, `baseCommitSha`, `policyVersion`, `grantSnapshotDigest` | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `TARGET_BACKEND_ARCHITECTURE.md`, `P6_DATA_AND_PERSISTENCE_MODEL.md` |
| **15** | **Final Integration / Materialization**| Run-level integration coordinator: sequential merge/cherry-pick of approved task commits; verification of candidate; NO auto-merge to protected branches | `APPROVED_PRIOR_CONTRACT` + `REQUIRES_K_PHASE_VALIDATION` | `COMPLETE` | `TARGET_BACKEND_ARCHITECTURE.md` |
| **16** | **Background Execution Model** | Dedicated background execution service inside kernel managing recurring jobs, calendar sync, and health checks | `REPOSITORY_OBSERVATION` | `COMPLETE` | `P6_EVENTING_AND_JOB_MODEL.md` |
| **17** | **Cancellation Propagation** | Hierarchical cancellation tokens; process termination distinguished from external side-effect reversal (`PROCESS TERMINATED \neq REVERSED`) | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P6_FAILURE_RECOVERY_AND_IDEMPOTENCY.md` |
| **18** | **Retry & Idempotency Model** | Operation-aware `IdempotencyPolicy`; distinction between local duplicate suppression, provider-supported idempotency, and post-hoc side-effect reconciliation; `TIMEOUT \neq FAILURE` | `ARCHITECTURAL_INFERENCE` + `REQUIRES_K_PHASE_VALIDATION` | `COMPLETE` | `P6_FAILURE_RECOVERY_AND_IDEMPOTENCY.md` |
| **19** | **Restart & Crash Recovery** | Startup reconciliation scanner; Git $\leftrightarrow$ DB reconciliation (`GIT_COMMIT_SUCCEEDED_DB_RECORD_FAILED`, `DB_EXPECTATION_EXISTS_GIT_OBJECT_MISSING`) and Filesystem $\leftrightarrow$ DB crash window (Cases A through E); handling of `UNKNOWN_EXTERNAL_OUTCOME` | `ARCHITECTURAL_INFERENCE` + `REQUIRES_K_PHASE_VALIDATION` | `COMPLETE` | `P6_FAILURE_RECOVERY_AND_IDEMPOTENCY.md`, `TARGET_BACKEND_ARCHITECTURE.md` |
| **20** | **Concurrency & Contention** | `SQLiteContentionPolicy` (policy interface architectural; busy timeout, backoff, and retries marked `[NON-NORMATIVE EXAMPLE; REQUIRES_K_PHASE_CALIBRATION]`); Single-writer kernel transaction queue | `ARCHITECTURAL_INFERENCE` + `REQUIRES_K_PHASE_VALIDATION` | `COMPLETE` | `P6_DATA_AND_PERSISTENCE_MODEL.md`, `TARGET_BACKEND_ARCHITECTURE.md` |
| **21** | **Idempotency Architecture** | Operation-aware keys binding to operation type, normalized payload, target resource, run/task ID, auth scope, and attempt ID | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P6_FAILURE_RECOVERY_AND_IDEMPOTENCY.md` |
| **22** | **Schema Migration Strategy** | Versioned synchronous migration runner (`schema_migrations` table), pre-migration DB backup, atomic transaction per migration | `REPOSITORY_OBSERVATION` + `REQUIRES_K_PHASE_VALIDATION` | `COMPLETE` | `P6_DATA_AND_PERSISTENCE_MODEL.md`, `P6_MIGRATION_PLAN.md` |
| **23** | **Observability Model** | Zero-spend local structured JSON logging + Event trace + Task telemetry timeline + health metrics endpoint | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `TARGET_BACKEND_ARCHITECTURE.md` |
| **24** | **Security & Privilege Boundaries** | STRIDE review with disciplined non-absolute language; parameterized untrusted values + enumerated SQL structure; loopback HTTP/SSE classified as `REFERENCE LOCAL TRANSPORT` (P7 remains free) | `ARCHITECTURAL_INFERENCE` + `REQUIRES_K_PHASE_VALIDATION` | `COMPLETE` | `P6_SECURITY_REVIEW.md` |
| **25** | **Zero-Spend Enforcement** | Hard runtime spend ceiling ($\$0.00$); mid-flight billing eligibility change halts execution before next billable side effect (`BILLING_STATE_CHANGED`) | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `TARGET_BACKEND_ARCHITECTURE.md`, `P6_SECURITY_REVIEW.md` |

---

## 4. Required Deliverable Artifacts (Hardened Set)

| Deliverable Artifact | Description | Hardening Status |
| :--- | :--- | :--- |
| `P6_OBJECTIVE_LEDGER.md` | This tracking ledger | `COMPLETE` |
| `P6_BACKEND_DECISION_PACKET.md` | Architecture Arena Decision Packet with corrected evidence discipline | `COMPLETE` |
| `TARGET_BACKEND_ARCHITECTURE.md` | Canonical Target Backend Architecture specification (hardened) | `COMPLETE` |
| `P6_DATA_AND_PERSISTENCE_MODEL.md` | Target DB entities, schemas, contention/durability policies, cross-resource protocols | `COMPLETE` |
| `P6_EVENTING_AND_JOB_MODEL.md` | Event taxonomy, atomicity rollback, delivery/ordering semantics, durable jobs | `COMPLETE` |
| `P6_FAILURE_RECOVERY_AND_IDEMPOTENCY.md`| Crash recovery, 16 failure scenarios, operation-aware idempotency, UNKNOWN_EXTERNAL_OUTCOME | `COMPLETE` |
| `P6_MIGRATION_PLAN.md` | Source mapping (REUSE/ADAPT/REWRITE/DEPRECATE/REMOVE) | `COMPLETE` |
| `P6_SECURITY_REVIEW.md` | Adversarial security review with composable containment layers and non-absolute language | `COMPLETE` |
