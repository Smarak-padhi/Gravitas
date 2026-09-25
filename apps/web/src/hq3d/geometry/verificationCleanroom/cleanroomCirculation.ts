/**
 * Gravitas 3D Headquarters — Floor 3 Verification Cleanroom
 * Layer C: Candidate Circulation, Verdict Edge & Elevator Transition
 *
 * Implements architectural circulation and physical quality pipeline storytelling:
 * - Pale mineral floor runner defining the cleanroom inspection zone
 * - Dual-channel routing conduits: Inbound Candidate intake vs Outbound Verdict path
 * - Architectural Custody Transfer Plinth near the vertical core
 * - Restrained architectural elevator arrival threshold portal
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'

export class CleanroomCirculation {
  public static buildCirculation(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): THREE.Group {
    const circGroup = new THREE.Group()
    circGroup.name = 'cleanroom-circulation'

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ARCHITECTURAL CLEANROOM FLOOR RUNNER & ZONE BOUNDARY
    // ──────────────────────────────────────────────────────────────────────────
    // Inset technical mineral floor field (8.4m x 4.8m x 0.008m)
    const floorFieldGeo = track(new THREE.BoxGeometry(8.4, 0.008, 4.8))
    const floorField = new THREE.Mesh(floorFieldGeo, materials.limestone)
    floorField.position.set(0.0, 0.004, 0.9)
    floorField.receiveShadow = true
    circGroup.add(floorField)

    // Satin aluminum outer perimeter border (subtle architectural floor trim)
    const floorBorderGeo = track(new THREE.BoxGeometry(8.46, 0.012, 4.86))
    const floorBorder = new THREE.Mesh(floorBorderGeo, materials.laptopAluminum)
    floorBorder.position.set(0.0, 0.006, 0.9)
    circGroup.add(floorBorder)

    // Champagne brass inner detail reveal line
    const floorRevealGeo = track(new THREE.BoxGeometry(8.48, 0.004, 4.88))
    const floorReveal = new THREE.Mesh(floorRevealGeo, materials.champagneBrass)
    floorReveal.position.set(0.0, 0.002, 0.9)
    circGroup.add(floorReveal)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. DUAL-CHANNEL FLOOR ROUTING CONDUITS
    // ──────────────────────────────────────────────────────────────────────────
    // Channel A: Inbound Candidate Intake Line (Elevator -> Candidate Intake Dock)
    // Runs from X = 5.2, Z = 0.4 -> X = -1.25, Z = 0.4 -> Z = 0.9
    const intakeLineXGeo = track(new THREE.BoxGeometry(6.45, 0.004, 0.06))
    const intakeLineX = new THREE.Mesh(intakeLineXGeo, materials.champagneBrass)
    intakeLineX.position.set(1.975, 0.010, 0.4)
    circGroup.add(intakeLineX)

    const intakeLineZGeo = track(new THREE.BoxGeometry(0.06, 0.004, 0.55))
    const intakeLineZ = new THREE.Mesh(intakeLineZGeo, materials.champagneBrass)
    intakeLineZ.position.set(-1.25, 0.010, 0.675)
    circGroup.add(intakeLineZ)

    // Channel B: Outbound Verdict Line (Verdict Dock -> Outbound Elevator Core)
    // Runs from X = 1.25, Z = 0.9 -> X = 1.25, Z = -0.1 -> X = 5.2, Z = -0.1
    const verdictLineZGeo = track(new THREE.BoxGeometry(0.06, 0.004, 1.0))
    const verdictLineZ = new THREE.Mesh(verdictLineZGeo, materials.laptopAluminum)
    verdictLineZ.position.set(1.25, 0.010, 0.4)
    circGroup.add(verdictLineZ)

    const verdictLineXGeo = track(new THREE.BoxGeometry(3.95, 0.004, 0.06))
    const verdictLineX = new THREE.Mesh(verdictLineXGeo, materials.laptopAluminum)
    verdictLineX.position.set(3.225, 0.010, -0.1)
    circGroup.add(verdictLineX)

    // Embedded direction pips (brass datum ticks along conduits)
    for (const px of [-0.6, 0.6, 2.0, 3.4]) {
      const pipGeo = track(new THREE.BoxGeometry(0.04, 0.006, 0.02))
      const pip = new THREE.Mesh(pipGeo, materials.gunmetal)
      pip.position.set(px, 0.012, 0.4)
      circGroup.add(pip)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. ARCHITECTURAL CUSTODY TRANSFER PLINTH
    // ──────────────────────────────────────────────────────────────────────────
    // Slender terminal plinth positioned between elevator and cleanroom entrance
    const plinthGroup = new THREE.Group()
    plinthGroup.position.set(3.8, 0.0, 0.4)

    const plinthBaseGeo = track(new THREE.BoxGeometry(0.42, 0.96, 0.32))
    const plinthBase = new THREE.Mesh(plinthBaseGeo, materials.structureGraphite)
    plinthBase.position.set(0.0, 0.48, 0.0)
    plinthBase.castShadow = true
    plinthGroup.add(plinthBase)

    const plinthCapGeo = track(new THREE.BoxGeometry(0.46, 0.04, 0.36))
    const plinthCap = new THREE.Mesh(plinthCapGeo, materials.champagneBrass)
    plinthCap.position.set(0.0, 0.98, 0.0)
    plinthGroup.add(plinthCap)

    // Document custody slot & dormant reader lens
    const slotGeo = track(new THREE.BoxGeometry(0.24, 0.01, 0.04))
    const slot = new THREE.Mesh(slotGeo, materials.gunmetal)
    slot.position.set(0.0, 1.005, 0.04)
    plinthGroup.add(slot)

    const lensGeo = track(new THREE.BoxGeometry(0.12, 0.012, 0.03))
    const lens = new THREE.Mesh(lensGeo, materials.terminalScreenEmerald)
    lens.position.set(0.0, 1.006, -0.06)
    plinthGroup.add(lens)

    circGroup.add(plinthGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 4. ELEVATOR ARRIVAL THRESHOLD PORTAL (East Side: X = 5.6m)
    // ──────────────────────────────────────────────────────────────────────────
    // Restrained architectural frame marking the entrance from the elevator core
    const portalGroup = new THREE.Group()
    portalGroup.position.set(5.6, 0.0, 0.0)

    // Floor threshold datum plate
    const threshGeo = track(new THREE.BoxGeometry(0.36, 0.02, 2.2))
    const thresh = new THREE.Mesh(threshGeo, materials.structureGraphite)
    thresh.position.set(0.0, 0.01, 0.0)
    portalGroup.add(thresh)

    const threshTrimGeo = track(new THREE.BoxGeometry(0.38, 0.008, 2.24))
    const threshTrim = new THREE.Mesh(threshTrimGeo, materials.champagneBrass)
    threshTrim.position.set(0.0, 0.022, 0.0)
    portalGroup.add(threshTrim)

    // Vertical portal jambs in satin aluminum
    const jambGeo = track(new THREE.BoxGeometry(0.08, 3.2, 0.08))
    for (const jz of [-1.1, 1.1]) {
      const jamb = new THREE.Mesh(jambGeo, materials.laptopAluminum)
      jamb.position.set(0.0, 1.6, jz)
      jamb.castShadow = true
      portalGroup.add(jamb)
    }

    // Horizontal portal lintel
    const lintelGeo = track(new THREE.BoxGeometry(0.10, 0.12, 2.28))
    const lintel = new THREE.Mesh(lintelGeo, materials.laptopAluminum)
    lintel.position.set(0.0, 3.22, 0.0)
    portalGroup.add(lintel)

    // Subtle level identification datum bar [LEVEL 03 - VERIFICATION]
    const plaqueGeo = track(new THREE.BoxGeometry(0.11, 0.06, 0.64))
    const plaque = new THREE.Mesh(plaqueGeo, materials.champagneBrass)
    plaque.position.set(0.0, 3.08, 0.0)
    portalGroup.add(plaque)

    circGroup.add(portalGroup)

    return circGroup
  }
}
