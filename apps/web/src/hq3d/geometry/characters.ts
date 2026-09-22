/**
 * Architectural Miniature Scale Figures for Gravitas 3D Headquarters
 * Stylized geometric mannequin silhouettes with articulated limbs, tailored
 * suiting palettes, and natural seated/standing postures.
 * Strictly static scale references. Zero fake activity or animations.
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../materials/materials.js'
import type { CharacterId } from '../types.js'

export class HqCharacters {
  public readonly group: THREE.Group
  public readonly figureMap = new Map<CharacterId, THREE.Group>()
  private readonly geometriesToDispose: THREE.BufferGeometry[] = []
  private readonly materials: MaterialLibrary

  constructor(materials: MaterialLibrary) {
    this.materials = materials
    this.group = new THREE.Group()
    this.group.name = 'hq-characters'

    // 1. Codex Prototype Figure (Seated at Workstation 01)
    this.buildMiniatureFigure({
      id: 'char-codex',
      name: 'Codex (Static Prototype)',
      role: 'Engineering Specialist',
      room: 'Agent Operations',
      position: [-6.5, 0.0, 1.85],
      rotationY: Math.PI, // Facing forward towards desk
      accentMaterial: materials.charCodex, // Muted slate-teal
      suitMaterial: materials.charSuitDark,
      skinMaterial: materials.charSkin,
      isSeated: true,
    })

    // 2. FCC Prototype Figure (Seated at Workstation 02)
    this.buildMiniatureFigure({
      id: 'char-fcc',
      name: 'Claude / FCC (Static Prototype)',
      role: 'Architectural Reasoning',
      room: 'Agent Operations',
      position: [-1.8, 0.0, 1.85],
      rotationY: Math.PI, // Facing forward towards desk
      accentMaterial: materials.charFcc, // Muted warm terracotta
      suitMaterial: materials.charSuitDark,
      skinMaterial: materials.charSkin,
      isSeated: true,
    })

    // 3. Independent Verifier Figure (Standing inside Cleanroom at Console)
    this.buildMiniatureFigure({
      id: 'char-verifier',
      name: 'Independent Verifier (Static Prototype)',
      role: 'Deterministic Gate Authority',
      room: 'Verification Cleanroom',
      position: [6.0, 0.1, 5.75],
      rotationY: 0.0, // Facing console
      accentMaterial: materials.charVerifier, // Muted sage / deep spruce
      suitMaterial: materials.charSuitDark,
      skinMaterial: materials.charSkin,
      isSeated: false,
    })
  }

  private track<T extends THREE.BufferGeometry>(geom: T): T {
    this.geometriesToDispose.push(geom)
    return geom
  }

  private buildMiniatureFigure(opts: {
    readonly id: CharacterId
    readonly name: string
    readonly role: string
    readonly room: string
    readonly position: readonly [number, number, number]
    readonly rotationY: number
    readonly accentMaterial: THREE.Material
    readonly suitMaterial: THREE.Material
    readonly skinMaterial: THREE.Material
    readonly isSeated: boolean
  }): void {
    const charGroup = new THREE.Group()
    charGroup.position.set(...opts.position)
    charGroup.rotation.y = opts.rotationY
    charGroup.name = `character:${opts.id}`
    charGroup.userData = {
      type: 'character',
      id: opts.id,
      name: opts.name,
      role: opts.role,
      room: opts.room,
    }

    const yBase = opts.isSeated ? 0.46 : 0.0

    // 1. Head (Sculpted miniature architectural mannequin head)
    const headGeo = this.track(new THREE.SphereGeometry(0.1, 16, 12))
    const head = new THREE.Mesh(headGeo, opts.skinMaterial)
    head.scale.set(0.9, 1.15, 0.95)
    head.position.set(0.0, yBase + 0.96, 0.0)
    head.castShadow = true
    charGroup.add(head)

    // Brushed brass architectural brow visor band
    const visorGeo = this.track(new THREE.BoxGeometry(0.15, 0.04, 0.08))
    const visor = new THREE.Mesh(visorGeo, this.materials.brass)
    visor.position.set(0.0, yBase + 0.98, 0.075)
    charGroup.add(visor)

    // Neck collar
    const neckGeo = this.track(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8))
    const neck = new THREE.Mesh(neckGeo, opts.accentMaterial)
    neck.position.set(0.0, yBase + 0.84, 0.0)
    charGroup.add(neck)

    // 2. Torso (Tailored jacket with accent lapel)
    const torsoGeo = this.track(new THREE.BoxGeometry(0.36, 0.42, 0.22))
    const torso = new THREE.Mesh(torsoGeo, opts.suitMaterial)
    torso.position.set(0.0, yBase + 0.62, 0.0)
    torso.castShadow = true
    charGroup.add(torso)

    // Chest accent tie / lapel strip
    const lapelGeo = this.track(new THREE.BoxGeometry(0.1, 0.32, 0.02))
    const lapel = new THREE.Mesh(lapelGeo, opts.accentMaterial)
    lapel.position.set(0.0, yBase + 0.64, 0.112)
    charGroup.add(lapel)

    // 3. Articulated Arms
    if (opts.isSeated) {
      // Seated posture: Upper arms vertical, forearms forward resting toward desk
      const upperArmGeo = this.track(new THREE.BoxGeometry(0.08, 0.26, 0.09))
      const armLeft = new THREE.Mesh(upperArmGeo, opts.suitMaterial)
      armLeft.position.set(-0.22, yBase + 0.62, 0.0)
      charGroup.add(armLeft)

      const armRight = new THREE.Mesh(upperArmGeo, opts.suitMaterial)
      armRight.position.set(0.22, yBase + 0.62, 0.0)
      charGroup.add(armRight)

      // Forearms extending forward
      const forearmGeo = this.track(new THREE.BoxGeometry(0.07, 0.07, 0.28))
      const forearmLeft = new THREE.Mesh(forearmGeo, opts.suitMaterial)
      forearmLeft.position.set(-0.2, yBase + 0.49, 0.14)
      charGroup.add(forearmLeft)

      const forearmRight = new THREE.Mesh(forearmGeo, opts.suitMaterial)
      forearmRight.position.set(0.2, yBase + 0.49, 0.14)
      charGroup.add(forearmRight)

      // Stylized hands near keyboard
      const handGeo = this.track(new THREE.BoxGeometry(0.06, 0.04, 0.08))
      const handLeft = new THREE.Mesh(handGeo, opts.skinMaterial)
      handLeft.position.set(-0.16, yBase + 0.49, 0.28)
      charGroup.add(handLeft)

      const handRight = new THREE.Mesh(handGeo, opts.skinMaterial)
      handRight.position.set(0.16, yBase + 0.49, 0.28)
      charGroup.add(handRight)

      // 4. Seated Legs
      // Horizontal thighs
      const thighGeo = this.track(new THREE.BoxGeometry(0.12, 0.11, 0.38))
      const thighLeft = new THREE.Mesh(thighGeo, opts.suitMaterial)
      thighLeft.position.set(-0.1, yBase + 0.36, 0.17)
      charGroup.add(thighLeft)

      const thighRight = new THREE.Mesh(thighGeo, opts.suitMaterial)
      thighRight.position.set(0.1, yBase + 0.36, 0.17)
      charGroup.add(thighRight)

      // Vertical lower legs down to floor
      const shinGeo = this.track(new THREE.BoxGeometry(0.1, 0.42, 0.1))
      const shinLeft = new THREE.Mesh(shinGeo, opts.suitMaterial)
      shinLeft.position.set(-0.1, 0.21, 0.34)
      charGroup.add(shinLeft)

      const shinRight = new THREE.Mesh(shinGeo, opts.suitMaterial)
      shinRight.position.set(0.1, 0.21, 0.34)
      charGroup.add(shinRight)

      // Shoes
      const shoeGeo = this.track(new THREE.BoxGeometry(0.11, 0.06, 0.18))
      const shoeLeft = new THREE.Mesh(shoeGeo, opts.suitMaterial)
      shoeLeft.position.set(-0.1, 0.03, 0.38)
      charGroup.add(shoeLeft)

      const shoeRight = new THREE.Mesh(shoeGeo, opts.suitMaterial)
      shoeRight.position.set(0.1, 0.03, 0.38)
      charGroup.add(shoeRight)
    } else {
      // Standing posture (Independent Verifier)
      const armGeo = this.track(new THREE.BoxGeometry(0.08, 0.46, 0.09))
      const armLeft = new THREE.Mesh(armGeo, opts.suitMaterial)
      armLeft.position.set(-0.22, yBase + 0.54, 0.04)
      charGroup.add(armLeft)

      const armRight = new THREE.Mesh(armGeo, opts.suitMaterial)
      armRight.position.set(0.22, yBase + 0.54, 0.04)
      charGroup.add(armRight)

      // Standing trouser legs
      const legGeo = this.track(new THREE.BoxGeometry(0.13, 0.62, 0.14))
      const legLeft = new THREE.Mesh(legGeo, opts.suitMaterial)
      legLeft.position.set(-0.1, yBase + 0.31, 0.0)
      legLeft.castShadow = true
      charGroup.add(legLeft)

      const legRight = new THREE.Mesh(legGeo, opts.suitMaterial)
      legRight.position.set(0.1, yBase + 0.31, 0.0)
      legRight.castShadow = true
      charGroup.add(legRight)

      // Shoes
      const shoeGeo = this.track(new THREE.BoxGeometry(0.14, 0.06, 0.2))
      const shoeLeft = new THREE.Mesh(shoeGeo, opts.suitMaterial)
      shoeLeft.position.set(-0.1, yBase + 0.03, 0.03)
      charGroup.add(shoeLeft)

      const shoeRight = new THREE.Mesh(shoeGeo, opts.suitMaterial)
      shoeRight.position.set(0.1, yBase + 0.03, 0.03)
      charGroup.add(shoeRight)
    }

    this.group.add(charGroup)
    this.figureMap.set(opts.id, charGroup)
  }

  public setCharacterVisibility(id: CharacterId, visible: boolean): void {
    const fig = this.figureMap.get(id)
    if (fig) {
      fig.visible = visible
    }
  }

  public dispose(): void {
    for (const geom of this.geometriesToDispose) {
      geom.dispose()
    }
    this.geometriesToDispose.length = 0
    this.figureMap.clear()
  }
}
