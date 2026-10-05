# D3 Runtime Verification Evidence

## 1. Automated Suite Evidence

- **Location**: `apps/desktop/src/d3.test.ts`
- **Result**: 60 / 60 tests passed.
- **Coverage**:
  - Pure spatial projection, 16 visual states, 7 animation classes.
  - Revision ordering (`decideAcceptance`) and stale rejection.
  - Epistemic invariants (`WORKER_SUCCESS != VERIFIED_SUCCESS`).
  - Degradation tiers (`FULL_3D`, `REDUCED_3D`, `SEMANTIC_ONLY`).
  - Accessible outline DOM construction and sanitization.
  - Raycaster picking contract returning identity only.
  - Performance budgets across 6, 27, and 125 entity benchmarks.

## 2. Live Electron Dogfood Evidence (51 Steps)

- **Harness**: `apps/desktop/src/dogfood-d3-real.mjs`
- **Execution Date**: 2026-10-04
- **Runtime**: Electron 44.5.1 / Node v24.21.0 / Windows 11
- **All 51 Steps Verified**:
  - Step 01-04: Electron Main (PID 15964) and Kernel utilityProcess (PID 21820) start with distinct PIDs.
  - Step 05-08: Command Center ready; Living HQ entered; WebGL initialized on NVIDIA GeForce RTX 3050 Laptop GPU.
  - Step 09-17: Canonical Overview fetched; spatial projection created; WorkSession/Run/Task rendered truthfully.
  - Step 18-22: Spatial selection picks Task in 3D; Semantic Inspector resolves identical ID; Command Center sync confirmed.
  - Step 23-26: Verification begins; `VERIFIED_PASS` distinguished from approval; `WAITING_FOR_HUMAN_APPROVAL` gate placed in `HUMAN_GATE` zone.
  - Step 27-29: Approval marker clicked; semantic approval UI opened; no automatic approval triggered.
  - Step 30-35: Window hidden via D2 background lifecycle; Kernel remains alive; background task created; window restored with fresh projection.
  - Step 36-38: Renderer reloaded; Kernel PID unchanged (21820); Living HQ reconstructs cleanly.
  - Step 39-40: Repeated view switching (4 cycles); single render loop verified (`activeRenderers <= 1`, `pending <= 1`).
  - Step 41-42: Reduced-motion mode entered; animations halted; semantic outline remains available.
  - Step 43-45: Controlled WebGL failure forced; degraded to semantic banner; normal 3D restored.
  - Step 46-51: System tray verified; clean `SHUTDOWN_REQUEST` / `SHUTDOWN_ACK` handshake; Kernel exits with code 0; zero orphan processes.

## 3. Negative Security & Boundary Dogfood Evidence (12 Fixtures)

- **Harness**: `apps/desktop/src/dogfood-d3-negative.mjs`
- **Result**: All 12 fixtures PASSED (FAILED-CLOSED):
  - Fixture A: Stale projection revision cannot override fresh revision.
  - Fixture B: Duplicate entity canonical IDs de-duplicated.
  - Fixture C: Malicious entity labels sanitized without executing markup.
  - Fixture D: Living HQ clicks have zero authority to approve or dispatch.
  - Fixture E: Living HQ data source contains only read-only queries.
  - Fixture F: Context isolation blocks raw Node and IPC primitives in renderer.
  - Fixture G: Forced WebGL failure degrades cleanly to SEMANTIC_ONLY without crash.
  - Fixture H: Kernel offline cleanly degrades spatial projection without fake data.
  - Fixture I: Renderer reload in offline/degraded state remains stable.
  - Fixture J: Cross-session spatial isolation verified.
  - Fixture K: Reduced motion disables spatial animation while preserving semantic accessibility.
  - Fixture L: Zero raw secrets or credentials leaked into Living HQ DOM.
