/**
 * Gravitas 3D Headquarters — Floor 4 Browser QA Lab
 * Complete Architectural Room Assembly
 *
 * Integrates:
 * - Layer A: Device Test Bench & Multi-Surface Matrix Workstation (Hero Object)
 * - Layer B: Viewport Observation & Responsive Comparison Wall
 * - Layer C: Interaction Test Zone, Device Testing Rack & Circulation
 * - Enclosure: Perimeter baseboards, acoustic ceiling cloud, linear task troffers, and architectural planter
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'
import { DeviceTestBench, type DeviceTestBenchBuildResult } from './deviceTestBench.js'
import { ObservationWall } from './observationWall.js'
import { InteractionZone } from './interactionZone.js'

export interface BrowserQaLabBuildResult {
  readonly roomGroup: THREE.Group
  readonly benchResult: DeviceTestBenchBuildResult
}

export class BrowserQaLabRoom {
  public static buildRoom(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): BrowserQaLabBuildResult {
    const roomGroup = new THREE.Group()
    roomGroup.position.set(0.0, 14.4, 0.0)
    roomGroup.name = 'room:BROWSER_QA_LAB'
    roomGroup.userData = {
      type: 'room',
      id: 'BROWSER_QA_LAB',
      name: 'Browser QA Lab',
      floorNumber: 4,
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. LAYER C: INTERACTION ZONE & CIRCULATION (Mounted first)
    // ──────────────────────────────────────────────────────────────────────────
    const zoneGroup = InteractionZone.buildZone(materials, track)
    roomGroup.add(zoneGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. LAYER A: HERO DEVICE TEST BENCH WORKSTATION
    // ──────────────────────────────────────────────────────────────────────────
    const benchResult = DeviceTestBench.buildBench(materials, track)
    roomGroup.add(benchResult.benchGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. LAYER B: VIEWPORT OBSERVATION & COMPARISON WALL
    // ──────────────────────────────────────────────────────────────────────────
    const wallGroup = ObservationWall.buildWall(materials, track)
    roomGroup.add(wallGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 4. ARCHITECTURAL PERIMETER BASEBOARDS
    // ──────────────────────────────────────────────────────────────────────────
    const baseboardRearGeo = track(new THREE.BoxGeometry(14.0, 0.08, 0.024))
    const baseboardRear = new THREE.Mesh(baseboardRearGeo, materials.structureGraphite)
    baseboardRear.position.set(0.0, 0.04, 4.38)
    roomGroup.add(baseboardRear)

    const baseboardTrimGeo = track(new THREE.BoxGeometry(14.04, 0.012, 0.028))
    const baseboardTrim = new THREE.Mesh(baseboardTrimGeo, materials.champagneBrass)
    baseboardTrim.position.set(0.0, 0.085, 4.38)
    roomGroup.add(baseboardTrim)

    const sideBaseGeo = track(new THREE.BoxGeometry(0.024, 0.08, 8.2))
    const sideTrimGeo = track(new THREE.BoxGeometry(0.028, 0.012, 8.2))
    for (const sx of [-7.08, 7.08]) {
      const sideBase = new THREE.Mesh(sideBaseGeo, materials.structureGraphite)
      sideBase.position.set(sx, 0.04, 0.2)
      roomGroup.add(sideBase)

      const sideTrim = new THREE.Mesh(sideTrimGeo, materials.champagneBrass)
      sideTrim.position.set(sx, 0.085, 0.2)
      roomGroup.add(sideTrim)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. ARCHITECTURAL CEILING CLOUD & RECESSED QA TASK TROFFERS (Y = 3.34m)
    // ──────────────────────────────────────────────────────────────────────────
    const ceilingGroup = new THREE.Group()
    ceilingGroup.position.set(0.0, 3.34, 0.2)

    const cloudPanelGeo = track(new THREE.BoxGeometry(13.6, 0.03, 7.6))
    const cloudPanel = new THREE.Mesh(cloudPanelGeo, materials.ceilingPanel)
    ceilingGroup.add(cloudPanel)

    const cloudFrameGeo = track(new THREE.BoxGeometry(13.68, 0.04, 7.68))
    const cloudFrame = new THREE.Mesh(cloudFrameGeo, materials.walnut)
    ceilingGroup.add(cloudFrame)

    const trofferGeo = track(new THREE.BoxGeometry(4.2, 0.016, 0.08))
    const trofferInst = new THREE.InstancedMesh(trofferGeo, materials.lampWarmGlow, 4)
    const dummyTroffer = new THREE.Object3D()
    let tIdx = 0
    for (const tz of [-1.0, 1.6]) {
      for (const tx of [-3.2, 3.2]) {
        dummyTroffer.position.set(tx, -0.018, tz)
        dummyTroffer.updateMatrix()
        trofferInst.setMatrixAt(tIdx++, dummyTroffer.matrix)
      }
    }
    trofferInst.instanceMatrix.needsUpdate = true
    ceilingGroup.add(trofferInst)
    roomGroup.add(ceilingGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 6. ARCHITECTURAL POTTED TREE (Terracotta Cylinder)
    // ──────────────────────────────────────────────────────────────────────────
    const plantGroup = new THREE.Group()
    plantGroup.position.set(4.8, 0.0, 1.8)

    const planterGeo = track(new THREE.CylinderGeometry(0.30, 0.25, 0.52, 16))
    const planter = new THREE.Mesh(planterGeo, materials.planterTerracotta)
    planter.position.set(0.0, 0.26, 0.0)
    planter.castShadow = true
    plantGroup.add(planter)

    const soilGeo = track(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 16))
    const soil = new THREE.Mesh(soilGeo, materials.limestoneDark)
    soil.position.set(0.0, 0.50, 0.0)
    plantGroup.add(soil)

    const trunkGeo = track(new THREE.CylinderGeometry(0.032, 0.042, 1.5, 8))
    const trunk = new THREE.Mesh(trunkGeo, materials.walnut)
    trunk.position.set(0.0, 1.15, 0.0)
    plantGroup.add(trunk)

    const foliageGeo = track(new THREE.SphereGeometry(0.44, 12, 10))
    const foliage = new THREE.Mesh(foliageGeo, materials.foliageGreen)
    foliage.scale.set(1.0, 1.35, 1.0)
    foliage.position.set(0.0, 1.75, 0.0)
    foliage.castShadow = true
    plantGroup.add(foliage)

    roomGroup.add(plantGroup)

    // Freeze static matrices for WebGL performance
    roomGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.updateMatrix()
        obj.matrixAutoUpdate = false
      }
    })

    return {
      roomGroup,
      benchResult,
    }
  }
}
