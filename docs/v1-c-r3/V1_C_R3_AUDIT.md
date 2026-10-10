# GRAVITAS — Wave V1-C-R3 Audit Report
**Kernel Restart Lifecycle Repair & Physical Electron Verification**

- **Repository:** `C:\Users\smara\Desktop\Multi-agent`
- **Branch:** `feat/v0-golden-loop`
- **Pre-Repair Base HEAD:** `a9c34ee03a485dd442ffd396bcc6a9422e4496c0`
- **Parent Frozen V1-B HEAD:** `910531cd44277225788409eaca21baa1f8c98c38`
- **Audit Date:** 2026-10-10

---

## 1. Defect Analysis & Root Cause

In Wave V1-C-R2, unexpected termination of the Electron `utilityProcess` execution host resulted in a lifecycle lockup:
1. `DesktopSupervisor.start()` unconditionally guarded against duplicate starts with `if (this.kernelProcess) return`.
2. When the kernel `utilityProcess` terminated unexpectedly or encountered an error, `this.kernelProcess.on('exit')` transitioned the supervisor state to `OFFLINE` and cleared `kernelInstanceId`, but retained the dead `this.kernelProcess` reference.
3. Subsequent calls to `supervisor.start()` immediately returned early due to the dead reference guard, leaving the kernel permanently offline.
4. In-flight requests pending across an unexpected process termination risked hanging until timeout rather than being rejected synchronously.

---

## 2. Implementation Architecture

### 2.1 State Cleanup & Host Termination Handler
In `apps/desktop/src/main/supervisor.ts`:
- Added `private isStarting = false` to prevent duplicate concurrent launches during asynchronous startup.
- Implemented `handleHostTermination(eventProcess: ProcessBridge, reason: string, errorCode?: string, isError?: boolean)`:
  - Synchronously iterates through `this.pendingRequests` and immediately rejects any pending promises bound to the terminating process with a clear error: `"Kernel host terminated before responding: <reason>"`.
  - Clears associated timeout timers.
  - Enforces process identity: checks `if (this.kernelProcess === eventProcess)` before mutating active state. This ensures that:
    - Multiple events from the same terminating process (e.g., `error` followed by `exit`) are processed idempotently without state corruption.
    - Late events from retired previous hosts cannot clear or disrupt a replacement host spawned by a subsequent `start()`.
  - Clears `this.kernelProcess = undefined`, `this.kernelInstanceId = undefined`, `this.kernelPid = 0`, and `this.executionProviderConfigured = false`.
  - Transitions lifecycle status to `STOPPED` (if shutting down), `FAILED` (if process error), or `OFFLINE` (if unexpected exit).

### 2.2 Re-launch Authorization
- Guarded `start()` with:
  ```typescript
  if (this.kernelProcess || this.isStarting || this.status === 'STOPPING') {
    return;
  }
  ```
- Because `this.kernelProcess` is cleared upon process termination or shutdown completion, subsequent calls to `start()` cleanly spawn a replacement `utilityProcess` with an incremented lifecycle generation (`this.generation++`) and fresh PID.

### 2.3 IPC and Preload Surface
- Exposed `restartKernel(): Promise<boolean>` on `GravitasDesktopBridge` and registered `gravitas:restart-kernel` in `apps/desktop/src/main/index.ts`, allowing programmatic and UI-driven restart of an offline kernel without application restart.

---

## 3. Verification & Falsification Summary

1. **Unit & Falsification Tests (`apps/desktop/src/onboarding.test.ts`):**
   - 5 dedicated V1-C-R3 lifecycle tests added (18/18 tests passing in `onboarding.test.ts`).
   - Proved:
     - Unexpected exit clears reference; explicit `start()` launches replacement with new generation.
     - `error` followed by `exit` is completely idempotent.
     - Late events from retired previous hosts do not affect the active replacement host.
     - In-flight pending requests synchronously reject on host termination.
     - Retained Main credentials automatically resynchronize to the replacement host via `HELLO` handshake and ACK.
2. **Physical Electron Execution (`scripts/physical-electron-restart.mjs`):**
   - Launched physical Electron process via Playwright `_electron.launch`.
   - Host 1 initialized at PID 18172.
   - Configured synthetic credential (`nvapi-synthetic-restart-test-key-physical`) -> provider status `AVAILABLE`.
   - Terminated Host 1 via OS `taskkill /F /PID 18172` -> supervisor immediately reported `OFFLINE`, PID 0, provider status `AUTH_REQUIRED`.
   - Triggered `restartKernel()` via IPC -> Host 2 cleanly spawned at PID 20724 (distinct PIDs proven).
   - Retained Main credential resynchronized to Host 2 -> provider status transitioned back to `AVAILABLE`.
   - Clean shutdown dispatched -> zero orphan processes remaining (PID 20724 confirmed dead).

---

## 4. Governance & Constraints Audit

- **Live NVIDIA API Calls:** 0 calls ($0.00 spent).
- **Network Containment:** STRICT_ZERO_DOLLAR_FREE policy intact.
- **Independent Clean-Machine Acceptance:** Remains truthfully marked `BLOCKED` (run on isolated development profile).
- **Frozen Baselines:** V1-A, V1-B, V1-B-R2, and Skill Arena artifacts preserved without modification.
