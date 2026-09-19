# Gravitas Visual Directions Exploration & Selection
**Wave 7.5 Design Collaboration Document**

---

## 1. Overview & Exploration Objectives

To evolve Gravitas into a premier desktop developer tool (comparable in caliber to Linear, Raycast, and Vercel while possessing its own distinct operational identity), we explored three distinct visual and interaction directions. Each direction operates on the exact same backend engine contracts (`Run`, `Task`, `GravitasEvent`, `VerificationSummary`, `ExecutionContract`).

---

## 2. Direction A: "Dark Engineering Operations Center" (Terminal-First / Observability Floor)

### 2.1 Aesthetic & Philosophy
- **Inspiration**: High-frequency trading terminals, telemetry cockpits, Bloomberg Terminal, Datadog infrastructure maps.
- **Palette**: Deep pitch black (`#05070a`), slate gray surfaces (`#0b0f17`), neon-amber warnings (`#f59e0b`), emerald verifications (`#10b981`), ice-blue activity (`#38bdf8`).
- **Typography**: Predominantly monospace (`JetBrains Mono`, `Berkeley Mono`) for all data tables, hashes, and status tags, with minimalist clean sans (`Space Grotesk`) for headings.
- **Density**: Ultra-compact. Minimal padding (4px-8px), dense multi-column tabular grids, high information-to-pixel ratio.
- **Worker Representation**: Tabular rack-mount slots or matrix cards with live memory/duration metrics, state indicators, and log tails.
- **Strengths**: Familiar to systems engineers; minimal visual noise; zero distraction.
- **Weaknesses**: Can feel cold, austere, and text-heavy; fails to convey the collaborative spatial feeling of an active AI organization.

---

## 3. Direction B: "Spatial AI Studio / Office" (Living Workspaces / Human-Centric Floor)

### 3.1 Aesthetic & Philosophy
- **Inspiration**: Modern architectural design studios, boutique physical workshop layouts, collaborative design tools like Figma/Miro, Linear workspaces.
- **Palette**: Charcoal ink background (`#090c10`), warm elevation layers (`#12161f`, `#181f2b`), subtle slate borders (`#252e3d`), vibrant focal badges.
- **Typography**: Modern humanistic sans-serif (`Inter` / `Space Grotesk`) for primary hierarchy, with mono reserved strictly for SHA hashes, code paths, and diffs.
- **Density**: Moderate density with intentional whitespace and card elevations that demarcate distinct workstations.
- **Worker Representation**: Spatial workstation desks ("pods") showing worker role, active task card, status badge, tool capability chips, and live activity pulse.
- **Strengths**: Exceptional intuitive clarity; operator immediately grasps *who* is doing *what* and *where* handoffs occur; highly engaging without becoming childish.
- **Weaknesses**: Can waste vertical space if workstation cards are too large or decorative; risk of looking like a gaming sim if not rigorously restrained.

---

## 4. Direction C: "Technical Command Deck" (Mission Control / Aerospace Deck)

### 4.1 Aesthetic & Philosophy
- **Inspiration**: NASA mission control stations, ESA satellite operations center, nuclear plant control consoles.
- **Palette**: Deep midnight blue-black (`#060913`), cobalt highlights (`#1e3a8a`), amber advisory indicators, high-contrast cyan telemetry indicators.
- **Typography**: Technical geometric sans and tabular figures with uppercase section labels (`ALL CAPS`, 10px, 1.2px letter-spacing).
- **Density**: Segmented tactical panels with distinct borders, split panes, and permanent status ribbons at top and bottom.
- **Worker Representation**: Station telemetry panels with circular state radars, stage step progress, and dependency bus lines.
- **Strengths**: High drama and serious authority; strong visual structure for critical approvals.
- **Weaknesses**: Can feel rigid and overly military; circular meters and radar graphics can easily become decorative fake metrics.

---

## 5. Comparative Evaluation Matrix

| Criterion | Direction A: Dark Ops Center | Direction B: Spatial AI Studio | Direction C: Technical Command Deck | Selected Synthesis ("Precision Studio") |
| :--- | :--- | :--- | :--- | :--- |
| **Operator Clarity** | Moderate (text-dense) | **High (immediate spatial mental model)** | High (structured) | **Maximum**: Spatial pods with crisp tabular metadata |
| **Density & Ergonomics** | **Ultra-high (compact tables)** | Moderate (open cards) | High (panelled) | **Optimized**: Compact 240px workstation cards |
| **Authenticity (No fake simulation)** | **100% (data-only)** | Needs discipline | Needs discipline | **100%**: Zero fake wanderings or animations |
| **Emotional Connection (AI Org)** | Low (feels like cron jobs) | **High (feels like an AI team)** | Moderate (feels like machinery) | **High**: Recognizable worker identities & roles |
| **Keyboard Ergonomics** | High | High | High | **High**: Global Cmd+K, Esc, tab navigation |
| **Scaling (1 to 30 workers)** | **Linear table scaling** | Grid overflow scaling | Grid overflow scaling | **Adaptive Grid**: Auto-fit minmax(280px, 1fr) |

---

## 6. Selected Direction: "Precision Studio Floor" (Synthesis of A & B)

We adopt the **Precision Studio Floor** — blending the spatial worker clarity of Direction B with the relentless engineering rigor and density of Direction A.

### Core Architectural Decisions:
1. **Layout & Shell**:
   - High-density top bar with live engine status, active run context, global Human Inbox trigger, and primary View Switcher (`OFFICE`, `GRAPH`, `EVIDENCE`, `TIMELINE`).
   - Collapsible Left Rail (Runs List) preserving instant run switching.
   - Dynamic central canvas rendering the active view.
   - Collapsible live SSE Event Console along the bottom edge.
2. **Surface Hierarchy**:
   - Base (`--bg-canvas`): `#07090e`
   - Panel (`--bg-surface-1`): `#0c1017`
   - Card (`--bg-surface-2`): `#131822`
   - Elevated/Active (`--bg-surface-3`): `#1b2230`
   - Border (`--border-subtle`): `#1e2638`
   - Border Focus (`--border-focus`): `#3b82f6`
3. **Typography**:
   - UI Headings & Body: `Space Grotesk`, system-ui fallback
   - Technical metadata, code, SHA hashes, paths: `JetBrains Mono`, monospace
4. **Attention & Approvals**:
   - `WAITING_APPROVAL` states command immediate visual priority with an unmistakable amber barrier (`#f59e0b` / `rgba(245, 158, 11, 0.15)`), surfaced in the Office station, the Task Inspector, and the persistent Human Inbox.
