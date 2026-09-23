# Gravitas Observability & Audit Trail Architecture (Wave 12G)

> **CORE CONCEPTUAL INVARIANTS**:
> - **LOCOMOTION != EXECUTION**: Character locomotion does not execute tasks, compile code, or invoke gateways.
> - **ARRIVAL != HANDOFF SATISFACTION**: Character arrival at a workstation or console does not satisfy or advance handoffs.
> - **CHARACTER POSITION != ARTIFACT CUSTODY**: Avatar coordinates are decoupled from artifact dossier custody.
> - **ANIMATION != TASK STATE**: An animation starting, stopping, hitching, or failing cannot mutate task FSM state.
> - **CAMERA != AUTHORITY**: Viewport framing presets have no semantic authority over task execution.
> - **HUMAN OPERATOR != NPC**: There is strictly NO humanoid NPC avatar impersonating the sovereign human operator.
> - **ROLE != HARNESS**: Characters represent organizational roles (`Frontend Engineer`, `Backend Engineer`, `Independent Reviewer`, `Chief Planner`), never execution harnesses (`codex-worker`, `fcc-worker`), providers, or models.

---

## 1. Traceability Principles

In Gravitas, every action, decision, mutation, and token expenditure across the Personal OS is deterministically linked through a correlated **Audit Graph**.

$$\text{Action Trace} = \text{Run} \rightarrow \text{Task} \rightarrow \text{Role} \rightarrow \text{Harness} \rightarrow \text{Gateway} \rightarrow \text{Provider} \rightarrow \text{Model} \rightarrow \text{Capabilities} \rightarrow \text{Verifier} \rightarrow \text{Approval}$$

### Core Invariants:
1. **End-to-End Correlation:** A single user-facing result can be traced back to the exact compiled prompt bytes, worker stdout stream, git commit SHA, and human approval timestamp.
2. **Strict Redaction Before Archival:** Diagnostic logs, stdout buffers, and evidence files are filtered to redact API keys and bearer tokens prior to persistence.
3. **Decoupled 3D Presentation Telemetry:** 3D viewport interactions expose sanitized spatial telemetry without leaking sensitive credentials or prompts.

---

## 2. Character Inspector Telemetry Contract (Wave 12G)

When clicking a character in the 3D Headquarters, the DOM Inspector presents sanitized, decoupled telemetry:

| Telemetry Field | Source | Description | Redaction Level |
| :--- | :--- | :--- | :--- |
| `ROLE` | `roleId` | Canonical organizational role | None (Public Domain) |
| `DEPARTMENT` | `department` | Organizational division (e.g. Engineering, Quality) | None (Public Domain) |
| `ROLE SOURCE` | `roleSource` | `CANONICAL` vs `LEGACY_COMPATIBILITY` | None (Public Domain) |
| `CURRENT TASK` | `activeTaskId` | Authoritative task identifier | None |
| `TASK STATE` | `canonicalState` | Backend TaskState (`READY`, `RUNNING`, `VERIFYING`, etc.) | None |
| `RUNTIME PHASE` | `runtimePhase` | Engine phase (`PREPARING`, `WORKER_RUNNING`, etc.) | None |
| `SPATIAL STATE` | `spatialState` | Presentation locomotion state (`AT_ASSIGNMENT`, etc.) | None |
| `CURRENT STATION` | `stationId` | Current physical/canonical station | None |
| `DESTINATION STATION` | `destinationStationId` | Target transit station | None |
| `ACTIVE HANDOFF` | `handoffId` | Linked task handoff identifier | None |
| `HANDOFF STATE` | `handoffState` | `BLOCKED`, `READY`, `IN_PROGRESS`, `SATISFIED` | None |
| `HARNESS` | `harnessId` | Bound execution harness (`codex-worker`, `fcc-worker`) | None |
| `TRANSPORT` | `transport` | `DIRECT` vs `OMNIROUTE_HTTP` | None |
| `GATEWAY` | `gateway` | OmniRoute gateway instance | None |
| `PROJECTION EPOCH` | `projectionEpoch` | Authoritative projection snapshot epoch | None |
| `PROJECTION REVISION` | `projectionRevision` | Monotonic snapshot sequence number | None |

**NEVER EXPOSED**: Raw prompts, token signatures, auth tokens, API keys, filesystem secrets, or environment variables.

---

## 3. Artifact Inspector Telemetry Contract (Wave 12H)

Clicking a physical work product dossier in the 3D Headquarters reveals sanitized, decoupled custody metadata:

| Telemetry Field | Source | Description |
| :--- | :--- | :--- |
| `ARTIFACT ID` | `artifactId` | Authoritative artifact identifier |
| `SOURCE TASK` | `taskId` | Producing task ID |
| `SOURCE ROLE` | `sourceRoleId` | Canonical producing role (`frontend_developer`, etc.) |
| `SOURCE HARNESS` | `sourceHarnessId` | Producing harness ID |
| `TARGET ROLE` | `targetRoleId` | Intended receiving role (`independent_reviewer`, etc.) |
| `HANDOFF ID` | `handoffId` | Linked canonical handoff ID |
| `HANDOFF KIND` | `handoffKind` | `DEPENDENCY`, `REVIEW`, `INTEGRATION`, `VERIFICATION`, `APPROVAL` |
| `HANDOFF STATE` | `handoffState` | `BLOCKED`, `READY`, `IN_PROGRESS`, `SATISFIED`, `FAILED` |
| `REASON CODE` | `reasonCode` | Canonical reason code if failed/blocked |
| `VERIFICATION STATE` | `verificationState` | `UNVERIFIED`, `VERIFYING`, `VERIFIED`, `FAILED` |
| `REVIEW STATE` | `reviewState` | `NOT_REQUIRED`, `PENDING`, `IN_REVIEW`, `PASSED`, `CHANGES_REQUIRED` |
| `INTEGRATION STATE` | `integrationState` | `NOT_READY`, `READY`, `PREPARING`, `PREPARED`, `CONFLICT`, `INTEGRATED` |
| `CUSTODY LOCATION` | `custodyLocation` | `PRODUCER_DESK`, `REVIEW_INBOX`, `REVIEW_BENCH`, `APPROVAL_PLINTH`, etc. |
| `COMMIT SHA` | `commitSha` | Sanitized git commit hash |
| `REQUIRES HUMAN APPROVAL` | `requiresHumanApproval` | `YES` / `NO` sovereign gate status |
| `PROJECTION EPOCH` | `projectionEpoch` | Snapshot epoch identifier |
| `PROJECTION REVISION` | `projectionRevision` | Snapshot monotonic revision |

**NEVER EXPOSED**: Raw prompts, completion strings, patch bodies, auth headers, secret paths, or environment variables.
