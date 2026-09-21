# GRAVITAS 3D HEADQUARTERS — WORLD STATE MODEL
## Deterministic Adapter & Entity Domain Architecture

> **CORE ARCHITECTURAL INVARIANT**: The 3D presentation layer must NEVER bind directly to raw backend SSE streams, asynchronous event emitters, or speculative local state.  
> All 3D rendering is driven by a pure, deterministic projection adapter:  
> `Canonical Runtime State` \(\longrightarrow\) `World Projection Adapter` \(\longrightarrow\) `World State` \(\longrightarrow\) `3D Presentation Layer`

---

## 1. Architectural Dataflow

```
+-------------------------------------------------------------------------+
|                  CANONICAL GRAVITAS RUNTIME STORE                       |
|   (Run, Tasks[], ExecutionContract, Gateways, Harnesses, Event History) |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                    WORLD PROJECTION ADAPTER (Pure Fn)                   |
|               deriveWorldState(runtimeSnapshot): WorldState             |
|                                                                         |
|  - Deterministic entity reconciliation by ID                            |
|  - Authoritative character pose derivation                              |
|  - Physical packet location & custody calculation                       |
|  - Dependency tether & handoff rail status evaluation                   |
|  - Room alert & illumination levels                                     |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                         WORLD STATE (Immutable)                         |
|  { rooms[], stations[], agents[], tasks[], handoffs[], infra, alert }   |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                     3D PRESENTATION & SCENE GRAPH                       |
|  - Declarative meshes, materials, and position transforms               |
|  - State-driven animation mixer playback                                |
|  - Raycast picking & camera focus targets                               |
+-------------------------------------------------------------------------+
```

---

## 2. World Entity Definitions

### 2.1 WorldAgent
Represents an autonomous worker or verifier inhabitant in the 3D space:

```typescript
export type WorldAgentState =
  | 'IDLE'               // At station, resting or ambient reading; no active task
  | 'ASSIGNED'           // Task assigned; turning to workstation
  | 'MOVING'             // Transit between station and planning table / cleanroom
  | 'WORKING'            // Actively executing task in isolated worktree (typing/drafting)
  | 'WAITING_DEPENDENCY' // Task assigned but blocked by upstream prerequisite
  | 'HANDING_OFF'        // Sealed candidate mutation ready for verification transit
  | 'VERIFYING'          // Independent Verifier running deterministic test suite
  | 'FAILED'             // Process crashed, timed out, or rejected with error
  | 'COMPLETED'          // Task succeeded/approved; relaxing at workstation

export interface WorldAgent {
  readonly id: string                    // e.g. 'worker-codex', 'worker-fcc', 'verifier'
  readonly name: string                  // Display label: 'Codex', 'Claude / FCC'
  readonly role: string                  // 'Engineering Specialist', 'Independent Verifier'
  readonly state: WorldAgentState        // Derived canonical state
  readonly assignedStationId: string     // Workstation entity ID (e.g. 'station-codex')
  readonly currentPosition: readonly [number, number, number] // [x, y, z] coordinates
  readonly currentRotationY: number      // Yaw angle in radians
  readonly activeTaskId?: string | undefined // Currently executing task ID
  readonly attentionLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  readonly failureMessage?: string | undefined
}
```

### 2.2 WorldTask
Represents a physical work packet navigating through the headquarters:

```typescript
export type WorldTaskLocation =
  | 'PLANNING_TABLE'        // Sitting in Mission Control DAG area
  | 'TRANSIT_TO_WORKER'     // Moving along optical conduit to worker desk
  | 'WORKSTATION'           // Resting on worker's drafting desk
  | 'TRANSIT_TO_VERIFIER'   // Moving through cleanroom conduit
  | 'VERIFICATION_BENCH'    // On cleanroom digital test bench
  | 'BROWSER_QA_MATRIX'     // Mounted on Device Matrix Wall
  | 'TRANSIT_TO_MEZZANINE'  // Ascending vertical lift to Human Approval
  | 'APPROVAL_PLINTH'       // Resting under the approval spotlight
  | 'ARCHIVED_BASE_REPO'    // Materialized into repository vault dock
  | 'REJECTED_CHUTE'        // Returned down rejection return conduit

export interface WorldTask {
  readonly id: string                    // Task ID from backend
  readonly runId: string
  readonly title: string
  readonly state: TaskState              // Canonical engine state (READY, RUNNING, etc.)
  readonly location: WorldTaskLocation   // Physical position in 3D scene
  readonly assignedWorkerId?: string | undefined
  readonly dependencies: readonly string[] // Prerequisite task IDs
  readonly isBlocked: boolean            // True if prerequisites unsatisfied
  readonly requiresApproval: boolean     // True if golden loop requires human signoff
  readonly diffSummary?: {
    readonly filesChanged: number
    readonly insertions: number
    readonly deletions: number
  } | undefined
}
```

### 2.3 WorldStation
Represents physical furniture and apparatus:

```typescript
export type StationType =
  | 'PLANNING_TABLE'
  | 'WORKER_DESK'
  | 'VERIFICATION_BENCH'
  | 'BROWSER_QA_WALL'
  | 'APPROVAL_PLINTH'
  | 'INFRASTRUCTURE_RACK'

export interface WorldStation {
  readonly id: string
  readonly type: StationType
  readonly roomId: string
  readonly position: readonly [number, number, number]
  readonly isOccupied: boolean
  readonly occupyingAgentId?: string | undefined
  readonly dockedTaskId?: string | undefined
  readonly illuminationColor: string     // CSS/Hex color for station accent light
  readonly statusLed: 'OFF' | 'IDLE' | 'ACTIVE' | 'WARNING' | 'ERROR'
}
```

### 2.4 WorldRoom
Represents architectural zones:

```typescript
export type RoomId =
  | 'MISSION_CONTROL'
  | 'AGENT_OPERATIONS'
  | 'VERIFICATION_LAB'
  | 'BROWSER_QA_LAB'
  | 'INFRASTRUCTURE_ROOM'
  | 'APPROVAL_MEZZANINE'

export interface WorldRoom {
  readonly id: RoomId
  readonly name: string
  readonly boundingBox: {
    readonly min: readonly [number, number, number]
    readonly max: readonly [number, number, number]
  }
  readonly isFocused: boolean            // Camera currently focused on this room
  readonly ambientLightIntensity: number // 0.0 to 1.0
  readonly primaryColor: string
  readonly activeTaskCount: number
}
```

### 2.5 WorldHandoff
Represents physical dependency lines, transit tubes, and token conduits:

```typescript
export interface WorldHandoff {
  readonly id: string
  readonly sourceTaskId: string
  readonly targetTaskId: string
  readonly sourceStationId: string
  readonly targetStationId: string
  readonly state: 'LOCKED' | 'FLOWING' | 'SATISFIED' | 'BROKEN'
  readonly splineWaypoints: ReadonlyArray<readonly [number, number, number]>
}
```

### 2.6 WorldInfrastructure
Represents gateway routers, provider health, and network connectivity:

```typescript
export interface WorldInfrastructure {
  readonly gatewayStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE'
  readonly activeRoute: 'PRIMARY_DIRECT' | 'FALLBACK_SECONDARY' | 'LOCAL_CONTAINER'
  readonly tokenVelocityRpm: number      // Tokens per minute mapped to LED pulse rate
  readonly latencyMs: number
  readonly activeProviders: readonly {
    readonly id: string                  // 'anthropic', 'openai', 'gemini'
    readonly isAvailable: boolean
    readonly fallbackOccurred: boolean
  }[]
}
```

### 2.7 WorldAlert
Represents global system state warnings:

```typescript
export interface WorldAlert {
  readonly severity: 'NONE' | 'INFO' | 'WARNING' | 'CRITICAL'
  readonly code: string                  // e.g. 'SSE_DISCONNECTED', 'VERIFICATION_REJECTED'
  readonly message: string
  readonly targetRoomId?: RoomId | undefined
  readonly targetAgentId?: string | undefined
}
```

---

## 3. Deterministic State Derivation Rules

The adapter function `deriveWorldState(input: DeriveWorldInput): WorldState` is 100% pure and deterministic.

| Authoritative Engine Condition | Entity State Projection | Physical 3D Presentation |
| :--- | :--- | :--- |
| `task.state === 'PLANNED'` & unfulfilled dependencies | `agent.state = IDLE`<br>`task.location = PLANNING_TABLE`<br>`task.isBlocked = true` | Packet sits in blocked tray on planning table; orange constraint tether links from upstream task. |
| `task.state === 'READY'` (Unscheduled in `readyQueue`) | `agent.state = IDLE`<br>`task.location = PLANNING_TABLE`<br>`task.isBlocked = false` | Packet sits in Ready Tray on planning table; ready slot glows neutral white. **Worker is NOT assigned yet**. |
| `task.state === 'READY'` + `TASK_SCHEDULED` (or authoritative assignment) | `agent.state = ASSIGNED`<br>`task.location = TRANSIT_TO_WORKER` | Packet glides along recessed optical conduit to assigned desk; station monitor illuminates. |
| `task.state === 'RUNNING'` (`WORKER_STARTED`) | `agent.state = WORKING`<br>`task.location = WORKSTATION` | Worker seated, typing/navigating on console strictly during execution; sapphire ambient glow. |
| `task.state === 'VERIFYING'` (Standard) | `agent.state = IDLE`<br>`verifier.state = VERIFYING`<br>`task.location = VERIFICATION_BENCH` | Packet docks on cleanroom bench; verifier character examines diff console; cool white spot. |
| `task.state === 'VERIFYING'` (Browser QA active) | `verifier.state = VERIFYING`<br>`task.location = BROWSER_QA_MATRIX` | Packet docks at Device Matrix; simulated viewport screens illuminate with DOM assertions. |
| `task.state === 'WAITING_APPROVAL'` | `agent.state = IDLE`<br>`task.location = APPROVAL_PLINTH` | Packet ascends vertical lift to Mezzanine; warm amber spotlight illuminates plinth. **Awaits user action**. |
| `task.state === 'APPROVED'` / `SUCCEEDED` | `task.location = ARCHIVED_BASE_REPO` | Gold verification mark appears on packet; packet glides into repository vault slot. |
| `task.state === 'FAILED'` | `agent.state = FAILED`<br>`task.location = REJECTED_CHUTE` | Workstation displays red error code; packet flagged with red seal; character in alert pose. |

---

## 4. Reconnect, Snapshot & Stale-State Recovery

1. **Idempotent Snapshot Ingestion**:
   - Whenever `useEvents` reconnects or an authoritative poll completes (`api.getRun()`), the World State Adapter executes `deriveWorldState()`.
   - 3D entities reconcile by permanent ID. Positions are immediately updated to their true coordinates (or smoothly lerped if within 0.5m).
2. **Zero Orphaned Objects**:
   - Packets and handoff tethers are keyed strictly to existing `tasks[].id`. If a task is purged or reset, its corresponding 3D packet is immediately unmounted.
3. **No Synthetic Timer Drift**:
   - The world adapter never relies on `setInterval` or client timers to increment progress percentages. If an agent executes for 45 seconds, the 2D inspector shows the elapsed time from backend timestamps, while the 3D character maintains the authoritative `WORKING` loop.
