/**
 * Architectural Raycasting & Entity Picking for Gravitas 3D Headquarters
 * Features restrained architectural corner bracket indicators with subtle base
 * underlay illumination, replacing garish game-like circular rings.
 */

import * as THREE from 'three'
import type { SelectedEntity } from '../types.js'
import { STATION_DEFINITIONS } from '../world/stations.js'
import { ROOM_DEFINITIONS } from '../world/rooms.js'
import type { MaterialLibrary } from '../materials/materials.js'

export class HqPicking {
  private readonly raycaster: THREE.Raycaster
  private readonly indicatorGroup: THREE.Group
  private readonly geometriesToDispose: THREE.BufferGeometry[] = []
  private selectedEntity: SelectedEntity | null = null

  constructor(materials: MaterialLibrary) {
    this.raycaster = new THREE.Raycaster()
    this.indicatorGroup = new THREE.Group()
    this.indicatorGroup.name = 'architectural-selection-indicator'
    this.indicatorGroup.visible = false

    // Build architectural locator brackets: 4 corner ticks [   ]
    // Inner footprint: 2.6m x 1.8m
    const halfW = 1.3
    const halfD = 0.9
    const bracketLen = 0.35
    const bracketThick = 0.02

    const corners = [
      { x: -halfW, z: -halfD, dx: 1, dz: 1 },
      { x: halfW, z: -halfD, dx: -1, dz: 1 },
      { x: -halfW, z: halfD, dx: 1, dz: -1 },
      { x: halfW, z: halfD, dx: -1, dz: -1 },
    ]

    for (const c of corners) {
      // X-arm of corner bracket
      const xArmGeo = this.track(new THREE.BoxGeometry(bracketLen, 0.015, bracketThick))
      const xArm = new THREE.Mesh(xArmGeo, materials.selectionBracket)
      xArm.position.set(c.x + (c.dx * bracketLen) / 2, 0.02, c.z)
      this.indicatorGroup.add(xArm)

      // Z-arm of corner bracket
      const zArmGeo = this.track(new THREE.BoxGeometry(bracketThick, 0.015, bracketLen))
      const zArm = new THREE.Mesh(zArmGeo, materials.selectionBracket)
      zArm.position.set(c.x, 0.02, c.z + (c.dz * bracketLen) / 2)
      this.indicatorGroup.add(zArm)
    }

    // Subtle translucent cyan underlay plane
    const planeGeo = this.track(new THREE.PlaneGeometry(halfW * 2, halfD * 2))
    planeGeo.rotateX(-Math.PI / 2)
    const underlayMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    })
    const underlayMesh = new THREE.Mesh(planeGeo, underlayMat)
    underlayMesh.position.set(0.0, 0.015, 0.0)
    this.indicatorGroup.add(underlayMesh)
  }

  private track<T extends THREE.BufferGeometry>(geom: T): T {
    this.geometriesToDispose.push(geom)
    return geom
  }

  public getSelectionMesh(): THREE.Object3D {
    return this.indicatorGroup
  }

  public getSelectedEntity(): SelectedEntity | null {
    return this.selectedEntity
  }

  public pick(
    ndcX: number,
    ndcY: number,
    camera: THREE.Camera,
    scene: THREE.Scene
  ): SelectedEntity | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)

    const intersects = this.raycaster.intersectObjects(scene.children, true)

    for (const hit of intersects) {
      // Ignore helper indicator itself or floor slab
      if (
        hit.object === this.indicatorGroup ||
        hit.object.name === 'ground-floor-slab' ||
        hit.object.parent === this.indicatorGroup
      ) {
        continue
      }

      let curr: THREE.Object3D | null = hit.object
      while (curr && curr !== scene) {
        const u = curr.userData
        if (u && (u.type === 'station' || u.type === 'character' || u.type === 'room' || u.type === 'artifact')) {
          const entity = this.resolveEntity(u.type, u.id, curr)
          if (entity) {
            this.setSelection(entity, curr)
            return entity
          }
        }
        curr = curr.parent
      }
    }

    return null
  }

  private resolveEntity(
    type: string,
    id: string,
    object: THREE.Object3D
  ): SelectedEntity | null {
    if (type === 'artifact') {
      const u = object.userData
      return {
        id: id || (u.artifactId as string) || 'artifact',
        type: 'artifact',
        name: (u.name as string) || `Work Product Dossier (${id})`,
        room: (u.room as string) || 'HQ Workspace',
        status: (u.status as string) || 'CUSTODY_HELD',
        description:
          (u.description as string) ||
          'Authoritative work product dossier in physical headquarters custody.',
        artifactMetadata: u.artifactMetadata,
      }
    }
    if (type === 'station') {
      const stationDef = STATION_DEFINITIONS[id as keyof typeof STATION_DEFINITIONS]
      if (stationDef) {
        const room = ROOM_DEFINITIONS[stationDef.roomId]
        return {
          id: stationDef.id,
          type: 'station',
          name: stationDef.name,
          room: room ? room.name : stationDef.roomId,
          role: stationDef.role,
          status: stationDef.status,
          description: stationDef.description,
        }
      }
    }

    if (type === 'character') {
      const u = object.userData
      return {
        id: id || 'character',
        type: 'character',
        name: (u.name as string) || 'Role Character',
        room: (u.room as string) || 'Agent Operations',
        role: (u.role as string) || (u.name as string) || 'Reasoning Role',
        status: (u.status as string) || 'IDLE',
        description:
          (u.description as string) ||
          'Authoritative role-based scale figure anchored at home station. Wave 12D role foundation.',
        roleMetadata: u.roleMetadata,
      }
    }

    if (type === 'room') {
      const roomDef = ROOM_DEFINITIONS[id as keyof typeof ROOM_DEFINITIONS]
      if (roomDef) {
        return {
          id: roomDef.id,
          type: 'room',
          name: roomDef.name,
          room: roomDef.name,
          status: 'Zone Active',
          description: `Architectural zone with dedicated camera preset [Key ${roomDef.numberKey}].`,
        }
      }
    }

    return null
  }

  public setSelection(entity: SelectedEntity | null, targetObject?: THREE.Object3D): void {
    this.selectedEntity = entity
    if (!entity || !targetObject) {
      this.indicatorGroup.visible = false
      return
    }

    const worldPos = new THREE.Vector3()
    targetObject.getWorldPosition(worldPos)
    this.indicatorGroup.position.set(worldPos.x, worldPos.y + 0.02, worldPos.z)
    this.indicatorGroup.visible = true
  }

  public clearSelection(): void {
    this.selectedEntity = null
    this.indicatorGroup.visible = false
  }

  public dispose(): void {
    for (const geom of this.geometriesToDispose) {
      geom.dispose()
    }
    this.geometriesToDispose.length = 0
    this.selectedEntity = null
  }
}
