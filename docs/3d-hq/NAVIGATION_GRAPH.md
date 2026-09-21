# GRAVITAS 3D HEADQUARTERS — NAVIGATION GRAPH & PATHING
## Deterministic Spatial Topology, Waypoints & Transit Dynamics

> **CORE PRINCIPLE**: Navigation in Gravitas is 100% deterministic and topological.  
> We do NOT begin with continuous AI pathfinding (such as Recast navmeshes or dynamic A* over arbitrary grids). Characters and packets move along predefined, authoritative navigation vectors between fixed architectural waypoints.

---

## 1. Waypoint Topology & Node Roster

The Headquarters contains 18 canonical waypoints located in 3D scene space (\(X, Y, Z\) in meters):

```mermaid
graph TD
    subgraph MissionControl [Mission Control Zone]
        N_MC_CENTER["MC_CENTER<br>[-4.0, 0.0, 7.0]"]
        N_PLAN_TABLE["PLANNING_TABLE<br>[-4.0, 0.8, 7.0]"]
        N_MC_DISPATCH["MC_DISPATCH_RAMP<br>[-2.0, 0.8, 6.0]"]
    end

    subgraph OperationsFloor [Agent Operations Floor]
        N_OPS_CORRIDOR["OPS_CENTRAL_AISLE<br>[-4.0, 0.0, 0.0]"]
        N_CODEX_DESK["CODEX_DESK<br>[-7.0, 0.8, 1.0]"]
        N_CODEX_SEAT["CODEX_SEAT<br>[-7.0, 0.0, -0.2]"]
        N_FCC_DESK["FCC_DESK<br>[-1.0, 0.8, 1.0]"]
        N_FCC_SEAT["FCC_SEAT<br>[-1.0, 0.0, -0.2]"]
        N_BAY3_DESK["BAY3_ASTRA_DESK<br>[-7.0, 0.8, -4.0]"]
        N_BAY4_DESK["BAY4_EXPANSION_DESK<br>[-1.0, 0.8, -4.0]"]
    end

    subgraph VerificationZone [Verification & QA Lab]
        N_VERIF_AIRLOCK["VERIF_AIRLOCK<br>[1.0, 0.0, 5.0]"]
        N_VERIF_BENCH["VERIFIER_BENCH<br>[6.0, 0.8, 7.0]"]
        N_VERIF_SEAT["VERIFIER_STAND<br>[6.0, 0.0, 5.8]"]
        N_BQA_WALL["BROWSER_QA_WALL<br>[6.0, 1.2, 0.0]"]
        N_BQA_BENCH["BROWSER_QA_BENCH<br>[6.0, 0.8, 0.0]"]
    end

    subgraph InfrastructureZone [Infrastructure Room]
        N_INFRA_AIRLOCK["INFRA_AIRLOCK<br>[-8.0, 0.0, -8.0]"]
        N_INFRA_RACK["OMNIROUTE_RACK<br>[-13.0, 0.0, -9.0]"]
    end

    subgraph MezzanineZone [Approval Control Mezzanine]
        N_LIFT_GROUND["LIFT_GROUND<br>[0.0, 0.0, 11.0]"]
        N_LIFT_ELEVATED["LIFT_ELEVATED<br>[0.0, 3.2, 11.0]"]
        N_MEZZ_CORRIDOR["MEZZ_CORRIDOR<br>[0.0, 3.2, 12.0]"]
        N_APPROVAL_PLINTH["APPROVAL_PLINTH<br>[0.0, 4.0, 12.5]"]
    end

    N_PLAN_TABLE --> N_MC_DISPATCH
    N_MC_DISPATCH --> N_OPS_CORRIDOR
    N_OPS_CORRIDOR --> N_CODEX_SEAT
    N_CODEX_SEAT --> N_CODEX_DESK
    N_OPS_CORRIDOR --> N_FCC_SEAT
    N_FCC_SEAT --> N_FCC_DESK
    N_OPS_CORRIDOR --> N_BAY3_DESK
    N_OPS_CORRIDOR --> N_BAY4_DESK
    N_OPS_CORRIDOR --> N_VERIF_AIRLOCK
    N_VERIF_AIRLOCK --> N_VERIF_BENCH
    N_VERIF_BENCH --> N_BQA_BENCH
    N_VERIF_BENCH --> N_LIFT_GROUND
    N_LIFT_GROUND -.->|Vertical Lift Y=+3.2m| N_LIFT_ELEVATED
    N_LIFT_ELEVATED --> N_MEZZ_CORRIDOR
    N_MEZZ_CORRIDOR --> N_APPROVAL_PLINTH
    N_OPS_CORRIDOR --> N_INFRA_AIRLOCK
    N_INFRA_AIRLOCK --> N_INFRA_RACK
```

---

## 2. Waypoint Coordinates & Orientation Catalog

| Node ID | Zone | \(X\) (m) | \(Y\) (m) | \(Z\) (m) | Default Yaw (\(^{\circ}\)) | Node Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `NODE_MC_PLANNING` | Mission Control | -4.0 | 0.85 | 7.0 | 0° (North) | Work packet origins; DAG layout table |
| `NODE_MC_DISPATCH` | Mission Control | -2.0 | 0.85 | 5.5 | 180° (South) | Intake ramp for optical conduit |
| `NODE_OPS_AISLE_N` | Agent Operations | -4.0 | 0.00 | 4.0 | 180° (South) | North entrance to central operations corridor |
| `NODE_OPS_AISLE_C` | Agent Operations | -4.0 | 0.00 | 0.0 | 180° (South) | Central interchange point for worker desks |
| `NODE_OPS_AISLE_S` | Agent Operations | -4.0 | 0.00 | -4.0 | 180° (South) | South entrance connecting to expansion bays |
| `NODE_CODEX_STAND` | Agent Operations | -6.0 | 0.00 | 0.0 | 90° (East) | Codex character standing position |
| `NODE_CODEX_CHAIR` | Agent Operations | -7.0 | 0.00 | 0.8 | 0° (North) | Codex seated working position |
| `NODE_CODEX_DESK` | Agent Operations | -7.0 | 0.85 | 1.4 | 0° (North) | Codex workstation packet docking plinth |
| `NODE_FCC_STAND` | Agent Operations | -2.0 | 0.00 | 0.0 | 270° (West) | FCC character standing position |
| `NODE_FCC_CHAIR` | Agent Operations | -1.0 | 0.00 | 0.8 | 0° (North) | FCC seated working position |
| `NODE_FCC_DESK` | Agent Operations | -1.0 | 0.85 | 1.4 | 0° (North) | FCC workstation packet docking plinth |
| `NODE_VERIF_PORTAL`| Verification Lab | 1.5 | 0.00 | 5.0 | 90° (East) | Glass sliding airlock entrance |
| `NODE_VERIF_STAND` | Verification Lab | 6.0 | 0.00 | 5.8 | 0° (North) | Independent Verifier character position |
| `NODE_VERIF_BENCH` | Verification Lab | 6.0 | 0.85 | 7.0 | 0° (North) | Digital diff console & test packet dock |
| `NODE_BQA_BENCH` | Browser QA Lab | 6.0 | 0.85 | 0.0 | 90° (East) | Playwright test device matrix station |
| `NODE_LIFT_BASE` | Central Atrium | 0.0 | 0.00 | 10.5 | 0° (North) | Vertical lift ground terminal |
| `NODE_LIFT_TOP` | Mezzanine | 0.0 | 3.20 | 10.5 | 0° (North) | Vertical lift mezzanine arrival terminal |
| `NODE_MEZZ_PLINTH` | Mezzanine | 0.0 | 4.00 | 12.5 | 0° (North) | Human authorization plinth under spotlight |

---

## 3. Transit Dynamics & Motion Velocities

To maintain an unhurried, architectural rhythm:
1. **Character Walking Speed**: Constant \(1.4\text{m/s}\) with smooth acceleration/deceleration curves (duration = \(\text{distance} / 1.4\text{s}\)).
2. **Packet Conduit Velocity**: Constant \(3.0\text{m/s}\) along smooth 3D Catmull-Rom cubic splines connecting station plinths.
3. **Vertical Lift Velocity**: Constant \(2.0\text{m/s}\) vertical ascent/descent (\(3.2\text{m}\) travel in \(1.6\text{s}\)).
4. **Collision Avoidance**: Because waypoints are dedicated to specific stations, two workers never share the same corridor destination simultaneously. If both Codex and FCC transit simultaneously, their parallel corridors are spaced \(5.0\text{m}\) apart, eliminating collision hazards.

---

## 4. Evaluation of Future Dynamic NavMesh Justification

When would a dynamic 3D Navigation Mesh (e.g., Three-Pathfinding or Recast.js) become technically justified in Gravitas?

- **Current Architecture (Wave 12)**: **NOT JUSTIFIED**.
  - With a fixed architectural layout, dedicated workstations, and fixed furniture, a static waypoint graph is faster, uses zero CPU per frame, has zero memory overhead, and guarantees 100% deterministic, repeatable paths with zero edge clipping.
- **Future Justification Triggers**:
  - If Gravitas implements **customizable user-built headquarter layouts** (drag-and-drop desk positioning).
  - If concurrent worker density scales beyond **20 simultaneous moving agents** on the same floor with dynamic obstacle avoidance.
  - Until those requirements exist, the deterministic waypoint graph is strictly superior.
