# Gravitas Master Implementation Roadmap: Waves 12C.5 to 20 (Wave 12G)

> **CORE CONCEPTUAL INVARIANTS**:
> - **LOCOMOTION != EXECUTION**: Character locomotion does not execute tasks, compile code, or invoke gateways.
> - **ARRIVAL != HANDOFF SATISFACTION**: Character arrival at a workstation or console does not satisfy or advance handoffs.
> - **CHARACTER POSITION != ARTIFACT CUSTODY**: Avatar coordinates are decoupled from artifact dossier custody.
> - **ANIMATION != TASK STATE**: An animation starting, stopping, hitching, or failing cannot mutate task FSM state.
> - **CAMERA != AUTHORITY**: Viewport framing presets have no semantic authority over task execution.
> - **HUMAN OPERATOR != NPC**: There is strictly NO humanoid NPC avatar impersonating the sovereign human operator.
> - **ROLE != HARNESS**: Characters represent organizational roles (`Frontend Engineer`, `Backend Engineer`, `Independent Reviewer`, `Chief Planner`), never execution harnesses (`codex-worker`, `fcc-worker`), providers, or models.

---

## 1. Master Execution Sequence

```
Wave 12C.5: Architecture Freeze (CLOSED)
     │
     ▼
Wave 12D:   Minimal Role-Based Character Foundation (4 Roles) (CLOSED in 12D-R)
     │
     ▼
Wave 12E:   Canonical Role Runtime Contract & Deterministic Resolver (CLOSED)
     │
     ▼
Wave 12F:   Canonical Multi-Agent Handoffs & Integration Pipeline (CLOSED)
     │
     ▼
Wave 12F-R: Production Handoff Projection Closure (CLOSED)
     │
     ▼
Wave 12G:   Authoritative Role Locomotion & Spatial Reconciliation (CLOSED)
     │
     ▼
Wave 12H:   Authoritative Artifact Custody + Handoff Visualization + Human Approval Flow (CLOSED)
     │
     ▼
Wave 12I:   Personal OS Operations Foundation (CLOSED in 12I-R)
     │
     ▼
Wave 12I-R: Personal OS Execution Kernel Forensic Closure (SEALED)
     │
     ▼
Wave 12J:   Connector Kernel + Calendar Operations Foundation (SEALED — GO)
     │
     ▼
Wave 12K:   Unified Inbox & Notification Dispatch (NOT STARTED)
     │
     ▼
Wave 13:    Background Job Logistics & Courier Pipeline
     │
     ▼
Wave 14:    Connector SDK & Bounded External Platforms
     │
     ▼
Wave 15:    Multi-Class Memory & Knowledge Learning Store
     │
     ▼
Wave 16:    Personal Operations & Daily Rhythm Engine
     │
     ▼
Wave 17:    Business Operations & Algoryxz Pipeline
     │
     ▼
Wave 18:    Mobile Companion Control Surface
     │
     ▼
Wave 19+:   Strategic Opportunity & Cross-Domain Synthesis
```

---

## 2. Detailed Wave Specifications

### Wave 12G: Authoritative Role Locomotion & Spatial Reconciliation (SEALED)
- **Goal:** Turn authoritative backend role, task, and handoff state into deterministic spatial intent and presentation-only visual locomotion in the 3D Headquarters.
- **Achievements:**
  - Pure, deterministic `spatialIntent.ts` presentation module.
  - 24-waypoint navigation graph with explicit clearances, airlock boundary, and mezzanine stairs.
  - Deterministic A* pathfinding with lexicographical tie-breaking.
  - `CharacterMotionController` with presentation FSM (`IDLE`, `STAND_UP`, `WALK`, `ARRIVE`, `FOCUSED`, `REVIEWING`, `RETURNING`, `SIT_DOWN`).
  - Procedural walk cycle (1.25–1.45 units/sec) on articulated figures.
  - Stale revision cancellation and fresh load without historical transit replay.
  - Reduced-motion mode snapping.
  - 18 deterministic fixtures (A through R) and 60 explicit unit tests.
  - Real runtime causal proof (`W12G-1`) verifying scheduler $\rightarrow$ projection $\rightarrow$ web spatial intent.
  - 14 visual screenshots captured in `docs/3d-hq/evidence/wave12g/`.
- **Status:** **WAVE 12G — GO** | **WAVE 12H — CLOSED**.

### Wave 12H: Authoritative Artifact Custody + Handoff Visualization + Human Approval Flow (SEALED)
- **Goal:** Work product itself has tangible custody in the 3D Headquarters, truthfully reflecting verification, independent review, branch integration, and sovereign human approval.
- **Achievements:**
  - Extended `RuntimeArtifactProjection` exposed over `GET /api/v1/state`.
  - Pure, deterministic `deriveArtifactCustody` and `deriveArtifactVisualIntents`.
  - Physical dossier mesh (`PhysicalDossierMesh`) with bond paper, brass clasp, verification seals, and approval tabs.
  - 9 authoritative custody locations and elevated conduit routes with deterministic corridor lane offsets.
  - Sovereign Approval Plinth governance with causal backend-acknowledged mechanical clasp gesture.
  - Complete 21-fixture matrix (A through U) and 70 passing assertions in `custody.test.ts`.
  - Real runtime causal proofs 28 and 29 passing in `projection.test.ts`.
  - 16 visual evidence screenshots in `docs/3d-hq/evidence/wave12h/`.
- **Status:** **WAVE 12H — GO** | **WAVE 12I — CLOSED**.

### Wave 12I & 12I-R: Personal OS Operations Foundation & Kernel Forensic Closure (SEALED)
- **Goal:** Establish production SQLite background job store, clock abstraction, execution runner, deterministic scheduler, notification bus, and comprehensive UI automations console.
- **Achievements:**
  - WAL-mode SQLite job store with state machine validation and execution history.
  - Deterministic triggers (`INTERVAL`, `CRON`, `MANUAL`).
  - Action executor with path jailed actions (`FILE_STAT`, `REPO_CHECK`, `NOTIFY`, `NOOP`).
  - Complete notification bus with deduplication window and multi-channel readiness.
  - Sovereign human approval plinth for high-risk actions.
  - Forensic closure passing 100% of unit, server, and Playwright suites.
- **Status:** **WAVE 12I-R — GO** | **WAVE 12J — CLOSED**.

### Wave 12J: Connector Kernel + Calendar Operations Foundation (SEALED)
- **Goal:** Build the first production external-service capability layer for Gravitas, proved exclusively through the Calendar domain.
- **Achievements:**
  - Reusable least-privilege capability transport architecture (`ConnectorRegistry`, `ConnectorAdapter`).
  - Credential boundary with in-memory vault (`CredentialBroker`), opaque handles, and automatic token refresh.
  - SQLite connector store with versioned migrations for accounts, audit logs, and sync state.
  - Google Calendar adapter (native fetch REST v3) + multi-timezone deterministic Mock provider.
  - Background calendar automation jobs (`Morning Agenda Summary`, `Calendar Event Reminder`, `Calendar Conflict Detection`) using `CONNECTOR_READ`.
  - Glassmorphic Web UI: Connected capabilities overview, accounts list, capability table, health check, modal provisioning, and sanitized audit trail drawer.
  - Interactive Calendar Operations view with multi-calendar switcher, filters (`ALL`, `TODAY`, `UPCOMING`), event timeline, and inspector panel.
  - 3D HQ Station 5 (Server Bay) external capability hardware rack LED and activity telemetry.
  - 8 authoritative visual evidence screenshots captured in `docs/personal-os/evidence/wave12j/`.
  - Full regression pass: `git diff --check`, `npm run typecheck`, `npm run build`, `npx vitest run --fileParallelism=false` (1013 tests passed), `npx playwright test tests/connectors-calendar.spec.ts --workers=1` (8 passed).
- **Status:** **WAVE 12J — GO** | **WAVE 12K — NOT STARTED**.
