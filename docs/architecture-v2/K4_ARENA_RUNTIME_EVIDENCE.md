# GRAVITAS K4 — ARENA RUNTIME EVIDENCE & TEST REPORT
## Empirical Validation of the Architecture Arena Runtime

**Status**: WAVE K4 RUNTIME EVIDENCE REPORT (HARDENED & RECONCILED)  
**Date**: 2026-10-03  
**Baseline Git Commit**: `516e01c82cb4c3afd1080e72e68a4e1e56687335`  

---

## 1. Test Suite Accounting & Regression Verification

All 337 tests across the entire repository pass with zero failures and zero skips:

| Test Suite | Target File / Scope | Tests Run | Pass | Fail | Skip | Duration |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **K0 Kernel** | `packages/core/src/kernel/__tests__/kernel.test.ts` | **51** | 51 | 0 | 0 | 4.42s |
| **Harnesses & K1** | `packages/harnesses/` (codex, claude, k1, process, mutation) | **108** | 108 | 0 | 0 | 8.39s |
| **K2 Closed-Loop** | `packages/orchestrator/src/k2/k2.test.ts` | **53** | 53 | 0 | 0 | 6.34s |
| **K3 CapabilityGrants** | `packages/orchestrator/src/k3/k3.test.ts` | **85** | 85 | 0 | 0 | 5.67s |
| **K4 Architecture Arena** | `packages/orchestrator/src/k4/k4.test.ts` | **40** | 40 | 0 | 0 | 4.22s |
| **TOTAL UNIQUE TESTS** | Repository-wide | **337** | **337** | **0** | **0** | **29.04s** |

Command executed:
```powershell
npm run test:kernel ; npm run test:harnesses ; npm run test:k2 ; npm run test:k3 ; npm run test:k4
```
Result: **Exit Code 0 — 100% PASS (337/337)**.

---

## 2. K0, K1, K2, K3 Integration Matrix

The K4 Architecture Arena strictly reuses the frozen substrate:

1. **Persistence via K0 WorkSessionKernel**:
   - `K4_WRITES_SQLITE_DIRECTLY = NO`.
   - `persistToKernel()` issues a `CREATE_DURABLE_JOB` command to K0.
   - `loadFromKernel()` reconstitutes Arena state from K0 durable jobs upon restart.
2. **Execution via K1 Qualified Surfaces**:
   - `K4_SPAWNS_PROCESS_DIRECTLY = NO`.
   - Scout process executions dispatch through K1 `HarnessRegistry` using qualified harnesses.
3. **Orchestration via K2 Bounded Loops**:
   - `K4_USES_K2_ORCHESTRATION = YES`.
   - Scout research lifecycles dispatch through `ClosedLoopOrchestrator` across WorkSession and Run boundaries.
   - Bounded leases (`acquireScoutLease`) prevent stale results (`REJECTED_STALE`).
4. **Authority via K3 CapabilityGrantEngine**:
   - `K4_USES_K3_TOOL_AUTHORIZATION = YES`.
   - Tools are evaluated against the 4-way gate matrix (`K1 eligible ∧ K3 authorized = executes`).
   - Unknown-cost and paid tools fail closed immediately (`COST_UNKNOWN`).
   - Denial results in zero process spawns.

---

## 3. Ordered Integration Trace (Actual Runtime)

Captured in `packages/orchestrator/src/k4/k4.test.ts` (Test 36):
```
01 WorkSession: ws_k4_f1a23b
02 Run: run_8c41d9e2
03 Arena: arena-k2-trace-test
04 ArchitectureQuestion: q-dogfood-01
05 Candidates: cand-trace-01
06 Claims: claim-trace-01
07 ScoutAssignment A: scout-assign-trace-a
08 ScoutAssignment B: scout-assign-trace-b
09 First-pass visibility isolation: visiblePriorEvidenceIds = [], visiblePriorScoutResultIds = []
10 CapabilityRequest: req_process_exec
11 K3 authorization: grant_90f2b1 issued
12 K1 surface resolution: powershell-local (OPERATOR_INCLUDED_HOST_RUNTIME)
13 K2 execution lifecycle: ClosedLoopOrchestrator iteration 1 dispatch & execution
14 ScoutResult: scout-k2-success
15 Evidence normalization: ev-trace-01 (SHA-256 digested, REPRODUCIBLE_OBSERVATION)
16 K0 persistence: job_arena_arena-k2-trace-test (CREATE_DURABLE_JOB)
17 Contradiction/missing/incomparability processing: uncertainty register updated
18 Adversarial review: rev-trace-01 (critic scout-critic-independent != author scout-k2-worker)
19 DecisionPacket persistence: packet generated
20 Canonical reread: loadFromKernel() hydrates identical state
21 WAITING_FOR_HUMAN_DECISION: humanDecisionBlock.status = PENDING_HUMAN_REVIEW
22 No selected candidate: selectedCandidateId = undefined
23 No implementation task: tasks.length = 0
```

---

## 4. Scoped Dogfood Scenario Analysis (JSON Lines vs Single JSON Array)

In `packages/orchestrator/src/k4/k4.test.ts` (Test 35), the dogfood evaluation is explicitly scoped:
- **Experiment Parameters**:
  - Workload: Incremental event append fixture.
  - Runtime: Node.js stdlib `fs.createWriteStream` (`a+` mode) vs `fs.writeFile` / `JSON.stringify`.
  - Platform: Windows 11 NTFS host.
- **Findings & Empirical Scoping**:
  - `cand-jsonl`: Append claim is scoped to the tested fixture where each line is an independent object and historical file contents are not rewritten. The adversarial review records an operational recovery characteristic: power loss mid-write can leave an incomplete trailing line requiring reader EOF sanitization.
  - `cand-json-array`: Demonstrates a recovery risk under the tested monolithic rewrite strategy (crashing during full file rewrite without an atomic rename strategy risks log truncation). This is explicitly classified as `RECOVERY_RISK_OBSERVED_UNDER_TESTED_WRITE_STRATEGY`, NOT an inherent universal fatal flaw of JSON arrays.
- **Decision Neutrality**:
  - Zero autonomous winner: The synthesizer produces the descriptive trade-off matrix and terminates strictly at `WAITING_FOR_HUMAN_DECISION` (`selectedCandidateId = undefined`).
