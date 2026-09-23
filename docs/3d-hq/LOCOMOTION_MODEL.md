# GRAVITAS 3D HEADQUARTERS — LOCOMOTION MODEL (WAVE 12G)
## Authoritative Role Locomotion, Waypoint Pathfinding & Spatial Reconciliation

> **CORE CONCEPTUAL INVARIANTS**:
> - **LOCOMOTION != EXECUTION**: A character walking does not mean code is compiling or prompts are running. Movement is a presentation-only reflection of spatial intent.
> - **ARRIVAL != HANDOFF SATISFACTION**: A character arriving at a station does not satisfy, sign off, or complete a handoff. Only authoritative backend verifiers or reviewers can satisfy handoffs.
> - **CHARACTER POSITION != ARTIFACT CUSTODY**: Artifact dossier location in physical custody conduits is decoupled from where the character stands.
> - **ANIMATION != TASK STATE**: An animation starting, stopping, hitching, or failing has ZERO effect on the backend task FSM.
> - **CAMERA != AUTHORITY**: Camera framing presets and viewports do not dictate execution priority or truth.
> - **HUMAN OPERATOR != NPC**: There is NO fake humanoid avatar impersonating the sovereign human operator at the Approval Plinth.
> - **ROLE != HARNESS**: Characters represent organizational roles (`Frontend Engineer`, `Backend Engineer`, `Independent Reviewer`, `Chief Planner`). They never represent execution harnesses (`codex-worker`, `fcc-worker`), providers, or models.

---

## 1. Architectural Pipeline

The motion architecture strictly enforces unidirectional information flow:

```
CANONICAL TASK + ROLE + HANDOFF STATE (Backend BoundedScheduler / RunService)
              ↓
RuntimeProjectionSnapshot (GET /api/v1/state)
              ↓
deriveWorldState(...) (Pure TypeScript State Derivation)
              ↓
deriveCharacterSpatialIntents(...) (Pure Presentation-Domain Intent)
              ↓
Navigation Graph (Deterministic 24-Waypoint Scene Network)
              ↓
Deterministic A* Path (Sorted Waypoints with Aisle / Airlock / Stair Clearances)
              ↓
CharacterMotionController (Presentation-Only Motion Controller)
              ↓
Three.js Character Pose / Position / Walk Cycle
```

**ABSOLUTE LAW**: There is NO arrow in the opposite direction.
Animation never calls an API, never mutates a task, never satisfies a handoff, and never advances an FSM.

---

## 2. Spatial Intent Domain (`apps/web/src/hq3d/motion/spatialIntent.ts`)

Pure, deterministic, side-effect-free function:

```typescript
export type CharacterSpatialState =
  | 'AT_HOME'
  | 'MOVING_TO_ASSIGNMENT'
  | 'AT_ASSIGNMENT'
  | 'MOVING_TO_REVIEW'
  | 'AT_REVIEW'
  | 'RETURNING_HOME'

export type SpatialIntentReason =
  | 'TASK_ASSIGNMENT'
  | 'ACTIVE_EXECUTION'
  | 'REVIEW_ASSIGNMENT'
  | 'HANDOFF_AVAILABLE'
  | 'RETURN_HOME'

export interface CharacterSpatialIntent {
  readonly roleId: AgentRoleId
  readonly characterId: string
  readonly sourceStationId: string
  readonly destinationStationId: string
  readonly spatialState: CharacterSpatialState
  readonly reason: SpatialIntentReason
  readonly taskId?: string
  readonly handoffId?: string
  readonly projectionEpoch: string
  readonly projectionRevision: number
}
```

Forbidden in `spatialIntent.ts`:
- `Date.now`
- `Math.random`
- DOM access
- Three.js imports
- `fetch`
- `setTimeout` / `setInterval`
- `requestAnimationFrame`
- Mutable module-level singleton state

---

## 3. Four Frozen Roles & Home Stations

| Role ID | Role Name | Canonical Station ID | Physical Station Alias | Home Position `[x, y, z]` |
| :--- | :--- | :--- | :--- | :--- |
| `role:strategy:chief-planner` | Chief Planner | `planning-table` | `planning-table` | `[-4.5, 0.0, 5.5]` |
| `role:engineering:frontend-engineer` | Frontend Engineer | `engineering-workstation-01` | `codex-workstation` | `[-6.5, 0.0, 1.2]` |
| `role:engineering:backend-engineer` | Backend Engineer | `engineering-workstation-02` | `fcc-workstation` | `[-1.8, 0.0, 1.2]` |
| `role:quality:independent-reviewer` | Independent Reviewer | `verification-lab-console` | `verifier-console` | `[7.2, 0.1, 4.0]` |

Harness swaps (e.g., swapping `codex-worker` for `fcc-worker`) do not alter station or navigation paths. Only inspector telemetry updates.

---

## 4. Navigation Graph & Deterministic Pathfinding

The physical Headquarters scene is modeled as a 24-waypoint directed topological graph with clearances:

- **Corridor & Aisle Arteries**: Clear central transit zones (`NODE_OPS_AISLE_N`, `NODE_OPS_AISLE_S`, `NODE_CORRIDOR_CROSSING`, `NODE_MISSION_ENTRY`).
- **Cleanroom Airlock Entry**: Stationed at `[0.6, 0.1, 3.65]` (`NODE_CLEANROOM_ENTRY`). Reviewers must navigate through the airlock before approaching the verification console; paths NEVER intersect cleanroom glass partitions.
- **Approval Mezzanine Staircase**: Dedicated stair nodes (`NODE_STAIR_ENTRY`, `NODE_STAIR_MID`, `NODE_STAIR_LANDING`, `NODE_MEZZANINE_WALKWAY`, `NODE_APPROVAL_PLINTH`). Transits ascend smoothly along stair grade.
- **A\* Pathfinding Algorithm**: Pure, deterministic, Euclidean distance heuristic with lexicographic tie-breaking for guaranteed repeatability.

---

## 5. Character Presentation FSM & Procedural Walk Cycle

### Presentation Animation States
1. `IDLE`: Relaxed neutral standing posture at canonical station.
2. `STAND_UP`: Procedural blend transitioning from chair to transit footing.
3. `WALK`: Active directional locomotion along waypoints.
4. `ARRIVE`: Deceleration and orientation alignment at target waypoint.
5. `FOCUSED`: Seated or standing focused posture with subtle respiratory micro-animation.
6. `REVIEWING`: Focused inspection stance at verification bench.
7. `RETURNING`: Locomotion directed back toward home station.
8. `SIT_DOWN`: Procedural blend settling back into station chair.

### Procedural Walk Cycle
- **Locomotion Speed**: 1.25 to 1.45 world units per second.
- **Kinematic Articulation**:
  - Pelvis & torso yaw interpolation aligned to heading vector.
  - Alternating leg swing with knee flexion.
  - Counter-balanced arm swing via shoulder pivots.
  - Subtle torso lean (0.04 rad) in direction of travel.
  - No sliding or ice-skating artifacts.
  - 100% procedural geometry — zero external 3D asset downloads.

---

## 6. Stale Revision Cancellation & Fresh Load Invariants

### Stale Revision Cancellation
If the authoritative backend projection updates (e.g. revision 101 $\rightarrow$ 102 when a task fails while a character is mid-walk):
- Revision 102 supersedes revision 101 immediately.
- The obsolete path is instantly aborted.
- A new intent (`RETURN_HOME`) and new path are derived.
- The character transitions smoothly toward its new destination.
- A changed `projectionEpoch` invalidates all cached paths.

### Fresh Load Semantics
When a client connects to an already-running task:
- The projection indicates `WORKER_RUNNING` at station.
- The character initializes immediately at `AT_ASSIGNMENT` / `FOCUSED`.
- Historical walking is NEVER reconstructed or replayed.

---

## 7. Reduced Motion & Performance Disciplines

### Reduced Motion Mode (`prefers-reduced-motion: reduce`)
- All walking interpolation, leg/arm swings, and transit easing are disabled.
- Characters snap immediately to destination coordinate and posture.
- Spatial state, destination station, and inspector telemetry remain truthful.

### Render Loop (RAF) Discipline
- Animation loop executes **only** when `isViewActive === true` AND `document.visibilityState !== 'hidden'`.
- Zero background RAF loops when navigating to 2D views or minimizing tabs.
- Single unified RAF update in `HqDirector` drives all moving characters; zero per-character independent timers.
