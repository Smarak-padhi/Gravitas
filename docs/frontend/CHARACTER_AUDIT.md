# GRAVITAS — Wave 12J-UX: Character Visual Foundation Audit

## 1. Core Architectural Separation

```
┌────────────────────────────────────────────────────────┐
│                   SOVEREIGN HUMAN                      │
└───────────────────────────┬────────────────────────────┘
                            │ Policy & Approvals
┌───────────────────────────▼────────────────────────────┐
│                    OFFICIAL ROLES                      │
│   (Chief Planner, Frontend Eng, Backend Eng, Reviewer) │
│                   Character Representation             │
└───────────────────────────┬────────────────────────────┘
                            │ Authority & Tool Grants
┌───────────────────────────▼────────────────────────────┐
│                  EXECUTION HARNESSES                   │
│         (Claude Code, Codex, Local Tool Runners)       │
└───────────────────────────┬────────────────────────────┘
                            │ API & Capability Invocations
┌───────────────────────────▼────────────────────────────┐
│             MODELS, CONNECTORS & EXTERNAL ACCOUNTS      │
│     (Claude 3.5 Sonnet, Google Calendar, GitHub API)   │
└────────────────────────────────────────────────────────┘
```

### Invariant:
$$\text{ROLE} \ne \text{HARNESS} \ne \text{PROVIDER/MODEL} \ne \text{CONNECTOR} \ne \text{EXTERNAL ACCOUNT}$$

- **Character = Role**: A persistent organizational persona with defined authority, domain responsibility, and station in Living HQ.
- **Harness = Tool Runner**: An execution vehicle (e.g. Free Claude Code, Headless CLI) invoked by the role.
- **Model = Engine**: The underlying LLM or statistical model utilized by the harness.
- **Connector = Transport**: A dumb capability transport channel (e.g., Google Calendar, File Courier).
- **Connector Humanoids Are Strictly Prohibited**: Connectors are represented as machinery, racks, and server blades in Zone 5 (Server Bay), never as humanoid characters.

---

## 2. Role Profiles & Spatial Stations

| Role ID | Display Title | Living HQ Station | Domain Responsibility | Ambient Idle State (Visibly Non-Work) |
|---|---|---|---|---|
| `planner` | Chief Planner | War Room (Zone 2) / Desk A1 | Goal decomposition, DAG creation, policy compliance | Inspecting architectural blueprints, observing holographic graph |
| `frontend` | Frontend Engineer | Engineering Lab (Zone 1) / Desk B1 | React UI, design system, CSS tokens, WebGL rendering | Adjusting display monitor angle, drinking water, leaning back |
| `backend` | Backend Engineer | Engineering Lab (Zone 1) / Desk B2 | SQLite event store, connector kernel, API gateway | Checking terminal telemetry, stretching shoulders |
| `reviewer` | Independent Reviewer | Review Chamber (Zone 3) / Desk C1 | Verification, test diffs, security audits, invariant checks | Reading printed verification ledger, pacing thoughtfully |

---

## 3. Truthful Animation & State Semantics

### The Non-Productive Idle Law:
> **No character animation may imply productive work without authoritative runtime state.**

1. **IDLE State**:
   - Authorized condition: No active task claimed by the worker station in SQLite runtime projection.
   - Permitted animations: Low-frequency breathing, postural shifts, gazing away from workstation, checking physical notes.
   - Prohibited animations: Typing on keyboard, frantic gestures, progress bars, fake typing sounds.
2. **CLAIMED / RUNNING State**:
   - Authorized condition: Active task assigned and in `RUNNING` or `VERIFYING` state.
   - Permitted animations: Seated posture oriented toward desk workstation, terminal screen active, subtle typing cadence correlated with SSE telemetry packet intervals.
3. **WAITING_APPROVAL State**:
   - Authorized condition: Active task in `WAITING_APPROVAL` status.
   - Permitted animations: Worker hands raised off keyboard, standing adjacent to desk, yellow halo pulsing gently, waiting for human operator sign-off.
4. **BLOCKED / ERROR State**:
   - Authorized condition: Task exited with non-zero failure code or verification rejection.
   - Permitted animations: Stationary standing posture with warning indicator, terminal displaying error log.

---

## 4. Asset & Geometry Audit

### Asset Investigation & Ponytail Findings:
- Investigation of `@dietrichgebert/ponytail` confirmed it is a developer CLI/prompt-skills plugin containing TypeScript source code. It contains zero 3D models, GLTF files, rigged meshes, or skeletal rigs.
- Other local directories (`ember-and-root`, `o-travelz`, `hospitality-aama`, `Algoryxz`) contain rich UI/architectural reference code, but zero humanoid character assets.
- **Verdict**: Do not introduce arbitrary low-poly humanoid assets from external asset stores without proper design alignment.
- **Current Foundation**:
  - The stylized geometric humanoids in `apps/web/src/hq3d/geometry/coworkers.ts` (head, torso, arms, desk seating orientation, procedural color tints for roles) remain the truthful, high-performance foundation.
  - They incur minimal draw calls (single instanced or merged geometry), zero heavy skeletal skinning compute overhead, and maintain 60 FPS across desktop and laptop hardware.

---

## 5. Transition to Future Rigged Characters

When custom authored rigged meshes are introduced in future waves:
1. Form factor must be cohesive (architectural minimalism, restrained palette).
2. Skeletons must be lightweight (maximum 24 bones per character).
3. LODs must be authored: LOD0 (close inspection < 4m), LOD1 (room view < 12m), LOD2 (overhead facility view > 12m).
4. State must be driven 100% by the authoritative SQLite event projection from `/api/v1/state`.
