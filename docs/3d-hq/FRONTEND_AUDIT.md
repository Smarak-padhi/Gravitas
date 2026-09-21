# GRAVITAS FRONTEND & EVENT ARCHITECTURE AUDIT
## Wave 12A Baseline Repository Investigation

> **TARGET**: Ground-truth architectural analysis of the Gravitas repository as of branch `feat/v0-golden-loop`.  
> **EVIDENCE SOURCE**: Direct inspection of root `package.json`, `apps/web`, `apps/server`, and core packages.

---

## 1. Package & Workspace Structure

The Gravitas repository is configured as an npm workspaces monorepo with Node.js `>=22.0.0` and npm `>=10.0.0`.

```
Multi-agent/
├── package.json               # Root npm workspace orchestration & scripts
├── tsconfig.base.json         # Shared TypeScript compiler options
├── tsconfig.json              # Project references
├── vitest.config.ts           # Vitest root test runner
├── playwright.config.ts       # Playwright E2E browser test configuration
├── apps/
│   ├── server/                # Node.js native HTTP/SSE orchestrator server
│   └── web/                   # Vite + React 19 single-page desktop client (@gravitas/web)
└── packages/
    ├── core/                  # Canonical domain types, event schemas, FSM, and contracts
    ├── orchestrator/          # Run/Task scheduler, dependency resolution, execution engine
    ├── verifier/              # Independent verifier, worktree runner, diff validator
    ├── browser-qa/            # Playwright-backed deterministic DOM QA runner
    ├── harnesses/             # Claude Code, Codex CLI, and process execution wrappers
    ├── gateways/              # OmniRoute client, multi-provider model routing, fallback logic
    ├── git/                   # Git worktree isolation and commit mutation primitives
    └── prompts/               # Prompt templates and contract generators
```

### Build & Tooling Setup
- **TypeScript**: Version `5.8.3` across all packages with strict typing (`"strict": true`, `"noImplicitAny": true`, `"exactOptionalPropertyTypes": true`).
- **Module System**: Pure ES Modules (`"type": "module"`), Node `nodenext` / Bundler module resolution with explicit `.js` import specifiers.
- **Frontend Bundler**: Vite `6.2.0` with `@vitejs/plugin-react` `4.3.4`.
- **Testing**: Vitest `5.0.1` for unit/integration testing; Playwright `1.63.0` for browser verification.

---

## 2. Frontend Framework & React Usage

### Version & Runtime
- **Framework**: React `19.0.0` and `react-dom` `19.0.0` (installed in `apps/web/package.json`).
- **Types**: `@types/react: ^19.0.0`, `@types/react-dom: ^19.0.0`.
- **Architectural Consequence for 3D**:
  - React 19 introduces modified JSX runtime semantics, ref handling changes, and new concurrent reconciliation hooks.
  - Ecosystem libraries like `@react-three/fiber` historically lag behind major React releases or require `--legacy-peer-deps` / peer-dep overrides when paired with React 19.
  - A clean architectural boundary or a decoupled Three.js rendering layer ensures zero dependency deadlock with React 19.

### Existing UI Component Inventory
The current frontend (`apps/web/src/`) comprises:
- `App.tsx`: Central coordinator managing runs, tasks, active view modes, and event dispatch.
- `components/TopBar.tsx`: System telemetry, connection pill, view selector, and quick action bar.
- `components/RunsList.tsx`: Left rail displaying historical and active runs with status pills.
- `components/TaskInspector.tsx`: Rich 2D inspection panel showing task status, acceptance criteria, evidence diff, test outputs, and approval/rejection triggers.
- `components/ExecutionGraph.tsx`: SVG/DOM execution DAG showing dependencies and stage transitions.
- `components/GoalComposer.tsx`: Modal form for authoring new goals and execution contracts.
- `components/EventConsole.tsx`: Collapsible bottom drawer displaying live SSE log streams.
- `components/DiffViewer.tsx`: Syntax-highlighted unified git diff viewer.
- `features/office/`: Wave 7.5 2D "Living Office" displaying worker cards in an engineering station grid.
- `features/hq/`: Wave 11 2D "Tactile Atelier" multi-floor scrollable DOM layout (`LivingHqCanvas.tsx`, `OperatorMezzanine.tsx`, `VerificationLabFloor.tsx`, `AstraStudioFloor.tsx`, `EngineeringFloor.tsx`).
- `features/inbox/`: Human action notification drawer (`InboxDrawer.tsx`) with sound/browser notification triggers.
- `features/command-palette/`: Global `Ctrl/Cmd+K` keyboard command launcher (`CommandPalette.tsx`).
- `features/timeline/`: Linear chronological stream of domain execution events (`ActivityTimeline.tsx`).
- `features/agents/`: Registry of agent capabilities, models, and qualification statuses (`AgentRegistryView.tsx`).

---

## 3. Rendering Architecture & CSS Architecture

### Rendering Flow
1. Single Page Application (SPA) bootstrapping via `apps/web/src/main.tsx` into standard `#root` container.
2. Flat, flexbox-dominated layout with sticky horizontal rails and scrollable main viewports.
3. Zero canvas-based rendering currently in production (all existing diagrams in `ExecutionGraph.tsx` and `LivingHqCanvas.tsx` are pure HTML/SVG DOM elements).

### CSS & Design Tokens
- **Theme Variables**: `apps/web/src/styles/theme.css` defines dark mission-control tokens:
  - Font families: `Space Grotesk` (sans/headings), `JetBrains Mono` (code, hashes, diffs).
  - Dark surfaces: `--bg-app: #080a0f`, `--bg-panel: #0e121a`, `--bg-panel-elevated: #151b26`.
  - State colors: `--state-ready`, `--state-running`, `--state-verifying`, `--state-waiting`, `--state-success`, `--state-failure`.
- **Design Tokens**: `apps/web/src/design-system/tokens.css` defines spacing, radius, and elevation tokens.
- **Motion Variables**: `apps/web/src/design-system/motion.css` specifies transition duration and easing curves (`var(--motion-duration-fast: 150ms)`, `var(--motion-ease-standard)`).
- **Atelier Tokens**: `apps/web/src/features/hq/` introduced parchment/wood tokens (`--hq-canvas: #F7F5F0`, `--hq-wood-walnut: #5A4231`), creating a tactile contrast against the dark terminal theme.

---

## 4. State Management & Server API Contracts

### Client-Side State Architecture
- **State Store**: Zero external state libraries (no Redux, Zustand, or MobX installed). All state resides in `App.tsx` utilizing idiomatic React hooks (`useState`, `useCallback`, `useMemo`, `useRef`).
- **Data Fetching**: Typed HTTP client (`apps/web/src/api/client.ts`) utilizing native `fetch`:
  - `GET /api/v1/state`: Full system snapshot (active runs, system version, worker harness state, gateway status).
  - `GET /api/v1/runs`: List of all runs.
  - `GET /api/v1/runs/:runId`: Full details for a run including tasks, contract, and recent events.
  - `GET /api/v1/runs/:runId/tasks/:taskId`: Deep inspection of a single task.
  - `GET /api/v1/runs/:runId/tasks/:taskId/diff`: Unified git diff evidence bundle.
  - `POST /api/v1/runs`: Create a run from goal/contract input.
  - `POST /api/v1/runs/:runId/execute`: Begin autonomous execution loop.
  - `POST /api/v1/runs/:runId/tasks/:taskId/approve`: Submit human approval.
  - `POST /api/v1/runs/:runId/tasks/:taskId/reject`: Submit human rejection with reason.

---

## 5. SSE & Event Infrastructure

### Server Event Bus (`apps/server/src/events.ts`)
- Implements `EventHub` on Node.js `http` module with zero external WebSocket/socket.io dependencies.
- Emits Server-Sent Events (SSE) at endpoint `GET /api/v1/events` using MIME type `text/event-stream`.
- Wire envelope:
  ```http
  id: evt_1711038400000_1_a8f9d
  event: TASK_STATE_CHANGED
  data: {"eventId":"evt_...","runId":"run_...","taskId":"task_...","type":"TASK_STATE_CHANGED","timestamp":"...","payload":{...}}
  ```
- Retains a bounded memory buffer of recent events and automatically manages client disconnect cleanups.

### Client SSE Hook (`apps/web/src/api/useEvents.ts`)
- Opens an `EventSource('/api/v1/events')`.
- Performs client-side deduplication via `seenIdsRef = new Set()`.
- Automatically handles reconnection upon disconnect with a 3-second backoff.
- **Key Repo Observation**: `useEvents.ts` currently registers listeners for 22 event types, but the core engine in `@gravitas/core` defines 28 canonical event types. Newly added Gateway and Browser QA events (`BROWSER_QA_STARTED`, `BROWSER_QA_COMPLETED`, `BROWSER_QA_FAILED`, `ROUTE_SELECTED`, `GATEWAY_ROUTE_STARTED`, `GATEWAY_ROUTE_COMPLETED`, `GATEWAY_ROUTE_FAILED`, `PROVIDER_FALLBACK_OCCURRED`, `TRANSPORT_FALLBACK_OCCURRED`) must be unified in the event subscription.

---

## 6. Routing & Navigation

- Gravitas currently operates as a single-page workspace with in-memory view switching (no `react-router` dependency).
- Supported views defined in `TopBar.tsx`:
  ```typescript
  export type WorkspaceView = 'OFFICE' | 'GRAPH' | 'EVIDENCE' | 'TIMELINE' | 'AGENTS'
  ```
- View state is controlled via `activeView` state in `App.tsx`.
- Modal/Drawer overlays:
  - `isComposerOpen`: Goal Composer modal.
  - `isInboxOpen`: Human Action Inbox slide-out drawer.
  - `isCommandPaletteOpen`: Command Palette search modal.

---

## 7. Browser QA Architecture

- Implemented in `packages/browser-qa/` using Playwright.
- Executes deterministic browser validation scripts (`BrowserQaContract`) containing sequential actions:
  - `navigate`, `click`, `fill`, `assertVisible`, `assertText`, `screenshot`.
- Captures console errors, uncaught exceptions, network failures, step execution latencies, and PNG screenshots.
- Emits canonical events: `BROWSER_QA_STARTED`, `BROWSER_QA_COMPLETED`, `BROWSER_QA_FAILED`.
- Visualized in 2D within `TaskInspector.tsx` (showing step-by-step pass/fail assertions and embedded screenshot thumbnails).

---

## 8. Accessibility & Performance Assumptions

### Existing Accessibility
- Keyboard navigation: Full `Ctrl/Cmd+K` Command Palette integration with `Esc` to close.
- Form accessibility: Labels and ARIA attributes on inputs in `GoalComposer.tsx`.
- Semantic buttons with distinct focus rings (`--border-focus: #3b82f6`).
- High-contrast text colors meeting WCAG AA requirements on dark backgrounds.

### Existing Performance Assumptions
- Lightweight bundle: ~180KB compressed initial bundle (Vite React).
- Instant hot-module replacement (HMR) under 50ms via Vite.
- Memory consumption: Minimal (<40MB heap) due to plain object structures and absence of heavy runtime frameworks.
- Zero WebGL context allocations currently.

---

## 9. Integration Seam for the 3D Headquarters

### Where 3D Fits Without Weakening Existing Architecture
1. **Primary Workspace View Extension**:
   Add a new view `'HQ3D'` (or elevate `'OFFICE'` to default to 3D with a seamless 2D toggle):
   ```typescript
   export type WorkspaceView = 'HQ3D' | 'OFFICE' | 'GRAPH' | 'EVIDENCE' | 'TIMELINE' | 'AGENTS'
   ```
2. **Encapsulated Viewport Component**:
   Integrate a `<LivingHq3DCanvas />` inside the central `<main>` area of `App.tsx`. The 3D viewport receives identical authoritative props (`run`, `tasks`, `activeTask`, `harness`, `gateways`, `events`) and dispatches standard callbacks (`onSelectWorker`, `onSelectTask`, `onApproveResult`, `onInspectEvidence`).
3. **Preservation of 2D Task Inspector**:
   Keep the bottom/side 2D `TaskInspector` docked alongside the 3D canvas. When an agent, workstation, or task is clicked in the 3D world, the existing 2D `TaskInspector` loads the selected item's code diff, test report, and action buttons.
4. **Resilient Fallback Mode**:
   If WebGL is unsupported, disabled, or fails to initialize (or if the user toggles to 2D), the application gracefully falls back to the existing 2D `OfficeFloor` without interrupting active runs.
