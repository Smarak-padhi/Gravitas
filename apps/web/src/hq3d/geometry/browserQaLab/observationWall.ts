/**
 * Gravitas 3D Headquarters — Floor 4 Browser QA Lab
 * Layer B: Viewport Observation & Responsive Comparison Wall
 *
 * Implements the large architectural observation surface:
 * - South wall position: Z = 3.65m, spanning X = -5.0m to +5.0m
 * - Vertical acoustic paneling in dark technical charcoal
 * - Suspended panoramic viewport comparison array (5.4m x 1.8m)
 * - Precision responsive viewport measurement ticks etched into frame:
 *   [3840x1600 Ultrawide], [1920x1080 Desktop], [1440x900 Laptop], [1024x768 Tablet], [390x844 Mobile]
 * - Dual snapshot comparison bays: Baseline vs Candidate inspection zones
 * - Dormant glass when idle (zero fake websites or dashboards)
 * - Overhead cantilevered satin aluminum light bar with glare-free downward wash
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'

export class ObservationWall {
  public static buildWall(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): THREE.Group {
    const wallGroup = new THREE.Group()
    wallGroup.position.set(0.0, 0.0, 3.65)
    wallGroup.name = 'station:observation-wall'
    wallGroup.userData = {
      type: 'station',
      id: 'observation-wall',
      name: 'Viewport Observation & Responsive Comparison Wall',
      roomId: 'BROWSER_QA_LAB',
      role: 'DOM Visual Assertion & Diff Surface',
      status: 'Observation Armed',
      description: 'Architectural observation surface for responsive viewport comparison, baseline vs candidate visual regression, and DOM event inspection.',
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. VERTICAL ACOUSTIC SLAT BACKER (Dark Charcoal & Timber Finishes)
    // ──────────────────────────────────────────────────────────────────────────
    const backerGeo = track(new THREE.BoxGeometry(10.6, 3.2, 0.04))
    const backer = new THREE.Mesh(backerGeo, materials.structureGraphite)
    backer.position.set(0.0, 1.6, 0.02)
    backer.receiveShadow = true
    wallGroup.add(backer)

    // Vertical acoustic timber slats (instanced across X from -4.8 to +4.8)
    const slatGeo = track(new THREE.BoxGeometry(0.06, 3.12, 0.03))
    const slatPositions: number[] = []
    for (let x = -4.8; x <= 4.8; x += 0.24) {
      slatPositions.push(x)
    }

    const slatInst = new THREE.InstancedMesh(slatGeo, materials.walnut, slatPositions.length)
    const dummy = new THREE.Object3D()
    slatPositions.forEach((px, idx) => {
      dummy.position.set(px, 1.6, 0.05)
      dummy.updateMatrix()
      slatInst.setMatrixAt(idx, dummy.matrix)
    })
    slatInst.instanceMatrix.needsUpdate = true
    slatInst.receiveShadow = true
    wallGroup.add(slatInst)

    // Horizontal champagne brass mounting rails across the wall
    for (const ry of [0.95, 2.95]) {
      const railGeo = track(new THREE.BoxGeometry(10.6, 0.025, 0.035))
      const rail = new THREE.Mesh(railGeo, materials.champagneBrass)
      rail.position.set(0.0, ry, 0.065)
      wallGroup.add(rail)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. PANORAMIC VIEWPORT OBSERVATION PANEL (Smoked Glass & Aluminum Frame)
    // ──────────────────────────────────────────────────────────────────────────
    // Smoked technical glass observation surface (5.4m x 1.76m x 0.02m)
    const glassGeo = track(new THREE.BoxGeometry(5.4, 1.76, 0.02))
    const glass = new THREE.Mesh(glassGeo, materials.glassDark)
    glass.position.set(0.0, 1.95, 0.11)
    wallGroup.add(glass)

    // Satin aluminum perimeter frame
    const frameHorizGeo = track(new THREE.BoxGeometry(5.48, 0.04, 0.04))
    const frameVertGeo = track(new THREE.BoxGeometry(0.04, 1.84, 0.04))

    for (const fy of [1.05, 2.85]) {
      const fh = new THREE.Mesh(frameHorizGeo, materials.laptopAluminum)
      fh.position.set(0.0, fy, 0.11)
      wallGroup.add(fh)
    }
    for (const fx of [-2.72, 2.72]) {
      const fv = new THREE.Mesh(frameVertGeo, materials.laptopAluminum)
      fv.position.set(fx, 1.95, 0.11)
      wallGroup.add(fv)
    }

    // Satin aluminum standoffs mounting panel to backer
    const standoffGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 0.09, 12))
    for (const sx of [-2.6, -1.3, 0.0, 1.3, 2.6]) {
      for (const sy of [1.1, 2.8]) {
        const so = new THREE.Mesh(standoffGeo, materials.laptopAluminum)
        so.rotation.x = Math.PI / 2
        so.position.set(sx, sy, 0.06)
        wallGroup.add(so)
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. DUAL SNAPSHOT COMPARISON BAYS (Baseline vs Candidate)
    // ──────────────────────────────────────────────────────────────────────────
    // Vertical dividing datum bar in champagne brass separating left & right comparison bays
    const centerDividerGeo = track(new THREE.BoxGeometry(0.024, 1.72, 0.025))
    const centerDivider = new THREE.Mesh(centerDividerGeo, materials.champagneBrass)
    centerDivider.position.set(0.0, 1.95, 0.125)
    wallGroup.add(centerDivider)

    // Left Bay Header Plaque [BASELINE SNAPSHOT REPOSITORY]
    const headerLeftGeo = track(new THREE.BoxGeometry(2.35, 0.05, 0.015))
    const headerLeft = new THREE.Mesh(headerLeftGeo, materials.laptopAluminum)
    headerLeft.position.set(-1.3, 2.72, 0.125)
    wallGroup.add(headerLeft)

    // Right Bay Header Plaque [CANDIDATE VIEWPORT ASSERTION]
    const headerRight = new THREE.Mesh(headerLeftGeo, materials.laptopAluminum)
    headerRight.position.set(1.3, 2.72, 0.125)
    wallGroup.add(headerRight)

    // Responsive calibration coordinate ticks along frame (subtle brass registration marks)
    for (const bx of [-2.2, -1.5, -0.8, 0.8, 1.5, 2.2]) {
      const tickGeo = track(new THREE.BoxGeometry(0.015, 0.03, 0.02))
      const tick = new THREE.Mesh(tickGeo, materials.champagneBrass)
      tick.position.set(bx, 1.08, 0.125)
      wallGroup.add(tick)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. LOW-PROFILE QA LEDGER & TELEMETRY CREDENZA
    // ──────────────────────────────────────────────────────────────────────────
    const credenzaGeo = track(new THREE.BoxGeometry(5.8, 0.48, 0.38))
    const credenza = new THREE.Mesh(credenzaGeo, materials.structureGraphite)
    credenza.position.set(0.0, 0.24, 0.22)
    credenza.castShadow = true
    credenza.receiveShadow = true
    wallGroup.add(credenza)

    // American walnut top plinth with brass reveal
    const cTopGeo = track(new THREE.BoxGeometry(5.86, 0.025, 0.42))
    const cTop = new THREE.Mesh(cTopGeo, materials.walnut)
    cTop.position.set(0.0, 0.49, 0.22)
    wallGroup.add(cTop)

    // Modular equipment slots for testing peripherals
    for (let cx = -2.4; cx <= 2.4; cx += 1.2) {
      const slotGeo = track(new THREE.BoxGeometry(0.92, 0.18, 0.015))
      const slot = new THREE.Mesh(slotGeo, materials.gunmetal)
      slot.position.set(cx, 0.32, 0.415)
      wallGroup.add(slot)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. OVERHEAD CANTILEVERED TASK LUMINAIRE BAR
    // ──────────────────────────────────────────────────────────────────────────
    // Cantilever outriggers extending forward from wall
    for (const ox of [-2.4, 0.0, 2.4]) {
      const outriggerGeo = track(new THREE.BoxGeometry(0.03, 0.03, 0.62))
      const outrigger = new THREE.Mesh(outriggerGeo, materials.laptopAluminum)
      outrigger.position.set(ox, 3.12, 0.35)
      wallGroup.add(outrigger)
    }

    // Continuous luminaire bar casting glare-free downward wash
    const lumBarGeo = track(new THREE.BoxGeometry(5.6, 0.04, 0.06))
    const lumBar = new THREE.Mesh(lumBarGeo, materials.laptopAluminum)
    lumBar.position.set(0.0, 3.12, 0.66)
    wallGroup.add(lumBar)

    const lumTrimGeo = track(new THREE.BoxGeometry(5.64, 0.01, 0.07))
    const lumTrim = new THREE.Mesh(lumTrimGeo, materials.champagneBrass)
    lumTrim.position.set(0.0, 3.14, 0.66)
    wallGroup.add(lumTrim)

    const lumLensGeo = track(new THREE.BoxGeometry(5.4, 0.008, 0.04))
    const lumLens = new THREE.Mesh(lumLensGeo, materials.lampWarmGlow)
    lumLens.position.set(0.0, 3.096, 0.66)
    wallGroup.add(lumLens)

    return wallGroup
  }
}
