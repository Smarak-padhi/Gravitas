# GRAVITAS — CURRENT DEPENDENCY BASELINE
## Wave P0 Package, Workspace, and Security Audit

**Evidence Category**: MIXED — direct host evidence is PROVEN; package-role descriptions are SOURCE-DERIVED and remain subject to P2 source forensics.  
**Document Status**: Current P0/P1 evidence and planning artifact. The frozen master planning contracts remain governing project context; repository/runtime evidence is ultimate ground truth.

---

## 1. Monorepo Package & Workspace Structure

The repository is configured as an npm workspaces monorepo:
- **Root Configuration**: `package.json` (name: `gravitas`, version: `0.0.1`, type: `module`, private: `true`)
- **Workspace Glob**: `packages/*`, `apps/*`
- **Dependency Overrides**: `"omniroute": { "next": "16.3.3" }`

### Discovered Workspaces
| Workspace Name | Relative Path | Type | Role in Current Codebase (Source-Derived) |
| :--- | :--- | :--- | :--- |
| `@gravitas/core` | `packages/core` | Package | Domain types, event schemas, state machines |
| `@gravitas/orchestrator`| `packages/orchestrator` | Package | Task scheduler, DAG executor, capability routing |
| `@gravitas/harnesses` | `packages/harnesses` | Package | Subprocess adapters for Codex, Claude Code, FCC |
| `@gravitas/gateways` | `packages/gateways` | Package | OmniRoute proxy client and gateway qualification |
| `@gravitas/agents` | `packages/agents` | Package | Role mapping and agent definitions |
| `@gravitas/prompts` | `packages/prompts` | Package | Prompt compiler and template management |
| `@gravitas/git` | `packages/git` | Package | Git worktree management, commit guards, diff capture |
| `@gravitas/verifier` | `packages/verifier` | Package | Independent verification and evidence collector |
| `@gravitas/browser-qa` | `packages/browser-qa` | Package | Playwright-based browser test automation |
| `@gravitas/server` | `apps/server` | Application | Local control-plane HTTP/SSE API server |
| `@gravitas/web` | `apps/web` | Application | React/Three.js command center and 3D visualizer |

---

## 2. Lockfile & Installation State

- **Lockfile Presence**: `package-lock.json` is present at repository root (`715,831` bytes, lockfileVersion 3).
- **Physical Installation State**: **`node_modules` is ABSENT.**
  - `Test-Path "node_modules"` returned `False`.
  - `Test-Path "packages/*/node_modules"` returned `False`.
  - `Test-Path "apps/*/node_modules"` returned `False`.
- **Dependency Tree Health**:
  - `npm ls --depth=0` exited with code 1 (`ELSPROBLEMS`).
  - All workspace packages and root `devDependencies` (`@playwright/test`, `@types/node`, `typescript`, `vitest`) are listed as `UNMET DEPENDENCY`.
- **Operational Freeze Adherence**: In accordance with Wave P0 non-modification rules, `npm install` was **NOT** executed.

---

## 3. Dependency Security Audit (`npm audit`)

`npm audit` was executed against `package-lock.json` and returned 5 active advisories:
- **Total Findings**: 5 (1 low, 1 moderate, 2 high, 1 critical).
- **Classification**: **Lockfile / Dependency-Graph Security Findings**.
- **Runtime Exploitation Status**: **INACTIVE / UNLOADED AT RUNTIME**. Because `node_modules` is physically absent from disk, these packages are not loaded into memory or executing on the host. They represent static vulnerabilities within the dependency lockfile graph, not active runtime exploits.
- **Affected Packages in Graph**:
  1. `adm-zip` (<= 0.6.0) — **High**: Multiple memory allocation (DoS), path traversal, and SUID preservation vulnerabilities (GHSA-xcpc-8h2w-3j85, GHSA-vwc7-r8mq-g2x9, GHSA-j5f4-cc29-5x44).
     - Dependency Path: `gravitas` $\rightarrow$ `omniroute` $\rightarrow$ `onnxruntime-node` $\rightarrow$ `adm-zip`
  2. `dompurify` (<= 3.4.12) — **Moderate**: Sanitize bypass, attribute pollution, and detached subtree execution (GHSA-c2j3-45gr-mqc4, GHSA-cmwh-pvxp-8882, GHSA-55q2-fjhq-7xh7).
     - Dependency Path: `gravitas` $\rightarrow$ `omniroute` $\rightarrow$ `monaco-editor` $\rightarrow$ `dompurify`
- **Root Cause Analysis**: 100% of detected security findings originate from transitive dependencies of `omniroute`.
- **Disposition**: Zero automatic fixes applied (`npm audit fix` was **NOT** run). These lockfile findings are carried directly into P2 security/dependency forensics as technical debt inputs.
