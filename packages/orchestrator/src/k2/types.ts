/**
 * GRAVITAS K2 — Closed-Loop Orchestration Types & Contracts
 *
 * Core Invariants Enforced:
 *   ROLE != EXECUTOR != HARNESS != MODEL != PROVIDER != GATEWAY != PROCESS
 *   SUPERVISOR != WORKER
 *   PLAN != TASK
 *   TASK != EXECUTION
 *   EXECUTION != RESULT
 *   RESULT != VERIFICATION
 *   VERIFICATION != APPROVAL
 *   RETRY != REPLAN
 *   WORKER SUCCESS CLAIM != VERIFIED SUCCESS
 *   LLM OUTPUT != CANONICAL STATE
 *   SUPERVISOR != CANONICAL DATABASE WRITER
 *   WORKER != CANONICAL DATABASE WRITER
 */

import { k1 } from '@gravitas/harnesses'
type HarnessCapabilities = k1.HarnessCapabilities
type HarnessKind = k1.HarnessKind

// ─── Supervisor Decision Taxonomy ───────────────────────────────────────────


export type SupervisorDecisionKind =
  | 'DISPATCH_TASK'       // Validated task selected and prepared for worker execution
  | 'RETRY_TASK'          // Transient failure detected; retry within bounded budget
  | 'REPLAN_REQUIRED'     // Task strategy or decomposition must change
  | 'REQUEST_REVIEW'      // Execution complete; requires independent inspection/review
  | 'WAIT_FOR_HUMAN'      // Protected boundary or budget exhaustion; awaits human sovereign action
  | 'COMPLETE_OBJECTIVE'  // Objective successfully satisfied per execution contracts
  | 'FAIL_OBJECTIVE'      // Permanent failure or unrecoverable error encountered
  | 'CANCEL_OBJECTIVE'    // Operator or supervisor requested cancellation

export type SupervisorReasonCode =
  | 'INITIAL_DISPATCH'
  | 'STEP_SUCCESS'
  | 'TRANSIENT_FAILURE'
  | 'PERMANENT_FAILURE'
  | 'AUTH_UNAVAILABLE'
  | 'COST_BLOCKED'
  | 'TIMEOUT_EXCEEDED'
  | 'INVALID_OUTPUT'
  | 'BUDGET_EXHAUSTED'
  | 'HUMAN_APPROVAL_REQUIRED'
  | 'UNKNOWN_EXTERNAL_OUTCOME'
  | 'ALL_TASKS_COMPLETED'
  | 'OPERATOR_CANCELLED'

export interface SupervisorDecision {
  readonly decisionId: string
  readonly decisionKind: SupervisorDecisionKind
  readonly reasonCode: SupervisorReasonCode
  readonly rationale: string
  readonly workSessionId: string
  readonly runId: string
  readonly taskId?: string | undefined
  readonly iterationNumber: number
  readonly targetRoleId?: string | undefined
  readonly targetExecutorId?: string | undefined
  readonly targetHarnessId?: string | undefined
  readonly requiresHumanApproval?: boolean | undefined
  readonly proposedTask?: {
    readonly title: string
    readonly instructions: string
    readonly workingDirectory: string
    readonly requiredCapabilities?: Partial<HarnessCapabilities> | undefined
  } | undefined
  readonly metadata?: Readonly<Record<string, unknown>> | undefined
  readonly createdAt: string
}

// ─── Autonomy Budget ─────────────────────────────────────────────────────────

export interface AutonomyBudget {
  /**
   * Maximum closed-loop iterations before forced human gate.
   * [NON_NORMATIVE_INITIAL_DEFAULT: 5]
   * REQUIRES_K_PHASE_CALIBRATION
   */
  readonly maxIterations: number

  /**
   * Maximum consecutive task retries on transient errors.
   * [NON_NORMATIVE_INITIAL_DEFAULT: 2]
   * REQUIRES_K_PHASE_CALIBRATION
   */
  readonly maxTaskRetries: number

  /**
   * Maximum wall-clock execution duration in milliseconds for entire session.
   * [NON_NORMATIVE_INITIAL_DEFAULT: 300000 = 5 minutes]
   * REQUIRES_K_PHASE_CALIBRATION
   */
  readonly maxWallClockDurationMs: number

  /**
   * Maximum total harness executions across the run.
   * [NON_NORMATIVE_INITIAL_DEFAULT: 10]
   * REQUIRES_K_PHASE_CALIBRATION
   */
  readonly maxExecutions: number

  /**
   * Absolute financial spend ceiling. Under zero-spend invariant, must be $0.00.
   */
  readonly maxIncrementalSpendUsd: 0
}

export const DEFAULT_AUTONOMY_BUDGET: AutonomyBudget = {
  maxIterations: 5,
  maxTaskRetries: 2,
  maxWallClockDurationMs: 300000,
  maxExecutions: 10,
  maxIncrementalSpendUsd: 0,
}

// ─── Worker Contract ─────────────────────────────────────────────────────────

export interface WorkerAssignment {
  readonly assignmentId: string
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly roleId: string
  readonly executorId: string
  readonly harnessId: string
  readonly objective: string
  readonly taskInstructions: string
  readonly workingDirectory: string
  readonly requestedCapabilities: Partial<HarnessCapabilities>
  readonly timeoutMs: number
  readonly iterationNumber: number
  readonly correlationId: string
}

export type WorkerResultStatus =
  | 'WORKER_REPORTED_SUCCESS'
  | 'WORKER_REPORTED_FAILURE'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UNKNOWN_EXTERNAL_OUTCOME'

export interface WorkerResult {
  readonly assignmentId: string
  readonly executionId: string
  readonly harnessId: string
  readonly harnessKind: HarnessKind
  readonly status: WorkerResultStatus
  readonly exitCode?: number | null | undefined
  readonly output: string
  readonly errorOutput?: string | undefined
  readonly structuredData?: Record<string, unknown> | null | undefined
  readonly durationMs: number
  readonly provenanceDigest: string
  readonly completedAt: string
}

// ─── Executor & Role Resolution ─────────────────────────────────────────────

export interface ExecutorProfile {
  readonly executorId: string
  readonly roleId: string
  readonly displayName: string
  readonly preferredHarnessIds: readonly string[]
  readonly allowedCapabilities: readonly string[]
  readonly prohibitedAuthorities: readonly string[]
}

// ─── Orchestration State & Loop Tracking ────────────────────────────────────

export interface ClosedLoopIterationRecord {
  readonly iterationNumber: number
  readonly decision: SupervisorDecision
  readonly assignment?: WorkerAssignment | undefined
  readonly workerResult?: WorkerResult | undefined
  readonly startedAt: string
  readonly finishedAt: string
}

export interface OrchestrationSessionState {
  readonly workSessionId: string
  readonly runId: string
  readonly objective: string
  readonly status: 'ACTIVE' | 'WAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  readonly currentIteration: number
  readonly history: readonly ClosedLoopIterationRecord[]
  readonly totalExecutions: number
  readonly totalRetries: number
  readonly startedAt: string
  readonly lastEvaluatedAt: string
  readonly stopReason?: string | undefined
}
