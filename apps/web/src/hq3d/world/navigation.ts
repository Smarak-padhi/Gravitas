/**
 * Gravitas 3D Headquarters — Navigation Topology & Waypoints
 * Deterministic waypoints for spatial orientation and future character transit.
 */

export interface NavWaypoint {
  readonly id: string
  readonly position: readonly [number, number, number]
  readonly description: string
}

export const WAYPOINTS: readonly NavWaypoint[] = [
  { id: 'NODE_MC_PLANNING', position: [-4.0, 0.85, 7.0], description: 'Mission Control Planning Table' },
  { id: 'NODE_MC_DISPATCH', position: [-2.0, 0.85, 5.5], description: 'Planning Dispatch Ramp' },
  { id: 'NODE_OPS_AISLE_N', position: [-4.0, 0.0, 4.0], description: 'Operations North Aisle' },
  { id: 'NODE_OPS_AISLE_C', position: [-4.0, 0.0, 0.0], description: 'Operations Central Interchange' },
  { id: 'NODE_OPS_AISLE_S', position: [-4.0, 0.0, -4.0], description: 'Operations South Corridor' },
  { id: 'NODE_CODEX_DESK', position: [-7.0, 0.85, 1.4], description: 'Codex Workstation Desk' },
  { id: 'NODE_FCC_DESK', position: [-1.0, 0.85, 1.4], description: 'FCC Workstation Desk' },
  { id: 'NODE_VERIF_PORTAL', position: [1.5, 0.0, 5.0], description: 'Verification Lab Airlock Portal' },
  { id: 'NODE_VERIF_BENCH', position: [6.0, 0.85, 7.0], description: 'Verification Cleanroom Bench' },
  { id: 'NODE_BQA_BENCH', position: [6.0, 0.85, 0.0], description: 'Browser QA Matrix Wall' },
  { id: 'NODE_LIFT_BASE', position: [0.0, 0.0, 10.5], description: 'Vertical Lift Base Terminal' },
  { id: 'NODE_LIFT_TOP', position: [0.0, 3.2, 10.5], description: 'Vertical Lift Mezzanine Terminal' },
  { id: 'NODE_MEZZ_PLINTH', position: [0.0, 4.0, 12.5], description: 'Approval Plinth' },
]
