# D0 Runtime Evidence & Test Summary

## 1. Test Suite Coverage (407 / 407 PASS)
- **K0 Kernel Core**: 51 / 51 PASS
- **K1 Harnesses / Model Execution**: 108 / 108 PASS
- **K2 Closed-Loop Orchestration**: 53 / 53 PASS
- **K3 Capability Grants & MCP**: 85 / 85 PASS
- **K4 Architecture Arena**: 40 / 40 PASS
- **K5 Independent Verification**: 40 / 40 PASS
- **D0 Desktop Shell Foundation**: 30 / 30 PASS
- **Total Unique Tests**: 407 / 407 PASS (0 failures, 0 skips)

## 2. Live Electron Dogfood Probes

### A. Real Electron Hosting (`apps/desktop/src/dogfood-real.mjs`)
- **Status**: 25 / 25 steps verified PASS in live Electron multi-process topology.
- **Environment**: Electron 44.5.1, Node v24.21.0.
- **Process Separation**: Main PID: 11104, Kernel PID: 1932 (Main PID != Kernel PID, distinct: true).
- **Handshake**: Received `HELLO` message with protocol version `d0.1`.
- **Renderer**: Sandboxed `BrowserWindow` loaded `index.html` with secure `webPreferences`.
- **Preload**: Exposed bridge on `window.gravitasDesktop` with only 4 allowlisted read/subscribe keys.
- **Projections**: Read-only `HEALTH_REQUEST` and `SNAPSHOT_REQUEST` roundtrips returned canonical projections.
- **Renderer Reload**: `webContents.reload()` executed cleanly; Kernel PID remained identical (`1932`); fresh projection reconstructed.
- **Controlled Shutdown**: `SHUTDOWN_REQUEST` sent, `SHUTDOWN_ACK` received, utilityProcess exited cleanly.

### B. Negative Containment Fixtures (`apps/desktop/src/dogfood-negative.mjs`)
- **Status**: 5 / 5 negative fixtures verified PASS in live Electron:
  1. `PROTOCOL_MISMATCH_FAILS_CLOSED`: Incompatible protocol version rejected with `KERNEL_ERROR`; `READY` state never fabricated.
  2. `STARTUP_BEFORE_READY_FAILURE`: Process launch exception caught; supervisor cleanly transitioned to `FAILED`.
  3. `RENDERER_NODE_GLOBALS_BLOCKED`: `process`, `require`, and `Buffer` verified `false` (undefined) in renderer execution context.
  4. `PRELOAD_BRIDGE_ENUMERATION`: Exactly `['getHealth', 'getSnapshot', 'onKernelError', 'onKernelStatus']` exposed; `rawIpc=false`, `dispatch=false`.
  5. `CONTROLLED_SHUTDOWN_AND_NO_ORPHAN`: UtilityProcess PID verified absent from OS process table post-termination (`processExists=false`).

### C. EXP-K-09 Empirical Probe (`scratch/exp-k09-main.mjs` + `scratch/exp-k09-worker.mjs`)
- **Result**:
  ```json
  {
    "processType": "utility",
    "nodeVersion": "v24.21.0",
    "electronVersion": "44.5.1",
    "nodeSqliteImported": true,
    "databaseSyncCreated": true,
    "tableCreated": true,
    "rowInsertedAndRead": true,
    "readBackValue": "EXP_K09_UTILITYPROCESS_SUCCESS",
    "error": null
  }
  ```
