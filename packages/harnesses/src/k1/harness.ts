/**
 * GRAVITAS K1 — Harness Base Contract
 *
 * Defines the normalized interface that ALL harnesses must implement.
 * Concrete subclasses: ProcessHarness, ApiHarness, DaemonHarness
 *
 * Invariants:
 * - HARNESS != CANONICAL DATABASE WRITER
 * - Harnesses NEVER write to K0 SQLite directly
 * - All state transitions flow through KernelCommand
 * - QUALIFICATION_SNAPSHOT != DISPATCH_TIME_READINESS
 * - Safe Fallback: fallback NEVER silently downgrades containment
 */

import type {
  ExecutionRequest,
  ExecutionResult,
  HarnessKind,
  HarnessQualificationSnapshot,
  ReadinessState,
  CancellationHandle,
} from './types.js'

/**
 * Dispatch-time readiness check result.
 * Preserves: QUALIFICATION_SNAPSHOT != DISPATCH_TIME_READINESS
 */
export interface ReadinessCheckResult {
  readonly readinessState: ReadinessState
  readonly reason: string
  readonly checkedAt: string // ISO-8601
  /** True if this readiness check consumed a promotional credit probe */
  readonly probeConsumed?: boolean | undefined
}

/**
 * The base contract for ALL GRAVITAS harnesses.
 *
 * Every harness must be able to report:
 * - identity (id, kind)
 * - qualification snapshot (static evidence)
 * - dispatch-time readiness (dynamic check)
 * - capabilities
 * - authority requirements
 * - cost eligibility state
 */
export interface GravitasHarness {
  /** Stable unique harness identifier (e.g. 'claude-code', 'codex', 'bedrock'). */
  readonly id: string

  /** Structural kind of this harness. */
  readonly kind: HarnessKind

  /**
   * Runs qualification probes to produce a durable qualification snapshot.
   * MUST NOT be invoked on every dispatch — qualification is for static evidence.
   * Result represents the maximum capability ceiling of this surface.
   */
  qualify(): Promise<HarnessQualificationSnapshot>

  /**
   * Checks dynamic dispatch-time readiness.
   * Called before every dispatch to verify auth, network, cost eligibility, etc.
   * Preserves: QUALIFICATION_SNAPSHOT != DISPATCH_TIME_READINESS
   */
  checkReadiness(snapshot?: HarnessQualificationSnapshot): Promise<ReadinessCheckResult>

  /**
   * Executes work through this harness surface.
   * Returns CancellationHandle alongside the result promise for cancellation support.
   */
  execute(request: ExecutionRequest): {
    result: Promise<ExecutionResult>
    cancellation: CancellationHandle
  }
}

/**
 * ProcessHarness — CLI binary executed as OS child process.
 * Examples: Codex CLI, Claude Code CLI, agy, PowerShell bounded executor.
 *
 * Additional invariants:
 * - shell: false (no cmd.exe interpolation)
 * - Argument arrays, never interpolated command strings
 * - cwd strictly bound to approved working directory
 * - Process tree owned and terminable by GRAVITAS
 */
export interface ProcessHarness extends GravitasHarness {
  readonly kind: 'PROCESS'
  /** Resolved executable path on host filesystem. */
  getExecutablePath(): string | null
}

/**
 * ApiHarness — Remote API or SDK client.
 * Examples: AWS Bedrock, future HTTP SDK adapters.
 *
 * Additional invariants:
 * - DOES NOT have an exitCode or PID in results
 * - Credentials are never passed raw — only via CredentialReference
 * - Cost eligibility must be proven before any inference invocation
 * - "READY" means: credentials available + endpoint reachable + cost eligible + model accessible
 */
export interface ApiHarness extends GravitasHarness {
  readonly kind: 'API'
  /** Provider boundary identifier (e.g. 'aws-bedrock'). */
  readonly providerId: string
}

/**
 * DaemonHarness — long-running local daemon accessed via IPC/HTTP.
 * Examples: FCC proxy (fcc-server), OmniRoute gateway.
 *
 * Additional invariants:
 * - READY requires daemon process to be actively healthy
 * - INSTALLED but NOT_READY is a valid state when daemon is stopped
 */
export interface DaemonHarness extends GravitasHarness {
  readonly kind: 'DAEMON'
  /** Local URL where the daemon is bound. */
  readonly daemonUrl: string
  /** Checks whether the daemon process is actively running. */
  isDaemonRunning(): Promise<boolean>
}
