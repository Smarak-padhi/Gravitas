# GRAVITAS — Wave 12J-UX: Visual QA Report

**Date**: 2026-09-24
**Branch**: `feat/v0-golden-loop`
**HEAD**: `91a8cdc451127c0ae07709fb67059e127581504b`
**Scope**: 14 captured states — `docs/frontend/evidence/before/` vs `docs/frontend/evidence/after/`
**Auditor**: Automated visual QA pass (visual-qa-after.spec.ts) + forensic screenshot review

---

## 0. Governing Standard

Every surface in Gravitas is evaluated against **one truthful question**:

> *Does this feel like a sovereign human's Personal Operating System and Living Headquarters — or does it look like a developer debugging dashboard with more cards?*

Secondary invariants that must be visible in every screenshot:

| Invariant | How It Manifests |
|---|---|
| `ROLE != HARNESS != MODEL != CONNECTOR != ACCOUNT` | No humanoid connector icons; boundary invariant prose visible in Connectors |
| Truthful State Only | No fake "running" animations without SQLite-backed evidence |
| Connector Humanoids Prohibited | Connectors shown as machinery/transports, never agent personas |
| Zero Raw Token Leakage | OAuth flows show 4-step PKCE narrative, not raw token input fields |

---

## 1. Screenshot-by-Screenshot Critique

---

### State 01 — Primary Operations / HQ 3D Overview

**File**: `after/01-home-or-primary-operations.png`

| Dimension | Verdict | Notes |
|---|---|---|
| Visual Identity | PASS | Dark architectural backdrop; gold accent lines on building geometry are coherent with Gravitas premium palette |
| Typography | PASS | System font used throughout 3D HUD panel; monospace for control hints is legible and deliberate |
| Architectural Semantics | PASS | 6 rooms named and navigable via keyboard shortcut band — reinforces spatial HQ metaphor |
| Character Truthfulness | PASS | Geometric humanoids visible at idle stations; no fake-work animations confirmed (no visible typing/progress indicators) |
| Authority Surface | PASS | Roles panel lists Chief Planner, Frontend Engineer, Backend Engineer, Independent Reviewer with station IDs — sourced from authoritative DOM |
| Navigation Bar | PARTIAL | Flat 9-button TopBar is still a developer tab-strip. Information Architecture Tier grouping (Tier A/B/C/D) is documented but NOT yet implemented in the rendered bar |
| Responsive | N/A | Desktop only for this state; see States 13-14 |

**Regression from Before**: None. Before and after are identical for HQ 3D (correct — no HQ 3D changes were in scope for this wave beyond fixing TopBar click interception).

---

### State 02 — HQ Overview (Identical Camera)

**File**: `after/02-hq-overview.png`

Same camera position as State 01. Captured as a discrete state because the test fixture navigates fresh. Visual content is identical — no regression.

> **Note**: In a future pass, State 01 and State 02 could be merged or differentiated by orbiting the camera to a second angle (e.g., Zone 5 Server Bay close-up) to avoid duplicated evidence.

---

### State 03 — HQ Agent Operations Floor (Room 2)

**File**: `after/03-hq-agent-operations.png`

| Dimension | Verdict | Notes |
|---|---|---|
| Visual Identity | PASS | Dark/gold palette consistent |
| Character Truthfulness | PASS | Geometric humanoids at idle stations — no typing, no fake activity. IDLE law honoured |
| Room Navigation Band | PASS | Room 2 "Agent Operations Floor" tab is selected and highlighted |
| 3D Geometry | PASS | Desk geometry visible; workstations distinct from connectors |

---

### State 04 — HQ Server Bay (Zone 5)

**File**: `after/04-hq-server-bay.png`

| Dimension | Verdict | Notes |
|---|---|---|
| Connector Humanoids Prohibited | PASS | Server Bay rack geometry renders as machinery, not humanoid figures |
| Visual Identity | PASS | Consistent palette |

---

### State 05 — Calendar Operations

**File**: `after/05-calendar.png`

| Dimension | Verdict | Notes |
|---|---|---|
| Visual Identity | PASS | Dark surface, branded header "Calendar Operations" with semantic badges `DETERMINISTIC READ PLANE` and `[FIXTURE: calendar-mock]` |
| Header Typography | PASS | "Calendar Operations" title weight is strong; subtitle establishes zero-AI-loop provenance |
| Data Integrity | PASS | 4 events visible; ALL-DAY badge, confirmed status chips, UTC timezone, attendee counts, location fields populated from fixture |
| Boundary Prose | PASS | "Single source of schedule truth. Synchronized through connector kernel with zero AI inference loops." visible |
| Event Inspector Panel | PASS | Right-side "Event Inspector" panel renders in empty-selection state with correct prompt copy |
| Automation Cross-Link | PASS | "Autonomous Automation Recipes" sidebar card explains calendar-to-automation relationship |
| Filter Controls | PASS | All Events / Today / Upcoming filter pills and calendar selector dropdown visible |
| Navigation | PARTIAL | TopBar still flat 9-button strip (same as State 01 — systemic, not Calendar-specific) |
| Empty below-fold | MINOR | Large empty area below event list when calendar has only 4 events. A date-navigator would fill this with purpose. Deferred to future wave. |

---

### State 06 — Calendar Event Inspector (Event Selected)

**File**: `after/06-calendar-event-inspector.png`

| Dimension | Verdict | Notes |
|---|---|---|
| Inspector Detail | PASS | TITLE, TIMING & BOUNDARIES, LOCATION, ORGANIZER, EVENT ID all populated. Proof that normalized domain model carries full metadata |
| Boundary Proof | PASS | Blue security note: "Normalized Domain Model: Zero OAuth tokens or private transport leaks." is rendered in-panel |
| Calendar Context | PASS | "Primary Work Calendar" label shown in inspector header |
| Selected Event Highlight | PASS | "Quarterly Planning All-Hands" row is highlighted with a cyan left-border glow |
| AUTONOMOUS AUTOMATION RECIPES | PASS | Sidebar card persists on event selection, reinforcing automation cross-reference |

---

### State 07 — Connectors (Mock Connected, Google Calendar Unconfigured)

**File**: `after/07-connectors.png`

| Dimension | Verdict | Notes |
|---|---|---|
| Architectural Invariant Prose | PASS | "ROLE != HARNESS != PROVIDER/MODEL != CONNECTOR != EXTERNAL ACCOUNT" printed verbatim in page subtitle |
| Connector Cards | PASS | Two connector tiles with correct status badges: CONNECTED (green) for Mock, UNCONFIGURED (neutral) for Google Calendar |
| No Humanoid Connector Icons | PASS | Connector tiles show generic functional icons (lightning bolt, calendar), not humanoid personas |
| Authority Boundary Sidebar | PASS | "AUTHORITY & BOUNDARY INVARIANTS" panel lists ROLE != CONNECTOR, Zero Raw Token Leakage, No Speculative Access, Audit Trail Integrity |
| Connected Accounts Section | PASS | "Gravitas Primary Calendar" with opaque identity and last-sync timestamp — no raw tokens visible |
| Bounded Capabilities Table | PASS | Four capabilities listed; authority levels READ and SAFE_WRITE shown; calendar.event.create correctly marked Reserved (Future Wave) |
| Living HQ Integration Sidebar | PASS | "Connectors visualized in the 3D Living HQ as physical server machinery inside Server Bay (Zone 5), not humanoid characters." |
| WAVE badge | PASS | `WAVE 12J: CALENDAR FOUNDATION` badge confirms wave provenance |
| Navigation | PARTIAL | Flat TopBar (systemic) |

---

### State 08 — Connector Audit Trail (Drawer Open)

**File**: `after/08-connector-audit.png`

| Dimension | Verdict | Notes |
|---|---|---|
| Audit Trail Panel | PASS | Right-side drawer renders "Connector Audit Trail — Deterministic ledger of all capability invocations" |
| Audit Entries | PASS | 8+ chronological `EXECUTE — calendar-mock` entries visible; each records operation, subject, and record count |
| CONNECT Entry | PASS | `CONNECT — calendar-mock` at bottom of list proves connection event is also audited |
| Zero Speculation | PASS | All entries correspond to real calendar-mock invocations (fixture-seeded), not fabricated records |
| Close Control | PASS | X dismiss button visible in drawer header |

---

### State 09 — Automations (Default / No Active Runs)

**File**: `after/09-automations.png`

| Dimension | Verdict | Notes |
|---|---|---|
| Header Upgrade | PASS | "Personal OS Background Automations & Scheduler" — heading is semantic and descriptive. Lightning bolt icon renders before title |
| Subtitle | PASS | "Deterministic background execution kernel — Zero LLM daemons, complete SQLite restart survival." |
| Stats Row | PASS | JOBS: 3 / RUNNING: 0 / APPROVALS: 0 — accurate counts from SQLite projection |
| Jobs Table | PASS | Three configured jobs with Kind, Status (ENABLED), Trigger (cron/interval), Authority (L2 / READ), Next Run timestamp, and action buttons |
| Filter Tabs | PASS | ALL / ENABLED / PAUSED / CANCELLED filter row |
| Execution History | PASS | "No execution records in this view." — truthful empty state (no fake runs) |
| Before Comparison | IMPROVED | Before: header had no icon, extraneous Palette / Inbox / +New Run buttons crowded TopBar. After: cleaner header, correct icon, secondary action bar removed |
| Navigation | PARTIAL | Flat TopBar (systemic) |

---

### State 10 — Automations (Approval Required Highlighted)

**File**: `after/10-approval-required.png`

| Dimension | Verdict | Notes |
|---|---|---|
| Approval Filter Active | PASS | "Needs Approval (0)" tab is highlighted in amber/orange — correctly signals sovereign approval surface |
| State Truthfulness | PASS | 0 approval-pending runs at capture time — no fabricated WAITING items displayed |
| Approval Plinth Concept | PASS | Filter UI demonstrates the approval pathway exists and is a first-class citizen in the audit log |
| Visual Differentiation | PASS | The Needs Approval badge uses a distinct accent colour vs the neutral All Runs tab |

---

### State 11 — Automations (Empty / Cancelled Filter)

**File**: `after/11-empty-state.png`

| Dimension | Verdict | Notes |
|---|---|---|
| Empty State | PASS | "No background jobs found. Click '+ New Automation' above to schedule safe background execution." — instructive copy, not a blank void |
| CANCELLED Filter | PASS | CANCELLED tab is selected; jobs count correctly shows (0) |
| Composition | MINOR | Large empty lower half of screen. No illustration or ambient indicator. For a Personal OS this feels underweight — an ambient scheduler pulse would reinforce the execution kernel concept. Deferred to future wave. |

---

### State 12 — Error / Disconnected State (Google Calendar Unconfigured)

**File**: `after/12-error-or-disconnected-state.png`

| Dimension | Verdict | Notes |
|---|---|---|
| OAuth Boundary Correctness | PASS | "Google Calendar OAuth 2.0 Integration" panel displayed with UNCONFIGURED badge — no raw token input form rendered |
| OAuth Flow Narrative | PASS | 4-step PKCE flow listed: B1 Operator clicks connect -> B2 Google verifies scopes -> B3 Credential boundary encrypts tokens -> B4 Frontend receives opaque reference |
| Zero Token Exposure | PASS | "Raw access and refresh tokens are strictly prohibited from being manually entered into client forms." printed as explicit copy |
| Authorize Button Disabled | PASS | "Authorize Google Calendar (Requires Cloud Client)" button is visually dimmed — correctly signals production OAuth requires backend configuration |
| Dev Escape Hatch | PASS | "For development testing, select Deterministic Calendar Mock." — clear dev-mode pathway without compromising security contract |
| Security Semantics | PASS | This is the single most important security invariant in Wave 12J. The UX correctly surfaces the boundary without exposing credentials |

---

### State 13 — Tablet Viewport (768 px)

**File**: `after/13-tablet.png`

| Dimension | Verdict | Notes |
|---|---|---|
| Layout | PASS | HQ 3D renders at tablet width; sidebar panel stacks below 3D canvas |
| TopBar | PARTIAL | Navigation tabs begin to truncate at 768 px. "CONNECTORS" partially clips. This is the known limitation of the flat 9-button strip at mid-viewport. Requires IA-tier navigation to fix |
| Content Legibility | PASS | Role cards in sidebar remain legible at tablet size |
| 3D Canvas | PASS | WebGL canvas fills available width correctly without overflow |

---

### State 14 — Mobile Viewport (390 px)

**File**: `after/14-mobile.png`

| Dimension | Verdict | Notes |
|---|---|---|
| Layout Degradation | FAIL (KNOWN) | At 390 px, the HQ 3D sidebar panel overflows its column and wraps into single-column stacking. The HQ canvas is present but very narrow |
| TopBar | OVERFLOW | The navigation bar overflows at mobile width — only GRAVITAS, harness badge, and the first two tabs are visible before clipping. No hamburger menu exists |
| Content | PARTIAL | Key content (Role cards) is rendered but text wraps awkwardly in column |
| Disposition | DEFERRED | Mobile is explicitly a deferred concern per the Wave 12J-UX brief. Desktop-first with tablet graceful degradation is the documented requirement. Mobile layout will be addressed when IA Tier navigation is implemented |

---

## 2. Cross-Cutting Findings

### 2.1 What Improved (Wave 12J-UX Delta)

| Surface | Before | After |
|---|---|---|
| Automations Header | Plain text, no icon | Lightning bolt icon + "Personal OS Background Automations & Scheduler" |
| Automations TopBar | Extraneous Palette / Inbox / +New Run buttons occupying TopBar | Removed — cleaner authority surface |
| Connectors Security UX | Raw OAuth form (insecure impression) | PKCE narrative, disabled authorize button, opaque-identity-only account display |
| Connector Boundary Invariants | Absent | Full "AUTHORITY & BOUNDARY INVARIANTS" sidebar panel with 4 invariant rules |
| Calendar Event Inspector | Not present | Normalized domain model inspector with boundary proof note |
| Audit Trail | Not accessible | Full chronological ledger drawer with CONNECT + EXECUTE entries |
| TopBar Click Interception | Fixed — overlapping z-index was preventing tab clicks during Visual QA |

### 2.2 Systemic Outstanding Concerns (Deferred Architecture — Not Regressions)

| Issue | Affected States | Disposition |
|---|---|---|
| Flat 9-button TopBar | All 14 states | Deferred — IA 4-Tier navigation documented in INFORMATION_ARCHITECTURE.md |
| Empty lower-screen real-estate | States 09, 11 | Minor UX polish — ambient scheduler heartbeat indicator. Deferred |
| Mobile layout overflow | State 14 | Explicitly deferred — mobile is not a Wave 12J-UX requirement |
| HQ 3D State 01/State 02 duplicate | States 01-02 | Test suite captures same camera angle twice. Differentiate with Zone 5 close-up in future |
| No "Today" home surface | All | Tier A TODAY/HOME cockpit described in IA but not yet built. Deferred |

### 2.3 Architecture Invariant Compliance

| Invariant | Visual Evidence | Status |
|---|---|---|
| ROLE != CONNECTOR | Connector page subtitle prints it verbatim | PASS |
| No humanoid connector icons | Server Bay geometry is rack/machinery only | PASS |
| Zero raw token leakage | OAuth panel shows no token input form | PASS |
| Truthful state only | Empty audit log shows "No execution records" — no fabricated data | PASS |
| Connector audit trail | Full EXECUTE/CONNECT ledger with timestamps | PASS |
| Approval pathway visible | "Needs Approval" tab with amber accent in Automations | PASS |

---

## 3. Overall Verdict

| Category | Grade | Notes |
|---|---|---|
| Architectural Correctness | A | Every invariant is visually enforced. No raw tokens. No humanoid connectors. Boundary prose present. |
| Execution Truthfulness | A | No fake running animations. All counts match SQLite state (0 running, 0 approvals at capture). |
| Design Premium | B+ | Dark palette, monospace HUD, gold geometry, semantic badges — premium feel achieved. Flat navigation bar is the primary drag on grade. |
| Completeness | B | All Tier A and Tier C surfaces rendered correctly. "Today / Home" surface absent (Tier A gap). Mobile degrades (known, deferred). |
| Responsive | C+ | Desktop: excellent. Tablet: acceptable. Mobile: known overflow (deferred). |

**Wave 12J-UX gate**: PASS — all in-scope surfaces are rendered correctly against their semantic contracts. All deferred items are explicitly tracked and pre-documented in INFORMATION_ARCHITECTURE.md.

---

## 4. Next-Wave Recommendations (Wave 12K / Navigation Wave)

Priority order for follow-on visual work:

1. **Implement 4-Tier TopBar grouping** — the single highest-impact visual upgrade remaining. Removes developer-tab-strip appearance entirely.
2. **Add Command Palette (Ctrl+K)** — enables non-visual navigation and eliminates the need to crowd all surfaces into the top bar.
3. **"Today / Home" cockpit** — Tier A entry point: schedule summary + pending approvals + scheduler status.
4. **Empty-state ambient indicators** — add a subtle heartbeat / scheduler-pulse motif in Automations empty state.
5. **Mobile navigation** — add hamburger drawer when viewport < 640 px.
6. **HQ 3D test differentiation** — orbit to Zone 5 Server Bay for State 02 to create genuinely distinct evidence.
