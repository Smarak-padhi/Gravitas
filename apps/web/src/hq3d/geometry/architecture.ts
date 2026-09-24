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
  public readonly elevatorCarriage: THREE.Group
  public readonly elevatorDoorLeft: THREE.Mesh
  public readonly elevatorDoorRight: THREE.Mesh
  public readonly elevatorIndicator: THREE.Mesh
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

    // Wave 12K Architectural Cutaway & Elevator Shaft
    const elevatorComponents = this.buildElevatorShaft(materials)
    this.elevatorCarriage = elevatorComponents.carriage
    this.elevatorDoorLeft = elevatorComponents.doorLeft
    this.elevatorDoorRight = elevatorComponents.doorRight
    this.elevatorIndicator = elevatorComponents.indicator

    this.buildBuildingCutawayEnvelope(materials)
  }

  public setElevatorHeight(y: number): void {
    this.elevatorCarriage.position.y = y
  }

  public getElevatorHeight(): number {
    return this.elevatorCarriage.position.y
  }

  public setElevatorDoorOpen(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress))
    // Closed: left=-0.21, right=0.21. Fully open: left=-0.62, right=0.62
    this.elevatorDoorLeft.position.x = -0.21 - clamped * 0.41
    this.elevatorDoorRight.position.x = 0.21 + clamped * 0.41
  }

  private track<T extends THREE.BufferGeometry>(geom: T): T {
    this.geometriesToDispose.push(geom)
    return geom
  }

  /**
   * Main Ground Operations Floor (Tighter 26m x 20m footprint, eliminating empty void)
   */
  private buildGroundSlab(materials: MaterialLibrary): void {
    // Primary architectural floor slab with warm natural oak flooring
    const floorGeo = this.track(new THREE.BoxGeometry(26.0, 0.4, 20.0))
    const floorMesh = new THREE.Mesh(floorGeo, materials.woodOakFloor)
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
   * Unobtrusive ceiling perimeter frames that do not occlude interior views.
   */
  private buildOverheadFrames(materials: MaterialLibrary): void {
    // Slender perimeter structural tie at ceiling height (Y = 6.0m)
    const tieGeo = this.track(new THREE.BoxGeometry(14.0, 0.08, 0.08))
    const tie1 = new THREE.Mesh(tieGeo, materials.structureGraphite)
    tie1.position.set(-4.5, 6.0, 0.5)
    this.group.add(tie1)

    // Light armature framing Mission Control Planning Table suspended high at Y = +5.2m
    const mcRingGeo = this.track(new THREE.BoxGeometry(4.2, 0.06, 2.6))
    const mcRing = new THREE.Mesh(mcRingGeo, materials.brass)
    mcRing.position.set(-4.5, 5.2, 5.5)
    this.group.add(mcRing)
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

  /**
   * Visible Vertical Architectural Elevator Shaft & Articulated Carriage
   */
  private buildElevatorShaft(materials: MaterialLibrary): {
    carriage: THREE.Group
    doorLeft: THREE.Mesh
    doorRight: THREE.Mesh
    indicator: THREE.Mesh
  } {
    const shaftGroup = new THREE.Group()
    shaftGroup.name = 'elevator-shaft-tower'

    // 4 vertical structural corner columns from Y = -0.4 to Y = 6.4 (6.8m high)
    const colPositions = [
      [-0.85, 9.0],
      [0.85, 9.0],
      [-0.85, 10.6],
      [0.85, 10.6],
    ]
    for (const [cx, cz] of colPositions) {
      const colGeo = this.track(new THREE.BoxGeometry(0.08, 6.8, 0.08))
      const col = new THREE.Mesh(colGeo, materials.structureGraphite)
      col.position.set(cx!, 3.0, cz!)
      col.castShadow = true
      shaftGroup.add(col)
    }

    // Frameless architectural glass shaft panels
    const sideGlassGeo = this.track(new THREE.BoxGeometry(0.04, 6.4, 1.52))
    const glassW = new THREE.Mesh(sideGlassGeo, materials.architecturalGlass)
    glassW.position.set(-0.85, 3.0, 9.8)
    shaftGroup.add(glassW)

    const glassE = new THREE.Mesh(sideGlassGeo, materials.architecturalGlass)
    glassE.position.set(0.85, 3.0, 9.8)
    shaftGroup.add(glassE)

    // Rear glass wall
    const rearGlassGeo = this.track(new THREE.BoxGeometry(1.62, 6.4, 0.04))
    const glassRear = new THREE.Mesh(rearGlassGeo, materials.architecturalGlass)
    glassRear.position.set(0.0, 3.0, 10.58)
    shaftGroup.add(glassRear)

    // Polished vertical steel guide rails
    for (const rx of [-0.78, 0.78]) {
      const railGeo = this.track(new THREE.BoxGeometry(0.04, 6.6, 0.04))
      const rail = new THREE.Mesh(railGeo, materials.elevatorGuideRail)
      rail.position.set(rx, 3.0, 9.8)
      shaftGroup.add(rail)
    }

    // Top machinery penthouse box at Y = 6.35
    const machGeo = this.track(new THREE.BoxGeometry(1.78, 0.35, 1.68))
    const mach = new THREE.Mesh(machGeo, materials.gunmetal)
    mach.position.set(0.0, 6.35, 9.8)
    mach.castShadow = true
    shaftGroup.add(mach)

    // Machinery brass cable sheaves / pulley rings
    for (const px of [-0.35, 0.35]) {
      const pulleyGeo = this.track(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16))
      const pulley = new THREE.Mesh(pulleyGeo, materials.champagneBrass)
      pulley.rotation.z = Math.PI / 2
      pulley.position.set(px, 6.18, 9.8)
      shaftGroup.add(pulley)
    }

    // Steel hoist cables extending down to carriage
    for (const cx of [-0.35, 0.35]) {
      const cableGeo = this.track(new THREE.CylinderGeometry(0.008, 0.008, 6.0, 6))
      const cable = new THREE.Mesh(cableGeo, materials.elevatorGuideRail)
      cable.position.set(cx, 3.2, 9.8)
      shaftGroup.add(cable)
    }

    // Ground Landing Threshold & Call Plinth (Y = 0.0)
    const groundPlaqueGeo = this.track(new THREE.BoxGeometry(0.3, 0.08, 0.04))
    const groundPlaque = new THREE.Mesh(groundPlaqueGeo, materials.champagneBrass)
    groundPlaque.position.set(0.0, 2.32, 8.96)
    shaftGroup.add(groundPlaque)

    // Mezzanine Landing Threshold & Call Plinth (Y = 2.95)
    const mezPlaque = new THREE.Mesh(groundPlaqueGeo, materials.champagneBrass)
    mezPlaque.position.set(0.0, 5.27, 8.96)
    shaftGroup.add(mezPlaque)

    // Articulated Elevator Carriage (Cab)
    const carriage = new THREE.Group()
    carriage.name = 'elevator-carriage'
    carriage.position.set(0.0, 0.0, 9.8)

    // Cab platform floor
    const cabFloorGeo = this.track(new THREE.BoxGeometry(1.48, 0.06, 1.36))
    const cabFloor = new THREE.Mesh(cabFloorGeo, materials.limestonePlinth)
    cabFloor.position.set(0.0, 0.03, 0.0)
    cabFloor.receiveShadow = true
    carriage.add(cabFloor)

    // Cab roof
    const cabRoofGeo = this.track(new THREE.BoxGeometry(1.48, 0.06, 1.36))
    const cabRoof = new THREE.Mesh(cabRoofGeo, materials.gunmetal)
    cabRoof.position.set(0.0, 2.22, 0.0)
    cabRoof.castShadow = true
    carriage.add(cabRoof)

    // Warm recessed ceiling panel
    const cabLightGeo = this.track(new THREE.BoxGeometry(1.1, 0.02, 0.95))
    const cabLight = new THREE.Mesh(cabLightGeo, materials.lampWarmGlow)
    cabLight.position.set(0.0, 2.18, 0.0)
    carriage.add(cabLight)

    // Cab rear wall (American walnut veneer panel)
    const rearWallGeo = this.track(new THREE.BoxGeometry(1.44, 2.1, 0.04))
    const rearWall = new THREE.Mesh(rearWallGeo, materials.walnut)
    rearWall.position.set(0.0, 1.1, 0.64)
    carriage.add(rearWall)

    // Cab side walls (champagne brass trim + smoked glass)
    const cabSideGeo = this.track(new THREE.BoxGeometry(0.04, 2.1, 1.28))
    const cabSideW = new THREE.Mesh(cabSideGeo, materials.glass)
    cabSideW.position.set(-0.7, 1.1, 0.0)
    carriage.add(cabSideW)

    const cabSideE = new THREE.Mesh(cabSideGeo, materials.glass)
    cabSideE.position.set(0.7, 1.1, 0.0)
    carriage.add(cabSideE)

    // Satin champagne brass interior handrail
    const railGeo = this.track(new THREE.BoxGeometry(1.28, 0.04, 0.04))
    const rail = new THREE.Mesh(railGeo, materials.champagneBrass)
    rail.position.set(0.0, 0.95, 0.58)
    carriage.add(rail)

    // Double Sliding Doors (front: Z = -0.62)
    const doorGeo = this.track(new THREE.BoxGeometry(0.40, 2.08, 0.03))
    const doorLeft = new THREE.Mesh(doorGeo, materials.structureGraphite)
    doorLeft.position.set(-0.21, 1.08, -0.62)
    carriage.add(doorLeft)

    const doorRight = new THREE.Mesh(doorGeo, materials.structureGraphite)
    doorRight.position.set(0.21, 1.08, -0.62)
    carriage.add(doorRight)

    // Door glass view slots
    const doorGlassGeo = this.track(new THREE.BoxGeometry(0.12, 1.6, 0.04))
    const dgw = new THREE.Mesh(doorGlassGeo, materials.glass)
    dgw.position.set(0.0, 0.1, 0.0)
    doorLeft.add(dgw)

    const dge = new THREE.Mesh(doorGlassGeo, materials.glass)
    dge.position.set(0.0, 0.1, 0.0)
    doorRight.add(dge)

    // Elevator illuminated floor indicator beacon
    const indGeo = this.track(new THREE.BoxGeometry(0.24, 0.05, 0.04))
    const indicator = new THREE.Mesh(indGeo, materials.lampWarmGlow)
    indicator.position.set(0.0, 2.25, -0.64)
    carriage.add(indicator)

    this.group.add(shaftGroup)
    this.group.add(carriage)

    return { carriage, doorLeft, doorRight, indicator }
  }

  /**
   * Coherent Architectural Cutaway Envelope
   * Encloses the 26m x 20m footprint into a distinct vertical architectural building cutaway.
   */
  private buildBuildingCutawayEnvelope(materials: MaterialLibrary): void {
    const envelopeGroup = new THREE.Group()
    envelopeGroup.name = 'building-cutaway-envelope'

    // 1. Rear Exterior Charcoal Facade Cladding (X: -13.7 to +13.7, Y: -0.4 to 6.4, Z = 10.9)
    const rearShellGeo = this.track(new THREE.BoxGeometry(27.4, 6.8, 0.28))
    const rearShell = new THREE.Mesh(rearShellGeo, materials.facadeCharcoal)
    rearShell.position.set(0.0, 3.0, 10.9)
    rearShell.castShadow = true
    envelopeGroup.add(rearShell)

    // Interior Warm Plaster Wall Finish
    const rearPlasterGeo = this.track(new THREE.BoxGeometry(27.0, 6.7, 0.05))
    const rearPlaster = new THREE.Mesh(rearPlasterGeo, materials.wallPlasterWarm)
    rearPlaster.position.set(0.0, 3.0, 10.74)
    rearPlaster.receiveShadow = true
    envelopeGroup.add(rearPlaster)

    // Vertical architectural walnut acoustic battens along rear wall
    const battenX = [-12.0, -9.0, -6.0, -3.0, 3.0, 6.0, 9.0, 12.0]
    for (const bx of battenX) {
      const battenGeo = this.track(new THREE.BoxGeometry(0.12, 6.6, 0.06))
      const batten = new THREE.Mesh(battenGeo, materials.walnut)
      batten.position.set(bx, 3.0, 10.68)
      batten.castShadow = true
      envelopeGroup.add(batten)
    }

    // 2. West Cutaway Section Wall (X = -13.5, Z: -9.8 to 10.7, Y = 3.0)
    const westShellGeo = this.track(new THREE.BoxGeometry(0.28, 6.8, 20.6))
    const westShell = new THREE.Mesh(westShellGeo, materials.facadeCharcoal)
    westShell.position.set(-13.64, 3.0, 0.5)
    westShell.castShadow = true
    envelopeGroup.add(westShell)

    const westPlasterGeo = this.track(new THREE.BoxGeometry(0.05, 6.7, 20.4))
    const westPlaster = new THREE.Mesh(westPlasterGeo, materials.wallPlaster)
    westPlaster.position.set(-13.48, 3.0, 0.5)
    westPlaster.receiveShadow = true
    envelopeGroup.add(westPlaster)

    // Architectural model cutaway section profile trim on West edge
    const westSectionCutGeo = this.track(new THREE.BoxGeometry(0.32, 6.85, 0.14))
    const westSectionCut = new THREE.Mesh(westSectionCutGeo, materials.cutawaySlabEdge)
    westSectionCut.position.set(-13.64, 3.0, -9.8)
    envelopeGroup.add(westSectionCut)

    // 3. East Cutaway Section Wall (X = +13.5, Z: -9.8 to 10.7, Y = 3.0)
    const eastShellGeo = this.track(new THREE.BoxGeometry(0.28, 6.8, 20.6))
    const eastShell = new THREE.Mesh(eastShellGeo, materials.facadeCharcoal)
    eastShell.position.set(13.64, 3.0, 0.5)
    eastShell.castShadow = true
    envelopeGroup.add(eastShell)

    const eastPlasterGeo = this.track(new THREE.BoxGeometry(0.05, 6.7, 20.4))
    const eastPlaster = new THREE.Mesh(eastPlasterGeo, materials.wallPlaster)
    eastPlaster.position.set(13.48, 3.0, 0.5)
    eastPlaster.receiveShadow = true
    envelopeGroup.add(eastPlaster)

    // Architectural cutaway section profile trim on East edge
    const eastSectionCutGeo = this.track(new THREE.BoxGeometry(0.32, 6.85, 0.14))
    const eastSectionCut = new THREE.Mesh(eastSectionCutGeo, materials.cutawaySlabEdge)
    eastSectionCut.position.set(13.64, 3.0, -9.8)
    envelopeGroup.add(eastSectionCut)

    // 4. Roof Cutaway Crown & Structural Parapet (Y = 6.35m)
    const roofDeckGeo = this.track(new THREE.BoxGeometry(27.4, 0.3, 6.4))
    const roofDeck = new THREE.Mesh(roofDeckGeo, materials.structureGraphite)
    roofDeck.position.set(0.0, 6.35, 7.6)
    roofDeck.castShadow = true
    envelopeGroup.add(roofDeck)

    const parapetGeo = this.track(new THREE.BoxGeometry(27.6, 0.45, 0.2))
    const parapetRear = new THREE.Mesh(parapetGeo, materials.facadeCharcoal)
    parapetRear.position.set(0.0, 6.6, 10.8)
    envelopeGroup.add(parapetRear)

    const frontBeamGeo = this.track(new THREE.BoxGeometry(27.6, 0.35, 0.35))
    const frontBeam = new THREE.Mesh(frontBeamGeo, materials.structureGraphite)
    frontBeam.position.set(0.0, 6.35, -9.8)
    frontBeam.castShadow = true
    envelopeGroup.add(frontBeam)

    const frontTrimGeo = this.track(new THREE.BoxGeometry(27.64, 0.08, 0.08))
    const frontTrim = new THREE.Mesh(frontTrimGeo, materials.champagneBrass)
    frontTrim.position.set(0.0, 6.18, -9.8)
    envelopeGroup.add(frontTrim)

    // 5. Slender Perimeter Corner Columns (Cutaway corners only, keeping front facade open)
    const columnCoords = [
      [-13.5, -9.8],
      [13.5, -9.8],
    ]
    for (const [colX, colZ] of columnCoords) {
      const colGeo = this.track(new THREE.BoxGeometry(0.38, 6.6, 0.38))
      const col = new THREE.Mesh(colGeo, materials.structureGraphite)
      col.position.set(colX!, 3.0, colZ!)
      col.castShadow = true
      envelopeGroup.add(col)

      const baseGeo = this.track(new THREE.BoxGeometry(0.46, 0.16, 0.46))
      const base = new THREE.Mesh(baseGeo, materials.champagneBrass)
      base.position.set(colX!, -0.12, colZ!)
      envelopeGroup.add(base)
    }

    // 6. Overhead Acoustic Ceiling Structure & Soft Downlights (Over rear roof deck only, keeping cutaway aperture open)
    for (let z = 5.5; z <= 9.5; z += 2.0) {
      const baffleGeo = this.track(new THREE.BoxGeometry(25.0, 0.12, 0.08))
      const baffle = new THREE.Mesh(baffleGeo, materials.ceilingPanel)
      baffle.position.set(0.0, 6.15, z)
      envelopeGroup.add(baffle)

      const ledGeo = this.track(new THREE.BoxGeometry(23.0, 0.02, 0.04))
      const led = new THREE.Mesh(ledGeo, materials.lampWarmGlow)
      led.position.set(0.0, 6.08, z)
      envelopeGroup.add(led)
    }

    this.group.add(envelopeGroup)
  }

  public dispose(): void {
    for (const geom of this.geometriesToDispose) {
      geom.dispose()
    }
    this.geometriesToDispose.length = 0
  }
}
