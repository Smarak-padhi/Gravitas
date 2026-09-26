/**
 * Gravitas 3D Headquarters — Floor 4 Browser QA Lab
 * Layer A: The Multi-Device Test Rig (Hero Physical Apparatus — Wave 12K-R)
 *
 * Implements the professional multi-device testing apparatus:
 * - Positioned at X = 0.0, Y = 14.4, Z = 1.0
 * - Unmistakable multi-device testing architecture with clear viewport hierarchy:
 *   [DESKTOP (38" Ultrawide)]
 *   [LAPTOP (16" Reference Clamshell on Riser)]
 *   [TABLET (11" Touchscreen on Magnetic Articulation)]
 *   [PHONES (Dual Mobile Devices in Vertical Rack)]
 * - Heavy industrial aluminum profile armature with champagne brass joint gussets
 * - Dedicated charging/docking conduits with organized cable management snakes
 * - Central test controller & input area (viewport routing keys, optical trackball, rotary knob)
 * - Deterministic status indicator bezel at front centerline
 * - Technical QA drafting stool with circular footring
 * - Dormant screens remain dark glass when idle (zero fake websites, zero fake dashboards)
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'

export interface DeviceTestBenchBuildResult {
  readonly benchGroup: THREE.Group
  readonly indicatorMesh: THREE.Mesh
  readonly screens: THREE.Mesh[]
}

export class DeviceTestBench {
  public static buildBench(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): DeviceTestBenchBuildResult {
    const benchGroup = new THREE.Group()
    benchGroup.position.set(0.0, 0.0, 1.0)
    benchGroup.name = 'station:browser-qa-matrix'
    benchGroup.userData = {
      type: 'station',
      id: 'browser-qa-matrix',
      name: 'Multi-Device Browser QA Test Rig',
      roomId: 'BROWSER_QA_LAB',
      role: 'Responsive DOM & Multi-Device Validation',
      status: 'Matrix Bench',
      description: 'Industrial multi-viewport testing apparatus representing Desktop, Laptop, Tablet, and Mobile devices on an integrated telemetry test rig.',
    }

    const screens: THREE.Mesh[] = []

    // ──────────────────────────────────────────────────────────────────────────
    // 1. CHASSIS BASE & PEDESTAL SUPPORTS
    // ──────────────────────────────────────────────────────────────────────────
    // Ground contact shadow runner
    const shadowPlinthGeo = track(new THREE.BoxGeometry(3.64, 0.008, 1.16))
    const shadowPlinth = new THREE.Mesh(shadowPlinthGeo, materials.limestoneDark)
    shadowPlinth.position.set(0.0, 0.004, 0.0)
    shadowPlinth.receiveShadow = true
    benchGroup.add(shadowPlinth)

    // Heavy cast graphite pedestals with vibration isolation damper shoes
    const pedGeo = track(new THREE.BoxGeometry(0.56, 0.72, 0.78))
    for (const px of [-1.25, 1.25]) {
      const ped = new THREE.Mesh(pedGeo, materials.structureGraphite)
      ped.position.set(px, 0.36, 0.0)
      ped.castShadow = true
      ped.receiveShadow = true
      benchGroup.add(ped)

      // Vibration damper shoes in gunmetal & champagne brass leveling glides
      const shoeGeo = track(new THREE.BoxGeometry(0.64, 0.035, 0.86))
      const shoe = new THREE.Mesh(shoeGeo, materials.gunmetal)
      shoe.position.set(px, 0.018, 0.0)
      benchGroup.add(shoe)

      for (const [gx, gz] of [[-0.26, -0.36], [0.26, -0.36], [-0.26, 0.36], [0.26, 0.36]]) {
        const glideGeo = track(new THREE.CylinderGeometry(0.022, 0.026, 0.02, 12))
        const glide = new THREE.Mesh(glideGeo, materials.champagneBrass)
        glide.position.set(px + gx, 0.01, gz)
        benchGroup.add(glide)
      }
    }

    // Heavy structural steel tie-beam with integrated cable conduit
    const tieGeo = track(new THREE.BoxGeometry(2.1, 0.05, 0.08))
    const tie = new THREE.Mesh(tieGeo, materials.gunmetal)
    tie.position.set(0.0, 0.22, 0.0)
    benchGroup.add(tie)

    // Under-desk cable management spine & power distribution channel
    const pduGeo = track(new THREE.BoxGeometry(2.3, 0.08, 0.22))
    const pdu = new THREE.Mesh(pduGeo, materials.structureGraphite)
    pdu.position.set(0.0, 0.66, 0.0)
    benchGroup.add(pdu)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. MAIN TECHNICAL WORKTOP & PERIMETER REVEAL
    // ──────────────────────────────────────────────────────────────────────────
    // Solid beveled graphite composite testing deck (3.6m x 1.1m x 0.06m)
    const topGeo = track(new THREE.BoxGeometry(3.6, 0.06, 1.1))
    const topMesh = new THREE.Mesh(topGeo, materials.structureGraphite)
    topMesh.position.set(0.0, 0.75, 0.0)
    topMesh.castShadow = true
    topMesh.receiveShadow = true
    benchGroup.add(topMesh)

    // Solid American walnut edge trim with chamfer
    const trimGeo = track(new THREE.BoxGeometry(3.66, 0.04, 1.16))
    const trimMesh = new THREE.Mesh(trimGeo, materials.walnut)
    trimMesh.position.set(0.0, 0.73, 0.0)
    benchGroup.add(trimMesh)

    // Champagne brass reveal line beneath desk surface
    const revealGeo = track(new THREE.BoxGeometry(3.64, 0.012, 1.14))
    const revealMesh = new THREE.Mesh(revealGeo, materials.champagneBrass)
    revealMesh.position.set(0.0, 0.705, 0.0)
    benchGroup.add(revealMesh)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. INDUSTRIAL STRUCTURAL MOUNTING ARMATURE (Rear-Mounted, Zero Occlusion)
    // ──────────────────────────────────────────────────────────────────────────
    // Heavy vertical structural uprights in extruded aluminum rising from rear bench edge
    const uprightGeo = track(new THREE.BoxGeometry(0.06, 0.95, 0.06))
    for (const ux of [-1.1, -0.2, 0.7, 1.4]) {
      const upright = new THREE.Mesh(uprightGeo, materials.laptopAluminum)
      upright.position.set(ux, 1.25, -0.46)
      benchGroup.add(upright)

      // Brass base mounting flange
      const flangeGeo = track(new THREE.BoxGeometry(0.10, 0.02, 0.10))
      const flange = new THREE.Mesh(flangeGeo, materials.champagneBrass)
      flange.position.set(ux, 0.79, -0.46)
      benchGroup.add(flange)
    }

    // Rear horizontal structural equipment rail at Y = 1.62m (high up, above devices)
    const topRailGeo = track(new THREE.BoxGeometry(3.2, 0.04, 0.04))
    const topRail = new THREE.Mesh(topRailGeo, materials.laptopAluminum)
    topRail.position.set(0.15, 1.68, -0.46)
    benchGroup.add(topRail)

    // Braided cable management conduits dropping from rail to devices
    for (const cx of [-0.65, 0.0, 0.45, 1.15]) {
      const dropCableGeo = track(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 8))
      const dropCable = new THREE.Mesh(dropCableGeo, materials.gunmetal)
      dropCable.position.set(cx, 1.48, -0.42)
      benchGroup.add(dropCable)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. DEVICE A: DESKTOP (38" Ultrawide Testing Display — Center/High)
    // ──────────────────────────────────────────────────────────────────────────
    // Articulated gas-spring armature arm extending forward to display
    const dtArmGeo = track(new THREE.BoxGeometry(0.035, 0.045, 0.28))
    const dtArm = new THREE.Mesh(dtArmGeo, materials.laptopAluminum)
    dtArm.position.set(-0.25, 1.38, -0.32)
    benchGroup.add(dtArm)

    // 38-inch Ultrawide 21:9 reference display chassis (1.46m x 0.62m x 0.035m)
    const dtChassisGeo = track(new THREE.BoxGeometry(1.46, 0.62, 0.035))
    const dtChassis = new THREE.Mesh(dtChassisGeo, materials.gunmetal)
    dtChassis.position.set(-0.25, 1.38, -0.18)
    dtChassis.castShadow = true
    benchGroup.add(dtChassis)

    const dtBezelGeo = track(new THREE.BoxGeometry(1.48, 0.64, 0.01))
    const dtBezel = new THREE.Mesh(dtBezelGeo, materials.laptopAluminum)
    dtBezel.position.set(-0.25, 1.38, -0.198)
    benchGroup.add(dtBezel)

    // Dormant screen plane (emissive = 0.0, zero fake content)
    const dtScreenGeo = track(new THREE.BoxGeometry(1.42, 0.58, 0.008))
    const dtScreen = new THREE.Mesh(dtScreenGeo, materials.terminalScreen)
    dtScreen.position.set(-0.25, 1.38, -0.16)
    dtScreen.name = 'screen:browser-qa:desktop'
    benchGroup.add(dtScreen)
    screens.push(dtScreen)

    // ──────────────────────────────────────────────────────────────────────────
    // 5. DEVICE B: LAPTOP (16" Reference Clamshell on Thermal Stage — Screen Left)
    // ──────────────────────────────────────────────────────────────────────────
    const laptopGroup = new THREE.Group()
    laptopGroup.position.set(-1.18, 0.78, 0.05)

    // Angled ventilated aluminum riser stand (inclined at 15°)
    const riserGeo = track(new THREE.BoxGeometry(0.38, 0.03, 0.28))
    const riser = new THREE.Mesh(riserGeo, materials.laptopAluminum)
    riser.position.set(0.0, 0.03, 0.0)
    riser.rotation.x = 0.16
    laptopGroup.add(riser)

    // Laptop base chassis with trackpad and keyboard tray
    const lpBaseGeo = track(new THREE.BoxGeometry(0.36, 0.012, 0.25))
    const lpBase = new THREE.Mesh(lpBaseGeo, materials.gunmetal)
    lpBase.position.set(0.0, 0.055, 0.0)
    lpBase.rotation.x = 0.16
    laptopGroup.add(lpBase)

    const lpTrackpadGeo = track(new THREE.BoxGeometry(0.12, 0.002, 0.08))
    const lpTrackpad = new THREE.Mesh(lpTrackpadGeo, materials.laptopAluminum)
    lpTrackpad.position.set(0.0, 0.065, 0.07)
    lpTrackpad.rotation.x = 0.16
    laptopGroup.add(lpTrackpad)

    // Laptop display lid open at 115° angle
    const lpLidGeo = track(new THREE.BoxGeometry(0.36, 0.24, 0.01))
    const lpLid = new THREE.Mesh(lpLidGeo, materials.gunmetal)
    lpLid.position.set(0.0, 0.18, -0.10)
    lpLid.rotation.x = -0.22
    laptopGroup.add(lpLid)

    // Dormant 16" screen
    const lpScreenGeo = track(new THREE.BoxGeometry(0.34, 0.22, 0.006))
    const lpScreen = new THREE.Mesh(lpScreenGeo, materials.terminalScreenEmerald)
    lpScreen.position.set(0.0, 0.18, -0.094)
    lpScreen.rotation.x = -0.22
    lpScreen.name = 'screen:browser-qa:laptop'
    laptopGroup.add(lpScreen)
    screens.push(lpScreen)

    benchGroup.add(laptopGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 6. DEVICE C: TABLET (11" Touchscreen on Magnetic Articulation Arm)
    // ──────────────────────────────────────────────────────────────────────────
    const tabletGroup = new THREE.Group()
    tabletGroup.position.set(0.68, 1.15, -0.14)

    // Articulated cantilever arm from rear upright
    const tabArmGeo = track(new THREE.CylinderGeometry(0.014, 0.016, 0.28, 12))
    tabArmGeo.rotateX(Math.PI / 2)
    const tabArm = new THREE.Mesh(tabArmGeo, materials.laptopAluminum)
    tabArm.position.set(0.0, -0.12, -0.12)
    tabletGroup.add(tabArm)

    // Magnetic quick-release dock puck in champagne brass
    const puckGeo = track(new THREE.CylinderGeometry(0.038, 0.038, 0.016, 16))
    puckGeo.rotateX(Math.PI / 2)
    const puck = new THREE.Mesh(puckGeo, materials.champagneBrass)
    puck.position.set(0.0, 0.0, -0.02)
    tabletGroup.add(puck)

    // 11-inch tablet chassis in portrait orientation (0.28m x 0.20m x 0.012m)
    const tabChassisGeo = track(new THREE.BoxGeometry(0.20, 0.28, 0.012))
    const tabChassis = new THREE.Mesh(tabChassisGeo, materials.gunmetal)
    tabChassis.rotation.y = -0.18
    tabletGroup.add(tabChassis)

    const tabBezelGeo = track(new THREE.BoxGeometry(0.204, 0.284, 0.004))
    const tabBezel = new THREE.Mesh(tabBezelGeo, materials.champagneBrass)
    tabBezel.position.set(0.0, 0.0, 0.004)
    tabBezel.rotation.y = -0.18
    tabletGroup.add(tabBezel)

    // Dormant tablet screen
    const tabScreenGeo = track(new THREE.BoxGeometry(0.186, 0.266, 0.006))
    const tabScreen = new THREE.Mesh(tabScreenGeo, materials.deviceTablet)
    tabScreen.position.set(0.0, 0.0, 0.008)
    tabScreen.rotation.y = -0.18
    tabScreen.name = 'screen:browser-qa:tablet'
    tabletGroup.add(tabScreen)
    screens.push(tabScreen)

    benchGroup.add(tabletGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 7. DEVICE D: PHONE TESTING RACK (Dual Mobile Viewports in Stepped Cradles)
    // ──────────────────────────────────────────────────────────────────────────
    const phoneRackGroup = new THREE.Group()
    phoneRackGroup.position.set(1.22, 1.05, -0.12)

    // Machined aluminum multi-phone backplane rack (0.42m x 0.32m x 0.02m)
    const rackBackGeo = track(new THREE.BoxGeometry(0.42, 0.32, 0.02))
    const rackBack = new THREE.Mesh(rackBackGeo, materials.laptopAluminum)
    rackBack.rotation.y = -0.22
    phoneRackGroup.add(rackBack)

    // Brass support brackets and cable guide rail
    const rackRailGeo = track(new THREE.BoxGeometry(0.44, 0.016, 0.03))
    const rackRail = new THREE.Mesh(rackRailGeo, materials.champagneBrass)
    rackRail.position.set(0.0, -0.16, 0.02)
    rackRail.rotation.y = -0.22
    phoneRackGroup.add(rackRail)

    // Phone 1: 6.7-inch flagship device in portrait cradle (left slot)
    const p1Group = new THREE.Group()
    p1Group.position.set(-0.10, 0.0, 0.02)
    p1Group.rotation.y = -0.22

    const p1ChassisGeo = track(new THREE.BoxGeometry(0.082, 0.165, 0.010))
    const p1Chassis = new THREE.Mesh(p1ChassisGeo, materials.gunmetal)
    p1Group.add(p1Chassis)

    const p1BezelGeo = track(new THREE.BoxGeometry(0.084, 0.167, 0.003))
    const p1Bezel = new THREE.Mesh(p1BezelGeo, materials.champagneBrass)
    p1Group.add(p1Bezel)

    const p1ScreenGeo = track(new THREE.BoxGeometry(0.076, 0.155, 0.006))
    const p1Screen = new THREE.Mesh(p1ScreenGeo, materials.devicePhone)
    p1Screen.position.set(0.0, 0.0, 0.005)
    p1Screen.name = 'screen:browser-qa:phone1'
    p1Group.add(p1Screen)
    screens.push(p1Screen)

    // Telemetry cable lead
    const p1CableGeo = track(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 8))
    const p1Cable = new THREE.Mesh(p1CableGeo, materials.structureGraphite)
    p1Cable.position.set(0.0, -0.12, 0.0)
    p1Group.add(p1Cable)
    phoneRackGroup.add(p1Group)

    // Phone 2: 6.1-inch compact device in portrait cradle (right slot)
    const p2Group = new THREE.Group()
    p2Group.position.set(0.10, -0.01, 0.02)
    p2Group.rotation.y = -0.22

    const p2ChassisGeo = track(new THREE.BoxGeometry(0.075, 0.150, 0.010))
    const p2Chassis = new THREE.Mesh(p2ChassisGeo, materials.gunmetal)
    p2Group.add(p2Chassis)

    const p2BezelGeo = track(new THREE.BoxGeometry(0.077, 0.152, 0.003))
    const p2Bezel = new THREE.Mesh(p2BezelGeo, materials.laptopAluminum)
    p2Group.add(p2Bezel)

    const p2ScreenGeo = track(new THREE.BoxGeometry(0.070, 0.142, 0.006))
    const p2Screen = new THREE.Mesh(p2ScreenGeo, materials.devicePhone)
    p2Screen.position.set(0.0, 0.0, 0.005)
    p2Screen.name = 'screen:browser-qa:phone2'
    p2Group.add(p2Screen)
    screens.push(p2Screen)

    const p2Cable = new THREE.Mesh(p1CableGeo, materials.structureGraphite)
    p2Cable.position.set(0.0, -0.11, 0.0)
    p2Group.add(p2Cable)
    phoneRackGroup.add(p2Group)

    benchGroup.add(phoneRackGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 8. TEST CONTROLLER & VIEWPORT INPUT CONSOLE (Center Front of Desk)
    // ──────────────────────────────────────────────────────────────────────────
    const ctrlGroup = new THREE.Group()
    ctrlGroup.position.set(0.0, 0.79, 0.22)

    // Recessed anodized aluminum control tray
    const ctrlTrayGeo = track(new THREE.BoxGeometry(0.72, 0.024, 0.32))
    const ctrlTray = new THREE.Mesh(ctrlTrayGeo, materials.laptopAluminum)
    ctrlGroup.add(ctrlTray)

    const ctrlBedGeo = track(new THREE.BoxGeometry(0.68, 0.008, 0.28))
    const ctrlBed = new THREE.Mesh(ctrlBedGeo, materials.structureGraphite)
    ctrlBed.position.set(0.0, 0.012, 0.0)
    ctrlGroup.add(ctrlBed)

    // 4 Device selector buttons (Desktop, Laptop, Tablet, Mobile) in champagne brass
    for (let i = 0; i < 4; i++) {
      const btnGeo = track(new THREE.BoxGeometry(0.05, 0.012, 0.04))
      const btn = new THREE.Mesh(btnGeo, materials.champagneBrass)
      btn.position.set(-0.24 + i * 0.08, 0.02, -0.06)
      ctrlGroup.add(btn)
    }

    // Rotary viewport scaling selector dial
    const dialGeo = track(new THREE.CylinderGeometry(0.024, 0.028, 0.02, 16))
    const dial = new THREE.Mesh(dialGeo, materials.champagneBrass)
    dial.position.set(0.16, 0.022, -0.06)
    ctrlGroup.add(dial)

    // Optical inspection trackball in dark mineral
    const ballGeo = track(new THREE.SphereGeometry(0.028, 16, 12))
    const ball = new THREE.Mesh(ballGeo, materials.gunmetal)
    ball.position.set(0.24, 0.028, 0.05)
    ctrlGroup.add(ball)

    // Compact testing keyboard in graphite
    const kbGeo = track(new THREE.BoxGeometry(0.36, 0.012, 0.12))
    const kb = new THREE.Mesh(kbGeo, materials.gunmetal)
    kb.position.set(-0.08, 0.02, 0.05)
    ctrlGroup.add(kb)

    benchGroup.add(ctrlGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 9. DETERMINISTIC STATION STATUS HARDWARE
    // ──────────────────────────────────────────────────────────────────────────
    const indBezelGeo = track(new THREE.BoxGeometry(0.42, 0.028, 0.08))
    const indBezel = new THREE.Mesh(indBezelGeo, materials.champagneBrass)
    indBezel.position.set(0.0, 0.795, 0.48)
    benchGroup.add(indBezel)

    const indGeo = track(new THREE.BoxGeometry(0.34, 0.016, 0.045))
    const indicatorMesh = new THREE.Mesh(indGeo, materials.gunmetal)
    indicatorMesh.position.set(0.0, 0.81, 0.48)
    indicatorMesh.name = 'station-indicator:browser-qa-matrix'
    benchGroup.add(indicatorMesh)

    // ──────────────────────────────────────────────────────────────────────────
    // 10. TECHNICAL QA DRAFTING CHAIR (Staged at Eastern Edge)
    // ──────────────────────────────────────────────────────────────────────────
    const chairGroup = new THREE.Group()
    chairGroup.position.set(1.25, 0.0, -0.38)

    // 5-Star roller base
    const baseHubGeo = track(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12))
    const baseHub = new THREE.Mesh(baseHubGeo, materials.gunmetal)
    baseHub.position.set(0.0, 0.08, 0.0)
    chairGroup.add(baseHub)

    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5
      const casterArmGeo = track(new THREE.BoxGeometry(0.028, 0.02, 0.28))
      const casterArm = new THREE.Mesh(casterArmGeo, materials.gunmetal)
      casterArm.position.set(Math.sin(angle) * 0.14, 0.07, Math.cos(angle) * 0.14)
      casterArm.rotation.y = angle
      chairGroup.add(casterArm)

      const wheelGeo = track(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 8))
      wheelGeo.rotateZ(Math.PI / 2)
      const wheel = new THREE.Mesh(wheelGeo, materials.structureGraphite)
      wheel.position.set(Math.sin(angle) * 0.28, 0.025, Math.cos(angle) * 0.28)
      chairGroup.add(wheel)
    }

    // Chrome central pneumatic cylinder
    const cylGeo = track(new THREE.CylinderGeometry(0.024, 0.028, 0.44, 12))
    const cyl = new THREE.Mesh(cylGeo, materials.laptopAluminum)
    cyl.position.set(0.0, 0.28, 0.0)
    chairGroup.add(cyl)

    // Circular footring in champagne brass
    const footringGeo = track(new THREE.TorusGeometry(0.18, 0.014, 8, 24))
    footringGeo.rotateX(Math.PI / 2)
    const footring = new THREE.Mesh(footringGeo, materials.champagneBrass)
    footring.position.set(0.0, 0.22, 0.0)
    chairGroup.add(footring)

    // Ergonomic dark mesh seat & lumbar backrest
    const seatGeo = track(new THREE.BoxGeometry(0.44, 0.06, 0.42))
    const seat = new THREE.Mesh(seatGeo, materials.charSuitDark)
    seat.position.set(0.0, 0.52, 0.0)
    seat.castShadow = true
    chairGroup.add(seat)

    const backSpineGeo = track(new THREE.BoxGeometry(0.04, 0.38, 0.03))
    const backSpine = new THREE.Mesh(backSpineGeo, materials.gunmetal)
    backSpine.position.set(0.0, 0.70, -0.20)
    chairGroup.add(backSpine)

    const backrestGeo = track(new THREE.BoxGeometry(0.40, 0.32, 0.04))
    const backrest = new THREE.Mesh(backrestGeo, materials.charSuitDark)
    backrest.position.set(0.0, 0.76, -0.19)
    chairGroup.add(backrest)

    benchGroup.add(chairGroup)

    return {
      benchGroup,
      indicatorMesh,
      screens,
    }
  }
}
