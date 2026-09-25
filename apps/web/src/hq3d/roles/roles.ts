/**
 * Gravitas Frozen Initial Role Roster (Wave 12D)
 *
 * Implements EXACTLY four reasoning-role characters:
 * 1. Chief Planner (CONTROL_STRATEGY, planning-table)
 * 2. Frontend Engineer (ENGINEERING, engineering-workstation-01 / codex-workstation)
 * 3. Backend Engineer (ENGINEERING, engineering-workstation-02 / fcc-workstation)
 * 4. Independent Reviewer (QUALITY, verification-lab-console / verifier-console)
 *
 * The scene makes clear:
 * THE CHARACTER REPRESENTS A LOGICAL ROLE.
 * THE HARNESS IS ONLY THE TOOL CURRENTLY USED BY THAT ROLE.
 */

import type { HqRoleIdentity, RoleId } from './types.js'

export const CHIEF_PLANNER_ROLE: HqRoleIdentity = {
  roleId: 'role:strategy:chief-planner',
  displayName: 'Chief Planner',
  departmentId: 'CONTROL_STRATEGY',
  stationId: 'planning-table',
  stationAlias: 'planning-table',
  visualIdentity: {
    silhouette: 'composed upright silhouette',
    wardrobeProfile: 'dark graphite tailoring',
    accentSemantic: 'warm brass/vellum accessory',
    primaryColorHex: 0x22262d, // dark graphite suit
    accentColorHex: 0xd4af37, // warm brass / vellum
    accessoryDescription: 'planning tablet / folio',
    isSeatedDefault: false,
  },
}

export const FRONTEND_ENGINEER_ROLE: HqRoleIdentity = {
  roleId: 'role:engineering:frontend-engineer',
  displayName: 'Frontend Engineer',
  departmentId: 'ENGINEERING',
  stationId: 'engineering-workstation-01',
  stationAlias: 'codex-workstation',
  physicalWorkstationId: 'frontend-engineer-workstation',
  visualIdentity: {
    silhouette: 'slightly expressive creative silhouette',
    wardrobeProfile: 'deep indigo / muted cobalt workwear',
    accentSemantic: 'design tablet / visual reference accessory',
    primaryColorHex: 0x1e293b, // deep indigo suit
    accentColorHex: 0x38bdf8, // vibrant cobalt / cyan accent
    accessoryDescription: 'design tablet / visual reference',
    isSeatedDefault: true,
  },
}

export const BACKEND_ENGINEER_ROLE: HqRoleIdentity = {
  roleId: 'role:engineering:backend-engineer',
  displayName: 'Backend Engineer',
  departmentId: 'ENGINEERING',
  stationId: 'engineering-workstation-02',
  stationAlias: 'fcc-workstation',
  physicalWorkstationId: 'backend-engineer-workstation',
  visualIdentity: {
    silhouette: 'structured technical silhouette',
    wardrobeProfile: 'charcoal / forest-neutral workwear',
    accentSemantic: 'systems notebook / terminal accessory',
    primaryColorHex: 0x242d28, // charcoal / forest workwear
    accentColorHex: 0x34d399, // systems terminal emerald accent
    accessoryDescription: 'systems notebook / terminal',
    isSeatedDefault: true,
  },
}

export const INDEPENDENT_REVIEWER_ROLE: HqRoleIdentity = {
  roleId: 'role:quality:independent-reviewer',
  displayName: 'Independent Reviewer',
  departmentId: 'QUALITY',
  stationId: 'verification-lab-console',
  stationAlias: 'verifier-console',
  physicalWorkstationId: 'verifier-console',
  visualIdentity: {
    silhouette: 'restrained precise silhouette',
    wardrobeProfile: 'pale sage / stone cleanroom-inspired coat',
    accentSemantic: 'verification slate / inspection device',
    primaryColorHex: 0x2c3e38, // restrained dark spruce coat
    accentColorHex: 0xa7f3d0, // pale sage / cleanroom stone
    accessoryDescription: 'verification slate / inspection device',
    isSeatedDefault: false,
  },
}

export const FROZEN_ROLES: readonly HqRoleIdentity[] = [
  CHIEF_PLANNER_ROLE,
  FRONTEND_ENGINEER_ROLE,
  BACKEND_ENGINEER_ROLE,
  INDEPENDENT_REVIEWER_ROLE,
] as const

export const ROLE_BY_ID: ReadonlyMap<RoleId, HqRoleIdentity> = new Map(
  FROZEN_ROLES.map((r) => [r.roleId, r])
)

export const ROLE_BY_STATION_ID: ReadonlyMap<string, HqRoleIdentity> = new Map([
  [CHIEF_PLANNER_ROLE.stationId, CHIEF_PLANNER_ROLE],
  [CHIEF_PLANNER_ROLE.stationAlias, CHIEF_PLANNER_ROLE],
  ['frontend-engineer-workstation', FRONTEND_ENGINEER_ROLE],
  ['codex-workstation', FRONTEND_ENGINEER_ROLE],
  ['engineering-workstation-01', FRONTEND_ENGINEER_ROLE],
  ['backend-engineer-workstation', BACKEND_ENGINEER_ROLE],
  ['fcc-workstation', BACKEND_ENGINEER_ROLE],
  ['engineering-workstation-02', BACKEND_ENGINEER_ROLE],
  ['verifier-console', INDEPENDENT_REVIEWER_ROLE],
  ['verification-lab-console', INDEPENDENT_REVIEWER_ROLE],
])

/**
 * Canonical 2D home positions (historical runtime contract).
 */
export const ROLE_HOME_POSITIONS: Record<RoleId, readonly [number, number, number]> = {
  'role:strategy:chief-planner': [-4.5, 0.0, 4.6],
  'role:engineering:frontend-engineer': [-6.5, 0.0, 1.85],
  'role:engineering:backend-engineer': [-1.8, 0.0, 1.85],
  'role:quality:independent-reviewer': [6.0, 0.1, 5.75],
}

export const ROLE_HOME_ROTATIONS: Record<RoleId, number> = {
  'role:strategy:chief-planner': 0.0,
  'role:engineering:frontend-engineer': Math.PI,
  'role:engineering:backend-engineer': Math.PI,
  'role:quality:independent-reviewer': 0.0,
}

/**
 * 3D Cutaway Tower Role Home Positions across the 7 vertical levels.
 */
export const TOWER_ROLE_HOME_POSITIONS: Record<RoleId, readonly [number, number, number]> = {
  'role:strategy:chief-planner': [-1.5, 3.6, -0.75],
  'role:engineering:frontend-engineer': [-3.5, 7.2, 1.15],
  'role:engineering:backend-engineer': [2.5, 7.2, 1.15],
  'role:quality:independent-reviewer': [0.0, 10.8, 0.5],
}

export const TOWER_ROLE_HOME_ROTATIONS: Record<RoleId, number> = {
  'role:strategy:chief-planner': 0.0,
  'role:engineering:frontend-engineer': Math.PI,
  'role:engineering:backend-engineer': Math.PI,
  'role:quality:independent-reviewer': 0.0,
}

/**
 * Returns the presentation station ID/alias associated with a canonical reasoning role.
 * Note: Integration Engineer (role:integration:integration-engineer) returns null
 * because it does not have a 3D humanoid avatar or desk in Wave 12E.
 */
export function getStationForCanonicalRole(roleId: string): string | null {
  const role = ROLE_BY_ID.get(roleId as RoleId)
  if (role) {
    return role.stationId || role.stationAlias
  }
  return null
}
