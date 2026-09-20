/**
 * Worktree Composition and Result Materialization for @gravitas/orchestrator.
 *
 * Invariants:
 * 1. Workers NEVER commit directly to Git.
 * 2. Gravitas creates verified result commits: "gravitas: verified result <task-id>".
 * 3. Dependent tasks compose from upstream verified result commit SHAs.
 * 4. Multi-parent composition ordering is strictly governed by RunPlan dependency
 *    declaration order (NOT commit SHA lexical order). The first declared dependency
 *    forms the base branch; subsequent dependencies are cherry-picked in declared sequence.
 * 5. Cherry-pick conflicts fail safely with CompositionConflictError (COMPOSITION_CONFLICT)
 *    with zero guessing or corrupted worktree state.
 */

import {
  allocateWorktree,
  executeGit,
  removeWorktree,
  runGit,
  type WorktreeAllocation,
} from '@gravitas/git'
import { CompositionConflictError, OrchestratorExecutionError } from './errors.js'

const GRAVITAS_GIT_ENV = {
  GIT_AUTHOR_NAME: 'Gravitas Engine',
  GIT_AUTHOR_EMAIL: 'engine@gravitas.local',
  GIT_COMMITTER_NAME: 'Gravitas Engine',
  GIT_COMMITTER_EMAIL: 'engine@gravitas.local',
}

export interface MaterializeResultOptions {
  readonly worktreePath: string
  readonly taskId: string
}

/**
 * Materializes verified changes in a worktree into an authoritative Gravitas commit.
 * Returns the 40-character commit SHA.
 */
export async function materializeVerifiedResult(options: MaterializeResultOptions): Promise<string> {
  const { worktreePath, taskId } = options

  // 1. Stage all changes in the task worktree
  await runGit({
    cwd: worktreePath,
    args: ['add', '-A'],
  })

  // 2. Check if there are any staged changes
  const diffCheck = await executeGit({
    cwd: worktreePath,
    args: ['diff', '--cached', '--quiet'],
  })

  if (diffCheck.exitCode !== 0) {
    // Staged changes exist — create verified result commit
    const commitResult = await executeGit({
      cwd: worktreePath,
      args: ['commit', '-m', `gravitas: verified result ${taskId}`],
      env: GRAVITAS_GIT_ENV,
    })

    if (commitResult.exitCode !== 0) {
      throw new OrchestratorExecutionError(
        `Failed to commit verified result for task '${taskId}': ${commitResult.stderr || commitResult.stdout}`
      )
    }
  }

  // 3. Resolve and return the current HEAD commit SHA
  const headResult = await runGit({
    cwd: worktreePath,
    args: ['rev-parse', 'HEAD'],
  })

  return headResult.stdout.trim()
}

export interface ComposeTaskWorktreeOptions {
  readonly repositoryRoot: string
  readonly runId: string
  readonly taskId: string
  readonly baseRef: string
  readonly parentCommitShas: readonly string[]
  readonly runtimeRoot: string
}

/**
 * Allocates an isolated task worktree based on upstream parent result commit SHAs.
 * Supports:
 * - Root tasks (0 parents): branched from run baseRef.
 * - Single-parent tasks (1 parent): branched directly from parent result commit SHA.
 * - Multi-parent tasks (>1 parents): branched from parent[0] with subsequent parents
 *   cherry-picked in deterministic order. Fails cleanly with CompositionConflictError on conflict.
 */
export async function composeTaskWorktree(options: ComposeTaskWorktreeOptions): Promise<WorktreeAllocation> {
  const { repositoryRoot, runId, taskId, baseRef, parentCommitShas, runtimeRoot } = options

  // Case A: Root task (0 upstream parents)
  if (parentCommitShas.length === 0) {
    return allocateWorktree({
      repository: repositoryRoot,
      runId,
      taskId,
      baseRef,
      runtimeRoot,
    })
  }

  // Case B: Single upstream parent
  if (parentCommitShas.length === 1) {
    const parentSha = parentCommitShas[0]
    if (!parentSha) {
      throw new OrchestratorExecutionError(`Empty parent commit SHA for task '${taskId}'`)
    }
    return allocateWorktree({
      repository: repositoryRoot,
      runId,
      taskId,
      baseRef: parentSha,
      runtimeRoot,
    })
  }

  // Case C: Multi-parent composition (e.g. diamond DAG)
  // Invariant: Composition ordering is strictly governed by the RunPlan dependency
  // declaration order, NOT incidental Git commit SHA lexical ordering.
  // The first declared dependency provides the primary parent branch, and subsequent
  // dependencies are cherry-picked sequentially in declared order.
  const primaryParent = parentCommitShas[0]
  if (!primaryParent) {
    throw new OrchestratorExecutionError(`Missing primary parent commit SHA for task '${taskId}'`)
  }

  // 1. Allocate worktree from primary parent (first declared dependency)
  const allocation = await allocateWorktree({
    repository: repositoryRoot,
    runId,
    taskId,
    baseRef: primaryParent,
    runtimeRoot,
  })

  // 2. Cherry-pick each subsequent parent commit in declared dependency order
  for (let i = 1; i < parentCommitShas.length; i++) {
    const nextParentSha = parentCommitShas[i]
    if (!nextParentSha) continue

    const cherryPickResult = await executeGit({
      cwd: allocation.worktreePath,
      args: ['cherry-pick', nextParentSha],
      env: GRAVITAS_GIT_ENV,
    })

    if (cherryPickResult.exitCode !== 0) {
      // Conflict or failure during cherry-pick!
      // Abort cherry-pick to avoid leaving git lock/state
      await executeGit({
        cwd: allocation.worktreePath,
        args: ['cherry-pick', '--abort'],
      })

      // Remove the allocated worktree to clean up disk state
      try {
        await removeWorktree(allocation.worktreePath)
      } catch {
        // Best effort cleanup
      }

      throw new CompositionConflictError(
        taskId,
        parentCommitShas,
        cherryPickResult.stderr || cherryPickResult.stdout
      )
    }
  }

  return allocation
}
