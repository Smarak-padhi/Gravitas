# GRAVITAS — Wave V1-C Audit
## Portability, First-Run Onboarding & Clean-Machine Readiness

**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Branch:** `feat/v0-golden-loop`  
**Base HEAD:** `910531cd44277225788409eaca21baa1f8c98c38`  
**Execution Mode:** IMPLEMENT → VERIFY → LOCAL COMMIT → STOP FOR HUMAN REVIEW  

---

### 1. Authority & Scope Compliance

- **V1-A + V1-A-R / V1-B + V1-B-R / Skill Arena:** APPROVED, FROZEN, AND UNTOUCHED.
- **V1-C Scope:** Portable directory resolution, persistent configuration, Gravitas Doctor diagnostic engine, accessible First-Run Setup Wizard, and clean-machine readiness.
- **V1-D / Merging / Remote Operations:** NOT AUTHORIZED — strictly respected.
  - Zero `git push` executed.
  - Zero `git merge` or fast-forward to `main`.
  - Zero live NVIDIA NIM API inference calls.
  - Exactly **$0.00** financial spend / out-of-pocket expense.
  - Zero API keys or secrets written to disk or logs.

---

### 2. Verified Test Metrics Baseline Comparison

| Verification Lane | Pre-V1-C Baseline | Wave V1-C Outcome | Delta | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Vitest Test Suite** | 1,676 passed | **1,699 passed** | +23 tests | **PASS** |
| **Vitest Test Files** | 100 passed | **104 passed** | +4 files | **PASS** |
| **K0 Native SQLite Suite** | 51 passed | **51 passed** | 0 | **PASS** |
| **Total Automated Tests** | 1,727 passed | **1,750 passed** | +23 tests | **PASS** |
| **Electron Dogfood Steps** | 13/13 passed | **13/13 passed** | 0 | **PASS** |
| **TypeScript Compilation** | Clean (0 errors) | **Clean (0 errors)** | 0 | **PASS** |
| **Desktop Asset Bundling** | Built cleanly | **Built cleanly** | 0 | **PASS** |
| **Gravitas Doctor Engine** | N/A | **13 checks (11 OK, 2 Opt Unavail, 0 Blocked)** | +13 checks | **PASS** |

---

### 3. Deliverables Summary

1. **Portable Directory & Path Engine (`packages/core/src/paths.ts`)**:
   - Platform canonical directory resolution: argument -> `GRAVITAS_DATA_ROOT` -> `%APPDATA%\gravitas` -> `~/.gravitas`.
   - Traversal and null-byte injection prevention.
   - Support for paths with spaces and Unicode.
   - Non-destructive probe testing with actionable diagnostics.

2. **Persistent Onboarding Configuration (`packages/core/src/config.ts`)**:
   - Atomic writes via temporary file creation and replacement.
   - Corrupted file backup to `.corrupt-<timestamp>` without data destruction.
   - Default fallback for missing configuration.
   - Zero credential storage in plaintext configuration.

3. **Gravitas Doctor Diagnostic Suite (`packages/core/src/doctor.ts`, `scripts/doctor.mjs`)**:
   - 13 canonical diagnostics covering platform, Node.js, directory writability, SQLite store, schema migration, Electron assets, harnesses (PowerShell, Claude Code, Codex, AGY), NVIDIA credentials, network containment/zero-spend policy, and data root single-writer lock.
   - Stable exit codes: `0` for clean execution or optional warnings, `1` for required blockers.
   - Output available as formatted CLI text and structured JSON.

4. **Desktop Host & IPC Layer (`apps/desktop/src/main/`, `kernel-host/`, `preload/`)**:
   - Propagates canonical data root to supervisor and kernel process.
   - Exposes typed, allowlisted IPC channels (`gravitas:get-onboarding`, `gravitas:save-onboarding`, `gravitas:run-doctor`, `gravitas:configure-provider`).
   - Integrates `onboardingSummary` into kernel system projections.

5. **First-Run Setup Wizard (`apps/desktop/src/renderer/`)**:
   - Accessible 8-step modal stepper (`<dialog id="onboarding-dialog">`).
   - Step A: Welcome & Local-First Philosophy.
   - Step B: Environment Diagnostics (live Doctor runner).
   - Step C: Data Location & Storage Readiness.
   - Step D: Operating Mode Selection (`DETERMINISTIC_ONLY` vs `ASSISTED`).
   - Step E: Harness Discovery & Selection.
   - Step F: Optional AI Provider (NVIDIA NIM in-memory registration).
   - Step G: Security & Spend Policy ($0.00 spend ceiling).
   - Step H: Review & Finish.
