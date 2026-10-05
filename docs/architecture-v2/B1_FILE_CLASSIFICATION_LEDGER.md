# B1 File Classification & Ledger

## Summary
Phase B1 converted the accumulated uncommitted working tree of GRAVITAS (accumulated across P0-P8, K0-K5, D0-D4, and B0) into a sequence of 12 clean, dependency-ordered, reviewable local commits rooted on `516e01c`.

## Ledger Table

| Path / Pattern | Tracking State (Pre-B1) | Program Origin | Change Class | Runtime Relevance | Test Relevance | Semantic Risk | Commit Target |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `.gitignore` | Modified | Repo Tooling | Config | NONE | NONE | ZERO | C1 (`32c0839`) |
| `packages/core/scripts/test-loader.mjs` | Untracked | K0 / B0 | Build/Test Harness | DEV/TEST | HIGH | ZERO | C2 (`604ae1f`) |
| `packages/core/src/kernel/**` | Untracked | K0 | Kernel Runtime | RUNTIME | HIGH | ZERO | C2 (`604ae1f`) |
| `packages/core/package.json` | Modified | K0 / B0 | Dependency/Exports | RUNTIME | HIGH | ZERO | C2 (`604ae1f`) |
| `packages/harnesses/src/k1/**` | Untracked | K1 | Harness Adapters | RUNTIME | HIGH | ZERO | C3 (`2ee82b0`) |
| `packages/harnesses/src/index.ts` | Modified | K1 | Harness Exports | RUNTIME | HIGH | ZERO | C3 (`2ee82b0`) |
| `packages/orchestrator/src/k2/**` | Untracked | K2 | Orchestrator Runtime | RUNTIME | HIGH | ZERO | C4 (`4d73f17`) |
| `packages/orchestrator/src/k3/**` | Untracked | K3 | Authority / Grants | RUNTIME | HIGH | ZERO | C5 (`0af3b34`) |
| `packages/orchestrator/src/k4/**` | Untracked | K4 | Architecture Arena | RUNTIME | HIGH | ZERO | C6 (`7187d77`) |
| `packages/orchestrator/src/k5/**` | Untracked | K5 | Verifier Runtime | RUNTIME | HIGH | ZERO | C7 (`5b18462`) |
| `packages/orchestrator/src/index.ts` | Modified | K5 | Orchestrator Exports | RUNTIME | HIGH | ZERO | C7 (`5b18462`) |
| `apps/desktop/assets/**` | Untracked | D0 | Static Assets | RUNTIME | LOW | ZERO | C8 (`c5ec640`) |
| `apps/desktop/build.mjs` | Untracked | D0 | Desktop Build Script | BUILD | LOW | ZERO | C8 (`c5ec640`) |
| `apps/desktop/package.json` | Untracked | D0 | Workspace Manifest | BUILD | HIGH | ZERO | C8 (`c5ec640`) |
| `apps/desktop/tsconfig.json` | Untracked | D0 | Workspace Config | BUILD | HIGH | ZERO | C8 (`c5ec640`) |
| `apps/desktop/src/types.ts` | Untracked | D0-D2 | Type Definitions | TYPES | HIGH | ZERO | C8 (`c5ec640`) |
| `apps/desktop/src/index.ts` | Untracked | D0-D2 | Desktop Exports | RUNTIME | HIGH | ZERO | C8 (`c5ec640`) |
| `apps/desktop/src/main/**` | Untracked | D1 | Electron Main Process | RUNTIME | HIGH | ZERO | C8 (`c5ec640`) |
| `apps/desktop/src/preload/**` | Untracked | D1 | ContextBridge Preload | RUNTIME | HIGH | ZERO | C8 (`c5ec640`) |
| `apps/desktop/src/kernel-host/index.ts` | Untracked | D2 | Kernel Host Exports | RUNTIME | HIGH | ZERO | C8 (`c5ec640`) |
| `apps/desktop/src/kernel-host/kernelHost.ts` | Untracked | D2 | Kernel Utility Host | RUNTIME | HIGH | ZERO | C8 (`c5ec640`) |
| `apps/desktop/src/d0.test.ts` | Untracked | D0 | Vitest Test Suite | TEST | HIGH | ZERO | C8 (`c5ec640`) |
| `apps/desktop/src/d1.test.ts` | Untracked | D1 | Vitest Test Suite | TEST | HIGH | ZERO | C8 (`c5ec640`) |
| `apps/desktop/src/d2.test.ts` | Untracked | D2 | Vitest Test Suite | TEST | HIGH | ZERO | C8 (`c5ec640`) |
| `apps/desktop/src/dogfood-d1*` | Untracked | D1 | Live Dogfood Script | TEST | HIGH | ZERO | C8 (`c5ec640`) |
| `apps/desktop/src/dogfood-d2*` | Untracked | D2 | Live Dogfood Script | TEST | HIGH | ZERO | C8 (`c5ec640`) |
| `apps/desktop/src/renderer/**` | Untracked | D3-D4 | Living HQ Renderer | RUNTIME | HIGH | ZERO | C9 (`5136655`) |
| `apps/desktop/src/kernel-host/d3FixtureHost.ts` | Untracked | D3 | Dogfood Host Fixture | TEST | HIGH | ZERO | C9 (`5136655`) |
| `apps/desktop/src/kernel-host/d4FixtureHost.ts` | Untracked | D4 | Dogfood Host Fixture | TEST | HIGH | ZERO | C9 (`5136655`) |
| `apps/desktop/src/d3.test.ts` | Untracked | D3 | Vitest Test Suite | TEST | HIGH | ZERO | C9 (`5136655`) |
| `apps/desktop/src/d4.test.ts` | Untracked | D4 | Vitest Test Suite | TEST | HIGH | ZERO | C9 (`5136655`) |
| `apps/desktop/src/dogfood-d3*` | Untracked | D3 | Live Dogfood Script | TEST | HIGH | ZERO | C9 (`5136655`) |
| `apps/desktop/src/dogfood-d4*` | Untracked | D4 | Live Dogfood Script | TEST | HIGH | ZERO | C9 (`5136655`) |
| `apps/desktop/src/dogfood-real.mjs` | Untracked | D4 | Live Dogfood Script | TEST | HIGH | ZERO | C9 (`5136655`) |
| `apps/desktop/src/dogfood-negative.mjs` | Untracked | D4 | Live Dogfood Script | TEST | HIGH | ZERO | C9 (`5136655`) |
| `apps/desktop/src/qa-browser.mjs` | Untracked | D4 | QA Browser Script | TEST | HIGH | ZERO | C9 (`5136655`) |
| `package.json` | Modified | B0 | Monorepo Scripts | BUILD | HIGH | ZERO | C10 (`674a869`) |
| `package-lock.json` | Modified | B0 | Monorepo Lockfile | BUILD | HIGH | ZERO | C10 (`674a869`) |
| `packages/prompts/src/compiler.ts` | Modified | B0 | Type signature align | RUNTIME | HIGH | ZERO | C10 (`674a869`) |
| `vitest.config.ts` | Modified | B0 | Test Loader Config | TEST | HIGH | ZERO | C10 (`674a869`) |
| `docs/architecture-v2/B0_*.md` | Untracked | B0 | Forensic B0 Evidence | DOCS | NONE | ZERO | C10 (`674a869`) |
| `docs/architecture-v2/POST_D4_*.md` | Untracked | Post-D4 | Integration Records | DOCS | NONE | ZERO | C10 (`674a869`) |
| `gravitas-agent-specs/**` | Untracked | Specs | 25 Agent Contracts | DOCS | NONE | ZERO | C11 (`0dc85de`) |
| `docs/architecture-v2/P*.md` | Untracked | P0-P8 | Specs & Scenario Ledgers| DOCS | NONE | ZERO | C11 (`0dc85de`) |
| `docs/architecture-v2/K*.md` | Untracked | K0-K5 | Specs & Evidences | DOCS | NONE | ZERO | C11 (`0dc85de`) |
| `docs/architecture-v2/D*.md` | Untracked | D0-D4 | Specs & Evidences | DOCS | NONE | ZERO | C11 (`0dc85de`) |
| `docs/architecture-v2/SKILL_ARENA_*.md` | Untracked | Deferred | Skill Arena Specs | DOCS | NONE | ZERO | C12 (`df48a68`) |
| `docs/architecture-v2/B1_*.md` | Untracked | B1 | Baseline Evidence | DOCS | NONE | ZERO | C13 (Final) |
