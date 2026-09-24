# GRAVITAS — REFERENCE DESIGN AUDIT
## Extraction of Design Principles, Motion Primitives & Architectural Techniques

**Date**: 2026-09-24  
**Scope**: User Local Project Repositories (`C:\Users\smara\Desktop\`)  
**Target**: Gravitas Personal OS & Living Headquarters (Wave 12J-UX)  

---

## 1. Executive Summary

To elevate Gravitas beyond a developer dashboard with generic card grids into a cohesive, high-density Personal Operating System and tactile Living Headquarters, we audited the user's prior design engineering repositories:
1. **Ember & Root** (`C:\Users\smara\Desktop\ember-and-root`) — Tactile/object-first interaction, motion discipline, accessibility, and reduced-motion architecture.
2. **O-TRAVELZ** (`C:\Users\smara\Desktop\o-travelz`) — Editorial typography hierarchy, high information density, and hairline architectural layouts.
3. **Algoryxz & Hospitality-AAMA** (`C:\Users\smara\Desktop\hospitality-aama`, `C:\Users\smara\Desktop\Algoryxz`) — Spatial composition, Three.js performance contracts, high-mass physics, and 3-tier token hierarchies.

In accordance with Section 1 of Wave 12J-UX, no project-specific branding, fantasy lore, or color schemes have been copied. Gravitas retains its distinct dark operational identity, elevated with material depth, architectural hierarchy, and honest runtime state.

---

## 2. Detailed Reference Audit Matrix

### 2.1 Ember & Root
- **Source Project**: `C:\Users\smara\Desktop\ember-and-root`
- **Source Files**: 
  - [`docs/UI_UX_BRIEF.md`](file:///C:/Users/smara/Desktop/ember-and-root/docs/UI_UX_BRIEF.md)
  - [`docs/EXPERIENCE_V2.md`](file:///C:/Users/smara/Desktop/ember-and-root/docs/EXPERIENCE_V2.md)
- **What is Reusable**:
  - **Tactile / Object-First Philosophy**: "The product should feel like an interactive artifact... not a SaaS dashboard wearing colors. Aesthetic comes from materials, texture, naming, and purposeful restraint, not glowing gradients and card grids."
  - **Strict Spacing System**: 4px/8px baseline grid (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`) with zero arbitrary intermediate offsets.
  - **Motion Discipline**:
    - Micro-response: 80–120ms press feedback.
    - UI transition: 180–320ms view switches.
    - Maximum sequence budget: < 1.5s total duration.
  - **Rigorous Reduced-Motion**: Under `prefers-reduced-motion: reduce`, animations collapse to instantaneous or <=150ms opacity fades; travel motes and oscillation are completely eliminated while preserving 100% of information in text.
  - **Focus & Touch Accessibility**: High-contrast 2px focus ring with 2px offset; interactive controls maintain >= 44×44px physical touch targets.
  - **Inline Actionable Errors**: Errors rendered immediately adjacent to the relevant control with actionable guidance, never relying on color alone.
  - **Lightweight Loading Skeletons**: Subtle opacity pulses on surface containers rather than jarring full-screen blocking spinners.
- **What Must NOT be Copied**:
  - Fantasy game lore (Ember, Root, Sparks, Satchel, Quests).
  - Fantasy copper, sage, and parchment color palette.
  - Leveling / XP reward animations.
- **How It Will be Adapted for Gravitas**:
  - Ground Gravitas surfaces into an architectural atelier: `Canvas` (deep obsidian base), `Surface` (command panel), `Surface Elevated` (inspectors, drawers), and `Surface Active` (focused workstations).
  - Apply the 4px/8px baseline grid across TopBar, sidebar, calendar timeline, connectors, and automations console.
  - Enforce WCAG 2.1 AA focus rings and Radix-style focus trapping on all dialogs and drawers.

---

### 2.2 O-TRAVELZ
- **Source Project**: `C:\Users\smara\Desktop\o-travelz`
- **Source Files**:
  - [`frontend/src/index.css`](file:///C:/Users/smara/Desktop/o-travelz/frontend/src/index.css)
  - [`frontend/src/App.tsx`](file:///C:/Users/smara/Desktop/o-travelz/frontend/src/App.tsx)
- **What is Reusable**:
  - **Typographic Hierarchy**: Deliberate pairing of high-contrast display titles, legible modern sans-serif body, and monospace for data/telemetry.
  - **Hairline Architectural Dividers**: Subtly demarcating regions with 1px hairline borders (`--border-subtle`, `--border-default`) instead of nesting bulky cards within cards.
  - **High Information Density**: Presentation of dense metadata (status, timestamps, identifiers, authority classes) without visual clutter.
  - **Status & Domain Chips**: Clean, compact metadata badges with subtle border-tint combinations that remain readable without glowing neon filters.
- **What Must NOT be Copied**:
  - Odishan mineral pigment palette (Chilika teal, temple clay, Kalinga brass, Kotpad earth).
  - Travel itinerary and geographic routing schemas.
  - Leaflet map styles.
- **How It Will be Adapted for Gravitas**:
  - Establish a strict 4-tier typographic role:
    1. *Product / World Titles*: Distinctive, authoritative sans/display styling.
    2. *Operational Section Headers*: Medium-weight, crisp structural headers.
    3. *Human-Readable Operational Copy*: Clean, high-legibility body sans (`Inter` / `Space Grotesk`).
    4. *Precision Telemetry & Code*: Pure monospace (`JetBrains Mono` / `DM Mono`) reserved strictly for IDs, commit SHAs, timestamps, capability signatures, and runtime parameters.
  - Replace floating cards in ConnectorsView, AutomationsView, and CalendarView with structured architectural rows and hairline dividers.

---

### 2.3 Algoryxz & Hospitality-AAMA
- **Source Project**: `C:\Users\smara\Desktop\hospitality-aama` & `C:\Users\smara\Desktop\Algoryxz`
- **Source Files**:
  - [`docs/THREE_SCENE_ARCHITECTURE.md`](file:///C:/Users/smara/Desktop/hospitality-aama/docs/THREE_SCENE_ARCHITECTURE.md)
  - [`docs/MOTION_CONTRACT.md`](file:///C:/Users/smara/Desktop/hospitality-aama/docs/MOTION_CONTRACT.md)
  - [`docs/DESIGN_IMPLEMENTATION_CONTRACT.md`](file:///C:/Users/smara/Desktop/Algoryxz/docs/DESIGN_IMPLEMENTATION_CONTRACT.md)
- **What is Reusable**:
  - **3-Tier + Spatial Token Model**: Primitive tokens -> Semantic tokens -> Component tokens -> Spatial/3D scene tokens.
  - **Architectural 3D Composition & Material Lighting**:
    - Rooms treated as physical environments with concrete scale, distinct floor grid, ceiling conduit hints, and restrained directional service illumination.
    - Temperature-calibrated lighting: cool key lights (5000–5500K) paired with low-intensity equipment status illumination (warm amber, cool cyan) rather than blinding uniform spotlights.
  - **GPU & Three.js Performance Contract**:
    - Zero-idle render loop: rendering halts (`cancelAnimationFrame`) when the camera and objects have settled.
    - Clamped pixel ratio: `Math.min(window.devicePixelRatio, 1.5)`.
    - Explicit disposal of geometries, materials, textures, and WebGL contexts on unmount.
  - **High-Mass Motion Physics**:
    - Transitions governed by mass, friction, and inertia (`cubic-bezier(0.16, 1, 0.3, 1)`).
    - Zero rubber-banding, cartoon bounce, or wobbling.
  - **Multi-Device Responsive Matrix**: Strict layout validation across 1440×900, 1280×800, 768×1024, and 390×844 with zero horizontal scrollbar leaks.
- **What Must NOT be Copied**:
  - Restaurant seating explorer, culinary plinths, stone masonry textures, hospitality reservation flows.
- **How It Will be Adapted for Gravitas**:
  - **Living HQ Zone 5 (Server Bay) Uplift**: Transform the Server Bay from two dark cuboids in an empty void into an architectural server facility:
    - Grounded anti-static raised access tile flooring with expansion seams.
    - Overhead structural cable raceway and conduit geometry framing the bay.
    - Detailed server rack enclosure with modular blades, drive bays, ventilation louvers, and restrained LED telemetry.
    - Clean service directional lighting with subtle floor contact ambient shadows.
  - Hardware terminal representation: External capability connector bridge is rendered as physical server machinery in Rack 02, not as an avatar or cartoon gadget.
