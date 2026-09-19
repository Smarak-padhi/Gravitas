import { describe, expect, it } from 'vitest'
import type { Task, TaskDetailResponse } from './api/types.js'

function computeStageStatuses(
  task: Task | null,
  taskDetail: TaskDetailResponse | null,
  runStatus: string | null
) {
  if (!task) {
    return {
      goal: 'PENDING',
      task: 'PENDING',
      worker: 'PENDING',
      verify: 'PENDING',
      evidence: 'PENDING',
      approval: 'PENDING',
    }
  }

  const state = task.state
  const hasEvidence = taskDetail?.evidenceAvailable ?? false
  const verifPassed = taskDetail?.verificationSummary?.status === 'PASSED'
  const verifFailed = taskDetail?.verificationSummary?.status === 'FAILED'

  let worker = 'PENDING'
  if (state === 'RUNNING') worker = 'RUNNING'
  else if (['VERIFYING', 'WAITING_APPROVAL', 'APPROVED', 'SUCCEEDED'].includes(state)) worker = 'COMPLETED'
  else if (state === 'FAILED') worker = taskDetail?.verificationSummary ? 'COMPLETED' : 'FAILED'

  let verify = 'PENDING'
  if (state === 'VERIFYING') verify = 'VERIFYING'
  else if (verifPassed) verify = 'COMPLETED'
  else if (verifFailed) verify = 'FAILED'
  else if (['WAITING_APPROVAL', 'APPROVED', 'SUCCEEDED'].includes(state)) verify = 'COMPLETED'

  let evidence = 'PENDING'
  if (hasEvidence || ['WAITING_APPROVAL', 'APPROVED', 'SUCCEEDED'].includes(state)) evidence = 'COMPLETED'

  let approval = 'PENDING'
  if (state === 'WAITING_APPROVAL') approval = 'WAITING_APPROVAL'
  else if (state === 'APPROVED' || state === 'SUCCEEDED' || runStatus === 'COMPLETED') approval = 'COMPLETED'
  else if (state === 'FAILED') approval = 'FAILED'

  return {
    goal: 'COMPLETED',
    task: 'COMPLETED',
    worker,
    verify,
    evidence,
    approval,
  }
}

describe('Golden Loop Stage Mapping Invariant (stage-mapping.test.ts)', () => {
  it('maps null task to all PENDING stages without fake data', () => {
    const stages = computeStageStatuses(null, null, null)
    expect(stages).toEqual({
      goal: 'PENDING',
      task: 'PENDING',
      worker: 'PENDING',
      verify: 'PENDING',
      evidence: 'PENDING',
      approval: 'PENDING',
    })
  })

  it('maps READY task correctly', () => {
    const task: Task = {
      id: 'task_1',
      runId: 'run_1',
      title: 'Task 1',
      objective: 'Obj 1',
      state: 'READY',
      dependencies: [],
      acceptanceCriteria: [],
      requiresApproval: true,
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    }

    const stages = computeStageStatuses(task, null, 'PENDING')
    expect(stages.goal).toBe('COMPLETED')
    expect(stages.task).toBe('COMPLETED')
    expect(stages.worker).toBe('PENDING')
    expect(stages.verify).toBe('PENDING')
    expect(stages.evidence).toBe('PENDING')
    expect(stages.approval).toBe('PENDING')
  })

  it('maps WAITING_APPROVAL state correctly requiring human signoff', () => {
    const task: Task = {
      id: 'task_1',
      runId: 'run_1',
      title: 'Task 1',
      objective: 'Obj 1',
      state: 'WAITING_APPROVAL',
      dependencies: [],
      acceptanceCriteria: [],
      requiresApproval: true,
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    }

    const taskDetail: TaskDetailResponse = {
      task,
      evidenceAvailable: true,
      verificationSummary: {
        status: 'PASSED',
        totalCommands: 1,
        passedCommands: 1,
        failedCommands: 0,
      },
    }

    const stages = computeStageStatuses(task, taskDetail, 'RUNNING')
    expect(stages.worker).toBe('COMPLETED')
    expect(stages.verify).toBe('COMPLETED')
    expect(stages.evidence).toBe('COMPLETED')
    expect(stages.approval).toBe('WAITING_APPROVAL')
  })

  it('maps APPROVED and COMPLETED run state correctly', () => {
    const task: Task = {
      id: 'task_1',
      runId: 'run_1',
      title: 'Task 1',
      objective: 'Obj 1',
      state: 'APPROVED',
      dependencies: [],
      acceptanceCriteria: [],
      requiresApproval: true,
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    }

    const stages = computeStageStatuses(task, null, 'COMPLETED')
    expect(stages.approval).toBe('COMPLETED')
  })

  it('maps FAILED state correctly when rejected by human reviewer', () => {
    const task: Task = {
      id: 'task_1',
      runId: 'run_1',
      title: 'Task 1',
      objective: 'Obj 1',
      state: 'FAILED',
      dependencies: [],
      acceptanceCriteria: [],
      requiresApproval: true,
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    }

    const taskDetail: TaskDetailResponse = {
      task,
      evidenceAvailable: true,
      verificationSummary: {
        status: 'PASSED',
        totalCommands: 1,
        passedCommands: 1,
        failedCommands: 0,
      },
    }

    const stages = computeStageStatuses(task, taskDetail, 'FAILED')
    expect(stages.verify).toBe('COMPLETED')
    expect(stages.approval).toBe('FAILED')
  })
})
