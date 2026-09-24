/**
 * Furniture & Prototype Station Geometry Generator for Gravitas 3D Headquarters
 * Architectural miniature furniture with chamfered edges, dual curved monitors,
 * multi-device QA matrix, ergonomic task chairs, and dormant technical displays.
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../materials/materials.js'
import type { StationId } from '../types.js'
import type { StationStatus } from '../world/worldState.js'
import { STATION_DEFINITIONS } from '../world/stations.js'

export class HqFurniture {
  public readonly group: THREE.Group
  public readonly stationIndicators = new Map<StationId, THREE.Mesh>()
  public readonly stationScreens = new Map<StationId, THREE.Mesh[]>()
  private readonly geometriesToDispose: THREE.BufferGeometry[] = []
  private readonly materials: MaterialLibrary

  constructor(materials: MaterialLibrary) {
    this.materials = materials
    this.group = new THREE.Group()
    this.group.name = 'hq-furniture'

    this.buildMissionPlanningTable(materials)
    this.buildAgentWorkstations(materials)
    this.buildVerificationConsole(materials)
    this.buildBrowserQaDeviceMatrix(materials)
    this.buildApprovalMezzaninePlinth(materials)
    this.buildRepositoryVault(materials)
    this.buildOfficeLifeProps(materials)
  }

  private track<T extends THREE.BufferGeometry>(geom: T): T {
    this.geometriesToDispose.push(geom)
    return geom
  }

  /**
   * Zone A: Mission Control Planning Table (4.0m x 2.2m x 0.85m)
   * The architectural planning heart: chamfered walnut frame, illuminated vellum blueprint DAG.
   */
  private buildMissionPlanningTable(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['planning-table']
    const tableGroup = new THREE.Group()
    tableGroup.position.set(-4.5, 0.0, 5.5)
    tableGroup.name = 'station:planning-table'
    tableGroup.userData = { type: 'station', id: station.id, name: station.name }

    // Chamfered walnut table base frame
    const baseGeo = this.track(new THREE.BoxGeometry(3.6, 0.14, 2.0))
    const base = new THREE.Mesh(baseGeo, materials.walnut)
    base.position.set(0.0, 0.78, 0.0)
    base.castShadow = true
    base.receiveShadow = true
    tableGroup.add(base)

    // Brushed brass beveled perimeter rim
    const rimGeo = this.track(new THREE.BoxGeometry(3.66, 0.04, 2.06))
    const rim = new THREE.Mesh(rimGeo, materials.brass)
    rim.position.set(0.0, 0.85, 0.0)
    rim.castShadow = true
    tableGroup.add(rim)

    // Illuminated Blueprint DAG Grid Surface
    const surfaceGeo = this.track(new THREE.BoxGeometry(3.4, 0.02, 1.8))
    const surface = new THREE.Mesh(surfaceGeo, materials.vellum)
    surface.position.set(0.0, 0.87, 0.0)
    surface.receiveShadow = true
    tableGroup.add(surface)

    // Architectural angled walnut pedestal legs
    const legPositions = [
      [-1.4, 0.38, -0.75],
      [1.4, 0.38, -0.75],
      [-1.4, 0.38, 0.75],
      [1.4, 0.38, 0.75],
    ]

    for (const [lx, ly, lz] of legPositions) {
      const legGeo = this.track(new THREE.BoxGeometry(0.18, 0.76, 0.18))
      const leg = new THREE.Mesh(legGeo, materials.walnut)
      leg.position.set(lx!, ly!, lz!)
      leg.castShadow = true
      leg.receiveShadow = true
      tableGroup.add(leg)

      // Brass foot pad
      const footGeo = this.track(new THREE.BoxGeometry(0.22, 0.04, 0.22))
      const foot = new THREE.Mesh(footGeo, materials.brass)
      foot.position.set(lx!, 0.02, lz!)
      tableGroup.add(foot)
    }

    // Peripheral dormant interface slates (inactive tablets resting on table corners)
    const slate1Geo = this.track(new THREE.BoxGeometry(0.35, 0.015, 0.24))
    const slate1 = new THREE.Mesh(slate1Geo, materials.terminalScreen)
    slate1.position.set(-1.3, 0.88, 0.65)
    slate1.rotation.y = 0.25
    tableGroup.add(slate1)

    const slate2 = new THREE.Mesh(slate1Geo, materials.terminalScreenAmber)
    slate2.position.set(1.25, 0.88, -0.6)
    slate2.rotation.y = -0.3
    tableGroup.add(slate2)

    // Authoritative Station Status Indicator Lens
    const indGeo = this.track(new THREE.BoxGeometry(0.3, 0.02, 0.06))
    const ind = new THREE.Mesh(indGeo, materials.gunmetal)
    ind.position.set(0.0, 0.88, 0.96)
    ind.name = 'station-indicator:planning-table'
    tableGroup.add(ind)
    this.stationIndicators.set('planning-table', ind)

    this.group.add(tableGroup)
  }

  /**
   * Zone B: Agent Operations Workstations (Codex, FCC, Expansion Bays 03 & 04)
   * Premium modular drafting stations with dual curved monitors, cable management,
   * ergonomic task chairs, and personal desk dividers.
   */
  private buildAgentWorkstations(materials: MaterialLibrary): void {
    const stationsConfig = [
      {
        id: 'codex-workstation',
        pos: [-6.5, 0.0, 1.2],
        matColor: materials.terminalScreen, // Slate cyan code display
      },
      {
        id: 'fcc-workstation',
        pos: [-1.8, 0.0, 1.2],
        matColor: materials.terminalScreenAmber, // Warm amber architectural display
      },
      {
        id: 'expansion-bay-3',
        pos: [-6.5, 0.0, -2.4],
        matColor: materials.terminalScreenEmerald, // Standby telemetry display
      },
      {
        id: 'expansion-bay-4',
        pos: [-1.8, 0.0, -2.4],
        matColor: materials.terminalScreen, // Standby display
      },
    ]

    for (const cfg of stationsConfig) {
      const stationDef = STATION_DEFINITIONS[cfg.id as keyof typeof STATION_DEFINITIONS]
      const podGroup = new THREE.Group()
      podGroup.position.set(cfg.pos[0]!, cfg.pos[1]!, cfg.pos[2]!)
      podGroup.name = `station:${stationDef.id}`
      podGroup.userData = { type: 'station', id: stationDef.id, name: stationDef.name }

      // Authoritative Station Status Light Lens
      const indGeo = this.track(new THREE.BoxGeometry(0.24, 0.02, 0.04))
      const ind = new THREE.Mesh(indGeo, materials.gunmetal)
      ind.position.set(0.0, 0.76, 0.48)
      ind.name = `station-indicator:${stationDef.id}`
      podGroup.add(ind)
      this.stationIndicators.set(stationDef.id, ind)

      // 1. Walnut Desktop Slab (2.2m x 1.0m x 0.08m)
      const deskGeo = this.track(new THREE.BoxGeometry(2.2, 0.08, 1.0))
      const desk = new THREE.Mesh(deskGeo, materials.walnut)
      desk.position.set(0.0, 0.72, 0.0)
      desk.castShadow = true
      desk.receiveShadow = true
      podGroup.add(desk)

      // Brass front edge chamfer trim
      const trimGeo = this.track(new THREE.BoxGeometry(2.22, 0.02, 0.04))
      const trim = new THREE.Mesh(trimGeo, materials.brass)
      trim.position.set(0.0, 0.75, 0.49)
      podGroup.add(trim)

      // Desk frame trestle legs (gunmetal steel)
      const legLeftGeo = this.track(new THREE.BoxGeometry(0.08, 0.7, 0.8))
      const legLeft = new THREE.Mesh(legLeftGeo, materials.gunmetal)
      legLeft.position.set(-0.95, 0.35, 0.0)
      legLeft.castShadow = true
      podGroup.add(legLeft)

      const legRight = new THREE.Mesh(legLeftGeo, materials.gunmetal)
      legRight.position.set(0.95, 0.35, 0.0)
      legRight.castShadow = true
      podGroup.add(legRight)

      // Rear acoustic modesty panel (walnut)
      const panelGeo = this.track(new THREE.BoxGeometry(1.9, 0.38, 0.04))
      const panel = new THREE.Mesh(panelGeo, materials.walnut)
      panel.position.set(0.0, 0.5, -0.42)
      podGroup.add(panel)

      // 2. Dual Beveled Monitors
      // Primary center display
      const mon1FrameGeo = this.track(new THREE.BoxGeometry(0.9, 0.52, 0.04))
      const mon1Frame = new THREE.Mesh(mon1FrameGeo, materials.gunmetal)
      mon1Frame.position.set(-0.35, 1.15, -0.28)
      mon1Frame.castShadow = true
      podGroup.add(mon1Frame)

      const mon1ScreenGeo = this.track(new THREE.BoxGeometry(0.86, 0.48, 0.01))
      const mon1Screen = new THREE.Mesh(mon1ScreenGeo, cfg.matColor)
      mon1Screen.position.set(-0.35, 1.15, -0.255)
      podGroup.add(mon1Screen)

      // Secondary angled display
      const mon2Frame = new THREE.Mesh(mon1FrameGeo, materials.gunmetal)
      mon2Frame.position.set(0.55, 1.15, -0.24)
      mon2Frame.rotation.y = -0.26
      mon2Frame.castShadow = true
      podGroup.add(mon2Frame)

      const mon2Screen = new THREE.Mesh(mon1ScreenGeo, materials.terminalScreen)
      mon2Screen.position.set(0.55, 1.15, -0.215)
      mon2Screen.rotation.y = -0.26
      podGroup.add(mon2Screen)

      // Articulated monitor mounting arms (brass & gunmetal)
      const armGeo = this.track(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8))
      const arm = new THREE.Mesh(armGeo, materials.brass)
      arm.position.set(0.0, 0.95, -0.32)
      podGroup.add(arm)

      // Compact keyboard & precision mouse mat
      const matGeo = this.track(new THREE.BoxGeometry(0.85, 0.005, 0.32))
      const mat = new THREE.Mesh(matGeo, materials.limestoneDark)
      mat.position.set(0.0, 0.765, 0.18)
      podGroup.add(mat)

      const kbGeo = this.track(new THREE.BoxGeometry(0.42, 0.012, 0.14))
      const kb = new THREE.Mesh(kbGeo, materials.gunmetal)
      kb.position.set(-0.1, 0.772, 0.18)
      podGroup.add(kb)

      // Modern Ultra-Thin Laptop (clamshell open at 110 deg)
      const laptopBaseGeo = this.track(new THREE.BoxGeometry(0.34, 0.012, 0.23))
      const laptopBase = new THREE.Mesh(laptopBaseGeo, materials.gunmetal)
      laptopBase.position.set(0.65, 0.768, 0.15)
      laptopBase.rotation.y = -0.18
      podGroup.add(laptopBase)

      const laptopKbGeo = this.track(new THREE.BoxGeometry(0.30, 0.005, 0.11))
      const laptopKb = new THREE.Mesh(laptopKbGeo, materials.structureGraphite)
      laptopKb.position.set(0.65, 0.775, 0.12)
      laptopKb.rotation.y = -0.18
      podGroup.add(laptopKb)

      const laptopLidGeo = this.track(new THREE.BoxGeometry(0.34, 0.22, 0.01))
      const laptopLid = new THREE.Mesh(laptopLidGeo, materials.gunmetal)
      laptopLid.position.set(0.65, 0.88, 0.035)
      laptopLid.rotation.y = -0.18
      laptopLid.rotation.x = -0.22
      podGroup.add(laptopLid)

      const laptopScreenGeo = this.track(new THREE.BoxGeometry(0.32, 0.20, 0.002))
      const laptopScreen = new THREE.Mesh(laptopScreenGeo, materials.deviceLaptop)
      laptopScreen.position.set(0.65, 0.88, 0.042)
      laptopScreen.rotation.y = -0.18
      laptopLid.rotation.x = -0.22
      podGroup.add(laptopScreen)

      this.stationScreens.set(stationDef.id, [mon1Screen, mon2Screen, laptopScreen])

      // Ceramic Coffee Mug
      const mugGeo = this.track(new THREE.CylinderGeometry(0.038, 0.034, 0.085, 12))
      const mug = new THREE.Mesh(mugGeo, materials.planterCeramic)
      mug.position.set(-0.75, 0.805, 0.25)
      podGroup.add(mug)

      // Brass Desk Task Lamp with warm glow
      const lampBaseGeo = this.track(new THREE.CylinderGeometry(0.065, 0.065, 0.015, 12))
      const lampBase = new THREE.Mesh(lampBaseGeo, materials.champagneBrass)
      lampBase.position.set(-0.85, 0.768, -0.24)
      podGroup.add(lampBase)

      const lampArmGeo = this.track(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 8))
      const lampArm = new THREE.Mesh(lampArmGeo, materials.champagneBrass)
      lampArm.position.set(-0.82, 0.94, -0.2)
      lampArm.rotation.z = -0.2
      podGroup.add(lampArm)

      const lampShadeGeo = this.track(new THREE.ConeGeometry(0.07, 0.11, 12))
      const lampShade = new THREE.Mesh(lampShadeGeo, materials.champagneBrass)
      lampShade.position.set(-0.76, 1.1, -0.15)
      lampShade.rotation.z = Math.PI - 0.3
      podGroup.add(lampShade)

      const bulbGeo = this.track(new THREE.SphereGeometry(0.02, 8, 8))
      const bulb = new THREE.Mesh(bulbGeo, materials.lampWarmGlow)
      bulb.position.set(-0.76, 1.08, -0.15)
      podGroup.add(bulb)

      // 3. Ergonomic Task Chair
      const chairGroup = new THREE.Group()
      chairGroup.position.set(0.0, 0.0, 0.65)

      // Star base with casters
      const baseHubGeo = this.track(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8))
      const baseHub = new THREE.Mesh(baseHubGeo, materials.gunmetal)
      baseHub.position.set(0.0, 0.1, 0.0)
      chairGroup.add(baseHub)

      const gasCylinderGeo = this.track(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8))
      const gasCylinder = new THREE.Mesh(gasCylinderGeo, materials.brass)
      gasCylinder.position.set(0.0, 0.28, 0.0)
      chairGroup.add(gasCylinder)

      // Contoured seat cushion
      const seatGeo = this.track(new THREE.BoxGeometry(0.48, 0.06, 0.46))
      const seat = new THREE.Mesh(seatGeo, materials.charSuitDark)
      seat.position.set(0.0, 0.46, 0.0)
      seat.castShadow = true
      chairGroup.add(seat)

      // Curved ergonomic lumbar backrest
      const backGeo = this.track(new THREE.BoxGeometry(0.44, 0.48, 0.05))
      const back = new THREE.Mesh(backGeo, materials.charSuitDark)
      back.position.set(0.0, 0.74, 0.21)
      back.castShadow = true
      chairGroup.add(back)

      // Armrests
      const armrestGeo = this.track(new THREE.BoxGeometry(0.06, 0.18, 0.26))
      const armLeft = new THREE.Mesh(armrestGeo, materials.gunmetal)
      armLeft.position.set(-0.25, 0.56, 0.05)
      chairGroup.add(armLeft)

      const armRight = new THREE.Mesh(armrestGeo, materials.gunmetal)
      armRight.position.set(0.25, 0.56, 0.05)
      chairGroup.add(armRight)

      podGroup.add(chairGroup)
      this.group.add(podGroup)
    }
  }

  /**
   * Zone C: Verification Cleanroom Console & Inspection Bench
   */
  private buildVerificationConsole(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['verifier-console']
    const consoleGroup = new THREE.Group()
    consoleGroup.position.set(6.0, 0.1, 6.5)
    consoleGroup.name = 'station:verifier-console'
    consoleGroup.userData = { type: 'station', id: station.id, name: station.name }

    // Honed mineral cleanroom console bench (3.2m x 0.9m x 0.95m standing height)
    const benchGeo = this.track(new THREE.BoxGeometry(3.2, 0.1, 0.9))
    const bench = new THREE.Mesh(benchGeo, materials.limestonePlinth)
    bench.position.set(0.0, 0.95, 0.0)
    bench.castShadow = true
    bench.receiveShadow = true
    consoleGroup.add(bench)

    // Brushed brass perimeter channel
    const trimGeo = this.track(new THREE.BoxGeometry(3.24, 0.03, 0.94))
    const trim = new THREE.Mesh(trimGeo, materials.brass)
    trim.position.set(0.0, 0.99, 0.0)
    consoleGroup.add(trim)

    // Solid pedestal supports (dark graphite)
    const pedGeo = this.track(new THREE.BoxGeometry(0.7, 0.9, 0.7))
    const pedLeft = new THREE.Mesh(pedGeo, materials.gunmetal)
    pedLeft.position.set(-1.1, 0.45, 0.0)
    pedLeft.castShadow = true
    consoleGroup.add(pedLeft)

    const pedRight = new THREE.Mesh(pedGeo, materials.gunmetal)
    pedRight.position.set(1.1, 0.45, 0.0)
    pedRight.castShadow = true
    consoleGroup.add(pedRight)

    // Triple Verification Displays (Diff view, Test Execution, Mutation Gate)
    const screenOffsets = [-0.95, 0.0, 0.95]
    for (let i = 0; i < screenOffsets.length; i++) {
      const sx = screenOffsets[i]!
      const rot = i === 0 ? 0.18 : i === 2 ? -0.18 : 0.0

      const monFrameGeo = this.track(new THREE.BoxGeometry(0.82, 0.5, 0.04))
      const monFrame = new THREE.Mesh(monFrameGeo, materials.gunmetal)
      monFrame.position.set(sx, 1.38, 0.22)
      monFrame.rotation.y = -rot
      monFrame.castShadow = true
      consoleGroup.add(monFrame)

      const screenMat = i === 1 ? materials.terminalScreenEmerald : materials.terminalScreen
      const monScreenGeo = this.track(new THREE.BoxGeometry(0.78, 0.46, 0.01))
      const monScreen = new THREE.Mesh(monScreenGeo, screenMat)
      monScreen.position.set(sx, 1.38, 0.195)
      monScreen.rotation.y = -rot
      consoleGroup.add(monScreen)
    }

    // Authoritative Verifier Station Indicator
    const indGeo = this.track(new THREE.BoxGeometry(0.3, 0.02, 0.06))
    const ind = new THREE.Mesh(indGeo, materials.gunmetal)
    ind.position.set(0.0, 1.01, 0.42)
    ind.name = 'station-indicator:verifier-console'
    consoleGroup.add(ind)
    this.stationIndicators.set('verifier-console', ind)

    this.group.add(consoleGroup)
  }

  /**
   * Zone D: Browser QA Multi-Device Matrix Wall & Test Rig
   * REPLACES the monolithic black block with recognizable physical device viewports:
   * 1. Ultrawide Desktop (34-inch ratio)
   * 2. Laptop display (15-inch ratio)
   * 3. Tablet in portrait
   * 4. Smartphone in portrait
   * Mounted onto an architectural testing rig frame with observation bench.
   */
  private buildBrowserQaDeviceMatrix(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['browser-qa-matrix']
    const qaGroup = new THREE.Group()
    qaGroup.position.set(6.2, 0.1, -0.5)
    qaGroup.name = 'station:browser-qa-matrix'
    qaGroup.userData = { type: 'station', id: station.id, name: station.name }

    // Architectural aluminum / graphite test rig armature frame
    const rigFrameGeo = this.track(new THREE.BoxGeometry(4.8, 2.2, 0.08))
    const rigFrame = new THREE.Mesh(rigFrameGeo, materials.gunmetal)
    rigFrame.position.set(0.0, 1.4, -1.2)
    rigFrame.castShadow = true
    qaGroup.add(rigFrame)

    // Brass accent mounting rails across rig
    for (const ry of [0.75, 1.4, 2.1]) {
      const railGeo = this.track(new THREE.BoxGeometry(4.84, 0.03, 0.12))
      const rail = new THREE.Mesh(railGeo, materials.brass)
      rail.position.set(0.0, ry, -1.2)
      qaGroup.add(rail)
    }

    // 1. Device A: Ultrawide Desktop Monitor (Left, 1.4m x 0.6m)
    const dtFrameGeo = this.track(new THREE.BoxGeometry(1.4, 0.62, 0.04))
    const dtFrame = new THREE.Mesh(dtFrameGeo, materials.gunmetal)
    dtFrame.position.set(-1.4, 1.7, -1.1)
    dtFrame.castShadow = true
    qaGroup.add(dtFrame)

    const dtScreenGeo = this.track(new THREE.BoxGeometry(1.36, 0.58, 0.01))
    const dtScreen = new THREE.Mesh(dtScreenGeo, materials.deviceDesktop)
    dtScreen.position.set(-1.4, 1.7, -1.075)
    qaGroup.add(dtScreen)

    // 2. Device B: Laptop Frame (Center-Right, 0.75m x 0.5m)
    const ltFrameGeo = this.track(new THREE.BoxGeometry(0.8, 0.52, 0.03))
    const ltFrame = new THREE.Mesh(ltFrameGeo, materials.gunmetal)
    ltFrame.position.set(0.45, 1.7, -1.1)
    ltFrame.castShadow = true
    qaGroup.add(ltFrame)

    const ltScreenGeo = this.track(new THREE.BoxGeometry(0.76, 0.48, 0.01))
    const ltScreen = new THREE.Mesh(ltScreenGeo, materials.deviceLaptop)
    ltScreen.position.set(0.45, 1.7, -1.08)
    qaGroup.add(ltScreen)

    // 3. Device C: Tablet in Portrait (Right, 0.45m x 0.6m)
    const tabFrameGeo = this.track(new THREE.BoxGeometry(0.45, 0.6, 0.02))
    const tabFrame = new THREE.Mesh(tabFrameGeo, materials.gunmetal)
    tabFrame.position.set(1.5, 1.7, -1.1)
    tabFrame.castShadow = true
    qaGroup.add(tabFrame)

    const tabScreenGeo = this.track(new THREE.BoxGeometry(0.41, 0.56, 0.01))
    const tabScreen = new THREE.Mesh(tabScreenGeo, materials.deviceTablet)
    tabScreen.position.set(1.5, 1.7, -1.085)
    qaGroup.add(tabScreen)

    // 4. Device D: Smartphone in Portrait (Below laptop, 0.22m x 0.42m)
    const phFrameGeo = this.track(new THREE.BoxGeometry(0.24, 0.44, 0.02))
    const phFrame = new THREE.Mesh(phFrameGeo, materials.gunmetal)
    phFrame.position.set(0.45, 0.95, -1.1)
    phFrame.castShadow = true
    qaGroup.add(phFrame)

    const phScreenGeo = this.track(new THREE.BoxGeometry(0.21, 0.41, 0.01))
    const phScreen = new THREE.Mesh(phScreenGeo, materials.devicePhone)
    phScreen.position.set(0.45, 0.95, -1.085)
    qaGroup.add(phScreen)

    // QA Technician Observation & Control Bench (2.8m x 0.75m x 0.72m)
    const benchGeo = this.track(new THREE.BoxGeometry(2.8, 0.08, 0.75))
    const bench = new THREE.Mesh(benchGeo, materials.walnut)
    bench.position.set(-0.5, 0.72, 0.1)
    bench.castShadow = true
    bench.receiveShadow = true
    qaGroup.add(bench)

    // Steel leg frame
    const legGeo = this.track(new THREE.BoxGeometry(0.06, 0.7, 0.65))
    const leg1 = new THREE.Mesh(legGeo, materials.gunmetal)
    leg1.position.set(-1.7, 0.35, 0.1)
    qaGroup.add(leg1)

    const leg2 = new THREE.Mesh(legGeo, materials.gunmetal)
    leg2.position.set(0.7, 0.35, 0.1)
    qaGroup.add(leg2)

    // Authoritative Browser QA Matrix Station Indicator
    const indGeo = this.track(new THREE.BoxGeometry(0.3, 0.02, 0.06))
    const ind = new THREE.Mesh(indGeo, materials.gunmetal)
    ind.position.set(0.0, 0.89, 0.48)
    ind.name = 'station-indicator:browser-qa-matrix'
    qaGroup.add(ind)
    this.stationIndicators.set('browser-qa-matrix', ind)

    this.group.add(qaGroup)
  }

  /**
   * Zone F: Approval Control Mezzanine Plinth & Review Console
   * Dedicated human operator governance station with ergonomic seating and clear sightlines.
   */
  private buildApprovalMezzaninePlinth(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['approval-plinth']
    const plinthGroup = new THREE.Group()
    plinthGroup.position.set(0.0, 2.95, 8.5)
    plinthGroup.name = 'station:approval-plinth'
    plinthGroup.userData = { type: 'station', id: station.id, name: station.name }

    // Chamfered walnut governance console (2.4m x 0.9m x 0.9m)
    const consoleGeo = this.track(new THREE.BoxGeometry(2.4, 0.85, 0.9))
    const consoleMesh = new THREE.Mesh(consoleGeo, materials.walnut)
    consoleMesh.position.set(0.0, 0.425, 0.0)
    consoleMesh.castShadow = true
    consoleMesh.receiveShadow = true
    plinthGroup.add(consoleMesh)

    // Brushed brass perimeter bevel rim
    const rimGeo = this.track(new THREE.BoxGeometry(2.46, 0.04, 0.96))
    const rim = new THREE.Mesh(rimGeo, materials.brass)
    rim.position.set(0.0, 0.87, 0.0)
    plinthGroup.add(rim)

    // Angled frosted glass evidence tablet inlay
    const tabletGeo = this.track(new THREE.BoxGeometry(1.6, 0.02, 0.6))
    const tablet = new THREE.Mesh(tabletGeo, materials.vellum)
    tablet.position.set(0.0, 0.9, 0.0)
    plinthGroup.add(tablet)

    // Authoritative Approval Plinth Station Indicator
    const indGeo = this.track(new THREE.BoxGeometry(0.3, 0.02, 0.06))
    const ind = new THREE.Mesh(indGeo, materials.gunmetal)
    ind.position.set(0.0, 0.92, 0.44)
    ind.name = 'station-indicator:approval-plinth'
    plinthGroup.add(ind)
    this.stationIndicators.set('approval-plinth', ind)

    // Executive Operator review chair (deliberately empty because user is operator)
    const chairGroup = new THREE.Group()
    chairGroup.position.set(0.0, 0.0, 0.85)

    const chairBaseGeo = this.track(new THREE.CylinderGeometry(0.06, 0.06, 0.38, 8))
    const chairBase = new THREE.Mesh(chairBaseGeo, materials.brass)
    chairBase.position.set(0.0, 0.19, 0.0)
    chairGroup.add(chairBase)

    const chairSeatGeo = this.track(new THREE.BoxGeometry(0.55, 0.08, 0.52))
    const chairSeat = new THREE.Mesh(chairSeatGeo, materials.charSuitDark)
    chairSeat.position.set(0.0, 0.42, 0.0)
    chairSeat.castShadow = true
    chairGroup.add(chairSeat)

    const chairBackGeo = this.track(new THREE.BoxGeometry(0.5, 0.6, 0.06))
    const chairBack = new THREE.Mesh(chairBackGeo, materials.charSuitDark)
    chairBack.position.set(0.0, 0.74, 0.24)
    chairBack.castShadow = true
    chairGroup.add(chairBack)

    plinthGroup.add(chairGroup)
    this.group.add(plinthGroup)
  }

  /**
   * Repository Vault Terminal Dock in Verification Lab
   */
  private buildRepositoryVault(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['repository-vault']
    const vaultGroup = new THREE.Group()
    vaultGroup.position.set(10.2, 0.1, 4.0)
    vaultGroup.name = 'station:repository-vault'
    vaultGroup.userData = { type: 'station', id: station.id, name: station.name }

    // Vault pedestal pillar (dark graphite & brushed brass)
    const vaultGeo = this.track(new THREE.BoxGeometry(0.85, 1.1, 0.85))
    const vault = new THREE.Mesh(vaultGeo, materials.gunmetal)
    vault.position.set(0.0, 0.55, 0.0)
    vault.castShadow = true
    vault.receiveShadow = true
    vaultGroup.add(vault)

    const capGeo = this.track(new THREE.BoxGeometry(0.9, 0.05, 0.9))
    const cap = new THREE.Mesh(capGeo, materials.brass)
    cap.position.set(0.0, 1.125, 0.0)
    vaultGroup.add(cap)

    // Glowing Git Commit dock slot
    const slotGeo = this.track(new THREE.BoxGeometry(0.5, 0.02, 0.35))
    const slot = new THREE.Mesh(slotGeo, materials.terminalScreenEmerald)
    slot.position.set(0.0, 1.155, 0.0)
    vaultGroup.add(slot)

    // Authoritative Repository Vault Station Indicator
    const indGeo = this.track(new THREE.BoxGeometry(0.3, 0.02, 0.06))
    const ind = new THREE.Mesh(indGeo, materials.gunmetal)
    ind.position.set(0.0, 1.18, 0.38)
    ind.name = 'station-indicator:repository-vault'
    vaultGroup.add(ind)
    this.stationIndicators.set('repository-vault', ind)

    this.group.add(vaultGroup)
  }

  /**
   * Procedural Office Life Props
   * Plants, cozy lounge seating, coffee tables, architectural shelving,
   * whiteboard, framed blueprints, and desk accessories.
   */
  private buildOfficeLifeProps(materials: MaterialLibrary): void {
    const propsGroup = new THREE.Group()
    propsGroup.name = 'office-life-props'

    // 1. Tall Potted Ficus / Fig Trees
    const tree1Group = this.buildPottedTree(materials, [-8.6, 0.0, 7.6], 2.2)
    propsGroup.add(tree1Group)

    const tree2Group = this.buildPottedTree(materials, [-11.6, 0.0, 2.8], 2.4)
    propsGroup.add(tree2Group)

    const tree3Group = this.buildPottedTree(materials, [1.2, 0.0, 8.6], 2.0)
    propsGroup.add(tree3Group)

    // 2. Low Planter Trough with Snake Plants (Corridor divider between Ops & Central Spine)
    const troughGroup = new THREE.Group()
    troughGroup.position.set(-0.8, 0.0, -1.0)

    const boxGeo = this.track(new THREE.BoxGeometry(0.36, 0.42, 3.4))
    const box = new THREE.Mesh(boxGeo, materials.walnut)
    box.position.set(0.0, 0.21, 0.0)
    box.castShadow = true
    troughGroup.add(box)

    const boxRimGeo = this.track(new THREE.BoxGeometry(0.38, 0.03, 3.44))
    const boxRim = new THREE.Mesh(boxRimGeo, materials.champagneBrass)
    boxRim.position.set(0.0, 0.43, 0.0)
    troughGroup.add(boxRim)

    // Snake plant blades
    for (let pz = -1.4; pz <= 1.4; pz += 0.35) {
      const bladeGeo = this.track(new THREE.BoxGeometry(0.04, 0.65 + Math.sin(pz) * 0.15, 0.16))
      const blade = new THREE.Mesh(bladeGeo, materials.foliageDark)
      blade.position.set((Math.random() - 0.5) * 0.1, 0.7, pz)
      blade.rotation.y = (Math.random() - 0.5) * 0.5
      troughGroup.add(blade)
    }
    propsGroup.add(troughGroup)

    // 3. Cozy Lounge Nook (South corridor between Ops & Browser QA)
    const loungeGroup = new THREE.Group()
    loungeGroup.position.set(0.8, 0.0, -5.8)

    // Sofa Base
    const sofaBaseGeo = this.track(new THREE.BoxGeometry(2.4, 0.12, 0.9))
    const sofaBase = new THREE.Mesh(sofaBaseGeo, materials.walnut)
    sofaBase.position.set(0.0, 0.14, 0.0)
    sofaBase.castShadow = true
    loungeGroup.add(sofaBase)

    // Brass sofa legs
    const sLegCorners = [
      [-1.1, -0.38],
      [1.1, -0.38],
      [-1.1, 0.38],
      [1.1, 0.38],
    ]
    for (const [lx, lz] of sLegCorners) {
      const legGeo = this.track(new THREE.CylinderGeometry(0.02, 0.015, 0.14, 8))
      const leg = new THREE.Mesh(legGeo, materials.champagneBrass)
      leg.position.set(lx!, 0.07, lz!)
      loungeGroup.add(leg)
    }

    // Sofa Seat Cushions (3 cushions)
    for (let cx = -0.75; cx <= 0.75; cx += 0.75) {
      const seatGeo = this.track(new THREE.BoxGeometry(0.72, 0.22, 0.8))
      const seat = new THREE.Mesh(seatGeo, materials.couchFabricWarm)
      seat.position.set(cx, 0.31, 0.02)
      seat.castShadow = true
      loungeGroup.add(seat)
    }

    // Sofa Backrest
    const backGeo = this.track(new THREE.BoxGeometry(2.36, 0.46, 0.16))
    const back = new THREE.Mesh(backGeo, materials.couchFabricWarm)
    back.position.set(0.0, 0.62, -0.34)
    back.castShadow = true
    loungeGroup.add(back)

    // Sofa Armrests
    for (const ax of [-1.15, 1.15]) {
      const armGeo = this.track(new THREE.BoxGeometry(0.14, 0.32, 0.84))
      const arm = new THREE.Mesh(armGeo, materials.couchFabricWarm)
      arm.position.set(ax, 0.48, 0.0)
      loungeGroup.add(arm)
    }

    // Throw Cushions
    const c1Geo = this.track(new THREE.BoxGeometry(0.32, 0.32, 0.1))
    const c1 = new THREE.Mesh(c1Geo, materials.couchCushion)
    c1.position.set(-0.95, 0.45, -0.15)
    c1.rotation.y = 0.4
    c1.rotation.z = -0.15
    loungeGroup.add(c1)

    const c2 = new THREE.Mesh(c1Geo, materials.couchCushion)
    c2.position.set(0.95, 0.45, -0.15)
    c2.rotation.y = -0.4
    c2.rotation.z = 0.15
    loungeGroup.add(c2)

    // Low Walnut Coffee Table
    const tableTopGeo = this.track(new THREE.BoxGeometry(1.3, 0.04, 0.65))
    const tableTop = new THREE.Mesh(tableTopGeo, materials.walnut)
    tableTop.position.set(0.0, 0.35, 1.1)
    tableTop.castShadow = true
    loungeGroup.add(tableTop)

    for (const [tx, tz] of [[-0.55, 0.85], [0.55, 0.85], [-0.55, 1.35], [0.55, 1.35]]) {
      const tLegGeo = this.track(new THREE.CylinderGeometry(0.02, 0.015, 0.33, 8))
      const tLeg = new THREE.Mesh(tLegGeo, materials.champagneBrass)
      tLeg.position.set(tx!, 0.165, tz!)
      loungeGroup.add(tLeg)
    }

    // Magazine on coffee table
    const magGeo = this.track(new THREE.BoxGeometry(0.24, 0.01, 0.3))
    const mag = new THREE.Mesh(magGeo, materials.bookSpineAmber)
    mag.position.set(-0.25, 0.375, 1.1)
    mag.rotation.y = 0.15
    loungeGroup.add(mag)

    // Arched Floor Standing Lamp
    const lampGroup = new THREE.Group()
    lampGroup.position.set(1.6, 0.0, -0.4)

    const fBaseGeo = this.track(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 16))
    const fBase = new THREE.Mesh(fBaseGeo, materials.champagneBrass)
    fBase.position.set(0.0, 0.015, 0.0)
    lampGroup.add(fBase)

    const fStemGeo = this.track(new THREE.CylinderGeometry(0.015, 0.015, 2.2, 8))
    const fStem = new THREE.Mesh(fStemGeo, materials.champagneBrass)
    fStem.position.set(0.0, 1.1, 0.0)
    lampGroup.add(fStem)

    const fShadeGeo = this.track(new THREE.ConeGeometry(0.18, 0.22, 16))
    const fShade = new THREE.Mesh(fShadeGeo, materials.champagneBrass)
    fShade.position.set(-0.35, 2.15, 0.2)
    fShade.rotation.z = Math.PI - 0.4
    lampGroup.add(fShade)

    const fBulbGeo = this.track(new THREE.SphereGeometry(0.05, 8, 8))
    const fBulb = new THREE.Mesh(fBulbGeo, materials.lampWarmGlow)
    fBulb.position.set(-0.35, 2.08, 0.2)
    lampGroup.add(fBulb)

    loungeGroup.add(lampGroup)
    propsGroup.add(loungeGroup)

    // 4. Mission Control Strategy Whiteboard
    const wbGroup = new THREE.Group()
    wbGroup.position.set(-7.8, 1.8, 8.1)

    const wbGeo = this.track(new THREE.BoxGeometry(2.8, 1.35, 0.03))
    const wb = new THREE.Mesh(wbGeo, materials.whiteboardSurface)
    wb.position.set(0.0, 0.0, 0.0)
    wbGroup.add(wb)

    const wbFrameGeo = this.track(new THREE.BoxGeometry(2.84, 1.39, 0.02))
    const wbFrame = new THREE.Mesh(wbFrameGeo, materials.champagneBrass)
    wbFrame.position.set(0.0, 0.0, -0.01)
    wbGroup.add(wbFrame)

    const trayGeo = this.track(new THREE.BoxGeometry(2.2, 0.02, 0.08))
    const tray = new THREE.Mesh(trayGeo, materials.gunmetal)
    tray.position.set(0.0, -0.68, 0.04)
    wbGroup.add(tray)
    propsGroup.add(wbGroup)

    // 5. Architectural Shelving Unit in Agent Operations
    const shelfGroup = new THREE.Group()
    shelfGroup.position.set(-12.8, 1.2, -1.5)

    const shelfFrameGeo = this.track(new THREE.BoxGeometry(0.35, 2.4, 2.0))
    const shelfFrame = new THREE.Mesh(shelfFrameGeo, materials.walnut)
    shelfGroup.add(shelfFrame)

    // Books and binders on shelves
    for (let sy = -0.8; sy <= 0.8; sy += 0.5) {
      for (let sz = -0.7; sz <= 0.7; sz += 0.35) {
        const bookGeo = this.track(new THREE.BoxGeometry(0.24, 0.28, 0.06))
        const bookMat = (Math.abs(sz + sy) < 0.4)
          ? materials.bookSpineNavy
          : (sz > 0 ? materials.bookSpineAmber : materials.bookSpineTeal)
        const book = new THREE.Mesh(bookGeo, bookMat)
        book.position.set(0.02, sy + 0.15, sz)
        shelfGroup.add(book)
      }
    }
    propsGroup.add(shelfGroup)

    this.group.add(propsGroup)
  }

  private buildPottedTree(materials: MaterialLibrary, pos: [number, number, number], height: number): THREE.Group {
    const treeGroup = new THREE.Group()
    treeGroup.position.set(...pos)

    const planterGeo = this.track(new THREE.CylinderGeometry(0.32, 0.25, 0.52, 16))
    const planter = new THREE.Mesh(planterGeo, materials.planterCeramic)
    planter.position.set(0.0, 0.26, 0.0)
    planter.castShadow = true
    treeGroup.add(planter)

    const soilGeo = this.track(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 16))
    const soil = new THREE.Mesh(soilGeo, materials.limestoneDark)
    soil.position.set(0.0, 0.5, 0.0)
    treeGroup.add(soil)

    const trunkGeo = this.track(new THREE.CylinderGeometry(0.035, 0.045, height, 8))
    const trunk = new THREE.Mesh(trunkGeo, materials.walnut)
    trunk.position.set(0.0, height / 2 + 0.4, 0.0)
    trunk.castShadow = true
    treeGroup.add(trunk)

    const leafClusters = [
      [0.0, height + 0.3, 0.0, 0.42],
      [-0.15, height + 0.1, 0.12, 0.35],
      [0.18, height + 0.15, -0.1, 0.36],
      [0.1, height - 0.2, 0.15, 0.3],
      [-0.12, height - 0.25, -0.15, 0.32],
    ]
    for (let i = 0; i < leafClusters.length; i++) {
      const [lx, ly, lz, r] = leafClusters[i]!
      const leafGeo = this.track(new THREE.SphereGeometry(r!, 8, 8))
      const leafMat = i % 2 === 0 ? materials.foliageGreen : materials.foliageDark
      const foliage = new THREE.Mesh(leafGeo, leafMat)
      foliage.position.set(lx!, ly!, lz!)
      foliage.castShadow = true
      treeGroup.add(foliage)
    }

    return treeGroup
  }

  public setStationStatus(stationId: StationId, status: StationStatus): void {
    const ind = this.stationIndicators.get(stationId)
    if (ind) {
      switch (status) {
        case 'ACTIVE':
          ind.material = this.materials.statusRunning
          break
        case 'VERIFYING':
          ind.material = this.materials.statusVerifying
          break
        case 'BROWSER_QA':
          ind.material = this.materials.terminalScreen
          break
        case 'WAITING_APPROVAL':
          ind.material = this.materials.statusWaiting
          break
        case 'COMPLETED':
          ind.material = this.materials.statusSuccess
          break
        case 'FAILED':
          ind.material = this.materials.statusFailure
          break
        case 'IDLE':
        default:
          ind.material = this.materials.gunmetal
          break
      }
    }

    // Toggle workstation screen brightness between active and idle standby
    const screens = this.stationScreens.get(stationId)
    if (screens) {
      const isActive = status === 'ACTIVE' || status === 'VERIFYING'
      for (const scr of screens) {
        if (scr.material && 'emissiveIntensity' in scr.material) {
          ;(scr.material as THREE.MeshStandardMaterial).emissiveIntensity = isActive ? 0.65 : 0.08
        }
      }
    }
  }

  public dispose(): void {
    for (const geom of this.geometriesToDispose) {
      geom.dispose()
    }
    this.geometriesToDispose.length = 0
    this.stationIndicators.clear()
    this.stationScreens.clear()
  }
}
