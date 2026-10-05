# GRAVITAS Wave D2: Objective Reconciliation Ledger

| # | Wave D2 Requirement / Invariant | Status | Verification Evidence |
|---|---|---|---|
| 1 | Wave D2 Scope Locked (Background/Tray Lifecycle & Desktop Continuity) | VERIFIED | `apps/desktop/src/types.ts`, `docs/architecture-v2/D2_BACKGROUND_RUNTIME.md` |
| 2 | P0–P8 and K0–K5 Architecture Frozen | VERIFIED | No changes to frozen kernel algorithms or contracts |
| 3 | D0 and D1 Shell & Command Center Preserved | VERIFIED | D0 tests (30/30) and D1 tests (50/50) pass unchanged |
| 4 | Electron Main as DesktopSupervisor | VERIFIED | `apps/desktop/src/main/supervisor.ts` |
| 5 | Kernel in Isolated utilityProcess | VERIFIED | `apps/desktop/src/kernel-host/kernelHost.ts`, PID separation verified in real dogfood |
| 6 | Renderer as Sandboxed Projection | VERIFIED | `sandbox: true`, `contextIsolation: true`, preload bridge |
| 7 | `WINDOW_LIFETIME != KERNEL_LIFETIME` | VERIFIED | Real dogfood step 11–13: window hidden, Kernel utilityProcess PID 20396 continues |
| 8 | `MAIN_PROCESS_CRASH != GUARANTEED_CONTINUOUS_KERNEL_SURVIVAL` | VERIFIED | Architecture docs state limitation explicitly; no false daemon claims |
| 9 | `TRAY_STATUS != CANONICAL_STATE` | VERIFIED | Tray menu items are passive projections derived from Kernel health |
| 10 | `RENDERER_OWNS_TRAY = NO` | VERIFIED | Main owns Tray; zero renderer tray handles; Negative fixture B/C pass |
| 11 | Tray Actions Strictly Bounded | VERIFIED | Only Open Command Center, disabled status, and Quit |
| 12 | Single-Instance Lock Enforced | VERIFIED | `app.requestSingleInstanceLock()` prevents dual Kernel utilityProcess |
| 13 | Idempotent Clean Application Shutdown | VERIFIED | `quitDesktopApp()` flushes Kernel, destroys tray/window, 0 orphans |
| 14 | Human Gate Sovereignty in Background | VERIFIED | Approval remains PENDING while hidden; no auto-approval; operator must decide |
| 15 | Protocol Version Compatibility | VERIFIED | D0, D1, and D2 protocol versions accepted |
| 16 | Repo-Owned Tray Icon Asset | VERIFIED | `apps/desktop/assets/tray-icon.png` (16x16 PNG) |
| 17 | 50 Automated D2 Unit/Integration Tests | VERIFIED | `npm run test:d2` -> 50 / 50 passing |
| 18 | 32-Step Real Electron Dogfood | VERIFIED | `npx electron apps/desktop/src/dogfood-d2-real.mjs` -> 32 / 32 steps pass |
| 19 | 9-Fixture Negative Security Dogfood | VERIFIED | `npx electron apps/desktop/src/dogfood-d2-negative.mjs` -> 9 / 9 pass |
| 20 | Complete Monorepo Regression | VERIFIED | 507 / 507 tests passing across K0, K1, K2, K3, K4, K5, D0, D1, D2 |
