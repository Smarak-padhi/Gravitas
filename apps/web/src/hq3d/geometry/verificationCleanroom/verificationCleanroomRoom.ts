/**
 * Gravitas 3D Headquarters — Floor 3 Verification Cleanroom
 * Complete Architectural Room Assembly
 *
 * Integrates:
 * - Layer A: Verification Bench & Evidence Inspection Console (Hero Object)
 * - Layer B: Evidence Matrix & Test Wall Architecture
 * - Layer C: Candidate Circulation, Verdict Edge & Elevator Portal
 * - Enclosure: Perimeter baseboards, cleanroom ceiling cloud, linear task troffers, and architectural planter
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'
import { VerificationBench, type VerificationBenchBuildResult } from './verificationBench.js'
import { EvidenceWall } from './evidenceWall.js'
import { CleanroomCirculation } from './cleanroomCirculation.js'

export interface VerificationCleanroomBuildResult {
  readonly roomGroup: THREE.Group
  readonly benchResult: VerificationBenchBuildResult
}

export class VerificationCleanroomRoom {
  public static buildRoom(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): VerificationCleanroomBuildResult {
    const roomGroup = new THREE.Group()
    roomGroup.position.set(0.0, 10.8, 0.0)
    roomGroup.name = 'room:VERIFICATION_LAB'
    roomGroup.userData = {
      type: 'room',
      id: 'VERIFICATION_LAB',
      name: 'Verification Cleanroom',
      floorNumber: 3,
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. LAYER C: CIRCULATION & FLOOR RUNNER (Mounted first on floor plane)
    // ──────────────────────────────────────────────────────────────────────────
    const circGroup = CleanroomCirculation.buildCirculation(materials, track)
    roomGroup.add(circGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. LAYER A: HERO VERIFICATION BENCH CONSOLE
    // ──────────────────────────────────────────────────────────────────────────
    const benchResult = VerificationBench.buildBench(materials, track)
    roomGroup.add(benchResult.benchGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. LAYER B: EVIDENCE & TEST WALL ARCHITECTURE
    // ──────────────────────────────────────────────────────────────────────────
    const wallGroup = EvidenceWall.buildWall(materials, track)
    roomGroup.add(wallGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 4. ARCHITECTURAL PERIMETER BASEBOARDS (Satin Aluminum & Graphite)
    // ──────────────────────────────────────────────────────────────────────────
    // Rear baseboard along South boundary (Z = 4.38m)
    const baseboardRearGeo = track(new THREE.BoxGeometry(14.0, 0.08, 0.024))
    const baseboardRear = new THREE.Mesh(baseboardRearGeo, materials.structureGraphite)
    baseboardRear.position.set(0.0, 0.04, 4.38)
    roomGroup.add(baseboardRear)

    const baseboardTrimGeo = track(new THREE.BoxGeometry(14.04, 0.012, 0.028))
    const baseboardTrim = new THREE.Mesh(baseboardTrimGeo, materials.laptopAluminum)
    baseboardTrim.position.set(0.0, 0.085, 4.38)
    roomGroup.add(baseboardTrim)

    // Side baseboards along West and East walls
    const sideBaseGeo = track(new THREE.BoxGeometry(0.024, 0.08, 8.2))
    const sideTrimGeo = track(new THREE.BoxGeometry(0.028, 0.012, 8.2))
    for (const sx of [-7.08, 7.08]) {
      const sideBase = new THREE.Mesh(sideBaseGeo, materials.structureGraphite)
      sideBase.position.set(sx, 0.04, 0.2)
      roomGroup.add(sideBase)

      const sideTrim = new THREE.Mesh(sideTrimGeo, materials.laptopAluminum)
      sideTrim.position.set(sx, 0.085, 0.2)
      roomGroup.add(sideTrim)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. ARCHITECTURAL CEILING CLOUD & CLEANROOM TASK TROFFERS (Y = 3.34m)
    // ──────────────────────────────────────────────────────────────────────────
    const ceilingGroup = new THREE.Group()
    ceilingGroup.position.set(0.0, 3.34, 0.2)

    // Acoustic technical ceiling panel in pale composite
    const cloudPanelGeo = track(new THREE.BoxGeometry(13.6, 0.03, 7.6))
    const cloudPanel = new THREE.Mesh(cloudPanelGeo, materials.ceilingPanel)
    ceilingGroup.add(cloudPanel)

    // Perimeter fascia frame in satin aluminum
    const cloudFrameGeo = track(new THREE.BoxGeometry(13.68, 0.04, 7.68))
    const cloudFrame = new THREE.Mesh(cloudFrameGeo, materials.laptopAluminum)
    ceilingGroup.add(cloudFrame)

    // Recessed linear cleanroom LED luminaires (cool crisp task illumination)
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
    // 6. ARCHITECTURAL POTTED SPECIMEN (Minimalist Ceramic Cylinder)
    // ──────────────────────────────────────────────────────────────────────────
    const plantGroup = new THREE.Group()
    plantGroup.position.set(-5.2, 0.0, 1.8)

    const planterGeo = track(new THREE.CylinderGeometry(0.28, 0.24, 0.54, 16))
    const planter = new THREE.Mesh(planterGeo, materials.planterCeramic)
    planter.position.set(0.0, 0.27, 0.0)
    planter.castShadow = true
    plantGroup.add(planter)

    const soilGeo = track(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 16))
    const soil = new THREE.Mesh(soilGeo, materials.limestoneDark)
    soil.position.set(0.0, 0.52, 0.0)
    plantGroup.add(soil)

    const trunkGeo = track(new THREE.CylinderGeometry(0.03, 0.04, 1.4, 8))
    const trunk = new THREE.Mesh(trunkGeo, materials.structureGraphite)
    trunk.position.set(0.0, 1.1, 0.0)
    plantGroup.add(trunk)

    // Cleanroom architectural foliage
    const foliageGeo = track(new THREE.SphereGeometry(0.42, 12, 10))
    const foliage = new THREE.Mesh(foliageGeo, materials.foliageDark)
    foliage.scale.set(0.9, 1.3, 0.9)
    foliage.position.set(0.0, 1.7, 0.0)
    foliage.castShadow = true
    plantGroup.add(foliage)

    roomGroup.add(plantGroup)

    // Freeze all static matrices inside roomGroup for WebGL performance
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
