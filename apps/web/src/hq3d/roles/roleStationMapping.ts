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
import type { CharacterPresentationState, RoleId, RolePresentationState, RoleInspectorMetadata, HqRoleIdentity } from './types.js'
import {
  TOWER_ROLES,
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
  'frontend-engineer-workstation': 'role:engineering:frontend-engineer',
  'engineering-workstation-01': 'role:engineering:frontend-engineer',
  'codex-workstation': 'role:engineering:frontend-engineer',
  'backend-engineer-workstation': 'role:engineering:backend-engineer',
  'engineering-workstation-02': 'role:engineering:backend-engineer',
  'fcc-workstation': 'role:engineering:backend-engineer',

  // Quality & Verification
  'verification-lab-console': 'role:quality:independent-reviewer',
  'verifier-console': 'role:quality:independent-reviewer',
  'browser-qa-station': 'role:quality:browser-qa',
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
  fixtureOverrides?: Partial<Record<RoleId, Partial<RolePresentationState>>>,
  rolesToDerive: readonly HqRoleIdentity[] = TOWER_ROLES
): Map<RoleId, RolePresentationState> {
  const result = new Map<RoleId, RolePresentationState>()

  for (const role of rolesToDerive) {
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
    } else if (roleId === 'role:quality:browser-qa') {
      // Browser QA Truth Rule:
      // State is FOCUSED when BROWSER_QA lifecycle phase is active
      const matrixState = worldState.stations['browser-qa-matrix']
      const isBrowserQaActive =
        matrixState?.status === 'BROWSER_QA' ||
        stationState?.status === 'BROWSER_QA' ||
        activeTask?.physicalLocation === 'BROWSER_QA_MATRIX' ||
        activeTask?.runtimePhase === 'BROWSER_QA'

      if (isBrowserQaActive) {
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

    const currentTaskId = override?.currentTaskId ?? (activeTask ? activeTask.id : null)
    let handoffsIn: { readonly id: string; readonly sourceTaskId: string; readonly state: string }[] | undefined
    let handoffsOut: { readonly id: string; readonly targetTaskId: string; readonly state: string }[] | undefined
    let upstreamTasks: string[] | undefined
    let downstreamTasks: string[] | undefined
    let artifactCustody: string[] | undefined

    if (currentTaskId && worldState.handoffs) {
      const inList = worldState.handoffs.filter((h) => h.targetTaskId === currentTaskId)
      if (inList.length > 0) {
        handoffsIn = inList.map((h) => ({ id: h.id, sourceTaskId: h.sourceTaskId, state: h.state }))
        upstreamTasks = Array.from(new Set(inList.map((h) => h.sourceTaskId)))
      }

      const outList = worldState.handoffs.filter((h) => h.sourceTaskId === currentTaskId)
      if (outList.length > 0) {
        handoffsOut = outList.map((h) => ({ id: h.id, targetTaskId: h.targetTaskId, state: h.state }))
        downstreamTasks = Array.from(new Set(outList.map((h) => h.targetTaskId)))
      }

      if (
        activeTask &&
        (activeTask.canonicalState === 'RUNNING' ||
          activeTask.canonicalState === 'VERIFYING' ||
          activeTask.canonicalState === 'SUCCEEDED' ||
          activeTask.canonicalState === 'APPROVED')
      ) {
        artifactCustody = [`artifact_${currentTaskId}`]
      }
    }

    const state: RolePresentationState = {
      roleId,
      displayName: role.displayName,
      departmentId: role.departmentId,
      characterState: override?.characterState ?? characterState,
      stationId: role.stationId,
      stationAlias: role.stationAlias,
      homePosition,
      isSeated: role.visualIdentity.isSeatedDefault,
      currentTaskId,
      currentTaskTitle: override?.currentTaskTitle ?? (activeTask ? activeTask.title : null),
      currentHarness: override?.currentHarness ?? currentHarness,
      transport: override?.transport ?? transport,
      provider: override?.provider ?? provider,
      model: override?.model ?? model,
      roleSource: override?.roleSource ?? roleSource,
      isFixtureOnly: override?.isFixtureOnly ?? false,
      handoffsIn: override?.handoffsIn ?? handoffsIn,
      handoffsOut: override?.handoffsOut ?? handoffsOut,
      upstreamTasks: override?.upstreamTasks ?? upstreamTasks,
      downstreamTasks: override?.downstreamTasks ?? downstreamTasks,
      artifactCustody: override?.artifactCustody ?? artifactCustody,
      reviewStatus: override?.reviewStatus,
      integrationStatus: override?.integrationStatus,
      spatialState: override?.spatialState ?? (activeTask && (activeTask.canonicalState === 'RUNNING' || activeTask.canonicalState === 'VERIFYING') ? 'AT_ASSIGNMENT' : 'AT_HOME'),
      destinationStationId: override?.destinationStationId ?? (activeTask?.assignedStationId || role.stationAlias || role.stationId),
      destinationStationName: override?.destinationStationName ?? (activeTask?.assignedStationId ? `${activeTask.assignedStationId} Station` : `${role.displayName} Home Station`),
      handoffId: override?.handoffId ?? (handoffsIn?.[0]?.id || handoffsOut?.[0]?.id),
      handoffState: override?.handoffState ?? (handoffsIn?.[0]?.state || handoffsOut?.[0]?.state),
      runtimePhase: override?.runtimePhase ?? (activeTask ? activeTask.canonicalState : 'IDLE'),
      gateway: override?.gateway ?? (transport === 'OmniRoute' ? 'OmniRoute Gateway' : 'DIRECT'),
      projectionEpoch: override?.projectionEpoch ?? worldState.revisionIdentity.projectionEpoch,
      projectionRevision: override?.projectionRevision ?? worldState.revisionIdentity.projectionRevision,
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
    handoffsIn: presentation.handoffsIn,
    handoffsOut: presentation.handoffsOut,
    upstreamTasks: presentation.upstreamTasks,
    downstreamTasks: presentation.downstreamTasks,
    artifactCustody: presentation.artifactCustody,
    reviewStatus: presentation.reviewStatus,
    integrationStatus: presentation.integrationStatus,
    spatialState: presentation.spatialState,
    destinationStationId: presentation.destinationStationId,
    destinationStationName: presentation.destinationStationName,
    handoffId: presentation.handoffId,
    handoffState: presentation.handoffState,
    runtimePhase: presentation.runtimePhase,
    gateway: presentation.gateway,
    projectionEpoch: presentation.projectionEpoch,
    projectionRevision: presentation.projectionRevision,
  }
}
