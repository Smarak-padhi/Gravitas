/**
 * Architectural Geometry Generator for Gravitas 3D Headquarters
 * Constructs the building blockout: limestone floor, elevated mezzanine,
 * frameless cleanroom glass, acoustic partitions, and recessed conduit lines.
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../materials/materials.js'

export class HqArchitecture {
  public readonly group: THREE.Group
  private readonly geometriesToDispose: THREE.BufferGeometry[] = []

  constructor(materials: MaterialLibrary) {
    this.group = new THREE.Group()
    this.group.name = 'hq-architecture'

    this.buildGroundFloor(materials)
    this.buildMezzanine(materials)
    this.buildCleanroomGlass(materials)
    this.buildInfrastructurePartition(materials)
    this.buildOpticalConduits(materials)
    this.buildArchitecturalAccents(materials)
  }

  private track<T extends THREE.BufferGeometry>(geom: T): T {
    this.geometriesToDispose.push(geom)
    return geom
  }

  /**
   * Main limestone ground operations floor slab (36m x 28m)
   */
  private buildGroundFloor(materials: MaterialLibrary): void {
    // Primary floor slab
    const floorGeo = this.track(new THREE.BoxGeometry(36.0, 0.4, 28.0))
    const floorMesh = new THREE.Mesh(floorGeo, materials.limestone)
    floorMesh.position.set(0.0, -0.2, 1.0)
    floorMesh.receiveShadow = true
    floorMesh.name = 'ground-floor-slab'
    this.group.add(floorMesh)

    // Darker perimeter border curb (36.8m x 28.8m x 0.1m)
    const curbGeo = this.track(new THREE.BoxGeometry(36.6, 0.2, 28.6))
    const curbMesh = new THREE.Mesh(curbGeo, materials.limestoneDark)
    curbMesh.position.set(0.0, -0.25, 1.0)
    curbMesh.receiveShadow = true
    this.group.add(curbMesh)

    // Low architectural dividers separating zones without obstructing sightlines
    const dividerGeo1 = this.track(new THREE.BoxGeometry(0.15, 0.6, 14.0))
    const divider1 = new THREE.Mesh(dividerGeo1, materials.walnut)
    divider1.position.set(1.0, 0.3, 2.0)
    divider1.castShadow = true
    divider1.receiveShadow = true
    this.group.add(divider1)
  }

  /**
   * Elevated Approval Control Mezzanine Gallery (Y = +3.2m, North side)
   */
  private buildMezzanine(materials: MaterialLibrary): void {
    // Mezzanine floor slab (22m wide x 5m deep x 0.3m thick)
    const mezzFloorGeo = this.track(new THREE.BoxGeometry(22.0, 0.3, 5.0))
    const mezzFloor = new THREE.Mesh(mezzFloorGeo, materials.limestone)
    mezzFloor.position.set(0.0, 3.05, 12.0)
    mezzFloor.receiveShadow = true
    mezzFloor.castShadow = true
    mezzFloor.name = 'mezzanine-floor-slab'
    this.group.add(mezzFloor)

    // Mezzanine rear wall (22m wide x 3.5m high x 0.4m thick)
    const backWallGeo = this.track(new THREE.BoxGeometry(22.0, 3.5, 0.4))
    const backWall = new THREE.Mesh(backWallGeo, materials.limestoneDark)
    backWall.position.set(0.0, 4.8, 14.4)
    backWall.receiveShadow = true
    backWall.castShadow = true
    this.group.add(backWall)

    // Mezzanine front walnut balustrade / handrail (Y = 3.2m to 4.1m)
    const railTopGeo = this.track(new THREE.BoxGeometry(22.0, 0.08, 0.15))
    const railTop = new THREE.Mesh(railTopGeo, materials.walnut)
    railTop.position.set(0.0, 4.05, 9.6)
    railTop.castShadow = true
    this.group.add(railTop)

    // Brass stanchions supporting balustrade
    for (let x = -10.0; x <= 10.0; x += 2.5) {
      const postGeo = this.track(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 8))
      const post = new THREE.Mesh(postGeo, materials.brass)
      post.position.set(x, 3.62, 9.6)
      post.castShadow = true
      this.group.add(post)
    }

    // Heavy walnut support columns underneath Mezzanine (at Y=0 to 3.2m)
    const columnPositions = [-9.0, -3.0, 3.0, 9.0]
    for (const colX of columnPositions) {
      const colGeo = this.track(new THREE.BoxGeometry(0.5, 3.2, 0.5))
      const col = new THREE.Mesh(colGeo, materials.walnut)
      col.position.set(colX, 1.6, 9.7)
      col.castShadow = true
      col.receiveShadow = true
      this.group.add(col)
    }

    // Modern vertical lift carriage guide column
    const liftShaftGeo = this.track(new THREE.BoxGeometry(1.6, 4.2, 0.1))
    const liftShaft = new THREE.Mesh(liftShaftGeo, materials.gunmetal)
    liftShaft.position.set(0.0, 2.1, 10.45)
    this.group.add(liftShaft)

    // Vertical lift carriage platform (parked at ground Level 0 for now)
    const carriageGeo = this.track(new THREE.BoxGeometry(1.4, 0.1, 1.4))
    const carriage = new THREE.Mesh(carriageGeo, materials.brass)
    carriage.position.set(0.0, 0.05, 10.5)
    carriage.castShadow = true
    this.group.add(carriage)
  }

  /**
   * Frameless glass cleanroom acoustic enclosure around Verification Lab
   */
  private buildCleanroomGlass(materials: MaterialLibrary): void {
    // West glass wall facing central operations (Z: 3.0 to 9.5m, X = 1.2m)
    const glassWestGeo = this.track(new THREE.BoxGeometry(0.06, 2.6, 6.5))
    const glassWest = new THREE.Mesh(glassWestGeo, materials.glass)
    glassWest.name = 'cleanroom-glass-wall'
    glassWest.position.set(1.2, 1.3, 6.25)
    this.group.add(glassWest)

    // South glass wall facing Browser QA (X: 1.2m to 11.5m, Z = 3.0m)
    const glassSouthGeo = this.track(new THREE.BoxGeometry(10.3, 2.6, 0.06))
    const glassSouth = new THREE.Mesh(glassSouthGeo, materials.glass)
    glassSouth.position.set(6.35, 1.3, 3.0)
    this.group.add(glassSouth)

    // Brass corner and base support channels
    const channelWestGeo = this.track(new THREE.BoxGeometry(0.12, 0.08, 6.6))
    const channelWest = new THREE.Mesh(channelWestGeo, materials.brass)
    channelWest.position.set(1.2, 0.04, 6.25)
    this.group.add(channelWest)

    const channelSouthGeo = this.track(new THREE.BoxGeometry(10.4, 0.08, 0.12))
    const channelSouth = new THREE.Mesh(channelSouthGeo, materials.brass)
    channelSouth.position.set(6.35, 0.04, 3.0)
    this.group.add(channelSouth)
  }

  /**
   * Acoustic steel screen around Infrastructure Server Bay
   */
  private buildInfrastructurePartition(materials: MaterialLibrary): void {
    // East acoustic screen (X = -9.0m, Z: -12.0 to -6.0)
    const screenGeo = this.track(new THREE.BoxGeometry(0.15, 2.8, 6.0))
    const screen = new THREE.Mesh(screenGeo, materials.gunmetal)
    screen.position.set(-9.0, 1.4, -9.0)
    screen.castShadow = true
    screen.receiveShadow = true
    this.group.add(screen)
  }

  /**
   * Recessed optical transit conduits flush with the limestone floor
   */
  private buildOpticalConduits(materials: MaterialLibrary): void {
    // Conduit from Planning Table to Central Operations Corridor
    const c1Geo = this.track(new THREE.BoxGeometry(0.15, 0.02, 3.5))
    const c1 = new THREE.Mesh(c1Geo, materials.brass)
    c1.position.set(-4.0, 0.01, 3.5)
    this.group.add(c1)

    // Conduit branch to Codex workstation (-7.0, 1.0)
    const c2Geo = this.track(new THREE.BoxGeometry(3.0, 0.02, 0.15))
    const c2 = new THREE.Mesh(c2Geo, materials.brass)
    c2.position.set(-5.5, 0.01, 1.0)
    this.group.add(c2)

    // Conduit branch to FCC workstation (-1.0, 1.0)
    const c3Geo = this.track(new THREE.BoxGeometry(3.0, 0.02, 0.15))
    const c3 = new THREE.Mesh(c3Geo, materials.brass)
    c3.position.set(-2.5, 0.01, 1.0)
    this.group.add(c3)

    // Conduit across to Verification Lab cleanroom intake
    const c4Geo = this.track(new THREE.BoxGeometry(5.2, 0.02, 0.15))
    const c4 = new THREE.Mesh(c4Geo, materials.brass)
    c4.position.set(3.6, 0.01, 5.0)
    this.group.add(c4)
  }

  /**
   * Architectural base details and room boundary lines
   */
  private buildArchitecturalAccents(materials: MaterialLibrary): void {
    // Mission Control perimeter trim
    const mcTrimGeo = this.track(new THREE.BoxGeometry(8.0, 0.03, 0.08))
    const mcTrim = new THREE.Mesh(mcTrimGeo, materials.brass)
    mcTrim.position.set(-4.0, 0.015, 10.0)
    this.group.add(mcTrim)
  }

  public dispose(): void {
    for (const geom of this.geometriesToDispose) {
      geom.dispose()
    }
    this.geometriesToDispose.length = 0
  }
}
