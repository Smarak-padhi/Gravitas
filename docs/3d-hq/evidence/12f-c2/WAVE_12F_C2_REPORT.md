# Gravitas Wave 12F-C2: Visual Causal Proof + Active-View Performance Closure Report

**Execution Date:** September 27, 2026  
**Status:** Verification Completed  
**Branch:** `feat/v0-golden-loop`  
**Baseline Anchor (`main`):** `778a8a5270ece822f822f214e52db72bb8265a1d`  

---

## 1. Executive Summary & Core Contradiction Resolution

In Wave 12F-C, `runtime-character-causal-proof.json` asserted that the Frontend Engineer remained seated at the workstation across `PREPARING`, `WORKER_RUNNING`, and `CLEANUP`. However, visual inspection of the captured screenshots showed an empty chair during those three active states.

Wave 12F-C2 has systematically traced, proven, and resolved this contradiction. The Frontend Engineer is now proven—both visually and via hard automated assertions at screenshot time—to be seated continuously at the workstation with zero physical dislocation (`distanceFigureToWorkstationAnchor = 0.00m <= 0.25m`). Furthermore, the active-view F2 workstation rendering performance was profiled and optimized from 36.9 FPS to a rock-solid **60.0 FPS** (median frame time **16.7 ms**), far exceeding the required $\ge 45\text{ FPS}$ target.

---

## 2. Root Cause Analysis

### Trace
`runtime projection` $\rightarrow$ `role presentation` $\rightarrow$ `spatial intent` $\rightarrow$ `CharacterMotionController` $\rightarrow$ `figure transform/visibility` $\rightarrow$ `workstation anchor` $\rightarrow$ `camera capture`

### Discovery
1. **Locomotion 2D Coordinate Snapping:**
   - In `CharacterMotionController.ts`, `snapToStation(roleId, stationId)` queried `this.navGraph.findNode(stationId)`.
   - The navigation graph nodes (`navigationGraph.ts`) store historical 2D single-floor coordinates (e.g. `[-6.5, 0.0, 1.85]`).
   - The 3D Cutaway Tower Floor 2 coordinates for the Frontend Engineer workstation are `[-3.5, 7.2, 1.15]`.
   - When `reconcileIntents` ran for `PREPARING` and `WORKER_RUNNING` (`spatialIntent = AT_ASSIGNMENT`), `snapToStation` snapped the character 7.2 meters straight down to the 2D ground plane at $Y = 0.0$, instantly vacating the Floor 2 workstation chair!
2. **Arm Posture Sign Inversion:**
   - In `HqCharacters.update()`, the positive X-rotation lowered arm elevation in Three.js right-handed coordinate space instead of raising it onto the keyboard, keeping hands below the desk line in screenshot framing.
3. **Screen Material Swap Inaction:**
   - In `HqFurniture.ts`, `setStationStatus` modified `emissiveIntensity` but did not swap the monitor material from `heroScreenIdle` (whose base emissive color was `0x000000`) to `heroScreenActive`.

### Architectural Remedy
1. Introduced `isTowerMode: boolean` to `CharacterMotionController`:
   - When `isTowerMode === true` (instantiated by `HqScene`), station snapping strictly resolves to `TOWER_ROLE_HOME_POSITIONS[roleId]` (`[-3.5, 7.2, 1.15]`), completely preventing ground-plane drop.
   - When `isTowerMode === false` (used by `locomotion.test.ts`), legacy 2D graph traversal and single-floor test assertions are 100% preserved (all 60 locomotion tests pass with zero regression).
2. Corrected ergonomic arm rotation in `HqCharacters.update()`:
   - For `FOCUSED` (`WORKER_RUNNING`): arms elevate up to keyboard typing position (`rotation.x = -0.36`) with active sinusoidal keystroke oscillation ($\pm 0.008\text{m}$) and forward torso lean (`0.12 rad`).
   - For `IDLE`, `ATTENTION` (`PREPARING`), and `WAITING` (`CLEANUP`): arms rest down comfortably in the chair/lap (`rotation.x = 0.18`), torso upright/reclined (`-0.02 rad`), and typing motion strictly halted (`position.y = 0.00m`).
3. Screen Texture Swapping:
   - `HqFurniture.setStationStatus` now explicitly swaps `screen:hero-ultrawide` to `materials.heroScreenActive` (active code canvas texture with $0.65$ emissive glow) when active, and restores `materials.heroScreenIdle` when idle.

---

## 3. Visual Causal Sequence & Hard State Assertions

A single deterministic camera framing (`WS_FRONTEND_CAUSAL`, target `[-3.5, 7.80, 0.90]`, eye `[-1.8, 8.65, 0.20]`) was established to capture the unified evidence sequence.

### Assertions at Screenshot Time
At each screenshot step, the test queries the running scene and enforces:
- `roleId === 'role:engineering:frontend-engineer'`
- `figure.visible === true`
- `distanceFigureToWorkstationAnchor <= 0.25m` (Hard Fail Contract)
- `typingActive === (characterState === 'FOCUSED')`

### Step Summary Table

| Image | State | Runtime Phase | Typing | Visible | World Pos | Distance to Anchor | Station Status | Pose / Visual Proof |
|---|---|---|---|---|---|---|---|---|
| `01-idle.png` | `IDLE` | `null` | `false` | `true` | `[-3.5, 7.2, 1.15]` | `0.00m` | `IDLE` | Visibly seated in chair, relaxed posture, arms resting in lap, screens dark |
| `02-preparing.png` | `ATTENTION` | `PREPARING` | `false` | `true` | `[-3.5, 7.2, 1.15]` | `0.00m` | `ACTIVE` | Attentive posture, hands off keyboard, dossier arriving at desk, no typing |
| `03-worker-running.png` | `FOCUSED` | `WORKER_RUNNING` | `true` | `true` | `[-3.5, 7.2, 1.15]` | `0.00m` | `ACTIVE` | Leaning forward toward monitors, hands active on keyboard/mouse, typing active |
| `04-cleanup.png` | `WAITING` | `CLEANUP` | `false` | `true` | `[-3.5, 7.2, 1.15]` | `0.00m` | `ACTIVE` | Upright waiting posture, hands off keyboard, typing stopped |
| `05-verifying.png` | `IDLE` | `VERIFYING` | `false` | `true` | `[-3.5, 7.2, 1.15]` | `0.00m` | `IDLE` | Frontend Engineer no longer working, hands in lap, reviewer station active |
| `06-night-idle.png` | `IDLE` | `null` | `false` | `true` | `[-3.5, 7.2, 1.15]` | `0.00m` | `IDLE` | Night lighting active, character visible, screens dormant (emissive = 0.0) |
| `07-night-worker-running.png` | `FOCUSED` | `WORKER_RUNNING` | `true` | `true` | `[-3.5, 7.2, 1.15]` | `0.00m` | `ACTIVE` | Night lighting active, character typing, monitors glowing with active code |
| `08-workstation-wide.png` | `IDLE` | `null` | `false` | `true` | `[-3.5, 7.2, 1.15]` | `0.00m` | `IDLE` | Wide architectural context showing Floor 2 Agent Operations layout |

All hard assertions passed with zero tolerance violations.

---

## 4. Night Lighting Calibration

Night atmosphere was calibrated to establish balanced architectural hierarchy without synthetic artifacts:
1. **Key Moonlight Rim:** `keyLight` intensity set to `0.80` with cool slate rim (`0xa0aec0`).
2. **Floor Bounce & Boundary Fill:** `ambientLight` ground color set to `0x283244` (intensity `1.25`) and `fillLight` set to `0x607085` (intensity `0.95`).
3. **Task & Wall Pools:** F2 central downlight (`spotOperations`) and rear acoustic slat wall wash (`spotOperationsWash`) calibrated to `3.0` intensity, clearly illuminating the room perimeter, desk surface, floor plane, and circulation path without neon or cyan flood.
4. **Truthful Screen Emissive:**
   - In `06-night-idle.png`, monitors are strictly dormant (`emissiveIntensity = 0.0`).
   - In `07-night-worker-running.png`, monitors actively glow with code canvas luminance (`emissiveIntensity = 0.65`).

---

## 5. Active-View Performance Closure

### Bottleneck Profiling Pass
A narrow profiling pass on Floor 2 active workstation view revealed two dominant GPU/CPU cost drivers:
1. **Multi-Tap Shadow Map Filtering:** `THREE.PCFSoftShadowMap` performed a dynamic 16-tap bilateral blur filter across every forward-lit fragment on full-screen surfaces (1600x900 viewport).
2. **Unculled Forward Spotlight Overhead:** Off-screen task lights (`spotOperationsDeskL` at X = 2.5 and `spotOperationsReviewer` at X = 0.0) executed forward-pass lighting calculations on every pixel of the Floor 2 close-up.

### Optimizations Applied
1. Changed `HqRenderer` shadow map type from `THREE.PCFSoftShadowMap` to `THREE.PCFShadowMap`, providing crisp architectural shadows with 4-sample PCF and dramatically lower ALU/texture-sample overhead.
2. In `HqScene.setFocusedRoom()`, dynamically disabled `spotOperationsDeskL` and `spotOperationsReviewer` when camera focuses on `WS_FRONTEND` / `WS_FRONTEND_CAUSAL`.
3. Preserved frozen static matrices on architecture, furniture, and infrastructure nodes (`matrixAutoUpdate = false`).

### Benchmark Comparison (10-Second RAF Telemetry)

| Metric | Wave 12F-C Baseline | Wave 12F-C2 Workstation Active | Delta / Impact | Target | Status |
|---|---|---|---|---|---|
| **Average FPS** | 36.9 FPS | **60.0 FPS** | **+62.6% speedup** | $\ge 45\text{ FPS}$ | **PASSED** |
| **Median Frame Time** | 33.3 ms | **16.7 ms** | **-49.8% latency reduction** | $\le 22.2\text{ ms}$ | **PASSED** |
| **P95 Frame Time** | 33.6 ms | **16.8 ms** | Rock-solid consistency | $\le 25.0\text{ ms}$ | **PASSED** |
| **P99 Frame Time** | 33.9 ms | **16.9 ms** | Zero hitching / frame drops | $\le 28.0\text{ ms}$ | **PASSED** |
| **Draw Calls** | 357 | 391 | Minimal forward overhead | $< 600$ | **PASSED** |
| **Triangles** | 41,012 | 54,788 | Preserves complete character fidelity | $< 100,000$ | **PASSED** |
| **Geometries** | 1,037 | 1,035 | Zero geometry leak | Managed | **PASSED** |
| **Textures** | 22 | 22 | No extra texture memory | $< 32$ | **PASSED** |

Tower Overview Benchmark: **60.0 FPS** (median frame time 16.7 ms, P95 16.8 ms, P99 16.9 ms, 1,547 draw calls, 117,972 triangles).

---

## 6. Preservation of Accepted Engineering Principles

1. **Character System V1:** No changes to mesh aesthetics or character design.
2. **Role $\neq$ Harness / Provider:** Roles remain canonical architectural entities.
3. **Runtime Authority:** All visual animations, positions, and screen activities derive strictly from `WorldState` snapshot projections.
4. **Containment & Security:** Safe execution models, DIRECT default, and security gates intact.
5. **Architectural Stability:** No modifications to `main`, no premature rollout to F5/F6 or other characters.

---

## 7. Regression Gate Verification

| Gate | Command | Result |
|---|---|---|
| TypeScript Typecheck | `npm run typecheck` | **0 errors** across all workspaces |
| Production Build | `npm run build` | **0 errors**, production bundle compiled cleanly |
| Git Whitespace Check | `git diff --check` | **Clean**, zero whitespace or conflict markers |
| Scoped HQ3D Unit Tests | `npx vitest run apps/web/src/hq3d/` | **10 files passed, 219/219 tests passed (100%)** |
| Monolithic Repository Tests | `npm test` | **79 files passed, 1,054/1,054 tests passed (100%)** |
| Playwright Causal Suite | `npx playwright test tests/hq3d-wave12fc2.spec.ts` | **1 file passed (1/1), all assertions passed** |
| Dependency Audit | `npm audit` | 5 baseline vulnerabilities (`onnxruntime-node`, `monaco-editor` / existing debt) |

---

## 8. Artifact Inventory

- `docs/3d-hq/evidence/12f-c2/01-idle.png`
- `docs/3d-hq/evidence/12f-c2/02-preparing.png`
- `docs/3d-hq/evidence/12f-c2/03-worker-running.png`
- `docs/3d-hq/evidence/12f-c2/04-cleanup.png`
- `docs/3d-hq/evidence/12f-c2/05-verifying.png`
- `docs/3d-hq/evidence/12f-c2/06-night-idle.png`
- `docs/3d-hq/evidence/12f-c2/07-night-worker-running.png`
- `docs/3d-hq/evidence/12f-c2/08-workstation-wide.png`
- `docs/3d-hq/evidence/12f-c2/runtime-character-causal-proof.json`
- `docs/3d-hq/evidence/12f-c2/benchmarks-before-after.json`
- `docs/3d-hq/evidence/12f-c2/WAVE_12F_C2_REPORT.md`
