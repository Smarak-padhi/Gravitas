# Gravitas Master Implementation Roadmap: Waves 12C.5 to 20 (Wave 12G)

> **CORE CONCEPTUAL INVARIANTS**:
> - **LOCOMOTION != EXECUTION**: Character locomotion does not execute tasks, compile code, or invoke gateways.
> - **ARRIVAL != HANDOFF SATISFACTION**: Character arrival at a workstation or console does not satisfy or advance handoffs.
> - **CHARACTER POSITION != ARTIFACT CUSTODY**: Avatar coordinates are decoupled from artifact dossier custody.
> - **ANIMATION != TASK STATE**: An animation starting, stopping, hitching, or failing cannot mutate task FSM state.
> - **CAMERA != AUTHORITY**: Viewport framing presets have no semantic authority over task execution.
> - **HUMAN OPERATOR != NPC**: There is strictly NO humanoid NPC avatar impersonating the sovereign human operator.
> - **ROLE != HARNESS**: Characters represent organizational roles (`Frontend Engineer`, `Backend Engineer`, `Independent Reviewer`, `Chief Planner`), never execution harnesses (`codex-worker`, `fcc-worker`), providers, or models.

---

## 1. Master Execution Sequence

```
Wave 12C.5: Architecture Freeze (CLOSED)
     │
     ▼
Wave 12D:   Minimal Role-Based Character Foundation (4 Roles) (CLOSED in 12D-R)
     │
     ▼
Wave 12E:   Canonical Role Runtime Contract & Deterministic Resolver (CLOSED)
     │
     ▼
Wave 12F:   Canonical Multi-Agent Handoffs & Integration Pipeline (CLOSED)
     │
     ▼
Wave 12F-R: Production Handoff Projection Closure (CLOSED)
     │
     ▼
Wave 12G:   Authoritative Role Locomotion & Spatial Reconciliation (SEALED)
     │
     ▼
Wave 12H:   Physical Custody Transitions & Approval Flow Gestures (NOT STARTED)
     │
     ▼
Wave 13:    Background Job System & Courier Logistics
     │
     ▼
Wave 14:    Connector SDK & Bounded External Platforms
     │
     ▼
Wave 15:    Multi-Class Memory & Knowledge Learning Store
     │
     ▼
Wave 16:    Personal Operations & Daily Rhythm Engine
     │
     ▼
Wave 17:    Business Operations & Algoryxz Pipeline
     │
     ▼
Wave 18:    Mobile Companion Control Surface
     │
     ▼
Wave 19+:   Strategic Opportunity & Cross-Domain Synthesis
```

---

## 2. Detailed Wave Specifications

### Wave 12G: Authoritative Role Locomotion & Spatial Reconciliation (SEALED)
- **Goal:** Turn authoritative backend role, task, and handoff state into deterministic spatial intent and presentation-only visual locomotion in the 3D Headquarters.
- **Achievements:**
  - Pure, deterministic `spatialIntent.ts` presentation module.
  - 24-waypoint navigation graph with explicit clearances, airlock boundary, and mezzanine stairs.
  - Deterministic A* pathfinding with lexicographical tie-breaking.
  - `CharacterMotionController` with presentation FSM (`IDLE`, `STAND_UP`, `WALK`, `ARRIVE`, `FOCUSED`, `REVIEWING`, `RETURNING`, `SIT_DOWN`).
  - Procedural walk cycle (1.25–1.45 units/sec) on articulated figures.
  - Stale revision cancellation and fresh load without historical transit replay.
  - Reduced-motion mode snapping.
  - 18 deterministic fixtures (A through R) and 60 explicit unit tests.
  - Real runtime causal proof (`W12G-1`) verifying scheduler $\rightarrow$ projection $\rightarrow$ web spatial intent.
  - 14 visual screenshots captured in `docs/3d-hq/evidence/wave12g/`.
- **Status:** **WAVE 12G — GO** | **WAVE 12H — NOT STARTED**.
