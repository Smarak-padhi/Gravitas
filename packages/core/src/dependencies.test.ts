import { describe, it, expect } from 'vitest'
import {
  computeTopologicalRanks,
  evaluateTaskReadiness,
  isDependencyBroken,
  isDependencySatisfied,
  resolveInitialTaskState,
} from './dependencies.js'
import type { Task, TaskDependency, TaskState } from './types.js'

function makeTask(id: string, state: TaskState, deps: TaskDependency[] = []): Task {
  return {
    id,
    runId: 'run_1',
    title: `Task ${id}`,
    objective: `Objective for ${id}`,
    state,
    dependencies: deps,
    acceptanceCriteria: [],
    createdAt: '2026-09-18T12:00:00.000Z',
    updatedAt: '2026-09-18T12:00:00.000Z',
  }
}

describe('Dependency Evaluation & Semantics', () => {
  describe('Zero dependencies', () => {
    it('evaluates to READY when a task has no dependencies', () => {
      const task = makeTask('task_root', 'PLANNED', [])
      const result = evaluateTaskReadiness(task, () => undefined)

      expect(result.status).toBe('READY')
      expect(result.satisfiedDependencies).toEqual([])
      expect(result.unsatisfiedDependencies).toEqual([])
      expect(result.brokenDependencies).toEqual([])
    })

    it('resolveInitialTaskState returns READY for zero dependencies', () => {
      const state = resolveInitialTaskState([], () => undefined)
      expect(state).toBe('READY')
    })
  })

  describe('Single dependency states', () => {
    it('evaluates to READY when upstream has SUCCEEDED (default acceptable)', () => {
      const upstream = makeTask('up_1', 'SUCCEEDED')
      const downstream = makeTask('down_1', 'BLOCKED', [{ taskId: 'up_1' }])

      const result = evaluateTaskReadiness(downstream, (id) => (id === 'up_1' ? upstream : undefined))

      expect(result.status).toBe('READY')
      expect(result.satisfiedDependencies).toEqual(['up_1'])
      expect(isDependencySatisfied({ taskId: 'up_1' }, upstream)).toBe(true)
      expect(isDependencyBroken({ taskId: 'up_1' }, upstream)).toBe(false)
    })

    it('evaluates to READY when upstream is APPROVED (default acceptable)', () => {
      const upstream = makeTask('up_1', 'APPROVED')
      const downstream = makeTask('down_1', 'BLOCKED', [{ taskId: 'up_1' }])

      const result = evaluateTaskReadiness(downstream, (id) => (id === 'up_1' ? upstream : undefined))

      expect(result.status).toBe('READY')
      expect(result.satisfiedDependencies).toEqual(['up_1'])
    })

    it('evaluates to BLOCKED when upstream is still RUNNING', () => {
      const upstream = makeTask('up_1', 'RUNNING')
      const downstream = makeTask('down_1', 'BLOCKED', [{ taskId: 'up_1' }])

      const result = evaluateTaskReadiness(downstream, (id) => (id === 'up_1' ? upstream : undefined))

      expect(result.status).toBe('BLOCKED')
      expect(result.unsatisfiedDependencies).toEqual(['up_1'])
      expect(result.brokenDependencies).toEqual([])
      expect(isDependencySatisfied({ taskId: 'up_1' }, upstream)).toBe(false)
      expect(isDependencyBroken({ taskId: 'up_1' }, upstream)).toBe(false)
    })

    it('evaluates to BLOCKED when upstream is in VERIFYING or WAITING_APPROVAL', () => {
      for (const inProgressState of ['VERIFYING', 'WAITING_APPROVAL', 'PLANNED', 'BLOCKED'] as TaskState[]) {
        const upstream = makeTask('up_1', inProgressState)
        const downstream = makeTask('down_1', 'BLOCKED', [{ taskId: 'up_1' }])
        const result = evaluateTaskReadiness(downstream, (id) => (id === 'up_1' ? upstream : undefined))

        expect(result.status).toBe('BLOCKED')
        expect(result.unsatisfiedDependencies).toContain('up_1')
      }
    })

    it('evaluates to UNSATISFIABLE when upstream has FAILED', () => {
      const upstream = makeTask('up_1', 'FAILED')
      const downstream = makeTask('down_1', 'BLOCKED', [{ taskId: 'up_1' }])

      const result = evaluateTaskReadiness(downstream, (id) => (id === 'up_1' ? upstream : undefined))

      expect(result.status).toBe('UNSATISFIABLE')
      expect(result.brokenDependencies).toEqual(['up_1'])
      expect(result.satisfiedDependencies).toEqual([])
      expect(isDependencyBroken({ taskId: 'up_1' }, upstream)).toBe(true)
    })

    it('evaluates to UNSATISFIABLE when upstream was CANCELLED', () => {
      const upstream = makeTask('up_1', 'CANCELLED')
      const downstream = makeTask('down_1', 'BLOCKED', [{ taskId: 'up_1' }])

      const result = evaluateTaskReadiness(downstream, (id) => (id === 'up_1' ? upstream : undefined))

      expect(result.status).toBe('UNSATISFIABLE')
      expect(result.brokenDependencies).toEqual(['up_1'])
      expect(isDependencyBroken({ taskId: 'up_1' }, upstream)).toBe(true)
    })

    it('evaluates to UNSATISFIABLE when upstream task is missing from task map', () => {
      const downstream = makeTask('down_1', 'BLOCKED', [{ taskId: 'non_existent_up' }])

      const result = evaluateTaskReadiness(downstream, () => undefined)

      expect(result.status).toBe('UNSATISFIABLE')
      expect(result.brokenDependencies).toEqual(['non_existent_up'])
    })
  })

  describe('Custom acceptableStates on dependency edge', () => {
    it('satisfies dependency when upstream matches custom state', () => {
      // E.g. A verification task that only needs worker output (RUNNING -> VERIFYING)
      const upstream = makeTask('impl_1', 'VERIFYING')
      const dep: TaskDependency = {
        taskId: 'impl_1',
        acceptableStates: ['VERIFYING', 'SUCCEEDED'],
      }
      const downstream = makeTask('audit_1', 'BLOCKED', [dep])

      const result = evaluateTaskReadiness(downstream, (id) => (id === 'impl_1' ? upstream : undefined))
      expect(result.status).toBe('READY')
      expect(result.satisfiedDependencies).toEqual(['impl_1'])
    })
  })

  describe('Multiple dependencies and mixed states', () => {
    it('evaluates to READY when ALL multiple dependencies are satisfied', () => {
      const tasks: Record<string, Task> = {
        dep_1: makeTask('dep_1', 'SUCCEEDED'),
        dep_2: makeTask('dep_2', 'APPROVED'),
        dep_3: makeTask('dep_3', 'SUCCEEDED'),
      }
      const downstream = makeTask('down', 'BLOCKED', [
        { taskId: 'dep_1' },
        { taskId: 'dep_2' },
        { taskId: 'dep_3' },
      ])

      const result = evaluateTaskReadiness(downstream, (id) => tasks[id])
      expect(result.status).toBe('READY')
      expect(result.satisfiedDependencies).toHaveLength(3)
      expect(result.unsatisfiedDependencies).toHaveLength(0)
      expect(result.brokenDependencies).toHaveLength(0)
    })

    it('evaluates to BLOCKED when some dependencies are satisfied and others are pending', () => {
      const tasks: Record<string, Task> = {
        dep_1: makeTask('dep_1', 'SUCCEEDED'),
        dep_2: makeTask('dep_2', 'RUNNING'),
        dep_3: makeTask('dep_3', 'SUCCEEDED'),
      }
      const downstream = makeTask('down', 'BLOCKED', [
        { taskId: 'dep_1' },
        { taskId: 'dep_2' },
        { taskId: 'dep_3' },
      ])

      const result = evaluateTaskReadiness(downstream, (id) => tasks[id])
      expect(result.status).toBe('BLOCKED')
      expect(result.satisfiedDependencies).toEqual(['dep_1', 'dep_3'])
      expect(result.unsatisfiedDependencies).toEqual(['dep_2'])
      expect(result.brokenDependencies).toHaveLength(0)
    })

    it('evaluates to UNSATISFIABLE if ANY dependency has FAILED, even if others succeeded', () => {
      const tasks: Record<string, Task> = {
        dep_1: makeTask('dep_1', 'SUCCEEDED'),
        dep_2: makeTask('dep_2', 'FAILED'),
        dep_3: makeTask('dep_3', 'RUNNING'),
      }
      const downstream = makeTask('down', 'BLOCKED', [
        { taskId: 'dep_1' },
        { taskId: 'dep_2' },
        { taskId: 'dep_3' },
      ])

      const result = evaluateTaskReadiness(downstream, (id) => tasks[id])
      expect(result.status).toBe('UNSATISFIABLE')
      expect(result.brokenDependencies).toEqual(['dep_2'])
      expect(result.satisfiedDependencies).toEqual(['dep_1'])
      expect(result.unsatisfiedDependencies).toEqual(['dep_3'])
    })
  })

  describe('resolveInitialTaskState', () => {
    it('resolves to READY if all dependencies are satisfied at initialization', () => {
      const tasks: Record<string, Task> = {
        dep_1: makeTask('dep_1', 'SUCCEEDED'),
      }
      const state = resolveInitialTaskState([{ taskId: 'dep_1' }], (id) => tasks[id])
      expect(state).toBe('READY')
    })

    it('resolves to BLOCKED if any dependency is pending at initialization', () => {
      const tasks: Record<string, Task> = {
        dep_1: makeTask('dep_1', 'RUNNING'),
      }
      const state = resolveInitialTaskState([{ taskId: 'dep_1' }], (id) => tasks[id])
      expect(state).toBe('BLOCKED')
    })
  })

  describe('computeTopologicalRanks', () => {
    it('computes ranks for diamond DAG: T1(0) -> T2(1), T3(1) -> T4(2)', () => {
      const tasks = [
        { id: 'T1', dependencies: [] },
        { id: 'T2', dependencies: ['T1'] },
        { id: 'T3', dependencies: ['T1'] },
        { id: 'T4', dependencies: ['T2', 'T3'] },
      ]
      const ranks = computeTopologicalRanks(tasks)
      expect(ranks.get('T1')).toBe(0)
      expect(ranks.get('T2')).toBe(1)
      expect(ranks.get('T3')).toBe(1)
      expect(ranks.get('T4')).toBe(2)
    })

    it('computes ranks for linear chain: T1(0) -> T2(1) -> T3(2)', () => {
      const tasks = [
        { id: 'T1', dependencies: [] },
        { id: 'T2', dependencies: ['T1'] },
        { id: 'T3', dependencies: ['T2'] },
      ]
      const ranks = computeTopologicalRanks(tasks)
      expect(ranks.get('T1')).toBe(0)
      expect(ranks.get('T2')).toBe(1)
      expect(ranks.get('T3')).toBe(2)
    })
  })
})
