/**
 * Error classes for @gravitas/orchestrator.
 */

export class PlanValidationError extends Error {
  public readonly code = 'PLAN_VALIDATION_ERROR' as const

  public constructor(message: string) {
    super(`Plan validation failed: ${message}`)
    this.name = 'PlanValidationError'
  }
}

export class CompositionConflictError extends Error {
  public readonly code = 'COMPOSITION_CONFLICT' as const
  public readonly taskId: string
  public readonly parentCommitShas: readonly string[]
  public readonly conflictDetails: string

  public constructor(taskId: string, parentCommitShas: readonly string[], conflictDetails: string) {
    super(`Git composition conflict on task '${taskId}': ${conflictDetails}`)
    this.name = 'CompositionConflictError'
    this.taskId = taskId
    this.parentCommitShas = parentCommitShas
    this.conflictDetails = conflictDetails
  }
}

export class OrchestratorExecutionError extends Error {
  public readonly code = 'ORCHESTRATOR_EXECUTION_ERROR' as const

  public constructor(message: string) {
    super(`Orchestrator execution error: ${message}`)
    this.name = 'OrchestratorExecutionError'
  }
}
