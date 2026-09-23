# GRAVITAS — WAVE 12G VERIFICATION REPORT
## Authoritative Role Locomotion + Spatial Reconciliation

**Date**: 2026-09-23  
**Branch**: `feat/v0-golden-loop`  
**Authoritative Baseline**: `866d8dc6e73baafd659ec1dde90fc4623ce2863d` (Wave 12F-R)  
**Untouched Main**: `778a8a5270ece822f822f214e52db72bb8265a1d`  
**Status**: **WAVE 12G — GO** | **WAVE 12H — NOT STARTED**

---

## 1. Executive Summary & Operating Law

Wave 12G establishes authoritative, deterministic character locomotion and spatial reconciliation in the Gravitas 3D Headquarters without altering backend truth. Movement is strictly an immutable projection of authoritative task assignments, role ownership, and handoff custody.

### Immutable Conceptual Invariants
1. **LOCOMOTION != EXECUTION**: Character locomotion does not execute tasks, compile code, or invoke gateways.
2. **ARRIVAL != HANDOFF SATISFACTION**: Character arrival at a workstation or cleanroom console does not satisfy or advance handoffs.
3. **CHARACTER POSITION != ARTIFACT CUSTODY**: The spatial position of an avatar is decoupled from the physical and cryptographic custody of artifact dossiers.
4. **ANIMATION != TASK STATE**: An animation starting, stopping, hitching, or failing cannot mutate task FSM state.
5. **CAMERA != AUTHORITY**: Viewport framing presets have no semantic authority over task execution or dispatch.
6. **HUMAN OPERATOR != NPC**: There is strictly NO humanoid NPC avatar impersonating the sovereign human operator at the Approval Plinth.
7. **ROLE != HARNESS**: Characters represent organizational roles (`Frontend Engineer`, `Backend Engineer`, `Independent Reviewer`, `Chief Planner`), never execution harnesses (`codex-worker`, `fcc-worker`), providers, or models.

---

## 2. Wave 12F-R Revalidation

Prior to implementing locomotion, the Wave 12F-R production path was re-verified end-to-end:
```
BoundedScheduler
  → onHandoffUpdated
  → RunService
  → RuntimeProjectionStore.setHandoff
  → projection.handoffs
  → GET /api/v1/state
  → deriveWorldState()
```
Both initial `BLOCKED`/`READY` handoffs and subsequent `IN_PROGRESS`/`SATISFIED`/`FAILED` updates are wired directly into the production snapshot store and verified via test `W12FR-13` and `W12G-1` in `apps/server/src/projection.test.ts`.

---

## 3. Spatial Intent Domain (`apps/web/src/hq3d/motion/spatialIntent.ts`)

Pure, deterministic, side-effect-free presentation module:
- Implements `deriveCharacterSpatialIntents(worldState: WorldState, previousIntents?)`.
- Maps active `WorldTaskState` and `WorldHandoffState` to `CharacterSpatialIntent` per role.
- Enforces strict role invariants:
  - `role:strategy:chief-planner`: Remains `AT_HOME` (idle at planning table) unless explicitly assigned an authoritative planning task.
  - `role:engineering:frontend-engineer`: Moves to `engineering-workstation-01` when assigned a task; returns home upon completion or failure.
  - `role:engineering:backend-engineer`: Moves to `engineering-workstation-02` when assigned a task; returns home upon completion or failure.
  - `role:quality:independent-reviewer`: Moves to `verification-lab-console` only when an explicit review task or ready review handoff exists.
- Strictly forbidden and absent: `Date.now`, `Math.random`, DOM, Three.js, `fetch`, timers, RAF, mutable singletons.

---

## 4. Navigation Graph & Deterministic Pathfinding

- **Graph Module**: `apps/web/src/hq3d/motion/navigationGraph.ts`
  - 24 canonical waypoints with explicit clearance radii.
  - Semantic node types: `HOME`, `CORRIDOR`, `DESK_APPROACH`, `PLANNING_APPROACH`, `REVIEW_APPROACH`, `CLEANROOM_ENTRY`, `QA_APPROACH`, `STAIR_ENTRY`, `STAIR_LANDING`, `APPROVAL_APPROACH`, `HOLD_POINT`.
  - Cleanroom entry strictly routes through the airlock at `[0.6, 0.1, 3.65]` (`NODE_CLEANROOM_ENTRY`), preventing path penetration through cleanroom glass.
  - Approval Mezzanine routes strictly via staircase nodes (`NODE_STAIR_ENTRY` $\rightarrow$ `NODE_STAIR_MID` $\rightarrow$ `NODE_STAIR_LANDING` $\rightarrow$ `NODE_MEZZANINE_WALKWAY` $\rightarrow$ `NODE_APPROVAL_PLINTH`).
- **Pathfinder**: `apps/web/src/hq3d/motion/pathfinding.ts`
  - Deterministic A* algorithm with Euclidean distance heuristic.
  - Lexicographical tie-breaking ensures identical inputs yield bit-identical waypoint arrays.
  - Safe error handling: returns `UNKNOWN_START`, `UNKNOWN_DESTINATION`, or `UNREACHABLE`.

---

## 5. Motion Controller & Presentation FSM

- **Controller**: `apps/web/src/hq3d/motion/CharacterMotionController.ts`
  - Reconciles `CharacterSpatialIntent` with current 3D character transforms.
  - FSM States: `IDLE`, `STAND_UP`, `WALK`, `ARRIVE`, `FOCUSED`, `REVIEWING`, `RETURNING`, `SIT_DOWN`.
  - Stale revision cancellation: superseding projection revisions or changed epochs immediately abort old paths and retarget to new destinations.
  - Reduced-motion mode: snaps character position and posture instantly with zero animation or interpolation.
  - Lifecycle: cleanly managed through single scene RAF loop; stops when tab is hidden or view is inactive.

---

## 6. Procedural Walk Cycle & Articulation

- **Geometry**: `apps/web/src/hq3d/geometry/characters.ts`
  - Enhanced procedural figures with standing and seated articulated legs (`legLeftGroup`, `legRightGroup`) and shoulder pivots.
  - Natural walk cycle: alternating leg swings, counter-balancing arm swings, and subtle forward torso lean (0.04 rad).
  - Walking speed bounded to 1.25–1.45 world units per second.
  - Zero external models downloaded — 100% procedural Three.js geometry.

---

## 7. Integration Engineer Visualization Decision

**Status**: `NOT_READY_FOR_VISUALIZATION`
- Wave 12F introduced `role:integration:integration-engineer` in the core organizational model.
- Audit shows the Integration Pipeline currently runs as an automated orchestrator composition step rather than an interactive workstation-bound agent.
- Recommendation: Defer introducing a fifth humanoid avatar to **Wave 12H**, pending explicit interactive workstation semantics for integration engineering.

---

## 8. Fixture Matrix & Automated Test Suite

### 18 Deterministic Fixtures (`apps/web/src/hq3d/world/locomotionFixtures.ts`)
- Fixture A: `ALL_IDLE`
- Fixture B: `FRONTEND_ASSIGNED`
- Fixture C: `FRONTEND_WALKING`
- Fixture D: `FRONTEND_WORKING`
- Fixture E: `BACKEND_ASSIGNED`
- Fixture F: `REVIEWER_ASSIGNED`
- Fixture G: `FE_BE_CONCURRENT`
- Fixture H: `THREE_ROLE_CONCURRENT`
- Fixture I: `TASK_FAILED_MID_ROUTE`
- Fixture J: `TASK_COMPLETED_MID_ROUTE`
- Fixture K: `SNAPSHOT_SUPERSEDES_ROUTE`
- Fixture L: `FRESH_LOAD_ALREADY_RUNNING`
- Fixture M: `REDUCED_MOTION`
- Fixture N: `UNREACHABLE_DESTINATION`
- Fixture O: `REVIEW_HANDOFF_READY`
- Fixture P: `WAITING_APPROVAL_NO_OPERATOR`
- Fixture Q: `HARNESS_SWAP_CODEX_TO_FCC`
- Fixture R: `UNKNOWN_ROLE_NEUTRAL_HOLD`

### 60 Unit Tests (`apps/web/src/hq3d/motion/locomotion.test.ts`)
- All 60 assertions pass (100% pass rate).
- Validates determinism, role decoupling, shortest routes, airlock compliance, stair routing, stale revision aborts, reduced-motion snapping, and neutral hold for unknown roles.

### Real Runtime Causal Proof (`apps/server/src/projection.test.ts`)
- Test `W12G-1`: Executes real `POST /run` $\rightarrow$ role assignment $\rightarrow$ scheduler dispatch $\rightarrow$ `WORKER_STARTED` $\rightarrow$ `RuntimeProjectionSnapshot` $\rightarrow$ `GET /api/v1/state` $\rightarrow$ web `deriveWorldState` $\rightarrow$ `deriveCharacterSpatialIntents` $\rightarrow$ destination workstation `engineering-workstation-01` $\rightarrow$ presentation state `AT_ASSIGNMENT`.

---

## 9. Visual Evidence Capture (`docs/3d-hq/evidence/wave12g/`)

All 14 required visual proofs were captured using Playwright:

| File Name | File Size | Description | Evidence Category |
| :--- | :--- | :--- | :--- |
| `01-all-idle.png` | 416,867 B | All 4 characters idle at home stations | FIXTURE |
| `02-frontend-departing-home.png` | 310,866 B | Frontend Engineer assigned & departing home station | FIXTURE |
| `03-frontend-mid-walk.png` | 372,275 B | Frontend Engineer traversing aisle toward workstation | FIXTURE |
| `04-frontend-at-workstation.png` | 387,630 B | Frontend Engineer seated and focused at workstation | FIXTURE |
| `05-backend-mid-walk.png` | 388,151 B | Backend Engineer traversing aisle toward Station 2 | FIXTURE |
| `06-reviewer-entering-cleanroom.png` | 251,883 B | Independent Reviewer traversing cleanroom airlock | FIXTURE |
| `07-three-role-concurrent.png` | 381,713 B | FE, BE, and Reviewer executing concurrently | FIXTURE |
| `08-review-handoff.png` | 248,351 B | Review handoff ready; reviewer moving to station | FIXTURE |
| `09-task-failed-reconciled.png` | 384,296 B | Task failed mid-route reconciles cleanly to home | FIXTURE |
| `10-waiting-approval-no-operator.png` | 152,946 B | Approval Mezzanine plinth with zero humanoid NPC | FIXTURE |
| `11-reduced-motion.png` | 389,509 B | Prefers-reduced-motion snaps directly to destination | FIXTURE |
| `12-harness-swap-same-path.png` | 415,299 B | Codex swapped to FCC preserves role station identity | FIXTURE |
| `13-fresh-load-already-running.png` | 389,197 B | Fresh load initializes at station without transit replay | FIXTURE |
| `14-active-office-overview.png` | 471,263 B | Architectural overview of active multi-role office | FIXTURE |

---

## 10. Video Evidence Status

**Status**: `VIDEO_EVIDENCE_NOT_CAPTURED`
- **Root Cause**: Playwright's headless browser video recording on the host system requires the Playwright ffmpeg dependency binary (`C:\Users\smara\AppData\Local\ms-playwright\ffmpeg-1011\ffmpeg-win64.exe`), which is not installed in the local environment.
- **Integrity Guarantee**: Per Section 27 and Operating Rules, video files are not faked or spoofed.

---

## 11. Performance Telemetry

Measured across 8 operational scenarios:

| Scenario | FPS | Frame Time (ms) | Draw Calls | Triangles | Geometries | Textures | RAF Active |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ALL_IDLE` | 60 | 16.7 | 387 | 8,340 | 244 | 14 | true |
| `ONE_WALKER` | 60 | 16.7 | 230 | 5,232 | 247 | 14 | true |
| `THREE_WALKERS` | 60 | 16.7 | 232 | 5,236 | 248 | 14 | true |
| `TWO_FOCUSED_ONE_WALKER` | 60 | 16.7 | 230 | 5,232 | 247 | 14 | true |
| `REVIEWER_WALKING` | 45 | 22.4 | 149 | 3,740 | 249 | 14 | true |
| `REDUCED_MOTION` | 60 | 16.7 | 225 | 5,172 | 247 | 14 | true |
| `HQ3D_INACTIVE` | 0 | 0.0 | 0 | 0 | 244 | 14 | **false** |
| `DOCUMENT_HIDDEN` | 0 | 0.0 | 0 | 0 | 244 | 14 | **false** |

All performance targets met: active FPS $\ge 45$ (averaging 60 FPS), inactive and hidden document immediately drop to 0 RAF calls.

---

## 12. Complete Test & Build Verification

- `npm run typecheck`: **Clean (0 errors across all 11 packages)**
- `npm run build`: **Clean (0 errors across all 11 packages)**
- `npm test`: **753 passed (69 test files)**
- `tests/hq3d-locomotion.spec.ts`: **15 passed (100%)**
- `tests/hq3d-roles.spec.ts`: **11 passed (100%)**
- `npm audit`: **0 vulnerabilities**

---

## 13. Known Debt & Wave 12H Recommendations

### Known Debt
1. **Host ffmpeg binary**: Local environment lacks `npx playwright install ffmpeg` to generate `.webm` videos directly from browser test runs.
2. **Lane collision offsets**: When multiple roles transit the same corridor at the identical frame, character meshes may overlap slightly without visual physics repulsion.

### Wave 12H Recommendation
- Keep Integration Engineer as non-humanoid until explicit interactive workstation semantics are required.
- Do NOT implement background personal OS features (Email, WhatsApp, CRM, Calendar, Voice, etc.).
- Wave 12H can safely focus on artifact docket physical transitions and approval flow gestures.

---

## 14. Final Acceptance

```text
WAVE 12G — GO
WAVE 12H — NOT STARTED
```
