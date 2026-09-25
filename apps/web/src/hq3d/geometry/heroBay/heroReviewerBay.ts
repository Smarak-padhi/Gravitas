/**
 * Gravitas 3D Headquarters — Wave 12H-R3C Hero Reviewer Workstation Bay
 *
 * Authored high-fidelity 3D workspace for the Independent Reviewer role on Floor 2:
 * - Positioned at Screen Center Forward: X = 0.0, Z = -0.1, Y = 7.2m
 * - Visual form language: Independent verification station, evidence review, controlled quality gate
 * - Structural base: Precision walnut & graphite architectural trestle base with champagne brass stretcher beam
 *   and cantilevered stabilizing outriggers with milled brass leveling glides
 * - Verification console surface: Solid beveled American walnut desktop with full perimeter champagne brass reveal
 * - Dual-zoned inspection organization:
 *   - Working Side: sunken precision anodized graphite appraisal tray with brass tool dividers,
 *     stylus dock, dual-action pass/fail gate plinth, and angled inspection terminal tablet (dormant when idle)
 *   - Evidence Appraisal Side: angled vellum evidence reading desk with brass document retention lip
 *     where incoming T-142 dossier packets are reviewed, plus precision brass optical loupe dock
 * - Architectural verification drafting stool / perch: round upholstered saddle seat with circular footring
 * - Inlaid floor marker framing the verification boundary
 * - Optimized geometry using instanced repeated hardware
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'

export interface HeroReviewerBayBuildResult {
  readonly podGroup: THREE.Group
  readonly indicatorMesh: THREE.Mesh
  readonly screens: THREE.Mesh[]
  readonly inspectionTabletMesh: THREE.Mesh
}

export class HeroReviewerBay {
  /**
   * Helper to create a 2D rounded rectangle shape for beveled extrusion
   */
  public static createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
    const shape = new THREE.Shape()
    const x = -width / 2
    const y = -height / 2
    shape.moveTo(x + radius, y)
    shape.lineTo(x + width - radius, y)
    shape.quadraticCurveTo(x + width, y, x + width, y + radius)
    shape.lineTo(x + width, y + height - radius)
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    shape.lineTo(x + radius, y + height)
    shape.quadraticCurveTo(x, y + height, x, y + height - radius)
    shape.lineTo(x, y + radius)
    shape.quadraticCurveTo(x, y, x + radius, y)
    return shape
  }

  /**
   * Builds the complete Hero Reviewer Verification Console assembly
   */
  public static buildBay(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): HeroReviewerBayBuildResult {
    const podGroup = new THREE.Group()
    podGroup.position.set(0.0, 7.2, -0.1)
    podGroup.name = 'station:reviewer-workstation'
    podGroup.userData = {
      type: 'station',
      id: 'reviewer-workstation',
      name: 'Independent Reviewer Verification Station (Hero Quality Gate)',
    }

    const screens: THREE.Mesh[] = []

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ARCHITECTURAL FLOOR BOUNDARY INLAY
    // ──────────────────────────────────────────────────────────────────────────
    // Inlaid White Oak & Champagne Brass inspection zone border (2.4m x 1.6m)
    const floorMarkerGeo = track(new THREE.BoxGeometry(2.4, 0.006, 1.6))
    const floorMarker = new THREE.Mesh(floorMarkerGeo, materials.heroDeskWood)
    floorMarker.position.set(0.0, 0.003, 0.0)
    floorMarker.receiveShadow = true
    podGroup.add(floorMarker)

    const floorTrimGeo = track(new THREE.BoxGeometry(2.44, 0.008, 1.64))
    const floorTrim = new THREE.Mesh(floorTrimGeo, materials.champagneBrass)
    floorTrim.position.set(0.0, 0.004, 0.0)
    podGroup.add(floorTrim)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. PRECISION VERIFICATION CONSOLE (Architectural Trestle Structure)
    // ──────────────────────────────────────────────────────────────────────────
    const consoleGroup = new THREE.Group()
    consoleGroup.position.set(0.0, 0.0, 0.0)

    // 2.1 Heavy Sculpted Trestle Pedestals (Left & Right)
    const mastGeo = track(new THREE.BoxGeometry(0.08, 0.82, 0.24))
    const faceGeo = track(new THREE.BoxGeometry(0.084, 0.76, 0.03))
    const footGeo = track(new THREE.BoxGeometry(0.12, 0.04, 0.58))
    const glideGeo = track(new THREE.CylinderGeometry(0.022, 0.026, 0.018, 12))

    for (const side of [-1, 1]) {
      const legX = side * 0.72

      // Vertical graphite mast
      const mast = new THREE.Mesh(mastGeo, materials.structureGraphite)
      mast.position.set(legX, 0.43, 0.0)
      mast.receiveShadow = true
      consoleGroup.add(mast)

      // Solid walnut decorative face cladding
      const faceF = new THREE.Mesh(faceGeo, materials.walnut)
      faceF.position.set(legX, 0.43, 0.12)
      consoleGroup.add(faceF)

      const faceB = new THREE.Mesh(faceGeo, materials.walnut)
      faceB.position.set(legX, 0.43, -0.12)
      consoleGroup.add(faceB)

      // Cantilevered graphite outrigger foot (0.58m long)
      const foot = new THREE.Mesh(footGeo, materials.structureGraphite)
      foot.position.set(legX, 0.02, 0.0)
      foot.receiveShadow = true
      consoleGroup.add(foot)

      // Milled champagne brass leveling glides (front and back)
      for (const fz of [-0.25, 0.25]) {
        const glide = new THREE.Mesh(glideGeo, materials.champagneBrass)
        glide.position.set(legX, 0.009, fz)
        consoleGroup.add(glide)
      }
    }

    // 2.2 Structural Champagne Brass Stretcher Beam & Footrest Rail
    const stretcherGeo = track(new THREE.BoxGeometry(1.44, 0.036, 0.036))
    const stretcher = new THREE.Mesh(stretcherGeo, materials.champagneBrass)
    stretcher.position.set(0.0, 0.22, 0.0)
    consoleGroup.add(stretcher)

    // Integrated under-desk cable spine & equipment channel
    const conduitGeo = track(new THREE.BoxGeometry(1.36, 0.045, 0.08))
    const conduit = new THREE.Mesh(conduitGeo, materials.structureGraphite)
    conduit.position.set(0.0, 0.81, 0.0)
    consoleGroup.add(conduit)

    // 2.3 Verification Console Tabletop (American Walnut Core + Brass Reveal)
    const topShape = this.createRoundedRectShape(1.8, 0.78, 0.04)
    const topGeo = track(
      new THREE.ExtrudeGeometry(topShape, {
        depth: 0.036,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.008,
        bevelThickness: 0.008,
        curveSegments: 16,
      })
    )
    topGeo.rotateX(Math.PI / 2)
    const deskTop = new THREE.Mesh(topGeo, materials.walnut)
    deskTop.position.set(0.0, 0.865, 0.0)
    deskTop.castShadow = true
    deskTop.receiveShadow = true
    consoleGroup.add(deskTop)

    // Full perimeter champagne brass edge reveal trim
    const rimShape = this.createRoundedRectShape(1.82, 0.80, 0.044)
    const rimGeo = track(
      new THREE.ExtrudeGeometry(rimShape, {
        depth: 0.012,
        bevelEnabled: false,
        curveSegments: 16,
      })
    )
    rimShape.holes.push(this.createRoundedRectShape(1.78, 0.76, 0.036))
    const edgeTrim = new THREE.Mesh(rimGeo, materials.champagneBrass)
    edgeTrim.rotateX(Math.PI / 2)
    edgeTrim.position.set(0.0, 0.868, 0.0)
    consoleGroup.add(edgeTrim)

    // Flush-mounted Authoritative Station Status Indicator Lens (along front center edge)
    const indGeo = track(new THREE.BoxGeometry(0.24, 0.014, 0.04))
    const ind = new THREE.Mesh(indGeo, materials.gunmetal)
    ind.position.set(0.0, 0.875, 0.38)
    ind.name = 'station-indicator:reviewer-workstation'
    consoleGroup.add(ind)

    // Turned champagne brass cable pass-through grommet
    const grommetGeo = track(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 16))
    const grommet = new THREE.Mesh(grommetGeo, materials.champagneBrass)
    grommet.position.set(0.58, 0.872, -0.25)
    consoleGroup.add(grommet)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. DUAL-ZONED VERIFICATION SURFACES & PRECISION TOOLS
    // ──────────────────────────────────────────────────────────────────────────

    // 3.1 Inbound Evidence Reading Desk / Appraisal Surface (North Facing)
    // Angled evidence appraisal surface where T-142 dossier rests during review
    const evidencePlinthGeo = track(new THREE.BoxGeometry(0.54, 0.018, 0.38))
    const evidencePlinth = new THREE.Mesh(evidencePlinthGeo, materials.vellum)
    evidencePlinth.position.set(0.0, 0.885, -0.12)
    evidencePlinth.rotation.x = -0.16 // Angled slightly towards the reviewer
    consoleGroup.add(evidencePlinth)

    // Brass document retention lip
    const lipGeo = track(new THREE.BoxGeometry(0.54, 0.012, 0.016))
    const lip = new THREE.Mesh(lipGeo, materials.champagneBrass)
    lip.position.set(0.0, 0.875, 0.065)
    consoleGroup.add(lip)

    // Micro optical inspection loupe & magnetic brass dock
    const loupeDockGeo = track(new THREE.CylinderGeometry(0.045, 0.05, 0.018, 16))
    const loupeDock = new THREE.Mesh(loupeDockGeo, materials.champagneBrass)
    loupeDock.position.set(-0.58, 0.88, -0.10)
    consoleGroup.add(loupeDock)

    const loupeRimGeo = track(new THREE.TorusGeometry(0.036, 0.007, 8, 20))
    const loupeRim = new THREE.Mesh(loupeRimGeo, materials.champagneBrass)
    loupeRim.position.set(-0.58, 0.91, -0.10)
    loupeRim.rotation.x = Math.PI / 2
    consoleGroup.add(loupeRim)

    // 3.2 Working Side Primary Inspection Tablet (South Facing)
    // Dedicated verification slate housing (angled towards seated reviewer)
    const tabletHousingGeo = track(new THREE.BoxGeometry(0.48, 0.016, 0.32))
    const tabletHousing = new THREE.Mesh(tabletHousingGeo, materials.gunmetal)
    tabletHousing.position.set(0.0, 0.882, 0.18)
    tabletHousing.rotation.x = -0.22 // Ergonomically angled
    consoleGroup.add(tabletHousing)

    // Screen plane: Strictly dormant (emissive = 0.0) when idle
    const tabletScreenGeo = track(new THREE.BoxGeometry(0.44, 0.004, 0.28))
    const tabletScreen = new THREE.Mesh(tabletScreenGeo, materials.terminalScreenAmber)
    tabletScreen.position.set(0.0, 0.891, 0.18)
    tabletScreen.rotation.x = -0.22
    tabletScreen.name = 'screen:reviewer-workstation:tablet'
    consoleGroup.add(tabletScreen)
    screens.push(tabletScreen)

    // 3.3 Sunken Precision Verification Tool Tray (Right Side)
    const trayGeo = track(new THREE.BoxGeometry(0.24, 0.014, 0.34))
    const tray = new THREE.Mesh(trayGeo, materials.gunmetal)
    tray.position.set(0.56, 0.875, 0.14)
    consoleGroup.add(tray)

    const trayLiningGeo = track(new THREE.BoxGeometry(0.22, 0.006, 0.32))
    const trayLining = new THREE.Mesh(trayLiningGeo, materials.heroAcousticFelt)
    trayLining.position.set(0.56, 0.882, 0.14)
    consoleGroup.add(trayLining)

    // Precision verification stylus & caliper
    const stylusGeo = track(new THREE.CylinderGeometry(0.005, 0.005, 0.18, 8))
    stylusGeo.rotateZ(Math.PI / 2)
    const stylus = new THREE.Mesh(stylusGeo, materials.champagneBrass)
    stylus.position.set(0.52, 0.888, 0.14)
    consoleGroup.add(stylus)

    // Mechanical verification checklist / gate stamp plinth
    const plinthGeo = track(new THREE.BoxGeometry(0.06, 0.024, 0.08))
    const plinth = new THREE.Mesh(plinthGeo, materials.champagneBrass)
    plinth.position.set(0.62, 0.892, 0.22)
    consoleGroup.add(plinth)

    const toggleGeo = track(new THREE.CylinderGeometry(0.008, 0.008, 0.025, 8))
    const toggle = new THREE.Mesh(toggleGeo, materials.structureGraphite)
    toggle.position.set(0.62, 0.91, 0.22)
    consoleGroup.add(toggle)

    // ──────────────────────────────────────────────────────────────────────────
    // 4. ARCHITECTURAL VERIFICATION PERCH STOOL
    // ──────────────────────────────────────────────────────────────────────────
    const stoolGroup = new THREE.Group()
    stoolGroup.position.set(0.0, 0.0, 0.62)

    // Round upholstered saddle seat cushion (Y = 0.58m)
    const stoolSeatGeo = track(new THREE.CylinderGeometry(0.22, 0.20, 0.07, 24))
    const stoolSeat = new THREE.Mesh(stoolSeatGeo, materials.charSuitDark)
    stoolSeat.position.set(0.0, 0.58, 0.0)
    stoolSeat.castShadow = true
    stoolSeat.receiveShadow = true
    stoolGroup.add(stoolSeat)

    // Brass under-seat mounting plate
    const stoolPlateGeo = track(new THREE.CylinderGeometry(0.18, 0.18, 0.016, 16))
    const stoolPlate = new THREE.Mesh(stoolPlateGeo, materials.champagneBrass)
    stoolPlate.position.set(0.0, 0.54, 0.0)
    stoolGroup.add(stoolPlate)

    // Central pneumatic height adjustment column
    const stoolColumnGeo = track(new THREE.CylinderGeometry(0.022, 0.028, 0.52, 16))
    const stoolColumn = new THREE.Mesh(stoolColumnGeo, materials.champagneBrass)
    stoolColumn.position.set(0.0, 0.28, 0.0)
    stoolGroup.add(stoolColumn)

    // Circular footrest ring at Y = 0.24m
    const footRingGeo = track(new THREE.TorusGeometry(0.18, 0.01, 8, 24))
    const footRing = new THREE.Mesh(footRingGeo, materials.champagneBrass)
    footRing.position.set(0.0, 0.24, 0.0)
    footRing.rotation.x = Math.PI / 2
    stoolGroup.add(footRing)

    // 4 Splayed architectural legs with graphite glides
    const legGeo = track(new THREE.CylinderGeometry(0.012, 0.014, 0.32, 8))
    const stoolGlideGeo = track(new THREE.CylinderGeometry(0.018, 0.022, 0.014, 8))
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4
      const leg = new THREE.Mesh(legGeo, materials.structureGraphite)
      const legRadius = 0.14
      leg.position.set(Math.cos(angle) * legRadius, 0.15, Math.sin(angle) * legRadius)
      leg.rotation.z = Math.cos(angle) * 0.14
      leg.rotation.x = -Math.sin(angle) * 0.14
      stoolGroup.add(leg)

      const glide = new THREE.Mesh(stoolGlideGeo, materials.champagneBrass)
      glide.position.set(Math.cos(angle) * (legRadius + 0.04), 0.007, Math.sin(angle) * (legRadius + 0.04))
      stoolGroup.add(glide)
    }

    consoleGroup.add(stoolGroup)
    podGroup.add(consoleGroup)

    return {
      podGroup,
      indicatorMesh: ind,
      screens,
      inspectionTabletMesh: tabletScreen,
    }
  }
}
