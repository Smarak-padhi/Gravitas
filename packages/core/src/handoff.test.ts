import { describe, expect, it } from 'vitest'
import {
  createArtifactRef,
  createTaskHandoff,
  validateArtifactCustody,
  type IndependentReviewResult,
  type IntegrationPreparationResult,
  type TaskArtifactRef,
  type TaskHandoff,
} from './handoff.js'

describe('Canonical Task Handoff & Custody Contract (Wave 12F)', () => {
  it('creates valid dependency handoff with default state and reason', () => {
    const handoff = createTaskHandoff({
      kind: 'DEPENDENCY',
      sourceTaskId: 'task_fe',
      targetTaskId: 'task_be',
      sourceRoleId: 'role:engineering:frontend-engineer',
      targetRoleId: 'role:engineering:backend-engineer',
    })

    expect(handoff.id).toBe('handoff_task_fe_to_task_be_dependency')
    expect(handoff.kind).toBe('DEPENDENCY')
    expect(handoff.sourceTaskId).toBe('task_fe')
    expect(handoff.targetTaskId).toBe('task_be')
    expect(handoff.sourceRoleId).toBe('role:engineering:frontend-engineer')
    expect(handoff.targetRoleId).toBe('role:engineering:backend-engineer')
    expect(handoff.state).toBe('BLOCKED')
    expect(handoff.reasonCode).toBe('UPSTREAM_PENDING')
  })

  it('rejects empty sourceTaskId or targetTaskId', () => {
    expect(() =>
      createTaskHandoff({
        kind: 'DEPENDENCY',
        sourceTaskId: '',
        targetTaskId: 'task_target',
      })
    ).toThrow('TaskHandoff requires a non-empty sourceTaskId')

    expect(() =>
      createTaskHandoff({
        kind: 'DEPENDENCY',
        sourceTaskId: 'task_source',
        targetTaskId: '   ',
      })
    ).toThrow('TaskHandoff requires a non-empty targetTaskId')
  })

  it('rejects self-handoff (sourceTaskId == targetTaskId)', () => {
    expect(() =>
      createTaskHandoff({
        kind: 'DEPENDENCY',
        sourceTaskId: 'task_same',
        targetTaskId: 'task_same',
      })
    ).toThrow("Self-handoff forbidden: task 'task_same' cannot hand off to itself")
  })

  it('enforces reviewer independence when creating REVIEW handoff', () => {
    // Author role == Reviewer role must fail
    expect(() =>
      createTaskHandoff({
        kind: 'REVIEW',
        sourceTaskId: 'task_fe',
        targetTaskId: 'task_fe_review',
        sourceRoleId: 'role:engineering:frontend-engineer',
        targetRoleId: 'role:engineering:frontend-engineer',
      })
    ).toThrow(/Violation of Reviewer Independence/i)

    // Different reviewer role passes
    const reviewHandoff = createTaskHandoff({
      kind: 'REVIEW',
      sourceTaskId: 'task_fe',
      targetTaskId: 'task_fe_review',
      sourceRoleId: 'role:engineering:frontend-engineer',
      targetRoleId: 'role:quality:independent-reviewer',
    })
    expect(reviewHandoff.kind).toBe('REVIEW')
    expect(reviewHandoff.targetRoleId).toBe('role:quality:independent-reviewer')
  })

  it('validates artifact custody correctly', () => {
    const handoff: TaskHandoff = createTaskHandoff({
      kind: 'INTEGRATION',
      sourceTaskId: 'task_fe',
      targetTaskId: 'task_integration',
      sourceRoleId: 'role:engineering:frontend-engineer',
      targetRoleId: 'role:integration:integration-engineer',
      requiredArtifactIds: ['fe_bundle', 'fe_types'],
    })

    const artifact1: TaskArtifactRef = createArtifactRef({
      artifactId: 'fe_bundle',
      sourceTaskId: 'task_fe',
      sourceRoleId: 'role:engineering:frontend-engineer',
      verificationState: 'VERIFIED',
    })

    // Initially missing 'fe_types'
    const res1 = validateArtifactCustody({
      handoff,
      availableArtifacts: [artifact1],
    })
    expect(res1.satisfied).toBe(false)
    expect(res1.missingArtifacts).toEqual(['fe_types'])

    // With failed verification state on second artifact
    const artifact2Failed: TaskArtifactRef = createArtifactRef({
      artifactId: 'fe_types',
      sourceTaskId: 'task_fe',
      sourceRoleId: 'role:engineering:frontend-engineer',
      verificationState: 'FAILED',
    })
    const res2 = validateArtifactCustody({
      handoff,
      availableArtifacts: [artifact1, artifact2Failed],
    })
    expect(res2.satisfied).toBe(false)
    expect(res2.missingArtifacts).toEqual(['fe_types'])

    // With verified second artifact
    const artifact2Verified: TaskArtifactRef = createArtifactRef({
      artifactId: 'fe_types',
      sourceTaskId: 'task_fe',
      sourceRoleId: 'role:engineering:frontend-engineer',
      verificationState: 'VERIFIED',
    })
    const res3 = validateArtifactCustody({
      handoff,
      availableArtifacts: [artifact1, artifact2Verified],
    })
    expect(res3.satisfied).toBe(true)
    expect(res3.missingArtifacts).toHaveLength(0)
  })

  it('preserves structured review result contract', () => {
    const reviewResult: IndependentReviewResult = {
      reviewedTaskId: 'task_fe_01',
      reviewerTaskId: 'task_rev_01',
      reviewerRoleId: 'role:quality:independent-reviewer',
      reviewerHarnessId: 'codex-worker',
      verdict: 'CHANGES_REQUIRED',
      findings: [
        {
          severity: 'BLOCKER',
          path: 'apps/web/src/App.tsx',
          message: 'Unhandled state reconciliation error',
        },
      ],
      timestamp: '2026-09-22T20:00:00.000Z',
    }

    expect(reviewResult.verdict).toBe('CHANGES_REQUIRED')
    expect(reviewResult.findings[0]?.severity).toBe('BLOCKER')
    expect(reviewResult.reviewerRoleId).toBe('role:quality:independent-reviewer')
  })

  it('preserves structured integration preparation result contract', () => {
    const integrationResult: IntegrationPreparationResult = {
      sourceTaskIds: ['task_fe_01', 'task_be_01'],
      integrationTaskId: 'task_int_01',
      disposition: 'READY_FOR_VERIFICATION',
      conflictFiles: [],
      candidateRef: 'refs/heads/candidate-int-01',
      details: 'Clean composition without merge conflicts',
      timestamp: '2026-09-22T20:10:00.000Z',
    }

    expect(integrationResult.disposition).toBe('READY_FOR_VERIFICATION')
    expect(integrationResult.conflictFiles).toHaveLength(0)
    expect(integrationResult.sourceTaskIds).toEqual(['task_fe_01', 'task_be_01'])
  })
})
