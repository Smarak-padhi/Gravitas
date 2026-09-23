/**
 * Gravitas Spatial Intent Domain (Wave 12G)
 *
 * Translates authoritative WorldState (tasks, roles, and handoffs)
 * into deterministic, pure, side-effect-free CharacterSpatialIntents.
 *
 * Arch Invariant:
 * CANONICAL TASK + ROLE + HANDOFF STATE
 *               ↓
 *   RuntimeProjectionSnapshot
 *               ↓
 *      deriveWorldState(...)
 *               ↓
 *  deriveCharacterSpatialIntents(...)
 *               ↓
 *       navigation graph
 *               ↓
 *      deterministic path
 *               ↓
 * presentation-only motion controller
 *               ↓
 *   Three.js character position
 *
 * NO reverse arrows. Animation never mutates backend truth.
 */

import type { RoleId } from '../roles/types.js'
import { FROZEN_ROLES } from '../roles/roles.js'
import type { WorldState, WorldTaskState } from '../world/worldState.js'

export type CharacterSpatialState =
  | 'AT_HOME'
  | 'MOVING_TO_ASSIGNMENT'
  | 'AT_ASSIGNMENT'
  | 'MOVING_TO_REVIEW'
  | 'AT_REVIEW'
  | 'RETURNING_HOME'

export type SpatialIntentReason =
  | 'TASK_ASSIGNMENT'
  | 'ACTIVE_EXECUTION'
  | 'REVIEW_ASSIGNMENT'
  | 'HANDOFF_AVAILABLE'
  | 'RETURN_HOME'

export interface CharacterSpatialIntent {
  readonly roleId: RoleId
  readonly characterId: string

  readonly sourceStationId: string
  readonly destinationStationId: string

  readonly spatialState: CharacterSpatialState
  readonly reason: SpatialIntentReason

  readonly taskId?: string
  readonly handoffId?: string

  readonly projectionEpoch: string
  readonly projectionRevision: number
}

export interface CharacterPreviousSpatialState {
  readonly currentStationId: string
  readonly spatialState: CharacterSpatialState
}

/**
 * Derives spatial intents for all frozen characters.
 *
 * PURE, DETERMINISTIC, SIDE-EFFECT FREE.
 * Zero Math.random, zero Date.now, zero DOM/Three.js/RAF/timers.
 */
export function deriveCharacterSpatialIntents(
  worldState: WorldState,
  previousStates?: ReadonlyMap<RoleId, CharacterPreviousSpatialState>
): Map<RoleId, CharacterSpatialIntent> {
  const result = new Map<RoleId, CharacterSpatialIntent>()
  const { projectionEpoch, projectionRevision } = worldState.revisionIdentity
  const taskList = Object.values(worldState.tasks)

  for (const role of FROZEN_ROLES) {
    const roleId = role.roleId
    const homeStationId = role.stationId
    const prev = previousStates?.get(roleId)
    const currentStation = prev?.currentStationId ?? homeStationId

    // Find task explicitly assigned to this role
    let assignedTask: WorldTaskState | undefined = taskList.find((t) => t.roleId === roleId)
    if (!assignedTask) {
      // Fallback: match by station ID / alias if legacy task
      assignedTask = taskList.find(
        (t) =>
          t.assignedStationId === role.stationId ||
          t.assignedStationId === role.stationAlias
      )
    }

    // Role-specific spatial intent derivation
    if (roleId === 'role:strategy:chief-planner') {
      // Chief Planner Truth Rule (Section 18):
      // Stays IDLE at planning table unless an actual canonical task explicitly assigns role:strategy:chief-planner.
      if (assignedTask && assignedTask.roleId === 'role:strategy:chief-planner') {
        const isActive =
          assignedTask.canonicalState === 'RUNNING' ||
          (assignedTask.canonicalState as string) === 'PREPARING' ||
          assignedTask.runtimePhase === 'PREPARING'
        const reason: SpatialIntentReason =
          assignedTask.canonicalState === 'RUNNING' ? 'ACTIVE_EXECUTION' : 'TASK_ASSIGNMENT'
        const spatialState: CharacterSpatialState =
          prev?.spatialState === 'AT_ASSIGNMENT' || !prev
            ? 'AT_ASSIGNMENT'
            : 'MOVING_TO_ASSIGNMENT'

        result.set(roleId, {
          roleId,
          characterId: roleId,
          sourceStationId: currentStation,
          destinationStationId: homeStationId,
          spatialState: isActive ? spatialState : 'AT_HOME',
          reason: isActive ? reason : 'RETURN_HOME',
          taskId: assignedTask.id,
          projectionEpoch,
          projectionRevision,
        })
      } else {
        result.set(roleId, {
          roleId,
          characterId: roleId,
          sourceStationId: currentStation,
          destinationStationId: homeStationId,
          spatialState: 'AT_HOME',
          reason: 'RETURN_HOME',
          projectionEpoch,
          projectionRevision,
        })
      }
    } else if (roleId === 'role:quality:independent-reviewer') {
      // Independent Reviewer Truth Rule (Section 6 & 7):
      // Moves to review station ONLY for an actual semantic review task or active review handoff.
      // Deterministic verifier execution does NOT make Reviewer move unless a Reviewer task exists.
      const reviewHandoff = worldState.handoffs.find(
        (h) =>
          (h.targetRoleId === roleId || h.kind === 'REVIEW') &&
          (h.state === 'READY' || h.state === 'IN_PROGRESS')
      )

      if (assignedTask && assignedTask.roleId === roleId) {
        const isTerminal =
          assignedTask.canonicalState === 'SUCCEEDED' ||
          assignedTask.canonicalState === 'FAILED' ||
          assignedTask.canonicalState === 'APPROVED'

        if (isTerminal) {
          result.set(roleId, {
            roleId,
            characterId: roleId,
            sourceStationId: currentStation,
            destinationStationId: homeStationId,
            spatialState: prev?.spatialState === 'AT_HOME' ? 'AT_HOME' : 'RETURNING_HOME',
            reason: 'RETURN_HOME',
            taskId: assignedTask.id,
            handoffId: reviewHandoff?.id,
            projectionEpoch,
            projectionRevision,
          })
        } else {
          // Review task in progress or preparing
          const isFreshLoad = !prev
          const spatialState: CharacterSpatialState =
            isFreshLoad || prev.spatialState === 'AT_REVIEW'
              ? 'AT_REVIEW'
              : 'MOVING_TO_REVIEW'

          result.set(roleId, {
            roleId,
            characterId: roleId,
            sourceStationId: currentStation,
            destinationStationId: homeStationId,
            spatialState,
            reason: 'REVIEW_ASSIGNMENT',
            taskId: assignedTask.id,
            handoffId: reviewHandoff?.id,
            projectionEpoch,
            projectionRevision,
          })
        }
      } else if (reviewHandoff) {
        // Handoff is ready for review even before explicit task assignment
        const isFreshLoad = !prev
        const spatialState: CharacterSpatialState =
          isFreshLoad || prev.spatialState === 'AT_REVIEW'
            ? 'AT_REVIEW'
            : 'MOVING_TO_REVIEW'

        result.set(roleId, {
          roleId,
          characterId: roleId,
          sourceStationId: currentStation,
          destinationStationId: homeStationId,
          spatialState,
          reason: 'HANDOFF_AVAILABLE',
          handoffId: reviewHandoff.id,
          projectionEpoch,
          projectionRevision,
        })
      } else {
        result.set(roleId, {
          roleId,
          characterId: roleId,
          sourceStationId: currentStation,
          destinationStationId: homeStationId,
          spatialState: 'AT_HOME',
          reason: 'RETURN_HOME',
          projectionEpoch,
          projectionRevision,
        })
      }
    } else {
      // Engineering Roles: Frontend Engineer & Backend Engineer
      const targetStation = assignedTask?.assignedStationId || homeStationId

      if (assignedTask) {
        const isTerminal =
          assignedTask.canonicalState === 'SUCCEEDED' ||
          assignedTask.canonicalState === 'FAILED' ||
          assignedTask.canonicalState === 'APPROVED'

        if (isTerminal) {
          result.set(roleId, {
            roleId,
            characterId: roleId,
            sourceStationId: currentStation,
            destinationStationId: homeStationId,
            spatialState: prev?.spatialState === 'AT_HOME' ? 'AT_HOME' : 'RETURNING_HOME',
            reason: 'RETURN_HOME',
            taskId: assignedTask.id,
            projectionEpoch,
            projectionRevision,
          })
        } else {
          // Active task (PREPARING, RUNNING)
          const isRunning =
            assignedTask.canonicalState === 'RUNNING' ||
            assignedTask.physicalLocation === 'ASSIGNED_WORKSTATION'
          const isFreshLoad = !prev

          let spatialState: CharacterSpatialState
          if (isFreshLoad) {
            // Section 14: Fresh load while task already running -> initialize directly AT_ASSIGNMENT
            spatialState = isRunning ? 'AT_ASSIGNMENT' : 'MOVING_TO_ASSIGNMENT'
          } else if (prev.spatialState === 'AT_ASSIGNMENT' && currentStation === targetStation) {
            spatialState = 'AT_ASSIGNMENT'
          } else {
            spatialState = 'MOVING_TO_ASSIGNMENT'
          }

          result.set(roleId, {
            roleId,
            characterId: roleId,
            sourceStationId: currentStation,
            destinationStationId: targetStation,
            spatialState,
            reason: isRunning ? 'ACTIVE_EXECUTION' : 'TASK_ASSIGNMENT',
            taskId: assignedTask.id,
            projectionEpoch,
            projectionRevision,
          })
        }
      } else {
        // No task assigned
        const isAtHome = currentStation === homeStationId && (prev?.spatialState === 'AT_HOME' || !prev)
        result.set(roleId, {
          roleId,
          characterId: roleId,
          sourceStationId: currentStation,
          destinationStationId: homeStationId,
          spatialState: isAtHome ? 'AT_HOME' : 'RETURNING_HOME',
          reason: 'RETURN_HOME',
          projectionEpoch,
          projectionRevision,
        })
      }
    }
  }

  return result
}
