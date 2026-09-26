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
    // 6. ARCHITECTURAL CABLE DISTRIBUTION & TEST HARNESS COLUMN (X = 4.8m, Z = 1.8m)
    // ──────────────────────────────────────────────────────────────────────────
    const cableTowerGroup = new THREE.Group()
    cableTowerGroup.position.set(4.8, 0.0, 1.8)

    // Structural floor flange in gunmetal
    const flangeGeo = track(new THREE.CylinderGeometry(0.32, 0.36, 0.08, 16))
    const flange = new THREE.Mesh(flangeGeo, materials.structureGraphite)
    flange.position.set(0.0, 0.04, 0.0)
    flange.castShadow = true
    flange.receiveShadow = true
    cableTowerGroup.add(flange)

    const flangeRingGeo = track(new THREE.CylinderGeometry(0.365, 0.365, 0.012, 16))
    const flangeRing = new THREE.Mesh(flangeRingGeo, materials.champagneBrass)
    flangeRing.position.set(0.0, 0.08, 0.0)
    cableTowerGroup.add(flangeRing)

    // Vertical extruded aluminum cable spine
    const spineGeo = track(new THREE.BoxGeometry(0.16, 2.8, 0.16))
    const spine = new THREE.Mesh(spineGeo, materials.laptopAluminum)
    spine.position.set(0.0, 1.48, 0.0)
    spine.castShadow = true
    cableTowerGroup.add(spine)

    // Cable routing rings / harness management collars at regular heights
    const collarGeo = track(new THREE.TorusGeometry(0.18, 0.02, 8, 24))
    collarGeo.rotateX(Math.PI / 2)
    for (const cy of [0.6, 1.2, 1.8, 2.4]) {
      const collar = new THREE.Mesh(collarGeo, materials.structureGraphite)
      collar.position.set(0.0, cy, 0.0)
      cableTowerGroup.add(collar)

      // Brass telemetry port rings
      const portPlateGeo = track(new THREE.BoxGeometry(0.18, 0.06, 0.18))
      const portPlate = new THREE.Mesh(portPlateGeo, materials.champagneBrass)
      portPlate.position.set(0.0, cy, 0.0)
      cableTowerGroup.add(portPlate)
    }

    // Heavy-duty harness drop conduits leading into the floor
    const dropGeo = track(new THREE.CylinderGeometry(0.025, 0.025, 2.7, 12))
    for (const dx of [-0.08, 0.08]) {
      const drop = new THREE.Mesh(dropGeo, materials.gunmetal)
      drop.position.set(dx, 1.42, 0.08)
      cableTowerGroup.add(drop)
    }

    roomGroup.add(cableTowerGroup)

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
