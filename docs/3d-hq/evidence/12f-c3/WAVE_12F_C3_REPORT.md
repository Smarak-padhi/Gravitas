# GRAVITAS — WAVE 12F-C3P REPORT
## CHARACTER SYSTEM V1 PRESERVATION + EVIDENCE/PROVENANCE CLOSURE

**Run ID**: `run-w12fc3-final-closure`  
**Task ID**: `task-fe-12fc3`  
**Role ID**: `role:engineering:frontend-engineer`  
**Assigned Station**: `frontend-engineer-workstation`  
**Execution Harness**: `free-claude-code`  
**Date**: September 27, 2026  
**Status**: WAVE 12F-C3P CLOSED — CHARACTER SYSTEM V1 RUNTIME SEMANTICS PRESERVED

---

### Executive Summary

Wave 12F-C3P preserves the accepted Wave 12F-C3 runtime semantics, resolves visual geometry anomalies, rectifies evidence provenance, and aligns architectural documentation with human review determinations:

1. **Authoritative Runtime Semantics Preserved**: The Character System V1 runtime semantics (`IDLE`, `PREPARING`, `WORKER_RUNNING`, `CLEANUP`, `VERIFYING`) are preserved. All visible productive activity is derived strictly from authoritative runtime state with zero fake typing, zero fake screen activity, and zero ambient productive animations.
2. **Readability Claims Re-Aligned to Macro Visual Levels**: Per human review, we do NOT claim that all five subtle lifecycle phases are distinctly identifiable from normal room or tower distance without UI inspection. Readability is truthfully specified at three macro visual levels: (1) Standby / Non-working, (2) Engaged / Productive Work, and (3) Handoff / Custody Transfer.
3. **Floating White Sphere Anomaly Resolved at Source Contract**: Human review identified a conspicuous white spherical object floating above/behind the Frontend Engineer. Investigation proved this was `craniumMesh` (part of character anatomy), caused by assigning `craniumMesh` rather than `headGroup` to `FigureController.headMesh`. `FigureController.update()` was translating `craniumMesh` $0.35\text{m}$ up out of the hair into midair. Fixed at the source contract and verified via automated regression assertions and before/after captures.
4. **Evidence Consistency & Benchmark Provenance Synchronized**: Corrected prose references ($50.6 / 55.0\text{ FPS}$) from a preliminary intermediate run to match the authoritative raw benchmark JSON (`performance.json`: $60.0\text{ FPS}$ active workstation, $59.8\text{ FPS}$ tower overview).
5. **Runtime Error Elimination Verified**: Verified source contract fix for `TypeError: Cannot read properties of undefined (reading 'id')` when `RunService` operates without an attached harness. TopBar truthfully renders harness identity without fabrication.
6. **Prior-Wave Evidence Mutability Audit**: Verified that `docs/3d-hq/evidence/12f-c2/` remains completely untouched and immutable.

---

### Part A: Floating White Sphere Investigation & Source Fix

#### 1. Identification & Root Cause
- **Mesh Name**: `fe-cranium` (instance of `THREE.Mesh` with `SphereGeometry(0.12, 16, 14)`).
- **Source File**: `apps/web/src/hq3d/geometry/heroBay/heroCharacter.ts` (inside `buildFrontend()`).
- **Material**: `materials.heroCharSkin` (pale peach `#f5d0b5`), which appears bright white under the direct directional key lighting.
- **Parent/Group**: Intended as an internal child of `headGroup` (`fe-head-group`).
- **Intended Semantic Purpose**: Character anatomy (the internal skull sphere providing volume underneath the hair cap and spectacles).
- **The Defect Mechanism**:
  1. `buildFrontend` constructed `headGroup`, positioned it at local $(0, 0.26, 0.01)$ on top of the neck, and attached `craniumMesh` at local $(0, 0, 0)$ inside `headGroup`.
  2. However, `buildFrontend` returned `headMesh: craniumMesh` instead of `headMesh: headGroup` in its `CharacterParts` return contract.
  3. In `apps/web/src/hq3d/geometry/characters.ts`, `FigureController.update()` executed every animation frame:
     `this.parts.headMesh.position.y = 0.35;`
  4. Because `headMesh` was bound directly to `craniumMesh`, this frame update set `craniumMesh.position.y = 0.35` relative to `headGroup`.
  5. As a result, the cranium sphere was translated $0.35\text{m}$ straight up out of the character's hair, floating in midair above/behind the head, while the hair cap, spectacles, and jaw remained seated below at $y = 0.0$!

#### 2. Source Contract Fix
- **Contract Update (`heroCharacter.ts`)**:
  - `HeroCharacterBuildResult` and `CharacterParts` updated to type `headMesh: THREE.Object3D` referencing the parent `headGroup`.
  - Added explicit anatomical metrics `baseHeadY` ($0.26\text{m}$ for frontend hero bay, $0.36\text{m}$ for base anatomy) and `baseHeadZ` ($0.01\text{m}$ for frontend, $0.0\text{m}$ for base anatomy).
  - All builders (`buildFrontend`, `buildBaseAnatomy`, `buildBackend`, `buildReviewer`, `buildBrowserQa`, `buildPlanner`) updated to return `headMesh: headGroup`.
- **Controller Update (`characters.ts`)**:
  - `FigureController.update()` applies neck pitch/yaw to `headMesh` (`headGroup`) while keeping position locked to `baseHeadY` and `baseHeadZ`.
  - `craniumMesh` remains permanently seated at $(0, 0, 0)$ inside `headGroup`.
- **Regression Assertion in Tests**:
  - Added automated checks in `tests/hq3d-wave12fc3.spec.ts` asserting `craniumLocalY === 0` and `headGroupLocalY === 0.26`.
- **Visual Proof**:
  - `09-sphere-defect-before.png`: Shows the floating white sphere hovering above the Frontend Engineer's hair.
  - `10-sphere-defect-after.png`: Shows the sphere completely eliminated, cleanly integrated into the hair cap.

---

### Part B: Macro Visual Readability Contract

Per human review determination, subtle procedural character poses (such as micro-rotations of the torso between `PREPARING` and `CLEANUP`) are not claimed to be unmistakably readable from across the room or at tower distance. The production UX contract is formally structured around three macro visual levels:

1. **STANDBY / NON-WORKING**:
   - Includes `IDLE` (and `VERIFYING` for the Frontend Engineer, whose task execution is complete).
   - Character is seated in relaxed posture; hands resting back on chair armrests; typing inactive; workstation screens dark/dormant; no task dossier at workstation (in `VERIFYING`, the dossier has migrated to the Cleanroom bench).
2. **ENGAGED / PRODUCTIVE WORK**:
   - `WORKER_RUNNING`.
   - Character adopts clear forward working lean; hands actively reaching over keyboard/mouse pad; active typing motion; workstation ultrawide screen illuminated in active cyan/luminant state (`heroScreenActive`); task dossier present on desk pad.
3. **HANDOFF / CUSTODY TRANSFER**:
   - `PREPARING`, `CLEANUP`, and `VERIFYING` transitions.
   - Identified by physical task dossier custody movement and screen luminance transitions. Exact lifecycle nuance (`PREPARING` vs `CLEANUP`) is authoritatively provided by the UI, inspector, and runtime state rather than exaggerated cartoon posing.

---

### Part C: Character Visual System Status & Boundaries

- **Runtime Semantics (Character System V1)**: ACCEPTED. The mapping from authoritative task state to visual posture, prop visibility, screen state, and motion is verified and frozen.
- **Procedural Character Asset V1**: PROTOTYPE ONLY. Human review found that the workstation, architectural materials, and environment exceed the visual fidelity of the procedural character mesh. The current blocky torso, primitive hand topology, and simplistic silhouette are recognized as prototype assets that will be superseded by a dedicated production character pipeline in a future wave.
- **Role Identity Invariance**: Characters represent **ROLES**, never AI providers:
  - Frontend Engineer $\neq$ Codex
  - Backend Engineer $\neq$ FCC
  - Reviewer $\neq$ any LLM provider
  - Harnesses and models are interchangeable tools utilized by a role.

---

### Part D: Physicalized Task Dossier Custody

Task custody is strictly physicalized in the 3D scene:
- **`IDLE`**: Dossier absent from workstation.
- **`PREPARING`**: Dossier physically arrives at the assigned workstation desk (`[-2.5, 7.96, 0.7]`).
- **`WORKER_RUNNING`**: Dossier remains at the worker station throughout execution.
- **`CLEANUP`**: Dossier remains at workstation while cleanup completes.
- **`VERIFYING`**: Dossier physically migrates to the Floor 3 Verification Cleanroom bench (`[0.0, 11.75, 0.5]`), proving that the Frontend Engineer has yielded custody to the Independent Reviewer.

*Note: This physicalized custody represents state projection, not full multi-floor character locomotion.*

---

### Part E: Runtime Error Root Cause Analysis & Source Contract Fix

#### 1. Callsite & Reproduced Exception
- **Server Callsite**: `apps/server/src/service.ts:998` in `RunService.getStateSummary()`.
- **Browser Callsite**: `apps/web/src/App.tsx:112` via `apps/web/src/api/client.ts:34` (`request('/api/v1/state')`).
- **Exception**: `TypeError: Cannot read properties of undefined (reading 'id')`.

#### 2. Root Cause & Elimination
When `RunService` was instantiated without an explicit `harness` parameter, `this.harness` was `undefined`. Calling `this.harness.id` threw a 500 error, which rendered as a persistent red error banner in the web client and caused the header to fall back to a fabricated `free-claude-code [UNKNOWN]`.

The fix was applied at the contract level:
- `StateSummaryResponse.harness.id` is optional (`id?: string | undefined`).
- `RunService.getStateSummary()` handles unconfigured harnesses truthfully without throwing and without fabricating identities.
- `TopBar.tsx` displays `HARNESS: <id> [<status>]` when known, or `HARNESS: [<status>]` without fabricating an ID.
- Tested and verified by server unit tests (`apps/server/src/server.test.ts`) and Playwright E2E (`tests/hq3d-wave12fc3.spec.ts`).

---

### Part F: Performance Benchmark & Evidence Consistency

#### 1. Provenance Resolution
The preliminary draft prose mentioned $50.6\text{ FPS}$ and $55.0\text{ FPS}$, which originated from an earlier non-closure test run. Per the operating rules, the raw deterministic benchmark artifact (`performance.json`) is authoritative over prose. The benchmark artifact records the following results:

```json
{
  "activeWorkstationBenchmark": {
    "view": "F2_WORKSTATION_CAMERA",
    "viewport": { "width": 1600, "height": 900 },
    "dpr": 1.0,
    "atmosphere": "DAY",
    "camera": "WS_FRONTEND_MEDIUM",
    "browser": "Chromium (Playwright)",
    "durationMs": 10000,
    "totalFrames": 601,
    "averageFps": 60.0,
    "medianFrameTimeMs": 16.7,
    "p95FrameTimeMs": 16.8,
    "p99FrameTimeMs": 16.9,
    "drawCalls": 391,
    "triangles": 54788,
    "geometries": 1035,
    "textures": 24
  },
  "overviewBenchmark": {
    "view": "TOWER_OVERVIEW_CAMERA",
    "viewport": { "width": 1600, "height": 900 },
    "dpr": 1.0,
    "atmosphere": "DAY",
    "camera": "HQ_OVERVIEW",
    "browser": "Chromium (Playwright)",
    "durationMs": 5000,
    "totalFrames": 300,
    "averageFps": 59.8,
    "medianFrameTimeMs": 16.7,
    "p95FrameTimeMs": 16.8,
    "p99FrameTimeMs": 17.0,
    "drawCalls": 1547,
    "triangles": 117972,
    "geometries": 1035,
    "textures": 24
  }
}
```
- **Active Workstation**: $60.0\text{ FPS}$ (Target $\ge 45\text{ FPS}$: PASSED).
- **Tower Overview**: $59.8\text{ FPS}$ (Target $\ge 45\text{ FPS}$: PASSED).
- **Frame-Time Stability**: Median 16.7 ms, P99 16.9–17.0 ms. Zero frame drops or stalls.

---

### Part G: Visual Evidence Manifest

All deterministic screenshots are stored in `docs/3d-hq/evidence/12f-c3/`:

| Artifact | Camera View | State / Description |
| :--- | :--- | :--- |
| `01-idle-room-final.png` | Normal Room View | IDLE: Reclined posture, hands on armrests, screens dormant, clean desk. |
| `02-preparing-room-final.png` | Normal Room View | PREPARING: Attentive posture, dossier on desk, screens dormant, no typing. |
| `03-worker-running-room-final.png` | Normal Room View | WORKER_RUNNING: Working lean silhouette, hands typing, active glowing screen. |
| `04-cleanup-room-final.png` | Normal Room View | CLEANUP: Typing stopped, hands pulled back, screens dormant. |
| `05-verifying-room-final.png` | Normal Room View | VERIFYING: Frontend seated neutral; dossier migrated to F3 Cleanroom bench. |
| `06-night-idle-final.png` | Normal Room View | Night Atmosphere: Relaxed silhouette under midnight architectural lighting. |
| `07-night-worker-running-final.png` | Normal Room View | Night Atmosphere: Active productive silhouette with screen glow illumination. |
| `08-clean-runtime-ui-final.png` | Full UI & Normal Room | Complete application showing zero error banners and truthful status bar. |
| `09-sphere-defect-before.png` | Normal Room View | Defect Before: Floating white sphere visible above/behind character hair. |
| `10-sphere-defect-after.png` | Normal Room View | Defect After: Sphere eliminated; cranium seated inside hair cap. |

---

### Part H: Engineering Gates & Audit Verification

1. **`npm run typecheck`**: **PASSED** (0 errors across all 11 packages and workspaces).
2. **Playwright E2E (`tests/hq3d-wave12fc3.spec.ts`)**: **PASSED** (1 passed, 51.2s; 0 uncaught errors, 0 console errors, 0 error banners).
3. **Vitest Server Tests (`apps/server/src/server.test.ts`)**: **PASSED** (10 passed).
4. **Vitest HQ3D Tests (`apps/web/src/hq3d/`)**: **PASSED** (10 test files, 219 passed).
5. **`git diff --check`**: Clean (0 whitespace/conflict errors).
6. **`npm audit`**: Exit code 1 (5 vulnerabilities: 1 low, 1 moderate, 2 high, 1 critical in transitive build/editor dependencies `adm-zip` and `dompurify` from `onnxruntime-node` and `monaco-editor`; no vulnerabilities introduced in this wave).
7. **Main Branch Parity**: `main` remains untouched at `778a8a5270ece822f822f214e52db72bb8265a1d`.
8. **Prior Wave C2 Evidence**: `docs/3d-hq/evidence/12f-c2/` is intact and unmodified.

---

### Part I: Explicit Architecture Classification

#### A. ACCEPTED
- Authoritative lifecycle $\to$ visual-state projection semantics (`IDLE`, `PREPARING`, `WORKER_RUNNING`, `CLEANUP`, `VERIFYING`).
- Zero fake typing, zero fake screen luminescence, zero ambient productive animations.
- Task dossier physicalized custody semantics.
- VERIFYING ownership transfer away from Frontend Engineer station.
- Runtime harness error fix eliminating `Cannot read properties of undefined (reading 'id')`.
- Truthful harness provenance without UI identity fabrication.
- Floating white sphere defect resolution.
- Performance benchmark targets verified ($60.0\text{ FPS}$ workstation, $59.8\text{ FPS}$ tower).

#### B. NOT CLAIMED
- Five subtle lifecycle phases uniquely identifiable from tower distance without UI inspection.
- Production-final character model or rigging.
- Final production locomotion system.
- Final production animation blending system.
- Full human-like character fidelity.

#### C. DEFERRED
- Dedicated production character modeling/rigging pipeline.
- High-fidelity anatomical topology and clothing meshes.
- Richer animation blending and state transition curves.
- True multi-floor agent locomotion navigation mesh.
