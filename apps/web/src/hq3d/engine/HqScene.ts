/**
 * Scene Graph & Lighting Assembly for Gravitas 3D Headquarters
 * Assembles architectural structure, furniture, servers, scale figures, and 3-point architectural illumination.
 */

import * as THREE from 'three'
import { MaterialLibrary } from '../materials/materials.js'
import { HqArchitecture } from '../geometry/architecture.js'
import { HqFurniture } from '../geometry/furniture.js'
import { HqInfrastructure } from '../geometry/infrastructure.js'
import { HqCharacters } from '../geometry/characters.js'

export class HqScene {
  public readonly scene: THREE.Scene
  public readonly materials: MaterialLibrary
  public readonly architecture: HqArchitecture
  public readonly furniture: HqFurniture
  public readonly infrastructure: HqInfrastructure
  public readonly characters: HqCharacters

  // Lights
  private readonly keyLight: THREE.DirectionalLight
  private readonly ambientLight: THREE.HemisphereLight
  private readonly spotPlanning: THREE.SpotLight
  private readonly spotCleanroom: THREE.SpotLight
  private readonly spotApproval: THREE.SpotLight

  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0e1117)

    // Instantiate Material Library
    this.materials = new MaterialLibrary()

    // 1. Lighting Setup (VISUAL_DIRECTION.md)
    // Key Directional Light: Warm architectural sunlight creating crisp diagonal shadows
    this.keyLight = new THREE.DirectionalLight(0xfff6ea, 1.8)
    this.keyLight.position.set(-18.0, 26.0, -12.0)
    this.keyLight.castShadow = true
    this.keyLight.shadow.mapSize.width = 2048
    this.keyLight.shadow.mapSize.height = 2048
    this.keyLight.shadow.camera.near = 5.0
    this.keyLight.shadow.camera.far = 70.0
    this.keyLight.shadow.camera.left = -22.0
    this.keyLight.shadow.camera.right = 22.0
    this.keyLight.shadow.camera.top = 22.0
    this.keyLight.shadow.camera.bottom = -22.0
    this.keyLight.shadow.bias = -0.0004
    this.scene.add(this.keyLight)

    // Hemisphere Light: Natural skylight fill vs deep slate floor bounce
    this.ambientLight = new THREE.HemisphereLight(0x94b4cf, 0x1e2430, 0.75)
    this.scene.add(this.ambientLight)

    // Dedicated Architectural Spot 1: Planning Table (Zone A)
    this.spotPlanning = new THREE.SpotLight(0xffeedd, 2.2, 14.0, Math.PI / 4, 0.4, 1.2)
    this.spotPlanning.position.set(-4.0, 7.5, 7.0)
    this.spotPlanning.target.position.set(-4.0, 0.85, 7.0)
    this.scene.add(this.spotPlanning)
    this.scene.add(this.spotPlanning.target)

    // Dedicated Architectural Spot 2: Verification Cleanroom (Zone C)
    this.spotCleanroom = new THREE.SpotLight(0xccf0ff, 2.5, 14.0, Math.PI / 3.5, 0.3, 1.2)
    this.spotCleanroom.position.set(6.0, 7.5, 6.0)
    this.spotCleanroom.target.position.set(6.0, 1.0, 6.0)
    this.scene.add(this.spotCleanroom)
    this.scene.add(this.spotCleanroom.target)

    // Dedicated Architectural Spot 3: Approval Plinth Mezzanine (Zone F)
    this.spotApproval = new THREE.SpotLight(0xffd59e, 2.0, 12.0, Math.PI / 4, 0.4, 1.2)
    this.spotApproval.position.set(0.0, 8.5, 12.5)
    this.spotApproval.target.position.set(0.0, 3.2, 12.5)
    this.scene.add(this.spotApproval)
    this.scene.add(this.spotApproval.target)

    // 2. Build World Geometries
    this.architecture = new HqArchitecture(this.materials)
    this.scene.add(this.architecture.group)

    this.furniture = new HqFurniture(this.materials)
    this.scene.add(this.furniture.group)

    this.infrastructure = new HqInfrastructure(this.materials)
    this.scene.add(this.infrastructure.group)

    this.characters = new HqCharacters(this.materials)
    this.scene.add(this.characters.group)
  }

  public dispose(): void {
    this.architecture.dispose()
    this.furniture.dispose()
    this.infrastructure.dispose()
    this.characters.dispose()
    this.materials.dispose()

    this.scene.clear()
  }
}
