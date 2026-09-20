import { describe, it, expect } from 'vitest'
import {
  createExecutionContractCreatedEvent,
  createRunCreatedEvent,
  createRunPlanCreatedEvent,
  createTaskApprovedEvent,
  createTaskCompositionConflictEvent,
  createTaskCreatedEvent,
  createTaskReadyEvent,
  createTaskResultMaterializedEvent,
  createTaskScheduledEvent,
  createTaskStateChangedEvent,
  generateEventId,
  InMemoryEventCollector,
} from './events.js'
import { transitionTask } from './fsm.js'
import type { ExecutionContract, Run, Task } from './types.js'

describe('Gravitas Event Model', () => {
  const sampleRun: Run = {
    id: 'run_123',
    goal: 'Build feature',
    status: 'RUNNING',
    contractId: 'contract_456',
    taskIds: ['task_1', 'task_2'],
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
  }

  const sampleTask: Task = {
    id: 'task_1',
    runId: 'run_123',
    title: 'Setup DB',
    objective: 'Create migration files',
    state: 'READY',
    dependencies: [],
    acceptanceCriteria: [{ id: 'AC-1', description: 'Migrations exist' }],
    role: 'IMPLEMENTER',
    requiresApproval: false,
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
  }

  const sampleContract: ExecutionContract = {
    version: '1.0.0',
    goal: 'Build feature',
    repository: 'C:/repos/test',
    baseBranch: 'main',
    constraints: ['No external network'],
    acceptanceCriteria: [{ id: 'AC-1', description: 'Tests pass' }],
    requiredEvidence: [{ id: 'EV-1', type: 'GIT_DIFF', description: 'Diff', mandatory: true }],
  }

  describe('generateEventId', () => {
    it('generates unique non-empty string IDs', () => {
      const id1 = generateEventId()
      const id2 = generateEventId()
      expect(id1).not.toBe(id2)
      expect(id1.startsWith('evt_')).toBe(true)
    })
  })

  describe('State transition event emitted by transitionTask', () => {
    it('emits a valid TASK_STATE_CHANGED event on successful transition', () => {
      const { event } = transitionTask(sampleTask, 'RUNNING', {
        reason: 'Worker dispatched to worktree',
      })

      expect(event.type).toBe('TASK_STATE_CHANGED')
      expect(event.runId).toBe('run_123')
      expect(event.taskId).toBe('task_1')
      expect(event.payload['fromState']).toBe('READY')
      expect(event.payload['toState']).toBe('RUNNING')
      expect(event.payload['reason']).toBe('Worker dispatched to worktree')
      expect(typeof event.timestamp).toBe('string')
      expect(typeof event.eventId).toBe('string')
    })
  })

  describe('Typed event factories', () => {
    it('creates RUN_CREATED event with full envelope', () => {
      const event = createRunCreatedEvent(sampleRun)

      expect(event.type).toBe('RUN_CREATED')
      expect(event.runId).toBe('run_123')
      expect(event.taskId).toBeUndefined()
      expect(event.payload['goal']).toBe('Build feature')
      expect(event.payload['contractId']).toBe('contract_456')
      expect(event.payload['taskIds']).toEqual(['task_1', 'task_2'])
    })

    it('creates TASK_CREATED event with full envelope', () => {
      const event = createTaskCreatedEvent(sampleTask)

      expect(event.type).toBe('TASK_CREATED')
      expect(event.runId).toBe('run_123')
      expect(event.taskId).toBe('task_1')
      expect(event.payload['title']).toBe('Setup DB')
      expect(event.payload['role']).toBe('IMPLEMENTER')
    })

    it('creates EXECUTION_CONTRACT_CREATED event with full envelope', () => {
      const event = createExecutionContractCreatedEvent('run_123', sampleContract)

      expect(event.type).toBe('EXECUTION_CONTRACT_CREATED')
      expect(event.runId).toBe('run_123')
      expect(event.payload['version']).toBe('1.0.0')
      expect(event.payload['goal']).toBe('Build feature')
      expect(event.payload['acceptanceCriteriaCount']).toBe(1)
      expect(event.payload['requiredEvidenceCount']).toBe(1)
    })

    it('creates TASK_STATE_CHANGED event via factory', () => {
      const event = createTaskStateChangedEvent({
        runId: 'run_123',
        taskId: 'task_1',
        fromState: 'RUNNING',
        toState: 'VERIFYING',
        reason: 'Worker finished execution',
      })

      expect(event.type).toBe('TASK_STATE_CHANGED')
      expect(event.runId).toBe('run_123')
      expect(event.taskId).toBe('task_1')
      expect(event.payload['fromState']).toBe('RUNNING')
      expect(event.payload['toState']).toBe('VERIFYING')
      expect(event.payload['reason']).toBe('Worker finished execution')
    })

    it('creates multi-task orchestration events with full envelope', () => {
      const planEvt = createRunPlanCreatedEvent('run_123', { taskCount: 3 })
      expect(planEvt.type).toBe('RUN_PLAN_CREATED')
      expect(planEvt.runId).toBe('run_123')
      expect(planEvt.payload['taskCount']).toBe(3)

      const readyEvt = createTaskReadyEvent('run_123', 'task_1')
      expect(readyEvt.type).toBe('TASK_READY')
      expect(readyEvt.runId).toBe('run_123')
      expect(readyEvt.taskId).toBe('task_1')

      const schedEvt = createTaskScheduledEvent('run_123', 'task_1', 1)
      expect(schedEvt.type).toBe('TASK_SCHEDULED')
      expect(schedEvt.runId).toBe('run_123')
      expect(schedEvt.taskId).toBe('task_1')
      expect(schedEvt.payload['slot']).toBe(1)

      const matEvt = createTaskResultMaterializedEvent('run_123', 'task_1', 'abc1234')
      expect(matEvt.type).toBe('TASK_RESULT_MATERIALIZED')
      expect(matEvt.runId).toBe('run_123')
      expect(matEvt.taskId).toBe('task_1')
      expect(matEvt.payload['commitSha']).toBe('abc1234')

      const confEvt = createTaskCompositionConflictEvent('run_123', 'task_1', { conflict: true })
      expect(confEvt.type).toBe('TASK_COMPOSITION_CONFLICT')
      expect(confEvt.runId).toBe('run_123')
      expect(confEvt.taskId).toBe('task_1')
      expect(confEvt.payload['conflict']).toBe(true)
    })
  })

  describe('InMemoryEventCollector', () => {
    it('collects, filters, and clears events', () => {
      const collector = new InMemoryEventCollector()
      const event1 = createRunCreatedEvent(sampleRun)
      const event2 = createTaskCreatedEvent(sampleTask)

      collector.emit(event1)
      collector.emit(event2)

      expect(collector.getEvents()).toHaveLength(2)
      expect(collector.getByType('RUN_CREATED')).toEqual([event1])
      expect(collector.getByType('TASK_CREATED')).toEqual([event2])

      collector.clear()
      expect(collector.getEvents()).toHaveLength(0)
    })
  })
})
