# GRAVITAS — WAVE P8 TARGET RENDERER ARCHITECTURE
## Canonical Specification for Adaptive Living HQ Rendering Architecture

**Status:** APPROVED ARCHITECTURAL SPECIFICATION  
**Wave:** P8 — Renderer Strategy Decision  
**Date:** 2026-10-01  
**Target Environment:** Sandboxed Chromium Renderer in Electron Desktop Runtime (Windows 11 Direct3D 12 backing via ANGLE / Dawn)  
**Governing Invariants:**
- $\mathbf{VISUAL\ WORLD = PROJECTION\ OF\ RUNTIME\ STATE \quad (\text{NEVER THE SOURCE OF TRUTH})}$
- $\mathbf{RENDERER \neq PRIVILEGED\ KERNEL}$
- $\mathbf{RENDERER \neq SIMULATION\ AUTHORITY}$
- $\mathbf{VISUAL\ ENTITY \neq CANONICAL\ AGENT\ STATE}$
- $\mathbf{SCENE\ GRAPH \neq CONTROL\text{-}PLANE\ GRAPH}$
- $\mathbf{GPU\ STATE \neq DURABLE\ STATE}$
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$

---

## 1. High-Level System Architecture

GRAVITAS Living HQ adopts a **4-Tier Decoupled Hybrid Architecture**, separating spatial geometry, topological graphs, high-density textual user interfaces, and accessibility trees into dedicated rendering surfaces:

```
+-----------------------------------------------------------------------------------------+
| ELECTRON CHROMIUM SANDBOXED RENDERER                                                    |
|                                                                                         |
| +-------------------------------------------------------------------------------------+ |
| | LAYER 4: ACCESSIBILITY TREE (Visually Hidden HTML5 / ARIA Live Regions)              | |
| | - aria-live="polite" / aria-live="assertive" streaming system announcements          | |
| | - Focusable navigation anchors for keyboard-driven station hopping                  | |
| +-------------------------------------------------------------------------------------+ |
|                                            ^                                            |
| +-------------------------------------------------------------------------------------+ |
| | LAYER 3: SEMANTIC UI & INSPECTOR PANELS (React 19 / DOM / Tailwind CSS)              | |
| | - Contextual Inspector, Git Diffs, Execution Logs, Monaco, Approval Plinths          | |
| | - pointer-events: none root; pointer-events: auto on interactive cards               | |
| | - Subpixel DirectWrite typography; native clipboard selection; orthogonal 2D layout  | |
| +-------------------------------------------------------------------------------------+ |
|                                            ^                                            |
| +-------------------------------------------------------------------------------------+ |
| | LAYER 2: TOPOLOGICAL CONNECTION OVERLAY (Screen-Space SVG Vector Canvas)              | |
| | - Task DAG dependency splines, reactive bezier handoff arcs, animated pulses         | |
| | - Coordinates dynamically mapped from 3D world anchors                               | |
| +-------------------------------------------------------------------------------------+ |
|                                            ^                                            |
| +-------------------------------------------------------------------------------------+ |
| | LAYER 1: SPATIAL WORLD VIEWPORT (Three.js WebGL2 / TSL Canvas)                      | |
| | - Restrained spatial architectural diorama (calibrated in Phase D)                  | |
| | - Functional zones, furniture representations, and physical conduits                | |
| | - Dual-condition render loop suspension (idle floor: REQUIRES_D_MEASUREMENT)        | |
| +-------------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------------+
                                            ^
                                (Unidirectional IPC Events)
+-----------------------------------------------------------------------------------------+
| ELECTRON MAIN PROCESS (DesktopSupervisor) <--> HEADLESS NODE KERNEL (State Authority)  |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Layer Contracts & Implementation Specifications

### 2.1 Layer 1: Spatial World Viewport (Three.js WebGL2)
- **Role:** Provides spatial presence, architectural zone compartmentalization, and locomotion.
- **Architectural Scope Boundary:** Wave P8 freezes the **architectural capability** to host a restrained 2.5D/3D spatial diorama in WebGL2/Three.js. Specific visual variables—including exact camera FOV, lens profile, lighting and shadow parameters, ambient locomotion styling, room geometry, and aesthetic art direction—are unconstrained architectural options classified as **Phase D design variables**.
- **Renderer Settings (Non-Normative Baseline Baseline):**
  - `canvas`: Dedicated `<canvas>` filling the viewport container.
  - `antialias: true`, `alpha: false`, `powerPreference: 'high-performance'`.
  - Pixel Ratio capped at $\le 2.0$ via `Math.min(window.devicePixelRatio, 2.0)` to respect GPU budget on high-DPI displays.
- **Camera Rig Architecture:**
  - `THREE.PerspectiveCamera` or `THREE.OrthographicCamera` configured with restrained perspective/isometric framing to prevent wide-angle edge distortion.
- **Loop Lifecycle & Idle Resources:**
  - When hidden (`document.hidden === true`) or when the active view route is non-spatial (`TIMELINE`, `COMMAND_CENTER`), nonessential animation is suspended and the render loop is halted where safe. The actual idle resource floor (CPU/GPU/memory) `REQUIRES_D_PHASE_MEASUREMENT`.

### 2.2 Layer 2: Topological Connection Overlay (SVG Vector)
- **Role:** Renders directed acyclic graph (DAG) edges, dependency conduits, and handoff arcs.
- **Implementation:**
  - Single `<svg class="absolute inset-0 pointer-events-none overflow-hidden">`.
  - Edges rendered as smooth cubic bezier paths (`<path d="M x1 y1 C cx1 cy1, cx2 cy2, x2 y2" />`).
  - Animated flow pulses driven via hardware-accelerated CSS `stroke-dashoffset`.
  - Scalability limit: Targeted for graphs with moderate connection counts ($\le 300\text{--}500$ concurrent visible edges). If task graphs exceed this threshold, edges switch to 3D floor conduit geometry (`handoffConduits.ts`) or instanced 2D Canvas lines.

### 2.3 Layer 3: Semantic UI & Inspector Layer (React 19 / DOM)
- **Role:** All interactive cards, agent status speech bubbles, code diff viewers, execution logs, terminal panels, and human approval triggers.
- **Container Boundary:** `<div style="position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 20;">`.
- **Text Integrity:** Uses native DOM text with Windows DirectWrite subpixel ClearType antialiasing, native mouse selection, and clipboard copy/paste. No long-form text rasterization into WebGL textures.

### 2.4 Layer 4: Accessibility Tree (Semantic DOM / ARIA)
- **Role:** Full Non-Visual Functional Equivalence as a **Required Acceptance Criterion** for operators using screen readers (NVDA, JAWS, VoiceOver).
- **Structure:**
  - `<div class="sr-only" role="region" aria-label="GRAVITAS Operational Status">`
  - Streaming status updates announced via `<div role="status" aria-live="polite">`.
  - Critical errors and human approval requests announced via `<div role="alert" aria-live="assertive">`.
  - Accessible station list: `<nav aria-label="HQ Rooms">` with buttons bound to keyboard shortcuts that trigger camera framing to designated rooms.

---

## 3. Coordinate Synchronization & Jitter Elimination Contract

To prevent sub-pixel drift and temporal shearing between the 3D canvas and the 2D DOM cards:

1. **Synchronous Post-Render Hook:**
   - Coordinate projection must execute **synchronously on the 3D Director's post-render tick**, immediately after `renderer.render(scene, camera)`.
   - **Prohibited:** Never use `setInterval()` or React `useState` / `useEffect` cycles for 60 FPS coordinate tracking.
2. **Direct DOM Transform Mutation:**
   - Anchor positions are updated directly on DOM elements via direct element references (`elementRef.current.style.transform = ...`):
     ```typescript
     const v = tempVector.copy(worldAnchor).project(camera);
     if (v.z > 1.0) {
       element.style.display = 'none'; // Behind camera frustum
     } else {
       element.style.display = '';
       const x = ((v.x + 1) * 0.5) * rectWidth;
       const y = ((-v.y + 1) * 0.5) * rectHeight;
       element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
     }
     ```
   - *Result:* Mutations bypass Blink layout and paint, executing directly on Chromium's compositor thread with high frame-rate responsiveness.

---

## 4. Pointer Interaction & Capture Model

1. **Pass-Through Default:**
   - The overlay root is `pointer-events: none`. Unhandled clicks fall through to the canvas for 3D raycasting (`HqPicking`).
2. **Interactive Isolation:**
   - Floating cards and inspector drawers declare `pointer-events: auto`. Clicks on buttons or inputs stop propagation to prevent accidental 3D deselects.
3. **Drag Pointer Capture:**
   - On canvas `pointerdown`, invoke `canvas.setPointerCapture(e.pointerId)`.
   - On canvas `pointerup`, invoke `canvas.releasePointerCapture(e.pointerId)`.
   - *Result:* Ensures that camera orbit drags remain locked to the canvas even when the cursor sweeps across floating DOM panels or leaves the window.

---

## 5. Architectural Degradation Ladder

If hardware acceleration fails or WebGL experiences unrecoverable context loss, GRAVITAS defines a structured architectural degradation ladder:

```
[Level 1: FULL_VISUAL_MODE]
  Three.js Spatial World + SVG Conduits + DOM Panels + ARIA Tree
         |
         | (High frame-time or low-tier GPU detected)
         v
[Level 2: REDUCED_VISUAL_MODE]
  Visual effects simplified, DPR capped, unlit shaders
         |
         | (WebGL context lost / GPU process crashed / driver failure)
         v
[Level 3: SEMANTIC_2D_MODE]
  Fallback to 2D SVG OfficeFloor (apps/web/src/components/OfficeFloor.tsx)
         |
         | (Headless / low-power / terminal preference)
         v
[Level 4: COMMAND_CENTER_ONLY_MODE]
  Pure DOM high-density dashboard (DAG table, execution logs, approvals)
```

- **Distinction Formalized:** Distinguish **ARCHITECTURAL RECOVERY REQUIREMENT** from **EMPIRICALLY VERIFIED RECOVERY**.
- Seamless or interruption-free recovery is an architectural acceptance criterion that `REQUIRES_IMPLEMENTATION_VALIDATION`. Context and device loss handling must be empirically validated during Phase D/implementation.
- GPU failure must not impair the underlying P6 Kernel or block autonomous work execution.
