/**
 * Furniture & Prototype Station Geometry Generator for Gravitas 3D Headquarters
 * Creates truthful workstation models without fake progress timers or simulated activity.
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../materials/materials.js'
import { STATION_DEFINITIONS } from '../world/stations.js'

export class HqFurniture {
  public readonly group: THREE.Group
  private readonly geometriesToDispose: THREE.BufferGeometry[] = []

  constructor(materials: MaterialLibrary) {
    this.group = new THREE.Group()
    this.group.name = 'hq-furniture'

    this.buildPlanningTable(materials)
    this.buildWorkstations(materials)
    this.buildVerifierConsole(materials)
    this.buildDeviceMatrixWall(materials)
    this.buildApprovalPlinth(materials)
    this.buildRepositoryVault(materials)
  }

  private track<T extends THREE.BufferGeometry>(geom: T): T {
    this.geometriesToDispose.push(geom)
    return geom
  }

  /**
   * Zone A: Mission Control Planning Table (3.2m x 1.6m x 0.85m)
   */
  private buildPlanningTable(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['planning-table']
    const tableGroup = new THREE.Group()
    tableGroup.position.set(...station.position)
    tableGroup.name = 'station:planning-table'
    tableGroup.userData = { type: 'station', id: station.id, name: station.name }

    // Walnut table frame
    const frameGeo = this.track(new THREE.BoxGeometry(3.2, 0.12, 1.6))
    const frame = new THREE.Mesh(frameGeo, materials.walnut)
    frame.position.set(0.0, 0.8, 0.0)
    frame.castShadow = true
    frame.receiveShadow = true
    tableGroup.add(frame)

    // Illuminated translucent vellum light-surface inlay
    const surfaceGeo = this.track(new THREE.BoxGeometry(2.9, 0.02, 1.3))
    const surface = new THREE.Mesh(surfaceGeo, materials.vellum)
    surface.position.set(0.0, 0.87, 0.0)
    surface.receiveShadow = true
    tableGroup.add(surface)

    // Solid walnut table legs
    const legGeo = this.track(new THREE.BoxGeometry(0.12, 0.8, 0.12))
    const legPositions = [
      [-1.45, 0.4, -0.65],
      [1.45, 0.4, -0.65],
      [-1.45, 0.4, 0.65],
      [1.45, 0.4, 0.65],
    ]
    for (const pos of legPositions) {
      const leg = new THREE.Mesh(legGeo, materials.walnut)
      leg.position.set(pos[0]!, pos[1]!, pos[2]!)
      leg.castShadow = true
      tableGroup.add(leg)
    }

    // Brass edge trim
    const trimGeo = this.track(new THREE.BoxGeometry(3.24, 0.02, 1.64))
    const trim = new THREE.Mesh(trimGeo, materials.brass)
    trim.position.set(0.0, 0.74, 0.0)
    tableGroup.add(trim)

    this.group.add(tableGroup)
  }

  /**
   * Zone B: Agent Operations Workstations (Codex, FCC, Expansion Bays)
   */
  private buildWorkstations(materials: MaterialLibrary): void {
    const workstationIds = [
      'codex-workstation',
      'fcc-workstation',
      'expansion-bay-3',
      'expansion-bay-4',
    ] as const

    for (const stId of workstationIds) {
      const station = STATION_DEFINITIONS[stId]
      const deskGroup = new THREE.Group()
      deskGroup.position.set(...station.position)
      deskGroup.name = `station:${station.id}`
      deskGroup.userData = { type: 'station', id: station.id, name: station.name }

      // Desktop walnut surface (2.2m x 1.1m x 0.08m)
      const topGeo = this.track(new THREE.BoxGeometry(2.2, 0.08, 1.1))
      const top = new THREE.Mesh(topGeo, materials.walnut)
      top.position.set(0.0, 0.8, 0.0)
      top.castShadow = true
      top.receiveShadow = true
      deskGroup.add(top)

      // Desk blotter / pad
      const padGeo = this.track(new THREE.BoxGeometry(1.6, 0.01, 0.7))
      const pad = new THREE.Mesh(padGeo, materials.limestoneDark)
      pad.position.set(0.0, 0.845, 0.05)
      pad.receiveShadow = true
      deskGroup.add(pad)

      // Solid walnut legs / pedestal supports
      const legGeo = this.track(new THREE.BoxGeometry(0.1, 0.8, 0.9))
      const leftLeg = new THREE.Mesh(legGeo, materials.walnut)
      leftLeg.position.set(-0.95, 0.4, 0.0)
      leftLeg.castShadow = true
      deskGroup.add(leftLeg)

      const rightLeg = new THREE.Mesh(legGeo, materials.walnut)
      rightLeg.position.set(0.95, 0.4, 0.0)
      rightLeg.castShadow = true
      deskGroup.add(rightLeg)

      // Dual monitor arm & display screens
      const standGeo = this.track(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8))
      const stand = new THREE.Mesh(standGeo, materials.brass)
      stand.position.set(0.0, 1.0, -0.35)
      deskGroup.add(stand)

      // Primary display screen (widescreen, neutral standby)
      const screen1Geo = this.track(new THREE.BoxGeometry(0.8, 0.45, 0.04))
      const screen1 = new THREE.Mesh(screen1Geo, materials.terminalScreen)
      screen1.position.set(-0.42, 1.18, -0.32)
      screen1.rotation.y = 0.08
      screen1.castShadow = true
      deskGroup.add(screen1)

      // Secondary display screen
      const screen2Geo = this.track(new THREE.BoxGeometry(0.8, 0.45, 0.04))
      const screen2 = new THREE.Mesh(screen2Geo, materials.terminalScreen)
      screen2.position.set(0.42, 1.18, -0.32)
      screen2.rotation.y = -0.08
      screen2.castShadow = true
      deskGroup.add(screen2)

      // Architectural chair block
      const chairGroup = new THREE.Group()
      chairGroup.position.set(0.0, 0.0, 0.65)
      const seatGeo = this.track(new THREE.BoxGeometry(0.55, 0.08, 0.5))
      const seat = new THREE.Mesh(seatGeo, materials.gunmetal)
      seat.position.set(0.0, 0.45, 0.0)
      seat.castShadow = true
      chairGroup.add(seat)

      const backGeo = this.track(new THREE.BoxGeometry(0.55, 0.5, 0.06))
      const back = new THREE.Mesh(backGeo, materials.walnut)
      back.position.set(0.0, 0.72, 0.22)
      back.castShadow = true
      chairGroup.add(back)

      const chairLegGeo = this.track(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8))
      const chairLeg = new THREE.Mesh(chairLegGeo, materials.brass)
      chairLeg.position.set(0.0, 0.225, 0.0)
      chairGroup.add(chairLeg)
      deskGroup.add(chairGroup)

      this.group.add(deskGroup)
    }
  }

  /**
   * Zone C: Verification Cleanroom Inspection Console
   */
  private buildVerifierConsole(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['verifier-console']
    const consoleGroup = new THREE.Group()
    consoleGroup.position.set(...station.position)
    consoleGroup.name = 'station:verifier-console'
    consoleGroup.userData = { type: 'station', id: station.id, name: station.name }

    // Cleanroom white/walnut composite inspection bench (2.8m x 1.1m x 0.85m)
    const topGeo = this.track(new THREE.BoxGeometry(2.8, 0.1, 1.1))
    const top = new THREE.Mesh(topGeo, materials.limestone)
    top.position.set(0.0, 0.8, 0.0)
    top.castShadow = true
    top.receiveShadow = true
    consoleGroup.add(top)

    const baseGeo = this.track(new THREE.BoxGeometry(2.6, 0.75, 0.9))
    const base = new THREE.Mesh(baseGeo, materials.walnut)
    base.position.set(0.0, 0.375, 0.0)
    base.castShadow = true
    consoleGroup.add(base)

    // Digital diff comparison monitor
    const monitorGeo = this.track(new THREE.BoxGeometry(1.2, 0.6, 0.05))
    const monitor = new THREE.Mesh(monitorGeo, materials.terminalScreen)
    monitor.position.set(0.0, 1.25, -0.3)
    monitor.castShadow = true
    consoleGroup.add(monitor)

    // Optical audit scanner plate
    const plateGeo = this.track(new THREE.BoxGeometry(0.8, 0.02, 0.5))
    const plate = new THREE.Mesh(plateGeo, materials.brass)
    plate.position.set(0.0, 0.86, 0.1)
    consoleGroup.add(plate)

    this.group.add(consoleGroup)
  }

  /**
   * Zone D: Browser QA Device Matrix Wall
   */
  private buildDeviceMatrixWall(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['browser-qa-matrix']
    const matrixGroup = new THREE.Group()
    matrixGroup.position.set(...station.position)
    matrixGroup.name = 'station:browser-qa-matrix'
    matrixGroup.userData = { type: 'station', id: station.id, name: station.name }

    // Vertical mounting backboard (3.2m wide x 2.2m high x 0.12m thick)
    const backboardGeo = this.track(new THREE.BoxGeometry(3.2, 2.2, 0.12))
    const backboard = new THREE.Mesh(backboardGeo, materials.walnut)
    backboard.position.set(0.0, 1.5, 0.0)
    backboard.castShadow = true
    backboard.receiveShadow = true
    matrixGroup.add(backboard)

    // Base equipment credenza
    const benchGeo = this.track(new THREE.BoxGeometry(3.2, 0.6, 0.6))
    const bench = new THREE.Mesh(benchGeo, materials.gunmetal)
    bench.position.set(0.0, 0.3, 0.25)
    bench.castShadow = true
    matrixGroup.add(bench)

    // Device 1: Desktop Viewport (1.3m x 0.75m screen)
    const desktopGeo = this.track(new THREE.BoxGeometry(1.3, 0.75, 0.03))
    const desktop = new THREE.Mesh(desktopGeo, materials.terminalScreen)
    desktop.position.set(-0.7, 1.6, 0.08)
    matrixGroup.add(desktop)

    // Device 2: Tablet Viewport (0.5m x 0.65m portrait screen)
    const tabletGeo = this.track(new THREE.BoxGeometry(0.5, 0.65, 0.03))
    const tablet = new THREE.Mesh(tabletGeo, materials.terminalScreen)
    tablet.position.set(0.4, 1.7, 0.08)
    matrixGroup.add(tablet)

    // Device 3: Mobile Viewport (0.28m x 0.52m phone screen)
    const mobileGeo = this.track(new THREE.BoxGeometry(0.28, 0.52, 0.03))
    const mobile = new THREE.Mesh(mobileGeo, materials.terminalScreen)
    mobile.position.set(1.05, 1.7, 0.08)
    matrixGroup.add(mobile)

    this.group.add(matrixGroup)
  }

  /**
   * Zone F: Approval Control Mezzanine Plinth
   */
  private buildApprovalPlinth(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['approval-plinth']
    const plinthGroup = new THREE.Group()
    plinthGroup.position.set(...station.position)
    plinthGroup.name = 'station:approval-plinth'
    plinthGroup.userData = { type: 'station', id: station.id, name: station.name }

    // Pedestal base (solid walnut block 1.2m x 0.9m x 0.85m)
    const baseGeo = this.track(new THREE.BoxGeometry(1.2, 0.85, 0.9))
    const base = new THREE.Mesh(baseGeo, materials.walnut)
    base.position.set(0.0, 0.425, 0.0)
    base.castShadow = true
    base.receiveShadow = true
    plinthGroup.add(base)

    // Brushed brass top plate
    const topGeo = this.track(new THREE.BoxGeometry(1.24, 0.04, 0.94))
    const top = new THREE.Mesh(topGeo, materials.brass)
    top.position.set(0.0, 0.87, 0.0)
    top.castShadow = true
    top.receiveShadow = true
    plinthGroup.add(top)

    // Archival candidate tablet resting on plinth
    const tabletGeo = this.track(new THREE.BoxGeometry(0.7, 0.02, 0.5))
    const tablet = new THREE.Mesh(tabletGeo, materials.vellum)
    tablet.position.set(0.0, 0.9, 0.0)
    tablet.receiveShadow = true
    plinthGroup.add(tablet)

    this.group.add(plinthGroup)
  }

  /**
   * Repository Vault Dock (Base branch landing station)
   */
  private buildRepositoryVault(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['repository-vault']
    const vaultGroup = new THREE.Group()
    vaultGroup.position.set(...station.position)
    vaultGroup.name = 'station:repository-vault'
    vaultGroup.userData = { type: 'station', id: station.id, name: station.name }

    // Sleek flush floor transit dock (1.6m x 0.04m x 1.6m)
    const dockGeo = this.track(new THREE.BoxGeometry(1.6, 0.04, 1.6))
    const dock = new THREE.Mesh(dockGeo, materials.gunmetal)
    dock.position.set(0.0, 0.02, 0.0)
    dock.receiveShadow = true
    vaultGroup.add(dock)

    // Brass edge boundary
    const borderGeo = this.track(new THREE.BoxGeometry(1.64, 0.02, 1.64))
    const border = new THREE.Mesh(borderGeo, materials.brass)
    border.position.set(0.0, 0.03, 0.0)
    vaultGroup.add(border)

    // Solid emerald confirmation indicator line
    const ledGeo = this.track(new THREE.BoxGeometry(1.4, 0.02, 0.08))
    const led = new THREE.Mesh(ledGeo, materials.statusSuccess)
    led.position.set(0.0, 0.045, -0.6)
    vaultGroup.add(led)

    this.group.add(vaultGroup)
  }

  public dispose(): void {
    for (const geom of this.geometriesToDispose) {
      geom.dispose()
    }
    this.geometriesToDispose.length = 0
  }
}
