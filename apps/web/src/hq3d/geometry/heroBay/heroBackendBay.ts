/**
 * Gravitas 3D Headquarters — Wave 12H-R3 Hero Backend Workstation Bay
 *
 * Authored high-fidelity 3D workspace for the Backend Engineer role on Floor 2:
 * - Solid Smoked American Walnut tabletop with rounded corners, beveled edge chamfers,
 *   brushed champagne brass front trim, and under-desk cable management
 * - Motorized telescoping steel trestle legs with brass leveling glide feet
 * - Engineered ergonomic task chair: 5-star arched spider base, casters, pneumatic strut,
 *   contoured waterfall seat cushion, and anatomical S-curve mesh backrest
 * - Dual 27" inward-curved professional displays on articulated gas-spring monitor arms,
 *   recessed screen planes, monitor light bars, and realistic housing thickness
 * - Restrained tactile peripherals: compact mechanical keyboard, stitched felt desk mat,
 *   precision wireless trackball mouse, terracotta espresso mug, and diagnostic runbook
 * - Immediate architectural framing: vertical acoustic walnut timber slats over felt backing,
 *   horizontal brass datum reveal trim, and dedicated local lighting composition
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'
import type { HeroBayBuildResult } from './heroFrontendBay.js'

export class HeroBackendBay {
  /**
   * Helper to create a 2D rounded rectangle shape for beveled extrusion
   */
  public static createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
    const shape = new THREE.Shape()
    const x = -width / 2
    const y = -height / 2
    shape.moveTo(x + radius, y)
    shape.lineTo(x + width - radius, y)
    shape.quadraticCurveTo(x + width, y, x + width, y + radius)
    shape.lineTo(x + width, y + height - radius)
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    shape.lineTo(x + radius, y + height)
    shape.quadraticCurveTo(x, y + height, x, y + height - radius)
    shape.lineTo(x, y + radius)
    shape.quadraticCurveTo(x, y, x + radius, y)
    return shape
  }

  /**
   * Builds the complete Hero Backend Bay assembly
   */
  public static buildBay(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): HeroBayBuildResult {
    const podGroup = new THREE.Group()
    podGroup.name = 'station:backend-engineer-workstation'
    podGroup.userData = {
      type: 'station',
      id: 'backend-engineer-workstation',
      name: 'Backend Engineer Workstation (Hero Systems Fidelity)',
    }

    const screens: THREE.Mesh[] = []

    // ──────────────────────────────────────────────────────────────────────────
    // ──────────────────────────────────────────────────────────────────────────
    // 1. ARCHITECTURAL FRAMING & IMMEDIATE BAY SLICE
    // ──────────────────────────────────────────────────────────────────────────

    // 1.1 American Walnut Inlay Floor Slice (3.6m x 3.2m)
    const floorInlayGeo = track(new THREE.BoxGeometry(3.6, 0.006, 3.2))
    const floorInlay = new THREE.Mesh(floorInlayGeo, materials.walnut)
    floorInlay.position.set(0.0, 0.003, 0.2)
    floorInlay.receiveShadow = true
    podGroup.add(floorInlay)

    // Brushed champagne brass boundary inlay trim
    const floorTrimGeo = track(new THREE.BoxGeometry(3.64, 0.008, 0.04))
    const floorTrim = new THREE.Mesh(floorTrimGeo, materials.champagneBrass)
    floorTrim.position.set(0.0, 0.004, 1.8)
    podGroup.add(floorTrim)

    // 1.2 Acoustic Timber Batten Rear Wall (3.2m wide x 3.2m high)
    // Symmetrically matches Frontend's rear wall at Z = +1.45 relative to pod
    const acousticWallGroup = new THREE.Group()
    acousticWallGroup.position.set(0.0, 1.6, 1.45)

    // Dark acoustic felt backer
    const feltBackerGeo = track(new THREE.BoxGeometry(3.2, 3.2, 0.02))
    const feltBacker = new THREE.Mesh(feltBackerGeo, materials.heroAcousticFelt)
    feltBacker.position.set(0.0, 0.0, 0.01)
    feltBacker.receiveShadow = true
    acousticWallGroup.add(feltBacker)

    // Vertical solid walnut timber slats with deep shadow reveals (instanced for optimal draw call budget)
    const slatWidth = 0.038
    const slatDepth = 0.024
    const slatSpacing = 0.075
    const slatCount = 42

    const slatGeo = track(new THREE.BoxGeometry(slatWidth, 3.12, slatDepth))
    const startX = -((slatCount - 1) * slatSpacing) / 2

    const slatInstanced = new THREE.InstancedMesh(slatGeo, materials.walnut, slatCount)
    slatInstanced.castShadow = true
    slatInstanced.receiveShadow = true
    const dummy = new THREE.Object3D()
    for (let i = 0; i < slatCount; i++) {
      dummy.position.set(startX + i * slatSpacing, 0.0, -slatDepth / 2)
      dummy.updateMatrix()
      slatInstanced.setMatrixAt(i, dummy.matrix)
    }
    slatInstanced.instanceMatrix.needsUpdate = true
    acousticWallGroup.add(slatInstanced)

    // Top & bottom architectural reveals/fascia trim
    const topFasciaGeo = track(new THREE.BoxGeometry(3.24, 0.035, 0.032))
    const topFascia = new THREE.Mesh(topFasciaGeo, materials.structureGraphite)
    topFascia.position.set(0.0, 1.58, -slatDepth / 2 - 0.004)
    acousticWallGroup.add(topFascia)

    const botFasciaGeo = track(new THREE.BoxGeometry(3.24, 0.045, 0.032))
    const botFascia = new THREE.Mesh(botFasciaGeo, materials.structureGraphite)
    botFascia.position.set(0.0, -1.58, -slatDepth / 2 - 0.004)
    acousticWallGroup.add(botFascia)

    // Vertical architectural side casing reveals (terminating the slat array)
    for (const sx of [-1.61, 1.61]) {
      const casingGeo = track(new THREE.BoxGeometry(0.024, 3.2, 0.034))
      const casing = new THREE.Mesh(casingGeo, materials.structureGraphite)
      casing.position.set(sx, 0.0, -slatDepth / 2 - 0.004)
      acousticWallGroup.add(casing)

      const casingRevealGeo = track(new THREE.BoxGeometry(0.012, 3.2, 0.036))
      const casingReveal = new THREE.Mesh(casingRevealGeo, materials.champagneBrass)
      casingReveal.position.set(sx - (Math.sign(sx) * 0.012), 0.0, -slatDepth / 2 - 0.005)
      acousticWallGroup.add(casingReveal)
    }

    // Horizontal champagne brass architectural reveal datum trim
    const datumTrimGeo = track(new THREE.BoxGeometry(3.24, 0.018, 0.034))
    const datumTrim = new THREE.Mesh(datumTrimGeo, materials.champagneBrass)
    datumTrim.position.set(0.0, -0.85, -slatDepth / 2 - 0.006)
    acousticWallGroup.add(datumTrim)

    podGroup.add(acousticWallGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. THE HERO BACKEND DESK (Beveled walnut top, graphite steel frame, brass trim)
    // ──────────────────────────────────────────────────────────────────────────

    const deskGroup = new THREE.Group()
    deskGroup.position.set(0.0, 0.0, 0.0)

    // 2.1 Solid American Walnut Tabletop with Rounded Corners & Beveled Edges
    const topShape = this.createRoundedRectShape(2.1, 0.9, 0.04)
    const topExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.032,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: 0.008,
      bevelThickness: 0.008,
      curveSegments: 16,
    }
    const topGeo = track(new THREE.ExtrudeGeometry(topShape, topExtrudeSettings))
    topGeo.rotateX(Math.PI / 2)
    const deskTop = new THREE.Mesh(topGeo, materials.walnut)
    deskTop.position.set(0.0, 0.74, 0.0)
    deskTop.castShadow = true
    deskTop.receiveShadow = true
    deskGroup.add(deskTop)

    // Brushed champagne brass front edge chamfer trim
    const frontTrimGeo = track(new THREE.BoxGeometry(2.12, 0.014, 0.028))
    const frontTrim = new THREE.Mesh(frontTrimGeo, materials.champagneBrass)
    frontTrim.position.set(0.0, 0.745, 0.45)
    deskGroup.add(frontTrim)

    // 2.2 Motorized Dual-Stage Telescoping Steel Lift Legs
    const legSpacingX = 0.88

    for (const side of [-1, 1]) {
      const legX = side * legSpacingX

      // Lower stage outer column (powder-coated structural graphite)
      const outerColGeo = track(new THREE.BoxGeometry(0.08, 0.38, 0.055))
      const outerCol = new THREE.Mesh(outerColGeo, materials.structureGraphite)
      outerCol.position.set(legX, 0.20, 0.0)
      outerCol.castShadow = true
      deskGroup.add(outerCol)

      // Upper stage inner column (telescoping sleeve)
      const innerColGeo = track(new THREE.BoxGeometry(0.07, 0.34, 0.048))
      const innerCol = new THREE.Mesh(innerColGeo, materials.structureGraphite)
      innerCol.position.set(legX, 0.54, 0.0)
      innerCol.castShadow = true
      deskGroup.add(innerCol)

      // Solid steel foot sled with beveled ends
      const footShape = this.createRoundedRectShape(0.075, 0.76, 0.02)
      const footGeo = track(
        new THREE.ExtrudeGeometry(footShape, {
          depth: 0.024,
          bevelEnabled: true,
          bevelSegments: 3,
          bevelSize: 0.004,
          bevelThickness: 0.004,
          curveSegments: 8,
        })
      )
      footGeo.rotateX(Math.PI / 2)
      const footSled = new THREE.Mesh(footGeo, materials.structureGraphite)
      footSled.position.set(legX, 0.024, 0.0)
      footSled.castShadow = true
      footSled.receiveShadow = true
      deskGroup.add(footSled)

      // Dual brass leveling glide discs underneath each foot
      for (const fz of [-0.32, 0.32]) {
        const glideGeo = track(new THREE.CylinderGeometry(0.022, 0.024, 0.012, 16))
        const glide = new THREE.Mesh(glideGeo, materials.champagneBrass)
        glide.position.set(legX, 0.006, fz)
        deskGroup.add(glide)
      }

      // Upper desktop mounting bracket
      const topBracketGeo = track(new THREE.BoxGeometry(0.065, 0.025, 0.62))
      const topBracket = new THREE.Mesh(topBracketGeo, materials.structureGraphite)
      topBracket.position.set(legX, 0.71, 0.0)
      deskGroup.add(topBracket)
    }

    // 2.3 Structural Crossbeam & Cable Management Raceway
    const crossbeamGeo = track(new THREE.BoxGeometry(1.68, 0.045, 0.045))
    const crossbeam = new THREE.Mesh(crossbeamGeo, materials.structureGraphite)
    crossbeam.position.set(0.0, 0.68, -0.05)
    deskGroup.add(crossbeam)

    // Under-desk folded perforated metal cable tray
    const cableTrayGeo = track(new THREE.BoxGeometry(1.4, 0.08, 0.18))
    const cableTray = new THREE.Mesh(cableTrayGeo, materials.structureGraphite)
    cableTray.position.set(0.0, 0.66, -0.22)
    deskGroup.add(cableTray)

    // Desk wire pass-through grommet with knurled brass cap (rear right)
    const grommetGeo = track(new THREE.CylinderGeometry(0.032, 0.034, 0.04, 24))
    const grommet = new THREE.Mesh(grommetGeo, materials.champagneBrass)
    grommet.position.set(0.35, 0.74, -0.36)
    deskGroup.add(grommet)

    // Authoritative Station Status Indicator (inset flush with front desk rim)
    const indGeo = track(new THREE.BoxGeometry(0.22, 0.012, 0.035))
    const ind = new THREE.Mesh(indGeo, materials.gunmetal)
    ind.position.set(0.0, 0.745, 0.44)
    ind.name = 'station-indicator:backend-engineer-workstation'
    deskGroup.add(ind)

    podGroup.add(deskGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. THE HERO TASK CHAIR (5-star spider base, casters, contoured lumbar mesh)
    // ──────────────────────────────────────────────────────────────────────────

    const chairGroup = new THREE.Group()
    chairGroup.position.set(0.0, 0.0, 0.55) // Seated alignment matching character home position
    chairGroup.name = 'hero-backend-chair'

    // 3.1 Five-Star Spider Base with Dual-Wheel Casters
    const spiderHubGeo = track(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 16))
    const spiderHub = new THREE.Mesh(spiderHubGeo, materials.structureGraphite)
    spiderHub.position.set(0.0, 0.12, 0.0)
    spiderHub.castShadow = true
    chairGroup.add(spiderHub)

    const spiderRadius = 0.28
    const legArmGeo = track(new THREE.BoxGeometry(0.032, 0.024, spiderRadius))
    const legArmInstanced = new THREE.InstancedMesh(legArmGeo, materials.structureGraphite, 5)
    legArmInstanced.castShadow = true

    const casterStemGeo = track(new THREE.CylinderGeometry(0.008, 0.008, 0.035, 8))
    const casterStemInstanced = new THREE.InstancedMesh(casterStemGeo, materials.structureGraphite, 5)

    const wheelGeo = track(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 12))
    wheelGeo.rotateZ(Math.PI / 2)
    const wheelInstanced = new THREE.InstancedMesh(wheelGeo, materials.chairMeshDark, 10)
    wheelInstanced.castShadow = true

    const chairDummy = new THREE.Object3D()
    let wheelIndex = 0

    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)

      // Arched spider leg arm
      chairDummy.position.set((cosA * spiderRadius) / 2, 0.08, (sinA * spiderRadius) / 2)
      chairDummy.rotation.set(0, -angle + Math.PI / 2, 0.08)
      chairDummy.updateMatrix()
      legArmInstanced.setMatrixAt(i, chairDummy.matrix)

      // Caster swivel stem
      const wheelX = cosA * spiderRadius
      const wheelZ = sinA * spiderRadius
      chairDummy.position.set(wheelX, 0.045, wheelZ)
      chairDummy.rotation.set(0, 0, 0)
      chairDummy.updateMatrix()
      casterStemInstanced.setMatrixAt(i, chairDummy.matrix)

      // Twin nylon wheels
      for (const wOffset of [-0.012, 0.012]) {
        chairDummy.position.set(wheelX + wOffset, 0.025, wheelZ)
        chairDummy.rotation.set(0, 0, 0)
        chairDummy.updateMatrix()
        wheelInstanced.setMatrixAt(wheelIndex++, chairDummy.matrix)
      }
    }
    legArmInstanced.instanceMatrix.needsUpdate = true
    casterStemInstanced.instanceMatrix.needsUpdate = true
    wheelInstanced.instanceMatrix.needsUpdate = true

    chairGroup.add(legArmInstanced)
    chairGroup.add(casterStemInstanced)
    chairGroup.add(wheelInstanced)

    // 3.2 Pneumatic Gas Cylinder & Mechanism
    const gasStrutGeo = track(new THREE.CylinderGeometry(0.02, 0.024, 0.32, 16))
    const gasStrut = new THREE.Mesh(gasStrutGeo, materials.champagneBrass)
    gasStrut.position.set(0.0, 0.26, 0.0)
    chairGroup.add(gasStrut)

    const mechBoxGeo = track(new THREE.BoxGeometry(0.18, 0.05, 0.22))
    const mechBox = new THREE.Mesh(mechBoxGeo, materials.structureGraphite)
    mechBox.position.set(0.0, 0.42, 0.0)
    chairGroup.add(mechBox)

    const leverGeo = track(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 8))
    leverGeo.rotateZ(Math.PI / 2)
    const lever = new THREE.Mesh(leverGeo, materials.structureGraphite)
    lever.position.set(0.14, 0.41, 0.04)
    chairGroup.add(lever)

    // 3.3 Contoured Waterfall Seat Cushion
    const seatShape = this.createRoundedRectShape(0.48, 0.46, 0.06)
    const seatGeo = track(
      new THREE.ExtrudeGeometry(seatShape, {
        depth: 0.06,
        bevelEnabled: true,
        bevelSegments: 4,
        bevelSize: 0.014,
        bevelThickness: 0.014,
        curveSegments: 16,
      })
    )
    seatGeo.rotateX(Math.PI / 2)
    const seatCushion = new THREE.Mesh(seatGeo, materials.chairMeshDark)
    seatCushion.position.set(0.0, 0.49, 0.02)
    seatCushion.castShadow = true
    seatCushion.receiveShadow = true
    chairGroup.add(seatCushion)

    // 3.4 Ergonomic S-Curve Lumbar Backrest
    const backGroup = new THREE.Group()
    backGroup.position.set(0.0, 0.72, 0.24)

    const spineGeo = track(new THREE.BoxGeometry(0.045, 0.42, 0.035))
    const spine = new THREE.Mesh(spineGeo, materials.structureGraphite)
    spine.position.set(0.0, 0.0, 0.0)
    spine.rotation.x = -0.12
    backGroup.add(spine)

    const backShape = this.createRoundedRectShape(0.44, 0.46, 0.05)
    const backGeo = track(
      new THREE.ExtrudeGeometry(backShape, {
        depth: 0.024,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.008,
        bevelThickness: 0.008,
        curveSegments: 12,
      })
    )
    const backMesh = new THREE.Mesh(backGeo, materials.chairMeshDark)
    backMesh.position.set(0.0, 0.06, -0.02)
    backMesh.rotation.x = -0.12
    backMesh.castShadow = true
    backGroup.add(backMesh)

    const lumbarGeo = track(new THREE.BoxGeometry(0.34, 0.09, 0.035))
    const lumbar = new THREE.Mesh(lumbarGeo, materials.structureGraphite)
    lumbar.position.set(0.0, -0.06, -0.035)
    lumbar.rotation.x = -0.12
    backGroup.add(lumbar)

    chairGroup.add(backGroup)

    // 3.5 Sculpted 3D Armrests
    for (const side of [-1, 1]) {
      const armX = side * 0.26
      const uprightGeo = track(new THREE.BoxGeometry(0.03, 0.20, 0.04))
      const upright = new THREE.Mesh(uprightGeo, materials.structureGraphite)
      upright.position.set(armX, 0.54, 0.04)
      chairGroup.add(upright)

      const padShape = this.createRoundedRectShape(0.075, 0.24, 0.02)
      const padGeo = track(
        new THREE.ExtrudeGeometry(padShape, {
          depth: 0.022,
          bevelEnabled: true,
          bevelSegments: 3,
          bevelSize: 0.006,
          bevelThickness: 0.006,
          curveSegments: 8,
        })
      )
      padGeo.rotateX(Math.PI / 2)
      const armPad = new THREE.Mesh(padGeo, materials.structureGraphite)
      armPad.position.set(armX, 0.65, 0.04)
      armPad.castShadow = true
      chairGroup.add(armPad)
    }

    podGroup.add(chairGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 4. DUAL CURVED SYSTEMS DISPLAYS (2x 27" Displays on Articulated Monitor Arms)
    // ──────────────────────────────────────────────────────────────────────────

    const monitorGroup = new THREE.Group()
    monitorGroup.position.set(0.0, 0.74, -0.38)

    // 4.1 Articulated Heavy-Duty Dual Gas-Spring Desk Mount
    const mountClampGeo = track(new THREE.BoxGeometry(0.14, 0.08, 0.09))
    const mountClamp = new THREE.Mesh(mountClampGeo, materials.structureGraphite)
    mountClamp.position.set(0.0, 0.0, 0.0)
    mountClamp.castShadow = true
    monitorGroup.add(mountClamp)

    // Vertical mounting mast
    const mastGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 0.40, 16))
    const mast = new THREE.Mesh(mastGeo, materials.structureGraphite)
    mast.position.set(0.0, 0.20, 0.0)
    monitorGroup.add(mast)

    const mastCollarGeo = track(new THREE.CylinderGeometry(0.026, 0.026, 0.025, 16))
    const mastCollar = new THREE.Mesh(mastCollarGeo, materials.champagneBrass)
    mastCollar.position.set(0.0, 0.32, 0.0)
    monitorGroup.add(mastCollar)

    // 4.2 Left Display (27" Systems Terminal & Distributed Scheduler Topology)
    const leftMonGroup = new THREE.Group()
    leftMonGroup.position.set(-0.38, 0.36, 0.16)
    leftMonGroup.rotation.y = 0.28 // Inward curve angle

    const arm1Geo = track(new THREE.BoxGeometry(0.035, 0.035, 0.22))
    const arm1 = new THREE.Mesh(arm1Geo, materials.structureGraphite)
    arm1.position.set(0.12, 0.0, -0.08)
    arm1.rotation.y = -0.22
    leftMonGroup.add(arm1)

    const mon1Shape = this.createRoundedRectShape(0.68, 0.42, 0.016)
    const mon1HousingGeo = track(
      new THREE.ExtrudeGeometry(mon1Shape, {
        depth: 0.026,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.006,
        bevelThickness: 0.006,
        curveSegments: 12,
      })
    )
    const mon1Housing = new THREE.Mesh(mon1HousingGeo, materials.gunmetal)
    mon1Housing.position.set(0.0, 0.0, 0.0)
    mon1Housing.castShadow = true
    leftMonGroup.add(mon1Housing)

    const mon1ScreenGeo = track(new THREE.PlaneGeometry(0.65, 0.39))
    const primaryScreenMesh = new THREE.Mesh(mon1ScreenGeo, materials.terminalScreenEmerald)
    primaryScreenMesh.position.set(0.0, 0.0, 0.031)
    primaryScreenMesh.name = 'screen:backend-terminal'
    leftMonGroup.add(primaryScreenMesh)
    screens.push(primaryScreenMesh)

    // Monitor Light Bar atop left display
    const bar1Geo = track(new THREE.BoxGeometry(0.40, 0.016, 0.022))
    const bar1 = new THREE.Mesh(bar1Geo, materials.structureGraphite)
    bar1.position.set(0.0, 0.225, 0.035)
    leftMonGroup.add(bar1)

    const diff1Geo = track(new THREE.BoxGeometry(0.36, 0.004, 0.012))
    const diff1 = new THREE.Mesh(diff1Geo, materials.lampWarmGlow)
    diff1.position.set(0.0, 0.215, 0.035)
    leftMonGroup.add(diff1)

    monitorGroup.add(leftMonGroup)

    // 4.3 Right Display (27" Infrastructure Telemetry & Worker Memory Metrics)
    const rightMonGroup = new THREE.Group()
    rightMonGroup.position.set(0.38, 0.36, 0.16)
    rightMonGroup.rotation.y = -0.28 // Inward curve angle

    const arm2Geo = track(new THREE.BoxGeometry(0.035, 0.035, 0.22))
    const arm2 = new THREE.Mesh(arm2Geo, materials.structureGraphite)
    arm2.position.set(-0.12, 0.0, -0.08)
    arm2.rotation.y = 0.22
    rightMonGroup.add(arm2)

    const mon2Housing = new THREE.Mesh(mon1HousingGeo, materials.gunmetal)
    mon2Housing.position.set(0.0, 0.0, 0.0)
    mon2Housing.castShadow = true
    rightMonGroup.add(mon2Housing)

    const mon2ScreenGeo = track(new THREE.PlaneGeometry(0.65, 0.39))
    const secondaryScreenMesh = new THREE.Mesh(mon2ScreenGeo, materials.terminalScreen)
    secondaryScreenMesh.position.set(0.0, 0.0, 0.031)
    secondaryScreenMesh.name = 'screen:backend-metrics'
    rightMonGroup.add(secondaryScreenMesh)
    screens.push(secondaryScreenMesh)

    // Monitor Light Bar atop right display
    const bar2Geo = track(new THREE.BoxGeometry(0.40, 0.016, 0.022))
    const bar2 = new THREE.Mesh(bar2Geo, materials.structureGraphite)
    bar2.position.set(0.0, 0.225, 0.035)
    rightMonGroup.add(bar2)

    const diff2Geo = track(new THREE.BoxGeometry(0.36, 0.004, 0.012))
    const diff2 = new THREE.Mesh(diff2Geo, materials.lampWarmGlow)
    diff2.position.set(0.0, 0.215, 0.035)
    rightMonGroup.add(diff2)

    monitorGroup.add(rightMonGroup)
    podGroup.add(monitorGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 5. TACTILE OCCUPATIONAL PERIPHERALS (Desk mat, keyboard, mouse, runbook, mug)
    // ──────────────────────────────────────────────────────────────────────────

    const peripheralsGroup = new THREE.Group()
    peripheralsGroup.position.set(0.0, 0.74, 0.0)

    // 5.1 Stitched Micro-Weave Wool Felt Desk Mat
    const matShape = this.createRoundedRectShape(0.78, 0.34, 0.02)
    const matGeo = track(
      new THREE.ExtrudeGeometry(matShape, {
        depth: 0.005,
        bevelEnabled: false,
        curveSegments: 8,
      })
    )
    matGeo.rotateX(Math.PI / 2)
    const deskMat = new THREE.Mesh(matGeo, materials.heroDeskMat)
    deskMat.position.set(0.0, 0.005, 0.16)
    deskMat.receiveShadow = true
    peripheralsGroup.add(deskMat)

    // 5.2 Compact 75% Mechanical Keyboard
    const kbShape = this.createRoundedRectShape(0.34, 0.13, 0.008)
    const kbGeo = track(
      new THREE.ExtrudeGeometry(kbShape, {
        depth: 0.014,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.002,
        bevelThickness: 0.002,
        curveSegments: 8,
      })
    )
    kbGeo.rotateX(Math.PI / 2)
    const keyboard = new THREE.Mesh(kbGeo, materials.gunmetal)
    keyboard.position.set(-0.06, 0.014, 0.16)
    keyboard.castShadow = true
    peripheralsGroup.add(keyboard)

    // Brass keycap switchplate accent
    const kbPlateGeo = track(new THREE.BoxGeometry(0.32, 0.003, 0.11))
    const kbPlate = new THREE.Mesh(kbPlateGeo, materials.champagneBrass)
    kbPlate.position.set(-0.06, 0.016, 0.16)
    peripheralsGroup.add(kbPlate)

    // Coiled USB-C keyboard cable routing to back
    const cableGeo = track(new THREE.CylinderGeometry(0.003, 0.003, 0.22, 8))
    cableGeo.rotateX(Math.PI / 2)
    const cable = new THREE.Mesh(cableGeo, materials.structureGraphite)
    cable.position.set(-0.06, 0.006, 0.02)
    peripheralsGroup.add(cable)

    // 5.3 Sculpted Ergonomic Wireless Mouse / Trackball
    const mouseGeo = track(new THREE.BoxGeometry(0.06, 0.022, 0.10))
    const mouse = new THREE.Mesh(mouseGeo, materials.structureGraphite)
    mouse.position.set(0.24, 0.016, 0.16)
    mouse.castShadow = true
    peripheralsGroup.add(mouse)

    // 5.4 Hardbound Systems Architecture Diagnostic Runbook
    const bookGeo = track(new THREE.BoxGeometry(0.22, 0.022, 0.16))
    const book = new THREE.Mesh(bookGeo, materials.bookSpineNavy)
    book.position.set(-0.68, 0.015, 0.12)
    book.rotation.y = 0.14
    book.castShadow = true
    peripheralsGroup.add(book)

    // Gold ribbon bookmark
    const ribbonGeo = track(new THREE.BoxGeometry(0.012, 0.002, 0.18))
    const ribbon = new THREE.Mesh(ribbonGeo, materials.champagneBrass)
    ribbon.position.set(-0.68, 0.028, 0.12)
    ribbon.rotation.y = 0.14
    peripheralsGroup.add(ribbon)

    // 5.5 Terracotta Ceramic Espresso Mug
    const mugGeo = track(new THREE.CylinderGeometry(0.038, 0.034, 0.08, 16))
    const mug = new THREE.Mesh(mugGeo, materials.coffeeMugTerracotta)
    mug.position.set(0.72, 0.045, 0.18)
    mug.castShadow = true
    peripheralsGroup.add(mug)

    const handleGeo = track(new THREE.TorusGeometry(0.02, 0.005, 8, 16))
    const handle = new THREE.Mesh(handleGeo, materials.coffeeMugTerracotta)
    handle.position.set(0.76, 0.045, 0.18)
    handle.rotation.y = Math.PI / 2
    peripheralsGroup.add(handle)

    podGroup.add(peripheralsGroup)

    return {
      podGroup,
      indicatorMesh: ind,
      screens,
      primaryScreenMesh,
      secondaryScreenMesh,
    }
  }
}
