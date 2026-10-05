# GRAVITAS — WAVE P8 ACCESSIBILITY & DEGRADATION MODEL
## Non-Visual Equivalence, Reduced Motion & Graceful Degradation Ladder

**Status:** APPROVED ARCHITECTURAL SPECIFICATION  
**Wave:** P8 — Renderer Strategy Decision  
**Date:** 2026-10-01  
**Governing Invariants:**
- $\mathbf{ACCESSIBILITY \neq OPTIONAL}$
- $\mathbf{HIGH\ FPS \neq ACCESSIBLE\ UX}$
- $\mathbf{RENDERER \neq CANONICAL\ CONTROL\ PLANE}$
- $\mathbf{LIVING\ HQ \neq ONLY\ WAY\ TO\ OPERATE\ GRAVITAS}$
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$

---

## 1. The Accessibility Invariant: Parallel Non-Visual Operation

A 3D WebGL canvas is inherently an opaque bitmap to screen readers (NVDA, JAWS, VoiceOver, Windows Narrator). To satisfy the non-negotiable invariant $\mathbf{ACCESSIBILITY \neq OPTIONAL}$, GRAVITAS establishes **Full Non-Visual Functional Equivalence as a Required Acceptance Criterion** (subject to Phase D prototype and automated accessibility verification):

$$\mathbf{ALL\ CORE\ OPERATIONAL\ ACTIONS\ IN\ 3D\ MUST\ BE\ FULLY\ EXECUTABLE\ VIA\ KEYBOARD\ +\ SCREEN\ READER}$$

### Layer 4: Semantic ARIA Live Regions & Assistive Tree
- **Streaming Live Status (`aria-live="polite"`):**
  - Worker transitions and non-disruptive task events are streamed politely:  
    `"Frontend Engineer completed task T-142: Responsive itinerary cards. Artifact in transit to Independent Reviewer."`
- **Critical Alerts & Approvals (`aria-live="assertive"`):**
  - High-priority events notify screen readers:  
    `"Alert: Independent Reviewer rejected task T-142. Verification failed with 2 linter errors."`  
    `"Human Approval Required: WorkSession W-104 requests permission to merge to main."`
- **Full Keyboard Navigation:**
  - `Tab` / `Shift+Tab`: Cycles through interactive stations and task cards in logical DAG order.
  - Number hotkeys: Shift focus to designated functional zones and stations defined in the active view.
  - `Cmd/Ctrl + K`: Opens universal Command Palette, providing rapid search, task inspection, and governance approval without spatial mouse clicking.

---

## 2. Reduced Motion Architecture

Under WCAG 2.1 Success Criterion 2.3.3 (Animation from Interactions), motion must not cause physical disorientation, vestibular disorders, or nausea.

### Operating Modes
1. **OS Preference Detection:** Automatically reads `window.matchMedia('(prefers-reduced-motion: reduce)')`.
2. **Explicit GRAVITAS User Setting:** The operator can toggle "Reduced Motion" directly in the settings drawer regardless of OS defaults.

### Behavioral Rules Under Reduced Motion
| Visual Event | Standard Mode | Reduced Motion Mode |
| :--- | :--- | :--- |
| **Room Navigation** | Smooth spherical camera tween (configurable duration, cubic ease) | **Direct jump** (camera snaps directly to target framing). |
| **Agent Locomotion** | Smooth walking gait along floor conduits | **Direct position placement**; agent appears at target station on arrival. |
| **Status Transitions** | Pulsing glow shader rings and expanding wave ripples | **Static color shift** with high-contrast icon badge. |
| **Elevator Transit** | Animated mechanical doors and vertical shaft motion | **Direct floor switch**; skip option provided. |
| **Handoff Packets** | Parabolic flying envelope across diorama | **Static transfer badge**; envelope arrives without flight motion. |

**Core Rule:** Operational information must never exist exclusively in an animation.

---

## 3. High Contrast & Theming Architecture

1. **Windows High Contrast Mode (Contrast Themes):**
   - Detects `forced-colors: active`.
   - When active, 3D WebGL diorama switches to **High Contrast Wireframe Shader Mode** or automatically transitions to **Level 3 (Semantic 2D SVG)** with high-contrast system colors (`Canvas`, `CanvasText`, `Highlight`, `ButtonText`).
2. **Color Independence:**
   - Status indicators never rely solely on color. Every status indicator pairs a color with an explicit semantic icon and text label:
     - `COMPLETED`: Green + Checkmark icon ($\checkmark$) + Text "Verified"
     - `FAILED`: Red + Exclamation icon ($\times$) + Text "Failed"
     - `BLOCKED`: Amber + Lock icon ($\ominus$) + Text "Blocked"

---

## 4. Architectural Degradation Ladder

If hardware acceleration is disabled, GPU drivers crash, or the host machine is a low-power headless terminal, GRAVITAS degrades across 4 tiers:
*(Note: This ladder defines an ARCHITECTURAL RECOVERY REQUIREMENT; production runtime transition verification requires Phase D prototype measurement)*

```
+-----------------------------------------------------------------------------------+
| LEVEL 1: FULL_VISUAL_MODE (Nominal Production Mode)                               |
| - Three.js WebGL2 Spatial Diorama (restrained 2.5D/3D presentation)               |
| - Layer 2 SVG Connection Conduits                                                 |
| - Layer 3 DOM High-Density Panels                                                 |
| - Layer 4 ARIA Assistive Tree                                                     |
+-----------------------------------------------------------------------------------+
                                          |
                                          | Frame-time exceeds budget or integrated GPU
                                          v
+-----------------------------------------------------------------------------------+
| LEVEL 2: REDUCED_VISUAL_MODE                                                      |
| - Shadows disabled, DPR locked to 1.0, post-processing stripped                   |
| - 3D mesh geometry rendered with simple Unlit/Basic materials                     |
+-----------------------------------------------------------------------------------+
                                          |
                                          | webglcontextlost / GPU driver crash
                                          v
+-----------------------------------------------------------------------------------+
| LEVEL 3: SEMANTIC_2D_MODE (2D Vector Fallback)                                     |
| - 3D Canvas unmounted and disposed                                                |
| - Activates 2D SVG OfficeFloor (apps/web/src/components/OfficeFloor.tsx)          |
| - No WebGL/GPU requirements; vector rendering via standard 2D Blink layout        |
+-----------------------------------------------------------------------------------+
                                          |
                                          | Operator preference / ultra-low memory
                                          v
+-----------------------------------------------------------------------------------+
| LEVEL 4: COMMAND_CENTER_ONLY_MODE (Pure Dashboard)                                |
| - Spatial canvas omitted entirely                                                 |
| - High-density tabular DAG view, streaming terminal, Monaco diff viewer           |
| - Full operational control                                                        |
+-----------------------------------------------------------------------------------+
```

### Context Loss & Recovery Mechanics
*(Architectural Requirement — subject to Phase D implementation verification)*
1. **Detection:** `<canvas>` receives `webglcontextlost` event.
2. **Handled Action:** Event handler invokes `event.preventDefault()`. `HqDirector` halts the render loop, disposes stale WebGL textures, and emits `onFallbackTo2D()`.
3. **User Experience:** Graceful transition to Level 3 (2D SVG OfficeFloor) preserving UI state and without interrupting running background WorkSessions.
