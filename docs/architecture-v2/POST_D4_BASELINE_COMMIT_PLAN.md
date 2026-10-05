# Post-D4 Baseline Commit Plan (Proposal Only)

## 1. Context & Constraints
The current working tree contains accumulated modifications across all frozen waves (K0–K5, D0–D4). All 627 regression tests pass cleanly. Because TypeScript declarations and exports across `@gravitas/core`, `@gravitas/harnesses`, and `@gravitas/orchestrator` are interdependent, this plan outlines a clean, sequenced atomic commit strategy.

## 2. Proposed Commit Sequence

### Commit 1: `chore: test runner configuration and package scripts`
- **Scope**: `package.json`, `package-lock.json`, `vitest.config.ts`.
- **Content**: Script entries (`test:kernel`, `test:harnesses`, `test:k2..k5`, `test:d0..d4`), dependency registrations.

### Commit 2: `feat(kernel): K0 worksession kernel and single-writer sqlite persistence`
- **Scope**: `packages/core/src/kernel/**`, `packages/core/package.json`, `packages/core/src/index.ts`, `packages/core/scripts/**`.
- **Content**: WorkSession FSM, SQLite schema, durability, lock reclamation, K0 test suite (51 tests).

### Commit 3: `feat(harnesses): K1 qualification ladder and contained runner adapters`
- **Scope**: `packages/harnesses/src/k1/**`, `packages/harnesses/src/index.ts`.
- **Content**: Surface qualification, adapters (PowerShell, Codex, Claude Code, agy), mutation detection, K1 test suite (108 tests).

### Commit 4: `feat(orchestrator): K2-K5 closed-loop orchestration, capability grants, arena, and verification`
- **Scope**: `packages/orchestrator/src/k2/**`, `k3/**`, `k4/**`, `k5/**`, `packages/orchestrator/src/index.ts`.
- **Content**: Closed loop supervisor-worker (53 tests), tool grant registry (85 tests), architecture arena (40 tests), independent verification (40 tests).

### Commit 5: `feat(desktop): D0-D4 electron desktop shell, command center, tray lifecycle, living hq, and role-bots`
- **Scope**: `apps/desktop/**`.
- **Content**: Electron main, preload, utilityProcess host, command center UI, tray lifecycle, Three.js living HQ, role-bot registry, and D0–D4 test suites (250 tests).

### Commit 6: `docs: post-D4 program architecture, evidence ledgers, and agent specs`
- **Scope**: `docs/architecture-v2/**`, `gravitas-agent-specs/**`.
- **Content**: Full architecture contracts, performance evidence, security boundaries, and operational ledgers.

**EXECUTION STATUS**: PROPOSAL ONLY — ZERO COMMITS EXECUTED IN THIS LOOP.
