import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it, expect, afterEach } from 'vitest'
import { UnsafeRefError, WorktreeAllocationError } from './errors.js'
import { inspectRepository } from './inspector.js'
import { runGit } from './process.js'
import { createDisposableRepo, type DisposableRepo } from './test-fixture.js'
import { allocateWorktree, inspectWorktree, removeWorktree } from './worktree.js'

describe('Git Integration Tests (Real Git Subprocess)', () => {
  const cleanups: Array<() => Promise<void>> = []

  afterEach(async () => {
    while (cleanups.length > 0) {
      const fn = cleanups.pop()
      if (fn) {
        await fn()
      }
    }
  })

  // Helper to manage disposable directories
  async function makeTempDir(prefix: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), prefix))
    cleanups.push(async () => {
      try {
        await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
      } catch {
        // ignore cleanup error
      }
    })
    return dir
  }

  describe('Repository Inspector', () => {
    it('accurately inspects a clean repository with commits', async () => {
      const repo = await createDisposableRepo()
      cleanups.push(repo.cleanup)

      const inspection = await inspectRepository(repo.dir)

      expect(inspection.exists).toBe(true)
      expect(inspection.isGit).toBe(true)
      expect(inspection.hasCommits).toBe(true)
      expect(inspection.headSha).toBe(repo.baseSha)
      expect(inspection.currentBranch).toBe('main')
      expect(inspection.isDetachedHead).toBe(false)
      expect(inspection.isClean).toBe(true)
      expect(inspection.stagedCount).toBe(0)
      expect(inspection.unstagedCount).toBe(0)
      expect(inspection.untrackedCount).toBe(0)
    })

    it('accurately detects unstaged modifications (dirty)', async () => {
      const repo = await createDisposableRepo()
      cleanups.push(repo.cleanup)

      await writeFile(join(repo.dir, 'README.md'), 'Modified README content\n', 'utf8')

      const inspection = await inspectRepository(repo.dir)
      expect(inspection.isClean).toBe(false)
      expect(inspection.unstagedCount).toBe(1)
      expect(inspection.stagedCount).toBe(0)
      expect(inspection.untrackedCount).toBe(0)
    })

    it('accurately detects staged modifications (dirty)', async () => {
      const repo = await createDisposableRepo()
      cleanups.push(repo.cleanup)

      await writeFile(join(repo.dir, 'README.md'), 'Staged README content\n', 'utf8')
      await runGit({ cwd: repo.dir, args: ['add', 'README.md'] })

      const inspection = await inspectRepository(repo.dir)
      expect(inspection.isClean).toBe(false)
      expect(inspection.stagedCount).toBe(1)
      expect(inspection.unstagedCount).toBe(0)
    })

    it('accurately detects untracked files (dirty)', async () => {
      const repo = await createDisposableRepo()
      cleanups.push(repo.cleanup)

      await writeFile(join(repo.dir, 'new-scratch-file.txt'), 'Untracked\n', 'utf8')

      const inspection = await inspectRepository(repo.dir)
      expect(inspection.isClean).toBe(false)
      expect(inspection.untrackedCount).toBe(1)
    })

    it('accurately identifies detached HEAD state', async () => {
      const repo = await createDisposableRepo()
      cleanups.push(repo.cleanup)

      await runGit({ cwd: repo.dir, args: ['checkout', repo.baseSha] })

      const inspection = await inspectRepository(repo.dir)
      expect(inspection.isGit).toBe(true)
      expect(inspection.hasCommits).toBe(true)
      expect(inspection.headSha).toBe(repo.baseSha)
      expect(inspection.isDetachedHead).toBe(true)
      expect(inspection.currentBranch).toBeUndefined()
    })

    it('accurately handles initialized repository with zero commits', async () => {
      const emptyDir = await makeTempDir('gravitas-empty-repo-')
      await runGit({ cwd: emptyDir, args: ['init', '-b', 'main'] })

      const inspection = await inspectRepository(emptyDir)
      expect(inspection.exists).toBe(true)
      expect(inspection.isGit).toBe(true)
      expect(inspection.hasCommits).toBe(false)
      expect(inspection.headSha).toBeUndefined()
      expect(inspection.currentBranch).toBe('main')
      expect(inspection.isDetachedHead).toBe(false)
    })

    it('accurately identifies non-Git directory', async () => {
      const plainDir = await makeTempDir('gravitas-plain-dir-')

      const inspection = await inspectRepository(plainDir)
      expect(inspection.exists).toBe(true)
      expect(inspection.isGit).toBe(false)
      expect(inspection.hasCommits).toBe(false)
    })

    it('accurately identifies nonexistent path', async () => {
      const nonExistent = join(tmpdir(), 'gravitas-non-existent-dir-12345678')
      const inspection = await inspectRepository(nonExistent)
      expect(inspection.exists).toBe(false)
      expect(inspection.isGit).toBe(false)
    })
  })

  describe('Two-Worktree Isolation Proof (Section 9 Mandatory Acceptance Gate)', () => {
    it('proves complete physical and branch isolation across two worktrees and primary repo', async () => {
      const primaryRepo = await createDisposableRepo()
      cleanups.push(primaryRepo.cleanup)

      const runtimeRoot = await makeTempDir('gravitas-runtime-root-')

      // 1. Allocate Worktree A
      const allocA = await allocateWorktree({
        repository: primaryRepo.dir,
        baseRef: 'main',
        runId: 'run-001',
        taskId: 'task-a',
        runtimeRoot,
      })

      // 2. Allocate Worktree B
      const allocB = await allocateWorktree({
        repository: primaryRepo.dir,
        baseRef: 'main',
        runId: 'run-001',
        taskId: 'task-b',
        runtimeRoot,
      })

      // Both start at primaryRepo.baseSha
      expect(allocA.baseSha).toBe(primaryRepo.baseSha)
      expect(allocB.baseSha).toBe(primaryRepo.baseSha)
      expect(allocA.branch).toBe('gravitas/run-001/task-a')
      expect(allocB.branch).toBe('gravitas/run-001/task-b')

      // Modify in A: src/a.txt
      const fileAInWorktreeA = join(allocA.worktreePath, 'src', 'a.txt')
      await writeFile(fileAInWorktreeA, 'Content produced solely by Task A\n', 'utf8')

      // Modify in B: src/b.txt
      const fileBInWorktreeB = join(allocB.worktreePath, 'src', 'b.txt')
      await writeFile(fileBInWorktreeB, 'Content produced solely by Task B\n', 'utf8')

      // -------------------------------------------------------------
      // PROVE PRIMARY REPOSITORY REMAINS UNTOUCHED AND ISOLATED
      // -------------------------------------------------------------
      const fileAInPrimary = join(primaryRepo.dir, 'src', 'a.txt')
      const fileBInPrimary = join(primaryRepo.dir, 'src', 'b.txt')
      expect(existsSync(fileAInPrimary)).toBe(false)
      expect(existsSync(fileBInPrimary)).toBe(false)

      const primaryInspection = await inspectRepository(primaryRepo.dir)
      expect(primaryInspection.currentBranch).toBe('main')
      expect(primaryInspection.headSha).toBe(primaryRepo.baseSha)
      expect(primaryInspection.isClean).toBe(true)
      expect(primaryInspection.stagedCount).toBe(0)
      expect(primaryInspection.unstagedCount).toBe(0)
      expect(primaryInspection.untrackedCount).toBe(0)

      // -------------------------------------------------------------
      // PROVE WORKTREE A ISOLATION
      // -------------------------------------------------------------
      expect(existsSync(fileAInWorktreeA)).toBe(true)
      const fileBInWorktreeA = join(allocA.worktreePath, 'src', 'b.txt')
      expect(existsSync(fileBInWorktreeA)).toBe(false)

      const inspA = await inspectWorktree(allocA.worktreePath)
      expect(inspA.branch).toBe('gravitas/run-001/task-a')
      expect(inspA.headSha).toBe(primaryRepo.baseSha)
      expect(inspA.isClean).toBe(false) // has untracked src/a.txt
      expect(inspA.untrackedCount).toBe(1)

      // -------------------------------------------------------------
      // PROVE WORKTREE B ISOLATION
      // -------------------------------------------------------------
      expect(existsSync(fileBInWorktreeB)).toBe(true)
      const fileAInWorktreeB = join(allocB.worktreePath, 'src', 'a.txt')
      expect(existsSync(fileAInWorktreeB)).toBe(false)

      const inspB = await inspectWorktree(allocB.worktreePath)
      expect(inspB.branch).toBe('gravitas/run-001/task-b')
      expect(inspB.headSha).toBe(primaryRepo.baseSha)
      expect(inspB.isClean).toBe(false) // has untracked src/b.txt
      expect(inspB.untrackedCount).toBe(1)
    })
  })

  describe('Windows-Specific Proof (Paths with Spaces)', () => {
    it('handles paths with spaces in repository root and runtime root without shell escaping bugs', async () => {
      const baseDir = await makeTempDir('gravitas-spaces-')
      const targetRepoWithSpaces = join(baseDir, 'Gravitas Integration Test Target Repo')
      const runtimeWithSpaces = join(baseDir, 'Gravitas Runtime Directory With Spaces')

      const repo = await createDisposableRepo({ customDir: targetRepoWithSpaces })
      cleanups.push(repo.cleanup)

      const alloc = await allocateWorktree({
        repository: targetRepoWithSpaces,
        baseRef: 'main',
        runId: 'run-space-01',
        taskId: 'task-alpha',
        runtimeRoot: runtimeWithSpaces,
      })

      expect(alloc.worktreePath).toContain('Gravitas Runtime Directory With Spaces')
      expect(alloc.baseSha).toBe(repo.baseSha)
      expect(alloc.branch).toBe('gravitas/run-space-01/task-alpha')

      // Verify worktree exists and can perform operations
      const testFilePath = join(alloc.worktreePath, 'src', 'space-test.txt')
      await writeFile(testFilePath, 'Tested in path with spaces\n', 'utf8')
      expect(existsSync(testFilePath)).toBe(true)

      const insp = await inspectWorktree(alloc.worktreePath)
      expect(insp.isClean).toBe(false)
      expect(insp.untrackedCount).toBe(1)

      // Verify primary repo is clean
      const primaryInsp = await inspectRepository(targetRepoWithSpaces)
      expect(primaryInsp.isClean).toBe(true)
    })
  })

  describe('Worktree Removal Policy & Dirty Protection', () => {
    it('refuses removal if worktree has uncommitted changes, preserving work', async () => {
      const repo = await createDisposableRepo()
      cleanups.push(repo.cleanup)
      const runtimeRoot = await makeTempDir('gravitas-removal-runtime-')

      const alloc = await allocateWorktree({
        repository: repo.dir,
        baseRef: 'main',
        runId: 'run-rm-01',
        taskId: 'task-dirty',
        runtimeRoot,
      })

      // Write uncommitted file in task worktree
      const uncommittedFile = join(alloc.worktreePath, 'uncommitted-work.txt')
      await writeFile(uncommittedFile, 'Important uncommitted task progress\n', 'utf8')

      // Attempt removal
      const removalResult = await removeWorktree(alloc.worktreePath)

      // Must REFUSE
      expect(removalResult.success).toBe(false)
      expect(removalResult.refusalReason).toContain('Worktree has uncommitted changes')

      // File and directory must be completely intact
      expect(existsSync(uncommittedFile)).toBe(true)
      expect(existsSync(alloc.worktreePath)).toBe(true)
    })

    it('succeeds removal when worktree is clean, preserving task branch in primary repo', async () => {
      const repo = await createDisposableRepo()
      cleanups.push(repo.cleanup)
      const runtimeRoot = await makeTempDir('gravitas-removal-runtime-')

      const alloc = await allocateWorktree({
        repository: repo.dir,
        baseRef: 'main',
        runId: 'run-rm-02',
        taskId: 'task-clean',
        runtimeRoot,
      })

      expect(existsSync(alloc.worktreePath)).toBe(true)

      // Remove clean worktree
      const removalResult = await removeWorktree(alloc.worktreePath)
      expect(removalResult.success).toBe(true)

      // Worktree working tree directory is removed
      expect(existsSync(alloc.worktreePath)).toBe(false)

      // Task branch MUST still exist in primary repository (not deleted)
      const branchCheck = await runGit({
        cwd: repo.dir,
        args: ['rev-parse', '--verify', `refs/heads/${alloc.branch}`],
      })
      expect(branchCheck.stdout.trim()).toBe(repo.baseSha)
    })
  })

  describe('Failure and Precondition Rollback Modes', () => {
    it('refuses allocation on dirty primary repository to protect user work', async () => {
      const repo = await createDisposableRepo()
      cleanups.push(repo.cleanup)
      const runtimeRoot = await makeTempDir('gravitas-runtime-dirty-')

      // Dirty primary repo
      await writeFile(join(repo.dir, 'user-dirty-change.txt'), 'User work in progress\n', 'utf8')

      await expect(
        allocateWorktree({
          repository: repo.dir,
          baseRef: 'main',
          runId: 'run-dirty-01',
          taskId: 'task-1',
          runtimeRoot,
        })
      ).rejects.toThrow(WorktreeAllocationError)

      // Confirm user work is untouched
      expect(existsSync(join(repo.dir, 'user-dirty-change.txt'))).toBe(true)
    })

    it('refuses allocation on non-Git directory', async () => {
      const plainDir = await makeTempDir('gravitas-non-git-')
      const runtimeRoot = await makeTempDir('gravitas-runtime-')

      await expect(
        allocateWorktree({
          repository: plainDir,
          baseRef: 'main',
          runId: 'run-01',
          taskId: 'task-1',
          runtimeRoot,
        })
      ).rejects.toThrow(WorktreeAllocationError)
    })

    it('refuses allocation on zero-commit repository', async () => {
      const emptyRepo = await makeTempDir('gravitas-zero-commit-')
      await runGit({ cwd: emptyRepo, args: ['init', '-b', 'main'] })
      const runtimeRoot = await makeTempDir('gravitas-runtime-')

      await expect(
        allocateWorktree({
          repository: emptyRepo,
          baseRef: 'main',
          runId: 'run-01',
          taskId: 'task-1',
          runtimeRoot,
        })
      ).rejects.toThrow(WorktreeAllocationError)
    })

    it('refuses allocation with unresolvable baseRef', async () => {
      const repo = await createDisposableRepo()
      cleanups.push(repo.cleanup)
      const runtimeRoot = await makeTempDir('gravitas-runtime-')

      await expect(
        allocateWorktree({
          repository: repo.dir,
          baseRef: 'non-existent-base-branch-404',
          runId: 'run-01',
          taskId: 'task-1',
          runtimeRoot,
        })
      ).rejects.toThrow(WorktreeAllocationError)
    })

    it('refuses duplicate allocation when task branch already exists', async () => {
      const repo = await createDisposableRepo()
      cleanups.push(repo.cleanup)
      const runtimeRoot = await makeTempDir('gravitas-runtime-')

      // First allocation succeeds
      await allocateWorktree({
        repository: repo.dir,
        baseRef: 'main',
        runId: 'run-dup-01',
        taskId: 'task-alpha',
        runtimeRoot,
      })

      // Second allocation with same runId and taskId must fail
      await expect(
        allocateWorktree({
          repository: repo.dir,
          baseRef: 'main',
          runId: 'run-dup-01',
          taskId: 'task-alpha',
          runtimeRoot,
        })
      ).rejects.toThrow(WorktreeAllocationError)
    })

    it('refuses allocation when runId or taskId is unsafe', async () => {
      const repo = await createDisposableRepo()
      cleanups.push(repo.cleanup)
      const runtimeRoot = await makeTempDir('gravitas-runtime-')

      await expect(
        allocateWorktree({
          repository: repo.dir,
          baseRef: 'main',
          runId: '../traversal-run',
          taskId: 'task-1',
          runtimeRoot,
        })
      ).rejects.toThrow(UnsafeRefError)

      await expect(
        allocateWorktree({
          repository: repo.dir,
          baseRef: 'main',
          runId: 'run-1',
          taskId: '-flag-injection',
          runtimeRoot,
        })
      ).rejects.toThrow(UnsafeRefError)
    })
  })
})
