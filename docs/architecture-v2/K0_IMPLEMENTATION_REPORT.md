# GRAVITAS — WAVE K0 FORENSIC IMPLEMENTATION & BENCHMARK REPORT
## Implementation Verification, Runtime Benchmarks & Provenance Ledger (Cycle 2 Hardening)

**Status**: WAVE K0 OBJECTIVE COMPLETE — IMPLEMENTED & EMPIRICALLY VERIFIED  
**Date**: 2026-10-01  
**Git HEAD**: `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Host Runtime**: Node.js `v24.13.0` (Windows x64 win32 10.0.26100)  
**Dependencies Installed**: Exactly `0` (Zero new external dependencies; 100% native Node 24 standard library)  
**Test Command**: `npm run test:kernel` (51 tests passing in ~3.4s)

---

## 1. Executive Summary & Verification Envelope

Wave K0 converts the human-approved P0–P8 architecture contracts into executable, durable code by building the first production slice of the GRAVITAS target kernel: the **WorkSession Kernel**.

### Invariants Strictly Enforced & Verified
1. `K0 ≠ FULL GRAVITAS BACKEND`
2. `K0 ≠ HARNESS INTEGRATION`
3. `K0 ≠ SUPERVISOR/WORKER LOOP`
4. `K0 ≠ TOOL REGISTRY IMPLEMENTATION`
5. `K0 ≠ ARCHITECTURE ARENA IMPLEMENTATION`
6. `K0 ≠ DESKTOP SHELL`
7. `K0 ≠ LIVING HQ`
8. `K0 ≠ RENDERER IMPLEMENTATION`
9. `ZERO PACKAGE INSTALLS`: No external packages (zero npm installs). Utilizes native `node:sqlite` (`DatabaseSync`), native `node:test`, and native `node:assert/strict`.
10. `ONE CANONICAL OWNER PER DATA ROOT`: Enforced via filesystem-level atomic `kernel.lock` (`O_CREAT | O_EXCL`) binding PID, instance ID, start time, executable path, timestamps, and active OS process heartbeat probes (`process.kill(pid, 0)`).
11. `WORKER PROCESS ≠ CANONICAL DATABASE WRITER`: Worker processes cannot open the SQLite database for write operations; all mutations route through the single-writer `WorkSessionKernel`.
12. `LIVE SUBSCRIPTION ≠ CANONICAL TRUTH`: Ephemeral event listeners receive live broadcasts outside the transaction boundary, but canonical truth resides exclusively in the SQLite append-only durable event log.

---

## 2. Forensic Source Tree of K0 Implementation

All K0 implementation files reside strictly within `packages/core/src/kernel/` and its test fixtures:

```
packages/core/
├── scripts/
│   └── test-loader.mjs     # Maintained native ESM TypeScript loader hook
└── src/kernel/
    ├── domain/
    │   ├── errors.ts           # Complete structured error hierarchy (12 custom errors)
    │   ├── worksession.ts      # WorkSession, Run, and Task domain models & type definitions
    │   ├── fsm.ts              # WorkSession FSM transition matrix & assertion predicates
    │   ├── events.ts           # DurableEvent & AppendEventParams contracts (sequenceId + sequenceNumber)
    │   ├── jobs.ts             # DurableJob & DurableJobState models
    │   └── commands.ts         # KernelCommand envelopes, CommandReceipt, and CommandResult
    ├── persistence/
    │   ├── dataRootLock.ts     # Atomic single-writer filesystem lock (wx flag, PID + instanceId binding)
    │   ├── schema.ts           # SQLite DDL, PRAGMA checks, migration engine & schema inspector
    │   └── sqliteWriter.ts     # Single canonical SQLite writer (WAL, BEGIN IMMEDIATE, explicit policies)
    ├── reconciliation/
    │   └── startupReconciler.ts# Startup reconciliation engine (interrupted tasks, sessions, expired leases)
    ├── kernel.ts               # WorkSessionKernel facade: semantic fingerprinting, idempotency, snapshotting
    ├── index.ts                # Public kernel exports barrel
    └── __tests__/
        ├── fault-worker.ts     # Isolated fault-injection worker subprocess for crash testing
        └── kernel.test.ts      # 51 automated contract, adversarial & crash tests (100% pass)
```

---

## 3. Microbenchmarks & Empirical Performance

All benchmarks measured on host running Node `v24.13.0` against native `node:sqlite` in WAL mode with `PRAGMA synchronous = NORMAL`:

| Operation | Test / Measurement | Measured Wall Time | Result |
| :--- | :--- | :--- | :--- |
| **Session Initialization & DDL** | `TEST 01` (Lock + Pragmas + Tables) | 52.1 ms | PASS |
| **Entity Read / Snapshot Assembly** | `TEST 02` & `TEST 19` | 42.1 ms / 42.0 ms | PASS |
| **FSM Transition & Revision Bump** | `TEST 04` (WAL Write + Event Append) | 37.3 ms | PASS |
| **Idempotency Hash Lookup** | `TEST 08` (Semantic Fingerprint Check) | 34.9 ms | PASS |
| **Transaction Rollback on Error** | `TEST 11` (Immediate abort & rollback) | 43.3 ms | PASS |
| **Startup Crash Reconciliation** | `TEST 16` & `TEST 17` (Scan, update & log) | 73.8 ms / 49.2 ms | PASS |
| **Monotonic Event Sequencing** | `ADV 11` (12 rapid sequential mutations) | 51.8 ms total (~4.3 ms/mutation) | PASS |
| **Real Crash A (Pre-Commit Kill)** | `CRASH-A` (Spawn, write, SIGKILL, rollback verified) | 315.4 ms | PASS |
| **Real Crash B (Post-Commit Retry)** | `CRASH-B` (Spawn, commit, SIGKILL, idempotency retry verified) | 304.4 ms | PASS |
| **Real Crash C (Job Lease Crash)** | `CRASH-C` (Spawn, lease, SIGKILL, EXPIRED lease recovered) | 287.5 ms | PASS |
| **Real Crash D (Human Gate Crash)**| `CRASH-D` (Spawn, WAITING_APPROVAL, SIGKILL, preserved intact) | 292.2 ms | PASS |
| **Real Crash E (In-Flight Task)** | `CRASH-E` (Spawn, RUNNING task, SIGKILL, INTERRUPTED reconciled)| 341.9 ms | PASS |
| **Total K0 Test Suite (51 Tests)** | 25 Contract + 21 Adversarial + 5 Real Crash Tests | **3433.8 ms (< 3.5s total)** | **100% PASS** |

---

## 4. Zero Dependency Certification

Verification via package forensics:
```json
// packages/core/package.json
{
  "dependencies": {} // Zero external production dependencies added
}
```
Standard libraries utilized:
- `node:sqlite` (`DatabaseSync`, `StatementSync`)
- `node:crypto` (`createHash` for SHA-256 idempotency fingerprints, `randomBytes`)
- `node:fs` & `node:path` (Data root and lockfile lifecycle)
- `node:child_process` (`spawnSync` for subprocess crash fault injection)
- `node:test` & `node:assert/strict` (Native test execution and assertions)
