/**
 * Architectural Geometry Generator for Gravitas 3D Headquarters
 * Constructs an architectural cutaway model:
 * - Mineral stone slab with recessed brass conduit channels
 * - Raised cleanroom platform with frameless acoustic glass & brass channels
 * - Cantilevered Approval Mezzanine gallery with glass balustrades & floating steps
 * - Overhead architectural light bridges & structural frames
 * - Built-in low walnut credenzas and server niche architecture
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../materials/materials.js'

export class HqArchitecture {
  public readonly group: THREE.Group
  private readonly geometriesToDispose: THREE.BufferGeometry[] = []

  constructor(materials: MaterialLibrary) {
    this.group = new THREE.Group()
    this.group.name = 'hq-architecture'

    this.buildGroundSlab(materials)
    this.buildConduitsAndLevelChanges(materials)
    this.buildCleanroomEnclosure(materials)
    this.buildMezzanineGallery(materials)
    this.buildOverheadFrames(materials)
    this.buildBuiltInCabinetry(materials)
  }

  private track<T extends THREE.BufferGeometry>(geom: T): T {
    this.geometriesToDispose.push(geom)
    return geom
  }

  /**
   * Main Ground Operations Floor (Tighter 26m x 20m footprint, eliminating empty void)
   */
  private buildGroundSlab(materials: MaterialLibrary): void {
    // Primary mineral stone floor slab
    const floorGeo = this.track(new THREE.BoxGeometry(26.0, 0.4, 20.0))
    const floorMesh = new THREE.Mesh(floorGeo, materials.limestone)
    floorMesh.position.set(0.0, -0.2, 0.5)
    floorMesh.receiveShadow = true
    floorMesh.name = 'ground-floor-slab'
    this.group.add(floorMesh)

    // Darker perimeter architectural plinth curb
    const curbGeo = this.track(new THREE.BoxGeometry(26.6, 0.25, 20.6))
    const curbMesh = new THREE.Mesh(curbGeo, materials.limestoneDark)
    curbMesh.position.set(0.0, -0.25, 0.5)
    curbMesh.receiveShadow = true
    this.group.add(curbMesh)

    // Sub-base foundation rim
    const baseGeo = this.track(new THREE.BoxGeometry(27.0, 0.2, 21.0))
    const baseMesh = new THREE.Mesh(baseGeo, materials.gunmetal)
    baseMesh.position.set(0.0, -0.4, 0.5)
    this.group.add(baseMesh)
  }

  /**
   * Level Changes & Recessed Optical Conduits
   */
  private buildConduitsAndLevelChanges(materials: MaterialLibrary): void {
    // Raised Cleanroom Platform (Zone C & D: X: +0.5 to +11.5, Z: -2.0 to +8.5, Y = +0.1m)
    const cleanroomPlatGeo = this.track(new THREE.BoxGeometry(11.2, 0.1, 11.2))
    const cleanroomPlat = new THREE.Mesh(cleanroomPlatGeo, materials.limestonePlinth)
    cleanroomPlat.position.set(6.2, 0.05, 3.2)
    cleanroomPlat.receiveShadow = true
    this.group.add(cleanroomPlat)

    // Brass edge transition trim around cleanroom platform
    const trimGeo = this.track(new THREE.BoxGeometry(0.06, 0.12, 11.2))
    const trimWest = new THREE.Mesh(trimGeo, materials.brass)
    trimWest.position.set(0.57, 0.06, 3.2)
    this.group.add(trimWest)

    // Recessed Optical Conduits embedded in ground floor
    // Main spine running North-South
    const spineGeo = this.track(new THREE.BoxGeometry(0.16, 0.02, 16.0))
    const spine = new THREE.Mesh(spineGeo, materials.brass)
    spine.position.set(0.3, 0.01, 0.0)
    this.group.add(spine)

    // Branch to Mission Control
    const branchMcGeo = this.track(new THREE.BoxGeometry(5.5, 0.02, 0.16))
    const branchMc = new THREE.Mesh(branchMcGeo, materials.brass)
    branchMc.position.set(-2.5, 0.01, 5.5)
    this.group.add(branchMc)

    // Branch to Agent Operations Workstations
    const branchOpsGeo = this.track(new THREE.BoxGeometry(7.0, 0.02, 0.16))
    const branchOps = new THREE.Mesh(branchOpsGeo, materials.brass)
    branchOps.position.set(-3.2, 0.01, 0.5)
    this.group.add(branchOps)

    // Branch to Infrastructure Server Bay
    const branchInfraGeo = this.track(new THREE.BoxGeometry(0.16, 0.02, 6.0))
    const branchInfra = new THREE.Mesh(branchInfraGeo, materials.brass)
    branchInfra.position.set(-7.5, 0.01, -4.5)
    this.group.add(branchInfra)
  }

  /**
   * Frameless Acoustic Glass Cleanroom Enclosure
   */
  private buildCleanroomEnclosure(materials: MaterialLibrary): void {
    // West Glass Wall (facing Agent Operations, with doorway opening)
    const glassWestNorthGeo = this.track(new THREE.BoxGeometry(0.06, 2.4, 4.0))
    const glassWestNorth = new THREE.Mesh(glassWestNorthGeo, materials.glass)
    glassWestNorth.name = 'cleanroom-glass-wall'
    glassWestNorth.position.set(0.6, 1.25, 6.8)
    this.group.add(glassWestNorth)

    const glassWestSouthGeo = this.track(new THREE.BoxGeometry(0.06, 2.4, 4.2))
    const glassWestSouth = new THREE.Mesh(glassWestSouthGeo, materials.glass)
    glassWestSouth.position.set(0.6, 1.25, 0.4)
    this.group.add(glassWestSouth)

    // Glass transom header beam over cleanroom entrance aperture (Z: 2.5 to 4.8)
    const transomGeo = this.track(new THREE.BoxGeometry(0.08, 0.35, 2.3))
    const transom = new THREE.Mesh(transomGeo, materials.gunmetal)
    transom.position.set(0.6, 2.3, 3.65)
    this.group.add(transom)

    // Brass corner posts and structural mullions
    const postPositions = [
      [0.6, 1.25, 8.8],
      [0.6, 1.25, 4.8],
      [0.6, 1.25, 2.5],
      [0.6, 1.25, -1.8],
      [11.8, 1.25, -1.8],
      [11.8, 1.25, 8.8],
    ]

    for (const [px, py, pz] of postPositions) {
      const postGeo = this.track(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8))
      const post = new THREE.Mesh(postGeo, materials.brass)
      post.position.set(px!, py!, pz!)
      post.castShadow = true
      this.group.add(post)
    }

    // Acoustic glass partition separating Verification Lab from Browser QA
    const dividerGeo = this.track(new THREE.BoxGeometry(8.5, 2.2, 0.06))
    const divider = new THREE.Mesh(dividerGeo, materials.glass)
    divider.position.set(5.5, 1.15, 2.5)
    this.group.add(divider)

    // Low walnut perimeter curb under glass partition
    const curbGeo = this.track(new THREE.BoxGeometry(8.5, 0.15, 0.14))
    const curb = new THREE.Mesh(curbGeo, materials.walnut)
    curb.position.set(5.5, 0.12, 2.5)
    this.group.add(curb)
  }

  /**
   * Elevated Approval Control Mezzanine Gallery (Y = +2.8m, North wall)
   */
  private buildMezzanineGallery(materials: MaterialLibrary): void {
    // Gallery deck slab (18m wide x 3.6m deep at Y = 2.8m)
    const deckGeo = this.track(new THREE.BoxGeometry(18.0, 0.25, 3.6))
    const deck = new THREE.Mesh(deckGeo, materials.walnut)
    deck.position.set(0.0, 2.8, 8.5)
    deck.castShadow = true
    deck.receiveShadow = true
    this.group.add(deck)

    // Polished stone flooring surface on mezzanine deck
    const deckSurfaceGeo = this.track(new THREE.BoxGeometry(17.8, 0.02, 3.4))
    const deckSurface = new THREE.Mesh(deckSurfaceGeo, materials.limestonePlinth)
    deckSurface.position.set(0.0, 2.935, 8.5)
    deckSurface.receiveShadow = true
    this.group.add(deckSurface)

    // Smoked glass balustrade facing ground operations (Z = 6.65m)
    const balustradeGeo = this.track(new THREE.BoxGeometry(17.8, 0.85, 0.04))
    const balustrade = new THREE.Mesh(balustradeGeo, materials.glass)
    balustrade.position.set(0.0, 3.38, 6.72)
    this.group.add(balustrade)

    // Brass top handrail
    const handrailGeo = this.track(new THREE.BoxGeometry(18.0, 0.05, 0.08))
    const handrail = new THREE.Mesh(handrailGeo, materials.brass)
    handrail.position.set(0.0, 3.82, 6.72)
    handrail.castShadow = true
    this.group.add(handrail)

    // Slender walnut support colonnade (Y = 0 to 2.8m)
    const colXPositions = [-7.5, -2.5, 2.5, 7.5]
    for (const cx of colXPositions) {
      const colGeo = this.track(new THREE.BoxGeometry(0.35, 2.8, 0.35))
      const col = new THREE.Mesh(colGeo, materials.walnut)
      col.position.set(cx, 1.4, 7.2)
      col.castShadow = true
      col.receiveShadow = true
      this.group.add(col)

      // Brass column collar base
      const collarGeo = this.track(new THREE.BoxGeometry(0.42, 0.08, 0.42))
      const collar = new THREE.Mesh(collarGeo, materials.brass)
      collar.position.set(cx, 0.04, 7.2)
      this.group.add(collar)
    }

    // Architectural floating stair steps on West side leading to Mezzanine
    const numSteps = 10
    const stepHeight = 2.8 / numSteps
    for (let i = 0; i < numSteps; i++) {
      const stepGeo = this.track(new THREE.BoxGeometry(1.2, 0.06, 0.38))
      const step = new THREE.Mesh(stepGeo, materials.walnut)
      const sy = (i + 1) * stepHeight - 0.03
      const sz = 4.2 + i * 0.36
      step.position.set(-10.2, sy, sz)
      step.castShadow = true
      step.receiveShadow = true
      this.group.add(step)
    }

    // Floating stair outer handrail
    const stairRailGeo = this.track(new THREE.CylinderGeometry(0.025, 0.025, 4.2, 8))
    const stairRail = new THREE.Mesh(stairRailGeo, materials.brass)
    stairRail.position.set(-10.8, 1.8, 5.8)
    stairRail.rotation.x = Math.atan2(2.8, 3.6)
    this.group.add(stairRail)
  }

  /**
   * Overhead Open-Truss Light Bridges & Structural Frames
   * Frames the 3D volume like an architectural physical maquette.
   */
  private buildOverheadFrames(materials: MaterialLibrary): void {
    // Open horizontal architectural beam bridge above Agent Operations (Y = +4.8m)
    const beamGeo = this.track(new THREE.BoxGeometry(14.0, 0.14, 0.14))
    const beam1 = new THREE.Mesh(beamGeo, materials.gunmetal)
    beam1.position.set(-4.5, 4.8, 0.5)
    beam1.castShadow = true
    this.group.add(beam1)

    const beam2 = new THREE.Mesh(beamGeo, materials.gunmetal)
    beam2.position.set(-4.5, 4.8, -3.5)
    beam2.castShadow = true
    this.group.add(beam2)

    // Transverse connecting struts with integrated recessed LED channels
    for (let bx = -10.5; bx <= 1.5; bx += 3.0) {
      const strutGeo = this.track(new THREE.BoxGeometry(0.08, 0.08, 4.0))
      const strut = new THREE.Mesh(strutGeo, materials.gunmetal)
      strut.position.set(bx, 4.8, -1.5)
      this.group.add(strut)

      // Recessed downward linear LED luminaire
      const ledGeo = this.track(new THREE.BoxGeometry(0.03, 0.02, 3.4))
      const led = new THREE.Mesh(ledGeo, materials.vellum)
      led.position.set(bx, 4.75, -1.5)
      this.group.add(led)
    }

    // Light armature framing Mission Control Planning Table (Y = +4.2m)
    const mcRingGeo = this.track(new THREE.BoxGeometry(4.2, 0.08, 2.6))
    const mcRing = new THREE.Mesh(mcRingGeo, materials.brass)
    mcRing.position.set(-4.5, 4.2, 5.5)
    mcRing.castShadow = true
    this.group.add(mcRing)

    // Slender suspension cables
    const cableCorners = [
      [-6.5, 5.5],
      [-2.5, 5.5],
      [-6.5, 6.7],
      [-2.5, 6.7],
    ]
    for (const [cx, cz] of cableCorners) {
      const cableGeo = this.track(new THREE.CylinderGeometry(0.008, 0.008, 1.4, 6))
      const cable = new THREE.Mesh(cableGeo, materials.gunmetal)
      cable.position.set(cx!, 4.9, cz!)
      this.group.add(cable)
    }
  }

  /**
   * Built-in Architectural Credenzas & Baffles
   */
  private buildBuiltInCabinetry(materials: MaterialLibrary): void {
    // Low walnut credenza behind Mission Control (0.8m high x 5.0m long)
    const credenzaGeo = this.track(new THREE.BoxGeometry(5.0, 0.75, 0.7))
    const credenza = new THREE.Mesh(credenzaGeo, materials.walnut)
    credenza.position.set(-4.5, 0.375, 8.2)
    credenza.castShadow = true
    credenza.receiveShadow = true
    this.group.add(credenza)

    // Brushed brass top surface on credenza
    const topGeo = this.track(new THREE.BoxGeometry(5.04, 0.03, 0.74))
    const credenzaTop = new THREE.Mesh(topGeo, materials.brass)
    credenzaTop.position.set(-4.5, 0.765, 8.2)
    this.group.add(credenzaTop)

    // Low acoustic walnut divider separating Mission Control from Agent Operations (0.85m high)
    const dividerGeo = this.track(new THREE.BoxGeometry(7.0, 0.85, 0.2))
    const divider = new THREE.Mesh(dividerGeo, materials.walnut)
    divider.position.set(-4.5, 0.425, 3.2)
    divider.castShadow = true
    divider.receiveShadow = true
    this.group.add(divider)

    // Brass accent cap on divider
    const capGeo = this.track(new THREE.BoxGeometry(7.05, 0.03, 0.24))
    const cap = new THREE.Mesh(capGeo, materials.brass)
    cap.position.set(-4.5, 0.865, 3.2)
    this.group.add(cap)

    // Architectural sound-baffled niche enclosing Infrastructure Server Bay (Northwest)
    // Low 1.1m acoustic wall (instead of giant black ceiling slab)
    const infraWallGeo = this.track(new THREE.BoxGeometry(0.25, 1.2, 5.0))
    const infraWall = new THREE.Mesh(infraWallGeo, materials.walnut)
    infraWall.position.set(-7.0, 0.6, -6.5)
    infraWall.castShadow = true
    infraWall.receiveShadow = true
    this.group.add(infraWall)

    const infraWallCapGeo = this.track(new THREE.BoxGeometry(0.3, 0.04, 5.05))
    const infraWallCap = new THREE.Mesh(infraWallCapGeo, materials.brass)
    infraWallCap.position.set(-7.0, 1.22, -6.5)
    this.group.add(infraWallCap)
  }

  public dispose(): void {
    for (const geom of this.geometriesToDispose) {
      geom.dispose()
    }
    this.geometriesToDispose.length = 0
  }
}
