# D3 Adaptive World Runtime Architecture

## 1. Overview & System Topology

Wave D3 introduces the **Living HQ / Adaptive World**: a deterministic, spatial projection layer for GRAVITAS desktop operational state. D3 operates directly on top of the frozen K0–K5 Kernel and the D0/D1/D2 Electron shell.

```
+---------------------------------------------------------------------------------+
|                                 OPERATING SYSTEM                                |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                       Electron Main (DesktopSupervisor)                         |
|   - Window Lifecycle, D2 System Tray, Background Continuity, IPC Routing        |
+---------------------------------------------------------------------------------+
          |                                                   |
          | IPC (Strict Allowlist)                            | Process Channel (MessagePort)
          v                                                   v
+---------------------------------------+   +------------------------------------+
|  Chromium Renderer (Sandboxed)        |   |   Node.js utilityProcess           |
|  - D1 Command Center (DOM)            |   |   (KernelHost / K0-K5 Kernel)      |
|  - D3 Living HQ (Three.js/WebGL2)     |   |   - SQLite DatabaseSync            |
|  - Accessible Semantic Outline (DOM)  |   |   - Single-Writer Canonical State  |
|  - Pure Navigation & Read-only View   |   |   - Causal Revisions & Verification|
+---------------------------------------+   +------------------------------------+
```

## 2. Inviolable Architectural Axioms

1. `UI != CANONICAL_STATE`
2. `SPATIAL_WORLD != CANONICAL_STATE`
3. `VISUAL_STATE != EXECUTION_STATE`
4. `ANIMATION != EXECUTION`
5. `PRESENCE != PROCESS_LIVENESS`
6. `POSITION != AUTHORITY`
7. `CLICK != AUTHORITY`
8. `WORKER_SUCCESS != VERIFIED_SUCCESS`
9. `VERIFIED_PASS != HUMAN_APPROVAL`
10. `WEBGL_FAILURE != APPLICATION_FAILURE`
11. `D4_ROLE_BOT_AVATARS == 0` (Strictly prohibited in D3)

## 3. Spatial Projection Mechanics

The Living HQ does NOT create or store canonical entities. It strictly transforms read-only canonical snapshots into a spatial scene graph:

```typescript
SpatialInput (Hierarchy, Overview, Verifications, Approvals)
       │
       ▼
projectToSpatial() [Pure, deterministic function]
       │
       ▼
SpatialProjection {
  version: "d3.0",
  sourceRevision: number,
  entities: SpatialEntity[],
  decorations: SpatialDecoration[],
  kernelStatus: KernelLifecycleStatus,
  degradedReason?: "OFFLINE" | "STALE" | "REDUCED"
}
```

- **Revisions**: Evaluated via monotonic ordering (`decideAcceptance`). Stale revisions (`rev_candidate < rev_current`) are rejected fail-closed.
- **De-duplication**: Canonical entity keys map strictly to 1-to-1 spatial coordinates. Duplicate IDs are suppressed at projection ingress.
- **Raycast Selection**: Resolves strictly to canonical identity (`spatialEntityId -> sourceEntityId`). Selection contains zero side-effects.
