/**
 * Gravitas 3D Headquarters — Floor 3 Verification Cleanroom
 * Layer B: Evidence & Test Wall Architecture
 *
 * Implements the architectural evidence inspection wall:
 * - South wall position: Z = 3.65m, spanning X = -5.0m to +5.0m
 * - Precision pale composite paneling with vertical satin aluminum expansion reveals
 * - Suspended architectural smoked-glass matrix panel mounted on satin aluminum standoffs
 * - Five physical evidence retention cassette bays & datum rails:
 *   [01: STATIC_ANALYSIS & LINT]
 *   [02: TYPE_INFERENCE & CONTRACTS]
 *   [03: DETERMINISTIC UNIT MATRIX]
 *   [04: MUTATION BOUNDARY GATE]
 *   [05: REGRESSION & EVIDENCE LEDGER]
 * - Dormant glass & empty physical evidence slots when idle (zero fake test output)
 * - Continuous downward architectural wall-wash grazing header
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'

export class EvidenceWall {
  public static buildWall(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): THREE.Group {
    const wallGroup = new THREE.Group()
    wallGroup.position.set(0.0, 0.0, 3.65)
    wallGroup.name = 'station:evidence-wall'
    wallGroup.userData = {
      type: 'station',
      id: 'evidence-wall',
      name: 'Evidence & Verification Test Wall',
      roomId: 'VERIFICATION_LAB',
      role: 'Deterministic Verification Matrix',
      status: 'Cleanroom Armed',
      description: 'Architectural evidence retention and test provenance wall with deterministic check groups and audit cassette rails.',
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. VERTICAL COMPOSITE ARCHITECTURAL BACKER & EXPANSION REVEALS
    // ──────────────────────────────────────────────────────────────────────────
    // Backer acoustic composite slab in graphite (10.6m wide x 3.2m high)
    const backerGeo = track(new THREE.BoxGeometry(10.6, 3.2, 0.04))
    const backer = new THREE.Mesh(backerGeo, materials.structureGraphite)
    backer.position.set(0.0, 1.6, 0.02)
    backer.receiveShadow = true
    wallGroup.add(backer)

    // Vertical mineral composite wall panels (instanced across X from -4.8 to +4.8)
    const panelGeo = track(new THREE.BoxGeometry(0.55, 3.12, 0.025))
    const panelPositions: number[] = []
    for (let x = -4.75; x <= 4.75; x += 0.6) {
      panelPositions.push(x)
    }

    const panelInst = new THREE.InstancedMesh(panelGeo, materials.wallPlasterWarm, panelPositions.length)
    const dummy = new THREE.Object3D()
    panelPositions.forEach((px, idx) => {
      dummy.position.set(px, 1.6, 0.045)
      dummy.updateMatrix()
      panelInst.setMatrixAt(idx, dummy.matrix)
    })
    panelInst.instanceMatrix.needsUpdate = true
    panelInst.receiveShadow = true
    wallGroup.add(panelInst)

    // Vertical satin aluminum reveal separators between panels
    const revealGeo = track(new THREE.BoxGeometry(0.03, 3.12, 0.028))
    const revealInst = new THREE.InstancedMesh(revealGeo, materials.laptopAluminum, panelPositions.length + 1)
    panelPositions.forEach((px, idx) => {
      dummy.position.set(px - 0.29, 1.6, 0.048)
      dummy.updateMatrix()
      revealInst.setMatrixAt(idx, dummy.matrix)
    })
    dummy.position.set(panelPositions[panelPositions.length - 1]! + 0.29, 1.6, 0.048)
    dummy.updateMatrix()
    revealInst.setMatrixAt(panelPositions.length, dummy.matrix)
    revealInst.instanceMatrix.needsUpdate = true
    wallGroup.add(revealInst)

    // Horizontal champagne brass datum channel spanning the entire wall at Y = 1.0m
    const datumChannelGeo = track(new THREE.BoxGeometry(10.6, 0.035, 0.03))
    const datumChannel = new THREE.Mesh(datumChannelGeo, materials.champagneBrass)
    datumChannel.position.set(0.0, 1.0, 0.055)
    wallGroup.add(datumChannel)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. SUSPENDED ARCHITECTURAL SMOKED-GLASS EVIDENCE MATRIX PANEL
    // ──────────────────────────────────────────────────────────────────────────
    // Heavy smoked technical glass inspection matrix (5.2m x 1.7m x 0.02m)
    const matrixGlassGeo = track(new THREE.BoxGeometry(5.2, 1.7, 0.02))
    const matrixGlass = new THREE.Mesh(matrixGlassGeo, materials.glassDark)
    matrixGlass.position.set(0.0, 2.05, 0.10)
    wallGroup.add(matrixGlass)

    // Satin aluminum perimeter frame holding the suspended glass
    const frameTopBottomGeo = track(new THREE.BoxGeometry(5.26, 0.04, 0.04))
    const frameSidesGeo = track(new THREE.BoxGeometry(0.04, 1.74, 0.04))

    for (const fy of [1.18, 2.92]) {
      const fb = new THREE.Mesh(frameTopBottomGeo, materials.laptopAluminum)
      fb.position.set(0.0, fy, 0.10)
      wallGroup.add(fb)
    }
    for (const fx of [-2.62, 2.62]) {
      const fs = new THREE.Mesh(frameSidesGeo, materials.laptopAluminum)
      fs.position.set(fx, 2.05, 0.10)
      wallGroup.add(fs)
    }

    // Satin aluminum standoffs mounting frame to backer
    const standoffGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 0.08, 12))
    for (const sx of [-2.5, -1.25, 0.0, 1.25, 2.5]) {
      for (const sy of [1.22, 2.88]) {
        const standoff = new THREE.Mesh(standoffGeo, materials.laptopAluminum)
        standoff.rotation.x = Math.PI / 2
        standoff.position.set(sx, sy, 0.05)
        wallGroup.add(standoff)
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. FIVE PHYSICAL EVIDENCE CASSETTE BAYS (Architectural Check Groups)
    // ──────────────────────────────────────────────────────────────────────────
    // Five physical zones etched onto the matrix wall with bottom retention shelves:
    // 01: Static Analysis, 02: Type Inference, 03: Unit Matrix, 04: Mutation Gate, 05: Provenance
    const groupWidth = 0.94
    const groupCenters = [-2.0, -1.0, 0.0, 1.0, 2.0]

    for (let i = 0; i < groupCenters.length; i++) {
      const cx = groupCenters[i]!

      // Division dividers between test zones in champagne brass
      if (i > 0) {
        const divGeo = track(new THREE.BoxGeometry(0.015, 1.6, 0.025))
        const divider = new THREE.Mesh(divGeo, materials.champagneBrass)
        divider.position.set(cx - 0.5, 2.05, 0.11)
        wallGroup.add(divider)
      }

      // Zone Header Plaque in satin aluminum (static architectural zone marker)
      const headerGeo = track(new THREE.BoxGeometry(groupWidth * 0.88, 0.06, 0.015))
      const header = new THREE.Mesh(headerGeo, materials.laptopAluminum)
      header.position.set(cx, 2.82, 0.115)
      wallGroup.add(header)

      // Physical Evidence Retention Cassette Tray (empty when idle, zero fake data)
      const trayGeo = track(new THREE.BoxGeometry(groupWidth * 0.88, 0.03, 0.16))
      const tray = new THREE.Mesh(trayGeo, materials.gunmetal)
      tray.position.set(cx, 1.26, 0.17)
      wallGroup.add(tray)

      // Brass retention lip holding evidence cassettes
      const lipGeo = track(new THREE.BoxGeometry(groupWidth * 0.88, 0.025, 0.012))
      const lip = new THREE.Mesh(lipGeo, materials.champagneBrass)
      lip.position.set(cx, 1.285, 0.245)
      wallGroup.add(lip)

      // Dormant Evidence Status Pill Lens (dark graphite, armed for future authoritative binding)
      const pillGeo = track(new THREE.BoxGeometry(0.18, 0.02, 0.02))
      const pill = new THREE.Mesh(pillGeo, materials.gunmetal)
      pill.position.set(cx, 2.82, 0.125)
      wallGroup.add(pill)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. LOW-PROFILE AUDIT TRAIL / PROVENANCE LEDGER UNIT
    // ──────────────────────────────────────────────────────────────────────────
    // Long architectural archival credenza running along the floor base (X = -2.8 to +2.8, Y = 0.5m)
    const credenzaGeo = track(new THREE.BoxGeometry(5.6, 0.52, 0.42))
    const credenza = new THREE.Mesh(credenzaGeo, materials.structureGraphite)
    credenza.position.set(0.0, 0.26, 0.24)
    credenza.castShadow = true
    credenza.receiveShadow = true
    wallGroup.add(credenza)

    // Brushed champagne brass top plate on credenza
    const cTopGeo = track(new THREE.BoxGeometry(5.66, 0.02, 0.46))
    const cTop = new THREE.Mesh(cTopGeo, materials.champagneBrass)
    cTop.position.set(0.0, 0.53, 0.24)
    wallGroup.add(cTop)

    // Modular cassette drawer reveals in satin aluminum
    for (let dx = -2.4; dx <= 2.4; dx += 0.8) {
      const drawerGeo = track(new THREE.BoxGeometry(0.72, 0.20, 0.015))
      const drawer = new THREE.Mesh(drawerGeo, materials.gunmetal)
      drawer.position.set(dx, 0.36, 0.455)
      wallGroup.add(drawer)

      const handleGeo = track(new THREE.BoxGeometry(0.24, 0.015, 0.02))
      const handle = new THREE.Mesh(handleGeo, materials.champagneBrass)
      handle.position.set(dx, 0.36, 0.468)
      wallGroup.add(handle)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. CONCEALED DOWNWARD WALL-WASH LIGHTING HEADER
    // ──────────────────────────────────────────────────────────────────────────
    // Concealed ceiling soffit grazing header projecting forward from wall
    const soffitGeo = track(new THREE.BoxGeometry(10.6, 0.12, 0.38))
    const soffit = new THREE.Mesh(soffitGeo, materials.structureGraphite)
    soffit.position.set(0.0, 3.24, 0.20)
    wallGroup.add(soffit)

    const soffitTrimGeo = track(new THREE.BoxGeometry(10.64, 0.015, 0.40))
    const soffitTrim = new THREE.Mesh(soffitTrimGeo, materials.champagneBrass)
    soffitTrim.position.set(0.0, 3.175, 0.20)
    wallGroup.add(soffitTrim)

    // Recessed linear diffuser lens (illuminates South wall)
    const diffuserGeo = track(new THREE.BoxGeometry(8.8, 0.01, 0.06))
    const diffuser = new THREE.Mesh(diffuserGeo, materials.lampWarmGlow)
    diffuser.position.set(0.0, 3.17, 0.22)
    wallGroup.add(diffuser)

    return wallGroup
  }
}
