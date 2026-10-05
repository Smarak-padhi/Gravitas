# P7 ARENA INPUT PACKET: DESKTOP RUNTIME ARCHITECTURE
## Evidence-Backed Decision Dossier for Upcoming Wave P7

**Status:** ARCHITECTURAL INPUT DOSSIER — P5 DOGFOODING DELIVERABLE  
**Target Wave:** Wave P7 — Desktop Runtime Implementation & Shell Integration  
**Date:** 2026-09-30  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants:**
- $\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$
- $\text{CAPABILITY} \neq \text{TOOL} \neq \text{TRANSPORT} \neq \text{CREDENTIAL} \neq \text{AUTHORITY}$
- $\text{DISCOVERY} \neq \text{INSTALLATION} \neq \text{AUTHENTICATION} \neq \text{TRUST}$
- $\text{CURRENT REALITY} \neq \text{APPROVED TARGET CONTRACT} \neq \text{P5 PROPOSAL} \neq \text{FUTURE-WAVE INPUT}$
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$
- $\mathbf{WINDOWS\_11\_FIRST}$

---

## 1. Canonical Question & Context

### Primary Question
> What desktop runtime families appear credible for GRAVITAS given Windows-first development, background daemon operation, local process orchestration, Win32 system integration, high-performance rendering (WebGL/WebGPU), developer tooling ergonomics, and zero-spend constraints?

### Current Environment Reality (from P5 Current Probe & P1 Baseline)
* **OS:** Windows 11 Home (x64).
* **Installed Toolchain (Verified P5 Observation):** Node.js `v24.13.0`, npm `11.6.2`, Git `2.54.0.windows.1`, Windows PowerShell 5.1.
* **Absent Toolchains:** Rust (`rustc`/`cargo`) and C++ Build Tools (`MSVC`) are **not** installed in the host environment.
* **Epistemological Discipline:** The current absence of Rust is empirical evidence of *immediate toolchain setup friction*; it does **not** constitute an architectural disqualification of Tauri v2:
  $$\mathbf{CURRENT\ TOOLCHAIN\ ABSENCE \neq ARCHITECTURAL\ IMPOSSIBILITY}$$

---

## 2. Hard Constraint Filtering

| Candidate Runtime Family | Zero-Spend Invariant ($\$0.00$) | Windows 11 Native Integration | Background / System Tray Support | WebGL / WebGPU Support | Toolchain Readiness Today | Eligibility Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Candidate A: Electron** | **PASS** (MIT License) | **PASS** (Deep Win32 bindings) | **PASS** (Tray, background window) | **PASS** (Chromium GPU pipeline) | **IMMEDIATE** (Uses host Node v24) | `ELIGIBLE` |
| **Candidate B: Tauri v2** | **PASS** (MIT/Apache 2.0) | **PASS** (WebView2 on Win11) | **PASS** (Tray, background events) | **PASS** (WebView2 supports WebGL/WebGPU)| **REQUIRES SETUP** (Needs Rust/MSVC install) | `ELIGIBLE_WITH_TRADEOFFS` |
| **Candidate C: Headless Node Daemon + Browser PWA** | **PASS** (Zero cost) | **POOR** (No native window frame/tray without helper) | **PASS** (Runs as background service) | **PASS** (Host browser capability) | **IMMEDIATE** (Zero extra toolchain) | `ELIGIBLE_WITH_LIMITATIONS` |
| **Candidate D: Native C# / WinUI 3 Shell** | **PASS** (MIT/Free .NET) | **SUPERIOR** (100% native Windows) | **PASS** (Native Windows service) | **PASS** (DirectX / Win2D / WebView2)| **REQUIRES SETUP** (Needs Visual Studio/.NET SDK)| `ELIGIBLE_WITH_TRADEOFFS` |

---

## 3. Deep-Dive on Leading Candidate Families

### Candidate A: Electron (Chromium + Node.js)
* **Architecture:** Multi-process architecture (Main process in Node.js, Renderer process in Chromium, communicating via IPC with context isolation).
* **Pros:**
  1. *Zero Toolchain Friction:* Builds and executes immediately using the operator's existing Node.js v24.13.0 environment.
  2. *Unified Process Orchestration:* Node.js in the Main process can directly manage worker processes, Windows Job Objects, and local file access using familiar APIs.
  3. *Consistent WebGL/WebGPU Environment:* Bundles an exact Chromium version; zero variance across different client machines.
* **Cons & Critic Attacks:**
  1. *Resource Footprint:* Documented higher idle memory consumption [ILLUSTRATIVE EXTERNAL BENCHMARK: $\sim 150\text{MB} - 250\text{MB}$, requires local P7 measurement].
  2. *Binary Distribution Size:* Packaged installers typically exceed $\sim 80\text{MB} - 120\text{MB}$ due to bundled Chromium [ILLUSTRATIVE ESTIMATE].
  3. *Security Hardening Burden:* Requires strict context isolation and disabling `nodeIntegration` to prevent remote XSS from escalating to host code execution.

### Candidate B: Tauri v2 (Rust Core + Windows WebView2)
* **Architecture:** Rust backend orchestrates system capabilities and exposes typed IPC commands to an OS-provided WebView2 (Microsoft Edge Chromium) frontend.
* **Pros:**
  1. *Documented Efficiency:* Lower idle memory footprint reported in published benchmarks [ILLUSTRATIVE EXTERNAL BENCHMARK: $\sim 30\text{MB} - 60\text{MB}$, requires local P7 measurement]; smaller installer footprint ($< 15\text{MB}$ [ILLUSTRATIVE ESTIMATE]) because it leverages the pre-installed Windows 11 WebView2 runtime.
  2. *Robust Security by Design:* Granular capability permission system built into Tauri v2; webview cannot access host APIs without explicit permission grants.
* **Cons & Critic Attacks:**
  1. *Toolchain Prerequisite:* Requires installing Rust toolchain and Visual Studio C++ Build Tools on the operator machine.
  2. *Two-Language Complexity:* Core orchestration in Rust while existing GRAVITAS codebase is 100% TypeScript/Node.js. Requires maintaining a Rust $\leftrightarrow$ Node/TS bridge or rewriting orchestration in Rust.
  3. *WebView2 Environmental Drift:* Relies on the host's installed WebView2 version, which updates via Windows Update independently of GRAVITAS.

### Candidate C: Headless Node.js Daemon + Local PWA
* **Architecture:** Node.js runs as a background Windows service/daemon exposing a local HTTP/WebSocket server; operator accesses the command center via `http://localhost:port` in standard Chrome/Edge.
* **Pros:** Absolute simplest architecture; zero packaging overhead; instant hot-reloading.
* **Cons & Critic Attacks:** Lacks native desktop integration (cannot easily minimize to system tray, capture global hotkeys, or operate seamlessly when browser tab is closed).

---

## 4. Comparative Trade-Off Matrix

| Evaluation Dimension | Candidate A: Electron | Candidate B: Tauri v2 | Candidate C: Node Daemon + PWA |
| :--- | :--- | :--- | :--- |
| **Toolchain Readiness Today** | `IMMEDIATELY_USABLE` (Node v24 ready) | `REQUIRES_TOOLCHAIN_SETUP` (Rust needed) | `IMMEDIATELY_USABLE` |
| **Idle Memory Consumption** | `POOR` [ILLUSTRATIVE: $180\text{MB}+$, probe in P7] | `SUPERIOR` [ILLUSTRATIVE: $35\text{MB}$, probe in P7] | `ACCEPTABLE` [ILLUSTRATIVE: $80\text{MB}$] |
| **Native Win32 Tray / Background**| `SUPERIOR` (Mature APIs) | `SUPERIOR` (Tauri Plugins) | `POOR` (Requires third-party helper) |
| **Language Continuity** | `SUPERIOR` (100% TypeScript) | `SPLIT` (Rust + TS) | `SUPERIOR` (100% TypeScript) |
| **Security Containment** | `MEDIUM` (Requires vigilance) | `SUPERIOR` (Fine-grained capabilities)| `ACCEPTABLE` (Web sandbox) |
| **Zero-Spend Risk** | `ZERO` | `ZERO` | `ZERO` |

---

## 5. Active Contradictions & Uncertainties

* **Contradiction CON-P7-01 (Tauri WebView2 vs Electron Chromium for 3D/WebGPU):**
  * *Claim A:* Electron guarantees uniform GPU rendering because the Chromium binary is bundled and tested with the app.
  * *Claim B:* Tauri v2 leverages modern Windows 11 WebView2, which has full hardware acceleration and Direct3D 12 backing without the memory bloat of bundled Chromium.
  * *Status:* `REQUIRES_EXPERIMENT` during P7/P8 renderer bake-off.
* **Uncertainty UNC-P7-01:** Operator tolerance for installing Rust toolchain vs. preference for staying 100% within the existing Node.js environment.

---

## 6. Synthesizer Neutral Summary & Future-Wave Boundaries

$$\mathbf{P5\ INPUT \neq P7\ DECISION}$$

Wave P7 faces a classic architectural trade-off between **Language & Toolchain Continuity (Electron)** vs. **Resource & Capability Ergonomics (Tauri v2)**:
* If Wave P7 prioritizes **immediate development velocity, zero toolchain installation friction, and maintaining a unified TypeScript codebase across frontend and backend**, Candidate A (Electron) offers the lowest setup barrier.
* If Wave P7 prioritizes **minimal memory footprint, background desktop efficiency, and strict capability sandboxing**, Candidate B (Tauri v2) offers significant architectural advantages, provided the operator authorizes installing the Rust/MSVC toolchain.

**Wave P7 retains absolute architectural authority** to select either candidate, test a lightweight browser shell, or conduct comparative local benchmarks prior to finalizing the desktop shell decision.
