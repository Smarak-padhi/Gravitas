# D3 Semantic & Accessibility Projection

## 1. 100% Semantic Parity Principle

`WEBGL_FAILURE != APPLICATION_FAILURE`

Every entity, zone, relationship, and status displayed in the 3D WebGL world is simultaneously projected into a 100% accessible HTML DOM tree:

1. **Accessible Outline (`#world-outline`)**:
   - Structured list of buttons representing every spatial entity.
   - Tagged with `aria-label`, visual state, zone, and revision numbers.
   - Fully operable via keyboard navigation (Tab, Enter, Space).
2. **Semantic Inspector (`#world-inspector`)**:
   - Displays complete textual representation of the selected entity.
   - Epistemic status lines distinguishing worker claims from verifier evidence.
   - Untrusted worker output rendered strictly inside text-only `<pre class="untrusted-data">` blocks.
3. **Screen Reader Announcements (`#status-announcer`)**:
   - `aria-live="polite"` region announcing entity selection, degradation mode changes, and kernel transitions.

## 2. Reduced Motion Guarantee

When `prefers-reduced-motion` is detected or explicitly toggled:
- Spatial animations (`PULSE_FAST`, `PULSE_SLOW`, `FLOAT_ATTENTION`, etc.) are completely disabled (`liveActivity = 0`).
- Ambient motion loop is paused.
- Semantic inspection and outline remain 100% responsive.
