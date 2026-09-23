/**
 * Gravitas 3D Headquarters — Handoff Visual Intent Module (Wave 12H)
 *
 * Converts authoritative ArtifactCustodyState into presentation-domain visual intent.
 *
 * INVARIANTS:
 * - PURE & DETERMINISTIC.
 * - "IN_TRANSIT" is PRESENTATION-ONLY; it never implies backend handoff advancement.
 * - VISUAL ARRIVAL DOES NOT SATISFY HANDOFF.
 * - NO THREE.JS, NO DOM, NO RAF, NO TIMERS.
 */

import type {
  ArtifactCustodyState,
  ArtifactCustodyLocation,
  VerificationState,
  ReviewState,
  IntegrationState,
} from './artifactCustody.js'

export type ArtifactVisualPhase =
  | 'AT_SOURCE'
  | 'AVAILABLE_FOR_HANDOFF'
  | 'IN_TRANSIT'
  | 'AT_DESTINATION'
  | 'FAILED_HOLD'
  | 'AWAITING_HUMAN_APPROVAL'
  | 'COMPLETED'

export interface ArtifactVisualIntent {
  readonly artifactId: string
  readonly taskId: string
  readonly sourceLocation: ArtifactCustodyLocation
  readonly destinationLocation: ArtifactCustodyLocation
  readonly visualPhase: ArtifactVisualPhase
  readonly handoffId?: string | undefined
  readonly handoffKind?: string | undefined
  readonly handoffState?: string | undefined
  readonly verificationState: VerificationState
  readonly reviewState: ReviewState
  readonly integrationState: IntegrationState
  readonly requiresHumanApproval: boolean
  readonly commitSha?: string | undefined
  readonly reasonCode?: string | undefined
  readonly projectionEpoch: string
  readonly projectionRevision: number
}

export function deriveArtifactVisualIntents(
  custodyStates: readonly ArtifactCustodyState[],
  previousIntents?: ReadonlyMap<string, ArtifactVisualIntent>
): ReadonlyMap<string, ArtifactVisualIntent> {
  const result = new Map<string, ArtifactVisualIntent>()

  for (const state of custodyStates) {
    const prev = previousIntents?.get(state.artifactId)

    // Determine visual phase
    let phase: ArtifactVisualPhase = 'AT_SOURCE'
    let sourceLoc: ArtifactCustodyLocation = state.custodyLocation
    const destLoc: ArtifactCustodyLocation = state.custodyLocation

    if (state.custodyLocation === 'FAILURE_HOLD') {
      phase = 'FAILED_HOLD'
    } else if (state.custodyLocation === 'APPROVAL_PLINTH') {
      phase = 'AWAITING_HUMAN_APPROVAL'
    } else if (state.custodyLocation === 'COMPLETED_TRAY') {
      phase = 'COMPLETED'
    } else if (state.custodyLocation === 'REVIEW_INBOX' || state.custodyLocation === 'INTEGRATION_INBOX') {
      phase = 'AVAILABLE_FOR_HANDOFF'
    } else if (state.custodyLocation === 'REVIEW_BENCH' || state.custodyLocation === 'INTEGRATION_BENCH') {
      phase = 'AT_DESTINATION'
    } else {
      phase = 'AT_SOURCE'
    }

    if (prev) {
      sourceLoc = prev.destinationLocation
      // If epoch changed or destination changed, trigger transit animation
      if (prev.destinationLocation !== destLoc && prev.projectionEpoch === state.projectionEpoch) {
        phase = 'IN_TRANSIT'
      } else if (prev.projectionEpoch !== state.projectionEpoch) {
        // Epoch invalidation: reset source to destination immediately
        sourceLoc = destLoc
      }
    }

    result.set(state.artifactId, {
      artifactId: state.artifactId,
      taskId: state.taskId,
      sourceLocation: sourceLoc,
      destinationLocation: destLoc,
      visualPhase: phase,
      handoffId: state.handoffId,
      handoffKind: state.handoffKind,
      handoffState: state.handoffState,
      verificationState: state.verificationState,
      reviewState: state.reviewState,
      integrationState: state.integrationState,
      requiresHumanApproval: state.requiresHumanApproval,
      commitSha: state.commitSha,
      reasonCode: state.reasonCode,
      projectionEpoch: state.projectionEpoch,
      projectionRevision: state.projectionRevision,
    })
  }

  return result
}
