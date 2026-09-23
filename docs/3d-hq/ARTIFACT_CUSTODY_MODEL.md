# Gravitas 3D Headquarters — Authoritative Artifact Custody Model

**Wave 12H Architectural Specification**  
**Branch:** `feat/v0-golden-loop`  
**Status:** SEALED  

---

## 1. Core Principle & Operating Invariants

> **WORK PRODUCT ITSELF MUST HAVE AUTHORITATIVE CUSTODY.**  
> **ANIMATION NEVER ADVANCES CUSTODY OR TASK FSM.**

The 3D Headquarters visually reflects canonical work product as physical architectural dossiers, ensuring full spatial transparency over ownership, verification, review, integration, and human governance.

### Non-Negotiable Invariants

1. `ARTIFACT CUSTODY != CHARACTER POSITION`
   - An artifact resides at its authoritative location (e.g. `REVIEW_INBOX` or `APPROVAL_PLINTH`) regardless of whether an agent avatar is currently walking, seated, or idle.
2. `HANDOFF READY != CHARACTER ARRIVAL`
   - Character locomotion is a downstream visual consequence of role intent, not a trigger for handoff readiness.
3. `HANDOFF SATISFIED != ANIMATION COMPLETE`
   - Arrival of a physical dossier mesh does not satisfy a backend handoff. Backend truth satisfies handoffs.
4. `REVIEW PASSED != INTEGRATED`
   - A successful independent review produces a passed review verdict, but integration remains a distinct architectural step requiring separate validation.
5. `INTEGRATION PREPARED != MERGED`
   - Candidate branch preparation (`PREPARED`) stages changes for human review; it does not mutate `main`.
6. `WAITING_APPROVAL != APPROVED`
   - Presence on the `APPROVAL_PLINTH` represents pending sovereign human evaluation, never automated approval.
7. `TASK COMPLETED != BASE BRANCH MUTATED`
   - Base branch mutation only occurs when verified integration proofs are acknowledged by backend Git authority.
8. `HUMAN APPROVAL != NPC ACTION`
   - No character avatar or automated timer can approve a task.
9. `ROLE != HARNESS != PROVIDER != MODEL`
   - Role semantics are preserved across arbitrary harness swaps or model providers.
10. `VISUAL EFFECT != AUTHORITY`
    - Visual rendering is strictly a projection of canonical snapshot truth.

---

## 2. Custody Locations

The physical headquarters defines nine authoritative custody locations:

| Custody Location | Architectural Anchor | Semantic Meaning |
|---|---|---|
| `PRODUCER_DESK` | Author Role Workstation | Work product created by author role; awaiting review handoff. |
| `REVIEW_INBOX` | Verification Lab Intake Dock | Handoff is `READY`; staged for independent review. |
| `REVIEW_BENCH` | Verification Lab Inspection Desk | Independent review currently `IN_PROGRESS`. |
| `INTEGRATION_INBOX` | Dev Workroom Staging Dock | Review `PASSED`; queued for integration staging. |
| `INTEGRATION_BENCH` | Dev Workroom Integration Desk | Integration candidate preparation / conflict reconciliation. |
| `APPROVAL_PLINTH` | Central Governance Plinth | Integration `PREPARED`; awaiting human operator approval. |
| `COMPLETED_TRAY` | Executive Output Station | Confirmed approved work product or completed run artifact. |
| `FAILURE_HOLD` | Isolated Quarantine Table | Review `CHANGES_REQUIRED`, `INTEGRATION_CONFLICT`, or `APPROVAL_REJECTED`. |
| `NEUTRAL_HOLD` | Neutral Central Table | Unmapped or fallback candidate preserving safety. |

---

## 3. Physical Conduit Graph & Corridor Offsets

To prevent visual collisions between walking humanoid avatars and moving artifact dossiers, artifact movement utilizes dedicated elevated conduit lanes:

- **Elevation Offset:** Artifacts transit at $Y = 0.85\text{m}$ (elevated above standard desk height and character waist level).
- **Lateral Separation:** Shared corridor traversal routes through $X = -3.6\text{m}$, creating deterministic lane separation from avatar pedestrian paths ($X = -4.0\text{m}$ to $-3.8\text{m}$).
- **No Physics Engine:** Movement is driven by deterministic hermite/linear interpolation over defined waypoint trajectories.

---

## 4. Pure Custody Projection Pipeline

Custody derivation is completely pure and deterministic:

$$\text{Canonical Handoffs \& Artifacts} \xrightarrow{\text{RuntimeProjectionSnapshot}} \text{deriveArtifactCustody()} \xrightarrow{} \text{ArtifactCustodyState[]} \xrightarrow{\text{deriveArtifactVisualIntents()}} \text{VisualIntent}$$

- **Zero Side-Effects:** No DOM access, no `Date.now()`, no `Math.random()`, no timers, no RAF loops.
- **Snapshot Revision Invalidation:** Superseding revisions immediately cancel stale transit animations and reconcile directly to new authoritative destinations.
- **Fresh-Load Recovery:** Direct initialization at the current authoritative location with zero historical replay.
