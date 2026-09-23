# Gravitas Character Identity & Visual Role Model (Wave 12G)

> **CORE CONCEPTUAL INVARIANTS**:
> - **LOCOMOTION != EXECUTION**: Character locomotion does not execute tasks, compile code, or invoke gateways.
> - **ARRIVAL != HANDOFF SATISFACTION**: Character arrival at a workstation or console does not satisfy or advance handoffs.
> - **CHARACTER POSITION != ARTIFACT CUSTODY**: Avatar coordinates are decoupled from artifact dossier custody.
> - **ANIMATION != TASK STATE**: An animation starting, stopping, hitching, or failing cannot mutate task FSM state.
> - **CAMERA != AUTHORITY**: Viewport framing presets have no semantic authority over task execution.
> - **HUMAN OPERATOR != NPC**: There is strictly NO humanoid NPC avatar impersonating the sovereign human operator.
> - **ROLE != HARNESS**: Characters represent organizational roles (`Frontend Engineer`, `Backend Engineer`, `Independent Reviewer`, `Chief Planner`), never execution harnesses (`codex-worker`, `fcc-worker`), providers, or models.

---

## 1. The Role-Based Character Invariant

In the 3D Headquarters, **a 3D humanoid character represents an ORGANIZATIONAL ROLE, never an execution harness or AI provider.**

$$\text{Character in 3D HQ} = \text{AgentRole Identity}$$

### Immutable Presentation Rules:
1. **Never Rename Characters When Harnesses Change:** If `FrontendEngineer` is running via Codex through OmniRoute on GPT-4o today, and switches to FCC directly on Claude-3-7-Sonnet tomorrow, **the character model, uniform, and nameplate remain `Frontend Engineer`**.
2. **Harness Details Live in the Inspector:** Clicking a character docks the 2D Inspector, which truthfully displays live runtime telemetry:
   ```text
   ROLE:             Frontend Engineer
   CURRENT TASK:     task-fe-102
   SPATIAL STATE:    AT_ASSIGNMENT
   CURRENT STATION:  engineering-workstation-01
   CURRENT HARNESS:  Codex Worker Harness (v0.2.1)
   TRANSPORT:        OmniRoute Gateway (ACTIVE)
   GATEWAY:          omniroute-local
   UPSTREAM:         OpenAI
   MODEL:            gpt-4o-2024-08-06
   PROJECTION EPOCH: epoch_101
   PROJECTION REV:   42
   ```

---

## 2. The Four Frozen Visual Roles

| Character Role | Assigned Spatial Station | Physical Station Alias | Visual Appearance & Attire | Default Idle Posture |
| :--- | :--- | :--- | :--- | :--- |
| **1. Chief Planner** | `planning-table` (Mission Control) | `planning-table` | Navy tailored tunic, brass trim, holographic datapad in hand. | Standing attentively beside holographic table. |
| **2. Frontend Engineer** | `engineering-workstation-01` (Operations) | `codex-workstation` | Indigo utility jacket, sapphire cyan luminescence. | Seated at workstation, monitors in standby. |
| **3. Backend Engineer** | `engineering-workstation-02` (Operations) | `fcc-workstation` | Charcoal smock, warm ochre terracotta luminescence. | Seated at workstation, monitors in standby. |
| **4. Independent Reviewer**| `verification-lab-console` (Cleanroom) | `verifier-console` | Cleanroom white coat, amber visor, audit stylus. | Standing at cleanroom console, arms folded or at side. |

---

## 3. Presentation-Only Locomotion Lifecycle (Wave 12G)

Character movement is computed deterministically via `CharacterMotionController`:
- **States**: `IDLE` $\rightarrow$ `STAND_UP` $\rightarrow$ `WALK` $\rightarrow$ `ARRIVE` $\rightarrow$ `FOCUSED` / `REVIEWING` $\rightarrow$ `RETURNING` $\rightarrow$ `SIT_DOWN`.
- **Speed**: Controlled 1.25–1.45 units/sec.
- **Pure Projection**: Characters move strictly when authoritative backend state changes. They never wander, idle-chat, or type fake code.
