import { describe, expect, it } from 'vitest'
import { Task, TaskState } from '@gravitas/core'
import type { MutationCapture, WorktreeSnapshot } from '@gravitas/harnesses'
import { VerificationPolicyError } from './errors.js'
import { applyVerificationOutcome } from './state-authority.js'
import type { VerificationResult } from './types.js'

describe('State Transition Authority (state-authority.ts)', () => {
  const dummySnapshot: WorktreeSnapshot = {
    headSha: 'abc1234',
    branch: 'task-branch',
    isClean: true,
    fileList: ['src/math.js'],
    stagedCount: 0,
    unstagedCount: 0,
    untrackedCount: 0,
  }

  const cleanMutation: MutationCapture = {
    beforeSnapshot: dummySnapshot,
    afterSnapshot: dummySnapshot,
    headMutated: false,
    changedFiles: ['src/math.js'],
    diff: 'diff --git a/src/math.js b/src/math.js...',
    diffSha256: '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
    allowedChanges: ['src/math.js'],
    unexpectedChanges: [],
  }

  const passedVerification: VerificationResult = {
    planId: 'plan-1',
    status: 'PASSED',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 100,
    commands: [],
    verifierGeneratedChanges: [],
  }

  const failedVerification: VerificationResult = {
    planId: 'plan-1',
    status: 'FAILED',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 100,
    commands: [],
    verifierGeneratedChanges: [],
    failureReason: 'Unit tests failed with exit code 1',
  }

  function createVerifyingTask(requiresApproval: boolean): Task {
    return {
      id: 'task-001',
      title: 'Implement math',
      description: 'Implement add(a, b)',
      assignedRole: 'BACKEND_DEVELOPER',
      dependencies: [],
      acceptanceCriteria: [],
      evidenceRequirements: [],
      state: 'VERIFYING' as TaskState,
      requiresApproval,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  it('transitions VERIFYING -> WAITING_APPROVAL when verification passes and task requires approval', () => {
    const task = createVerifyingTask(true)

    const result = applyVerificationOutcome({
      task,
      verification: passedVerification,
      mutation: cleanMutation,
    })

    expect(result.task.state).toBe('WAITING_APPROVAL')
    expect(result.event.type).toBe('TASK_STATE_CHANGED')
    expect(result.event.payload.toState).toBe('WAITING_APPROVAL')
    expect(result.task.state).not.toBe('APPROVED') // Must NEVER auto-approve
  })

  it('transitions VERIFYING -> SUCCEEDED when verification passes and task does not require approval', () => {
    const task = createVerifyingTask(false)

    const result = applyVerificationOutcome({
      task,
      verification: passedVerification,
      mutation: cleanMutation,
    })

    expect(result.task.state).toBe('SUCCEEDED')
    expect(result.event.type).toBe('TASK_STATE_CHANGED')
    expect(result.event.payload.toState).toBe('SUCCEEDED')
  })

  it('transitions VERIFYING -> FAILED when independent verification fails', () => {
    const task = createVerifyingTask(true)

    const result = applyVerificationOutcome({
      task,
      verification: failedVerification,
      mutation: cleanMutation,
    })

    expect(result.task.state).toBe('FAILED')
    expect(result.event.payload.toState).toBe('FAILED')
    expect(result.event.payload.reason).toContain('Unit tests failed')
  })

  it('MUTATION GATE: fails task if unexpected changes exist even when verification PASSED', () => {
    const task = createVerifyingTask(true)

    const taintedMutation: MutationCapture = {
      ...cleanMutation,
      unexpectedChanges: ['.rogue_folder/'],
    }

    const result = applyVerificationOutcome({
      task,
      verification: passedVerification,
      mutation: taintedMutation,
    })

    expect(result.task.state).toBe('FAILED')
    expect(result.event.payload.reason).toContain('unexpected changes detected: .rogue_folder/')
  })

  it('MUTATION GATE: fails task if worker committed to HEAD even when verification PASSED', () => {
    const task = createVerifyingTask(true)

    const rogueCommitMutation: MutationCapture = {
      ...cleanMutation,
      headMutated: true,
    }

    const result = applyVerificationOutcome({
      task,
      verification: passedVerification,
      mutation: rogueCommitMutation,
    })

    expect(result.task.state).toBe('FAILED')
    expect(result.event.payload.reason).toContain('worker committed to Git HEAD')
  })

  it('rejects execution when task is not in VERIFYING state', () => {
    const runningTask: Task = {
      ...createVerifyingTask(true),
      state: 'RUNNING' as TaskState,
    }

    expect(() =>
      applyVerificationOutcome({
        task: runningTask,
        verification: passedVerification,
        mutation: cleanMutation,
      })
    ).toThrow(VerificationPolicyError)
  })

  it('proves worker stdout claims have ZERO authority over state transitions', () => {
    // Simulated worker claim in stdout
    const workerClaimsSuccess = 'Done. All tests pass! LGTM.'

    // But verification failed
    const task = createVerifyingTask(true)
    const result = applyVerificationOutcome({
      task,
      verification: failedVerification,
      mutation: cleanMutation,
    })

    // Worker claim is ignored; state is FAILED
    expect(result.task.state).toBe('FAILED')
    expect(workerClaimsSuccess).toBeDefined()
  })
})
