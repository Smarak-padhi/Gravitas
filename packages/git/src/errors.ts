/**
 * Domain errors for @gravitas/git.
 */

export class GitExecutionError extends Error {
  public readonly executable: string
  public readonly args: readonly string[]
  public readonly cwd: string
  public readonly exitCode: number
  public readonly stdout: string
  public readonly stderr: string

  constructor(params: {
    executable: string
    args: readonly string[]
    cwd: string
    exitCode: number
    stdout: string
    stderr: string
    sanitizedMessage?: string | undefined
  }) {
    const detail = params.sanitizedMessage ?? (params.stderr.trim() || params.stdout.trim() || `Exit code ${params.exitCode}`)
    super(`Git command failed [${params.args.join(' ')}] in "${params.cwd}": ${detail}`)
    this.name = 'GitExecutionError'
    this.executable = params.executable
    this.args = params.args
    this.cwd = params.cwd
    this.exitCode = params.exitCode
    this.stdout = params.stdout
    this.stderr = params.stderr
  }
}

export class RepositoryInspectionError extends Error {
  public readonly path: string

  constructor(path: string, reason: string) {
    super(`Repository inspection failed for "${path}": ${reason}`)
    this.name = 'RepositoryInspectionError'
    this.path = path
  }
}

export class UnsafeRefError extends Error {
  public readonly input: string

  constructor(input: string, reason: string) {
    super(`Unsafe or invalid Git ref/identifier "${input}": ${reason}`)
    this.name = 'UnsafeRefError'
    this.input = input
  }
}

export class WorktreeAllocationError extends Error {
  public readonly repository: string
  public readonly reason: string

  constructor(repository: string, reason: string) {
    super(`Worktree allocation refused for "${repository}": ${reason}`)
    this.name = 'WorktreeAllocationError'
    this.repository = repository
    this.reason = reason
  }
}

export class WorktreeRemovalError extends Error {
  public readonly worktreePath: string
  public readonly reason: string

  constructor(worktreePath: string, reason: string) {
    super(`Worktree removal refused for "${worktreePath}": ${reason}`)
    this.name = 'WorktreeRemovalError'
    this.worktreePath = worktreePath
    this.reason = reason
  }
}
