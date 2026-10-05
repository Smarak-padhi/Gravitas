# GRAVITAS Phase B0 — Regression & Live Smoke Evidence Record

**Phase**: B0 — Repository Typecheck & Build Convergence  
**Status**: 100% PASSING — ZERO FAILURES, ZERO SKIPS  
**Timestamp**: 2026-10-05T07:47:30+05:30  

---

## 1. Full Test Suite Regression Matrix

Following build convergence, the entire suite of 11 automated test runners was executed fresh:

| Suite ID | Test Command | Tests Run | Pass | Fail | Skip | Duration | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **K0** | `npm run test:kernel` | 51 | 51 | 0 | 0 | 3.58s | **PASS** |
| **K1** | `npm run test:harnesses` | 108 | 108 | 0 | 0 | 7.72s | **PASS** |
| **K2** | `npm run test:k2` | 53 | 53 | 0 | 0 | 5.02s | **PASS** |
| **K3** | `npm run test:k3` | 85 | 85 | 0 | 0 | 4.75s | **PASS** |
| **K4** | `npm run test:k4` | 40 | 40 | 0 | 0 | 2.98s | **PASS** |
| **K5** | `npm run test:k5` | 40 | 40 | 0 | 0 | 60.85s | **PASS** |
| **D0** | `npm run test:d0` | 30 | 30 | 0 | 0 | 1.18s | **PASS** |
| **D1** | `npm run test:d1` | 50 | 50 | 0 | 0 | 2.65s | **PASS** |
| **D2** | `npm run test:d2` | 50 | 50 | 0 | 0 | 5.91s | **PASS** |
| **D3** | `npm run test:d3` | 60 | 60 | 0 | 0 | 3.16s | **PASS** |
| **D4** | `npm run test:d4` | 60 | 60 | 0 | 0 | 0.52s | **PASS** |
| **TOTAL** | *All 11 Suites* | **627** | **627** | **0** | **0** | **~98s** | **100% PASS** |

---

## 2. Desktop Live Smoke Dogfood Proof

```bash
npx electron apps/desktop/src/dogfood-d4-real.mjs
```

**Exit Code**: `0`  
**Total Steps Executed**: 63 / 63  
**Verified Invariants**:
- Electron Main process (PID 7116) and Kernel utilityProcess (PID 16052) run as distinct isolated processes.
- Living HQ WebGL canvas mounts and renders under Direct3D11 ANGLE backend (`devicePixelRatio: 1.25`).
- Spatial entity projection accurately reflects canonical Kernel overview.
- Role-bot silhouettes (`CYLINDER_HEAD`, `HELMET_OCTA`, `BOX_UNIT`) render accurately without identity collapse.
- Semantic inspector proves `Role != Executor != Harness != Model != Process`.
- Safe fallback from Codex to Claude Code preserves role identity.
- Independent verification completes with `VERIFIED_PASS` and transitions to `AWAITING_HUMAN_APPROVAL`.
- Human approval gate requires sovereign human interaction; zero automatic approval occurs.
- Window hiding (D2 lifecycle) leaves Kernel alive; background state updates are correctly received upon restore.
- Full renderer reload reconstructs Living HQ state without mutating or killing Kernel process PID.
- Reduced motion mode disables continuous bot locomotion while preserving silhouette distinction.
- WebGL failure gracefully degrades to accessible semantic DOM view.
- Explicit quit sends `SHUTDOWN_REQUEST`, processes `SHUTDOWN_ACK`, terminates utilityProcess cleanly with zero orphaned processes.
- **Verdict**: `=== REAL D4 DOGFOOD PASSED: ALL 63 STEPS VERIFIED ===`
