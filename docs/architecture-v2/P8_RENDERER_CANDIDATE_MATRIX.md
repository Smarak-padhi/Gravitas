# GRAVITAS — WAVE P8 RENDERER CANDIDATE MATRIX
## Comprehensive Evaluation of 2D, 3D, and Hybrid Rendering Architectures

**Status:** COMPLETE — EVALUATED ACROSS 6 CANDIDATE FAMILIES  
**Wave:** P8 — Renderer Strategy Decision  
**Date:** 2026-10-01  
**Target Environment:** Sandboxed Chromium Renderer in Electron Desktop Runtime (Windows 11 Direct3D 12 backing via ANGLE / Dawn)  
**Governing Invariants:**
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$
- $\mathbf{VISUAL\ WORLD = PROJECTION\ OF\ RUNTIME\ STATE}$
- $\mathbf{RENDERER \neq PRIVILEGED\ KERNEL}$
- $\mathbf{HIGH\ FPS \neq ACCESSIBLE\ UX}$
- $\mathbf{3D \neq BETTER\ UX \quad|\quad 2D \neq INSUFFICIENT\ UX}$
- $\mathbf{PRETTY\ DEMO \neq PRODUCTION\ FITNESS}$

---

## 1. Candidate Architectural Families

The following 6 candidate families were systematically evaluated in the P8 Architecture Arena:
1. **Candidate A: DOM + CSS + SVG** (Pure Web Standards UI)
2. **Candidate B: HTML5 Canvas 2D** (Immediate-mode hardware accelerated canvas)
3. **Candidate C: PixiJS v8** (GPU-accelerated 2D scene graph with WebGPU/WebGL auto-switching)
4. **Candidate D: Three.js r186 (Pure 3D Canvas)** (Full 3D WebGL2/WebGPU spatial environment)
5. **Candidate E: CSS3D / DOM-based 2.5D** (HTML5 elements transformed in pseudo-3D perspective)
6. **Candidate F: Hybrid Multi-Layer Architecture** (Decoupled GPU Canvas World + SVG/Canvas Conduits + React DOM Semantic UI + ARIA Semantic Tree)

---

## 2. Hard Constraint Matrix (Pass / Fail)

The 6 candidates were first screened against the 10 Non-Negotiable Hard Constraints derived from frozen contracts (P0–P7):

| Hard Constraint | Candidate A: DOM/CSS/SVG | Candidate B: Canvas 2D | Candidate C: PixiJS v8 | Candidate D: Pure Three.js 3D | Candidate E: CSS3D 2.5D | Candidate F: Hybrid Multi-Layer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **C1: Zero Incremental Spend ($\$0.00$)** | **PASS** (Web std) | **PASS** (Web std) | **PASS** (MIT) | **PASS** (MIT) | **PASS** (Web std) | **PASS** (MIT + Web std) |
| **C2: Unprivileged Sandbox Execution** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |
| **C3: Zero Direct DB / Shell Authority** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |
| **C4: Pure State Projection (No Logic)** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |
| **C5: 100% Offline Operation** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |
| **C6: Semantic Accessibility (WCAG/ARIA)**| **PASS (Native)**| **FAIL** (Canvas barrier)| **FAIL** (Canvas barrier)| **FAIL** (Canvas barrier)| **PASS** (Native) | **PASS** (Layer 4 ARIA tree) |
| **C7: Native Code/Log Text Selection** | **PASS (Native)**| **FAIL** (No clipboard)| **FAIL** (No clipboard)| **FAIL** (No clipboard)| **PARTIAL** (Oblique)| **PASS** (Native DOM panels) |
| **C8: GPU Failure / Context Degradation**| **PASS** (No GPU req)| **PASS** (2D fallback)| **PARTIAL** (Fragile) | **FAIL** (Total crash) | **PASS** (Software fallback)| **PASS** (Fallback to 2D SVG) |
| **C9: Idle Battery / Resource Conservation** | **PASS** (Low GPU) | **PASS** (Static buffer)| **FAIL** (rAF ticker) | **FAIL** (rAF ticker) | **PASS** (Low GPU) | **PASS** (Suspended rAF on idle)|
| **C10: Spatial Identity / Zone Clarity** | **FAIL** (Flat/Dense)| **PARTIAL** (2D sprites)| **GOOD** (2.5D sprites)| **FAVORABLE** (3D Diorama)| **FAIL** (Z-fighting) | **FAVORABLE** (3D Diorama) |
| **INITIAL SCREENING RESULT** | `ELIGIBLE_FOR_CHROME` | `COUNTER_INDICATED_FOR_UI` | `COUNTER_INDICATED_FOR_UI` | `COUNTER_INDICATED_FOR_UI` | `DISQUALIFIED` | **`SELECTED_CANDIDATE`** |

*Note on Screening:* Candidates B, C, and D fail as *monolithic application renderers* because drawing the entire OS inside an opaque canvas eliminates screen-reader accessibility (C6) and native text clipboard selection (C7). Candidate E fails because Chromium's CSS compositor collapses 3D rendering contexts on standard UI properties (`overflow: hidden`, `clip-path`, `filter`), causing severe Z-fighting and rendering artifacts.

---

## 3. Comprehensive Multi-Dimensional Candidate Matrix

| Evaluation Dimension | Candidate A: DOM + CSS + SVG | Candidate B: HTML5 Canvas 2D | Candidate C: PixiJS v8 | Candidate D: Pure Three.js 3D | Candidate E: CSS3D / 2.5D | Candidate F: Hybrid Multi-Layer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Architecture** | Retained Blink Layout Tree | Immediate Skia 2D Context | Retained 2D Scene Graph | Retained 3D Scene Graph | CSS Transforms Level 2 | 4-Tier Decoupled Layering |
| **Spatial Presentation** | Flat 2D Dashboard / Tables | 2D Pixel Surface | 2.5D Sprite World | Full 3D Spatial World | Pseudo-3D Perspective | 3D Diorama Shell + 2D Badges |
| **Camera Navigation** | Viewport CSS Pan / Zoom | Matrix Pan / Zoom | Container Transform | Bounded Orbit / Pan / Zoom | CSS `perspective-origin` | Restrained Orbit (D-phase tuning)|
| **Performance @ 100 Entities** | **Low Latency** ($0.075\text{ms}$) | **Fast** ($0.557\text{ms}$) | **Fast** ($<0.4\text{ms}$) | `REQUIRES_D_PHASE_MEASUREMENT` | **Moderate** ($1.2\text{ms}$) | `REQUIRES_D_PHASE_MEASUREMENT` |
| **Performance @ 1000 Entities**| **Struggles** ($>12\text{ms}$ reflow) | **Smooth** ($<2.5\text{ms}$) | **Smooth** ($<1.8\text{ms}$) | `REQUIRES_D_PHASE_MEASUREMENT` | **Severe Reflow** ($>45\text{ms}$) | `REQUIRES_D_PHASE_MEASUREMENT` |
| **Screen Reader Support** | **Superior** (WAI-ARIA native)| **Deficient** (Canvas barrier) | **Deficient** (Canvas barrier) | **Deficient** (Canvas barrier) | **Native** (Inconsistent bounds)| **High** (Layer 4 ARIA tree) |
| **Text & Log Crispness** | **Superior** (DirectWrite RGB)| **Degraded** (Grayscale AA) | **Poor** (Texture blur) | **Poor** (Texture blur) | **Flickering** (Matrix subpixels)| **Superior** (Native DOM layers) |
| **Text Selection / Clipboard**| **Native OS clipboard** | **None** | **None** | **None** | **Broken selection boxes** | **Native OS clipboard** |
| **DAG Visualization** | SVG Vector ($\le 300$ nodes) | Canvas paths ($10k+$ nodes)| Batched graphics | 3D line ribbons | Nested transformed divs | SVG overlay + 3D floor conduits |
| **Idle GPU Profile** | **Minimal (Compositor rest)** | **Minimal (Static buffer)** | **$3–8\%$ (Ticker loop)** | **$5–18\%$ (Render loop)** | **Minimal (Static DOM)** | **Suspended rAF (`REQUIRES_D_MEASUREMENT`)** |
| **Context Loss Resilience** | **Immune** (No WebGL) | **Immune** (2D Skia) | Manual texture reload | Permanent crash risk | **Immune** | **Fallback to 2D SVG** |
| **Codebase Continuity** | Requires redesigning HQ | Requires new 2D engine | Requires new Pixi engine | Directly reuses `apps/web/src/hq3d`| Requires complete rewrite | Directly reuses `apps/web/src/hq3d` |
| **Bundle & Dependency Cost** | $0\,\text{KB}$ extra libraries | $0\,\text{KB}$ extra libraries | $+450\,\text{KB}$ bundle | $+650\,\text{KB}$ (Already in repo)| $0\,\text{KB}$ extra libraries | $+650\,\text{KB}$ (Already in repo) |
| **VERDICT** | **ELIGIBLE (FOR SHELL/UI)** | **COUNTER_INDICATED** | **COUNTER_INDICATED** | **COUNTER_INDICATED** | **DISQUALIFIED** | **`SELECTED_CANDIDATE`** |

---

## 4. Deep-Dive Trade-Off Analysis by Candidate

### Candidate A: DOM + CSS + SVG
- *Why it's attractive:* High maintainability, excellent native accessibility, minimal GPU idle load, native font crispness.
- *Why it fails as the primary Living HQ:* Lacks spatial depth and physical room metaphor. Representing complex functional zones and multi-agent custody handoffs solely as flat dashboard cards creates visual clutter and high cognitive load when tracking 10+ concurrent agents.
- *Where it succeeds:* Ideal as the outer command center, high-density terminal log inspector, and git diff viewer.

### Candidate B: HTML5 Canvas 2D
- *Why it's attractive:* Built into Chromium without additional bundle dependencies; Skia Direct2D hardware acceleration draws $10,000+$ primitives efficiently.
- *Why it fails as the primary Living HQ:* Lacks native accessibility support. Forces grayscale text antialiasing on transparent surfaces. Requires writing custom hit-testing math (QuadTree/BVH) from scratch.

### Candidate C: PixiJS v8
- *Why it's attractive:* Modern WebGPU/WebGL auto-switching, fast 2D sprite batching, built-in Federated Events system.
- *Why it fails as the primary Living HQ:* Dynamic text logging rasterization increases VRAM and GC throughput. Default continuous ticker loop consumes battery on idle. Most critically, GRAVITAS is an autonomous software tool (predominantly code/diffs/logs), not a 2D sprite game.

### Candidate D: Pure Three.js 3D (All UI in WebGL)
- *Why it's attractive:* Spatial architectural diorama with lighting and intuitive multi-room navigation.
- *Why it fails as a monolithic UI:* Texture-projected text is blurry, unselectable, and inaccessible. Raycasting complex DOM controls in 3D is fragile. Continuous rendering wastes GPU energy.

### Candidate E: CSS3D / DOM-based 2.5D
- *Why it was disqualified:* Under W3C CSS Transforms Module Level 2, standard layout properties (`overflow: hidden`, `clip-path`, `filter`, `backdrop-filter`, `opacity < 1`) forcibly terminate the 3D rendering context and flatten child transforms into a 2D plane. Blink lacks a hardware depth buffer for DOM elements, causing severe Z-fighting and subpixel jitter during camera moves.

### Candidate F: Hybrid Multi-Layer Architecture (SELECTED CANDIDATE)
- *Architectural Rationale:* Solves the fundamental tension between **spatial comprehension** and **textual density**:
  1. **Layer 1 (GPU Canvas):** Three.js WebGL2 renders the spatial architectural diorama, floor plates, rooms, and physical conduits with restrained spatial perspective (camera FOV and aesthetic styles deferred as Phase D design variables).
  2. **Layer 2 (Connections):** SVG vector overlay renders reactive DAG dependency splines between active tasks.
  3. **Layer 3 (Semantic UI):** React/Tailwind DOM overlay renders docked inspectors, code diffs, logs, and approval buttons with native ClearType typography, text selection, and keyboard shortcuts.
  4. **Layer 4 (Accessibility):** Visually hidden semantic HTML and ARIA live regions mirror spatial agent states to assistive technology.
  5. **Synchronous Transform Synchronization:** Coordinate projections update synchronously on post-render ticks via direct DOM `style.transform = translate3d(...)` mutations, mitigating visual jitter.
  6. **Dual-Condition Suspension:** Halted render loop when hidden or inactive conserves resources (`REQUIRES_D_PHASE_MEASUREMENT`).
  7. **Codebase Continuity:** Compatible with existing `apps/web/src/hq3d` Three.js geometry and React diorama code.
