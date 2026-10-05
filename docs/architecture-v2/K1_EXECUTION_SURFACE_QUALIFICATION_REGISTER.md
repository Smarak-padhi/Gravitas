# GRAVITAS K1 — EXECUTION-SURFACE QUALIFICATION REGISTER
## Hardened Host Evidence & Classification Ledger

**Wave**: K1 — Recursive Harness Adapter & Execution-Surface Qualification Loop  
**Date**: 2026-10-02  
**Status**: EMPIRICALLY AUDITED & HARDENED  
**Governing Invariant**:  
`DISCOVERY != INSTALLATION != AUTHENTICATION != TRUST`  
`HARNESS QUALIFICATION != HARNESS READINESS`  
`PROMOTIONAL CREDIT != PERMANENTLY FREE`  
`UNKNOWN_COST fails closed (AUTONOMOUS_INCREMENTAL_SPEND = 0)`

---

## 1. Host Execution-Surface Matrix (Audited)

| Surface ID | Structural Kind | Binary / Endpoint Path | Detected Version | Qualification State | Dispatch Readiness | Cost Eligibility Class | Containment Type & Limitations | Autonomous Dispatch? |
|---|---|---|---|---|---|---|---|---|
| `codex` | `PROCESS` | `C:\Users\smara\AppData\Roaming\npm\node_modules\@openai\codex\...\bin\codex.exe` | 0.153.4 | `INSTALLED` | `NOT_READY` (Auth missing) | `UNKNOWN_COST` | Git Quarantine + PATH shim (process tree kill, NOT OS sandbox) | **BLOCKED** |
| `claude-code` | `PROCESS` | `C:\Users\smara\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe` | 2.1.276 | `INSTALLED` | `NOT_READY` (Auth missing) | `UNKNOWN_COST` | Tool whitelist `--tools Edit,Read` (model-level, NOT OS sandbox) | **BLOCKED** |
| `free-claude-code` | `DAEMON` | `C:\Users\smara\.local\bin\fcc-claude.exe` | Detected | `INSTALLED` | `NOT_READY` (Proxy down) | `LOCAL_FOSS` | Ephemeral empty MCP config (blocks MCP tools, NOT OS filesystem) | **BLOCKED (Proxy offline)** |
| `agy` | `PROCESS` | `C:\Users\smara\AppData\Local\agy\bin\agy.exe` | 1.2.14 | `INSTALLED` | `READY` (Binary present/runs) | `UNKNOWN_COST` | Print mode `-p`, `--mode accept-edits` (process tree kill, NOT OS sandbox) | **BLOCKED_COST_UNKNOWN** |
| `powershell-local` | `PROCESS` | `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe` | 5.1.26100.1 | `QUALIFIED` | `READY` | `OPERATOR_INCLUDED_HOST_RUNTIME` | Non-interactive `-Command -` script via stdin. High authority: filesystem/process. | **ELIGIBLE (Deterministic Only)** |
| `bedrock` | `API` | AWS Bedrock Runtime HTTP/SigV4 | None | `DISCOVERED` | `COST_ELIGIBILITY_UNKNOWN` | `PROMOTIONAL_CREDIT` | N/A (SDK not installed, raw keys = 0) | **BLOCKED (Fail closed)** |
| `omniroute` | `GATEWAY` | Loopback `http://127.0.0.1:20128` | 3.8.50 (in pkg) | `DISCOVERED` (Offline) | `NOT_READY` (Offline) | `LOCAL_FOSS` | Loopback binding policy (when running) | **BLOCKED (Offline)** |
| `manus` | `DISCOVERED` | Web platform | N/A | `DISCOVERED` | `BLOCKED` | `UNKNOWN_COST` | Quarantined | **BLOCKED** |

---

## 2. Hardened Empirical Findings

### 2.1 OmniRoute Gateway (`omniroute`)
- **Correction**: Downgraded from premature `QUALIFIED / READY` to `DISCOVERED (Offline) / NOT_READY`.
- **Taxonomy Invariant**: `OMNIROUTE = GATEWAY != MODEL != PROVIDER`.
- **Endpoint Probe**: `http://127.0.0.1:20128/health` and port `3000` timed out. Process inspection confirmed no omniroute gateway daemon is running on the host.
- **Status**: Code package exists in `packages/gateways/` (63/63 tests passing), but dynamic gateway process is offline. Dispatch is **BLOCKED**.

### 2.2 Antigravity CLI (`agy`) — Independent Dimension Separation
- **Four Independent Dimensions**:
  - `QUALIFICATION`: `INSTALLED` (Binary confirmed present and responsive via CLI flags).
  - `TECHNICAL_READINESS`: `READY` (Binary `agy.exe` exists in `LOCALAPPDATA`, executable, and responds).
  - `COST_ELIGIBILITY`: `UNKNOWN_COST` (Programmatic per-call monetary cost under operator account is unverified).
  - `AUTONOMOUS_DISPATCH`: `BLOCKED_COST_UNKNOWN` (Fail closed under `ZERO_SPEND_AND_QUOTA_POLICY.md`).
- **Core Semantic Principle**: Technical availability and readiness are distinct from financial dispatch authorization. A tool may be technically `READY` while remaining `BLOCKED_COST_UNKNOWN`.


### 2.3 PowerShell Local (`powershell-local`)
- **Correction**: Cost class corrected from `LOCAL_FOSS` to `OPERATOR_INCLUDED_HOST_RUNTIME`.
- **Rationale**: Windows PowerShell 5.1 is a proprietary Windows host component, not open source (FOSS). However, its marginal per-invocation cost is strictly `$0.00 USD`.
- **Authority**: High authority (arbitrary command execution). Strict policy restriction: **Deterministic scripted tasks only. AI prompt-driven dispatch forbidden.**

### 2.4 OpenAI Codex CLI (`codex`)
- **Probes**: `codex doctor` exited 0 with: `auth: no Codex credentials were found`.
- **State**: `INSTALLED`, `NOT_READY`, `UNKNOWN_COST`.

### 2.5 Claude Code CLI (`claude-code`)
- **Probes**: `claude auth status` returned `{"loggedIn": false}`.
- **State**: `INSTALLED`, `NOT_READY`, `UNKNOWN_COST`.

### 2.6 Free Claude Code (`free-claude-code`)
- **Probes**: `fcc-claude.exe` and `fcc-server.exe` present in `~/.local/bin`. Local proxy health check at `127.0.0.1:8082` timed out.
- **State**: `INSTALLED`, `NOT_READY`, `LOCAL_FOSS`.

### 2.7 AWS Bedrock (`bedrock`)
- **Probes**: `@aws-sdk/client-bedrock-runtime` not installed. AWS CLI not installed. Zero credentials in environment.
- **State**: `DISCOVERED`, `COST_ELIGIBILITY_UNKNOWN`, `PROMOTIONAL_CREDIT`.
