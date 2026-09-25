/**
 * Gravitas 3D Headquarters — Floor 4 Browser QA Lab
 * Layer C: Interaction Test Zone, Device Testing Rack & Circulation
 *
 * Implements the physical space where software gets visually and interactively exercised:
 * - Interactive DOM Test Console & Event Capture Deck
 * - 4-Tier Mobile Device Testing Rack & Compute Shelves
 * - Viewport Calibration Floor Runner & Circulation Matrix
 * - Restrained Elevator Arrival Threshold Portal
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'

export class InteractionZone {
  public static buildZone(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): THREE.Group {
    const zoneGroup = new THREE.Group()
    zoneGroup.name = 'interaction-test-zone'

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ARCHITECTURAL FLOOR RUNNER & VIEWPORT CALIBRATION MATRIX
    // ──────────────────────────────────────────────────────────────────────────
    // Dark technical composite floor runner (8.6m x 4.8m x 0.008m)
    const floorFieldGeo = track(new THREE.BoxGeometry(8.6, 0.008, 4.8))
    const floorField = new THREE.Mesh(floorFieldGeo, materials.structureGraphite)
    floorField.position.set(0.0, 0.004, 0.9)
    floorField.receiveShadow = true
    zoneGroup.add(floorField)

    // Champagne brass perimeter border trim
    const floorBorderGeo = track(new THREE.BoxGeometry(8.66, 0.012, 4.86))
    const floorBorder = new THREE.Mesh(floorBorderGeo, materials.champagneBrass)
    floorBorder.position.set(0.0, 0.006, 0.9)
    zoneGroup.add(floorBorder)

    // Inset viewport calibration grid lines (satin aluminum registration lines on floor)
    for (const gx of [-2.4, 0.0, 2.4]) {
      const lineZGeo = track(new THREE.BoxGeometry(0.04, 0.004, 4.6))
      const lineZ = new THREE.Mesh(lineZGeo, materials.laptopAluminum)
      lineZ.position.set(gx, 0.010, 0.9)
      zoneGroup.add(lineZ)
    }

    for (const gz of [-0.8, 0.9, 2.6]) {
      const lineXGeo = track(new THREE.BoxGeometry(8.4, 0.004, 0.04))
      const lineX = new THREE.Mesh(lineXGeo, materials.laptopAluminum)
      lineX.position.set(0.0, 0.010, gz)
      zoneGroup.add(lineX)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. INTERACTIVE DOM TEST CONSOLE & EVENT CAPTURE DECK (West: X = -4.0m, Z = 0.5m)
    // ──────────────────────────────────────────────────────────────────────────
    const consoleGroup = new THREE.Group()
    consoleGroup.position.set(-4.0, 0.0, 0.5)
    consoleGroup.name = 'station:browser-qa-station'
    consoleGroup.userData = {
      type: 'station',
      id: 'browser-qa-station',
      name: 'QA Interaction & Event Capture Console',
      roomId: 'BROWSER_QA_LAB',
      role: 'Interaction Assertion & DOM Event Capture',
      status: 'Active Rig',
      description: 'Dedicated technician console for manual and synthetic DOM interaction capture, gesture verification, and browser session recording.',
    }

    // Heavy sculpted pedestal base in gunmetal
    const cBaseGeo = track(new THREE.BoxGeometry(1.2, 0.92, 0.65))
    const cBase = new THREE.Mesh(cBaseGeo, materials.structureGraphite)
    cBase.position.set(0.0, 0.46, 0.0)
    cBase.castShadow = true
    consoleGroup.add(cBase)

    // American walnut desk cap with champagne brass rim
    const cTopGeo = track(new THREE.BoxGeometry(1.26, 0.04, 0.71))
    const cTop = new THREE.Mesh(cTopGeo, materials.walnut)
    cTop.position.set(0.0, 0.94, 0.0)
    consoleGroup.add(cTop)

    const cRimGeo = track(new THREE.BoxGeometry(1.28, 0.012, 0.73))
    const cRim = new THREE.Mesh(cRimGeo, materials.champagneBrass)
    cRim.position.set(0.0, 0.92, 0.0)
    consoleGroup.add(cRim)

    // Inset precision glass trackpad surface (simulating touch/pointer capture)
    const padGeo = track(new THREE.BoxGeometry(0.45, 0.01, 0.32))
    const pad = new THREE.Mesh(padGeo, materials.glassDark)
    pad.position.set(-0.25, 0.965, 0.06)
    consoleGroup.add(pad)

    // Tactile macro deck keypad (tactile inputs)
    const macroGeo = track(new THREE.BoxGeometry(0.32, 0.02, 0.22))
    const macro = new THREE.Mesh(macroGeo, materials.gunmetal)
    macro.position.set(0.28, 0.97, 0.06)
    consoleGroup.add(macro)

    // Angled telemetry display screen (dormant technical monitor)
    const monArmGeo = track(new THREE.CylinderGeometry(0.018, 0.022, 0.35, 12))
    const monArm = new THREE.Mesh(monArmGeo, materials.laptopAluminum)
    monArm.position.set(0.0, 1.12, -0.22)
    consoleGroup.add(monArm)

    const monFrameGeo = track(new THREE.BoxGeometry(0.68, 0.42, 0.025))
    const monFrame = new THREE.Mesh(monFrameGeo, materials.gunmetal)
    monFrame.position.set(0.0, 1.35, -0.16)
    monFrame.rotation.x = -0.22
    monFrame.castShadow = true
    consoleGroup.add(monFrame)

    const monScreenGeo = track(new THREE.BoxGeometry(0.64, 0.38, 0.006))
    const monScreen = new THREE.Mesh(monScreenGeo, materials.terminalScreenEmerald)
    monScreen.position.set(0.0, 1.35, -0.148)
    monScreen.rotation.x = -0.22
    consoleGroup.add(monScreen)

    // Station indicator on interaction console
    const cIndGeo = track(new THREE.BoxGeometry(0.24, 0.014, 0.04))
    const cInd = new THREE.Mesh(cIndGeo, materials.gunmetal)
    cInd.position.set(0.0, 0.965, 0.30)
    cInd.name = 'station-indicator:browser-qa-station'
    consoleGroup.add(cInd)

    zoneGroup.add(consoleGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. 4-TIER MOBILE DEVICE TESTING RACK (West: X = -4.0m, Z = 1.8m)
    // ──────────────────────────────────────────────────────────────────────────
    const rackGroup = new THREE.Group()
    rackGroup.position.set(-4.0, 0.0, 1.8)

    // Vertical structural uprights in satin aluminum
    const uprightGeo = track(new THREE.BoxGeometry(0.04, 1.7, 0.04))
    for (const ux of [-0.55, 0.55]) {
      for (const uz of [-0.22, 0.22]) {
        const up = new THREE.Mesh(uprightGeo, materials.laptopAluminum)
        up.position.set(ux, 0.85, uz)
        up.castShadow = true
        rackGroup.add(up)
      }
    }

    // 4 Horizontal Device Shelves
    const shelfGeo = track(new THREE.BoxGeometry(1.18, 0.025, 0.48))
    for (const sy of [0.35, 0.75, 1.15, 1.55]) {
      const shelf = new THREE.Mesh(shelfGeo, materials.structureGraphite)
      shelf.position.set(0.0, sy, 0.0)
      shelf.castShadow = true
      rackGroup.add(shelf)

      // Aluminum shelf edge trim with status LEDs
      const sTrimGeo = track(new THREE.BoxGeometry(1.20, 0.015, 0.50))
      const sTrim = new THREE.Mesh(sTrimGeo, materials.champagneBrass)
      sTrim.position.set(0.0, sy - 0.005, 0.0)
      rackGroup.add(sTrim)

      // Array of small test phone chassis docked on shelf
      for (let dx = -0.42; dx <= 0.42; dx += 0.28) {
        const phCradleGeo = track(new THREE.BoxGeometry(0.14, 0.18, 0.08))
        const phCradle = new THREE.Mesh(phCradleGeo, materials.gunmetal)
        phCradle.position.set(dx, sy + 0.10, 0.0)
        phCradle.rotation.x = -0.3
        rackGroup.add(phCradle)
      }
    }

    zoneGroup.add(rackGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 4. ELEVATOR ARRIVAL THRESHOLD PORTAL (East Side: X = 5.6m)
    // ──────────────────────────────────────────────────────────────────────────
    const portalGroup = new THREE.Group()
    portalGroup.position.set(5.6, 0.0, 0.0)

    const threshGeo = track(new THREE.BoxGeometry(0.36, 0.02, 2.2))
    const thresh = new THREE.Mesh(threshGeo, materials.structureGraphite)
    thresh.position.set(0.0, 0.01, 0.0)
    portalGroup.add(thresh)

    const threshTrimGeo = track(new THREE.BoxGeometry(0.38, 0.008, 2.24))
    const threshTrim = new THREE.Mesh(threshTrimGeo, materials.champagneBrass)
    threshTrim.position.set(0.0, 0.022, 0.0)
    portalGroup.add(threshTrim)

    // Portal uprights in satin aluminum
    const jambGeo = track(new THREE.BoxGeometry(0.08, 3.2, 0.08))
    for (const jz of [-1.1, 1.1]) {
      const jamb = new THREE.Mesh(jambGeo, materials.laptopAluminum)
      jamb.position.set(0.0, 1.6, jz)
      jamb.castShadow = true
      portalGroup.add(jamb)
    }

    const lintelGeo = track(new THREE.BoxGeometry(0.10, 0.12, 2.28))
    const lintel = new THREE.Mesh(lintelGeo, materials.laptopAluminum)
    lintel.position.set(0.0, 3.22, 0.0)
    portalGroup.add(lintel)

    // Subtle level plaque [LEVEL 04 - BROWSER QA LAB]
    const plaqueGeo = track(new THREE.BoxGeometry(0.11, 0.06, 0.64))
    const plaque = new THREE.Mesh(plaqueGeo, materials.champagneBrass)
    plaque.position.set(0.0, 3.08, 0.0)
    portalGroup.add(plaque)

    zoneGroup.add(portalGroup)

    return zoneGroup
  }
}
