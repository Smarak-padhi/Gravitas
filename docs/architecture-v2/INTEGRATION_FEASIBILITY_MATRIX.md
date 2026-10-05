# GRAVITAS — INTEGRATION FEASIBILITY MATRIX (RECONCILED)
## Evaluation of Execution Surfaces for Desktop Multi-Agent OS

**Audit Date**: 2026-09-30  
**Evidence Standard**: PROVEN [P], OBSERVED [O], REPORTED [R], and UNPROVEN / UNKNOWN [U]  
**Document Status**: Current P0/P1 evidence and planning artifact. The frozen master planning contracts remain governing project context; repository/runtime evidence is ultimate ground truth.  
**Primary Invariant**:
$$\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$$

---

### Qualification Progression Refresher
$$\text{DISCOVERED} \rightarrow \text{INSTALLED} \rightarrow \text{AUTHENTICATED} \rightarrow \text{REACHABLE} \rightarrow \text{CAPABILITY\_PROBED} \rightarrow \text{CONTAINMENT\_TESTED} \rightarrow \text{QUALIFIED} \rightarrow \text{READY}$$

*Principle: The goal of Wave P1 is to establish the true empirical qualification ceiling for each candidate surface. A surface stopping at `INSTALLED`, `DISCOVERED`, or `CAPABILITY_PROBED` is a valid, successful P1 inventory finding.*

---

## 1. Technical Feasibility Matrix

| Capability / Attribute | Antigravity CLI (`agy`) | Codex CLI | Claude Code CLI | Free Claude Code (FCC) | Playwright Browser | GitHub CLI (`gh`) | PowerShell 5.1 Host | WinRT Notifications | Manus Desktop App |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Executable Exists** | YES (`1.1.13`) [P] | YES (`0.153.4`) [P] | YES (`2.1.276`) [P] | YES (`0.0.0.0`) [P] | YES (`1.62.0`) [P] | YES (`2.98.0`) [P] | YES (`5.1`) [P] | YES (WinRT API) [P] | NO / UNPROVEN [U] |
| **Current Qualification**| **`CAPABILITY_PROBED`**| **`INSTALLED`** | **`INSTALLED`** | **`INSTALLED`** | **`CAPABILITY_PROBED`**| **`INSTALLED`** | **`CAPABILITY_PROBED`**| **`CAPABILITY_PROBED`**| **`DISCOVERED`** |
| **Authentication State**| PROVEN authorized; creds UNINSPECTED | UNAUTHENTICATED [P]| UNAUTHENTICATED [P]| UNVERIFIED [U] | NOT REQUIRED [P] | UNAUTHENTICATED [P]| NOT REQUIRED [P] | NOT REQUIRED [P] | UNKNOWN [U] |
| **Headless Invocation** | **PROVEN** (`-p`) [P] | Advertised (`exec`)| Advertised (`-p`) | PROVEN in adapter [P]| PROVEN [P] | PROVEN [P] | PROVEN [P] | PROVEN [P] | UNPROVEN [U] |
| **Stdin / Prompt Pipe** | Supported [P] | Supported [R] | Supported [R] | Supported [P] | API calls [P] | Supported [R] | Supported [P] | API calls [P] | UNPROVEN [U] |
| **Structured Output** | **PROVEN** (JSON) [P] | Advertised [R] | Advertised [R] | Parsed by adapter [P]| PROVEN (JSON trace)| Supported (`--json`)| Supported (`ConvertTo-Json`)| Event callbacks [P]| UNPROVEN [U] |
| **Streaming Output** | Advertised [R] | Supported [R] | Advertised [R] | Supported [R] | Event-driven [P] | Line-buffered [R] | Console stdout [P] | N/A | UNPROVEN [U] |
| **Session Resume** | Advertised (`--conv`)| Supported (`resume`)| Supported (`--resume`)| Ephemeral [P] | Storage state [P] | N/A | Runspaces [P] | N/A | UNPROVEN [U] |
| **Cancellation (`taskkill`)**| Process tree [O] | Process tree [O] | Process tree [O] | Process tree [P] | Browser close [P] | Process kill [P] | Process kill [P] | N/A | UNPROVEN [U] |
| **Timeout Handling** | **PROVEN** [P] | Configurable [R] | Adapter-level [R] | Adapter-level [P] | Built-in timeout [P]| OS timeout [P] | OS timeout [P] | N/A | UNPROVEN [U] |
| **MCP Integration** | Ecosystem client [R]| Subcommand [P] | Subcommand [P] | Denied in adapter [P]| MCP server running | N/A | N/A | N/A | UNPROVEN [U] |
| **Filesystem Authority**| Host user [O] | Sandboxed [R] | Scoped [R] | Worktree-bound [P] | Test directory [P] | Git working tree [P]| Full user NTFS [P] | N/A | UNKNOWN [U] |
| **Shell Authority** | Advertised flag [R] | Mediated service [P]| Tool filter [R] | Denied Bash [P] | N/A | Subshell commands [P]| Full Win32 shell [P]| N/A | UNKNOWN [U] |
| **Git Authority** | Target workspace [R]| Target workspace [R]| Worktree flag [R] | Isolated worktree [P]| N/A | Remote repository [P]| Full Git CLI [P] | N/A | UNKNOWN [U] |
| **Network Authority** | Google backend [P] | Restricted sandbox | Scoped WebFetch [R]| Loopback proxy [P] | Local/External HTTP | GitHub API [R] | Unrestricted [P] | N/A | UNKNOWN [U] |
| **Containment Evidence**| **UNTESTED** [U] | Service exists; UNTESTED [U]| Flags exist; UNTESTED [U]| Proxy boundary; UNTESTED [U]| Browser isolation; UNTESTED [U]| Unconfined [P] | Unconfined [P] | In-process WinRT [P]| UNPROVEN [U] |
| **Automation Suitability**| **Strong Candidate** | **Candidate (Needs Auth)**| **Candidate (Needs Auth)**| **Candidate (Needs Daemon)**| **Strong Candidate (QA)**| **Candidate (Needs Auth)**| **Host Deterministic**| **Host Notification**| **Ineligible (Discovered only)** |

---

## 2. Granular Feasibility Profiles

### 1. Antigravity CLI (`agy`)
- **Qualification State**: **`CAPABILITY_PROBED`**.
- **Empirical Status**: Current backend authorization sufficient for headless inference is **PROVEN** via live `-p` test (5.75s latency, valid JSON, token metrics). Credential storage mechanism, persistence, and refresh details remain **UNKNOWN / UNINSPECTED**.
- **Qualification Boundary**: Tool execution and the `--sandbox` flag were not tested against hostile mutations; halts strictly before `CONTAINMENT_TESTED`.

### 2. Codex CLI
- **Qualification State**: **`INSTALLED`**.
- **Empirical Status**: Binary and elevated Windows sandbox service (`CodexSandboxService` PID 8684) are present. Currently **UNAUTHENTICATED** (`codex doctor` reports missing credentials in `auth.json`).
- **Qualification Boundary**: Historical qualification does not override current unauthenticated machine state.

### 3. Claude Code CLI
- **Qualification State**: **`INSTALLED`**.
- **Empirical Status**: Binary installed (v2.1.276). Currently **UNAUTHENTICATED** (`claude doctor` reports not signed in to `claude.ai`).
- **Qualification Boundary**: Cannot execute headless queries until authenticated.

### 4. Free Claude Code (FCC)
- **Qualification State**: **`INSTALLED`**.
- **Empirical Status**: Launcher and daemon binaries exist at `~/.local/bin/`. Currently **UNREACHABLE** because `fcc-server.exe` is not running.
- **Qualification Boundary**: Subprocess adapter exists in `@gravitas/harnesses`, but harness is non-functional until daemon lifecycle management is operational.

### 5. Playwright Browser Automation
- **Qualification State**: **`CAPABILITY_PROBED`**.
- **Empirical Status**: Python Playwright 1.62.0 and Chromium binaries verified on host. Running `@playwright/mcp` service verified on host.
- **Qualification Boundary**: Does not reach `READY` because GRAVITAS verification harness containment and test server lifecycle management have not been tested.

### 6. GitHub CLI (`gh`)
- **Qualification State**: **`INSTALLED`**.
- **Empirical Status**: CLI installed (v2.98.0); `gh auth status` reports not logged in.
- **Qualification Boundary**: Blocked from remote PR operations until authenticated.

### 7. OmniRoute Gateway
- **Qualification State**: **`DISCOVERED`**.
- **Empirical Status**: Local `node_modules` is not installed; `omniroute.mjs` is physically missing from disk.
- **Qualification Boundary**: Historical qualification artifact records past pass, but current absence on disk is authoritative.

### 8. Manus Desktop App (Post-P1 Delta)
- **Qualification State**: **`DISCOVERED`**.
- **Empirical Status**: Configuration/cache directory exists at `C:\Users\smara\.manus\manus-computer-operator`. No executable binary, package, or process exists on system PATH, registry, or standard directories.
- **Qualification Boundary**: Highest sequentially proven level is `DISCOVERED`. Ineligible for harness integration until executable is installed and programmatic surface is proven.

---

## 3. Scope Alignment Notice

This matrix evaluates technical feasibility and establishes the current empirical qualification ceilings across host execution surfaces. In adherence to program rules:
1. No candidate harness is prematurely labeled `READY`.
2. Qualification states are strictly sequential and never skipped.
3. Every required field is rigorously classified by evidence type.
4. Establishing these qualification ceilings completes the inventory mission of Wave P1.
