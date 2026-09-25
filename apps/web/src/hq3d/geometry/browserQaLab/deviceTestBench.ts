/**
 * Gravitas 3D Headquarters — Floor 4 Browser QA Lab
 * Layer A: Device Test Bench & Multi-Surface Workstation (Hero Object)
 *
 * Implements the professional multi-viewport product-testing workstation:
 * - Positioned at X = 0.0, Y = 14.4, Z = 1.0
 * - Sleek technical slate desktop with chamfered American walnut edge reveal
 * - Coherent articulated hardware armature representing ONE product across MULTIPLE viewports:
 *   1. Ultrawide Desktop Display (34-inch 21:9 ratio)
 *   2. Reference Laptop Display (16-inch 16:10 ratio on cantilevered aluminum riser)
 *   3. Reference Tablet (11-inch portrait on magnetic dock)
 *   4. Reference Smartphone (6.7-inch portrait on angled test cradle)
 * - Screens remain dormant while idle (no fake web pages or fake test dashboards)
 * - Deterministic station indicator lens
 * - Ergonomic QA task chair with 5-star roller base and dark mesh upholstery
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'

export interface DeviceTestBenchBuildResult {
  readonly benchGroup: THREE.Group
  readonly indicatorMesh: THREE.Mesh
  readonly screens: THREE.Mesh[]
}

export class DeviceTestBench {
  public static buildBench(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): DeviceTestBenchBuildResult {
    const benchGroup = new THREE.Group()
    benchGroup.position.set(0.0, 0.0, 1.0)
    benchGroup.name = 'station:browser-qa-matrix'
    benchGroup.userData = {
      type: 'station',
      id: 'browser-qa-matrix',
      name: 'Device Test Bench & Multi-Surface Matrix',
      roomId: 'BROWSER_QA_LAB',
      role: 'Playwright DOM Validation',
      status: 'Matrix Bench',
      description: 'Deterministic multi-viewport testing bench for real DOM inspection, responsive layout assertions, and browser visual testing.',
    }

    const screens: THREE.Mesh[] = []

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ARCHITECTURAL DESK STRUCTURE (Walnut Trim & Technical Steel Legs)
    // ──────────────────────────────────────────────────────────────────────────
    // Main technical work surface (3.6m x 1.05m x 0.06m)
    const topGeo = track(new THREE.BoxGeometry(3.6, 0.06, 1.05))
    const topMesh = new THREE.Mesh(topGeo, materials.structureGraphite)
    topMesh.position.set(0.0, 0.72, 0.0)
    topMesh.castShadow = true
    topMesh.receiveShadow = true
    benchGroup.add(topMesh)

    // Chamfered American walnut perimeter edge trim
    const trimGeo = track(new THREE.BoxGeometry(3.66, 0.04, 1.11))
    const trimMesh = new THREE.Mesh(trimGeo, materials.walnut)
    trimMesh.position.set(0.0, 0.70, 0.0)
    benchGroup.add(trimMesh)

    // Brushed champagne brass accent reveal line beneath desk surface
    const revealGeo = track(new THREE.BoxGeometry(3.64, 0.012, 1.09))
    const revealMesh = new THREE.Mesh(revealGeo, materials.champagneBrass)
    revealMesh.position.set(0.0, 0.675, 0.0)
    benchGroup.add(revealMesh)

    // Slender dual-leg trestle base in dark gunmetal steel
    const legGeo = track(new THREE.BoxGeometry(0.08, 0.66, 0.82))
    for (const lx of [-1.35, 1.35]) {
      const leg = new THREE.Mesh(legGeo, materials.gunmetal)
      leg.position.set(lx, 0.34, 0.0)
      leg.castShadow = true
      benchGroup.add(leg)

      // Floor leveling feet in champagne brass
      for (const fz of [-0.36, 0.36]) {
        const footGeo = track(new THREE.CylinderGeometry(0.022, 0.026, 0.02, 12))
        const foot = new THREE.Mesh(footGeo, materials.champagneBrass)
        foot.position.set(lx, 0.01, fz)
        benchGroup.add(foot)
      }
    }

    // Horizontal structural tie-bar connecting desk legs
    const tieGeo = track(new THREE.BoxGeometry(2.6, 0.04, 0.04))
    const tie = new THREE.Mesh(tieGeo, materials.gunmetal)
    tie.position.set(0.0, 0.22, 0.0)
    benchGroup.add(tie)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. CENTRAL HARDWARE MOUNTING ARMATURE (Satin Aluminum & Brass)
    // ──────────────────────────────────────────────────────────────────────────
    // Continuous heavy horizontal mounting rail mounted along the rear edge of the desk
    const railMastGeo = track(new THREE.CylinderGeometry(0.026, 0.030, 0.75, 12))
    for (const rx of [-1.2, 0.0, 1.2]) {
      const mast = new THREE.Mesh(railMastGeo, materials.laptopAluminum)
      mast.position.set(rx, 1.06, -0.38)
      benchGroup.add(mast)
    }

    const horizRailGeo = track(new THREE.BoxGeometry(3.4, 0.035, 0.06))
    const horizRail = new THREE.Mesh(horizRailGeo, materials.laptopAluminum)
    horizRail.position.set(0.0, 1.35, -0.38)
    benchGroup.add(horizRail)

    const brassAccentRailGeo = track(new THREE.BoxGeometry(3.42, 0.012, 0.07))
    const brassAccentRail = new THREE.Mesh(brassAccentRailGeo, materials.champagneBrass)
    brassAccentRail.position.set(0.0, 1.365, -0.38)
    benchGroup.add(brassAccentRail)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. DEVICE A: ULTRAWIDE DESKTOP MONITOR (Screen Left: X = -0.92m)
    // ──────────────────────────────────────────────────────────────────────────
    // 34-inch 21:9 curved aspect display (1.4m x 0.6m)
    const dtChassisGeo = track(new THREE.BoxGeometry(1.42, 0.62, 0.04))
    const dtChassis = new THREE.Mesh(dtChassisGeo, materials.gunmetal)
    dtChassis.position.set(-0.92, 1.28, -0.26)
    dtChassis.rotation.y = 0.08
    dtChassis.castShadow = true
    benchGroup.add(dtChassis)

    const dtBezelGeo = track(new THREE.BoxGeometry(1.44, 0.64, 0.008))
    const dtBezel = new THREE.Mesh(dtBezelGeo, materials.laptopAluminum)
    dtBezel.position.set(-0.92, 1.28, -0.278)
    dtBezel.rotation.y = 0.08
    benchGroup.add(dtBezel)

    // Dormant Desktop Display Screen (zero fake websites)
    const dtScreenGeo = track(new THREE.BoxGeometry(1.38, 0.58, 0.006))
    const dtScreen = new THREE.Mesh(dtScreenGeo, materials.deviceDesktop)
    dtScreen.position.set(-0.92, 1.28, -0.238)
    dtScreen.rotation.y = 0.08
    benchGroup.add(dtScreen)
    screens.push(dtScreen)

    // ──────────────────────────────────────────────────────────────────────────
    // 4. DEVICE B: REFERENCE LAPTOP (Center-Right: X = +0.32m)
    // ──────────────────────────────────────────────────────────────────────────
    // Precision angled aluminum cantilever laptop stand
    const standGeo = track(new THREE.BoxGeometry(0.36, 0.18, 0.32))
    const stand = new THREE.Mesh(standGeo, materials.laptopAluminum)
    stand.position.set(0.32, 0.81, -0.14)
    benchGroup.add(stand)

    // Laptop unibody base deck (0.76m x 0.018m x 0.50m)
    const ltBaseGeo = track(new THREE.BoxGeometry(0.76, 0.018, 0.50))
    const ltBase = new THREE.Mesh(ltBaseGeo, materials.laptopAluminum)
    ltBase.position.set(0.32, 0.91, -0.12)
    ltBase.rotation.x = 0.12
    benchGroup.add(ltBase)

    // Trackpad reveal on base deck
    const padGeo = track(new THREE.BoxGeometry(0.24, 0.004, 0.16))
    const pad = new THREE.Mesh(padGeo, materials.structureGraphite)
    pad.position.set(0.32, 0.932, 0.06)
    pad.rotation.x = 0.12
    benchGroup.add(pad)

    // Laptop lid & display screen (0.76m x 0.48m x 0.015m)
    const ltLidGeo = track(new THREE.BoxGeometry(0.76, 0.48, 0.015))
    const ltLid = new THREE.Mesh(ltLidGeo, materials.laptopAluminum)
    ltLid.position.set(0.32, 1.18, -0.36)
    ltLid.rotation.x = -0.16
    ltLid.castShadow = true
    benchGroup.add(ltLid)

    const ltScreenGeo = track(new THREE.BoxGeometry(0.72, 0.44, 0.006))
    const ltScreen = new THREE.Mesh(ltScreenGeo, materials.deviceLaptop)
    ltScreen.position.set(0.32, 1.18, -0.35)
    ltScreen.rotation.x = -0.16
    benchGroup.add(ltScreen)
    screens.push(ltScreen)

    // ──────────────────────────────────────────────────────────────────────────
    // 5. DEVICE C: REFERENCE TABLET (Right Side: X = +1.18m)
    // ──────────────────────────────────────────────────────────────────────────
    // Magnetic portrait dock in satin aluminum
    const tabDockGeo = track(new THREE.BoxGeometry(0.22, 0.08, 0.18))
    const tabDock = new THREE.Mesh(tabDockGeo, materials.laptopAluminum)
    tabDock.position.set(1.18, 0.78, -0.14)
    benchGroup.add(tabDock)

    // 11-inch Tablet in Portrait Orientation (0.42m wide x 0.58m high)
    const tabFrameGeo = track(new THREE.BoxGeometry(0.42, 0.58, 0.014))
    const tabFrame = new THREE.Mesh(tabFrameGeo, materials.gunmetal)
    tabFrame.position.set(1.18, 1.12, -0.18)
    tabFrame.rotation.x = -0.18
    tabFrame.castShadow = true
    benchGroup.add(tabFrame)

    const tabScreenGeo = track(new THREE.BoxGeometry(0.38, 0.54, 0.006))
    const tabScreen = new THREE.Mesh(tabScreenGeo, materials.deviceTablet)
    tabScreen.position.set(1.18, 1.12, -0.172)
    tabScreen.rotation.x = -0.18
    benchGroup.add(tabScreen)
    screens.push(tabScreen)

    // ──────────────────────────────────────────────────────────────────────────
    // 6. DEVICE D: REFERENCE SMARTPHONE (Foreground Right: X = +1.18m, Z = +0.18m)
    // ──────────────────────────────────────────────────────────────────────────
    // Angled charging dock
    const phDockGeo = track(new THREE.BoxGeometry(0.14, 0.05, 0.14))
    const phDock = new THREE.Mesh(phDockGeo, materials.champagneBrass)
    phDock.position.set(1.18, 0.75, 0.18)
    benchGroup.add(phDock)

    // 6.7-inch Mobile Phone in Portrait (0.20m wide x 0.40m high)
    const phFrameGeo = track(new THREE.BoxGeometry(0.20, 0.40, 0.012))
    const phFrame = new THREE.Mesh(phFrameGeo, materials.gunmetal)
    phFrame.position.set(1.18, 0.94, 0.15)
    phFrame.rotation.x = -0.32
    phFrame.castShadow = true
    benchGroup.add(phFrame)

    const phScreenGeo = track(new THREE.BoxGeometry(0.18, 0.38, 0.005))
    const phScreen = new THREE.Mesh(phScreenGeo, materials.devicePhone)
    phScreen.position.set(1.18, 0.94, 0.156)
    phScreen.rotation.x = -0.32
    benchGroup.add(phScreen)
    screens.push(phScreen)

    // ──────────────────────────────────────────────────────────────────────────
    // 7. DETERMINISTIC BROWSER QA STATUS INDICATOR
    // ──────────────────────────────────────────────────────────────────────────
    // Centered champagne brass indicator housing at front edge
    const indBezelGeo = track(new THREE.BoxGeometry(0.36, 0.02, 0.08))
    const indBezel = new THREE.Mesh(indBezelGeo, materials.champagneBrass)
    indBezel.position.set(0.0, 0.752, 0.46)
    benchGroup.add(indBezel)

    const indGeo = track(new THREE.BoxGeometry(0.30, 0.016, 0.05))
    const indicatorMesh = new THREE.Mesh(indGeo, materials.gunmetal)
    indicatorMesh.position.set(0.0, 0.764, 0.46)
    indicatorMesh.name = 'station-indicator:browser-qa-matrix'
    benchGroup.add(indicatorMesh)

    // ──────────────────────────────────────────────────────────────────────────
    // 8. ERGONOMIC QA TASK CHAIR (5-Star Rolling Caster Base)
    // ──────────────────────────────────────────────────────────────────────────
    const chairGroup = new THREE.Group()
    chairGroup.position.set(0.0, 0.0, -0.48)

    // 5-star rolling caster base in gunmetal
    const casterCenterGeo = track(new THREE.CylinderGeometry(0.04, 0.05, 0.06, 10))
    const casterCenter = new THREE.Mesh(casterCenterGeo, materials.gunmetal)
    casterCenter.position.set(0.0, 0.08, 0.0)
    chairGroup.add(casterCenter)

    const spokeGeo = track(new THREE.BoxGeometry(0.03, 0.025, 0.32))
    for (let s = 0; s < 5; s++) {
      const ang = (s * Math.PI * 2) / 5
      const spoke = new THREE.Mesh(spokeGeo, materials.gunmetal)
      spoke.rotation.y = ang
      spoke.position.set(Math.sin(ang) * 0.16, 0.08, Math.cos(ang) * 0.16)
      chairGroup.add(spoke)
    }

    // Gas lift cylinder in champagne brass
    const cylinderGeo = track(new THREE.CylinderGeometry(0.025, 0.028, 0.38, 12))
    const cylinder = new THREE.Mesh(cylinderGeo, materials.champagneBrass)
    cylinder.position.set(0.0, 0.28, 0.0)
    chairGroup.add(cylinder)

    // Contoured seat cushion in dark graphite mesh
    const seatGeo = track(new THREE.BoxGeometry(0.48, 0.07, 0.46))
    const seat = new THREE.Mesh(seatGeo, materials.chairMeshDark)
    seat.position.set(0.0, 0.48, 0.0)
    seat.castShadow = true
    chairGroup.add(seat)

    // Mesh backrest with ergonomic lumbar curve
    const backGeo = track(new THREE.BoxGeometry(0.44, 0.54, 0.04))
    const back = new THREE.Mesh(backGeo, materials.chairMeshDark)
    back.position.set(0.0, 0.76, 0.22)
    back.rotation.x = 0.08
    back.castShadow = true
    chairGroup.add(back)

    // Armrests
    const armGeo = track(new THREE.BoxGeometry(0.05, 0.18, 0.24))
    for (const ax of [-0.26, 0.26]) {
      const arm = new THREE.Mesh(armGeo, materials.gunmetal)
      arm.position.set(ax, 0.62, 0.04)
      chairGroup.add(arm)
    }

    benchGroup.add(chairGroup)

    return {
      benchGroup,
      indicatorMesh,
      screens,
    }
  }
}
