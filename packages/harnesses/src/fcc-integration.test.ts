import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { composePrompt } from '@gravitas/core'
import {
  allocateWorktree,
  executeGit,
  inspectRepository,
  removeWorktree,
} from '@gravitas/git'
import { FreeClaudeCodeHarness } from './free-claude-code.js'
import { captureWorktreeMutation, takeWorktreeSnapshot } from './mutation.js'

describe('Free Claude Code Real Worker Integration Proof (fcc-integration.test.ts)', () => {
  let primaryRepoPath: string
  let runtimeRoot: string

  beforeEach(async () => {
    primaryRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-fcc-fixture-primary-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-fcc-fixture-runtime-'))

    // 1. Initialize clean fixture repository
    await executeGit({ cwd: primaryRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.name', 'Gravitas Tester'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.email', 'tester@gravitas.local'] })

    // 2. Setup baseline files: package.json, README.md, src/math.js
    await writeFile(
      join(primaryRepoPath, 'package.json'),
      JSON.stringify({ name: 'fixture-project', version: '1.0.0' }, null, 2),
      'utf8'
    )
    await writeFile(
      join(primaryRepoPath, 'README.md'),
      '# Fixture Baseline\nControlled test repository.\n',
      'utf8'
    )
    await mkdir(join(primaryRepoPath, 'src'), { recursive: true })
    await writeFile(
      join(primaryRepoPath, 'src', 'math.js'),
      'export function add(a, b) {\n  return 0;\n}\n',
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

  it(
    'proves real FCC worker execution, in-scope worktree mutation, and absolute primary repo immutability',
    { timeout: 120000 },
    async () => {
      const harness = new FreeClaudeCodeHarness()

    // Step 0: Availability check
    const availability = await harness.availability()
    if (availability.status !== 'AVAILABLE') {
      throw new Error(
        `Precondition failed: FreeClaudeCodeHarness availability reports "${availability.status}". Message: ${availability.message}`
      )
    }

    // Step 1: Pre-execution primary inspection
    const primaryPreInspection = await inspectRepository(primaryRepoPath)
    expect(primaryPreInspection.isClean).toBe(true)
    const baseSha = primaryPreInspection.headSha
    expect(baseSha).toBeDefined()

    // Step 2: Allocate isolated task worktree
    const worktreeAlloc = await allocateWorktree({
      repository: primaryRepoPath,
      runId: 'wave3-fcc',
      taskId: 'implement-add',
      baseRef: 'HEAD',
      runtimeRoot,
    })

    expect(worktreeAlloc.worktreePath).not.toBe(primaryRepoPath)
    expect(worktreeAlloc.branch).toBe('gravitas/wave3-fcc/implement-add')

    // Step 3: Worktree pre-execution snapshot
    const beforeSnapshot = await takeWorktreeSnapshot(worktreeAlloc.worktreePath)
    expect(beforeSnapshot.isClean).toBe(true)
    expect(beforeSnapshot.headSha).toBe(baseSha)

    // Step 4: Canonical prompt composition
    const compiled = composePrompt({
      global: 'You are an automated coding worker. Implement requested changes directly in files.',
      project: 'JavaScript project with ES modules.',
      executionContract: 'Goal: Implement add(a, b) in src/math.js so it returns the sum of the two numeric arguments. Allowed: src/math.js. Forbidden: package.json, README.md, new files, commits.',
      task: 'Implement add(a, b) in src/math.js so it returns the sum of the two numeric arguments (a + b). Do not create commits. Do not edit other files.',
      agentRole: 'IMPLEMENTER: Modify only the specified file to satisfy the task goal.',
      runtimeContext: `Worktree: ${worktreeAlloc.worktreePath}\nBase SHA: ${baseSha}\nAllowed Path: src/math.js`,
    })

    const promptBytes = Buffer.from(compiled.prompt, 'utf8')
    const promptSha256 = createHash('sha256').update(promptBytes).digest('hex')

    // Step 5: Execute real FCC worker
    const startedAt = new Date().toISOString()
    const result = await harness.execute({
      executionId: 'exec-fcc-real-001',
      runId: 'wave3-fcc',
      taskId: 'implement-add',
      worktreePath: worktreeAlloc.worktreePath,
      compiledPrompt: compiled.prompt,
      timeoutMs: 120000,
      permissions: {
        allowFileEdits: true,
        allowedTools: ['Edit', 'Read'],
      },
    })

    // Step 6: Assertions on execution record
    expect(result.executionId).toBe('exec-fcc-real-001')
    expect(result.harnessId).toBe('free-claude-code')
    expect(result.durationMs).toBeGreaterThan(0)
    expect(result.worktreePath).toBe(worktreeAlloc.worktreePath)
    expect(result.terminationReason).toBe('COMPLETED')
    expect(result.exitCode).toBe(0)

    // Verify no provider secrets leaked into result
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('NVIDIA')
    expect(serialized).not.toContain('API_KEY')
    expect(serialized).not.toContain('AUTH_TOKEN')

    // Step 7: Capture mutations in worktree
    const mutation = await captureWorktreeMutation(
      worktreeAlloc.worktreePath,
      beforeSnapshot,
      ['src/math.js']
    )

    // Verify in-scope mutation
    expect(mutation.headMutated).toBe(false)
    expect(mutation.allowedChanges).toEqual(['src/math.js'])
    expect(mutation.unexpectedChanges).toEqual([])
    expect(mutation.changedFiles).toEqual(['src/math.js'])
    expect(mutation.diffSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(mutation.diff).toContain('math.js')

    // Read mutated file in worktree
    const mutatedContent = await readFile(join(worktreeAlloc.worktreePath, 'src', 'math.js'), 'utf8')
    expect(mutatedContent).not.toBe('export function add(a, b) {\n  return 0;\n}\n')

    // Step 8: Remove worktree safely
    await removeWorktree(worktreeAlloc.worktreePath, { force: true })

    // Step 9: PRIMARY REPOSITORY INVARIANT
    const primaryPostInspection = await inspectRepository(primaryRepoPath)
    expect(primaryPostInspection.isClean).toBe(true)
    expect(primaryPostInspection.headSha).toBe(baseSha)
    expect(primaryPostInspection.currentBranch).toBe(primaryPreInspection.currentBranch)
    expect(primaryPostInspection.untrackedCount).toBe(0)
    expect(primaryPostInspection.stagedCount).toBe(0)
    expect(primaryPostInspection.unstagedCount).toBe(0)

    // Primary src/math.js must remain untouched
    const primaryMath = await readFile(join(primaryRepoPath, 'src', 'math.js'), 'utf8')
    expect(primaryMath).toBe('export function add(a, b) {\n  return 0;\n}\n')

    // Log evidence metadata
    console.log('--- REAL FCC WORKER EVIDENCE RECORD ---')
    console.log('Prompt SHA-256:     ', promptSha256)
    console.log('Prompt byte length: ', promptBytes.length)
    console.log('Worker Duration ms: ', result.durationMs)
    console.log('Worker Exit Code:   ', result.exitCode)
    console.log('Worker Termination: ', result.terminationReason)
    console.log('Worker Stdout (1st 400 chars):\n', result.stdout.slice(0, 400))
    console.log('Worker Stderr (1st 400 chars):\n', result.stderr.slice(0, 400))
    console.log('Diff SHA-256:       ', mutation.diffSha256)
    console.log('Diff:\n', mutation.diff)
    console.log('Mutated Content:\n', mutatedContent)
  })
})
