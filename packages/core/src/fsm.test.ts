import { describe, it, expect } from 'vitest'
import { InvalidStateTransitionError } from './errors.js'
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  isFailedState,
  isSuccessfulState,
  isTerminalState,
  TERMINAL_STATES,
  transitionTask,
} from './fsm.js'
import type { Task, TaskState } from './types.js'

function makeTask(state: TaskState, requiresApproval = false): Task {
  return {
    id: 'task_1',
    runId: 'run_1',
    title: 'Test Task',
    objective: 'Demonstrate FSM transition',
    state,
    dependencies: [],
    acceptanceCriteria: [],
    requiresApproval,
    createdAt: '2026-09-18T12:00:00.000Z',
    updatedAt: '2026-09-18T12:00:00.000Z',
  }
}

describe('Task FSM — canTransition & transition matrix', () => {
  describe('All legally allowed transitions succeed', () => {
    const validPairs: Array<[TaskState, TaskState, boolean?]> = [
      // PLANNED
      ['PLANNED', 'BLOCKED'],
      ['PLANNED', 'READY'],
      ['PLANNED', 'CANCELLED'],
      // BLOCKED
      ['BLOCKED', 'READY'],
      ['BLOCKED', 'CANCELLED'],
      // READY
      ['READY', 'RUNNING'],
      ['READY', 'CANCELLED'],
      // RUNNING
      ['RUNNING', 'VERIFYING'],
      ['RUNNING', 'FAILED'],
      ['RUNNING', 'CANCELLED'],
      // VERIFYING (without approval required)
      ['VERIFYING', 'SUCCEEDED', false],
      // VERIFYING (with approval required)
      ['VERIFYING', 'WAITING_APPROVAL', true],
      ['VERIFYING', 'FAILED'],
      ['VERIFYING', 'CANCELLED'],
      // WAITING_APPROVAL
      ['WAITING_APPROVAL', 'APPROVED'],
      ['WAITING_APPROVAL', 'FAILED'],
      ['WAITING_APPROVAL', 'CANCELLED'],
    ]

    it.each(validPairs)(
      'allows transition from %s to %s (requiresApproval: %s)',
      (from, to, requiresApproval) => {
        const allowed = canTransition(from, to, { requiresApproval })
        expect(allowed).toBe(true)

        const task = makeTask(from, requiresApproval ?? false)
        const result = transitionTask(task, to)
        expect(result.task.state).toBe(to)
        expect(result.task.id).toBe(task.id)
        expect(result.event.type).toBe('TASK_STATE_CHANGED')
        expect(result.event.payload['fromState']).toBe(from)
        expect(result.event.payload['toState']).toBe(to)
      }
    )
  })

  describe('Forbidden transitions are deterministically rejected', () => {
    const forbiddenPairs: Array<[TaskState, TaskState, boolean?]> = [
      // Cannot skip states
      ['PLANNED', 'RUNNING'],
      ['PLANNED', 'VERIFYING'],
      ['PLANNED', 'APPROVED'],
      ['PLANNED', 'SUCCEEDED'],
      ['BLOCKED', 'RUNNING'],
      ['BLOCKED', 'APPROVED'],
      ['READY', 'VERIFYING'],
      ['READY', 'APPROVED'],
      ['RUNNING', 'APPROVED'],
      ['RUNNING', 'READY'],
      ['VERIFYING', 'APPROVED'], // must go through WAITING_APPROVAL or SUCCEEDED
      ['VERIFYING', 'READY'],
      // Self-transitions
      ['PLANNED', 'PLANNED'],
      ['RUNNING', 'RUNNING'],
      ['BLOCKED', 'BLOCKED'],
      // Approval constraints
      ['VERIFYING', 'SUCCEEDED', true], // requires approval, cannot go directly to SUCCEEDED
      ['VERIFYING', 'WAITING_APPROVAL', false], // does not require approval, cannot go to WAITING_APPROVAL
    ]

    it.each(forbiddenPairs)(
      'rejects transition from %s to %s (requiresApproval: %s)',
      (from, to, requiresApproval) => {
        const allowed = canTransition(from, to, { requiresApproval })
        expect(allowed).toBe(false)

        const task = makeTask(from, requiresApproval ?? false)
        expect(() => transitionTask(task, to)).toThrow(InvalidStateTransitionError)
      }
    )
  })

  describe('Terminal state irreversibility', () => {
    const terminalStates: TaskState[] = ['APPROVED', 'SUCCEEDED', 'FAILED', 'CANCELLED']
    const allStates: TaskState[] = [
      'PLANNED',
      'BLOCKED',
      'READY',
      'RUNNING',
      'VERIFYING',
      'WAITING_APPROVAL',
      'APPROVED',
      'SUCCEEDED',
      'FAILED',
      'CANCELLED',
    ]

    for (const term of terminalStates) {
      it(`terminal state "${term}" has zero outbound transitions in matrix`, () => {
        expect(ALLOWED_TRANSITIONS[term]).toEqual([])
      })

      it(`isTerminalState("${term}") returns true`, () => {
        expect(isTerminalState(term)).toBe(true)
      })

      for (const target of allStates) {
        it(`cannot transition out of "${term}" to "${target}"`, () => {
          expect(canTransition(term, target)).toBe(false)
          const task = makeTask(term)
          expect(() => transitionTask(task, target)).toThrow(InvalidStateTransitionError)
        })
      }
    }

    it('non-terminal states are recognized correctly', () => {
      const nonTerminal: TaskState[] = ['PLANNED', 'BLOCKED', 'READY', 'RUNNING', 'VERIFYING', 'WAITING_APPROVAL']
      for (const state of nonTerminal) {
        expect(isTerminalState(state)).toBe(false)
      }
    })
  })

  describe('Success and failure state classifications', () => {
    it('classifies SUCCEEDED and APPROVED as successful', () => {
      expect(isSuccessfulState('SUCCEEDED')).toBe(true)
      expect(isSuccessfulState('APPROVED')).toBe(true)
      expect(isSuccessfulState('FAILED')).toBe(false)
      expect(isSuccessfulState('RUNNING')).toBe(false)
    })

    it('classifies FAILED and CANCELLED as failed', () => {
      expect(isFailedState('FAILED')).toBe(true)
      expect(isFailedState('CANCELLED')).toBe(true)
      expect(isFailedState('APPROVED')).toBe(false)
      expect(isFailedState('SUCCEEDED')).toBe(false)
    })
  })

  describe('Immutability invariants', () => {
    it('does not mutate the input task on successful transition', () => {
      const original = Object.freeze(makeTask('READY'))
      const { task: updated } = transitionTask(original, 'RUNNING')

      expect(original.state).toBe('READY')
      expect(updated.state).toBe('RUNNING')
      expect(updated).not.toBe(original)
    })

    it('does not mutate the input task when transition throws', () => {
      const original = Object.freeze(makeTask('PLANNED'))
      expect(() => transitionTask(original, 'APPROVED')).toThrow(InvalidStateTransitionError)
      expect(original.state).toBe('PLANNED')
    })
  })
})
