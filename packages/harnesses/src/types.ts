/**
 * Provider-neutral Agent Harness contracts and execution models for @gravitas/harnesses.
 * Pure data interfaces — no vendor lock-in or speculative frameworks.
 */

/**
 * Detailed availability state for an agent harness on the host system.
 *
 * AVAILABLE          - Installed, authenticated, and ready for unattended execution.
 * AUTH_REQUIRED      - Installed on host, but user authentication / API key is missing.
 * INSTALLED          - Binary exists on host, but prerequisites (e.g. noninteractive mode) not met.
 * UNAVAILABLE        - Binary or required runtime not found on host.
 */
export type HarnessAvailabilityStatus =
  | 'AVAILABLE'
  | 'AUTH_REQUIRED'
  | 'INSTALLED'
  | 'UNAVAILABLE'

/**
 * Telemetry and state describing harness readiness.
 */
export interface HarnessAvailability {
  readonly status: HarnessAvailabilityStatus
  readonly installed: boolean
  readonly version?: string | undefined
  readonly executablePath?: string | undefined
  readonly usableNoninteractive: boolean
  readonly message?: string | undefined
}

/**
 * Structured permission and capability bounds for worker execution.
 */
export interface HarnessPermissions {
  /** If true, harness permits file modifications in the worktree. */
  readonly allowFileEdits: boolean
  /** Explicit whitelist of tools available to the worker. */
  readonly allowedTools?: readonly string[] | undefined
  /** Explicit blacklist of tools denied to the worker. */
  readonly disallowedTools?: readonly string[] | undefined
}

/**
 * Request payload sent to an AgentHarness.
 * Provider-neutral: Contains no vendor-specific flags.
 */
export interface AgentExecutionRequest {
  /** Unique execution identifier. */
  readonly executionId: string
  /** The parent run identifier. */
  readonly runId: string
  /** The target task identifier. */
  readonly taskId: string
  /** The isolated Git worktree filesystem directory where execution occurs. */
  readonly worktreePath: string
  /** Fully compiled prompt string from the Prompt Composition Boundary. */
  readonly compiledPrompt: string
  /** Execution timeout in milliseconds (defaults to 60000 ms). */
  readonly timeoutMs?: number | undefined
  /** Permissions granted to this execution. */
  readonly permissions?: HarnessPermissions | undefined
}

/**
 * The reason a worker execution completed or terminated.
 */
export type TerminationReason =
  | 'COMPLETED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'PROCESS_ERROR'

/**
 * Complete result record captured from an agent execution.
 */
export interface AgentExecutionResult {
  readonly executionId: string
  readonly harnessId: string
  readonly harnessVersion?: string | undefined
  readonly startedAt: string
  readonly finishedAt: string
  readonly durationMs: number
  readonly exitCode: number | null
  readonly terminationReason: TerminationReason
  readonly stdout: string
  readonly stderr: string
  readonly stdoutTruncated: boolean
  readonly stderrTruncated: boolean
  readonly worktreePath: string
  readonly pid?: number | undefined
}

/**
 * Provider-neutral agent harness contract.
 */
export interface AgentHarness {
  /** Unique stable harness identifier (e.g. 'claude-code'). */
  readonly id: string

  /** Evaluates real local availability on host. */
  availability(): Promise<HarnessAvailability>

  /** Executes an agent worker within the designated worktree. */
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>

  /** Cancels an ongoing execution by execution ID. Returns true if cancelled. */
  cancel(executionId: string): Promise<boolean>
}

/**
 * Point-in-time snapshot of a Git worktree.
 */
export interface WorktreeSnapshot {
  readonly headSha: string
  readonly branch: string
  readonly isClean: boolean
  readonly fileList: readonly string[]
  readonly stagedCount: number
  readonly unstagedCount: number
  readonly untrackedCount: number
}

/**
 * Capture of worktree mutations caused by worker execution.
 */
export interface MutationCapture {
  readonly beforeSnapshot: WorktreeSnapshot
  readonly afterSnapshot: WorktreeSnapshot
  /** True if HEAD moved (e.g. worker created an unexpected commit). */
  readonly headMutated: boolean
  /** Relative paths of all changed files in the worktree. */
  readonly changedFiles: readonly string[]
  /** Unified Git diff text. */
  readonly diff: string
  /** SHA-256 hash of the unified diff. */
  readonly diffSha256: string
  /** Paths that were expected/allowed to change. */
  readonly allowedChanges: readonly string[]
  /** Paths that were changed unexpectedly (out-of-scope). */
  readonly unexpectedChanges: readonly string[]
}
