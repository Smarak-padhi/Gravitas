/**
 * Worktree mutation capture and change-scope detection for @gravitas/harnesses.
 *
 * Guarantees:
 * - Records before/after Git worktree snapshots.
 * - Detects unexpected worker commits (HEAD mutation).
 * - Computes SHA-256 hash of the resulting diff.
 * - Categorizes changed files into allowed vs. unexpected changes.
 */

import { createHash } from 'node:crypto'
import { executeGit, inspectRepository } from '@gravitas/git'
import type { MutationCapture, WorktreeSnapshot } from './types.js'

/**
 * Takes a point-in-time snapshot of a task worktree.
 */
export async function takeWorktreeSnapshot(worktreePath: string): Promise<WorktreeSnapshot> {
  const inspection = await inspectRepository(worktreePath)

  // Query tracked and untracked file list
  const lsFiles = await executeGit({
    cwd: worktreePath,
    args: ['ls-files'],
  })
  const fileList = lsFiles.stdout.split(/\r?\n/).map((f: string) => f.trim()).filter(Boolean)

  return {
    headSha: inspection.headSha ?? '',
    branch: inspection.currentBranch ?? 'detached',
    isClean: inspection.isClean,
    fileList: Object.freeze(fileList),
    stagedCount: inspection.stagedCount,
    unstagedCount: inspection.unstagedCount,
    untrackedCount: inspection.untrackedCount,
  }
}

/**
 * Normalizes relative file paths for cross-platform comparison (forward slashes).
 */
export function normalizePathForScope(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '').trim()
}

/**
 * Captures mutations in a task worktree by comparing against a pre-execution snapshot.
 */
export async function captureWorktreeMutation(
  worktreePath: string,
  beforeSnapshot: WorktreeSnapshot,
  allowedPaths: readonly string[]
): Promise<MutationCapture> {
  const afterSnapshot = await takeWorktreeSnapshot(worktreePath)
  const headMutated = beforeSnapshot.headSha !== afterSnapshot.headSha

  // 1. Capture unified diff against baseline snapshot HEAD
  const baseRef = beforeSnapshot.headSha || 'HEAD'
  const diffResult = await executeGit({
    cwd: worktreePath,
    args: ['diff', baseRef],
  })
  const diff = diffResult.stdout

  // 2. Compute SHA-256 hash of diff
  const diffSha256 = createHash('sha256').update(diff, 'utf8').digest('hex')

  // 3. Collect all changed, staged, unstaged, and untracked files
  const statusResult = await executeGit({
    cwd: worktreePath,
    args: ['status', '--porcelain=v2'],
  })

  const changedFilesSet = new Set<string>()

  const statusLines = statusResult.stdout.split(/\r?\n/)
  for (const line of statusLines) {
    if (!line || line.startsWith('#')) continue

    const type = line.charAt(0)
    if (type === '1' || type === '2') {
      // Format: 1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>
      const parts = line.split(/\s+/)
      const filePath = parts[parts.length - 1]
      if (filePath) changedFilesSet.add(normalizePathForScope(filePath))
    } else if (type === '?') {
      // Untracked: ? <path>
      const filePath = line.substring(2).trim()
      if (filePath) changedFilesSet.add(normalizePathForScope(filePath))
    }
  }

  const changedFiles = Array.from(changedFilesSet)
  const normalizedAllowed = new Set(allowedPaths.map(normalizePathForScope))

  const allowedChanges: string[] = []
  const unexpectedChanges: string[] = []

  for (const file of changedFiles) {
    if (normalizedAllowed.has(file)) {
      allowedChanges.push(file)
    } else {
      unexpectedChanges.push(file)
    }
  }

  return {
    beforeSnapshot,
    afterSnapshot,
    headMutated,
    changedFiles: Object.freeze(changedFiles),
    diff,
    diffSha256,
    allowedChanges: Object.freeze(allowedChanges),
    unexpectedChanges: Object.freeze(unexpectedChanges),
  }
}
