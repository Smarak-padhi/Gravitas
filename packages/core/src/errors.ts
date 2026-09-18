/**
 * Domain errors for @gravitas/core.
 * All errors are standard Error subclasses with structured properties.
 */

export class InvalidStateTransitionError extends Error {
  public readonly fromState: string
  public readonly toState: string
  public readonly taskId?: string | undefined

  constructor(fromState: string, toState: string, taskId?: string, reason?: string) {
    const detail = reason ? ` (${reason})` : ''
    const taskContext = taskId ? ` for task "${taskId}"` : ''
    super(`Invalid state transition${taskContext}: cannot transition from "${fromState}" to "${toState}"${detail}`)
    this.name = 'InvalidStateTransitionError'
    this.fromState = fromState
    this.toState = toState
    this.taskId = taskId
  }
}

export class ContractValidationError extends Error {
  public readonly issues: readonly string[]

  constructor(issues: readonly string[]) {
    super(`ExecutionContract validation failed:\n  - ${issues.join('\n  - ')}`)
    this.name = 'ContractValidationError'
    this.issues = [...issues]
  }
}

export class DependencyEvaluationError extends Error {
  public readonly taskId: string
  public readonly dependencyTaskId: string

  constructor(taskId: string, dependencyTaskId: string, message: string) {
    super(`Dependency evaluation failed for task "${taskId}" on upstream task "${dependencyTaskId}": ${message}`)
    this.name = 'DependencyEvaluationError'
    this.taskId = taskId
    this.dependencyTaskId = dependencyTaskId
  }
}
