# Gravitas WorkerHarness Architecture & Containment Model (Wave 12C.5)

## 1. The Role of WorkerHarness

A `WorkerHarness` is the concrete execution adapter and host environment that runs an LLM subprocess. If an `AgentRole` represents the job description of an employee, the `WorkerHarness` is the supervised workstation where that work is physically carried out.

$$\text{Role Selection (WHAT to do and WHO decides)} \neq \text{Harness Selection (WHERE and HOW it executes)}$$

### Core Responsibilities:
1. **Subprocess Management:** Spawning, monitoring, and terminating CLI worker processes (Codex, FCC, Claude Code).
2. **Containment & Worktree Isolation:** Constraining worker execution to isolated Git worktrees or temporary scratch spaces.
3. **Environment Injection:** Providing required environmental variables, model endpoints, and proxy tokens without exposing persistent host credentials.
4. **Managed Prompt Delivery:** Writing the exact compiled prompt bytes to the worker's input interface.
5. **Stream Capture & Telemetry:** Ingesting stdout/stderr streams, detecting prompt progress, and streaming diagnostic events to the orchestrator.
6. **Hard Lifetime Enforcement:** Terminating hanging processes immediately upon timeout or cancellation.

---

## 2. The `WorkerHarness` Contract

```typescript
export interface WorkerHarness {
  /** Unique harness identifier (e.g., 'codex-worker', 'fcc-worker') */
  readonly id: string

  /** Display title for operators and telemetry */
  readonly displayName: string

  /** Current qualification status based on live evidence probes */
  readonly qualification: HarnessQualification

  /** Capabilities natively supported by this harness */
  readonly supportedCapabilities: ReadonlyArray<CapabilityId>

  /** Operating system process containment profile */
  readonly containmentProfile: ContainmentProfile

  /** Task kinds supported by this harness */
  readonly supportedTaskKinds: ReadonlyArray<TaskKind>

  /** Supported transport protocols */
  readonly supportedProtocols: ReadonlyArray<'DIRECT' | 'OMNIROUTE_HTTP' | 'STDIO_IPC'>

  /** Probe runtime environment to verify readiness */
  probeReadiness(): Promise<HarnessReadinessResult>

  /** Execute a task contract within this harness */
  executeTask(context: HarnessExecutionContext): Promise<HarnessExecutionResult>
}

export interface HarnessQualification {
  readonly isReady: boolean
  readonly qualifiedAt: string // ISO-8601
  readonly probeEvidenceSha256: string
  readonly benchmarkLatencyMs?: number
  readonly contextWindowLimitTokens: number
  readonly activeTransports: ReadonlyArray<'DIRECT' | 'OMNIROUTE_HTTP'>
}

export interface ContainmentProfile {
  readonly isolationType: 'GIT_WORKTREE_EPHEMERAL' | 'CONTAINER_DOCKER' | 'PROCESS_SCRATCH'
  readonly enforcesPathSandboxing: boolean
  readonly networkAccessPolicy: 'UNRESTRICTED' | 'PROXIED_GATEWAY_ONLY' | 'AIR_GAPPED'
  readonly maxProcessWallClockSeconds: number
  readonly maxMemoryMegabytes: number
}
```

---

## 3. Qualification Is Evidence-Backed

A harness claiming to be `READY` does not mean it is qualified for every role:
- **`READY != Compatible with every role`:** A harness may be healthy but lack the tool-calling capability needed for `FrontendEngineer`, or lack the context-window capacity needed for `ChiefPlanner`.
- **Evidence-Backed Admission:** Before a harness is admitted into the active scheduler pool, it must successfully pass a deterministic qualification probe script (e.g., `packages/harnesses/scripts/qualify-codex.ts`).
- **No Self-Proclaimed Readiness:** Qualification status is stored with a cryptographic sha256 checksum of probe execution evidence.

---

## 4. Canonical Harness Implementations

### 1. Codex Worker Harness (`codex-worker`)
- **Underlying CLI:** Codex CLI / OpenAI-compatible command-line agent.
- **Transports:** `DIRECT` (direct OpenAI API) or `OMNIROUTE_HTTP` (routed via OmniRoute gateway).
- **Containment:** `GIT_WORKTREE_EPHEMERAL`. Bounded inside task-specific git worktree; parent directory access strictly forbidden.
- **Specializations:** Rapid TypeScript/React component authoring, unit test generation, AST-aware refactoring.

### 2. Free Claude Code Harness (`fcc-worker`)
- **Underlying CLI:** Free Claude Code CLI bridge.
- **Transports:** `DIRECT` (Anthropic API) or `OMNIROUTE_HTTP`.
- **Containment:** `GIT_WORKTREE_EPHEMERAL`.
- **Specializations:** Complex multi-file architectural reasoning, extensive refactoring, code review.

### 3. Claude Code Harness (`claude-code-worker`)
- **Underlying CLI:** Native Claude Code CLI.
- **Transports:** `DIRECT`.
- **Containment:** `GIT_WORKTREE_EPHEMERAL`.
- **Specializations:** High-complexity systems engineering, terminal diagnostics, deep context synthesis.

---

## 5. Worktree Mutation & Containment Integrity

To protect the host repository and user workspace:
1. **Isolated Task Worktree:** Each task executes in an ephemeral Git worktree created specifically for that `runId` and `taskId`.
2. **Snapshot Pre-Execution:** The harness captures an exact baseline hash of the worktree before launching the worker subprocess.
3. **Out-of-Scope Mutation Detection:** Any changes outside the task's declared `changeScope` are captured as unexpected mutations.
4. **Prohibition of Rogue Commits:** Workers are strictly forbidden from running `git commit` or mutating `HEAD`. Commits are materialized solely by the orchestrator after verification passes.
