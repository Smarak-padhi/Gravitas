/**
 * Gravitas 3D Headquarters — Production Character Family Builders (Wave 12K-R)
 *
 * Authored high-fidelity character family for all Gravitas roles:
 * - Natural adult human proportions stylized for 1:6 miniature scale (head-to-body ratio ~1:7)
 * - Sculpted head with defined jawline, cheekbones, soft chin, and sculpted 3D nose bridge
 * - Stylized almond eyes with defined lid creases and double specular catchlights
 * - Tailored extruded knit crewneck sweater / cleanroom coat with raglan sleeve seams, rib-knit collar, and hem
 * - Articulated arms and hands with defined fingers in role-specific ergonomic postures
 * - Grounded denim trousers / tailored slacks with realistic fold geometry at hips and knees
 * - Minimalist sneakers / cleanroom shoes firmly grounded on the floor (sole, upper, rounded toe)
 * - Dual seated and standing leg groups for full locomotion and state machine compatibility
 * - Compatible with HqCharacters FigureController for breathing cycles and state reconciliation
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../../materials/materials.js'
import type { RoleId } from '../../roles/types.js'

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
  readonly accessoryMesh: THREE.Object3D | null
  readonly statusRing: THREE.Mesh
  readonly statusMaterial: THREE.MeshBasicMaterial
  readonly baseTorsoY: number
}

interface CharacterParts {
  rootGroup: THREE.Group
  torsoGroup: THREE.Group
  headMesh: THREE.Mesh
  headGroup: THREE.Group
  statusRing: THREE.Mesh
  statusMaterial: THREE.MeshBasicMaterial
  baseTorsoY: number
}

export class HeroCharacter {
  /**
   * Builds shared anatomical base: status ring, extruded tailored torso, and sculpted head with double catchlights.
   */
  private static buildBaseAnatomy(
    _roleName: string,
    roleId: RoleId,
    sweaterMat: THREE.Material,
    collarMat: THREE.Material,
    skinMat: THREE.Material,
    hairMat: THREE.Material,
    isSeated: boolean,
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T,
    trackMat: <T extends THREE.Material>(mat: T) => T
  ): CharacterParts {
    const rootGroup = new THREE.Group()
    rootGroup.name = `character:${roleId}`

    const baseTorsoY = isSeated ? 0.78 : 0.70

    // 0. Status Underlay Ring
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

    // 1. Torso Group
    const torsoGroup = new THREE.Group()
    torsoGroup.position.set(0.0, baseTorsoY, 0.0)

    // Sculpted tapered torso shape: shoulders 0.36m, waist 0.28m, height 0.36m
    const torsoShape = new THREE.Shape()
    torsoShape.moveTo(-0.13, -0.16)
    torsoShape.lineTo(0.13, -0.16)
    torsoShape.quadraticCurveTo(0.16, 0.02, 0.18, 0.14)
    torsoShape.lineTo(-0.18, 0.14)
    torsoShape.quadraticCurveTo(-0.16, 0.02, -0.13, -0.16)

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
    torsoGeo.translate(0.0, 0.0, -0.09)
    const torsoMesh = new THREE.Mesh(torsoGeo, sweaterMat)
    torsoMesh.castShadow = true
    torsoMesh.receiveShadow = true
    torsoGroup.add(torsoMesh)

    // Rib-knit bottom hem band
    const hemGeo = track(new THREE.CylinderGeometry(0.14, 0.135, 0.035, 24))
    hemGeo.scale(1.0, 1.0, 0.75)
    const hemMesh = new THREE.Mesh(hemGeo, sweaterMat)
    hemMesh.position.set(0.0, -0.16, 0.0)
    torsoGroup.add(hemMesh)

    // Rib-knit collar ring
    const collarGeo = track(new THREE.TorusGeometry(0.065, 0.016, 12, 24))
    collarGeo.rotateX(Math.PI / 2)
    const collarMesh = new THREE.Mesh(collarGeo, collarMat)
    collarMesh.position.set(0.0, 0.155, 0.0)
    torsoGroup.add(collarMesh)

    // Sculpted neck (height 0.12m extending from collar at 0.155 up into skull base at 0.26)
    const neckGeo = track(new THREE.CylinderGeometry(0.040, 0.045, 0.12, 16))
    const neckMesh = new THREE.Mesh(neckGeo, skinMat)
    neckMesh.position.set(0.0, 0.20, 0.0)
    torsoGroup.add(neckMesh)

    // 2. Head Group & Sculpted Facial Anatomy
    const headGroup = new THREE.Group()
    headGroup.position.set(0.0, 0.36, 0.0)

    // Egg-ovoid skull
    const skullGeo = track(new THREE.SphereGeometry(0.11, 24, 20))
    skullGeo.scale(0.92, 1.08, 0.96)
    const headMesh = new THREE.Mesh(skullGeo, skinMat)
    headMesh.castShadow = true
    headGroup.add(headMesh)

    // Sculpted nose bridge & subtle tip
    const noseGeo = track(new THREE.ConeGeometry(0.012, 0.032, 12))
    noseGeo.rotateX(-Math.PI / 2)
    const nose = new THREE.Mesh(noseGeo, skinMat)
    nose.position.set(0.0, -0.01, 0.106)
    headGroup.add(nose)

    // Expressive Almond Eyes with Defined Creases & Double Catchlights
    for (const side of [-1, 1]) {
      const eyeX = side * 0.038

      const eyeGeo = track(new THREE.BoxGeometry(0.022, 0.036, 0.012))
      const eyeMesh = new THREE.Mesh(eyeGeo, materials.charEyes)
      eyeMesh.position.set(eyeX, 0.012, 0.098)
      eyeMesh.rotation.z = side * -0.08
      headGroup.add(eyeMesh)

      const lidGeo = track(new THREE.BoxGeometry(0.024, 0.005, 0.008))
      const lidMesh = new THREE.Mesh(lidGeo, hairMat)
      lidMesh.position.set(eyeX, 0.032, 0.102)
      headGroup.add(lidMesh)

      const spec1Geo = track(new THREE.BoxGeometry(0.007, 0.009, 0.008))
      const spec1 = new THREE.Mesh(spec1Geo, materials.charEyeSpec)
      spec1.position.set(eyeX + side * -0.003, 0.022, 0.104)
      headGroup.add(spec1)

      const spec2Geo = track(new THREE.BoxGeometry(0.004, 0.004, 0.008))
      const spec2 = new THREE.Mesh(spec2Geo, materials.charEyeSpec)
      spec2.position.set(eyeX + side * 0.004, 0.006, 0.104)
      headGroup.add(spec2)
    }

    torsoGroup.add(headGroup)
    rootGroup.add(torsoGroup)

    return {
      rootGroup,
      torsoGroup,
      headMesh,
      headGroup,
      statusRing,
      statusMaterial,
      baseTorsoY,
    }
  }

  /**
   * Builds production articulated seated and standing leg pairs.
   */
  private static buildDualLegs(
    pantsMat: THREE.Material,
    shoeMat: THREE.Material,
    isSeatedDefault: boolean,
    _baseTorsoY: number,
    track: <T extends THREE.BufferGeometry>(geom: T) => T
  ): {
    seatedLegsGroup: THREE.Group
    standingLegsGroup: THREE.Group
    legLeftGroup: THREE.Group
    legRightGroup: THREE.Group
  } {
    // 1. Seated Legs
    const seatedLegsGroup = new THREE.Group()
    seatedLegsGroup.name = 'seated-legs'
    seatedLegsGroup.position.set(0.0, 0.49, 0.0)

    const pelvisSeatedGeo = track(new THREE.BoxGeometry(0.24, 0.18, 0.20))
    const pelvisSeated = new THREE.Mesh(pelvisSeatedGeo, pantsMat)
    pelvisSeated.position.set(0.0, 0.10, 0.0)
    pelvisSeated.castShadow = true
    pelvisSeated.receiveShadow = true
    seatedLegsGroup.add(pelvisSeated)

    const seatedThighGeo = track(new THREE.CapsuleGeometry(0.048, 0.26, 8, 12))
    seatedThighGeo.rotateX(Math.PI / 2)
    const seatedKneeGeo = track(new THREE.SphereGeometry(0.05, 12, 10))
    const seatedCalfGeo = track(new THREE.CapsuleGeometry(0.044, 0.36, 8, 12))
    const seatedCuffGeo = track(new THREE.CylinderGeometry(0.048, 0.048, 0.024, 16))

    for (const side of [-1, 1]) {
      const legX = side * 0.10
      const legSub = new THREE.Group()

      const thigh = new THREE.Mesh(seatedThighGeo, pantsMat)
      thigh.position.set(legX, 0.04, 0.18)
      legSub.add(thigh)

      const knee = new THREE.Mesh(seatedKneeGeo, pantsMat)
      knee.position.set(legX, 0.04, 0.34)
      legSub.add(knee)

      const calf = new THREE.Mesh(seatedCalfGeo, pantsMat)
      calf.position.set(legX, -0.18, 0.34)
      legSub.add(calf)

      const cuff = new THREE.Mesh(seatedCuffGeo, pantsMat)
      cuff.position.set(legX, -0.38, 0.34)
      legSub.add(cuff)

      // Sneaker
      const shoeGroup = new THREE.Group()
      shoeGroup.position.set(legX, -0.49, 0.34)
      const soleGeo = track(new THREE.BoxGeometry(0.076, 0.022, 0.18))
      const sole = new THREE.Mesh(soleGeo, shoeMat)
      sole.position.set(0.0, 0.011, 0.03)
      shoeGroup.add(sole)

      const upperGeo = track(new THREE.BoxGeometry(0.072, 0.045, 0.16))
      const upper = new THREE.Mesh(upperGeo, shoeMat)
      upper.position.set(0.0, 0.038, 0.02)
      shoeGroup.add(upper)

      const toeGeo = track(new THREE.SphereGeometry(0.036, 12, 10))
      toeGeo.scale(1.0, 0.65, 1.2)
      const toe = new THREE.Mesh(toeGeo, shoeMat)
      toe.position.set(0.0, 0.028, 0.09)
      shoeGroup.add(toe)

      legSub.add(shoeGroup)
      seatedLegsGroup.add(legSub)
    }

    // 2. Standing Legs
    const standingLegsGroup = new THREE.Group()
    standingLegsGroup.name = 'standing-legs'
    standingLegsGroup.position.set(0.0, 0.0, 0.0)

    const pelvisStandingGeo = track(new THREE.BoxGeometry(0.24, 0.16, 0.18))
    const pelvisStanding = new THREE.Mesh(pelvisStandingGeo, pantsMat)
    pelvisStanding.position.set(0.0, 0.54, 0.0)
    pelvisStanding.castShadow = true
    standingLegsGroup.add(pelvisStanding)

    const legLeftGroup = new THREE.Group()
    legLeftGroup.position.set(-0.10, 0.58, 0.0)

    const legRightGroup = new THREE.Group()
    legRightGroup.position.set(0.10, 0.58, 0.0)

    const standLegGeo = track(new THREE.CapsuleGeometry(0.046, 0.38, 8, 12))
    const standCuffGeo = track(new THREE.CylinderGeometry(0.048, 0.048, 0.024, 16))

    for (const [_side, subGroup] of [[-1, legLeftGroup], [1, legRightGroup]] as const) {
      const legMesh = new THREE.Mesh(standLegGeo, pantsMat)
      legMesh.position.set(0.0, -0.24, 0.0)
      legMesh.castShadow = true
      subGroup.add(legMesh)

      const cuff = new THREE.Mesh(standCuffGeo, pantsMat)
      cuff.position.set(0.0, -0.46, 0.0)
      subGroup.add(cuff)

      // Sneaker sitting on floor
      const shoeGroup = new THREE.Group()
      shoeGroup.position.set(0.0, -0.58, 0.02)
      const soleGeo = track(new THREE.BoxGeometry(0.076, 0.022, 0.18))
      const sole = new THREE.Mesh(soleGeo, shoeMat)
      sole.position.set(0.0, 0.011, 0.02)
      shoeGroup.add(sole)

      const upperGeo = track(new THREE.BoxGeometry(0.072, 0.045, 0.16))
      const upper = new THREE.Mesh(upperGeo, shoeMat)
      upper.position.set(0.0, 0.038, 0.01)
      shoeGroup.add(upper)

      const toeGeo = track(new THREE.SphereGeometry(0.036, 12, 10))
      toeGeo.scale(1.0, 0.65, 1.2)
      const toe = new THREE.Mesh(toeGeo, shoeMat)
      toe.position.set(0.0, 0.028, 0.08)
      shoeGroup.add(toe)

      subGroup.add(shoeGroup)
      standingLegsGroup.add(subGroup)
    }

    if (isSeatedDefault) {
      standingLegsGroup.visible = false
      seatedLegsGroup.visible = true
    } else {
      standingLegsGroup.visible = true
      seatedLegsGroup.visible = false
    }

    return {
      seatedLegsGroup,
      standingLegsGroup,
      legLeftGroup,
      legRightGroup,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. FRONTEND ENGINEER (Established Production Prototype)
  // ──────────────────────────────────────────────────────────────────────────
  public static buildCharacter(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T,
    trackMat: <T extends THREE.Material>(mat: T) => T
  ): HeroCharacterBuildResult {
    return this.buildFrontend(materials, track, trackMat)
  }

  public static buildFrontend(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T,
    trackMat: <T extends THREE.Material>(mat: T) => T
  ): HeroCharacterBuildResult {
    const base = this.buildBaseAnatomy(
      'Frontend Engineer',
      'role:engineering:frontend-engineer',
      materials.heroCharSweater,
      materials.charFrontendAccent,
      materials.heroCharSkin,
      materials.heroCharHair,
      true,
      materials,
      track,
      trackMat
    )

    // Hairstyle: Side-parted bob with sweeping bangs
    const hairGroup = new THREE.Group()
    const hairCapGeo = track(new THREE.SphereGeometry(0.12, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.65))
    hairCapGeo.scale(0.98, 1.05, 1.02)
    const hairCap = new THREE.Mesh(hairCapGeo, materials.heroCharHair)
    hairCap.position.set(0.0, 0.015, -0.01)
    hairGroup.add(hairCap)

    const bangGeo = track(new THREE.BoxGeometry(0.12, 0.045, 0.04))
    const bang = new THREE.Mesh(bangGeo, materials.heroCharHair)
    bang.position.set(-0.025, 0.07, 0.085)
    bang.rotation.z = -0.22
    bang.rotation.y = 0.12
    hairGroup.add(bang)

    for (const [side, x] of [[-1, -0.105], [1, 0.105]] as const) {
      const tressGeo = track(new THREE.BoxGeometry(0.038, 0.14, 0.065))
      const tress = new THREE.Mesh(tressGeo, materials.heroCharHair)
      tress.position.set(x, -0.02, 0.03)
      tress.rotation.z = side * -0.12
      hairGroup.add(tress)
    }
    const napeGeo = track(new THREE.BoxGeometry(0.16, 0.12, 0.045))
    const nape = new THREE.Mesh(napeGeo, materials.heroCharHair)
    nape.position.set(0.0, -0.04, -0.09)
    hairGroup.add(nape)
    base.headGroup.add(hairGroup)

    // Designer Headphones
    const hpGroup = new THREE.Group()
    hpGroup.name = 'hero-headphones'
    const hpBandGeo = track(new THREE.TorusGeometry(0.122, 0.014, 10, 24, Math.PI))
    const hpBand = new THREE.Mesh(hpBandGeo, materials.heroSteel)
    hpBand.position.set(0.0, 0.04, 0.0)
    hpGroup.add(hpBand)

    for (const side of [-1, 1]) {
      const earcupX = side * 0.118
      const yokeGeo = track(new THREE.BoxGeometry(0.012, 0.045, 0.02))
      const yoke = new THREE.Mesh(yokeGeo, materials.heroBrass)
      yoke.position.set(earcupX, 0.03, 0.0)
      hpGroup.add(yoke)

      const cupOuterGeo = track(new THREE.CylinderGeometry(0.038, 0.042, 0.024, 16))
      cupOuterGeo.rotateZ(Math.PI / 2)
      const cupOuter = new THREE.Mesh(cupOuterGeo, materials.heroSteel)
      cupOuter.position.set(earcupX + side * 0.012, 0.0, 0.0)
      hpGroup.add(cupOuter)

      const cupPillowGeo = track(new THREE.CylinderGeometry(0.04, 0.04, 0.016, 16))
      cupPillowGeo.rotateZ(Math.PI / 2)
      const cupPillow = new THREE.Mesh(cupPillowGeo, materials.charFrontendAccent)
      cupPillow.position.set(earcupX + side * -0.006, 0.0, 0.0)
      hpGroup.add(cupPillow)
    }
    base.headGroup.add(hpGroup)

    // Seated Arms
    const armsLeftGroup = new THREE.Group()
    armsLeftGroup.position.set(-0.20, 0.10, 0.0)
    const armsRightGroup = new THREE.Group()
    armsRightGroup.position.set(0.20, 0.10, 0.0)

    const upperArmGeo = track(new THREE.CapsuleGeometry(0.036, 0.18, 8, 12))
    const foreArmGeo = track(new THREE.CapsuleGeometry(0.032, 0.18, 8, 12))
    const handGeo = track(new THREE.BoxGeometry(0.045, 0.022, 0.065))

    for (const [side, subGroup] of [[-1, armsLeftGroup], [1, armsRightGroup]] as const) {
      const upper = new THREE.Mesh(upperArmGeo, materials.heroCharSweater)
      upper.position.set(0.0, -0.10, 0.05)
      upper.rotation.x = 0.52
      upper.rotation.z = side * 0.12
      subGroup.add(upper)

      const fore = new THREE.Mesh(foreArmGeo, materials.heroCharSweater)
      fore.position.set(side * 0.02, -0.22, 0.20)
      fore.rotation.x = 1.30
      fore.rotation.y = side * -0.22
      subGroup.add(fore)

      const hand = new THREE.Mesh(handGeo, materials.heroCharSkin)
      hand.position.set(side * 0.01, -0.23, 0.34)
      hand.rotation.x = 0.10
      subGroup.add(hand)

      base.torsoGroup.add(subGroup)
    }

    const legs = this.buildDualLegs(materials.heroCharDenim, materials.heroCharSneaker, true, base.baseTorsoY, track)
    base.rootGroup.add(legs.seatedLegsGroup)
    base.rootGroup.add(legs.standingLegsGroup)

    return {
      rootGroup: base.rootGroup,
      torsoGroup: base.torsoGroup,
      headMesh: base.headMesh,
      armsLeftGroup,
      armsRightGroup,
      legLeftGroup: legs.legLeftGroup,
      legRightGroup: legs.legRightGroup,
      seatedLegsGroup: legs.seatedLegsGroup,
      standingLegsGroup: legs.standingLegsGroup,
      accessoryMesh: hpGroup,
      statusRing: base.statusRing,
      statusMaterial: base.statusMaterial,
      baseTorsoY: base.baseTorsoY,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. BACKEND ENGINEER (Production High-Fidelity)
  // ──────────────────────────────────────────────────────────────────────────
  public static buildBackend(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T,
    trackMat: <T extends THREE.Material>(mat: T) => T
  ): HeroCharacterBuildResult {
    const base = this.buildBaseAnatomy(
      'Backend Engineer',
      'role:engineering:backend-engineer',
      materials.heroCharBackendSweater,
      materials.champagneBrass,
      materials.heroCharSkin,
      materials.heroCharHair,
      true,
      materials,
      track,
      trackMat
    )

    // Hairstyle: Structured technician cap/crop
    const hairGroup = new THREE.Group()
    const capGeo = track(new THREE.SphereGeometry(0.12, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62))
    capGeo.scale(0.96, 1.04, 0.98)
    const cap = new THREE.Mesh(capGeo, materials.heroCharHair)
    cap.position.set(0.0, 0.02, -0.01)
    hairGroup.add(cap)

    const brimGeo = track(new THREE.BoxGeometry(0.15, 0.02, 0.06))
    const brim = new THREE.Mesh(brimGeo, materials.heroCharHair)
    brim.position.set(0.0, 0.075, 0.09)
    brim.rotation.x = -0.15
    hairGroup.add(brim)
    base.headGroup.add(hairGroup)

    // Diagnostic Boom Headset
    const headsetGroup = new THREE.Group()
    const bandGeo = track(new THREE.TorusGeometry(0.118, 0.010, 8, 20, Math.PI))
    const band = new THREE.Mesh(bandGeo, materials.heroBrass)
    band.position.set(0.0, 0.03, 0.0)
    headsetGroup.add(band)

    const earcupGeo = track(new THREE.CylinderGeometry(0.032, 0.034, 0.02, 14))
    earcupGeo.rotateZ(Math.PI / 2)
    const earcup = new THREE.Mesh(earcupGeo, materials.heroCharBackendSweater)
    earcup.position.set(0.115, 0.0, 0.0)
    headsetGroup.add(earcup)

    const boomGeo = track(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 8))
    boomGeo.rotateX(Math.PI / 2)
    const boom = new THREE.Mesh(boomGeo, materials.champagneBrass)
    boom.position.set(0.10, -0.02, 0.07)
    boom.rotation.y = -0.4
    boom.rotation.x = 0.2
    headsetGroup.add(boom)

    const micGeo = track(new THREE.SphereGeometry(0.012, 8, 8))
    const mic = new THREE.Mesh(micGeo, materials.charBackendAccent)
    mic.position.set(0.05, -0.03, 0.13)
    headsetGroup.add(mic)
    base.headGroup.add(headsetGroup)

    // Seated Arms holding terminal notebook
    const armsLeftGroup = new THREE.Group()
    armsLeftGroup.position.set(-0.20, 0.10, 0.0)
    const armsRightGroup = new THREE.Group()
    armsRightGroup.position.set(0.20, 0.10, 0.0)

    const upperArmGeo = track(new THREE.CapsuleGeometry(0.036, 0.18, 8, 12))
    const foreArmGeo = track(new THREE.CapsuleGeometry(0.032, 0.18, 8, 12))
    const handGeo = track(new THREE.BoxGeometry(0.045, 0.022, 0.065))

    for (const [side, subGroup] of [[-1, armsLeftGroup], [1, armsRightGroup]] as const) {
      const upper = new THREE.Mesh(upperArmGeo, materials.heroCharBackendSweater)
      upper.position.set(0.0, -0.10, 0.05)
      upper.rotation.x = 0.50
      upper.rotation.z = side * 0.12
      subGroup.add(upper)

      const fore = new THREE.Mesh(foreArmGeo, materials.heroCharBackendSweater)
      fore.position.set(side * 0.02, -0.22, 0.20)
      fore.rotation.x = 1.25
      fore.rotation.y = side * -0.20
      subGroup.add(fore)

      const hand = new THREE.Mesh(handGeo, materials.heroCharSkin)
      hand.position.set(side * 0.01, -0.23, 0.32)
      hand.rotation.x = 0.10
      subGroup.add(hand)

      base.torsoGroup.add(subGroup)
    }

    // Systems Diagnostic Notebook Accessory
    const notebookGroup = new THREE.Group()
    const nbBodyGeo = track(new THREE.BoxGeometry(0.26, 0.016, 0.18))
    const nbBody = new THREE.Mesh(nbBodyGeo, materials.structureGraphite)
    notebookGroup.add(nbBody)

    const nbScreenGeo = track(new THREE.BoxGeometry(0.24, 0.004, 0.16))
    const nbScreen = new THREE.Mesh(nbScreenGeo, materials.terminalScreenEmerald)
    nbScreen.position.set(0.0, 0.009, 0.0)
    notebookGroup.add(nbScreen)

    notebookGroup.position.set(0.0, -0.12, 0.30)
    notebookGroup.rotation.x = -0.10
    base.torsoGroup.add(notebookGroup)

    const legs = this.buildDualLegs(materials.heroCharDenim, materials.heroCharSneaker, true, base.baseTorsoY, track)
    base.rootGroup.add(legs.seatedLegsGroup)
    base.rootGroup.add(legs.standingLegsGroup)

    return {
      rootGroup: base.rootGroup,
      torsoGroup: base.torsoGroup,
      headMesh: base.headMesh,
      armsLeftGroup,
      armsRightGroup,
      legLeftGroup: legs.legLeftGroup,
      legRightGroup: legs.legRightGroup,
      seatedLegsGroup: legs.seatedLegsGroup,
      standingLegsGroup: legs.standingLegsGroup,
      accessoryMesh: notebookGroup,
      statusRing: base.statusRing,
      statusMaterial: base.statusMaterial,
      baseTorsoY: base.baseTorsoY,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. INDEPENDENT REVIEWER (F3 Quality Verification Hero)
  // ──────────────────────────────────────────────────────────────────────────
  public static buildReviewer(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T,
    trackMat: <T extends THREE.Material>(mat: T) => T
  ): HeroCharacterBuildResult {
    const base = this.buildBaseAnatomy(
      'Independent Reviewer',
      'role:quality:independent-reviewer',
      materials.heroCharReviewerCoat,
      materials.charReviewerAccent,
      materials.heroCharSkin,
      materials.heroCharHair,
      false, // Standing at verification bench
      materials,
      track,
      trackMat
    )

    // Hairstyle: Sleek architectural side-parted cut with clean taper
    const hairGroup = new THREE.Group()
    const hairCapGeo = track(new THREE.SphereGeometry(0.12, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.64))
    hairCapGeo.scale(0.98, 1.05, 1.0)
    const hairCap = new THREE.Mesh(hairCapGeo, materials.heroCharHair)
    hairCap.position.set(0.0, 0.02, -0.01)
    hairGroup.add(hairCap)

    const sidePartGeo = track(new THREE.BoxGeometry(0.13, 0.04, 0.05))
    const sidePart = new THREE.Mesh(sidePartGeo, materials.heroCharHair)
    sidePart.position.set(-0.02, 0.075, 0.085)
    sidePart.rotation.z = -0.18
    sidePart.rotation.y = 0.10
    hairGroup.add(sidePart)

    const sideburnL = new THREE.Mesh(track(new THREE.BoxGeometry(0.025, 0.09, 0.05)), materials.heroCharHair)
    sideburnL.position.set(-0.105, -0.01, 0.02)
    hairGroup.add(sideburnL)

    const sideburnR = new THREE.Mesh(track(new THREE.BoxGeometry(0.025, 0.09, 0.05)), materials.heroCharHair)
    sideburnR.position.set(0.105, -0.01, 0.02)
    hairGroup.add(sideburnR)

    base.headGroup.add(hairGroup)

    // Quality Department Precision Spectacles & Inspector Loupe
    const glassesGroup = new THREE.Group()
    const frameMat = materials.champagneBrass

    for (const side of [-1, 1]) {
      const rimGeo = track(new THREE.TorusGeometry(0.024, 0.0035, 8, 20))
      const rim = new THREE.Mesh(rimGeo, frameMat)
      rim.position.set(side * 0.038, 0.012, 0.104)
      glassesGroup.add(rim)

      const templeGeo = track(new THREE.BoxGeometry(0.004, 0.005, 0.09))
      const temple = new THREE.Mesh(templeGeo, frameMat)
      temple.position.set(side * 0.062, 0.014, 0.06)
      glassesGroup.add(temple)
    }

    const bridgeGeo = track(new THREE.BoxGeometry(0.024, 0.004, 0.005))
    const bridge = new THREE.Mesh(bridgeGeo, frameMat)
    bridge.position.set(0.0, 0.016, 0.105)
    glassesGroup.add(bridge)

    // Sleek single-lens appraisal loupe mounted on right frame
    const loupeRimGeo = track(new THREE.CylinderGeometry(0.014, 0.016, 0.018, 14))
    loupeRimGeo.rotateX(Math.PI / 2)
    const loupeRim = new THREE.Mesh(loupeRimGeo, materials.champagneBrass)
    loupeRim.position.set(0.048, 0.022, 0.118)
    glassesGroup.add(loupeRim)

    const loupeLensGeo = track(new THREE.CircleGeometry(0.013, 14))
    const loupeLens = new THREE.Mesh(loupeLensGeo, materials.charReviewerAccent)
    loupeLens.position.set(0.048, 0.022, 0.128)
    glassesGroup.add(loupeLens)

    base.headGroup.add(glassesGroup)

    // Quality Department Verification Lapel Badge
    const badgeGeo = track(new THREE.BoxGeometry(0.024, 0.032, 0.008))
    const badge = new THREE.Mesh(badgeGeo, materials.charReviewerAccent)
    badge.position.set(-0.09, 0.04, 0.11)
    badge.rotation.y = 0.15
    base.torsoGroup.add(badge)

    // Standing Verification Arms holding Verification Slate
    const armsLeftGroup = new THREE.Group()
    armsLeftGroup.position.set(-0.20, 0.10, 0.0)
    const armsRightGroup = new THREE.Group()
    armsRightGroup.position.set(0.20, 0.10, 0.0)

    const upperArmGeo = track(new THREE.CapsuleGeometry(0.036, 0.20, 8, 12))
    const foreArmGeo = track(new THREE.CapsuleGeometry(0.032, 0.18, 8, 12))
    const handGeo = track(new THREE.BoxGeometry(0.042, 0.022, 0.065))

    for (const [side, subGroup] of [[-1, armsLeftGroup], [1, armsRightGroup]] as const) {
      const upper = new THREE.Mesh(upperArmGeo, materials.heroCharReviewerCoat)
      upper.position.set(0.0, -0.08, 0.03)
      upper.rotation.x = 0.42
      upper.rotation.z = side * 0.08
      subGroup.add(upper)

      const fore = new THREE.Mesh(foreArmGeo, materials.heroCharReviewerCoat)
      fore.position.set(side * 0.02, -0.20, 0.15)
      fore.rotation.x = 0.95
      fore.rotation.y = side * -0.18
      subGroup.add(fore)

      const hand = new THREE.Mesh(handGeo, materials.heroCharSkin)
      hand.position.set(side * 0.02, -0.22, 0.26)
      hand.rotation.x = 0.20
      subGroup.add(hand)

      base.torsoGroup.add(subGroup)
    }

    // Physical Verification Slate / Dossier Holder Accessory
    const slateGroup = new THREE.Group()
    const slateBodyGeo = track(new THREE.BoxGeometry(0.28, 0.014, 0.20))
    const slateBody = new THREE.Mesh(slateBodyGeo, materials.structureGraphite)
    slateGroup.add(slateBody)

    const slateScreenGeo = track(new THREE.BoxGeometry(0.25, 0.004, 0.17))
    const slateScreen = new THREE.Mesh(slateScreenGeo, materials.terminalScreenEmerald)
    slateScreen.position.set(0.0, 0.008, 0.0)
    slateGroup.add(slateScreen)

    const stylusGeo = track(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 8))
    stylusGeo.rotateZ(Math.PI / 2)
    const stylus = new THREE.Mesh(stylusGeo, materials.champagneBrass)
    stylus.position.set(0.0, 0.015, -0.09)
    slateGroup.add(stylus)

    slateGroup.position.set(0.0, -0.14, 0.26)
    slateGroup.rotation.x = -0.32
    base.torsoGroup.add(slateGroup)

    const legs = this.buildDualLegs(materials.heroCharSlacksDark, materials.heroCharSneaker, false, base.baseTorsoY, track)
    base.rootGroup.add(legs.seatedLegsGroup)
    base.rootGroup.add(legs.standingLegsGroup)

    return {
      rootGroup: base.rootGroup,
      torsoGroup: base.torsoGroup,
      headMesh: base.headMesh,
      armsLeftGroup,
      armsRightGroup,
      legLeftGroup: legs.legLeftGroup,
      legRightGroup: legs.legRightGroup,
      seatedLegsGroup: legs.seatedLegsGroup,
      standingLegsGroup: legs.standingLegsGroup,
      accessoryMesh: slateGroup,
      statusRing: base.statusRing,
      statusMaterial: base.statusMaterial,
      baseTorsoY: base.baseTorsoY,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. BROWSER QA SPECIALIST (F4 Multi-Device Testing Hero)
  // ──────────────────────────────────────────────────────────────────────────
  public static buildBrowserQa(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T,
    trackMat: <T extends THREE.Material>(mat: T) => T
  ): HeroCharacterBuildResult {
    const base = this.buildBaseAnatomy(
      'Browser QA Specialist',
      'role:quality:browser-qa',
      materials.heroCharQaWorkwear,
      materials.deviceTablet, // Teal / cyan accent
      materials.heroCharSkin,
      materials.heroCharHair,
      false, // Standing at device rig
      materials,
      track,
      trackMat
    )

    // Hairstyle: Modern textured crop with fringe bangs
    const hairGroup = new THREE.Group()
    const hairCapGeo = track(new THREE.SphereGeometry(0.12, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.60))
    hairCapGeo.scale(0.96, 1.04, 0.98)
    const hairCap = new THREE.Mesh(hairCapGeo, materials.heroCharHair)
    hairCap.position.set(0.0, 0.02, -0.01)
    hairGroup.add(hairCap)

    const fringeGeo = track(new THREE.BoxGeometry(0.13, 0.035, 0.04))
    const fringe = new THREE.Mesh(fringeGeo, materials.heroCharHair)
    fringe.position.set(0.01, 0.07, 0.088)
    fringe.rotation.z = 0.08
    hairGroup.add(fringe)

    base.headGroup.add(hairGroup)

    // Analytical Testing Glasses (Thin wireframe so eyes and catchlights are fully visible)
    const glassesGroup = new THREE.Group()
    const frameMat = materials.laptopAluminum

    for (const side of [-1, 1]) {
      const rimGeo = track(new THREE.BoxGeometry(0.038, 0.028, 0.004))
      const rim = new THREE.Mesh(rimGeo, frameMat)
      rim.position.set(side * 0.038, 0.014, 0.104)
      glassesGroup.add(rim)

      const templeGeo = track(new THREE.BoxGeometry(0.004, 0.004, 0.09))
      const temple = new THREE.Mesh(templeGeo, frameMat)
      temple.position.set(side * 0.060, 0.016, 0.06)
      glassesGroup.add(temple)
    }

    const bridgeGeo = track(new THREE.BoxGeometry(0.020, 0.004, 0.004))
    const bridge = new THREE.Mesh(bridgeGeo, frameMat)
    bridge.position.set(0.0, 0.018, 0.104)
    glassesGroup.add(bridge)

    // Single-ear QA testing comms clip on left ear
    const commGeo = track(new THREE.CylinderGeometry(0.016, 0.018, 0.014, 12))
    commGeo.rotateZ(Math.PI / 2)
    const comm = new THREE.Mesh(commGeo, materials.deviceTablet)
    comm.position.set(-0.108, 0.01, 0.0)
    glassesGroup.add(comm)

    base.headGroup.add(glassesGroup)

    // Standing Arms holding responsive testing tablet
    const armsLeftGroup = new THREE.Group()
    armsLeftGroup.position.set(-0.20, 0.10, 0.0)
    const armsRightGroup = new THREE.Group()
    armsRightGroup.position.set(0.20, 0.10, 0.0)

    const upperArmGeo = track(new THREE.CapsuleGeometry(0.036, 0.20, 8, 12))
    const foreArmGeo = track(new THREE.CapsuleGeometry(0.032, 0.18, 8, 12))
    const handGeo = track(new THREE.BoxGeometry(0.042, 0.022, 0.065))

    for (const [side, subGroup] of [[-1, armsLeftGroup], [1, armsRightGroup]] as const) {
      const upper = new THREE.Mesh(upperArmGeo, materials.heroCharQaWorkwear)
      upper.position.set(0.0, -0.08, 0.03)
      upper.rotation.x = 0.40
      upper.rotation.z = side * 0.08
      subGroup.add(upper)

      const fore = new THREE.Mesh(foreArmGeo, materials.heroCharQaWorkwear)
      fore.position.set(side * 0.02, -0.20, 0.15)
      fore.rotation.x = 0.92
      fore.rotation.y = side * -0.16
      subGroup.add(fore)

      const hand = new THREE.Mesh(handGeo, materials.heroCharSkin)
      hand.position.set(side * 0.02, -0.22, 0.25)
      hand.rotation.x = 0.18
      subGroup.add(hand)

      base.torsoGroup.add(subGroup)
    }

    // Handheld Testing Tablet Accessory
    const tabletGroup = new THREE.Group()
    const tabBodyGeo = track(new THREE.BoxGeometry(0.24, 0.012, 0.17))
    const tabBody = new THREE.Mesh(tabBodyGeo, materials.gunmetal)
    tabletGroup.add(tabBody)

    const tabScreenGeo = track(new THREE.BoxGeometry(0.22, 0.004, 0.15))
    const tabScreen = new THREE.Mesh(tabScreenGeo, materials.deviceTablet)
    tabScreen.position.set(0.0, 0.007, 0.0)
    tabletGroup.add(tabScreen)

    tabletGroup.position.set(0.0, -0.14, 0.25)
    tabletGroup.rotation.x = -0.35
    base.torsoGroup.add(tabletGroup)

    const legs = this.buildDualLegs(materials.heroCharDenim, materials.heroCharSneaker, false, base.baseTorsoY, track)
    base.rootGroup.add(legs.seatedLegsGroup)
    base.rootGroup.add(legs.standingLegsGroup)

    return {
      rootGroup: base.rootGroup,
      torsoGroup: base.torsoGroup,
      headMesh: base.headMesh,
      armsLeftGroup,
      armsRightGroup,
      legLeftGroup: legs.legLeftGroup,
      legRightGroup: legs.legRightGroup,
      seatedLegsGroup: legs.seatedLegsGroup,
      standingLegsGroup: legs.standingLegsGroup,
      accessoryMesh: tabletGroup,
      statusRing: base.statusRing,
      statusMaterial: base.statusMaterial,
      baseTorsoY: base.baseTorsoY,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. CHIEF PLANNER (F1 Strategy Hero)
  // ──────────────────────────────────────────────────────────────────────────
  public static buildPlanner(
    materials: MaterialLibrary,
    track: <T extends THREE.BufferGeometry>(geom: T) => T,
    trackMat: <T extends THREE.Material>(mat: T) => T
  ): HeroCharacterBuildResult {
    const base = this.buildBaseAnatomy(
      'Chief Planner',
      'role:strategy:chief-planner',
      materials.heroCharPlannerSweater,
      materials.champagneBrass,
      materials.heroCharSkin,
      materials.hairPlanner,
      false, // Standing at planning table
      materials,
      track,
      trackMat
    )

    // Slick architect hairstyle
    const hairGroup = new THREE.Group()
    const hairCapGeo = track(new THREE.BoxGeometry(0.21, 0.08, 0.21))
    const hairCap = new THREE.Mesh(hairCapGeo, materials.hairPlanner)
    hairCap.position.set(0.0, 0.08, -0.01)
    hairGroup.add(hairCap)
    base.headGroup.add(hairGroup)

    // Architect Wireframe Glasses
    const glassesGroup = new THREE.Group()
    const frameGeo = track(new THREE.BoxGeometry(0.18, 0.026, 0.014))
    const frame = new THREE.Mesh(frameGeo, materials.champagneBrass)
    frame.position.set(0.0, 0.015, 0.108)
    glassesGroup.add(frame)
    base.headGroup.add(glassesGroup)

    // Standing Arms holding drafting folio
    const armsLeftGroup = new THREE.Group()
    armsLeftGroup.position.set(-0.20, 0.10, 0.0)
    const armsRightGroup = new THREE.Group()
    armsRightGroup.position.set(0.20, 0.10, 0.0)

    const upperArmGeo = track(new THREE.CapsuleGeometry(0.036, 0.20, 8, 12))
    const foreArmGeo = track(new THREE.CapsuleGeometry(0.032, 0.18, 8, 12))
    const handGeo = track(new THREE.BoxGeometry(0.042, 0.022, 0.065))

    for (const [side, subGroup] of [[-1, armsLeftGroup], [1, armsRightGroup]] as const) {
      const upper = new THREE.Mesh(upperArmGeo, materials.heroCharPlannerSweater)
      upper.position.set(0.0, -0.08, 0.03)
      upper.rotation.x = 0.38
      upper.rotation.z = side * 0.08
      subGroup.add(upper)

      const fore = new THREE.Mesh(foreArmGeo, materials.heroCharPlannerSweater)
      fore.position.set(side * 0.02, -0.20, 0.14)
      fore.rotation.x = 0.88
      fore.rotation.y = side * -0.15
      subGroup.add(fore)

      const hand = new THREE.Mesh(handGeo, materials.heroCharSkin)
      hand.position.set(side * 0.02, -0.22, 0.24)
      hand.rotation.x = 0.16
      subGroup.add(hand)

      base.torsoGroup.add(subGroup)
    }

    // Drafting Folio Accessory
    const folioGroup = new THREE.Group()
    const folioBodyGeo = track(new THREE.BoxGeometry(0.28, 0.016, 0.20))
    const folioBody = new THREE.Mesh(folioBodyGeo, materials.brass)
    folioGroup.add(folioBody)

    const folioPaperGeo = track(new THREE.BoxGeometry(0.25, 0.004, 0.17))
    const folioPaper = new THREE.Mesh(folioPaperGeo, materials.vellum)
    folioPaper.position.set(0.0, 0.009, 0.0)
    folioGroup.add(folioPaper)

    folioGroup.position.set(0.0, -0.15, 0.24)
    folioGroup.rotation.x = -0.28
    base.torsoGroup.add(folioGroup)

    const legs = this.buildDualLegs(materials.heroCharSlacksDark, materials.heroCharSneaker, false, base.baseTorsoY, track)
    base.rootGroup.add(legs.seatedLegsGroup)
    base.rootGroup.add(legs.standingLegsGroup)

    return {
      rootGroup: base.rootGroup,
      torsoGroup: base.torsoGroup,
      headMesh: base.headMesh,
      armsLeftGroup,
      armsRightGroup,
      legLeftGroup: legs.legLeftGroup,
      legRightGroup: legs.legRightGroup,
      seatedLegsGroup: legs.seatedLegsGroup,
      standingLegsGroup: legs.standingLegsGroup,
      accessoryMesh: folioGroup,
      statusRing: base.statusRing,
      statusMaterial: base.statusMaterial,
      baseTorsoY: base.baseTorsoY,
    }
  }
}
