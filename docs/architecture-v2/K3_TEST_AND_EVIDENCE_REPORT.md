# GRAVITAS K3 — TEST AND EVIDENCE REPORT
## Wave K3 Final Hardening: Authority Runtime, Grant Durability & Adversarial Verification

**Wave**: K3 — Tool Registry + CapabilityGrants Runtime Final Hardening  
**Status**: 100% PASS (297 Total Unique Tests Across Workspaces)  
**Date**: 2026-10-02  
**Git Working Tree**: Clean diff check, Branch `feat/v0-golden-loop`, HEAD `516e01c82cb4c3afd1080e72e68a4e1e56687335`  

---

## 1. Authoritative Unique Test Count Accounting

```text
K0_TESTS_UNIQUE              =  51  (via npm run test:kernel)
LEGACY_HARNESS_TESTS_UNIQUE  =  60  (codex: 28, fcc: 12, claude: 7, process: 8, mutation: 5)
K1_TESTS_UNIQUE              =  48  (k1.test.ts: Parts 1 to 8)
K2_TESTS_UNIQUE              =  53  (k2.test.ts: Parts 1 to 9 via npm run test:k2)
K3_TESTS_UNIQUE              =  85  (k3.test.ts: Parts 1 to 8 via npm run test:k3)
OVERLAPPING_TESTS            =   0  (All 5 test suites are completely disjoint)
TOTAL_HARNESS_PACKAGE_TESTS  = 108  (via npm run test:harnesses)
TOTAL_UNIQUE_TESTS           = 297  (51 K0 + 108 Harness/K1 + 53 K2 + 85 K3)
FAILED                       =   0
SKIPPED                      =   0
```

---

## 2. Native Test Command Evidence

### A. K0 WorkSession Kernel (`npm run test:kernel`)
```text
✔ GRAVITAS K0 WORKSESSION KERNEL TEST SUITE (3982ms)
ℹ tests 51 | pass 51 | fail 0 | cancelled 0 | skipped 0
```

### B. Harness Package Suite (`npm run test:harnesses`)
```text
Test Files  6 passed (6)
Tests       108 passed (108)
Duration    8.82s
```

### C. K2 Closed-Loop Orchestration Suite (`npm run test:k2`)
```text
Test Files  1 passed (1)
Tests       53 passed (53)
Duration    5.32s
```

### D. K3 Tool Registry Suite (`npm run test:k3`)
```text
Test Files  1 passed (1)
Tests       85 passed (85)
Duration    5.74s
```

---

## 3. Core Empirical Evidence

1. **Grant Durability & Process Restarts (Tests 56–58)**:
   - Issuance is durable via K0 `CREATE_DURABLE_JOB` (`jobType: 'CAPABILITY_GRANT'`).
   - Revocation is durable via K0 `CREATE_DURABLE_JOB` (`jobType: 'GRANT_REVOCATION'`).
   - Grant expiry timestamp is preserved and enforced across restarts; process reboot never resets lifetime.
2. **K1 $\wedge$ K3 4-Way Gate Algebra Matrix (Test 66)**:
   - Case A (K1 eligible + K3 authorized): `SUCCESS` (real PowerShell execution permitted).
   - Case B (K1 eligible + K3 denied): `DENIED` (zero subprocesses).
   - Case C (K1 blocked + K3 authorized): `EXECUTION_FAILURE` (zero subprocesses).
   - Case D (K1 blocked + K3 denied): `DENIED` (zero subprocesses).
3. **Zero-Execution on Denial (Tests 33, 67)**:
   - All denial modes (unqualified tool, missing grant, forged grant, wrong subject, wrong task, scope violation, human gate) spawn exactly 0 subprocesses.
4. **Replay & Tampering Resistance (Tests 18–21, 59–64, 81–82)**:
   - Replay across workers, tasks, sessions, or resources fails closed.
   - Forged grant IDs fail with `GRANT_NOT_FOUND`.
   - Grant tampering is defeated by canonical storage lookup; caller mutations have zero authority effect.
5. **Path Traversal Containment (Tests 15, 65)**:
   - Full defense against `../`, `..\`, UNC shares, drive-relative escapes, null bytes, URL encodings, and prefix collisions.
6. **Ambiguous Outcome & Anti-Blind Replay (Tests 50, 73, 74, 78)**:
   - Ambiguous external tool outcomes yield `UNKNOWN_EXTERNAL_OUTCOME`.
   - Valid grant does NOT authorize blind retry; routes strictly to human review or reconciliation.
7. **Direct SQLite Bypass Elimination (Test 85)**:
   - `WORKER_WRITES_SQLITE_DIRECTLY = NO`
   - `TOOL_WRITES_SQLITE_DIRECTLY = NO`
   - `SUPERVISOR_WRITES_SQLITE_DIRECTLY = NO`
   - `K3_AUTHORIZATION_ENGINE_WRITES_SQLITE_DIRECTLY = NO`
   - All durable mutations route through frozen K0 `WorkSessionKernel.executeCommand()`.
