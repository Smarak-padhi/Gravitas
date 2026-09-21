/**
 * Gravitas 3D Headquarters — Type Definitions
 * Pure TypeScript interfaces for 3D world entities, rooms, camera framing, and telemetry.
 */

export type RoomId =
  | 'MISSION_CONTROL'
  | 'AGENT_OPERATIONS'
  | 'VERIFICATION_LAB'
  | 'BROWSER_QA_LAB'
  | 'INFRASTRUCTURE_ROOM'
  | 'APPROVAL_MEZZANINE'

export type StationId =
  | 'planning-table'
  | 'codex-workstation'
  | 'fcc-workstation'
  | 'expansion-bay-3'
  | 'expansion-bay-4'
  | 'verifier-console'
  | 'browser-qa-matrix'
  | 'omniroute-rack'
  | 'approval-plinth'
  | 'repository-vault'

export type CharacterId = 'char-codex' | 'char-fcc' | 'char-verifier'

export type EntityType = 'room' | 'station' | 'character'

export interface SelectedEntity {
  readonly id: string
  readonly type: EntityType
  readonly name: string
  readonly room: string
  readonly role?: string | undefined
  readonly status: string
  readonly description?: string | undefined
}

export interface CameraFramingPreset {
  readonly id: string
  readonly target: readonly [number, number, number] // [x, y, z] lookAt
  readonly position: readonly [number, number, number] // [x, y, z] camera eye
  readonly description: string
}

export interface PerformanceStats {
  readonly fps: number
  readonly frameTimeMs: number
  readonly drawCalls: number
  readonly triangles: number
  readonly geometries: number
  readonly textures: number
}

export interface RoomDefinition {
  readonly id: RoomId
  readonly name: string
  readonly numberKey: string // '1' - '6'
  readonly center: readonly [number, number, number]
  readonly size: readonly [number, number, number]
  readonly cameraPreset: CameraFramingPreset
  readonly accentColor: string
}

export interface StationDefinition {
  readonly id: StationId
  readonly name: string
  readonly roomId: RoomId
  readonly position: readonly [number, number, number]
  readonly rotationY: number
  readonly role?: string | undefined
  readonly status: string
  readonly description: string
}
