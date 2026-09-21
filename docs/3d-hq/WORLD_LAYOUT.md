# GRAVITAS 3D HEADQUARTERS — ARCHITECTURAL WORLD LAYOUT
## Spatial Geometry, Zones & ASCII Floorplans

> **DESIGN ARCHETYPE**: The Precision Engineering Atelier & Mission Deck  
> **SPATIAL COMPOSITION**: Single-story open-atrium operations floor with an elevated mezzanine gallery, designed for unobstructed isometric / perspective camera readability.

---

## 1. Spatial Principles & Composition Rationale

Designing an interactive 3D operations headquarters requires balancing operational clarity with architectural elegance:

1. **Unobstructed Sightlines (No Hidden Corners)**:
   - High rear walls and low front partitions ensure that all primary zones remain visible from a standard elevated isometric angle (Azimuth 45°, Elevation 35°).
   - Glass partitions separate specialized acoustic/cleanroom environments (Verification Lab, Infrastructure Room) without causing camera occlusion.
2. **Left-to-Right Task Flow Vector**:
   - The spatial layout aligns with the natural cognitive workflow:
     - **West / Center**: *Planning & Goal Ingestion* (Mission Control).
     - **Center / South**: *Implementation Execution* (Agent Operations Floor).
     - **East**: *Deterministic Verification & Browser QA* (Cleanroom & Device Matrix).
     - **North (Elevated)**: *Governance & Authorization* (Approval Mezzanine).
     - **Southwest**: *Server Racks & Routing Telemetry* (Infrastructure Room).
3. **Ergonomic Character Travel**:
   - Transit corridors between the Planning Table, Agent Desks, Verification Lab, and Mezzanine are direct and compact (no winding mazes).
4. **Modularity for Multi-Worker Expansion**:
   - The Agent Operations floor features modular workstation bays that expand gracefully from 2 initial workers (Codex, FCC) to 6 or 10 concurrent workers without re-architecting the building footprint.

---

## 2. Global Spatial Coordinates & Dimensions

All units are in normalized scene meters (\(1.0 = 1\text{m}\)):

- **Total HQ Footprint**: \(36.0\text{m}\ (\text{X - Width}) \times 28.0\text{m}\ (\text{Z - Depth})\)
- **Base Ground Floor Elevation**: \(Y = 0.0\text{m}\)
- **Mezzanine Floor Elevation**: \(Y = +3.2\text{m}\)
- **Ceiling / Roof Truss Line**: \(Y = +6.0\text{m}\) (open truss design, no solid ceiling to obstruct camera)

```
        (-X: West) <----------------- [0,0] -----------------> (+X: East)
  +Z (North / Rear / Elevated Mezzanine)
  ^
  |      [ZONE F: APPROVAL CONTROL MEZZANINE (Elevated Y=+3.2m)]
  |
  |   [ZONE A: MISSION CONTROL]       |   [ZONE C: VERIFICATION LAB]
  |      (Planning Table)             |      (Cleanroom Bench)
  |                                   |   [ZONE D: BROWSER QA]
  |   [ZONE B: AGENT OPERATIONS]      |      (Device Matrix Wall)
  |      (Codex & FCC Desks)          |
  |
  |   [ZONE E: INFRASTRUCTURE ROOM]   |   [TRANSIT / REPOSITORY VAULT]
  v
  -Z (South / Front / Camera Baseline)
```

---

## 3. Authoritative ASCII Architectural Floorplan

```
====================================================================================================
                                      GRAVITAS HEADQUARTERS
                                  LEVEL 0 (GROUND) & LEVEL 1 (MEZZANINE)
====================================================================================================

               +-------------------------------------------------------------+
               |             ZONE F: APPROVAL CONTROL MEZZANINE               |
               |                [Elevated Gallery Y = +3.2m]                  |
               |                                                             |
               |       [User Terminal]          [Approval Plinth]            |
               |             (T1)                     (P1)                   |
               +------------------------------+------------------------------+
                                              | Vertical Packet Lift (L1)
                                              |
+---------------------------------------------+----------------------------------------------------+
|  ZONE A: MISSION CONTROL                    |  ZONE C: VERIFICATION LAB (Glass Enclosure)        |
|                                             |                                                    |
|     +---------------------------------+     |     +----------------------------------------+     |
|     |     MISSION PLANNING TABLE      |     |     |       INDEPENDENT VERIFIER BENCH       |     |
|     |                                 |====>|     |                                        |     |
|     | [Run Goal & DAG Work Packets]   |     |     |  [Verifier Desk (V1)] [Diff Console]   |     |
|     +---------------------------------+     |     +----------------------------------------+     |
|                     ||                      |                         ||                         |
|                     || Optical Conduit      |                         || Verification Conduit    |
|                     \/                      |                         \/                         |
|  ZONE B: AGENT OPERATIONS FLOOR             |  ZONE D: BROWSER QA LAB                            |
|                                             |                                                    |
|  +-------------------+ +------------------+ |     +----------------------------------------+     |
|  | CODEX WORKSTATION | |  FCC WORKSTATION | |     |           DEVICE MATRIX WALL           |     |
|  |       (W1)        | |       (W2)       | |     |                                        |     |
|  | [Drafting Desk]   | | [Drafting Desk]  | |     |   [Desktop]    [Tablet]    [Mobile]    |     |
|  | [Worktree Monitor]| | [Buffer Monitor] | |     |      (B1)        (B2)        (B3)      |     |
|  +-------------------+ +------------------+ |     +----------------------------------------+     |
|            |                     |          +----------------------------------------------------+
|            +----------+----------+                                    |
|                       | Dependency Conduit                            | Cleanroom Exit
|                       v                                               v
|  +-------------------+ +------------------+           +----------------------------------+
|  |  EXPANSION BAY 03 | | EXPANSION BAY 04 |           |  ZONE G: REPOSITORY VAULT        |
|  |   (Astra Studio)  | |  (Reserved Slot) |           |                                  |
|  +-------------------+ +------------------+           |  [Base Branch Materialization]   |
+---------------------------------------------+         +----------------------------------+
|  ZONE E: INFRASTRUCTURE ROOM                |
|  (Glass Acoustic Partition)                 |
|                                             |
|   +---------------+   +-----------------+   |
|   | OMNIROUTE     |   | MODEL PROVIDER  |   |
|   | GATEWAY RACK  |   | TELEMETRY RACK  |   |
|   | [Route Relays]|   | [Tokens / Lat]  |   |
|   +---------------+   +-----------------+   |
+---------------------------------------------+
====================================================================================================
```

---

## 4. Zone-by-Zone Detailed Specifications

### Zone A: Mission Control (Planning & DAG Ingestion)
- **Position**: Center-West (\(X: -8.0\text{m}\ \text{to}\ 0.0\text{m},\ Z: +4.0\text{m}\ \text{to}\ +10.0\text{m}\)).
- **Primary Feature**: **The Planning Table** — a massive \(3.0\text{m} \times 1.6\text{m}\) architectural light-table.
- **Physical Dynamics**:
  - When a Run is created, the Goal text and DAG nodes materialize as clean vellum tablets on this table.
  - Sub-task cards rest here until dependencies are satisfied.
- **Sightline Considerations**: Positioned at table height (\(Y = +0.8\text{m}\)) to never obscure background zones.

### Zone B: Agent Operations Floor (Worker Workstations)
- **Position**: Center-South (\(X: -12.0\text{m}\ \text{to}\ 0.0\text{m},\ Z: -4.0\text{m}\ \text{to}\ +4.0\text{m}\)).
- **Primary Features**: Individual worker workstations arranged in an open collaborative studio layout:
  - **Workstation 1 (Codex)**: Drafting desk, precision stylus dock, active worktree CRT display.
  - **Workstation 2 (FCC / Claude)**: Solid walnut architect desk, multi-file code buffer displays.
  - **Workstations 3-4 (Expansion Bays)**: Reserved for Astra (Design) and dynamic worker instances.
- **Spillway / Transit Corridor**: Wide central aisle (\(2.5\text{m}\)) with recessed optical conduits linking desks.

### Zone C: Verification Lab (Independent Verification Cleanroom)
- **Position**: East-North (\(X: +2.0\text{m}\ \text{to}\ +12.0\text{m},\ Z: +4.0\text{m}\ \text{to}\ +10.0\text{m}\)).
- **Acoustic / Environmental Enclosure**: Enclosed in ultra-clear frameless glass partitions with brushed brass corner stanchions.
- **Primary Feature**: **The Digital Inspection Console** (\(3.2\text{m} \times 1.2\text{m}\)).
- **Instruments**:
  - Digital diff comparison console and optical assertion scanner.
  - Terminal monitor executing deterministic test suites in isolated worktrees.
  - Independent Verifier character station (`gate-verifier`).

### Zone D: Browser QA Lab (Deterministic DOM Validation)
- **Position**: East-South (\(X: +2.0\text{m}\ \text{to}\ +12.0\text{m},\ Z: -4.0\text{m}\ \text{to}\ +4.0\text{m}\)).
- **Primary Feature**: **The Device Matrix Wall** — a vertical teak mounting board holding three physical device frames:
  - Ultra-wide desktop viewport monitor.
  - Tablet viewport (portrait/landscape).
  - Mobile viewport frame.
- **Physical Dynamics**: During `BROWSER_QA_STARTED`, device displays illuminate and render simulated page wireframes while step LEDs cycle (emerald for pass, crimson for error).

### Zone E: Infrastructure Room (Gateways, Racks & Health)
- **Position**: Southwest Corner (\(X: -16.0\text{m}\ \text{to}\ -10.0\text{m},\ Z: -12.0\text{m}\ \text{to}\ -6.0\text{m}\)).
- **Design Philosophy**: Industrial server bay with perforated acoustic steel wall.
- **Primary Equipment**:
  - **OmniRoute Server Cabinet**: Dual 42U rack with pulsating routing relays, transport indicator LEDs (Primary vs. Fallback), and fiber patch bays.
  - **Provider Telemetry Array**: Meter banks tracking token burn, latency, and provider health.
- **Explicit Rule**: Zero human or humanoid presence. This room contains pure infrastructure.

### Zone F: Approval Control Mezzanine (User Governance Gallery)
- **Position**: Far North (\(X: -10.0\text{m}\ \text{to}\ +10.0\text{m},\ Z: +10.0\text{m}\ \text{to}\ +14.0\text{m}\), Elevated \(Y = +3.2\text{m}\)).
- **Architecture**: Elevated gallery overlooking the entire operations floor, accessible via vertical carriage lift. Represents the human user's oversight deck.
- **Primary Feature**: **The Authorization Plinth**:
  - When a task enters `WAITING_APPROVAL`, its physical work packet rests on this plinth.
  - A focused warm amber spotlight illuminates the plinth.
  - **No NPC character stands here**: The human user is the operator; approving occurs via the docked 2D inspector.

---

## 5. Occlusion Avoidance & Multi-Display Adaptability

1. **Elevation Staggering**:
   - South foreground objects (Infrastructure racks, desk rails) are kept low (\(<1.2\text{m}\)).
   - Midground tables (Codex desk, Planning Table) are standard workbench height (\(0.85\text{m}\)).
   - North background (Approval Mezzanine) is elevated (\(+3.2\text{m}\)).
   - This ensures that when the camera looks North-East, zero background zones are blocked by foreground geometry.
2. **Narrow Viewport (Mobile / Tablet) Strategy**:
   - On viewports with aspect ratios narrower than `4:3`:
     - The camera automatically transitions from the wide HQ Overview to **Focused Room Orbit** mode.
     - The operator can swipe or tap bottom tabs (`PLANNING`, `AGENTS`, `VERIFIER`, `APPROVAL`) to smoothly pan the camera to that specific room.
     - A persistent "2D Operations List" toggle provides instant non-WebGL access.
