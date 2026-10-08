# GRAVITAS — Wave V1-C Clean-Machine Acceptance
## Evaluation on a Fresh Windows Environment

### 1. Acceptance Criteria Checklist

| Acceptance Criterion | Verification Method | Outcome |
| :--- | :--- | :--- |
| **No Hardcoded Machine Paths** | Static regex audit across codebase for user-specific paths | **PASSED** (all paths resolved dynamically via `resolveGravitasDataRoot`) |
| **Zero NVIDIA Key Dependency** | Default mode operates with `CREDENTIAL_NVIDIA_CHECK = UNAVAILABLE` | **PASSED** (`exitCode = 0`, operates in `DETERMINISTIC_ONLY`) |
| **Data Root Auto-Provisioning** | Bootstrapping against clean directory creates missing dirs safely | **PASSED** (`ensureDataRootDirectories` creates `logs/`, `artifacts/`) |
| **Single-Writer SQLite Integrity** | Clean kernel startup acquires lock; dead PID lock reclaimed | **PASSED** (tested in native K0 suite & Doctor check 13) |
| **Electron App Packaging** | Full Electron bundle builds and executes without build errors | **PASSED** (`build.mjs` succeeds, 13/13 dogfood steps pass) |
| **Model Cost Ceiling** | Invariant check verifies $0.00 ceiling and disabled paid fallback | **PASSED** (tested in `packages/core/src/doctor.test.ts`) |

---

### 2. Empirical Verification

1. **Clean Worktree & Build:**
   - `npm run build --workspace=@gravitas/core`: Clean compilation.
   - `node apps/desktop/build.mjs`: Bundles main, preload, renderer, kernel-host.
2. **Doctor CLI Verification:**
   - `node scripts/doctor.mjs --json`: Confirmed `overallStatus: PASS`, `exitCode: 0`.
3. **Electron Runtime Dogfood:**
   - `node scripts/dogfood-view-switch.mjs`: Confirmed `13/13 steps passed`, sandboxed renderer verified, normal shutdown, 0 orphans remaining.
4. **Full Automated Suite:**
   - `npx vitest run --fileParallelism=false`: 1,699 tests passed across 104 files.
   - `npm run test:kernel`: 51 tests passed.
   - **Total Automated Tests:** 1,750 / 1,750 passed.
