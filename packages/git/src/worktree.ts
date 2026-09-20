/**
 * Worktree Allocation, Inspection, and Removal for @gravitas/git.
 *
 * Guarantees:
 * - Primary working tree is never commandeered or altered.
 * - Allocation is strictly verified before reporting success.
 * - Worktrees are isolated in external runtime directories.
 * - Dirty task worktrees are preserved by default to prevent data loss.
 */

import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { WorktreeAllocationError, WorktreeRemovalError } from './errors.js'
import { inspectRepository } from './inspector.js'
import { executeGit } from './process.js'
import { buildTaskBranchName, validateIdentifier } from './ref-safety.js'
import type {
  WorktreeAllocation,
  WorktreeAllocationInput,
  WorktreeInspection,
  WorktreeRemovalResult,
} from './types.js'

/**
 * Allocates an isolated Git worktree for a specific task.
 *
 * Sequence:
 * 1. Validate identifiers (runId, taskId) to prevent ref injection or path traversal.
 * 2. Inspect target repository to verify existence, git status, and cleanliness.
 * 3. Resolve requested baseRef to exact commit SHA.
 * 4. Record primary branch and HEAD SHA.
 * 5. Create new task branch and worktree from base commit.
 * 6. Inspect created worktree and verify HEAD == base SHA and branch == task branch.
 * 7. Verify primary branch and HEAD remain completely untouched.
 * 8. Return structured WorktreeAllocation.
 */
export async function allocateWorktree(input: WorktreeAllocationInput): Promise<WorktreeAllocation> {
  // 1. Validate untrusted identifiers
  const safeRunId = validateIdentifier(input.runId, 'runId')
  const safeTaskId = validateIdentifier(input.taskId, 'taskId')
  const taskBranch = buildTaskBranchName(safeRunId, safeTaskId)

  // 2. Inspect primary repository
  const inspection = await inspectRepository(input.repository)
  if (!inspection.exists) {
    throw new WorktreeAllocationError(input.repository, 'Target repository path does not exist')
  }
  if (!inspection.isGit || !inspection.canonicalRoot) {
    throw new WorktreeAllocationError(input.repository, 'Target path is not a valid Git repository')
  }
  if (!inspection.hasCommits || !inspection.headSha) {
    throw new WorktreeAllocationError(
      input.repository,
      'Repository has zero commits; cannot allocate worktree from non-existent commit'
    )
  }

  // 3. Enforce cleanliness policy (default REQUIRE_CLEAN)
  const cleanlinessPolicy = input.cleanlinessPolicy ?? 'REQUIRE_CLEAN'
  if (cleanlinessPolicy === 'REQUIRE_CLEAN' && !inspection.isClean) {
    throw new WorktreeAllocationError(
      input.repository,
      `Primary repository is dirty (${inspection.stagedCount} staged, ${inspection.unstagedCount} unstaged, ${inspection.untrackedCount} untracked). Refusing allocation to protect working tree.`
    )
  }

  const primaryRoot = inspection.canonicalRoot
  const primaryBranch = inspection.currentBranch
  const primaryHead = inspection.headSha

  // 4. Resolve baseRef to commit SHA
  const resolveCheck = await executeGit({
    cwd: primaryRoot,
    args: ['rev-parse', '--verify', `${input.baseRef}^{commit}`],
  })
  if (resolveCheck.exitCode !== 0 || !resolveCheck.stdout.trim()) {
    throw new WorktreeAllocationError(
      input.repository,
      `Base ref "${input.baseRef}" could not be resolved to a commit in repository: ${resolveCheck.stderr || 'unknown ref'}`
    )
  }
  const baseSha = resolveCheck.stdout.trim()

  // 5. Check if task branch already exists
  const branchExistsCheck = await executeGit({
    cwd: primaryRoot,
    args: ['rev-parse', '--verify', `refs/heads/${taskBranch}`],
  })
  if (branchExistsCheck.exitCode === 0) {
    throw new WorktreeAllocationError(
      input.repository,
      `Task branch "${taskBranch}" already exists (duplicate allocation)`
    )
  }

  // 6. Compute worktree path under runtimeRoot
  const worktreePath = resolve(input.runtimeRoot, 'worktrees', safeRunId, safeTaskId)

  // Ensure parent directory exists
  await mkdir(dirname(worktreePath), { recursive: true })

  // 7. Execute `git worktree add -b <branch> <path> <baseSha>`
  const addResult = await executeGit({
    cwd: primaryRoot,
    args: ['worktree', 'add', '-b', taskBranch, worktreePath, baseSha],
  })

  if (addResult.exitCode !== 0) {
    throw new WorktreeAllocationError(
      input.repository,
      `git worktree add failed: ${addResult.stderr || addResult.stdout}`
    )
  }

  // 8. Inspect resulting worktree
  const worktreeInspection = await inspectRepository(worktreePath)
  if (!worktreeInspection.isGit || worktreeInspection.headSha !== baseSha) {
    throw new WorktreeAllocationError(
      input.repository,
      `Allocated worktree validation failed: HEAD is ${worktreeInspection.headSha}, expected ${baseSha}`
    )
  }
  if (worktreeInspection.currentBranch !== taskBranch) {
    throw new WorktreeAllocationError(
      input.repository,
      `Allocated worktree validation failed: Branch is "${worktreeInspection.currentBranch}", expected "${taskBranch}"`
    )
  }

  // 9. Verify primary working tree was completely unaffected
  const primaryPostInspection = await inspectRepository(primaryRoot)
  if (primaryPostInspection.headSha !== primaryHead) {
    throw new WorktreeAllocationError(
      input.repository,
      `Primary HEAD changed during worktree allocation! (Old: ${primaryHead}, New: ${primaryPostInspection.headSha})`
    )
  }
  if (primaryPostInspection.currentBranch !== primaryBranch) {
    throw new WorktreeAllocationError(
      input.repository,
      `Primary branch changed during worktree allocation! (Old: ${primaryBranch}, New: ${primaryPostInspection.currentBranch})`
    )
  }

  return {
    repositoryRoot: primaryRoot,
    worktreePath,
    branch: taskBranch,
    baseRef: input.baseRef,
    baseSha,
    allocatedAt: new Date().toISOString(),
  }
}

/**
 * Inspects a task worktree to report branch, HEAD, and change status.
 */
export async function inspectWorktree(worktreePath: string): Promise<WorktreeInspection> {
  const inspection = await inspectRepository(worktreePath)
  return {
    worktreePath: inspection.canonicalRoot ?? resolve(worktreePath),
    branch: inspection.currentBranch,
    headSha: inspection.headSha,
    isClean: inspection.isClean,
    stagedCount: inspection.stagedCount,
    unstagedCount: inspection.unstagedCount,
    untrackedCount: inspection.untrackedCount,
  }
}

/**
 * Removes a task worktree according to conservative safety policy.
 *
 * Policy:
 * - If worktree is CLEAN: removal proceeds via `git worktree remove`.
 * - If worktree is DIRTY: removal is strictly REFUSED.
 * - Task branch is NEVER deleted (preserved for history/audit).
 */
export async function removeWorktree(
  worktreePath: string,
  options?: { force?: boolean | undefined }
): Promise<WorktreeRemovalResult> {
  const normalizedPath = resolve(worktreePath)
  const inspection = await inspectRepository(normalizedPath)

  if (!inspection.exists || !inspection.isGit) {
    return {
      success: false,
      worktreePath: normalizedPath,
      refusalReason: 'Target path is not an active Git worktree or does not exist',
    }
  }

  // Refuse if dirty unless explicitly forced
  if (!inspection.isClean && !options?.force) {
    return {
      success: false,
      worktreePath: normalizedPath,
      branch: inspection.currentBranch,
      refusalReason: `Worktree has uncommitted changes (${inspection.stagedCount} staged, ${inspection.unstagedCount} unstaged, ${inspection.untrackedCount} untracked). Refusing removal to prevent data loss.`,
    }
  }

  // Discover common git dir to locate the primary repository
  const commonDirCheck = await executeGit({
    cwd: normalizedPath,
    args: ['rev-parse', '--git-common-dir'],
  })

  if (commonDirCheck.exitCode !== 0 || !commonDirCheck.stdout.trim()) {
    throw new WorktreeRemovalError(
      normalizedPath,
      `Could not determine common git directory: ${commonDirCheck.stderr}`
    )
  }

  // The common dir is typically `<mainRepo>/.git`
  const gitCommonDir = resolve(normalizedPath, commonDirCheck.stdout.trim())
  const primaryRepo = dirname(gitCommonDir)

  // Remove the worktree from the primary repository
  const removeArgs = options?.force
    ? ['worktree', 'remove', '--force', normalizedPath]
    : ['worktree', 'remove', normalizedPath]

  const removeResult = await executeGit({
    cwd: primaryRepo,
    args: removeArgs,
  })

  if (removeResult.exitCode !== 0) {
    return {
      success: false,
      worktreePath: normalizedPath,
      branch: inspection.currentBranch,
      refusalReason: `git worktree remove failed: ${removeResult.stderr || removeResult.stdout}`,
    }
  }

  return {
    success: true,
    worktreePath: normalizedPath,
    branch: inspection.currentBranch,
  }
}
