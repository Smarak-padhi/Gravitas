import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { composePrompt } from '@gravitas/core'
import {
  allocateWorktree,
  executeGit,
  inspectRepository,
  removeWorktree,
} from '@gravitas/git'
import { ClaudeCodeHarness } from './claude-code.js'
import { captureWorktreeMutation, takeWorktreeSnapshot } from './mutation.js'

describe('Claude Code Integration & Security Boundary (claude-integration.test.ts)', () => {
  let primaryRepoPath: string
  let runtimeRoot: string

  beforeEach(async () => {
    primaryRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-claude-primary-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-claude-runtime-'))

    // Initialize clean fixture repository
    await executeGit({ cwd: primaryRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.name', 'Gravitas Tester'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.email', 'tester@gravitas.local'] })

    // Create baseline files: package.json, src/math.js, README.md
    await writeFile(
      join(primaryRepoPath, 'package.json'),
      JSON.stringify({ name: 'fixture-project', version: '1.0.0' }, null, 2),
      'utf8'
    )
    await writeFile(
      join(primaryRepoPath, 'README.md'),
      '# Fixture Project\n\nBaseline readme.\n',
      'utf8'
    )
    await writeFile(
      join(primaryRepoPath, 'math.js'),
      'export function add(a, b) {\n  return a - b // intentional bug\n}\n',
      'utf8'
    )

    await executeGit({ cwd: primaryRepoPath, args: ['add', '.'] })
    await executeGit({ cwd: primaryRepoPath, args: ['commit', '-m', 'Initial baseline commit'] })
  })

  afterEach(async () => {
    try {
      await rm(primaryRepoPath, { recursive: true, force: true })
    } catch {
      // Best-effort
    }
    try {
      await rm(runtimeRoot, { recursive: true, force: true })
    } catch {
      // Best-effort
    }
  })

  it('proves working directory security boundary: executes Claude Code against disposable worktree while preserving primary repo', async () => {
    const harness = new ClaudeCodeHarness()
    const availability = await harness.availability()

    // 1. Primary repo pre-execution baseline
    const primaryPreInspection = await inspectRepository(primaryRepoPath)
    expect(primaryPreInspection.isClean).toBe(true)
    const initialHead = primaryPreInspection.headSha

    // 2. Allocate isolated task worktree in disposable runtime root
    const worktreeAlloc = await allocateWorktree({
      repository: primaryRepoPath,
      runId: 'run-w3',
      taskId: 'task-fix-math',
      baseRef: 'HEAD',
      runtimeRoot,
    })

    expect(worktreeAlloc.worktreePath).not.toBe(primaryRepoPath)
    expect(worktreeAlloc.branch).toBe('gravitas/run-w3/task-fix-math')

    // 3. Pre-execution snapshot of the worktree
    const beforeSnapshot = await takeWorktreeSnapshot(worktreeAlloc.worktreePath)
    expect(beforeSnapshot.isClean).toBe(true)
    expect(beforeSnapshot.headSha).toBe(initialHead)

    // 4. Compose prompt using canonical prompt composition boundary
    const compiled = composePrompt({
      global: 'You are an automated coding worker. Implement requested changes.',
      task: 'Fix subtraction bug in math.js add function so that it returns a + b.',
    })

    // 5. Execute Claude Code harness against the worktree
    const result = await harness.execute({
      executionId: 'exec-w3-001',
      runId: 'run-w3',
      taskId: 'task-fix-math',
      worktreePath: worktreeAlloc.worktreePath,
      compiledPrompt: compiled.prompt,
      timeoutMs: 30000,
      permissions: {
        allowFileEdits: true,
        allowedTools: ['Edit', 'Read'],
      },
    })

    // 6. Assertions on worker execution telemetry
    expect(result.executionId).toBe('exec-w3-001')
    expect(result.harnessId).toBe('claude-code')
    expect(result.durationMs).toBeGreaterThan(0)
    expect(result.worktreePath).toBe(worktreeAlloc.worktreePath)
    expect(['COMPLETED', 'TIMEOUT', 'PROCESS_ERROR']).toContain(result.terminationReason)

    // Host awareness: In this test environment, claude is installed but unauthenticated
    if (availability.status === 'AUTH_REQUIRED') {
      expect(result.exitCode).toBe(1)
      expect(result.stdout).toContain('Not logged in')
    }

    // 7. Capture mutation against worktree
    const mutation = await captureWorktreeMutation(
      worktreeAlloc.worktreePath,
      beforeSnapshot,
      ['math.js']
    )

    expect(mutation.beforeSnapshot.headSha).toBe(initialHead)
    expect(typeof mutation.diffSha256).toBe('string')
    expect(mutation.diffSha256).toMatch(/^[0-9a-f]{64}$/)

    // 8. Safely remove the worktree (using force: true if worker left uncommitted edits)
    await removeWorktree(worktreeAlloc.worktreePath, { force: true })

    // 9. CRITICAL SECURITY INVARIANT: Primary repository is completely untouched
    const primaryPostInspection = await inspectRepository(primaryRepoPath)
    expect(primaryPostInspection.isClean).toBe(true)
    expect(primaryPostInspection.headSha).toBe(initialHead)
    expect(primaryPostInspection.untrackedCount).toBe(0)
    expect(primaryPostInspection.stagedCount).toBe(0)
    expect(primaryPostInspection.unstagedCount).toBe(0)
  })
})
