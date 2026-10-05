# ARCHITECTURE DECISION PACKET: WAVE P6 TARGET BACKEND & CONTROL PLANE ARCHITECTURE
## Formal Multi-Agent Decision Packet for Wave P6 (Hardened Edition)

**Packet ID:** `ADP-P6-001-REV1`  
**Date:** 2026-10-01  
**Status:** PROPOSED FINAL DECISION — READY FOR HUMAN REVIEW  
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
- $\mathbf{CROSS\text{-}RESOURCE\ ATOMICITY\ IS\ UNAVAILABLE}$
- $\mathbf{PARTIAL\ STATES\ MUST\ BE\ DETECTABLE\ +\ RECONCILABLE}$
- $\mathbf{POLICY\ SHAPE\ =\ ARCHITECTURAL}$
- $\mathbf{UNVALIDATED\ NUMERIC\ DEFAULT\ =\ NON\text{-}NORMATIVE}$

---

## 1. Architectural Question
> What backend, persistence, process topology, scheduling, eventing, and durability architecture should GRAVITAS actually implement in Phase K to replace the current incomplete P2 runtime and safely realize the desktop-first multi-agent operating system?

---

## 2. Hard Constraints Filter

| Constraint | Requirement | Evaluation Standard |
| :--- | :--- | :--- |
| **C1: Zero-Spend Invariant** | Must operate at $\mathbf{\Delta\text{Spend} = \$0.00}$. No mandatory cloud databases, paid queues, or hosted workflow engines. | Pass / Fail |
| **C2: Local-First Desktop OS** | Runs entirely on a single Windows 11 host (offline-capable; no container cluster daemon prerequisites). | Pass / Fail |
| **C3: Crash Durability** | WorkSessions, Runs, Tasks, Leases, and Approvals must survive process termination, system reboot, or unexpected crashes. | Pass / Fail |
| **C4: Invariant Separation** | Strictly preserves $\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$. | Pass / Fail |
| **C5: Tool Authority & Containment** | Capability-First Tool Registry with 8-dimension containment layers. | Pass / Fail |
| **C6: Human Sovereignty** | Human approval gates cannot be bypassed; approval records are durably bound to exact commits, evidence digests, and contextual scope. | Pass / Fail |
| **C7: Low Resource Footprint** | Kernel idle memory $< 200\text{MB}$; fast startup $(< 1.5\text{s})$; zero native build tool dependencies on host. | Pass / Fail |

---

## 3. Current-State Evidence (P2 Forensics + Live Probes)

1. **Toolchain Reality:** Node.js `v24.13.0`, npm `11.6.2`, Git `2.54.0.windows.1` [PROVEN via direct host command]. C++ build tools (`node-gyp`, Visual Studio compiler), Python build tools, Rust/cargo, and Go are completely absent from `PATH` [PROVEN].
2. **Current Scheduler (`packages/orchestrator/src/scheduler.ts`):** High-quality DAG resolution logic, but relies entirely on volatile in-memory `Map`s and `Set`s (`tasks`, `taskDefinitions`, `activeAllocations`, `materializedCommits`) [REPOSITORY_OBSERVATION]. Process restart loses all state. Single global harness injected (`options.harness`) [REPOSITORY_OBSERVATION].
3. **Current Persistence Precedents:** `packages/orchestrator/src/jobs/sqliteJobStore.ts` and `sqliteConnectorStore.ts` already adopted Node.js `node:sqlite DatabaseSync` with WAL mode, busy timeout (`5000ms` [NON-NORMATIVE EXAMPLE; REQUIRES_K_PHASE_CALIBRATION]), foreign keys `ON`, and versioned migrations [REPOSITORY_OBSERVATION].
4. **Execution Surfaces:** Antigravity CLI `agy` (`CAPABILITY_PROBED`), Playwright MCP (`CAPABILITY_PROBED`), Codex CLI (`INSTALLED`, unauthenticated), Claude Code (`INSTALLED`, unauthenticated), Free Claude Code (`INSTALLED`, unauthenticated) [APPROVED_PRIOR_CONTRACT].

---

## 4. Evaluated Architectural Candidates

### Candidate A: Pure In-Process Monolith (Evolved P2)
- *Topology:* Single Node.js process running everything in-process.
- *Persistence:* In-memory arrays with periodic JSON dump.
- *Trade-Offs:* Simplest call stack, but volatile state and unhandled promise rejections take down the entire OS; violates C3. **REJECTED**.

### Candidate B: Heavy Distributed Workflow Cluster (Temporal / Cadence / Windmill)
- *Topology:* Multi-container Docker cluster running Temporal/Postgres/Elasticsearch + Node.js worker daemons.
- *Trade-Offs:* High workflow durability, but violates C2 (requires multi-container Docker daemon on Windows desktop); violates C7 ($> 1.5\text{GB}$ idle footprint); alien RPC conventions over P3 envelopes. **REJECTED UNDER DESKTOP-FIRST CONSTRAINTS**.

### Candidate C: Embedded Event-Sourced Kernel (Pure Event Sourcing)
- *Topology:* Node.js kernel where all state is derived solely by replaying an append-only event stream from SQLite.
- *Trade-Offs:* Ultimate auditability, but relational queries (e.g. DAG readiness, active lease lookups) require complex in-memory projection reconstruction; high event schema migration and snapshot compaction overhead. **REJECTED IN FAVOR OF STATE + AUDIT LOG**.

### Candidate D (The Selected Architecture): Durable Local-First Kernel with SQLite Relational State + Persistent Audit Log + Ephemeral Subprocesses
- *Topology:* Single Node.js Core Kernel process hosting orchestration, state machines, SQLite persistence, and reference local control API (loopback HTTP/SSE; transport decision preserved for P7). External CLI harnesses (`agy`, Codex, Claude) and deterministic tools run as ephemeral child subprocesses.
- *Persistence:* Embedded SQLite via Node.js built-in `node:sqlite DatabaseSync`. Relational tables for canonical state (`work_sessions`, `runs`, `tasks`, `leases`, `approvals`, `jobs`) + append-only `events` table for 14-point audit provenance + file-backed artifact store (`.gravitas/evidence/`).
- *Eventing:* Dual-tier eventing: Durable event log in SQLite (`events` table) committed synchronously with entity transitions + in-process typed `EventEmitter` for zero-latency dispatcher wakeup.
- *Scheduling:* Database-backed DAG scheduler with dynamic Role $\to$ Executor $\to$ Harness resolution, Wait-For Graph cycle detection, and startup crash recovery (`Startup Reconciler`).
- *Eligibility:* **PASS ALL CONSTRAINTS (C1 through C7)**.

---

## 5. Active Contradictions & Evidence-Disciplined Resolutions

### Contradiction CON-P6-01: `node:sqlite` vs `better-sqlite3` on Node.js v24.13.0
- **Careful Evidence Separation:**
  1. **`better-sqlite3` Status:**
     - Classification: `NOT INSTALLED`, `NOT PROBED`.
     - Reason: In accordance with P0/P6 operational freeze rules, `npm install better-sqlite3` was **NOT** executed.
     - Toolchain Evidence: Host inspection proved that C++ build tools (`node-gyp`, Visual Studio build tools) are absent from `PATH`.
     - Risk Assessment: `better-sqlite3` is a compiled native C++ addon. While prebuilt binary wheels exist for standard platforms, any mismatch, ABI drift, or fallback to source compilation on this machine would encounter missing build tools. Introducing a compiled native addon when a built-in module is available adds unnecessary dependency risk (`REUSE > ADD_DEPENDENCY`).
     - Note: An "installation failure" was **NOT** observed because installation was prohibited; rather, the dependency is avoided based on toolchain audit evidence.
  2. **`node:sqlite` Status:**
     - Classification: `LIVE_HOST_PROBE` (Empirically verified on host).
     - Verified Capabilities: Direct host commands confirmed that Node.js `v24.13.0` includes built-in `node:sqlite DatabaseSync`. Probes verified in-memory DB, disk DB with `PRAGMA journal_mode = WAL`, transactions (`BEGIN`/`COMMIT`), prepared statements (`run`, `all`, `iterate`), prototype methods (`function`, `loadExtension`, `createSession`), and synchronous statement execution.
     - Documented Status: Officially documented as experimental in Node.js v24.
     - Architectural Justification: Zero external dependencies; zero native build compilation on host; already successfully utilized in repository `SqliteJobStore` and `sqliteConnectorStore`.
- **Resolution:** **Adopt `node:sqlite DatabaseSync` for the target persistence engine.** Implementation-level stress testing is categorized as `REQUIRES_K_PHASE_VALIDATION`.

### Contradiction CON-P6-02: State + Audit Log vs Pure Event Sourcing
- **Resolution:** **Adopt State + Audit Log.** Relational tables provide immediate ACID queries for DAG readiness, foreign-key integrity, and instantaneous startup recovery without replaying thousands of historical events. The append-only `events` table preserves 14-point audit provenance.

---

## 6. Detailed Architectural Contracts Summary

1. **Kernel Structure:** Modular local-first kernel (`packages/core` + `packages/orchestrator`) exposing a local control API. P7 retains full authority to select the desktop runtime and final native IPC transport (e.g. named pipes vs loopback HTTP).
2. **Single Canonical Writer Model:** The Kernel process is the **sole writer** to `.gravitas/gravitas.db`. Worker subprocesses **NEVER** open direct write connections to the canonical database; all updates flow through validated Kernel command envelopes.
3. **Composable Containment Layers:** Windows Job Objects provide process-lifecycle containment (tree termination, memory limits). They do NOT provide security sandboxing. Filesystem containment uses a layered approach (worktree scoping, path validation defense, with OS token containment designated for Phase K validation).
4. **Policy-Driven Parameters:** Magic numbers removed from architecture contracts; unvalidated numeric defaults marked `[NON-NORMATIVE EXAMPLE; REQUIRES_K_PHASE_CALIBRATION]`:
   - Concurrency is governed by `ConcurrencyPolicy` (host resources, quotas, memory; numeric examples requiring calibration).
   - Database contention is governed by `SQLiteContentionPolicy` (busy timeout, backoff, cancellation; numeric examples requiring calibration).
   - Worktree retention is governed by `WorktreeRetentionPolicy` (retention on failure for debugging; no blind `remove --force`).
5. **Contextual Human Approval:** Approval records in SQLite are cryptographically bound to `(taskId, candidateCommitSha, evidenceDigest, authorizedScope, runId, workSessionId, baseCommitSha, policyVersion)`. Any change invalidates the approval as **STALE**.
6. **Zero-Spend Mid-Flight Protection:** If cost eligibility transitions from free to billable mid-flight, execution immediately halts before the next billable side effect (`BILLING_STATE_CHANGED`).
7. **Cross-Resource Consistency & Detectable Partial States:**
   - Governing invariants: $\mathbf{CROSS\text{-}RESOURCE\ ATOMICITY\ IS\ UNAVAILABLE}$, $\mathbf{PARTIAL\ STATES\ MUST\ BE\ DETECTABLE\ +\ RECONCILABLE}$.
   - Filesystem $\leftrightarrow$ SQLite crash window between DB commit and final rename is explicitly modeled into Cases A through E (orphan temp, post-commit crash, orphan final, clean match, digest mismatch).
   - Git $\leftrightarrow$ SQLite reconciliation states are explicitly modeled (`GIT_COMMIT_SUCCEEDED_DB_RECORD_FAILED` and `DB_EXPECTATION_EXISTS_GIT_OBJECT_MISSING`). Staged two-phase commits do not eliminate the crash window; they make partial states detectable and safely reconcilable.

---

## 7. Deferred K-Phase Implementation Validations

The following operational validations are explicitly deferred to Phase K implementation experiments:
1. **`EXP-K-01` (Windows Containment Layering):** Implementation and empirical validation of Windows Restricted Tokens / LowIL / AppContainer for filesystem and network confinement alongside Job Objects.
2. **`EXP-K-02` (Concurrent SQLite Stress):** Empirical benchmarking of `node:sqlite DatabaseSync` under sustained high-throughput task streaming, WAL checkpointing, and contention backoff.
3. **`EXP-K-03` (Crash Recovery Simulation):** Injecting process termination across the 16 failure scenarios and verifying automated recovery via `Startup Reconciler`.
4. **`EXP-K-04` (Cross-Resource Consistency):** Validating the staged artifact protocol and Git $\leftrightarrow$ DB reconciliation during simulated power failure.

---

## 8. Human Approval Block

```
================================================================================
GRAVITAS WAVE P6 ARCHITECTURE DECISION APPROVAL
Wave: P6 — Target Backend Architecture (Hardened Edition)
Status: COMPLETE — READY FOR HUMAN REVIEW
Decision: Adopt Candidate D (Durable Local-First Kernel + node:sqlite + State & Audit Log)
================================================================================
[ ] APPROVED: Proceed to Wave P7 (Desktop Runtime Decision)
[ ] REJECTED: Return to Wave P6 with specified architectural corrections
[ ] BLOCKED: Specify human authority requirement
================================================================================
```
