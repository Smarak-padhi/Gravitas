import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import { allocateWorktree, removeWorktree, runGit } from '@gravitas/git'
import { composeTaskWorktree, materializeVerifiedResult } from './composition.js'
import { CompositionConflictError } from './errors.js'
import { createTestRepo, type TestRepo } from './test-utils.js'

describe('Worktree Composition & Verified Result Materialization (composition.ts)', () => {
  let repo: TestRepo | null = null
  let runtimeRoot: string | null = null

  afterEach(async () => {
    if (repo) {
      await repo.cleanup()
      repo = null
    }
    if (runtimeRoot) {
      try {
        await rm(runtimeRoot, { recursive: true, force: true })
      } catch {
        // ignore
      }
      runtimeRoot = null
    }
  })

  it('materializes verified result commit with correct format and author', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-runtime-'))

    const alloc = await allocateWorktree({
      repository: repo.dir,
      runId: 'run_mat',
      taskId: 'task_mat_1',
      baseRef: repo.defaultBranch,
      runtimeRoot,
    })

    // Worker modifies a file without committing
    await writeFile(join(alloc.worktreePath, 'worker_output.txt'), 'worker output content\n', 'utf8')

    // Gravitas materializes the verified commit
    const commitSha = await materializeVerifiedResult({
      worktreePath: alloc.worktreePath,
      taskId: 'task_mat_1',
    })

    expect(commitSha).toMatch(/^[0-9a-f]{40}$/)

    // Verify commit message and author
    const logResult = await runGit({
      cwd: alloc.worktreePath,
      args: ['log', '-n', '1', '--format=%s%n%an%n%ae'],
    })

    const [subject, authorName, authorEmail] = logResult.stdout.trim().split('\n')
    expect(subject).toBe('gravitas: verified result task_mat_1')
    expect(authorName).toBe('Gravitas Engine')
    expect(authorEmail).toBe('engine@gravitas.local')

    await removeWorktree(alloc.worktreePath)
  })

  it('composes single parent worktree starting from parent result commit', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-runtime-'))

    // 1. Task 1 modifies file
    const alloc1 = await allocateWorktree({
      repository: repo.dir,
      runId: 'run_comp',
      taskId: 'task_1',
      baseRef: repo.defaultBranch,
      runtimeRoot,
    })
    await writeFile(join(alloc1.worktreePath, 't1_result.txt'), 'Task 1 data\n', 'utf8')
    const t1Sha = await materializeVerifiedResult({
      worktreePath: alloc1.worktreePath,
      taskId: 'task_1',
    })
    await removeWorktree(alloc1.worktreePath)

    // 2. Task 2 composes from Task 1
    const alloc2 = await composeTaskWorktree({
      repositoryRoot: repo.dir,
      runId: 'run_comp',
      taskId: 'task_2',
      baseRef: repo.defaultBranch,
      parentCommitShas: [t1Sha],
      runtimeRoot,
    })

    expect(alloc2.baseSha).toBe(t1Sha)

    // Verify t1_result.txt exists in Task 2 worktree
    const catResult = await runGit({
      cwd: alloc2.worktreePath,
      args: ['show', 'HEAD:t1_result.txt'],
    })
    expect(catResult.stdout).toBe('Task 1 data\n')

    await removeWorktree(alloc2.worktreePath)
  })

  it('composes multiple parents cleanly when changes are non-conflicting (diamond merge)', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-runtime-'))

    // Parent A modifies file_a.txt
    const allocA = await allocateWorktree({
      repository: repo.dir,
      runId: 'run_diamond',
      taskId: 'task_a',
      baseRef: repo.defaultBranch,
      runtimeRoot,
    })
    await writeFile(join(allocA.worktreePath, 'file_a.txt'), 'from parent A\n', 'utf8')
    const shaA = await materializeVerifiedResult({ worktreePath: allocA.worktreePath, taskId: 'task_a' })
    await removeWorktree(allocA.worktreePath)

    // Parent B modifies file_b.txt
    const allocB = await allocateWorktree({
      repository: repo.dir,
      runId: 'run_diamond',
      taskId: 'task_b',
      baseRef: repo.defaultBranch,
      runtimeRoot,
    })
    await writeFile(join(allocB.worktreePath, 'file_b.txt'), 'from parent B\n', 'utf8')
    const shaB = await materializeVerifiedResult({ worktreePath: allocB.worktreePath, taskId: 'task_b' })
    await removeWorktree(allocB.worktreePath)

    // Child task joins both parents
    const allocJoin = await composeTaskWorktree({
      repositoryRoot: repo.dir,
      runId: 'run_diamond',
      taskId: 'task_join',
      baseRef: repo.defaultBranch,
      parentCommitShas: [shaA, shaB],
      runtimeRoot,
    })

    // Both files should exist in the joined worktree
    const catA = await runGit({ cwd: allocJoin.worktreePath, args: ['show', 'HEAD:file_a.txt'] })
    const catB = await runGit({ cwd: allocJoin.worktreePath, args: ['show', 'HEAD:file_b.txt'] })
    expect(catA.stdout).toBe('from parent A\n')
    expect(catB.stdout).toBe('from parent B\n')

    await removeWorktree(allocJoin.worktreePath)
  })

  it('detects composition conflict and throws CompositionConflictError safely', async () => {
    repo = await createTestRepo()
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-runtime-'))

    // Parent A edits line 1 of shared.txt
    const allocA = await allocateWorktree({
      repository: repo.dir,
      runId: 'run_conflict',
      taskId: 'task_ca',
      baseRef: repo.defaultBranch,
      runtimeRoot,
    })
    await writeFile(join(allocA.worktreePath, 'shared.txt'), 'CONFLICT A OVERRIDE\nline 2: base line\n', 'utf8')
    const shaA = await materializeVerifiedResult({ worktreePath: allocA.worktreePath, taskId: 'task_ca' })
    await removeWorktree(allocA.worktreePath)

    // Parent B edits line 1 of shared.txt differently
    const allocB = await allocateWorktree({
      repository: repo.dir,
      runId: 'run_conflict',
      taskId: 'task_cb',
      baseRef: repo.defaultBranch,
      runtimeRoot,
    })
    await writeFile(join(allocB.worktreePath, 'shared.txt'), 'CONFLICT B OVERRIDE\nline 2: base line\n', 'utf8')
    const shaB = await materializeVerifiedResult({ worktreePath: allocB.worktreePath, taskId: 'task_cb' })
    await removeWorktree(allocB.worktreePath)

    // Child tries to compose conflicting parents
    await expect(
      composeTaskWorktree({
        repositoryRoot: repo.dir,
        runId: 'run_conflict',
        taskId: 'task_conflict_child',
        baseRef: repo.defaultBranch,
        parentCommitShas: [shaA, shaB],
        runtimeRoot,
      })
    ).rejects.toThrow(CompositionConflictError)
  })
})
