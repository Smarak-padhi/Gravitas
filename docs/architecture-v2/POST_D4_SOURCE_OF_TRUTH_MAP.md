# Post-D4 Source-of-Truth Map

| State / Subsystem | Authority Classification | Implementation Location | Persistence & Mutation Path |
| :--- | :---: | :--- | :--- |
| **WorkSession FSM & Entity Records** | **AUTHORITATIVE** | `packages/core/src/kernel/domain/worksession.ts` | SQLite DB via `SqliteWriter` single-writer transaction. |
| **Durable Jobs & Leases** | **AUTHORITATIVE** | `packages/core/src/kernel/domain/jobs.ts` | Persisted in `durable_jobs` SQLite table with heartbeat leases. |
| **Event / Audit Log** | **AUTHORITATIVE** | `packages/core/src/kernel/domain/events.ts` | Monotonically sequenced, append-only SQLite events table. |
| **CapabilityGrants** | **AUTHORITATIVE** | `packages/orchestrator/src/k3/grants.ts` | Durably recorded per-task/run grant tokens in Kernel state. |
| **Harness Qualification Ladder** | **AUTHORITATIVE** | `packages/harnesses/src/k1/qualification.ts` | Evaluated against host environment criteria, frozen in memory. |
| **Architecture Arena State** | **AUTHORITATIVE** | `packages/orchestrator/src/k4/arena.ts` | Managed via K0 Kernel WorkSession entities and commands. |
| **Verification Bundles & Evidence** | **AUTHORITATIVE** | `packages/orchestrator/src/k5/engine.ts` | Signed/hashed evidence manifests bound to canonical tasks. |
| **Desktop Supervisor** | **DERIVED / EPHEMERAL** | `apps/desktop/src/main.ts` | Manages Electron browser windows and child utilityProcess lifecycle. |
| **KernelHost (utilityProcess)** | **AUTHORITATIVE (HOST)** | `apps/desktop/src/kernel-host/**` | Hosts Node.js kernel instance and handles IPC command dispatch. |
| **Preload Bridge** | **PROJECTION / GATEWAY** | `apps/desktop/src/preload.ts` | Read-only context isolation bridge exposing `window.gravitas`. |
| **Command Center Views** | **PROJECTION** | `apps/desktop/src/renderer/renderer.ts` | Bounded read-only projection of Kernel state. |
| **System Tray State** | **DERIVED / PROJECTION** | `apps/desktop/src/tray.ts` | Derives menu status indicators from latest health projection. |
| **Living HQ Spatial World** | **PROJECTION** | `apps/desktop/src/renderer/world/spatial.ts` | Transient Three.js / WebGL scene graph derived on refresh. |
| **Role-Bot Visual System** | **PROJECTION** | `apps/desktop/src/renderer/world/roleRegistry.ts` | Visual avatars derived from task assignments; ZERO state authority. |
| **Semantic Outline & Inspector** | **PROJECTION** | `apps/desktop/src/renderer/world/worldView.ts` | Accessible DOM representations of spatial projection entities. |
