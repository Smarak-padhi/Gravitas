# GRAVITAS — INFORMATION ARCHITECTURE & NAVIGATION AUDIT
## Scalable 4-Tier Surface Organization for Personal OS & Living Headquarters

**Date**: 2026-09-24  
**Scope**: Gravitas Web Frontend (`apps/web`)  
**Requirement**: Section 4 of Wave 12J-UX  

---

## 1. Critique of Current Navigation

Currently, the TopBar renders a flat array of 9 disjointed buttons:
`[HQ 3D] [CALENDAR] [CONNECTORS] [AUTOMATIONS] [OFFICE] [GRAPH] [EVIDENCE] [TIMELINE] [AGENTS]`

### Issues Identified:
1. **Lack of Hierarchy**: Developer debugging tools (`GRAPH`, `TIMELINE`) sit at the exact same visual weight as primary personal workflow surfaces (`CALENDAR`, `HQ 3D`).
2. **Cognitive Overload**: Every new feature added in previous waves simply bolted another button onto the top horizontal bar. This pattern cannot scale to support the 16 target Personal OS capabilities.
3. **Disconnected Mental Models**: The user cannot tell whether a surface belongs to their daily personal life, engineering project execution, external infrastructure, or forensic verification.

---

## 2. The 4-Tier Surface Classification Matrix

We classify all current and roadmap capabilities into four clear operational tiers:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           GRAVITAS TOP NAVIGATION                             │
├───────────────────┬───────────────────┬───────────────────┬───────────────────┤
│    TIER A:        │    TIER B:        │    TIER C:        │    TIER D:        │
│  PERSONAL OS      │   LIVING HQ       │ INFRASTRUCTURE    │   FORENSICS       │
│                   │                   │                   │                   │
│ • Calendar (12J)  │ • 3D Headquarters │ • Connectors(12J) │ • Evidence Vault  │
│ • Automations(12I)│ • Roles & Workers │ • Gateways / Omni │ • Event Timeline  │
│ • Today / Home    │ • Approval Plinth │ • System Health   │ • Dependency Graph│
│ • [Study - Resv]  │ • Projects & Runs │ • Accounts Vault  │ • Office 2D State │
│ • [Comms - Resv]  │ • [Courier - Resv]│                   │                   │
└───────────────────┴───────────────────┴───────────────────┴───────────────────┘
```

### Tier A: Everyday Personal OS
*Target User Need*: "Organize my time, routine, and commitments without cognitive fatigue."
- **`CALENDAR`** *(Active — Wave 12J)*: Single source of schedule truth. Deterministic multi-calendar timeline, filters (`TODAY`, `UPCOMING`), meeting conflict detection.
- **`AUTOMATIONS`** *(Active — Wave 12I)*: Deterministic background scheduler. Cron and interval jobs (`Morning Agenda Summary`, `Calendar Event Reminder`, repo checks).
- **`TODAY / HOME`** *(Integrated)*: High-level cockpit summarizing today's schedule, pending approvals, and active background daemons.
- **Reserved Future Modules** *(Visibly marked unavailable)*: `Study / Learning Coach` (Wave 15), `Communications` (Wave 14), `Personal Progress` (Wave 16).

### Tier B: Living Headquarters & Projects
*Target User Need*: "Observe and guide my digital workforce as a living, spatial organization."
- **`LIVING HQ (3D)`** *(Active — Waves 12D–12J)*: Authoritative 3D presentation of rooms, stations, character locomotion, artifact dossiers, and mechanical approval clasp.
- **`APPROVAL PLINTH`** *(Active — Wave 12H)*: Sovereign human verification console. Visualized in 3D Zone 4 and accessible via 2D modal / quick-action drawer.
- **`PROJECTS & RUNS`** *(Active)*: Active goal execution contracts, repository targets, and run sidebar.
- **Reserved Future Modules**: `Files & File Courier` (Wave 13), `Business Pipeline` (Wave 17).

### Tier C: System Capabilities & Infrastructure
*Target User Need*: "Verify that external transports, models, and accounts are connected and secure."
- **`CONNECTORS`** *(Active — Wave 12J)*: Bounded capability transport bridges (Google Calendar, Mock Provider), account credentials vault, health checks, and sanitized audit logs.
- **`GATEWAYS & HARDWARE`** *(Active)*: OmniRoute local gateway status, model routing qualification, and Server Bay (Zone 5) hardware telemetry.
- **`ACCOUNTS & SECURITY`** *(Active)*: Credential broker boundary and scope declarations.

### Tier D: Forensics & Developer Tools
*Target User Need*: "Inspect exact execution traces, git hashes, cryptographic dossiers, and internal FSM state."
- **`EVIDENCE VAULT`** *(Active — Wave 12A)*: Cryptographic task output dossiers, verifier command logs, and test results.
- **`TIMELINE`** *(Active)*: Chronological authoritative state machine transitions and event hub logs.
- **`GRAPH`** *(Active)*: Task DAG and prerequisite topology.
- **`OFFICE 2D`** *(Active)*: Fallback 2D schematic layout of the headquarters.

---

## 3. Navigation Shell Implementation Strategy

1. **Structured TopBar Hierarchy**:
   - Left: Brand mark (`GRAVITAS`) with current active workspace/repository indicator.
   - Center: Grouped Tier Navigation:
     - `LIVING HQ` (Station shortcut pill)
     - `PERSONAL OS` (Calendar, Automations, Today)
     - `CAPABILITIES` (Connectors, Gateways)
     - `FORENSICS` (Evidence, Timeline, Graph)
   - Right: Real-time Attention Surface:
     - Sovereign Approval Badge (`[APPROVAL NEEDED: 1]` with gold pulse when pending).
     - Scheduler Status Indicator (`● Scheduler Active`).
     - Command Palette Trigger (`Ctrl+K`).
2. **Command Palette Integration (`Ctrl+K` / `Cmd+K`)**:
   - Provides instant, non-visual navigation to every view, room camera preset (`1` through `5`), calendar event filter, and connector account without cluttering the screen with permanent buttons.
3. **Preservation of URL & Test Contract**:
   - Retains programmatic `data-testid` anchors and state compatibility so that all existing tests and scripts continue to operate seamlessly.
