# GRAVITAS — TARGET DESKTOP RUNTIME ARCHITECTURE
## Canonical Runtime Specification: Hybrid Electron Supervisor & Decoupled P6 Kernel

**Status:** APPROVED TARGET ARCHITECTURE  
**Wave:** P7 — Desktop Runtime Decision  
**Date:** 2026-10-01  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants:**
- $\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$
- $\text{CAPABILITY} \neq \text{TOOL} \neq \text{TRANSPORT} \neq \text{CREDENTIAL} \neq \text{AUTHORITY}$
- $\text{ARCHITECTURE CONTRACT} \neq \text{CURRENT IMPLEMENTATION}$
- $\text{VISUAL WORLD} = \text{PROJECTION OF RUNTIME STATE}$
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$
- $\mathbf{DESKTOP\ UI \neq KERNEL}$
- $\mathbf{DESKTOP\ PROCESS\ LIFETIME \neq WORKSESSION\ LIFETIME}$
- $\mathbf{WINDOW\ CLOSED \neq KERNEL\ TERMINATED}$
- $\mathbf{DESKTOP\ SHELL \neq CONTROL\text{-}PLANE\ AUTHORITY}$
- $\mathbf{RENDERER \neq PRIVILEGED\ KERNEL}$
- $\mathbf{UI\ COMPROMISE \neq UNRESTRICTED\ OS\ AUTHORITY}$
- $\mathbf{P7\ RUNTIME\ DECISION \neq P8\ RENDERER\ DECISION}$

---

## 1. Architectural Overview & System Topology

GRAVITAS adopts a **Hybrid Supervisor Multi-Process Topology** built upon **Electron (tracking Node.js 24 and Chromium 148+)**.

```
+===================================================================================================+
|                                    WINDOWS 11 OPERATING SYSTEM                                    |
+===================================================================================================+
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  |                            ELECTRON MAIN PROCESS (DESKTOP SUPERVISOR)                       |  |
|  |  - Owns Win32 System Tray & Context Menus                                                  |  |
|  |  - Owns Windows Action Center Notifications (AUMID: com.gravitas.os)                        |  |
|  |  - Owns Single-Instance Lock & Deep-Link Protocol (gravitas://)                              |  |
|  |  - Owns Auto-Start Registry Configuration (HKCU\...\Run)                                   |  |
|  |  - Supervises Window Lifecycle & Memory Reclamation                                         |  |
|  +------------------------------+-------------------------------+------------------------------+  |
|                                 |                               |                                 |
|               MessagePort / IPC |                               | utilityProcess.fork()           |
|                                 v                               v                                 |
|  +--------------------------------------------+   +--------------------------------------------+  |
|  |       RENDERER PROCESS (CHROMIUM BLINK)    |   |     KERNEL PROCESS (HEADLESS utilityProcess)   |  |
|  |  - Zero Node.js Access                     |   |  - Pure Node.js 24 Execution Engine        |  |
|  |  - sandbox: true, contextIsolation: true  |   |  - Embedded node:sqlite DatabaseSync       |  |
|  |  - WebGL2 / WebGPU Hardware Canvas         |   |  - State + Audit Event Log Engine          |  |
|  |  - Strictly Allowlisted gravitasAPI Bridge |   |  - Dependency DAG Scheduler                |  |
|  |  - Viewport Destroyed on Window Close      |   |  - Durable Job Queue & Heartbeat Leasing   |  |
|  +--------------------------------------------+   |  - Single Canonical Database Writer        |  |
|                                                   +---------------------+----------------------+  |
|                                                                         |                         |
|                                                                         | child_process.spawn()   |
|                                                                         v                         |
|                                                   +--------------------------------------------+  |
|                                                   |        EPHEMERAL WORKER SUBPROCESSES       |  |
|                                                   |  - agy, Codex, Claude Code, Tools          |  |
|                                                   |  - Managed via Windows Job Objects         |  |
|                                                   |  - Zero Direct Canonical Database Access   |  |
|                                                   +--------------------------------------------+  |
|                                                                                                   |
+===================================================================================================+
```

### Critical Invariants Enforced:
1. $\mathbf{DESKTOP\ UI \neq KERNEL}$: The UI is an ephemeral presentation client. The Kernel is a persistent execution engine.
2. $\mathbf{DESKTOP\ PROCESS\ LIFETIME \neq WORKSESSION\ LIFETIME}$: A long-running agent task, code generation run, or verification phase is bound to durable SQLite entities, never to the browser window or DOM lifecycle.
3. $\mathbf{WINDOW\ CLOSED \neq KERNEL\ TERMINATED}$: Closing the desktop window minimizes/hides to the system tray. Active WorkSessions proceed uninterrupted.
4. $\mathbf{RENDERER \neq PRIVILEGED\ KERNEL}$: The renderer process has zero access to Node.js built-ins (`fs`, `child_process`, `net`, `os`) and cannot directly query or mutate SQLite.

---

## 2. Process Responsibilities & Containment Boundaries

### 2.1 Electron Main Process (`DesktopSupervisor`)
- **Runtime:** Node.js 24 within Electron Main context.
- **Authority:** Full host desktop integration authority.
- **Responsibilities:**
  1. Creates and manages the Win32 `Tray` icon and context menu (`Open`, `Status`, `Pause All`, `Quit`).
  2. Registers and handles Windows 10/11 Toast Notifications via Windows Action Center.
  3. Enforces single-instance mutual exclusion (`app.requestSingleInstanceLock()`).
  4. Manages the lifecycle of the `utilityProcess` hosting the P6 Kernel.
  5. Manages the lifecycle of `BrowserWindow` instances. When hidden, can destroy the renderer webContents to reclaim $\sim 100\text{MB}$ of RAM while keeping the Kernel alive.
- **Constraint:** Main process **never** performs heavy compute, AST parsing, or blocking database transactions to ensure the desktop UI remains responsive (60fps).

### 2.2 Kernel Process (`utilityProcess`)
- **Runtime:** Dedicated Node child process spawned via Electron `utilityProcess.fork()`. (Exact runtime compatibility with P6 `node:sqlite DatabaseSync` categorized as `REQUIRES_IMPLEMENTATION_VALIDATION` during early Phase K).
- **Chromium / DOM Overhead:** Minimal. It runs headless with no window, no DOM, no Blink renderer, and no GPU process attachment.
- **Responsibilities:**
  1. Owns the single canonical writer connection to `.gravitas/gravitas.db` via `node:sqlite DatabaseSync`.
  2. Executes the DAG Dependency Scheduler, Task allocation, and lease heartbeats.
  3. Spawns and supervises ephemeral worker subprocesses (CLI harnesses, tools) inside Windows Job Objects.
  4. Emits append-only audit events into the `events` table and streams telemetry to the UI.
  5. Communicates with the Main process and Renderer via typed `MessagePort` channels and Named Pipes.

### 2.3 Renderer Process (`UI Presentation Shell`)
- **Runtime:** Chromium Blink viewport.
- **Security Configuration:**
  ```typescript
  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  ```
- **Authority:** Zero host authority. Cannot spawn processes, cannot read the local disk, cannot access credentials.
- **P8 Boundary:** Exposes standard WebGL2, WebGPU, and DOM canvas surfaces for Wave P8 to select and implement the visual rendering engine.

---

## 3. Kernel Abstraction & Reversibility Layer (`HostAdapter`)

To prevent tight coupling between the P6 Kernel and Electron, the Kernel is architected behind a platform-agnostic `HostAdapter` interface:

```typescript
export interface HostAdapter {
  readonly platform: 'electron-utility-process' | 'detached-daemon' | 'headless-cli';
  sendTelemetry(channel: string, payload: unknown): void;
  onCommand(handler: (command: KernelCommand) => Promise<KernelResponse>): void;
  requestNotification(title: string, body: string, options?: NotificationOptions): void;
  requestShutdown(reason: string): Promise<void>;
}
```

### Modes Supported by the Same Kernel Codebase:
1. **Integrated Desktop Mode (Default):** The Kernel runs inside Electron's `utilityProcess` using `ElectronUtilityHostAdapter`. Telemetry flows over Chromium `MessagePort`.
2. **Headless Daemon Mode (Server/CLI):** The Kernel runs as a standalone detached Node.js process using `DaemonHostAdapter`. Telemetry flows over an authenticated Windows Named Pipe (`\\.\pipe\gravitas-control`) or Loopback HTTP/SSE.
3. **Reversibility Guarantee:** If a future wave or operator decision migrates to Tauri or a native shell, the core P6 Kernel logic remains decoupled; only the outer `HostAdapter` is swapped.

---

## 4. Local IPC Architecture

Communication across the boundaries uses a structured **Tri-Channel IPC Protocol**:

```
+---------------------------------------------------------------------------------+
|                               TRI-CHANNEL IPC PROTOCOL                          |
+-------------------+-----------------------------+-------------------------------+
| Channel Type      | Transport Mechanism         | Message Characteristics       |
+-------------------+-----------------------------+-------------------------------+
| 1. COMMAND        | Request-Reply (invoke/handle)| Strongly typed, validated,   |
|    CHANNEL        | via MessagePort             | strictly allowlisted methods  |
|                   |                             | (e.g. approveTask, startRun)  |
+-------------------+-----------------------------+-------------------------------+
| 2. QUERY          | Read-Only State Pull        | High-frequency DAG & task     |
|    CHANNEL        | via MessagePort             | queries with JSON snapshots   |
+-------------------+-----------------------------+-------------------------------+
| 3. EVENT          | Push Streaming (Pub/Sub)    | Chunked telemetry, token      |
|    CHANNEL        | via dedicated MessagePort   | streams, stdout/stderr diffs  |
+-------------------+-----------------------------+-------------------------------+
```

### High-Throughput Streaming & Zero-Copy Handling:
- Large binary artifacts (diffs, screenshots, test logs) are **never** passed across IPC as raw JSON strings.
- Binary payloads are transferred as zero-copy `ArrayBuffer` objects over `MessagePort` or referenced via file path and SHA-256 digest in the staging store (`.gravitas/evidence/`).
- Token streams from LLM workers are throttled and chunked at $16\text{ms}\text{--}33\text{ms}$ intervals (matching UI display refresh rates) to prevent V8 message queue saturation.

---

## 5. System Tray, Window Lifecycle & Memory Reclamation

### 5.1 System Tray Semantics
- The application maintains a permanent notification icon in the Windows 11 Taskbar Notification Area (System Tray).
- Tray icon displays dynamic visual indicators:
  - `Gray/Idle`: Kernel idle, no active tasks.
  - `Blue/Active`: Kernel executing active WorkSession.
  - `Orange/Attention`: Human approval gate pending.
  - `Red/Error`: Unhandled worker crash or recovery required.
- Tray context menu provides immediate access:
  - `Open GRAVITAS OS` (Restores and focuses main window)
  - `Active Runs: 2 (3 Tasks Running)` (Status summary)
  - `Pause All Tasks`
  - `Quit GRAVITAS` (Initiates clean shutdown)

### 5.2 Window Close vs Application Quit
```
[User clicks 'X' (Close Window)]
           |
           v
Is app.isQuitting === true?
           |
      +----+----+
      |         |
     NO        YES
      |         |
      v         v
Prevent Close  Initiate Graceful Teardown:
Hide Window    1. Stop DAG scheduler dispatch
               2. Send SIGTERM to worker processes
               3. Flush SQLite WAL checkpoint
               4. Unlink runtime lockfile
               5. app.exit(0)
```

### 5.3 Dynamic Memory Reclamation
When the main window is hidden to the system tray for extended periods:
1. Electron pauses CSS animations and releases the Chromium WebGL/WebGPU context.
2. If idle for $> 5\text{ minutes}$, the supervisor can optionally destroy the `BrowserWindow` instance completely, releasing all DOM trees and rendering structures.
3. The `utilityProcess` remains running, maintaining SQLite connections and active tasks with a reduced headless working set (footprint classified as `REQUIRES_P8/D_PHASE_PROTOTYPE_MEASUREMENT`; indicative external benchmarks suggest $\sim 50\text{--}65\text{MB}$).
4. When the user clicks the tray icon, the window is recreated and re-attached via cached IPC state (latency classified as `REQUIRES_P8/D_PHASE_PROTOTYPE_MEASUREMENT`; target $< 500\text{ms}$).

---

## 6. Native Windows 11 Integration

1. **Native Toast Notifications & Action Center:**
   - Registers with the Windows Shell under App User Model ID (`app.setAppUserModelId('com.gravitas.os')`).
   - Action Center notifications include action buttons: `[Approve]`, `[Reject]`, `[Inspect Diff]`.
   - Notification content is strictly sanitized: raw API keys, bearer tokens, or full prompt context are never included in notification bodies.
2. **Auto-Start at Login:**
   - Configured via Windows Registry `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
   - When launched with `--hidden`, the app boots directly to the system tray without popping up a window, pre-initializing the SQLite database and background scheduler.
3. **Single-Instance Enforcement & Deep Links:**
   - Primary instance acquires lock via `app.requestSingleInstanceLock()`.
   - If a secondary instance is launched (e.g., via command line or browser clicking `gravitas://run/123`), the secondary instance forwards command-line arguments and deep-link URLs to the primary instance over Windows IPC and exits immediately.

---

## 7. Packaging, Updates & Zero-Spend Distribution

1. **Packaging with `electron-builder`:**
   - Targets **NSIS per-user installer** (`perMachine: false`, `oneClick: false`).
   - Installs to `%LOCALAPPDATA%\Programs\gravitas`.
   - **Zero UAC Elevation Required:** Installs without requesting Windows Administrator privileges.
2. **Zero-Spend Auto-Updates (`electron-updater`):**
   - Targets public **GitHub Releases** (`provider: 'github'`).
   - Uses `.blockmap` differential updates: when an update is released, users download only the changed binary delta ($\sim 2\text{--}5\text{MB}$) rather than the entire installer.
   - Updates are downloaded silently in the background and applied only upon explicit user confirmation or next application launch.
3. **Windows Code Signing:**
   - **Tier 1 (Development & Alpha):** Unsigned or self-signed with documented SHA-256 digests and automated PowerShell trust scripts ($\mathbf{\Delta\text{Spend} = \$0.00}$).
   - **Tier 2 (Internal/Local Distribution):** Workstation-trusted self-signed certificates ($\mathbf{\Delta\text{Spend} = \$0.00}$).
   - **Tier 3 (Public Open-Source Distribution):** Categorized as **POTENTIAL ZERO-COST PUBLIC SIGNING PATH — ELIGIBILITY/ACCEPTANCE NOT YET PROVEN** via SignPath Foundation. If ineligible, distribution falls back to Tier 1/2. Commercial EV certificates represent future enterprise options, preserving zero runtime spend.
