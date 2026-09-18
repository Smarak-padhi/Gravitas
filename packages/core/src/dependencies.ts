/**
 * Dependency semantics and evaluation for @gravitas/core.
 * Evaluates whether tasks are READY, BLOCKED, or UNSATISFIABLE based on upstream states.
 */

import { isTerminalState } from './fsm.js'
import type { Task, TaskDependency, TaskState } from './types.js'

/**
 * Default states that satisfy a dependency edge if acceptableStates is omitted.
 * Both SUCCEEDED (verified automated completion) and APPROVED (human approved)
 * represent successful completion.
 */
export const DEFAULT_SATISFYING_STATES: readonly TaskState[] = ['SUCCEEDED', 'APPROVED'] as const

/**
 * Checks whether a single dependency requirement is currently satisfied by an upstream task.
 */
export function isDependencySatisfied(
  dependency: TaskDependency,
  upstreamTask: Task
): boolean {
  const acceptable = dependency.acceptableStates ?? DEFAULT_SATISFYING_STATES
  return acceptable.includes(upstreamTask.state)
}

/**
 * Checks whether a dependency requirement is permanently broken.
 * A dependency is broken when the upstream task has reached a terminal state
 * that is NOT in the dependency's acceptable states (e.g. FAILED, CANCELLED).
 * A broken dependency means the dependent task can never become READY.
 */
export function isDependencyBroken(
  dependency: TaskDependency,
  upstreamTask: Task
): boolean {
  const acceptable = dependency.acceptableStates ?? DEFAULT_SATISFYING_STATES
  return isTerminalState(upstreamTask.state) && !acceptable.includes(upstreamTask.state)
}

/**
 * Readiness status of a task.
 */
export type TaskReadinessStatus = 'READY' | 'BLOCKED' | 'UNSATISFIABLE'

/**
 * Detailed outcome of task dependency evaluation.
 */
export interface TaskReadinessEvaluation {
  readonly status: TaskReadinessStatus
  readonly satisfiedDependencies: readonly string[]
  readonly unsatisfiedDependencies: readonly string[]
  readonly brokenDependencies: readonly string[]
}

/**
 * Evaluates all dependencies of a task against the current task set.
 *
 * - Returns READY if all dependencies are satisfied (or if there are no dependencies).
 * - Returns UNSATISFIABLE if any dependency is permanently broken or references a missing task.
 * - Returns BLOCKED if one or more dependencies are not yet satisfied, but none are broken.
 */
export function evaluateTaskReadiness(
  task: Task,
  taskLookup: (id: string) => Task | undefined
): TaskReadinessEvaluation {
  if (task.dependencies.length === 0) {
    return {
      status: 'READY',
      satisfiedDependencies: [],
      unsatisfiedDependencies: [],
      brokenDependencies: [],
    }
  }

  const satisfied: string[] = []
  const unsatisfied: string[] = []
  const broken: string[] = []

  for (const dep of task.dependencies) {
    const upstream = taskLookup(dep.taskId)
    if (!upstream) {
      // Upstream task does not exist — permanent failure condition
      broken.push(dep.taskId)
      continue
    }

    if (isDependencySatisfied(dep, upstream)) {
      satisfied.push(dep.taskId)
    } else if (isDependencyBroken(dep, upstream)) {
      broken.push(dep.taskId)
    } else {
      unsatisfied.push(dep.taskId)
    }
  }

  let status: TaskReadinessStatus
  if (broken.length > 0) {
    status = 'UNSATISFIABLE'
  } else if (unsatisfied.length > 0) {
    status = 'BLOCKED'
  } else {
    status = 'READY'
  }

  return {
    status,
    satisfiedDependencies: satisfied,
    unsatisfiedDependencies: unsatisfied,
    brokenDependencies: broken,
  }
}

/**
 * Helper to determine the initial non-PLANNED state for a task upon scheduling.
 * Tasks with no dependencies or satisfied dependencies go directly to READY.
 * Tasks with pending dependencies go to BLOCKED.
 */
export function resolveInitialTaskState(
  dependencies: readonly TaskDependency[],
  taskLookup: (id: string) => Task | undefined
): 'READY' | 'BLOCKED' {
  if (dependencies.length === 0) {
    return 'READY'
  }
  const dummyTask: Task = {
    id: '__init_check__',
    runId: '__init__',
    title: '',
    objective: '',
    state: 'PLANNED',
    dependencies,
    acceptanceCriteria: [],
    createdAt: '',
    updatedAt: '',
  }
  const evalResult = evaluateTaskReadiness(dummyTask, taskLookup)
  return evalResult.status === 'READY' ? 'READY' : 'BLOCKED'
}
