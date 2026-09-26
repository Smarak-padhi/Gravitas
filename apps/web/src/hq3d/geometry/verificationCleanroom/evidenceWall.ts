/**
 * Gravitas 3D Headquarters — Floor 3 Verification Cleanroom
 * Layer B: Real Architectural Evidence Wall (Wave 12K-R)
 *
 * Implements the real architectural evidence wall with physical depth:
 * - South wall position: Z = 3.65m, spanning X = -5.2m to +5.2m
 * - Deep architectural framing with structural satin aluminum mullions
 * - Inset mineral composite acoustic panels with beveled reveal channels
 * - Five physical evidence bays representing the deterministic verification matrix:
 *   [01: STATIC_ANALYSIS & AST]
 *   [02: TYPE_INFERENCE & CONTRACTS]
 *   [03: DETERMINISTIC UNIT MATRIX]
 *   [04: MUTATION BOUNDARY SCOPE]
 *   [05: REGRESSION & EVIDENCE LEDGER]
 * - Double champagne brass datum rails with etched calibration marks
 * - Five suspended dormant smoked-glass matrix panels with coordinate grid etchings
 * - Physical provenance evidence retention slots at each bay base
 * - Downward architectural wall-wash grazing header
 * - Zero fake logs, zero fake PASS indicators, zero fake test numbers:
 *   Surfaces are physically designed for authoritative runtime projection.
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
      name: 'Deterministic Evidence & Test Provenance Wall',
      roomId: 'VERIFICATION_LAB',
      role: 'Deterministic Verification Matrix',
      status: 'Cleanroom Armed',
      description: 'Architectural evidence retention and test provenance wall with 5 physical evidence bays, datum rails, and dormant inspection glass.',
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ARCHITECTURAL GRAPHITE BACKER & REVEAL CAVITY
    // ──────────────────────────────────────────────────────────────────────────
    // Primary structural backer slab (10.8m wide x 3.2m high x 0.06m deep)
    const backerGeo = track(new THREE.BoxGeometry(10.8, 3.2, 0.06))
    const backer = new THREE.Mesh(backerGeo, materials.structureGraphite)
    backer.position.set(0.0, 1.6, 0.0)
    backer.receiveShadow = true
    wallGroup.add(backer)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. FIVE ARCHITECTURAL EVIDENCE BAYS & VERTICAL STRUCTURAL MULLIONS
    // ──────────────────────────────────────────────────────────────────────────
    // Bay centers: X = -4.0, -2.0, 0.0, 2.0, 4.0 (each bay is 1.82m wide)
    const bayXs = [-4.0, -2.0, 0.0, 2.0, 4.0]

    // Inset beveled mineral acoustic back panels
    const bayPanelGeo = track(new THREE.BoxGeometry(1.82, 2.84, 0.03))
    for (const bx of bayXs) {
      const panel = new THREE.Mesh(bayPanelGeo, materials.wallPlasterWarm)
      panel.position.set(bx, 1.6, -0.02)
      panel.receiveShadow = true
      wallGroup.add(panel)
    }

    // Structural vertical satin aluminum dividing mullions (6 mullions separating the 5 bays)
    const mullionGeo = track(new THREE.BoxGeometry(0.08, 3.12, 0.08))
    for (const mx of [-4.96, -3.0, -1.0, 1.0, 3.0, 4.96]) {
      const mullion = new THREE.Mesh(mullionGeo, materials.laptopAluminum)
      mullion.position.set(mx, 1.6, -0.04)
      mullion.castShadow = true
      wallGroup.add(mullion)

      // Brass accent reveal on mullion face
      const mTrimGeo = track(new THREE.BoxGeometry(0.016, 3.12, 0.084))
      const mTrim = new THREE.Mesh(mTrimGeo, materials.champagneBrass)
      mTrim.position.set(mx, 1.6, -0.045)
      wallGroup.add(mTrim)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. DOUBLE HORIZONTAL CHAMPAGNE BRASS DATUM CHANNELS
    // ──────────────────────────────────────────────────────────────────────────
    // Full-length datum channels at Y = 0.82m and Y = 2.62m
    for (const dy of [0.82, 2.62]) {
      const datumGeo = track(new THREE.BoxGeometry(10.8, 0.032, 0.04))
      const datum = new THREE.Mesh(datumGeo, materials.champagneBrass)
      datum.position.set(0.0, dy, -0.05)
      wallGroup.add(datum)
    }

    // Precision etched datum ticks along lower datum rail (5 registration pips per bay)
    for (const bx of bayXs) {
      for (const offset of [-0.6, -0.3, 0.0, 0.3, 0.6]) {
        const tickGeo = track(new THREE.BoxGeometry(0.008, 0.024, 0.045))
        const tick = new THREE.Mesh(tickGeo, materials.gunmetal)
        tick.position.set(bx + offset, 0.82, -0.055)
        wallGroup.add(tick)
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. SUSPENDED DORMANT SMOKED-GLASS EVIDENCE PANELS (5 BAYS)
    // ──────────────────────────────────────────────────────────────────────────
    // Suspended smoked inspection glass (1.64m x 1.48m x 0.016m per bay)
    const glassGeo = track(new THREE.BoxGeometry(1.64, 1.48, 0.016))
    const glassFrameTBGeo = track(new THREE.BoxGeometry(1.66, 0.024, 0.03))
    const glassFrameSideGeo = track(new THREE.BoxGeometry(0.024, 1.48, 0.03))
    const standoffGeo = track(new THREE.CylinderGeometry(0.016, 0.016, 0.05, 12))

    for (const bx of bayXs) {
      // Smoked technical glass plane (dormant, emissive = 0)
      const glass = new THREE.Mesh(glassGeo, materials.glassDark)
      glass.position.set(bx, 1.72, -0.08)
      wallGroup.add(glass)

      // Satin aluminum perimeter frame holding the suspended glass
      for (const fy of [0.97, 2.47]) {
        const fTB = new THREE.Mesh(glassFrameTBGeo, materials.laptopAluminum)
        fTB.position.set(bx, fy, -0.08)
        wallGroup.add(fTB)
      }
      for (const fx of [-0.82, 0.82]) {
        const fSide = new THREE.Mesh(glassFrameSideGeo, materials.laptopAluminum)
        fSide.position.set(bx + fx, 1.72, -0.08)
        wallGroup.add(fSide)
      }

      // Satin aluminum mounting standoffs with brass collar washers
      for (const [sx, sy] of [[-0.78, 1.02], [0.78, 1.02], [-0.78, 2.42], [0.78, 2.42]]) {
        const standoff = new THREE.Mesh(standoffGeo, materials.laptopAluminum)
        standoff.rotation.x = Math.PI / 2
        standoff.position.set(bx + sx, sy, -0.055)
        wallGroup.add(standoff)

        const washerGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 12))
        const washer = new THREE.Mesh(washerGeo, materials.champagneBrass)
        washer.rotation.x = Math.PI / 2
        washer.position.set(bx + sx, sy, -0.075)
        wallGroup.add(washer)
      }

      // Etched subtle coordinate grid lines on the dormant glass (3 horizontal & 3 vertical lines)
      for (const gy of [1.32, 1.72, 2.12]) {
        const gLineGeo = track(new THREE.BoxGeometry(1.52, 0.003, 0.018))
        const gLine = new THREE.Mesh(gLineGeo, materials.structureGraphite)
        gLine.position.set(bx, gy, -0.082)
        wallGroup.add(gLine)
      }
      for (const gx of [-0.48, 0.0, 0.48]) {
        const gLineGeo = track(new THREE.BoxGeometry(0.003, 1.36, 0.018))
        const gLine = new THREE.Mesh(gLineGeo, materials.structureGraphite)
        gLine.position.set(bx + gx, 1.72, -0.082)
        wallGroup.add(gLine)
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. PHYSICAL PROVENANCE & EVIDENCE CASSETTE SLOTS (5 BAYS)
    // ──────────────────────────────────────────────────────────────────────────
    // Lower evidence retention ledge beneath each glass panel (Y = 0.52m to 0.78m)
    const slotLedgeGeo = track(new THREE.BoxGeometry(1.64, 0.024, 0.14))
    const cassetteBedGeo = track(new THREE.BoxGeometry(1.58, 0.012, 0.10))
    const dividerGeo = track(new THREE.BoxGeometry(0.016, 0.045, 0.12))

    for (const bx of bayXs) {
      // Machined aluminum cassette support shelf
      const ledge = new THREE.Mesh(slotLedgeGeo, materials.laptopAluminum)
      ledge.position.set(bx, 0.62, -0.07)
      ledge.castShadow = true
      wallGroup.add(ledge)

      // Brass front retention lip
      const lipGeo = track(new THREE.BoxGeometry(1.66, 0.024, 0.016))
      const lip = new THREE.Mesh(lipGeo, materials.champagneBrass)
      lip.position.set(bx, 0.636, -0.135)
      wallGroup.add(lip)

      // Recessed proof carrier cassette bed in technical graphite
      const bed = new THREE.Mesh(cassetteBedGeo, materials.structureGraphite)
      bed.position.set(bx, 0.634, -0.07)
      wallGroup.add(bed)

      // 3 cassette sub-compartments per bay for physical custody evidence
      for (const cx of [-0.52, 0.0, 0.52]) {
        const div = new THREE.Mesh(dividerGeo, materials.champagneBrass)
        div.position.set(bx + cx, 0.648, -0.07)
        wallGroup.add(div)
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. CONTINUOUS DOWNWARD WALL-WASH GRAZING HEADER FASCIA
    // ──────────────────────────────────────────────────────────────────────────
    // Overhead canopy fascia trough projecting 0.28m from wall at Y = 3.12m
    const canopyGeo = track(new THREE.BoxGeometry(10.84, 0.08, 0.28))
    const canopy = new THREE.Mesh(canopyGeo, materials.structureGraphite)
    canopy.position.set(0.0, 3.12, -0.14)
    wallGroup.add(canopy)

    const canopyTrimGeo = track(new THREE.BoxGeometry(10.88, 0.016, 0.29))
    const canopyTrim = new THREE.Mesh(canopyTrimGeo, materials.champagneBrass)
    canopyTrim.position.set(0.0, 3.08, -0.14)
    wallGroup.add(canopyTrim)

    // Recessed architectural graze luminaire slot beneath canopy
    const grazeSlotGeo = track(new THREE.BoxGeometry(10.4, 0.012, 0.08))
    const grazeSlot = new THREE.Mesh(grazeSlotGeo, materials.lampWarmGlow)
    grazeSlot.position.set(0.0, 3.07, -0.16)
    wallGroup.add(grazeSlot)

    return wallGroup
  }
}
