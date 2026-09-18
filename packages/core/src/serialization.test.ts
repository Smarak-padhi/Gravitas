import { describe, it, expect } from 'vitest'
import { createExecutionContract } from './contract.js'
import { createRunCreatedEvent, createTaskCreatedEvent } from './events.js'
import type { ExecutionContract, GravitasEvent, Run, Task } from './types.js'

describe('Domain Model Serialization to JSON and back', () => {
  it('serializes and deserializes an ExecutionContract cleanly without loss', () => {
    const contract: ExecutionContract = createExecutionContract({
      version: '1.0.0',
      goal: 'Implement token authentication',
      repository: 'C:/repos/app',
      baseBranch: 'main',
      constraints: ['No external calls', 'Strict typing'],
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Tokens expire after 1 hour', verificationMethod: 'AUTOMATED_TEST' },
        { id: 'AC-2', description: 'Invalid tokens return 401', verificationMethod: 'AUTOMATED_TEST' },
      ],
      requiredEvidence: [
        { id: 'EV-1', type: 'GIT_DIFF', description: 'Diff against main', mandatory: true },
        { id: 'EV-2', type: 'TEST_REPORT', description: 'Vitest pass report', mandatory: true },
      ],
    })

    const json = JSON.stringify(contract)
    expect(typeof json).toBe('string')

    const restored = JSON.parse(json) as ExecutionContract
    expect(restored).toEqual(contract)
    expect(restored.acceptanceCriteria).toHaveLength(2)
    expect(restored.requiredEvidence).toHaveLength(2)
  })

  it('serializes and deserializes a Task cleanly without hidden prototype loss', () => {
    const task: Task = {
      id: 'task_001',
      runId: 'run_001',
      title: 'Setup authentication table',
      objective: 'Write migration SQL and schema type',
      state: 'RUNNING',
      dependencies: [
        { taskId: 'task_init', acceptableStates: ['SUCCEEDED', 'APPROVED'] },
      ],
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Schema applies cleanly' },
      ],
      role: 'IMPLEMENTER',
      requiresApproval: true,
      createdAt: '2026-09-18T10:00:00.000Z',
      updatedAt: '2026-09-18T10:05:00.000Z',
    }

    const json = JSON.stringify(task)
    const restored = JSON.parse(json) as Task

    expect(restored).toEqual(task)
    expect(restored.state).toBe('RUNNING')
    expect(restored.requiresApproval).toBe(true)
    expect(restored.dependencies).toEqual(task.dependencies)
  })

  it('serializes and deserializes GravitasEvents cleanly', () => {
    const run: Run = {
      id: 'run_001',
      goal: 'Complete refactor',
      status: 'RUNNING',
      contractId: 'contract_001',
      taskIds: ['task_1'],
      createdAt: '2026-09-18T10:00:00.000Z',
      updatedAt: '2026-09-18T10:00:00.000Z',
    }

    const event: GravitasEvent = createRunCreatedEvent(run, {
      eventId: 'evt_fixed_123',
      timestamp: '2026-09-18T10:00:00.000Z',
    })

    const json = JSON.stringify(event)
    const restored = JSON.parse(json) as GravitasEvent

    expect(restored).toEqual(event)
    expect(restored.type).toBe('RUN_CREATED')
    expect(restored.payload['goal']).toBe('Complete refactor')
  })
})
