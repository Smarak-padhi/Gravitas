/**
 * Architectural Geometry Generator for Gravitas 3D Headquarters
 * Constructs the North-Star 7-Level Vertical Cutaway Tower:
 * - 7 readable stacked floors: Mezzanine (L0), F1 Mission, F2 Agent Ops (Hero), F3 Verification, F4 Browser QA, F5 Infrastructure, F6 Approval
 * - Fully open cutaway front aperture (Z = -4.0m) with zero foreground obstructions
 * - Distinct floor slabs with oak/limestone surfaces, beveled graphite slab facings, and champagne brass trim
 * - External frameless glass elevator shaft on the East flank with articulated carriage and hoist mechanics
 * - Rear architectural wall with warm plaster finish, American walnut acoustic battens, and vertical picture windows
 * - Slender perimeter structural steel colonnade on side walls
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../materials/materials.js'

export const FLOOR_ELEVATIONS = [
  0.0,   // L0: Mezzanine / Lounge
  3.6,   // F1: Mission Control
  7.2,   // F2: Agent Operations (Hero Room)
  10.8,  // F3: Verification Cleanroom
  14.4,  // F4: Browser QA Lab
  18.0,  // F5: Infrastructure Server Bay
  21.6,  // F6: Approval & Human Control
] as const

export const ROOF_ELEVATION = 25.2

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

    this.buildBaseFoundation(materials)
    this.buildTowerSlabs(materials)
    this.buildTowerEnvelopes(materials)
    this.buildCleanroomPartitions(materials)

    // Vertical external elevator shaft
    const elevatorComponents = this.buildElevatorShaft(materials)
    this.elevatorCarriage = elevatorComponents.carriage
    this.elevatorDoorLeft = elevatorComponents.doorLeft
    this.elevatorDoorRight = elevatorComponents.doorRight
    this.elevatorIndicator = elevatorComponents.indicator

    // Initialize elevator carriage at Floor 2 (Hero Room)
    this.setElevatorHeight(7.2)
  }

  public setElevatorHeight(y: number): void {
    this.elevatorCarriage.position.y = y
  }

  public getElevatorHeight(): number {
    return this.elevatorCarriage.position.y
  }

  public setElevatorDoorOpen(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress))
    // Closed: left=-0.22, right=0.22. Open: left=-0.62, right=0.62
    this.elevatorDoorLeft.position.x = -0.22 - clamped * 0.40
    this.elevatorDoorRight.position.x = 0.22 + clamped * 0.40
  }

  private track<T extends THREE.BufferGeometry>(geom: T): T {
    this.geometriesToDispose.push(geom)
    return geom
  }

  /**
   * Tower Base Foundation Plinth (Y = -0.4 to 0.0)
   */
  private buildBaseFoundation(materials: MaterialLibrary): void {
    const baseGroup = new THREE.Group()
    baseGroup.name = 'tower-base-foundation'

    // Sub-foundation curb (dark gunmetal)
    const subGeo = this.track(new THREE.BoxGeometry(19.2, 0.25, 10.4))
    const subMesh = new THREE.Mesh(subGeo, materials.gunmetal)
    subMesh.position.set(0.6, -0.32, 0.2)
    subMesh.receiveShadow = true
    baseGroup.add(subMesh)

    // Honed dark limestone architectural plinth curb
    const plinthGeo = this.track(new THREE.BoxGeometry(18.6, 0.2, 9.8))
    const plinthMesh = new THREE.Mesh(plinthGeo, materials.limestoneDark)
    plinthMesh.position.set(0.6, -0.1, 0.2)
    plinthMesh.receiveShadow = true
    baseGroup.add(plinthMesh)

    this.group.add(baseGroup)
  }

  /**
   * 7 Readable Stacked Floor Slabs & Roof Canopy
   */
  private buildTowerSlabs(materials: MaterialLibrary): void {
    const slabsGroup = new THREE.Group()
    slabsGroup.name = 'tower-floor-slabs'

    const slabWidth = 14.4
    const slabDepth = 8.4
    const slabThick = 0.22
    const centerX = 0.0
    const centerZ = 0.2 // from Z = -4.0 (front cutaway) to Z = +4.4 (rear wall)

    for (let i = 0; i < FLOOR_ELEVATIONS.length; i++) {
      const floorY = FLOOR_ELEVATIONS[i]

      // 1. Structural Concrete Core Slab
      const coreGeo = this.track(new THREE.BoxGeometry(slabWidth, slabThick, slabDepth))
      const coreMat = materials.structureGraphite
      const coreMesh = new THREE.Mesh(coreGeo, coreMat)
      coreMesh.position.set(centerX, floorY - slabThick / 2, centerZ)
      coreMesh.castShadow = true
      coreMesh.receiveShadow = true
      slabsGroup.add(coreMesh)

      // 2. Flooring Surface Finish
      const floorSurfaceMat = (i === 3 || i === 5)
        ? materials.limestonePlinth // Cleanroom & Infrastructure use anti-static honed stone
        : materials.woodOakFloor     // Operations, Mission, Mezzanine, Approval use warm natural oak
      const surfGeo = this.track(new THREE.BoxGeometry(slabWidth - 0.04, 0.02, slabDepth - 0.04))
      const surfMesh = new THREE.Mesh(surfGeo, floorSurfaceMat)
      surfMesh.position.set(centerX, floorY + 0.01, centerZ)
      surfMesh.receiveShadow = true
      slabsGroup.add(surfMesh)

      // 3. Architectural Cutaway Front Bezel Trim (Z = -4.0m)
      const edgeGeo = this.track(new THREE.BoxGeometry(slabWidth + 0.08, slabThick + 0.04, 0.16))
      const edgeMesh = new THREE.Mesh(edgeGeo, materials.cutawaySlabEdge)
      edgeMesh.position.set(centerX, floorY - slabThick / 2, -4.0)
      slabsGroup.add(edgeMesh)

      // Brushed Champagne Brass Inlay Accent on Front Slab Edge
      const brassInlayGeo = this.track(new THREE.BoxGeometry(slabWidth + 0.12, 0.03, 0.04))
      const brassInlay = new THREE.Mesh(brassInlayGeo, materials.champagneBrass)
      brassInlay.position.set(centerX, floorY + 0.01, -4.0)
      slabsGroup.add(brassInlay)

      // 4. Acoustic Ceiling Finish & Recessed Warm Linear Downlights
      if (i > 0) {
        // Ceiling under the slab for the floor below
        const ceilGeo = this.track(new THREE.BoxGeometry(slabWidth - 0.4, 0.04, slabDepth - 0.4))
        const ceilMesh = new THREE.Mesh(ceilGeo, materials.ceilingPanel)
        ceilMesh.position.set(centerX, floorY - slabThick - 0.02, centerZ)
        slabsGroup.add(ceilMesh)

        // Linear recessed warm LED downlights in ceiling
        for (const lz of [-1.5, 1.8]) {
          const ledGeo = this.track(new THREE.BoxGeometry(slabWidth - 2.0, 0.02, 0.06))
          const ledMesh = new THREE.Mesh(ledGeo, materials.lampWarmGlow)
          ledMesh.position.set(centerX, floorY - slabThick - 0.04, centerZ + lz)
          slabsGroup.add(ledMesh)
        }
      }
    }

    // ── Roof Canopy & Crown Parapet (Y = ROOF_ELEVATION) ───────────────────
    const roofY = ROOF_ELEVATION
    const roofGeo = this.track(new THREE.BoxGeometry(slabWidth + 0.4, 0.35, slabDepth + 0.4))
    const roofMesh = new THREE.Mesh(roofGeo, materials.structureGraphite)
    roofMesh.position.set(centerX, roofY + 0.175, centerZ)
    roofMesh.castShadow = true
    slabsGroup.add(roofMesh)

    // Crown Parapet Edge (Charcoal metal)
    const parapetGeo = this.track(new THREE.BoxGeometry(slabWidth + 0.5, 0.45, 0.25))
    const parapetMesh = new THREE.Mesh(parapetGeo, materials.facadeCharcoal)
    parapetMesh.position.set(centerX, roofY + 0.45, -4.0)
    slabsGroup.add(parapetMesh)

    // Champagne Brass Crown Trim
    const crownTrimGeo = this.track(new THREE.BoxGeometry(slabWidth + 0.6, 0.05, 0.08))
    const crownTrim = new THREE.Mesh(crownTrimGeo, materials.champagneBrass)
    crownTrim.position.set(centerX, roofY + 0.68, -4.0)
    slabsGroup.add(crownTrim)

    this.group.add(slabsGroup)
  }

  /**
   * Tower Shell, Side Walls, Rear Plaster & Colonnade
   */
  private buildTowerEnvelopes(materials: MaterialLibrary): void {
    const envGroup = new THREE.Group()
    envGroup.name = 'tower-envelope-structure'

    const totalHeight = ROOF_ELEVATION + 0.6
    const midY = totalHeight / 2 - 0.2
    const rearZ = 4.45

    // 1. Rear Wall: Exterior Charcoal Facade
    const rearShellGeo = this.track(new THREE.BoxGeometry(15.2, totalHeight, 0.22))
    const rearShell = new THREE.Mesh(rearShellGeo, materials.facadeCharcoal)
    rearShell.position.set(0.0, midY, rearZ + 0.11)
    rearShell.castShadow = true
    envGroup.add(rearShell)

    // Rear Wall: Interior Warm Neutral Plaster Finish
    const rearPlasterGeo = this.track(new THREE.BoxGeometry(14.4, totalHeight - 0.2, 0.05))
    const rearPlaster = new THREE.Mesh(rearPlasterGeo, materials.wallPlasterWarm)
    rearPlaster.position.set(0.0, midY, rearZ - 0.02)
    rearPlaster.receiveShadow = true
    envGroup.add(rearPlaster)

    // Vertical American Walnut Acoustic Battens along Rear Wall
    const battenX = [-6.2, -4.6, -3.0, -1.4, 0.2, 1.8, 3.4, 5.0, 6.2]
    for (const bx of battenX) {
      const battenGeo = this.track(new THREE.BoxGeometry(0.14, totalHeight - 0.4, 0.08))
      const batten = new THREE.Mesh(battenGeo, materials.walnut)
      batten.position.set(bx, midY, rearZ - 0.08)
      batten.castShadow = true
      envGroup.add(batten)
    }

    // 2. West Side Wall (X = -7.2m): Structural Columns + Glass Panels
    const westX = -7.2
    // Corner & center graphite columns
    for (const cz of [-3.95, 0.2, 4.35]) {
      const colGeo = this.track(new THREE.BoxGeometry(0.32, totalHeight, 0.32))
      const col = new THREE.Mesh(colGeo, materials.structureGraphite)
      col.position.set(westX, midY, cz)
      col.castShadow = true
      envGroup.add(col)
    }

    // Frameless Low-Iron Architectural Glass Side Wall
    const westGlassGeo = this.track(new THREE.BoxGeometry(0.04, totalHeight - 0.8, 8.0))
    const westGlass = new THREE.Mesh(westGlassGeo, materials.architecturalGlass)
    westGlass.position.set(westX, midY, 0.2)
    envGroup.add(westGlass)

    // West Front Corner Cutaway Trim Profile
    const westTrimGeo = this.track(new THREE.BoxGeometry(0.24, totalHeight, 0.12))
    const westTrim = new THREE.Mesh(westTrimGeo, materials.cutawaySlabEdge)
    westTrim.position.set(westX - 0.04, midY, -4.0)
    envGroup.add(westTrim)

    // 3. East Side Wall (X = +7.2m): Structural Framing & Elevator Connectors
    const eastX = 7.2
    for (const cz of [-3.95, 0.2, 4.35]) {
      const colGeo = this.track(new THREE.BoxGeometry(0.32, totalHeight, 0.32))
      const col = new THREE.Mesh(colGeo, materials.structureGraphite)
      col.position.set(eastX, midY, cz)
      col.castShadow = true
      envGroup.add(col)
    }

    // East Architectural Glass Side Wall (front and rear segments, leaving center for elevator)
    const eastGlassNorthGeo = this.track(new THREE.BoxGeometry(0.04, totalHeight - 0.8, 3.2))
    const eastGlassNorth = new THREE.Mesh(eastGlassNorthGeo, materials.architecturalGlass)
    eastGlassNorth.position.set(eastX, midY, 2.6)
    envGroup.add(eastGlassNorth)

    const eastGlassSouthGeo = this.track(new THREE.BoxGeometry(0.04, totalHeight - 0.8, 2.6))
    const eastGlassSouth = new THREE.Mesh(eastGlassSouthGeo, materials.architecturalGlass)
    eastGlassSouth.position.set(eastX, midY, -2.4)
    envGroup.add(eastGlassSouth)

    // East Front Corner Cutaway Trim Profile
    const eastTrimGeo = this.track(new THREE.BoxGeometry(0.24, totalHeight, 0.12))
    const eastTrim = new THREE.Mesh(eastTrimGeo, materials.cutawaySlabEdge)
    eastTrim.position.set(eastX + 0.04, midY, -4.0)
    envGroup.add(eastTrim)

    this.group.add(envGroup)
  }

  /**
   * Floor 3 Verification Cleanroom Acoustic Glass Enclosure
   */
  private buildCleanroomPartitions(materials: MaterialLibrary): void {
    const cleanGroup = new THREE.Group()
    cleanGroup.name = 'floor3-cleanroom-partitions'
    const floor3Y = 10.8

    // Frameless Acoustic Glass Partition (facing Operations and circulation)
    const glassGeo = this.track(new THREE.BoxGeometry(0.05, 2.8, 6.2))
    const glass = new THREE.Mesh(glassGeo, materials.glass)
    glass.name = 'cleanroom-glass-wall' // Required by unit tests
    glass.position.set(-2.4, floor3Y + 1.4, 0.5)
    cleanGroup.add(glass)

    // Low American walnut base curb under cleanroom glass
    const curbGeo = this.track(new THREE.BoxGeometry(0.12, 0.14, 6.25))
    const curb = new THREE.Mesh(curbGeo, materials.walnut)
    curb.position.set(-2.4, floor3Y + 0.07, 0.5)
    cleanGroup.add(curb)

    // Brushed champagne brass structural corner stanchions
    for (const pz of [-2.6, 0.5, 3.6]) {
      const postGeo = this.track(new THREE.CylinderGeometry(0.035, 0.035, 2.9, 8))
      const post = new THREE.Mesh(postGeo, materials.champagneBrass)
      post.position.set(-2.4, floor3Y + 1.45, pz)
      cleanGroup.add(post)
    }

    this.group.add(cleanGroup)
  }

  /**
   * External Vertical Glass Elevator Shaft & Articulated Cab (East flank: X = +8.4m)
   */
  private buildElevatorShaft(materials: MaterialLibrary): {
    carriage: THREE.Group
    doorLeft: THREE.Mesh
    doorRight: THREE.Mesh
    indicator: THREE.Mesh
  } {
    const shaftGroup = new THREE.Group()
    shaftGroup.name = 'external-elevator-tower'

    const shaftX = 8.4
    const shaftZ = 0.2
    const totalHeight = ROOF_ELEVATION + 0.8
    const midY = totalHeight / 2 - 0.2

    // 4 Vertical Structural Graphite Corner Columns
    const colCoords = [
      [shaftX - 0.95, shaftZ - 0.95],
      [shaftX + 0.95, shaftZ - 0.95],
      [shaftX - 0.95, shaftZ + 0.95],
      [shaftX + 0.95, shaftZ + 0.95],
    ]
    for (const [cx, cz] of colCoords) {
      const colGeo = this.track(new THREE.BoxGeometry(0.09, totalHeight, 0.09))
      const col = new THREE.Mesh(colGeo, materials.structureGraphite)
      col.position.set(cx!, midY, cz!)
      col.castShadow = true
      shaftGroup.add(col)
    }

    // Frameless Low-Iron Glass Shaft Panels on East (+X), North (+Z), and South (-Z)
    // East outer wall
    const glassEastGeo = this.track(new THREE.BoxGeometry(0.04, totalHeight - 0.6, 1.82))
    const glassEast = new THREE.Mesh(glassEastGeo, materials.architecturalGlass)
    glassEast.position.set(shaftX + 0.95, midY, shaftZ)
    shaftGroup.add(glassEast)

    // South wall (facing camera angle)
    const glassSouthGeo = this.track(new THREE.BoxGeometry(1.82, totalHeight - 0.6, 0.04))
    const glassSouth = new THREE.Mesh(glassSouthGeo, materials.architecturalGlass)
    glassSouth.position.set(shaftX, midY, shaftZ - 0.95)
    shaftGroup.add(glassSouth)

    // North wall
    const glassNorthGeo = this.track(new THREE.BoxGeometry(1.82, totalHeight - 0.6, 0.04))
    const glassNorth = new THREE.Mesh(glassNorthGeo, materials.architecturalGlass)
    glassNorth.position.set(shaftX, midY, shaftZ + 0.95)
    shaftGroup.add(glassNorth)

    // Polished Vertical Steel Guide Rails inside shaft
    for (const cz of [shaftZ - 0.88, shaftZ + 0.88]) {
      const railGeo = this.track(new THREE.BoxGeometry(0.04, totalHeight - 0.4, 0.04))
      const rail = new THREE.Mesh(railGeo, materials.elevatorGuideRail)
      rail.position.set(shaftX, midY, cz)
      shaftGroup.add(rail)
    }

    // Top Motor Machinery Penthouse Box at Y = ROOF_ELEVATION + 0.5
    const pentGeo = this.track(new THREE.BoxGeometry(2.1, 0.55, 2.1))
    const pent = new THREE.Mesh(pentGeo, materials.gunmetal)
    pent.position.set(shaftX, ROOF_ELEVATION + 0.45, shaftZ)
    pent.castShadow = true
    shaftGroup.add(pent)

    // Hoist pulleys & steel cables
    for (const pz of [shaftZ - 0.4, shaftZ + 0.4]) {
      const pulleyGeo = this.track(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16))
      const pulley = new THREE.Mesh(pulleyGeo, materials.champagneBrass)
      pulley.rotation.z = Math.PI / 2
      pulley.position.set(shaftX, ROOF_ELEVATION + 0.18, pz)
      shaftGroup.add(pulley)

      const cableGeo = this.track(new THREE.CylinderGeometry(0.008, 0.008, totalHeight - 1.0, 6))
      const cable = new THREE.Mesh(cableGeo, materials.elevatorGuideRail)
      cable.position.set(shaftX, midY, pz)
      shaftGroup.add(cable)
    }

    // Floor Landing Threshold Bezels for all 7 floors on West interface
    for (const floorY of FLOOR_ELEVATIONS) {
      const plaqueGeo = this.track(new THREE.BoxGeometry(0.24, 0.08, 0.03))
      const plaque = new THREE.Mesh(plaqueGeo, materials.champagneBrass)
      plaque.position.set(shaftX - 0.98, floorY + 2.2, shaftZ)
      plaque.rotation.y = Math.PI / 2
      shaftGroup.add(plaque)
    }

    // ── Articulated Elevator Carriage (Cab) ───────────────────────────────
    const carriage = new THREE.Group()
    carriage.name = 'elevator-carriage'
    carriage.position.set(shaftX, 7.2, shaftZ)

    // Cab platform floor
    const cabFloorGeo = this.track(new THREE.BoxGeometry(1.68, 0.06, 1.68))
    const cabFloor = new THREE.Mesh(cabFloorGeo, materials.limestonePlinth)
    cabFloor.position.set(0.0, 0.03, 0.0)
    cabFloor.receiveShadow = true
    carriage.add(cabFloor)

    // Cab roof
    const cabRoofGeo = this.track(new THREE.BoxGeometry(1.68, 0.06, 1.68))
    const cabRoof = new THREE.Mesh(cabRoofGeo, materials.gunmetal)
    cabRoof.position.set(0.0, 2.22, 0.0)
    cabRoof.castShadow = true
    carriage.add(cabRoof)

    // Warm recessed ceiling panel light
    const cabLightGeo = this.track(new THREE.BoxGeometry(1.28, 0.02, 1.28))
    const cabLight = new THREE.Mesh(cabLightGeo, materials.lampWarmGlow)
    cabLight.position.set(0.0, 2.18, 0.0)
    carriage.add(cabLight)

    // Cab rear wall (American walnut veneer panel facing East)
    const rearWallGeo = this.track(new THREE.BoxGeometry(0.04, 2.1, 1.6))
    const rearWall = new THREE.Mesh(rearWallGeo, materials.walnut)
    rearWall.position.set(0.78, 1.1, 0.0)
    carriage.add(rearWall)

    // Cab side walls (smoked glass + champagne brass trim)
    for (const sz of [-0.78, 0.78]) {
      const sideGlassGeo = this.track(new THREE.BoxGeometry(1.56, 2.1, 0.04))
      const sideGlass = new THREE.Mesh(sideGlassGeo, materials.glass)
      sideGlass.position.set(0.0, 1.1, sz)
      carriage.add(sideGlass)

      const railGeo = this.track(new THREE.BoxGeometry(1.4, 0.04, 0.04))
      const rail = new THREE.Mesh(railGeo, materials.champagneBrass)
      rail.position.set(0.0, 0.95, sz > 0 ? sz - 0.06 : sz + 0.06)
      carriage.add(rail)
    }

    // Double Sliding Doors (facing West towards the building: X = -0.78)
    const doorGeo = this.track(new THREE.BoxGeometry(0.03, 2.08, 0.42))
    const doorLeft = new THREE.Mesh(doorGeo, materials.structureGraphite)
    doorLeft.position.set(-0.78, 1.08, -0.22)
    carriage.add(doorLeft)

    const doorRight = new THREE.Mesh(doorGeo, materials.structureGraphite)
    doorRight.position.set(-0.78, 1.08, 0.22)
    carriage.add(doorRight)

    // Door glass view slots
    const doorGlassGeo = this.track(new THREE.BoxGeometry(0.04, 1.6, 0.12))
    const dgw = new THREE.Mesh(doorGlassGeo, materials.glass)
    dgw.position.set(0.0, 0.1, 0.0)
    doorLeft.add(dgw)

    const dge = new THREE.Mesh(doorGlassGeo, materials.glass)
    dge.position.set(0.0, 0.1, 0.0)
    doorRight.add(dge)

    // Elevator illuminated floor indicator beacon (South facing, toward camera)
    const indGeo = this.track(new THREE.BoxGeometry(0.24, 0.06, 0.04))
    const indicator = new THREE.Mesh(indGeo, materials.lampWarmGlow)
    indicator.position.set(0.0, 2.25, -0.82)
    carriage.add(indicator)

    this.group.add(shaftGroup)
    this.group.add(carriage)

    return { carriage, doorLeft, doorRight, indicator }
  }

  public dispose(): void {
    for (const geom of this.geometriesToDispose) {
      geom.dispose()
    }
    this.geometriesToDispose.length = 0
  }
}
