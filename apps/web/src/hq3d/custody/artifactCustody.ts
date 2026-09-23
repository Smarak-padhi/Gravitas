/**
 * Gravitas 3D Headquarters — Pure Artifact Custody Derivation (Wave 12H)
 *
 * Implements pure, deterministic derivation of authoritative work product custody:
 * CANONICAL TASK + HANDOFF + ARTIFACT STATE
 *               ↓
 *   RuntimeProjectionSnapshot
 *               ↓
 *      deriveWorldState()
 *               ↓
 *   deriveArtifactCustody()
 *               ↓
 *      ArtifactCustodyState[]
 *
 * INVARIANTS:
 * - PURE, DETERMINISTIC, SIDE-EFFECT FREE.
 * - ARTIFACT CUSTODY != CHARACTER POSITION
 * - HANDOFF READY != CHARACTER ARRIVAL
 * - HANDOFF SATISFACTION != ANIMATION COMPLETE
 * - REVIEW PASSED != INTEGRATED
 * - INTEGRATION PREPARED != MERGED
 * - WAITING_APPROVAL != APPROVED
 * - NO THREE.JS, NO DOM, NO DATE.NOW, NO MATH.RANDOM, NO TIMERS, NO RAF.
 */

import type { Task, AgentRoleId } from '@gravitas/core'
import type {
  RuntimeProjectionSnapshot,
  ArtifactCustodyLocation,
  RuntimeHandoffProjection,
  RuntimeArtifactProjection,
} from '../../api/types.js'
import type { WorldState, WorldHandoffState } from '../world/worldState.js'

export type { ArtifactCustodyLocation }

export type VerificationState = 'UNVERIFIED' | 'VERIFYING' | 'VERIFIED' | 'FAILED'
export type ReviewState = 'NOT_REQUIRED' | 'PENDING' | 'IN_REVIEW' | 'PASSED' | 'CHANGES_REQUIRED'
export type IntegrationState = 'NOT_READY' | 'READY' | 'PREPARING' | 'PREPARED' | 'CONFLICT' | 'INTEGRATED'

export interface ArtifactCustodyState {
  readonly artifactId: string
  readonly taskId: string
  readonly sourceRoleId?: AgentRoleId | string | undefined
  readonly sourceHarnessId?: string | undefined
  readonly targetRoleId?: AgentRoleId | string | undefined
  readonly handoffId?: string | undefined
  readonly handoffKind?: 'DEPENDENCY' | 'REVIEW' | 'INTEGRATION' | 'VERIFICATION' | 'APPROVAL' | string | undefined
  readonly handoffState?: 'BLOCKED' | 'READY' | 'IN_PROGRESS' | 'SATISFIED' | 'FAILED' | string | undefined
  readonly custodyLocation: ArtifactCustodyLocation
  readonly verificationState: VerificationState
  readonly reviewState: ReviewState
  readonly integrationState: IntegrationState
  readonly requiresHumanApproval: boolean
  readonly commitSha?: string | undefined
  readonly reasonCode?: string | undefined
  readonly projectionEpoch: string
  readonly projectionRevision: number
}

export interface DeriveArtifactCustodyInput {
  readonly projection: RuntimeProjectionSnapshot
  readonly tasks?: readonly Task[] | Record<string, any> | undefined
  readonly worldState?: WorldState | undefined
}

export function deriveArtifactCustody(input: DeriveArtifactCustodyInput): readonly ArtifactCustodyState[] {
  const { projection, worldState } = input
  const projectionEpoch = projection.epoch
  const projectionRevision = projection.revision

  // Gather normalized tasks
  const taskMap = new Map<string, any>()
  if (worldState && worldState.tasks) {
    for (const [id, t] of Object.entries(worldState.tasks)) {
      taskMap.set(id, t)
    }
  }
  if (input.tasks) {
    if (Array.isArray(input.tasks)) {
      for (const t of input.tasks) {
        if (t && t.id) taskMap.set(t.id, t)
      }
    } else if (typeof input.tasks === 'object') {
      for (const [id, t] of Object.entries(input.tasks)) {
        if (t && (t as any).id) taskMap.set(id, t)
      }
    }
  }

  // Gather handoffs
  const handoffs: Array<RuntimeHandoffProjection | WorldHandoffState> = []
  if (worldState && worldState.handoffs) {
    handoffs.push(...worldState.handoffs)
  }
  if (projection.handoffs) {
    for (const h of projection.handoffs) {
      const hId = (h as any).handoffId ?? (h as any).id
      if (!handoffs.some((existing) => ((existing as any).handoffId ?? (existing as any).id) === hId)) {
        handoffs.push(h)
      }
    }
  }

  // Check if projection explicitly declares artifacts
  const explicitArtifacts: RuntimeArtifactProjection[] = projection.artifacts ? [...projection.artifacts] : []

  const results: ArtifactCustodyState[] = []
  const processedTaskIds = new Set<string>()

  // 1. Process explicit projected artifacts
  for (const art of explicitArtifacts) {
    processedTaskIds.add(art.sourceTaskId)
    const task = taskMap.get(art.sourceTaskId)
    const matchingHandoff = handoffs.find(
      (h) => h.sourceTaskId === art.sourceTaskId || (h as any).targetTaskId === art.sourceTaskId
    )
    if (matchingHandoff && matchingHandoff.targetTaskId) {
      processedTaskIds.add(matchingHandoff.targetTaskId)
    }

    // Derive location with authoritative overrides
    let location: ArtifactCustodyLocation = art.currentCustody ?? 'PRODUCER_DESK'
    let verification: VerificationState = art.verificationState ?? 'VERIFIED'
    let review: ReviewState = art.reviewState ?? 'NOT_REQUIRED'
    let integration: IntegrationState = art.integrationState ?? 'NOT_READY'
    let requiresApproval = Boolean((art as any).requiresHumanApproval)

    if (task) {
      const taskState = task.canonicalState ?? task.state
      if (task.requiresApproval || taskState === 'WAITING_APPROVAL') {
        requiresApproval = true
      }

      if (taskState === 'FAILED' || taskState === 'CANCELLED') {
        location = 'FAILURE_HOLD'
        verification = 'FAILED'
        requiresApproval = false
      } else if (taskState === 'WAITING_APPROVAL') {
        location = 'APPROVAL_PLINTH'
        requiresApproval = true
      } else if (taskState === 'APPROVED' || taskState === 'SUCCEEDED') {
        location = 'COMPLETED_TRAY'
        if (review === 'IN_REVIEW' || review === 'PENDING') review = 'PASSED'
        if (integration === 'PREPARING' || integration === 'READY') integration = 'INTEGRATED'
        requiresApproval = false
      }
    }

    if (matchingHandoff) {
      const hState = matchingHandoff.state
      const hKind = matchingHandoff.kind

      if (hKind === 'REVIEW') {
        if (hState === 'BLOCKED') {
          location = 'PRODUCER_DESK'
          review = 'PENDING'
        } else if (hState === 'READY') {
          location = 'REVIEW_INBOX'
          review = 'PENDING'
        } else if (hState === 'IN_PROGRESS') {
          location = 'REVIEW_BENCH'
          review = 'IN_REVIEW'
        } else if (hState === 'SATISFIED') {
          location = 'INTEGRATION_INBOX'
          review = 'PASSED'
          verification = 'VERIFIED'
        } else if (hState === 'FAILED') {
          location = 'FAILURE_HOLD'
          review = matchingHandoff.reasonCode === 'REVIEW_CHANGES_REQUIRED' ? 'CHANGES_REQUIRED' : 'NOT_REQUIRED'
        }
      } else if (hKind === 'INTEGRATION') {
        if (hState === 'READY') {
          location = 'INTEGRATION_INBOX'
          integration = 'READY'
        } else if (hState === 'IN_PROGRESS') {
          location = 'INTEGRATION_BENCH'
          integration = 'PREPARING'
        } else if (hState === 'SATISFIED') {
          location = 'INTEGRATION_BENCH'
          integration = 'PREPARED'
        } else if (hState === 'FAILED') {
          location = 'FAILURE_HOLD'
          integration = matchingHandoff.reasonCode === 'INTEGRATION_CONFLICT' ? 'CONFLICT' : 'NOT_READY'
        }
      } else if (hKind === 'APPROVAL') {
        if (hState === 'READY') {
          location = 'APPROVAL_PLINTH'
          requiresApproval = true
        } else if (hState === 'SATISFIED') {
          location = 'COMPLETED_TRAY'
          requiresApproval = false
        } else if (hState === 'FAILED') {
          location = 'FAILURE_HOLD'
          requiresApproval = false
        }
      }
    }

    if (location === 'APPROVAL_PLINTH') {
      requiresApproval = true
    }

    results.push({
      artifactId: art.artifactId,
      taskId: art.sourceTaskId,
      sourceRoleId: (art.sourceRoleId ?? task?.roleId ?? task?.role) ?? undefined,
      sourceHarnessId: (art.sourceHarnessId ?? task?.harnessId) ?? undefined,
      targetRoleId: (matchingHandoff?.targetRoleId ?? undefined) as AgentRoleId | string | undefined,
      handoffId: (((matchingHandoff as any)?.handoffId ?? (matchingHandoff as any)?.id) ?? undefined) as string | undefined,
      handoffKind: (matchingHandoff?.kind ?? undefined) as string | undefined,
      handoffState: (matchingHandoff?.state ?? undefined) as string | undefined,
      custodyLocation: location,
      verificationState: verification,
      reviewState: review,
      integrationState: integration,
      requiresHumanApproval: requiresApproval,
      commitSha: (art.commitSha ?? undefined) as string | undefined,
      reasonCode: (matchingHandoff?.reasonCode ?? (art as any).reasonCode ?? undefined) as string | undefined,
      projectionEpoch,
      projectionRevision,
    })
  }

  // 2. Synthesize/derive custody for any active or completed tasks without explicit projected artifacts
  for (const [taskId, task] of taskMap.entries()) {
    if (processedTaskIds.has(taskId)) continue

    const taskState = task.canonicalState ?? task.state
    const roleId = task.roleId ?? task.role
    const defaultArtifactId = `artifact_${taskId}`

    const matchingHandoff = handoffs.find((h) => h.sourceTaskId === taskId)

    let location: ArtifactCustodyLocation = 'PRODUCER_DESK'
    let verification: VerificationState = 'UNVERIFIED'
    let review: ReviewState = 'NOT_REQUIRED'
    let integration: IntegrationState = 'NOT_READY'
    let requiresApproval = Boolean(task.requiresApproval)

    // Check role / station sanity
    if (roleId === 'role:custom:external-contractor' || (task as any).assignedStationId === 'unknown-remote-desk') {
      location = 'NEUTRAL_HOLD'
    } else if (taskState === 'PLANNED' || taskState === 'BLOCKED') {
      location = 'PRODUCER_DESK'
      verification = 'UNVERIFIED'
    } else if (taskState === 'READY' || taskState === 'RUNNING') {
      location = 'PRODUCER_DESK'
      verification = task.runtimePhase === 'VERIFYING' ? 'VERIFYING' : 'UNVERIFIED'
    } else if (taskState === 'VERIFYING') {
      location = 'PRODUCER_DESK'
      verification = 'VERIFYING'
    } else if (taskState === 'WAITING_APPROVAL') {
      location = 'APPROVAL_PLINTH'
      verification = 'VERIFIED'
      review = 'PASSED'
      integration = 'PREPARED'
      requiresApproval = true
    } else if (taskState === 'APPROVED' || taskState === 'SUCCEEDED') {
      location = 'COMPLETED_TRAY'
      verification = 'VERIFIED'
      review = 'PASSED'
      integration = 'INTEGRATED'
      requiresApproval = false
    } else if (taskState === 'FAILED' || taskState === 'CANCELLED') {
      location = 'FAILURE_HOLD'
      verification = 'FAILED'
      requiresApproval = false
    }

    // Apply handoff overrides if an authoritative handoff exists
    if (matchingHandoff) {
      const hState = matchingHandoff.state
      const hKind = matchingHandoff.kind

      if (hKind === 'REVIEW') {
        if (hState === 'BLOCKED') {
          location = 'PRODUCER_DESK'
          review = 'PENDING'
        } else if (hState === 'READY') {
          location = 'REVIEW_INBOX'
          review = 'PENDING'
          verification = 'VERIFIED'
        } else if (hState === 'IN_PROGRESS') {
          location = 'REVIEW_BENCH'
          review = 'IN_REVIEW'
          verification = 'VERIFIED'
        } else if (hState === 'SATISFIED') {
          location = 'REVIEW_BENCH'
          review = 'PASSED'
          verification = 'VERIFIED'
        } else if (hState === 'FAILED') {
          location = 'FAILURE_HOLD'
          review = matchingHandoff.reasonCode === 'REVIEW_CHANGES_REQUIRED' ? 'CHANGES_REQUIRED' : 'NOT_REQUIRED'
        }
      } else if (hKind === 'INTEGRATION') {
        if (hState === 'READY') {
          location = 'INTEGRATION_INBOX'
          integration = 'READY'
        } else if (hState === 'IN_PROGRESS') {
          location = 'INTEGRATION_BENCH'
          integration = 'PREPARING'
        } else if (hState === 'SATISFIED') {
          location = 'INTEGRATION_BENCH'
          integration = 'PREPARED'
        } else if (hState === 'FAILED') {
          location = 'FAILURE_HOLD'
          integration = matchingHandoff.reasonCode === 'INTEGRATION_CONFLICT' ? 'CONFLICT' : 'NOT_READY'
        }
      } else if (hKind === 'APPROVAL') {
        if (hState === 'READY') {
          location = 'APPROVAL_PLINTH'
        } else if (hState === 'SATISFIED') {
          location = 'COMPLETED_TRAY'
        } else if (hState === 'FAILED') {
          location = 'FAILURE_HOLD'
        }
      }
    }

    results.push({
      artifactId: defaultArtifactId,
      taskId,
      sourceRoleId: roleId ?? undefined,
      targetRoleId: (matchingHandoff?.targetRoleId ?? undefined) as AgentRoleId | string | undefined,
      handoffId: (((matchingHandoff as any)?.handoffId ?? (matchingHandoff as any)?.id) ?? undefined) as string | undefined,
      handoffKind: (matchingHandoff?.kind ?? undefined) as string | undefined,
      handoffState: (matchingHandoff?.state ?? undefined) as string | undefined,
      custodyLocation: location,
      verificationState: verification,
      reviewState: review,
      integrationState: integration,
      requiresHumanApproval: requiresApproval,
      commitSha: (task.commitSha ?? (task as any).routeProvenance?.commitSha ?? undefined) as string | undefined,
      reasonCode: (matchingHandoff?.reasonCode ?? undefined) as string | undefined,
      projectionEpoch,
      projectionRevision,
    })
  }

  // Deterministic sorting by artifactId
  return Object.freeze(results.sort((a, b) => a.artifactId.localeCompare(b.artifactId)))
}
