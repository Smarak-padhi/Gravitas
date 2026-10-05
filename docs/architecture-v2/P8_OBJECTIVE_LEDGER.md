# GRAVITAS — WAVE P8 OBJECTIVE LEDGER
## Visual & Renderer Strategy Decision Tracking

**Status:** COMPLETE — P8 RENDERER DECISION HARDENED  
**Wave:** P8 — Renderer Strategy Decision  
**Date:** 2026-10-01  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants:**
- $\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$
- $\text{CAPABILITY} \neq \text{TOOL} \neq \text{TRANSPORT} \neq \text{CREDENTIAL} \neq \text{AUTHORITY}$
- $\text{VISUAL WORLD} = \text{PROJECTION OF RUNTIME STATE}$
- $\text{DESKTOP UI} \neq \text{KERNEL}$
- $\text{DESKTOP PROCESS LIFETIME} \neq \text{WORKSESSION LIFETIME}$
- $\text{DESKTOP SHELL} \neq \text{CONTROL-PLANE AUTHORITY}$
- $\text{RENDERER} \neq \text{PRIVILEGED KERNEL}$
- $\text{UI COMPROMISE} \neq \text{UNRESTRICTED OS AUTHORITY}$
- $\text{RENDERER REQUEST} \neq \text{AUTHORIZED KERNEL COMMAND}$
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$
- $\mathbf{RENDERER \neq SIMULATION\ AUTHORITY}$
- $\mathbf{VISUAL\ ENTITY \neq CANONICAL\ AGENT\ STATE}$
- $\mathbf{ANIMATION \neq WORK\ COMPLETION}$
- $\mathbf{FRAME\ RATE \neq SYSTEM\ HEALTH}$
- $\mathbf{VISUAL\ PROXIMITY \neq AUTHORIZATION}$
- $\mathbf{SCENE\ GRAPH \neq CONTROL\text{-}PLANE\ GRAPH}$
- $\mathbf{RENDERER\ EVENT \neq KERNEL\ EVENT}$
- $\mathbf{GPU\ STATE \neq DURABLE\ STATE}$
- $\mathbf{PRETTY\ DEMO \neq PRODUCTION\ FITNESS}$
- $\mathbf{FRAMEWORK\ POPULARITY \neq RENDERER\ FITNESS}$
- $\mathbf{SYNTHETIC\ BENCHMARK \neq REPRESENTATIVE\ WORKLOAD}$
- $\mathbf{HIGH\ FPS \neq ACCESSIBLE\ UX}$
- $\mathbf{3D \neq BETTER\ UX}$
- $\mathbf{2D \neq INSUFFICIENT\ UX}$
- $\mathbf{ONE\ PROTOTYPE \neq UNIVERSAL\ PERFORMANCE\ CLAIM}$
- $\mathbf{P8\ DECISION \neq PRODUCTION\ UI\ IMPLEMENTATION}$

---

## 1. Lifecycle Progression States
`NOT_STARTED` $\to$ `IN_PROGRESS` $\to$ `BLOCKED` $\to$ `REQUIRES_EVIDENCE` $\to$ `COMPLETE`

---

## 2. Objective Tracking Table

| # | Requirement / Domain | Target Contract & Architectural Decision | Evidence Tier | Status | Primary Artifact Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Context Verification** | Repo verified clean on `feat/v0-golden-loop` (`516e01c82cb4c3afd1080e72e68a4e1e56687335`). Node v24.13.0, Edge/Chromium 154, Three.js r186 observed in `apps/web`. Zero production edits. | `LIVE_HOST_PROBE` | `COMPLETE` | `P8_RENDERER_DECISION_PACKET.md` |
| **02** | **P7 Boundary Preservation** | Frozen P7 Electron desktop runtime preserved. Sandboxed renderer container with `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, typed preload bridge `gravitasAPI`. | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `P8_RUNTIME_CONSTRAINT_INPUT_PACKET.md` |
| **03** | **Current Renderer Research** | Current research performed by independent scouts for DOM/SVG, Canvas 2D, PixiJS v8, Three.js r186, WebGL2/WebGPU (Dawn/ANGLE), and CSS3D. | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P8_RENDERER_CANDIDATE_MATRIX.md` |
| **04** | **Zero-Spend Audit** | Zero incremental spend verified ($\mathbf{\Delta\text{Spend} = \$0.00}$). MIT/permissive licenses across Three.js, PixiJS, React, and web standards. Zero required paid tooling or cloud dependencies. | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P8_RENDERER_DECISION_PACKET.md` |
| **05** | **DOM + CSS + SVG Evaluation** | Candidate A evaluated: strong accessibility, subpixel text, low idle GPU; degrades past $\sim 1000$ dynamic SVG nodes ($>12\text{ms}$ style/layout reflows). | `LIVE_HOST_PROBE` + `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P8_RENDERER_CANDIDATE_MATRIX.md` |
| **06** | **Canvas 2D Evaluation** | Candidate B evaluated: immediate-mode Skia acceleration handles $10,000+$ primitives; inaccessible without parallel DOM tree, grayscale antialiasing on transparent surfaces, manual picking math. | `LIVE_HOST_PROBE` + `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P8_RENDERER_CANDIDATE_MATRIX.md` |
| **07** | **PixiJS v8 Evaluation** | Candidate C evaluated: fast 2D sprite batching, WebGPU/WebGL auto-switching; text rasterization overhead on dynamic logs, continuous ticker increases idle load without manual pause. | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P8_RENDERER_CANDIDATE_MATRIX.md` |
| **08** | **Three.js r186 Evaluation** | Candidate D evaluated: WebGL2 mature baseline, TSL/WebGPU path, restrained perspective (calibrated in Phase D) avoids edge distortion; text in 3D textures is illegible/inaccessible; requires CSS2D/DOM billboard layer. | `OFFICIAL_PLATFORM_CAPABILITY` + `REPOSITORY_OBSERVATION` | `COMPLETE` | `P8_RENDERER_CANDIDATE_MATRIX.md` |
| **09** | **CSS3D / 2.5D Evaluation** | Candidate E evaluated: browser matrix composition breaks down on standard UI properties (`overflow: hidden`, `clip-path`, `filter`, `opacity < 1`); lacks hardware Z-buffer; severe Z-fighting and subpixel jitter. | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P8_RENDERER_CANDIDATE_MATRIX.md` |
| **10** | **Hybrid Architecture Evaluation** | Candidate F evaluated: decoupled 4-layer composition (GPU World + Connection Layer + Semantic UI + ARIA Tree). Synchronous post-render transform sync minimizes jitter. SELECTED ARCHITECTURE. | `LIVE_HOST_PROBE` + `REPOSITORY_OBSERVATION` | `COMPLETE` | `P8_RENDERER_ARCHITECTURE.md` |
| **11** | **Representative Workloads** | Neutral test benchmark defined across small (10 entities), medium (100 entities + 50 DAG edges), and stress (500 entities). Explicitly labeled `EXPERIMENTAL_WORKLOAD_ONLY`. | `LIVE_HOST_PROBE` | `COMPLETE` | `P8_RENDERER_EXPERIMENT_REGISTER.md` |
| **12** | **Performance Experiments** | Empirical micro-probes executed in headless Edge on host: `EXP-P8-01` (Projection math), `EXP-P8-02` (CPU-side DOM vs Canvas vs SVG mutation costs). Three.js GPU world performance classified as `REQUIRES_D_PHASE_PROTOTYPE_MEASUREMENT`. | `LIVE_HOST_PROBE` | `COMPLETE` | `P8_RENDERER_EXPERIMENT_REGISTER.md` |
| **13** | **2D vs 2.5D vs 3D Decision** | Explicit determination: Restrained 3D architectural shell (telephoto/isometric baseline, calibrated in Phase D) for spatial identity + Orthogonal 2D DOM billboards and panels for all text, code diffs, logs, and interactive controls. | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P8_RENDERER_DECISION_PACKET.md` |
| **14** | **Visual Projection Model** | Formalized: `VISUAL WORLD = PROJECTION OF RUNTIME STATE`. Ephemeral projection entities (`VisualAgent`, `VisualTask`, `VisualZone`, `VisualConnection`) mapped strictly to canonical Kernel IDs. | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `P8_VISUAL_PROJECTION_MODEL.md` |
| **15** | **Update & Coalescing Model** | Frame-coalesced reconciliation: 100 Kernel events $\neq$ 100 render frames. Renderer throttles visual updates to display refresh rate while preserving canonical event sequence. | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P8_VISUAL_PROJECTION_MODEL.md` |
| **16** | **Animation System** | Decoupled interruptible animations: state changes take immediate effect; visual transitions interpolate smoothly; stale animation queues strictly prohibited. | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P8_VISUAL_PROJECTION_MODEL.md` |
| **17** | **Accessibility (a11y)** | Layer 4 semantic DOM tree: `role="status"` with `aria-live="polite"`, `role="alert"` with `aria-live="assertive"`, full keyboard navigation. Full Non-Visual Functional Equivalence defined as Required Acceptance Criterion. | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `P8_ACCESSIBILITY_AND_DEGRADATION_MODEL.md` |
| **18** | **Reduced Motion Architecture** | Native `prefers-reduced-motion` integration + explicit GRAVITAS user toggle. Disables camera panning interpolations and movement animations; transitions resolve immediately. | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P8_ACCESSIBILITY_AND_DEGRADATION_MODEL.md` |
| **19** | **Text & Information Density** | Dense text (logs, diffs, terminal, approvals) strictly confined to native DOM with subpixel ClearType antialiasing, text selection, and clipboard copy. No long-form text in WebGL textures. | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P8_RENDERER_ARCHITECTURE.md` |
| **20** | **DAG Strategy** | Hybrid DAG rendering: SVG vector overlay for standard task graphs ($\le 300$ nodes); Canvas 2D or 3D floor conduits for massive graphs; all node cards rendered in accessible DOM. | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P8_RENDERER_ARCHITECTURE.md` |
| **21** | **GPU Failure & Degradation** | 4-tier degradation ladder: `FULL_VISUAL_MODE` $\to$ `REDUCED_VISUAL_MODE` $\to$ `SEMANTIC_2D_MODE` (SVG floor) $\to$ `COMMAND_CENTER_ONLY_MODE` (pure DOM). Context loss failover specified. | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P8_ACCESSIBILITY_AND_DEGRADATION_MODEL.md` |
| **22** | **Renderer Crash Recovery** | Renderer crash does NOT impact Kernel. Electron Main detects webContents termination, respawns renderer, requests full state snapshot from Kernel, and reconstructs scene projection. | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `P8_RENDERER_FAILURE_RECOVERY.md` |
| **23** | **Hidden / Background Behavior** | Dual-condition loop suspension: `document.hidden` or inactive view halts `requestAnimationFrame`, reducing idle GPU load (idle floor `REQUIRES_D_PHASE_MEASUREMENT`). Reconstructs on focus. | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P8_RENDERER_ARCHITECTURE.md` |
| **24** | **Security Arena** | Defense-in-depth: untrusted tool outputs sanitized via DOMPurify before DOM insertion; WebGL shaders use fixed internal programs; dynamic eval prohibited; CSP blocks remote assets. | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `P8_RENDERER_SECURITY_AND_TRUST_MODEL.md` |
| **25** | **Trustworthy Visualization** | Protection against "Visual Lies": projection versioning, stale-state indicators, and explicit human approval resolution against canonical Kernel evidence hashes rather than visual state. | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `P8_RENDERER_SECURITY_AND_TRUST_MODEL.md` |
| **26** | **Testability & Regression** | Deterministic unit testing for projection adapters; Playwright headless screenshots for visual regression; accessibility tree auditing with axe-core. | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P8_RENDERER_ARCHITECTURE.md` |
| **27** | **Maintainability & Codebase** | Reuses existing patterns from `apps/web/src/hq3d` Three.js and React architecture; eliminates custom game engine bloat; 100% TypeScript. | `REPOSITORY_OBSERVATION` | `COMPLETE` | `P8_RENDERER_ARCHITECTURE.md` |
| **28** | **Asset Strategy** | Procedural Three.js geometry for architecture + 2D SVG vector assets for mascot species; avoids heavy external GLTF loading bottlenecks; offline capable. | `REPOSITORY_OBSERVATION` | `COMPLETE` | `P8_RENDERER_ARCHITECTURE.md` |
| **29** | **24 Failure Scenarios (A–X)** | Comprehensive state machine traces for all 24 failure scenarios (Renderer crashes, GPU crash, context lost, WebGPU missing, rapid bursts, stale states, DPI changes, sleep/wake, etc.). | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P8_RENDERER_FAILURE_RECOVERY.md` |
| **30** | **Adversarial Red-Team Audit** | Multi-perspective red team review (Security, Performance, Accessibility, UX, Electron, Maintainability, Epistemic). All attack vectors and critique findings mitigated. | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P8_ADVERSARIAL_REVIEW.md` |
| **31** | **Selected Renderer Architecture** | Selected: **Candidate F (Hybrid Multi-Layer Architecture)**: Three.js WebGL2/TSL GPU World Viewport + SVG/Canvas Conduit Layer + React DOM Semantic UI Layer + Layer 4 ARIA Semantic Tree. | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P8_RENDERER_DECISION_PACKET.md` |
| **32** | **Reversibility & Boundaries** | Strict projection adapter interface (`ProjectionAdapter`): Kernel state contracts are completely independent of Three.js or DOM types; renderer can be swapped without touching Kernel. | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P8_RENDERER_ARCHITECTURE.md` |
| **33** | **K0 Handoff Preparation** | Produced clean handoff contract dossier for Phase K0 (`K0_RENDERER_CONSTRAINT_INPUT_PACKET.md`), specifying event streaming, snapshot schemas, and backpressure without redesigning K0. | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `K0_RENDERER_CONSTRAINT_INPUT_PACKET.md` |
| **34** | **Repository Integrity** | No edits to production code (`packages/` or `apps/`); no dependencies installed; disposable benchmark code isolated in `scratch/`; Git working tree clean. | `LIVE_HOST_PROBE` | `COMPLETE` | `P8_RENDERER_DECISION_PACKET.md` |
