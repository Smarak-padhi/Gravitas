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
  readonly visualIdentity: RoleVisualIdentity
}

export interface RolePresentationState {
  readonly roleId: RoleId
  readonly displayName: string
  readonly departmentId: DepartmentId
  readonly characterState: CharacterPresentationState
  readonly stationId: string
  readonly stationAlias: string
  readonly homePosition: readonly [number, number, number]
  readonly isSeated: boolean
  readonly currentTaskId: string | null
  readonly currentTaskTitle: string | null
  readonly currentHarness: string
  readonly transport: 'OmniRoute' | 'Direct' | 'UNKNOWN'
  readonly provider: string
  readonly model: string
  readonly isFixtureOnly?: boolean
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
  readonly isFixtureOnly: boolean
}
