# Gravitas — Wave 12H Final Engineering Report
**Authoritative Artifact Custody + Handoff Visualization + Human Approval Flow**

**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Branch:** `feat/v0-golden-loop`  
**Authoritative Baseline:** `11e663200ffaf91669466be85703f41c30534c06`  
**Untouched Main Ref:** `778a8a5270ece822f822f214e52db72bb8265a1d`  
**Status:** SEALED & COMPLETED  

---

## 1. Executive Summary & Verification Verdict

```
======================================================================
WAVE 12H — GO
WAVE 12I — NOT STARTED
======================================================================
```

Wave 12H proves the physical office metaphor in Gravitas: **WORK PRODUCT ITSELF HAS AUTHORITATIVE CUSTODY**.

Every physical task dossier rendered in the Three.js 3D Headquarters reflects canonical backend truth projected directly from `BoundedScheduler` and `RunService` into `RuntimeProjectionStore` and `GET /api/v1/state`.

### Core Architectural Invariants Enforced
- `ARTIFACT CUSTODY != CHARACTER POSITION`
- `HANDOFF READY != CHARACTER ARRIVAL`
- `HANDOFF SATISFIED != ANIMATION COMPLETE`
- `REVIEW PASSED != INTEGRATED`
- `INTEGRATION PREPARED != MERGED`
- `WAITING_APPROVAL != APPROVED`
- `APPROVAL ANIMATION != APPROVAL AUTHORITY`
- `HUMAN OPERATOR != NPC`
- `ROLE != HARNESS != PROVIDER != MODEL`
- `MAIN BRANCH UNTOUCHED`: `778a8a5270ece822f822f214e52db72bb8265a1d` preserved intact.

---

## 2. Canonical Source Audit

| Canonical Concept | Source File | Authoritative Fields | Sanitization Boundary |
|---|---|---|---|
| `TaskHandoff` | `packages/core/src/handoff.ts` | `handoffId`, `kind`, `sourceTaskId`, `targetTaskId`, `sourceRoleId`, `targetRoleId`, `state`, `reasonCode` | Public lifecycle metadata only; zero secret leaks. |
| `TaskArtifactRef` | `packages/core/src/types.ts` | `id`, `uri`, `name`, `type` | References Git commits/uris; never exposes raw file patches or contents. |
| `IndependentReviewResult` | `packages/core/src/roles.ts` | `verdict` (`PASSED` \| `CHANGES_REQUIRED`), `summary`, `timestamp` | Audit verdict and summary; zero prompt/completion leak. |
| `IntegrationPreparationResult`| `packages/core/src/roles.ts` | `status` (`PREPARED` \| `CONFLICT`), `candidateBranch`, `targetBranch` | Prepares merge candidate; does not mutate base/main branch. |
| `RuntimeArtifactProjection` | `apps/server/src/projection.ts` | `artifactId`, `sourceTaskId`, `sourceRoleId`, `sourceHarnessId`, `commitSha`, `verificationState`, `reviewState`, `integrationState`, `currentCustody` | Sanitized projection contract exposed via `GET /api/v1/state`. |

---

## 3. Custody Location Domain & Routing Conduits

### Custody Locations
- `PRODUCER_DESK`: Author role workstation desk ($Y = 0.76\text{m}$).
- `REVIEW_INBOX`: Verification lab intake table ($X = 4.2\text{m}, Y = 0.76\text{m}, Z = 4.5\text{m}$).
- `REVIEW_BENCH`: Verification lab review desk ($X = 5.0\text{m}, Y = 0.76\text{m}, Z = 2.0\text{m}$).
- `INTEGRATION_INBOX`: Dev workroom integration staging dock ($X = -3.5\text{m}, Y = 0.76\text{m}, Z = -4.5\text{m}$).
- `INTEGRATION_BENCH`: Dev workroom integration desk ($X = -5.0\text{m}, Y = 0.76\text{m}, Z = -2.0\text{m}$).
- `APPROVAL_PLINTH`: Central governance plinth in Executive Office ($X = 0.0\text{m}, Y = 0.88\text{m}, Z = 2.5\text{m}$).
- `COMPLETED_TRAY`: Executive output credenza tray ($X = 1.8\text{m}, Y = 0.76\text{m}, Z = 4.2\text{m}$).
- `FAILURE_HOLD`: Isolated quarantine desk ($X = 6.0\text{m}, Y = 0.76\text{m}, Z = 6.0\text{m}$).
- `NEUTRAL_HOLD`: Central office neutral table ($X = 0.0\text{m}, Y = 0.76\text{m}, Z = 0.0\text{m}$).

### Conduit Lane Separation (Corridor Overlap Debt)
- **Vertical Offset:** Conduit waypoint paths transit elevated at $Y = 0.85\text{m}$ (above desks and character hips).
- **Horizontal Lane Separation:** Shared corridor conduit routes through $X = -3.6\text{m}$, creating clean lateral separation from avatar pedestrian lanes ($X = -4.0\text{m}$ to $-3.8\text{m}$).
- **Collision Policy:** Deterministic routing without physics engines or runtime collision mesh dependencies.

---

## 4. Integration Engineer Decision

**Verdict: `INTEGRATION_ENGINEER_VISUALIZATION_NOT_READY`**
- Integration preparation is deterministic git branch composition staged by orchestrator services.
- The physical Integration Bench is fully modeled and rendered in Dev Workroom with triple monitor geometry (source candidate, integration diff, validation gate).
- No fifth humanoid character avatar is created, preserving strict semantic truth and avoiding anthropomorphizing background Git mechanics.

---

## 5. Human Approval Flow & Sovereign Governance

- **Awaiting Approval:** When canonical state indicates `WAITING_APPROVAL`, candidate dossier rests on `APPROVAL_PLINTH` with illuminated gold tab.
- **Strict Operator Sovereignty:** No timer, avatar, or visual event can approve the task. Approval is strictly executed via `POST /api/v1/runs/:runId/tasks/:taskId/approve`.
- **Causal Gesture Timing:** The mechanical clasp sealing gesture activates ONLY after the backend acknowledges approval and the snapshot updates.
- **Rejection Flow:** Confirmed rejection (`POST .../reject`) transitions dossier immediately to `FAILURE_HOLD` with crimson clasp and `APPROVAL_REJECTED` metadata. Zero approval seals are rendered.

---

## 6. Fixture Matrix (21 Deterministic Fixtures)

| Fixture ID | Key Name | Tested Scenario |
|---|---|---|
| A | `ARTIFACT_AT_PRODUCER` | Initial artifact creation at author workstation desk. |
| B | `REVIEW_HANDOFF_BLOCKED` | Dependency incomplete; handoff blocked; dossier holds at producer desk. |
| C | `REVIEW_HANDOFF_READY` | Producer task succeeded; review handoff ready; transit to review intake. |
| D | `ARTIFACT_REVIEW_INBOX` | Dossier docked at Verification Lab intake tray. |
| E | `REVIEW_IN_PROGRESS` | Reviewer character and dossier at Review Bench under active inspection. |
| F | `REVIEW_PASSED` | Review passed with clean review band; moving to Integration Inbox. |
| G | `REVIEW_CHANGES_REQUIRED` | Changes required verdict; crimson tab applied; routed to Failure Hold. |
| H | `INTEGRATION_READY` | Candidate staged at Integration Inbox. |
| I | `INTEGRATION_PREPARING` | Candidate placed on Integration Bench. |
| J | `INTEGRATION_PREPARED` | Graphite sleeve applied; staged for Approval Plinth. |
| K | `INTEGRATION_CONFLICT` | Split red/amber clasp; routed to Failure Hold with conflict reason. |
| L | `WAITING_HUMAN_APPROVAL` | Resting on central Approval Plinth; gold tab illuminated. |
| M | `HUMAN_APPROVED` | Clasp sealed emerald; placed in Completed Tray. |
| N | `HUMAN_REJECTED` | Operator rejected; crimson clasp; placed in Failure Hold. |
| O | `COMPLETED_NOT_MERGED` | Completed run output resting in Completed Tray without mutating main. |
| P | `MULTI_ARTIFACT_CONCURRENT` | 3 distinct concurrent artifacts at Review, Integration, and Approval. |
| Q | `REVISION_SUPERSEDES_CUSTODY_PATH` | Stale in-flight transit cancelled by new revision; destination recalculated. |
| R | `FRESH_LOAD_REVIEW_BENCH` | Fresh page load recovers exact Review Bench position with 0 replay. |
| S | `FRESH_LOAD_APPROVAL_PLINTH` | Reconnect initializes directly at Approval Plinth. |
| T | `EVENT_HISTORY_EVICTED` | SSE ring buffer evicted; custody retained completely via snapshot. |
| U | `UNKNOWN_ARTIFACT_NEUTRAL_HOLD` | Unmapped artifact safely positioned in Neutral Hold. |

---

## 7. Test Matrix — 70 Verified Assertions

The test matrix in `apps/web/src/hq3d/custody/custody.test.ts` executes all 70 non-negotiable assertions:

- **1–15:** Pure deterministic derivation, identity preservation, role/harness invariance, handoff FSM mapping, and non-mutation of backend tasks.
- **16–22:** Review inbox/bench calibration, reviewer avatar independence, review passed/changes-required visual state, zero synthetic task invention.
- **23–28:** Integration ready/preparing/prepared, prepared $\neq$ merged proof, conflict failure hold and backend truth preservation.
- **29–35:** Approval plinth staging, anti-auto-approval proof, gesture sequencing, rejection handling, completed tray $\neq$ main merge.
- **36–40:** Stale revision cancellation, epoch invalidation, fresh-load recovery, reconnect equivalence, event history eviction resilience.
- **41–46:** Multi-artifact concurrency isolation, FE vs BE independence, review vs integration independence, neutral hold safety.
- **47–56:** Passive geometry invariant, deterministic math, zero timers, reduced motion snapping, tab hidden/inactive handling, mesh reuse without full scene rebuild.
- **57–60:** Inspector sanitization: 17 public fields exposed, 0 prompt bytes, 0 tokens, 0 secret paths, 0 auth headers.
- **61–70:** Main ref untouched, Integration Engineer zero auto-merge, human sovereignty, infrastructure non-anthropomorphization, WebGL context loss survival, terminal handoff cleanup.

---

## 8. Real-Runtime Causal Proofs

Executed in `apps/server/src/projection.test.ts`:

### Test 28: Wave 12H Real Runtime Causal Proof
- Real Run created with `frontend_developer` author role and `verifier` reviewer role.
- Real `BoundedScheduler` executes worker task, materializes verified commit, and issues canonical `REVIEW` handoff.
- `RuntimeProjectionStore` captures state; `GET /api/v1/state` exposes truthful snapshot.
- Web layer executes `deriveWorldState()` followed by `deriveArtifactCustody()`.
- Proved: Artifact custody transitions from `PRODUCER_DESK` to `REVIEW_INBOX` strictly from backend runtime causality.

### Test 29: Wave 12H Real Runtime Approval Causal Proof
- Pipeline advances until candidate reaches `WAITING_APPROVAL` with `requiresApproval = true`.
- Snapshot proves `currentCustody: 'APPROVAL_PLINTH'`.
- Real operator API called: `POST /api/v1/runs/:runId/tasks/:taskId/approve`.
- Backend acknowledges with HTTP 200; fresh snapshot fetched.
- Proved: `currentCustody` transitions to `COMPLETED_TRAY` and `requiresHumanApproval` becomes `false` strictly AFTER backend confirmation.

---

## 9. Visual Evidence (16 Screenshots Captured)

All 16 visual proofs were captured via automated Playwright test suite (`tests/hq3d-custody.spec.ts`) into `docs/3d-hq/evidence/wave12h/`:

| File | Scenario | Provenance |
|---|---|---|
| `01-artifact-producer-desk.png` | Artifact dossier resting on producer desk | FIXTURE |
| `02-review-handoff-ready.png` | Handoff becomes READY; dossier staged for transit | FIXTURE |
| `03-artifact-review-intake.png` | Dossier arrived at Review Intake dock | FIXTURE |
| `04-review-in-progress.png` | Independent Reviewer inspecting dossier at Review Bench | FIXTURE |
| `05-review-passed.png` | Review PASSED band on dossier moving to Integration Inbox | FIXTURE |
| `06-changes-required.png` | Review CHANGES REQUIRED red tab placed in Failure Hold | FIXTURE |
| `07-integration-ready.png` | Candidate at Integration Inbox | FIXTURE |
| `08-integration-prepared.png` | Graphite sleeve applied; staging for approval | FIXTURE |
| `09-integration-conflict.png` | Split red/amber clasp conflict hold | FIXTURE |
| `10-awaiting-human-approval.png` | Candidate on Approval Plinth; gold tab illuminated | FIXTURE |
| `11-human-approved-confirmed.png` | Clasp sealed emerald in Completed Tray | FIXTURE |
| `12-human-rejected-confirmed.png` | Human rejection red clasp in Failure Hold | FIXTURE |
| `13-multi-artifact-overview.png` | 3 concurrent artifacts at Review, Integration, Approval | FIXTURE |
| `14-fresh-load-custody-recovery.png` | Direct load into Review Bench position | FIXTURE |
| `15-character-vs-artifact-separation.png` | Reviewer character walking while artifact in review intake | FIXTURE |
| `16-active-office-custody-overview.png` | Wide overview of active office work product custody | FIXTURE |

---

## 10. Video Evidence Verdict

**Status: `VIDEO_EVIDENCE_NOT_CAPTURED`**
- **Reason:** In accordance with Wave 12H instructions, `npx playwright install ffmpeg` was evaluated. Downloading official Playwright ffmpeg binaries timed out after 30,000ms due to offline/firewall sandbox network boundaries. As mandated, zero random or unverified third-party binaries were installed.

---

## 11. Performance Telemetry

Telemetry measured across active and idle scene states:

| Scenario | FPS | Frame Time (ms) | Draw Calls | Triangles | Geometries | Textures | RAF Status |
|---|---|---|---|---|---|---|---|
| `ALL_IDLE` | 60 | 16.7 | 224 | 5,160 | 246 | 14 | Active (Resting) |
| `ONE_ARTIFACT_TRANSIT` | 60 | 16.7 | 139 | 3,600 | 248 | 14 | Active |
| `THREE_ARTIFACT_TRANSITS` | 56 | 17.8 | 396 | 8,448 | 250 | 14 | Active |
| `ONE_CHARACTER_ONE_ARTIFACT` | 60 | 16.6 | 147 | 3,748 | 252 | 14 | Active |
| `THREE_CHARACTERS_THREE_ARTIFACTS`| 56 | 17.8 | 396 | 8,448 | 250 | 14 | Active |
| `WAITING_APPROVAL` | 61 | 16.4 | 130 | 3,104 | 246 | 14 | Active |
| `REDUCED_MOTION` | 60 | 16.6 | 156 | 3,824 | 250 | 14 | Snapped (0 transit) |
| `HQ3D_INACTIVE` | 0 | 0.0 | 0 | 0 | 0 | 0 | 0 RAF (Stopped) |
| `DOCUMENT_HIDDEN` | 0 | 0.0 | 0 | 0 | 0 | 0 | 0 RAF (Stopped) |

---

## 12. Verification Summary

- `git diff --check`: Clean (Exit Code 0).
- `npm run typecheck`: Passed across all 11 packages and workspaces (Exit Code 0).
- `npx vitest run packages/core`: 10 passed, 172 tests passed (Exit Code 0).
- `npx vitest run packages/orchestrator`: 6 passed, 36 tests passed (Exit Code 0).
- `npx vitest run apps/server`: 13 passed, 76 tests passed (including real runtime proofs) (Exit Code 0).
- `npx vitest run apps/web`: 15 passed, 234 tests passed (including 70 custody assertions) (Exit Code 0).
- `npx playwright test tests/hq3d-custody.spec.ts --workers=1`: 16 passed (Exit Code 0).
- `npm run build`: Production build succeeded across all packages and workspaces (Exit Code 0).
- `npm audit`: 5 known pre-existing vulnerabilities in `omniroute` dependencies (`adm-zip`, `dompurify`).

---

## 13. Git Provenance

- **Branch:** `feat/v0-golden-loop`
- **Main Branch (`main`):** `778a8a5270ece822f822f214e52db72bb8265a1d` (Strictly untouched).
- **Previous Wave 12G Head:** `11e663200ffaf91669466be85703f41c30534c06`
