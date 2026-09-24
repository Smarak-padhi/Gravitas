/**
 * Infrastructure Room Geometry Generator for Gravitas 3D Headquarters
 * Represents OmniRoute gateways and model provider racks with recognizable physical
 * details: 42U server slots, vertical rails, ventilation, cable ladder trays, and PDU base.
 * Strictly non-humanoid infrastructure.
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../materials/materials.js'
import { STATION_DEFINITIONS } from '../world/stations.js'

export class HqInfrastructure {
  public readonly group: THREE.Group
  private readonly geometriesToDispose: THREE.BufferGeometry[] = []
  private readonly materials: MaterialLibrary
  private gatewayLedMesh: THREE.Mesh | null = null
  private connectorLedMesh: THREE.Mesh | null = null
  private dispatchLedMesh: THREE.Mesh | null = null

  constructor(materials: MaterialLibrary) {
    this.materials = materials
    this.group = new THREE.Group()
    this.group.name = 'hq-infrastructure'

    this.buildServerRacks(materials)
    this.buildDispatchConsole(materials)
  }

  private track<T extends THREE.BufferGeometry>(geom: T): T {
    this.geometriesToDispose.push(geom)
    return geom
  }

  private buildServerRacks(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['omniroute-rack']
    const rackGroup = new THREE.Group()
    rackGroup.position.set(-8.8, 0.0, -5.8)
    rackGroup.name = 'station:omniroute-rack'
    rackGroup.userData = { type: 'station', id: station.id, name: station.name }

    // 1. Raised Access Floor Platform (Anti-Static Equipment Area)
    const floorPlatformGeo = this.track(new THREE.BoxGeometry(4.8, 0.06, 3.8))
    const floorPlatform = new THREE.Mesh(floorPlatformGeo, materials.limestoneDark)
    floorPlatform.position.set(0.0, 0.03, 0.4)
    floorPlatform.receiveShadow = true
    rackGroup.add(floorPlatform)

    // Floor Platform Beveled Edge Trim (Brushed Aluminum / Steel)
    const floorTrimGeo = this.track(new THREE.BoxGeometry(4.88, 0.02, 3.88))
    const floorTrim = new THREE.Mesh(floorTrimGeo, materials.gunmetal)
    floorTrim.position.set(0.0, 0.06, 0.4)
    rackGroup.add(floorTrim)

    // Floor Grid Seam Lines (0.6m tile seams)
    const seamMat = materials.limestonePlinth
    for (let gx = -2.1; gx <= 2.1; gx += 0.6) {
      const seamGeo = this.track(new THREE.BoxGeometry(0.015, 0.005, 3.7))
      const seam = new THREE.Mesh(seamGeo, seamMat)
      seam.position.set(gx, 0.065, 0.4)
      rackGroup.add(seam)
    }

    // 2. Equipment Pad / Heavy PDU Plinth (dark graphite with brass rim)
    const plinthGeo = this.track(new THREE.BoxGeometry(3.6, 0.12, 1.8))
    const plinth = new THREE.Mesh(plinthGeo, materials.limestoneDark)
    plinth.position.set(0.0, 0.12, 0.0)
    plinth.receiveShadow = true
    rackGroup.add(plinth)

    const plinthRimGeo = this.track(new THREE.BoxGeometry(3.66, 0.02, 1.86))
    const plinthRim = new THREE.Mesh(plinthRimGeo, materials.brass)
    plinthRim.position.set(0.0, 0.18, 0.0)
    rackGroup.add(plinthRim)

    // 3. Equipment Wall Backplane & Vertical Conduit Risers
    const wallBackplaneGeo = this.track(new THREE.BoxGeometry(3.8, 2.8, 0.1))
    const wallBackplane = new THREE.Mesh(wallBackplaneGeo, materials.limestonePlinth)
    wallBackplane.position.set(0.0, 1.4, -0.85)
    wallBackplane.receiveShadow = true
    rackGroup.add(wallBackplane)

    const riserOffsets = [-1.4, -0.4, 0.4, 1.4]
    for (const ro of riserOffsets) {
      const riserGeo = this.track(new THREE.BoxGeometry(0.12, 2.6, 0.12))
      const riser = new THREE.Mesh(riserGeo, materials.gunmetal)
      riser.position.set(ro, 1.35, -0.78)
      riser.castShadow = true
      rackGroup.add(riser)
    }

    // Dual 42U Server Cabinets: Rack 01 (OmniRoute Gateway), Rack 02 (Connector Bay / External Capabilities)
    const rackOffsets = [-0.85, 0.85]
    for (let i = 0; i < rackOffsets.length; i++) {
      const rx = rackOffsets[i]!
      const cabinetGroup = new THREE.Group()
      cabinetGroup.position.set(rx, 0.18, 0.0)

      // 1. 42U Steel Cabinet Outer Housing (1.1m wide x 2.3m high x 1.1m deep)
      const frameGeo = this.track(new THREE.BoxGeometry(1.1, 2.3, 1.1))
      const frame = new THREE.Mesh(frameGeo, materials.gunmetal)
      frame.position.set(0.0, 1.15, 0.0)
      frame.castShadow = true
      frame.receiveShadow = true
      cabinetGroup.add(frame)

      // Top Cable Ingress Cowl / Vent Hood
      const cowlGeo = this.track(new THREE.BoxGeometry(1.14, 0.06, 1.14))
      const cowl = new THREE.Mesh(cowlGeo, materials.gunmetal)
      cowl.position.set(0.0, 2.33, 0.0)
      cowl.castShadow = true
      cabinetGroup.add(cowl)

      // 2. Front Server Face with procedural 1U/2U server slots & ventilation
      const faceGeo = this.track(new THREE.BoxGeometry(0.96, 2.14, 0.02))
      const face = new THREE.Mesh(faceGeo, materials.serverRackFace)
      face.position.set(0.0, 1.15, 0.555)
      cabinetGroup.add(face)

      // 3. Modular Server Blade Bezels (1U / 2U chassis drawers)
      const bladeHeights = [0.35, 0.75, 1.15, 1.55, 1.95]
      for (const by of bladeHeights) {
        const bladeGeo = this.track(new THREE.BoxGeometry(0.92, 0.16, 0.025))
        const blade = new THREE.Mesh(bladeGeo, materials.limestoneDark)
        blade.position.set(0.0, by, 0.565)
        cabinetGroup.add(blade)

        // Brass server extraction handle
        const handleGeo = this.track(new THREE.BoxGeometry(0.24, 0.015, 0.02))
        const bladeHandle = new THREE.Mesh(handleGeo, materials.brass)
        bladeHandle.position.set(0.0, by, 0.58)
        cabinetGroup.add(bladeHandle)

        // Status micro-LED indicator
        const dotGeo = this.track(new THREE.BoxGeometry(0.015, 0.015, 0.015))
        const dot = new THREE.Mesh(dotGeo, i === 0 ? materials.statusRunning : materials.statusReady)
        dot.position.set(0.38, by, 0.58)
        cabinetGroup.add(dot)
      }

      // If Rack 01 (OmniRoute), mount the authoritative activity LED bar
      if (i === 0) {
        const ledGeo = this.track(new THREE.BoxGeometry(0.88, 0.03, 0.02))
        this.gatewayLedMesh = new THREE.Mesh(ledGeo, materials.gunmetal)
        this.gatewayLedMesh.position.set(0.0, 2.15, 0.57)
        this.gatewayLedMesh.name = 'omniroute-activity-led'
        cabinetGroup.add(this.gatewayLedMesh)
      } else if (i === 1) {
        // Rack 02: External Service Capability Connector Bay LED bar
        const ledGeo = this.track(new THREE.BoxGeometry(0.88, 0.03, 0.02))
        this.connectorLedMesh = new THREE.Mesh(ledGeo, materials.statusReady)
        this.connectorLedMesh.position.set(0.0, 2.15, 0.57)
        this.connectorLedMesh.name = 'connector-activity-led'
        cabinetGroup.add(this.connectorLedMesh)
      }

      // Vertical Brushed Brass Mounting Rails
      const railGeo = this.track(new THREE.BoxGeometry(0.04, 2.16, 0.03))
      const railLeft = new THREE.Mesh(railGeo, materials.brass)
      railLeft.position.set(-0.48, 1.15, 0.57)
      cabinetGroup.add(railLeft)

      const railRight = new THREE.Mesh(railGeo, materials.brass)
      railRight.position.set(0.48, 1.15, 0.57)
      cabinetGroup.add(railRight)

      // Smoked Glass Door with Dark Frame
      const doorGeo = this.track(new THREE.BoxGeometry(0.98, 2.18, 0.02))
      const door = new THREE.Mesh(doorGeo, materials.glassDark)
      door.position.set(0.0, 1.15, 0.6)
      cabinetGroup.add(door)

      // Brass door handle
      const handleGeo = this.track(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8))
      const handle = new THREE.Mesh(handleGeo, materials.brass)
      handle.position.set(0.42, 1.15, 0.62)
      cabinetGroup.add(handle)

      rackGroup.add(cabinetGroup)
    }

    // Overhead Cable Ladder Tray bridging from rack top to main floor conduit
    const trayGeo = this.track(new THREE.BoxGeometry(3.6, 0.08, 0.6))
    const tray = new THREE.Mesh(trayGeo, materials.gunmetal)
    tray.position.set(0.0, 2.65, 0.0)
    tray.castShadow = true
    rackGroup.add(tray)

    const trayStrutGeo = this.track(new THREE.BoxGeometry(0.03, 0.04, 0.58))
    for (let tx = -1.6; tx <= 1.6; tx += 0.4) {
      const strut = new THREE.Mesh(trayStrutGeo, materials.brass)
      strut.position.set(tx, 2.67, 0.0)
      rackGroup.add(strut)
    }

    // Overhead HVAC Cooling Ducts (Utility ceiling run)
    const ductGeo = this.track(new THREE.CylinderGeometry(0.16, 0.16, 4.4, 16))
    const duct = new THREE.Mesh(ductGeo, materials.gunmetal)
    duct.rotation.z = Math.PI / 2
    duct.position.set(0.0, 2.95, -0.4)
    duct.castShadow = true
    rackGroup.add(duct)

    const ductBandGeo = this.track(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 16))
    for (let dx = -1.8; dx <= 1.8; dx += 0.9) {
      const band = new THREE.Mesh(ductBandGeo, materials.brass)
      band.rotation.z = Math.PI / 2
      band.position.set(dx, 2.95, -0.4)
      rackGroup.add(band)
    }

    this.group.add(rackGroup)
  }

  private buildDispatchConsole(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['dispatch-console']
    const consoleGroup = new THREE.Group()
    consoleGroup.position.set(station.position[0], station.position[1], station.position[2])
    consoleGroup.rotation.y = station.rotationY
    consoleGroup.name = 'station:dispatch-console'
    consoleGroup.userData = { type: 'station', id: station.id, name: station.name }

    // 1. Plinth Base
    const baseGeo = this.track(new THREE.BoxGeometry(1.4, 0.12, 1.0))
    const baseMesh = new THREE.Mesh(baseGeo, materials.limestoneDark)
    baseMesh.position.set(0.0, 0.06, 0.0)
    baseMesh.receiveShadow = true
    consoleGroup.add(baseMesh)

    const baseRimGeo = this.track(new THREE.BoxGeometry(1.44, 0.02, 1.04))
    const baseRim = new THREE.Mesh(baseRimGeo, materials.brass)
    baseRim.position.set(0.0, 0.12, 0.0)
    consoleGroup.add(baseRim)

    // 2. Heavy Gunmetal Console Column/Pedestal
    const columnGeo = this.track(new THREE.BoxGeometry(1.1, 0.82, 0.7))
    const column = new THREE.Mesh(columnGeo, materials.gunmetal)
    column.position.set(0.0, 0.54, 0.0)
    column.castShadow = true
    column.receiveShadow = true
    consoleGroup.add(column)

    // 3. Tilted Control Deck / Console Surface (angled towards operator)
    const deckGroup = new THREE.Group()
    deckGroup.position.set(0.0, 0.95, 0.0)
    deckGroup.rotation.x = -0.35

    const deckGeo = this.track(new THREE.BoxGeometry(1.2, 0.06, 0.75))
    const deck = new THREE.Mesh(deckGeo, materials.gunmetal)
    deck.castShadow = true
    deckGroup.add(deck)

    // Brass edge trim on desk surface
    const deckTrimGeo = this.track(new THREE.BoxGeometry(1.24, 0.02, 0.04))
    const deckTrim = new THREE.Mesh(deckTrimGeo, materials.brass)
    deckTrim.position.set(0.0, 0.03, 0.38)
    deckGroup.add(deckTrim)

    // Terminal Monitor / HUD display screen face
    const screenGeo = this.track(new THREE.BoxGeometry(1.0, 0.01, 0.45))
    const screen = new THREE.Mesh(screenGeo, materials.glassDark)
    screen.position.set(0.0, 0.035, -0.05)
    deckGroup.add(screen)

    // Status LED indicator bar across the top of screen
    const ledGeo = this.track(new THREE.BoxGeometry(0.9, 0.02, 0.03))
    this.dispatchLedMesh = new THREE.Mesh(ledGeo, materials.statusReady)
    this.dispatchLedMesh.position.set(0.0, 0.045, -0.3)
    this.dispatchLedMesh.name = 'dispatch-console-led'
    deckGroup.add(this.dispatchLedMesh)

    consoleGroup.add(deckGroup)
    this.group.add(consoleGroup)
  }

  public setGatewayActivity(
    active: boolean,
    warning?: { providerFallbackOccurred: boolean; transportFallbackOccurred: boolean }
  ): void {
    if (!this.gatewayLedMesh) return
    if (active) {
      if (warning?.providerFallbackOccurred || warning?.transportFallbackOccurred) {
        this.gatewayLedMesh.material = this.materials.statusWaiting
      } else {
        this.gatewayLedMesh.material = this.materials.statusRunning
      }
    } else {
      this.gatewayLedMesh.material = this.materials.gunmetal
    }
  }

  public setDispatchActivity(status: string): void {
    if (!this.dispatchLedMesh) return
    if (status === 'ACTIVE') {
      this.dispatchLedMesh.material = this.materials.statusRunning
    } else if (status === 'WAITING_APPROVAL') {
      this.dispatchLedMesh.material = this.materials.statusWaiting
    } else if (status === 'FAILED') {
      this.dispatchLedMesh.material = this.materials.statusFailure
    } else {
      this.dispatchLedMesh.material = this.materials.statusReady
    }
  }

  public setConnectorActivity(
    status: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING' | 'ERROR' | 'IDLE'
  ): void {
    if (!this.connectorLedMesh) return
    if (status === 'SYNCING') {
      this.connectorLedMesh.material = this.materials.statusRunning
    } else if (status === 'CONNECTED' || status === 'IDLE') {
      this.connectorLedMesh.material = this.materials.statusReady
    } else if (status === 'ERROR') {
      this.connectorLedMesh.material = this.materials.statusFailure
    } else {
      this.connectorLedMesh.material = this.materials.gunmetal
    }
  }

  public dispose(): void {
    for (const geom of this.geometriesToDispose) {
      geom.dispose()
    }
    this.geometriesToDispose.length = 0
    this.gatewayLedMesh = null
    this.connectorLedMesh = null
    this.dispatchLedMesh = null
  }
}
