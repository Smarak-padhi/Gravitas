/**
 * GRAVITAS K1 — K0 Kernel Integration for Harness Execution
 *
 * Provides the integration bridge between K1 harness execution and K0 durable jobs.
 *
 * K0 DurableJob Lifecycle for K1 Harness Execution:
 *
 *   KERNEL CREATES JOB (CREATE_DURABLE_JOB)
 *         ↓
 *   K1 CLAIMS LEASE (CLAIM_JOB_LEASE)
 *         ↓
 *   K1 DISPATCHES TO HARNESS
 *         ↓
 *   HARNESS EXECUTES (shell process or API call)
 *         ↓
 *   RESULT RETURNED
 *         ↓
 *   K1 COMPLETES/FAILS JOB (via kernel.execute COMPLETE_JOB / FAIL_JOB)
 *
 * INVARIANT: HARNESS != CANONICAL DATABASE WRITER
 * Harnesses NEVER write to K0 SQLite directly.
 * All state transitions flow through typed KernelCommand envelopes.
 *
 * This module provides:
 * 1. K0JobDispatcher — wraps harness dispatch with K0 job lifecycle management
 * 2. K0JobPayload — typed payload schema for harness execution jobs
 * 3. Job state recording utilities
 */

import { randomUUID } from 'node:crypto'
import type {
  ExecutionRequest,
  ExecutionResult,
  CostEligibility,
} from './types.js'
import type { GravitasHarness } from './harness.js'
import { isCostEligibleForAutonomousDispatch } from './qualification.js'
import { HarnessError } from './types.js'

/**
 * Typed payload for a K0 DurableJob of type 'HARNESS_EXECUTION'.
 */
export interface HarnessExecutionJobPayload {
  readonly jobType: 'HARNESS_EXECUTION'
  readonly harnessId: string
  readonly harnessKind: string
  readonly executionId: string
  readonly taskId: string
  readonly runId: string
  readonly workSessionId: string
  readonly workingDirectory: string
  readonly timeoutMs: number
  readonly costEligibility: CostEligibility
  readonly correlationId: string
  readonly durableJobId: string
  readonly requestedAt: string
}

/**
 * Result stored in the K0 DurableJob after execution completes.
 */
export interface HarnessExecutionJobResult {
  readonly success: boolean
  readonly terminationReason: string
  readonly durationMs: number
  readonly startedAt: string
  readonly finishedAt: string
  readonly exitCode?: number | null
  readonly stdoutLength: number
  readonly stderrLength: number
  readonly stdoutTruncated: boolean
  readonly stderrTruncated: boolean
  readonly resultDigest?: string
  readonly provenance: {
    readonly harnessId: string
    readonly harnessVersion?: string
    readonly pid?: number
    readonly costEligibilityAtDispatch: string
  }
}

/**
 * K0JobDispatcher — executes a harness and records lifecycle in the K0 kernel.
 *
 * Usage:
 * 1. Caller creates a DurableJob in K0 via `kernel.execute(CREATE_DURABLE_JOB)`.
 * 2. Caller claims the job lease via `kernel.execute(CLAIM_JOB_LEASE)`.
 * 3. Caller calls `K0JobDispatcher.execute(harness, jobId, request, kernel)`.
 * 4. Dispatcher runs the harness and records the result in K0.
 *
 * NOTE: This file does NOT import the K0 kernel module to avoid circular dependency.
 * The `kernel` parameter accepts the subset of kernel functionality needed.
 */

/**
 * Minimum kernel interface K1 needs for job lifecycle management.
 * Decoupled from K0 types to avoid hard dependency.
 */
export interface K0KernelInterface {
  execute(command: {
    commandId: string
    commandType: string
    workSessionId: string
    payload: Record<string, unknown>
  }): Promise<unknown>
}

/**
 * Builds a CREATE_DURABLE_JOB command payload for a harness execution.
 */
export function buildCreateHarnessJobCommand(
  workSessionId: string,
  payload: HarnessExecutionJobPayload
): {
  commandId: string
  commandType: string
  workSessionId: string
  payload: Record<string, unknown>
} {
  return {
    commandId: randomUUID(),
    commandType: 'CREATE_DURABLE_JOB',
    workSessionId,
    payload: {
      jobType: payload.jobType,
      workSessionId: payload.workSessionId,
      payload,
    },
  }
}

/**
 * Builds a CLAIM_JOB_LEASE command payload.
 */
export function buildClaimJobLeaseCommand(
  workSessionId: string,
  jobId: string,
  leaseOwner: string,
  leaseDurationMs: number = 120000  // [NON_NORMATIVE_INITIAL_DEFAULT] REQUIRES_K_PHASE_CALIBRATION
): {
  commandId: string
  commandType: string
  workSessionId: string
  payload: Record<string, unknown>
} {
  return {
    commandId: randomUUID(),
    commandType: 'CLAIM_JOB_LEASE',
    workSessionId,
    payload: {
      jobId,
      leaseOwner,
      leaseDurationMs,
    },
  }
}

/**
 * Executes a harness within a K0 job lifecycle context.
 *
 * Workflow:
 * 1. Pre-dispatch: validate cost eligibility
 * 2. Execute harness
 * 3. Post-dispatch: record result in K0 (COMPLETE/FAIL) via kernel command
 *
 * INVARIANT: This function NEVER writes to SQLite directly.
 * It drives all K0 state changes via kernel.execute(command).
 */
export async function executeWithK0JobLifecycle(
  harness: GravitasHarness,
  request: ExecutionRequest,
  kernel: K0KernelInterface | null  // null = no K0 integration (e.g. unit tests)
): Promise<ExecutionResult> {
  // Pre-dispatch cost check (defense-in-depth; registry should have already checked)
  const snapshot = await harness.qualify().catch(() => null)
  const costEligibility = snapshot?.costEligibility ?? 'UNKNOWN_COST'
  const costGate = isCostEligibleForAutonomousDispatch(costEligibility)
  if (!costGate.allowed) {
    throw new HarnessError(
      'COST_ELIGIBILITY_UNKNOWN',
      harness.id,
      `K0 lifecycle: dispatch blocked before execution: ${costGate.reason}`,
      request.executionId
    )
  }

  // If K0 kernel is available, record job start via CLAIM_JOB_LEASE
  if (kernel && request.durableJobId) {
    const claimCmd = buildClaimJobLeaseCommand(
      request.workSessionId,
      request.durableJobId,
      `k1-harness-${harness.id}-${request.executorId}`
    )
    await kernel.execute(claimCmd).catch((err) => {
      // Log but don't block execution — K0 lease is best-effort at K1 level
      // Full error handling is caller's responsibility
      console.error(`[K1] CLAIM_JOB_LEASE failed for job ${request.durableJobId}: ${err}`)
    })
  }

  // Execute harness
  const { result: resultPromise } = harness.execute(request)
  const result = await resultPromise

  // Record result in K0 if kernel is available
  // NOTE: K0 does not yet have COMPLETE_JOB / FAIL_JOB commands in K0 schema.
  // This uses TRANSITION_TASK as a proxy until K2 adds dedicated job-completion commands.
  // REQUIRES_K2_IMPLEMENTATION: Add COMPLETE_JOB / FAIL_JOB command types to K0 kernel.
  if (kernel && request.durableJobId) {
    const jobResultPayload: HarnessExecutionJobResult = {
      success: result.success,
      terminationReason: result.terminationReason,
      durationMs: result.durationMs,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      exitCode: result.exitCode ?? null,
      stdoutLength: result.stdout.length,
      stderrLength: result.stderr.length,
      stdoutTruncated: result.stdoutTruncated,
      stderrTruncated: result.stderrTruncated,
      ...(result.provenance.resultDigest !== undefined ? { resultDigest: result.provenance.resultDigest } : {}),
      provenance: {
        harnessId: result.harnessId,
        ...(result.provenance.harnessVersion !== undefined ? { harnessVersion: result.provenance.harnessVersion } : {}),
        ...(result.provenance.pid !== undefined ? { pid: result.provenance.pid } : {}),
        costEligibilityAtDispatch: result.provenance.costEligibilityAtDispatch,
      },
    }

    // K0 transition: use TRANSITION_TASK to record the execution outcome on the task aggregate.
    // In K0 FSM: RUNNING -> SUCCEEDED (or FAILED or INTERRUPTED / CANCELLED).
    // Dedicated COMPLETE_JOB/FAIL_JOB commands will be added in K2 to update durable_jobs table directly.
    const toState =
      result.terminationReason === 'COMPLETED' ? 'SUCCEEDED' :
      result.terminationReason === 'CANCELLED' ? 'CANCELLED' :
      result.terminationReason === 'TIMEOUT' ? 'INTERRUPTED' :
      'FAILED'

    const taskTransitionCmd = {
      commandId: randomUUID(),
      commandType: 'TRANSITION_TASK',
      workSessionId: request.workSessionId,
      payload: {
        taskId: request.taskId,
        toState,
        reason: `Harness ${harness.id} execution ended: ${result.terminationReason}`,
        result: jobResultPayload,
      },
    }
    await kernel.execute(taskTransitionCmd).catch((err) => {
      console.warn(`[K1] TRANSITION_TASK failed for task ${request.taskId}: ${err}`)
    })

  }

  return result
}
