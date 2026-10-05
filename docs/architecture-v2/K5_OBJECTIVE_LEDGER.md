# GRAVITAS K5 — OBJECTIVE & TRACEABILITY LEDGER

| ID | Specification / Invariant | Implementation Artifact | Test Case | Status |
| :--- | :--- | :--- | :--- | :--- |
| **K5-OBJ-01** | Production-Integrated Verification Chain (31 steps) | `packages/orchestrator/src/k5/engine.ts` | Test 01 | **VERIFIED** |
| **K5-OBJ-02** | Epistemological Separation of Worker/Supervisor Claims | `packages/orchestrator/src/k5/engine.ts` | Test 04 | **VERIFIED** |
| **K5-OBJ-03** | Falsification & Exit-0 Oracle Failure Sensitivity | `packages/orchestrator/src/k5/engine.ts` | Test 02, 05 | **VERIFIED** |
| **K5-OBJ-04** | Pre-bound Criteria & Revision Immutability | `packages/orchestrator/src/k5/engine.ts` | Test 09, 10, 11 | **VERIFIED** |
| **K5-OBJ-05** | Pre/Post Target Mutation Detection (`VERIFIER_MUTATED_TARGET`) | `packages/orchestrator/src/k5/digest.ts` | Test 12, 13 | **VERIFIED** |
| **K5-OBJ-06** | 4-Way K1 ∧ K3 Gate Algebra & Zero-Spend Compliance | `packages/orchestrator/src/k5/engine.ts` | Test 16, 17, 18 | **VERIFIED** |
| **K5-OBJ-07** | Bounded Verification Budgets & Partial Reporting | `packages/orchestrator/src/k5/engine.ts` | Test 19 | **VERIFIED** |
| **K5-OBJ-08** | Deterministic `EvidenceManifest` & Digest Tamper Detection | `packages/orchestrator/src/k5/digest.ts` | Test 20, 21, 22 | **VERIFIED** |
| **K5-OBJ-09** | Process Restart Durability via K0 Kernel Storage | `packages/orchestrator/src/k5/store.ts` | Test 24, 25 | **VERIFIED** |
| **K5-OBJ-10** | Crash Recovery & Idempotency (K5-A through K5-F) | `packages/orchestrator/src/k5/engine.ts` | Tests 26–31 | **VERIFIED** |
| **K5-OBJ-11** | Cross-Task / Cross-Run Isolation & Duplicate Idempotency | `packages/orchestrator/src/k5/engine.ts` | Tests 32–35 | **VERIFIED** |
| **K5-OBJ-12** | Structural Verifier Independence (`VERIFIER != AUTHOR`) | `packages/orchestrator/src/k5/engine.ts` | Test 38 | **VERIFIED** |
| **K5-OBJ-13** | Sovereign Human Approval Gate & Zero Auto-Action | `packages/orchestrator/src/k5/engine.ts` | Test 36, 37 | **VERIFIED** |
| **K5-OBJ-14** | Codebase Bypass Audit (`DIRECT_SQLITE = NO`, `DIRECT_PROCESS = NO`) | `packages/orchestrator/src/k5/` | Test 40 | **VERIFIED** |
