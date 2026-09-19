# Gravitas

Local-first multi-agent command center.

---

## Current State (Wave 6 — Command Center Frontend)

This repository contains the architecture specification, verified domain contracts, shell-free Git repository inspection & worktree isolation infrastructure, provider-neutral AI agent harness execution (`@gravitas/harnesses`), independent deterministic verification with cryptographic evidence bundling (`@gravitas/verifier`), a lightweight local control plane HTTP server with live Server-Sent Events (`@gravitas/server`), and the real Gravitas Command Center frontend (`@gravitas/web`).

| Subsystem | Status |
|---|---|
| Architecture documentation (`docs/`, `architecture/`, `research/`) | ✅ Complete (26 files, committed at `778a8a5`) |
| TypeScript workspace scaffold | ✅ Complete (Wave 0) |
| Domain model & core contracts (`@gravitas/core`) | ✅ Complete (Wave 1: FSM, Dependencies, Contract, Prompt Composer, Events) |
| Git repository & worktree isolation (`@gravitas/git`) | ✅ Complete (Wave 2: Process boundary, Inspector, Worktree isolation) |
| Agent harness (Claude) (`@gravitas/harnesses`) | ✅ Complete (Wave 3: Subprocess boundary, Claude Code adapter, Mutation capture) |
| Verification runner (`@gravitas/verifier`) | ✅ Complete (Wave 4: Deterministic verifier, State authority, Evidence bundle) |
| Local Control Plane & Live Event Stream (`@gravitas/server`) | ✅ Complete (Wave 5: Native HTTP, SSE, In-memory registry, Approval/Rejection API) |
| Command Center Web UI (`@gravitas/web`) | ✅ Complete (Wave 6: Observability + Human Review Gate + Playwright E2E) |

---

## Command Center Frontend (`apps/web`)

The Command Center provides human operators with real-time observability and authoritative control over autonomous AI workers:

- **Observability & Human Gate**: Observes real server state via REST (`/api/v1/`) and live Server-Sent Events (`/api/v1/events`). Zero orchestration runs in React.
- **Zero Fake Runtime Data**: Empty states honestly display "No runs yet". No invented costs, tokens, or simulated workers.
- **Visual Golden Loop Pipeline**: 6-stage execution graph (`GOAL` → `TASK` → `WORKER` → `VERIFY` → `EVIDENCE` → `APPROVAL`) with stage status indicators and responsive layout.
- **Human Review Gate (WAITING_APPROVAL)**: Prominent action card displaying verification pass/fail status, scope compliance, HEAD mutation check, and raw unified git diff before allowing approval or rejection.
- **Live Event Console**: Real-time streaming log with pause/resume and deduplication.
- **Browser-Verified Responsive Design**: Tested across 1920x1080, 1440x900, and 1024x768 viewports with Playwright screenshot evidence in `tests/screenshots/`.

### Running the Command Center

```powershell
# Terminal 1: Start local backend server (port 4317)
npm run server

# Terminal 2: Start Command Center UI (port 5173 with proxy to 4317)
npm run web

# Run browser E2E test suite with screenshot capture
npm run test:browser
```

---

## Local Control Plane (`apps/server`)

The local control plane provides a trustworthy backend boundary for CLI and Command Center clients:

- **Local-Only Loopback Binding**: Binds strictly to `127.0.0.1:4317` by default (never `0.0.0.0`).
- **Live Event Stream**: Emits real-time domain events over Server-Sent Events (`GET /api/v1/events`).
- **In-Memory Registry**: Centralizes runs, tasks, contracts, and evidence references with a bounded recent event history (1000 events FIFO).
- **Explicit Human Approval**: `POST /approve` and `POST /reject` are restricted strictly to tasks in `WAITING_APPROVAL` state.
- **Evidence Access & Safe Diff**: Safe, registry-keyed diff and manifest inspection (`GET /api/v1/runs/:runId/tasks/:taskId/evidence/diff`).
- **Payload & Error Bounds**: Request bodies capped at 256 KiB; error envelopes never leak stack traces or internal paths.
- **Truthful Harness Telemetry**: Reports actual configured harness status (`GET /api/v1/state`).

### Runtime Command

```powershell
# Start local Gravitas control plane on 127.0.0.1:4317
npm run server
```

*Explicit limitation*: Registry state is in-memory only. State is reset when the server restarts.

---

## Agent Harness & Security Boundary Guarantees

*Verified by 253 automated unit, child-process, and real-Git integration tests on Windows:*

1. **Untrusted Worker Principle**: Worker claims (e.g. "done", "tests pass") are never proof of completion. Output is parsed strictly as diagnostic metadata.
2. **Working Directory as Security Boundary**: The AI worker is strictly spawned with `cwd` bound to an isolated task worktree. The primary repository is never touched.
3. **Shell-Free Invocation**: Worker subprocesses execute directly via `spawn(..., { shell: false })`, eliminating shell-escape and command-injection vulnerabilities.
4. **Least-Privilege Mode**: Claude Code runs under `--permission-mode acceptEdits` with whitelisted tools (`--tools Edit,Read`). Dangerous bypasses (`--dangerously-skip-permissions`) are strictly forbidden.
5. **Prompt Stdin Streaming**: Prompts are streamed through stdin rather than CLI argument strings, preventing command-line length overflow and process-table leakage.
6. **Worktree Mutation Telemetry**: Every execution captures pre- and post-run snapshots, detecting unexpected commits (HEAD mutations), computing a cryptographic SHA-256 hash of the diff, and flagging out-of-scope file modifications.
7. **Process-Tree Cleanup**: Timeouts and cancellations terminate the entire worker process tree (using Windows `taskkill /T /F` or POSIX group kill) to prevent orphaned processes.

---

## Repository Layout

```
apps/          ← application packages (server, web) — added in later waves
packages/
  core/        ← domain model, FSM, dependency evaluation, prompt boundary
  git/         ← shell-free Git boundary, repository inspector, worktree isolation
  harnesses/   ← agent harness interfaces, subprocess boundary, mutation capture, Claude adapter
  verifier/    ← independent deterministic verification, state authority, evidence bundling
docs/          ← Phase 0 architecture documents and ADRs
architecture/  ← system diagrams, event model, FSM, permissions
research/      ← agent matrix, MCP catalog, CLI catalog, sources
.gravitas/     ← GITIGNORED — runtime evidence (created at execution time)
```

---

## Prerequisites

| Tool | Required Version | Verified |
|---|---|---|
| Node.js | ≥ 22 | `v24.13.0` |
| npm | ≥ 10 | `11.6.2` |
| git | ≥ 2.40 | `2.54.0` |

pnpm, Rust, and Cargo are **not** used in this project.

---

## Setup

```powershell
# Clone
git clone https://github.com/Smarak-padhi/Gravitas.git
cd Gravitas

# Install all workspace dependencies
npm install

# Type-check all packages
npm run typecheck

# Run test suite
npm test
```

---

## The Core Invariant

> **AN AGENT CLAIM IS NEVER PROOF OF COMPLETION.**
>
> Worker output such as "done", "tests pass", or "looks correct" must never
> transition a task to VERIFIED or DONE. Verification must originate outside
> the worker execution — via git diff, test harness output, or file system
> inspection by an independent verifier process.

---

## Branches

| Branch | Purpose |
|---|---|
| `main` | Stable, human-approved work only |
| `feat/v0-golden-loop` | Implementation branch (Waves 0–2) |

No automatic merges to `main`. Every merge requires explicit human approval.

---

## License

Private — not yet licensed for distribution.
