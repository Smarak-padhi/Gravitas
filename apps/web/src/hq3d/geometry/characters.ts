/**
 * Architectural Role-Based Miniature Scale Figures for Gravitas 3D Headquarters (Wave 12D)
 *
 * Implements the minimal role-based character foundation:
 * - Exactly four reasoning-role characters (Chief Planner, Frontend Engineer, Backend Engineer, Independent Reviewer)
 * - Coherent, refined architectural silhouettes with tailored suiting palettes and physical accessories
 * - Zero locomotion: all characters remain anchored at their home stations
 * - Subtle ambient breathing cycles & state-driven postures (IDLE, FOCUSED, VERIFYING, WAITING, etc.)
 * - Full support for prefers-reduced-motion (instant pose snaps, zero interpolation)
 * - In-place reconciliation from authoritative WorldState via RolePresentationState
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../materials/materials.js'
import type { CharacterId } from '../types.js'
import type { CharacterPresentationState, RoleId, RolePresentationState } from '../roles/types.js'
import {
  FROZEN_ROLES,
  ROLE_HOME_POSITIONS,
  ROLE_HOME_ROTATIONS,
  TOWER_ROLE_HOME_POSITIONS,
  TOWER_ROLE_HOME_ROTATIONS,
} from '../roles/roles.js'
import { buildRoleInspectorMetadata } from '../roles/roleStationMapping.js'
import { HeroCharacter } from './heroBay/heroCharacter.js'

interface FigureController {
  readonly roleId: RoleId
  readonly rootGroup: THREE.Group
  readonly torsoGroup: THREE.Group
  readonly headMesh: THREE.Mesh
  readonly armsLeftGroup: THREE.Group
  readonly armsRightGroup: THREE.Group
  readonly legLeftGroup: THREE.Group
  readonly legRightGroup: THREE.Group
  readonly seatedLegsGroup: THREE.Group | null
  readonly standingLegsGroup: THREE.Group
  readonly accessoryMesh: THREE.Object3D | null
  readonly statusRing: THREE.Mesh
  readonly statusMaterial: THREE.MeshBasicMaterial
  readonly baseTorsoY: number
  readonly isSeatedDefault: boolean
  isSeated: boolean
  readonly phaseOffset: number
  characterState: CharacterPresentationState
}

export class HqCharacters {
  public readonly group: THREE.Group
  public readonly figureMap = new Map<CharacterId, THREE.Group>()
  private readonly controllers = new Map<RoleId, FigureController>()
  private readonly geometriesToDispose: THREE.BufferGeometry[] = []
  private readonly materialsToDispose: THREE.Material[] = []
  private readonly materials: MaterialLibrary

  constructor(materials: MaterialLibrary) {
    this.materials = materials
    this.group = new THREE.Group()
    this.group.name = 'hq-characters'

    // Build the four frozen role characters
    for (let i = 0; i < FROZEN_ROLES.length; i++) {
      const role = FROZEN_ROLES[i]
      this.buildRoleFigure(role.roleId, i * 1.57)
    }
  }

  private track<T extends THREE.BufferGeometry>(geom: T): T {
    this.geometriesToDispose.push(geom)
    return geom
  }

  private trackMat<T extends THREE.Material>(mat: T): T {
    this.materialsToDispose.push(mat)
    return mat
  }

  private buildRoleFigure(roleId: RoleId, phaseOffset: number): void {
    const pos = TOWER_ROLE_HOME_POSITIONS[roleId] ?? ROLE_HOME_POSITIONS[roleId]
    const rotY = TOWER_ROLE_HOME_ROTATIONS[roleId] ?? ROLE_HOME_ROTATIONS[roleId]

    // Wave 12F Hero Frontend Engineer Character (authored miniature prototype)
    if (roleId === 'role:engineering:frontend-engineer') {
      const hero = HeroCharacter.buildCharacter(
        this.materials,
        this.track.bind(this),
        this.trackMat.bind(this)
      )
      const rootGroup = hero.rootGroup
      rootGroup.position.set(...pos)
      rootGroup.rotation.y = rotY
      rootGroup.name = `character:${roleId}`

      const initialMeta = buildRoleInspectorMetadata({
        roleId,
        departmentId: 'ENGINEERING',
        displayName: 'Frontend Engineer',
        characterState: 'IDLE',
        isSeated: true,
        stationId: 'engineering-workstation-01',
        stationAlias: 'codex-workstation',
        currentTaskId: null,
        currentTaskTitle: null,
        currentHarness: 'UNKNOWN',
        transport: 'UNKNOWN',
        provider: 'UNKNOWN',
        model: 'UNKNOWN',
        isFixtureOnly: false,
        homePosition: pos,
      })

      rootGroup.userData = {
        type: 'character',
        id: roleId,
        name: 'Frontend Engineer',
        role: 'Frontend Engineer',
        room: 'Agent Operations',
        status: 'IDLE',
        description: 'Frontend Engineer at home station.',
        roleMetadata: initialMeta,
      }

      this.group.add(rootGroup)
      this.figureMap.set(roleId, rootGroup)
      this.figureMap.set('char-codex', rootGroup)
      const aliasNode = new THREE.Object3D()
      aliasNode.name = 'character:char-codex'
      aliasNode.userData = rootGroup.userData
      rootGroup.add(aliasNode)

      this.controllers.set(roleId, {
        roleId,
        rootGroup,
        torsoGroup: hero.torsoGroup,
        headMesh: hero.headMesh,
        armsLeftGroup: hero.armsLeftGroup,
        armsRightGroup: hero.armsRightGroup,
        legLeftGroup: hero.legLeftGroup,
        legRightGroup: hero.legRightGroup,
        seatedLegsGroup: hero.seatedLegsGroup,
        standingLegsGroup: hero.standingLegsGroup,
        accessoryMesh: hero.accessoryMesh,
        statusRing: hero.statusRing,
        statusMaterial: hero.statusMaterial,
        baseTorsoY: hero.baseTorsoY,
        isSeatedDefault: true,
        isSeated: true,
        phaseOffset,
        characterState: 'IDLE',
      })
      return
    }

    const rootGroup = new THREE.Group()
    rootGroup.position.set(...pos)
    rootGroup.rotation.y = rotY
    rootGroup.name = `character:${roleId}`

    const isSeated = roleId === 'role:engineering:backend-engineer'
    const yBase = isSeated ? 0.46 : 0.0

    // Material selection per role (Cozy modern creative studio aesthetic)
    let suitMat = this.materials.charSweaterSlate
    let accentMat: THREE.Material = this.materials.champagneBrass
    const pantsMat = this.materials.charDenim
    const shoeMat = this.materials.charSneakerWhite
    let roomName = 'Agent Operations'
    let roleName = 'Engineer'

    if (roleId === 'role:strategy:chief-planner') {
      suitMat = this.materials.charSweaterOat
      accentMat = this.materials.charPlannerAccent
      roomName = 'Mission Control'
      roleName = 'Chief Planner'
    } else if (roleId === 'role:engineering:backend-engineer') {
      suitMat = this.materials.charSweaterSlate
      accentMat = this.materials.charBackendAccent
      roomName = 'Agent Operations'
      roleName = 'Backend Engineer'
    } else if (roleId === 'role:quality:independent-reviewer') {
      suitMat = this.materials.charTunicSage
      accentMat = this.materials.charReviewerAccent
      roomName = 'Verification Cleanroom'
      roleName = 'Independent Reviewer'
    }

    // 0. Status Underlay Ring (Floor disk indicating active status)
    const ringGeo = this.track(new THREE.RingGeometry(0.25, 0.38, 24))
    ringGeo.rotateX(-Math.PI / 2)
    const statusMaterial = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.0, // Faint / invisible when idle
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    )
    const statusRing = new THREE.Mesh(ringGeo, statusMaterial)
    statusRing.position.set(0.0, 0.015, 0.0)
    rootGroup.add(statusRing)

    // 1. Torso Group (Articulated for breathing and posture shifts)
    const torsoGroup = new THREE.Group()
    torsoGroup.position.set(0.0, yBase + 0.62, 0.0)

    // Cozy knit sweater / tailored tunic torso - soft curved collectible mascot form
    const torsoGeo = this.track(new THREE.CapsuleGeometry(0.13, 0.18, 8, 16))
    const torso = new THREE.Mesh(torsoGeo, suitMat)
    torso.scale.set(1.15, 1.0, 0.85) // Tapered soft-curved sweater torso
    torso.castShadow = true
    torsoGroup.add(torso)

    // Accent collar / ribbing detail
    const collarGeo = this.track(new THREE.CylinderGeometry(0.065, 0.075, 0.05, 16))
    const collar = new THREE.Mesh(collarGeo, accentMat)
    collar.position.set(0.0, 0.19, 0.0)
    torsoGroup.add(collar)

    // 2. Sculpted Stylized Mascot Head with expressive eyes
    const headGeo = this.track(new THREE.SphereGeometry(0.125, 16, 14))
    const head = new THREE.Mesh(headGeo, this.materials.charSkin)
    head.scale.set(0.96, 1.06, 0.98)
    head.position.set(0.0, 0.35, 0.0)
    head.castShadow = true
    torsoGroup.add(head)

    // Expressive stylized eyes (dark almond pill shape)
    const eyeGeo = this.track(new THREE.BoxGeometry(0.024, 0.042, 0.015))
    const eyeLeft = new THREE.Mesh(eyeGeo, this.materials.charEyes)
    eyeLeft.position.set(-0.042, 0.355, 0.116)
    torsoGroup.add(eyeLeft)

    const eyeRight = new THREE.Mesh(eyeGeo, this.materials.charEyes)
    eyeRight.position.set(0.042, 0.355, 0.116)
    torsoGroup.add(eyeRight)

    // Micro catchlight specular highlights
    const specGeo = this.track(new THREE.BoxGeometry(0.008, 0.012, 0.012))
    const specLeft = new THREE.Mesh(specGeo, this.materials.charEyeSpec)
    specLeft.position.set(-0.038, 0.366, 0.122)
    torsoGroup.add(specLeft)

    const specRight = new THREE.Mesh(specGeo, this.materials.charEyeSpec)
    specRight.position.set(0.046, 0.366, 0.122)
    torsoGroup.add(specRight)

    // Role-specific sculpted hair & mascot accessories
    if (roleId === 'role:strategy:chief-planner') {
      // Chief Planner: Sculpted slick hair crown
      const hairCrownGeo = this.track(new THREE.BoxGeometry(0.21, 0.08, 0.21))
      const hairCrown = new THREE.Mesh(hairCrownGeo, this.materials.hairPlanner)
      hairCrown.position.set(0.0, 0.44, -0.01)
      torsoGroup.add(hairCrown)

      // Architect wireframe glasses
      const frameGeo = this.track(new THREE.BoxGeometry(0.18, 0.028, 0.015))
      const frame = new THREE.Mesh(frameGeo, this.materials.champagneBrass)
      frame.position.set(0.0, 0.365, 0.118)
      torsoGroup.add(frame)
    } else if (roleId === 'role:engineering:backend-engineer') {
      // Backend Engineer: Structured dark technician cap / hair
      const capGeo = this.track(new THREE.BoxGeometry(0.22, 0.09, 0.22))
      const cap = new THREE.Mesh(capGeo, this.materials.hairBackend)
      cap.position.set(0.0, 0.43, -0.02)
      torsoGroup.add(cap)

      // Diagnostic boom headset
      const boomGeo = this.track(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 6))
      const boom = new THREE.Mesh(boomGeo, this.materials.champagneBrass)
      boom.position.set(0.09, 0.31, 0.08)
      boom.rotation.x = 0.5
      boom.rotation.z = -0.3
      torsoGroup.add(boom)
    } else if (roleId === 'role:quality:independent-reviewer') {
      // Independent Reviewer: Tailored cleanroom hood
      const hoodGeo = this.track(new THREE.SphereGeometry(0.134, 14, 12))
      const hood = new THREE.Mesh(hoodGeo, this.materials.hairReviewer)
      hood.position.set(0.0, 0.36, -0.02)
      torsoGroup.add(hood)

      // Optical diff magnifier loupe visor
      const loupeGeo = this.track(new THREE.CylinderGeometry(0.025, 0.03, 0.06, 12))
      const loupe = new THREE.Mesh(loupeGeo, this.materials.charReviewerAccent)
      loupe.rotation.x = Math.PI / 2
      loupe.position.set(0.06, 0.37, 0.13)
      torsoGroup.add(loupe)
    }

    // 3. Articulated Arms & Physical Accessories
    const armsLeftGroup = new THREE.Group()
    const armsRightGroup = new THREE.Group()
    let accessoryMesh: THREE.Object3D | null = null
    let seatedLegsGroup: THREE.Group | null = null

    if (isSeated) {
      // Seated Posture: Soft rounded arms resting forward toward desk
      const upperArmGeo = this.track(new THREE.CapsuleGeometry(0.038, 0.16, 6, 12))
      const armL = new THREE.Mesh(upperArmGeo, suitMat)
      armL.position.set(-0.2, 0.0, 0.0)
      armsLeftGroup.add(armL)

      const armR = new THREE.Mesh(upperArmGeo, suitMat)
      armR.position.set(0.2, 0.0, 0.0)
      armsRightGroup.add(armR)

      const forearmGeo = this.track(new THREE.CapsuleGeometry(0.034, 0.16, 6, 12))
      const forearmL = new THREE.Mesh(forearmGeo, suitMat)
      forearmL.rotation.x = Math.PI / 2
      forearmL.position.set(-0.18, -0.11, 0.11)
      armsLeftGroup.add(forearmL)

      const forearmR = new THREE.Mesh(forearmGeo, suitMat)
      forearmR.rotation.x = Math.PI / 2
      forearmR.position.set(0.18, -0.11, 0.11)
      armsRightGroup.add(forearmR)

      const handGeo = this.track(new THREE.SphereGeometry(0.032, 8, 8))
      const handL = new THREE.Mesh(handGeo, this.materials.charSkin)
      handL.position.set(-0.16, -0.11, 0.23)
      armsLeftGroup.add(handL)

      const handR = new THREE.Mesh(handGeo, this.materials.charSkin)
      handR.position.set(0.16, -0.11, 0.23)
      armsRightGroup.add(handR)

      // Backend Engineer: Systems terminal / notebook
      const notebookGeo = this.track(new THREE.BoxGeometry(0.24, 0.02, 0.17))
      accessoryMesh = new THREE.Mesh(notebookGeo, this.materials.terminalScreenEmerald)
      accessoryMesh.position.set(0.0, -0.12, 0.32)
      accessoryMesh.rotation.x = -0.08
      torsoGroup.add(accessoryMesh)

      // Seated Legs (denim thighs + denim shins + stylish rounded sneakers)
      const seatedLegs = new THREE.Group()
      seatedLegs.name = 'seated-legs'

      const thighGeo = this.track(new THREE.CapsuleGeometry(0.052, 0.22, 6, 12))
      const thighL = new THREE.Mesh(thighGeo, pantsMat)
      thighL.rotation.x = Math.PI / 2
      thighL.position.set(-0.1, yBase + 0.36, 0.16)
      seatedLegs.add(thighL)

      const thighR = new THREE.Mesh(thighGeo, pantsMat)
      thighR.rotation.x = Math.PI / 2
      thighR.position.set(0.1, yBase + 0.36, 0.16)
      seatedLegs.add(thighR)

      const shinGeo = this.track(new THREE.CapsuleGeometry(0.046, 0.22, 6, 12))
      const shinL = new THREE.Mesh(shinGeo, pantsMat)
      shinL.position.set(-0.1, 0.2, 0.3)
      seatedLegs.add(shinL)

      const shinR = new THREE.Mesh(shinGeo, pantsMat)
      shinR.position.set(0.1, 0.2, 0.3)
      seatedLegs.add(shinR)

      const shoeGeo = this.track(new THREE.CapsuleGeometry(0.042, 0.08, 6, 12))
      const shoeL = new THREE.Mesh(shoeGeo, shoeMat)
      shoeL.rotation.x = Math.PI / 2
      shoeL.position.set(-0.1, 0.04, 0.34)
      seatedLegs.add(shoeL)

      const shoeR = new THREE.Mesh(shoeGeo, shoeMat)
      shoeR.rotation.x = Math.PI / 2
      shoeR.position.set(0.1, 0.04, 0.34)
      seatedLegs.add(shoeR)

      rootGroup.add(seatedLegs)
      seatedLegsGroup = seatedLegs
    } else {
      // Standing Posture (Chief Planner & Independent Reviewer)
      const armGeo = this.track(new THREE.CapsuleGeometry(0.038, 0.32, 6, 12))
      const armL = new THREE.Mesh(armGeo, suitMat)
      armL.position.set(-0.2, -0.06, 0.02)
      armsLeftGroup.add(armL)

      const armR = new THREE.Mesh(armGeo, suitMat)
      armR.position.set(0.2, -0.06, 0.02)
      armsRightGroup.add(armR)

      if (roleId === 'role:strategy:chief-planner') {
        // Chief Planner: Planning tablet / folio held at waist level
        const folioGeo = this.track(new THREE.BoxGeometry(0.26, 0.02, 0.18))
        accessoryMesh = new THREE.Mesh(folioGeo, this.materials.brass)
        accessoryMesh.position.set(0.0, -0.15, 0.22)
        accessoryMesh.rotation.x = -0.3
        torsoGroup.add(accessoryMesh)

        // Arms forward holding folio
        armL.rotation.x = -0.35
        armL.position.set(-0.16, -0.04, 0.1)
        armR.rotation.x = -0.35
        armR.position.set(0.16, -0.04, 0.1)
      } else if (roleId === 'role:quality:independent-reviewer') {
        // Independent Reviewer: Verification slate held at chest height
        const slateGeo = this.track(new THREE.BoxGeometry(0.24, 0.015, 0.18))
        accessoryMesh = new THREE.Mesh(slateGeo, this.materials.terminalScreenEmerald)
        accessoryMesh.position.set(0.0, -0.05, 0.24)
        accessoryMesh.rotation.x = -0.45
        torsoGroup.add(accessoryMesh)

        // Arms angled holding slate
        armL.rotation.x = -0.55
        armL.position.set(-0.15, -0.01, 0.12)
        armR.rotation.x = -0.55
        armR.position.set(0.15, -0.01, 0.12)
      }
    }

    // Articulated Standing / Walking Legs (denim + rounded white sneakers)
    const standingLegsGroup = new THREE.Group()
    standingLegsGroup.name = 'standing-legs'

    const legLeftGroup = new THREE.Group()
    legLeftGroup.position.set(-0.1, 0.62, 0.0)
    const legGeo = this.track(new THREE.CapsuleGeometry(0.052, 0.38, 6, 12))
    const legMeshL = new THREE.Mesh(legGeo, pantsMat)
    legMeshL.position.set(0.0, -0.26, 0.0)
    legMeshL.castShadow = true
    legLeftGroup.add(legMeshL)
    const shoeGeo = this.track(new THREE.CapsuleGeometry(0.045, 0.08, 6, 12))
    const shoeMeshL = new THREE.Mesh(shoeGeo, shoeMat)
    shoeMeshL.rotation.x = Math.PI / 2
    shoeMeshL.position.set(0.0, -0.54, 0.03)
    legLeftGroup.add(shoeMeshL)
    standingLegsGroup.add(legLeftGroup)

    const legRightGroup = new THREE.Group()
    legRightGroup.position.set(0.1, 0.62, 0.0)
    const legMeshR = new THREE.Mesh(legGeo, pantsMat)
    legMeshR.position.set(0.0, -0.26, 0.0)
    legMeshR.castShadow = true
    legRightGroup.add(legMeshR)
    const shoeMeshR = new THREE.Mesh(shoeGeo, shoeMat)
    shoeMeshR.rotation.x = Math.PI / 2
    shoeMeshR.position.set(0.0, -0.54, 0.03)
    legRightGroup.add(shoeMeshR)
    standingLegsGroup.add(legRightGroup)

    if (isSeated) {
      standingLegsGroup.visible = false
    }

    rootGroup.add(standingLegsGroup)

    torsoGroup.add(armsLeftGroup)
    torsoGroup.add(armsRightGroup)
    rootGroup.add(torsoGroup)

    // Initial User Data for Picking
    const initialMeta = buildRoleInspectorMetadata({
      roleId,
      departmentId:
        roleId === 'role:strategy:chief-planner'
          ? 'CONTROL_STRATEGY'
          : roleId === 'role:quality:independent-reviewer'
            ? 'QUALITY'
            : 'ENGINEERING',
      displayName: roleName,
      characterState: 'IDLE',
      isSeated,
      stationId:
        roleId === 'role:strategy:chief-planner'
          ? 'planning-table'
          : roleId === 'role:quality:independent-reviewer'
            ? 'verifier-console'
            : 'engineering-workstation-02',
      stationAlias:
        roleId === 'role:strategy:chief-planner'
          ? 'planning-table'
          : roleId === 'role:quality:independent-reviewer'
            ? 'verifier-console'
            : 'fcc-workstation',
      currentTaskId: null,
      currentTaskTitle: null,
      currentHarness: 'UNKNOWN',
      transport: 'UNKNOWN',
      provider: 'UNKNOWN',
      model: 'UNKNOWN',
      isFixtureOnly: false,
      homePosition: pos,
    })

    rootGroup.userData = {
      type: 'character',
      id: roleId,
      name: roleName,
      role: roleName,
      room: roomName,
      status: 'IDLE',
      description: `${roleName} at home station.`,
      roleMetadata: initialMeta,
    }

    this.group.add(rootGroup)
    this.figureMap.set(roleId, rootGroup)
    if (roleId === 'role:engineering:backend-engineer') {
      this.figureMap.set('char-fcc', rootGroup)
      const aliasNode = new THREE.Object3D()
      aliasNode.name = 'character:char-fcc'
      aliasNode.userData = rootGroup.userData
      rootGroup.add(aliasNode)
    } else if (roleId === 'role:quality:independent-reviewer') {
      this.figureMap.set('char-verifier', rootGroup)
      const aliasNode = new THREE.Object3D()
      aliasNode.name = 'character:char-verifier'
      aliasNode.userData = rootGroup.userData
      rootGroup.add(aliasNode)
    }

    this.controllers.set(roleId, {
      roleId,
      rootGroup,
      torsoGroup,
      headMesh: head,
      armsLeftGroup,
      armsRightGroup,
      legLeftGroup,
      legRightGroup,
      seatedLegsGroup,
      standingLegsGroup,
      accessoryMesh,
      statusRing,
      statusMaterial,
      baseTorsoY: yBase + 0.62,
      isSeatedDefault: isSeated,
      isSeated,
      phaseOffset,
      characterState: 'IDLE',
    })
  }

  /**
   * Sets the world position and yaw of a role's character figure.
   */
  public setFigurePosition(
    roleId: RoleId,
    pos: readonly [number, number, number],
    rotY: number
  ): void {
    const ctrl = this.controllers.get(roleId)
    if (!ctrl) return
    ctrl.rootGroup.position.set(pos[0], pos[1], pos[2])
    ctrl.rootGroup.rotation.y = rotY
  }

  /**
   * Gets the current world position of a role's character figure.
   */
  public getFigurePosition(roleId: RoleId): [number, number, number] {
    const ctrl = this.controllers.get(roleId)
    if (!ctrl) return [0, 0, 0]
    return [ctrl.rootGroup.position.x, ctrl.rootGroup.position.y, ctrl.rootGroup.position.z]
  }

  /**
   * Toggles character posture between SEATED at desk, STANDING at station, or WALKING.
   */
  public setFigurePose(roleId: RoleId, pose: 'SEATED' | 'STANDING' | 'WALKING'): void {
    const ctrl = this.controllers.get(roleId)
    if (!ctrl) return

    if (pose === 'SEATED') {
      ctrl.isSeated = true
      if (ctrl.seatedLegsGroup) ctrl.seatedLegsGroup.visible = true
      ctrl.standingLegsGroup.visible = false
      ctrl.torsoGroup.position.y = ctrl.baseTorsoY
    } else {
      // STANDING or WALKING
      ctrl.isSeated = false
      if (ctrl.seatedLegsGroup) ctrl.seatedLegsGroup.visible = false
      ctrl.standingLegsGroup.visible = true
      ctrl.torsoGroup.position.y = 0.62
    }
  }

  /**
   * Applies procedural walk cycle limb swings and torso bobbing.
   * Target walking speed: 1.25–1.45 units/s.
   */
  public applyWalkCycle(
    roleId: RoleId,
    walkPhase: number,
    isWalking: boolean,
    reducedMotion: boolean
  ): void {
    const ctrl = this.controllers.get(roleId)
    if (!ctrl) return

    if (reducedMotion || !isWalking) {
      ctrl.legLeftGroup.rotation.x = 0.0
      ctrl.legRightGroup.rotation.x = 0.0
      ctrl.armsLeftGroup.rotation.x = 0.0
      ctrl.armsRightGroup.rotation.x = 0.0
      ctrl.torsoGroup.position.y = ctrl.isSeated ? ctrl.baseTorsoY : 0.62
      ctrl.torsoGroup.rotation.z = 0.0
      return
    }

    // Walking posture: switch to standing legs
    this.setFigurePose(roleId, 'WALKING')

    // Leg swings (counter-phased, amplitude ±0.45 rad)
    const legSwing = Math.sin(walkPhase) * 0.45
    ctrl.legLeftGroup.rotation.x = legSwing
    ctrl.legRightGroup.rotation.x = -legSwing

    // Opposing arm swings (amplitude ±0.35 rad)
    ctrl.armsLeftGroup.rotation.x = -legSwing * 0.78
    ctrl.armsRightGroup.rotation.x = legSwing * 0.78

    // Minor hip bobbing & small torso lean (unhurried architectural pace)
    ctrl.torsoGroup.position.y = 0.62 + Math.abs(Math.sin(walkPhase)) * 0.02
    ctrl.torsoGroup.rotation.z = Math.sin(walkPhase) * 0.02
  }

  /**
   * Continuous animation update loop (Wave 12D)
   * Evaluates subtle breathing cycles and posture orientation.
   * Snaps instantly to static postures if reducedMotion is active.
   */
  public update(timeSeconds: number, reducedMotion: boolean): void {
    for (const ctrl of this.controllers.values()) {
      const { torsoGroup, headMesh, baseTorsoY, phaseOffset, characterState } = ctrl

      if (reducedMotion) {
        // Reduced motion: static upright / focused posture without continuous sine oscillation
        torsoGroup.position.y = baseTorsoY
        headMesh.position.y = 0.35
        headMesh.rotation.x = characterState === 'VERIFYING' ? 0.14 : characterState === 'FOCUSED' ? 0.08 : 0.0
        torsoGroup.rotation.x = characterState === 'FOCUSED' ? 0.07 : 0.0
        headMesh.rotation.y = 0.0
        if (ctrl.isSeated) {
          ctrl.armsLeftGroup.position.y = 0.0
          ctrl.armsRightGroup.position.y = 0.0
        }
        continue
      }

      // Subtle natural breathing cycle (low amplitude: ±0.003m, ~1.5 rad/s)
      const breath = Math.sin(timeSeconds * 1.5 + phaseOffset)

      if (characterState === 'IDLE') {
        // Idle: relaxed ambient presence, arms still, gentle head glance over 7s
        torsoGroup.position.y = baseTorsoY + breath * 0.003
        torsoGroup.rotation.x = 0.0
        headMesh.rotation.x = breath * 0.008
        headMesh.rotation.y = Math.sin(timeSeconds * 0.32 + phaseOffset) * 0.04
        if (ctrl.isSeated) {
          ctrl.armsLeftGroup.position.y = 0.0
          ctrl.armsRightGroup.position.y = 0.0
        }
      } else if (characterState === 'FOCUSED') {
        // Working / Focused posture: tilted forward toward screen
        torsoGroup.position.y = baseTorsoY + breath * 0.002
        torsoGroup.rotation.x = 0.08
        headMesh.rotation.x = 0.08 + breath * 0.006
        headMesh.rotation.y = 0.0

        // Active typing micro-motion only when authoritative state is WORKING / FOCUSED
        if (ctrl.isSeated) {
          const typeMotion = Math.sin(timeSeconds * 7.5) * 0.004
          ctrl.armsLeftGroup.position.y = typeMotion
          ctrl.armsRightGroup.position.y = -typeMotion
        }
      } else if (characterState === 'VERIFYING') {
        // Verifying posture: precise examination posture directed at inspection device
        torsoGroup.position.y = baseTorsoY + breath * 0.002
        torsoGroup.rotation.x = 0.06
        headMesh.rotation.x = 0.14 + breath * 0.008
        headMesh.rotation.y = 0.0
        if (ctrl.isSeated) {
          ctrl.armsLeftGroup.position.y = 0.0
          ctrl.armsRightGroup.position.y = 0.0
        }
      } else if (characterState === 'WAITING') {
        torsoGroup.position.y = baseTorsoY + breath * 0.003
        torsoGroup.rotation.x = -0.02
        headMesh.rotation.x = 0.0
        headMesh.rotation.y = 0.0
      } else if (characterState === 'SUCCESS') {
        torsoGroup.position.y = baseTorsoY + breath * 0.004
        torsoGroup.rotation.x = -0.04
        headMesh.rotation.x = -0.04
        headMesh.rotation.y = 0.0
      } else if (characterState === 'FAILURE' || characterState === 'ATTENTION') {
        torsoGroup.position.y = baseTorsoY + breath * 0.005
        torsoGroup.rotation.x = 0.05
        headMesh.rotation.x = 0.03
        headMesh.rotation.y = 0.0
      }
    }
  }

  /**
   * Authoritative In-Place Role Reconciliation (Wave 12D)
   *
   * Reconciles character presentation states derived from WorldState without
   * rebuilding meshes or altering stationary coordinates.
   */
  public reconcileRoles(roleStates: Map<RoleId, RolePresentationState>): void {
    for (const [roleId, presentation] of roleStates.entries()) {
      const ctrl = this.controllers.get(roleId)
      if (!ctrl) continue

      ctrl.characterState = presentation.characterState

      // Update status ring color & opacity
      const ringMat = ctrl.statusMaterial
      switch (presentation.characterState) {
        case 'FOCUSED':
          ringMat.color.setHex(0x38bdf8) // Vibrant cobalt / cyan
          ringMat.opacity = 0.7
          break
        case 'VERIFYING':
          ringMat.color.setHex(0x34d399) // Emerald verification
          ringMat.opacity = 0.75
          break
        case 'WAITING':
          ringMat.color.setHex(0xf59e0b) // Amber review
          ringMat.opacity = 0.65
          break
        case 'ATTENTION':
          ringMat.color.setHex(0xf97316) // Attention orange
          ringMat.opacity = 0.8
          break
        case 'SUCCESS':
          ringMat.color.setHex(0x22c55e) // Success green
          ringMat.opacity = 0.8
          break
        case 'FAILURE':
          ringMat.color.setHex(0xef4444) // Failure red
          ringMat.opacity = 0.8
          break
        case 'IDLE':
        default:
          ringMat.opacity = 0.08 // Subdued ambient presence
          ringMat.color.setHex(0x475569)
          break
      }

      // Update Picking UserData with rich decoupled RoleInspectorMetadata
      const inspectorMeta = buildRoleInspectorMetadata(presentation)
      ctrl.rootGroup.userData = {
        type: 'character',
        id: roleId,
        name: presentation.displayName,
        role: presentation.displayName,
        room:
          roleId === 'role:strategy:chief-planner'
            ? 'Mission Control'
            : roleId === 'role:quality:independent-reviewer'
              ? 'Verification Cleanroom'
              : 'Agent Operations',
        status: presentation.characterState,
        description: `${presentation.displayName} (${presentation.departmentId}). Station: ${presentation.stationId}. Status: ${presentation.characterState}. Harness: ${presentation.currentHarness}.`,
        roleMetadata: inspectorMeta,
      }
    }
  }

  /**
   * Backwards-compatible visibility toggle (preserves compatibility with legacy callers)
   */
  public setCharacterVisibility(id: CharacterId, visible: boolean): void {
    // Map legacy IDs to new Role IDs
    let targetRoleId: RoleId | undefined
    if (id === 'char-codex') targetRoleId = 'role:engineering:frontend-engineer'
    else if (id === 'char-fcc') targetRoleId = 'role:engineering:backend-engineer'
    else if (id === 'char-verifier') targetRoleId = 'role:quality:independent-reviewer'
    else if (this.figureMap.has(id as RoleId)) targetRoleId = id as RoleId

    if (targetRoleId) {
      const fig = this.figureMap.get(targetRoleId)
      if (fig) fig.visible = visible
    }
  }

  public getFigure(id: CharacterId | string): THREE.Group | undefined {
    if (id === 'char-codex' || id === 'frontend-engineer') return this.figureMap.get('role:engineering:frontend-engineer')
    if (id === 'char-fcc' || id === 'backend-engineer') return this.figureMap.get('role:engineering:backend-engineer')
    if (id === 'char-verifier' || id === 'independent-reviewer' || id === 'reviewer') return this.figureMap.get('role:quality:independent-reviewer')
    return this.figureMap.get(id as RoleId)
  }

  public dispose(): void {
    for (const geom of this.geometriesToDispose) {
      geom.dispose()
    }
    this.geometriesToDispose.length = 0

    for (const mat of this.materialsToDispose) {
      mat.dispose()
    }
    this.materialsToDispose.length = 0

    this.figureMap.clear()
    this.controllers.clear()
  }
}
