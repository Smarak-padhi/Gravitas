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

// Desk surface height is ~0.78m; conduits elevate to 0.85m; mezzanine is at Y = 3.75m.
export const CUSTODY_LOCATIONS: Record<ArtifactCustodyLocation, CustodyLocationPoint> = {
  PRODUCER_DESK: {
    id: 'PRODUCER_DESK',
    position: [-6.5, 0.78, 1.2],
    name: 'Authoring Workstation Surface',
    roomName: 'Agent Operations',
    description: 'Active drafting surface where candidate work products are authored.',
  },
  REVIEW_INBOX: {
    id: 'REVIEW_INBOX',
    position: [2.0, 0.78, 3.65],
    name: 'Review Intake Dock',
    roomName: 'Verification Lab',
    description: 'Airlock staging plinth where verified candidate dossiers await independent review.',
  },
  REVIEW_BENCH: {
    id: 'REVIEW_BENCH',
    position: [7.2, 0.78, 4.0],
    name: 'Verification Lab Review Console',
    roomName: 'Verification Lab',
    description: 'Cleanroom audit console where Independent Reviewer conducts architectural inspection.',
  },
  INTEGRATION_INBOX: {
    id: 'INTEGRATION_INBOX',
    position: [-3.6, 0.78, -2.4],
    name: 'Integration Intake Staging Tray',
    roomName: 'Agent Operations',
    description: 'Staging tray where passed review candidates await branch composition.',
  },
  INTEGRATION_BENCH: {
    id: 'INTEGRATION_BENCH',
    position: [-6.5, 0.78, -2.4],
    name: 'Integration & Conflict Inspection Bench',
    roomName: 'Agent Operations',
    description: 'Worktree composition bench for conflict inspection and candidate staging.',
  },
  APPROVAL_PLINTH: {
    id: 'APPROVAL_PLINTH',
    position: [0.0, 3.75, 8.5],
    name: 'Approval Mezzanine Plinth',
    roomName: 'Approval Mezzanine',
    description: 'Command plinth where verified candidate releases await sovereign human authorization.',
  },
  COMPLETED_TRAY: {
    id: 'COMPLETED_TRAY',
    position: [10.2, 0.78, 4.0],
    name: 'Completed Release Repository Dock',
    roomName: 'Verification Lab',
    description: 'Final repository archive dock where approved changes are permanently sealed.',
  },
  FAILURE_HOLD: {
    id: 'FAILURE_HOLD',
    position: [7.2, 0.78, 1.5],
    name: 'Quarantine & Failure Hold',
    roomName: 'Agent Operations',
    description: 'Diagnostic holding tray where rejected or failing candidates halt for inspection.',
  },
  NEUTRAL_HOLD: {
    id: 'NEUTRAL_HOLD',
    position: [-4.5, 0.78, 5.5],
    name: 'Mission Planning Neutral Stash',
    roomName: 'Agent Operations',
    description: 'Central neutral hold at planning table for unregistered tasks or pending allocations.',
  },
}

/**
 * Returns role-specific producer desk coordinate if available.
 */
export function getProducerDeskCoordinate(sourceRoleId?: string): readonly [number, number, number] {
  if (sourceRoleId === 'role:engineering:backend-engineer') {
    return [-1.8, 0.78, 1.2]
  }
  if (sourceRoleId === 'role:strategy:chief-planner') {
    return [-4.5, 0.78, 5.5]
  }
  if (sourceRoleId === 'role:quality:independent-reviewer') {
    return [7.2, 0.78, 4.0]
  }
  return [-6.5, 0.78, 1.2] // Default Frontend Engineer workstation
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
