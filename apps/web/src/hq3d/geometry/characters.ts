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
  TOWER_ROLES,
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

    // Build the tower role characters (FROZEN_ROLES + BROWSER_QA_ROLE)
    for (let i = 0; i < TOWER_ROLES.length; i++) {
      const role = TOWER_ROLES[i]
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

    let hero: import('./heroBay/heroCharacter.js').HeroCharacterBuildResult
    let isSeated = false
    let roomName = 'Agent Operations'
    let roleName = 'Engineer'

    if (roleId === 'role:engineering:frontend-engineer') {
      hero = HeroCharacter.buildFrontend(this.materials, this.track.bind(this), this.trackMat.bind(this))
      isSeated = true
      roomName = 'Agent Operations'
      roleName = 'Frontend Engineer'
    } else if (roleId === 'role:engineering:backend-engineer') {
      hero = HeroCharacter.buildBackend(this.materials, this.track.bind(this), this.trackMat.bind(this))
      isSeated = true
      roomName = 'Agent Operations'
      roleName = 'Backend Engineer'
    } else if (roleId === 'role:quality:independent-reviewer') {
      hero = HeroCharacter.buildReviewer(this.materials, this.track.bind(this), this.trackMat.bind(this))
      isSeated = false
      roomName = 'Verification Cleanroom'
      roleName = 'Independent Reviewer'
    } else if (roleId === 'role:quality:browser-qa') {
      hero = HeroCharacter.buildBrowserQa(this.materials, this.track.bind(this), this.trackMat.bind(this))
      isSeated = false
      roomName = 'Browser QA Lab'
      roleName = 'Browser QA Specialist'
    } else {
      hero = HeroCharacter.buildPlanner(this.materials, this.track.bind(this), this.trackMat.bind(this))
      isSeated = false
      roomName = 'Mission Control'
      roleName = 'Chief Planner'
    }

    const rootGroup = hero.rootGroup
    rootGroup.position.set(...pos)
    rootGroup.rotation.y = rotY
    rootGroup.name = `character:${roleId}`

    const initialMeta = buildRoleInspectorMetadata({
      roleId,
      departmentId:
        roleId === 'role:strategy:chief-planner'
          ? 'CONTROL_STRATEGY'
          : (roleId === 'role:quality:independent-reviewer' || roleId === 'role:quality:browser-qa')
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
            : roleId === 'role:quality:browser-qa'
              ? 'browser-qa-station'
              : roleId === 'role:engineering:frontend-engineer'
                ? 'engineering-workstation-01'
                : 'engineering-workstation-02',
      stationAlias:
        roleId === 'role:strategy:chief-planner'
          ? 'planning-table'
          : roleId === 'role:quality:independent-reviewer'
            ? 'verifier-console'
            : roleId === 'role:quality:browser-qa'
              ? 'browser-qa-matrix'
              : roleId === 'role:engineering:frontend-engineer'
                ? 'codex-workstation'
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

    if (roleId === 'role:engineering:frontend-engineer') {
      this.figureMap.set('char-codex', rootGroup)
      const aliasNode = new THREE.Object3D()
      aliasNode.name = 'character:char-codex'
      aliasNode.userData = rootGroup.userData
      rootGroup.add(aliasNode)
    } else if (roleId === 'role:engineering:backend-engineer') {
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
    } else if (roleId === 'role:quality:browser-qa') {
      this.figureMap.set('char-browser-qa' as any, rootGroup)
      const aliasNode = new THREE.Object3D()
      aliasNode.name = 'character:char-browser-qa'
      aliasNode.userData = rootGroup.userData
      rootGroup.add(aliasNode)
    }

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
      ctrl.torsoGroup.position.y = 0.70
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
      if (!ctrl.isSeated) {
        ctrl.armsLeftGroup.rotation.x = 0.0
        ctrl.armsRightGroup.rotation.x = 0.0
      }
      ctrl.torsoGroup.position.y = ctrl.isSeated ? ctrl.baseTorsoY : 0.70
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
    ctrl.torsoGroup.position.y = 0.70 + Math.abs(Math.sin(walkPhase)) * 0.02
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
        headMesh.rotation.x = characterState === 'VERIFYING' ? 0.14 : characterState === 'FOCUSED' ? 0.10 : 0.0
        torsoGroup.rotation.x = characterState === 'FOCUSED' ? 0.07 : 0.0
        headMesh.rotation.y = 0.0
        if (ctrl.isSeated) {
          ctrl.armsLeftGroup.position.y = 0.0
          ctrl.armsRightGroup.position.y = 0.0
          ctrl.armsLeftGroup.rotation.x = characterState === 'FOCUSED' ? -0.36 : 0.18
          ctrl.armsRightGroup.rotation.x = characterState === 'FOCUSED' ? -0.34 : 0.18
        }
        continue
      }

      // Subtle natural breathing cycle (low amplitude: ±0.003m, ~1.5 rad/s)
      const breath = Math.sin(timeSeconds * 1.5 + phaseOffset)

      if (characterState === 'IDLE') {
        // Idle: relaxed ambient presence, arms resting in lap/chair, gentle head glance over 7s
        torsoGroup.position.y = baseTorsoY + breath * 0.003
        torsoGroup.rotation.x = -0.02
        headMesh.rotation.x = breath * 0.008
        headMesh.rotation.y = Math.sin(timeSeconds * 0.32 + phaseOffset) * 0.04
        if (ctrl.isSeated) {
          ctrl.armsLeftGroup.position.y = 0.0
          ctrl.armsRightGroup.position.y = 0.0
          ctrl.armsLeftGroup.rotation.x = 0.18
          ctrl.armsRightGroup.rotation.x = 0.18
        }
      } else if (characterState === 'FOCUSED') {
        // Working / Focused posture: tilted forward toward screen, hands active on keyboard & mouse
        torsoGroup.position.y = baseTorsoY + breath * 0.002
        torsoGroup.rotation.x = 0.12
        headMesh.rotation.x = 0.10 + breath * 0.006
        headMesh.rotation.y = 0.0

        // Active typing micro-motion only when authoritative state is WORKING / FOCUSED
        if (ctrl.isSeated) {
          ctrl.armsLeftGroup.rotation.x = -0.36
          ctrl.armsRightGroup.rotation.x = -0.34
          const typeMotion = Math.sin(timeSeconds * 12.0) * 0.008
          ctrl.armsLeftGroup.position.y = typeMotion
          ctrl.armsRightGroup.position.y = -typeMotion
        }
      } else if (characterState === 'VERIFYING') {
        // Verifying posture: precise examination posture directed at inspection device, arms resting
        torsoGroup.position.y = baseTorsoY + breath * 0.002
        torsoGroup.rotation.x = 0.02
        headMesh.rotation.x = 0.10 + breath * 0.008
        headMesh.rotation.y = 0.0
        if (ctrl.isSeated) {
          ctrl.armsLeftGroup.position.y = 0.0
          ctrl.armsRightGroup.position.y = 0.0
          ctrl.armsLeftGroup.rotation.x = 0.15
          ctrl.armsRightGroup.rotation.x = 0.15
        }
      } else if (characterState === 'WAITING') {
        // Waiting / Cleanup posture: upright relaxed posture, hands resting, no typing
        torsoGroup.position.y = baseTorsoY + breath * 0.003
        torsoGroup.rotation.x = -0.02
        headMesh.rotation.x = 0.0
        headMesh.rotation.y = 0.0
        if (ctrl.isSeated) {
          ctrl.armsLeftGroup.position.y = 0.0
          ctrl.armsRightGroup.position.y = 0.0
          ctrl.armsLeftGroup.rotation.x = 0.18
          ctrl.armsRightGroup.rotation.x = 0.18
        }
      } else if (characterState === 'SUCCESS') {
        torsoGroup.position.y = baseTorsoY + breath * 0.004
        torsoGroup.rotation.x = -0.04
        headMesh.rotation.x = -0.04
        headMesh.rotation.y = 0.0
        if (ctrl.isSeated) {
          ctrl.armsLeftGroup.position.y = 0.0
          ctrl.armsRightGroup.position.y = 0.0
          ctrl.armsLeftGroup.rotation.x = 0.18
          ctrl.armsRightGroup.rotation.x = 0.18
        }
      } else if (characterState === 'FAILURE' || characterState === 'ATTENTION') {
        // Attention / Preparing posture: attentive posture, hands resting off keyboard
        torsoGroup.position.y = baseTorsoY + breath * 0.005
        torsoGroup.rotation.x = 0.03
        headMesh.rotation.x = 0.03
        headMesh.rotation.y = 0.0
        if (ctrl.isSeated) {
          ctrl.armsLeftGroup.position.y = 0.0
          ctrl.armsRightGroup.position.y = 0.0
          ctrl.armsLeftGroup.rotation.x = 0.12
          ctrl.armsRightGroup.rotation.x = 0.12
        }
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
              : roleId === 'role:quality:browser-qa'
                ? 'Browser QA Lab'
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
    else if (id === 'char-browser-qa' || id === 'browser-qa') targetRoleId = 'role:quality:browser-qa'
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
    if (id === 'char-planner' || id === 'chief-planner' || id === 'planner') return this.figureMap.get('role:strategy:chief-planner')
    if (id === 'char-browser-qa' || id === 'browser-qa') return this.figureMap.get('role:quality:browser-qa')
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
