# GRAVITAS — WAVE P7 OBJECTIVE LEDGER
## Desktop Runtime Architecture Decision & Shell Integration Tracking

**Status:** IN_PROGRESS — RECURSIVE SELECTION LOOP ACTIVE  
**Wave:** P7 — Desktop Runtime Decision  
**Date:** 2026-10-01  
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

## 1. Lifecycle Progression States
`UNSTARTED` $\to$ `IN_PROGRESS` $\to$ `RESEARCHED` $\to$ `EXPERIMENTED` $\to$ `DESIGNED` $\to$ `SCENARIO_VALIDATED` $\to$ `INDEPENDENTLY_REVIEWED` $\to$ `COMPLETE`

---

## 2. Evidence Classification Standard

Every decision, benchmark, and claim in Wave P7 is classified under one of the following evidence tiers:
1. **`LIVE_HOST_PROBE`**: Directly verified via empirical command execution on the host machine during Wave P7.
2. **`REPOSITORY_OBSERVATION`**: Directly observed in tracked or untracked repository code and manifests.
3. **`OFFICIAL_PLATFORM_CAPABILITY`**: Documented feature of Electron, Tauri, Node.js v24 runtime, Windows 11 OS, or Chromium specifications.
4. **`APPROVED_PRIOR_CONTRACT`**: Governed by human-approved architectural invariants from Waves P0 through P6.
5. **`ARCHITECTURAL_INFERENCE`**: Logically derived design requirement based on system constraints.
6. **`REQUIRES_K_PHASE_VALIDATION`**: Architectural decision is clear and decision-ready, but full operational validation is deferred to Phase K implementation.

---

## 3. P7 Objective Tracking Ledger

| # | Domain / Requirement | Target Contract / Architectural Decision | Evidence Tier | Status | Primary Artifact Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Host & Toolchain Baseline** | Host verified: Node v24.13.0, npm 11.6.2, Git 2.54, WebView2 154.0.4258.48, Edge 154.0.4258.37, .NET runtime 6.0.10. Toolchains absent: Rust/Cargo, MSVC, .NET SDK, Go. | `LIVE_HOST_PROBE` | `COMPLETE` | `P7_RUNTIME_CANDIDATE_MATRIX.md` |
| **02** | **Candidate Evaluation & Arena** | Evaluated Electron, Tauri v2, Headless Daemon + PWA/Edge App, WinUI/.NET, Neutralinojs, Wails, NW.js. Selected: Electron (Hybrid Supervisor Topology). PWA classified as `COUNTER_INDICATED FOR TARGET DESKTOP EXPERIENCE`. | `OFFICIAL_PLATFORM_CAPABILITY` + `LIVE_HOST_PROBE` | `COMPLETE` | `P7_RUNTIME_CANDIDATE_MATRIX.md`, `P7_DESKTOP_RUNTIME_DECISION_PACKET.md` |
| **03** | **Hard Constraints Formulation** | Formalized C1-C10 constraints (Zero-Spend, Local-First, Background Durability, Process Isolation, System Tray, Action Center, Single-Instance, Secure IPC, Toolchain Viability, P8 Boundary). | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `P7_DESKTOP_RUNTIME_DECISION_PACKET.md` |
| **04** | **Kernel Ownership & Process Topology** | Hybrid Model D: Electron Main acts as Desktop Supervisor; Kernel executes in isolated Node.js child process (`utilityProcess` or detached `DaemonHostAdapter`); Renderer runs sandboxed. Exact bundled Node compatibility requires implementation validation (`EXP-K-09`). | `ARCHITECTURAL_INFERENCE` + `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P7_DESKTOP_RUNTIME_ARCHITECTURE.md` |
| **05** | **Local IPC Architecture** | High-throughput command/event IPC: Chromium `MessagePort` / Mojo IPC between Main, UtilityProcess, and Renderer; fallback to Windows Named Pipe (`\\.\pipe\gravitas-control`) with token auth. | `LIVE_HOST_PROBE` (`EXP-P7-01`) | `COMPLETE` | `P7_DESKTOP_RUNTIME_ARCHITECTURE.md`, `P7_RUNTIME_EXPERIMENT_REGISTER.md` |
| **06** | **Renderer Privilege & Security Sandbox** | Defense-in-depth security: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, static typed bridge (`gravitasAPI`), schema validation, and Kernel-level auth REDUCE renderer-to-host escalation authority. | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P7_DESKTOP_SECURITY_MODEL.md` |
| **07** | **System Tray & Background Operation** | Native Win32 `Tray` icon with contextual menu; `WINDOW CLOSED ≠ KERNEL TERMINATED`. Window close minimizes/hides to tray; renderer context can be destroyed to reclaim RAM while Kernel executes (`REQUIRES_P8/D_PHASE_PROTOTYPE_MEASUREMENT`). | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P7_DESKTOP_RUNTIME_ARCHITECTURE.md`, `P7_DESKTOP_LIFECYCLE_MODEL.md` |
| **08** | **Native Notifications** | Windows 10/11 Action Center toast notifications registered with explicit AUMID (`com.gravitas.os`). Sanitized notification payloads (zero raw secret leakage). Projections, not state authorities. | `OFFICIAL_PLATFORM_CAPABILITY` + `LIVE_HOST_PROBE` | `COMPLETE` | `P7_DESKTOP_RUNTIME_ARCHITECTURE.md`, `P7_DESKTOP_SECURITY_MODEL.md` |
| **09** | **Single-Instance & Second Launch** | Single-instance lock via `app.requestSingleInstanceLock()` and Windows Named Pipe lock. Second launch forwards CLI args/deep links to primary instance and exits immediately. | `LIVE_HOST_PROBE` (`EXP-P7-02`) | `COMPLETE` | `P7_DESKTOP_LIFECYCLE_MODEL.md` |
| **10** | **Startup, Auto-Start & Safe Mode** | Optional login auto-start via Windows Registry (`HKCU\...\Run`) with `--hidden` flag for silent tray launch. Safe-mode boot flag (`--safe-mode`) to recover from crash loops. | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P7_DESKTOP_LIFECYCLE_MODEL.md` |
| **11** | **Shutdown & Lifecycle Teardown** | Explicit multi-stage shutdown: Close Window $\ne$ Shutdown. Only explicit `Quit GRAVITAS` initiates Kernel task draining, SQLite WAL checkpoint flush, worker SIGTERM/SIGKILL, and clean exit. | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P7_DESKTOP_LIFECYCLE_MODEL.md` |
| **12** | **Zero-Spend & Licensing Gate** | 100% zero-spend compliant: Electron (MIT), Chromium (BSD/permissive), Node.js (MIT), NSIS (zlib/MIT). GitHub Releases for differential auto-updates; SignPath evaluated as potential zero-cost public signing path. | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P7_DESKTOP_RUNTIME_DECISION_PACKET.md` |
| **13** | **Windows 11 Native Integration** | Win32 Job Objects for worker lifecycle management; Windows Named Pipes for secure local IPC; AUMID toast notifications; Windows Registry Run keys; Evergreen WebView2/Edge probes recorded. | `LIVE_HOST_PROBE` + `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P7_DESKTOP_RUNTIME_ARCHITECTURE.md` |
| **14** | **Code Signing & Distribution Realities** | Honest classification: 3-tier distribution model: Developer/Local (unsigned/self-signed + SHA256 checksums); Public open-source (SignPath Foundation evaluated as potential zero-cost path, eligibility unproven); Commercial/Enterprise (OV/EV certificate, out of scope for v0). | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P7_DESKTOP_RUNTIME_DECISION_PACKET.md` |
| **15** | **Application Update Architecture** | Zero-spend auto-updater via `electron-updater` targeting GitHub Releases. Blockmap-based differential updates. Updates applied only during idle periods; active WorkSessions block restart. | `OFFICIAL_PLATFORM_CAPABILITY` | `COMPLETE` | `P7_DESKTOP_RUNTIME_ARCHITECTURE.md`, `P7_DESKTOP_LIFECYCLE_MODEL.md` |
| **16** | **Credential Storage & Broker Boundary** | Zero credential exposure to renderer. Credential broker (P4 contract) resides in privileged Kernel/Main process; renderer receives only short-lived capability grant references. | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `P7_DESKTOP_SECURITY_MODEL.md` |
| **17** | **Portability & Adapter Isolation** | Modular architecture with strict platform abstraction layer: Desktop host adapters (`ElectronHostAdapter`, `DaemonHostAdapter`) isolate P6 Kernel from UI runtime, preserving future portability. | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P7_DESKTOP_RUNTIME_ARCHITECTURE.md` |
| **18** | **20 Failure Scenarios (A through T)** | All 20 mandatory failure scenarios comprehensively traced with deterministic state transitions, recovery actions, and blast-radius containment. | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P7_DESKTOP_LIFECYCLE_MODEL.md` |
| **19** | **P8 Boundary & Renderer Authority** | Strict boundary: P7 selects desktop runtime (Electron); P8 retains 100% authority over visual renderer strategy (DOM vs Canvas vs WebGL/WebGPU vs 2.5D). Hand-off input packet produced. | `APPROVED_PRIOR_CONTRACT` | `COMPLETE` | `P8_RUNTIME_CONSTRAINT_INPUT_PACKET.md` |
| **20** | **Adversarial Red-Team Audit** | Independent red-team critique across security, ops, P6 compatibility, Windows integration, zero-spend, and bias. All identified vulnerabilities mitigated in target architecture. | `ARCHITECTURAL_INFERENCE` | `COMPLETE` | `P7_ADVERSARIAL_REVIEW.md` |

---

## 4. Deliverable Artifact Registry

1. `P7_OBJECTIVE_LEDGER.md` (This document)
2. `P7_RUNTIME_CANDIDATE_MATRIX.md` (Comprehensive candidate evaluation matrix)
3. `P7_RUNTIME_EXPERIMENT_REGISTER.md` (Empirical register for `EXP-P7-01`, `EXP-P7-02`, `EXP-P7-03`)
4. `P7_DESKTOP_RUNTIME_DECISION_PACKET.md` (Formal Architecture Arena Decision Packet `ADP-P7-001`)
5. `P7_DESKTOP_RUNTIME_ARCHITECTURE.md` (Canonical target runtime specification)
6. `P7_DESKTOP_SECURITY_MODEL.md` (Trust boundaries, renderer sandbox, IPC attack defense)
7. `P7_DESKTOP_LIFECYCLE_MODEL.md` (Process lifecycle traces, Scenarios A through T)
8. `P7_ADVERSARIAL_REVIEW.md` (Adversarial red-team audit & mitigations)
9. `P8_RUNTIME_CONSTRAINT_INPUT_PACKET.md` (Clean handoff contract for Wave P8)
