import { describe, expect, it } from 'vitest'
import { deriveLivingHqState, mapTaskStateToAvatarPose } from './livingHqState.js'
import type { Run, Task } from '../../api/types.js'

describe('Living HQ Authoritative State Derivation', () => {
  const baseHarness = {
    id: 'fake-deterministic-worker',
    status: 'AVAILABLE',
  }

  const createDummyTask = (id: string, state: Task['state']): Task => ({
    id,
    runId: 'run-1',
    title: `Task ${id}`,
    objective: `Objective for ${id}`,
    state,
    requiresApproval: true,
    dependencies: [],
    acceptanceCriteria: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const dummyRun: Run = {
    id: 'run-1',
    goal: 'Test Living HQ',
    status: 'RUNNING',
    contractId: 'contract-1',
    taskIds: ['task-1'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  it('maps task states to canonical coworker avatar poses correctly', () => {
    expect(mapTaskStateToAvatarPose('READY')).toBe('READING')
    expect(mapTaskStateToAvatarPose('RUNNING')).toBe('WORKING')
    expect(mapTaskStateToAvatarPose('VERIFYING')).toBe('WORKING')
    expect(mapTaskStateToAvatarPose('WAITING_APPROVAL')).toBe('NEEDS_OPERATOR')
    expect(mapTaskStateToAvatarPose('SUCCEEDED')).toBe('DONE')
    expect(mapTaskStateToAvatarPose('APPROVED')).toBe('DONE')
    expect(mapTaskStateToAvatarPose('FAILED')).toBe('FAILED')
    expect(mapTaskStateToAvatarPose('BLOCKED')).toBe('BLOCKED')
    expect(mapTaskStateToAvatarPose('PLANNED')).toBe('IDLE')
  })

  it('derives idle state when no tasks exist', () => {
    const state = deriveLivingHqState({
      run: null,
      tasks: [],
      activeTask: null,
      harness: baseHarness,
    })

    expect(state.activeFloor).toBe(1)
    expect(state.primaryCoworker.pose).toBe('IDLE')
    expect(state.primaryCoworker.isWorking).toBe(false)
    expect(state.verifierCoworker.pose).toBe('IDLE')
    expect(state.activeWorkPacket).toBeNull()
    expect(state.densityLevel).toBe('SINGLE')
  })

  it('derives floor 1 and working pose when task is RUNNING', () => {
    const task = createDummyTask('task-1', 'RUNNING')
    const state = deriveLivingHqState({
      run: dummyRun,
      tasks: [task],
      activeTask: task,
      harness: baseHarness,
    })

    expect(state.activeFloor).toBe(1)
    expect(state.primaryCoworker.pose).toBe('WORKING')
    expect(state.primaryCoworker.isWorking).toBe(true)
    expect(state.activeWorkPacket?.stage).toBe('CLAIM')
    expect(state.transitStatusText).toContain('Implementation in Progress')
  })

  it('derives floor 3 and working verifier pose when task is VERIFYING', () => {
    const task = createDummyTask('task-1', 'VERIFYING')
    const state = deriveLivingHqState({
      run: dummyRun,
      tasks: [task],
      activeTask: task,
      harness: baseHarness,
    })

    expect(state.activeFloor).toBe(3)
    expect(state.verifierCoworker.pose).toBe('WORKING')
    expect(state.verifierCoworker.isWorking).toBe(true)
    expect(state.activeWorkPacket?.stage).toBe('VERIFYING')
    expect(state.transitStatusText).toContain('Verification Cleanroom')
  })

  it('derives mezzanine floor 4 and needs_operator pose when WAITING_APPROVAL', () => {
    const task = createDummyTask('task-1', 'WAITING_APPROVAL')
    const state = deriveLivingHqState({
      run: dummyRun,
      tasks: [task],
      activeTask: task,
      harness: baseHarness,
    })

    expect(state.activeFloor).toBe(4)
    expect(state.primaryCoworker.pose).toBe('NEEDS_OPERATOR')
    expect(state.primaryCoworker.isNeedsOperator).toBe(true)
    expect(state.activeWorkPacket?.stage).toBe('WAITING_APPROVAL')
    expect(state.waitingApprovalTask?.id).toBe('task-1')
    expect(state.transitStatusText).toContain('Operator Seal Required')
  })

  it('derives sealed work packet and done pose when SUCCEEDED', () => {
    const task = createDummyTask('task-1', 'SUCCEEDED')
    const state = deriveLivingHqState({
      run: dummyRun,
      tasks: [task],
      activeTask: task,
      harness: baseHarness,
    })

    expect(state.primaryCoworker.pose).toBe('DONE')
    expect(state.verifierCoworker.pose).toBe('DONE')
    expect(state.activeWorkPacket?.stage).toBe('SEALED')
    expect(state.activeWorkPacket?.operatorApproved).toBe(true)
  })

  it('handles multi-task scale mode and standby shelf derivation', () => {
    const tasks = Array.from({ length: 15 }, (_, i) =>
      createDummyTask(`task-${i + 1}`, i === 0 ? 'RUNNING' : 'PLANNED')
    )

    const state = deriveLivingHqState({
      run: dummyRun,
      tasks,
      activeTask: tasks[0]!,
      harness: baseHarness,
    })

    expect(state.isScaleMode).toBe(true)
    expect(state.densityLevel).toBe('HIGH')
    expect(state.standbyTasks.length).toBe(14)
  })
})
