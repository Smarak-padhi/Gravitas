# D4 Accessibility & Semantic Representation

## 1. Zero 3D Lock-in Invariant

The Living HQ 3D canvas is an optional spatial projection. Full operational observability and control are provided through the semantic DOM layer:
- **Semantic Outline**: Every role-bot entity is rendered as an accessible DOM element with ARIA roles, labels, and state descriptions.
- **Inspector Profile Card**: Selecting a role-bot renders a detailed profile card in the DOM inspector displaying:
  - Role ID & Tier
  - Mechanical Service flag
  - Executor ID & Lease State
  - Harness ID & Execution Surface
  - Model Family & Provider
  - Process ID (OS PID)
- **ARIA Live Regions**: State transitions (e.g. `AWAITING_HUMAN_APPROVAL`, `ACTIVE`, `VERIFIED_PASS`) are announced via live regions.

## 2. Text Sanitization & Injection Defense
All dynamic fields displayed in the DOM inspector (such as role labels, task IDs, and execution details) are inserted strictly via `element.textContent = ...`. No `innerHTML` or `dangerouslySetInnerHTML` is used, guaranteeing complete immunity to HTML/XSS injection attacks (verified in Negative Fixture H).
