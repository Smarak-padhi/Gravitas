# Gravitas

Local-first multi-agent command center.

---

## Current State (Wave 2 — Git Repository & Worktree Isolation)

This repository contains the architecture specification, verified domain contracts, and shell-free Git repository inspection & worktree isolation infrastructure.
Agent execution, harnesses, and UI are not yet implemented.

| Subsystem | Status |
|---|---|
| Architecture documentation (`docs/`, `architecture/`, `research/`) | ✅ Complete (26 files, committed at `778a8a5`) |
| TypeScript workspace scaffold | ✅ Complete (Wave 0) |
| Domain model & core contracts (`@gravitas/core`) | ✅ Complete (Wave 1: FSM, Dependencies, Contract, Prompt Composer, Events) |
| Git repository & worktree isolation (`@gravitas/git`) | ✅ Complete (Wave 2: Process boundary, Inspector, Worktree isolation) |
| Agent harness (Claude) | ⬜ Wave 3 (next) |
| Verification runner | ⬜ Wave 4 |
| Multi-task DAG orchestrator | ⬜ Wave 5 |
| CLI / REST API | ⬜ Wave 6 |
| Web UI | ⬜ Wave 7+ |

---

## Git Worktree Isolation Guarantees

*Verified by 198 automated unit and real-Git integration tests on Windows:*

1. **Primary Working Tree Integrity**: Gravitas never commandeers, stashes, resets, or checks out different branches in the primary repository.
2. **Physical Task Isolation**: Every task executes in an external Git worktree located under a designated runtime directory (`<RUNTIME_ROOT>/worktrees/<runId>/<taskId>`).
3. **Immutability of Primary HEAD**: Primary repository branch and HEAD commit are verified unchanged before and after worktree allocation.
4. **Conservative Removal Policy**: Task worktrees with uncommitted staged, unstaged, or untracked changes are strictly refused removal by default to prevent data loss. Task branches are preserved in Git history.

---

## Repository Layout

```
apps/          ← application packages (server, web) — added in later waves
packages/
  core/        ← domain model, FSM, dependency evaluation, prompt boundary
  git/         ← shell-free Git boundary, repository inspector, worktree isolation
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
