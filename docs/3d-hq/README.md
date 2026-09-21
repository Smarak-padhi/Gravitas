# GRAVITAS 3D HEADQUARTERS — ARCHITECTURE & SPECIFICATIONS
## Wave 12A-R Frozen Documentation Index

> **STATUS**: ARCHITECTURE FROZEN · PENDING HUMAN APPROVAL TO COMMENCE WAVE 12B  
> **CURRENT WAVE**: WAVE 12A-R (Planning Corrections & Architecture Freeze)  
> **NEXT WAVE**: WAVE 12B (Scene Foundation & Architectural Blockout)  
> **BRANCH**: `feat/v0-golden-loop`  
> **TARGET DIRECTORY**: `docs/3d-hq/`

---

## 1. Executive Summary

GRAVITAS is evolving from a conventional flat dashboard into a **Living 3D Multi-Agent Operations Headquarters** — a persistent, spatial visualization of real-time multi-agent software engineering.

In this spatial environment:
- **Workers** (Codex, FCC / Claude, Astra) are represented as stylized, miniature architectural figures at dedicated workstations.
- **Tasks** are physical work items that materialize, route across the floor along recessed optical conduits, and link through visible dependency lines.
- **Verification** is physically separated into an isolated **Verification Lab** cleanroom with its own distinct authority (`Independent Verifier`).
- **Browser QA** is a dedicated deterministic device matrix bench within the Verification Lab.
- **Inference Gateways & Providers** (OmniRoute, Anthropic, OpenAI, local models) are represented strictly as **Infrastructure** in a separate server room — never as humanoid characters.
- **Human Approval** occupies an elevated **Approval Control Mezzanine** where candidate code mutations halt until explicitly signed off or rejected by the **human user**. No synthetic character pretends to approve code.
- **Detailed code/logs/diffs/evidence** remain readable, high-density **2D interfaces** docked alongside the world.

### Inviolable Architectural Principles
1. **The World is a Deterministic Projection of Authoritative Runtime State**: The 3D scene never listens directly to raw, chaotic SSE events, nor does it maintain speculative local business state. All 3D objects, character poses, packet positions, and room lighting derive deterministically from canonical backend contracts (`Run`, `Task`, `ExecutionContract`, `GravitasEvent`).
2. **Zero Fake Simulation**: There is no manufactured idle wandering, no fake progress timers, no pretend coffee breaks, and no cosmetic typing animations without an active, authoritative `RUNNING` task. If an agent is idle, they stand or sit quietly at rest.
3. **No Steampunk Spectacle**: Modern, architectural, tactile, quietly futuristic. No brass pneumatic tubes, no twin-pan balance scales, no Victorian mechanical contraptions.
4. **The User is the Operator**: Approval Control represents the user's control station. Zero fake System Operator NPCs.
5. **Strict Separation of Concerns (3D Spatial State vs. 2D Dense Information)**: 3D excels at spatial presence, task custody, concurrent handoffs, dependency topologies, and system health. 2D excels at reading git diffs, inspecting JSON contracts, reviewing test traces, and triggering governance actions.
6. **Resilient Dual-Mode Parity**: The existing 2D Command Center (`OFFICE`, `GRAPH`, `EVIDENCE`, `TIMELINE`, `AGENTS`) remains 100% operational as a zero-WebGL fallback and accessible interface. The 3D HQ acts as the premier spatial viewport without weakening backend or frontend stability.

---

## 2. Specification Index

| Document | Purpose & Scope |
| :--- | :--- |
| **[01. FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md)** | Ground-truth audit of the existing Vite/React 19 frontend, workspace structure, SSE hub, current 2D canvas, styling tokens, and integration seam. |
| **[02. PRODUCT_MODEL.md](./PRODUCT_MODEL.md)** | Product definition, operational mental model, spatial golden loop, entity roles, and governance boundaries. |
| **[03. WORLD_LAYOUT.md](./WORLD_LAYOUT.md)** | Architectural zones, zone dimensions, spatial hierarchy, occlusion avoidance, and ASCII floorplans. |
| **[04. WORLD_STATE_MODEL.md](./WORLD_STATE_MODEL.md)** | Deterministic adapter contract (`Canonical Runtime State -> World Projection Adapter -> World State -> 3D Presentation`). |
| **[05. EVENT_WORLD_MAPPING.md](./EVENT_WORLD_MAPPING.md)** | Comprehensive reaction matrix for all 28 canonical Gravitas backend events across characters, world, and 2D UI. |
| **[06. CHARACTER_SYSTEM.md](./CHARACTER_SYSTEM.md)** | Character archetypes, silhouettes, station assignments, state poses, and the asset evaluation pipeline. |
| **[07. NAVIGATION_GRAPH.md](./NAVIGATION_GRAPH.md)** | Deterministic spatial waypoints, node connections, transit corridors, and pathing rules. |
| **[08. CAMERA_INTERACTION.md](./CAMERA_INTERACTION.md)** | Camera projection, preset framing modes, bounding constraints, raycast picking, and keyboard controls. |
| **[09. VISUAL_DIRECTION.md](./VISUAL_DIRECTION.md)** | "Modern Architectural Miniature" aesthetic: lighting, PBR materials, color palettes, and visual hierarchy. |
| **[10. MOTION_SYSTEM.md](./MOTION_SYSTEM.md)** | Kinetic grammar, duration families, easing curves, interruptibility rules, and `prefers-reduced-motion` fallbacks. |
| **[11. TECH_STACK_DECISION.md](./TECH_STACK_DECISION.md)** | Comparative evaluation: Vanilla Three.js vs. React Three Fiber (R3F v9) + Drei in React 19 / Vite. Final stack recommendation. |
| **[12. PERFORMANCE_BUDGET.md](./PERFORMANCE_BUDGET.md)** | Measured performance targets: draw calls, triangles, texture memory, frame rates, and dual-condition suspension. |
| **[13. ACCESSIBILITY.md](./ACCESSIBILITY.md)** | Targeted ARIA controls, default view strategy, keyboard navigation, and zero-WebGL fallback modes. |
| **[14. TEST_STRATEGY.md](./TEST_STRATEGY.md)** | Multi-tier test harness: adapter unit tests, headless Three.js projection tests, Playwright browser E2E, and deterministic visual QA. |
| **[15. IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** | Phased 12B–12L sequence, explicit acceptance gates, and strict Wave 12B scene foundation scope. |

---

## 3. Wave 12A-R Gate Checklist

- [x] All planning corrections applied across all documentation files.
- [x] Event semantics audited: `TASK_READY` does not assign workers; authoritative assignment enforced.
- [x] Explicit `WORLD_EFFECT: NONE` allowed for non-spatial canonical events.
- [x] Three.js vs. R3F v9 compatibility rechecked against React 19 and documented.
- [x] Steampunk tropes removed; modern architectural miniature aesthetic established.
- [x] Fake System Operator NPC completely removed (human user is the operator).
- [x] Independent Verifier restricted to state-driven activity (no arbitrary socializing).
- [x] Performance budgets switched to measured empirical targets (\(\sim 60\) dev, \(\ge 45\) active, \(\le 30\) idle, 0 background).
- [x] Render loop dual-condition suspension specified (`document.visibilityState` + `HQ3D` view).
- [x] Accessibility bloat eliminated; Operations mode primary; targeted ARIA controls in 3D.
- [x] Default view logic formalized with persistent user preference and automatic WebGL fallback.
- [x] Procedural/custom geometric prototype characters set for 12B–12D (no external packs downloaded).
- [x] Optional micro-audio deferred to Wave 12L (no ambient soundtrack).
- [x] Roadmap sequence corrected to 12B Scene Foundation through 12L Polish.
- [x] Wave 12B scope restricted to scene foundation blockout without Golden Loop completion claims.
- [x] Existing regression test suite executed and clean.
- [x] Zero code implementation or package installations executed (Wave 12A-R constraint respected).
