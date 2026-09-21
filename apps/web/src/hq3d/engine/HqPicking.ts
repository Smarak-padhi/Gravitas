/**
 * Raycasting and Interactive Entity Picking for Gravitas 3D Headquarters
 * Provides accurate raycasting for stations, static characters, and rooms,
 * rendering an architectural selection ring at the picked entity.
 */

import * as THREE from 'three'
import type { SelectedEntity } from '../types.js'
import { STATION_DEFINITIONS } from '../world/stations.js'
import { ROOM_DEFINITIONS } from '../world/rooms.js'
import type { MaterialLibrary } from '../materials/materials.js'

export class HqPicking {
  private readonly raycaster: THREE.Raycaster
  private readonly selectionRingMesh: THREE.Mesh
  private readonly ringGeometry: THREE.RingGeometry
  private selectedEntity: SelectedEntity | null = null

  constructor(materials: MaterialLibrary) {
    this.raycaster = new THREE.Raycaster()

    // Elegant architectural selection indicator ring
    this.ringGeometry = new THREE.RingGeometry(1.2, 1.32, 48)
    this.ringGeometry.rotateX(-Math.PI / 2) // Orient horizontally flat on XZ plane

    this.selectionRingMesh = new THREE.Mesh(this.ringGeometry, materials.selectionRing)
    this.selectionRingMesh.name = 'selection-ring-indicator'
    this.selectionRingMesh.visible = false
    this.selectionRingMesh.position.set(0, 0.05, 0)
  }

  public getSelectionMesh(): THREE.Mesh {
    return this.selectionRingMesh
  }

  public getSelectedEntity(): SelectedEntity | null {
    return this.selectedEntity
  }

  /**
   * Raycasts from normalized pointer coordinates (NDC: [-1, 1])
   */
  public pick(
    ndcX: number,
    ndcY: number,
    camera: THREE.Camera,
    scene: THREE.Scene
  ): SelectedEntity | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)

    // Raycast against all interactive objects
    const intersects = this.raycaster.intersectObjects(scene.children, true)

    for (const hit of intersects) {
      // Ignore the selection ring itself and helper objects
      if (hit.object === this.selectionRingMesh || hit.object.name === 'ground-floor-slab') {
        continue
      }

      // Climb hierarchy looking for an interactive entity marker
      let curr: THREE.Object3D | null = hit.object
      while (curr && curr !== scene) {
        const u = curr.userData
        if (u && (u.type === 'station' || u.type === 'character' || u.type === 'room')) {
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
        name: (u.name as string) || 'Scale Prototype Character',
        room: (u.room as string) || 'Agent Operations',
        role: (u.role as string) || 'Geometric Reference',
        status: 'Static Reference',
        description:
          'Authoritative static scale figure for architectural depth. Dynamic character locomotion begins in Wave 12C+.',
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
      this.selectionRingMesh.visible = false
      return
    }

    // Position selection ring around the entity
    const worldPos = new THREE.Vector3()
    targetObject.getWorldPosition(worldPos)
    this.selectionRingMesh.position.set(worldPos.x, worldPos.y + 0.04, worldPos.z)
    this.selectionRingMesh.visible = true
  }

  public clearSelection(): void {
    this.selectedEntity = null
    this.selectionRingMesh.visible = false
  }

  public dispose(): void {
    this.ringGeometry.dispose()
    this.selectedEntity = null
  }
}
