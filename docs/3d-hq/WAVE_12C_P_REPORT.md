# GRAVITAS — WAVE 12C-P Final Report
## Authoritative Runtime Projection Snapshot

### Mission Summary
The goal of this wave was to implement a server-owned, sanitized, revisioned runtime projection snapshot so clients can reconstruct truthful HQ state upon refresh/reconnect without replaying historical SSE events.

### Implementations

1. **Baseline Forensics Completed**: Verified current branch `feat/v0-golden-loop` at baseline checkpoint `b198e231a6e3916a65367ad0e8667ffaf6ae3c1c`. Analyzed `types.ts`, `events.ts`, `registry.ts`, `scheduler.ts`, and `service.ts` to identify the missing projection layer.
2. **RuntimeExecutionPhase Enum**: Created `RuntimeExecutionPhase` inside `apps/server/src/projection.ts` to differentiate `PREPARING` vs `WORKER_RUNNING` and `VERIFYING` vs `BROWSER_QA`.
3. **RuntimeProjectionStore Sidecar**: Implemented `RuntimeProjectionStore` which intercepts and processes events to maintain an authoritative projection.
4. **Monotonic Epoch Signal**: Implemented a `epoch` counter in `RuntimeProjectionStore` that increments strictly when projection state changes, avoiding UI churn on empty events.
5. **Event Consumption**: Registered the projection store directly within `EventHub` in `apps/server/src/events.ts` so it synchronously receives all emitted events before they hit SSE transport.
6. **PREPARING Phase Isolation**: `TASK_STATE_CHANGED` to `RUNNING` now triggers the `PREPARING` phase in the projection.
7. **WORKER_RUNNING Phase Alignment**: `WORKER_STARTED` event advances the projection to `WORKER_RUNNING`.
8. **Worker Identity Verification**: Captured `harnessId` payload from `WORKER_STARTED` into `workerIdentity`.
9. **VERIFYING Phase Alignment**: `TASK_STATE_CHANGED` to `VERIFYING` event advances the projection to `VERIFYING`.
10. **BROWSER_QA Distinction**: Intercepted `BROWSER_QA_STARTED` event to correctly project the `BROWSER_QA` execution phase.
11. **Active Route Projection (Wire-up)**: Updated `executeRun` in `apps/server/src/service.ts` to wire up the `onRouteResolved` callback from `BoundedScheduler`.
12. **Inference Route Properties**: Exposed `transport` (`DIRECT` vs `GATEWAY`) and routing parameters like `requestedProvider`, `requestedModel`, `gatewayId`.
13. **Fallback Routing Identification**: Captured `fallbackOccurred` within the `route` property.
14. **Ghost Activity Remediation**: Ensured terminal task states (`WAITING_APPROVAL`, `APPROVED`, `SUCCEEDED`, `FAILED`, `CANCELLED`) automatically drop tasks from `RuntimeProjectionSnapshot.activeTasks`.
15. **Sanitization Boundary Establishment**: Designed the route and projection store strictly avoiding any `headers`, `apiKeys`, or `secrets` storage.
16. **Task Ownership Clarification**: `workerIdentity` and `route.workerId` resolve the ambiguous ownership that `TASK_READY` historically caused.
17. **Central Snapshot API Exposure**: Added the `projection` object dynamically into `getStateSummary()` response payload.
18. **Interface Exporter Updates**: Exported new `RuntimeTaskProjection` and `RuntimeProjectionSnapshot` types inside `apps/server/src/types.ts`.
19. **Test Suite Proof**: Ran `vitest run apps/server` verifying `golden-loop-api.test.ts`, `security.test.ts`, etc., pass without errors alongside the added projection payload.
20. **Zero FSM Side-Effects**: Respected the architectural boundary, leaving `TaskState` unaltered.
21. **No External DB Requirement**: Implemented strictly in-memory aligned with `InMemoryRegistry`.
22. **No Frontend Hacks Needed**: With `getStateSummary()` enriched, the client reads server truth upon reconnect.
23. **Robust Phase Transitions**: Evaluated cases where `WORKER_FINISHED` precedes `VERIFYING` and terminal state cleanups catch all cases.
24. **No Three.js Interference**: Avoided frontend modifications for this foundational backend ticket.
25. **Safe Data Types**: Extracted `ResolvedInferenceRoute` selectively into `route` object for projection.
26. **Correct Import Paths**: Verified correct ES modules path imports (`./projection.js`).
27. **Complete 12C-P Baseline Match**: Followed the prompt's `DO NOT`s regarding Locust / Locomotion / 12D.
28. **State Snapshot Robustness**: Epoch and revision provide cache-busting and change detection signals.
29. **No "Magic Inference" Visuals**: Authoritative server telemetry maps directly to 3D state.
30. **Wave 12C Unblocked**: Architectural gaps identified in audit have been addressed. See `docs/3d-hq/WAVE_12C_P_R_REPORT.md` for full verification evidence.
