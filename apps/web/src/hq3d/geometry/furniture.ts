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
import { HeroFrontendBay } from './heroBay/heroFrontendBay.js'
import { HeroBackendBay } from './heroBay/heroBackendBay.js'
import { HeroReviewerBay } from './heroBay/heroReviewerBay.js'

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
    tableGroup.position.set(station.position[0], station.position[1], station.position[2])
    tableGroup.rotation.y = station.rotationY
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
  /**
   * Zone B: Agent Operations Workstations (Floor 2, Y = 7.2m)
   * High-contrast asymmetric role workstations:
   * - Frontend Engineer: design-oriented curved monitor + portrait secondary preview + open laptop + tablet sketch device + warm details.
   * - Backend Engineer: systems-oriented dual curved displays + logs/terminal topology + technical console notebook + analytical details.
   * - Expansion Bays 03 & 04: standby modular stations.
   */
  private buildAgentWorkstations(materials: MaterialLibrary): void {
    // 0. Architectural Studio Mat & Warm Woven Area Rug spanning Agent Operations
    // Inlay plinth/trim sits slightly below the rug so only the 30mm outer border trims the perimeter
    const rugBorderGeo = this.track(new THREE.BoxGeometry(9.66, 0.006, 4.66))
    const rugBorder = new THREE.Mesh(rugBorderGeo, materials.champagneBrass)
    rugBorder.position.set(0.0, 7.222, 0.6)
    this.group.add(rugBorder)

    const roomRugGeo = this.track(new THREE.BoxGeometry(9.6, 0.008, 4.6))
    const roomRug = new THREE.Mesh(roomRugGeo, materials.carpetWarm)
    roomRug.position.set(0.0, 7.228, 0.6)
    roomRug.receiveShadow = true
    this.group.add(roomRug)

    // ──────────────────────────────────────────────────────────────────────────
    // 1. FRONTEND ENGINEER WORKSTATION (Screen Right Rear: X = -2.6, Z = 1.0)
    // ──────────────────────────────────────────────────────────────────────────
    const heroResult = HeroFrontendBay.buildBay(materials, this.track.bind(this))
    heroResult.podGroup.position.set(-2.6, 7.2, 1.0)

    // Register modern role ID and legacy aliases for indicators
    this.stationIndicators.set('frontend-engineer-workstation', heroResult.indicatorMesh)
    this.stationIndicators.set('codex-workstation', heroResult.indicatorMesh)
    this.stationIndicators.set('engineering-workstation-01', heroResult.indicatorMesh)

    // Register modern role ID and legacy aliases for screens
    this.stationScreens.set('frontend-engineer-workstation', heroResult.screens)
    this.stationScreens.set('codex-workstation', heroResult.screens)
    this.stationScreens.set('engineering-workstation-01', heroResult.screens)

    this.group.add(heroResult.podGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. BACKEND ENGINEER WORKSTATION (Screen Left Rear: X = 2.6, Z = 1.0)
    // ──────────────────────────────────────────────────────────────────────────
    const backendResult = HeroBackendBay.buildBay(materials, this.track.bind(this))
    backendResult.podGroup.position.set(2.6, 7.2, 1.0)

    // Register modern role ID and legacy aliases for indicators
    this.stationIndicators.set('backend-engineer-workstation', backendResult.indicatorMesh)
    this.stationIndicators.set('fcc-workstation', backendResult.indicatorMesh)
    this.stationIndicators.set('engineering-workstation-02', backendResult.indicatorMesh)

    // Register modern role ID and legacy aliases for screens
    this.stationScreens.set('backend-engineer-workstation', backendResult.screens)
    this.stationScreens.set('fcc-workstation', backendResult.screens)
    this.stationScreens.set('engineering-workstation-02', backendResult.screens)

    this.group.add(backendResult.podGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. INDEPENDENT REVIEWER VERIFICATION STATION (Screen Center Forward: X = 0.0, Z = -0.1)
    // ──────────────────────────────────────────────────────────────────────────
    const reviewerResult = HeroReviewerBay.buildBay(materials, this.track.bind(this))

    // Register modern role ID and legacy aliases for indicators
    this.stationIndicators.set('reviewer-workstation' as any, reviewerResult.indicatorMesh)

    // Register modern role ID and legacy aliases for screens
    this.stationScreens.set('reviewer-workstation' as any, reviewerResult.screens)

    this.group.add(reviewerResult.podGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 4. STANDBY EXPANSION BAYS 03 & 04 (Slender Perimeter Wall Docks, Zero Foreground Clutter)
    // ──────────────────────────────────────────────────────────────────────────
    for (const [side, bayId] of [[-1, 'expansion-bay-3'], [1, 'expansion-bay-4']] as const) {
      const bayGroup = new THREE.Group()
      bayGroup.position.set(side * 6.4, 7.2, 0.0)
      bayGroup.name = `station:${bayId}`

      const bayIndGeo = this.track(new THREE.BoxGeometry(0.2, 0.02, 0.04))
      const bayInd = new THREE.Mesh(bayIndGeo, materials.gunmetal)
      bayInd.position.set(0.0, 1.2, 0.0)
      bayGroup.add(bayInd)
      this.stationIndicators.set(bayId as StationId, bayInd)
      this.stationScreens.set(bayId as StationId, [])
      this.group.add(bayGroup)
    }
  }

  /**
   * Zone C: Verification Cleanroom Console & Inspection Bench (Floor 3, Y = 10.8m)
   */
  private buildVerificationConsole(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['verifier-console']
    const consoleGroup = new THREE.Group()
    consoleGroup.position.set(station.position[0], station.position[1], station.position[2])
    consoleGroup.rotation.y = station.rotationY
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
    this.stationIndicators.set('verification-lab-console' as any, ind)

    this.group.add(consoleGroup)
  }

  /**
   * Zone D: Browser QA Multi-Device Matrix Wall & Test Rig (Floor 4, Y = 14.4m)
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
    qaGroup.position.set(station.position[0], station.position[1], station.position[2])
    qaGroup.rotation.y = station.rotationY
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
   * Zone F: Approval Control Mezzanine Plinth & Review Console (Floor 6, Y = 21.6m)
   * Dedicated human operator governance station with ergonomic seating and clear sightlines.
   */
  private buildApprovalMezzaninePlinth(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['approval-plinth']
    const plinthGroup = new THREE.Group()
    plinthGroup.position.set(station.position[0], station.position[1], station.position[2])
    plinthGroup.rotation.y = station.rotationY
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
   * Repository Vault Terminal Dock on Mezzanine Level 0 (Y = 0.0m)
   */
  private buildRepositoryVault(materials: MaterialLibrary): void {
    const station = STATION_DEFINITIONS['repository-vault']
    const vaultGroup = new THREE.Group()
    vaultGroup.position.set(station.position[0], station.position[1], station.position[2])
    vaultGroup.rotation.y = station.rotationY
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
   * Procedural Architectural Life Props
   * Distributed across vertical tower levels:
   * - Mezzanine (L0, Y = 0.0m): Cozy lounge sofa, low coffee table, floor lamp, potted ficus.
   * - Floor 1 (Y = 3.6m): Mission strategy whiteboard on rear wall, potted ficus.
   * - Floor 2 (Y = 7.2m, Hero Room): Abstract wall art on rear wall, project architecture whiteboard, walnut bookshelf with books, snake plant trough, potted greenery.
   * - Floor 3 (Y = 10.8m): Cleanroom observation bench.
   */
  private buildOfficeLifeProps(materials: MaterialLibrary): void {
    const propsGroup = new THREE.Group()
    propsGroup.name = 'office-life-props'

    // ── LEVEL 0 MEZZANINE (Y = 0.0m) ──────────────────────────────────
    // 1. Cozy Lounge Nook on Mezzanine
    const loungeGroup = new THREE.Group()
    loungeGroup.position.set(0.0, 0.0, -1.0)

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

    // Potted tree on Mezzanine
    propsGroup.add(this.buildPottedTree(materials, [-4.5, 0.0, 1.5], 2.2))

    // ── FLOOR 1 MISSION CONTROL (Y = 3.6m) ───────────────────────────
    const f1Group = new THREE.Group()
    f1Group.position.set(0.0, 3.6, 0.0)

    // Mission Control Strategy Whiteboard on rear acoustic wall
    const wbGroup = new THREE.Group()
    wbGroup.position.set(0.0, 2.0, 3.65)

    const wbGeo = this.track(new THREE.BoxGeometry(2.8, 1.35, 0.03))
    const wb = new THREE.Mesh(wbGeo, materials.whiteboardSurface)
    wbGroup.add(wb)

    const wbFrameGeo = this.track(new THREE.BoxGeometry(2.84, 1.39, 0.02))
    const wbFrame = new THREE.Mesh(wbFrameGeo, materials.champagneBrass)
    wbFrame.position.set(0.0, 0.0, -0.01)
    wbGroup.add(wbFrame)

    const trayGeo = this.track(new THREE.BoxGeometry(2.2, 0.02, 0.08))
    const tray = new THREE.Mesh(trayGeo, materials.gunmetal)
    tray.position.set(0.0, -0.68, 0.04)
    wbGroup.add(tray)
    f1Group.add(wbGroup)

    f1Group.add(this.buildPottedTree(materials, [-4.5, 0.0, 1.5], 2.0))
    propsGroup.add(f1Group)

    // ── FLOOR 2 AGENT OPERATIONS HERO ROOM (Y = 7.2m) ─────────────────
    const f2Group = new THREE.Group()
    f2Group.position.set(0.0, 7.2, 0.0)

    // Open central circulation corridor on Floor 2 (no central planter dividing the agents)

    // Architectural Shelving Unit in Agent Operations (West wall, rear zone)
    const shelfGroup = new THREE.Group()
    shelfGroup.position.set(-6.0, 1.2, 2.2)
    shelfGroup.rotation.y = Math.PI / 2

    const shelfFrameGeo = this.track(new THREE.BoxGeometry(0.35, 2.2, 2.0))
    const shelfFrame = new THREE.Mesh(shelfFrameGeo, materials.walnut)
    shelfGroup.add(shelfFrame)

    const bookGeo = this.track(new THREE.BoxGeometry(0.24, 0.28, 0.06))
    const navyPositions: [number, number, number][] = []
    const amberPositions: [number, number, number][] = []
    const tealPositions: [number, number, number][] = []

    for (let sy = -0.7; sy <= 0.7; sy += 0.5) {
      for (let sz = -0.7; sz <= 0.7; sz += 0.35) {
        if (Math.abs(sz + sy) < 0.4) {
          navyPositions.push([0.02, sy + 0.15, sz])
        } else if (sz > 0) {
          amberPositions.push([0.02, sy + 0.15, sz])
        } else {
          tealPositions.push([0.02, sy + 0.15, sz])
        }
      }
    }

    const dummyBook = new THREE.Object3D()
    const addInstancedBooks = (mat: THREE.Material, positions: [number, number, number][]) => {
      if (positions.length === 0) return
      const inst = new THREE.InstancedMesh(bookGeo, mat, positions.length)
      positions.forEach(([bx, by, bz], idx) => {
        dummyBook.position.set(bx, by, bz)
        dummyBook.updateMatrix()
        inst.setMatrixAt(idx, dummyBook.matrix)
      })
      inst.instanceMatrix.needsUpdate = true
      shelfGroup.add(inst)
    }

    addInstancedBooks(materials.bookSpineNavy, navyPositions)
    addInstancedBooks(materials.bookSpineAmber, amberPositions)
    addInstancedBooks(materials.bookSpineTeal, tealPositions)
    f2Group.add(shelfGroup)

    // Framed Abstract Wall Art on rear wall
    const artGroup = new THREE.Group()
    artGroup.position.set(0.0, 2.0, 3.65)

    const artCanvasGeo = this.track(new THREE.BoxGeometry(2.4, 1.5, 0.02))
    const artCanvas = new THREE.Mesh(artCanvasGeo, materials.wallArtAbstract)
    artGroup.add(artCanvas)

    const artFrameGeo = this.track(new THREE.BoxGeometry(2.46, 1.56, 0.03))
    const artFrame = new THREE.Mesh(artFrameGeo, materials.champagneBrass)
    artFrame.position.set(0.0, 0.0, -0.01)
    artGroup.add(artFrame)
    f2Group.add(artGroup)

    // Hero Room Potted Greenery
    f2Group.add(this.buildPottedTree(materials, [-4.8, 0.0, 2.2], 1.8))
    f2Group.add(this.buildPottedTree(materials, [4.8, 0.0, 2.2], 1.8))

    // ── Architectural Interior Enclosure (Target B) ──────────────────────
    // 1. Continuous Perimeter Baseboard with Champagne Brass Reveal Strip
    const baseboardRearGeo = this.track(new THREE.BoxGeometry(14.0, 0.08, 0.024))
    const baseboardRear = new THREE.Mesh(baseboardRearGeo, materials.structureGraphite)
    baseboardRear.position.set(0.0, 0.04, 4.38)
    f2Group.add(baseboardRear)

    const baseboardRevealGeo = this.track(new THREE.BoxGeometry(14.04, 0.012, 0.028))
    const baseboardReveal = new THREE.Mesh(baseboardRevealGeo, materials.champagneBrass)
    baseboardReveal.position.set(0.0, 0.085, 4.38)
    f2Group.add(baseboardReveal)

    // Side baseboards along West and East walls
    for (const sx of [-7.08, 7.08]) {
      const sideBaseGeo = this.track(new THREE.BoxGeometry(0.024, 0.08, 8.2))
      const sideBase = new THREE.Mesh(sideBaseGeo, materials.structureGraphite)
      sideBase.position.set(sx, 0.04, 0.2)
      f2Group.add(sideBase)

      const sideRevealGeo = this.track(new THREE.BoxGeometry(0.028, 0.012, 8.2))
      const sideReveal = new THREE.Mesh(sideRevealGeo, materials.champagneBrass)
      sideReveal.position.set(sx, 0.085, 0.2)
      f2Group.add(sideReveal)
    }

    // 2. Architectural Walnut Window Sill along West Glazing Wall
    const windowSillGeo = this.track(new THREE.BoxGeometry(0.24, 0.035, 7.6))
    const windowSill = new THREE.Mesh(windowSillGeo, materials.walnut)
    windowSill.position.set(-7.06, 0.02, 0.2)
    windowSill.castShadow = true
    f2Group.add(windowSill)

    for (const bz of [-2.4, 0.0, 2.4]) {
      const bracketGeo = this.track(new THREE.BoxGeometry(0.22, 0.06, 0.03))
      const bracket = new THREE.Mesh(bracketGeo, materials.champagneBrass)
      bracket.position.set(-7.07, -0.02, bz)
      f2Group.add(bracket)
    }

    // 3. Floating Architectural Acoustic Ceiling Cloud & Recessed LED Troffers (Y = 3.34m)
    const ceilingCloudGroup = new THREE.Group()
    ceilingCloudGroup.position.set(0.0, 3.34, 0.2)

    const cloudPanelGeo = this.track(new THREE.BoxGeometry(13.6, 0.03, 7.6))
    const cloudPanel = new THREE.Mesh(cloudPanelGeo, materials.ceilingPanel)
    ceilingCloudGroup.add(cloudPanel)

    const cloudFrameGeo = this.track(new THREE.BoxGeometry(13.68, 0.04, 7.68))
    const cloudFrame = new THREE.Mesh(cloudFrameGeo, materials.walnut)
    ceilingCloudGroup.add(cloudFrame)

    // Recessed warm linear LED troffers (instanced)
    const trofferGeo = this.track(new THREE.BoxGeometry(4.2, 0.016, 0.08))
    const trofferInstanced = new THREE.InstancedMesh(trofferGeo, materials.lampWarmGlow, 4)
    let tIdx = 0
    for (const tz of [-1.2, 1.4]) {
      for (const tx of [-3.2, 3.2]) {
        dummyBook.position.set(tx, -0.018, tz)
        dummyBook.updateMatrix()
        trofferInstanced.setMatrixAt(tIdx++, dummyBook.matrix)
      }
    }
    trofferInstanced.instanceMatrix.needsUpdate = true
    ceilingCloudGroup.add(trofferInstanced)
    f2Group.add(ceilingCloudGroup)

    propsGroup.add(f2Group)

    // ── FLOOR 3 VERIFICATION CLEANROOM (Y = 10.8m) ───────────────────
    const f3Group = new THREE.Group()
    f3Group.position.set(0.0, 10.8, 0.0)
    f3Group.add(this.buildPottedTree(materials, [-4.5, 0.0, 1.5], 1.8))
    propsGroup.add(f3Group)

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
          ;(scr.material as THREE.MeshStandardMaterial).emissiveIntensity = isActive ? 0.65 : 0.0
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
