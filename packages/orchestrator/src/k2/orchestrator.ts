/**
 * GRAVITAS K2 — Closed-Loop Orchestration Coordinator
 *
 * Drives the closed-loop cycle:
 *   OBJECTIVE
 *   → SUPERVISOR DECISION
 *   → K0 TASK CREATION
 *   → EXECUTOR & HARNESS RESOLUTION
 *   → K1 DISPATCH GATE
 *   → WORKER EXECUTION
 *   → DURABLE RESULT CAPTURE (via K0 Kernel commands)
 *   → SUPERVISOR EVALUATION
 *   → TERMINAL STATE OR HUMAN GATE
 *
 * Invariants Enforced:
 * - SUPERVISOR != CANONICAL DATABASE WRITER
 * - WORKER != CANONICAL DATABASE WRITER
 * - All state transitions flow through KernelCommand envelopes
 * - Zero autonomous spend ($0.00)
 * - Safe fallback (no containment downgrade)
 */

import { randomUUID } from 'node:crypto'
import { WorkSessionKernel } from '@gravitas/core/kernel'
import { k1 } from '@gravitas/harnesses'
type HarnessRegistry = k1.HarnessRegistry

import { BoundedSupervisorEngine } from './supervisor.js'
import { ExecutorHarnessResolver } from './resolver.js'
import type {
  AutonomyBudget,
  ClosedLoopIterationRecord,
  OrchestrationSessionState,
  WorkerAssignment,
  WorkerResult,
} from './types.js'
import { DEFAULT_AUTONOMY_BUDGET } from './types.js'

export interface OrchestrationRunOptions {
  readonly workSessionId: string
  readonly objective: string
  readonly budget?: AutonomyBudget | undefined
  readonly customWorkerHandler?: ((assignment: WorkerAssignment) => Promise<WorkerResult>) | undefined
}

export class ClosedLoopOrchestrator {
  private readonly kernel: WorkSessionKernel
  private readonly registry: HarnessRegistry
  private readonly supervisor: BoundedSupervisorEngine
  private readonly resolver: ExecutorHarnessResolver

  constructor(kernel: WorkSessionKernel, registry: HarnessRegistry, budget?: AutonomyBudget) {
    this.kernel = kernel
    this.registry = registry
    this.supervisor = new BoundedSupervisorEngine(budget ?? DEFAULT_AUTONOMY_BUDGET)
    this.resolver = new ExecutorHarnessResolver(registry)
  }

  /**
   * Executes a bounded closed-loop orchestration cycle until a terminal state or human gate.
   */
  public async executeObjective(options: OrchestrationRunOptions): Promise<OrchestrationSessionState> {
    const { workSessionId, objective, customWorkerHandler } = options
    const runId = `run_${randomUUID().slice(0, 8)}`
    const nowIso = new Date().toISOString()

    // 1. Create Run aggregate in K0 WorkSession
    await this.kernel.execute({
      commandId: randomUUID(),
      commandType: 'CREATE_RUN',
      workSessionId,
      payload: {
        runId,
        workSessionId,
        goal: objective,
      },
    })

    let sessionState: OrchestrationSessionState = {
      workSessionId,
      runId,
      objective,
      status: 'ACTIVE',
      currentIteration: 0,
      history: [],
      totalExecutions: 0,
      totalRetries: 0,
      startedAt: nowIso,
      lastEvaluatedAt: nowIso,
    }

    let latestResult: WorkerResult | undefined

    // 2. Closed-Loop Iteration Loop
    while (sessionState.status === 'ACTIVE') {
      const decision = this.supervisor.evaluate({
        state: sessionState,
        latestResult,
      })

      // Validate candidate decision fail-closed
      this.supervisor.validateDecision(decision)

      // Handle terminal and gate decisions immediately
      if (decision.decisionKind === 'COMPLETE_OBJECTIVE') {
        sessionState = {
          ...sessionState,
          status: 'COMPLETED',
          lastEvaluatedAt: new Date().toISOString(),
          stopReason: decision.rationale,
        }
        break
      }

      if (decision.decisionKind === 'FAIL_OBJECTIVE') {
        sessionState = {
          ...sessionState,
          status: 'FAILED',
          lastEvaluatedAt: new Date().toISOString(),
          stopReason: decision.rationale,
        }
        break
      }

      if (decision.decisionKind === 'WAIT_FOR_HUMAN') {
        sessionState = {
          ...sessionState,
          status: 'WAITING_APPROVAL',
          lastEvaluatedAt: new Date().toISOString(),
          stopReason: decision.rationale,
        }
        break
      }

      if (decision.decisionKind === 'CANCEL_OBJECTIVE') {
        sessionState = {
          ...sessionState,
          status: 'CANCELLED',
          lastEvaluatedAt: new Date().toISOString(),
          stopReason: decision.rationale,
        }
        break
      }

      // Handle DISPATCH_TASK and RETRY_TASK
      if (decision.decisionKind === 'DISPATCH_TASK' || decision.decisionKind === 'RETRY_TASK') {
        const iterationNumber = sessionState.currentIteration + 1
        const taskId = decision.taskId ?? `task_${randomUUID().slice(0, 8)}`

        // 2a. Create task in K0 Kernel if new
        if (!decision.taskId) {
          await this.kernel.execute({
            commandId: randomUUID(),
            commandType: 'CREATE_TASK',
            workSessionId,
            payload: {
              taskId,
              runId,
              workSessionId,
              title: decision.proposedTask?.title ?? 'Orchestration step',
              assignedRoleId: decision.targetRoleId,
            },
          })
        }

        // Transition task to RUNNING in K0 Kernel
        await this.kernel.execute({
          commandId: randomUUID(),
          commandType: 'TRANSITION_TASK',
          workSessionId,
          payload: {
            taskId,
            toState: 'RUNNING',
            reason: `Dispatched by Supervisor iteration ${iterationNumber}`,
          },
        })

        // 2b. Resolve Executor and Harness
        const resolution = await this.resolver.resolve({
          roleId: decision.targetRoleId!,
          preferredExecutorId: decision.targetExecutorId,
        })

        const assignment: WorkerAssignment = {
          assignmentId: `asg_${randomUUID().slice(0, 8)}`,
          workSessionId,
          runId,
          taskId,
          roleId: decision.targetRoleId!,
          executorId: resolution.executorId,
          harnessId: resolution.harnessId,
          objective,
          taskInstructions: decision.proposedTask?.instructions ?? objective,
          workingDirectory: decision.proposedTask?.workingDirectory ?? process.cwd(),
          requestedCapabilities: decision.proposedTask?.requiredCapabilities ?? {},
          timeoutMs: 30000,
          iterationNumber,
          correlationId: randomUUID(),
        }

        // 2c. Execute worker (via custom handler if testing deterministic fixture, or real K1 dispatch)
        let workerResult: WorkerResult
        const startExecTime = Date.now()

        if (customWorkerHandler) {
          workerResult = await customWorkerHandler(assignment)
        } else {
          // Real K1 dispatch path
          const executionId = `exec_${randomUUID().slice(0, 8)}`
          const dispatchRes = await this.registry.dispatch(resolution.harnessId, {
            executionId,
            workSessionId,
            runId,
            taskId,
            executorId: resolution.executorId,
            roleId: decision.targetRoleId!,
            harnessId: resolution.harnessId,
            workingDirectory: assignment.workingDirectory,
            input: assignment.taskInstructions,
            timeoutPolicy: { executionTimeoutMs: assignment.timeoutMs },
          })

          const rawRes = await dispatchRes.result
          workerResult = {
            assignmentId: assignment.assignmentId,
            executionId: rawRes.executionId,
            harnessId: rawRes.harnessId,
            harnessKind: rawRes.harnessKind,
            status: rawRes.success ? 'WORKER_REPORTED_SUCCESS' : 'WORKER_REPORTED_FAILURE',
            exitCode: rawRes.exitCode,
            output: rawRes.stdout,
            errorOutput: rawRes.stderr,
            durationMs: rawRes.durationMs,
            provenanceDigest: rawRes.provenance.resultDigest ?? '',
            completedAt: rawRes.finishedAt,
          }
        }

        // 2d. Record state in K0 Kernel
        const taskTerminalState = workerResult.status === 'WORKER_REPORTED_SUCCESS' ? 'SUCCEEDED' : 'FAILED'
        await this.kernel.execute({
          commandId: randomUUID(),
          commandType: 'TRANSITION_TASK',
          workSessionId,
          payload: {
            taskId,
            toState: taskTerminalState,
            reason: `Worker completed with status: ${workerResult.status}`,
          },
        })

        // Update loop history and session state
        const iterationRecord: ClosedLoopIterationRecord = {
          iterationNumber,
          decision,
          assignment,
          workerResult,
          startedAt: new Date(startExecTime).toISOString(),
          finishedAt: new Date().toISOString(),
        }

        latestResult = workerResult
        sessionState = {
          ...sessionState,
          currentIteration: iterationNumber,
          totalExecutions: sessionState.totalExecutions + 1,
          totalRetries: decision.decisionKind === 'RETRY_TASK' ? sessionState.totalRetries + 1 : sessionState.totalRetries,
          history: [...sessionState.history, iterationRecord],
          lastEvaluatedAt: new Date().toISOString(),
        }
      }
    }

    return sessionState
  }
}
