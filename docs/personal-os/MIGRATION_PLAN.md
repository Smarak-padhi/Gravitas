# Gravitas Evolutionary Migration Plan: Waves 0–12 to Personal OS (Wave 12C.5)

## 1. Principles of Continuity

Gravitas follows a strict evolutionary migration strategy. The architectural expansion to a Personal Operating System does **NOT** require a ground-up rewrite. The foundational components battle-tested in Waves 0 through 12C remain the bedrock of the system.

$$\text{Evolutionary Expansion, Zero Disruptive Rewrites.}$$

---

## 2. Component Migration Classification

Every component in the current codebase belongs to one of four migration categories:

### 1. `UNCHANGED` (Preserved Exact Behavior)
These modules are mathematically sound, fully covered by tests, and will not be altered:
- **Task Lifecycle Finite State Machine (`@gravitas/core/fsm`):** The 10-state lifecycle (`PLANNED` -> `SUCCEEDED` / `APPROVED`) remains the universal task standard.
- **Topological DAG Dependency Resolver (`@gravitas/orchestrator`):** Dependency validation and DAG traversal logic remain untouched.
- **Independent Verifier Cleanroom (`@gravitas/verifier`):** Out-of-process test execution and mutation checking remain authoritative.
- **Headless Browser QA Runner (`@gravitas/browser-qa`):** Playwright device matrix scenario execution remains authoritative.
- **Evidence Vault Hashing & Archival (`@gravitas/verifier/evidence`):** SHA256 manifest generation remains immutable.
- **Inference Gateway & OmniRoute Qualification (`@gravitas/gateways`):** Proxy routing and model qualification remain active.
- **Pure World Projection Engine (`apps/web/src/hq3d/world/worldState.ts`):** `deriveWorldState` remains pure and deterministic.
- **Dense 2D Operations Center (`apps/web/src/features/**`):** The 2D timeline, run DAG, and inbox remain available as primary or fallback views.

---

### 2. `EXTENDED` (Additive Capabilities, Preserving Existing Signatures)
Existing modules that will receive additive types or fields without breaking existing contracts:
- **`AgentRegistry` (`packages/agents`):** Extended to support formal `AgentRole` metadata, decoupling role definitions from harness subprocesses.
- **`CapabilityGrant` (`packages/core`):** Extended beyond repository paths to include authority classes (`SENSITIVE_READ`, `EXTERNAL_WRITE`, `FINANCIAL`).
- **`RuntimeProjectionSnapshot` (`apps/server/src/projection.ts`):** Extended to project role identifiers and dossier movement states alongside task states.
- **`TopBar` & Workspace Views (`apps/web/src/components/TopBar.tsx`):** Extended with views for Knowledge Library, Business Pipeline, and Personal Operations.

---

### 3. `DEPRECATED LATER` (Maintained for Backward Compatibility, Phased Out Gradually)
- **Direct Harness-to-Agent Equivalence:** Code that equates `agentId === 'codex-agent'` will be smoothly migrated to `role: 'role:engineering:frontend-engineer', preferredHarness: 'codex-worker'`.
- **Monolithic Configuration Objects:** Will be split into modular domain configs (`personal-ops.json`, `connectors.json`).

---

### 4. `NEW` (To Be Built in Subsequent Waves)
- **`docs/personal-os/` Architecture Package (Wave 12C.5 - Current Wave).**
- **Role-Based Character Foundation & Spatial Stations (Wave 12D).**
- **Physical Golden Loop Dossier Animations (Wave 12E).**
- **Role/Harness Runtime Separation Engine (Wave 13).**
- **Background Job Queue & Courier Logistics Daemon (Wave 14).**
- **Connector SDK Platform & Adapters (Wave 15).**
- **Multi-Class Memory & Spaced Repetition Store (Wave 16).**
- **Personal Operations & Rhythm Engine (Wave 17).**
- **Business Operations & Algoryxz Lead Pipeline (Wave 18).**
- **Mobile Companion Control PWA (Wave 19).**
