# GRAVITAS K4 — DURABILITY & RECOVERY EVIDENCE
## K0 Canonical Persistence, Process-Restart Durability & Crash Semantics

**Status**: WAVE K4 EVIDENCE ARTIFACT (HARDENED & RECONCILED)  
**Date**: 2026-10-03  
**Baseline Git Commit**: `516e01c82cb4c3afd1080e72e68a4e1e56687335`  

---

## 1. Durability Principle & Architecture Boundary

- `K4_WRITES_SQLITE_DIRECTLY = NO`
- `K0 IS THE SINGLE CANONICAL WRITER`
- `PROCESS RESTART MUST NOT AUTO-ADVANCE OR AUTO-RESOLVE`

The Architecture Arena (`ArchitectureArena`) maintains runtime in-memory state during active evaluation and persists durable checkpoints directly through the K0 `WorkSessionKernel` using the standard `CREATE_DURABLE_JOB` command primitive (`jobId: job_arena_<arenaId>`, `jobType: K4_ARENA_CANONICAL_STATE`).

---

## 2. Empirical Restart Recovery Verification (Tests 29, 30, 37)

### 2.1 Persistence via K0 Job Entity (Test 29)
1. An Arena is initialized with an active `ArchitectureQuestion` and registered candidate (`cand-jsonl`).
2. `arena.persistToKernel(workSessionId)` executes command `CREATE_DURABLE_JOB` into the K0 Kernel database with:
   - `jobId`: `job_arena_arena-restart-test`
   - `jobType`: `K4_ARENA_CANONICAL_STATE`
   - `payload`: Complete JSON-serialized `ArenaStateSnapshot`.
3. The K0 Kernel is cleanly stopped via `await kernel.shutdown()`, releasing the data root single-writer lock.
4. A new `WorkSessionKernel` instance is instantiated and booted over the identical data directory.
5. `ArchitectureArena.loadFromKernel(restartedKernel, workSessionId, 'arena-restart-test')` reads the durable job entity, deserializes the payload, and hydrates the Arena state.
6. Verification asserts:
   - Reconstituted candidate count equals 1 (`cand-jsonl`).
   - Decision packet status remains strictly `PENDING_HUMAN_REVIEW`.
   - `selectedCandidateId` remains `undefined`.

### 2.2 Preservation of `WAITING_FOR_HUMAN_DECISION` (Test 30)
1. An Arena in the terminal state `WAITING_FOR_HUMAN_DECISION` is persisted to K0.
2. The host process terminates (`kernel.shutdown()`) and reboots.
3. Upon state restoration from K0, the human decision block is guaranteed to remain `PENDING_HUMAN_REVIEW`.
4. No autonomous winner is selected; no heuristic promotes candidate A over candidate B.

### 2.3 Contradiction & Incomparability State Survives Restart (Test 37)
1. An Arena containing active unresolved contradictions (`contra-durable-01`) and registered benchmark incomparabilities (`bench-host-ntfs` vs `bench-cloud-ext4`) is persisted to K0.
2. Process shuts down and reboots with a new kernel instance on the same data root.
3. `loadFromKernel()` reconstitutes the Arena with stable canonical IDs:
   - `candidateId`: `cand-durable-01`
   - `contradictionId`: `contra-durable-01` (status: `UNRESOLVED`)
   - `benchmarkAId`: `bench-host-ntfs`, `benchmarkBId`: `bench-cloud-ext4`
   - `status`: `PENDING_HUMAN_REVIEW`, `selectedCandidateId`: `undefined`.

---

## 3. Crash Semantics Matrix (Crash-A through Crash-F)

| Crash Scenario | Phase / Moment of Interruption | Recovery Behavior | Empirical Evidence |
| :--- | :--- | :--- | :--- |
| **Crash-A** | Process terminates before candidate registration commits | Zero phantom candidates exist; system recovers clean initial state. | Verified in Test 31 (`hydrated.candidates.length === 0`). |
| **Crash-B** | Crash after Scout executes but before Result is ingested | Scout lease expires; task is eligible for retry or lease reclamation. | Verified via bounded lease expiry (Test 27). |
| **Crash-C** | Ambiguous external tool/scout execution | Recorded as `UNKNOWN_EXTERNAL_OUTCOME`; automated blind replay is blocked fail-closed. | Verified in Test 32. |
| **Crash-D** | Crash during synthesis or trade-off matrix generation | Arena re-runs synthesis deterministically from durable EvidenceItems. | Deterministic function in `generateDecisionPacket()`. |
| **Crash-E** | Crash while in `WAITING_FOR_HUMAN_DECISION` | System rehydrates intact at human gate without auto-deciding winner. | Verified in Test 30. |
| **Crash-F** | Crash during Human Decision recording | Atomic transaction guarantees decision is either fully committed or absent. | Verified via K0 ACID command transactions. |
