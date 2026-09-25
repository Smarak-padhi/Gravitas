/**
 * Gravitas 3D Headquarters — Mission Control Dispatch & Transition Edge (Wave 12J)
 *
 * Implements Layer C of Floor 1 (Mission Control):
 * - Directional architectural floor inlays: warm oak planning zone transitioning
 *   to dark honed limestone corridor towards the vertical core.
 * - Inset brushed champagne brass routing strips embedded flush in the floor plane.
 * - Slender architectural Dispatch Console & Departure Plinth.
 * - Egress threshold portal framing vertical transit towards Agent Operations (Floor 2).
 * - Performance discipline: geometry sharing, pruned micro shadow casters.
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'

export class DispatchTransition {
  public static buildTransition(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): THREE.Group {
    const transitionGroup = new THREE.Group()
    transitionGroup.name = 'floor1-dispatch-transition'

    // ──────────────────────────────────────────────────────────────────────────
    // 1. DIRECTIONAL BRASS FLOOR ROUTING CONDUIT & THRESHOLD STRIPS
    // ──────────────────────────────────────────────────────────────────────────
    // Inset floor runner panel under the dispatch threshold (4.2m x 2.4m)
    const runnerGeo = track(new THREE.BoxGeometry(4.2, 0.006, 2.6))
    const runner = new THREE.Mesh(runnerGeo, materials.woodOakFloor)
    runner.position.set(2.8, 0.003, 0.5)
    runner.receiveShadow = true
    transitionGroup.add(runner)

    // Dark honed limestone border strip along the circulation threshold
    const borderGeo = track(new THREE.BoxGeometry(0.12, 0.008, 2.64))
    const borderL = new THREE.Mesh(borderGeo, materials.limestoneDark)
    borderL.position.set(0.66, 0.004, 0.5)
    transitionGroup.add(borderL)

    const borderR = new THREE.Mesh(borderGeo, materials.limestoneDark)
    borderR.position.set(4.94, 0.004, 0.5)
    transitionGroup.add(borderR)

    // Inset brushed champagne brass routing strip running from planning table to elevator portal
    const brassStripGeo = track(new THREE.BoxGeometry(3.8, 0.004, 0.035))
    const strip1 = new THREE.Mesh(brassStripGeo, materials.champagneBrass)
    strip1.position.set(2.8, 0.008, 0.2)
    transitionGroup.add(strip1)

    const strip2 = new THREE.Mesh(brassStripGeo, materials.champagneBrass)
    strip2.position.set(2.8, 0.008, 0.8)
    transitionGroup.add(strip2)

    // Perpendicular crossing threshold markers
    const crossStripGeo = track(new THREE.BoxGeometry(0.035, 0.004, 0.68))
    for (const cx of [1.2, 2.4, 3.6, 4.6]) {
      const cross = new THREE.Mesh(crossStripGeo, materials.brass)
      cross.position.set(cx, 0.008, 0.5)
      transitionGroup.add(cross)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. SLENDER ARCHITECTURAL DISPATCH CONSOLE & DEPARTURE PLINTH
    // ──────────────────────────────────────────────────────────────────────────
    const consoleGroup = new THREE.Group()
    consoleGroup.position.set(3.2, 0.0, 0.5)
    consoleGroup.name = 'dispatch-registry-plinth'

    // Gunmetal architectural pylon base
    const pylonGeo = track(new THREE.BoxGeometry(0.55, 0.95, 0.35))
    const pylon = new THREE.Mesh(pylonGeo, materials.gunmetal)
    pylon.position.set(0.0, 0.475, 0.0)
    pylon.castShadow = true
    pylon.receiveShadow = true
    consoleGroup.add(pylon)

    // Brushed champagne brass collar & rim reveal
    const collarGeo = track(new THREE.BoxGeometry(0.59, 0.03, 0.39))
    const collar = new THREE.Mesh(collarGeo, materials.champagneBrass)
    collar.position.set(0.0, 0.965, 0.0)
    consoleGroup.add(collar)

    // Angled console head
    const headGeo = track(new THREE.BoxGeometry(0.54, 0.12, 0.36))
    const head = new THREE.Mesh(headGeo, materials.walnut)
    head.position.set(0.0, 1.03, 0.0)
    head.rotation.x = -0.25
    head.castShadow = true
    consoleGroup.add(head)

    // Dormant dispatch slate screen (monochrome dark technical glass)
    const slateGeo = track(new THREE.BoxGeometry(0.46, 0.01, 0.28))
    const slate = new THREE.Mesh(slateGeo, materials.glassDark)
    slate.position.set(0.0, 1.09, -0.01)
    slate.rotation.x = -0.25
    consoleGroup.add(slate)

    // Status indicator lens
    const lensGeo = track(new THREE.BoxGeometry(0.18, 0.015, 0.025))
    const lens = new THREE.Mesh(lensGeo, materials.champagneBrass)
    lens.position.set(0.0, 1.12, 0.14)
    consoleGroup.add(lens)

    transitionGroup.add(consoleGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. EGRESS THRESHOLD PORTAL TO VERTICAL CORE
    // ──────────────────────────────────────────────────────────────────────────
    const portalGroup = new THREE.Group()
    portalGroup.position.set(5.1, 0.0, 0.5)

    // Slender upright architectural portal jambs
    const jambGeo = track(new THREE.BoxGeometry(0.08, 2.8, 0.22))
    const jambFront = new THREE.Mesh(jambGeo, materials.champagneBrass)
    jambFront.position.set(0.0, 1.4, -0.9)
    jambFront.castShadow = true
    portalGroup.add(jambFront)

    const jambBack = new THREE.Mesh(jambGeo, materials.champagneBrass)
    jambBack.position.set(0.0, 1.4, 0.9)
    jambBack.castShadow = true
    portalGroup.add(jambBack)

    // Upper lintel beam
    const lintelGeo = track(new THREE.BoxGeometry(0.08, 0.12, 2.02))
    const lintel = new THREE.Mesh(lintelGeo, materials.champagneBrass)
    lintel.position.set(0.0, 2.86, 0.0)
    portalGroup.add(lintel)

    // Warm walnut casing reveal
    const casingGeo = track(new THREE.BoxGeometry(0.06, 2.76, 0.04))
    const casingFront = new THREE.Mesh(casingGeo, materials.walnut)
    casingFront.position.set(0.01, 1.38, -0.88)
    portalGroup.add(casingFront)

    const casingBack = new THREE.Mesh(casingGeo, materials.walnut)
    casingBack.position.set(0.01, 1.38, 0.88)
    portalGroup.add(casingBack)

    transitionGroup.add(portalGroup)

    return transitionGroup
  }
}
