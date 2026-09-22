/**
 * RunPlan and DAG Validation for @gravitas/orchestrator.
 * Detects unknown dependencies, duplicates, self-references, and cycles.
 */

import { checkReviewerIndependence } from '@gravitas/core'
import { PlanValidationError } from './errors.js'
import type { RunPlan, TaskPlanDefinition } from './types.js'

/**
 * Normalizes task dependencies to an array of upstream task ID strings.
 */
export function extractDependencyIds(task: TaskPlanDefinition): readonly string[] {
  if (!task.dependencies || task.dependencies.length === 0) {
    return []
  }
  return task.dependencies.map((dep) => {
    if (typeof dep === 'string') {
      return dep.trim()
    }
    if (dep && typeof dep.taskId === 'string') {
      return dep.taskId.trim()
    }
    throw new PlanValidationError(`Task '${task.id}' contains an invalid dependency declaration.`)
  })
}

/**
 * Validates a RunPlan against DAG invariants.
 * Throws PlanValidationError on any structural defect.
 */
export function validateRunPlan(plan: RunPlan): void {
  if (!plan) {
    throw new PlanValidationError('Plan must be a valid object.')
  }

  if (typeof plan.goal !== 'string' || plan.goal.trim() === '') {
    throw new PlanValidationError("Plan property 'goal' must be a non-empty string.")
  }

  if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) {
    throw new PlanValidationError("Plan property 'tasks' must be a non-empty array of tasks.")
  }

  if (plan.maxConcurrency !== undefined) {
    if (!Number.isInteger(plan.maxConcurrency) || plan.maxConcurrency < 1) {
      throw new PlanValidationError(`Property 'maxConcurrency' must be a positive integer, received: ${plan.maxConcurrency}`)
    }
  }

  const taskIds = new Set<string>()
  const adjacency = new Map<string, string[]>() // taskId -> array of upstream dependency task IDs

  // 1. Task ID uniqueness and field validation
  for (const task of plan.tasks) {
    if (!task || typeof task !== 'object') {
      throw new PlanValidationError('Each task in the plan must be an object.')
    }
    if (typeof task.id !== 'string' || task.id.trim() === '') {
      throw new PlanValidationError("Each task must have a non-empty 'id'.")
    }
    const cleanId = task.id.trim()

    if (taskIds.has(cleanId)) {
      throw new PlanValidationError(`Duplicate task ID '${cleanId}' found in plan.`)
    }
    taskIds.add(cleanId)

    if (typeof task.title !== 'string' || task.title.trim() === '') {
      throw new PlanValidationError(`Task '${cleanId}' must have a non-empty 'title'.`)
    }
    if (typeof task.objective !== 'string' || task.objective.trim() === '') {
      throw new PlanValidationError(`Task '${cleanId}' must have a non-empty 'objective'.`)
    }

    adjacency.set(cleanId, [])
  }

  // 2. Validate dependencies reference known tasks and are not self-referential
  for (const task of plan.tasks) {
    const cleanId = task.id.trim()
    const depIds = extractDependencyIds(task)

    for (const depId of depIds) {
      if (!depId) {
        throw new PlanValidationError(`Task '${cleanId}' has an empty dependency ID.`)
      }
      if (depId === cleanId) {
        throw new PlanValidationError(`Task '${cleanId}' cannot depend on itself (self-dependency).`)
      }
      if (!taskIds.has(depId)) {
        throw new PlanValidationError(
          `Task '${cleanId}' references unknown dependency '${depId}'. Available tasks: ${Array.from(taskIds).join(', ')}`
        )
      }
      adjacency.get(cleanId)!.push(depId)
    }

    if (task.reviewOfTaskId) {
      const targetId = task.reviewOfTaskId.trim()
      if (targetId === cleanId) {
        throw new PlanValidationError(`Task '${cleanId}' cannot review itself (self-review).`)
      }
      if (!taskIds.has(targetId)) {
        throw new PlanValidationError(
          `Task '${cleanId}' reviewOfTaskId references unknown task '${targetId}'. Available tasks: ${Array.from(taskIds).join(', ')}`
        )
      }
      const reviewedTask = plan.tasks.find((t) => t.id.trim() === targetId)
      const reviewerRole = task.roleId ?? (task.role as string)
      const authorRole = reviewedTask?.roleId ?? (reviewedTask?.role as string)
      if (reviewerRole && authorRole) {
        const indep = checkReviewerIndependence(authorRole, reviewerRole)
        if (!indep.allowed) {
          throw new PlanValidationError(indep.reason ?? 'Reviewer independence violation')
        }
      }
    }
  }

  // 3. Cycle detection using Depth-First Search
  // Node states for cycle detection: 0 = unvisited, 1 = visiting (in current call stack), 2 = visited
  const visited = new Map<string, number>()
  for (const id of taskIds) {
    visited.set(id, 0)
  }

  const currentPath: string[] = []

  function dfs(node: string): void {
    visited.set(node, 1) // visiting
    currentPath.push(node)

    const deps = adjacency.get(node) ?? []
    for (const dep of deps) {
      const state = visited.get(dep)
      if (state === 1) {
        // Cycle detected!
        const cycleStartIndex = currentPath.indexOf(dep)
        const cyclePath = [...currentPath.slice(cycleStartIndex), dep]
        throw new PlanValidationError(`Dependency cycle detected: ${cyclePath.join(' -> ')}`)
      }
      if (state === 0) {
        dfs(dep)
      }
    }

    currentPath.pop()
    visited.set(node, 2) // fully visited
  }

  for (const id of taskIds) {
    if (visited.get(id) === 0) {
      dfs(id)
    }
  }
}
