# GRAVITAS — WAVE 12I: RENDERING PERFORMANCE OPTIMIZATION PLAN

**Primary Goal**: Achieve real foreground interactive average **>= 45 FPS** on Floor 2 DAY and NIGHT (at 1600x900, DPR 1.0) while maintaining 100% visual parity with the approved Wave 12H-R3C-C baseline.

---

## 1. Ranked Bottlenecks by Measured Impact

| Rank | Bottleneck | Measured Symptom | Planned Solution | Expected Delta |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Out-of-View Floor Traversal & Rendering** | 342 meshes on floors 0, 1, 3, 4, 5, 6 rendered during Floor 2 focus | Spatial floor-level visibility gating when framed on a specific floor; full tower restored on Overview/Elevator | **-180 to -220 draw calls** |
| **2** | **Excessive Shadow Caster Load** | 189 shadow casters generate 166 shadow draw calls (38% of total calls) | Prune sub-centimeter prop casters (screws, cables, tiny clips); retain primary silhouettes (desks, monitors, characters) | **-100 to -120 shadow calls** |
| **3** | **Spotlight Shader Loop Overhead** | 10 SpotLights active across 6 floors evaluated on every visible fragment | Gating out-of-view floor spotlights when framed tightly on Floor 2; all active during Overview | **Material fragment shader speedup** |
| **4** | **Static Matrix Auto-Update Churn** | 782 nodes (100%) recompute world matrices every frame | Freeze static architecture & furniture matrices (`matrixAutoUpdate = false`) after initial placement | **Eliminates matrix churn on ~720 nodes** |
| **5** | **Geometry Duplication** | 601 unique BufferGeometries (394 boxes, 104 cylinders) | Deduplicate and share canonical geometries across repeated elements (feet, wheels, columns, bezels) | **Memory reduction from 601 to <220 geos** |

---

## 2. Step-by-Step Implementation Strategy

### Step 1: Static Matrix Freezing
- Freeze static geometry nodes in `HqArchitecture`, `HqFurniture`, `HqInfrastructure`.
- After scene building, recursively execute `updateMatrix()`, `updateMatrixWorld(true)`, and set `matrixAutoUpdate = false`.
- Keep characters, elevator cab, and animated conduits dynamic.
- **Verification**: Visual check, no static objects displaced.

### Step 2: Shadow Caster Pruning
- Audit every `castShadow = true` in `heroFrontendBay.ts`, `heroBackendBay.ts`, `heroReviewerBay.ts`, `infrastructure.ts`, `furniture.ts`.
- Retain shadows on:
  - Characters (torso, head, hair)
  - Workstation desktops, monitors, task chair seats/backs
  - Central Reviewer desk & console
  - Main floor plinth & partition walls
- Remove shadow casting from:
  - Tiny keyboard cases, mouse bodies, mugs, notebook spines, cable trays, ductwork brackets, caster wheels.
- **Verification**: Shadows on desks, characters, and floor remain sharp and visually identical to Wave 12H-R3C-C.

### Step 3: Out-of-View Floor Spotlight Culling
- When framed on Floor 2 (`frameRoom('AGENT_OPERATIONS')`):
  - Disable spotlights for Floor 1 (`spotPlanning`), Floor 3 (`spotVerification`), Floor 4 (`spotBrowser`), Floor 5 (`spotInfrastructure`), Floor 6 (`spotApproval`).
  - Keep Floor 2's dedicated architectural rig fully active (`spotOperations`, `spotOperationsWash`, `spotOperationsDeskL`, `spotOperationsDeskR`, `spotOperationsReviewer`).
- When returning to Overview (`resetToOverview()`):
  - Re-enable all floor spotlights.
- **Verification**: Day and Night appearances on Floor 2 are 100% invariant, but fragment shader uniform loops are drastically shortened.

### Step 4: Floor Visibility Management
- Add conservative floor-group visibility control in `HqArchitecture` and `HqFurniture`:
  - When tightly focused on Floor 2, non-adjacent floors (Floors 0, 4, 5, 6) can be hidden from both the main render pass and shadow pass.
  - When in Overview, during elevator transit, or when viewing all floors, all floor groups are visible (`visible = true`).
  - Preserves runtime state: Character presentation states, task dossiers, and station statuses continue updating in memory and derive immediately when navigating.

### Step 5: Geometry Deduplication
- Cache common box and cylinder geometries in `HqFurniture` and `heroBay` modules:
  - Chair wheels (`CylinderGeometry(0.024, 0.024, 0.02, 8)`)
  - Chair legs (`BoxGeometry(0.24, 0.02, 0.03)`)
  - Desk feet and columns
- Reduce total memory geometry count by >50%.

---

## 3. Ablation Measurement Plan
For each optimization step, run a 10-second automated and foreground benchmark to record:
- Draw Calls
- Triangles
- Geometries
- Real Foreground Avg FPS
- p95 Frame Time (ms)
