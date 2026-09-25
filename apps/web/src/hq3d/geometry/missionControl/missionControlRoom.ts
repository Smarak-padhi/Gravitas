/**
 * Gravitas 3D Headquarters — Mission Control Production Room Assembly (Wave 12J)
 *
 * Assembles Floor 1 (Mission Control, Y = 3.6m) into a unified architectural production slice:
 * - Layer A: Central Strategy Planning Surface (MissionPlanningTable)
 * - Layer B: Strategy & Dependency Wall (StrategyWall)
 * - Layer C: Dispatch & Transition Edge (DispatchTransition)
 * - West Wall Archival Strategy Bookshelf & Folio Shelving Unit
 * - Master Architectural Studio Rug under central planning area
 * - Architectural Potted Ficus/Olive Tree
 * - Performance discipline: geometry sharing, pruned micro shadow casters, static matrix freezing.
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'
import { MissionPlanningTable, type PlanningTableBuildResult } from './missionPlanningTable.js'
import { StrategyWall } from './strategyWall.js'
import { DispatchTransition } from './dispatchTransition.js'

export interface MissionControlBuildResult {
  readonly roomGroup: THREE.Group
  readonly tableResult: PlanningTableBuildResult
}

export class MissionControlRoom {
  public static buildRoom(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): MissionControlBuildResult {
    const roomGroup = new THREE.Group()
    roomGroup.position.set(0.0, 3.6, 0.0)
    roomGroup.name = 'floor1-mission-control-room'

    // ──────────────────────────────────────────────────────────────────────────
    // 0. ARCHITECTURAL FLOOR MAT & WARM OAK PLANNER INLAY
    // ──────────────────────────────────────────────────────────────────────────
    // Large architectural area mat under the central planning zone (6.4m x 4.2m)
    const studioMatGeo = track(new THREE.BoxGeometry(6.4, 0.005, 4.2))
    const studioMat = new THREE.Mesh(studioMatGeo, materials.woodOakFloor)
    studioMat.position.set(-1.0, 0.002, 0.4)
    studioMat.receiveShadow = true
    roomGroup.add(studioMat)

    // Brushed champagne brass perimeter reveal border around the floor mat
    const matBorderGeo = track(new THREE.BoxGeometry(6.48, 0.007, 4.28))
    const matBorder = new THREE.Mesh(matBorderGeo, materials.champagneBrass)
    matBorder.position.set(-1.0, 0.003, 0.4)
    roomGroup.add(matBorder)

    // ──────────────────────────────────────────────────────────────────────────
    // 1. LAYER A: CENTRAL STRATEGY PLANNING SURFACE
    // ──────────────────────────────────────────────────────────────────────────
    const tableResult = MissionPlanningTable.buildTable(materials, track)
    roomGroup.add(tableResult.tableGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. LAYER B: STRATEGY & DEPENDENCY WALL (North / Rear Wall)
    // ──────────────────────────────────────────────────────────────────────────
    const strategyWall = StrategyWall.buildWall(materials, track)
    roomGroup.add(strategyWall)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. LAYER C: DISPATCH & TRANSITION EDGE (East / Vertical Core Edge)
    // ──────────────────────────────────────────────────────────────────────────
    const dispatchTransition = DispatchTransition.buildTransition(materials, track)
    roomGroup.add(dispatchTransition)

    // ──────────────────────────────────────────────────────────────────────────
    // 4. WEST WALL ARCHIVAL REFERENCE SHELVING UNIT
    // ──────────────────────────────────────────────────────────────────────────
    const shelfGroup = new THREE.Group()
    shelfGroup.position.set(-5.6, 0.0, 0.4)
    shelfGroup.rotation.y = Math.PI / 2
    shelfGroup.name = 'floor1-west-strategy-shelf'

    // American walnut upright cabinet frame (2.4m wide x 2.2m high x 0.38m deep)
    const shelfBodyGeo = track(new THREE.BoxGeometry(2.4, 2.2, 0.38))
    const shelfBody = new THREE.Mesh(shelfBodyGeo, materials.walnut)
    shelfBody.position.set(0.0, 1.1, 0.0)
    shelfBody.castShadow = true
    shelfBody.receiveShadow = true
    shelfGroup.add(shelfBody)

    // Champagne brass architectural reveal trim along top edge
    const shelfTrimGeo = track(new THREE.BoxGeometry(2.44, 0.024, 0.4))
    const shelfTrim = new THREE.Mesh(shelfTrimGeo, materials.champagneBrass)
    shelfTrim.position.set(0.0, 2.21, 0.0)
    shelfGroup.add(shelfTrim)

    // Shelf bay recesses & architectural books / binder collections
    const bayRecessGeo = track(new THREE.BoxGeometry(0.72, 0.46, 0.34))
    const bookGeo = track(new THREE.BoxGeometry(0.045, 0.28, 0.22))

    for (let col = -1; col <= 1; col++) {
      const cx = col * 0.76
      for (let row = 0; row < 3; row++) {
        const ry = 0.55 + row * 0.54

        // Recessed bay box
        const bay = new THREE.Mesh(bayRecessGeo, materials.structureGraphite)
        bay.position.set(cx, ry, 0.02)
        shelfGroup.add(bay)

        // Architectural reference binders on row 1 & 2
        if (row < 2) {
          const mat = col === -1 ? materials.bookSpineNavy : col === 0 ? materials.bookSpineAmber : materials.bookSpineTeal
          for (let b = -2; b <= 2; b++) {
            const book = new THREE.Mesh(bookGeo, mat)
            book.position.set(cx + b * 0.055, ry - 0.08, 0.04)
            shelfGroup.add(book)
          }
        }
      }
    }

    roomGroup.add(shelfGroup)

    return {
      roomGroup,
      tableResult,
    }
  }
}
