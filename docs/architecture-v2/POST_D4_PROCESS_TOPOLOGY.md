# Post-D4 Process Topology & Runtime Boundary

## 1. Process Taxonomy & Ownership

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        ELECTRON MAIN PROCESS                           │
│                      (PID: e.g. 19112 / Host Node)                     │
│  - Window Management & Lifecycle (show / hide / restore)               │
│  - System Tray Controller & Native Context Menu                        │
│  - Single Instance Lock & Clean Shutdown Coordinator                   │
│  - Authority: OS Desktop integration only; NOT Canonical Authority     │
└───────────────┬────────────────────────────────────────┬───────────────┘
                │ IPC (utilityProcess.fork)              │ WebContents IPC
                ▼                                        ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│        KERNEL HOST PROCESS           │  │   CHROMIUM RENDERER PROCESS  │
│    (Electron utilityProcess)         │  │   (Sandbox: true, Isol: true)│
│    (PID: e.g. 22160 / Distinct)      │  │                              │
│  - Headless Node 24 runtime          │  │  - Command Center UI (D1)    │
│  - node:sqlite Single-Writer DB      │  │  - Living HQ 3D World (D3)   │
│  - WorkSession FSM & Job Leases (K0) │  │  - Role-Bot Visuals (D4)     │
│  - CapabilityGrant Registry (K3)     │  │  - Accessible DOM Outline    │
│  - Independent Verification (K5)     │  │  - Authority: NONE (Pure UI) │
│  - Authority: CANONICAL STATE        │  │  - ZERO direct SQLite        │
│                                      │  │  - ZERO child_process/spawn  │
└──────────────────┬───────────────────┘  └──────────────────────────────┘
                   │ Child Process Execution
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   CONTAINED HARNESS SUBPROCESSES                       │
│  - PowerShell Local CLI (`harness:powershell:local`)                   │
│  - Codex Contained Runner (`harness:codex:node`)                       │
│  - Claude Code Contained Runner (`harness:claude-code:cli`)            │
│  - agy Documentation Adapter (`harness:agy:local`)                     │
│  - Deterministic Tool Runners & Verifier Services                      │
│  - Authority: BOUNDED MUTATION (Contained within worktrees)            │
└────────────────────────────────────────────────────────────────────────┘
```

## 2. Lifecycle & Crash Semantics

1. **MAIN_CRASH != GUARANTEED_CONTINUOUS_KERNEL_SURVIVAL**:
   - As established in P7, an Electron Main process crash does NOT guarantee indefinite Kernel survival. If Main terminates abnormally, operating system process tree cleanup may terminate utilityProcess children.
2. **Window Hide / Close vs Daemon Continuity**:
   - Closing the Command Center window merely hides the browser window (`event.preventDefault(); window.hide()`).
   - The Kernel utilityProcess continues executing active work in the background.
   - Restoring the window reconstructs fresh projections without resetting or interrupting the Kernel.
3. **Renderer Reload Stability**:
   - Reloading the renderer process (`Ctrl+R` or programmatic reload) completely resets UI state, but leaves the Kernel utilityProcess PID completely unchanged and operational.
4. **Clean Shutdown & Zero Orphans**:
   - Explicit Quit sends `SHUTDOWN_REQUEST` to KernelHost.
   - The Kernel commits active transactions, closes SQLite safely, and acknowledges with `SHUTDOWN_ACK`.
   - UtilityProcess exits cleanly; zero orphan Node processes remain on the host.
