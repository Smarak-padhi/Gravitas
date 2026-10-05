# D4 Runtime Evidence: Real & Negative Dogfood

## 1. Real Electron 44.5.1 Dogfood Execution (63 Steps)

Executed via `npx electron apps/desktop/src/dogfood-d4-real.mjs`:
- **Main Process PID**: 14864
- **Kernel utilityProcess PID**: 23856 (Independent from Main)
- **Node Version**: v24.21.0
- **Electron Version**: 44.5.1
- **Host GPU**: NVIDIA GeForce RTX 3050 Laptop GPU (Direct3D11 via ANGLE)
- **Viewport**: 1087 x 688 @ 1.25 devicePixelRatio

### Verified Step Highlights:
- **Steps 01-04**: Independent utilityProcess Kernel spawned with distinct PIDs.
- **Steps 06-11**: Living HQ 3D scene initialized under single render loop.
- **Steps 13-21**: Creation of Chief Planner, Backend Engineer, Independent Reviewer, and Deterministic Verifier runner service.
- **Steps 22-27**: Execution registration, active state transition, and inspector verification proving `ROLE != EXECUTOR != HARNESS != MODEL != PROCESS`.
- **Steps 31-32**: Harness fallback from `harness:codex:node` to `harness:claude-code:cli` preserving role identity.
- **Steps 33-34**: Worker completion transition to `WORKER_SUCCEEDED` with zero celebration.
- **Steps 35-42**: Human approval gate creation, spatial pulse, navigation to approval UI, and zero automatic approval.
- **Steps 43-47**: D2 background lifecycle window hide and restore with live background updates and bot reconstruction.
- **Steps 48-50**: Renderer reload leaving Kernel process 23856 completely untouched.
- **Steps 51-54**: Single render loop guarantee verified and reduced-motion policy validated.
- **Steps 55-57**: Controlled WebGL failure graceful degradation to semantic outline.
- **Steps 58-63**: Clean shutdown of utilityProcess Kernel and zero orphan processes remaining.

## 2. Negative Security Fixtures (16 Fixtures A-P)

Executed via `npx electron apps/desktop/src/dogfood-d4-negative.mjs`:
- **Fixture A**: Unregistered role falls back safely without privilege elevation (PASS).
- **Fixture B**: Role-bot selection carries zero approval or execution authority (PASS).
- **Fixture C**: Role-bot carries zero capability grant or policy mutation surface (PASS).
- **Fixture D**: Tier 3 Mechanical Services cannot claim autonomous reasoning (PASS).
- **Fixture E**: Harness fallback preserves role identity and task causal chain (PASS).
- **Fixture F**: Worker completed state does not render celebration animation (PASS).
- **Fixture G**: Human approval state never auto-approves (PASS).
- **Fixture H**: Malicious XSS labels sanitized in DOM textContent (PASS).
- **Fixture I**: Context isolation active; raw Node primitives unavailable (PASS).
- **Fixture J**: Concurrent tasks with same role instantiate distinct bot instances (PASS).
- **Fixture K**: Kernel offline marks role-bots as OFFLINE_STALE with zero motion (PASS).
- **Fixture L**: Renderer reload does NOT terminate or restart Kernel (PASS).
- **Fixture M**: WebGL failure degrades cleanly to SEMANTIC_ONLY with bot outline intact (PASS).
- **Fixture N**: Reduced motion disables bot continuous rotation and scaling (PASS).
- **Fixture O**: No ungranted capabilities or fake secrets leaked in role-bot views (PASS).
- **Fixture P**: Protocol version enforced (`d4.0`); invalid versions rejected (PASS).
