/**
 * Static Prototype Geometric Scale Reference Figures for Gravitas 3D Headquarters
 * Strictly static composition references. Zero fake typing, zero wandering.
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../materials/materials.js'
import type { CharacterId } from '../types.js'

export class HqCharacters {
  public readonly group: THREE.Group
  private readonly geometriesToDispose: THREE.BufferGeometry[] = []

  constructor(materials: MaterialLibrary) {
    this.group = new THREE.Group()
    this.group.name = 'hq-characters'

    // 1. Codex Prototype (Seated at Workstation 01)
    this.buildFigure({
      id: 'char-codex',
      name: 'Codex (Static Prototype)',
      role: 'Engineering Specialist',
      position: [-7.0, 0.0, 0.5],
      rotationY: 0.0,
      accentMaterial: materials.charCodex,
      baseMaterial: materials.gunmetal,
      isSeated: true,
    })

    // 2. FCC Prototype (Seated at Workstation 02)
    this.buildFigure({
      id: 'char-fcc',
      name: 'Claude / FCC (Static Prototype)',
      role: 'Architectural Reasoning',
      position: [-1.0, 0.0, 0.5],
      rotationY: 0.0,
      accentMaterial: materials.charFcc,
      baseMaterial: materials.gunmetal,
      isSeated: true,
    })

    // 3. Independent Verifier Prototype (Standing at Cleanroom Bench)
    this.buildFigure({
      id: 'char-verifier',
      name: 'Independent Verifier (Static Prototype)',
      role: 'Deterministic Gate Authority',
      position: [6.0, 0.0, 5.8],
      rotationY: 0.0,
      accentMaterial: materials.charVerifier,
      baseMaterial: materials.gunmetal,
      isSeated: false,
    })
  }

  private track<T extends THREE.BufferGeometry>(geom: T): T {
    this.geometriesToDispose.push(geom)
    return geom
  }

  private buildFigure(opts: {
    readonly id: CharacterId
    readonly name: string
    readonly role: string
    readonly position: readonly [number, number, number]
    readonly rotationY: number
    readonly accentMaterial: THREE.Material
    readonly baseMaterial: THREE.Material
    readonly isSeated: boolean
  }): void {
    const charGroup = new THREE.Group()
    charGroup.position.set(...opts.position)
    charGroup.rotation.y = opts.rotationY
    charGroup.name = `character:${opts.id}`
    charGroup.userData = { type: 'character', id: opts.id, name: opts.name, role: opts.role }

    const yOffset = opts.isSeated ? 0.45 : 0.0

    // 1. Head (faceted miniature stylized head)
    const headGeo = this.track(new THREE.CylinderGeometry(0.12, 0.1, 0.22, 8))
    const head = new THREE.Mesh(headGeo, opts.accentMaterial)
    head.position.set(0.0, yOffset + 1.25, 0.0)
    head.castShadow = true
    charGroup.add(head)

    // Stylized glasses / brow line
    const browGeo = this.track(new THREE.BoxGeometry(0.18, 0.04, 0.06))
    const brow = new THREE.Mesh(browGeo, opts.baseMaterial)
    brow.position.set(0.0, yOffset + 1.25, 0.1)
    charGroup.add(brow)

    // 2. Torso (tapered tailored jacket silhouette)
    const torsoGeo = this.track(new THREE.BoxGeometry(0.38, 0.5, 0.24))
    const torso = new THREE.Mesh(torsoGeo, opts.accentMaterial)
    torso.position.set(0.0, yOffset + 0.85, 0.0)
    torso.castShadow = true
    charGroup.add(torso)

    // 3. Arms (relaxed resting posture)
    const armGeo = this.track(new THREE.BoxGeometry(0.09, 0.42, 0.1))
    // Left arm
    const leftArm = new THREE.Mesh(armGeo, opts.accentMaterial)
    leftArm.position.set(-0.24, yOffset + 0.82, opts.isSeated ? 0.1 : 0.0)
    if (opts.isSeated) leftArm.rotation.x = -0.4
    leftArm.castShadow = true
    charGroup.add(leftArm)

    // Right arm
    const rightArm = new THREE.Mesh(armGeo, opts.accentMaterial)
    rightArm.position.set(0.24, yOffset + 0.82, opts.isSeated ? 0.1 : 0.0)
    if (opts.isSeated) rightArm.rotation.x = -0.4
    rightArm.castShadow = true
    charGroup.add(rightArm)

    // 4. Legs
    if (opts.isSeated) {
      // Seated thighs
      const thighGeo = this.track(new THREE.BoxGeometry(0.14, 0.12, 0.42))
      const leftThigh = new THREE.Mesh(thighGeo, opts.baseMaterial)
      leftThigh.position.set(-0.1, 0.52, 0.18)
      charGroup.add(leftThigh)

      const rightThigh = new THREE.Mesh(thighGeo, opts.baseMaterial)
      rightThigh.position.set(0.1, 0.52, 0.18)
      charGroup.add(rightThigh)

      // Lower shins
      const shinGeo = this.track(new THREE.BoxGeometry(0.12, 0.45, 0.12))
      const leftShin = new THREE.Mesh(shinGeo, opts.baseMaterial)
      leftShin.position.set(-0.1, 0.225, 0.35)
      charGroup.add(leftShin)

      const rightShin = new THREE.Mesh(shinGeo, opts.baseMaterial)
      rightShin.position.set(0.1, 0.225, 0.35)
      charGroup.add(rightShin)
    } else {
      // Standing legs
      const legGeo = this.track(new THREE.BoxGeometry(0.14, 0.6, 0.14))
      const leftLeg = new THREE.Mesh(legGeo, opts.baseMaterial)
      leftLeg.position.set(-0.1, 0.3, 0.0)
      leftLeg.castShadow = true
      charGroup.add(leftLeg)

      const rightLeg = new THREE.Mesh(legGeo, opts.baseMaterial)
      rightLeg.position.set(0.1, 0.3, 0.0)
      rightLeg.castShadow = true
      charGroup.add(rightLeg)
    }

    this.group.add(charGroup)
  }

  public dispose(): void {
    for (const geom of this.geometriesToDispose) {
      geom.dispose()
    }
    this.geometriesToDispose.length = 0
  }
}
