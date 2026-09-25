/**
 * Gravitas 3D Headquarters — Wave 12F Hero Frontend Workstation Bay
 *
 * Authored high-fidelity 3D workspace for the Frontend Engineer role on Floor 2:
 * - Tabletop with rounded corners, beveled edge chamfers, and under-desk cable management
 * - Motorized telescoping steel trestle legs with brass leveling glide feet
 * - Engineered ergonomic task chair: 5-star arched spider base, casters, pneumatic strut,
 *   contoured waterfall seat cushion, and anatomical S-curve mesh backrest
 * - Dual-arm gas-spring articulated monitor mount with 34" curved ultrawide display,
 *   recessed screen plane, monitor light bar, and secondary 24" portrait preview display
 * - Restrained tactile peripherals: low-profile mechanical keyboard, stitched desk mat,
 *   sculpted precision wireless mouse, angled graphics tablet, cantilevered brass desk lamp,
 *   handcrafted ceramic mug, and dot-grid notebook
 * - Immediate architectural framing: vertical acoustic timber battens over felt backing,
 *   warm oak floor inlay, and dedicated local lighting composition
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'

export interface HeroBayBuildResult {
  readonly podGroup: THREE.Group
  readonly indicatorMesh: THREE.Mesh
  readonly screens: THREE.Mesh[]
  readonly primaryScreenMesh: THREE.Mesh
  readonly secondaryScreenMesh: THREE.Mesh
}

export class HeroFrontendBay {
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
   * Builds the complete Hero Frontend Bay assembly
   */
  public static buildBay(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): HeroBayBuildResult {
    const podGroup = new THREE.Group()
    podGroup.name = 'station:frontend-engineer-workstation'
    podGroup.userData = {
      type: 'station',
      id: 'frontend-engineer-workstation',
      name: 'Frontend Engineer Workstation (Hero Fidelity)',
    }

    const screens: THREE.Mesh[] = []

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ARCHITECTURAL FRAMING & IMMEDIATE BAY SLICE
    // ──────────────────────────────────────────────────────────────────────────

    // 1.1 White Oak Herringbone Inlay Floor Slice (3.4m x 3.6m)
    const floorInlayGeo = track(new THREE.BoxGeometry(3.6, 0.006, 3.2))
    const floorInlay = new THREE.Mesh(floorInlayGeo, materials.heroDeskWood)
    floorInlay.position.set(0.0, 0.003, 0.2)
    floorInlay.receiveShadow = true
    podGroup.add(floorInlay)

    // Brass edge boundary inlay trim
    const floorTrimGeo = track(new THREE.BoxGeometry(3.64, 0.008, 0.04))
    const floorTrim = new THREE.Mesh(floorTrimGeo, materials.heroBrass)
    floorTrim.position.set(0.0, 0.004, 1.8)
    podGroup.add(floorTrim)

    // 1.2 Acoustic Timber Batten Rear Wall (2.8m wide x 3.2m high)
    // Positioned behind the chair and character at +Z, facing forward into the bay
    const acousticWallGroup = new THREE.Group()
    acousticWallGroup.position.set(0.0, 1.6, 1.45)

    // Dark acoustic felt backer
    const feltBackerGeo = track(new THREE.BoxGeometry(3.2, 3.2, 0.02))
    const feltBacker = new THREE.Mesh(feltBackerGeo, materials.heroAcousticFelt)
    feltBacker.position.set(0.0, 0.0, 0.01)
    feltBacker.receiveShadow = true
    acousticWallGroup.add(feltBacker)

    // Vertical solid oak timber slats with deep shadow reveals facing into the bay (-Z) (instanced for optimal draw call budget)
    const slatWidth = 0.038
    const slatDepth = 0.024
    const slatSpacing = 0.075
    const slatCount = 42

    const slatGeo = track(new THREE.BoxGeometry(slatWidth, 3.12, slatDepth))
    const startX = -((slatCount - 1) * slatSpacing) / 2

    const slatInstanced = new THREE.InstancedMesh(slatGeo, materials.heroAcousticWood, slatCount)
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
    const casingGeo = track(new THREE.BoxGeometry(0.024, 3.2, 0.034))
    const casingRevealGeo = track(new THREE.BoxGeometry(0.012, 3.2, 0.036))
    for (const sx of [-1.61, 1.61]) {
      const casing = new THREE.Mesh(casingGeo, materials.structureGraphite)
      casing.position.set(sx, 0.0, -slatDepth / 2 - 0.004)
      acousticWallGroup.add(casing)

      const casingReveal = new THREE.Mesh(casingRevealGeo, materials.heroBrass)
      casingReveal.position.set(sx - (Math.sign(sx) * 0.012), 0.0, -slatDepth / 2 - 0.005)
      acousticWallGroup.add(casingReveal)
    }

    // Horizontal champagne brass architectural reveal datum trim
    const datumTrimGeo = track(new THREE.BoxGeometry(3.24, 0.018, 0.034))
    const datumTrim = new THREE.Mesh(datumTrimGeo, materials.heroBrass)
    datumTrim.position.set(0.0, -0.85, -slatDepth / 2 - 0.006)
    acousticWallGroup.add(datumTrim)

    podGroup.add(acousticWallGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. THE HERO DESK (Beveled solid oak top, motorized steel frame, cable tray)
    // ──────────────────────────────────────────────────────────────────────────

    const deskGroup = new THREE.Group()
    deskGroup.position.set(0.0, 0.0, 0.0)

    // 2.1 Solid Oak Tabletop with Rounded Corners & Beveled Edges
    // Shape: 2.10m x 0.90m, corner radius 0.04m, beveled chamfer 0.008m
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
    topGeo.rotateX(Math.PI / 2) // Orient flat horizontally
    const deskTop = new THREE.Mesh(topGeo, materials.heroDeskWood)
    deskTop.position.set(0.0, 0.74, 0.0)
    deskTop.castShadow = true
    deskTop.receiveShadow = true
    deskGroup.add(deskTop)

    // 2.2 Motorized Dual-Stage Telescoping Steel Lift Legs
    const legSpacingX = 0.88
    const outerColGeo = track(new THREE.BoxGeometry(0.08, 0.38, 0.055))
    const innerColGeo = track(new THREE.BoxGeometry(0.07, 0.34, 0.048))
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
    const glideGeo = track(new THREE.CylinderGeometry(0.022, 0.024, 0.012, 16))
    const topBracketGeo = track(new THREE.BoxGeometry(0.065, 0.025, 0.62))

    for (const side of [-1, 1]) {
      const legX = side * legSpacingX

      // Lower stage outer column (powder-coated graphite steel)
      const outerCol = new THREE.Mesh(outerColGeo, materials.heroSteel)
      outerCol.position.set(legX, 0.20, 0.0)
      outerCol.castShadow = true
      deskGroup.add(outerCol)

      // Upper stage inner column (telescoping sleeve)
      const innerCol = new THREE.Mesh(innerColGeo, materials.heroSteel)
      innerCol.position.set(legX, 0.54, 0.0)
      innerCol.castShadow = true
      deskGroup.add(innerCol)

      // Solid steel foot sled with beveled ends
      const footSled = new THREE.Mesh(footGeo, materials.heroSteel)
      footSled.position.set(legX, 0.024, 0.0)
      footSled.castShadow = true
      footSled.receiveShadow = true
      deskGroup.add(footSled)

      // Dual brass leveling glide discs underneath each foot
      for (const fz of [-0.32, 0.32]) {
        const glide = new THREE.Mesh(glideGeo, materials.heroBrass)
        glide.position.set(legX, 0.006, fz)
        deskGroup.add(glide)
      }

      // Upper desktop mounting bracket
      const topBracket = new THREE.Mesh(topBracketGeo, materials.heroSteel)
      topBracket.position.set(legX, 0.71, 0.0)
      deskGroup.add(topBracket)
    }

    // 2.3 Structural Crossbeam & Cable Management Raceway
    const crossbeamGeo = track(new THREE.BoxGeometry(1.68, 0.045, 0.045))
    const crossbeam = new THREE.Mesh(crossbeamGeo, materials.heroSteel)
    crossbeam.position.set(0.0, 0.68, -0.05)
    deskGroup.add(crossbeam)

    // Under-desk folded perforated metal cable tray
    const cableTrayGeo = track(new THREE.BoxGeometry(1.4, 0.08, 0.18))
    const cableTray = new THREE.Mesh(cableTrayGeo, materials.heroSteel)
    cableTray.position.set(0.0, 0.66, -0.22)
    deskGroup.add(cableTray)

    // Desk wire pass-through grommet (rear center-left)
    const grommetGeo = track(new THREE.CylinderGeometry(0.032, 0.034, 0.04, 24))
    const grommet = new THREE.Mesh(grommetGeo, materials.heroBrass)
    grommet.position.set(-0.35, 0.74, -0.36)
    deskGroup.add(grommet)

    // Authoritative Station Status Indicator (inset flush with front desk rim)
    const indGeo = track(new THREE.BoxGeometry(0.22, 0.012, 0.035))
    const ind = new THREE.Mesh(indGeo, materials.gunmetal)
    ind.position.set(0.0, 0.745, 0.44)
    ind.name = 'station-indicator:frontend-engineer-workstation'
    deskGroup.add(ind)

    podGroup.add(deskGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. THE HERO TASK CHAIR (5-star spider base, casters, contoured lumbar mesh)
    // ──────────────────────────────────────────────────────────────────────────

    const chairGroup = new THREE.Group()
    chairGroup.position.set(0.0, 0.0, 0.55) // Seated alignment matching character home position
    chairGroup.name = 'hero-frontend-chair'

    // 3.1 Five-Star Spider Base with Dual-Wheel Casters
    const spiderHubGeo = track(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 16))
    const spiderHub = new THREE.Mesh(spiderHubGeo, materials.heroSteel)
    spiderHub.position.set(0.0, 0.12, 0.0)
    chairGroup.add(spiderHub)

    const spiderRadius = 0.28
    const legArmGeo = track(new THREE.BoxGeometry(0.032, 0.024, spiderRadius))
    const legArmInstanced = new THREE.InstancedMesh(legArmGeo, materials.heroSteel, 5)

    const casterStemGeo = track(new THREE.CylinderGeometry(0.008, 0.008, 0.035, 8))
    const casterStemInstanced = new THREE.InstancedMesh(casterStemGeo, materials.heroSteel, 5)

    const chairWheelGeo = track(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 12))
    chairWheelGeo.rotateZ(Math.PI / 2)
    const chairWheelInstanced = new THREE.InstancedMesh(chairWheelGeo, materials.heroPlastic, 10)

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

      // Dual wheels
      for (const wOffset of [-0.012, 0.012]) {
        chairDummy.position.set(wheelX + wOffset, 0.025, wheelZ)
        chairDummy.rotation.set(0, 0, 0)
        chairDummy.updateMatrix()
        chairWheelInstanced.setMatrixAt(wheelIndex++, chairDummy.matrix)
      }
    }
    legArmInstanced.instanceMatrix.needsUpdate = true
    casterStemInstanced.instanceMatrix.needsUpdate = true
    chairWheelInstanced.instanceMatrix.needsUpdate = true

    chairGroup.add(legArmInstanced)
    chairGroup.add(casterStemInstanced)
    chairGroup.add(chairWheelInstanced)

    // 3.2 Pneumatic Gas Cylinder & Mechanism
    const gasStrutGeo = track(new THREE.CylinderGeometry(0.02, 0.024, 0.32, 16))
    const gasStrut = new THREE.Mesh(gasStrutGeo, materials.heroBrass)
    gasStrut.position.set(0.0, 0.26, 0.0)
    chairGroup.add(gasStrut)

    // Under-seat tilt control housing
    const mechBoxGeo = track(new THREE.BoxGeometry(0.18, 0.05, 0.22))
    const mechBox = new THREE.Mesh(mechBoxGeo, materials.heroSteel)
    mechBox.position.set(0.0, 0.42, 0.0)
    chairGroup.add(mechBox)

    // Height paddle lever extending to right
    const leverGeo = track(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 8))
    leverGeo.rotateZ(Math.PI / 2)
    const lever = new THREE.Mesh(leverGeo, materials.heroSteel)
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
    const seatCushion = new THREE.Mesh(seatGeo, materials.heroFabric)
    seatCushion.position.set(0.0, 0.49, 0.02)
    seatCushion.castShadow = true
    seatCushion.receiveShadow = true
    chairGroup.add(seatCushion)

    // 3.4 Ergonomic S-Curve Lumbar Backrest
    const backGroup = new THREE.Group()
    backGroup.position.set(0.0, 0.72, 0.24)

    // Structural spine support post
    const spineGeo = track(new THREE.BoxGeometry(0.045, 0.42, 0.035))
    const spine = new THREE.Mesh(spineGeo, materials.heroSteel)
    spine.position.set(0.0, 0.0, 0.0)
    spine.rotation.x = -0.12 // Ergonomic back angle
    backGroup.add(spine)

    // Contoured backrest perimeter frame
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
    const backMesh = new THREE.Mesh(backGeo, materials.heroFabric)
    backMesh.position.set(0.0, 0.06, -0.02)
    backMesh.rotation.x = -0.12
    backMesh.castShadow = true
    backGroup.add(backMesh)

    // Dedicated horizontal lumbar support pad
    const lumbarGeo = track(new THREE.BoxGeometry(0.34, 0.09, 0.035))
    const lumbar = new THREE.Mesh(lumbarGeo, materials.heroSteel)
    lumbar.position.set(0.0, -0.06, -0.035)
    lumbar.rotation.x = -0.12
    backGroup.add(lumbar)

    chairGroup.add(backGroup)

    // 3.5 Sculpted 3D Armrests
    const uprightGeo = track(new THREE.BoxGeometry(0.03, 0.20, 0.04))
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

    for (const side of [-1, 1]) {
      const armX = side * 0.26
      const upright = new THREE.Mesh(uprightGeo, materials.heroSteel)
      upright.position.set(armX, 0.54, 0.04)
      chairGroup.add(upright)

      const armPad = new THREE.Mesh(padGeo, materials.heroPlastic)
      armPad.position.set(armX, 0.65, 0.04)
      chairGroup.add(armPad)
    }

    podGroup.add(chairGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 4. THE HERO MONITORS (34" Ultrawide + 24" Portrait on Articulated Arms)
    // ──────────────────────────────────────────────────────────────────────────

    const monitorGroup = new THREE.Group()
    monitorGroup.position.set(0.0, 0.74, -0.38)

    // 4.1 Articulated Heavy-Duty Dual Gas-Spring Desk Mount
    const mountClampGeo = track(new THREE.BoxGeometry(0.12, 0.08, 0.09))
    const mountClamp = new THREE.Mesh(mountClampGeo, materials.heroSteel)
    mountClamp.position.set(0.0, 0.0, 0.0)
    monitorGroup.add(mountClamp)

    // Vertical mounting mast
    const mastGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 0.38, 16))
    const mast = new THREE.Mesh(mastGeo, materials.heroSteel)
    mast.position.set(0.0, 0.19, 0.0)
    monitorGroup.add(mast)

    const mastCollarGeo = track(new THREE.CylinderGeometry(0.026, 0.026, 0.025, 16))
    const mastCollar = new THREE.Mesh(mastCollarGeo, materials.heroBrass)
    mastCollar.position.set(0.0, 0.32, 0.0)
    monitorGroup.add(mastCollar)

    // 4.2 Primary 34" Curved Ultrawide Display (Center-Right)
    const ultrawideGroup = new THREE.Group()
    ultrawideGroup.position.set(0.12, 0.36, 0.16)

    // Articulated gas-spring arm segment extending from mast
    const arm1Geo = track(new THREE.BoxGeometry(0.035, 0.035, 0.24))
    const arm1 = new THREE.Mesh(arm1Geo, materials.heroSteel)
    arm1.position.set(0.06, 0.0, -0.1)
    arm1.rotation.y = 0.25
    ultrawideGroup.add(arm1)

    // Ultrawide rear casing with rounded profile (0.84m x 0.42m x 0.032m)
    const uwShape = this.createRoundedRectShape(0.84, 0.42, 0.018)
    const uwHousingGeo = track(
      new THREE.ExtrudeGeometry(uwShape, {
        depth: 0.028,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.006,
        bevelThickness: 0.006,
        curveSegments: 12,
      })
    )
    const uwHousing = new THREE.Mesh(uwHousingGeo, materials.heroPlastic)
    uwHousing.position.set(0.0, 0.0, 0.0)
    uwHousing.castShadow = true
    ultrawideGroup.add(uwHousing)

    // Recessed matte display surface plane (recessed by 2mm)
    const uwScreenGeo = track(new THREE.PlaneGeometry(0.81, 0.39))
    const primaryScreenMesh = new THREE.Mesh(uwScreenGeo, materials.heroScreenIdle)
    primaryScreenMesh.position.set(0.0, 0.0, 0.033)
    primaryScreenMesh.name = 'screen:hero-ultrawide'
    ultrawideGroup.add(primaryScreenMesh)
    screens.push(primaryScreenMesh)

    // Aluminum chin bezel trim on bottom
    const chinGeo = track(new THREE.BoxGeometry(0.82, 0.016, 0.008))
    const chin = new THREE.Mesh(chinGeo, materials.heroSteel)
    chin.position.set(0.0, -0.202, 0.035)
    ultrawideGroup.add(chin)

    // Sleek CNC Aluminum Monitor Light Bar mounted to top bezel
    const lightBarGeo = track(new THREE.BoxGeometry(0.48, 0.016, 0.024))
    const lightBar = new THREE.Mesh(lightBarGeo, materials.heroSteel)
    lightBar.position.set(0.0, 0.225, 0.04)
    ultrawideGroup.add(lightBar)

    // Light bar downward diffuser strip
    const barDiffuserGeo = track(new THREE.BoxGeometry(0.44, 0.004, 0.014))
    const barDiffuser = new THREE.Mesh(barDiffuserGeo, materials.heroLampGlow)
    barDiffuser.position.set(0.0, 0.215, 0.04)
    ultrawideGroup.add(barDiffuser)

    monitorGroup.add(ultrawideGroup)

    // 4.3 Secondary 24" Portrait Display (Left, angled inward at 28°)
    const portraitGroup = new THREE.Group()
    portraitGroup.position.set(-0.52, 0.36, 0.14)
    portraitGroup.rotation.y = 0.42 // Tilted inward toward engineer

    // Left articulated arm segment
    const arm2Geo = track(new THREE.BoxGeometry(0.035, 0.035, 0.22))
    const arm2 = new THREE.Mesh(arm2Geo, materials.heroSteel)
    arm2.position.set(0.12, 0.0, -0.1)
    arm2.rotation.y = -0.3
    portraitGroup.add(arm2)

    // Portrait monitor housing (0.34m x 0.54m x 0.026m)
    const portShape = this.createRoundedRectShape(0.34, 0.54, 0.016)
    const portHousingGeo = track(
      new THREE.ExtrudeGeometry(portShape, {
        depth: 0.024,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.005,
        bevelThickness: 0.005,
        curveSegments: 12,
      })
    )
    const portHousing = new THREE.Mesh(portHousingGeo, materials.heroPlastic)
    portHousing.position.set(0.0, 0.0, 0.0)
    portHousing.castShadow = true
    portraitGroup.add(portHousing)

    // Recessed portrait screen surface
    const portScreenGeo = track(new THREE.PlaneGeometry(0.315, 0.515))
    const secondaryScreenMesh = new THREE.Mesh(portScreenGeo, materials.heroScreenPortrait)
    secondaryScreenMesh.position.set(0.0, 0.0, 0.028)
    secondaryScreenMesh.name = 'screen:hero-portrait'
    portraitGroup.add(secondaryScreenMesh)
    screens.push(secondaryScreenMesh)

    monitorGroup.add(portraitGroup)
    podGroup.add(monitorGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 5. HERO INPUT PERIPHERALS & DESK ACCESSORIES
    // ──────────────────────────────────────────────────────────────────────────

    const accessoriesGroup = new THREE.Group()
    accessoriesGroup.position.set(0.0, 0.75, 0.0)

    // 5.1 Large Stitched Felt/Leather Desk Mat (0.86m x 0.42m)
    const matGeo = track(new THREE.BoxGeometry(0.86, 0.004, 0.42))
    const deskMat = new THREE.Mesh(matGeo, materials.heroDeskMat)
    deskMat.position.set(0.05, 0.002, 0.12)
    deskMat.receiveShadow = true
    accessoriesGroup.add(deskMat)

    // 5.2 Low-Profile CNC Aluminum Mechanical Keyboard (75% Layout)
    const kbGroup = new THREE.Group()
    kbGroup.position.set(-0.06, 0.005, 0.14)
    kbGroup.rotation.x = -0.06 // 6-degree ergonomic typing incline

    // CNC Aluminum wedge case with beveled perimeter
    const kbCaseShape = this.createRoundedRectShape(0.36, 0.145, 0.01)
    const kbCaseGeo = track(
      new THREE.ExtrudeGeometry(kbCaseShape, {
        depth: 0.016,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.003,
        bevelThickness: 0.003,
        curveSegments: 8,
      })
    )
    kbCaseGeo.rotateX(Math.PI / 2)
    const kbCase = new THREE.Mesh(kbCaseGeo, materials.heroSteel)
    kbGroup.add(kbCase)

    // Sculpted keycap matrix block
    const keycapBlockGeo = track(new THREE.BoxGeometry(0.33, 0.009, 0.12))
    const keycapBlock = new THREE.Mesh(keycapBlockGeo, materials.heroPlastic)
    keycapBlock.position.set(0.0, 0.014, 0.0)
    kbGroup.add(keycapBlock)

    // Terracotta accent return key
    const enterKeyGeo = track(new THREE.BoxGeometry(0.038, 0.011, 0.018))
    const enterKey = new THREE.Mesh(enterKeyGeo, materials.charPlannerAccent)
    enterKey.position.set(0.125, 0.016, 0.008)
    kbGroup.add(enterKey)

    // Coiled aviator cable from keyboard to rear grommet
    const cableGeo = track(new THREE.CylinderGeometry(0.0035, 0.0035, 0.32, 8))
    cableGeo.rotateX(Math.PI / 2)
    const cable = new THREE.Mesh(cableGeo, materials.heroSteel)
    cable.position.set(-0.10, 0.004, -0.16)
    kbGroup.add(cable)

    accessoriesGroup.add(kbGroup)

    // 5.3 Sculpted Ergonomic Wireless Mouse
    const mouseGroup = new THREE.Group()
    mouseGroup.position.set(0.32, 0.005, 0.16)

    const mouseBodyGeo = track(new THREE.CapsuleGeometry(0.026, 0.065, 8, 12))
    mouseBodyGeo.rotateX(Math.PI / 2)
    const mouseBody = new THREE.Mesh(mouseBodyGeo, materials.heroSteel)
    mouseBody.scale.set(1.0, 0.55, 1.0)
    mouseBody.position.set(0.0, 0.014, 0.0)
    mouseGroup.add(mouseBody)

    // Knurled metal scroll wheel
    const wheelGeo = track(new THREE.CylinderGeometry(0.006, 0.006, 0.005, 12))
    wheelGeo.rotateZ(Math.PI / 2)
    const scrollWheel = new THREE.Mesh(wheelGeo, materials.heroBrass)
    scrollWheel.position.set(0.0, 0.026, -0.018)
    mouseGroup.add(scrollWheel)

    accessoriesGroup.add(mouseGroup)

    // 5.4 Angled Creative Graphics Tablet & Stylus (Left of keyboard)
    const tabGroup = new THREE.Group()
    tabGroup.position.set(-0.52, 0.005, 0.16)
    tabGroup.rotation.y = 0.12 // Angled toward engineer

    // Aluminum drafting stand
    const tabStandGeo = track(new THREE.BoxGeometry(0.24, 0.022, 0.16))
    tabStandGeo.rotateX(-0.14) // 12-degree drafting wedge
    const tabStand = new THREE.Mesh(tabStandGeo, materials.heroSteel)
    tabStand.position.set(0.0, 0.012, 0.0)
    tabGroup.add(tabStand)

    // Glass tablet surface
    const tabSlateGeo = track(new THREE.BoxGeometry(0.25, 0.006, 0.17))
    tabSlateGeo.rotateX(-0.14)
    const tabSlate = new THREE.Mesh(tabSlateGeo, materials.heroTablet)
    tabSlate.position.set(0.0, 0.026, 0.0)
    tabGroup.add(tabSlate)

    // Magnetic stylus resting beside tablet
    const stylusGeo = track(new THREE.CylinderGeometry(0.004, 0.004, 0.15, 12))
    stylusGeo.rotateZ(Math.PI / 2)
    const stylus = new THREE.Mesh(stylusGeo, materials.heroSteel)
    stylus.position.set(0.0, 0.012, 0.11)
    tabGroup.add(stylus)

    const stylusTipGeo = track(new THREE.ConeGeometry(0.004, 0.012, 12))
    stylusTipGeo.rotateZ(-Math.PI / 2)
    const stylusTip = new THREE.Mesh(stylusTipGeo, materials.heroBrass)
    stylusTip.position.set(-0.08, 0.012, 0.11)
    tabGroup.add(stylusTip)

    accessoriesGroup.add(tabGroup)

    // 5.5 Architectural Cantilever Desk Lamp (Far left)
    const lampGroup = new THREE.Group()
    lampGroup.position.set(-0.84, 0.005, -0.12)

    // Circular brass counterweight base
    const lampBaseGeo = track(new THREE.CylinderGeometry(0.065, 0.07, 0.024, 24))
    const lampBase = new THREE.Mesh(lampBaseGeo, materials.heroBrass)
    lampBase.position.set(0.0, 0.012, 0.0)
    lampGroup.add(lampBase)

    // Articulated dual thin upright arms
    const lampLowerArmGeo = track(new THREE.CylinderGeometry(0.005, 0.005, 0.42, 8))
    const lampLowerArm = new THREE.Mesh(lampLowerArmGeo, materials.heroSteel)
    lampLowerArm.position.set(0.05, 0.20, 0.0)
    lampLowerArm.rotation.z = -0.22
    lampGroup.add(lampLowerArm)

    // Brass elbow joint knuckle
    const knuckleGeo = track(new THREE.SphereGeometry(0.016, 12, 12))
    const knuckle = new THREE.Mesh(knuckleGeo, materials.heroBrass)
    knuckle.position.set(0.09, 0.39, 0.0)
    lampGroup.add(knuckle)

    // Upper cantilever arm extending over the desk
    const lampUpperArmGeo = track(new THREE.CylinderGeometry(0.0045, 0.0045, 0.38, 8))
    const lampUpperArm = new THREE.Mesh(lampUpperArmGeo, materials.heroSteel)
    lampUpperArm.position.set(0.24, 0.45, 0.05)
    lampUpperArm.rotation.z = -1.25
    lampGroup.add(lampUpperArm)

    // Linear lamp head hood
    const lampHeadGeo = track(new THREE.BoxGeometry(0.26, 0.016, 0.038))
    const lampHead = new THREE.Mesh(lampHeadGeo, materials.heroSteel)
    lampHead.position.set(0.38, 0.49, 0.08)
    lampGroup.add(lampHead)

    // Lamp warm LED diffuser plate
    const lampDiffuserGeo = track(new THREE.BoxGeometry(0.24, 0.004, 0.028))
    const lampDiffuser = new THREE.Mesh(lampDiffuserGeo, materials.heroLampGlow)
    lampDiffuser.position.set(0.38, 0.48, 0.08)
    lampGroup.add(lampDiffuser)

    // Dedicated local desk spot light casting warm contact illumination
    const deskSpot = new THREE.PointLight(0xffedd5, 1.2, 1.8, 1.5)
    deskSpot.position.set(0.38, 0.46, 0.08)
    lampGroup.add(deskSpot)

    accessoriesGroup.add(lampGroup)

    // 5.6 Handcrafted Ceramic Coffee Mug (Right side)
    const mugGroup = new THREE.Group()
    mugGroup.position.set(0.68, 0.005, 0.18)

    // Tapered ceramic cup body with teal reactive glaze
    const mugBodyGeo = track(new THREE.CylinderGeometry(0.042, 0.036, 0.088, 20))
    const mugBody = new THREE.Mesh(mugBodyGeo, materials.heroCeramic)
    mugBody.position.set(0.0, 0.044, 0.0)
    mugGroup.add(mugBody)

    // Exposed terracotta clay bottom ring
    const clayRingGeo = track(new THREE.CylinderGeometry(0.0365, 0.036, 0.012, 20))
    const clayRing = new THREE.Mesh(clayRingGeo, materials.coffeeMugTerracotta)
    clayRing.position.set(0.0, 0.006, 0.0)
    mugGroup.add(clayRing)

    // Torus handle
    const handleGeo = track(new THREE.TorusGeometry(0.024, 0.006, 8, 16, Math.PI * 1.2))
    const handle = new THREE.Mesh(handleGeo, materials.heroCeramic)
    handle.position.set(0.042, 0.044, 0.0)
    handle.rotation.z = -Math.PI / 2
    mugGroup.add(handle)

    accessoriesGroup.add(mugGroup)

    // 5.7 Hardcover Linen Dot-Grid Notebook & Ballpoint Pen
    const nbGroup = new THREE.Group()
    nbGroup.position.set(0.62, 0.005, -0.08)
    nbGroup.rotation.y = -0.15

    const nbGeo = track(new THREE.BoxGeometry(0.18, 0.018, 0.24))
    const nb = new THREE.Mesh(nbGeo, materials.heroFabric)
    nb.position.set(0.0, 0.009, 0.0)
    nbGroup.add(nb)

    // Ribbon bookmark
    const ribbonGeo = track(new THREE.BoxGeometry(0.014, 0.002, 0.12))
    const ribbon = new THREE.Mesh(ribbonGeo, materials.charFrontendAccent)
    ribbon.position.set(0.02, 0.02, 0.08)
    nbGroup.add(ribbon)

    // Ballpoint pen
    const penGeo = track(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 12))
    penGeo.rotateZ(Math.PI / 2)
    const pen = new THREE.Mesh(penGeo, materials.heroBrass)
    pen.position.set(-0.11, 0.008, 0.0)
    nbGroup.add(pen)

    accessoriesGroup.add(nbGroup)
    podGroup.add(accessoriesGroup)

    return {
      podGroup,
      indicatorMesh: ind,
      screens,
      primaryScreenMesh,
      secondaryScreenMesh,
    }
  }
}
