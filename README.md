# GRAVITAS 2.0 — Living Studio & Personal Engineering Workspace

A private, delightful personal engineering studio and local-first spatial workspace.

---

## Overview

GRAVITAS 2.0 transforms GRAVITAS from a corporate productivity dashboard into an intimate, high-performance personal engineering studio. It provides an expressive 2D mascot family (led by Grav), on-demand spatial tools, real SQLite knowledge management, semester study guidance, push-to-talk voice dictation, safe Windows automation, and an optional lazy-loaded 3D virtual office.

### Monorepo Structure

```
apps/
  desktop/     ← Native Electron 44 desktop studio, floating companion, and supervisor
  server/      ← Local control plane HTTP + Server-Sent Events service (port 4317)
  web/         ← Web interface and Three.js 3D multi-room virtual headquarters
packages/
  core/        ← Domain FSM, dependency DAG, SQLite persistence writer, and KernelHost
  gateways/    ← Model provider gateways (NVIDIA NIM) and credential boundary
  harnesses/   ← AI worker harnesses (PowerShell, Claude Code, Codex)
  orchestrator/← Bounded scheduler, task pipeline, and capability registry
  verifier/    ← Deterministic verifier and cryptographic evidence bundling
  agents/      ← Agent contracts and role definitions
  browser-qa/  ← Playwright-based browser QA verification
  git/         ← Shell-free Git inspection and worktree isolation
  prompts/     ← Structured prompt composer and templates
gravitas-agent-specs/ ← 25 specialist agent contracts and role specifications
site/          ← Frozen static web presence
docs/          ← Canonical architecture, 3D HQ, and milestone verification evidence
```

---

## Key Capabilities & Safety Invariants

1. **Local-First & Data Sovereign**: 100% of tasks, notes, ideas, and transcripts persist in local SQLite databases (`%APPDATA%\gravitas\`). Zero mandatory cloud accounts.
2. **Untrusted Worker Principle**: Worker claims are never proof of completion. Task transitions require external deterministic verification.
3. **Studio First, Chat on Demand**: The everyday workspace is an illustrated, spatial studio. Conversations open in responsive overlays via click or `Alt+Space`.
4. **Zero Fake Work**: Status indicators and character bubbles reflect real system events, active compilers, and verified SQLite records.
5. **Bounded Desktop Automation**: External application launches (`notepad`, `calc`, `mspaint`) and web entertainment (`Spotify`, `Netflix`, `YouTube`) are strictly allowlisted. Shell metacharacters are rejected.
6. **Lazy-Loaded 3D Office**: The Three.js 3D office (`apps/web/src/hq3d/`) runs only on demand, keeping daily CPU and GPU usage minimal.

---

## Prerequisites

| Tool | Minimum Version | Tested |
|---|---|---|
| Windows | 10/11 x64 | Windows 11 Build 26100 |
| Node.js | ≥ 22.0.0 | `v24.13.0` |
| npm | ≥ 10.0.0 | `11.6.2` |
| Git | ≥ 2.40 | `2.54.0` |

---

## Development & Verification Commands

```powershell
# Install all monorepo dependencies
npm install

# Run comprehensive system diagnostics
npm run doctor

# Type-check all packages and apps
npm run typecheck

# Build all packages and applications
npm run build

# Run unit and integration test suite
npm test

# Run Desktop Gate test suites (D0 through D4)
npm run test:d0
npm run test:d1
npm run test:d2
npm run test:d3
npm run test:d4

# Run packaged desktop smoke test suite
node scripts/test-packaged-smoke.mjs
```

---

## Active Branches

| Branch | Purpose |
|---|---|
| `feat/gravitas-personal-studio` | Active implementation branch for GRAVITAS 2.0 Living Studio |
| `main` | Production / human-approved releases only |
