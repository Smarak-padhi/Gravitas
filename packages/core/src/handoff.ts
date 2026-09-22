/**
 * Canonical Task Handoff, Artifact Custody, Review & Integration Model (Wave 12F)
 *
 * Invariants:
 * 1. Role identity is canonical backend truth.
 * 2. A handoff is a canonical dependency/custody transition, NOT a character animation.
 * 3. Reviewer independence: author role != reviewer role when independent review is required.
 * 4. Integration Engineer does NOT receive merge authority; human approval remains sovereign.
 * 5. Deterministic verification and Browser QA remain infrastructure.
 * 6. Zero presentation concerns: no Three.js, wardrobe, colors, or spatial coordinates.
 */

import type { AgentRoleId } from './roles.js'
import { checkReviewerIndependence } from './roles.js'

export type HandoffKind =
  | 'DEPENDENCY'
  | 'REVIEW'
  | 'INTEGRATION'
  | 'VERIFICATION'
  | 'APPROVAL'

export type HandoffState =
  | 'BLOCKED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'SATISFIED'
  | 'FAILED'

export type HandoffReasonCode =
  | 'UPSTREAM_PENDING'
  | 'UPSTREAM_SATISFIED'
  | 'UPSTREAM_FAILED'
  | 'UPSTREAM_CANCELLED'
  | 'ARTIFACT_MISSING'
  | 'ARTIFACT_VERIFIED'
  | 'REVIEW_REQUIRED'
  | 'REVIEW_PENDING'
  | 'REVIEW_PASSED'
  | 'REVIEW_CHANGES_REQUIRED'
  | 'REVIEW_BLOCKED'
  | 'INTEGRATION_PENDING'
  | 'INTEGRATION_READY'
  | 'INTEGRATION_CONFLICT'
  | 'INDEPENDENCE_VIOLATION'
  | 'VERIFICATION_PENDING'
  | 'VERIFICATION_PASSED'
  | 'VERIFICATION_FAILED'
  | 'APPROVAL_PENDING'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_REJECTED'

/**
 * Canonical representation of custody or dependency transfer between two tasks and their assigned roles.
 */
export interface TaskHandoff {
  readonly id: string
  readonly kind: HandoffKind
  readonly sourceTaskId: string
  readonly targetTaskId: string
  readonly sourceRoleId?: AgentRoleId | undefined
  readonly targetRoleId?: AgentRoleId | undefined
  readonly requiredArtifactIds: readonly string[]
  readonly state: HandoffState
  readonly reasonCode: HandoffReasonCode
  readonly details?: string | undefined
}

/**
 * Structured reference to an artifact produced by a task, documenting role and harness provenance.
 */
export interface TaskArtifactRef {
  readonly artifactId: string
  readonly sourceTaskId: string
  readonly sourceRoleId?: AgentRoleId | undefined
  readonly sourceHarnessId?: string | undefined
  readonly commitSha?: string | undefined
  readonly verificationState?: 'VERIFIED' | 'UNVERIFIED' | 'FAILED' | undefined
  readonly evidenceRef?: string | undefined
  readonly contentHash?: string | undefined
  readonly createdAt: string
}

/**
 * Machine-readable verdict from an independent reviewer role.
 */
export type ReviewVerdict =
  | 'PASS'
  | 'CHANGES_REQUIRED'
  | 'BLOCKED'

export interface ReviewFinding {
  readonly severity: 'INFO' | 'WARNING' | 'BLOCKER'
  readonly path?: string | undefined
  readonly message: string
}

/**
 * Structured review result emitted by an Independent Reviewer task.
 */
export interface IndependentReviewResult {
  readonly reviewedTaskId: string
  readonly reviewerTaskId: string
  readonly reviewerRoleId: AgentRoleId
  readonly reviewerHarnessId?: string | undefined
  readonly verdict: ReviewVerdict
  readonly findings: readonly ReviewFinding[]
  readonly timestamp: string
}

/**
 * Machine-readable disposition of integration preparation.
 */
export type IntegrationDisposition =
  | 'READY_FOR_VERIFICATION'
  | 'CONFLICT'
  | 'BLOCKED'

/**
 * Structured result emitted by an Integration Engineer task before verification.
 */
export interface IntegrationPreparationResult {
  readonly sourceTaskIds: readonly string[]
  readonly integrationTaskId: string
  readonly disposition: IntegrationDisposition
  readonly conflictFiles: readonly string[]
  readonly candidateRef?: string | undefined
  readonly details?: string | undefined
  readonly timestamp: string
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

export function createTaskHandoff(params: {
  readonly id?: string | undefined
  readonly kind: HandoffKind
  readonly sourceTaskId: string
  readonly targetTaskId: string
  readonly sourceRoleId?: AgentRoleId | undefined
  readonly targetRoleId?: AgentRoleId | undefined
  readonly requiredArtifactIds?: readonly string[] | undefined
  readonly state?: HandoffState | undefined
  readonly reasonCode?: HandoffReasonCode | undefined
  readonly details?: string | undefined
}): TaskHandoff {
  if (!params.sourceTaskId || params.sourceTaskId.trim() === '') {
    throw new Error('TaskHandoff requires a non-empty sourceTaskId')
  }
  if (!params.targetTaskId || params.targetTaskId.trim() === '') {
    throw new Error('TaskHandoff requires a non-empty targetTaskId')
  }
  if (params.sourceTaskId === params.targetTaskId) {
    throw new Error(`Self-handoff forbidden: task '${params.sourceTaskId}' cannot hand off to itself`)
  }

  // Validate independent reviewer rule if applicable
  if (params.kind === 'REVIEW' && params.sourceRoleId && params.targetRoleId) {
    const independence = checkReviewerIndependence(params.sourceRoleId, params.targetRoleId)
    if (!independence.allowed) {
      throw new Error(independence.reason ?? 'Independence violation')
    }
  }

  const id = params.id ?? `handoff_${params.sourceTaskId}_to_${params.targetTaskId}_${params.kind.toLowerCase()}`
  const state = params.state ?? 'BLOCKED'
  const reasonCode = params.reasonCode ?? (state === 'BLOCKED' ? 'UPSTREAM_PENDING' : 'UPSTREAM_SATISFIED')

  return Object.freeze({
    id,
    kind: params.kind,
    sourceTaskId: params.sourceTaskId,
    targetTaskId: params.targetTaskId,
    ...(params.sourceRoleId ? { sourceRoleId: params.sourceRoleId } : {}),
    ...(params.targetRoleId ? { targetRoleId: params.targetRoleId } : {}),
    requiredArtifactIds: Object.freeze([...(params.requiredArtifactIds ?? [])]),
    state,
    reasonCode,
    ...(params.details ? { details: params.details } : {}),
  })
}

/**
 * Validates that all required artifacts for a handoff exist and are verified.
 */
export function validateArtifactCustody(params: {
  readonly handoff: TaskHandoff
  readonly availableArtifacts: readonly TaskArtifactRef[]
}): { readonly satisfied: boolean; readonly missingArtifacts: readonly string[] } {
  const missingArtifacts: string[] = []
  const availableSet = new Map<string, TaskArtifactRef>()
  for (const art of params.availableArtifacts) {
    if (art.sourceTaskId === params.handoff.sourceTaskId) {
      availableSet.set(art.artifactId, art)
    }
  }

  for (const reqId of params.handoff.requiredArtifactIds) {
    const art = availableSet.get(reqId)
    if (!art || art.verificationState === 'FAILED') {
      missingArtifacts.push(reqId)
    }
  }

  return {
    satisfied: missingArtifacts.length === 0,
    missingArtifacts: Object.freeze(missingArtifacts),
  }
}

/**
 * Creates an authoritative TaskArtifactRef.
 */
export function createArtifactRef(params: {
  readonly artifactId: string
  readonly sourceTaskId: string
  readonly sourceRoleId?: AgentRoleId | undefined
  readonly sourceHarnessId?: string | undefined
  readonly commitSha?: string | undefined
  readonly verificationState?: 'VERIFIED' | 'UNVERIFIED' | 'FAILED' | undefined
  readonly evidenceRef?: string | undefined
  readonly contentHash?: string | undefined
  readonly createdAt?: string | undefined
}): TaskArtifactRef {
  if (!params.artifactId || params.artifactId.trim() === '') {
    throw new Error('TaskArtifactRef requires a non-empty artifactId')
  }
  if (!params.sourceTaskId || params.sourceTaskId.trim() === '') {
    throw new Error('TaskArtifactRef requires a non-empty sourceTaskId')
  }

  return Object.freeze({
    artifactId: params.artifactId,
    sourceTaskId: params.sourceTaskId,
    ...(params.sourceRoleId ? { sourceRoleId: params.sourceRoleId } : {}),
    ...(params.sourceHarnessId ? { sourceHarnessId: params.sourceHarnessId } : {}),
    ...(params.commitSha ? { commitSha: params.commitSha } : {}),
    verificationState: params.verificationState ?? 'UNVERIFIED',
    ...(params.evidenceRef ? { evidenceRef: params.evidenceRef } : {}),
    ...(params.contentHash ? { contentHash: params.contentHash } : {}),
    createdAt: params.createdAt ?? new Date().toISOString(),
  })
}
