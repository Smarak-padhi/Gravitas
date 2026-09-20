import { describe, expect, it } from 'vitest'
import type {
  AcceptanceCriterionInput,
  RequiredEvidenceInput,
} from '../api/types.js'
import {
  addCriterion,
  addEvidence,
  removeCriterion,
  removeEvidence,
  validateAndBuildCreateRunPayload,
  type ComposerFormState,
} from './GoalComposer.js'

describe('GoalComposer Form Logic & Validation (GoalComposer.test.ts)', () => {
  const baseValidState: ComposerFormState = {
    goal: 'Build feature X',
    repository: 'c:/repos/proj',
    baseBranch: 'main',
    constraintsText: 'src/a.ts, src/b.ts',
    acceptanceCriteria: [
      { id: 'ac_1', description: 'Tests must pass' },
    ],
    requiredEvidence: [
      { id: 'ev_1', type: 'GIT_DIFF', description: 'Clean diff', mandatory: true },
    ],
    requiresApproval: true,
  }

  it('add/remove criterion works correctly and maintains minimum 1 item boundary', () => {
    let criteria: AcceptanceCriterionInput[] = [{ id: 'ac_1', description: 'Initial' }]

    // Add criterion
    criteria = addCriterion(criteria)
    expect(criteria).toHaveLength(2)
    expect(criteria[1]?.id).toBe('ac_2')
    expect(criteria[1]?.description).toBe('')

    // Remove first criterion
    criteria = removeCriterion(criteria, 0)
    expect(criteria).toHaveLength(1)
    expect(criteria[0]?.id).toBe('ac_2')

    // Cannot remove when only 1 item remains
    criteria = removeCriterion(criteria, 0)
    expect(criteria).toHaveLength(1)
  })

  it('add/remove evidence works correctly and maintains minimum 1 item boundary', () => {
    let evidence: RequiredEvidenceInput[] = [{ id: 'ev_1', type: 'GIT_DIFF', description: 'Initial diff', mandatory: true }]

    // Add evidence
    evidence = addEvidence(evidence)
    expect(evidence).toHaveLength(2)
    expect(evidence[1]?.id).toBe('ev_2')
    expect(evidence[1]?.type).toBe('TEST_REPORT')

    // Remove first evidence
    evidence = removeEvidence(evidence, 0)
    expect(evidence).toHaveLength(1)
    expect(evidence[0]?.id).toBe('ev_2')

    // Cannot remove when only 1 item remains
    evidence = removeEvidence(evidence, 0)
    expect(evidence).toHaveLength(1)
  })

  it('empty mandatory criterion description is rejected by UX validation', () => {
    const state: ComposerFormState = {
      ...baseValidState,
      acceptanceCriteria: [
        { id: 'ac_1', description: '   ' },
      ],
    }

    const result = validateAndBuildCreateRunPayload(state)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain('Acceptance criterion #1 must have a non-empty description')
    }
  })

  it('empty evidence requirement description is rejected by UX validation', () => {
    const state: ComposerFormState = {
      ...baseValidState,
      requiredEvidence: [
        { id: 'ev_1', type: 'GIT_DIFF', description: '', mandatory: true },
      ],
    }

    const result = validateAndBuildCreateRunPayload(state)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain('Evidence requirement #1 must have a non-empty description')
    }
  })

  it('empty goal is rejected by UX validation', () => {
    const state: ComposerFormState = {
      ...baseValidState,
      goal: '   ',
    }

    const result = validateAndBuildCreateRunPayload(state)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBe('Goal is required.')
    }
  })

  it('API request contains actual entered criteria and evidence values', () => {
    const state: ComposerFormState = {
      goal: 'Implement payment gateway',
      repository: 'c:/repos/gateway',
      baseBranch: 'feat/checkout',
      constraintsText: 'src/gateway.ts\nsrc/types.ts',
      acceptanceCriteria: [
        { id: 'ac_1', description: 'Stripe charges work' },
        { id: 'ac_2', description: 'Refunds succeed' },
      ],
      requiredEvidence: [
        { id: 'ev_1', type: 'GIT_DIFF', description: 'Scope diff', mandatory: true },
        { id: 'ev_2', type: 'TEST_REPORT', description: 'Integration tests output', mandatory: false },
      ],
      requiresApproval: false,
    }

    const result = validateAndBuildCreateRunPayload(state)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.payload.goal).toBe('Implement payment gateway')
      expect(result.payload.repository).toBe('c:/repos/gateway')
      expect(result.payload.baseBranch).toBe('feat/checkout')
      expect(result.payload.constraints).toEqual(['src/gateway.ts', 'src/types.ts'])
      expect(result.payload.requiresApproval).toBe(false)

      expect(result.payload.acceptanceCriteria).toEqual([
        { id: 'ac_1', description: 'Stripe charges work', verificationMethod: undefined },
        { id: 'ac_2', description: 'Refunds succeed', verificationMethod: undefined },
      ])

      expect(result.payload.requiredEvidence).toEqual([
        { id: 'ev_1', type: 'GIT_DIFF', description: 'Scope diff', mandatory: true },
        { id: 'ev_2', type: 'TEST_REPORT', description: 'Integration tests output', mandatory: false },
      ])
    }
  })

  it('includes projectContext when project fields are provided', () => {
    const state: ComposerFormState = {
      ...baseValidState,
      projectName: 'PaymentService',
      projectSummary: 'Handles card billing',
      technicalConstraints: 'Zero secrets in prompt',
      projectInstructions: 'Use strict type annotations',
    }

    const result = validateAndBuildCreateRunPayload(state)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.payload.projectContext).toEqual({
        projectName: 'PaymentService',
        projectSummary: 'Handles card billing',
        technicalConstraints: 'Zero secrets in prompt',
        projectInstructions: 'Use strict type annotations',
      })
    }
  })

  it('omits projectContext when all project fields are blank or whitespace', () => {
    const state: ComposerFormState = {
      ...baseValidState,
      projectName: '   ',
      projectSummary: '',
      technicalConstraints: undefined,
      projectInstructions: '  ',
    }

    const result = validateAndBuildCreateRunPayload(state)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.payload.projectContext).toBeUndefined()
    }
  })

  it('validates and constructs multi-task DAG payload when mode is DAG', () => {
    const validDagTasks = JSON.stringify([
      {
        id: 't-1',
        title: 'Task 1',
        objective: 'Objective 1',
        dependencies: [],
        requiresApproval: true,
      },
      {
        id: 't-2',
        title: 'Task 2',
        objective: 'Objective 2',
        dependencies: ['t-1'],
        requiresApproval: true,
      },
    ])

    const state: ComposerFormState = {
      ...baseValidState,
      mode: 'DAG',
      maxConcurrency: 3,
      dagTasksJson: validDagTasks,
    }

    const result = validateAndBuildCreateRunPayload(state)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.payload.maxConcurrency).toBe(3)
      expect(result.payload.tasks).toHaveLength(2)
      expect(result.payload.tasks![0]!.id).toBe('t-1')
      expect(result.payload.tasks![1]!.dependencies).toEqual(['t-1'])
    }
  })

  it('rejects invalid JSON or incomplete tasks in DAG mode', () => {
    const invalidJsonState: ComposerFormState = {
      ...baseValidState,
      mode: 'DAG',
      dagTasksJson: '{ invalid json',
    }
    const res1 = validateAndBuildCreateRunPayload(invalidJsonState)
    expect(res1.valid).toBe(false)

    const incompleteTaskState: ComposerFormState = {
      ...baseValidState,
      mode: 'DAG',
      dagTasksJson: JSON.stringify([{ id: 't-1', title: 'Task 1' }]), // missing objective
    }
    const res2 = validateAndBuildCreateRunPayload(incompleteTaskState)
    expect(res2.valid).toBe(false)
  })
})
