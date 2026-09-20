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

export interface TaskWithDependencies {
  readonly id: string
  readonly dependencies: readonly (string | { readonly taskId: string })[]
}

/**
 * Computes the topological level/rank (0, 1, 2...) for each task in a DAG.
 * Roots (0 dependencies) have rank 0.
 * Downstream tasks have rank max(dependency ranks) + 1.
 * Returns a Map of taskId -> rank.
 */
export function computeTopologicalRanks(
  tasks: readonly TaskWithDependencies[]
): Map<string, number> {
  const ranks = new Map<string, number>()
  const taskMap = new Map<string, TaskWithDependencies>()
  for (const t of tasks) {
    taskMap.set(t.id, t)
  }

  const getRank = (taskId: string, visiting = new Set<string>()): number => {
    if (ranks.has(taskId)) return ranks.get(taskId)!
    if (visiting.has(taskId)) return 0 // cycle guard

    visiting.add(taskId)
    const task = taskMap.get(taskId)
    if (!task || task.dependencies.length === 0) {
      ranks.set(taskId, 0)
      visiting.delete(taskId)
      return 0
    }

    let maxDepRank = -1
    for (const dep of task.dependencies) {
      const depId = typeof dep === 'string' ? dep : dep.taskId
      const dRank = getRank(depId, visiting)
      if (dRank > maxDepRank) {
        maxDepRank = dRank
      }
    }

    const rank = maxDepRank + 1
    ranks.set(taskId, rank)
    visiting.delete(taskId)
    return rank
  }

  for (const t of tasks) {
    getRank(t.id)
  }

  return ranks
}

