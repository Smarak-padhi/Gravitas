/**
 * Infrastructure Room Geometry Generator for Gravitas 3D Headquarters
 * Represents OmniRoute gateways, model provider racks, and transport relays.
 * STRICT MANDATE: Gateways and models are infrastructure; never humanoid.
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../materials/materials.js'
import { STATION_DEFINITIONS } from '../world/stations.js'

export class HqInfrastructure {
  public readonly group: THREE.Group
  private readonly geometriesToDispose: THREE.BufferGeometry[] = []

  constructor(materials: MaterialLibrary) {
    this.group = new THREE.Group()
    this.group.name = 'hq-infrastructure'

    this.buildServerRacks(materials)
  }

  private track<T extends THREE.BufferGeometry>(geom: T): T {
    this.geometriesToDispose.push(geom)
    return geom
  }

  private buildServerRacks(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['omniroute-rack']
    const rackGroup = new THREE.Group()
    rackGroup.position.set(...station.position)
    rackGroup.name = 'station:omniroute-rack'
    rackGroup.userData = { type: 'station', id: station.id, name: station.name }

    // Dual 42U Server Cabinets (Rack 1: OmniRoute, Rack 2: Model Providers)
    const rackOffsets = [-1.0, 1.0]

    for (let i = 0; i < rackOffsets.length; i++) {
      const xOffset = rackOffsets[i]!
      const cabinetGroup = new THREE.Group()
      cabinetGroup.position.set(xOffset, 0.0, 0.0)

      // Main 42U cabinet frame (0.9m wide x 2.4m high x 1.0m deep)
      const frameGeo = this.track(new THREE.BoxGeometry(0.9, 2.4, 1.0))
      const frame = new THREE.Mesh(frameGeo, materials.gunmetal)
      frame.position.set(0.0, 1.2, 0.0)
      frame.castShadow = true
      frame.receiveShadow = true
      cabinetGroup.add(frame)

      // Perforated mesh front door (dark glass / mesh look)
      const doorGeo = this.track(new THREE.BoxGeometry(0.82, 2.25, 0.03))
      const door = new THREE.Mesh(doorGeo, materials.terminalScreen)
      door.position.set(0.0, 1.2, 0.51)
      cabinetGroup.add(door)

      // Vertical fiber-optic LED indicator strips
      const ledGeo = this.track(new THREE.BoxGeometry(0.03, 2.0, 0.01))
      const led = new THREE.Mesh(ledGeo, materials.statusRunning)
      led.position.set(0.35, 1.2, 0.53)
      cabinetGroup.add(led)

      // Top exhaust cowl
      const cowlGeo = this.track(new THREE.BoxGeometry(0.94, 0.08, 1.04))
      const cowl = new THREE.Mesh(cowlGeo, materials.walnut)
      cowl.position.set(0.0, 2.44, 0.0)
      cabinetGroup.add(cowl)

      rackGroup.add(cabinetGroup)
    }

    // Floor cable tray / conduit connection
    const trayGeo = this.track(new THREE.BoxGeometry(3.2, 0.04, 0.4))
    const tray = new THREE.Mesh(trayGeo, materials.brass)
    tray.position.set(0.0, 0.02, -0.7)
    rackGroup.add(tray)

    this.group.add(rackGroup)
  }

  public dispose(): void {
    for (const geom of this.geometriesToDispose) {
      geom.dispose()
    }
    this.geometriesToDispose.length = 0
  }
}
