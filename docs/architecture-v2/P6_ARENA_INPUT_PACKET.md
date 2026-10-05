# P6 ARENA INPUT PACKET: TARGET BACKEND & CONTROL PLANE ARCHITECTURE
## Evidence-Backed Decision Dossier for Upcoming Wave P6

**Status:** ARCHITECTURAL INPUT DOSSIER — P5 DOGFOODING DELIVERABLE  
**Target Wave:** Wave P6 — Target Backend & Control Plane Implementation  
**Date:** 2026-09-30  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants:**
- $\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$
- $\text{CAPABILITY} \neq \text{TOOL} \neq \text{TRANSPORT} \neq \text{CREDENTIAL} \neq \text{AUTHORITY}$
- $\text{ARCHITECTURE CONTRACT} \neq \text{CURRENT IMPLEMENTATION}$
- $\text{CURRENT REALITY} \neq \text{APPROVED TARGET CONTRACT} \neq \text{P5 PROPOSAL} \neq \text{FUTURE-WAVE INPUT}$
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$
- $\mathbf{HUMAN\ DECISION \neq AGENT\ CONSENSUS}$
- $\mathbf{REUSE > ADD\_DEPENDENCY}$

---

## 1. Canonical Question & Context

### Primary Question
> Given approved P0–P5 contracts and the actual existing GRAVITAS codebase, what architecture families should Wave P6 evaluate for the target backend/control plane, persistence, internal eventing, and workflow durability?

### Reality vs. Future Separation
* **Current Reality (from P2 Forensics):** The backend is a Node.js/TypeScript monorepo (`packages/core`, `packages/orchestrator`, `packages/agent-service`). State is largely in-memory with volatile arrays; SQLite schemas are partially drafted but lack unified migrations or persistence wiring. Task execution is a linear stub with mock executors.
* **Approved Target Contract (from P3/P4):** Deterministic Role $\to$ Executor $\to$ Harness resolution; Bounded Message Protocol; Wait-For Graph dependency cycle detection; Zero-Spend Tool Registry; RFC 8785 schema hashing.
* **P5 Proposal Scope:** Provide structured evaluation and trade-offs of 4 candidate architecture families without freezing P6's implementation decision.

---

## 2. Hard Constraint Filtering

| Candidate Architecture Family | Zero-Spend Invariant ($\$0.00$) | Windows 11 Local-First (No Cloud Mandate) | Resource Footprint ($< 500\text{MB}$ Idle) | P3/P4 Contract Compatibility | Eligibility Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Family 1: Evolved Modular Node/TS In-Process Kernel** | **PASS** (Zero cost; 100% local) | **PASS** (Pure Node.js runtime) | **PASS** [ILLUSTRATIVE ESTIMATE: $\sim 80\text{MB}$ idle, requires P6 probe] | **PASS** (Direct mapping to P2/P3/P4) | `ELIGIBLE` |
| **Family 2: Local State-Machine / Actor Kernel (XState v5 / Custom)** | **PASS** (Zero cost; MIT OSS) | **PASS** (Runs in-process) | **PASS** [ILLUSTRATIVE ESTIMATE: $\sim 95\text{MB}$ idle, requires P6 probe] | **PASS** (Formal state machine for Task/Executor) | `ELIGIBLE` |
| **Family 3: Embedded Deterministic Replay / Event-Sourced Kernel** | **PASS** (Zero cost; custom SQLite) | **PASS** (Pure local file storage) | **PASS** [ILLUSTRATIVE ESTIMATE: $\sim 110\text{MB}$ idle, requires P6 probe] | **PASS** (Enforces 14-point provenance & crash recovery) | `ELIGIBLE` |
| **Family 4: Distributed Heavy Orchestrator (Temporal / Cadence / Docker)** | **PASS** (FOSS core exists, but cloud/support optional) | **COUNTER-INDICATED** (Imposes multi-container daemon infrastructure on single host) | **COUNTER-INDICATED** (Multi-process container cluster footprint exceeds desktop idle goal) | **COUNTER-INDICATED** (Imposes alien RPC conventions over P3 envelopes) | `COUNTER_INDICATED UNDER DESKTOP_FIRST HARD CONSTRAINTS` |

> [!NOTE]
> **Assessment of Distributed Orchestrators:** External orchestrators (such as Temporal or Cadence clusters) are strongly counter-indicated under GRAVITAS's desktop-first, local-first single-machine constraints. Running a multi-container Docker cluster for an OS executing on a single developer machine introduces massive operational complexity and memory overhead. P6 should focus its evaluation on in-process or lightweight local-daemon architectures.

---

## 3. Deep-Dive on Eligible Architecture Families for P6 Evaluation

### Family 1: Evolved Modular In-Process Kernel
* **Description:** Refactors existing `packages/orchestrator` into clear internal modules: TaskScheduler, ExecutorPool, HarnessGateway, and ToolRegistry, running in a single Node.js runtime.
* **Trade-Offs:** Maximum reuse of existing codebase; zero IPC serialization overhead; simplest debugging via standard Node.js inspector. However, unhandled promise rejections or fatal exceptions in one subsystem can crash the entire control plane; no memory isolation between agents and kernel.

### Family 2: Hierarchical State-Machine / Actor Model
* **Description:** Models Tasks, Executors, and Interactions as explicit finite state machines or lightweight actors (e.g. using XState v5 core concepts or a custom typed actor mailbox).
* **Trade-Offs:** Eliminates race conditions and invalid state transitions by construction; directly enforces P3 Executor lifecycle (`UNASSIGNED` $\to$ `ASSIGNED` $\to$ `EXECUTING` $\dots$); guarantees bounded message processing. Higher abstraction barrier; requires converting imperative loops into declarative event transitions.

### Family 3: Embedded Event-Sourced Kernel (SQLite WAL + Deterministic Replay)
* **Description:** Every state mutation is written to an append-only event log in local SQLite (WAL mode). In-memory state is a projection of the event log. Crash recovery is achieved by replaying the log from the latest snapshot.
* **Trade-Offs:** High auditability; directly supports P3 14-point provenance; instant crash recovery; enables offline time-travel debugging. Added complexity in event schema versioning and snapshot compaction.

---

## 4. Sub-Question Analysis

### 4.1 Persistence & Durability (Real Question 4)
* **Evaluated Candidates:**
  1. *Embedded SQLite (`better-sqlite3` or Node.js v24.13.0 built-in `node:sqlite`):* Zero latency, ACID transactions, single-file backup (`gravitas.db`), zero background daemons. Highly eligible for P6 evaluation.
  2. *DuckDB:* Exceptional for analytical queries, but higher write latency and memory overhead for rapid transactional updates.
  3. *Pure JSON Files:* Prone to write corruption during unexpected power cuts; lacks atomic transactions across multiple tables.
* **Illustrative External Evidence & Local Prerequisite:** In external benchmarks on desktop NVMe SSDs, SQLite in WAL mode demonstrates high write throughput sufficient for single-user workloads; however, actual transactional latency, WAL checkpoint overhead, and write concurrency under GRAVITAS task streaming must be evaluated via local empirical probe in Wave P6 (`[REQUIRES_LOCAL_EXPERIMENT]`).

### 4.2 Internal Communication & Eventing (Real Question 5)
* **Evaluated Candidates:**
  1. *Typed In-Process EventEmitter / Micro-Bus:* Sub-millisecond latency, zero serialization cost, suitable for internal single-machine orchestration.
  2. *SQLite Job Queue (e.g. SKIP LOCKED pattern):* Durable across crashes; unifies task scheduling with persistence.
  3. *Local IPC (Windows Named Pipes / Domain Sockets):* Essential for communicating with separate CLI worker processes or desktop UI shells, but unnecessary for internal kernel modules.
* **Eligible Candidates for P6 Evaluation:** P6 may evaluate a hybrid model (In-Process Typed EventEmitter for synchronous lifecycle notifications paired with a SQLite task queue for durable task dispatch), or evaluate pure local IPC. P6 retains full authority to select its eventing architecture.

### 4.3 Workflow Engine vs. Custom Orchestration Kernel (Real Question 6)
* **Current Evidence Analysis:** External distributed workflow engines (Temporal, Cadence, Windmill) are designed for distributed server clusters and introduce heavy dependencies that are counter-indicated under local-first single-machine constraints. Current evidence indicates that a custom in-process DAG and scheduler kernel aligned with P3/P4 contracts is an eligible candidate that avoids external cluster overhead. 
* **P6 Authority:** Wave P6 retains complete authority to decide whether to adopt an embedded open-source library or build a dedicated kernel.

---

## 5. Comparative Trade-Off Matrix

| Evaluation Dimension | Family 1: Evolved Modular Kernel | Family 2: State-Machine / Actor Model | Family 3: Embedded Event-Sourced Kernel |
| :--- | :--- | :--- | :--- |
| **Reversibility** | `EASILY_REVERSIBLE` (Standard TS) | `MODERATELY_REVERSIBLE` | `MODERATELY_REVERSIBLE` |
| **Operational Complexity** | `LOW` (Standard call stack) | `MEDIUM` (State charts & transitions) | `MEDIUM` (Event replay & migrations) |
| **Crash Recovery** | `POOR` (Requires custom persistence) | `ACCEPTABLE` (States serialized) | `SUPERIOR` (Deterministic replay) |
| **P3/P4 Invariant Enforcement**| `MANUAL` (Requires procedural guards)| `STRUCTURAL` (Enforced by state machine)| `AUDITED` (Enforced by event stream) |
| **Zero-Spend Risk** | `ZERO` | `ZERO` | `ZERO` |

---

## 6. Active Contradictions & Uncertainties

* **Contradiction CON-P6-01 (Native `node:sqlite` vs `better-sqlite3` on Node.js v24.13.0):**
  * *Claim A:* Node.js v24.13.0 built-in `node:sqlite` avoids all native compilation C++ build tool dependencies on Windows.
  * *Claim B:* `better-sqlite3` is more mature, supports user-defined functions and custom extension loading (e.g. `sqlite-vec`), while `node:sqlite` in Node 24 is stabilizing.
  * *Status:* `REQUIRES_EXPERIMENT` during P6 environment probing.
* **Uncertainty UNC-P6-01:** Whether single-process Node.js garbage collection pauses will introduce observable latency during simultaneous multi-agent LLM streaming and UI event handling.

---

## 7. Synthesizer Neutral Summary & Future-Wave Boundaries

$$\mathbf{P5\ INPUT \neq P6\ DECISION}$$

The Arena dogfooding analysis establishes that heavy distributed workflow engines are counter-indicated under current single-machine desktop constraints, while three local architecture families remain eligible for P6 evaluation:
1. **Family 1 (Evolved Modular Kernel):** Simplest migration path, but requires manual state persistence.
2. **Family 2 (State-Machine / Actor Kernel):** Strongest structural guarantees for P3 Executor/Task lifecycles.
3. **Family 3 (Embedded Event-Sourced Kernel):** Strongest crash recovery and provenance auditability.

**Wave P6 retains absolute architectural authority** to select any of these families, design a hybrid synthesis (e.g. state machines backed by SQLite event logs), or conduct bounded feasibility spikes prior to final implementation.
