# GRAVITAS K2 — TEST AND EVIDENCE REPORT

**Wave**: K2 — Supervisor ↔ Worker Closed-Loop Orchestration  
**Date**: 2026-10-02  
**Status**: 100% PASS (212 Total Unique Tests Across Workspaces)  

---

## 1. Authoritative Unique Test Count Accounting

```text
K0_TESTS_UNIQUE              =  51  (via npm run test:kernel)
LEGACY_HARNESS_TESTS_UNIQUE  =  60  (codex: 28, fcc: 12, claude: 7, process: 8, mutation: 5)
K1_TESTS_UNIQUE              =  48  (k1.test.ts: Parts 1 to 8)
K2_TESTS_UNIQUE              =  53  (k2.test.ts: Parts 1 to 9 via npm run test:k2)
OVERLAPPING_TESTS            =   0  (All 4 test suites are completely disjoint)
TOTAL_HARNESS_PACKAGE_TESTS  = 108  (via npm run test:harnesses)
TOTAL_UNIQUE_TESTS           = 212  (51 K0 + 108 Harness/K1 + 53 K2)
FAILED                       =   0
SKIPPED                      =   0
```

---

## 2. Native Test Command Evidence

### A. K0 WorkSession Kernel (`npm run test:kernel`)
```text
✔ GRAVITAS K0 WORKSESSION KERNEL TEST SUITE (3946ms)
ℹ tests 51 | pass 51 | fail 0 | cancelled 0 | skipped 0
```

### B. Harness Package Suite (`npm run test:harnesses`)
```text
Test Files  6 passed (6)
Tests       108 passed (108)
Duration    8.25s
```

### C. K2 Closed-Loop Orchestration Suite (`npm run test:k2`)
```text
Test Files  1 passed (1)
Tests       53 passed (53)
Duration    5.58s
```

---

## 3. Golden Loop Empirical Evidence

1. **Deterministic Fixture Golden Loop (Test 11)**:
   - Evaluated objective `Compute 2 + 3`.
   - Supervisor issued `DISPATCH_TASK`.
   - Worker returned `5`.
   - Supervisor transitioned state to `COMPLETE_OBJECTIVE` in 1 iteration.
2. **Real Host PowerShell Dispatch Golden Loop (Test 12)**:
   - Evaluated objective `Write-Output "GRAVITAS_K2_PASS"`.
   - Resolved executor `executor:backend:primary` → harness `powershell-local`.
   - K1 registry passed dispatch gate (`OPERATOR_INCLUDED_HOST_RUNTIME`).
   - PowerShell process spawned and executed via stdin script `-Command -`.
   - Output `GRAVITAS_K2_PASS` captured and durably persisted to K0 task entity (`SUCCEEDED`).
   - Supervisor evaluated result and closed loop at `COMPLETED`.
3. **Fault Injection & Retry Recovery (Test 17)**:
   - Worker transient failure triggered `RETRY_TASK`.
   - Second execution attempt succeeded; loop closed cleanly with `totalRetries: 1`.
4. **Permanent Failure & Budget Exhaustion (Test 18, 22)**:
   - Failure beyond retry budget transitioned immediately to `FAILED`.
   - Iteration budget exhaustion transitioned safely to `WAITING_APPROVAL` with human gate requirement.
5. **Crash Recovery & Unknown Outcome Safety (Tests 30–33d, 45)**:
   - CRASH-A: Pending dispatch task preserved without phantom execution.
   - CRASH-B: Expired job lease recovered by startup reconciler.
   - CRASH-C: Mid-flight crash produces `UNKNOWN_EXTERNAL_OUTCOME`; blind retry forbidden; human gate triggered.
   - CRASH-D: Persisted result survives restart; supervisor continues without duplicate execution.
   - CRASH-E: `WAITING_APPROVAL` preserved across restart; no autonomous auto-approval.
