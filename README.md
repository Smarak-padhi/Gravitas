# Gravitas

Local-first multi-agent command center.

---

## Current State (Wave 0 — Baseline Scaffold)

This repository contains **architecture and research documentation only**.
No orchestration logic, agent harnesses, or UI is implemented yet.

| Subsystem | Status |
|---|---|
| Architecture documentation (`docs/`, `architecture/`, `research/`) | ✅ Complete (26 files, committed at `778a8a5`) |
| TypeScript workspace scaffold | ✅ Wave 0 — this commit |
| Domain model types | ⬜ Wave 1 (next) |
| Agent harness (Claude) | ⬜ Wave 3 |
| DAG orchestrator | ⬜ Wave 2 |
| Verification runner | ⬜ Wave 4 |
| CLI / REST API | ⬜ Wave 5 |
| Web UI | ⬜ Wave 6+ |

---

## Repository Layout

```
apps/          ← application packages (server, web) — added in later waves
packages/
  core/        ← domain model and shared types (Wave 1+)
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

# Type-check
npm run typecheck

# Run tests
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
| `feat/v0-golden-loop` | Wave 0 bootstrap (this branch) |

No automatic merges to `main`. Every merge requires explicit human approval.

---

## License

Private — not yet licensed for distribution.
