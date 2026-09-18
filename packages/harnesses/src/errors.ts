/**
 * Domain errors for @gravitas/harnesses.
 */

export class HarnessExecutionError extends Error {
  public readonly harnessId: string
  public readonly executionId: string

  constructor(harnessId: string, executionId: string, message: string) {
    super(`Agent execution failed [${harnessId}:${executionId}]: ${message}`)
    this.name = 'HarnessExecutionError'
    this.harnessId = harnessId
    this.executionId = executionId
  }
}

export class HarnessUnavailableError extends Error {
  public readonly harnessId: string
  public readonly status: string

  constructor(harnessId: string, status: string, message?: string | undefined) {
    const detail = message ? `: ${message}` : ''
    super(`Harness "${harnessId}" is unavailable (${status})${detail}`)
    this.name = 'HarnessUnavailableError'
    this.harnessId = harnessId
    this.status = status
  }
}

export class ProcessTimeoutError extends Error {
  public readonly pid?: number | undefined
  public readonly timeoutMs: number

  constructor(timeoutMs: number, pid?: number | undefined) {
    const pidStr = pid ? ` (PID: ${pid})` : ''
    super(`Process execution timed out after ${timeoutMs}ms${pidStr}`)
    this.name = 'ProcessTimeoutError'
    this.timeoutMs = timeoutMs
    this.pid = pid
  }
}

export class ProcessCancellationError extends Error {
  public readonly executionId: string

  constructor(executionId: string) {
    super(`Execution "${executionId}" was cancelled by request`)
    this.name = 'ProcessCancellationError'
    this.executionId = executionId
  }
}

export class MutationScopeError extends Error {
  public readonly unexpectedFiles: readonly string[]

  constructor(unexpectedFiles: readonly string[]) {
    super(`Worker modified unexpected files outside allowed scope:\n  - ${unexpectedFiles.join('\n  - ')}`)
    this.name = 'MutationScopeError'
    this.unexpectedFiles = [...unexpectedFiles]
  }
}
