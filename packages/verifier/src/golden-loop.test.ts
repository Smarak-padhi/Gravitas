/**
 * Controlled Deterministic Golden Loop Proof for Wave 4.
 *
 * Requirements:
 * - Shell-free execution.
 * - Zero network access, zero external dependencies, zero AI/provider calls.
 * - Node built-in test runner (node --test) inside task worktree.
 * - Proves: Worker claim != Verification Authority.
 * - Proves: Unexpected mutation blocks approval even if tests pass.
 * - Proves: Primary repository remains pristine.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Task, TaskState, transitionTask } from '@gravitas/core'
import {
  allocateWorktree,
  executeGit,
  inspectRepository,
  removeWorktree,
} from '@gravitas/git'
import { captureWorktreeMutation, takeWorktreeSnapshot } from '@gravitas/harnesses'
import { writeEvidenceBundle } from './evidence.js'
import { applyVerificationOutcome } from './state-authority.js'
import type { VerificationPlan } from './types.js'
import { executeVerification } from './verifier.js'

describe('Wave 4 Controlled Golden Loop Proof (golden-loop.test.ts)', () => {
  let primaryRepoPath: string
  let runtimeRoot: string

  beforeEach(async () => {
    primaryRepoPath = await mkdtemp(join(tmpdir(), 'gravitas-golden-fixture-'))
    runtimeRoot = await mkdtemp(join(tmpdir(), 'gravitas-golden-runtime-'))

    // 1. Initialize clean fixture repository
    await executeGit({ cwd: primaryRepoPath, args: ['init', '-b', 'main'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.name', 'Golden Tester'] })
    await executeGit({ cwd: primaryRepoPath, args: ['config', 'user.email', 'tester@golden.local'] })

    // 2. Add package.json
    await writeFile(
      join(primaryRepoPath, 'package.json'),
      JSON.stringify({ name: 'golden-fixture', type: 'module', version: '1.0.0' }, null, 2),
      'utf8'
    )

    // 3. Add baseline src/math.js (returns 0)
    await mkdir(join(primaryRepoPath, 'src'), { recursive: true })
    await writeFile(
      join(primaryRepoPath, 'src', 'math.js'),
      'export function add(a, b) {\n  return 0;\n}\n',
      'utf8'
    )

    // 4. Add deterministic unit test suite using node:test
    await mkdir(join(primaryRepoPath, 'test'), { recursive: true })
    await writeFile(
      join(primaryRepoPath, 'test', 'math.test.js'),
      `import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../src/math.js';

test('add positive numbers', () => {
  assert.equal(add(2, 3), 5);
});

test('add with zero and negative', () => {
  assert.equal(add(-2, 2), 0);
});

test('add decimals', () => {
  assert.equal(add(1.5, 2.5), 4);
});
`,
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

  function buildTestPlan(): VerificationPlan {
    return {
      id: 'plan-golden-math',
      commands: [
        {
          id: 'node-test-suite',
          executable: process.execPath,
          args: ['--test', 'test/math.test.js'],
          mandatory: true,
          timeoutMs: 15000,
        },
      ],
    }
  }

  it('SUCCESS PROOF: deterministic verified candidate transitions RUNNING -> VERIFYING -> WAITING_APPROVAL', async () => {
    // 1. Allocate isolated task worktree under external runtimeRoot
    const worktreeAlloc = await allocateWorktree({
      repository: primaryRepoPath,
      runId: 'golden-run-01',
      taskId: 'task-add-feature',
      baseRef: 'HEAD',
      runtimeRoot,
    })

    expect(worktreeAlloc.worktreePath.startsWith(runtimeRoot)).toBe(true)
    expect(worktreeAlloc.worktreePath.startsWith(primaryRepoPath)).toBe(false)

    // 2. Pre-execution snapshot
    const beforeSnapshot = await takeWorktreeSnapshot(worktreeAlloc.worktreePath)
    expect(beforeSnapshot.isClean).toBe(true)

    // 3. Task starts in RUNNING
    let task: Task = {
      id: 'task-add-feature',
      title: 'Implement add(a, b)',
      description: 'Implement math add in src/math.js',
      assignedRole: 'BACKEND_DEVELOPER',
      dependencies: [],
      acceptanceCriteria: [],
      evidenceRequirements: [],
      state: 'RUNNING' as TaskState,
      requiresApproval: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // 4. Apply candidate mutation to worktree: return a + b;
    await writeFile(
      join(worktreeAlloc.worktreePath, 'src', 'math.js'),
      'export function add(a, b) {\n  return a + b;\n}\n',
      'utf8'
    )

    // 5. Capture mutation
    const mutation = await captureWorktreeMutation(
      worktreeAlloc.worktreePath,
      beforeSnapshot,
      ['src/math.js']
    )
    expect(mutation.headMutated).toBe(false)
    expect(mutation.allowedChanges).toEqual(['src/math.js'])
    expect(mutation.unexpectedChanges).toEqual([])

    // 6. Transition task: RUNNING -> VERIFYING
    const verifyingTransition = transitionTask(task, 'VERIFYING', {
      reason: 'Worker finished candidate changes; entering independent verification.',
    })
    task = verifyingTransition.task
    expect(task.state).toBe('VERIFYING')

    // 7. Execute independent verification via Gravitas verifier
    const plan = buildTestPlan()
    const verification = await executeVerification({
      plan,
      worktreePath: worktreeAlloc.worktreePath,
    })

    expect(verification.status).toBe('PASSED')
    expect(verification.commands[0]?.exitCode).toBe(0)
    expect(verification.commands[0]?.terminationReason).toBe('COMPLETED')
    expect(verification.verifierGeneratedChanges).toEqual([])

    // 8. Apply verification outcome via State Authority
    const outcomeTransition = applyVerificationOutcome({
      task,
      verification,
      mutation,
    })
    task = outcomeTransition.task

    // Assert task reaches WAITING_APPROVAL (never auto-approved)
    expect(task.state).toBe('WAITING_APPROVAL')
    expect(task.state).not.toBe('APPROVED')

    // 9. Write complete external evidence bundle
    const evidence = await writeEvidenceBundle({
      runtimeRoot,
      runId: 'golden-run-01',
      taskId: 'task-add-feature',
      goal: 'Implement addition in math.js',
      repositoryPath: primaryRepoPath,
      baseBranch: 'main',
      baseSha: beforeSnapshot.headSha,
      taskBranch: worktreeAlloc.branch,
      worktreePath: worktreeAlloc.worktreePath,
      worker: {
        harnessId: 'free-claude-code',
        executionId: 'exec-mock-01',
        exitCode: 0,
        terminationReason: 'COMPLETED',
        durationMs: 15400,
        promptSha256: createHash('sha256').update('MOCK_PROMPT').digest('hex'),
      },
      mutation,
      verification,
      finalTaskState: task.state,
    })

    expect(evidence.manifest.verification.status).toBe('PASSED')
    expect(evidence.manifest.finalTaskState).toBe('WAITING_APPROVAL')

    // 10. Clean up worktree and assert PRIMARY REPOSITORY ISOLATION
    await removeWorktree(worktreeAlloc.worktreePath, { force: true })
    const primaryInspection = await inspectRepository(primaryRepoPath)
    expect(primaryInspection.isClean).toBe(true)
    expect(primaryInspection.headSha).toBe(beforeSnapshot.headSha)
    const primaryMath = await readFile(join(primaryRepoPath, 'src', 'math.js'), 'utf8')
    expect(primaryMath).toBe('export function add(a, b) {\n  return 0;\n}\n')
  })

  it('NON-APPROVAL PROOF: verification PASS with requiresApproval=false transitions directly to SUCCEEDED', async () => {
    const worktreeAlloc = await allocateWorktree({
      repository: primaryRepoPath,
      runId: 'golden-run-02',
      taskId: 'task-no-approval',
      baseRef: 'HEAD',
      runtimeRoot,
    })

    const beforeSnapshot = await takeWorktreeSnapshot(worktreeAlloc.worktreePath)

    let task: Task = {
      id: 'task-no-approval',
      title: 'Automated task',
      description: 'Does not require human approval',
      assignedRole: 'BACKEND_DEVELOPER',
      dependencies: [],
      acceptanceCriteria: [],
      evidenceRequirements: [],
      state: 'VERIFYING' as TaskState,
      requiresApproval: false, // NO HUMAN APPROVAL REQUIRED
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Apply good candidate
    await writeFile(
      join(worktreeAlloc.worktreePath, 'src', 'math.js'),
      'export function add(a, b) {\n  return a + b;\n}\n',
      'utf8'
    )

    const mutation = await captureWorktreeMutation(
      worktreeAlloc.worktreePath,
      beforeSnapshot,
      ['src/math.js']
    )

    const verification = await executeVerification({
      plan: buildTestPlan(),
      worktreePath: worktreeAlloc.worktreePath,
    })
    expect(verification.status).toBe('PASSED')

    const result = applyVerificationOutcome({ task, verification, mutation })
    expect(result.task.state).toBe('SUCCEEDED')
    expect(result.task.state).not.toBe('WAITING_APPROVAL')

    await removeWorktree(worktreeAlloc.worktreePath, { force: true })
  })

  it('CRITICAL NEGATIVE PROOF: worker claims success, but failing verifier transitions task to FAILED', async () => {
    const worktreeAlloc = await allocateWorktree({
      repository: primaryRepoPath,
      runId: 'golden-run-03',
      taskId: 'task-bad-worker',
      baseRef: 'HEAD',
      runtimeRoot,
    })

    const beforeSnapshot = await takeWorktreeSnapshot(worktreeAlloc.worktreePath)

    let task: Task = {
      id: 'task-bad-worker',
      title: 'Buggy task',
      description: 'Worker introduces bug',
      assignedRole: 'BACKEND_DEVELOPER',
      dependencies: [],
      acceptanceCriteria: [],
      evidenceRequirements: [],
      state: 'VERIFYING' as TaskState,
      requiresApproval: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // WORKER SIMULATION:
    // Worker says: "I have completed the task. All tests pass!"
    const workerClaim = 'Done. Tests pass perfectly.'
    expect(workerClaim).toBeDefined()

    // BUT worker writes a buggy candidate: return a - b;
    await writeFile(
      join(worktreeAlloc.worktreePath, 'src', 'math.js'),
      'export function add(a, b) {\n  return a - b;\n}\n',
      'utf8'
    )

    const mutation = await captureWorktreeMutation(
      worktreeAlloc.worktreePath,
      beforeSnapshot,
      ['src/math.js']
    )

    // Independent verification runs
    const plan = buildTestPlan()
    const verification = await executeVerification({
      plan,
      worktreePath: worktreeAlloc.worktreePath,
    })

    // Assert verifier failed
    expect(verification.status).toBe('FAILED')
    expect(verification.commands[0]?.exitCode).not.toBe(0)

    // State authority applies outcome
    const outcome = applyVerificationOutcome({ task, verification, mutation })
    task = outcome.task

    // Assert task MUST be FAILED and NEVER reach WAITING_APPROVAL, SUCCEEDED, or APPROVED
    expect(task.state).toBe('FAILED')
    expect(task.state).not.toBe('WAITING_APPROVAL')
    expect(task.state).not.toBe('SUCCEEDED')
    expect(task.state).not.toBe('APPROVED')

    await removeWorktree(worktreeAlloc.worktreePath, { force: true })
  })

  it('MUTATION GATE PROOF: unexpected file modification blocks approval even when verifier tests pass', async () => {
    const worktreeAlloc = await allocateWorktree({
      repository: primaryRepoPath,
      runId: 'golden-run-04',
      taskId: 'task-unexpected-file',
      baseRef: 'HEAD',
      runtimeRoot,
    })

    const beforeSnapshot = await takeWorktreeSnapshot(worktreeAlloc.worktreePath)

    let task: Task = {
      id: 'task-unexpected-file',
      title: 'Tainted task',
      description: 'Worker mutates unexpected path',
      assignedRole: 'BACKEND_DEVELOPER',
      dependencies: [],
      acceptanceCriteria: [],
      evidenceRequirements: [],
      state: 'VERIFYING' as TaskState,
      requiresApproval: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Worker modifies math.js correctly...
    await writeFile(
      join(worktreeAlloc.worktreePath, 'src', 'math.js'),
      'export function add(a, b) {\n  return a + b;\n}\n',
      'utf8'
    )
    // ...BUT also creates an unauthorized rogue file!
    await mkdir(join(worktreeAlloc.worktreePath, '.rogue_daemon'), { recursive: true })
    await writeFile(
      join(worktreeAlloc.worktreePath, '.rogue_daemon', 'leak.json'),
      JSON.stringify({ pid: 9999 }),
      'utf8'
    )

    const mutation = await captureWorktreeMutation(
      worktreeAlloc.worktreePath,
      beforeSnapshot,
      ['src/math.js']
    )
    expect(mutation.unexpectedChanges.length).toBeGreaterThan(0)

    // Independent verifier passes because tests only check math.js!
    const plan = buildTestPlan()
    const verification = await executeVerification({
      plan,
      worktreePath: worktreeAlloc.worktreePath,
    })
    expect(verification.status).toBe('PASSED')

    // State authority MUST reject the candidate due to the mutation gate
    const outcome = applyVerificationOutcome({ task, verification, mutation })
    expect(outcome.task.state).toBe('FAILED')
    expect(outcome.task.state).not.toBe('WAITING_APPROVAL')
    expect(outcome.task.state).not.toBe('APPROVED')

    await removeWorktree(worktreeAlloc.worktreePath, { force: true })
  })

  it('MUTATION GATE PROOF: rogue worker Git commit blocks approval even when verifier tests pass', async () => {
    const worktreeAlloc = await allocateWorktree({
      repository: primaryRepoPath,
      runId: 'golden-run-05',
      taskId: 'task-rogue-commit',
      baseRef: 'HEAD',
      runtimeRoot,
    })

    const beforeSnapshot = await takeWorktreeSnapshot(worktreeAlloc.worktreePath)

    let task: Task = {
      id: 'task-rogue-commit',
      title: 'Rogue commit task',
      description: 'Worker makes rogue commit',
      assignedRole: 'BACKEND_DEVELOPER',
      dependencies: [],
      acceptanceCriteria: [],
      evidenceRequirements: [],
      state: 'VERIFYING' as TaskState,
      requiresApproval: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Worker modifies math.js correctly and commits it to HEAD
    await writeFile(
      join(worktreeAlloc.worktreePath, 'src', 'math.js'),
      'export function add(a, b) {\n  return a + b;\n}\n',
      'utf8'
    )
    await executeGit({ cwd: worktreeAlloc.worktreePath, args: ['add', '.'] })
    await executeGit({ cwd: worktreeAlloc.worktreePath, args: ['commit', '-m', 'Rogue worker commit'] })

    const mutation = await captureWorktreeMutation(
      worktreeAlloc.worktreePath,
      beforeSnapshot,
      ['src/math.js']
    )
    expect(mutation.headMutated).toBe(true)

    // Independent verifier passes
    const verification = await executeVerification({
      plan: buildTestPlan(),
      worktreePath: worktreeAlloc.worktreePath,
    })
    expect(verification.status).toBe('PASSED')

    // State authority MUST reject due to headMutated
    const outcome = applyVerificationOutcome({ task, verification, mutation })
    expect(outcome.task.state).toBe('FAILED')
    expect(outcome.task.state).not.toBe('WAITING_APPROVAL')

    await removeWorktree(worktreeAlloc.worktreePath, { force: true })
  })
})
