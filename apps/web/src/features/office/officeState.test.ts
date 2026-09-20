import { describe, expect, it } from 'vitest'
import type { Task } from '../../api/types.js'
import { deriveOfficeState } from './officeState.js'

describe('Office State Derivation Invariants (officeState.test.ts)', () => {
  const dummyHarness = { id: 'test-harness', status: 'AVAILABLE' }

  it('maps IDLE states when no run or active task exists', () => {
    const stations = deriveOfficeState({
      run: null,
      tasks: [],
      activeTask: null,
      harness: dummyHarness,
    })

    expect(stations).toHaveLength(3)
    expect(stations[0]!.state).toBe('IDLE')
    expect(stations[0]!.attentionLevel).toBe('NONE')
    expect(stations[1]!.state).toBe('IDLE')
    expect(stations[2]!.state).toBe('IDLE')
  })

  it('maps READY task to ASSIGNED state on primary worker', () => {
    const task: Task = {
      id: 't-1',
      runId: 'run-1',
      title: 'Add math module',
      objective: 'Implement add(a, b)',
      state: 'READY',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    }

    const stations = deriveOfficeState({
      run: null,
      tasks: [task],
      activeTask: task,
      harness: dummyHarness,
    })

    expect(stations[0]!.state).toBe('ASSIGNED')
    expect(stations[0]!.currentTaskId).toBe('t-1')
    expect(stations[1]!.state).toBe('IDLE')
  })

  it('maps RUNNING task to WORKING state', () => {
    const task: Task = {
      id: 't-1',
      runId: 'run-1',
      title: 'Add math module',
      objective: 'Implement add(a, b)',
      state: 'RUNNING',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    }

    const stations = deriveOfficeState({
      run: null,
      tasks: [task],
      activeTask: task,
      harness: dummyHarness,
    })

    expect(stations[0]!.state).toBe('WORKING')
    expect(stations[1]!.state).toBe('IDLE')
  })

  it('maps VERIFYING task to VERIFYING state on Verifier station', () => {
    const task: Task = {
      id: 't-1',
      runId: 'run-1',
      title: 'Add math module',
      objective: 'Implement add(a, b)',
      state: 'VERIFYING',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    }

    const stations = deriveOfficeState({
      run: null,
      tasks: [task],
      activeTask: task,
      harness: dummyHarness,
    })

    expect(stations[0]!.state).toBe('WORKING')
    expect(stations[1]!.state).toBe('VERIFYING')
    expect(stations[1]!.currentTaskId).toBe('t-1')
  })

  it('maps WAITING_APPROVAL task to NEEDS_YOU state with HIGH attention', () => {
    const task: Task = {
      id: 't-1',
      runId: 'run-1',
      title: 'Add math module',
      objective: 'Implement add(a, b)',
      state: 'WAITING_APPROVAL',
      dependencies: [],
      acceptanceCriteria: [],
      requiresApproval: true,
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    }

    const stations = deriveOfficeState({
      run: null,
      tasks: [task],
      activeTask: task,
      harness: dummyHarness,
    })

    expect(stations[0]!.state).toBe('NEEDS_YOU')
    expect(stations[0]!.attentionLevel).toBe('HIGH')
    expect(stations[1]!.state).toBe('DONE')
  })

  it('maps APPROVED and SUCCEEDED task to DONE state', () => {
    const task: Task = {
      id: 't-1',
      runId: 'run-1',
      title: 'Add math module',
      objective: 'Implement add(a, b)',
      state: 'APPROVED',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    }

    const stations = deriveOfficeState({
      run: null,
      tasks: [task],
      activeTask: task,
      harness: dummyHarness,
    })

    expect(stations[0]!.state).toBe('DONE')
    expect(stations[1]!.state).toBe('DONE')
  })

  it('maps FAILED task to FAILED state with CRITICAL attention', () => {
    const task: Task = {
      id: 't-1',
      runId: 'run-1',
      title: 'Add math module',
      objective: 'Implement add(a, b)',
      state: 'FAILED',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    }

    const stations = deriveOfficeState({
      run: null,
      tasks: [task],
      activeTask: task,
      harness: dummyHarness,
    })

    expect(stations[0]!.state).toBe('FAILED')
    expect(stations[0]!.attentionLevel).toBe('CRITICAL')
    expect(stations[1]!.state).toBe('FAILED')
  })

  it('derives multiple concurrent worker stations when multiple tasks execute simultaneously', () => {
    const task1: Task = {
      id: 't-1',
      runId: 'run-1',
      title: 'First parallel task',
      objective: 'Build component A',
      state: 'RUNNING',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    }
    const task2: Task = {
      id: 't-2',
      runId: 'run-1',
      title: 'Second parallel task',
      objective: 'Build component B',
      state: 'VERIFYING',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    }

    const stations = deriveOfficeState({
      run: null,
      tasks: [task1, task2],
      activeTask: task1,
      harness: dummyHarness,
    })

    // Expect 2 worker stations + 1 verifier + 1 astra = 4 stations
    expect(stations).toHaveLength(4)
    expect(stations[0]!.id).toBe('worker-slot-1')
    expect(stations[0]!.state).toBe('WORKING')
    expect(stations[0]!.currentTaskId).toBe('t-1')

    expect(stations[1]!.id).toBe('worker-slot-2')
    expect(stations[1]!.state).toBe('WORKING')
    expect(stations[1]!.currentTaskId).toBe('t-2')

    // Verifier is verifying task 2
    expect(stations[2]!.id).toBe('gate-verifier')
    expect(stations[2]!.state).toBe('VERIFYING')
    expect(stations[2]!.currentTaskId).toBe('t-2')

    // Astra station
    expect(stations[3]!.id).toBe('worker-astra')
  })
})
