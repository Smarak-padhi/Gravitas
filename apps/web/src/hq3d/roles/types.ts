/**
 * Gravitas Role Presentation Domain Types (Wave 12D)
 *
 * Implements the minimal role-based character foundation:
 * - Four frozen reasoning-role characters
 * - Separation of Role Identity from Harness / Gateway / Provider tooling
 * - Pure presentation character finite-state machine
 * - Decoupled inspector telemetry contracts
 */

export type RoleId =
  | 'role:strategy:chief-planner'
  | 'role:engineering:frontend-engineer'
  | 'role:engineering:backend-engineer'
  | 'role:quality:independent-reviewer'
  | 'role:quality:browser-qa'

export type DepartmentId = 'CONTROL_STRATEGY' | 'ENGINEERING' | 'QUALITY'

export type CharacterPresentationState =
  | 'IDLE'
  | 'FOCUSED'
  | 'VERIFYING'
  | 'WAITING'
  | 'ATTENTION'
  | 'SUCCESS'
  | 'FAILURE'

export interface RoleVisualIdentity {
  readonly silhouette: string
  readonly wardrobeProfile: string
  readonly accentSemantic: string
  readonly primaryColorHex: number
  readonly accentColorHex: number
  readonly accessoryDescription: string
  readonly isSeatedDefault: boolean
}

export interface HqRoleIdentity {
  readonly roleId: RoleId
  readonly displayName: string
  readonly departmentId: DepartmentId
  readonly stationId: string
  readonly stationAlias: string
  readonly physicalWorkstationId?: string
  readonly visualIdentity: RoleVisualIdentity
}

export interface RolePresentationState {
  readonly roleId: RoleId
  readonly displayName: string
  readonly departmentId: DepartmentId
  readonly characterState: CharacterPresentationState
  readonly stationId: string
  readonly stationAlias: string
  readonly physicalWorkstationId?: string
  readonly homePosition: readonly [number, number, number]
  readonly isSeated: boolean
  readonly currentTaskId: string | null
  readonly currentTaskTitle: string | null
  readonly currentHarness: string
  readonly transport: 'OmniRoute' | 'Direct' | 'UNKNOWN'
  readonly provider: string
  readonly model: string
  readonly roleSource?: 'CANONICAL' | 'LEGACY_COMPATIBILITY' | null
  readonly isFixtureOnly?: boolean
  readonly handoffsIn?: readonly { readonly id: string; readonly sourceTaskId: string; readonly state: string }[] | undefined
  readonly handoffsOut?: readonly { readonly id: string; readonly targetTaskId: string; readonly state: string }[] | undefined
  readonly upstreamTasks?: readonly string[] | undefined
  readonly downstreamTasks?: readonly string[] | undefined
  readonly artifactCustody?: readonly string[] | undefined
  readonly reviewStatus?: string | undefined
  readonly integrationStatus?: string | undefined
  readonly spatialState?: string | undefined
  readonly destinationStationId?: string | undefined
  readonly destinationStationName?: string | undefined
  readonly handoffId?: string | undefined
  readonly handoffState?: string | undefined
  readonly runtimePhase?: string | undefined
  readonly gateway?: string | undefined
  readonly projectionEpoch?: string | undefined
  readonly projectionRevision?: number | undefined
}

export interface RoleInspectorMetadata {
  readonly roleId: string
  readonly roleName: string
  readonly department: string
  readonly status: CharacterPresentationState
  readonly currentTaskId: string | null
  readonly currentTaskTitle: string | null
  readonly currentHarness: string
  readonly transport: string
  readonly provider: string
  readonly model: string
  readonly stationId: string
  readonly stationName: string
  readonly roleSource?: 'CANONICAL' | 'LEGACY_COMPATIBILITY' | null
  readonly isFixtureOnly: boolean
  readonly handoffsIn?: readonly { readonly id: string; readonly sourceTaskId: string; readonly state: string }[] | undefined
  readonly handoffsOut?: readonly { readonly id: string; readonly targetTaskId: string; readonly state: string }[] | undefined
  readonly upstreamTasks?: readonly string[] | undefined
  readonly downstreamTasks?: readonly string[] | undefined
  readonly artifactCustody?: readonly string[] | undefined
  readonly reviewStatus?: string | undefined
  readonly integrationStatus?: string | undefined
  readonly spatialState?: string | undefined
  readonly destinationStationId?: string | undefined
  readonly destinationStationName?: string | undefined
  readonly handoffId?: string | undefined
  readonly handoffState?: string | undefined
  readonly runtimePhase?: string | undefined
  readonly gateway?: string | undefined
  readonly projectionEpoch?: string | undefined
  readonly projectionRevision?: number | undefined
}
