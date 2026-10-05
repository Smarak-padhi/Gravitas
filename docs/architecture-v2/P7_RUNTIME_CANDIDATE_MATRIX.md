# P7 RUNTIME CANDIDATE MATRIX
## Formal Multi-Candidate Evaluation & Comparative Trade-Off Analysis

**Status:** APPROVED ARCHITECTURAL EVIDENCE  
**Wave:** P7 — Desktop Runtime Decision  
**Date:** 2026-10-01  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants:**
- $\mathbf{DESKTOP\ UI \neq KERNEL}$
- $\mathbf{DESKTOP\ PROCESS\ LIFETIME \neq WORKSESSION\ LIFETIME}$
- $\mathbf{WINDOW\ CLOSED \neq KERNEL\ TERMINATED}$
- $\mathbf{FRAMEWORK\ POPULARITY \neq ARCHITECTURAL\ FITNESS}$
- $\mathbf{SMALL\ BINARY \neq BETTER\ ARCHITECTURE}$
- $\mathbf{LOW\ IDLE\ RAM \neq BETTER\ ARCHITECTURE}$
- $\mathbf{CURRENT\ TOOLCHAIN\ ABSENCE \neq ARCHITECTURAL\ IMPOSSIBILITY}$
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$

---

## 1. Evaluation Methodology & Disqualification Discipline

Candidates are evaluated through qualitative multi-dimensional analysis and empirical evidence. In accordance with Architecture Arena discipline:
- Arbitrary weighted numeric scoring (e.g., $8.4 / 10$) is strictly prohibited.
- `HARD_CONSTRAINT_INELIGIBLE` is applied **only** when a candidate physically violates a hard constraint.
- Otherwise, candidates are classified into:
  - `ELIGIBLE`
  - `ELIGIBLE_WITH_TRADEOFFS`
  - `COUNTER_INDICATED`
  - `REQUIRES_EXPERIMENT`
  - `LOW_PRIORITY`

---

## 2. Hard Constraints Filter (C1 through C10)

| Constraint ID | Name | Core Architectural Requirement | Standard |
| :--- | :--- | :--- | :--- |
| **C1** | **Zero-Spend Invariant** | Must operate at $\mathbf{\Delta\text{Spend} = \$0.00}$. No mandatory paid cloud services, proprietary runtime licenses, or paid update servers. | Pass / Fail |
| **C2** | **Windows 10/11 First** | Must run seamlessly on modern Windows 11 (x64) with native Win32/Shell integration. | Pass / Fail |
| **C3** | **P6 Kernel Integrity** | Must host or connect to the approved P6 Node.js Kernel (`node:sqlite DatabaseSync`, single canonical writer, durable jobs) without architectural deformation. | Pass / Fail |
| **C4** | **Background Survival** | Desktop shell must support running active tasks when the UI window is closed (`WINDOW CLOSED ≠ KERNEL TERMINATED`). System tray presence required. | Pass / Fail |
| **C5** | **Zero-Trust UI Sandbox** | Renderer process must be strictly sandboxed from direct OS shell, filesystem, credential, and database write access (`RENDERER ≠ PRIVILEGED KERNEL`). | Pass / Fail |
| **C6** | **Single-Instance Lock** | Must prevent multiple desktop instances from corrupting local SQLite databases or duplicating background daemon processes. | Pass / Fail |
| **C7** | **Native Notifications** | Must support native Windows Action Center notifications for human approval prompts and task completions without leaking secrets. | Pass / Fail |
| **C8** | **Offline Local-First** | Must function 100% offline without requiring internet access or cloud daemon authorization. | Pass / Fail |
| **C9** | **P8 Renderer Agnosticism** | Desktop runtime must support web-standard rendering surfaces (DOM, Canvas, WebGL, WebGPU) so P8 retains total freedom over visual engine selection. | Pass / Fail |
| **C10** | **Toolchain Viability** | Must have a clear, realistic development and build path on the host without insurmountable barrier-to-entry risks. | Pass / Fail |

---

## 3. Comprehensive Candidate Matrix

| Evaluation Dimension | Candidate A: Electron (Chromium + Node.js) | Candidate B: Tauri v2 (Rust + WebView2) | Candidate C: Node Daemon + Browser/PWA | Candidate D: WinUI 3 / C# (.NET + WebView2) | Candidate E: Wails / Neutralinojs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Eligibility Classification** | **`ELIGIBLE` (Selected)** | **`ELIGIBLE_WITH_TRADEOFFS`** | **`COUNTER_INDICATED`** | **`COUNTER_INDICATED`** | **`LOW_PRIORITY`** |
| **C1: Zero-Spend** | **PASS** (MIT license, free GitHub Releases updates, potential SignPath open-source signing [ELIGIBILITY_NOT_YET_PROVEN]) | **PASS** (MIT/Apache 2.0, static JSON updates) | **PASS** (Zero cost) | **PASS** (Free Community .NET) | **PASS** (MIT / Open source) |
| **C2: Windows 11 Fit** | **PASS** (Mature Win32 Tray, Notifications, AUMID, Registry Run keys) | **PASS** (Native Win32 via `tao`/`wry`, WebView2, tray plugins) | **FAIL (Partial)** (No native tray or window close interception) | **SUPERIOR** (100% native Windows App SDK) | **PASS** (Windows WebView2 / Edge) |
| **C3: P6 Kernel Integration** | **FAVORABLE** (Electron `utilityProcess` provides Node child process; exact `node:sqlite` compatibility categorized as `REQUIRES_IMPLEMENTATION_VALIDATION`) | **COMPLEX** (Node is external; requires SEA compilation or decoupled daemon over IPC) | **EXCELLENT** (Direct host Node runtime execution) | **COMPLEX** (Two languages; C# must manage Node subprocess via pipes) | **POOR** (External Node bridge required) |
| **C4: Background Survival** | **PASS** (Tray hide-on-close; `utilityProcess` executes with window closed while Main is alive) | **PASS** (Tray plugin; background thread / daemon execution) | **FAIL** (Closing browser tab/window kills UI; no tray residency) | **PASS** (Native Windows system tray / background task) | **PARTIAL** (Basic tray; brittle background controls) |
| **C5: Security Sandbox** | **STRONG** (`contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, typed preload; reduces escalation authority) | **SUPERIOR** (Rust capabilities system, fine-grained permission JSONs) | **MEDIUM** (Standard browser sandbox; cannot use named pipes) | **STRONG** (WebView2 web message bridge to C# host) | **WEAK** (Generic native command bridge) |
| **C6: Single-Instance** | **PASS** (`app.requestSingleInstanceLock()` + `second-instance` event) | **PASS** (`tauri-plugin-single-instance` via named pipe) | **COMPLEX** (Requires manual port/PID lockfile dance in browser) | **PASS** (Win32 Mutex / Single-instance App SDK API) | **PARTIAL** (Custom implementation needed) |
| **C7: Native Notifications** | **PASS** (Windows 11 Toast / Action Center via AUMID) | **PASS** (`tauri-plugin-notification`) | **POOR** (Web Notifications API; lacks custom AUMID pinning) | **SUPERIOR** (Direct Windows.UI.Notifications WinRT API) | **PARTIAL** (Basic OS notifications) |
| **C8: Offline Operation** | **PASS** (100% offline local bundles) | **PASS** (100% offline local bundles) | **PASS** (Localhost offline server) | **PASS** (100% offline local app) | **PASS** (100% offline) |
| **C9: P8 Flexibility** | **UNRESTRICTED** (Bundled Chromium provides WebGL2 & WebGPU surfaces) | **GOOD** (Evergreen WebView2 supports WebGL2 & WebGPU; slight OS variance) | **GOOD** (Host browser GPU support) | **GOOD** (WebView2 control supports WebGL/WebGPU) | **VARIABLE** (Varies by host webview) |
| **C10: Toolchain on Host** | **IMMEDIATE** (Node v24.13.0 and npm 11.6.2 ready on host today) | **HIGH SETUP FRICTION** (Rust, Cargo, MSVC C++ Build Tools currently absent) | **IMMEDIATE** (Node ready) | **HIGH SETUP FRICTION** (.NET SDK and Visual Studio absent) | **HIGH FRICTION** (Go / native toolchains absent) |
| **Idle Memory Footprint** | `REQUIRES_P8/D_PHASE_PROTOTYPE_MEASUREMENT` (Indicative: $\sim 50\text{--}65\text{MB}$ tray/utility; $\sim 120\text{--}180\text{MB}$ UI active) | `REQUIRES_P8/D_PHASE_PROTOTYPE_MEASUREMENT` (Indicative: $\sim 30\text{--}50\text{MB}$ UI; $\sim 70\text{--}100\text{MB}$ UI+Node) | $\sim 40\text{MB}$ (Node daemon) + browser tab RAM | $\sim 60\text{--}90\text{MB}$ (WinUI + WebView2) | $\sim 30\text{--}50\text{MB}$ |
| **Binary Installer Size** | $\sim 85\text{--}110\text{MB}$ (NSIS with bundled Chromium/Node) | $\sim 5\text{--}15\text{MB}$ (Pure UI) or $\sim 55\text{--}70\text{MB}$ (with Node SEA) | $0\text{MB}$ (uses host browser) | $\sim 40\text{--}65\text{MB}$ (.NET runtime + assets) | $\sim 10\text{--}25\text{MB}$ |
| **Packaging & Updates** | Mature `electron-builder` (NSIS per-user, GitHub Releases differential blockmaps) | Mature `tauri-plugin-updater` (Ed25519 signatures, GitHub Releases) | No packaging; manual script / browser shortcut | MSIX / Sparse package / Squirrel.Windows | Basic updater or manual release zip |
| **Codebase Continuity** | **100% TypeScript** across Core, Orchestrator, Shell, and UI | **Split Stack** (Rust host + TypeScript UI + Node.js Kernel) | **100% TypeScript** | **Split Stack** (C# shell + TypeScript UI/Kernel) | Split Stack (Go/C++ + TypeScript) |
| **Evidence Confidence** | `HIGH` (Empirically verified host probes, official Electron architecture data) | `HIGH` (Official Tauri v2 docs, architecture analysis, host probes) | `HIGH` (`EXP-P7-03` empirical probe results) | `HIGH` (Host .NET SDK probe, platform docs) | `MEDIUM` (Ecosystem analysis) |

---

## 4. Detailed Candidate Analysis

### Candidate A: Electron (Chromium + Node.js) — SELECTED
* **Verdict:** **`ELIGIBLE` — PREFERRED FOR GRAVITAS DESKTOP OS**.
* **Architectural Rationale:**
  1. **Node Child Process Alignment:** Electron's `utilityProcess` API officially provides a dedicated Node child process without DOM or Blink overhead. While exact runtime compatibility between the selected Electron version's bundled Node and the frozen P6 `node:sqlite` kernel `REQUIRES_IMPLEMENTATION_VALIDATION` in early Phase K, Electron avoids the need to build and maintain an external SEA compiler pipeline or a dual-language (Rust/C#) bridge.
  2. **Supervisor Topology (Model D):** Electron Main acts as the system supervisor. It hosts the system tray, handles single-instance locking, and spawns the Kernel in a headless `utilityProcess` (or connects to an independent detached daemon via `DaemonHostAdapter`). When the user closes the main window, the renderer is destroyed to reclaim memory, while the Kernel continues processing background WorkSessions.
  3. **Consistent Graphics Pipeline for P8:** Because Electron bundles an exact Chromium build, WebGL2 and WebGPU rendering surfaces are locked to a known browser version, minimizing rendering regressions from host OS browser updates.
  4. **Zero Toolchain Friction Today:** Builds immediately with the operator's existing Node.js v24.13.0 and npm 11.6.2 toolchain.
* **Trade-Offs & Mitigations:**
  - *Trade-off (RAM Usage):* `REQUIRES_P8/D_PHASE_PROTOTYPE_MEASUREMENT` (Indicative external benchmarks: $\sim 120\text{--}180\text{MB}$ active UI; mitigated by destroying renderer when window is hidden to tray to achieve lower utility-only footprint).
  - *Trade-off (Binary Size):* $\sim 90\text{MB}$ installer. *Mitigation:* Modern broadband and storage make $90\text{MB}$ an acceptable trade-off for zero toolchain friction and uniform graphics rendering.
  - *Trade-off (Security):* Renderer compromise could attempt IPC privilege escalation. *Mitigation:* Scoped defense-in-depth (`contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, strictly allowlisted preload bridge `gravitasAPI`) designed to REDUCE renderer-to-host escalation authority; escalation is contained by Kernel-level authority checks rather than assumed impossible.

---

### Candidate B: Tauri v2 (Rust + Microsoft Edge WebView2) — ELIGIBLE WITH TRADEOFFS
* **Verdict:** **`ELIGIBLE_WITH_TRADEOFFS` — COUNTER-INDICATED FOR IMMEDIATE PHASE K INITIALIZATION**.
* **Architectural Rationale:**
  - Tauri v2 is an exceptional, modern framework with best-in-class resource efficiency and capability-based security.
  - However, for GRAVITAS, it introduces two severe points of architectural impedance:
    1. **Language & Runtime Duality:** The P6 Kernel is a Node.js local engine utilizing `node:sqlite`. To run this within Tauri, GRAVITAS would need to package a complete Node.js binary as a sidecar (ballooning installer size to $\sim 60\text{MB}$ and negating Tauri's binary advantage) OR build an asynchronous Rust $\leftrightarrow$ Node IPC bridge.
    2. **Host Toolchain Absence:** The host currently lacks `rustc`, `cargo`, and Microsoft Visual Studio C++ Build Tools (`MSVC v143`). Installing this toolchain requires downloading $4\text{--}7\text{GB}$ of development tools and introduces significant compilation and CI/CD maintenance overhead.
  - While $\mathbf{CURRENT\ TOOLCHAIN\ ABSENCE \neq ARCHITECTURAL\ IMPOSSIBILITY}$, introducing a multi-language stack and complex sidecar build pipeline when a unified Node 24 runtime is already operational is an unjustified complexity cost.

---

### Candidate C: Headless Node.js Daemon + Browser / PWA — COUNTER-INDICATED FOR TARGET DESKTOP EXPERIENCE
* **Verdict:** **`COUNTER_INDICATED FOR TARGET DESKTOP EXPERIENCE` (PRESERVED STRICTLY AS HEADLESS SERVER FALLBACK)**.
* **Architectural Rationale:**
  - Directly tested during `EXP-P7-03` using Microsoft Edge `msedge.exe --app`.
  - While it has zero packaging overhead, it introduces decisive operational disadvantages for the target desktop OS experience:
    1. **Lack of System Tray Residency:** Closing the browser window terminates the UI with zero background lifecycle hooks.
    2. **Absence of Native Action Center Integration:** Standard browser notifications cannot register custom COM server activation or AUMID-pinned Action Center controls.
    3. **Sandbox IPC Limitations:** Web JavaScript in standard browsers cannot open local Windows Named Pipes.
    4. **Inability to Intercept Window Close:** Cannot implement clean background hide-on-close semantics without generic browser prompts.

---

### Candidate D: Windows-Native C# / WinUI 3 / Windows App SDK — COUNTER-INDICATED
* **Verdict:** **`COUNTER_INDICATED` (REJECTED)**.
* **Architectural Rationale:**
  - Requires compiling C# code. While .NET 6.0 runtime is installed, no .NET SDK is present on host.
  - Completely eliminates future portability to macOS or Linux without a total rewrite (e.g. Avalonia).
  - Splitting the codebase between C# (UI shell) and TypeScript (Kernel engine) introduces significant dual-toolchain overhead with zero architectural benefit over Electron.

---

### Candidate E: Alternative Webview Hosts (Wails, Neutralinojs, NW.js) — LOW PRIORITY / REJECTED
* **Verdict:** **`LOW_PRIORITY / REJECTED`**.
* **Architectural Rationale:**
  - *Wails:* Requires Go toolchain (absent on host); does not host Node.js.
  - *Neutralinojs:* Limited plugin ecosystem; fragile native bridge compared to Electron/Tauri.
  - *NW.js:* Legacy architecture with high security attack surface and sluggish community maintenance.
