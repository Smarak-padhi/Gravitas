# Gravitas Character Identity & Visual Role Model (Wave 12C.5)

## 1. The Role-Based Character Invariant

In the 3D Headquarters, **a 3D humanoid character represents an ORGANIZATIONAL ROLE, never an execution harness or AI provider.**

$$\text{Character in 3D HQ} = \text{AgentRole Identity}$$

### Immutable Presentation Rules:
1. **Never Rename Characters When Harnesses Change:** If `FrontendEngineer` is running via Codex through OmniRoute on GPT-4o today, and switches to FCC directly on Claude-3-7-Sonnet tomorrow, **the character model, uniform, and nameplate remain `Frontend Engineer`**.
2. **Harness Details Live in the Inspector:** Clicking a character docks the 2D Inspector, which truthfully displays live runtime telemetry:
   ```text
   ROLE:             Frontend Engineer
   CURRENT HARNESS:  Codex Worker Harness (v0.2.1)
   TRANSPORT:        OmniRoute Gateway (ACTIVE)
   UPSTREAM:         OpenAI
   MODEL:            gpt-4o-2024-08-06
   WORKTREE:         .git/worktrees/wt-task-102
   CHANGE SCOPE:     apps/web/src/components/**
   ```

---

## 2. The Minimal Wave 12D Character Foundation (4 Roles)

To prevent visual clutter and maintain disciplined engineering, Wave 12D will implement only the **smallest possible role-based character roster** necessary to demonstrate the complete Golden Loop:

| Character Role | Assigned Spatial Station | Visual Appearance & Attire | Default Idle Posture |
| :--- | :--- | :--- | :--- |
| **1. Chief Planner** | `planning-table` (Mission Control) | Navy tailored tunic, brass trim, holographic datapad in hand. | Standing attentively beside holographic table. |
| **2. Frontend Engineer** | `codex-workstation` (Operations Floor) | Graphite jumpsuit, cyan luminescence, terminal earpiece. | Seated at workstation, monitors in standby. |
| **3. Backend Engineer** | `fcc-workstation` (Operations Floor) | Dark slate jumpsuit, emerald luminescence, data gauntlet. | Seated at workstation, monitors in standby. |
| **4. Independent Reviewer**| `verification-lab-console` (Cleanroom) | Cleanroom white coat, amber visor, audit stylus. | Standing at cleanroom console, arms folded or at side. |

### Why Browser QA Is NOT a Humanoid Character
Browser QA is an automated testing harness, not a reasoning human colleague. In the 3D Headquarters, Browser QA is manifested as the **9-Screen Device Matrix Wall** in Room 4, which illuminates with simulated device frames and viewports during test execution. Treating infrastructure as a humanoid figure is an anthropomorphic anti-pattern that Gravitas explicitly rejects.

---

## 3. Character Finite State Machine (FSM)

Each character operates under a strict 4-state visual lifecycle tied directly to authoritative server state:

```
  ┌────────────────────────────────────────────────────────┐
  │ 1. IDLE (Station in standby, non-productive breathing) │
  └───────────────────────────┬────────────────────────────┘
                              │ Authoritative task assigned to station
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 2. FOCUSED_WORK (Active monitors, typing/inspecting)   │
  └───────────────────────────┬────────────────────────────┘
                              │ Task transitions to VERIFYING
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 3. HANDOFF (Holding dossier, turning toward cleanroom) │
  └───────────────────────────┬────────────────────────────┘
                              │ Independent verification succeeds
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 4. DISPATCH (Dossier placed on outbound tray / plinth) │
  └────────────────────────────────────────────────────────┘
```
