# Gravitas

Local-first multi-agent command center.

---

## Current State (Wave 3 — Single Real AI Harness)

This repository contains the architecture specification, verified domain contracts, shell-free Git repository inspection & worktree isolation infrastructure, and provider-neutral AI agent harness execution (`@gravitas/harnesses` with Claude Code adapter).

| Subsystem | Status |
|---|---|
| Architecture documentation (`docs/`, `architecture/`, `research/`) | ✅ Complete (26 files, committed at `778a8a5`) |
| TypeScript workspace scaffold | ✅ Complete (Wave 0) |
| Domain model & core contracts (`@gravitas/core`) | ✅ Complete (Wave 1: FSM, Dependencies, Contract, Prompt Composer, Events) |
| Git repository & worktree isolation (`@gravitas/git`) | ✅ Complete (Wave 2: Process boundary, Inspector, Worktree isolation) |
| Agent harness (Claude) (`@gravitas/harnesses`) | ✅ Complete (Wave 3: Subprocess boundary, Claude Code adapter, Mutation capture) |
| Verification runner | ⬜ Wave 4 (next) |
| Multi-task DAG orchestrator | ⬜ Wave 5 |
| CLI / REST API | ⬜ Wave 6 |
| Web UI | ⬜ Wave 7+ |

---

## Agent Harness & Security Boundary Guarantees

*Verified by 219 automated unit, child-process, and real-Git integration tests on Windows:*

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
docs/          ← Phase 0 architecture documents
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
