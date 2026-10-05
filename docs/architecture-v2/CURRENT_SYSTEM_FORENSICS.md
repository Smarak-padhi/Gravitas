# CURRENT SYSTEM FORENSICS

**Wave:** P2 — Current Backend Forensics  
**Status:** COMPLETE / FORENSIC BASELINE ESTABLISHED  
**Date:** 2026-09-30  
**Repository Branch:** `feat/v0-golden-loop`  
**Git Commit Baseline:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariant:** `ROLE ≠ EXECUTOR ≠ HARNESS ≠ MODEL ≠ PROVIDER ≠ GATEWAY ≠ PROCESS`

---

## 1. Executive Summary

This forensic investigation inspects the active GRAVITAS source tree to establish what is genuinely implemented, what is merely declared, what is partially functioning, what is dead or unreachable, and what is missing.

### Dual Evaluation Standard
Because repository dependencies (`node_modules`) were absent during Wave P2, this audit strictly bifurcates:
1. **Source Reality**: What TypeScript source code, types, logic, and tests are present on disk (`IMPLEMENTED`, `PARTIAL`, `DECLARED_ONLY`, `DEAD_OR_UNREACHABLE`, `BYPASSED`, `MISSING`, `UNKNOWN`).
2. **Runtime Verification**: What has been proven by live execution during P2 (`VERIFIED`, `NOT_EXECUTED`, `BLOCKED_BY_DEPENDENCIES`, `UNVERIFIED`).

A substantial bounded orchestration implementation exists in source. End-to-end runtime functionality was not established during P2 because repository dependencies were unavailable.

### Key Forensic Findings
1. **Orchestration Source Implementation Exists**:
   `packages/core`, `packages/orchestrator`, `packages/git`, `packages/harnesses`, `packages/verifier`, `packages/prompts`, and `apps/server` contain an extensive source implementation featuring bounded DAG scheduling, isolated Git worktree management, independent deterministic verification, mutation capture, evidence manifest generation, and human approval gates.
2. **Persistence Reality Mismatch**:
   While `packages/orchestrator` implements an advanced SQLite store for background jobs and calendar connectors (`SqliteJobStore`, `SqliteConnectorStore` using Node 22+ native `node:sqlite`), the core control plane (`apps/server/src/registry.ts`) relies exclusively on `InMemoryRegistry`. Server termination clears all active runs, tasks, and state history.
3. **Architectural Role-Harness Coupling Violation**:
   While `@gravitas/core/src/roles.ts` defines 5 canonical reasoning roles, and `gravitas-agent-specs/agents/` defines 25 agent markdown specifications, the server runtime (`apps/server/src/index.ts:57`) instantiates only a single harness (`FreeClaudeCodeHarness`), and `RunService` injects this solitary harness into `BoundedScheduler`. Every task, regardless of assigned role, executes through this single injected harness. There is no multi-harness dispatcher or dynamic executor resolution mechanism in the server runtime.
4. **Planning Is Deterministic / Client-Supplied**:
   There is no autonomous LLM-driven planner agent in the runtime. Goals submitted to `POST /api/v1/runs` either contain client-specified tasks, or the server creates a single trivial dummy task. The server validates DAG topologies (`packages/orchestrator/src/validator.ts`) but does not autonomously generate plans from high-level goals.
5. **Integration / Materialization Stops at Task Branches**:
   When tasks complete and are approved, changes are committed to isolated task branches (`gravitas/run_<runId>/task_<taskId>`). Downstream tasks cherry-pick from these commits. However, verified task results are not integrated back into `baseBranch` at run completion.
6. **Capability Grants vs OS Containment**:
   Pre-flight checks validate `CapabilityGrant` metadata in memory, but no GRAVITAS-enforced OS-level sandbox/containment boundary was identified for spawned harness subprocesses. Their effective authority therefore inherits the launching environment except where externally constrained.
7. **Evidence Bundle Protection Discipline**:
   `writeEvidenceBundle` implements integrity hashing, change detection, and manifest generation with SHA-256. It does not implement external trust anchoring, cryptographic digital signing, or append-only storage.

---

## 2. Package-by-Package Source Forensics

### 2.1. Root Repository & Workspace Configuration
- **Files**: `package.json`, `pnpm-workspace.yaml` (absent), `turbo.json` (absent).
- **Configuration**: Root `package.json` defines npm workspaces (`"workspaces": ["packages/*", "apps/*"]`).
- **Dependencies**: Root contains no production dependencies, only dev dependencies (`typescript`, `tsx`, `vitest`).
- **Disk & Runtime State**: `node_modules/` is absent. Direct test execution and compilation are `BLOCKED_BY_DEPENDENCIES`.

### 2.2. `@gravitas/core` (`packages/core/src/`)
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Inspection**:
  - `fsm.ts`: Authoritative finite state machines for Run (`CREATED`, `READY`, `RUNNING`, `PAUSED`, `WAITING_APPROVAL`, `COMPLETED`, `FAILED`, `CANCELLED`) and Task (`BLOCKED`, `READY`, `RUNNING`, `VERIFYING`, `WAITING_APPROVAL`, `APPROVED`, `SUCCEEDED`, `FAILED`, `CANCELLED`). Enforces strict transition validation (`canTransitionRun`, `transitionRun`, `canTransitionTask`, `transitionTask`).
  - `contract.ts`: Schema and factory for `ExecutionContract` (`createExecutionContract`). Validates repository root, base branch, constraints, acceptance criteria, and evidence requirements.
  - `dependencies.ts`: Pure topological sort (`topologicalSortTasks`), cycle detection, and DAG validation.
  - `roles.ts`: Authoritative taxonomy declaring 5 canonical reasoning roles (`role:strategy:chief-planner`, `role:engineering:frontend-engineer`, `role:engineering:backend-engineer`, `role:quality:independent-reviewer`, `role:integration:integration-engineer`) and 7 deterministic services (`courier`, `scheduler`, `notification`, `voice`, `file-indexer`, `git`, `verification-runner`).
  - `events.ts`: Event type schemas and factories for all lifecycle events (`RunCreated`, `TaskStateChanged`, `EvidenceCreated`, `WorkerStarted`, etc.).
  - `prompt.ts`: Types for managed prompt layers and role templates.

### 2.3. `@gravitas/orchestrator` (`packages/orchestrator/src/`)
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Inspection**:
  - `scheduler.ts`: `BoundedScheduler` implements bounded task concurrency (`plan.maxConcurrency`), topological dispatch, state transitions, worktree lifecycle management, harness execution invocation, verifier execution, evidence bundling, and approval workflows.
  - `composition.ts`: `composeTaskWorktree` creates isolated Git worktrees for tasks (`<runtimeRoot>/worktrees/run_<runId>/task_<taskId>`). Implements single-parent branching and multi-parent sequential cherry-picking. Fails cleanly with `CompositionConflictError`. `materializeVerifiedResult` stages all changes and creates an authoritative `gravitas: verified result <taskId>` commit on the isolated task branch.
  - `validator.ts`: `validateRunPlan` ensures DAG acyclicity, valid dependency references, and contract conformance.
  - `jobs/`: Background execution engine featuring `SqliteJobStore`, `JobRunner`, `JobScheduler`, and `ActionExecutor`. Implements WAL-mode SQLite database with versioned migrations (`schema_metadata`), atomic occurrence claiming, and run recovery.
  - `connectors/`: `SqliteConnectorStore`, `CredentialBroker`, `ConnectorRegistry`, and Google Calendar adapter.

### 2.4. `@gravitas/harnesses` (`packages/harnesses/src/`)
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Inspection**:
  - `process.ts`: Subprocess spawning boundary (`runSubprocess`). On Windows, uses `taskkill.exe /PID <pid> /T /F` to terminate process trees on timeout or cancellation. Implements output sanitization and byte limiting (`DEFAULT_MAX_OUTPUT_BYTES = 512KB`).
  - `mutation.ts`: `takeWorktreeSnapshot` and `captureWorktreeMutation` diff the filesystem before and after harness execution, calculating SHA256 hashes of modified, added, and deleted files, and enforcing file constraint boundaries.
  - `claude-code.ts`: `ClaudeCodeHarness` implements `AgentHarness` for official Claude Code CLI (`claude`). Spawns headless `-p` commands with `--output-format json`.
  - `free-claude-code.ts`: `FreeClaudeCodeHarness` executes through the Free Claude Code proxy/launcher.
  - `codex.ts`: `CodexHarness` wraps OpenAI Codex CLI (`codex`), parsing streaming JSONL output and extracting tool mutations.

### 2.5. `@gravitas/gateways` (`packages/gateways/src/`)
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Inspection**:
  - `omniroute.ts`: Client for local OmniRoute inference proxy (`http://127.0.0.1:8000`), supporting health checks, model list, model qualification, and chat completions forwarding.
  - `router.ts`: `DeterministicInferenceRouter` resolves execution routes (`DIRECT` vs `GATEWAY`) based on worker qualifications, health status, and fallback policies.
  - `registry.ts`: In-memory gateway registry for gateway status and health checks.

### 2.6. `@gravitas/agents` (`packages/agents/src/`)
- **Source Reality**: `PARTIAL`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Inspection**:
  - `capabilities.ts`: Canonical capability taxonomy (`filesystem.read`, `filesystem.write`, `git.*`, `browser.*`, `verifier.*`).
  - `grants.ts`: `CapabilityGrantManager` validates whether requested capabilities are permitted for a given role based on role definitions in `@gravitas/core/src/roles.ts`.
  - `descriptor.ts`: Agent descriptor and registry contracts.
  - `registry.ts`: `DefaultAgentRegistry` tracks registered agent instances and handles grant requests.
  - `qualification.ts`: Qualification runner evaluating agents against capability benchmarks.
  - **Limitation**: Capability grants are validated in-memory as metadata before task dispatch (`scheduler.ts:599`). However, no GRAVITAS-enforced OS-level sandbox or containment boundary was identified for spawned harness subprocesses; their effective authority inherits the launching environment except where externally constrained.

### 2.7. `@gravitas/prompts` (`packages/prompts/src/`)
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Inspection**:
  - `compiler.ts`: `compilePrompt` constructs a 4-layer managed prompt:
    1. Global Policy Layer (`global-policy.ts`): Immutable invariants (no committing, no network access, isolated worktree rules).
    2. Role Template Layer: Injected instructions specific to the role.
    3. Task Layer (`task-layer.ts`): Task objective, acceptance criteria, required evidence, and dependency outputs.
    4. Runtime Layer (`runtime-layer.ts`): Concrete worktree paths, branch names, and allowed file constraints.
  - Produces a deterministically hashed compiled prompt bundle with SHA256 integrity check.

### 2.8. `@gravitas/git` (`packages/git/src/`)
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Inspection**:
  - `worktree.ts`: Pure Git wrapper managing isolated worktrees (`git worktree add`, `git worktree remove --force`, `git worktree prune`).
  - `ref-safety.ts`: Ref name sanitization preventing path traversal or dangerous Git ref parameters.

### 2.9. `@gravitas/verifier` (`packages/verifier/src/`)
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Inspection**:
  - `verifier.ts`: Independent verification controller. Executes verification plans outside the agent harness.
  - `runner.ts`: Deterministic command runner executing configured test commands with strict timeouts.
  - `evidence.ts`: `writeEvidenceBundle` writes artifacts under `<runtimeRoot>/runs/<runId>/tasks/<taskId>/`:
    - `evidence-manifest.json` (SHA256 manifest of all artifacts)
    - `evidence-manifest.sha256` (SHA256 hash of manifest itself)
    - `worker.json` (captured agent execution metadata)
    - `diff.patch` (worktree patch)
    - `verification.json` (verifier execution results)
    - `prompt.txt` (exact prompt text submitted to harness)
  - `state-authority.ts`: Evaluates verification results and determines final state transitions (`applyVerificationOutcome`).

### 2.10. `@gravitas/browser-qa` (`packages/browser-qa/src/`)
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Inspection**:
  - `runner.ts`: Playwright-driven automated browser verifier (`executeBrowserQa`). Launches Chromium in headless mode, executes configured actions (`navigate`, `click`, `fill`, `assertVisible`, `screenshot`), captures screenshot evidence, and returns structured QA results.
  - `dsl.ts`: Parser and validator for browser QA contracts.
  - `security.ts`: Restricts navigation targets strictly to localhost/loopback URLs to prevent SSRF or external exfiltration.

### 2.11. `apps/server` (`apps/server/src/`)
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Inspection**:
  - `app.ts`: Node.js native HTTP request router. Exposes REST API endpoints:
    - `GET /health`
    - `GET /state`
    - `POST /api/v1/runs` (Run ingestion)
    - `POST /api/v1/runs/:runId/execute` (Run execution dispatch)
    - `POST /api/v1/runs/:runId/tasks/:taskId/approve` (Human approval)
    - `POST /api/v1/runs/:runId/tasks/:taskId/reject` (Human rejection)
    - `GET /api/v1/events` (Live Server-Sent Events stream)
    - Background jobs and connector management endpoints.
  - `service.ts`: `RunService` manages the lifecycle of runs, active schedulers, task transitions, and event emission.
  - `registry.ts`: `InMemoryRegistry` provides in-memory stores for runs, tasks, contracts, mutations, and verifications.
  - `events.ts`: `EventHub` manages SSE client subscriptions and heartbeat pings.
  - `server.ts`: HTTP server container bound strictly to `127.0.0.1`.

### 2.12. `apps/web` (`apps/web/src/`)
- **Source Reality**: `IMPLEMENTED`
- **Runtime Verification**: `BLOCKED_BY_DEPENDENCIES`
- **Source Inspection**:
  - Full React + Vite application.
  - Provides a 2D management interface: `RunsList`, `TaskInspector`, `GoalComposer`, `PromptManager`, `DiffViewer`, `EventConsole`.
  - `hq3d/`: Advanced Three.js / React 3D diorama representing the agent office ("Living HQ"). Features spatial rooms (`MissionControl`, `HeroBay`, `VerificationCleanroom`, `BrowserQaLab`), animated character representations, locomotion pathfinding, and artifact custody motion.
  - Consumes state strictly from server SSE events and REST endpoints.

### 2.13. `gravitas-agent-specs/`
- **Source Reality**: `DECLARED_ONLY`
- **Runtime Verification**: `NOT_EXECUTED`
- **Source Inspection**:
  - Contains 25 Markdown files in `agents/` (`00-AGENT-CONTRACT.md` through `24-WORLD-PROJECTION-RENDERER.md`).
  - Contains 2 Markdown files in `registries/` (`DESIGN_SOURCE_REGISTRY.md`, `PRIOR_PROJECT_PATTERN_SCHEMA.md`).
  - **Divergence**: These 25 files are not parsed, loaded, or executed by `@gravitas/server` or `@gravitas/orchestrator`. The active runtime codebase references only the 5 canonical roles defined in `@gravitas/core/src/roles.ts`.

---

## 3. Implementation Reality Matrix (Dual Classification)

| Component / Subsystem | Target Architecture Concept | Source File & Symbol | Source Reality | Runtime Verification | Reality Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Run Ingestion** | Goal & Contract Ingestion | `apps/server/src/service.ts:300`<br>`createRun()` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Ingests `goal`, validates `ExecutionContract`, initializes Run and Tasks in memory. |
| **Autonomous Planner** | Dynamic DAG Generation from Goal | N/A | `MISSING` | `NOT_EXECUTED` | No LLM-based planner exists. Tasks must be supplied by caller or fallback single task is generated. |
| **Plan Validation** | DAG Validation & Topological Sort | `packages/orchestrator/src/validator.ts:37`<br>`validateRunPlan()` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Validates DAG acyclicity, task references, and acceptance criteria in source. |
| **Bounded Scheduler** | Bounded Concurrency Task Dispatch | `packages/orchestrator/src/scheduler.ts:240`<br>`BoundedScheduler` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Dispatches tasks up to `maxConcurrency`, tracks dependencies, pauses on approval. |
| **Role Resolution** | Dynamic Role-to-Executor Mapping | `packages/core/src/roles.ts:121`<br>`CANONICAL_ROLE_DEFINITIONS` | `DECLARED_ONLY` | `NOT_EXECUTED` | 5 roles declared, but scheduler funnels all roles to single server harness. |
| **Capability Enforcement** | Pre-flight Capability Grants | `packages/agents/src/grants.ts:85`<br>`CapabilityGrantManager` | `PARTIAL` | `BLOCKED_BY_DEPENDENCIES` | Grants checked in-memory before dispatch; effective authority inherits launching environment. |
| **Multi-Harness Dispatch** | Role-Specific Harness Execution | N/A | `BYPASSED` | `NOT_EXECUTED` | `RunService` injects single `AgentHarness` (`scheduler.ts:553`). All roles use that one harness. |
| **Harness Execution** | Headless Agent CLI Execution | `packages/harnesses/src/process.ts:60`<br>`runSubprocess()` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Subprocess spawning with timeout, process tree kill on Windows (`taskkill`), output sanitization. |
| **Claude Code Harness** | Official Claude Code CLI Adapter | `packages/harnesses/src/claude-code.ts:47`<br>`ClaudeCodeHarness` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Headless execution adapter for `claude -p --output-format json`. |
| **FCC Harness** | Free Claude Code Proxy Adapter | `packages/harnesses/src/free-claude-code.ts:40`<br>`FreeClaudeCodeHarness` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Adapter for FCC launcher and local proxy. Default standalone server harness. |
| **Codex Harness** | OpenAI Codex CLI Adapter | `packages/harnesses/src/codex.ts:44`<br>`CodexHarness` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Spawns `codex` CLI, parses streaming JSONL events, extracts file mutations. |
| **Worktree Isolation** | Per-Task Git Worktree Sandbox | `packages/git/src/worktree.ts:45`<br>`allocateWorktree()` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Creates isolated branch and directory for each task under `<runtimeRoot>/worktrees/`. |
| **Result Composition** | Multi-parent DAG Cherry-pick | `packages/orchestrator/src/composition.ts:96`<br>`composeTaskWorktree()` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Branches from parent[0], sequentially cherry-picks parents[1..n], fails on conflict. |
| **Mutation Capture** | Worktree Filesystem Diffing | `packages/harnesses/src/mutation.ts:74`<br>`captureWorktreeMutation()` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Diffs filesystem against pre-execution snapshot, checks SHA256, verifies allowed paths. |
| **Independent Verifier** | Out-of-Band Deterministic Tests | `packages/verifier/src/verifier.ts:39`<br>`executeVerification()` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Executes commands directly in worktree, captures exit codes and stdout/stderr. |
| **Browser QA** | Headless Playwright Verification | `packages/browser-qa/src/runner.ts:46`<br>`executeBrowserQa()` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Runs Playwright actions and assertions against localhost; captures screenshots. |
| **Evidence Bundling** | Evidence Manifest Generation | `packages/verifier/src/evidence.ts:45`<br>`writeEvidenceBundle()` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Writes bundle with manifest SHA256, diff patch, logs, prompt text. No external signing. |
| **Human Approval Gate** | WAITING_APPROVAL State & Action | `packages/orchestrator/src/scheduler.ts:1040`<br>`approveTask()` / `rejectTask()` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Transitions task, auto-pauses scheduler, creates verified commit on approval. |
| **Materialization** | Task Commit Creation | `packages/orchestrator/src/composition.ts:40`<br>`materializeVerifiedResult()` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Stages changes and commits as `gravitas: verified result <taskId>` on isolated task branch. |
| **Final Run Integration** | Automated Merge/PR to Base Branch | N/A | `MISSING` | `NOT_EXECUTED` | Verified task results are not integrated back into baseBranch at run completion. |
| **Run Persistence** | Durable Storage for Runs & Tasks | `apps/server/src/registry.ts:24`<br>`InMemoryRegistry` | `DECLARED_ONLY` / `MISSING` | `BLOCKED_BY_DEPENDENCIES` | In-memory only. Server restart clears all runs, tasks, and state history. |
| **Job & Connector Store** | Durable Storage for Background Jobs | `packages/orchestrator/src/jobs/sqliteJobStore.ts:34`<br>`SqliteJobStore` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Production SQLite store using Node `node:sqlite`, WAL mode, versioned migrations. |
| **Living HQ 3D Diorama** | 3D Projection of System State | `apps/web/src/hq3d/LivingHqCanvas3D.tsx` | `IMPLEMENTED` | `BLOCKED_BY_DEPENDENCIES` | Three.js scene showing rooms, character avatars, locomotion, and handoff conduits. |
| **25 Agent Specifications** | Extended Specialist Role Specs | `gravitas-agent-specs/agents/` | `DECLARED_ONLY` | `NOT_EXECUTED` | 25 markdown files. Unparsed and unconnected to runtime role registry. |

---

## 4. Contradiction Register

| # | Topic / Area | Documentation / ADR Claim | Source Code Reality | Forensic Classification |
| :- | :--- | :--- | :--- | :--- |
| **C-01** | **Role vs Harness Independence** | Architectural invariant dictates: `ROLE ≠ EXECUTOR ≠ HARNESS`. Each role has distinct specialization and tools. | `RunService` accepts a single global `AgentHarness`. `BoundedScheduler` executes every task through `this.harness` regardless of the task's assigned role. | `BYPASSED` |
| **C-02** | **Autonomous Planning** | The system automatically decomposes operator goals into multi-agent DAG execution plans. | `POST /api/v1/runs` requires caller to provide `tasks` or `plan`. If omitted, it generates a single dummy task (`service.ts:380-405`). No LLM planning agent exists. | `MISSING` |
| **C-03** | **Control Plane Persistence** | Gravitas is a desktop operating system managing persistent runs, history, and state across sessions. | `apps/server/src/registry.ts` uses `InMemoryRegistry` (`private readonly runs = new Map<string, Run>()`). Restarting the server wipes all runs, contracts, tasks, and events. | `MISSING` |
| **C-04** | **Agent Specifications (25 vs 5)** | `gravitas-agent-specs/agents/` defines 25 specialized agents (Study Coach, Outreach Assistant, Desktop Runtime Engineer, etc.). | `@gravitas/core/src/roles.ts` defines exactly 5 reasoning roles. The 25 agent markdown files are not referenced anywhere in the TypeScript compiler or runtime. | `DECLARED_ONLY` |
| **C-05** | **Capability Token Enforcement** | Tasks have fine-grained capability grants restricting filesystem, git, and network authority. | `CapabilityGrantManager` checks role permissions in memory, but no GRAVITAS-enforced OS-level sandbox/containment boundary exists. Effective authority inherits launching environment. | `PARTIAL` |
| **C-06** | **Final Materialization / Merge** | When all tasks succeed and are approved, changes are integrated into the repository base branch. | `materializeVerifiedResult` commits to isolated task branches (`gravitas/run_<runId>/task_<taskId>`). When the run completes, no merge, rebase, or PR to `baseBranch` occurs. | `MISSING` |
| **C-07** | **SQLite Adoption State** | SQLite is used for persistent state management in the engine. | SQLite (`node:sqlite`) is implemented for background jobs and calendar connectors (`SqliteJobStore`, `SqliteConnectorStore`), but is not used for runs, tasks, or event logs. | `PARTIAL` |
| **C-08** | **OmniRoute Direct Fallback** | All LLM calls route through OmniRoute gateway proxy with automatic health checks. | `FreeClaudeCodeHarness` and `ClaudeCodeHarness` spawn CLI binaries directly. Gateway routing (`packages/gateways`) is probed but bypassed if direct transport is selected. | `PARTIAL` |

---

## 5. Wave P2 Boundary Compliance

- No code in `packages/` or `apps/` was modified.
- No package manifests or lockfiles were touched.
- No packages were installed.
- No external services were authenticated.
- All analysis is derived strictly from static inspection of tracked repository source files.
