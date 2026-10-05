# P7 RUNTIME EXPERIMENT REGISTER
## Empirical Host Probes & Local Runtime Experiments for Wave P7

**Status:** APPROVED ARCHITECTURAL EVIDENCE  
**Wave:** P7 — Desktop Runtime Decision  
**Date:** 2026-10-01  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Host Environment:** Windows 11 Home (Build 10.0.26100.9549, 24H2), Node.js `v24.13.0`, npm `11.6.2`, Git `2.54.0.windows.1`  
**Governing Invariants:**
- $\mathbf{CURRENT\ REALITY \neq APPROVED\ TARGET\ CONTRACT}$
- $\mathbf{UNKNOWN \neq ASSUMED}$
- $\mathbf{CURRENT\ TOOLCHAIN\ ABSENCE \neq ARCHITECTURAL\ IMPOSSIBILITY}$
- $\mathbf{EXPERIMENT\ ARTIFACTS \neq PRODUCTION\ SOURCE}$

---

## 1. Experiment Overview & Safety Bounds

All experiments conducted under Wave P7 adhere to strict non-mutation guarantees:
1. **Zero Production Mutation:** Zero edits to `packages/` or `apps/`; zero changes to `package.json` or lockfiles.
2. **Zero Toolchain Installs:** No uninstalled toolchains (Rust, MSVC, .NET SDK, Go) were downloaded or installed.
3. **Disposable Scratch Environment:** All experiment scripts were created and executed within `<appDataDir>\brain\<conversation-id>\scratch\` using only pre-installed Node.js v24.13.0 and native Windows 11 PowerShell/Win32 APIs.

---

## 2. Experiment Register Table

| Experiment ID | Title / Target Question | Execution Date | Status | Primary Finding |
| :--- | :--- | :--- | :--- | :--- |
| **`EXP-P7-01`** | Windows Named Pipe vs. Loopback TCP Latency and Throughput | 2026-10-01 | `PASSED` | Named Pipes achieve $\sim 0.116\text{ms}$ latency ($\sim 8,614\text{ ops/sec}$); Loopback TCP achieves $\sim 0.110\text{ms}$ ($\sim 9,113\text{ ops/sec}$). Named pipes provide native Windows ACL security without port collision risks. |
| **`EXP-P7-02`** | Detached Background Node.js Daemon Lifecycle & Named Pipe Reconnect | 2026-10-01 | `PASSED` | Detached child (`spawn(..., { detached: true, stdio: 'ignore' })` + `unref()`) survives parent exit; lockfile protocol enables discovery; secondary client authenticates and cleanly shuts down daemon. |
| **`EXP-P7-03`** | Microsoft Edge Application Mode (`--app`) Probe on Windows 11 | 2026-10-01 | `PASSED` | Edge 154.0 accepts `--app` and runs without address bar, but lacks native system tray, Action Center COM registration, and window close interception, counter-indicating pure PWA/browser as desktop OS. |

---

## 3. Detailed Experiment Logs

### EXP-P7-01: Windows Named Pipe vs. Loopback TCP Latency and Throughput

* **Question:** What is the empirical latency and throughput of Windows Named Pipes versus Loopback TCP (`127.0.0.1`) in pure Node.js on Windows 11, and which transport provides superior security boundaries for GRAVITAS local IPC?
* **Why Decision-Sensitive:** P6 left the local transport open to P7. P7 must decide whether the desktop UI connects to the Kernel via Windows Named Pipes, Loopback TCP/HTTP, or Chromium Mojo/MessagePort.
* **Method:** Executed `scratch/exp_p7_01_ipc.js` running 200 serialized JSON request-reply roundtrips over a local named pipe (`\\.\pipe\gravitas-test-pipe-*`) and loopback TCP (`127.0.0.1:*`).
* **Allowed under Freeze?** Yes (disposable scratch script, native Node `net` module).
* **Empirical Result:**
  ```json
  Named Pipe Result: {
    "transport": "WINDOWS_NAMED_PIPE",
    "pipeName": "\\\\.\\pipe\\gravitas-test-pipe-1790817159785",
    "iterations": 200,
    "totalMs": 23.2181,
    "avgLatencyMs": 0.1160905,
    "throughputOpsPerSec": 8613.969273971601
  }
  Loopback TCP Result: {
    "transport": "LOOPBACK_TCP",
    "port": 49590,
    "iterations": 200,
    "totalMs": 21.9455,
    "avgLatencyMs": 0.10972749999999999,
    "throughputOpsPerSec": 9113.485680435624
  }
  ```
* **Architectural Implication:**
  1. Both transports exhibit sub-millisecond roundtrips ($< 0.12\text{ms}$ per serialized message), which is more than fast enough for 60fps streaming and control operations.
  2. **Security Difference:** Loopback TCP binds to an OS port accessible to *any* process running under *any* user on the host machine. Windows Named Pipes can be secured using Win32 Security Descriptors (ACLs) scoped strictly to the current user's SID, eliminating cross-account hijacking and port collision risks on multi-user or shared workstations.

---

### EXP-P7-02: Detached Background Node.js Daemon Lifecycle & Named Pipe Reconnect

* **Question:** Can a parent Node.js process spawn a detached Node.js Kernel daemon on Windows 11 that survives parent exit, writes an authenticated discovery lockfile, serves commands over a Named Pipe, and shuts down cleanly on demand?
* **Why Decision-Sensitive:** Directly validates Model B (Independent Local Daemon) and Model D (Hybrid Supervisor) without guessing how Windows 11 manages detached Node processes.
* **Method:** Executed `scratch/exp_p7_02_daemon.js`:
  1. Parent spawned detached child with `windowsHide: true`, `detached: true`, `stdio: 'ignore'`.
  2. Child created Named Pipe server and wrote `kernel_instance.json` containing PID, pipe name, and cryptographic auth token.
  3. Parent exited.
  4. Secondary process read lockfile, verified PID liveliness via `process.kill(pid, 0)`, connected over Named Pipe, completed token handshake, queried `STATUS`, sent `SHUTDOWN`, and verified unlinking of lockfile and process termination.
* **Allowed under Freeze?** Yes (disposable scratch script).
* **Empirical Result:**
  ```
  1. Spawning detached Kernel process...
     Detached child PID: 8136
  2. Waiting for lockfile creation...
     Lockfile verified: PID 8136, Pipe: \\.\pipe\gravitas-test-daemon-1790817174262
  3. Probing PID liveliness: 8136 -> Alive: true
  4. Connecting as UI client to Named Pipe...
     Authenticated successfully. Requesting STATUS...
     Received STATUS_REPLY: { type: 'STATUS_REPLY', pid: 8136, uptime: 0.095s, state: 'KERNEL_ACTIVE' }
     Sending SHUTDOWN...
     Received SHUTDOWN_ACK. Closing client socket.
  5. Waiting for daemon to terminate and clean up lockfile...
     Lockfile cleaned up: true
     Daemon process terminated: true
  ```
* **Architectural Implication:**
  1. Validates that Node.js on Windows 11 natively supports the detached daemon lifecycle model (`DaemonHostAdapter`).
  2. Confirms that closing a desktop UI window does **NOT** require killing the Kernel when the Kernel runs as a detached process or when Electron Main remains alive in the tray.
  3. **Critical Process Boundary Clarification:** `EXP-P7-02` evaluated an independent detached Node.js `child_process`, **NOT** an Electron `utilityProcess`. In Electron, a `utilityProcess` lifecycle is bound to the parent Electron Main process (`ELECTRON_MAIN_ALIVE + WINDOW_DESTROYED`); it terminates if Electron Main crashes or is killed (`ELECTRON_MAIN_TERMINATED`). The experiment proves detached daemon survival, not unparented `utilityProcess` survival.

---

### EXP-P7-03: Microsoft Edge Application Mode (`--app`) Probe on Windows 11

* **Question:** Can pre-installed Microsoft Edge (`msedge.exe`) run in application mode (`--app=http://...`) with an isolated user profile, and can it satisfy GRAVITAS desktop OS requirements without a dedicated desktop wrapper?
* **Why Decision-Sensitive:** Evaluates Candidate C (Node Daemon + Browser/PWA). If browser app mode were sufficient, a dedicated desktop wrapper (Electron or Tauri) might be unnecessary.
* **Method:** Executed `scratch/exp_p7_03_edge_app.js` probing Edge `154.0.4258.37` with `--app`, `--user-data-dir`, and checking process lifecycle.
* **Allowed under Freeze?** Yes (disposable probe).
* **Empirical Result:**
  - Edge launches and renders cleanly in a standalone window without browser navigation chrome.
  - **Identified Deficits for Target Desktop Experience:**
    1. **Zero System Tray Support:** Pure browser app mode has no API to minimize to the Windows system tray. Closing the window immediately terminates the renderer.
    2. **No Native Action Center Registration:** Web notifications do not register with the Windows Action Center COM server under a custom AUMID.
    3. **Browser Sandbox Blocks Named Pipes:** Web JavaScript inside the browser cannot open Windows Named Pipes or bind to local unix sockets; it is forced to use WebSockets/fetch over TCP.
    4. **No Window Close Interception:** The browser does not permit preventing window closure to maintain background tasks without showing the generic browser "Leave site?" prompt.
* **Architectural Implication:** Candidate C (Pure Browser/PWA) is **COUNTER_INDICATED FOR TARGET DESKTOP EXPERIENCE** because system tray residency, close interception, native background lifecycle, custom AUMID notifications, and privileged local broker UX are essential operator requirements for a multi-agent desktop OS. Preserved strictly as an optional headless/web-fallback mode.
