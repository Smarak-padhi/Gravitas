# GRAVITAS Phase B0 — Initial Build & Typecheck Diagnostics

**Phase**: B0 — Repository Typecheck & Build Convergence  
**Status**: CONVERGED & RESOLVED  
**Timestamp**: 2026-10-05T07:30:00+05:30  

---

## 1. Initial State & Failure Inventory

Prior to Phase B0 authorization, the repository state was:
- P0–P8 = APPROVED_AND_FROZEN
- K0–K5 = APPROVED_AND_FROZEN
- D0–D4 = APPROVED_AND_FROZEN
- 627 / 627 regression tests passing across individual test runners
- Desktop build & live smoke (63/63 steps) passing
- **Root `npm run build`**: FAILING with multiple TypeScript and packaging diagnostics.

### Initial Diagnostic Breakdown by Workspace

1. **`packages/core`**:
   - Initial state: Packaging exported TypeScript sources directly (`./src/index.ts`) in `package.json` while `build` targetted `dist/`.
   - Node-native persistence modules in `kernel/` (`DatabaseSync` from `node:sqlite`, `node:fs`, `node:crypto`) were bundled or exposed indiscriminately, causing browser bundler resolution failures in Vite (`apps/web`).

2. **`packages/orchestrator`**:
   - Duplicate import of `k1` from `@gravitas/harnesses`.
   - `exactOptionalPropertyTypes: true` violations in `ArchitectureCandidate` and `EvidenceItem` construction with explicit `undefined` values.
   - Missing index signature access `simulateOutcome[key]` requiring typed bracket access.
   - Human decision block accessing optional reviewer properties.

3. **`packages/prompts`**:
   - `compiler.ts`: Implicit `any` on lambda parameter `name`.
   - `LAYER_SOURCES[name]` access violating `noUncheckedIndexedAccess: true` without fallback or explicit type assertion.

4. **`apps/server`**:
   - Catch clause parameter `err` typed as `unknown` (TS18046) requiring explicit type-narrowing before accessing `.message`.
   - Registry task update methods receiving `Task | undefined` from orchestrator lookups without explicit null checks.

5. **`apps/desktop`**:
   - `tsconfig.json` missing `"DOM.Iterable"` in `compilerOptions.lib`, resulting in compilation errors on `[...document.querySelectorAll(...)]`.
   - `kernelHost.ts`: Unresolved `randomUUID` identifier reference when handling operator intents.

6. **`apps/web` (Vite Browser Bundling)**:
   - Rollup browser bundler failed when `@gravitas/core` root export exposed `node:sqlite` (`DatabaseSync`) which is unsupported in browser environments.

---

## 2. Root Cause Analysis

- **Strict Mode Alignment**: The root `tsconfig.base.json` enforces ultra-strict compiler settings:
  ```json
  "strict": true,
  "exactOptionalPropertyTypes": true,
  "noUncheckedIndexedAccess": true
  ```
  Older packages and untracked K-wave files constructed objects with `{ prop: undefined }` which violates `exactOptionalPropertyTypes`.
- **Runtime Boundary Separation**: `@gravitas/core` serves dual roles: pure domain types/FSM for both frontend and backend, plus the canonical `WorkSessionKernel` for Node/Electron backends. Exposing Node-only persistence classes from the root module without subpath separation caused browser bundling collisions.

---

## 3. Resolution Strategy (Phase B0 Invariants)

1. **Zero Suppression**: No `@ts-ignore`, no `@ts-nocheck`, no `any`, no `eslint-disable`.
2. **Zero Strictness Weakening**: Maintain `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and `strict: true`.
3. **Subpath Boundary Architecture**: Export the canonical K0 `WorkSessionKernel` under `@gravitas/core/kernel`, while keeping `@gravitas/core` root clean for shared domain entities, FSM, and types.
4. **Zero Runtime Semantics Drift**: Preserve all single-writer SQLite invariants, authority boundaries, and zero-spend constraints.
