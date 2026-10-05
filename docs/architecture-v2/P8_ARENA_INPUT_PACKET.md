# P8 ARENA INPUT PACKET: RENDERER & ADAPTIVE WORLD ARCHITECTURE
## Evidence-Backed Decision Dossier for Upcoming Wave P8

**Status:** ARCHITECTURAL INPUT DOSSIER — P5 DOGFOODING DELIVERABLE  
**Target Wave:** Wave P8 — Renderer & UI Architecture Bake-Off  
**Date:** 2026-09-30  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants:**
- $\mathbf{VISUAL\ WORLD = PROJECTION\ OF\ RUNTIME\ STATE \quad (\text{NEVER THE SOURCE OF TRUTH})}$
- $\mathbf{RUNTIME\ TRUTH > VISUAL\ EFFECT}$
- $\mathbf{ACCESSIBILITY \neq OPTIONAL}$
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$
- $\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$

---

## 1. Canonical Question & Context

### Primary Question
> Which renderer and UI architecture families could support the future GRAVITAS command center and adaptive 2.5D/3D spatial agent world without compromising accessibility, system performance, text legibility, developer maintainability, or underlying runtime truth?

### Foundational Invariant: World as State Projection
In GRAVITAS, the graphical user interface—whether flat dashboard, isometric 2.5D grid, or full 3D environment—is strictly a **reactive projection** of immutable state emitted by the kernel. The renderer possesses zero authority to modify task graphs, dispatch tools, or invent state transitions. If the UI process crashes, the underlying operating system continues executing untouched.

---

## 2. Hard Constraint & Accessibility Filtering

| Candidate Renderer Family | Zero-Spend Invariant ($\$0.00$) | Accessibility & Screen Reader Viable | Text Rendering Legibility (Code/Logs) | Low-End GPU & Background Idle Feasibility | Eligibility Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Family 1: Pure Modern DOM / CSS (HTML5/Tailwind/React)** | **PASS** (Zero cost) | **SUPERIOR** (Native browser ARIA & keyboard focus) | **SUPERIOR** (Subpixel native font rendering) | **SUPERIOR** [ILLUSTRATIVE: 0% GPU at idle] | `ELIGIBLE` |
| **Family 2: 2D / 2.5D Canvas / WebGL (PixiJS / Canvas2D)** | **PASS** (Zero cost; MIT) | **POOR** (Requires manual ARIA mirror tree) | **MEDIUM** (Canvas text rasterization blur) | **ACCEPTABLE** [ILLUSTRATIVE: minimal GPU idle] | `ELIGIBLE_FOR_VIEWPORT` |
| **Family 3: Full 3D WebGL / WebGPU (Three.js / React Three Fiber)**| **PASS** (Zero cost; MIT) | **COUNTER-INDICATED FOR CORE CONTROLS** (Cannot render accessible forms/terminals in 3D without parallel DOM mirror)| **POOR** (3D perspective text distortion) | **POOR** (Continuous render loop consumes GPU cycles) | `COUNTER_INDICATED FOR CORE OPERATIONAL UI` |
| **Family 4: Hybrid Composition (DOM Chrome + 3D/2.5D Canvas Viewport)**| **PASS** (Zero cost) | **PASS** (All interactive controls in DOM; canvas is visual-only)| **SUPERIOR** (Logs/terminals in native DOM) | **PASS** (Canvas render loop paused when idle) | `ELIGIBLE` |

> [!NOTE]
> **Assessment of Monolithic 3D Canvas for Primary UI:** A monolithic WebGL canvas that renders the entire operating system (buttons, forms, diff inspectors, terminal logs) in 3D is strongly counter-indicated under accessibility and text usability constraints. It compromises screen reader accessibility, breaks native OS text selection and copy-paste, degrades font rendering, and increases background battery consumption. P8 renderer bake-off should evaluate 3D rendering as a projection viewport rather than a full UI replacement.

---

## 3. Deep-Dive on Eligible Architecture Families for P8 Evaluation

### Family 1: Pure Modern DOM / CSS (High-Density Professional Dashboard)
* **Description:** Constructed using modern declarative web UI (React, Tailwind CSS, virtualized lists for logs/diffs, SVG for DAG visualization).
* **Trade-Offs:** Maximum accessibility; perfect font rendering; instant keyboard navigation; minimal GPU overhead; lowest implementation complexity. However, it lacks spatial "world" metaphor and provides limited immersion for multi-agent spatial coordination.

### Family 4: Hybrid Composition (DOM Operational Chrome + 2.5D/3D Viewport)
* **Description:** The outer application shell (Task DAGs, Inspector, Terminal, Execution Surface status, Approval Modals) is rendered in standard accessible DOM/CSS. An embedded `<canvas>` element (powered by PixiJS, Three.js, or CSS 3D Transforms) renders the spatial "agent office" or "spatial node graph" as a decorative/spatial projection.
* **Trade-Offs:** Balances high-density operational controls, accessible text widgets, and native clipboard functionality with rich spatial visualization. The 3D canvas can be minimized or toggled off with zero loss of operational capability. Requires managing synchronization between the DOM state and the WebGL scene graph.

---

## 4. 2.5D Isometric vs. Full 3D Space Analysis

* **2.5D Isometric Projection (e.g. PixiJS or CSS 3D):**
  * *Advantages:* Predictable fixed camera angles; no perspective distortion; simpler asset creation; lower computational overhead; tactical "command center" aesthetics.
  * *Suitability:* Well-suited for displaying agent desks, status rooms, and discrete state transitions.
* **Full 3D Perspective (e.g. Three.js / R3F):**
  * *Advantages:* Complete camera freedom, dynamic lighting, cinematic zoom into active worker nodes.
  * *Disadvantages:* Disorienting camera navigation; occlusion (objects hiding behind others); higher asset production and render costs.

---

## 5. Comparative Trade-Off Matrix

| Evaluation Dimension | Family 1: Pure DOM/CSS Dashboard | Family 4A: Hybrid (DOM + 2.5D PixiJS) | Family 4B: Hybrid (DOM + Three.js 3D) |
| :--- | :--- | :--- | :--- |
| **Accessibility Compliance** | `SUPERIOR` | `SUPERIOR` (DOM controls) | `SUPERIOR` (DOM controls) |
| **Code & Terminal Legibility**| `SUPERIOR` (Native OS text) | `SUPERIOR` (DOM overlay) | `SUPERIOR` (DOM overlay) |
| **Visual Immersion / Spatial**| `LOW` (Flat dashboard) | `HIGH` (Tactical 2.5D view) | `MAXIMUM` (Cinematic 3D) |
| **Idle GPU & Battery Impact** | `MINIMAL` | `LOW` [ILLUSTRATIVE ESTIMATE, probe in P8] | `MODERATE` [ILLUSTRATIVE ESTIMATE, probe in P8] |
| **Maintenance Complexity** | `LOW` | `MEDIUM` | `HIGH` |
| **Zero-Spend Risk** | `ZERO` | `ZERO` | `ZERO` |

---

## 6. Active Contradictions & Uncertainties

* **Contradiction CON-P8-01 (CSS 3D Transforms vs WebGL/Three.js for 2.5D):**
  * *Claim A:* Modern CSS 3D transforms (`perspective`, `rotateX`, `translateZ`) can render an isometric spatial agent room with zero external dependencies and native DOM elements.
  * *Claim B:* CSS 3D transforms hitch during rapid multi-element animations and lack custom shader effects; WebGL/Three.js provides smoother hardware-accelerated animations.
  * *Status:* `REQUIRES_EXPERIMENT` during P8 UI prototype spike.
* **Uncertainty UNC-P8-01:** Operator preference for spatial immersion vs. flat utilitarian density during prolonged programming sessions.

---

## 7. Synthesizer Neutral Summary & Future-Wave Boundaries

$$\mathbf{P5\ RENDERER\ RESEARCH \neq P8\ RENDERER\ DECISION}$$

The Arena dogfooding analysis indicates that while rendering core interactive UI elements (forms, terminals, diffs) in raw WebGL/3D canvas introduces severe accessibility and usability friction, multiple viable paths remain open for Wave P8:
* **Option A (Pure DOM/CSS):** Focuses entirely on maximum density, speed, and standard accessibility without spatial rendering.
* **Option B (Hybrid DOM + 2.5D Isometric Canvas):** Retains accessible DOM chrome while offering a tactical, lightweight spatial view of agent activity.
* **Option C (Hybrid DOM + 3D Viewport):** Combines accessible DOM chrome with a full 3D interactive scene graph.

**Wave P8 retains absolute architectural authority** to design and conduct its renderer bake-off, benchmark candidate rendering technologies, and select the final UI architecture for GRAVITAS.
