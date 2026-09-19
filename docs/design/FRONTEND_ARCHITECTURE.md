# Gravitas Frontend Architecture Specification
**Wave 7.5 Design Collaboration Document**

---

## 1. Directory Structure & Modular Boundaries

The frontend code in `apps/web/src/` is organized into clean, isolated feature slices:

```
apps/web/src/
├── api/                       # Authoritative server client, types, and SSE hook
│   ├── client.ts              # Fetch-based REST client with error envelopes
│   ├── types.ts               # Re-exports of domain models + web responses
│   └── useEvents.ts           # Deduplicated SSE subscription hook
├── design-system/             # Reusable design tokens and atomic UI primitives
│   ├── tokens.css             # Surface, border, typography, and status tokens
│   ├── motion.css             # Functional motion keyframes and reduced motion rules
│   └── components/            # Button, Badge, Card, Panel, Tabs, Dialog, etc.
├── features/
│   ├── office/                # Living Office View
│   │   ├── officeState.ts     # Pure derivation of WorkerPresentation[]
│   │   ├── WorkerStation.tsx  # Workstation card for active/idle workers
│   │   └── OfficeFloor.tsx    # Floor grid and team summary bar
│   ├── graph/                 # Engineering Execution Graph View
│   │   └── TruthfulGraph.tsx  # Truthful pipeline & dependency flow
│   ├── evidence/              # Deep Forensic Inspection View
│   │   ├── DiffViewer.tsx     # Unified diff viewer with syntax highlights
│   │   ├── ScopeSummary.tsx   # Mutation scope & compliance card
│   │   └── VerifierCard.tsx   # Independent runner command details
│   ├── timeline/              # Chronological Operational History View
│   │   ├── timelineDerivation.ts # Maps raw SSE events to human narratives
│   │   └── ActivityTimeline.tsx # Filterable chronological feed
│   ├── inbox/                 # Operator Attention & Human Review
│   │   ├── inboxDerivation.ts # Derives actionable notifications
│   │   ├── notificationPolicy.ts # Provider-neutral filter rules
│   │   ├── browserNotifier.ts # Explicit opt-in browser notification adapter
│   │   └── InboxDrawer.tsx    # Attention drawer & approval action shortcuts
│   ├── command-palette/       # Keyboard-First Action Dispatcher
│   │   ├── commandPaletteState.ts # Action registry & fuzzy search
│   │   └── CommandPalette.tsx # Modal triggered by Ctrl/Cmd+K
│   ├── runs/                  # Runs sidebar & selection management
│   │   └── RunsList.tsx       # Filterable list of orchestrator runs
│   └── prompts/               # Prompt Manager & Layer Inspection
│       └── PromptManager.tsx  # 6-layer compilation preview & SHA-256
├── App.tsx                    # Root workspace coordinator
└── main.tsx                   # React 18 DOM mount point
```

---

## 2. Unidirectional Data Flow & State Authority

```
     ┌────────────────────────────────────────────────────────┐
     │                Gravitas HTTP / SSE Server              │
     │              (Authoritative Single Source)             │
     └───────────────────────────┬────────────────────────────┘
                                 │
                   REST & SSE    ▼
     ┌────────────────────────────────────────────────────────┐
     │                       App.tsx                          │
     │   (stateSummary, runs, selectedRun, taskDetail, SSE)   │
     └───────┬───────────────────┬───────────────────┬────────┘
             │                   │                   │
             ▼                   ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  deriveOffice   │ │   deriveInbox   │ │ deriveTimeline  │
    │  (Pure Function)│ │  (Pure Function)│ │ (Pure Function) │
    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
             │                   │                   │
             ▼                   ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │   Office View   │ │   Inbox Drawer  │ │  Timeline View  │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Invariant Guardrails:
1. **No Frontend Orchestration**: State transitions occur exclusively via HTTP calls (`POST /execute`, `POST /approve`, `POST /reject`, `POST /runs`).
2. **Pure Derivation**: Views are rendered from pure transformation functions (`deriveOfficeState`, `deriveInboxItems`, `deriveTimelineEvents`).
3. **Zero Telemetry Fabrication**: When telemetry or diffs are absent from the engine, components render clean empty states rather than placeholders.
