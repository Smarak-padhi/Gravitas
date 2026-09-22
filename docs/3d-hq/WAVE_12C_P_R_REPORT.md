# GRAVITAS — WAVE 12C-P-R Verification and Closure Report
## Authoritative Runtime Projection Snapshot Verification

### 1. Executive Summary
Wave 12C-P-R verified and closed the runtime projection recovery guarantees on branch `feat/v0-golden-loop`.
The baseline candidate commit `c0af2a7` introduced the runtime projection store, but audit revealed:
1. Conflation of `epoch` and `revision` (epoch was an integer counter incremented per mutation).
2. Missing `schemaVersion: '1.0.0'`.
3. Lack of stale-update protection (delayed callbacks could resurrect terminal tasks).
4. Missing `active: boolean` on routes (unable to distinguish active execution from historical provenance).
5. Missing distinct fallback properties (`providerFallbackOccurred` vs `transportFallbackOccurred`).
6. Phase transitions did not cleanly clear `WORKER_RUNNING` upon `WORKER_FINISHED`.

All 6 defects have been remediated in `apps/server/src/projection.ts` and `apps/server/src/types.ts`, backed by a dedicated test suite in `apps/server/src/projection.test.ts`.

---

### 2. Implementation & Remediation Details

- **Epoch & Revision**:
  - `epoch: string` is an opaque lifetime identifier generated once per store instance (`proj_epoch_<uuid>`).
  - `revision: number` is a monotonic integer counter starting at 0, incremented strictly upon material state mutations.
- **Schema Version**:
  - `schemaVersion: '1.0.0'` is included in all serialized snapshots.
- **Route Lifecycle & Fallbacks**:
  - `RuntimeRouteProjection` tracks `active: boolean` (`true` while worker is actively running, `false` after finish or gateway completion).
  - Tracks `providerFallbackOccurred: boolean` and `transportFallbackOccurred: boolean` independently.
  - Retains `requestedProvider`, `requestedModel`, `actualProvider`, `actualModel`, and `gatewayId`.
- **Phase & Verification Distinction**:
  - Distinguishes `PREPARING` vs `WORKER_RUNNING` during `task.state === 'RUNNING'`.
  - Distinguishes `VERIFYING` (deterministic verifier) vs `BROWSER_QA` (Playwright DOM tests) during `task.state === 'VERIFYING'`.
  - Captures `status: 'RUNNING' | 'PASSED' | 'FAILED'` on `RuntimeVerificationProjection` and `RuntimeBrowserQaProjection`.
- **Terminal Task Pruning & Stale Callback Protection**:
  - Tasks in terminal states (`WAITING_APPROVAL`, `APPROVED`, `SUCCEEDED`, `COMPLETED`, `FAILED`, `CANCELLED`) are deleted from `activeTasks`.
  - `terminalTaskIds: Set<string>` drops delayed events or route resolutions for terminated tasks, preventing resurrection.
- **Sanitization Boundary**:
  - All snapshots are generated via allowlisted object construction.
  - Headers, tokens, API keys, canary secrets, and internal configuration objects are strictly excluded.

---

### 3. Verification Matrix (27 Acceptance Items)

| # | Acceptance Item | Verification Result | Evidence Location |
|---|---|---|---|
| 1 | Empty projection schema (`schemaVersion: '1.0.0'`, `epoch: string`, `revision: 0`, `activeTasks: []`) | PASS | `apps/server/src/projection.test.ts:25-32` |
| 2 | Stable epoch across mutations within server lifetime | PASS | `apps/server/src/projection.test.ts:35-51` |
| 3 | Monotonic revision incrementing on material mutations | PASS | `apps/server/src/projection.test.ts:35-51` |
| 4 | No-op event ignores (no revision increment on unrelated events) | PASS | `apps/server/src/projection.test.ts:54-71` |
| 5 | `PREPARING` phase on `TASK_STATE_CHANGED` -> `RUNNING` | PASS | `apps/server/src/projection.test.ts:74-126` |
| 6 | `WORKER_RUNNING` phase on `WORKER_STARTED` | PASS | `apps/server/src/projection.test.ts:74-126` |
| 7 | Authoritative worker identity from `WORKER_STARTED` (`harnessId`) | PASS | `apps/server/src/projection.test.ts:74-126` |
| 8 | Route lifecycle: `route.active` true during run, false upon finish | PASS | `apps/server/src/projection.test.ts:74-126` |
| 9 | Verification phase: `VERIFYING` with status `RUNNING`/`PASSED`/`FAILED` | PASS | `apps/server/src/projection.test.ts:129-170` |
| 10 | Browser QA phase: `BROWSER_QA` with status `RUNNING`/`PASSED`/`FAILED` | PASS | `apps/server/src/projection.test.ts:173-214` |
| 11 | Route transport distinction (`DIRECT` vs `GATEWAY`) | PASS | `apps/server/src/projection.test.ts:217-270` |
| 12 | Independent fallbacks (`providerFallbackOccurred` vs `transportFallbackOccurred`) | PASS | `apps/server/src/projection.test.ts:217-270` |
| 13 | Gateway ID and provider/model tracking | PASS | `apps/server/src/projection.test.ts:217-270` |
| 14 | Terminal task removal from `activeTasks` | PASS | `apps/server/src/projection.test.ts:273-305` |
| 15 | Deterministic lifecycle integration test (fixture harness, DIRECT control): `PREPARING` -> `WORKER_RUNNING` -> `WAITING_APPROVAL` | PASS | `apps/server/src/projection.test.ts:570-634` |
| 16 | Concurrent task isolation (T1 and T2 retain independent phases/routes) | PASS | `apps/server/src/projection.test.ts:308-370` |
| 17 | Event-history eviction independence (projection intact after buffer eviction) | PASS | `apps/server/src/projection.test.ts:636-663` |
| 18 | Fresh-client recovery (reconstruct truthful state without SSE replay) | PASS | `apps/server/src/projection.test.ts:665-701` |
| 19 | Stale callback protection (delayed event cannot resurrect terminal task) | PASS | `apps/server/src/projection.test.ts:373-405` |
| 20 | Secret sanitization boundary (canary secrets/keys strictly excluded) | PASS | `apps/server/src/projection.test.ts:408-440` |
| 21 | Zero FSM side-effects (`TaskState` in `@gravitas/core` unaltered) | PASS | Verified in `packages/core/src/types.ts` |
| 22 | In-memory store (zero external database dependency) | PASS | `apps/server/src/projection.ts` |
| 23 | Synchronous EventHub integration before SSE emission | PASS | `apps/server/src/events.ts:23-28` |
| 24 | Scheduler wire-up (`onRouteResolved` callback in `service.ts`) | PASS | `apps/server/src/service.ts:335-339` |
| 25 | Central snapshot API (`projection` field in `getStateSummary()`) | PASS | `apps/server/src/service.ts:160-164` |
| 26 | Exported TypeScript types in `apps/server/src/types.ts` | PASS | `apps/server/src/types.ts:184-191` |
| 27 | 3D HQ untouched (`apps/web/src/hq3d/**` unchanged) | PASS | `git diff --name-only` confirms no `apps/web/src/hq3d` changes |

---

### 4. Test Suite Execution & Quality Metrics

1. **`apps/server/src/projection.test.ts`**:
   - 13 passed, 0 failed, 13 total tests (duration: 5.81s).
2. **`apps/server` Test Suite (`npx vitest run apps/server`)**:
   - 13 test files passed, 56 passed, 0 failed (duration: 24.08s).
3. **`apps/web` Test Suite (`npx vitest run apps/web`)**:
   - 10 test files passed, 66 passed, 0 failed (duration: 0.96s).
4. **Full Workspace Vitest Suite (`npm test`)**:
   - 62 test files passed, 604 passed, 0 failed (duration: 82.87s).
5. **Typecheck (`npm run typecheck`)**:
   - Exit code: 0 across all 11 packages and apps.
6. **Build (`npm run build`)**:
   - Exit code: 0 across all packages and web app.
7. **Security Audit (`npm audit`)**:
   - Exit code: 1.
   - 5 vulnerabilities (1 low, 1 moderate, 2 high, 1 critical), all belonging to pre-existing dependency trees (`omniroute` / `onnxruntime-node` / `monaco-editor`). Zero new dependencies introduced.
8. **Git Hygiene (`git diff --check`)**:
   - Exit code: 0, no whitespace errors or merge conflict markers.

---

### 5. Invariant Confirmation
- Wave 12C has NOT been started.
- Three.js and `apps/web/src/hq3d/**` were NOT modified.
- Wave 12D has NOT been started.

---

### 6. Wave 12C-P-E Real Execution Evidence Closure

Authoritative execution traces captured live against isolated temporary environments with zero credential leakage:

1. **DIRECT Control Proof (`.evidence/12c-p-real-direct.json`)**:
   - Real `GravitasServer` + native OpenAI Codex CLI binary (`codex-cli 0.153.4`).
   - Observed phase transitions: `PREPARING` $\to$ `WORKER_RUNNING` (`route.transport: DIRECT`) $\to$ `WAITING_APPROVAL`.
   - Terminal cleanup confirmed: `activeTasks: []`.
   - Fresh-client state query verified: `GET /api/v1/state` returns identical truthful projection.

2. **GATEWAY Execution Proof (`.evidence/12c-p-real-gateway.json`)**:
   - Real `GravitasServer` + qualified OmniRoute 3.8.50 sidecar daemon (`decision=APPROVED`, `state=READY`) + mock loopback upstream.
   - Observed phase transitions: `PREPARING` $\to$ `WORKER_RUNNING` (`route.transport: GATEWAY`, `route.gatewayId: omniroute-local`, `route.active: true`) $\to$ `CLEANUP` (`route.active: false`) $\to$ `VERIFYING` (`verification.status: RUNNING`) $\to$ `WAITING_APPROVAL`.
   - Terminal cleanup confirmed: `activeTasks: []`.
   - Fresh-client recovery confirmed: `GET /api/v1/state` reconstructed `revision: 11`, `activeTasks: []`.
   - Secret sanitization verified: Zero canary tokens, keys, or authorization headers leaked.
