/**
 * Gravitas 3D Headquarters — Wave 12F Hero Frontend Engineer Character
 *
 * Authored high-fidelity character prototype for the Frontend Engineer role on Floor 2:
 * - Natural adult human proportions stylized for 1:6 miniature scale (head-to-body ratio ~1:7)
 * - Sculpted head with defined jawline, cheekbones, soft chin, and sculpted nose bridge
 * - Intentional layered side-parted hairstyle with volume and sweeping bangs
 * - Designer over-ear headphones with padded headband and memory foam earcups
 * - Tailored knit crewneck sweater with raglan sleeve seams, rib-knit collar, cuffs, and hem
 * - Articulated arms and hands in an ergonomic, relaxed work posture over keyboard and tablet
 * - Seated indigo denim trousers with realistic fold geometry at hips and knees
 * - Minimalist off-white sneakers firmly grounded on the oak floor
 * - Compatible with HqCharacters FigureController for breathing cycles and state reconciliation
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'

export interface HeroCharacterBuildResult {
  readonly rootGroup: THREE.Group
  readonly torsoGroup: THREE.Group
  readonly headMesh: THREE.Mesh
  readonly armsLeftGroup: THREE.Group
  readonly armsRightGroup: THREE.Group
  readonly legLeftGroup: THREE.Group
  readonly legRightGroup: THREE.Group
  readonly seatedLegsGroup: THREE.Group
  readonly standingLegsGroup: THREE.Group
  readonly accessoryMesh: THREE.Object3D
  readonly statusRing: THREE.Mesh
  readonly statusMaterial: THREE.MeshBasicMaterial
  readonly baseTorsoY: number
}

export class HeroCharacter {
  public static buildCharacter(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T,
    trackMat: <T extends THREE.Material>(mat: T) => T
  ): HeroCharacterBuildResult {
    const rootGroup = new THREE.Group()
    rootGroup.name = 'hero-character:role:engineering:frontend-engineer'

    // Seated baseline height on ergonomic task chair (seat surface Y ~ 0.49m)
    const baseTorsoY = 0.49

    // ──────────────────────────────────────────────────────────────────────────
    // 0. STATUS UNDERLAY RING
    // ──────────────────────────────────────────────────────────────────────────
    const ringGeo = track(new THREE.RingGeometry(0.24, 0.36, 24))
    ringGeo.rotateX(-Math.PI / 2)
    const statusMaterial = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    )
    const statusRing = new THREE.Mesh(ringGeo, statusMaterial)
    statusRing.position.set(0.0, 0.015, 0.0)
    rootGroup.add(statusRing)

    // ──────────────────────────────────────────────────────────────────────────
    // 1. TORSO & CLOTHING (Tailored Lavender Knit Crewneck Sweater)
    // ──────────────────────────────────────────────────────────────────────────
    const torsoGroup = new THREE.Group()
    torsoGroup.position.set(0.0, baseTorsoY + 0.48, 0.0)

    // 1.1 Main Sweater Body (Extruded sculpted torso with rib-knit waist)
    // Smooth tapered torso shape: shoulders 0.36m, waist 0.28m, height 0.36m
    const torsoShape = new THREE.Shape()
    torsoShape.moveTo(-0.13, -0.16) // Waist left
    torsoShape.lineTo(0.13, -0.16) // Waist right
    torsoShape.quadraticCurveTo(0.16, 0.02, 0.18, 0.14) // Shoulder right
    torsoShape.lineTo(-0.18, 0.14) // Shoulder left
    torsoShape.quadraticCurveTo(-0.16, 0.02, -0.13, -0.16) // Waist left

    const torsoGeo = track(
      new THREE.ExtrudeGeometry(torsoShape, {
        depth: 0.18,
        bevelEnabled: true,
        bevelSegments: 4,
        bevelSize: 0.024,
        bevelThickness: 0.024,
        curveSegments: 16,
      })
    )
    torsoGeo.translate(0.0, 0.0, -0.09) // Center along Z
    const torsoMesh = new THREE.Mesh(torsoGeo, materials.heroCharSweater)
    torsoMesh.castShadow = true
    torsoMesh.receiveShadow = true
    torsoGroup.add(torsoMesh)

    // Rib-knit bottom hem band
    const hemGeo = track(new THREE.CylinderGeometry(0.14, 0.135, 0.035, 24))
    hemGeo.scale(1.0, 1.0, 0.75)
    const hemMesh = new THREE.Mesh(hemGeo, materials.heroCharSweater)
    hemMesh.position.set(0.0, -0.16, 0.0)
    torsoGroup.add(hemMesh)

    // Rib-knit crewneck collar
    const collarGeo = track(new THREE.TorusGeometry(0.065, 0.016, 12, 24))
    collarGeo.rotateX(Math.PI / 2)
    const collarMesh = new THREE.Mesh(collarGeo, materials.charFrontendAccent)
    collarMesh.position.set(0.0, 0.155, 0.0)
    torsoGroup.add(collarMesh)

    // Sculpted neck
    const neckGeo = track(new THREE.CylinderGeometry(0.042, 0.046, 0.08, 16))
    const neckMesh = new THREE.Mesh(neckGeo, materials.heroCharSkin)
    neckMesh.position.set(0.0, 0.185, 0.0)
    torsoGroup.add(neckMesh)

    // ──────────────────────────────────────────────────────────────────────────
    // 2. SCULPTED HEAD, HAIR & FACIAL FEATURES
    // ──────────────────────────────────────────────────────────────────────────
    const headGroup = new THREE.Group()
    headGroup.position.set(0.0, 0.36, 0.0)

    // 2.1 Sculpted Head (Egg-ovoid skull with soft jawline and cheek definition)
    const skullGeo = track(new THREE.SphereGeometry(0.11, 24, 20))
    skullGeo.scale(0.92, 1.08, 0.96)
    const headMesh = new THREE.Mesh(skullGeo, materials.heroCharSkin)
    headMesh.castShadow = true
    headGroup.add(headMesh)

    // Sculpted nose bridge & subtle tip
    const noseGeo = track(new THREE.ConeGeometry(0.012, 0.032, 12))
    noseGeo.rotateX(-Math.PI / 2)
    const nose = new THREE.Mesh(noseGeo, materials.heroCharSkin)
    nose.position.set(0.0, -0.01, 0.106)
    headGroup.add(nose)

    // 2.2 Stylized Almond Eyes with Defined Lids & Double Catchlights
    for (const side of [-1, 1]) {
      const eyeX = side * 0.038

      // Eye contour (dark almond)
      const eyeGeo = track(new THREE.BoxGeometry(0.022, 0.036, 0.012))
      const eyeMesh = new THREE.Mesh(eyeGeo, materials.charEyes)
      eyeMesh.position.set(eyeX, 0.012, 0.098)
      eyeMesh.rotation.z = side * -0.08 // Slight almond tilt
      headGroup.add(eyeMesh)

      // Upper eyelid crease line
      const lidGeo = track(new THREE.BoxGeometry(0.024, 0.005, 0.008))
      const lidMesh = new THREE.Mesh(lidGeo, materials.heroCharHair)
      lidMesh.position.set(eyeX, 0.032, 0.102)
      headGroup.add(lidMesh)

      // Primary specular catchlight
      const spec1Geo = track(new THREE.BoxGeometry(0.007, 0.009, 0.008))
      const spec1 = new THREE.Mesh(spec1Geo, materials.charEyeSpec)
      spec1.position.set(eyeX + side * -0.003, 0.022, 0.104)
      headGroup.add(spec1)

      // Secondary micro catchlight
      const spec2Geo = track(new THREE.BoxGeometry(0.004, 0.004, 0.008))
      const spec2 = new THREE.Mesh(spec2Geo, materials.charEyeSpec)
      spec2.position.set(eyeX + side * 0.004, 0.006, 0.104)
      headGroup.add(spec2)
    }

    // 2.3 Intentional Layered Hairstyle (Side-parted bob with volume and sweeping bangs)
    const hairGroup = new THREE.Group()

    // Crown cap with volume
    const hairCapGeo = track(new THREE.SphereGeometry(0.12, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.65))
    hairCapGeo.scale(0.98, 1.05, 1.02)
    const hairCap = new THREE.Mesh(hairCapGeo, materials.heroCharHair)
    hairCap.position.set(0.0, 0.015, -0.01)
    hairGroup.add(hairCap)

    // Sweeping side bangs across forehead
    const bangGeo = track(new THREE.BoxGeometry(0.12, 0.045, 0.04))
    const bang = new THREE.Mesh(bangGeo, materials.heroCharHair)
    bang.position.set(-0.025, 0.07, 0.085)
    bang.rotation.z = -0.22
    bang.rotation.y = 0.12
    hairGroup.add(bang)

    // Side tress left
    const tressLGeo = track(new THREE.BoxGeometry(0.038, 0.14, 0.065))
    const tressL = new THREE.Mesh(tressLGeo, materials.heroCharHair)
    tressL.position.set(-0.105, -0.02, 0.03)
    tressL.rotation.z = 0.12
    hairGroup.add(tressL)

    // Side tress right
    const tressRGeo = track(new THREE.BoxGeometry(0.038, 0.14, 0.065))
    const tressR = new THREE.Mesh(tressRGeo, materials.heroCharHair)
    tressR.position.set(0.105, -0.02, 0.03)
    tressR.rotation.z = -0.12
    hairGroup.add(tressR)

    // Nape back hair
    const napeGeo = track(new THREE.BoxGeometry(0.16, 0.12, 0.045))
    const nape = new THREE.Mesh(napeGeo, materials.heroCharHair)
    nape.position.set(0.0, -0.04, -0.09)
    hairGroup.add(nape)

    headGroup.add(hairGroup)

    // 2.4 Designer Over-Ear Headphones
    const hpGroup = new THREE.Group()
    hpGroup.name = 'hero-headphones'

    // Padded headband arch
    const hpBandGeo = track(new THREE.TorusGeometry(0.122, 0.014, 10, 24, Math.PI))
    const hpBand = new THREE.Mesh(hpBandGeo, materials.heroSteel)
    hpBand.position.set(0.0, 0.04, 0.0)
    hpGroup.add(hpBand)

    // Headband leather cushion
    const hpCushionGeo = track(new THREE.TorusGeometry(0.12, 0.009, 8, 20, Math.PI * 0.7))
    const hpCushion = new THREE.Mesh(hpCushionGeo, materials.heroFabric)
    hpCushion.position.set(0.0, 0.04, 0.0)
    hpGroup.add(hpCushion)

    // Earcups and swivel yokes on both sides
    for (const side of [-1, 1]) {
      const earcupX = side * 0.118

      // Aluminum swivel yoke
      const yokeGeo = track(new THREE.BoxGeometry(0.012, 0.045, 0.02))
      const yoke = new THREE.Mesh(yokeGeo, materials.heroBrass)
      yoke.position.set(earcupX, 0.03, 0.0)
      hpGroup.add(yoke)

      // Outer earcup housing
      const cupOuterGeo = track(new THREE.CylinderGeometry(0.038, 0.042, 0.024, 16))
      cupOuterGeo.rotateZ(Math.PI / 2)
      const cupOuter = new THREE.Mesh(cupOuterGeo, materials.heroSteel)
      cupOuter.position.set(earcupX + side * 0.012, 0.0, 0.0)
      hpGroup.add(cupOuter)

      // Plush memory foam ear cushion with pastel cyan accent
      const cupPillowGeo = track(new THREE.CylinderGeometry(0.04, 0.04, 0.016, 16))
      cupPillowGeo.rotateZ(Math.PI / 2)
      const cupPillow = new THREE.Mesh(cupPillowGeo, materials.charFrontendAccent)
      cupPillow.position.set(earcupX + side * -0.006, 0.0, 0.0)
      hpGroup.add(cupPillow)
    }

    headGroup.add(hpGroup)
    torsoGroup.add(headGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 3. ARTICULATED ARMS & HANDS (Ergonomic Seated Typing Posture)
    // ──────────────────────────────────────────────────────────────────────────
    const armsLeftGroup = new THREE.Group()
    armsLeftGroup.position.set(-0.20, 0.10, 0.0)

    const armsRightGroup = new THREE.Group()
    armsRightGroup.position.set(0.20, 0.10, 0.0)

    // Left Arm (Extending forward toward keyboard / tablet)
    // Upper arm
    const upperArmGeo = track(new THREE.CapsuleGeometry(0.036, 0.18, 8, 12))
    const upperArmL = new THREE.Mesh(upperArmGeo, materials.heroCharSweater)
    upperArmL.position.set(0.0, -0.10, 0.05)
    upperArmL.rotation.x = 0.52 // Natural forward angle from shoulder
    upperArmL.rotation.z = -0.12
    armsLeftGroup.add(upperArmL)

    // Forearm with rib-knit cuff
    const foreArmGeo = track(new THREE.CapsuleGeometry(0.032, 0.18, 8, 12))
    const foreArmL = new THREE.Mesh(foreArmGeo, materials.heroCharSweater)
    foreArmL.position.set(-0.02, -0.22, 0.20)
    foreArmL.rotation.x = 1.30 // Resting along desktop
    foreArmL.rotation.y = 0.22
    armsLeftGroup.add(foreArmL)

    // Left hand resting over keyboard keys
    const handLGeo = track(new THREE.BoxGeometry(0.045, 0.022, 0.065))
    const handL = new THREE.Mesh(handLGeo, materials.heroCharSkin)
    handL.position.set(-0.01, -0.23, 0.34)
    handL.rotation.x = 0.10
    armsLeftGroup.add(handL)

    // Right Arm (Extending toward mouse / desk)
    const upperArmR = new THREE.Mesh(upperArmGeo, materials.heroCharSweater)
    upperArmR.position.set(0.0, -0.10, 0.05)
    upperArmR.rotation.x = 0.52
    upperArmR.rotation.z = 0.12
    armsRightGroup.add(upperArmR)

    const foreArmR = new THREE.Mesh(foreArmGeo, materials.heroCharSweater)
    foreArmR.position.set(0.02, -0.22, 0.20)
    foreArmR.rotation.x = 1.30
    foreArmR.rotation.y = -0.22
    armsRightGroup.add(foreArmR)

    // Right hand over ergonomic mouse
    const handRGeo = track(new THREE.BoxGeometry(0.045, 0.022, 0.065))
    const handR = new THREE.Mesh(handRGeo, materials.heroCharSkin)
    handR.position.set(0.01, -0.23, 0.34)
    handR.rotation.x = 0.10
    armsRightGroup.add(handR)

    torsoGroup.add(armsLeftGroup)
    torsoGroup.add(armsRightGroup)
    rootGroup.add(torsoGroup)

    // ──────────────────────────────────────────────────────────────────────────
    // 4. SEATED LEGS, TROUSERS & SNEAKERS
    // ──────────────────────────────────────────────────────────────────────────
    const seatedLegsGroup = new THREE.Group()
    seatedLegsGroup.position.set(0.0, baseTorsoY, 0.0)

    // Contoured denim pelvis / hips bridging seat and sweater waist (casts lower body shadow)
    const pelvisGeo = track(new THREE.BoxGeometry(0.28, 0.34, 0.22))
    const pelvis = new THREE.Mesh(pelvisGeo, materials.heroCharDenim)
    pelvis.position.set(0.0, 0.16, 0.0)
    pelvis.castShadow = true
    pelvis.receiveShadow = true
    seatedLegsGroup.add(pelvis)

    const legLeftGroup = new THREE.Group()
    const legRightGroup = new THREE.Group()

    for (const side of [-1, 1]) {
      const legX = side * 0.10
      const legSubGroup = side === -1 ? legLeftGroup : legRightGroup

      // Upper leg / thigh extending forward horizontally from chair seat
      const thighGeo = track(new THREE.CapsuleGeometry(0.048, 0.26, 8, 12))
      thighGeo.rotateX(Math.PI / 2)
      const thigh = new THREE.Mesh(thighGeo, materials.heroCharDenim)
      thigh.position.set(legX, 0.04, 0.18)
      thigh.receiveShadow = true
      legSubGroup.add(thigh)

      // Knee joint fold
      const kneeGeo = track(new THREE.SphereGeometry(0.05, 12, 10))
      const knee = new THREE.Mesh(kneeGeo, materials.heroCharDenim)
      knee.position.set(legX, 0.04, 0.34)
      legSubGroup.add(knee)

      // Lower leg / calf extending vertically downward to floor
      const calfGeo = track(new THREE.CapsuleGeometry(0.044, 0.36, 8, 12))
      const calf = new THREE.Mesh(calfGeo, materials.heroCharDenim)
      calf.position.set(legX, -0.18, 0.34)
      calf.receiveShadow = true
      legSubGroup.add(calf)

      // Trouser cuff hem
      const cuffGeo = track(new THREE.CylinderGeometry(0.048, 0.048, 0.024, 16))
      const cuff = new THREE.Mesh(cuffGeo, materials.heroCharDenim)
      cuff.position.set(legX, -0.38, 0.34)
      legSubGroup.add(cuff)

      // Minimalist Low-Top Sneaker firmly resting on floor
      const shoeGroup = new THREE.Group()
      shoeGroup.position.set(legX, -baseTorsoY, 0.34) // Sits exactly on floor Y = 0.0

      // Rubber midsole / outsole tread
      const soleGeo = track(new THREE.BoxGeometry(0.076, 0.022, 0.18))
      const sole = new THREE.Mesh(soleGeo, materials.heroCharSneaker)
      sole.position.set(0.0, 0.011, 0.03)
      sole.receiveShadow = true
      shoeGroup.add(sole)

      // Sneaker upper body with toe cap
      const upperGeo = track(new THREE.BoxGeometry(0.072, 0.045, 0.16))
      const upper = new THREE.Mesh(upperGeo, materials.heroCharSneaker)
      upper.position.set(0.0, 0.038, 0.02)
      shoeGroup.add(upper)

      // Rounded toe box
      const toeGeo = track(new THREE.SphereGeometry(0.036, 12, 10))
      toeGeo.scale(1.0, 0.65, 1.2)
      const toe = new THREE.Mesh(toeGeo, materials.heroCharSneaker)
      toe.position.set(0.0, 0.028, 0.09)
      shoeGroup.add(toe)

      legSubGroup.add(shoeGroup)
      seatedLegsGroup.add(legSubGroup)
    }

    rootGroup.add(seatedLegsGroup)

    // Standing legs group placeholder (for FigureController contract completeness)
    const standingLegsGroup = new THREE.Group()
    standingLegsGroup.visible = false
    rootGroup.add(standingLegsGroup)

    return {
      rootGroup,
      torsoGroup,
      headMesh,
      armsLeftGroup,
      armsRightGroup,
      legLeftGroup,
      legRightGroup,
      seatedLegsGroup,
      standingLegsGroup,
      accessoryMesh: hpGroup,
      statusRing,
      statusMaterial,
      baseTorsoY,
    }
  }
}
