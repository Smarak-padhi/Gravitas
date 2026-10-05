# GRAVITAS — WAVE P8 ARCHITECTURE ARENA DECISION PACKET
## Decision Packet: `ADP-P8-001` (Adaptive Living HQ Rendering Architecture)

**Packet ID:** `ADP-P8-001`  
**Status:** COMPLETE — DECISION READY FOR HUMAN RATIFICATION  
**Target Wave:** Wave P8 — Visual & Renderer Strategy Decision  
**Date:** 2026-10-01  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335` (Clean working tree)  
**Governing Invariants:**
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$
- $\mathbf{VISUAL\ WORLD = PROJECTION\ OF\ RUNTIME\ STATE \quad (\text{NEVER THE SOURCE OF TRUTH})}$
- $\mathbf{RENDERER \neq PRIVILEGED\ KERNEL}$
- $\mathbf{UI\ COMPROMISE \neq UNRESTRICTED\ OS\ AUTHORITY}$
- $\mathbf{HIGH\ FPS \neq ACCESSIBLE\ UX}$
- $\mathbf{3D \neq BETTER\ UX \quad|\quad 2D \neq INSUFFICIENT\ UX}$
- $\mathbf{FRAMEWORK\ POPULARITY \neq RENDERER\ FITNESS}$
- $\mathbf{P8\ DECISION \neq PRODUCTION\ UI\ IMPLEMENTATION}$

---

## 1. Executive Summary & Canonical Decision

### Canonical Question
> *"What rendering architecture should GRAVITAS use for its adaptive Living HQ inside the frozen Electron desktop runtime?"*

### Selected Renderer Architecture
$$\mathbf{SELECTED\_RENDERER\_ARCHITECTURE = CANDIDATE\ F\ (HYBRID\ MULTI-LAYER\ ARCHITECTURE)}$$

GRAVITAS selects a **Decoupled 4-Tier Hybrid Architecture**:
1. **Tier 1 (Spatial World Layer):** GPU Canvas powered by **Three.js (WebGL2 / TSL)** rendering an architectural diorama with restrained spatial perspective, room boundaries, furniture representations, and locomotion. *(Specific visual variables such as camera FOV, lens profile, lighting/shadow parameters, and aesthetic style are unconstrained architectural options classified as Phase D design variables).*
2. **Tier 2 (Connection & Flow Layer):** Resolution-independent **SVG Vector Overlay** for task dependency DAGs, reactive conduits, and handoff arcs.
3. **Tier 3 (Semantic UI & Inspection Layer):** Standard **React / Tailwind DOM Overlay** for high-density code diffs, execution logs, JSON dossiers, command palette, and human approval modals with native OS typography and clipboard selection.
4. **Tier 4 (Accessibility & Assistive Layer):** Visually hidden **Semantic HTML / ARIA Live Regions** mirroring all agent and task states to assistive technology.

---

## 2. Decision Sequence & Arena Evaluation

Per Wave P8 mandate, the decision was evaluated across the 14-stage sequence:

1. **Hard Constraints:** Monolithic Canvas approaches (Pure Canvas 2D, Pure PixiJS, Pure Three.js) were screened out for primary UI due to severe barriers in screen-reader accessibility and text clipboard selection. CSS3D was disqualified due to browser composition collapsing on standard UI properties (`overflow`, `clip-path`, `filter`).
2. **Empirical Evidence & Benchmark Scope:**
   - Host micro-probes (`EXP-P8-01`, `EXP-P8-02`) demonstrated that synthetic 3D-to-2D projection math is inexpensive ($\le 0.26\,\text{ms}$ CPU time per frame on tested host/workload), and DOM `translate3d` billboard mutations executed in $0.075\,\text{ms}$ in a bounded CPU-side micro-benchmark.
   - **Crucial Scope Clarification:** Browser microbenchmarks were conducted with `--headless --disable-gpu` and did NOT benchmark Three.js or GPU rendering. Actual world-layer performance `REQUIRES_D_PHASE_PROTOTYPE_MEASUREMENT`.
3. **Operational Comprehension:** Evaluated the 2D vs 2.5D vs 3D question:
   - *Verdict:* A restrained spatial diorama provides clear mental compartmentalization of cognitive functional areas without wide-angle distortion.
   - Dense code diffs, logs, and terminals live strictly in orthogonal 2D DOM panels.
4. **Accessibility:** Candidate F enforces **Full Non-Visual Functional Equivalence as a Required Acceptance Criterion**. Living HQ functionality must be operable via Layer 4 ARIA live regions and keyboard navigation; verification across screen readers `REQUIRES_D_PHASE_PROTOTYPE_MEASUREMENT`.
5. **Security:** Reduced privileged authority in renderer (`nodeIntegration: false`, `sandbox: true`, `contextIsolation: true`). Untrusted tool outputs are sanitized before DOM rendering. Visual state is never accepted as proof of approval; human approvals resolve against canonical Kernel cryptographic hashes.
6. **Performance & Idle Resource Lifecycle:** When hidden or inactive, the world render loop halts and nonessential animation is suspended; the actual idle resource floor `REQUIRES_D_PHASE_MEASUREMENT`. Synchronous transform updates bypass React fiber reconciliation, reducing visual jitter.
7. **Maintainability:** 100% TypeScript. Directly reuses existing `apps/web/src/hq3d` Three.js geometry, materials, and React diorama patterns. No custom game engine code required.
8. **Electron / P7 Compatibility:** Aligned with the frozen P7 Electron container and Chromium Direct3D 12 graphics backing.
9. **Failure Recovery:** 4-tier degradation ladder (`FULL_VISUAL_MODE` $\to$ `REDUCED_VISUAL_MODE` $\to$ `SEMANTIC_2D_MODE` $\to$ `COMMAND_CENTER_ONLY_MODE`). Context loss recovery is an architectural requirement that `REQUIRES_IMPLEMENTATION_VALIDATION`.
10. **Graceful Degradation:** Machine resumes from sleep, driver crashes, and hardware acceleration disabling are handled without impacting the running P6 Kernel.
11. **Testing:** Deterministic unit tests for projection math, Playwright headless screenshot regression, and axe-core accessibility tree testing.
12. **Zero-Spend:** MIT / permissive web standards. Zero cloud rendering or proprietary tooling costs ($\mathbf{\Delta\text{Spend} = \$0.00}$).
13. **Uncertainty Classification:** WebGPU/Dawn production stability for custom compute shaders classified as `REQUIRES_D_PHASE_PROTOTYPE_MEASUREMENT`. WebGL2 provides the frozen production baseline today.
14. **Reversibility:** Clean separation via `ProjectionAdapter` interface ensures the P6 Kernel has no direct coupling to Three.js or DOM types.

---

## 3. Explicit Layer Ownership Matrix

| Architectural Layer | Technology Stack | Visual Responsibility | Lifecycle Rhythm | Resource Target / Status |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 1: Spatial World** | Three.js WebGL2 (DPR capped $\le 2.0$) | Diorama rooms, floors, desks, lighting, locomotion, floor conduits. | 60 FPS rAF when active; render loop suspended when hidden/inactive. | Actual idle floor `REQUIRES_D_PHASE_MEASUREMENT`. |
| **Layer 2: Connections & DAG**| SVG Vector Overlay | Task dependency DAG splines, animated handoff arcs, flow pulses. | React-driven or CSS stroke animation. | DOM nodes: targeted $\le 300$ elements; $< 5\,\text{MB}$ heap. |
| **Layer 3: Semantic UI** | React 19 / Tailwind / DOM | Docked inspectors, code diffs, execution logs, terminal, approval modals. | Standard React event cycle; virtualized lists for long logs. | Standard Blink memory; ClearType subpixel text rendering. |
| **Layer 4: Accessibility** | HTML5 / WAI-ARIA | Screen reader announcements (`aria-live="polite"`), focus navigation. | Immediate upon Kernel event emission. | Negligible ($\sim 1\,\text{KB}$ DOM tree); acceptance criterion. |

---

## 4. 2D vs 2.5D vs 3D Architectural Verdict

| Dimension | 2D Flat / Isometric | Pure 3D Canvas | Hybrid (Restrained Spatial Shell + 2D DOM) |
| :--- | :--- | :--- | :--- |
| **Spatial Identity & Mental Model** | Flat dashboard cards; lacks physical presence and zone separation. | High spatial presence; disorienting when unconstrained; high cognitive load. | **Favorable: Clear spatial zones + tactile presence without perspective distortion.** |
| **Code & Log Legibility** | High (Native DOM typography). | Deficient (Rasterized canvas textures are blurred, unselectable, and inaccessible). | **High Fidelity: Native DOM panels, subpixel antialiasing, and native OS clipboard.** |
| **Camera Distraction / Motion** | Low. | High risk (Unconstrained orbit/wide FOV causes disorientation). | **Controlled: Bounded orbit, restrained angle, direct transitions under Reduced Motion.** |
| **Screen Reader Usability** | High (Standard DOM). | Deficient (Canvas lacks native semantic accessibility without parallel tree). | **High Requirement: Parallel ARIA live regions and keyboard-driven station navigation.** |
| **VERDICT** | `ACCEPTABLE FOR COMMAND CENTER` | `COUNTER_INDICATED FOR PRIMARY UI` | **`SELECTED ARCHITECTURE`** |

---

## 5. Decision Ratification Sign-Off

```
================================================================================
GRAVITAS WAVE P8 ARCHITECTURE ARENA RATIFICATION
Decision Packet: ADP-P8-001
Selected Architecture: Candidate F (Hybrid Multi-Layer Architecture)
Core Framework: Three.js WebGL2 (Layer 1) + SVG (Layer 2) + React DOM (Layer 3 & 4)
Camera Profile: Restrained Telephoto (reference baseline, calibrated in Phase D), Bounded Orbit
Status: PASSED — NO BLOCKING CRITIQUES — READY FOR HUMAN REVIEW
================================================================================
```
