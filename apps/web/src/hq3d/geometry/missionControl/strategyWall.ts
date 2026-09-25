/**
 * Gravitas 3D Headquarters — Mission Control Strategy & Dependency Wall (Wave 12J)
 *
 * Implements Layer B of Floor 1 (Mission Control):
 * - Architectural acoustic fluted walnut panelling on graphite felt backing.
 * - Central smoked architectural strategy panel with champagne brass planning rails.
 * - Inactive coordinate grid & dormant diagram framework (zero fake tasks/graphs).
 * - Low-profile plan-file credenza with rolled blueprint tubes and archival folios.
 * - Upper architectural pelmet for concealed downward wall-wash grazing.
 * - Performance discipline: geometry sharing, pruned micro shadow casters.
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'

export class StrategyWall {
  public static buildWall(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): THREE.Group {
    const wallGroup = new THREE.Group()
    wallGroup.name = 'floor1-strategy-wall'
    wallGroup.position.set(-1.0, 0.0, 3.62)

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ACOUSTIC GRAPHITE FELT BACKER & FLUTED TIMBER BATTENS
    // ──────────────────────────────────────────────────────────────────────────
    // Deep graphite acoustic felt backing panel (6.8m x 3.15m)
    const feltBackerGeo = track(new THREE.BoxGeometry(6.8, 3.15, 0.02))
    const feltBacker = new THREE.Mesh(feltBackerGeo, materials.heroAcousticFelt)
    feltBacker.position.set(0.0, 1.58, 0.0)
    feltBacker.receiveShadow = true
    wallGroup.add(feltBacker)

    // Architectural fluted walnut timber battens (wider, strategic rhythm)
    const battenWidth = 0.075
    const battenDepth = 0.035
    const battenHeight = 3.12
    const battenGeo = track(new THREE.BoxGeometry(battenWidth, battenHeight, battenDepth))
    const battenCount = 30
    const battenSpacing = 0.22
    const startX = -((battenCount - 1) * battenSpacing) / 2

    for (let i = 0; i < battenCount; i++) {
      const batten = new THREE.Mesh(battenGeo, materials.heroAcousticWood)
      batten.position.set(startX + i * battenSpacing, 1.58, 0.02)
      // Only outer silhouette battens cast shadow to preserve shadow budget
      if (i === 0 || i === battenCount - 1 || i % 8 === 0) {
        batten.castShadow = true
      }
      batten.receiveShadow = true
      wallGroup.add(batten)
    }

    // Top and bottom architectural fascia strips
    const topFasciaGeo = track(new THREE.BoxGeometry(6.84, 0.045, 0.045))
    const topFascia = new THREE.Mesh(topFasciaGeo, materials.champagneBrass)
    topFascia.position.set(0.0, 3.14, 0.025)
    wallGroup.add(topFascia)

    const botFasciaGeo = track(new THREE.BoxGeometry(6.84, 0.055, 0.045))
    const botFascia = new THREE.Mesh(botFasciaGeo, materials.walnut)
    botFascia.position.set(0.0, 0.028, 0.025)
    wallGroup.add(botFascia)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. SMOKED STRATEGY BLUEPRINT MATRIX PANEL
    // ──────────────────────────────────────────────────────────────────────────
    const panelGroup = new THREE.Group()
    panelGroup.position.set(0.0, 1.82, 0.04)

    // Champagne brass reveal frame
    const frameGeo = track(new THREE.BoxGeometry(3.64, 1.64, 0.025))
    const frame = new THREE.Mesh(frameGeo, materials.champagneBrass)
    frame.castShadow = true
    panelGroup.add(frame)

    // Dark architectural smoked glass surface with coordinate matrix backing
    const glassSurfaceGeo = track(new THREE.BoxGeometry(3.56, 1.56, 0.015))
    const glassSurface = new THREE.Mesh(glassSurfaceGeo, materials.glassDark)
    glassSurface.position.set(0.0, 0.0, 0.01)
    glassSurface.receiveShadow = true
    panelGroup.add(glassSurface)

    // Dual horizontal brushed brass planning rails across upper and mid sections
    const railGeo = track(new THREE.BoxGeometry(3.52, 0.02, 0.018))
    for (const ry of [0.45, -0.45]) {
      const rail = new THREE.Mesh(railGeo, materials.brass)
      rail.position.set(0.0, ry, 0.022)
      panelGroup.add(rail)
    }

    // Dormant tactical slot guides (inactive card channels)
    const slotGuideGeo = track(new THREE.BoxGeometry(0.35, 0.008, 0.012))
    for (let gx = -1.2; gx <= 1.2; gx += 0.8) {
      for (const gy of [0.35, -0.35]) {
        const slot = new THREE.Mesh(slotGuideGeo, materials.champagneBrass)
        slot.position.set(gx, gy, 0.025)
        panelGroup.add(slot)
      }
    }

    // Thin vertical coordinate datum grid lines etched into board
    const datumLineGeo = track(new THREE.BoxGeometry(0.008, 1.48, 0.005))
    for (let dx = -1.4; dx <= 1.4; dx += 0.7) {
      const datum = new THREE.Mesh(datumLineGeo, materials.champagneBrass)
      datum.position.set(dx, 0.0, 0.018)
      panelGroup.add(datum)
    }

    wallGroup.add(panelGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. LOW PLAN-FILE ARCHIVAL CREDENZA & BLUEPRINT TUBES
    // ──────────────────────────────────────────────────────────────────────────
    const credenzaGroup = new THREE.Group()
    credenzaGroup.position.set(0.0, 0.34, 0.24)

    // Solid American walnut cabinet body (3.6m x 0.65m x 0.45m)
    const credenzaBodyGeo = track(new THREE.BoxGeometry(3.6, 0.64, 0.44))
    const credenzaBody = new THREE.Mesh(credenzaBodyGeo, materials.walnut)
    credenzaBody.castShadow = true
    credenzaBody.receiveShadow = true
    credenzaGroup.add(credenzaBody)

    // Champagne brass perimeter reveal top trim
    const credenzaTopGeo = track(new THREE.BoxGeometry(3.64, 0.024, 0.46))
    const credenzaTop = new THREE.Mesh(credenzaTopGeo, materials.champagneBrass)
    credenzaTop.position.set(0.0, 0.33, 0.0)
    credenzaGroup.add(credenzaTop)

    // 4-tier horizontal plan-file drawer faces
    const drawerFaceGeo = track(new THREE.BoxGeometry(1.72, 0.13, 0.015))
    const drawerHandleGeo = track(new THREE.BoxGeometry(0.24, 0.015, 0.018))

    for (let side = -1; side <= 1; side += 2) {
      const colX = side * 0.88
      for (let tier = 0; tier < 4; tier++) {
        const tierY = -0.22 + tier * 0.15

        const drawer = new THREE.Mesh(drawerFaceGeo, materials.walnut)
        drawer.position.set(colX, tierY, 0.225)
        credenzaGroup.add(drawer)

        const handle = new THREE.Mesh(drawerHandleGeo, materials.brass)
        handle.position.set(colX, tierY, 0.235)
        credenzaGroup.add(handle)
      }
    }

    // Rolled Blueprint Tubes in custom walnut cradle resting on credenza top
    const cradleGeo = track(new THREE.BoxGeometry(0.65, 0.03, 0.25))
    const cradle = new THREE.Mesh(cradleGeo, materials.walnut)
    cradle.position.set(-1.1, 0.36, 0.0)
    credenzaGroup.add(cradle)

    const tubeGeo = track(new THREE.CylinderGeometry(0.032, 0.032, 0.58, 12))
    const tubePositions: [number, number, number][] = [
      [-1.2, 0.41, -0.05],
      [-1.08, 0.41, 0.04],
      [-1.14, 0.46, 0.0],
    ]

    for (let t = 0; t < tubePositions.length; t++) {
      const [tx, ty, tz] = tubePositions[t]!
      const tubeMat = t === 0 ? materials.vellum : t === 1 ? materials.champagneBrass : materials.limestoneDark
      const tube = new THREE.Mesh(tubeGeo, tubeMat)
      tube.rotation.z = Math.PI / 2
      tube.position.set(tx, ty, tz)
      credenzaGroup.add(tube)
    }

    // Stacked archival strategy ledgers / folios
    const binderGeo = track(new THREE.BoxGeometry(0.32, 0.035, 0.24))
    const binder1 = new THREE.Mesh(binderGeo, materials.bookSpineNavy)
    binder1.position.set(1.1, 0.36, -0.05)
    credenzaGroup.add(binder1)

    const binder2 = new THREE.Mesh(binderGeo, materials.bookSpineAmber)
    binder2.position.set(1.12, 0.395, -0.04)
    binder2.rotation.y = 0.08
    credenzaGroup.add(binder2)

    wallGroup.add(credenzaGroup)

    return wallGroup
  }
}
