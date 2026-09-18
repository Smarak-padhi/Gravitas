/**
 * Domain types for @gravitas/git.
 * Pure data definitions for Git execution, repository inspection, and worktree allocation.
 */

/**
 * Options for running a shell-free Git subprocess.
 */
export interface GitExecutionOptions {
  readonly cwd: string
  readonly args: readonly string[]
  readonly env?: Readonly<Record<string, string | undefined>> | undefined
  readonly timeoutMs?: number | undefined
}

/**
 * Result of a Git subprocess execution.
 */
export interface GitExecutionResult {
  readonly executable: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
  readonly durationMs: number
}

/**
 * Remote repository metadata with sanitized URLs.
 */
export interface GitRemote {
  readonly name: string
  readonly fetchUrl: string
  readonly pushUrl: string
}

/**
 * Comprehensive read-only repository inspection result.
 */
export interface RepositoryInspection {
  readonly path: string
  readonly exists: boolean
  readonly isGit: boolean
  readonly canonicalRoot?: string | undefined
  readonly hasCommits: boolean
  readonly currentBranch?: string | undefined
  readonly isDetachedHead: boolean
  readonly headSha?: string | undefined
  readonly isClean: boolean
  readonly stagedCount: number
  readonly unstagedCount: number
  readonly untrackedCount: number
  readonly remotes: readonly GitRemote[]
  readonly upstreamRef?: string | undefined
}

/**
 * Policy governing repository cleanliness prior to worktree allocation.
 */
export type CleanlinessPolicy = 'REQUIRE_CLEAN' | 'ALLOW_DIRTY'

/**
 * Input parameters for allocating an isolated task worktree.
 */
export interface WorktreeAllocationInput {
  readonly repository: string
  readonly baseRef: string
  readonly runId: string
  readonly taskId: string
  readonly runtimeRoot: string
  readonly cleanlinessPolicy?: CleanlinessPolicy | undefined
}

/**
 * Output of a verified, successful worktree allocation.
 */
export interface WorktreeAllocation {
  readonly repositoryRoot: string
  readonly worktreePath: string
  readonly branch: string
  readonly baseRef: string
  readonly baseSha: string
  readonly allocatedAt: string
}

/**
 * Detailed inspection of a specific allocated worktree.
 */
export interface WorktreeInspection {
  readonly worktreePath: string
  readonly branch?: string | undefined
  readonly headSha?: string | undefined
  readonly isClean: boolean
  readonly stagedCount: number
  readonly unstagedCount: number
  readonly untrackedCount: number
}

/**
 * Outcome of a worktree removal request.
 */
export interface WorktreeRemovalResult {
  readonly success: boolean
  readonly worktreePath: string
  readonly branch?: string | undefined
  readonly refusalReason?: string | undefined
}
