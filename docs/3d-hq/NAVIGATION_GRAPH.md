# GRAVITAS 3D HEADQUARTERS — NAVIGATION GRAPH & PATHING
## Deterministic Spatial Topology, Waypoints & Transit Dynamics (Wave 12G)

> **CORE CONCEPTUAL INVARIANTS**:
> - **LOCOMOTION != EXECUTION**: Character movement along waypoints does not execute code, advance tasks, or invoke harnesses.
> - **ARRIVAL != HANDOFF SATISFACTION**: Reaching a station waypoint does NOT satisfy or advance handoffs.
> - **CHARACTER POSITION != ARTIFACT CUSTODY**: Avatar location is decoupled from artifact docket custody.
> - **ANIMATION != TASK STATE**: Path traversal does not advance backend task FSM state.
> - **CAMERA != AUTHORITY**: Viewport framing does not alter navigation or scheduling.
> - **HUMAN OPERATOR != NPC**: There is NO fake operator avatar at the Approval Plinth.
> - **ROLE != HARNESS**: Waypoints belong to canonical organizational roles, never harnesses.

---

## 1. Waypoint Topology & Node Roster

The Headquarters navigation system (`apps/web/src/hq3d/motion/navigationGraph.ts`) implements a deterministic 24-waypoint directed network with strict clearance buffers:

```mermaid
graph TD
    subgraph MissionControl [Mission Control Zone]
        N_PLAN_TABLE["NODE_PLAN_TABLE<br>[-4.5, 0.0, 5.5]"]
        N_PLAN_APPROACH["NODE_PLANNING_APPROACH<br>[-4.5, 0.0, 4.0]"]
        N_MISSION_ENTRY["NODE_MISSION_ENTRY<br>[-4.0, 0.0, 2.5]"]
    end

    subgraph OperationsFloor [Agent Operations Floor]
        N_CORRIDOR["NODE_CORRIDOR_CROSSING<br>[-4.0, 0.0, 0.0]"]
        N_OPS_AISLE_N["NODE_OPS_AISLE_N<br>[-4.0, 0.0, 1.2]"]
        N_OPS_AISLE_S["NODE_OPS_AISLE_S<br>[-4.0, 0.0, -2.4]"]
        N_FE_HOME["NODE_FE_HOME<br>[-6.5, 0.0, 1.2]"]
        N_BE_HOME["NODE_BE_HOME<br>[-1.8, 0.0, 1.2]"]
        N_BAY3_HOME["NODE_BAY3_HOME<br>[-6.5, 0.0, -2.4]"]
        N_BAY4_HOME["NODE_BAY4_HOME<br>[-1.8, 0.0, -2.4]"]
    end

    subgraph VerificationZone [Verification & Cleanroom Lab]
        N_VERIF_AIRLOCK_EXT["NODE_VERIF_AIRLOCK_EXT<br>[0.0, 0.0, 2.0]"]
        N_CLEANROOM_ENTRY["NODE_CLEANROOM_ENTRY<br>[0.6, 0.1, 3.65]"]
        N_VERIF_CENTRAL["NODE_VERIF_CENTRAL<br>[4.5, 0.1, 3.65]"]
        N_REV_HOME["NODE_REV_HOME<br>[7.2, 0.1, 4.0]"]
        N_QA_APPROACH["NODE_QA_APPROACH<br>[4.5, 0.1, 0.5]"]
        N_QA_MATRIX["NODE_QA_MATRIX<br>[7.0, 0.1, 0.5]"]
    end

    subgraph InfrastructureZone [Infrastructure Room]
        N_INFRA_AIRLOCK_EXT["NODE_INFRA_AIRLOCK_EXT<br>[-6.0, 0.0, -4.5]"]
        N_INFRA_ENTRY["NODE_INFRA_ENTRY<br>[-6.5, 0.0, -4.8]"]
        N_OMNIROUTE_RACK["NODE_OMNIROUTE_RACK<br>[-8.8, 0.0, -5.8]"]
    end

    subgraph MezzanineZone [Approval Control Mezzanine]
        N_STAIR_ENTRY["NODE_STAIR_ENTRY<br>[-2.0, 0.0, 3.5]"]
        N_STAIR_MID["NODE_STAIR_MID<br>[-1.0, 1.5, 5.0]"]
        N_STAIR_LANDING["NODE_STAIR_LANDING<br>[0.0, 2.95, 6.5]"]
        N_MEZZANINE_WALKWAY["NODE_MEZZANINE_WALKWAY<br>[0.0, 2.95, 7.5]"]
        N_APPROVAL_PLINTH["NODE_APPROVAL_PLINTH<br>[0.0, 2.95, 8.5]"]
    end

    N_PLAN_TABLE <--> N_PLAN_APPROACH <--> N_MISSION_ENTRY <--> N_OPS_AISLE_N
    N_OPS_AISLE_N <--> N_FE_HOME
    N_OPS_AISLE_N <--> N_BE_HOME
    N_OPS_AISLE_N <--> N_CORRIDOR <--> N_OPS_AISLE_S
    N_OPS_AISLE_S <--> N_BAY3_HOME
    N_OPS_AISLE_S <--> N_BAY4_HOME
    N_CORRIDOR <--> N_VERIF_AIRLOCK_EXT <--> N_CLEANROOM_ENTRY <--> N_VERIF_CENTRAL
    N_VERIF_CENTRAL <--> N_REV_HOME
    N_VERIF_CENTRAL <--> N_QA_APPROACH <--> N_QA_MATRIX
    N_OPS_AISLE_S <--> N_INFRA_AIRLOCK_EXT <--> N_INFRA_ENTRY <--> N_OMNIROUTE_RACK
    N_OPS_AISLE_N <--> N_STAIR_ENTRY <--> N_STAIR_MID <--> N_STAIR_LANDING <--> N_MEZZANINE_WALKWAY <--> N_APPROVAL_PLINTH
```

---

## 2. Collision & Boundary Disciplines

1. **Airlock Boundary Enforcement**: Entry into the Verification Lab requires passing through `NODE_CLEANROOM_ENTRY` at `[0.6, 0.1, 3.65]`. Characters cannot cut across the glass partition.
2. **Staircase Traversal**: Access to the elevated Approval Mezzanine at $Y = 2.95\text{m}$ strictly follows the staircase trajectory (`NODE_STAIR_ENTRY` $\rightarrow$ `NODE_STAIR_MID` $\rightarrow$ `NODE_STAIR_LANDING`).
3. **No Furniture Collisions**: Desks, drafting tables, and server racks are surrounded by clearance buffers; waypoints are placed in clear transit aisles.
4. **Deterministic Routing**: Pathfinding uses pure A* with Euclidean distance heuristic and lexicographic node tie-breaking (`pathfinding.ts`).
