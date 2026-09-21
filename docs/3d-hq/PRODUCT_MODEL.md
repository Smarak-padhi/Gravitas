# GRAVITAS 3D HEADQUARTERS — PRODUCT MODEL
## Operational Mental Model & Spatial Mechanics

> **PRODUCT VISION**: GRAVITAS is a spatial, living multi-agent headquarters where human operators observe and govern autonomous software development in real-time.  
> **CORE AXIOM**: The 3D world is a physical projection of authoritative runtime state. It never simulates fake work for cosmetic flair.  
> **AESTHETIC ARCHETYPE**: Modern Architectural Miniature — precise, tactile, quietly futuristic (NOT steampunk).

---

## 1. Operational Philosophy & Metaphor

Conventional AI developer tools present agentic execution as an endless, scrolling chat log or a flat dashboard of progress bars. This mental model fails when managing teams of concurrent autonomous agents with interdependent tasks, isolated git worktrees, deterministic verifiers, and human governance gates.

GRAVITAS replaces the chat log with a **tactile, physical operations environment**:
- An engineering organization is physically spatial. Work originates from a plan, gets assigned to specialized workers, executes at dedicated workstations, passes to an independent verification cleanroom, undergoes automated browser testing, and halts at an elevated human approval desk before touching production code.
- By viewing the physical headquarters, an operator immediately grasps:
  - **Who is working on what** (which worker is seated at which desk).
  - **Where bottlenecks reside** (which tasks are waiting on upstream dependencies).
  - **What evidence is being verified** (physical packets being inspected in the cleanroom).
  - **Where human governance is needed** (an illuminated packet waiting on the approval mezzanine).

---

## 2. Spatial Entities & Functional Roles

Every entity in the 3D Headquarters maps directly to an authoritative architectural concept in `@gravitas/core`:

| Spatial Entity | Runtime Concept | Physical Representation in 3D HQ | Inviolable Behavioral Constraint |
| :--- | :--- | :--- | :--- |
| **Worker Inhabitants** | Agent Harnesses (`Codex`, `FCC`, `Astra`) | Stylized miniature architectural figures with distinct silhouettes and workshop attire. | Characters only execute work animations when an authoritative task is `RUNNING`. When idle, they remain at rest. |
| **Workstations** | Agent Execution Contexts | Physical desks with drafting consoles, monitors, and tool racks. | Workstations glow subtly according to the active worker's state; power down to low ambient when empty. |
| **Work Packets** | Tasks & Execution Contracts (`Task`, `ExecutionContract`) | Physical, glowing vellum folios / digital data tablets resting on desks or transiting between stations. | Packets only exist when an authoritative task exists in the DAG. The packet's bezel glow matches the task state. |
| **Transit Conduits** | Task Dependencies & Routing (`TaskDependency`) | Clean recessed optical guide channels flush with floor and desks. | Physical packets glide along channels only when tasks dispatch or hand off. |
| **Verification Cleanroom** | Independent Verifier (`@gravitas/verifier`) | Enclosed glass laboratory with digital diff inspection console and isolated worktree monitors. | Physically segregated from worker desks. The verifier character never writes code; its activity is 100% verifier-state driven. |
| **Browser QA Bench** | Deterministic Browser QA (`@gravitas/browser-qa`) | Device matrix station equipped with multiple glowing phone/tablet/desktop screens displaying simulated DOM states. | Executes test sequences sequentially; flashes emerald on pass or red on assertion failure. |
| **Infrastructure Room** | Inference Gateways & Providers (`OmniRoute`, Models) | Heavy brushed-steel server rack cabinets with flickering patch cables, cooling fans, and model status indicators. | **CRITICAL**: OmniRoute and LLM providers are strictly INFRASTRUCTURE. They are NEVER represented as humanoid characters. |
| **Approval Control** | Human Governance Gate (`WAITING_APPROVAL`) | Elevated teak-and-brass command station with an illuminated review plinth. | **THE USER IS THE OPERATOR**. No synthetic character sits here. Tasks requiring human sign-off physically dock on this plinth awaiting the user's action in the 2D inspector. |
| **Mission Planning Table** | Run DAG & Goal Decomposition (`Run`, `RunPlan`) | Large central architectural drafting table where the initial goal decomposes into physical task nodes. | Unassigned and planned tasks reside here in queue trays before routing to worker stations. |

---

## 3. The Spatial Golden Loop

The lifecycle of a code mutation through the Gravitas system follows a strict spatial trajectory:

```mermaid
sequenceDiagram
    autonumber
    actor Human as Human Operator (Real User)
    participant MC as Mission Control (Planning Table)
    participant Worker as Agent Operations (Codex Desk)
    participant Verifier as Verification Lab (Cleanroom)
    participant BQA as Browser QA Bench
    participant Approval as Approval Control (Mezzanine Plinth)
    participant Repo as Base Repository (Repository Vault)

    Human->>MC: Submit Goal & Execution Contract via 2D Composer
    Note over MC: Contract materializes as blueprint folio on table
    Note over MC: TASK_READY -> Task enqueued in Ready tray (No worker assigned yet)
    MC->>Worker: TASK_SCHEDULED / WORKER_STARTED -> Folio transits along conduit
    Note over Worker: Codex sits, accepts packet, enters WORKING state
    Worker->>Worker: Real execution in isolated git worktree
    Worker->>Verifier: WORKER_FINISHED -> Folio moves along conduit to Cleanroom
    Note over Verifier: Independent Verifier audits diff & runs test suite
    opt Requires Browser QA
        Verifier->>BQA: BROWSER_QA_STARTED -> Device matrix screens illuminate
        BQA->>Verifier: BROWSER_QA_COMPLETED (Pass confirmed)
    end
    Note over Verifier: Verification succeeds (VERIFICATION_FINISHED)
    Verifier->>Approval: WAITING_APPROVAL -> Folio ascends lift to Mezzanine Plinth
    Note over Approval: Amber spotlight activates; awaits real human operator
    Human->>Approval: Human approves via 2D Task Inspector
    Approval->>Repo: TASK_APPROVED -> Verified commit routes to repository vault
    Note over Repo: Git commit materialized into base branch
```

### Physical Manifestation at Each Step:
1. **Goal Submission**:
   - The user creates a run in 2D.
   - In 3D: An architectural blueprint folio materializes on the **Mission Planning Table**.
2. **Decomposition & Ready Queue**:
   - The DAG decomposes into individual work packets resting in the Planning Table trays.
   - `TASK_READY` indicates prerequisites are satisfied: the task moves to the Planning Table's "Ready Tray", **without assigning or moving a worker**.
3. **Dispatch & Assignment (`TASK_SCHEDULED` / `WORKER_STARTED`)**:
   - When a concurrency slot opens and the scheduler dispatches the task, an optical transit conduit illuminates connecting the Planning Table to the assigned worker station (e.g., Codex).
   - The packet glides along the conduit to Codex's workstation.
   - Codex turns to the desk, sits down, and enters the `WORKING` animation.
4. **Active Execution**:
   - Codex character types and reviews console buffers while the real subprocess runs in an isolated worktree.
   - The desk blotter glows with subtle sapphire ambient light.
   - The docked 2D Task Inspector reflects live output chunks.
5. **Candidate Mutation Complete**:
   - Codex completes work (`WORKER_FINISHED`).
   - Codex pushes back from the desk and stands up; the work packet seals with a candidate clasp.
6. **Transit to Verification Lab**:
   - The packet glides along the cleanroom transit conduit into the **Verification Lab**.
   - It docks on the digital inspection console before the **Independent Verifier**.
7. **Deterministic Verification**:
   - The Verifier character assumes a focused audit pose.
   - Cleanroom status lights shift to cool clinical white (5000K).
   - If Browser QA is required, the packet routes to the adjacent **Device Matrix Wall**; viewports flash through test steps.
8. **Elevation to Human Approval**:
   - Verification passes (`VERIFICATION_FINISHED`).
   - The packet ascends via vertical lift to the **Approval Control Mezzanine**.
   - The packet rests on the **Approval Plinth** under a focused amber spotlight.
   - **No character stands here**. The human user sees the illuminated plinth in 3D and the active alert in the 2D Human Inbox.
9. **Human Decision**:
   - If **Approved**: The human clicks "Approve" in the 2D inspector. The 3D packet receives an embossed gold seal mark and smoothly glides into the Repository Vault transit slot (`TASK_RESULT_MATERIALIZED`).
   - If **Rejected**: The packet receives a red rejection mark and routes back down the return conduit to the planning table with error annotations.

---

## 4. Multi-Worker Handoff Mechanics

In multi-task runs (e.g., Task `T1` assigned to Codex, Task `T2` assigned to FCC, where `T2` depends on `T1`):
1. **Dependency Invariant**:
   - `T2` sits at the Planning Table in `BLOCKED` state.
   - A clean, semi-transparent orange optical tether connects `T1` (at Codex's station) to `T2`.
   - FCC remains in an `IDLE` state at Workstation 02, barred from executing.
2. **Authoritative Dependency Release**:
   - Only when `T1` reaches `APPROVED` or `SUCCEEDED` does the engine emit `TASK_READY` for `T2`.
   - The orange constraint tether dissolves cleanly.
   - `T2` moves to the Ready Tray; once scheduled, it dispatches along the conduit to FCC's desk.
   - FCC sits down and transitions to `WORKING`.

---

## 5. Failure States & System Degraded Modes

- **Worker Crash / Timeout**:
  - The worker desk monitor displays a red error indicator (`ERR_PROCESS_EXIT`).
  - The character steps back in alert standby.
  - The work packet remains at the desk with an amber-red hazard perimeter.
- **Independent Verification Failure**:
  - Cleanroom beacon flashes red; diff console flags rejected assertions.
  - The packet receives a red rejection marker and routes back to the planning table.
- **Provider / Gateway Fallback**:
  - In the Infrastructure Room, the OmniRoute rack relay LED toggles to the secondary provider position; amber bypass line illuminates.
  - The worker continues working uninterrupted.
- **SSE Disconnection**:
  - When connection is lost, scene lighting dims to standby; characters assume neutral poses; a clean status pill displays: `RECONNECTING TO ENGINE...`.

---

## 6. The Empty & Quiet World

When no runs are executing:
- The Headquarters remains calm, dignified, and architecturally coherent.
- Available workers sit or stand quietly at their stations in resting poses.
- Workstation task slots display a soft neutral `[STANDBY]` indicator.
- The Planning Table is clear, awaiting a new Goal.
- Zero fake work or wandering avatars occur. Readiness, not boredom.
