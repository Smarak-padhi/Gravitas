# GRAVITAS Wave D2: Adversarial & Red-Team Audit

## 1. Audit Overview
Wave D2 introduces background/tray desktop lifecycle behavior. This review verifies that background continuity does not create security boundaries leaks, autonomous human gate bypasses, or authority confusion.

## 2. Threat Vector Analyses

### Vector A: Tray Action Injection & Privilege Escalation
- **Attack**: Malicious renderer or IPC injector attempts to invoke arbitrary tools, approve sensitive actions, or trigger code deployment from the system tray menu.
- **Finding**: **MITIGATED**.
- **Evidence**: The system tray is instantiated and owned exclusively in the Electron Main process (`apps/desktop/src/main/index.ts`). The tray menu contains exactly three items:
  1. `Open Command Center` (`showAndFocusWindow()`)
  2. `Kernel Status: <STATUS>` (`enabled: false`)
  3. `Quit GRAVITAS` (`quitDesktopApp()`)
  The tray has zero access to tools, execution handles, or approval gates.

### Vector B: Autonomous Human Gate Bypass During Background Operation
- **Attack**: When the Command Center window is hidden, a background task requiring operator approval (e.g., shell command, git write) attempts to auto-approve itself citing "unattended background operation".
- **Finding**: **MITIGATED**.
- **Evidence**: Tested in `dogfood-d2-negative.mjs` Fixture D and `d2.test.ts`. Approval requests remain strictly in `PENDING` status. The Kernel state machine requires an explicit `operatorApprovalDecision` message authored by the human operator. Background execution halts at the gate until the operator opens the Command Center and approves.

### Vector C: Renderer Hijacking of Tray & Window Lifecycle
- **Attack**: Renderer invokes unauthorized IPC channels (e.g. `gravitas:tray-destroy`, `gravitas:eval`) or attempts to access Node/Electron modules directly.
- **Finding**: **MITIGATED**.
- **Evidence**: Sandboxed Chromium renderer with context isolation enabled. The preload bridge exposes only `requestHideWindow` and `requestQuitApplication`. All other channels fail closed and are rejected.

### Vector D: Multi-Instance Race & SQLite Concurrency Corruption
- **Attack**: Operator launches multiple desktop app instances rapidly, causing dual Kernel utilityProcesses to race on the same SQLite database file.
- **Finding**: **MITIGATED**.
- **Evidence**: `app.requestSingleInstanceLock()` is invoked synchronously prior to window creation. Secondary instances detect lock failure, focus the primary window, and call `app.quit()` immediately without spawning a secondary utilityProcess.

### Vector E: Orphaned Background Processes
- **Attack**: Quitting the application leaves headless Node utilityProcesses running indefinitely in the background, consuming CPU/RAM or holding file locks.
- **Finding**: **MITIGATED**.
- **Evidence**: Tested in `dogfood-d2-real.mjs` Step 31 and `dogfood-d2-negative.mjs` Fixture G. `quitDesktopApp()` systematically executes graceful IPC shutdown, terminates the utilityProcess, destroys window and tray, and exits cleanly with 0 orphans.
