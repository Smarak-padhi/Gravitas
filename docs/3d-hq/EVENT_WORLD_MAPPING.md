# GRAVITAS 3D HEADQUARTERS — CANONICAL EVENT TO WORLD REACTION MAPPING
## Authoritative Event Semantics & World Reaction Specifications

> **AUTHORITATIVE SOURCE**: `@gravitas/core` domain event schema (`packages/core/src/types.ts` and `events.ts`) and `@gravitas/orchestrator` BoundedScheduler.  
> **RULE 1 (PRECISION ASSIGNMENT)**: `TASK_READY` does NOT mean a worker is assigned. `TASK_READY` means dependencies are satisfied and the task is enqueued in `readyQueue`. Worker ownership is visualized ONLY when authoritative worker assignment exists (`TASK_SCHEDULED` / `WORKER_STARTED` or derived from the authoritative run snapshot).  
> **RULE 2 (EXPLICIT NON-SPATIAL EVENTS)**: Events without spatial meaning declare `WORLD_EFFECT: NONE`. We do not manufacture cosmetic world reactions for internal bookkeeping.  
> **RULE 3 (NO OPERATOR NPC)**: The HUMAN USER is the operator. Approval Control represents the user's terminal. No character pretends to perform human approval.

---

## 1. Global Animation & Semantic Invariants

1. **Permitted Animations**:
   - Locomotion strictly between predefined station waypoints when moving to an assigned workstation.
   - Postural state transitions (`SIT_DOWN`, `STAND_UP`, `TURN_TO_DESK`).
   - Authentic work execution (`TYPING_DRAFTING` strictly during `WORKER_STARTED` execution).
   - Independent Verifier audit posture (state-driven, zero arbitrary socializing).
   - Linear transit of task data objects along physical station conduits.
2. **Forbidden Animations & Behaviors**:
   - **No fake operator character**: The human user is the operator. No NPC stands at the approval desk pretending to review code.
   - **No assignment visualization on `TASK_READY`**: A ready task waits at the Planning Table until scheduled.
   - **No idle wandering**: Characters never pace or socialize.
   - **No fake work**: Typing happens only while a real process runs in an isolated worktree.
   - **No steampunk theatre**: No pneumatic tubes, no brass scale tipping, no Victorian floor-trap doors. Movements are modern, architectural, and restrained.

---

## 2. Canonical Event Mapping Table

| Canonical Event | State Transition & Scheduler Semantics | World Effect | Character Reaction | Environment Reaction | 2D UI Reaction | Permitted Animation | Forbidden Animation | Reconnect / Recovery Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`RUN_CREATED`** | Run instantiated (`PENDING`). | Task folio materializes on Mission Planning Table. | Available workers turn to face Planning Table. | Planning Table subtle backlight activates. | RunsList updates; active run selected. | Folio scale-in (150ms). | No character transit yet. | Render static folio on table immediately. |
| **`EXECUTION_CONTRACT_CREATED`** | Contract constraints bound to Run. | `WORLD_EFFECT: NONE` | None. | None. | TaskInspector updates contract tab. | None. | Fabricating unrolling blueprints. | None. |
| **`RUN_PLAN_CREATED`** | DAG compiled (`taskIds[]`, `readyQueue[]`). | Task folios lay out in DAG topology on Planning Table. | None. | Table surface grid illuminates. | ExecutionGraph displays DAG nodes. | Staggered fade-in (150ms). | Flying cards across rooms. | Reconcile all task meshes from snapshot. |
| **`RUN_STATE_CHANGED`** | Run status change (`RUNNING`, `FAILED`, etc.). | Atrium lighting shifts to operational state. | Characters adopt alert/ready posture. | Ambient lighting level adjusts from standby (0.35) to active (0.75). | TopBar status badge updates. | Lighting cross-fade (300ms). | Sudden light pops or flashing. | Snapshot sets ambient light instantly. |
| **`RUN_COMPLETED`** | All tasks terminal; Run: `COMPLETED`. | Atrium lighting returns to calm ambient; active station halos extinguish. | Workers stand, face neutral, adopt relaxed standby. | Soft green accent indicator on primary floor bezel. | TopBar displays completed status. | Smooth sit-to-stand (350ms). | Victorious dance or celebrations. | World in clean, dignified quiet state. |
| **`RUN_FAILED`** | Run terminal; Run: `FAILED`. | Active station halos switch to muted red warning; task objects show failure tag. | Workers halt; stand facing workstation monitor. | Subtle slate-red ambient tint in active zone. | Global error banner in 2D shell. | Stand-up transition (300ms). | Slapstick rage or despair. | Static failed markers displayed. |
| **`TASK_CREATED`** | Task record created (`PLANNED`). | Task folio mesh appears in Planning Table queue. | None. | None. | Task added to DAG view. | Instant spawn with subtle fade. | Flying or spinning meshes. | Reconcile from tasks snapshot. |
| **`TASK_READY`** | Dependencies satisfied; task added to scheduler `readyQueue`. | Task folio shifts from "Blocked" tray to "Ready Queue" tray on Planning Table. | **NONE** (Worker is NOT assigned yet; task is awaiting an available concurrency slot). | Planning table ready slot glows soft neutral. | Task badge switches to READY. | Linear slide across table tray (200ms). | **FORBIDDEN: Worker walking to desk or claiming task**. | Task sits in Ready tray on table. |
| **`TASK_SCHEDULED`** | Task popped from `readyQueue`; allocated to execution slot `{ slot }`. | Task folio dispatches from Planning Table along conduit toward assigned worker desk. | Assigned worker turns to desk, sits down. | Assigned workstation desk surface illuminates. | ExecutionGraph marks task dispatched. | Folio linear transit (400ms); character sits (300ms). | Teleportation; unassigned workers moving. | Place task folio on worker desk plinth. |
| **`TASK_STATE_CHANGED`** | Authoritative task state change (`fromState` \(\rightarrow\) `toState`). | Task folio status bezel updates color to match authoritative state. | Synchronized with specific state transition. | Station status LED updates. | Badges update in 2D. | Bezel color lerp (150ms). | Shaking or pulsing meshes. | Apply color directly from authoritative task. |
| **`WORKER_STARTED`** | Agent harness spawned in isolated worktree (`RUNNING`). | Task folio docks on drafting desk; workstation terminal powers on. | Worker character begins focused `WORKING` typing/reading loop. | Workstation desk halo illuminates (sapphire for Codex, amber for FCC). | TaskInspector streams live logs and timer. | Continuous focused typing/inspection loop. | Pausing work while event is active. | Resume typing loop immediately on reconnect. |
| **`WORKER_FINISHED`** | Agent harness finished execution; candidate mutation ready. | Task folio closes; candidate seal ring attaches to folio. | Worker pushes back from desk, stands in audit posture. | Desk halo returns to neutral white. | TaskInspector shows diff available. | Smooth sit-to-stand (300ms); folio closure (200ms). | Continued typing after event. | Render sealed folio resting on desk plinth. |
| **`VERIFICATION_STARTED`** | Independent verifier begins isolated test execution (`VERIFYING`). | Task folio transits along cleanroom conduit to Verification Lab bench. | Independent Verifier steps forward to bench, begins audit inspection pose. | Cleanroom lights shift to focused cool white (5000K). | TaskInspector focuses on verification terminal. | Cleanroom transit (500ms); Verifier focus pose (250ms). | Worker following packet into cleanroom. | Folio mounted on cleanroom bench. |
| **`VERIFICATION_FINISHED`** | Independent verification complete (PASS or FAIL). | Folio receives green verification checkmark (PASS) or red rejection marker (FAIL). | Verifier character logs audit result on terminal. | Cleanroom beacon flashes green (pass) or red (fail). | Test execution summary in 2D inspector. | Audit log gesture (250ms). | Emotional celebration or frustration. | Display verified docket on bench. |
| **`EVIDENCE_CREATED`** | Evidence bundle (diff, test logs) sealed. | Evidence capsule docks onto task folio. | None. | None. | TopBar evidence badge illuminates. | Subtle snap dock (150ms). | Magical particle effects. | Evidence attached to folio mesh. |
| **`BROWSER_QA_STARTED`** | Playwright browser QA running (`BrowserQaContract`). | Device Matrix Wall screens illuminate; test viewport frames render simulated DOM wireframe. | Verifier monitors device wall from observation desk. | Device Matrix station lights active. | 2D inspector shows Playwright step sequence. | Screen power-up sequence (200ms). | Fabricating video playback. | Device screens show active step. |
| **`BROWSER_QA_COMPLETED`** | Playwright test suite passed. | Device Matrix screens show green border; verification pass confirmed. | Verifier logs pass. | Green indicator on Device Matrix. | Playwright steps all green in 2D. | Subtle green pulse (200ms). | None. | Display static verified screen. |
| **`BROWSER_QA_FAILED`** | Playwright test assertion failed. | Device Matrix screens show red error frame; failed selector highlighted. | Verifier flags failure docket. | Red warning strobe on Device Matrix. | Failed step details displayed in 2D. | Red flash (250ms). | Cracking glass or screen sparks. | Frozen on failed step display. |
| **`APPROVAL_REQUIRED`** | Task requires explicit human review (`WAITING_APPROVAL`). | Task folio moves via vertical lift to the Approval Control station on Mezzanine. | **NO OPERATOR CHARACTER REACTS** (User is the operator). | Focused warm amber spotlight illuminates the Approval Plinth. | Human Inbox alerts; sound chime triggers. | Vertical lift ascent (600ms); plinth dock (200ms). | **FORBIDDEN: NPC character standing at desk approving**. | Folio sits on Mezzanine Plinth under spot. |
| **`TASK_APPROVED`** | Human operator clicks "Approve" in 2D Inspector. | Task folio receives gold authorization seal; conduit guides folio to repository vault. | Floor workers briefly acknowledge approved milestone. | Approval spotlight transitions to green flash; conduit opens. | 2D inspector marks approved. | Authorization stamp deboss (200ms); transit (400ms). | Confetti or cartoon celebration. | Folio archived in repository vault. |
| **`TASK_REJECTED`** | Human operator clicks "Reject" in 2D Inspector. | Task folio receives red rejection mark; routes down return conduit to planning table. | None. | Approval spotlight turns off. | Rejection modal feedback recorded. | Return conduit slide (400ms). | Violent disposal or tearing of paper. | Task folio at planning table marked rejected. |
| **`TASK_RESULT_MATERIALIZED`** | Verified commit landed in base repository branch. | Repository Vault station indicator flashes solid green; commit hash badge updates. | None. | Vault status LED solid green. | Base commit SHA rendered in 2D. | Vault LED illuminate (150ms). | Overly theatrical floor traps. | Vault displays active HEAD commit hash. |
| **`TASK_COMPOSITION_CONFLICT`** | Git merge conflict detected during branch composition. | Task folio flagged with orange conflict clamp; held at Planning Table. | Assigned worker reviews conflict report at desk. | Station LED pulses double amber. | 3-way merge conflict panel in 2D. | Warning clamp attach (150ms). | Panicked character gestures. | Display conflict clamp on folio. |
| **`ROUTE_SELECTED`** | OmniRoute selects inference model/gateway route. | Infrastructure rack relay LED toggles to selected provider position. | None (characters do not interact with gateways). | Patch bay bus illuminates blue. | TopBar gateway status updates. | Relay LED toggle (100ms). | Humanoid agent acting as router. | Match indicator to active route. |
| **`GATEWAY_ROUTE_STARTED`** | Model HTTP stream initiated. | Infrastructure rack token activity LED pulses softly. | None. | None. | EventConsole records dispatch. | Subtle LED pulse (100ms). | Glowing energy beams across floor. | Steady activity LED on rack. |
| **`GATEWAY_ROUTE_COMPLETED`** | Model invocation successfully ended. | Infrastructure rack token LED returns to idle standby. | None. | None. | Token count updated in 2D telemetry. | Fade to idle (150ms). | None. | Rack in idle standby. |
| **`GATEWAY_ROUTE_FAILED`** | Provider returned error or timed out. | Infrastructure rack relay switches to warning yellow. | None. | None. | Warning logged in EventConsole. | Switch toggle (100ms). | Server explosion or sparks. | Rack displays current degraded circuit. |
| **`PROVIDER_FALLBACK_OCCURRED`** | Failover to secondary provider executed. | Primary rack module dims; secondary module illuminates with amber bypass line. | None. | None. | Warning pill: `FALLBACK: [PROVIDER]`. | Bypass line illuminate (200ms). | None. | Bypass line remains illuminated. |
| **`TRANSPORT_FALLBACK_OCCURRED`** | Transport protocol shifted (SSE / Direct HTTP). | `WORLD_EFFECT: NONE` (Internal transport detail). | None. | None. | Technical note in EventConsole. | None. | Any 3D scene disruption. | None. |

---

## 3. Authoritative Assignment Derivation Rules

To prevent speculative worker assignment:
1. When `TASK_READY` arrives, the task entity is marked `status = 'READY'` and sits in the Mission Planning Table queue. It has **no assigned worker mesh** until scheduled.
2. Worker assignment is only visualized when:
   - A `TASK_SCHEDULED` event arrives with a concrete slot/worker ID, OR
   - A `WORKER_STARTED` event arrives with worker metadata, OR
   - The authoritative run snapshot (`GET /api/v1/runs/:id`) returns a task with an explicit worker mapping.
3. If an active run has multiple ready tasks and only 1 worker, only the task in active execution moves to the worker desk; remaining tasks stay at the planning table.
