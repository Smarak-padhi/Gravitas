# Gravitas Wave 12F-R Report — Production Handoff Projection Closure

**Branch:** `feat/v0-golden-loop`  
**Baseline:** `b9b1445`  
**Execution Date:** 2026-09-23  
**Status:** PASS — All gates verified green  

---

## 1. Executive Summary

Wave 12F-R closes the production-path gap identified during Wave 12G Phase 1 preparation:

- **Before 12F-R:**
  Scheduler handoff truth existed canonically in memory inside `BoundedScheduler` and invoked `onHandoffUpdated`, but `apps/server/src/service.ts` did not wire that callback into `RuntimeProjectionStore`. As a consequence, `GET /api/v1/state -> projection.handoffs` remained empty in production runs, preventing frontend consumers from receiving authoritative handoff states without synthetic workarounds.
- **After 12F-R:**
  Handoff truth is canonically wired into `RuntimeProjectionStore` via `onHandoffUpdated` in `apps/server/src/service.ts` with initial seed propagation directly from `BoundedScheduler.initializeTasks()` in `packages/orchestrator/src/scheduler.ts`. All handoffs are retained in the authoritative `RuntimeProjectionSnapshot` and fully recoverable across client reconnects/refreshes without requiring historical SSE replay.

---

## 2. Exact Source Audit & Root Cause

### 2.1 Audit of Component Responsibilities
1. `packages/core/src/handoff.ts`:
   - Defines canonical data contracts: `TaskHandoff`, `TaskArtifactRef`, `IndependentReviewResult`, `IntegrationPreparationResult`.
   - Domain invariants: reviewer independence, no self-handoffs, allowed state transitions (`BLOCKED` -> `READY` -> `IN_PROGRESS` -> `SATISFIED` | `FAILED`).
2. `packages/orchestrator/src/scheduler.ts`:
   - Manages canonical handoff state in private `handoffs` Map.
   - Declares `onHandoffUpdated?: (handoff: TaskHandoff) => void` in `BoundedSchedulerOptions`.
   - Fires `onHandoffUpdated` during task transitions (`recordReviewResult`, `recordIntegrationResult`, `registerTaskCompletion`, `registerTaskFailure`).
   - **Gap Identified:** Did not invoke `onHandoffUpdated` upon initial creation of `REVIEW` and `DEPENDENCY` handoffs during `initializeTasks()`.
3. `apps/server/src/service.ts`:
   - Instantiates `BoundedScheduler` in `RunService.executeRun()`.
   - **Root Cause:** Did not wire `onHandoffUpdated` into `this.eventHub.projectionStore.setHandoff()`.

---

## 3. Production Wiring & Initial Seed Strategy

### 3.1 Production Wiring in `apps/server/src/service.ts`
In `RunService.executeRun()`, `BoundedScheduler` is configured with `onHandoffUpdated`:

```typescript
onHandoffUpdated: (handoff) => {
  // Sanitization boundary: only allowlisted projection fields.
  // No prompt bytes, API keys, auth tokens, worktree paths, or provider credentials.
  this.eventHub.projectionStore.setHandoff({
    handoffId: handoff.id,
    kind: handoff.kind,
    sourceTaskId: handoff.sourceTaskId,
    targetTaskId: handoff.targetTaskId,
    ...(handoff.sourceRoleId ? { sourceRoleId: handoff.sourceRoleId } : {}),
    ...(handoff.targetRoleId ? { targetRoleId: handoff.targetRoleId } : {}),
    state: handoff.state,
    ...(handoff.reasonCode ? { reasonCode: handoff.reasonCode } : {}),
  })
}
```

### 3.2 Canonical Initial Seed in `packages/orchestrator/src/scheduler.ts`
To ensure that initial `BLOCKED` or `READY` states are projected prior to subsequent task transitions, `BoundedScheduler.initializeTasks()` triggers `this.onHandoffUpdated?.(handoff)` immediately upon adding `REVIEW` and `DEPENDENCY` handoffs to `this.handoffs`. This avoids any duplicate shadow state in `service.ts` and guarantees a single canonical stream of updates.

---

## 4. Lifecycle Semantics & Terminal Cleanup

| Lifecycle Phase | Scheduler State | Projection State | Snapshot Invariant |
|-----------------|-----------------|------------------|-------------------|
| Plan Init (Dependency) | `BLOCKED` (`UPSTREAM_PENDING`) | `BLOCKED` | Preserved in snapshot |
| Plan Init (Review) | `BLOCKED` (`REVIEW_REQUIRED`) | `BLOCKED` | Preserved in snapshot |
| Upstream Completed | `READY` (`UPSTREAM_SATISFIED`) | `READY` | Preserved in snapshot |
| Target Task Active | `IN_PROGRESS` | `IN_PROGRESS` | Preserved in snapshot |
| Review Verdict PASS | `SATISFIED` (`REVIEW_PASSED`) | `SATISFIED` | Preserved as durable evidence |
| Review Verdict CHANGES | `FAILED` (`REVIEW_CHANGES_REQUIRED`) | `FAILED` | Preserved as durable evidence |
| Integration Conflict | `FAILED` (`INTEGRATION_CONFLICT`) | `FAILED` | Preserved as durable evidence |
| Task / Upstream Failure | `FAILED` (`UPSTREAM_FAILED`) | `FAILED` | Terminal state truthfully represented |

Terminal states remain visible as historical evidence in `RuntimeProjectionSnapshot.handoffs` rather than being erased, preventing false "active" representation without destroying provenance.

---

## 5. Sanitization Boundary

The projection store enforces a strict allowlist boundary:
- **Allowed fields:** `handoffId`, `kind`, `sourceTaskId`, `targetTaskId`, `sourceRoleId`, `targetRoleId`, `state`, `reasonCode`.
- **Explicitly stripped/excluded:** Prompts, compiled prompt bytes, API keys, Bearer tokens, model provider headers, raw LLM completions, worktree paths, and server environment variables.
- Verified by unit test `W12FR-8. Sanitization boundary: excludes sensitive payload fields`.

---

## 6. Snapshot Recovery, Event Eviction & Concurrency Proof

1. **Live State Visibility:** Verified via `GET /api/v1/state` returning non-empty `projection.handoffs`.
2. **Refresh & Reconnection:** Clients connecting at arbitrary points receive the authoritative snapshot directly from `RuntimeProjectionStore` without needing to replay historical SSE events (`W12FR-10`).
3. **Event Buffer Eviction Independence:** Evicting the in-memory event buffer (`clearEvents()`) leaves `projectionStore.getSnapshot().handoffs` completely intact (`W12FR-11`).
4. **Concurrency Isolation:** Multiple concurrent handoffs (`t1->t2`, `t3->t4`) update independently without cross-contaminating states or reason codes (`W12FR-9`).
5. **Stale Callback Protection:** Scheduler state transitions enforce monotonicity so stale replays cannot regress terminal states (`W12FR-12`).

---

## 7. Real Production-Path Integration Proof

Test `W12FR-13` in `apps/server/src/projection.test.ts` executes a real multi-task DAG (`t_fe` -> `t_rev`) via:
- Real `GravitasServer` running on loopback HTTP port.
- Real `RunService` using `FastFakeHarness`.
- Real `BoundedScheduler` DAG initialization, execution, and callback dispatch.
- **Assertion:** `GET /api/v1/state` returns `projection.handoffs` with the canonical dependency handoff from `t_fe` to `t_rev`, verifying the complete end-to-end production path.

---

## 8. Frontend Compatibility Proof (Zero Locomotion)

Tests `W12FR-14` and `W12FR-15` in `apps/server/src/projection.test.ts` verify:
1. `deriveWorldState()` in `apps/web/src/hq3d/world/worldState.ts` consumes `projection.handoffs` directly and produces corresponding `WorldHandoffState` instances with stations mapped via `getStationForCanonicalRole()`.
2. **Zero Locomotion Contract:** `WorldHandoffState` instances carry strictly presentation-only fields (`id`, `kind`, `state`, `sourceStationId`, `targetStationId`). No locomotion, position interpolation, waypoints, or mutation methods are present.

---

## 9. Test & Verification Matrix

### 9.1 Wave 12F-R Explicit Tests (`apps/server/src/projection.test.ts`)
- `W12FR-1`: Initial BLOCKED handoff reaches projection store via setHandoff (seed path) — PASS
- `W12FR-2`: READY handoff state reaches projection store — PASS
- `W12FR-3`: IN_PROGRESS handoff state reaches projection store — PASS
- `W12FR-4`: SATISFIED handoff state reaches projection store — PASS
- `W12FR-5`: FAILED handoff state reaches projection store — PASS
- `W12FR-6`: reasonCode survives setHandoff sanitization pass-through — PASS
- `W12FR-7`: Canonical role IDs survive setHandoff pass-through — PASS
- `W12FR-8`: Sanitization boundary: excludes sensitive payload fields — PASS
- `W12FR-9`: Concurrent handoffs do not cross-contaminate state — PASS
- `W12FR-10`: Fresh client connects to server and receives populated handoffs without SSE history — PASS
- `W12FR-11`: Event buffer eviction does not purge handoff projection state — PASS
- `W12FR-12`: Monotonicity check: terminal handoff remains terminal — PASS
- `W12FR-13`: Production-path: real RunService + scheduler wires handoffs into GET /api/v1/state snapshot — PASS
- `W12FR-14`: Frontend WorldState correctly consumes projection.handoffs (non-empty snapshot) — PASS
- `W12FR-15`: Handoff conduits remain presentation-only: WorldHandoffState carries no locomotion or task-mutation fields — PASS

### 9.2 Repository-Wide Test Summary
- `npm run typecheck`: PASS (0 errors across 11 workspaces)
- `npx vitest run packages/core`: 10 test files, 172 passed
- `npx vitest run packages/orchestrator`: 6 test files, 36 passed
- `npx vitest run apps/server`: 13 test files, 73 passed
- `npx vitest run apps/web`: 13 test files, 104 passed
- `npx vitest run packages/git packages/harnesses packages/browser-qa packages/verifier packages/agents packages/gateways`: 23 test files, 265 passed
- `npm run build`: PASS (all workspaces built cleanly, Vite production bundle generated)
- `npx playwright test --workers=1`: 41 browser E2E tests passed
- `git diff --check`: PASS (clean diff, no whitespace errors)

### 9.3 Security Audit (`npm audit`)
- 5 pre-existing vulnerabilities in upstream dev dependencies (`omniroute` -> `onnxruntime-node` -> `adm-zip` and `monaco-editor` -> `dompurify`), with no upstream fixes currently available. Documented honestly.

---

## 10. Status

**WAVE 12F-R — GO**  
**WAVE 12G — NOT STARTED**
