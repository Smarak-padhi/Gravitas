# Gravitas UX Audit & Product Evaluation
**Wave 7.5 Design Collaboration Document**

---

## 1. Executive Summary

This UX audit evaluates the Wave 6/7 Command Center frontend of Gravitas against the product vision of a **Living AI Workspace** — operating a small, high-density AI engineering organization with uncompromised technical integrity.

### Evaluated Dimensions:
1. **Information Hierarchy & Screen Real Estate**
2. **Cognitive Load & Operator Mental Model**
3. **Task & Approval Discoverability**
4. **Worker Identity & Attribution**
5. **Evidence Discoverability & Depth**
6. **Live Event Observability vs. Noise**
7. **Empty, Pending, and Failure States**
8. **Density, Typography & Accessibility**

---

## 2. Findings & Critique of Existing Baseline (Wave 6/7)

### 2.1 Information Hierarchy & Layout
- **Current Layout**: 3-column split (Runs List on left, Execution Pipeline & Task Inspector in center/right, collapsible Event Console on bottom).
- **Strength**: High density, dark mission-control palette (`#080a0f`), immediate visibility of runs and current task state.
- **Weakness**:
  - The central pipeline forces a horizontal 6-stage node flow (`GOAL -> TASK -> WORKER -> VERIFY -> EVIDENCE -> APPROVAL`). While useful for single-task linear runs, it occupies prime vertical space (~120px) regardless of whether the operator needs a spatial worker overview, an engineering DAG, or historical timeline analysis.
  - The Task Inspector dominates the center-right viewport, mixing prompt compilation provenance, mutation inspection, verification summaries, and diffs in one long vertical scroll container. This increases cognitive load when inspecting complex diffs or reviewing multiple tasks.

### 2.2 Operator Cognitive Load & Task Discoverability
- **Run vs. Task Confusion**: In Wave 6, runs are mapped 1:1 to single tasks (`runDetail.tasks[0]`). While truthful to Wave 6, the UI lacks clear affordance for multi-task runs (which Wave 7.5 must prepare for without faking).
- **Actionability Lag**: When a task transitions to `WAITING_APPROVAL`, the operator must locate the selected run and scroll to the yellow action box in the inspector. There is no global, persistent "Human Attention / Inbox" anchor surfacing blocked tasks or pending approvals across runs.

### 2.3 Worker Identity & Attribution
- **Current Representation**: The top bar displays a single harness status indicator (`HARNESS: free-claude-code [AVAILABLE]`).
- **Critique**: The worker feels like a passive remote backend rather than an identifiable specialist engineer (e.g., Codex for engineering implementation, Astra for visual/interaction design, FCC for general workflows, Independent Verifier for verification).
- **Required Evolution**: Introduce an **Office Model** with discrete workstation cards representing workers, their capabilities, current assignments, and state transitions — without resorting to cartoon avatars or fake simulation.

### 2.4 Human Approval Discoverability
- **Current State**: High-visibility yellow box with pulse animation (`data-testid="approval-action-box"`), containing reviewer input, Approve & Merge button, and Reject button.
- **Strength**: Mandatory gate is physically impossible to bypass in the UI; reviewer name and rejection reasons are strictly captured.
- **Defect**: If the operator is viewing a different run or has collapsed the inspector, the pending approval is invisible. An **Operator Inbox** is required to surface pending approvals globally with instant actionability.

### 2.5 Evidence Discoverability & Provenance
- **Strength**: Unified diff viewer, Change Scope inspection (allowed vs unexpected files, HEAD mutation check), and Prompt Manager (6 canonical layers with SHA-256 hash and byte length) provide exceptional technical rigor.
- **Opportunity**: Group evidence into a dedicated **Evidence View** tab, allowing operators to switch between high-level Office operations and deep-dive forensic audits without layout fragmentation.

### 2.6 Live Event Observability vs. Stream Flooding
- **Current State**: Bottom Event Console displays all SSE events with pause/clear controls.
- **Critique**: Raw event payloads (`WORKER_STARTED`, `TASK_STATE_CHANGED`, etc.) are hard for operators to parse at a glance during fast runs.
- **Required Evolution**: Create a dedicated **Activity Timeline View** that synthesizes raw SSE events into human-readable narrative milestones (e.g., *"Codex started task T-1: Implement math add function"*) while retaining instant one-click inspection of raw event JSON.

### 2.7 Empty and Failure States
- **Strength**: Truthful empty states ("No runs yet", "No git diff present") avoid fabricated metrics or placeholder charts.
- **Opportunity**: Empty states should provide direct operational guidance (e.g., keyboard shortcuts `Ctrl+K` to create run, prompt guidance) and clearer diagnostics when errors occur.

---

## 3. Structural Recommendations

| Area | Current State | Recommendation for Wave 7.5 | Architectural Guardrail |
| :--- | :--- | :--- | :--- |
| **Workspace Views** | Single combined dashboard | 4 dedicated views: **Office**, **Graph**, **Evidence**, **Timeline** | All views reflect the same underlying authoritative state |
| **Operator Attention** | Localized to task inspector | **Human Inbox** drawer/counter with 4 severities (`ACTION_REQUIRED`, `CRITICAL`, `IMPORTANT`, `FYI`) | Inbox derives deterministically from real task states and events |
| **Worker Presence** | Single harness badge in header | **Living Office Floor** with data-driven `WorkerPresentation` stations | Data-driven cards; no hardcoded desks or fake activity |
| **Command Entry** | Mouse-only button clicks | **Command Palette (`Ctrl/Cmd+K`)** with fuzzy action search | Commands strictly execute real existing API endpoints |
| **Design System** | Single monolithic `theme.css` | Modular tokens in `design-system/` (`tokens.css`, `motion.css`, atomic components) | High-contrast desktop tool aesthetics; no generic SaaS templates |
| **Motion Language** | One-off pulse glow animation | Coherent motion system with 100/200/350ms duration tokens and reduced-motion support | Motion communicates state changes; zero blocking animations |

---

## 4. Evaluation Against Invariants

- **Engine Invariant**: Frontend never computes task state or performs orchestration; backend remains the single source of truth.
- **Honesty Invariant**: Zero fake progress bars, fake thinking tokens, or fake worker wanderings.
- **Longevity Invariant**: All design components implemented in plain React 18 + TypeScript + CSS tokens — zero runtime dependencies on Astra.

---

## 5. Post-Implementation Adversarial Review (Astra Passes 5 & 6)

Following implementation, an adversarial review was executed across viewports (1920x1080, 1440x900, 1024x768) and engine states (`EMPTY`, `READY`, `WORKING`, `VERIFYING`, `WAITING_APPROVAL`, `APPROVED`, `FAILED`).

### 5.1 Defects Identified & Resolved
1. **Inbox Filter vs. Badge Strict Ambiguity**:
   - *Defect*: The severity filter chips in the inbox drawer shared text with the item severity badges (e.g. `ACTION_REQUIRED`), creating selector ambiguity for assistive tools and automated tests.
   - *Resolution*: Scoped item locators to `[data-testid^="inbox-item-"]` and enhanced semantic roles (`role="tab"` for view switchers, `role="dialog"` for Command Palette, `role="region"` for Inbox).
2. **Event Sourcing Race in Timeline**:
   - *Defect*: Fast initial actions occurring before the SSE `EventSource.onopen` handshake could be omitted from the in-memory live stream array.
   - *Resolution*: Implemented `allEvents` derivation, combining real-time SSE stream events with authoritative historical events from `runDetail.recentEvents`. Sorted deterministically by timestamp descending.
3. **Command Palette Keyboard Trapping & Dismissal**:
   - *Defect*: In desktop browser environments, native browser shortcuts can conflict with global keys.
   - *Resolution*: Provided both explicit visible trigger buttons (`⌘K Palette`, `📥 Inbox`) in the TopBar and resilient global key listeners (`keydown` on `window`), with `Escape` handling that stops propagation.
4. **Contrast & Reduced Motion Verification**:
   - *Audit*: Verified that all state tokens (`--state-ready`, `--state-running`, `--state-verifying`, `--state-waiting`, `--state-success`, `--state-failure`) provide high contrast against elevated surfaces. Under `prefers-reduced-motion: reduce`, all perpetual pulse keyframes are clamped to `0.01ms` with non-color icons (`⚠`, `✕`, `✓`).

