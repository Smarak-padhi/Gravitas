/**
 * Gravitas Presentation-Only Character Motion Controller (Wave 12G)
 *
 * Coordinates authoritative spatial intents, deterministic A* pathfinding,
 * procedural walk cycles, and presentation animation states.
 *
 * ABSOLUTE INVARIANTS:
 * 1. Motion is strictly presentation-only.
 * 2. Character arrival does NOT satisfy a handoff.
 * 3. Character animation does NOT advance task FSM.
 * 4. Character animation failure does NOT fail a task.
 * 5. Controller CANNOT call server APIs, mutate tasks, or mutate handoffs.
 * 6. Stale revisions immediately abort obsolete paths.
 * 7. Prefers-reduced-motion snaps immediately with zero interpolation.
 */

import type { RoleId } from '../roles/types.js'
import {
  FROZEN_ROLES,
  ROLE_HOME_POSITIONS,
  ROLE_HOME_ROTATIONS,
  TOWER_ROLE_HOME_POSITIONS,
  TOWER_ROLE_HOME_ROTATIONS,
} from '../roles/roles.js'
import type { HqCharacters } from '../geometry/characters.js'
import {
  getNavigationGraph,
  getStationNodeId,
  type NavigationGraph,
} from './navigationGraph.js'
import { findPath, type NavigationWaypoint } from './pathfinding.js'
import type {
  CharacterSpatialIntent,
  CharacterSpatialState,
} from './spatialIntent.js'

export type CharacterMotionState =
  | 'IDLE'
  | 'STAND_UP'
  | 'WALK'
  | 'ARRIVE'
  | 'FOCUSED'
  | 'REVIEWING'
  | 'RETURNING'
  | 'SIT_DOWN'

export interface CharacterControllerState {
  readonly roleId: RoleId
  motionState: CharacterMotionState
  spatialState: CharacterSpatialState
  currentStationId: string
  destinationStationId: string

  currentPosition: [number, number, number]
  currentRotationY: number

  activePath: readonly NavigationWaypoint[]
  currentWaypointIndex: number
  segmentProgress: number // 0.0 to 1.0 along current segment

  activeEpoch: string
  activeRevision: number
  activeTaskId?: string
  activeHandoffId?: string

  walkPhase: number
  isSeated: boolean
}

export class CharacterMotionController {
  private readonly characters: HqCharacters
  private readonly graph: NavigationGraph
  private readonly stateMap = new Map<RoleId, CharacterControllerState>()

  // Walking speed in world units per second (Target: 1.25–1.45 units/s)
  public static readonly WALKING_SPEED = 1.35
  public static readonly WALK_CADENCE = 6.5 // rad/s for limb swing

  constructor(characters: HqCharacters) {
    this.characters = characters
    this.graph = getNavigationGraph()

    // Initialize all 4 frozen roles at their home stations
    for (const role of FROZEN_ROLES) {
      const roleId = role.roleId
      const homePos = TOWER_ROLE_HOME_POSITIONS[roleId] ?? ROLE_HOME_POSITIONS[roleId]
      const homeRot = TOWER_ROLE_HOME_ROTATIONS[roleId] ?? ROLE_HOME_ROTATIONS[roleId]
      const homeStation = role.stationId
      const isSeated = role.visualIdentity.isSeatedDefault

      this.stateMap.set(roleId, {
        roleId,
        motionState: 'IDLE',
        spatialState: 'AT_HOME',
        currentStationId: homeStation,
        destinationStationId: homeStation,
        currentPosition: [homePos[0], homePos[1], homePos[2]],
        currentRotationY: homeRot,
        activePath: [],
        currentWaypointIndex: 0,
        segmentProgress: 0.0,
        activeEpoch: 'bootstrap',
        activeRevision: 0,
        walkPhase: 0.0,
        isSeated,
      })

      // Ensure figures start in their correct default postures
      this.characters.setFigurePosition(roleId, homePos, homeRot)
      this.characters.setFigurePose(roleId, isSeated ? 'SEATED' : 'STANDING')
    }
  }

  public getCharacterState(roleId: RoleId): CharacterControllerState | undefined {
    return this.stateMap.get(roleId)
  }

  public getAllCharacterStates(): ReadonlyMap<RoleId, CharacterControllerState> {
    return this.stateMap
  }

  /**
   * Reconciles current character state with authoritative spatial intents.
   * Handles stale revision cancellation, path resolution, and reduced motion snapping.
   */
  public reconcileIntents(
    intents: ReadonlyMap<RoleId, CharacterSpatialIntent>,
    reducedMotion: boolean
  ): void {
    for (const [roleId, intent] of intents.entries()) {
      const state = this.stateMap.get(roleId)
      if (!state) continue

      // 1. Revision / Epoch supersedence check (Section 13)
      const isNewEpoch = intent.projectionEpoch !== state.activeEpoch
      const isNewerRevision = intent.projectionRevision > state.activeRevision

      if (isNewEpoch || isNewerRevision) {
        state.activeEpoch = intent.projectionEpoch
        state.activeRevision = intent.projectionRevision
        state.activeTaskId = intent.taskId
        state.activeHandoffId = intent.handoffId

        const destStation = intent.destinationStationId
        const destNodeId = getStationNodeId(this.graph, destStation)

        if (reducedMotion) {
          // Section 15: Reduced motion mode — instant pose and position snap
          this.snapToStation(roleId, destStation)
          state.spatialState = intent.spatialState
          state.motionState = this.resolveStationMotionState(roleId, intent)
          state.activePath = []
          continue
        }

        // Section 14: Fresh load while task already running -> initialize directly AT_ASSIGNMENT
        if (intent.spatialState === 'AT_ASSIGNMENT' || intent.spatialState === 'AT_REVIEW') {
          if (state.spatialState !== 'AT_ASSIGNMENT' && state.spatialState !== 'AT_REVIEW') {
            this.snapToStation(roleId, destStation)
            state.spatialState = intent.spatialState
            state.motionState = this.resolveStationMotionState(roleId, intent)
            state.activePath = []
            continue
          }
        }

        // Check if movement is needed
        if (state.currentStationId !== destStation || state.activePath.length > 0) {
          // If destination changed mid-route, cancel old route and resolve new path
          if (destNodeId) {
            const startNodeId =
              getStationNodeId(this.graph, state.currentStationId) || destNodeId
            const pathResult = findPath({
              graph: this.graph,
              fromNodeId: startNodeId,
              toNodeId: destNodeId,
            })

            if (pathResult.ok && pathResult.waypoints.length > 1) {
              state.destinationStationId = destStation
              state.activePath = pathResult.waypoints
              state.currentWaypointIndex = 0
              state.segmentProgress = 0.0
              state.spatialState = intent.spatialState
              state.motionState =
                intent.spatialState === 'RETURNING_HOME' ? 'RETURNING' : 'WALK'
              this.characters.setFigurePose(roleId, 'WALKING')
            } else {
              // Same station or immediate reach
              this.snapToStation(roleId, destStation)
              state.spatialState = intent.spatialState
              state.motionState = this.resolveStationMotionState(roleId, intent)
            }
          }
        } else {
          // Already at destination station
          state.spatialState = intent.spatialState
          state.motionState = this.resolveStationMotionState(roleId, intent)
        }
      }
    }
  }

  private resolveStationMotionState(
    roleId: RoleId,
    intent: CharacterSpatialIntent
  ): CharacterMotionState {
    if (intent.spatialState === 'AT_REVIEW') return 'REVIEWING'
    if (intent.spatialState === 'AT_ASSIGNMENT') return 'FOCUSED'
    if (intent.spatialState === 'AT_HOME') {
      if (roleId === 'role:strategy:chief-planner') return 'IDLE'
      return 'IDLE'
    }
    return 'IDLE'
  }

  private snapToStation(roleId: RoleId, stationId: string): void {
    const state = this.stateMap.get(roleId)
    if (!state) return

    const nodeId = getStationNodeId(this.graph, stationId)
    const node = nodeId ? this.graph.nodes.get(nodeId) : undefined

    let targetPos: readonly [number, number, number] = TOWER_ROLE_HOME_POSITIONS[roleId] ?? ROLE_HOME_POSITIONS[roleId]
    let targetRot: number = TOWER_ROLE_HOME_ROTATIONS[roleId] ?? ROLE_HOME_ROTATIONS[roleId]

    if (node) {
      targetPos = node.position
    }

    state.currentPosition = [targetPos[0], targetPos[1], targetPos[2]]
    state.currentRotationY = targetRot
    state.currentStationId = stationId
    state.destinationStationId = stationId
    state.activePath = []
    state.currentWaypointIndex = 0
    state.segmentProgress = 0.0

    const isSeated =
      (roleId === 'role:engineering:frontend-engineer' ||
        roleId === 'role:engineering:backend-engineer') &&
      stationId.includes('workstation')

    state.isSeated = isSeated
    this.characters.setFigurePosition(roleId, targetPos, targetRot)
    this.characters.setFigurePose(roleId, isSeated ? 'SEATED' : 'STANDING')
    this.characters.applyWalkCycle(roleId, 0.0, false, true)
  }

  /**
   * Main update tick invoked strictly within the bounded HqScene.update() lifecycle.
   * Advances characters along their active paths.
   */
  public update(deltaTimeSeconds: number, reducedMotion: boolean): void {
    if (reducedMotion || deltaTimeSeconds <= 0) return

    // Cap delta time to prevent large teleportation steps on tab resume
    const dt = Math.min(deltaTimeSeconds, 0.1)

    for (const [roleId, state] of this.stateMap.entries()) {
      if (state.activePath.length <= 1) continue

      const currentIdx = state.currentWaypointIndex
      if (currentIdx >= state.activePath.length - 1) {
        // Reached destination
        this.arriveAtDestination(roleId)
        continue
      }

      const p0 = state.activePath[currentIdx]!.position
      const p1 = state.activePath[currentIdx + 1]!.position

      const segDx = p1[0] - p0[0]
      const segDy = p1[1] - p0[1]
      const segDz = p1[2] - p0[2]
      const segDist = Math.sqrt(segDx * segDx + segDy * segDy + segDz * segDz)

      if (segDist < 0.001) {
        state.currentWaypointIndex++
        state.segmentProgress = 0.0
        continue
      }

      // Step along segment
      const stepDist = CharacterMotionController.WALKING_SPEED * dt
      const progressIncrement = stepDist / segDist
      state.segmentProgress += progressIncrement

      if (state.segmentProgress >= 1.0) {
        // Advance to next waypoint
        state.currentWaypointIndex++
        state.segmentProgress = 0.0

        if (state.currentWaypointIndex >= state.activePath.length - 1) {
          this.arriveAtDestination(roleId)
          continue
        }
      }

      // Interpolate current world position
      const t = Math.min(Math.max(state.segmentProgress, 0.0), 1.0)
      const currentX = p0[0] + segDx * t
      const currentY = p0[1] + segDy * t
      const currentZ = p0[2] + segDz * t
      state.currentPosition = [currentX, currentY, currentZ]

      // Facing orientation (yaw towards target waypoint)
      const targetYaw = Math.atan2(segDx, segDz)
      state.currentRotationY = targetYaw

      // Advance walk phase
      state.walkPhase += dt * CharacterMotionController.WALK_CADENCE

      // Apply to Three.js character figure
      this.characters.setFigurePosition(roleId, state.currentPosition, state.currentRotationY)
      this.characters.applyWalkCycle(roleId, state.walkPhase, true, false)
    }
  }

  private arriveAtDestination(roleId: RoleId): void {
    const state = this.stateMap.get(roleId)
    if (!state) return

    state.activePath = []
    state.currentWaypointIndex = 0
    state.segmentProgress = 0.0
    state.currentStationId = state.destinationStationId

    const isHome = state.currentStationId === state.destinationStationId && state.spatialState === 'RETURNING_HOME'
    if (isHome) {
      state.spatialState = 'AT_HOME'
      state.motionState = 'IDLE'
    } else if (state.spatialState === 'MOVING_TO_REVIEW') {
      state.spatialState = 'AT_REVIEW'
      state.motionState = 'REVIEWING'
    } else {
      state.spatialState = 'AT_ASSIGNMENT'
      state.motionState = 'FOCUSED'
    }

    const homeRot = ROLE_HOME_ROTATIONS[roleId]
    state.currentRotationY = homeRot

    const isSeated =
      (roleId === 'role:engineering:frontend-engineer' ||
        roleId === 'role:engineering:backend-engineer') &&
      state.currentStationId.includes('workstation')

    state.isSeated = isSeated
    this.characters.setFigurePosition(roleId, state.currentPosition, homeRot)
    this.characters.setFigurePose(roleId, isSeated ? 'SEATED' : 'STANDING')
    this.characters.applyWalkCycle(roleId, 0.0, false, false)
  }
}
