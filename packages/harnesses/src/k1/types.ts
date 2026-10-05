/**
 * GRAVITAS K1 — Harness Adapter Layer Core Types
 *
 * Enforces frozen taxonomy invariants:
 *   ROLE != EXECUTOR != HARNESS != MODEL != PROVIDER != GATEWAY != PROCESS
 *   SKILL != TOOL != HARNESS != GATEWAY != PROVIDER != MODEL != PROCESS
 *   CAPABILITY != TOOL != TRANSPORT != CREDENTIAL != AUTHORITY
 *   TOOL DECLARATION != TOOL QUALIFICATION != TOOL AUTHORIZATION != TOOL EXECUTION
 *   DISCOVERY != INSTALLATION != AUTHENTICATION != TRUST
 *   HARNESS QUALIFICATION != HARNESS READINESS
 *   MODEL ACCESS != PROVIDER ACCESS
 *   PROVIDER ACCESS != BILLING AUTHORIZATION
 *   SUBSCRIPTION IDENTITY != API ENTITLEMENT
 *   PROMOTIONAL CREDIT != PERMANENTLY FREE
 *   CLI PROCESS != API HARNESS
 *   GATEWAY != PROVIDER
 *   PROCESS LIVENESS != HARNESS READINESS
 *   MODEL DIFFERENCE != COGNITIVE INDEPENDENCE
 *
 * Invariant: HARNESS != CANONICAL DATABASE WRITER
 * Harnesses may NEVER write directly to the kernel SQLite database.
 * All state transitions flow through K0 KernelCommands.
 */

// ─── Harness Kind ────────────────────────────────────────────────────────────

/**
 * Fundamental structural kind of a harness.
 * Preserves: CLI PROCESS != API HARNESS
 */
export type HarnessKind =
  | 'PROCESS' // CLI binary executed as OS child process (Codex, Claude Code, agy, PowerShell)
  | 'API'     // Remote API or SDK client (Bedrock, future HTTP SDK adapters)
  | 'DAEMON'  // Long-running local daemon accessed via IPC/HTTP (FCC proxy, OmniRoute gateway)

// ─── Qualification Ladder ─────────────────────────────────────────────────────

/**
 * Sequential qualification states from the frozen P1/P3 ladder.
 * Preserves: DISCOVERY != INSTALLATION != AUTHENTICATION != TRUST
 *
 * Interpretation is surface-specific (see HarnessKind).
 * For PROCESS harnesses: READY means binary executable + auth valid + cwd available
 * For API harnesses: READY means credentials available + endpoint reachable + cost eligible
 * For DAEMON harnesses: READY means daemon process is healthy and accepting connections
 */
export type QualificationState =
  | 'UNDISCOVERED'        // Not yet inspected
  | 'DISCOVERED'          // Binary/endpoint exists on host or config exists — not yet verified executable
  | 'INSTALLED'           // Binary executes cleanly / client transport initializes — not yet authenticated
  | 'AUTHENTICATED'       // Credentials valid; auth probe succeeded without persisting secrets
  | 'REACHABLE'           // Network / local IPC latency within threshold
  | 'CAPABILITY_PROBED'   // Tool support, structured output, context limits verified
  | 'CONTAINMENT_TESTED'  // Worktree / process isolation verified
  | 'QUALIFIED'           // Certified safe for task assignment — static ceiling
  | 'BLOCKED'             // Permanently blocked (quarantined, policy, license, cost unknown)
  | 'NOT_APPLICABLE'      // Surface does not exist on this host

/**
 * Strictly enforce that qualification transitions only advance (never silently downgrade).
 * A harness must reach each state before advancing to the next.
 */
export const QUALIFICATION_ORDER: readonly QualificationState[] = [
  'UNDISCOVERED',
  'DISCOVERED',
  'INSTALLED',
  'AUTHENTICATED',
  'REACHABLE',
  'CAPABILITY_PROBED',
  'CONTAINMENT_TESTED',
  'QUALIFIED',
] as const

// ─── Dispatch-Time Readiness ──────────────────────────────────────────────────

/**
 * Dynamic dispatch-time readiness state.
 * Preserves: QUALIFICATION_SNAPSHOT != DISPATCH_TIME_READINESS
 *
 * Qualification is durable evidence. Readiness can become stale.
 * Before dispatch, re-check dynamic conditions relevant to the surface.
 */
export type ReadinessState =
  | 'READY'                    // All dispatch-time checks pass
  | 'NOT_READY'                // Dynamic check failed (e.g. auth expired, daemon stopped)
  | 'COST_ELIGIBILITY_UNKNOWN' // Cannot confirm spend eligibility — BLOCKS dispatch
  | 'QUOTA_EXHAUSTED'          // Known exhausted quota
  | 'CREDENTIAL_UNAVAILABLE'   // Credential reference cannot be resolved
  | 'MODEL_UNAVAILABLE'        // Specific model/inference profile not accessible
  | 'NETWORK_UNREACHABLE'      // Network or IPC unreachable at dispatch time
  | 'CONTAINMENT_UNAVAILABLE'  // Required containment mechanism unavailable
  | 'BLOCKED'                  // Permanently blocked by policy

// ─── Cost Eligibility ─────────────────────────────────────────────────────────

/**
 * Cost eligibility classification for the zero-spend invariant.
 * Preserves: PROMOTIONAL CREDIT != PERMANENTLY FREE
 *            AUTONOMOUS_INCREMENTAL_SPEND = 0
 *
 * Only LOCAL_FOSS, INCLUDED_SUBSCRIPTION, QUALIFIED_FREE_TIER, and
 * PROMOTIONAL_CREDIT (when eligibility proven) may execute autonomously.
 * UNKNOWN_COST fails closed — NEVER silently converts to paid inference.
 */
export type CostEligibility =
  | 'LOCAL_FOSS'                     // Open-source tool running locally, zero per-use cost
  | 'OPERATOR_INCLUDED_HOST_RUNTIME' // Host OS runtime/shell included with machine (e.g. Windows PowerShell), zero marginal cost
  | 'INCLUDED_SUBSCRIPTION'          // Covered by existing subscription (e.g. Claude Code via Pro plan)
  | 'QUALIFIED_FREE_TIER'            // Verified free tier with documented limits
  | 'PROMOTIONAL_CREDIT'             // Temporary promotional credit — requires eligibility proof before dispatch
  | 'PAID'                           // Known paid surface — BLOCKED for autonomous dispatch
  | 'UNKNOWN_COST'                   // Cannot determine cost class — BLOCKED for autonomous dispatch

// ─── Credential Reference ────────────────────────────────────────────────────

/**
 * Opaque reference to credentials managed by the Credential Broker.
 * Preserves: Zero raw secrets in source, SQLite, logs, prompts, or test fixtures.
 *
 * Raw credentials are NEVER stored here. Only the reference ID and metadata.
 */
export interface CredentialReference {
  /** Opaque reference identifier resolved by the Credential Broker at dispatch time. */
  readonly referenceId: string
  /** Type of credential (for routing, not for value access). */
  readonly credentialType: 'AWS_CREDENTIAL_CHAIN' | 'ANTHROPIC_API_KEY' | 'OPENAI_API_KEY' | 'NONE'
  /** Human-readable label for identification (MUST NOT contain the secret). */
  readonly label: string
}

// ─── Harness Capabilities ────────────────────────────────────────────────────

/**
 * Capabilities declared and qualified for a harness.
 * Preserves: CAPABILITY != TOOL != TRANSPORT != AUTHORITY
 *            TOOL DECLARATION != TOOL QUALIFICATION != TOOL AUTHORIZATION != TOOL EXECUTION
 *
 * Capabilities here are qualification-evidence backed — not marketing claims.
 */
export interface HarnessCapabilities {
  readonly textGeneration: boolean
  readonly structuredOutput: boolean        // Can return validated JSON/JSONL
  readonly streaming: boolean               // Supports streaming event output
  readonly filesystemRead: boolean          // Can read files within cwd boundary
  readonly filesystemWrite: boolean         // Can write files within cwd boundary
  readonly shellExecution: boolean          // Can run shell commands (HIGH AUTHORITY)
  readonly networkAccess: boolean           // Can make outbound network calls
  readonly toolCalling: boolean             // Supports tool/function-calling protocols
  readonly sessionResume: boolean           // Can resume prior conversation state
  readonly imageInput: boolean              // Can process image attachments
  readonly browserAccess: boolean           // Has browser/web access capability
  readonly longContext: boolean             // Supports >100k token context windows
  /** Evidence basis for these capability claims. */
  readonly evidenceBasis: 'PROBED' | 'DOCUMENTED' | 'INFERRED' | 'UNPROVEN'
}

// ─── Authority Requirements ───────────────────────────────────────────────────

/**
 * Authority requirements declared by a harness for operator/policy enforcement.
 * Harnesses declare what they need — they do NOT self-grant authority.
 */
export interface HarnessAuthorityRequirements {
  readonly filesystemRead: boolean
  readonly filesystemWrite: boolean
  readonly shellExecution: boolean
  readonly networkOutbound: boolean
  readonly credentialAccess: boolean
  readonly worktreeScope: boolean       // Must be scoped to approved working directory
  readonly browserControl: boolean
  readonly externalMutation: boolean    // Can mutate external system state
}

// ─── Qualification Snapshot ───────────────────────────────────────────────────

/**
 * Durable qualification evidence snapshot for a harness.
 * Preserves: QUALIFICATION_SNAPSHOT != DISPATCH_TIME_READINESS
 */
export interface HarnessQualificationSnapshot {
  readonly harnessId: string
  readonly harnessKind: HarnessKind
  readonly qualificationState: QualificationState
  readonly costEligibility: CostEligibility
  readonly capabilities: HarnessCapabilities
  readonly authorityRequirements: HarnessAuthorityRequirements
  readonly version?: string | undefined
  readonly executablePath?: string | undefined
  readonly qualifiedAt: string       // ISO-8601 timestamp
  readonly evidence: readonly string[] // Freeform evidence descriptions
  /** Hash of tool schemas at qualification (for API harnesses). */
  readonly toolSchemaHash?: string | undefined
  readonly blockedReason?: string | undefined
}

// ─── Timeout Policy ───────────────────────────────────────────────────────────

/**
 * Harness-specific timeout policy.
 * Preserves: Timeout is policy, not magic constant.
 * Defaults are NON_NORMATIVE_INITIAL_DEFAULT requiring operational calibration.
 */
export interface TimeoutPolicy {
  /**
   * Maximum wall-clock duration in milliseconds before execution is terminated.
   * [NON_NORMATIVE_INITIAL_DEFAULT: 120000ms for ProcessHarness, 60000ms for ApiHarness]
   * REQUIRES_K_PHASE_CALIBRATION
   */
  readonly executionTimeoutMs: number
  /**
   * Maximum duration to wait for process startup before aborting.
   * [NON_NORMATIVE_INITIAL_DEFAULT: 5000ms]
   * REQUIRES_K_PHASE_CALIBRATION
   */
  readonly startupTimeoutMs?: number | undefined
}

// ─── Execution Request ────────────────────────────────────────────────────────

/**
 * Normalized execution request sent to any harness.
 * No raw credentials. No free-form arbitrary process authority without policy.
 */
export interface ExecutionRequest {
  /** Unique execution identifier (prevents duplicate dispatches). */
  readonly executionId: string
  /** Parent WorkSession identifier for K0 kernel integration. */
  readonly workSessionId: string
  /** Run identifier. */
  readonly runId: string
  /** Task identifier being executed. */
  readonly taskId: string
  /** Executor identifier (the agent instance claiming this execution). */
  readonly executorId: string
  /** Role identifier (cognitive persona, not the executor). */
  readonly roleId: string
  /** Target harness identifier. */
  readonly harnessId: string
  /**
   * Explicitly approved working directory.
   * Adapters MUST use this and MUST NOT use arbitrary cwd.
   * Path validation is performed before dispatch.
   */
  readonly workingDirectory: string
  /** Compiled prompt/input text delivered to the harness surface. */
  readonly input: string
  /** Timeout policy for this execution. */
  readonly timeoutPolicy: TimeoutPolicy
  /** Opaque credential reference (NEVER the raw credential value). */
  readonly credentialReference?: CredentialReference | undefined
  /** Environment variable allowlist/overrides (MUST NOT include raw secrets). */
  readonly environmentOverrides?: Readonly<Record<string, string>> | undefined
  /** Requested capability set (for dispatch-time verification). */
  readonly requestedCapabilities?: Partial<HarnessCapabilities> | undefined
  /** Cost eligibility required for this execution. */
  readonly requiredCostEligibility?: CostEligibility | undefined
  /** Correlation identifier for tracing across systems. */
  readonly correlationId?: string | undefined
  /** K0 durable job identifier backing this execution. */
  readonly durableJobId?: string | undefined
  /** Output mode preference. */
  readonly outputMode?: 'STRUCTURED' | 'TEXT' | 'STREAMING' | undefined
  /**
   * Maximum captured output bytes per stream.
   * [NON_NORMATIVE_INITIAL_DEFAULT: 2097152 = 2MB]
   * REQUIRES_K_PHASE_CALIBRATION
   */
  readonly maxOutputBytes?: number | undefined
}

// ─── Execution Result ─────────────────────────────────────────────────────────

/**
 * Normalized execution result from any harness surface.
 * Fields are surface-specific optional where appropriate — not every harness
 * has an exitCode, PID, streaming, model, or token usage.
 */
export interface ExecutionResult {
  readonly executionId: string
  readonly harnessId: string
  readonly harnessKind: HarnessKind
  readonly success: boolean
  readonly terminationReason: ExecutionTerminationReason

  // Timing
  readonly startedAt: string    // ISO-8601
  readonly finishedAt: string   // ISO-8601
  readonly durationMs: number

  // Output (bounded — truncation is recorded explicitly)
  readonly stdout: string
  readonly stderr: string
  readonly stdoutTruncated: boolean
  readonly stderrTruncated: boolean

  // Structured output (validated against schema; null if not provided or invalid)
  readonly structuredOutput?: Record<string, unknown> | null | undefined
  readonly structuredOutputValid?: boolean | undefined

  // Process-specific (PROCESS harnesses only)
  readonly exitCode?: number | null | undefined    // Not applicable to API harnesses
  readonly pid?: number | undefined               // Not applicable to API harnesses
  readonly signal?: string | null | undefined

  // API-specific (API harnesses only)
  readonly modelId?: string | undefined           // Actual model invoked (not marketing name)
  readonly providerId?: string | undefined        // Provider boundary (e.g. 'aws-bedrock')
  readonly inputTokens?: number | undefined
  readonly outputTokens?: number | undefined
  readonly finishReason?: string | undefined

  // Cost/usage observation
  readonly costObservation?: CostObservation | undefined

  // Provenance
  readonly provenance: ExecutionProvenance
}

/**
 * Reason for execution termination.
 */
export type ExecutionTerminationReason =
  | 'COMPLETED'             // Normal completion
  | 'TIMEOUT'               // Execution exceeded TimeoutPolicy.executionTimeoutMs
  | 'CANCELLED'             // Cancelled via CancellationHandle
  | 'PROCESS_FAILED'        // Process exited with non-zero code or OS error
  | 'OUTPUT_INVALID'        // Structured output validation failed
  | 'HARNESS_NOT_READY'     // Dispatch-time readiness check failed
  | 'COST_BLOCKED'          // Cost eligibility gate blocked dispatch
  | 'CREDENTIAL_UNAVAILABLE' // Credential reference could not be resolved
  | 'UNKNOWN_EXTERNAL_OUTCOME' // External side effects may have occurred; outcome unknown

/**
 * Observed cost/usage metadata from an execution.
 * Note: Observing costs does NOT authorize them. Cost authorization happens at dispatch gate.
 */
export interface CostObservation {
  readonly eligibilityClass: CostEligibility
  readonly promotionalCreditConsumed?: boolean | undefined
  readonly approximateCostUsd?: number | undefined // If determinable; null if unknown
  readonly observedAt: string
}

// ─── Execution Provenance ─────────────────────────────────────────────────────

/**
 * Execution provenance for forensic evidence and audit.
 * Preserves all identifying metadata without persisting raw secrets.
 */
export interface ExecutionProvenance {
  readonly executionId: string
  readonly durableJobId?: string | undefined
  readonly taskId: string
  readonly runId: string
  readonly workSessionId: string
  readonly harnessId: string
  readonly harnessVersion?: string | undefined
  readonly harnessKind: HarnessKind
  /** Provider boundary (e.g. 'aws-bedrock', 'openai-direct', 'local') */
  readonly providerId?: string | undefined
  /** Model actually invoked — never assume from request alone */
  readonly modelId?: string | undefined
  /** Gateway/transport used, if any */
  readonly gatewayId?: string | undefined
  /** OS-level process PID (PROCESS harnesses only) */
  readonly pid?: number | undefined
  readonly startedAt: string
  readonly finishedAt: string
  /** SHA-256 digest of qualification snapshot at dispatch time */
  readonly qualificationSnapshotHash?: string | undefined
  /** Opaque reference to credential used (NOT the secret value) */
  readonly credentialReferenceId?: string | undefined
  readonly costEligibilityAtDispatch: CostEligibility
  readonly workingDirectory: string
  /** SHA-256 of the execution result for forensic integrity */
  readonly resultDigest?: string | undefined
}

// ─── Cancellation Handle ─────────────────────────────────────────────────────

/**
 * Handle for cancelling an in-flight execution.
 * Distinguishes cancel-requested from actually-cancelled from unknown-outcome.
 */
export interface CancellationHandle {
  readonly executionId: string
  /** Request cancellation. Returns true if cancellation was accepted by the adapter. */
  cancel(): Promise<boolean>
  /** Current cancellation state. */
  readonly state: 'PENDING' | 'CANCEL_REQUESTED' | 'CANCELLED' | 'TERMINATED' | 'UNKNOWN_EXTERNAL_OUTCOME'
}

// ─── Execution Error Categories ───────────────────────────────────────────────

/**
 * Normalized error categories for harness failures.
 * Surface-specific errors are mapped to these categories before surfacing.
 */
export type HarnessErrorCode =
  | 'HARNESS_NOT_FOUND'
  | 'HARNESS_NOT_INSTALLED'
  | 'HARNESS_UNAUTHENTICATED'
  | 'HARNESS_UNREACHABLE'
  | 'HARNESS_NOT_QUALIFIED'
  | 'HARNESS_NOT_READY'
  | 'HARNESS_TIMEOUT'
  | 'HARNESS_CANCELLED'
  | 'HARNESS_PROCESS_FAILED'
  | 'HARNESS_OUTPUT_INVALID'
  | 'COST_ELIGIBILITY_UNKNOWN'
  | 'QUOTA_EXHAUSTED'
  | 'CREDENTIAL_UNAVAILABLE'
  | 'MODEL_UNAVAILABLE'
  | 'CONTAINMENT_UNAVAILABLE'
  | 'WORKING_DIRECTORY_INVALID'
  | 'UNKNOWN_EXTERNAL_OUTCOME'

export class HarnessError extends Error {
  public readonly code: HarnessErrorCode
  public readonly harnessId: string
  public readonly executionId?: string | undefined

  constructor(code: HarnessErrorCode, harnessId: string, message: string, executionId?: string) {
    super(`[${code}] Harness "${harnessId}"${executionId ? ` exec="${executionId}"` : ''}: ${message}`)
    this.name = 'HarnessError'
    this.code = code
    this.harnessId = harnessId
    this.executionId = executionId
  }
}
