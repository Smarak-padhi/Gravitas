/**
 * Gravitas Navigation Graph (Wave 12G)
 *
 * Deterministic waypoint network reconstructed after architectural cutaway audit.
 * Coordinates are in meters within the 26m x 20m Three.js Headquarters scene.
 *
 * Guaranteed Properties:
 * 1. Topological determinism: fixed node IDs, fixed coordinates, fixed neighbor edges.
 * 2. Obstacle avoidance: routes bypass desks, glass walls, colonnades, and furniture.
 * 3. Dedicated cleanroom airlock entry at [0.6, 0.1, 3.65] (glass aperture).
 * 4. Dedicated floating staircase ascent at X = -10.2 to access Mezzanine deck at Y = 2.95m.
 */

export type NavigationNodeType =
  | 'HOME'
  | 'CORRIDOR'
  | 'DESK_APPROACH'
  | 'PLANNING_APPROACH'
  | 'REVIEW_APPROACH'
  | 'CLEANROOM_ENTRY'
  | 'QA_APPROACH'
  | 'STAIR_ENTRY'
  | 'STAIR_LANDING'
  | 'APPROVAL_APPROACH'
  | 'HOLD_POINT'

export interface NavigationNode {
  readonly id: string
  readonly position: readonly [number, number, number]
  readonly roomId: string
  readonly neighbors: readonly string[]
  readonly clearance: number
  readonly semanticType: NavigationNodeType
}

export interface NavigationGraph {
  readonly nodes: ReadonlyMap<string, NavigationNode>
  readonly stationNodeMap: ReadonlyMap<string, string>
}

const RAW_NODES: readonly NavigationNode[] = [
  // ── Mission Control & Planning ─────────────────────────────────────────────
  {
    id: 'NODE_PLANNER_HOME',
    position: [-4.5, 0.0, 4.6],
    roomId: 'MISSION_CONTROL',
    neighbors: ['NODE_PLANNING_APPROACH'],
    clearance: 0.8,
    semanticType: 'HOME',
  },
  {
    id: 'NODE_PLANNING_APPROACH',
    position: [-4.5, 0.0, 4.0],
    roomId: 'MISSION_CONTROL',
    neighbors: ['NODE_PLANNER_HOME', 'NODE_OPS_AISLE_N'],
    clearance: 1.0,
    semanticType: 'PLANNING_APPROACH',
  },

  // ── Operations Floor Corridors ─────────────────────────────────────────────
  {
    id: 'NODE_OPS_AISLE_N',
    position: [-4.15, 0.0, 4.0],
    roomId: 'AGENT_OPERATIONS',
    neighbors: [
      'NODE_PLANNING_APPROACH',
      'NODE_OPS_AISLE_C',
      'NODE_CONCOURSE_W',
      'NODE_STAIR_APPROACH_GROUND',
    ],
    clearance: 1.2,
    semanticType: 'CORRIDOR',
  },
  {
    id: 'NODE_OPS_AISLE_C',
    position: [-4.15, 0.0, 1.85],
    roomId: 'AGENT_OPERATIONS',
    neighbors: [
      'NODE_OPS_AISLE_N',
      'NODE_OPS_AISLE_S',
      'NODE_FE_DESK_APPROACH',
      'NODE_BE_DESK_APPROACH',
    ],
    clearance: 1.2,
    semanticType: 'CORRIDOR',
  },
  {
    id: 'NODE_OPS_AISLE_S',
    position: [-4.15, 0.0, -1.0],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_OPS_AISLE_C', 'NODE_OPS_AISLE_BAY'],
    clearance: 1.2,
    semanticType: 'CORRIDOR',
  },
  {
    id: 'NODE_OPS_AISLE_BAY',
    position: [-4.15, 0.0, -2.4],
    roomId: 'AGENT_OPERATIONS',
    neighbors: [
      'NODE_OPS_AISLE_S',
      'NODE_BAY3_APPROACH',
      'NODE_BAY4_APPROACH',
      'NODE_INFRA_APPROACH',
    ],
    clearance: 1.2,
    semanticType: 'CORRIDOR',
  },

  // ── Operations Workstations (Desks & Seated Positions) ─────────────────────
  {
    id: 'NODE_FE_HOME',
    position: [-6.5, 0.0, 1.85],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_FE_DESK_APPROACH'],
    clearance: 0.7,
    semanticType: 'HOME',
  },
  {
    id: 'NODE_FE_DESK_APPROACH',
    position: [-5.3, 0.0, 1.85],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_FE_HOME', 'NODE_OPS_AISLE_C'],
    clearance: 0.9,
    semanticType: 'DESK_APPROACH',
  },
  {
    id: 'NODE_BE_HOME',
    position: [-1.8, 0.0, 1.85],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_BE_DESK_APPROACH'],
    clearance: 0.7,
    semanticType: 'HOME',
  },
  {
    id: 'NODE_BE_DESK_APPROACH',
    position: [-3.0, 0.0, 1.85],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_BE_HOME', 'NODE_OPS_AISLE_C'],
    clearance: 0.9,
    semanticType: 'DESK_APPROACH',
  },

  // Expansion Bays 3 & 4
  {
    id: 'NODE_BAY3_STATION',
    position: [-6.5, 0.0, -2.4],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_BAY3_APPROACH'],
    clearance: 0.7,
    semanticType: 'HOME',
  },
  {
    id: 'NODE_BAY3_APPROACH',
    position: [-5.3, 0.0, -2.4],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_BAY3_STATION', 'NODE_OPS_AISLE_BAY'],
    clearance: 0.9,
    semanticType: 'DESK_APPROACH',
  },
  {
    id: 'NODE_BAY4_STATION',
    position: [-1.8, 0.0, -2.4],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_BAY4_APPROACH'],
    clearance: 0.7,
    semanticType: 'HOME',
  },
  {
    id: 'NODE_BAY4_APPROACH',
    position: [-3.0, 0.0, -2.4],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_BAY4_STATION', 'NODE_OPS_AISLE_BAY'],
    clearance: 0.9,
    semanticType: 'DESK_APPROACH',
  },

  // ── Infrastructure Room ────────────────────────────────────────────────────
  {
    id: 'NODE_INFRA_APPROACH',
    position: [-7.5, 0.0, -4.5],
    roomId: 'INFRASTRUCTURE_ROOM',
    neighbors: ['NODE_OPS_AISLE_BAY', 'NODE_OMNIRACK'],
    clearance: 1.0,
    semanticType: 'CORRIDOR',
  },
  {
    id: 'NODE_OMNIRACK',
    position: [-8.8, 0.0, -5.8],
    roomId: 'INFRASTRUCTURE_ROOM',
    neighbors: ['NODE_INFRA_APPROACH'],
    clearance: 0.8,
    semanticType: 'HOLD_POINT',
  },

  // ── Central Concourse & Cleanroom Airlock Entry ─────────────────────────────
  {
    id: 'NODE_CONCOURSE_W',
    position: [-1.8, 0.0, 3.65],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_OPS_AISLE_N', 'NODE_CONCOURSE_C'],
    clearance: 1.2,
    semanticType: 'CORRIDOR',
  },
  {
    id: 'NODE_CONCOURSE_C',
    position: [0.0, 0.0, 3.65],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_CONCOURSE_W', 'NODE_CLEANROOM_AIRLOCK_OUTSIDE'],
    clearance: 1.2,
    semanticType: 'CORRIDOR',
  },
  {
    id: 'NODE_CLEANROOM_AIRLOCK_OUTSIDE',
    position: [0.3, 0.0, 3.65],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_CONCOURSE_C', 'NODE_CLEANROOM_ENTRY'],
    clearance: 0.9,
    semanticType: 'HOLD_POINT',
  },
  {
    id: 'NODE_CLEANROOM_ENTRY',
    // Exact aperture center between West glass wall sections (Z: 2.5 to 4.8, X = 0.6)
    position: [0.6, 0.1, 3.65],
    roomId: 'VERIFICATION_LAB',
    neighbors: ['NODE_CLEANROOM_AIRLOCK_OUTSIDE', 'NODE_CLEANROOM_AIRLOCK_INSIDE'],
    clearance: 0.8,
    semanticType: 'CLEANROOM_ENTRY',
  },
  {
    id: 'NODE_CLEANROOM_AIRLOCK_INSIDE',
    position: [1.8, 0.1, 3.65],
    roomId: 'VERIFICATION_LAB',
    neighbors: [
      'NODE_CLEANROOM_ENTRY',
      'NODE_CLEANROOM_CORRIDOR_N',
      'NODE_QA_CORRIDOR',
    ],
    clearance: 1.0,
    semanticType: 'CORRIDOR',
  },

  // ── Verification Cleanroom & Reviewer Console ──────────────────────────────
  {
    id: 'NODE_CLEANROOM_CORRIDOR_N',
    position: [3.5, 0.1, 4.5],
    roomId: 'VERIFICATION_LAB',
    neighbors: ['NODE_CLEANROOM_AIRLOCK_INSIDE', 'NODE_REVIEW_APPROACH'],
    clearance: 1.0,
    semanticType: 'CORRIDOR',
  },
  {
    id: 'NODE_REVIEW_APPROACH',
    position: [6.0, 0.1, 4.5],
    roomId: 'VERIFICATION_LAB',
    neighbors: ['NODE_CLEANROOM_CORRIDOR_N', 'NODE_REVIEWER_HOME'],
    clearance: 0.9,
    semanticType: 'REVIEW_APPROACH',
  },
  {
    id: 'NODE_REVIEWER_HOME',
    position: [6.0, 0.1, 5.75],
    roomId: 'VERIFICATION_LAB',
    neighbors: ['NODE_REVIEW_APPROACH', 'NODE_VERIFIER_CONSOLE'],
    clearance: 0.8,
    semanticType: 'HOME',
  },
  {
    id: 'NODE_VERIFIER_CONSOLE',
    position: [6.0, 0.1, 6.5],
    roomId: 'VERIFICATION_LAB',
    neighbors: ['NODE_REVIEWER_HOME'],
    clearance: 0.7,
    semanticType: 'HOLD_POINT',
  },

  // ── Browser QA Lab ─────────────────────────────────────────────────────────
  {
    id: 'NODE_QA_CORRIDOR',
    // Passing through the door gap in divider partition at X < 1.25
    position: [1.0, 0.1, 1.2],
    roomId: 'BROWSER_QA_LAB',
    neighbors: ['NODE_CLEANROOM_AIRLOCK_INSIDE', 'NODE_QA_APPROACH'],
    clearance: 0.9,
    semanticType: 'CORRIDOR',
  },
  {
    id: 'NODE_QA_APPROACH',
    position: [5.0, 0.1, 0.5],
    roomId: 'BROWSER_QA_LAB',
    neighbors: ['NODE_QA_CORRIDOR', 'NODE_BROWSER_QA_MATRIX'],
    clearance: 0.9,
    semanticType: 'QA_APPROACH',
  },
  {
    id: 'NODE_BROWSER_QA_MATRIX',
    position: [6.2, 0.1, -0.5],
    roomId: 'BROWSER_QA_LAB',
    neighbors: ['NODE_QA_APPROACH'],
    clearance: 0.8,
    semanticType: 'HOLD_POINT',
  },

  // ── Floating Staircase & Approval Mezzanine ────────────────────────────────
  {
    id: 'NODE_STAIR_APPROACH_GROUND',
    position: [-8.5, 0.0, 4.0],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_OPS_AISLE_N', 'NODE_STAIR_ENTRY'],
    clearance: 1.0,
    semanticType: 'CORRIDOR',
  },
  {
    id: 'NODE_STAIR_ENTRY',
    position: [-10.2, 0.0, 3.8],
    roomId: 'AGENT_OPERATIONS',
    neighbors: ['NODE_STAIR_APPROACH_GROUND', 'NODE_STAIR_MID'],
    clearance: 0.8,
    semanticType: 'STAIR_ENTRY',
  },
  {
    id: 'NODE_STAIR_MID',
    position: [-10.2, 1.4, 5.8],
    roomId: 'APPROVAL_MEZZANINE',
    neighbors: ['NODE_STAIR_ENTRY', 'NODE_STAIR_LANDING'],
    clearance: 0.8,
    semanticType: 'CORRIDOR',
  },
  {
    id: 'NODE_STAIR_LANDING',
    position: [-10.2, 2.8, 7.8],
    roomId: 'APPROVAL_MEZZANINE',
    neighbors: ['NODE_STAIR_MID', 'NODE_MEZZANINE_ENTRY'],
    clearance: 0.8,
    semanticType: 'STAIR_LANDING',
  },
  {
    id: 'NODE_MEZZANINE_ENTRY',
    position: [-8.0, 2.95, 8.5],
    roomId: 'APPROVAL_MEZZANINE',
    neighbors: ['NODE_STAIR_LANDING', 'NODE_MEZZANINE_WALKWAY'],
    clearance: 1.0,
    semanticType: 'CORRIDOR',
  },
  {
    id: 'NODE_MEZZANINE_WALKWAY',
    position: [-4.0, 2.95, 8.5],
    roomId: 'APPROVAL_MEZZANINE',
    neighbors: ['NODE_MEZZANINE_ENTRY', 'NODE_APPROVAL_APPROACH'],
    clearance: 1.0,
    semanticType: 'CORRIDOR',
  },
  {
    id: 'NODE_APPROVAL_APPROACH',
    position: [-1.5, 2.95, 8.5],
    roomId: 'APPROVAL_MEZZANINE',
    neighbors: ['NODE_MEZZANINE_WALKWAY', 'NODE_APPROVAL_PLINTH'],
    clearance: 1.0,
    semanticType: 'APPROVAL_APPROACH',
  },
  {
    id: 'NODE_APPROVAL_PLINTH',
    position: [0.0, 2.95, 8.5],
    roomId: 'APPROVAL_MEZZANINE',
    neighbors: ['NODE_APPROVAL_APPROACH'],
    clearance: 0.8,
    semanticType: 'HOLD_POINT',
  },
]

const STATION_NODE_MAP = new Map<string, string>([
  ['planning-table', 'NODE_PLANNER_HOME'],

  ['engineering-workstation-01', 'NODE_FE_HOME'],
  ['codex-workstation', 'NODE_FE_HOME'],

  ['engineering-workstation-02', 'NODE_BE_HOME'],
  ['fcc-workstation', 'NODE_BE_HOME'],

  ['expansion-bay-3', 'NODE_BAY3_STATION'],
  ['expansion-bay-4', 'NODE_BAY4_STATION'],

  ['verification-lab-console', 'NODE_REVIEWER_HOME'],
  ['verifier-console', 'NODE_REVIEWER_HOME'],

  ['browser-qa-matrix', 'NODE_BROWSER_QA_MATRIX'],
  ['omniroute-rack', 'NODE_OMNIRACK'],
  ['approval-plinth', 'NODE_APPROVAL_PLINTH'],
])

/**
 * Builds the canonical NavigationGraph with symmetric bidirectional edges.
 */
export function buildNavigationGraph(): NavigationGraph {
  const nodes = new Map<string, NavigationNode>()

  // Validate and index nodes
  for (const n of RAW_NODES) {
    nodes.set(n.id, n)
  }

  // Ensure bidirectional symmetry
  for (const [id, node] of nodes.entries()) {
    for (const neighborId of node.neighbors) {
      const neighbor = nodes.get(neighborId)
      if (!neighbor) {
        throw new Error(`NavigationGraph configuration error: Node ${id} references non-existent neighbor ${neighborId}`)
      }
      if (!neighbor.neighbors.includes(id)) {
        // Enforce bidirectionality
        const updatedNeighbors = [...neighbor.neighbors, id]
        nodes.set(neighborId, { ...neighbor, neighbors: updatedNeighbors })
      }
    }
  }

  return {
    nodes,
    stationNodeMap: STATION_NODE_MAP,
  }
}

let cachedGraph: NavigationGraph | null = null

export function getNavigationGraph(): NavigationGraph {
  if (!cachedGraph) {
    cachedGraph = buildNavigationGraph()
  }
  return cachedGraph
}

export function getStationNodeId(graph: NavigationGraph, stationId: string): string | null {
  return graph.stationNodeMap.get(stationId) ?? null
}
