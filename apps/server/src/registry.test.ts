/**
 * Tests for InMemoryRegistry.
 *
 * Covers:
 * - Run / Contract / Task / Evidence CRUD
 * - Bounded event history with deterministic FIFO eviction
 * - Unknown identifier handling
 */

import { describe, expect, it } from 'vitest'
import {
  createExecutionContract,
  createGravitasEvent,
  type Run,
  type Task,
} from '@gravitas/core'
import { InMemoryRegistry } from './registry.js'
import type { TaskEvidenceRef } from './types.js'

describe('InMemoryRegistry', () => {
  it('handles Run CRUD operations', () => {
    const registry = new InMemoryRegistry()
    const now = new Date().toISOString()
    const run: Run = {
      id: 'run_test_01',
      goal: 'Test run',
      status: 'PENDING',
      contractId: 'contract_01',
      taskIds: ['task_01'],
      createdAt: now,
      updatedAt: now,
    }

    expect(registry.getRun('run_test_01')).toBeUndefined()
    expect(registry.listRuns()).toEqual([])

    registry.addRun(run)
    expect(registry.getRun('run_test_01')).toEqual(run)
    expect(registry.listRuns()).toHaveLength(1)

    const updatedRun: Run = { ...run, status: 'RUNNING' }
    registry.updateRun(updatedRun)
    expect(registry.getRun('run_test_01')?.status).toBe('RUNNING')

    expect(() => registry.updateRun({ ...run, id: 'unknown_run' })).toThrow(
      "Cannot update unknown run 'unknown_run'"
    )
  })

  it('handles Contract operations', () => {
    const registry = new InMemoryRegistry()
    const contract = createExecutionContract({
      goal: 'Contract goal',
      repository: 'C:/repos/test',
      baseBranch: 'main',
      constraints: [],
      acceptanceCriteria: [{ id: 'ac1', description: 'desc' }],
      requiredEvidence: [{ id: 'ev1', type: 'GIT_DIFF', description: 'diff', mandatory: true }],
    })

    expect(registry.getContract('c1')).toBeUndefined()
    registry.addContract('c1', contract)
    expect(registry.getContract('c1')).toEqual(contract)
  })

  it('handles Task operations and lookups by runId', () => {
    const registry = new InMemoryRegistry()
    const now = new Date().toISOString()
    const task1: Task = {
      id: 'task_01',
      runId: 'run_01',
      title: 'Task 1',
      objective: 'Objective 1',
      state: 'READY',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: now,
      updatedAt: now,
    }
    const task2: Task = {
      id: 'task_02',
      runId: 'run_01',
      title: 'Task 2',
      objective: 'Objective 2',
      state: 'PLANNED',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: now,
      updatedAt: now,
    }

    registry.addTask(task1)
    registry.addTask(task2)

    expect(registry.getTask('task_01')).toEqual(task1)
    expect(registry.getTask('task_unknown')).toBeUndefined()

    const runTasks = registry.listTasksForRun('run_01')
    expect(runTasks).toHaveLength(2)
    expect(registry.listTasksForRun('run_empty')).toEqual([])

    const updatedTask: Task = { ...task1, state: 'RUNNING' }
    registry.updateTask(updatedTask)
    expect(registry.getTask('task_01')?.state).toBe('RUNNING')

    expect(() => registry.updateTask({ ...task1, id: 'unknown_task' })).toThrow(
      "Cannot update unknown task 'unknown_task'"
    )
  })

  it('handles Evidence Reference storage', () => {
    const registry = new InMemoryRegistry()
    const ref: TaskEvidenceRef = {
      runId: 'run_01',
      taskId: 'task_01',
      evidenceDir: '/tmp/evidence/run_01/task_01',
      manifestPath: '/tmp/evidence/run_01/task_01/evidence-manifest.json',
      artifactFiles: ['manifest.json'],
      createdAt: new Date().toISOString(),
    }

    expect(registry.getEvidenceRef('task_01')).toBeUndefined()
    registry.setEvidenceRef('task_01', ref)
    expect(registry.getEvidenceRef('task_01')).toEqual(ref)
  })

  it('enforces deterministic FIFO eviction on bounded recent events', () => {
    const registry = new InMemoryRegistry({ maxEvents: 3 })

    const e1 = createGravitasEvent('RUN_CREATED', 'run_1', { num: 1 })
    const e2 = createGravitasEvent('TASK_CREATED', 'run_1', { num: 2 })
    const e3 = createGravitasEvent('TASK_STATE_CHANGED', 'run_1', { num: 3 })
    const e4 = createGravitasEvent('WORKER_STARTED', 'run_1', { num: 4 })
    const e5 = createGravitasEvent('WORKER_FINISHED', 'run_1', { num: 5 })

    registry.recordEvent(e1)
    registry.recordEvent(e2)
    registry.recordEvent(e3)

    expect(registry.getRecentEvents()).toHaveLength(3)
    expect(registry.getRecentEvents().map((e) => e.type)).toEqual([
      'RUN_CREATED',
      'TASK_CREATED',
      'TASK_STATE_CHANGED',
    ])

    // Adding 4th event evicts e1
    registry.recordEvent(e4)
    expect(registry.getRecentEvents().map((e) => e.type)).toEqual([
      'TASK_CREATED',
      'TASK_STATE_CHANGED',
      'WORKER_STARTED',
    ])

    // Adding 5th event evicts e2
    registry.recordEvent(e5)
    expect(registry.getRecentEvents().map((e) => e.type)).toEqual([
      'TASK_STATE_CHANGED',
      'WORKER_STARTED',
      'WORKER_FINISHED',
    ])

    // Test limit parameter
    expect(registry.getRecentEvents(2).map((e) => e.type)).toEqual([
      'WORKER_STARTED',
      'WORKER_FINISHED',
    ])
  })

  it('filters recent events by runId', () => {
    const registry = new InMemoryRegistry()
    const e1 = createGravitasEvent('RUN_CREATED', 'run_1', {})
    const e2 = createGravitasEvent('RUN_CREATED', 'run_2', {})
    const e3 = createGravitasEvent('TASK_CREATED', 'run_1', {})

    registry.recordEvent(e1)
    registry.recordEvent(e2)
    registry.recordEvent(e3)

    const run1Events = registry.getEventsForRun('run_1')
    expect(run1Events).toHaveLength(2)
    expect(run1Events.map((e) => e.eventId)).toEqual([e1.eventId, e3.eventId])

    const run2Events = registry.getEventsForRun('run_2')
    expect(run2Events).toHaveLength(1)
    expect(run2Events[0]?.eventId).toBe(e2.eventId)
  })

  it('clears all state cleanly', () => {
    const registry = new InMemoryRegistry()
    const now = new Date().toISOString()
    registry.addRun({
      id: 'r1',
      goal: 'g',
      status: 'PENDING',
      contractId: 'c1',
      taskIds: [],
      createdAt: now,
      updatedAt: now,
    })
    registry.recordEvent(createGravitasEvent('RUN_CREATED', 'r1', {}))

    expect(registry.listRuns()).toHaveLength(1)
    expect(registry.getRecentEvents()).toHaveLength(1)

    registry.clear()
    expect(registry.listRuns()).toHaveLength(0)
    expect(registry.getRecentEvents()).toHaveLength(0)
  })
})
