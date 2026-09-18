import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { executeGit } from '@gravitas/git'
import {
  captureWorktreeMutation,
  normalizePathForScope,
  takeWorktreeSnapshot,
} from './mutation.js'

describe('Worktree Mutation & Change Scope Detection (mutation.ts)', () => {
  let tempRepoPath: string

  beforeEach(async () => {
    tempRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-mutation-test-'))
    await executeGit({ cwd: tempRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: tempRepoPath, args: ['config', 'user.name', 'Gravitas Tester'] })
    await executeGit({ cwd: tempRepoPath, args: ['config', 'user.email', 'tester@gravitas.local'] })

    // Create baseline file and commit
    await writeFile(join(tempRepoPath, 'README.md'), '# Baseline\n', 'utf8')
    await executeGit({ cwd: tempRepoPath, args: ['add', 'README.md'] })
    await executeGit({ cwd: tempRepoPath, args: ['commit', '-m', 'Initial commit'] })
  })

  afterEach(async () => {
    try {
      await rm(tempRepoPath, { recursive: true, force: true })
    } catch {
      // Best-effort cleanup
    }
  })

  describe('normalizePathForScope', () => {
    it('normalizes Windows backslashes and leading relative path segments', () => {
      expect(normalizePathForScope('src\\index.ts')).toBe('src/index.ts')
      expect(normalizePathForScope('.\\packages\\core\\index.ts')).toBe('packages/core/index.ts')
      expect(normalizePathForScope('README.md')).toBe('README.md')
    })
  })

  describe('takeWorktreeSnapshot', () => {
    it('captures accurate snapshot of clean worktree', async () => {
      const snapshot = await takeWorktreeSnapshot(tempRepoPath)

      expect(snapshot.isClean).toBe(true)
      expect(snapshot.branch).toBe('main')
      expect(snapshot.headSha).toMatch(/^[0-9a-f]{40}$/)
      expect(snapshot.fileList).toContain('README.md')
      expect(snapshot.stagedCount).toBe(0)
      expect(snapshot.unstagedCount).toBe(0)
      expect(snapshot.untrackedCount).toBe(0)
    })
  })

  describe('captureWorktreeMutation', () => {
    it('detects allowed file changes without false positive unexpected changes', async () => {
      const beforeSnapshot = await takeWorktreeSnapshot(tempRepoPath)

      // Worker modifies README.md
      await writeFile(join(tempRepoPath, 'README.md'), '# Baseline\nModified content\n', 'utf8')

      const capture = await captureWorktreeMutation(
        tempRepoPath,
        beforeSnapshot,
        ['README.md']
      )

      expect(capture.headMutated).toBe(false)
      expect(capture.changedFiles).toEqual(['README.md'])
      expect(capture.allowedChanges).toEqual(['README.md'])
      expect(capture.unexpectedChanges).toEqual([])
      expect(capture.diff).toContain('+Modified content')
      expect(capture.diffSha256).toMatch(/^[0-9a-f]{64}$/)
      expect(capture.afterSnapshot.isClean).toBe(false)
    })

    it('detects out-of-scope unexpected modifications and untracked files', async () => {
      const beforeSnapshot = await takeWorktreeSnapshot(tempRepoPath)

      // Worker modifies README.md (allowed) and creates unauthorized.txt (forbidden)
      await writeFile(join(tempRepoPath, 'README.md'), '# Baseline\nModified\n', 'utf8')
      await writeFile(join(tempRepoPath, 'unauthorized.txt'), 'leaked secret', 'utf8')

      const capture = await captureWorktreeMutation(
        tempRepoPath,
        beforeSnapshot,
        ['README.md']
      )

      expect(capture.headMutated).toBe(false)
      expect(capture.allowedChanges).toEqual(['README.md'])
      expect(capture.unexpectedChanges).toContain('unauthorized.txt')
      expect(capture.changedFiles.length).toBe(2)
      expect(capture.diffSha256).toMatch(/^[0-9a-f]{64}$/)
    })

    it('detects unexpected worker commit (HEAD mutation) and preserves diff across commits', async () => {
      const beforeSnapshot = await takeWorktreeSnapshot(tempRepoPath)

      // Worker unexpectedly commits changes directly
      await writeFile(join(tempRepoPath, 'README.md'), '# Baseline\nWorker Committed Directly\n', 'utf8')
      await executeGit({ cwd: tempRepoPath, args: ['add', 'README.md'] })
      await executeGit({ cwd: tempRepoPath, args: ['commit', '-m', 'Worker rogue commit'] })

      const capture = await captureWorktreeMutation(
        tempRepoPath,
        beforeSnapshot,
        ['README.md']
      )

      expect(capture.headMutated).toBe(true)
      expect(capture.beforeSnapshot.headSha).not.toBe(capture.afterSnapshot.headSha)
      expect(capture.diff).toContain('+Worker Committed Directly')
      expect(capture.diffSha256).toMatch(/^[0-9a-f]{64}$/)
    })
  })
})
