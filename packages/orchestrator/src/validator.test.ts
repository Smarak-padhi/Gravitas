import { describe, expect, it } from 'vitest'
import { PlanValidationError } from './errors.js'
import type { RunPlan } from './types.js'
import { validateRunPlan } from './validator.js'

describe('RunPlan and DAG Validation (validator.ts)', () => {
  it('accepts a valid linear DAG', () => {
    const plan: RunPlan = {
      goal: 'Implement user auth',
      tasks: [
        { id: 't1', title: 'Task 1', objective: 'Create models' },
        { id: 't2', title: 'Task 2', objective: 'Create routes', dependencies: ['t1'] },
        { id: 't3', title: 'Task 3', objective: 'Add tests', dependencies: ['t2'] },
      ],
    }

    expect(() => validateRunPlan(plan)).not.toThrow()
  })

  it('accepts a valid diamond DAG', () => {
    const plan: RunPlan = {
      goal: 'Implement diamond feature',
      tasks: [
        { id: 'root', title: 'Root', objective: 'Base setup' },
        { id: 'branch_a', title: 'Branch A', objective: 'Feature A', dependencies: ['root'] },
        { id: 'branch_b', title: 'Branch B', objective: 'Feature B', dependencies: ['root'] },
        { id: 'join', title: 'Join', objective: 'Integration', dependencies: ['branch_a', 'branch_b'] },
      ],
    }

    expect(() => validateRunPlan(plan)).not.toThrow()
  })

  it('rejects empty or missing goal', () => {
    expect(() =>
      validateRunPlan({
        goal: '',
        tasks: [{ id: 't1', title: 'Task 1', objective: 'Obj' }],
      })
    ).toThrow(PlanValidationError)
  })

  it('rejects empty tasks list', () => {
    expect(() =>
      validateRunPlan({
        goal: 'Valid goal',
        tasks: [],
      })
    ).toThrow(PlanValidationError)
  })

  it('rejects invalid maxConcurrency values', () => {
    expect(() =>
      validateRunPlan({
        goal: 'Valid goal',
        maxConcurrency: 0,
        tasks: [{ id: 't1', title: 'Task 1', objective: 'Obj' }],
      })
    ).toThrow(PlanValidationError)

    expect(() =>
      validateRunPlan({
        goal: 'Valid goal',
        maxConcurrency: -1,
        tasks: [{ id: 't1', title: 'Task 1', objective: 'Obj' }],
      })
    ).toThrow(PlanValidationError)
  })

  it('rejects duplicate task IDs', () => {
    expect(() =>
      validateRunPlan({
        goal: 'Valid goal',
        tasks: [
          { id: 't1', title: 'Task 1', objective: 'Obj' },
          { id: 't1', title: 'Task 1 Dup', objective: 'Obj' },
        ],
      })
    ).toThrow(/Duplicate task ID 't1'/)
  })

  it('rejects self-dependencies', () => {
    expect(() =>
      validateRunPlan({
        goal: 'Valid goal',
        tasks: [{ id: 't1', title: 'Task 1', objective: 'Obj', dependencies: ['t1'] }],
      })
    ).toThrow(/cannot depend on itself/)
  })

  it('rejects unknown dependency references', () => {
    expect(() =>
      validateRunPlan({
        goal: 'Valid goal',
        tasks: [
          { id: 't1', title: 'Task 1', objective: 'Obj', dependencies: ['non_existent'] },
        ],
      })
    ).toThrow(/references unknown dependency 'non_existent'/)
  })

  it('detects 2-node dependency cycle (t1 -> t2 -> t1)', () => {
    expect(() =>
      validateRunPlan({
        goal: 'Cycle test',
        tasks: [
          { id: 't1', title: 'Task 1', objective: 'Obj', dependencies: ['t2'] },
          { id: 't2', title: 'Task 2', objective: 'Obj', dependencies: ['t1'] },
        ],
      })
    ).toThrow(/Dependency cycle detected: t1 -> t2 -> t1/)
  })

  it('detects 3-node dependency cycle (t1 -> t2 -> t3 -> t1)', () => {
    expect(() =>
      validateRunPlan({
        goal: 'Cycle test',
        tasks: [
          { id: 't1', title: 'Task 1', objective: 'Obj', dependencies: ['t3'] },
          { id: 't2', title: 'Task 2', objective: 'Obj', dependencies: ['t1'] },
          { id: 't3', title: 'Task 3', objective: 'Obj', dependencies: ['t2'] },
        ],
      })
    ).toThrow(/Dependency cycle detected/)
  })
})
