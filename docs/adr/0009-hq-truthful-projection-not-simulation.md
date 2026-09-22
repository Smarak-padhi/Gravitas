# ADR 0009: 3D Headquarters as Truthful State Projection, Not Visual Simulation

**Status**: Accepted  
**Date**: 2026-09-22  
**Scope**: 3D Headquarters Engine (`apps/web/src/hq3d`)  

---

## 1. Context

Many multi-agent UI concepts present 3D or 2D "agent villages" where humanoid characters wander aimlessly, sit at random desks, initiate simulated small-talk, and play fake typing animations to appear "alive" and entertain the user.

In Gravitas, this is considered an anti-pattern:
1. It misleads the operator about what the system is actually doing.
2. It breaks the fundamental contract of a professional command center: **an interface must reflect verifiable reality**.
3. If an operator sees an engineer typing at a desk, they must know with 100% certainty that a real background task is actively executing in an isolated worktree.

---

## 2. Decision

We mandate that **the 3D Headquarters is a Pure State Projection, NEVER a Simulation**:

$$\text{WorldState} = \text{deriveWorldState}(\text{AuthoritativeSnapshot}, \text{CanonicalTasks})$$

1. **Pure Projection Pipeline:** The scene is generated purely from authoritative server state via `deriveWorldState()`.
2. **Zero Mutation from SSE:** Server-Sent Events (SSE) invalidate cached state and trigger a fresh pull of authoritative state; they never mutate Three.js objects directly.
3. **No Fabricated Productive Animations:** Typing, file inspection, handoffs, and verification effects are strictly forbidden unless backed by an active authoritative task.
4. **Permitted Idle Ambient Motion:** Subtle non-productive biological cues (gentle breathing cycles, minor weight shifts) are allowed to indicate that the rendering engine is active.
5. **Station Mapping Fallback:** Unrecognized or unknown workers resolve to `null` (or `NEUTRAL_HOLD`), never falsely illuminating Codex or FCC workstations.

---

## 3. Consequences

- **Positive:** Absolute operator trust: what you see is what the system is provably executing.
- **Positive:** Scene reconciliation is pure, deterministic, and easily tested via headless assertions.
- **Positive:** Zero visual drift or desynchronization between 2D and 3D views.
- **Negative:** The 3D scene appears visually still and quiet when no tasks are active. (This is considered an intentional feature reflecting reality).
