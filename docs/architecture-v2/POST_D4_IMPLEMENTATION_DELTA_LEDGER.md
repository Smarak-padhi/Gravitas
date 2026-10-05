# Post-D4 Implementation Delta Ledger

## 1. Modifications to Tracked Repository Files
- `package.json` / `package-lock.json`: Added desktop/test scripts (`test:kernel`, `test:harnesses`, `test:k2..k5`, `test:d0..d4`), electron dependencies, vitest configuration.
- `packages/core/package.json` & `packages/core/src/index.ts`: Exported Kernel types, domain errors, WorkSession FSM, and persistence primitives.
- `packages/harnesses/src/index.ts`: Exported K1 qualification, adapter registries, and execution surfaces.
- `packages/orchestrator/src/index.ts`: Exported K2 supervisor-worker orchestrator, K3 tool grant registry, K4 architecture arena, and K5 verification engine.
- `vitest.config.ts`: Excluded `packages/core/src/kernel/__tests__/**` from vitest to run under native `node:test` runner.

## 2. Wave-by-Wave Implementation Mapping

| Wave | Key Files / Paths | Purpose & Frozen Contract | Tests |
| :--- | :--- | :--- | :---: |
| **K0** | `packages/core/src/kernel/**` | WorkSession FSM, SQLite single-writer persistence, revision control, monotonic sequence logs. | `packages/core/src/kernel/__tests__/kernel.test.ts` (51) |
| **K1** | `packages/harnesses/src/k1/**` | Execution-surface qualification ladder (DISCOVERED -> QUALIFIED -> READY), PowerShell/Codex/Claude/agy adapters. | `packages/harnesses/src/k1/k1.test.ts` + harness tests (108) |
| **K2** | `packages/orchestrator/src/k2/**` | Supervisor ↔ Worker closed loop, task leasing, result recording, and recovery. | `packages/orchestrator/src/k2/k2.test.ts` (53) |
| **K3** | `packages/orchestrator/src/k3/**` | Granular CapabilityGrants, ToolRegistry, 4-way gate algebra (K1 eligible ∧ K3 authorized). | `packages/orchestrator/src/k3/k3.test.ts` (85) |
| **K4** | `packages/orchestrator/src/k4/**` | Architecture Arena runtime, scout consensus, neutral scoring, and failure recovery. | `packages/orchestrator/src/k4/k4.test.ts` (40) |
| **K5** | `packages/orchestrator/src/k5/**` | Independent verification, falsification, evidence bundles, crash recovery, and human approval sovereignty. | `packages/orchestrator/src/k5/k5.test.ts` (40) |
| **D0** | `apps/desktop/src/main.ts`, `apps/desktop/src/preload.ts`, `kernelHost.ts` | Secure Electron desktop shell, utilityProcess KernelHost, strict context isolation, unprivileged renderer. | `apps/desktop/src/d0.test.ts` (30) |
| **D1** | `apps/desktop/src/renderer/**`, `types.ts` | Command Center UI, canonical projections, bounded operator intents, human approval queue. | `apps/desktop/src/d1.test.ts` (50) |
| **D2** | `apps/desktop/src/tray.ts`, `main.ts` | System tray lifecycle, window hide/restore continuity, background execution, zero-orphan exit. | `apps/desktop/src/d2.test.ts` (50) |
| **D3** | `apps/desktop/src/renderer/world/**` | Adaptive World / Living HQ spatial projection, Three.js render adapter, 100% accessible DOM outline. | `apps/desktop/src/d3.test.ts` (60) |
| **D4** | `roleRegistry.ts`, `d4FixtureHost.ts`, dogfood scripts | Role-Bot Visual System, 5 distinct silhouettes, 25 roles across 3 tiers, taxonomy separation proof. | `apps/desktop/src/d4.test.ts` (60) |
