/**
 * Gravitas 3D Headquarters — Mission Control Central Planning Surface (Wave 12J)
 *
 * Implements Layer A of Floor 1 (Mission Control):
 * - Substantial architectural strategy table: chamfered American walnut chassis,
 *   brushed champagne brass perimeter reveal, and inset tactical blueprint DAG deck.
 * - Central dormant coordination display ribbon with embedded brass alignment rail.
 * - Tactile rotary strategy dials, tool trough, and archival reference folio.
 * - Ergonomic cantilever consultation stools tucked at perimeter.
 * - Performance discipline: geometry sharing, pruned micro shadow casters.
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'
import { STATION_DEFINITIONS } from '../../world/stations.js'

export interface PlanningTableBuildResult {
  readonly tableGroup: THREE.Group
  readonly indicatorMesh: THREE.Mesh
}

export class MissionPlanningTable {
  public static buildTable(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): PlanningTableBuildResult {
    const station = STATION_DEFINITIONS['planning-table']
    const tableGroup = new THREE.Group()
    tableGroup.position.set(station.position[0], 0.0, station.position[2])
    tableGroup.rotation.y = station.rotationY
    tableGroup.name = 'station:planning-table'
    tableGroup.userData = {
      type: 'station',
      id: station.id,
      name: station.name,
      roomId: station.roomId,
      role: station.role,
      status: station.status,
      description: station.description,
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. DUAL ARCHITECTURAL TRESTLE PEDESTALS & STRETCHER CONDUIT
    // ──────────────────────────────────────────────────────────────────────────
    const trestlePositions = [-1.4, 1.4]
    const legPylonGeo = track(new THREE.BoxGeometry(0.14, 0.76, 1.6))
    const legFootGeo = track(new THREE.BoxGeometry(0.18, 0.04, 1.72))
    const footGlideGeo = track(new THREE.BoxGeometry(0.06, 0.015, 0.12))

    for (const tx of trestlePositions) {
      // Main angled upright pylon
      const pylon = new THREE.Mesh(legPylonGeo, materials.gunmetal)
      pylon.position.set(tx, 0.38, 0.0)
      pylon.castShadow = true
      pylon.receiveShadow = true
      tableGroup.add(pylon)

      // Solid brass floor footing
      const foot = new THREE.Mesh(legFootGeo, materials.champagneBrass)
      foot.position.set(tx, 0.02, 0.0)
      foot.receiveShadow = true
      tableGroup.add(foot)

      // Leveling glides
      for (const fz of [-0.75, 0.75]) {
        const glide = new THREE.Mesh(footGlideGeo, materials.brass)
        glide.position.set(tx, 0.007, fz)
        tableGroup.add(glide)
      }
    }

    // Heavy horizontal structural stretcher tying the trestles
    const tieStretcherGeo = track(new THREE.BoxGeometry(2.66, 0.06, 0.08))
    const tieStretcher = new THREE.Mesh(tieStretcherGeo, materials.champagneBrass)
    tieStretcher.position.set(0.0, 0.22, 0.0)
    tieStretcher.castShadow = true
    tableGroup.add(tieStretcher)

    // Secondary low-profile wiring tray conduit under table centerline
    const underTrayGeo = track(new THREE.BoxGeometry(2.8, 0.04, 0.45))
    const underTray = new THREE.Mesh(underTrayGeo, materials.gunmetal)
    underTray.position.set(0.0, 0.68, 0.0)
    tableGroup.add(underTray)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. CHAMFERED WALNUT CHASSIS & CHAMPAGNE BRASS PERIMETER REVEAL
    // ──────────────────────────────────────────────────────────────────────────
    // Primary American walnut table substructure (4.0m x 2.1m)
    const chassisGeo = track(new THREE.BoxGeometry(4.0, 0.12, 2.1))
    const chassis = new THREE.Mesh(chassisGeo, materials.walnut)
    chassis.position.set(0.0, 0.77, 0.0)
    chassis.castShadow = true
    chassis.receiveShadow = true
    tableGroup.add(chassis)

    // Under-edge 45-degree chamfered relief bevel
    const bevelGeo = track(new THREE.BoxGeometry(3.84, 0.05, 1.94))
    const bevel = new THREE.Mesh(bevelGeo, materials.walnut)
    bevel.position.set(0.0, 0.71, 0.0)
    tableGroup.add(bevel)

    // Brushed champagne brass perimeter rim & shadow reveal channel
    const brassRimGeo = track(new THREE.BoxGeometry(4.06, 0.04, 2.16))
    const brassRim = new THREE.Mesh(brassRimGeo, materials.champagneBrass)
    brassRim.position.set(0.0, 0.84, 0.0)
    brassRim.castShadow = true
    tableGroup.add(brassRim)

    // Perimeter shadow gap reveal insert
    const shadowGapGeo = track(new THREE.BoxGeometry(3.96, 0.015, 2.06))
    const shadowGap = new THREE.Mesh(shadowGapGeo, materials.structureGraphite)
    shadowGap.position.set(0.0, 0.855, 0.0)
    tableGroup.add(shadowGap)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. INSET MATTE BLUEPRINT DAG STRATEGY DECK
    // ──────────────────────────────────────────────────────────────────────────
    // The central strategy surface: architectural vellum blueprint DAG grid
    const deckGeo = track(new THREE.BoxGeometry(3.88, 0.015, 1.98))
    const deck = new THREE.Mesh(deckGeo, materials.vellum)
    deck.position.set(0.0, 0.865, 0.0)
    deck.receiveShadow = true
    tableGroup.add(deck)

    // Central embedded dormant coordination display ribbon (horizontal technical display)
    const ribbonGeo = track(new THREE.BoxGeometry(2.4, 0.005, 0.32))
    const ribbon = new THREE.Mesh(ribbonGeo, materials.glassDark)
    ribbon.position.set(0.0, 0.875, 0.0)
    tableGroup.add(ribbon)

    // Recessed brass coordination spine along display center
    const spineGeo = track(new THREE.BoxGeometry(2.44, 0.008, 0.015))
    const spine = new THREE.Mesh(spineGeo, materials.brass)
    spine.position.set(0.0, 0.878, 0.0)
    tableGroup.add(spine)

    // Coordinate indexing marks along table edge (01, 02, 03... milestone intervals)
    const indexMarkGeo = track(new THREE.BoxGeometry(0.01, 0.005, 0.06))
    for (let ix = -1.6; ix <= 1.6; ix += 0.8) {
      const mark = new THREE.Mesh(indexMarkGeo, materials.champagneBrass)
      mark.position.set(ix, 0.875, 0.94)
      tableGroup.add(mark)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. TACTILE CONTROLS & PHYSICAL REFERENCE OBJECTS
    // ──────────────────────────────────────────────────────────────────────────
    // Planner's control module block at southwest consultation corner
    const controlModuleGeo = track(new THREE.BoxGeometry(0.42, 0.02, 0.22))
    const controlModule = new THREE.Mesh(controlModuleGeo, materials.gunmetal)
    controlModule.position.set(-1.4, 0.88, 0.75)
    tableGroup.add(controlModule)

    // Tactile rotary strategy dials
    const dialGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 0.016, 12))
    for (let d = 0; d < 3; d++) {
      const dial = new THREE.Mesh(dialGeo, materials.brass)
      dial.position.set(-1.52 + d * 0.07, 0.895, 0.75)
      tableGroup.add(dial)
    }

    // Two-position tactile mode toggles
    const toggleGeo = track(new THREE.BoxGeometry(0.012, 0.024, 0.018))
    for (let tg = 0; tg < 2; tg++) {
      const toggle = new THREE.Mesh(toggleGeo, materials.champagneBrass)
      toggle.position.set(-1.26 + tg * 0.05, 0.895, 0.75)
      toggle.rotation.z = 0.2
      tableGroup.add(toggle)
    }

    // Inset machined brass pen & stylus trough
    const troughGeo = track(new THREE.BoxGeometry(0.5, 0.006, 0.06))
    const trough = new THREE.Mesh(troughGeo, materials.champagneBrass)
    trough.position.set(-0.7, 0.875, 0.85)
    tableGroup.add(trough)

    // Heavy architectural drafting weight / parallel ruler bar across drawing field
    const rulerBarGeo = track(new THREE.BoxGeometry(1.6, 0.014, 0.04))
    const rulerBar = new THREE.Mesh(rulerBarGeo, materials.champagneBrass)
    rulerBar.position.set(-0.2, 0.88, 0.45)
    tableGroup.add(rulerBar)

    // Executive Strategy Binder / Archival Folio (cream reference sheets in dark portfolio)
    const folioGroup = new THREE.Group()
    folioGroup.position.set(1.2, 0.88, 0.6)
    folioGroup.rotation.y = -0.15

    const folioCoverGeo = track(new THREE.BoxGeometry(0.38, 0.018, 0.28))
    const folioCover = new THREE.Mesh(folioCoverGeo, materials.walnut)
    folioGroup.add(folioCover)

    const folioPagesGeo = track(new THREE.BoxGeometry(0.36, 0.012, 0.26))
    const folioPages = new THREE.Mesh(folioPagesGeo, materials.whiteboardSurface)
    folioPages.position.set(0.005, 0.008, 0.0)
    folioGroup.add(folioPages)

    const folioRibbonGeo = track(new THREE.BoxGeometry(0.015, 0.02, 0.3))
    const folioRibbon = new THREE.Mesh(folioRibbonGeo, materials.brass)
    folioRibbon.position.set(0.05, 0.01, 0.0)
    folioGroup.add(folioRibbon)

    tableGroup.add(folioGroup)

    // Authoritative Station Status Indicator Lens
    const indGeo = track(new THREE.BoxGeometry(0.32, 0.022, 0.05))
    const ind = new THREE.Mesh(indGeo, materials.gunmetal)
    ind.position.set(0.0, 0.88, 1.02)
    ind.name = 'station-indicator:planning-table'
    tableGroup.add(ind)

    // ──────────────────────────────────────────────────────────────────────────
    // 5. CANTILEVER CONSULTATION STOOLS (South and East perimeter)
    // ──────────────────────────────────────────────────────────────────────────
    const stoolPositions: [number, number, number][] = [
      [-0.8, 0.0, 1.45],
      [0.8, 0.0, 1.45],
      [2.35, 0.0, 0.0],
    ]

    const stoolSeatGeo = track(new THREE.BoxGeometry(0.42, 0.06, 0.38))
    const stoolFrameGeo = track(new THREE.BoxGeometry(0.035, 0.54, 0.34))
    const stoolFootGeo = track(new THREE.BoxGeometry(0.36, 0.03, 0.035))

    for (const [sx, sy, sz] of stoolPositions) {
      const stoolGroup = new THREE.Group()
      stoolGroup.position.set(sx, sy, sz)
      if (sz === 0.0) stoolGroup.rotation.y = Math.PI / 2

      // Sculpted walnut cushion seat
      const seat = new THREE.Mesh(stoolSeatGeo, materials.walnut)
      seat.position.set(0.0, 0.56, 0.0)
      seat.castShadow = true
      stoolGroup.add(seat)

      // Cantilever gunmetal sled frame
      const frameL = new THREE.Mesh(stoolFrameGeo, materials.gunmetal)
      frameL.position.set(-0.16, 0.27, 0.0)
      stoolGroup.add(frameL)

      const frameR = new THREE.Mesh(stoolFrameGeo, materials.gunmetal)
      frameR.position.set(0.16, 0.27, 0.0)
      stoolGroup.add(frameR)

      // Base runners
      const footFront = new THREE.Mesh(stoolFootGeo, materials.champagneBrass)
      footFront.position.set(0.0, 0.015, -0.15)
      stoolGroup.add(footFront)

      const footBack = new THREE.Mesh(stoolFootGeo, materials.champagneBrass)
      footBack.position.set(0.0, 0.015, 0.15)
      stoolGroup.add(footBack)

      tableGroup.add(stoolGroup)
    }

    return {
      tableGroup,
      indicatorMesh: ind,
    }
  }
}
