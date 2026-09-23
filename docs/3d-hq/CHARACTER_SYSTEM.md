# GRAVITAS 3D HEADQUARTERS — CHARACTER & ENTITY SYSTEM
## Inhabitant Archetypes, Silhouettes & Phased Asset Strategy (Wave 12G)

> **CORE CONCEPTUAL INVARIANTS**:
> - **LOCOMOTION != EXECUTION**: Character locomotion does not execute tasks, compile code, or invoke gateways.
> - **ARRIVAL != HANDOFF SATISFACTION**: Character arrival at a workstation or console does not satisfy or advance handoffs.
> - **CHARACTER POSITION != ARTIFACT CUSTODY**: Avatar coordinates are decoupled from artifact dossier custody.
> - **ANIMATION != TASK STATE**: An animation starting, stopping, hitching, or failing cannot mutate task FSM state.
> - **CAMERA != AUTHORITY**: Viewport framing presets have no semantic authority over task execution.
> - **HUMAN OPERATOR != NPC**: There is strictly NO humanoid NPC avatar impersonating the sovereign human operator.
> - **ROLE != HARNESS**: Characters represent organizational roles (`Frontend Engineer`, `Backend Engineer`, `Independent Reviewer`, `Chief Planner`), never execution harnesses (`codex-worker`, `fcc-worker`), providers, or models.

---

## 1. The Four Frozen Visual Roles

| Role Identifier | Role Display Name | Canonical Station | Home Position `[x, y, z]` | Attire / Visual Accents |
| :--- | :--- | :--- | :--- | :--- |
| `role:strategy:chief-planner` | Chief Planner | `planning-table` | `[-4.5, 0.0, 5.5]` | Deep navy tunic, brass accents, datapad |
| `role:engineering:frontend-engineer` | Frontend Engineer | `engineering-workstation-01` | `[-6.5, 0.0, 1.2]` | Indigo utility jacket, sapphire cyan accents |
| `role:engineering:backend-engineer` | Backend Engineer | `engineering-workstation-02` | `[-1.8, 0.0, 1.2]` | Charcoal smock, warm ochre terracotta accents |
| `role:quality:independent-reviewer` | Independent Reviewer | `verification-lab-console` | `[7.2, 0.1, 4.0]` | Pale sage cleanroom coat, titanium collar clasp |

---

## 2. Infrastructure Systems (Strictly Non-Humanoid)

1. **Browser QA Lab (Device Matrix Wall)**: A 9-screen display wall in Room 4 displaying live viewport frames. It has ZERO humanoid avatars.
2. **OmniRoute Gateway Rack**: Dual 42U server rack in Room 5 routing inference requests. It has ZERO humanoid avatars.
3. **Approval Plinth**: Command plinth in Room 6 where task dossiers await sovereign human authorization. It has ZERO human operator NPCs.
4. **Integration Engineer**: `role:integration:integration-engineer` is an automated orchestrator composition pipeline in Wave 12G. It receives NO humanoid avatar in Wave 12G (`NOT_READY_FOR_VISUALIZATION`).
