/**
 * Gravitas 3D Headquarters — Artifact Custody Conduits & Spatial Topology (Wave 12H)
 *
 * Defines deterministic 3D positions for physical custody locations and discrete
 * conduit transit trajectories with explicit lane offsets (avoiding character corridors).
 *
 * Invariant: Lane separation guarantees artifact conduits never visually overlap character centers.
 */

import type { ArtifactCustodyLocation } from './artifactCustody.js'

export interface CustodyLocationPoint {
  readonly id: ArtifactCustodyLocation
  readonly position: readonly [number, number, number] // [x, y, z]
  readonly name: string
  readonly roomName: string
  readonly description: string
}

// Vertical cutaway tower elevations: Floor 0 (0m), Floor 1 (3.6m), Floor 2 (7.2m), Floor 3 (10.8m), Floor 4 (14.4m), Floor 5 (18m), Floor 6 (21.6m)
export const CUSTODY_LOCATIONS: Record<ArtifactCustodyLocation, CustodyLocationPoint> = {
  PRODUCER_DESK: {
    id: 'PRODUCER_DESK',
    position: [-2.5, 7.98, 0.5],
    name: 'Authoring Workstation Surface',
    roomName: 'Agent Operations',
    description: 'Active drafting surface where candidate work products are authored on Floor 2.',
  },
  REVIEW_INBOX: {
    id: 'REVIEW_INBOX',
    position: [-1.5, 11.58, 0.5],
    name: 'Review Intake Dock',
    roomName: 'Verification Lab',
    description: 'Airlock staging plinth where verified candidate dossiers await independent review on Floor 3.',
  },
  REVIEW_BENCH: {
    id: 'REVIEW_BENCH',
    position: [0.0, 11.75, 0.5],
    name: 'Verification Cleanroom Review Console',
    roomName: 'Verification Lab',
    description: 'Cleanroom audit console where Independent Reviewer conducts architectural inspection.',
  },
  INTEGRATION_INBOX: {
    id: 'INTEGRATION_INBOX',
    position: [0.0, 7.98, -1.5],
    name: 'Integration Intake Staging Tray',
    roomName: 'Agent Operations',
    description: 'Staging tray where passed review candidates await branch composition on Floor 2.',
  },
  INTEGRATION_BENCH: {
    id: 'INTEGRATION_BENCH',
    position: [2.5, 7.98, 0.5],
    name: 'Integration & Conflict Inspection Bench',
    roomName: 'Agent Operations',
    description: 'Worktree composition bench for conflict inspection and candidate staging.',
  },
  APPROVAL_PLINTH: {
    id: 'APPROVAL_PLINTH',
    position: [0.0, 22.5, 0.5],
    name: 'Approval Control Plinth',
    roomName: 'Approval Mezzanine',
    description: 'Command plinth where verified candidate releases await sovereign human authorization on Floor 6.',
  },
  COMPLETED_TRAY: {
    id: 'COMPLETED_TRAY',
    position: [3.5, 1.15, 0.5],
    name: 'Completed Release Repository Dock',
    roomName: 'Mezzanine Vault',
    description: 'Final repository archive dock where approved changes are permanently sealed on Level 0.',
  },
  FAILURE_HOLD: {
    id: 'FAILURE_HOLD',
    position: [-2.8, 4.48, 1.2],
    name: 'Quarantine & Failure Hold',
    roomName: 'Mission Control Quarantine',
    description: 'Diagnostic holding tray where rejected or failing candidates halt for inspection on Floor 1.',
  },
  NEUTRAL_HOLD: {
    id: 'NEUTRAL_HOLD',
    position: [0.0, 7.98, 0.5],
    name: 'Mission Planning Neutral Stash',
    roomName: 'Agent Operations',
    description: 'Central neutral hold at planning table for unregistered tasks or pending allocations on Floor 1.',
  },
}

/**
 * Returns role-specific producer desk coordinate if available.
 */
export function getProducerDeskCoordinate(sourceRoleId?: string): readonly [number, number, number] {
  if (sourceRoleId === 'role:engineering:backend-engineer') {
    return [2.5, 7.98, 0.5]
  }
  if (sourceRoleId === 'role:strategy:chief-planner') {
    return [0.0, 4.48, 0.5]
  }
  if (sourceRoleId === 'role:quality:independent-reviewer') {
    return [0.0, 11.75, 0.5]
  }
  return [-2.5, 7.98, 0.5] // Default Frontend Engineer workstation
}

/**
 * Returns deterministic conduit trajectory between two custody locations.
 * Uses elevated conduit lane offsets to prevent visual collision with character footpaths.
 */
export function getConduitTrajectory(
  source: ArtifactCustodyLocation,
  destination: ArtifactCustodyLocation,
  sourceRoleId?: string
): readonly (readonly [number, number, number])[] {
  const start: readonly [number, number, number] =
    source === 'PRODUCER_DESK'
      ? getProducerDeskCoordinate(sourceRoleId)
      : CUSTODY_LOCATIONS[source].position

  const end = CUSTODY_LOCATIONS[destination].position

  if (source === destination) {
    return [start]
  }

  // Intermediate routing with elevated lane offset
  // Character aisle is at X = -4.0. Artifact transit runs at X = -3.6, Y = 0.85
  const waypoints: (readonly [number, number, number])[] = [start]

  // Producer -> Review Intake
  if (source === 'PRODUCER_DESK' && (destination === 'REVIEW_INBOX' || destination === 'REVIEW_BENCH')) {
    waypoints.push([-3.6, 0.85, start[2]])
    waypoints.push([-3.6, 0.85, 3.65])
    waypoints.push([2.0, 0.85, 3.65])
    if (destination === 'REVIEW_BENCH') {
      waypoints.push([7.2, 0.85, 4.0])
    }
    return Object.freeze(waypoints)
  }

  // Review Bench -> Approval Plinth (ascends staircase conduit)
  if (
    (source === 'REVIEW_BENCH' || source === 'INTEGRATION_BENCH' || source === 'PRODUCER_DESK') &&
    destination === 'APPROVAL_PLINTH'
  ) {
    waypoints.push([-3.6, 0.85, start[2]])
    waypoints.push([-1.6, 1.2, 3.5]) // Staircase entry conduit
    waypoints.push([-0.8, 2.5, 5.5]) // Staircase mid conduit
    waypoints.push([0.0, 3.75, 7.5]) // Mezzanine conduit
    waypoints.push(end)
    return Object.freeze(waypoints)
  }

  // Generic direct elevated transit
  const midY = Math.max(start[1], end[1]) + 0.1
  waypoints.push([(start[0] + end[0]) / 2, midY, (start[2] + end[2]) / 2])
  waypoints.push(end)
  return Object.freeze(waypoints)
}
