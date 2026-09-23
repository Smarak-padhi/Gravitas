/**
 * Gravitas 3D Headquarters — Artifact Motion Controller (Wave 12H)
 *
 * Responsibilities:
 * - Receive authoritative ArtifactCustodyState[] and derive ArtifactVisualIntent.
 * - Manage physical 3D work dossiers (PhysicalDossierMesh).
 * - Smoothly glide dossiers along elevated conduit trajectories.
 * - Stale revision cancellation: superseding revisions immediately cancel active transit.
 * - Reduced-motion discipline: instant coordinate snapping and posture set.
 * - Mechanical approval gesture on confirmed backend approval.
 * - Stop processing when HQ inactive or document hidden.
 * - Strict presentation boundary: NEVER mutates backend tasks or handoffs.
 */

import * as THREE from 'three'
import {
  type ArtifactCustodyState,
} from './artifactCustody.js'
import {
  deriveArtifactVisualIntents,
  type ArtifactVisualIntent,
} from './handoffVisualIntent.js'
import {
  getConduitTrajectory,
  CUSTODY_LOCATIONS,
} from './custodyConduits.js'
import { PhysicalDossierMesh } from '../geometry/dossiers.js'

export interface ActiveArtifactTransit {
  readonly artifactId: string
  readonly waypoints: readonly (readonly [number, number, number])[]
  currentWaypointIndex: number
  segmentProgress: number // 0 to 1
  readonly speedUnitsPerSec: number
  readonly epoch: string
  readonly revision: number
}

export class ArtifactMotionController {
  private readonly rootGroup: THREE.Group
  private readonly dossiers = new Map<string, PhysicalDossierMesh>()
  private readonly activeTransits = new Map<string, ActiveArtifactTransit>()
  private currentCustodyStates: readonly ArtifactCustodyState[] = []
  private previousVisualIntents = new Map<string, ArtifactVisualIntent>()

  // Previous approval tracking for triggering gesture acknowledgment
  private readonly approvedArtifactIds = new Set<string>()

  public constructor() {
    this.rootGroup = new THREE.Group()
    this.rootGroup.name = 'artifact-custody-root'
  }

  public getGroup(): THREE.Group {
    return this.rootGroup
  }

  public reconcileCustody(
    custodyStates: readonly ArtifactCustodyState[],
    reducedMotion: boolean = false
  ): void {
    this.currentCustodyStates = custodyStates
    const visualIntents = deriveArtifactVisualIntents(custodyStates, this.previousVisualIntents)
    this.previousVisualIntents = new Map(visualIntents)

    const activeArtifactIds = new Set<string>()

    for (const state of custodyStates) {
      activeArtifactIds.add(state.artifactId)
      const intent = visualIntents.get(state.artifactId)!

      let dossier = this.dossiers.get(state.artifactId)
      if (!dossier) {
        dossier = new PhysicalDossierMesh(state.artifactId)
        this.dossiers.set(state.artifactId, dossier)
        this.rootGroup.add(dossier.group)

        // Initialize position at authoritative custody location
        const targetPos = CUSTODY_LOCATIONS[state.custodyLocation].position
        dossier.setPosition(...targetPos)
      }

      // Check if newly approved by confirmed backend authority (COMPLETED_TRAY)
      const isApproved = state.custodyLocation === 'COMPLETED_TRAY' && !state.requiresHumanApproval
      const isRejected = state.custodyLocation === 'FAILURE_HOLD' && state.reasonCode === 'APPROVAL_REJECTED'

      dossier.updateVisualState({
        verificationState: state.verificationState,
        reviewState: state.reviewState,
        integrationState: state.integrationState,
        requiresHumanApproval: state.requiresHumanApproval,
        isApproved,
        isRejected,
      })

      dossier.setInspectorMetadata(
        {
          artifactId: state.artifactId,
          sourceTaskId: state.taskId,
          sourceRoleId: state.sourceRoleId,
          sourceHarnessId: state.sourceHarnessId,
          targetRoleId: state.targetRoleId,
          handoffId: state.handoffId,
          handoffKind: state.handoffKind,
          handoffState: state.handoffState,
          reasonCode: state.reasonCode,
          verificationState: state.verificationState,
          reviewState: state.reviewState,
          integrationState: state.integrationState,
          custodyLocation: state.custodyLocation,
          commitSha: state.commitSha,
          requiresHumanApproval: state.requiresHumanApproval,
          projectionEpoch: state.projectionEpoch,
          projectionRevision: state.projectionRevision,
        },
        CUSTODY_LOCATIONS[state.custodyLocation].roomName,
        state.custodyLocation
      )

      // Trigger gesture if task transitioned to confirmed approved
      if (isApproved && !this.approvedArtifactIds.has(state.artifactId) && !reducedMotion) {
        this.approvedArtifactIds.add(state.artifactId)
        dossier.triggerApprovalGesture()
      }

      // Check if location changed and needs transit
      const existingTransit = this.activeTransits.get(state.artifactId)

      if (reducedMotion) {
        // Reduced motion: snap immediately to destination
        this.activeTransits.delete(state.artifactId)
        const destPos = CUSTODY_LOCATIONS[state.custodyLocation].position
        dossier.setPosition(...destPos)
      } else if (intent.visualPhase === 'IN_TRANSIT') {
        // Start or update transit along conduit
        if (
          !existingTransit ||
          existingTransit.revision !== state.projectionRevision ||
          existingTransit.epoch !== state.projectionEpoch
        ) {
          // Stale transit cancellation: calculate new path to authoritative destination
          const waypoints = getConduitTrajectory(
            intent.sourceLocation,
            intent.destinationLocation,
            state.sourceRoleId as string
          )

          this.activeTransits.set(state.artifactId, {
            artifactId: state.artifactId,
            waypoints,
            currentWaypointIndex: 0,
            segmentProgress: 0,
            speedUnitsPerSec: 2.5, // 2.5 world units per sec smooth transit
            epoch: state.projectionEpoch,
            revision: state.projectionRevision,
          })
        }
      } else {
        // Not in transit: ensure at target position
        if (!existingTransit) {
          const destPos = CUSTODY_LOCATIONS[state.custodyLocation].position
          dossier.setPosition(...destPos)
        }
      }
    }

    // Clean up obsolete dossiers
    for (const [id, mesh] of this.dossiers.entries()) {
      if (!activeArtifactIds.has(id)) {
        this.rootGroup.remove(mesh.group)
        mesh.dispose()
        this.dossiers.delete(id)
        this.activeTransits.delete(id)
      }
    }
  }

  public update(deltaSeconds: number, reducedMotion: boolean = false): void {
    if (reducedMotion) {
      // In reduced motion mode, any remaining transits snap immediately
      for (const [artId, transit] of this.activeTransits.entries()) {
        const dossier = this.dossiers.get(artId)
        if (dossier && transit.waypoints.length > 0) {
          const target = transit.waypoints[transit.waypoints.length - 1]
          dossier.setPosition(...target)
        }
      }
      this.activeTransits.clear()
      return
    }

    const completedTransits: string[] = []

    for (const [artId, transit] of this.activeTransits.entries()) {
      const dossier = this.dossiers.get(artId)
      if (!dossier) {
        completedTransits.push(artId)
        continue
      }

      // Update gesture mechanics if active
      dossier.updateGesture(deltaSeconds, reducedMotion)

      const fromWp = transit.waypoints[transit.currentWaypointIndex]
      const toWp = transit.waypoints[transit.currentWaypointIndex + 1]

      if (!toWp) {
        // Arrived at destination
        dossier.setPosition(...fromWp)
        completedTransits.push(artId)
        continue
      }

      const dx = toWp[0] - fromWp[0]
      const dy = toWp[1] - fromWp[1]
      const dz = toWp[2] - fromWp[2]
      const segmentDistance = Math.hypot(dx, dy, dz)

      if (segmentDistance < 0.001) {
        transit.currentWaypointIndex++
        transit.segmentProgress = 0
        continue
      }

      const step = (transit.speedUnitsPerSec * deltaSeconds) / segmentDistance
      transit.segmentProgress += step

      if (transit.segmentProgress >= 1.0) {
        transit.currentWaypointIndex++
        transit.segmentProgress = 0
        if (transit.currentWaypointIndex >= transit.waypoints.length - 1) {
          dossier.setPosition(...toWp)
          completedTransits.push(artId)
        } else {
          dossier.setPosition(...toWp)
        }
      } else {
        const curX = fromWp[0] + dx * transit.segmentProgress
        const curY = fromWp[1] + dy * transit.segmentProgress
        const curZ = fromWp[2] + dz * transit.segmentProgress
        dossier.setPosition(curX, curY, curZ)
      }
    }

    for (const id of completedTransits) {
      this.activeTransits.delete(id)
    }

    // Update gesture on stationary dossiers as well
    for (const dossier of this.dossiers.values()) {
      dossier.updateGesture(deltaSeconds, reducedMotion)
    }
  }

  public getMovingArtifactCount(): number {
    return this.activeTransits.size
  }

  public getActiveTransitCount(): number {
    return this.activeTransits.size
  }

  public getDossierCount(): number {
    return this.dossiers.size
  }

  public handleEpochChange(_newEpoch: string): void {
    this.activeTransits.clear()
  }

  public getCustodyStates(): readonly ArtifactCustodyState[] {
    return this.currentCustodyStates
  }

  public getDossier(artifactId: string): PhysicalDossierMesh | undefined {
    return this.dossiers.get(artifactId)
  }

  public dispose(): void {
    for (const dossier of this.dossiers.values()) {
      this.rootGroup.remove(dossier.group)
      dossier.dispose()
    }
    this.dossiers.clear()
    this.activeTransits.clear()
  }
}
