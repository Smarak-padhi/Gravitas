# GRAVITAS — TARGET DESKTOP LIFECYCLE MODEL
## Process States, Teardown Protocols & 20 Mandatory Failure Scenarios (A through T)

**Status:** APPROVED ARCHITECTURAL SPECIFICATION  
**Wave:** P7 — Desktop Runtime Decision  
**Date:** 2026-10-01  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants:**
- $\mathbf{DESKTOP\ UI \neq KERNEL}$
- $\mathbf{DESKTOP\ PROCESS\ LIFETIME \neq WORKSESSION\ LIFETIME}$
- $\mathbf{WINDOW\ CLOSED \neq KERNEL\ TERMINATED}$
- $\mathbf{ONE\ CANONICAL\ OWNER\ PER\ MUTABLE\ DOMAIN}$
- $\mathbf{TIMEOUT \neq FAILURE}$
- $\mathbf{PROCESS\ TERMINATED \neq EXTERNAL\ SIDE\ EFFECT\ REVERSED}$
- $\mathbf{CROSS\text{-}RESOURCE\ ATOMICITY\ IS\ UNAVAILABLE}$
- $\mathbf{PARTIAL\ STATES\ MUST\ BE\ DETECTABLE\ +\ RECONCILABLE}$

---

## 1. Process State Machine & Lifecycle Topology

The desktop runtime architecture explicitly distinguishes two primary operational states regarding Kernel persistence:
1. **`ELECTRON_MAIN_ALIVE + WINDOW_DESTROYED` (Normal Tray Residency):**
   - Electron Main acts as the long-lived `DesktopSupervisor` residing in the Win32 system tray.
   - When the user closes the window (`[X]`), the `BrowserWindow` instance and Chromium renderer are hidden or destroyed to reclaim memory.
   - The Kernel process (`utilityProcess`) remains alive and supervised, continuing active WorkSessions, task allocation, and durable job execution.
   - Invariant enforced: $\mathbf{WINDOW\ CLOSED \neq KERNEL\ TERMINATED}$.
2. **`ELECTRON_MAIN_TERMINATED` (Supervisor Crash or Force Kill):**
   - In Electron, a `utilityProcess` is child-managed; its lifecycle is tied to the parent Electron Main process via Chromium IPC pipes.
   - If Electron Main crashes or is terminated abruptly, the `utilityProcess` terminates.
   - **Durability Contract:** Survivability is **NOT** achieved by unparented process survival; it is achieved through **Crash Recovery via the P6 Startup Reconciler**: upon the next launch, the Reconciler inspects SQLite, detects expired leases, recovers staged artifacts, and marks interrupted tasks as `INTERRUPTED`.
   - **Decoupled Daemon Option:** If a deployment requires the Kernel to survive total desktop UI host termination during runtime without restarting, the architecture preserves `DaemonHostAdapter` (running the Kernel as an independent detached background process as proven in `EXP-P7-02`).

```
+---------------------------------------------------------------------------------------------------+
|                                     SUPERVISOR LIFECYCLE (MAIN)                                   |
| [STARTUP] -> [ACQUIRE_LOCK] -> [SPAWN_KERNEL] -> [CREATE_TRAY] -> [SHOW_WINDOW]                  |
|                                     |                                 |                           |
|                         [ON_WINDOW_CLOSE]               [ON_EXPLICIT_QUIT]                        |
|                                     v                                 v                           |
|                      [ELECTRON_MAIN_ALIVE +]                 [INITIATE_DRAIN]                     |
|                      [  WINDOW_DESTROYED   ]                          v                           |
|                                     |                       [STOP_KERNEL_PROCESS]                 |
|                            (Kernel Unaffected)                        v                           |
|                                                             [ELECTRON_MAIN_TERMINATED]            |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Core Operational Lifecycle Traces

### 2.1 First Launch & Normal Launch
1. **Launch Initiation:** User launches `gravitas.exe` (or Windows auto-start triggers `--hidden`).
2. **Single-Instance Mutex:** Supervisor calls `app.requestSingleInstanceLock()`. If lock fails $\implies$ forwards arguments to existing instance and exits.
3. **Kernel Initialization:** Supervisor forks `utilityProcess.fork(path.join(__dirname, 'kernel.js'))`.
4. **Startup Reconciler:** Kernel runs P6 startup reconciliation scanner:
   - Probes `.gravitas/gravitas.db` WAL integrity.
   - Cleans interrupted execution leases (`leases.state = 'EXPIRED'`).
   - Scans staged evidence artifacts (resolving Cases A through E).
5. **System Tray Mounting:** Supervisor creates Win32 system tray icon with context menu.
6. **Window Presentation:** If launched normally, creates `BrowserWindow` and presents UI upon `ready-to-show`. If launched with `--hidden`, remains in tray.

### 2.2 Window Close (`[X]`)
1. User clicks the window close button (`[X]`).
2. Electron `BrowserWindow.on('close')` intercepts the event.
3. If `app.isQuitting === false`:
   - Calls `event.preventDefault()`.
   - Calls `mainWindow.hide()`.
   - Optionally schedules renderer webContents destruction if idle for $> 5\text{ minutes}$.
4. **Kernel Behavior:** Kernel continues executing active tasks, leasing heartbeats, and running background durable jobs. Invariant $\mathbf{WINDOW\ CLOSED \neq KERNEL\ TERMINATED}$ is upheld.

### 2.3 Explicit Quit (`Quit GRAVITAS`)
1. User selects `Quit GRAVITAS` from the system tray context menu.
2. Supervisor sets `app.isQuitting = true`.
3. Supervisor dispatches `SHUTDOWN_REQUEST` to Kernel over IPC.
4. **Kernel Teardown Protocol:**
   - Halts DAG scheduler task dispatch.
   - Sends `SIGTERM` to active ephemeral worker subprocesses (giving 5000ms grace period).
   - If workers fail to exit $\implies$ terminates Windows Job Object.
   - Executes SQLite checkpoint: `PRAGMA wal_checkpoint(TRUNCATE)`.
   - Closes database connection.
   - Emits `SHUTDOWN_ACK` to Supervisor.
5. Supervisor destroys tray icon, closes windows, and terminates process cleanly (`app.exit(0)`).

---

## 3. Mandatory Failure Scenarios Matrix (Scenarios A through T)

### Scenario A: UI crashes while Kernel executes tasks
- **Failure:** Chromium Renderer process encounters an unhandled exception or GPU crash and terminates.
- **Kernel Impact:** **Zero**. The Kernel runs in an independent `utilityProcess` and continues executing tasks, writing to SQLite, and advancing the DAG.
- **Recovery:** Supervisor detects `mainWindow.webContents.on('render-process-gone')`. Logs diagnostic crash dump, presents a Windows Action Center notification, and re-spawns a fresh `BrowserWindow`. The new renderer reconnects via IPC, requests state snapshot from Kernel, and seamlessly resumes display.

### Scenario B: Kernel crashes while UI remains open
- **Failure:** Unhandled error or native exception crashes the `utilityProcess`.
- **UI Impact:** Renderer detects `utilityProcess.on('exit')` or IPC disconnection.
- **Recovery:** UI immediately enters `DISCONNECTED / RECONNECTING` state. Supervisor evaluates restart policy (max 3 restarts within 60s to prevent crash loops). Supervisor spawns a fresh `utilityProcess`. The new Kernel runs the P6 Startup Reconciler: marks orphaned active tasks as `INTERRUPTED`, restores consistent SQLite state, and reconnects to UI.

### Scenario C: User closes main window during active WorkSession
- **Failure:** User inadvertently clicks `[X]` assuming it terminates work.
- **Behavior:** Supervisor intercepts close event, prevents termination, and hides window to tray. A subtle Windows Toast notification notifies user: *"GRAVITAS is still running in the system tray. Active tasks will continue."*

### Scenario D: User explicitly quits GRAVITAS during active mutation
- **Failure:** User selects `Quit GRAVITAS` while a worker is committing code or running a mutation.
- **Behavior:** Supervisor prompts user with native dialog: *"A task is actively mutating repository files. Force quitting may leave uncommitted changes in the worktree. [Wait for Task] [Quit Now]"*. If user confirms [Quit Now], Kernel records task state as `INTERRUPTED`, cancels worker process, cleans lockfiles, and cleanly exits. Upon next launch, the Startup Reconciler re-evaluates the worktree.

### Scenario E: Second GRAVITAS instance launches
- **Failure:** User double-clicks `gravitas.exe` while an instance is already running.
- **Behavior:** Secondary instance fails `app.requestSingleInstanceLock()`. Emits command-line arguments to primary instance via Chromium IPC and immediately exits. Primary instance restores and focuses its main window.

### Scenario F: IPC authentication token is stale
- **Failure:** Renderer passes an outdated session/auth token to the Kernel.
- **Behavior:** Kernel rejects invocation with `UNAUTHENTICATED / INVALID_TOKEN`. Renderer logs error, requests fresh token handshake from Main process, and retries.

### Scenario G: Renderer is compromised through malicious content
- **Failure:** Malicious code in a web-scraped artifact achieves XSS in the DOM.
- **Blast-Radius Containment:** Renderer has no Node.js built-ins (`fs`, `child_process`, `net`). Preload bridge enforces strict allowlisting: malicious script cannot invoke arbitrary shell or database queries. Attacker cannot escape the Chromium sandbox.

### Scenario H: Malicious project attempts privileged IPC command
- **Failure:** Injected script in repository assets calls an internal Kernel channel.
- **Behavior:** Preload bridge rejects any channel not in `ALLOWED_INVOKE_CHANNELS`. Kernel validates caller origin and denies unauthorized authority grants.

### Scenario I: Kernel version and desktop version mismatch
- **Failure:** Partial update replaces UI bundle without updating Kernel binary.
- **Behavior:** IPC handshake verifies `BUILD_VERSION` and `SCHEMA_VERSION`. If mismatched, UI halts with `INCOMPATIBLE_RUNTIME_VERSION` and prompts user to restart or run installer repair.

### Scenario J: Update is available while WorkSession is active
- **Failure:** Auto-updater downloads an update while a long-running multi-agent workflow is active.
- **Behavior:** `electron-updater` stages the update in a temporary directory. Automatic restart is strictly postponed until active WorkSessions reach `IDLE` or `WAITING_APPROVAL`.

### Scenario K: Update fails halfway
- **Failure:** Network drops or power cuts during differential binary patch application.
- **Behavior:** NSIS atomic replacement semantics: existing binaries remain untouched until the complete update is verified and unpacked. If incomplete, update files are deleted and system continues running existing version.

### Scenario L: OS shuts down during active task
- **Failure:** Windows Update triggers reboot or user shuts down PC during task execution.
- **Behavior:** Supervisor intercepts `app.on('before-quit')` and Windows `WM_QUERYENDSESSION`. Requests immediate fast WAL flush (`PRAGMA wal_checkpoint(PASSIVE)`). On subsequent reboot, the P6 Startup Reconciler detects stale active leases, marks tasks `INTERRUPTED`, and enables operator resumption.

### Scenario M: Auto-start launches after previous crash
- **Failure:** System crashed previously; auto-start launches at user login.
- **Behavior:** Startup Reconciler inspects `.gravitas/crash_state.json`. If 3 consecutive crashes occurred within 5 minutes, auto-start enters **Safe Mode**: launches directly to tray without auto-resuming tasks, prompting the user for diagnostic review.

### Scenario N: Kernel becomes orphaned
- **Failure:** Main process dies abruptly while Kernel is active.
- **Behavior:**
  - In default desktop mode (`utilityProcess`): The `utilityProcess` is tied to the Electron Main process lifecycle via parent Chromium IPC pipe closure. If the parent pipe closes abruptly, the `utilityProcess` detects disconnection and initiates graceful self-termination within 5000ms. State recovery occurs on next launch via the P6 Startup Reconciler.
  - In decoupled daemon mode (`DaemonHostAdapter`): The detached Node.js process (proven in `EXP-P7-02`) intentionally continues executing active tasks in the background, updates its discovery lockfile, and awaits reconnection from a newly launched desktop shell over the Windows Named Pipe.

### Scenario O: Desktop becomes orphaned
- **Failure:** Kernel exits unexpectedly while UI remains active.
- **Behavior:** Handled identically to Scenario B: UI detects disconnection, displays connection loss banner, and Supervisor re-spawns the Kernel.

### Scenario P: Credential request originates from compromised renderer
- **Failure:** Injected UI script attempts to query raw API keys.
- **Behavior:** The IPC bridge exposes zero channels that return raw credentials. Kernel returns only opaque, scope-limited `CapabilityGrant` tokens.

### Scenario Q: Notification contains sensitive Tool output
- **Failure:** Worker generates confidential code snippet or password that could leak into the Windows Notification Center.
- **Behavior:** Kernel sanitizes notification payloads: all notification strings pass through a redaction filter removing secret patterns; only high-level status messages are dispatched.

### Scenario R: Deep link contains malicious parameters
- **Failure:** Phishing email tricks user into clicking `gravitas://exec?cmd=format+C:`.
- **Behavior:** Deep link parser strictly rejects arbitrary command strings. Only pre-defined navigational actions (`gravitas://view/worksession/:id`) are supported. Destructive actions require sovereign human approval.

### Scenario S: Application data directory becomes unwritable
- **Failure:** Disk fills up or NTFS permissions on `%LOCALAPPDATA%\gravitas\` become corrupted.
- **Behavior:** SQLite throws `SQLITE_IOERR` or `SQLITE_FULL`. Kernel transitions to `CRITICAL_ERROR` state, halts task dispatch to prevent data corruption, and displays an emergency alert to the operator.

### Scenario T: P8 renderer crashes/reloads repeatedly
- **Failure:** Buggy WebGL shader or rendering loop in P8 causes Chromium GPU process or renderer to crash repeatedly.
- **Behavior:** Supervisor tracks reload frequency. If $> 3\text{ crashes in } 30\text{s}$, Supervisor stops automatic reloads, displays a safe-mode fallback error card, and prompts the operator to inspect the crash log without affecting Kernel state.
