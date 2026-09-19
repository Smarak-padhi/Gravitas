# Gravitas Motion System & Transition Language
**Wave 7.5 Design Collaboration Document**

---

## 1. Motion Philosophy

In Gravitas, **motion is functional telemetry, not cosmetic decoration**. Every transition, pulse, and shift communicates a verified change in the underlying state machine.

### Design Principles:
1. **State-Communicative**: Motion occurs exclusively to signal an engine event (e.g., worker started, verification passed, human approval required).
2. **Never Blocking**: Animations must never prevent or delay user interaction; click targets are immediately interactive.
3. **No Decorative Bloat**: No particle effects, no cartoon bounce physics, no endless glowing gradients.
4. **Accessible by Default**: Fully honors the user's `prefers-reduced-motion` system setting.

---

## 2. Motion Design Tokens

```css
:root {
  /* Durations */
  --motion-duration-instant: 50ms;
  --motion-duration-fast: 150ms;
  --motion-duration-normal: 250ms;
  --motion-duration-deliberate: 400ms;

  /* Easings */
  --motion-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --motion-ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --motion-ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --motion-ease-attention: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 3. State Transition Choreography

### 3.1 Worker Assignment (`IDLE -> ASSIGNED / READY`)
- **Visual Signal**: Workstation card border shifts from `--border-subtle` to role accent color over `150ms` using `--motion-ease-standard`.
- **Target**: Immediate rendering of task title chip without layout jump.

### 3.2 Worker Execution (`READY -> WORKING / RUNNING`)
- **Visual Signal**: Subtle breathing state indicator dot (opacity oscillating smoothly between `0.5` and `1.0` every `2000ms`).
- **No Heavy Glow**: The card itself remains stable; no jarring transforms.

### 3.3 Handoff to Verifier (`WORKING -> VERIFYING`)
- **Visual Signal**: Directional arrow or pulse moves from worker card toward the Verifier station over `250ms`.
- **Verifier State**: Verifier badge illuminates in amber (`#fbbf24`), signalling that independent test execution is underway.

### 3.4 Approval Required Gate (`VERIFYING -> WAITING_APPROVAL / NEEDS_YOU`)
- **Visual Signal**: High-contrast amber border illumination with a gentle attention pulse (`animation: attentionPulse 2.4s ease-in-out infinite`).
- **Inbox Surface**: Human Inbox badge counter increments with a single micro-scale transition (`scale(1.15) -> scale(1.0)` over `150ms`).

### 3.5 Approval Granted (`WAITING_APPROVAL -> APPROVED / COMPLETED`)
- **Visual Signal**: Card border flashes emerald (`#10b981`) for `350ms`, then settles into stable `COMPLETED` state. Attention pulse terminates immediately.

### 3.6 Execution Rejection / Failure (`RUNNING / VERIFYING -> FAILED`)
- **Visual Signal**: Instant stop of all cyclic animations. Border snaps to solid red (`#dc2626`). Error badge renders with a crisp fade-in (`150ms`).

---

## 4. Reduced-Motion Implementation

When `prefers-reduced-motion: reduce` is enabled:
1. All perpetual animations (`attentionPulse`, breathing opacity) are completely disabled (`animation: none !important`).
2. Duration tokens are clamped to `0.01ms` or immediate cuts.
3. State changes are communicated entirely through solid, high-contrast borders, explicit text tags (`[WAITING APPROVAL]`, `[FAILED]`, `[DONE]`), and distinct icons (`⚠`, `✕`, `✓`).
