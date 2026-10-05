# ARCHITECTURE DECISION PACKET: WAVE P7 DESKTOP RUNTIME DECISION
## Formal Multi-Agent Decision Packet for Wave P7 (Desktop Shell & Integration)

**Packet ID:** `ADP-P7-001`  
**Date:** 2026-10-01  
**Status:** PROPOSED FINAL DECISION — READY FOR HUMAN REVIEW  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants:**
- $\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$
- $\text{CAPABILITY} \neq \text{TOOL} \neq \text{TRANSPORT} \neq \text{CREDENTIAL} \neq \text{AUTHORITY}$
- $\text{TOOL DECLARATION} \neq \text{TOOL QUALIFICATION} \neq \text{TOOL AUTHORIZATION} \neq \text{TOOL EXECUTION}$
- $\text{DISCOVERY} \neq \text{INSTALLATION} \neq \text{AUTHENTICATION} \neq \text{TRUST}$
- $\text{ARCHITECTURE CONTRACT} \neq \text{CURRENT IMPLEMENTATION}$
- $\text{VISUAL WORLD} = \text{PROJECTION OF RUNTIME STATE}$
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$
- $\mathbf{AGENT\_PAYMENT\_AUTHORITY = NONE}$
- $\mathbf{UNKNOWN \neq ASSUMED}$
- $\mathbf{HUMAN\ DECISION \neq AGENT\ CONSENSUS}$
- $\mathbf{P6\ TARGET\ ARCHITECTURE \neq CURRENT\ P2\ RUNTIME}$
- $\mathbf{DURABILITY \neq IN\text{-}MEMORY\ CACHE}$
- $\mathbf{ONE\ CANONICAL\ OWNER\ PER\ MUTABLE\ DOMAIN}$
- $\mathbf{WORKER\ PROCESS \neq CANONICAL\ DATABASE\ WRITER}$
- $\mathbf{CROSS\text{-}RESOURCE\ ATOMICITY\ IS\ UNAVAILABLE}$
- $\mathbf{PARTIAL\ STATES\ MUST\ BE\ DETECTABLE\ +\ RECONCILABLE}$
- $\mathbf{POLICY\ SHAPE\ =\ ARCHITECTURAL}$
- $\mathbf{UNVALIDATED\ NUMERIC\ DEFAULT\ =\ NON\text{-}NORMATIVE}$
- $\mathbf{DESKTOP\ UI \neq KERNEL}$
- $\mathbf{DESKTOP\ PROCESS\ LIFETIME \neq WORKSESSION\ LIFETIME}$
- $\mathbf{WINDOW\ CLOSED \neq KERNEL\ TERMINATED}$
- $\mathbf{DESKTOP\ SHELL \neq CONTROL\text{-}PLANE\ AUTHORITY}$
- $\mathbf{RENDERER \neq PRIVILEGED\ KERNEL}$
- $\mathbf{UI\ COMPROMISE \neq UNRESTRICTED\ OS\ AUTHORITY}$
- $\mathbf{P7\ RUNTIME\ DECISION \neq P8\ RENDERER\ DECISION}$
- $\mathbf{FRAMEWORK\ POPULARITY \neq ARCHITECTURAL\ FITNESS}$
- $\mathbf{SMALL\ BINARY \neq BETTER\ ARCHITECTURE}$
- $\mathbf{LOW\ IDLE\ RAM \neq BETTER\ ARCHITECTURE}$
- $\mathbf{CURRENT\ TOOLCHAIN\ ABSENCE \neq ARCHITECTURAL\ IMPOSSIBILITY}$

---

## 1. Architectural Question
> What desktop runtime architecture should host and integrate with the approved GRAVITAS local-first backend on Windows 11 while preserving future portability, enforcing strict zero-trust renderer sandboxing, enabling uninterrupted background execution, and maintaining zero incremental spend?

---

## 2. Hard Constraints Filter (C1 through C10)

| Constraint | Requirement | Evaluation Standard |
| :--- | :--- | :--- |
| **C1: Zero-Spend Invariant** | Must operate at $\mathbf{\Delta\text{Spend} = \$0.00}$. No mandatory paid cloud services, proprietary runtime licenses, or paid update servers. | Pass / Fail |
| **C2: Windows 11 First** | Must run seamlessly on modern Windows 11 (x64) with native Win32/Shell integration (Tray, AUMID notifications, Single-Instance). | Pass / Fail |
| **C3: P6 Kernel Integrity** | Must host or connect to the approved P6 Node.js Kernel (`node:sqlite DatabaseSync`, single canonical writer, durable jobs) without architectural deformation. | Pass / Fail |
| **C4: Background Survival** | Desktop shell must support running active tasks when the UI window is closed (`WINDOW CLOSED ≠ KERNEL TERMINATED`). System tray presence required. | Pass / Fail |
| **C5: Zero-Trust UI Sandbox** | Renderer process must be strictly sandboxed from direct OS shell, filesystem, credential, and database write access (`RENDERER ≠ PRIVILEGED KERNEL`). | Pass / Fail |
| **C6: Single-Instance Lock** | Must prevent multiple desktop instances from corrupting local SQLite databases or duplicating background daemon processes. | Pass / Fail |
| **C7: Native Notifications** | Must support native Windows Action Center notifications for human approval prompts and task completions without leaking secrets. | Pass / Fail |
| **C8: Offline Local-First** | Must function 100% offline without requiring internet access or cloud daemon authorization. | Pass / Fail |
| **C9: P8 Renderer Agnosticism** | Desktop runtime must support web-standard rendering surfaces (DOM, Canvas, WebGL, WebGPU) so P8 retains total freedom over visual engine selection. | Pass / Fail |
| **C10: Toolchain Viability** | Must have a clear, realistic development and build path on the host without insurmountable barrier-to-entry risks. | Pass / Fail |

---

## 3. Current Environment Reality & Toolchain Baseline

Direct empirical probes verified the host toolchain state:
- **Available Toolchains:**
  - Node.js: `v24.13.0` (`CURRENTLY_AVAILABLE`)
  - npm: `11.6.2` (`CURRENTLY_AVAILABLE`)
  - Git: `2.54.0.windows.1` (`CURRENTLY_AVAILABLE`)
  - Windows 11: Build `10.0.26100.9549` (24H2) (`CURRENTLY_AVAILABLE`)
  - WebView2 Runtime: Version `154.0.4258.48` (`CURRENTLY_AVAILABLE`)
  - Microsoft Edge: Version `154.0.4258.37` (`CURRENTLY_AVAILABLE`)
  - Google Chrome: Version `154.0.8037.58` (`CURRENTLY_AVAILABLE`)
  - .NET Runtimes: `Microsoft.NETCore.App 6.0.10`, `Microsoft.WindowsDesktop.App 6.0.10` (`CURRENTLY_AVAILABLE`)
- **Absent Toolchains:**
  - Rust & Cargo (`rustc`, `cargo`): `CURRENTLY_ABSENT`
  - Visual Studio C++ Build Tools (`cl.exe`, MSVC v143, `vswhere` returned zero VS instances): `CURRENTLY_ABSENT`
  - .NET SDKs (`dotnet --list-sdks` returned zero SDKs): `CURRENTLY_ABSENT`
  - Go runtime (`go`): `CURRENTLY_ABSENT`

---

### 4. Evaluated Candidates Summary

1. **Candidate A: Electron (Chromium + Node.js)** $\implies$ **`ELIGIBLE` (Selected)**
   - *Architecture:* Multi-process desktop container. Electron Main (Supervisor) + Node.js `utilityProcess` (P6 Kernel Engine) + Sandboxed Chromium (UI Renderer).
   - *Strengths:* Officially provides Node child process via `utilityProcess` without DOM overhead (exact runtime compatibility of bundled Node with P6 `node:sqlite` categorized as `REQUIRES_IMPLEMENTATION_VALIDATION`); immediate host toolchain readiness; mature Win32 Tray, Action Center, and Single-Instance APIs; locked Chromium version for WebGL2/WebGPU surface stability in P8; zero incremental spend.
   - *Trade-offs:* Higher memory footprint when UI is visible (`REQUIRES_P8/D_PHASE_PROTOTYPE_MEASUREMENT`; indicative external benchmarks $\sim 120\text{--}180\text{MB}$); mitigated by destroying renderer on tray hide.
2. **Candidate B: Tauri v2 (Rust + WebView2)** $\implies$ **`ELIGIBLE_WITH_TRADEOFFS`**
   - *Architecture:* Rust host (`tao`/`wry`) orchestrating host WebView2.
   - *Strengths:* Low idle memory (`REQUIRES_P8/D_PHASE_PROTOTYPE_MEASUREMENT`; indicative $\sim 30\text{--}50\text{MB}$), compact binary, excellent capability security model.
   - *Impedance:* Node.js is an alien runtime; requires packaging a complete Node SEA executable sidecar (adding $\sim 60\text{MB}$) or running an unbundled daemon; host toolchain (Rust + MSVC, $4\text{--}7\text{GB}$) is completely absent on machine.
3. **Candidate C: Headless Node.js Daemon + Browser / PWA (Edge App Mode)** $\implies$ **`COUNTER_INDICATED FOR TARGET DESKTOP EXPERIENCE`**
   - *Architecture:* Local Node daemon serving web UI; accessed via browser or `msedge.exe --app`.
   - *Deficits:* Operational disadvantages for desktop OS experience: no system tray presence, no window close interception, no custom AUMID Action Center integration, browser sandbox blocks local named pipe access. Preserved strictly as headless server fallback.
4. **Candidate D: Windows-Native C# / WinUI 3 (.NET + WebView2)** $\implies$ **`COUNTER_INDICATED`**
   - *Deficits:* No .NET SDK on host; splits codebase between C# and TypeScript; locks GRAVITAS to Windows with zero macOS/Linux portability path.
5. **Candidate E: Alternative Webview Runtimes (Neutralinojs, Wails, NW.js)** $\implies$ **`LOW_PRIORITY / REJECTED`**
   - *Deficits:* Toolchain absence (Go for Wails), immature security bridges, or lagging maintenance (NW.js).

---

## 5. Empirical Experiments Evidence

1. **`EXP-P7-01` (Windows Named Pipe vs Loopback TCP IPC):**
   - *Observation:* Pure Node.js on Windows 11 achieves $\sim 0.116\text{ms}$ roundtrip latency over Windows Named Pipes and $\sim 0.110\text{ms}$ over Loopback TCP.
   - *Security Implication:* Named Pipes provide native Win32 ACL security descriptors scoped to the current user's SID, preventing unauthorized local processes from hijacking control sockets.
2. **`EXP-P7-02` (Detached Background Node.js Daemon Lifecycle):**
   - *Observation:* Proved that Node.js `child_process.spawn(..., { detached: true, stdio: 'ignore' })` with `unref()` survives parent process exit, maintains an authenticated lockfile, serves Named Pipe requests, and cleanly shuts down on demand.
   - *Boundary Clarification:* Evaluated detached Node.js `child_process` (`DaemonHostAdapter` model), **not** an Electron `utilityProcess`. In Electron, a `utilityProcess` is bound to the Electron Main process; it does not survive `ELECTRON_MAIN_TERMINATED`.
3. **`EXP-P7-03` (Microsoft Edge `--app` Mode Probe):**
   - *Observation:* Proved Edge application mode functions without address bar, but confirmed physical absence of native system tray residency, custom Action Center notifications, and window close interception, counter-indicating pure PWA/browser as the primary desktop OS shell.

---

## 6. Active Contradictions & Evidence-Disciplined Resolutions

### Contradiction CON-P7-01: Framework Popularity / Reputation vs Architectural Fitness
- **The Controversy:** Electron is widely criticized for high memory consumption and binary size, while Tauri v2 is praised for minimal footprint.
- **The Evidence-Disciplined Resolution:**
  - Invariants: $\mathbf{SMALL\ BINARY \neq BETTER\ ARCHITECTURE}$, $\mathbf{LOW\ IDLE\ RAM \neq BETTER\ ARCHITECTURE}$, $\mathbf{CURRENT\ TOOLCHAIN\ ABSENCE \neq ARCHITECTURAL\ IMPOSSIBILITY}$.
  - While Tauri v2 is an exceptional framework, running the P6 Kernel (`node:sqlite`) in Tauri requires either bundling a complete Node.js binary as a sidecar (which expands installer size to $\sim 60\text{MB}$ and negates Tauri's binary advantage) OR maintaining an asynchronous two-language bridge across Rust and TypeScript.
  - Furthermore, installing the required Rust and MSVC C++ toolchain ($4\text{--}7\text{GB}$) creates immediate friction, whereas Electron builds directly on the operator's verified Node.js v24.13.0 environment.
  - With Electron's `utilityProcess`, the Kernel runs without any Chromium or DOM overhead. Exact working set memory numbers are classified as `REQUIRES_P8/D_PHASE_PROTOTYPE_MEASUREMENT`.
  - Exact runtime compatibility of Electron's bundled Node with the frozen P6 `node:sqlite` kernel is categorized as `REQUIRES_IMPLEMENTATION_VALIDATION`.

### Contradiction CON-P7-02: Embedded Container vs Detached Daemon (Model D Resolution)
- **The Controversy:** Should the desktop shell own the Kernel process (Model A), or should the Kernel run as an independent detached system daemon that the UI merely connects to (Model B)?
- **The Resolution:** **Adopt Hybrid Supervisor Model D with Explicit Lifetime Boundaries:**
  1. **Normal Desktop Operation (`ELECTRON_MAIN_ALIVE + WINDOW_DESTROYED`):** Electron Main acts as the long-lived `DesktopSupervisor` whose process lifetime intentionally owns the Kernel `utilityProcess`. When the window is closed, the window/renderer is destroyed or hidden, but Electron Main remains running in the system tray and the Kernel continues executing.
  2. **Supervisor Crash / Termination (`ELECTRON_MAIN_TERMINATED`):** In Electron, `utilityProcess` is child-managed; if Electron Main crashes or terminates, the `utilityProcess` terminates. Survivability across Main crashes is provided by the **P6 Startup Reconciler upon restart** (which recovers SQLite state, detects interrupted leases, and resumes tasks).
  3. **Decoupled Daemon Topology (`DaemonHostAdapter`):** To preserve architectural flexibility and support true unparented daemon execution, the P6 Kernel implements `HostAdapter`. If headless/server execution is selected, `DaemonHostAdapter` runs the Kernel as an independent detached background process completely separate from any UI shell.

### Contradiction CON-P7-03: Windows 11 Code Signing & Zero-Spend
- **The Controversy:** Windows SmartScreen blocks unsigned applications, but EV code-signing certificates cost $\$250\text{--}\$600/\text{year}$.
- **The Resolution:**
  - **Tier 1: Development & Local Testing:** Provide unsigned/self-signed NSIS installers with published SHA-256 digests and 1-click PowerShell unblock scripts ($\mathbf{\Delta\text{Spend} = \$0.00}$).
  - **Tier 2: Internal/Local Distribution:** Self-signed certificate trusted on the local workstation ($\mathbf{\Delta\text{Spend} = \$0.00}$).
  - **Tier 3: Public Open-Source Distribution:** Categorized as **POTENTIAL ZERO-COST PUBLIC SIGNING PATH — ELIGIBILITY/ACCEPTANCE NOT YET PROVEN** via SignPath Foundation GitHub Actions integration. Acceptance into SignPath is not treated as a guaranteed architectural constant; if ineligible, distribution defaults to Tier 1/2.
  - Commercial EV certificates are noted as an enterprise commercialization concern, not autonomous runtime spend.

---

## 7. Selected Target Architecture Summary

1. **Desktop Shell Runtime:** **Electron** (Latest Stable release tracking Node.js 24 and Chromium 148+).
2. **Process Topology:**
   - **Main Process (Node.js):** Desktop Supervisor. Owns Win32 Tray, Action Center Notifications (AUMID `com.gravitas.os`), Single-Instance Lock, auto-start registry, and window lifecycle.
   - **Kernel Process (`utilityProcess`):** Headless Node.js process hosting the P6 Kernel (`node:sqlite DatabaseSync`, DAG scheduler, durable jobs, single canonical database writer). Zero DOM/Chromium overhead.
   - **Renderer Process (Chromium):** Sandboxed web viewport. `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. Strictly typed preload bridge (`gravitasAPI`).
3. **Local IPC:**
   - Primary: High-throughput Chromium `MessagePort` / Mojo IPC directly connecting Renderer to `utilityProcess` (bypassing Main process for heavy streaming).
   - Secondary / Headless: Authenticated Windows Named Pipe (`\\.\pipe\gravitas-control`) secured by current-user SID ACL.
4. **Lifecycle Semantics:**
   - `Close Window` $\implies$ Hides to tray (or destroys renderer to reclaim RAM); Kernel keeps running.
   - `Quit GRAVITAS` $\implies$ Explicit graceful shutdown: halts new task dispatch, drains active workers, flushes SQLite WAL, exits cleanly.

---

## 8. Deferred K-Phase Implementation Validations

1. **`EXP-K-05` (Electron `utilityProcess` + `node:sqlite` Stress Test):** Empirical verification of SQLite concurrency and WAL checkpoints inside Electron's `utilityProcess` on Windows 11.
2. **`EXP-K-06` (Renderer Memory Reclamation on Tray Hide):** Measuring actual working set delta when destroying and reconstructing the `BrowserWindow` renderer context across tray hide/show cycles.
3. **`EXP-K-07` (Windows Action Center COM Activation):** Packaging and testing interactive toast notifications with `toastActivatorCLSID` in an NSIS per-user build.
4. **`EXP-K-08` (Named Pipe Win32 Security Descriptor Verification):** Implementing and testing native Windows ACL security attributes on `\\.\pipe\gravitas-control`.
5. **`EXP-K-09` (Electron-Bundled Node & `node:sqlite` Binary Compatibility Probe):** Empirically verifying that the exact Electron release selected bundles a Node.js engine with fully functional `node:sqlite DatabaseSync` and WAL support inside `utilityProcess`.

---

## 9. Human Approval Block

```
================================================================================
GRAVITAS WAVE P7 ARCHITECTURE DECISION APPROVAL
Wave: P7 — Desktop Runtime Decision
Status: COMPLETE — READY FOR HUMAN REVIEW
Decision: Adopt Candidate A (Electron with Hybrid Supervisor Topology & utilityProcess)
================================================================================
[ ] APPROVED: Proceed to Wave P8 (Renderer Strategy Decision)
[ ] REJECTED: Return to Wave P7 with specified architectural corrections
[ ] BLOCKED: Specify human authority requirement
================================================================================
```
