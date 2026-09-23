/**
 * Gravitas Pathfinding (Wave 12G)
 *
 * Deterministic A* graph routing across the authoritative NavigationGraph.
 *
 * Properties:
 * 1. Deterministic: identical input always produces identical waypoints.
 * 2. Guaranteed shortest valid route avoiding physical obstacles.
 * 3. Safe failure handling for unknown or unreachable nodes.
 */

import type { NavigationGraph, NavigationNodeType } from './navigationGraph.js'

export interface NavigationWaypoint {
  readonly id: string
  readonly position: readonly [number, number, number]
  readonly roomId: string
  readonly semanticType: NavigationNodeType
}

export interface PathfindingSuccess {
  readonly ok: true
  readonly waypoints: readonly NavigationWaypoint[]
  readonly totalDistance: number
}

export interface PathfindingFailure {
  readonly ok: false
  readonly reason: 'UNREACHABLE' | 'UNKNOWN_START' | 'UNKNOWN_DESTINATION'
}

export type PathfindingResult = PathfindingSuccess | PathfindingFailure

function distance3D(
  a: readonly [number, number, number],
  b: readonly [number, number, number]
): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Finds the shortest deterministic path between two nodes in the navigation graph using A*.
 */
export function findPath(options: {
  readonly graph: NavigationGraph
  readonly fromNodeId: string
  readonly toNodeId: string
}): PathfindingResult {
  const { graph, fromNodeId, toNodeId } = options

  const startNode = graph.nodes.get(fromNodeId)
  if (!startNode) {
    return { ok: false, reason: 'UNKNOWN_START' }
  }

  const targetNode = graph.nodes.get(toNodeId)
  if (!targetNode) {
    return { ok: false, reason: 'UNKNOWN_DESTINATION' }
  }

  // Trivial identical node path
  if (fromNodeId === toNodeId) {
    return {
      ok: true,
      waypoints: [
        {
          id: startNode.id,
          position: startNode.position,
          roomId: startNode.roomId,
          semanticType: startNode.semanticType,
        },
      ],
      totalDistance: 0.0,
    }
  }

  // A* Search
  const openSet = new Set<string>([fromNodeId])
  const cameFrom = new Map<string, string>()

  const gScore = new Map<string, number>()
  gScore.set(fromNodeId, 0.0)

  const fScore = new Map<string, number>()
  fScore.set(fromNodeId, distance3D(startNode.position, targetNode.position))

  while (openSet.size > 0) {
    // Deterministic selection of node in openSet with lowest fScore.
    // Tie-break alphabetically by node ID.
    let currentId: string | null = null
    let lowestF = Infinity

    for (const candidateId of openSet) {
      const f = fScore.get(candidateId) ?? Infinity
      if (f < lowestF) {
        lowestF = f
        currentId = candidateId
      } else if (f === lowestF && currentId !== null && candidateId < currentId) {
        // Deterministic tie-breaker
        currentId = candidateId
      }
    }

    if (!currentId) break

    if (currentId === toNodeId) {
      // Reconstruct path
      const pathIds: string[] = [currentId]
      let curr = currentId
      while (cameFrom.has(curr)) {
        curr = cameFrom.get(curr)!
        pathIds.unshift(curr)
      }

      let totalDist = 0.0
      const waypoints: NavigationWaypoint[] = []

      for (let i = 0; i < pathIds.length; i++) {
        const node = graph.nodes.get(pathIds[i]!)!
        waypoints.push({
          id: node.id,
          position: node.position,
          roomId: node.roomId,
          semanticType: node.semanticType,
        })

        if (i > 0) {
          const prevNode = graph.nodes.get(pathIds[i - 1]!)!
          totalDist += distance3D(prevNode.position, node.position)
        }
      }

      return {
        ok: true,
        waypoints,
        totalDistance: totalDist,
      }
    }

    openSet.delete(currentId)
    const currentNode = graph.nodes.get(currentId)!
    const currentG = gScore.get(currentId) ?? Infinity

    for (const neighborId of currentNode.neighbors) {
      const neighbor = graph.nodes.get(neighborId)
      if (!neighbor) continue

      const edgeDist = distance3D(currentNode.position, neighbor.position)
      const tentativeG = currentG + edgeDist

      const existingG = gScore.get(neighborId) ?? Infinity
      if (tentativeG < existingG) {
        cameFrom.set(neighborId, currentId)
        gScore.set(neighborId, tentativeG)
        const h = distance3D(neighbor.position, targetNode.position)
        fScore.set(neighborId, tentativeG + h)
        openSet.add(neighborId)
      }
    }
  }

  return { ok: false, reason: 'UNREACHABLE' }
}
