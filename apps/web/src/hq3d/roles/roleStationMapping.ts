/**
 * Gravitas Role-Station Mapping & Character State Machine (Wave 12D)
 *
 * Implements:
 * 1. Runtime ownership -> task assignment -> role resolution -> station mapping
 * 2. LEGACY_ROLE_COMPATIBILITY_MAPPING for current Wave 12D backend reality
 * 3. Pure presentation character finite-state machine (derived from WorldState)
 * 4. Zero locomotion invariant (characters remain at their home stations)
 * 5. Chief Planner truth rule: IDLE unless authoritative planner task is proven
 */

import type { WorldState, WorldTaskState } from '../world/worldState.js'
import type { CharacterPresentationState, RoleId, RolePresentationState, RoleInspectorMetadata } from './types.js'
import {
  FROZEN_ROLES,
  ROLE_BY_ID,
  ROLE_HOME_POSITIONS,
} from './roles.js'
import type { StationId } from '../types.js'

/**
 * LEGACY_ROLE_COMPATIBILITY_MAPPING
 *
 * Bounded compatibility adapter bridging Wave 12C worker station identities
 * to Wave 12D role identities. This is NOT canonical future architecture.
 * Migration Path: Wave 13 will introduce first-class server Role IDs
 * where Role != Harness becomes a full runtime contract.
 */
export const LEGACY_ROLE_COMPATIBILITY_MAPPING: Readonly<Record<string, RoleId>> = {
  // Strategy & Planning
  'planning-table': 'role:strategy:chief-planner',

  // Engineering Floor
  'engineering-workstation-01': 'role:engineering:frontend-engineer',
  'codex-workstation': 'role:engineering:frontend-engineer',
  'engineering-workstation-02': 'role:engineering:backend-engineer',
  'fcc-workstation': 'role:engineering:backend-engineer',

  // Quality & Verification
  'verification-lab-console': 'role:quality:independent-reviewer',
  'verifier-console': 'role:quality:independent-reviewer',
} as const

/**
 * Resolves a logical RoleId from a station identifier or alias.
 * Returns null if the station does not map to any of the 4 frozen reasoning roles
 * (e.g. Browser QA matrix and OmniRoute rack are infrastructure, not humanoids).
 */
export function resolveRoleIdFromStation(stationId: string): RoleId | null {
  return LEGACY_ROLE_COMPATIBILITY_MAPPING[stationId] ?? null
}

/**
 * Derives presentation states for all four frozen roles from authoritative WorldState.
 * PURE, deterministic function. Zero side effects.
 */
export function deriveRolePresentationStates(
  worldState: WorldState,
  fixtureOverrides?: Partial<Record<RoleId, Partial<RolePresentationState>>>
): Map<RoleId, RolePresentationState> {
  const result = new Map<RoleId, RolePresentationState>()

  for (const role of FROZEN_ROLES) {
    const roleId = role.roleId
    const homePosition = ROLE_HOME_POSITIONS[roleId]
    const override = fixtureOverrides?.[roleId]

    // Find the station state for this role's home station
    const stationState =
      worldState.stations[role.stationAlias as StationId] ??
      worldState.stations[role.stationId as StationId]

    // Find active task associated with this station or role
    // Section B12: Canonical role matching takes precedence over legacy station matching
    const taskList = Object.values(worldState.tasks)
    let activeTask: WorldTaskState | undefined = taskList.find((t) => t.roleId === roleId)
    if (!activeTask) {
      const activeTaskId = stationState?.activeTaskId
      activeTask = activeTaskId
        ? worldState.tasks[activeTaskId]
        : taskList.find(
            (t) =>
              t.assignedStationId === role.stationId ||
              t.assignedStationId === role.stationAlias
          )
    }

    let characterState: CharacterPresentationState = 'IDLE'

    if (roleId === 'role:strategy:chief-planner') {
      // Chief Planner Truth Rule (B16):
      // Current backend may not execute a Chief Planner role.
      // Chief Planner remains IDLE unless an authoritative planner task is proven.
      if (activeTask && (activeTask.canonicalState === 'RUNNING' || stationState?.status === 'ACTIVE')) {
        characterState = 'FOCUSED'
      } else {
        characterState = 'IDLE'
      }
    } else if (roleId === 'role:quality:independent-reviewer') {
      // Independent Reviewer Cleanroom Truth Rule:
      // State is VERIFYING when verification bench is active
      const isVerifying =
        stationState?.status === 'VERIFYING' ||
        activeTask?.physicalLocation === 'VERIFICATION_BENCH' ||
        activeTask?.canonicalState === 'VERIFYING'

      if (isVerifying) {
        characterState = 'VERIFYING'
      } else if (activeTask?.canonicalState === 'WAITING_APPROVAL') {
        characterState = 'WAITING'
      } else if (activeTask?.canonicalState === 'FAILED') {
        characterState = 'FAILURE'
      } else if (activeTask?.canonicalState === 'SUCCEEDED' || activeTask?.canonicalState === 'APPROVED') {
        characterState = 'SUCCESS'
      } else {
        characterState = 'IDLE'
      }
    } else {
      // Engineering Roles (Frontend Engineer / Backend Engineer)
      const isStationActive = stationState?.status === 'ACTIVE'
      const isTaskRunning =
        activeTask?.canonicalState === 'RUNNING' ||
        activeTask?.physicalLocation === 'ASSIGNED_WORKSTATION'

      if (isStationActive || isTaskRunning) {
        characterState = 'FOCUSED'
      } else if (activeTask?.canonicalState === 'WAITING_APPROVAL') {
        characterState = 'WAITING'
      } else if (activeTask?.canonicalState === 'FAILED') {
        characterState = 'FAILURE'
      } else if (activeTask?.canonicalState === 'SUCCEEDED' || activeTask?.canonicalState === 'APPROVED') {
        characterState = 'SUCCESS'
      } else {
        characterState = 'IDLE'
      }
    }

    // Extract truthful telemetry without fabricating provider/model
    const currentHarness =
      activeTask?.harnessId || activeTask?.workerId || stationState?.workerIdentity || 'UNKNOWN'

    const route = activeTask?.routeProvenance ?? stationState?.activeRoute
    const transport: 'OmniRoute' | 'Direct' | 'UNKNOWN' =
      route?.transport === 'GATEWAY'
        ? 'OmniRoute'
        : route?.transport === 'DIRECT'
          ? 'Direct'
          : 'UNKNOWN'

    const provider = route?.actualProvider || 'UNKNOWN'
    const model = route?.actualModel || 'UNKNOWN'
    const roleSource = activeTask?.roleSource ?? (activeTask ? 'LEGACY_COMPATIBILITY' : undefined)

    const state: RolePresentationState = {
      roleId,
      displayName: role.displayName,
      departmentId: role.departmentId,
      characterState: override?.characterState ?? characterState,
      stationId: role.stationId,
      stationAlias: role.stationAlias,
      homePosition,
      isSeated: role.visualIdentity.isSeatedDefault,
      currentTaskId: override?.currentTaskId ?? (activeTask ? activeTask.id : null),
      currentTaskTitle: override?.currentTaskTitle ?? (activeTask ? activeTask.title : null),
      currentHarness: override?.currentHarness ?? currentHarness,
      transport: override?.transport ?? transport,
      provider: override?.provider ?? provider,
      model: override?.model ?? model,
      roleSource: override?.roleSource ?? roleSource,
      isFixtureOnly: override?.isFixtureOnly ?? false,
    }

    result.set(roleId, state)
  }

  return result
}

/**
 * Builds decoupled inspector metadata for a selected role character (B7).
 * Strictly distinguishes Role, Department, Status, Task, Harness, Transport, Provider, and Model.
 */
export function buildRoleInspectorMetadata(
  presentation: RolePresentationState
): RoleInspectorMetadata {
  const role = ROLE_BY_ID.get(presentation.roleId)
  return {
    roleId: presentation.roleId,
    roleName: role ? role.displayName : presentation.roleId,
    department: presentation.departmentId,
    status: presentation.characterState,
    currentTaskId: presentation.currentTaskId,
    currentTaskTitle: presentation.currentTaskTitle,
    currentHarness: presentation.currentHarness,
    transport: presentation.transport,
    provider: presentation.provider,
    model: presentation.model,
    stationId: presentation.stationId,
    stationName: role ? `${role.displayName} Home Station` : presentation.stationId,
    roleSource: presentation.roleSource,
    isFixtureOnly: presentation.isFixtureOnly ?? false,
  }
}
