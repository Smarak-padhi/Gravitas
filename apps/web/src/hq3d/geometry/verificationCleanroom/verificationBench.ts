/**
 * Gravitas 3D Headquarters — Floor 3 Verification Cleanroom
 * Layer A: The Verification Bench (Hero Physical Apparatus — Wave 12K-R)
 *
 * Implements the specialized physical verification apparatus:
 * - Positioned at X = 0.0, Y = 10.8, Z = 1.0
 * - Recomposed around a four-stage physical quality pipeline:
 *   [CANDIDATE INTAKE] → [DETERMINISTIC INSPECTION] → [PHYSICAL EVIDENCE] → [VERDICT / OUTBOUND]
 * - Monolithic dark mineral basalt & precision cast graphite pedestals with chamfered profile
 * - Heavy limestone & composite slab work surface with beveled perimeter and recessed champagne brass edge reveal
 * - Stage 1: Candidate Intake Dock (sunken receiver hopper, brass registration datum pins, candidate cassette slot)
 * - Stage 2: Precision Inspection Deck (etched coordinate datum grid, micrometer vernier scale, twin articulated inspection monitors)
 * - Stage 3: Physical Evidence Rail (machined aluminum & brass cassette rail with 5 proof slots)
 * - Stage 4: Outbound Verdict / Handoff Dock (brass egress chute, roller guides, mechanical verdict stamp plinth)
 * - Restrained deterministic status hardware bezel at front centerline
 * - Architectural cleanroom perch stool with circular footring
 * - Purposeful cable conduits, umbilical spine, and grounded contact shadow detailing
 * - Zero fake test results: displays remain dormant dark glass when idle
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
      name: 'Verification Apparatus & Inspection Bench',
      roomId: 'VERIFICATION_LAB',
      role: 'Deterministic Verification Gate',
      status: 'Cleanroom Active',
      description: 'Physical verification apparatus enforcing candidate intake, deterministic inspection, evidence proofs, and outbound verdict handoff.',
    }

    const screens: THREE.Mesh[] = []

    // ──────────────────────────────────────────────────────────────────────────
    // 1. TRESTLE BASE & PEDESTAL CHASSIS (Cast Graphite & Basalt Composite)
    // ──────────────────────────────────────────────────────────────────────────
    // Ground contact shadow runner beneath pedestals
    const shadowPlinthGeo = track(new THREE.BoxGeometry(3.64, 0.008, 1.16))
    const shadowPlinth = new THREE.Mesh(shadowPlinthGeo, materials.limestoneDark)
    shadowPlinth.position.set(0.0, 0.004, 0.0)
    shadowPlinth.receiveShadow = true
    benchGroup.add(shadowPlinth)

    // Twin heavy sculpted pedestals in technical graphite with chamfered profile
    const pedestalGeo = track(new THREE.BoxGeometry(0.58, 0.84, 0.76))
    const pedLeft = new THREE.Mesh(pedestalGeo, materials.structureGraphite)
    pedLeft.position.set(-1.22, 0.42, 0.0)
    pedLeft.castShadow = true
    pedLeft.receiveShadow = true
    benchGroup.add(pedLeft)

    const pedRight = new THREE.Mesh(pedestalGeo, materials.structureGraphite)
    pedRight.position.set(1.22, 0.42, 0.0)
    pedRight.castShadow = true
    pedRight.receiveShadow = true
    benchGroup.add(pedRight)

    // Milled pedestal floor shoes with champagne brass leveling glides
    const shoeGeo = track(new THREE.BoxGeometry(0.66, 0.04, 0.84))
    for (const px of [-1.22, 1.22]) {
      const shoe = new THREE.Mesh(shoeGeo, materials.facadeCharcoal)
      shoe.position.set(px, 0.02, 0.0)
      benchGroup.add(shoe)

      for (const [gx, gz] of [[-0.26, -0.34], [0.26, -0.34], [-0.26, 0.34], [0.26, 0.34]]) {
        const glideGeo = track(new THREE.CylinderGeometry(0.022, 0.026, 0.02, 12))
        const glide = new THREE.Mesh(glideGeo, materials.champagneBrass)
        glide.position.set(px + gx, 0.01, gz)
        benchGroup.add(glide)
      }
    }

    // Brushed champagne brass horizontal structural stretcher beam connecting pedestals
    const stretcherGeo = track(new THREE.BoxGeometry(1.86, 0.05, 0.12))
    const stretcher = new THREE.Mesh(stretcherGeo, materials.champagneBrass)
    stretcher.position.set(0.0, 0.22, 0.0)
    benchGroup.add(stretcher)

    // Under-bench cable trunking raceway & umbilical spine
    const spineGeo = track(new THREE.BoxGeometry(2.4, 0.08, 0.22))
    const spine = new THREE.Mesh(spineGeo, materials.structureGraphite)
    spine.position.set(0.0, 0.78, 0.0)
    benchGroup.add(spine)

    // Secondary conduit cables running along stretcher beam
    const conduitGeo = track(new THREE.CylinderGeometry(0.012, 0.012, 2.3, 12))
    conduitGeo.rotateZ(Math.PI / 2)
    const conduit = new THREE.Mesh(conduitGeo, materials.gunmetal)
    conduit.position.set(0.0, 0.28, -0.06)
    benchGroup.add(conduit)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. MONOLITHIC BENCHTOP CHASSIS & PERIMETER BEVEL
    // ──────────────────────────────────────────────────────────────────────────
    // Main technical stone plinth work surface (3.6m x 1.1m x 0.08m)
    const topGeo = track(new THREE.BoxGeometry(3.6, 0.08, 1.1))
    const topMesh = new THREE.Mesh(topGeo, materials.limestonePlinth)
    topMesh.position.set(0.0, 0.88, 0.0)
    topMesh.castShadow = true
    topMesh.receiveShadow = true
    benchGroup.add(topMesh)

    // Inset champagne brass perimeter reveal channel (recessed edge shadow)
    const rimGeo = track(new THREE.BoxGeometry(3.66, 0.016, 1.16))
    const rimMesh = new THREE.Mesh(rimGeo, materials.champagneBrass)
    rimMesh.position.set(0.0, 0.832, 0.0)
    benchGroup.add(rimMesh)

    // Full-length satin aluminum datum runner along rear edge
    const rearRailGeo = track(new THREE.BoxGeometry(3.56, 0.024, 0.04))
    const rearRail = new THREE.Mesh(rearRailGeo, materials.laptopAluminum)
    rearRail.position.set(0.0, 0.932, -0.48)
    benchGroup.add(rearRail)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. PIPELINE STAGE 1: CANDIDATE INTAKE DOCK (Screen Left: X = -1.5m to -0.9m)
    // ──────────────────────────────────────────────────────────────────────────
    // Sunken candidate receipt bay with chamfered aluminum guides
    const intakeBayGeo = track(new THREE.BoxGeometry(0.68, 0.022, 0.62))
    const intakeBay = new THREE.Mesh(intakeBayGeo, materials.gunmetal)
    intakeBay.position.set(-1.26, 0.925, 0.02)
    benchGroup.add(intakeBay)

    // Candidate alignment chamfers & registration pins in champagne brass
    const guideGeo = track(new THREE.BoxGeometry(0.024, 0.032, 0.62))
    for (const gx of [-1.58, -0.94]) {
      const guide = new THREE.Mesh(guideGeo, materials.champagneBrass)
      guide.position.set(gx, 0.945, 0.02)
      benchGroup.add(guide)
    }

    // Precision candidate registration datum pins (4 corner registration pins)
    const pinGeo = track(new THREE.CylinderGeometry(0.008, 0.012, 0.025, 8))
    for (const [px, pz] of [[-1.52, -0.22], [-1.00, -0.22], [-1.52, 0.26], [-1.00, 0.26]]) {
      const pin = new THREE.Mesh(pinGeo, materials.champagneBrass)
      pin.position.set(px, 0.945, pz)
      benchGroup.add(pin)
    }

    // Candidate Code Custody Folio / Cassette Receiver Tray (vellum bed)
    const folioGeo = track(new THREE.BoxGeometry(0.44, 0.018, 0.34))
    const folio = new THREE.Mesh(folioGeo, materials.vellum)
    folio.position.set(-1.26, 0.940, 0.02)
    benchGroup.add(folio)

    // Intake telemetry conduit passing downward into bench pedestal
    const intakeConduitGeo = track(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 12))
    const intakeConduit = new THREE.Mesh(intakeConduitGeo, materials.laptopAluminum)
    intakeConduit.position.set(-1.26, 0.84, -0.32)
    benchGroup.add(intakeConduit)

    // ──────────────────────────────────────────────────────────────────────────
    // 4. PIPELINE STAGE 2: DETERMINISTIC PRECISION INSPECTION DECK (Center: X = -0.7m to +0.4m)
    // ──────────────────────────────────────────────────────────────────────────
    // Central sunken appraisal bed in dark technical basalt/obsidian composite
    const deckGeo = track(new THREE.BoxGeometry(1.48, 0.016, 0.72))
    const deckMesh = new THREE.Mesh(deckGeo, materials.structureGraphite)
    deckMesh.position.set(-0.15, 0.925, 0.02)
    benchGroup.add(deckMesh)

    // Laser-etched coordinate datum alignment rails framing the inspection surface
    for (const rz of [-0.32, 0.36]) {
      const railGeo = track(new THREE.BoxGeometry(1.52, 0.014, 0.025))
      const rail = new THREE.Mesh(railGeo, materials.laptopAluminum)
      rail.position.set(-0.15, 0.938, rz)
      benchGroup.add(rail)
    }

    // Etched coordinate datum marks (subtle brass registration points)
    for (const dx of [-0.65, -0.35, -0.05, 0.25, 0.50]) {
      const pipGeo = track(new THREE.BoxGeometry(0.012, 0.016, 0.06))
      const pip = new THREE.Mesh(pipGeo, materials.champagneBrass)
      pip.position.set(dx, 0.938, 0.02)
      benchGroup.add(pip)
    }

    // Vernier micrometer measurement scale line in satin aluminum
    const scaleLineGeo = track(new THREE.BoxGeometry(1.36, 0.004, 0.008))
    const scaleLine = new THREE.Mesh(scaleLineGeo, materials.laptopAluminum)
    scaleLine.position.set(-0.15, 0.936, 0.16)
    benchGroup.add(scaleLine)

    // Precision Optical Loupe & Inspection Lens Dock
    const loupeDockGeo = track(new THREE.CylinderGeometry(0.045, 0.055, 0.035, 16))
    const loupeDock = new THREE.Mesh(loupeDockGeo, materials.champagneBrass)
    loupeDock.position.set(0.48, 0.942, -0.16)
    benchGroup.add(loupeDock)

    const loupeRimGeo = track(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 16))
    const loupeRim = new THREE.Mesh(loupeRimGeo, materials.charReviewerAccent)
    loupeRim.position.set(0.48, 0.965, -0.16)
    benchGroup.add(loupeRim)

    // Mechanical Pass/Fail Verification Gate Plinth with dual-action toggle
    const plinthGeo = track(new THREE.BoxGeometry(0.12, 0.028, 0.08))
    const plinth = new THREE.Mesh(plinthGeo, materials.champagneBrass)
    plinth.position.set(0.48, 0.940, 0.14)
    benchGroup.add(plinth)

    const toggleGeo = track(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8))
    const toggle = new THREE.Mesh(toggleGeo, materials.structureGraphite)
    toggle.position.set(0.48, 0.965, 0.14)
    benchGroup.add(toggle)

    // Precision Stylus & Calibration Gauge Holder
    const penTrayGeo = track(new THREE.BoxGeometry(0.06, 0.015, 0.28))
    const penTray = new THREE.Mesh(penTrayGeo, materials.laptopAluminum)
    penTray.position.set(0.48, 0.935, -0.02)
    benchGroup.add(penTray)

    const stylusGeo = track(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 8))
    stylusGeo.rotateZ(Math.PI / 2)
    const stylus = new THREE.Mesh(stylusGeo, materials.champagneBrass)
    stylus.position.set(0.48, 0.945, -0.02)
    benchGroup.add(stylus)

    // ──────────────────────────────────────────────────────────────────────────
    // 5. TWIN ARTICULATED TECHNICAL INSPECTION MONITORS (Dormant when idle)
    // ──────────────────────────────────────────────────────────────────────────
    for (const [side, sx, rotY] of [[-1, -0.55, 0.14], [1, 0.25, -0.14]] as const) {
      // Articulated aluminum display armature mast rising from rear of bench
      const armMastGeo = track(new THREE.CylinderGeometry(0.024, 0.028, 0.44, 12))
      const armMast = new THREE.Mesh(armMastGeo, materials.laptopAluminum)
      armMast.position.set(sx, 1.12, -0.36)
      benchGroup.add(armMast)

      const armElbowGeo = track(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 12))
      const armElbow = new THREE.Mesh(armElbowGeo, materials.champagneBrass)
      armElbow.rotation.x = Math.PI / 2
      armElbow.position.set(sx, 1.32, -0.28)
      benchGroup.add(armElbow)

      // Monitor Chassis (0.84m x 0.50m x 0.035m)
      const monChassisGeo = track(new THREE.BoxGeometry(0.84, 0.50, 0.035))
      const monChassis = new THREE.Mesh(monChassisGeo, materials.gunmetal)
      monChassis.position.set(sx, 1.46, -0.22)
      monChassis.rotation.y = rotY
      monChassis.castShadow = true
      benchGroup.add(monChassis)

      // Aluminum perimeter bezel
      const bezelGeo = track(new THREE.BoxGeometry(0.86, 0.52, 0.01))
      const bezel = new THREE.Mesh(bezelGeo, materials.laptopAluminum)
      bezel.position.set(sx, 1.46, -0.238)
      bezel.rotation.y = rotY
      benchGroup.add(bezel)

      // Dormant Technical Inspection Glass Screen (zero fake data when idle, emissive = 0)
      const screenMat = side === 1 ? materials.terminalScreenEmerald : materials.terminalScreen
      const screenGeo = track(new THREE.BoxGeometry(0.80, 0.46, 0.008))
      const screen = new THREE.Mesh(screenGeo, screenMat)
      screen.position.set(sx, 1.46, -0.20)
      screen.rotation.y = rotY
      benchGroup.add(screen)
      screens.push(screen)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. PIPELINE STAGE 3: PHYSICAL EVIDENCE & CASSETTE RAIL (X = +0.70m to +1.05m)
    // ──────────────────────────────────────────────────────────────────────────
    // Machined satin aluminum & brass evidence cassette rail
    const evidenceRailBaseGeo = track(new THREE.BoxGeometry(0.32, 0.02, 0.62))
    const evidenceRailBase = new THREE.Mesh(evidenceRailBaseGeo, materials.laptopAluminum)
    evidenceRailBase.position.set(0.82, 0.928, 0.02)
    benchGroup.add(evidenceRailBase)

    // Five physical evidence retention slots [01..05]
    for (let i = 0; i < 5; i++) {
      const slotZ = -0.22 + i * 0.11
      const slotGeo = track(new THREE.BoxGeometry(0.26, 0.012, 0.03))
      const slot = new THREE.Mesh(slotGeo, materials.gunmetal)
      slot.position.set(0.82, 0.942, slotZ)
      benchGroup.add(slot)

      // Brass evidence slot marker clip
      const clipGeo = track(new THREE.BoxGeometry(0.04, 0.016, 0.012))
      const clip = new THREE.Mesh(clipGeo, materials.champagneBrass)
      clip.position.set(0.96, 0.946, slotZ)
      benchGroup.add(clip)
    }

    // Inset vellum evidence proof carrier bed
    const proofBedGeo = track(new THREE.BoxGeometry(0.24, 0.008, 0.18))
    const proofBed = new THREE.Mesh(proofBedGeo, materials.vellum)
    proofBed.position.set(0.82, 0.942, 0.22)
    benchGroup.add(proofBed)

    // ──────────────────────────────────────────────────────────────────────────
    // 7. PIPELINE STAGE 4: OUTBOUND VERDICT / HANDOFF DOCK (Screen Far Right: X = +1.1m to +1.55m)
    // ──────────────────────────────────────────────────────────────────────────
    // Outbound verdict release cradle in dark gunmetal
    const verdictCradleGeo = track(new THREE.BoxGeometry(0.56, 0.022, 0.62))
    const verdictCradle = new THREE.Mesh(verdictCradleGeo, materials.gunmetal)
    verdictCradle.position.set(1.32, 0.925, 0.02)
    benchGroup.add(verdictCradle)

    // Champagne brass egress retention lip & guide rails
    const verdictGuideGeo = track(new THREE.BoxGeometry(0.024, 0.032, 0.62))
    for (const vx of [1.06, 1.58]) {
      const vGuide = new THREE.Mesh(verdictGuideGeo, materials.champagneBrass)
      vGuide.position.set(vx, 0.945, 0.02)
      benchGroup.add(vGuide)
    }

    // Brass egress pass-through roller guides
    const rollerGeo = track(new THREE.CylinderGeometry(0.008, 0.008, 0.44, 8))
    rollerGeo.rotateZ(Math.PI / 2)
    for (const rz of [-0.18, 0.02, 0.22]) {
      const roller = new THREE.Mesh(rollerGeo, materials.champagneBrass)
      roller.position.set(1.32, 0.942, rz)
      benchGroup.add(roller)
    }

    // Mechanical Verdict Stamp Impression Anvil / Seal Plinth
    const sealPlinthGeo = track(new THREE.CylinderGeometry(0.048, 0.054, 0.035, 16))
    const sealPlinth = new THREE.Mesh(sealPlinthGeo, materials.champagneBrass)
    sealPlinth.position.set(1.32, 0.948, -0.24)
    benchGroup.add(sealPlinth)

    const sealHandleGeo = track(new THREE.CylinderGeometry(0.012, 0.018, 0.06, 12))
    const sealHandle = new THREE.Mesh(sealHandleGeo, materials.structureGraphite)
    sealHandle.position.set(1.32, 0.985, -0.24)
    benchGroup.add(sealHandle)

    // Egress signal conduit routing downward to floor verdict line
    const egressConduitGeo = track(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 12))
    const egressConduit = new THREE.Mesh(egressConduitGeo, materials.laptopAluminum)
    egressConduit.position.set(1.32, 0.84, -0.32)
    benchGroup.add(egressConduit)

    // ──────────────────────────────────────────────────────────────────────────
    // 8. DETERMINISTIC VERIFIER STATION STATUS HARDWARE
    // ──────────────────────────────────────────────────────────────────────────
    // Heavy milled brass status bezel centered at front edge of console
    const indBezelGeo = track(new THREE.BoxGeometry(0.42, 0.028, 0.09))
    const indBezel = new THREE.Mesh(indBezelGeo, materials.champagneBrass)
    indBezel.position.set(0.0, 0.932, 0.48)
    benchGroup.add(indBezel)

    // Authoritative Reactive Indicator Lens
    const indGeo = track(new THREE.BoxGeometry(0.34, 0.018, 0.05))
    const indicatorMesh = new THREE.Mesh(indGeo, materials.gunmetal)
    indicatorMesh.position.set(0.0, 0.948, 0.48)
    indicatorMesh.name = 'station-indicator:verifier-console'
    benchGroup.add(indicatorMesh)

    // ──────────────────────────────────────────────────────────────────────────
    // 9. ARCHITECTURAL CLEANROOM PERCH STOOL (Staged at Eastern Outbound Edge)
    // ──────────────────────────────────────────────────────────────────────────
    const stoolGroup = new THREE.Group()
    stoolGroup.position.set(1.15, 0.0, -0.38)

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

    // Contoured dark saddle seat cushion
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
