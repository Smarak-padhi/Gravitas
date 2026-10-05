# GRAVITAS — TARGET BACKEND ARCHITECTURE
## Phase K Foundation: Modular Local-First Control Plane & Kernel (Hardened Edition)

**Document Status:** CANONICAL TARGET SPECIFICATION (Approved in Wave P6 — Hardened)  
**Date:** 2026-10-01  
**Target Implementation Wave:** Phase K (K0 — Durable WorkSession Kernel through K5)  
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

---

## 1. System Overview & Component Diagram

The GRAVITAS Target Backend is a local-first, desktop-native multi-agent control plane designed to execute autonomous and supervised engineering workflows without cloud dependencies, paid orchestrator clusters, or ambient credential exposure.

```mermaid
flowchart TB
    subgraph Presentation ["Presentation Layer (Projection Only)"]
        UI["Desktop Shell / Web UI (apps/web)"]
        CLI["Operator CLI / Control Scripts"]
    end

    subgraph API ["Control Plane API Boundary (Reference Local Transport)"]
        HTTP["Loopback HTTP / SSE Server (apps/server) [Transport details open to P7]"]
    end

    subgraph Kernel ["GRAVITAS Core Kernel (packages/core + packages/orchestrator)"]
        WSK["WorkSession Coordinator"]
        SCHED["Dependency DAG Scheduler (ConcurrencyPolicy)"]
        RES["Role -> Executor -> Harness Resolver (Dispatch-Time Readiness)"]
        TOOL_REG["Capability-First Tool Registry (Zero-Spend Interceptor)"]
        GRANT_ENG["CapabilityGrant Policy Engine"]
        FSM["Explicit State Machine Engine"]
        JOB_ENG["Background Job Engine (SQLite Queue)"]
        RECON["Startup Crash Reconciler"]
        INTEG["Run-Level Integration Coordinator"]
    end

    subgraph Persistence ["Persistence Layer (Single Canonical Writer: Kernel Only)"]
        DB[("gravitas.db (node:sqlite DatabaseSync / WAL)")]
        EV_LOG[("Persistent Events Table (14-Point Provenance)")]
        ART_STORE[(".gravitas/evidence/ (Staged File Storage)")]
    end

    subgraph Execution ["Composable Containment Boundaries"]
        JOB_OBJ["Windows Job Objects (Process-Tree Lifecycle & Limits)"]
        WORKTREE[("Isolated Git Worktrees (WorktreeRetentionPolicy)")]
        HARNESS["Harness Subprocesses (Codex, Claude, agy)"]
        TOOLS["Tool Execution Subprocesses (MCP, Git, Playwright)"]
    end

    UI -->|Local Commands / Queries| HTTP
    CLI -->|Local Commands| HTTP
    HTTP --> WSK
    WSK --> SCHED
    SCHED --> RES
    RES --> GRANT_ENG
    GRANT_ENG --> TOOL_REG
    SCHED --> FSM
    FSM --> DB
    WSK --> DB
    JOB_ENG --> DB
    RECON --> DB
    SCHED --> EV_LOG

    SCHED -->|Spawn & Monitor (Lifecycle Only)| JOB_OBJ
    JOB_OBJ --> WORKTREE
    JOB_OBJ --> HARNESS
    JOB_OBJ --> TOOLS
    WORKTREE -->|Mutation Capture & Diff| SCHED
    SCHED -->|Staged Write & Hash| ART_STORE
    INTEG -->|Materialize Approved Commits| DB
```

---

## 2. Process Topology, IPC & The P7 Boundary

### 2.1 Process Separation
1. **Core Kernel Process (Host Node.js v24 Runtime):**
   - Single long-running host process owning orchestration, state machines, SQLite persistence, and scheduler queues.
   - Acts as the **single canonical database writer**.
   - Runs with standard operator session privileges, but does NOT execute untrusted LLM-generated code directly in-process.
2. **Ephemeral Worker Subprocesses:**
   - External agent CLIs (`agy`, `codex`, `claude`) and tools (Git, Playwright, compilers) are spawned as independent child processes via `node:child_process`.
   - Assigned to **Windows Job Objects** for lifecycle management (process-tree termination, memory limits).
   - **Crucial Boundary Principle:** Windows Job Objects provide *process lifecycle containment*, NOT *security sandboxing*. They do NOT isolate filesystem, network, credentials, or Windows registry.
   - Worker execution occurs strictly inside dedicated Git worktrees located at `.gravitas/worktrees/<taskId>/`.
3. **Desktop Presentation Shell (Wave P7 / Phase D):**
   - Connects to Kernel via local command/query/event interfaces. The UI never touches SQLite files directly; all UI mutations flow through kernel command envelopes.

### 2.2 Local IPC Boundary (Non-Freezing P7 Contract)
- **Classification:** `REFERENCE LOCAL TRANSPORT`.
- The reference implementation uses loopback HTTP/1.1 with Server-Sent Events (SSE) bound to `127.0.0.1`.
- **P7 Authority Preservation:** P6 defines the command/query/event schemas, but P7 retains full authority to select the final native IPC transport (e.g. Windows Named Pipes, local domain sockets, Node.js message ports) when designing the desktop shell runtime.
- **Security:** In the reference HTTP transport:
  - Bound strictly to `127.0.0.1`.
  - Non-GET commands require an ephemeral Bearer token generated at kernel startup and stored in `.gravitas/session.token` with NTFS ACLs restricting read access to the current user SID.
  - Strict `Origin` and `Host` validation prevents DNS rebinding and cross-origin browser access.

---

## 3. Composable Containment Architecture (8 Enforcement Dimensions)

GRAVITAS rejects the false claim that a single mechanism (such as Windows Job Objects or path canonicalization) constitutes an impenetrable sandbox. Containment is structured across **8 distinct dimensions**:

| Containment Dimension | Desired Guarantee | Candidate Mechanism | Current Proven Status | Fallback / Mitigation Behavior | Enforcement Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Process Lifecycle** | Tree termination on exit/timeout; prevent runaway zombie processes | Windows Job Objects (`KILL_ON_JOB_CLOSE`) | `ARCHITECTURAL_INFERENCE` (Requires K-phase probe) | Explicit process-tree kill via `taskkill /PID <pid> /T /F` on timeout | Kernel Subprocess Runner |
| **2. Filesystem Boundary** | Prevent writes outside designated worktree | Path canonicalization (`path.resolve`, `fs.realpathSync`) + OS Token ACLs | Path validation: `PROVEN`; OS Token: `REQUIRES_K_PHASE_VALIDATION` | Pre-commit Git diff inspection detects and blocks out-of-tree mutations | Worktree Manager + Verifier |
| **3. Network Boundary** | Block unauthorized external network access / data exfiltration | Tool Proxy filter; loopback-only binding; offline harness modes | `ARCHITECTURAL_INFERENCE` (Requires K-phase probe) | Tool Registry refuses dispatch to network tools without explicit grant | Capability Policy Engine |
| **4. Credential Boundary** | Prevent raw API keys or secrets from leaking into prompts or evidence | Credential Broker; in-memory ephemeral injection; output scrubbing | `APPROVED_PRIOR_CONTRACT` | Stdio stream redaction of known token prefixes (`sk-*`, `ghp_*`) | Credential Broker |
| **5. Tool Authority** | Tools execute only within authorized parameters and operations | 4-tier capability grant evaluation (Requested $\to$ Authorized $\to$ Enforced $\to$ Observed) | `APPROVED_PRIOR_CONTRACT` | Pre-invocation schema validation; unrecognized tools denied | Tool Registry |
| **6. Worktree Boundary** | Prevent cross-task contamination and primary branch pollution | Dedicated Git worktree per task; detached branch (`task/<taskId>`) | `PROVEN` in `packages/git` | Worktree lifecycle policy; tasks isolated from primary working tree | Git Worktree Manager |
| **7. OS Token / Principal**| Restrict ambient user authority of child processes | Windows Restricted Token / LowIL / AppContainer | `REQUIRES_K_PHASE_VALIDATION` | Run unprivileged where possible; operator confirmation on high-privilege tools | Execution Harness Adapter |
| **8. External Side Effects**| Prevent unintended mutations on external third-party services | Two-phase preview + Sovereign human approval gate | `APPROVED_PRIOR_CONTRACT` | External tools marked `REQUIRES_HUMAN_APPROVAL` block until operator confirms | Approval Engine |

---

## 4. Persistence Model & Single-Writer Architecture

### 4.1 Persistence Engine: Built-in `node:sqlite DatabaseSync`
- **Driver:** Node.js built-in `node:sqlite DatabaseSync`.
- **Zero-Dependency Guarantee:** No external native C++ compilation required on host (eliminates `better-sqlite3` build tool dependency risk on Windows).
- **Core Invariant:**
  $$\mathbf{WORKER\ PROCESS \neq CANONICAL\ DATABASE\ WRITER}$$
  The Kernel process is the **sole writer** to `.gravitas/gravitas.db`. Worker subprocesses and desktop shells NEVER open direct write connections to the canonical database; all mutations pass through validated Kernel command envelopes.

### 4.2 SQLite Contention & Durability Policy
Instead of freezing arbitrary constants, database behavior is governed by explicit policies:

```typescript
export interface SQLiteContentionPolicy {
  readonly busyTimeoutMs: number          // [NON-NORMATIVE EXAMPLE: 5000ms; REQUIRES_K_PHASE_CALIBRATION]
  readonly maxRetries: number             // [NON-NORMATIVE EXAMPLE: 3; REQUIRES_K_PHASE_CALIBRATION]
  readonly retryBackoffMs: number         // [NON-NORMATIVE EXAMPLE: 50ms; REQUIRES_K_PHASE_CALIBRATION]
  readonly onContentionTimeout: 'ABORT' | 'WAIT_WITH_ALERT'
}

export interface SQLiteDurabilityPolicy {
  readonly journalMode: 'WAL'             // Architectural choice: WAL for single-writer/multi-reader
  readonly synchronous: 'NORMAL' | 'FULL' // Default: NORMAL (trade-off: high throughput on SSD; FULL configurable for maximum power-loss durability)
  readonly foreignKeys: boolean           // Default: true (enforces referential integrity)
}
```

- **Durability Trade-off:** `synchronous = NORMAL` in WAL mode provides ACID guarantees against application crashes and high NVMe write throughput. It is vulnerable to OS-level kernel panics before WAL cache syncs. Where absolute power-loss durability is required, `SQLiteDurabilityPolicy.synchronous` is configured to `FULL`.

### 4.3 SQL Injection Defense Contract
- **Contract:**
  1. `UNTRUSTED VALUES MUST USE BOUND PARAMETERS`: All runtime values, user inputs, task payloads, and external strings MUST be bound via positional (`?`) or named parameters. Dynamic string interpolation into SQL query bodies is strictly forbidden.
  2. `DYNAMIC SQL STRUCTURE MUST COME FROM TRUSTED ENUMERATED/VALIDATED SOURCES`: Dynamic identifiers (table names, column names for sorting, migration scripts) must be drawn exclusively from hardcoded TypeScript enum constants or compile-time whitelists.

---

## 5. Scheduling, Concurrency & Worktree Lifecycle

### 5.1 Concurrency Policy
- **Policy Contract:** Concurrency is NOT a hardcoded constant. The policy shape is architectural; exact defaults are non-normative and require Phase K calibration. It is governed by `ConcurrencyPolicy`:
  ```typescript
  export interface ConcurrencyPolicy {
    readonly maxConcurrentTasks: number     // [NON-NORMATIVE EXAMPLE: 4; REQUIRES_K_PHASE_CALIBRATION]
    readonly maxMemoryPressureThresholdMb: number // [NON-NORMATIVE EXAMPLE: 512; REQUIRES_K_PHASE_CALIBRATION]
    readonly rateLimitQuotaBackoff: boolean
    readonly perProviderConcurrencyLimits: Record<string, number>
  }
  ```
  Concurrency dynamically scales down when memory pressure increases or provider rate limits are approached.

### 5.2 Worktree Retention Policy (Removing Blind `remove --force`)
- **Policy Contract:** Worktrees are NOT blindly deleted immediately upon task completion or failure. Worktrees transition through an explicit lifecycle:
  $$\text{ACTIVE} \rightarrow \text{COMPLETED\_PENDING\_EVIDENCE} \rightarrow \text{FAILED\_RETAINED} \rightarrow \text{APPROVED\_FOR\_CLEANUP} \rightarrow \text{CLEANED}$$
  - **Failed Worktrees:** Retained in `FAILED_RETAINED` state to allow the operator or specialist to inspect the exact failing workspace state, unstaged files, and debug logs.
  - **Cleanup Gate:** Cleanup occurs only when the task is `APPROVED_FOR_CLEANUP` or the run completes successfully.
  - **Human Safety:** Uncommitted human modifications in a worktree are NEVER forcefully deleted.

---

## 6. Dynamic Dispatch-Time Readiness vs. Qualification Snapshot

P3/P4 established sequential qualification. P6 hardens the distinction between a static snapshot and live readiness:
- **`Qualification Snapshot`:** Records historical verification that a harness or tool *can* run (`DISCOVERED` $\to \dots \to$ `QUALIFIED`).
- **`Dispatch-Time Readiness`:** Re-evaluated dynamically at the exact millisecond of task dispatch:
  1. Process Reachability: Is the binary/daemon currently reachable?
  2. Authentication: Is the local credential valid and unexpired?
  3. Provider Health: Is the model endpoint online?
  4. Quota / Rate Limits: Is the free quota unexhausted?
  5. Zero-Spend Check: Is the operation $\Delta\text{Spend} = \$0.00$?
  6. Containment Availability: Is the designated containment layer accessible?
  If any dynamic check fails, dispatch halts or falls back to an eligible alternative.

---

## 7. Evidence Store & Staged Consistency Protocol

### 7.1 Integrity vs. Tamper Resistance
- **Content Integrity:** Verified via cryptographic SHA-256 digests. Proves that evidence files have not suffered bit-rot or accidental corruption.
- **External Tamper Resistance:** Local SHA-256 digests do NOT create an external trust anchor against a hostile local administrator. True non-repudiation requires external signing (deferred to future human authority).

### 7.2 Staged Artifact Consistency Protocol
SQLite and NTFS do NOT share a single atomic transaction. Cross-resource atomicity across filesystem files and SQLite records is physically unavailable on host OSs.
$$\mathbf{CROSS\text{-}RESOURCE\ ATOMICITY\ IS\ UNAVAILABLE}$$
$$\mathbf{PARTIAL\ STATES\ MUST\ BE\ DETECTABLE + RECONCILABLE}$$

The staged protocol sequences writes:
$$\text{TEMP WRITE} \rightarrow \text{FSYNC / FINALIZE} \rightarrow \text{COMPUTE HASH} \rightarrow \text{SQLITE COMMIT} \rightarrow \text{RENAME TO VISIBLE}$$

There is an unavoidable crash window between the SQLite commit and the filesystem rename. The Startup Reconciler handles all 5 partial states:
- **Case A (Temp artifact exists; DB metadata does NOT exist):** Detects unreferenced temporary artifact in `.gravitas/evidence/tmp/`; quarantines or safely cleans according to `WorktreeRetentionPolicy`.
- **Case B (DB metadata exists; Temp artifact exists; Final artifact does NOT exist):** Occurs if process crashed immediately post-commit before rename. Reconciler verifies temp file digest against committed `content_sha256`. If valid, it completes the rename to final path; if corrupt, marks evidence `RECOVERY_REQUIRED`.
- **Case C (Final artifact exists; DB metadata does NOT exist):** Unreferenced artifact found on disk. Quarantined; never silently promoted to canonical status.
- **Case D (DB metadata exists; Final artifact exists; Digest matches):** Normal consistent state.
- **Case E (DB metadata exists; Final artifact exists; Digest does NOT match):** Critical integrity violation. Marks task `INTEGRITY_CHECK_FAILED`, quarantines file, and halts dependent approval and integration.

---

## 8. Cross-Resource Consistency: Git $\leftrightarrow$ SQLite

Git commits and SQLite transactions cannot participate in a single shared ACID transaction. Rather than claiming two-phase protocols "prevent" desynchronization, the architecture ensures that **partial states are detectable and reconcilable**:
1. **Phase 1 (Git Prepare):** Task commit is created on `task/<taskId>` branch in the isolated worktree. Commit SHA is captured.
2. **Phase 2 (SQLite Commit):**
   ```sql
   BEGIN IMMEDIATE;
   UPDATE tasks SET verified_commit_sha = ?, state = 'SUCCEEDED' WHERE id = ?;
   INSERT INTO events (event_type, task_id, payload_json, ...) VALUES ('TaskSucceeded', ?, ...);
   COMMIT;
   ```
3. **Reconciliation of Partial States:**
   - **`GIT_COMMIT_SUCCEEDED_DB_RECORD_FAILED`:** Git commit exists on `task/<taskId>` branch, but SQLite has no record or records task as `RUNNING`/`INTERRUPTED`. Startup Reconciler audits Git branch, detects unrecorded commit SHA, and completes DB record or transitions to `RECOVERY_REQUIRED` for operator review.
   - **`DB_EXPECTATION_EXISTS_GIT_OBJECT_MISSING`:** SQLite records `verified_commit_sha = <sha>`, but `git cat-file -e <sha>` fails in the repository object database. Startup Reconciler flags this as a critical missing-object anomaly, transitions task to `RECOVERY_REQUIRED`, blocks dependent merges, and alerts operator. No evidence is automatically destroyed.

---

## 9. Contextual Human Approval Binding

Human approval records in SQLite are cryptographically bound to the complete execution context:
```sql
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  work_session_id TEXT NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  base_commit_sha TEXT NOT NULL,
  candidate_commit_sha TEXT NOT NULL,
  evidence_digest_sha256 TEXT NOT NULL,
  policy_version INTEGER NOT NULL,
  capability_grant_snapshot_digest TEXT NOT NULL,
  authorized_scope TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('PENDING', 'APPROVED', 'REJECTED')),
  decision_by TEXT,
  decision_at TEXT,
  is_stale INTEGER NOT NULL DEFAULT 0
);
```
- **Anti-Replay Invariant:** If the base commit, candidate commit, evidence digest, or capability grant snapshot changes, the approval hash mismatches and the approval is rejected as **STALE**.

---

## 10. Zero-Spend Mid-Flight Protection

$$\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$$

- **Mid-Flight State Transition:** If an external provider transitions a tool or model from free to billable, or if an account quota exhausts during a multi-step execution:
  1. The pre-invocation interceptor halts execution **immediately before the next billable side effect**.
  2. The task transitions to `BILLING_STATE_CHANGED`.
  3. Autonomy pauses. The operator receives an escalation prompt offering safe local fallback or explicit human spend authorization.
  4. Invariant: Already-issued external side effects cannot be undone, but **zero further spend is incurred autonomously**.
