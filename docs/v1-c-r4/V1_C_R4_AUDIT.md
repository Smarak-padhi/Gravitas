# GRAVITAS — V1-C-R4 SECURITY & CALLER AUTHORIZATION AUDIT

**Audit Date:** 2026-10-10  
**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Branch:** `feat/v0-golden-loop`  
**Base Commit:** `b91077761dae771ff4ee6d374ab49dbdb7d7e611`  
**Frozen V1-B Ancestor:** `910531cd44277225788409eaca21baa1f8c98c38` (Ancestry verified)

---

## 1. Executive Summary

During the V1-C-R3 final security audit, two specific open gates were identified:
1. `RESTART_IPC_CALLER_AUTHORIZATION = NOT_PROVEN`: The IPC handler `gravitas:restart-kernel` was exposed without strict sender identity, window validation, frame validation, or entry document binding.
2. `ADAPTER_SECRET_RESOLUTION = NOT_PROVEN`: In production utility process execution, `ModelCredentialBroker` receives and stores the credential, but the client adapter dispatching to NVIDIA NIM is not wired to dispatch live utilityProcess requests in V1-C.

Wave V1-C-R4 had the strict mission to close the restart IPC authorization gap without expanding the credential bridge or implementing premature remote-model execution.

### Key Outcomes
- **IPC Authorization Hardened**: Added and exported `isAuthorizedRestartCaller` in `apps/desktop/src/main/index.ts`. Enforced four mandatory checks:
  1. Active application window exists and is not destroyed (`activeWindow && !activeWindow.isDestroyed()`).
  2. IPC invoker matches the active window webContents (`event.sender === activeWindow.webContents`).
  3. IPC invoker frame is top-level only (`event.senderFrame.parent === null`), rejecting child iframes.
  4. IPC invoker frame URL matches the canonical renderer HTML entrypoint (`event.senderFrame.url === pathToFileURL(RENDERER_HTML_PATH).href`), rejecting arbitrary file URLs or rogue pages.
- **Window Navigation Boundary Hardened**: In `createDesktopWindow()`, the `will-navigate` handler was restricted strictly to `pathToFileURL(RENDERER_HTML_PATH).href`. Any attempt to navigate to external URLs or arbitrary local files is cancelled via `event.preventDefault()`.
- **Targeted Unit Falsification**: 5 dedicated authorization and boundary unit tests added to `apps/desktop/src/onboarding.test.ts` (all 23 tests pass).
- **Physical Electron Falsification**:
  - Top-level authorized window restart executes safely.
  - Injected child iframe in renderer DOM does not have access to the context bridge (`hasBridgeInIframe = false`).
  - Attempted navigation to arbitrary file URL is blocked at the navigation boundary.
  - UtilityProcess unexpected death transitions supervisor to `OFFLINE` / `AUTH_REQUIRED`, and authorized restart successfully spawns replacement utility process with new PID, synchronizes retained credentials, and leaves 0 orphan processes.
- **Truthful Scope Positioning**:
  - `RESTART_IPC_CALLER_AUTHORIZATION = PROVEN`
  - `NAVIGATION_BOUNDARY_CONTAINMENT = PROVEN`
  - `V1_C_PROVIDER_CREDENTIAL_BRIDGE = IMPLEMENTED_AND_PHYSICALLY_TESTED`
  - `NVIDIA_ADAPTER_PRODUCTION_UTILITY_DISPATCH = NOT_IMPLEMENTED`
  - `ADAPTER_PRODUCTION_SECRET_RESOLUTION = NOT_PROVEN`
  - `LIVE_PROVIDER_QUALIFICATION = BLOCKED`
  - `INDEPENDENT_CLEAN_MACHINE_ACCEPTANCE = BLOCKED`
  - $0.00 spent, 0 network requests to NVIDIA NIM.
