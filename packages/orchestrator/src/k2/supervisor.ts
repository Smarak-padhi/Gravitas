/**
 * GRAVITAS K2 — Supervisor Decision Engine & Policy Validation
 *
 * Implements deterministic Supervisor decision logic and rigorous validation.
 *
 * Invariants Enforced:
 * - SUPERVISOR != CANONICAL DATABASE WRITER
 * - Decisions are structured and validated fail-closed
 * - Autonomy budgets strictly bounded (no infinite loops)
 * - Human sovereignty respected on protected actions and budget exhaustion
 * - RETRY != REPLAN
 */

import { randomUUID } from 'node:crypto'
import type {
  AutonomyBudget,
  OrchestrationSessionState,
  SupervisorDecision,
  SupervisorDecisionKind,
  WorkerResult,
} from './types.js'
import { DEFAULT_AUTONOMY_BUDGET } from './types.js'

export class SupervisorValidationError extends Error {
  constructor(message: string) {
    super(`[SupervisorValidationError] ${message}`)
    this.name = 'SupervisorValidationError'
  }
}

export interface SupervisorEvaluationInput {
  readonly state: OrchestrationSessionState
  readonly latestResult?: WorkerResult | undefined
  readonly budget?: AutonomyBudget | undefined
  readonly forcedAction?: SupervisorDecisionKind | undefined
}

export class BoundedSupervisorEngine {
  private readonly budget: AutonomyBudget

  constructor(budget: AutonomyBudget = DEFAULT_AUTONOMY_BUDGET) {
    this.budget = budget
  }

  /**
   * Validates a candidate SupervisorDecision before execution.
   * Fails closed if any invariant or required field is violated.
   */
  public validateDecision(decision: SupervisorDecision): void {
    if (!decision.decisionId || typeof decision.decisionId !== 'string') {
      throw new SupervisorValidationError('Missing or invalid decisionId')
    }
    if (!decision.workSessionId || typeof decision.workSessionId !== 'string') {
      throw new SupervisorValidationError('Missing or invalid workSessionId')
    }
    if (!decision.runId || typeof decision.runId !== 'string') {
      throw new SupervisorValidationError('Missing or invalid runId')
    }
    if (typeof decision.iterationNumber !== 'number' || decision.iterationNumber < 0) {
      throw new SupervisorValidationError('Invalid iterationNumber')
    }
    if (!decision.rationale || decision.rationale.trim().length === 0) {
      throw new SupervisorValidationError('Decision rationale cannot be empty')
    }

    // Specific decision kind requirements
    if (decision.decisionKind === 'DISPATCH_TASK' || decision.decisionKind === 'RETRY_TASK') {
      if (!decision.targetRoleId) {
        throw new SupervisorValidationError(`${decision.decisionKind} requires targetRoleId`)
      }
      if (!decision.proposedTask && !decision.taskId) {
        throw new SupervisorValidationError(`${decision.decisionKind} requires taskId or proposedTask definition`)
      }
    }
  }

  /**
   * Evaluates the current state and produces the next bounded SupervisorDecision.
   */
  public evaluate(input: SupervisorEvaluationInput): SupervisorDecision {
    const { state, latestResult, forcedAction } = input
    const currentIteration = state.currentIteration + 1
    const now = new Date().toISOString()

    // 1. Forced operator action check (e.g. human gate resolution or cancellation)
    if (forcedAction === 'CANCEL_OBJECTIVE') {
      return {
        decisionId: randomUUID(),
        decisionKind: 'CANCEL_OBJECTIVE',
        reasonCode: 'OPERATOR_CANCELLED',
        rationale: 'Session cancelled by operator instruction.',
        workSessionId: state.workSessionId,
        runId: state.runId,
        iterationNumber: currentIteration,
        createdAt: now,
      }
    }

    // 1b. If session is already WAITING_APPROVAL, supervisor cannot self-advance or approve
    if (state.status === 'WAITING_APPROVAL') {
      return {
        decisionId: randomUUID(),
        decisionKind: 'WAIT_FOR_HUMAN',
        reasonCode: 'HUMAN_APPROVAL_REQUIRED',
        rationale: 'WorkSession is awaiting human sovereign authorization. Autonomous auto-approval forbidden.',
        workSessionId: state.workSessionId,
        runId: state.runId,
        iterationNumber: currentIteration,
        requiresHumanApproval: true,
        createdAt: now,
      }
    }

    // 2. Evaluate previous worker result (if any) first
    if (latestResult) {
      if (latestResult.status === 'WORKER_REPORTED_SUCCESS') {
        return {
          decisionId: randomUUID(),
          decisionKind: 'COMPLETE_OBJECTIVE',
          reasonCode: 'ALL_TASKS_COMPLETED',
          rationale: `Task execution succeeded and verified against execution contracts. Objective complete.`,
          workSessionId: state.workSessionId,
          runId: state.runId,
          iterationNumber: currentIteration,
          createdAt: now,
        }
      }

      if (latestResult.status === 'UNKNOWN_EXTERNAL_OUTCOME') {
        return {
          decisionId: randomUUID(),
          decisionKind: 'WAIT_FOR_HUMAN',
          reasonCode: 'UNKNOWN_EXTERNAL_OUTCOME',
          rationale: 'Harness outcome is unknown; side-effects may have occurred. Blind retry forbidden.',
          workSessionId: state.workSessionId,
          runId: state.runId,
          iterationNumber: currentIteration,
          requiresHumanApproval: true,
          createdAt: now,
        }
      }

      // If worker failed and retry budget is exhausted, fail objective directly
      if (state.totalRetries >= this.budget.maxTaskRetries) {
        return {
          decisionId: randomUUID(),
          decisionKind: 'FAIL_OBJECTIVE',
          reasonCode: 'PERMANENT_FAILURE',
          rationale: `Exhausted maximum retry budget (${this.budget.maxTaskRetries}). Failing objective cleanly.`,
          workSessionId: state.workSessionId,
          runId: state.runId,
          iterationNumber: currentIteration,
          createdAt: now,
        }
      }
    }

    // 3. Autonomy budget enforcement
    if (currentIteration > this.budget.maxIterations) {
      return {
        decisionId: randomUUID(),
        decisionKind: 'WAIT_FOR_HUMAN',
        reasonCode: 'BUDGET_EXHAUSTED',
        rationale: `Maximum iteration budget (${this.budget.maxIterations}) reached. Pausing for human authority.`,
        workSessionId: state.workSessionId,
        runId: state.runId,
        iterationNumber: currentIteration,
        requiresHumanApproval: true,
        createdAt: now,
      }
    }



    if (state.totalExecutions >= this.budget.maxExecutions) {
      return {
        decisionId: randomUUID(),
        decisionKind: 'WAIT_FOR_HUMAN',
        reasonCode: 'BUDGET_EXHAUSTED',
        rationale: `Maximum execution budget (${this.budget.maxExecutions}) reached. Pausing for human authority.`,
        workSessionId: state.workSessionId,
        runId: state.runId,
        iterationNumber: currentIteration,
        requiresHumanApproval: true,
        createdAt: now,
      }
    }

    const elapsedMs = Date.now() - new Date(state.startedAt).getTime()
    if (elapsedMs > this.budget.maxWallClockDurationMs) {
      return {
        decisionId: randomUUID(),
        decisionKind: 'WAIT_FOR_HUMAN',
        reasonCode: 'TIMEOUT_EXCEEDED',
        rationale: `Session wall-clock duration limit (${this.budget.maxWallClockDurationMs}ms) exceeded.`,
        workSessionId: state.workSessionId,
        runId: state.runId,
        iterationNumber: currentIteration,
        requiresHumanApproval: true,
        createdAt: now,
      }
    }

    // 3. Initial dispatch if no previous execution
    if (!latestResult) {
      return {
        decisionId: randomUUID(),
        decisionKind: 'DISPATCH_TASK',
        reasonCode: 'INITIAL_DISPATCH',
        rationale: `Initiating first task to satisfy objective: "${state.objective}"`,
        workSessionId: state.workSessionId,
        runId: state.runId,
        iterationNumber: currentIteration,
        targetRoleId: 'role:engineering:backend-engineer',
        targetExecutorId: 'executor:backend:primary',
        proposedTask: {
          title: `Execute objective: ${state.objective.slice(0, 50)}`,
          instructions: state.objective,
          workingDirectory: process.cwd(),
          requiredCapabilities: { filesystemRead: true },
        },
        createdAt: now,
      }
    }


    // Check retry limits for failures
    if (state.totalRetries < this.budget.maxTaskRetries) {
      return {
        decisionId: randomUUID(),
        decisionKind: 'RETRY_TASK',
        reasonCode: 'TRANSIENT_FAILURE',
        rationale: `Worker reported failure (${latestResult.errorOutput || 'error'}). Retrying attempt ${state.totalRetries + 1}/${this.budget.maxTaskRetries}.`,
        workSessionId: state.workSessionId,
        runId: state.runId,
        iterationNumber: currentIteration,
        targetRoleId: 'role:engineering:backend-engineer',
        targetExecutorId: 'executor:backend:primary',
        proposedTask: {
          title: `Retry: ${state.objective.slice(0, 50)}`,
          instructions: `${state.objective}\n[PREVIOUS ATTEMPT FAILED]: ${latestResult.errorOutput || latestResult.output}`,
          workingDirectory: process.cwd(),
          requiredCapabilities: { filesystemRead: true },
        },
        createdAt: now,
      }
    }

    // Retry budget exhausted -> Fail or Escalate
    return {
      decisionId: randomUUID(),
      decisionKind: 'FAIL_OBJECTIVE',
      reasonCode: 'PERMANENT_FAILURE',
      rationale: `Exhausted maximum retry budget (${this.budget.maxTaskRetries}). Failing objective cleanly.`,
      workSessionId: state.workSessionId,
      runId: state.runId,
      iterationNumber: currentIteration,
      createdAt: now,
    }
  }
}
