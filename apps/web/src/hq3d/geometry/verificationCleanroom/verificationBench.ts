/**
 * Gravitas 3D Headquarters — Floor 3 Verification Cleanroom
 * Layer A: Verification Bench & Evidence Inspection Console (Hero Object)
 *
 * Implements the precision verification console:
 * - Positioned at X = 0.0, Y = 10.8, Z = 1.0
 * - Monolithic pale mineral & composite chassis with satin aluminum & champagne brass reveals
 * - Inset central precision inspection surface with etched coordinate datum grid
 * - Left Dock: Candidate Intake with brass retention guides and commit hash datum marks
 * - Right Dock: Evidence & Ledger Dock with retention lip, optical inspection loupe plinth, and stylus dock
 * - Articulated twin technical inspection displays (dormant screens when idle, zero fake data)
 * - Deterministic status lens bezel housing reactive indicator
 * - Ergonomic cleanroom perch stool (sculpted saddle seat with brushed circular footring)
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'

export interface VerificationBenchBuildResult {
  readonly benchGroup: THREE.Group
  readonly indicatorMesh: THREE.Mesh
  readonly screens: THREE.Mesh[]
}

export class VerificationBench {
  public static buildBench(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): VerificationBenchBuildResult {
    const benchGroup = new THREE.Group()
    benchGroup.position.set(0.0, 0.0, 1.0)
    benchGroup.name = 'station:verifier-console'
    benchGroup.userData = {
      type: 'station',
      id: 'verifier-console',
      name: 'Verification Console & Inspection Bench',
      roomId: 'VERIFICATION_LAB',
      role: 'Independent Evidence Gate',
      status: 'Cleanroom Active',
      description: 'Independent verification terminal for deterministic test execution, mutation scope enforcement, and evidence ledger audit.',
    }

    const screens: THREE.Mesh[] = []

    // ──────────────────────────────────────────────────────────────────────────
    // 1. TRESTLE BASE & PEDESTAL SUPPORTS (Pale Mineral & Technical Graphite)
    // ──────────────────────────────────────────────────────────────────────────
    // Twin heavy sculpted pedestals in technical graphite with chamfered profile
    const pedestalGeo = track(new THREE.BoxGeometry(0.55, 0.86, 0.72))
    const pedLeft = new THREE.Mesh(pedestalGeo, materials.structureGraphite)
    pedLeft.position.set(-1.15, 0.43, 0.0)
    pedLeft.castShadow = true
    pedLeft.receiveShadow = true
    benchGroup.add(pedLeft)

    const pedRight = new THREE.Mesh(pedestalGeo, materials.structureGraphite)
    pedRight.position.set(1.15, 0.43, 0.0)
    pedRight.castShadow = true
    pedRight.receiveShadow = true
    benchGroup.add(pedRight)

    // Brushed champagne brass horizontal structural stretcher beam connecting pedestals
    const stretcherGeo = track(new THREE.BoxGeometry(1.8, 0.05, 0.12))
    const stretcher = new THREE.Mesh(stretcherGeo, materials.champagneBrass)
    stretcher.position.set(0.0, 0.22, 0.0)
    benchGroup.add(stretcher)

    // Pedestal floor plinth shoes with brass leveling glides
    const shoeGeo = track(new THREE.BoxGeometry(0.62, 0.04, 0.78))
    for (const px of [-1.15, 1.15]) {
      const shoe = new THREE.Mesh(shoeGeo, materials.facadeCharcoal)
      shoe.position.set(px, 0.02, 0.0)
      benchGroup.add(shoe)

      for (const [gx, gz] of [[-0.24, -0.32], [0.24, -0.32], [-0.24, 0.32], [0.24, 0.32]]) {
        const glideGeo = track(new THREE.CylinderGeometry(0.02, 0.025, 0.02, 12))
        const glide = new THREE.Mesh(glideGeo, materials.champagneBrass)
        glide.position.set(px + gx, 0.01, gz)
        benchGroup.add(glide)
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. MONOLITHIC INSPECTION CONSOLE TABLETOP
    // ──────────────────────────────────────────────────────────────────────────
    // Main technical stone plinth work surface (3.4m x 1.0m x 0.08m)
    const topGeo = track(new THREE.BoxGeometry(3.4, 0.08, 1.0))
    const topMesh = new THREE.Mesh(topGeo, materials.limestonePlinth)
    topMesh.position.set(0.0, 0.90, 0.0)
    topMesh.castShadow = true
    topMesh.receiveShadow = true
    benchGroup.add(topMesh)

    // Inset champagne brass perimeter reveal channel (recessed edge shadow)
    const rimGeo = track(new THREE.BoxGeometry(3.46, 0.016, 1.06))
    const rimMesh = new THREE.Mesh(rimGeo, materials.champagneBrass)
    rimMesh.position.set(0.0, 0.852, 0.0)
    benchGroup.add(rimMesh)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. INSET INSPECTION SURFACE & TACTICAL DATUM DECK
    // ──────────────────────────────────────────────────────────────────────────
    // Central sunken appraisal bed in dark technical composite (1.8m x 0.65m)
    const deckGeo = track(new THREE.BoxGeometry(1.8, 0.012, 0.65))
    const deckMesh = new THREE.Mesh(deckGeo, materials.structureGraphite)
    deckMesh.position.set(0.0, 0.942, 0.04)
    benchGroup.add(deckMesh)

    // Satin aluminum datum alignment rails framing the inspection surface
    for (const rz of [-0.28, 0.36]) {
      const railGeo = track(new THREE.BoxGeometry(1.84, 0.014, 0.025))
      const rail = new THREE.Mesh(railGeo, materials.laptopAluminum)
      rail.position.set(0.0, 0.948, rz)
      benchGroup.add(rail)
    }

    // Etched coordinate datum marks (subtle brass registration points)
    for (const dx of [-0.6, -0.2, 0.2, 0.6]) {
      const pipGeo = track(new THREE.BoxGeometry(0.015, 0.016, 0.06))
      const pip = new THREE.Mesh(pipGeo, materials.champagneBrass)
      pip.position.set(dx, 0.949, 0.04)
      benchGroup.add(pip)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. CANDIDATE INTAKE DOCK (LEFT SIDE: X = -1.25m)
    // ──────────────────────────────────────────────────────────────────────────
    // Sunken candidate receipt bay where incoming candidates are inspected
    const intakeBayGeo = track(new THREE.BoxGeometry(0.68, 0.016, 0.52))
    const intakeBay = new THREE.Mesh(intakeBayGeo, materials.gunmetal)
    intakeBay.position.set(-1.25, 0.942, 0.04)
    benchGroup.add(intakeBay)

    // Brass alignment guide rails
    const guideLGeo = track(new THREE.BoxGeometry(0.02, 0.025, 0.54))
    const guideL = new THREE.Mesh(guideLGeo, materials.champagneBrass)
    guideL.position.set(-1.58, 0.952, 0.04)
    benchGroup.add(guideL)

    // Candidate artifact custody folio (dormant technical dossier tray)
    const folioGeo = track(new THREE.BoxGeometry(0.42, 0.02, 0.32))
    const folio = new THREE.Mesh(folioGeo, materials.vellum)
    folio.position.set(-1.24, 0.954, 0.04)
    benchGroup.add(folio)

    // ──────────────────────────────────────────────────────────────────────────
    // 5. EVIDENCE & VERDICT DOCK (RIGHT SIDE: X = +1.25m)
    // ──────────────────────────────────────────────────────────────────────────
    // Verification ledger dock where audit proofs and verdicts accumulate
    const verdictBayGeo = track(new THREE.BoxGeometry(0.68, 0.016, 0.52))
    const verdictBay = new THREE.Mesh(verdictBayGeo, materials.gunmetal)
    verdictBay.position.set(1.25, 0.942, 0.04)
    benchGroup.add(verdictBay)

    const guideR = new THREE.Mesh(guideLGeo, materials.champagneBrass)
    guideR.position.set(1.58, 0.952, 0.04)
    benchGroup.add(guideR)

    // Precision Optical Loupe & Appraisal Lens Dock
    const loupeDockGeo = track(new THREE.CylinderGeometry(0.045, 0.055, 0.035, 16))
    const loupeDock = new THREE.Mesh(loupeDockGeo, materials.champagneBrass)
    loupeDock.position.set(1.15, 0.962, -0.12)
    benchGroup.add(loupeDock)

    const loupeRimGeo = track(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 16))
    const loupeRim = new THREE.Mesh(loupeRimGeo, materials.charReviewerAccent)
    loupeRim.position.set(1.15, 0.985, -0.12)
    benchGroup.add(loupeRim)

    // Stylus / Calibration Gauge Holder
    const penTrayGeo = track(new THREE.BoxGeometry(0.06, 0.015, 0.28))
    const penTray = new THREE.Mesh(penTrayGeo, materials.laptopAluminum)
    penTray.position.set(1.42, 0.952, 0.08)
    benchGroup.add(penTray)

    // ──────────────────────────────────────────────────────────────────────────
    // 6. TWIN ARTICULATED TECHNICAL INSPECTION MONITORS
    // ──────────────────────────────────────────────────────────────────────────
    // Articulated aluminum display armature masts rising from rear of bench
    for (const [side, sx, rotY] of [[-1, -0.68, 0.16], [1, 0.68, -0.16]] as const) {
      const armMastGeo = track(new THREE.CylinderGeometry(0.022, 0.026, 0.44, 12))
      const armMast = new THREE.Mesh(armMastGeo, materials.laptopAluminum)
      armMast.position.set(sx, 1.14, -0.32)
      benchGroup.add(armMast)

      const armElbowGeo = track(new THREE.CylinderGeometry(0.016, 0.016, 0.18, 12))
      const armElbow = new THREE.Mesh(armElbowGeo, materials.champagneBrass)
      armElbow.rotation.x = Math.PI / 2
      armElbow.position.set(sx, 1.34, -0.24)
      benchGroup.add(armElbow)

      // Monitor Chassis (0.92m x 0.54m x 0.035m)
      const monChassisGeo = track(new THREE.BoxGeometry(0.92, 0.54, 0.035))
      const monChassis = new THREE.Mesh(monChassisGeo, materials.gunmetal)
      monChassis.position.set(sx, 1.48, -0.18)
      monChassis.rotation.y = rotY
      monChassis.castShadow = true
      benchGroup.add(monChassis)

      // Aluminum perimeter bezel
      const bezelGeo = track(new THREE.BoxGeometry(0.94, 0.56, 0.01))
      const bezel = new THREE.Mesh(bezelGeo, materials.laptopAluminum)
      bezel.position.set(sx, 1.48, -0.198)
      bezel.rotation.y = rotY
      benchGroup.add(bezel)

      // Dormant Technical Inspection Glass Screen (zero fake data when idle)
      const screenMat = side === 1 ? materials.terminalScreenEmerald : materials.terminalScreen
      const screenGeo = track(new THREE.BoxGeometry(0.88, 0.50, 0.008))
      const screen = new THREE.Mesh(screenGeo, screenMat)
      screen.position.set(sx, 1.48, -0.16)
      screen.rotation.y = rotY
      benchGroup.add(screen)
      screens.push(screen)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. DETERMINISTIC VERIFIER STATION STATUS LENS
    // ──────────────────────────────────────────────────────────────────────────
    // Housing bezel in champagne brass centered at front edge of console
    const indBezelGeo = track(new THREE.BoxGeometry(0.38, 0.024, 0.09))
    const indBezel = new THREE.Mesh(indBezelGeo, materials.champagneBrass)
    indBezel.position.set(0.0, 0.948, 0.44)
    benchGroup.add(indBezel)

    const indGeo = track(new THREE.BoxGeometry(0.32, 0.016, 0.05))
    const indicatorMesh = new THREE.Mesh(indGeo, materials.gunmetal)
    indicatorMesh.position.set(0.0, 0.962, 0.44)
    indicatorMesh.name = 'station-indicator:verifier-console'
    benchGroup.add(indicatorMesh)

    // ──────────────────────────────────────────────────────────────────────────
    // 8. ERGONOMIC CLEANROOM PERCH STOOL
    // ──────────────────────────────────────────────────────────────────────────
    const stoolGroup = new THREE.Group()
    stoolGroup.position.set(0.0, 0.0, -0.45)

    // Base pedestal & footring
    const stoolBaseGeo = track(new THREE.CylinderGeometry(0.04, 0.22, 0.04, 16))
    const stoolBase = new THREE.Mesh(stoolBaseGeo, materials.structureGraphite)
    stoolBase.position.set(0.0, 0.02, 0.0)
    stoolGroup.add(stoolBase)

    const stoolMastGeo = track(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 12))
    const stoolMast = new THREE.Mesh(stoolMastGeo, materials.laptopAluminum)
    stoolMast.position.set(0.0, 0.33, 0.0)
    stoolGroup.add(stoolMast)

    // Circular footring in champagne brass
    const footringGeo = track(new THREE.TorusGeometry(0.18, 0.014, 8, 24))
    footringGeo.rotateX(Math.PI / 2)
    const footring = new THREE.Mesh(footringGeo, materials.champagneBrass)
    footring.position.set(0.0, 0.22, 0.0)
    stoolGroup.add(footring)

    // Contoured graphite saddle seat cushion
    const seatGeo = track(new THREE.BoxGeometry(0.42, 0.08, 0.36))
    const seat = new THREE.Mesh(seatGeo, materials.charSuitDark)
    seat.position.set(0.0, 0.66, 0.0)
    seat.castShadow = true
    stoolGroup.add(seat)

    benchGroup.add(stoolGroup)

    return {
      benchGroup,
      indicatorMesh,
      screens,
    }
  }
}
