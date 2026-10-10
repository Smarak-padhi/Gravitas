# GRAVITAS — V1-C-R4 EVIDENCE & REGRESSION PACKET

**Audit Wave:** V1-C-R4  
**Date:** 2026-10-10  
**Branch:** `feat/v0-golden-loop`  
**Base Commit:** `b91077761dae771ff4ee6d374ab49dbdb7d7e611`  
**Frozen V1-B Commit:** `910531cd44277225788409eaca21baa1f8c98c38` (Ancestry verified: True)

---

## 1. Implementation Verification

### File Modifications
- [`apps/desktop/src/main/index.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/main/index.ts):
  - Implemented `isAuthorizedRestartCaller(event: Electron.IpcMainInvokeEvent, activeWindow: BrowserWindow | null): boolean`:
    ```typescript
    export function isAuthorizedRestartCaller(
      event: Electron.IpcMainInvokeEvent,
      activeWindow: BrowserWindow | null
    ): boolean {
      if (!activeWindow || activeWindow.isDestroyed()) return false;
      if (event.sender !== activeWindow.webContents) return false;
      const frame = event.senderFrame;
      if (!frame || frame.parent !== null) return false;
      const canonicalRendererUrl = pathToFileURL(RENDERER_HTML_PATH).href;
      if (frame.url !== canonicalRendererUrl) return false;
      return true;
    }
    ```
  - Guarded `ipcMain.handle('gravitas:restart-kernel', ...)` with caller authorization check.
  - Hardened `will-navigate` in `createDesktopWindow()`:
    ```typescript
    win.webContents.on('will-navigate', (event, url) => {
      const canonicalRendererUrl = pathToFileURL(RENDERER_HTML_PATH).href;
      if (url !== canonicalRendererUrl) {
        event.preventDefault();
      }
    });
    ```
- [`apps/desktop/src/onboarding.test.ts`](file:///c:/Users/smara/Desktop/Multi-agent/apps/desktop/src/onboarding.test.ts):
  - Added 5 unit test cases:
    1. Authorizes active main window loading canonical renderer HTML.
    2. Rejects null or destroyed window.
    3. Rejects mismatched `event.sender` webContents.
    4. Rejects subframes / iframes (`parent !== null`).
    5. Rejects unexpected document URL / scheme.

---

## 2. Regression & Verification Results

### A. Full TypeScript Typecheck
- Command: `npm run typecheck`
- Result: **0 errors** across all 12 workspaces.

### B. Comprehensive Vitest Test Suite
- Command: `npx vitest run --fileParallelism=false`
- Result: **104 test files passed, 1,717 tests passed, 0 failures**.

### C. Kernel K0 Core Engine Test Suite
- Command: `npm run test:kernel`
- Result: **51 tests passed, 0 failures**.

### D. Desktop Application Bundle Build
- Command: `node apps/desktop/build.mjs`
- Result: Bundled successfully (`dist/main`, `dist/preload`, `dist/renderer`, `dist/kernel-host`).

### E. Physical Dogfood Verification
- Command: `node scripts/dogfood-view-switch.mjs`
- Result: **13/13 steps passed**. Zero orphan processes remaining upon shutdown.

### F. Doctor System Diagnostics & Readiness
- Command: `node scripts/doctor.mjs --json`
- Result: **11 OK, 2 UNAVAILABLE, 0 BLOCKED, exitCode = 0**.

---

## 3. Physical Process-Boundary Falsification Results

- **Renderer Iframe Isolation**:
  - Context bridge injected strictly into top-level frame.
  - Iframe context: `hasBridgeInIframe = false`.
- **Navigation Containment**:
  - Navigation attempted to arbitrary file URI.
  - Intercepted and blocked by `will-navigate` policy; active URL remained canonical.
- **Unexpected Process Termination & Replacement**:
  - Supervisor transitioned to `OFFLINE` / `AUTH_REQUIRED` after utility process kill.
  - Authorized restart initiated via `gravitas:restart-kernel`.
  - Supervisor spawned fresh `utilityProcess` with new PID.
  - Retained credentials resynchronized cleanly to `AVAILABLE`.
  - Zero orphan processes upon application shutdown.

---

## 4. Final Wave Status & Gate Invariants

| Gate / Metric | Value |
|---|---|
| `RESTART_IPC_CALLER_AUTHORIZATION` | `PROVEN` |
| `NAVIGATION_BOUNDARY_CONTAINMENT` | `PROVEN` |
| `V1_C_PROVIDER_CREDENTIAL_BRIDGE` | `IMPLEMENTED_AND_PHYSICALLY_TESTED` |
| `NVIDIA_ADAPTER_PRODUCTION_UTILITY_DISPATCH` | `NOT_IMPLEMENTED` |
| `ADAPTER_PRODUCTION_SECRET_RESOLUTION` | `NOT_PROVEN` |
| `LIVE_PROVIDER_QUALIFICATION` | `BLOCKED` |
| `INDEPENDENT_CLEAN_MACHINE_ACCEPTANCE` | `BLOCKED` |
| `NETWORK_SPEND_USD` | `$0.00` |
| `LIVE_NVIDIA_API_CALLS` | `0` |
| `REMOTE_PUSH` | `NONE` |
| `REMOTE_MERGE` | `NONE` |
| `V1_D_COMMENCED` | `NO` |
