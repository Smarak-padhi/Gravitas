# Gravitas 3D Headquarters Spatial Organization & Artifact Model (Wave 12G)

> **CORE CONCEPTUAL INVARIANTS**:
> - **LOCOMOTION != EXECUTION**: Character locomotion does not execute tasks, compile code, or invoke gateways.
> - **ARRIVAL != HANDOFF SATISFACTION**: Character arrival at a workstation or console does not satisfy or advance handoffs.
> - **CHARACTER POSITION != ARTIFACT CUSTODY**: Avatar coordinates are decoupled from artifact dossier custody.
> - **ANIMATION != TASK STATE**: An animation starting, stopping, hitching, or failing cannot mutate task FSM state.
> - **CAMERA != AUTHORITY**: Viewport framing presets have no semantic authority over task execution.
> - **HUMAN OPERATOR != NPC**: There is strictly NO humanoid NPC avatar impersonating the sovereign human operator.
> - **ROLE != HARNESS**: Characters represent organizational roles (`Frontend Engineer`, `Backend Engineer`, `Independent Reviewer`, `Chief Planner`), never execution harnesses (`codex-worker`, `fcc-worker`), providers, or models.

---

## 1. The Core Headquarters Authority Rule

$$\text{THE 3D HQ IS A PROJECTION AND CONTROL SURFACE, NEVER A SIMULATION.}$$

The 3D Headquarters reflects **what Gravitas can cryptographically prove is happening**. It never invents work activity, fake keystrokes, or simulated bustling to look alive.

### Animation Guardrails
- **Permitted Non-Productive Ambient Animations:** Subtle breathing cycle, minor weight shift, slight idle head turn.
- **FORBIDDEN Without Authoritative Active State:**
  - ❌ Typing on keyboards.
  - ❌ Flipping through dossiers.
  - ❌ Exchanging files or celebratory high-fives.
  - ❌ Running verification cleanroom animations without authoritative verification state.
  - ❌ Idle wandering across rooms without an authoritative assignment.

### 1.1 Authoritative Locomotion Semantics (Wave 12G)
- **Deterministic Presentation Locomotion**: Characters navigate between canonical home stations and assigned workstations via a 24-waypoint topological graph (`apps/web/src/hq3d/motion/navigationGraph.ts`).
- **Airlock Boundary**: Cleanroom entry strictly navigates through the airlock at `[0.6, 0.1, 3.65]` (`NODE_CLEANROOM_ENTRY`), preventing glass collision.
- **Staircase Traversal**: Mezzanine access routes smoothly through dedicated staircase waypoints.
- **Four Visual Characters Frozen**: Chief Planner, Frontend Engineer, Backend Engineer, and Independent Reviewer.
- **Integration Engineer Role**: Non-humanoid in Wave 12G (`NOT_READY_FOR_VISUALIZATION`).
- **Stale-Revision Cancellation**: New snapshot revisions immediately abort obsolete paths and retarget to truthful destinations.

---

## 2. Spatial Zones & Station Directory

```
                               ┌─────────────────────────────┐
                               │   ZONE 6: APPROVAL MEZZANINE│
                               │   - Approval Plinth         │
                               └──────────────┬──────────────┘
                                              │ Staircase route
       ┌──────────────────────────────────────┼──────────────────────────────────────┐
       │                                      │                                      │
       ▼                                      ▼                                      ▼
┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
│ ZONE 1: MISSION CONTROL   │   │ ZONE 2: OPERATIONS FLOOR  │   │ ZONE 3: CLEANROOM LAB     │
│ - Holographic Plan Table  │   │ - Desk 1 (FE station)     │   │ - Verification Bench      │
│ - Dependency projector    │   │ - Desk 2 (BE station)     │   │ - Console display         │
│                           │   │ - Bay 3 & 4 (Expansion)   │   │ - Cleanroom Airlock       │
└──────────────┬────────────┘   └─────────────┬─────────────┘   └─────────────┬─────────────┘
               │                              │                               │
       ┌───────┴──────────────────────────────┼───────────────────────────────┴───────┐
       │                                      │                                       │
       ▼                                      ▼                                       ▼
┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
│ ZONE 4: BROWSER QA LAB    │   │ ZONE 5: SERVER BAY        │   │ ZONE 7: KNOWLEDGE LIBRARY │
│ - 9-display matrix wall   │   │ - OmniRoute Server Racks  │   │ - Research Reading Desk   │
│ - Viewport light bands    │   │ - Active Route Status LEDs│   │ - Study Nook Terminal     │
└───────────────────────────┘   └───────────────────────────┘   └───────────────────────────┘
```

---

## 3. Wave 12H Authoritative Artifact Custody & Conduits

### Custody Locations
- `PRODUCER_DESK`: Author workstation desk ($Y = 0.76\text{m}$).
- `REVIEW_INBOX`: Verification lab intake table ($X = 4.2\text{m}, Y = 0.76\text{m}, Z = 4.5\text{m}$).
- `REVIEW_BENCH`: Verification lab review desk ($X = 5.0\text{m}, Y = 0.76\text{m}, Z = 2.0\text{m}$).
- `INTEGRATION_INBOX`: Dev workroom integration staging dock ($X = -3.5\text{m}, Y = 0.76\text{m}, Z = -4.5\text{m}$).
- `INTEGRATION_BENCH`: Dev workroom integration desk ($X = -5.0\text{m}, Y = 0.76\text{m}, Z = -2.0\text{m}$).
- `APPROVAL_PLINTH`: Central governance plinth in Executive Office ($X = 0.0\text{m}, Y = 0.88\text{m}, Z = 2.5\text{m}$).
- `COMPLETED_TRAY`: Executive output credenza tray ($X = 1.8\text{m}, Y = 0.76\text{m}, Z = 4.2\text{m}$).
- `FAILURE_HOLD`: Isolated quarantine desk ($X = 6.0\text{m}, Y = 0.76\text{m}, Z = 6.0\text{m}$).
- `NEUTRAL_HOLD`: Central office neutral table ($X = 0.0\text{m}, Y = 0.76\text{m}, Z = 0.0\text{m}`).

### Core Invariants
- `ARTIFACT CUSTODY != CHARACTER POSITION`
- `HANDOFF READY != HANDOFF SATISFIED`
- `VISUAL ARRIVAL != BACKEND TRANSITION`
- `REVIEW PASSED != INTEGRATED`
- `INTEGRATION PREPARED != MERGED`
- `WAITING_APPROVAL != APPROVED`
- `APPROVAL ANIMATION != APPROVAL AUTHORITY`
- `HUMAN OPERATOR != NPC`
- `ROLE != HARNESS`
