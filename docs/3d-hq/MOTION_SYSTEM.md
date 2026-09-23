# GRAVITAS 3D HEADQUARTERS — MOTION SYSTEM & KINETIC GRAMMAR
## Spatial Motion, Interface Transitions & Zero-Fake-Activity Rules (Wave 12G)

> **CORE CONCEPTUAL INVARIANTS**:
> - **LOCOMOTION != EXECUTION**: Character motion communicates spatial intent only, never backend compilation, prompt execution, or testing.
> - **ARRIVAL != HANDOFF SATISFACTION**: Physical arrival at a station does not satisfy handoffs.
> - **CHARACTER POSITION != ARTIFACT CUSTODY**: Avatar coordinates are decoupled from artifact dossier custody.
> - **ANIMATION != TASK STATE**: Animations do not mutate or advance task FSM state.
> - **CAMERA != AUTHORITY**: Camera position does not dictate scheduler priority or execution.
> - **HUMAN OPERATOR != NPC**: There is NO fake operator NPC avatar at the Approval Plinth.
> - **ROLE != HARNESS**: Avatars represent organizational roles, never harnesses.

---

## 1. Zero-Fake-Activity Rules

1. **NO Idle Wandering**: Characters never roam around the office for visual entertainment. If no authoritative assignment exists, characters remain stationary at their canonical home stations.
2. **NO Fake Typing**: Characters do not simulate keyboard chatter or finger tapping. When working, characters enter a focused posture with subtle respiratory micro-animation.
3. **NO Fake Conversations**: Characters never stand facing each other simulating idle chit-chat.
4. **NO Simulated Operator**: The Approval Plinth remains strictly an unattended human checkpoint. No humanoid avatar stands at the plinth pretending to approve tasks.

---

## 2. Motion Controller Architecture (`CharacterMotionController`)

Character locomotion is owned by a single, centralized, presentation-only controller:

```text
Snapshot (GET /api/v1/state)
  → deriveWorldState
  → deriveCharacterSpatialIntents
  → CharacterMotionController.reconcileIntents(...)
  → A* Path along NavigationGraph
  → Procedural Walk Cycle Interpolation
```

### Presentation States
- `IDLE`: Station in standby; neutral resting posture.
- `STAND_UP`: Procedural blend transitioning from chair to transit footing.
- `WALK`: Active locomotion along waypoints at 1.25–1.45 units/sec.
- `ARRIVE`: Orientation alignment and posture settle.
- `FOCUSED`: Seated/standing focused posture at assigned workstation.
- `REVIEWING`: Focused inspection stance at verification bench.
- `RETURNING`: Walking back to canonical home station.
- `SIT_DOWN`: Procedural blend settling into station chair.

---

## 3. Stale Revision & Reduced Motion Discipline

- **Stale Revision Cancellation**: If the authoritative backend projection updates while an avatar is in motion (e.g., task failure or cancellation), the old path is immediately aborted. The avatar calculates a new path to its updated authoritative destination.
- **Prefers-Reduced-Motion**: Under `prefers-reduced-motion: reduce`, all walking animations and transit interpolations are bypassed. The character snaps instantly to its authoritative destination and posture.
- **RAF Loop Discipline**: The animation loop is active strictly when `activeView === 'HQ3D'` and `document.visibilityState !== 'hidden'`. Inactive views or background tabs execute 0 continuous RAF frames.
