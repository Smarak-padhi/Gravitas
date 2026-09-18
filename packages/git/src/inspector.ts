/**
 * Repository Inspector for @gravitas/git.
 *
 * Provides comprehensive, strictly read-only inspection of target repositories
 * using machine-readable Git porcelain output.
 *
 * Guarantees:
 * - Zero repository mutation.
 * - Never parses human prose; uses `git status --porcelain=v2` and porcelain commands.
 * - Accurately categorizes clean, dirty, detached, empty (0 commits), non-git, and nonexistent paths.
 */

import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { executeGit } from './process.js'
import type { GitRemote, RepositoryInspection } from './types.js'

/**
 * Parses `git remote -v` output into structured GitRemote objects with sanitized URLs.
 */
export function parseGitRemotes(output: string): readonly GitRemote[] {
  const remotesMap = new Map<string, { fetchUrl?: string; pushUrl?: string }>()

  const lines = output.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Format: origin  https://github.com/org/repo.git (fetch)
    const match = trimmed.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/)
    if (!match) continue

    const name = match[1]!
    const url = match[2]!
    const type = match[3]!

    const existing = remotesMap.get(name) ?? {}
    if (type === 'fetch') {
      existing.fetchUrl = url
    } else if (type === 'push') {
      existing.pushUrl = url
    }
    remotesMap.set(name, existing)
  }

  const result: GitRemote[] = []
  for (const [name, urls] of remotesMap.entries()) {
    result.push({
      name,
      fetchUrl: urls.fetchUrl ?? '',
      pushUrl: urls.pushUrl ?? '',
    })
  }

  return Object.freeze(result)
}

/**
 * Parses `git status --porcelain=v2` output to calculate exact change counts.
 */
export function parsePorcelainStatusV2(output: string): {
  stagedCount: number
  unstagedCount: number
  untrackedCount: number
} {
  let stagedCount = 0
  let unstagedCount = 0
  let untrackedCount = 0

  const lines = output.split('\n')
  for (const line of lines) {
    if (!line || line.startsWith('#')) {
      continue
    }

    const type = line.charAt(0)

    if (type === '1' || type === '2') {
      // 1 <XY> ... or 2 <XY> ...
      const xy = line.substring(2, 4)
      const x = xy.charAt(0)
      const y = xy.charAt(1)

      if (x !== '.') {
        stagedCount += 1
      }
      if (y !== '.') {
        unstagedCount += 1
      }
    } else if (type === 'u') {
      // Unmerged / conflict entry
      stagedCount += 1
      unstagedCount += 1
    } else if (type === '?') {
      // Untracked entry
      untrackedCount += 1
    }
  }

  return {
    stagedCount,
    unstagedCount,
    untrackedCount,
  }
}

/**
 * Inspects a path to determine if it is a valid Git repository and assesses its exact state.
 * Strictly read-only; leaves working tree and index untouched.
 */
export async function inspectRepository(targetPath: string): Promise<RepositoryInspection> {
  const normalizedPath = resolve(targetPath)

  // 1. Check if path exists
  try {
    const s = await stat(normalizedPath)
    if (!s.isDirectory()) {
      return {
        path: normalizedPath,
        exists: true,
        isGit: false,
        hasCommits: false,
        isDetachedHead: false,
        isClean: false,
        stagedCount: 0,
        unstagedCount: 0,
        untrackedCount: 0,
        remotes: [],
      }
    }
  } catch {
    return {
      path: normalizedPath,
      exists: false,
      isGit: false,
      hasCommits: false,
      isDetachedHead: false,
      isClean: false,
      stagedCount: 0,
      unstagedCount: 0,
      untrackedCount: 0,
      remotes: [],
    }
  }

  // 2. Check if inside a Git worktree and get top-level directory
  const rootCheck = await executeGit({
    cwd: normalizedPath,
    args: ['rev-parse', '--show-toplevel'],
  })

  if (rootCheck.exitCode !== 0 || !rootCheck.stdout.trim()) {
    return {
      path: normalizedPath,
      exists: true,
      isGit: false,
      hasCommits: false,
      isDetachedHead: false,
      isClean: false,
      stagedCount: 0,
      unstagedCount: 0,
      untrackedCount: 0,
      remotes: [],
    }
  }

  // Use the canonical repository root discovered by Git
  const canonicalRoot = resolve(rootCheck.stdout.trim().split(/\r?\n/)[0]!)

  // 3. Check for commits / HEAD validity
  const headShaCheck = await executeGit({
    cwd: canonicalRoot,
    args: ['rev-parse', '--verify', 'HEAD'],
  })

  const hasCommits = headShaCheck.exitCode === 0
  const headSha = hasCommits ? headShaCheck.stdout.trim() : undefined

  // 4. Check current branch and detached HEAD status
  let currentBranch: string | undefined
  let isDetachedHead = false

  if (hasCommits) {
    const branchCheck = await executeGit({
      cwd: canonicalRoot,
      args: ['symbolic-ref', '--short', 'HEAD'],
    })

    if (branchCheck.exitCode === 0) {
      currentBranch = branchCheck.stdout.trim()
      isDetachedHead = false
    } else {
      currentBranch = undefined
      isDetachedHead = true
    }
  } else {
    // Zero-commit repository: check if symbolic-ref points to an unborn branch
    const unbornCheck = await executeGit({
      cwd: canonicalRoot,
      args: ['symbolic-ref', '--short', 'HEAD'],
    })
    currentBranch = unbornCheck.exitCode === 0 ? unbornCheck.stdout.trim() : undefined
    isDetachedHead = false
  }

  // 5. Check upstream / tracking ref
  let upstreamRef: string | undefined
  if (currentBranch && hasCommits) {
    const upstreamCheck = await executeGit({
      cwd: canonicalRoot,
      args: ['rev-parse', '--abbrev-ref', '@{upstream}'],
    })
    if (upstreamCheck.exitCode === 0 && upstreamCheck.stdout.trim()) {
      upstreamRef = upstreamCheck.stdout.trim()
    }
  }

  // 6. Check remotes
  const remotesCheck = await executeGit({
    cwd: canonicalRoot,
    args: ['remote', '-v'],
  })
  const remotes = remotesCheck.exitCode === 0 ? parseGitRemotes(remotesCheck.stdout) : []

  // 7. Check working tree cleanliness via status --porcelain=v2
  const statusCheck = await executeGit({
    cwd: canonicalRoot,
    args: ['status', '--porcelain=v2'],
  })

  const { stagedCount, unstagedCount, untrackedCount } =
    statusCheck.exitCode === 0
      ? parsePorcelainStatusV2(statusCheck.stdout)
      : { stagedCount: 0, unstagedCount: 0, untrackedCount: 0 }

  const isClean = stagedCount === 0 && unstagedCount === 0 && untrackedCount === 0

  return {
    path: normalizedPath,
    exists: true,
    isGit: true,
    canonicalRoot,
    hasCommits,
    currentBranch,
    isDetachedHead,
    headSha,
    isClean,
    stagedCount,
    unstagedCount,
    untrackedCount,
    remotes,
    upstreamRef,
  }
}
