/**
 * Gravitas 3D Headquarters — Architectural Handoff Conduits & Custody Markers (Wave 12F)
 *
 * Implements restrained, truthful physical representations of task handoffs between stations:
 * - Low-profile floor conduits connecting source and destination stations.
 * - Semantic state treatments: BLOCKED (dim), READY (subtle highlight), IN_PROGRESS (soft pulse),
 *   SATISFIED (stable emerald), FAILED (muted red).
 * - Desktop artifact custody dossier markers at active stations.
 * - Integration Surface representation (infrastructure queue only, zero humanoid).
 * - Zero locomotion, zero pathfinding, zero particles, zero neon spaghetti.
 */

import * as THREE from 'three'
import type { WorldHandoffState } from '../world/worldState.js'
import type { StationId } from '../types.js'
import { STATION_DEFINITIONS } from '../world/stations.js'

// Floor elevation for architectural conduits
const CONDUIT_Y = 0.02
const DOSSIER_Y = 0.78 // Desk surface height

// Material cache for conduit states
const CONDUIT_MATERIALS: Record<string, THREE.MeshStandardMaterial> = {
  BLOCKED: new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.8,
    metalness: 0.2,
    transparent: true,
    opacity: 0.35,
  }),
  READY: new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.25,
    roughness: 0.5,
    metalness: 0.4,
    transparent: true,
    opacity: 0.65,
  }),
  IN_PROGRESS: new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    emissive: 0x2563eb,
    emissiveIntensity: 0.5,
    roughness: 0.4,
    metalness: 0.5,
    transparent: true,
    opacity: 0.85,
  }),
  SATISFIED: new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.35,
    roughness: 0.4,
    metalness: 0.4,
    transparent: true,
    opacity: 0.75,
  }),
  FAILED: new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.4,
    roughness: 0.5,
    metalness: 0.3,
    transparent: true,
    opacity: 0.8,
  }),
}

const DOSSIER_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  roughness: 0.7,
  metalness: 0.3,
})

const INTEGRATION_DESK_POSITION: readonly [number, number, number] = [0.0, 7.2, -1.5]

function getStationCoordinates(stationId?: StationId | null): readonly [number, number, number] {
  if (!stationId) {
    return INTEGRATION_DESK_POSITION
  }
  const def = STATION_DEFINITIONS[stationId]
  if (def) {
    return def.position
  }
  return INTEGRATION_DESK_POSITION
}

export class HandoffConduitManager {
  private readonly rootGroup: THREE.Group
  private readonly conduits = new Map<string, THREE.Mesh>()
  private readonly dossiers = new Map<string, THREE.Mesh>()
  private integrationSurfaceMesh?: THREE.Group | undefined

  public constructor() {
    this.rootGroup = new THREE.Group()
    this.rootGroup.name = 'handoff-conduits-root'
    this.buildIntegrationSurface()
  }

  public getGroup(): THREE.Group {
    return this.rootGroup
  }

  /**
   * Builds the logical Integration Desk / Queue surface (infrastructure only, zero humanoid).
   */
  private buildIntegrationSurface(): void {
    const group = new THREE.Group()
    group.name = 'integration-surface-queue'
    group.position.set(...INTEGRATION_DESK_POSITION)

    // Sleek architectural recessed floor junction plate (flush with floor, zero foreground clutter)
    const plateGeo = new THREE.BoxGeometry(0.7, 0.015, 0.35)
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.6,
      metalness: 0.4,
    })
    const plate = new THREE.Mesh(plateGeo, plateMat)
    plate.position.y = 0.025
    group.add(plate)

    // Champagne brass bezel trim
    const bezelGeo = new THREE.BoxGeometry(0.72, 0.006, 0.37)
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.8,
    })
    const bezel = new THREE.Mesh(bezelGeo, bezelMat)
    bezel.position.y = 0.03
    group.add(bezel)

    // Flush status LED indicator
    const ledGeo = new THREE.BoxGeometry(0.32, 0.004, 0.015)
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.35,
    })
    const led = new THREE.Mesh(ledGeo, ledMat)
    led.position.set(0, 0.033, 0.0)
    group.add(led)

    this.integrationSurfaceMesh = group
    this.rootGroup.add(group)
  }

  /**
   * Reconciles conduits and custody markers from the latest WorldHandoffState.
   */
  public updateHandoffs(handoffs: readonly WorldHandoffState[]): void {
    const activeIds = new Set<string>()

    for (const handoff of handoffs) {
      activeIds.add(handoff.id)

      const start = getStationCoordinates(handoff.sourceStationId)
      const end = getStationCoordinates(handoff.targetStationId)

      let mesh = this.conduits.get(handoff.id)
      if (!mesh) {
        mesh = this.createConduitMesh(start, end)
        this.conduits.set(handoff.id, mesh)
        this.rootGroup.add(mesh)
      } else {
        this.positionConduitMesh(mesh, start, end)
      }

      // Apply semantic material
      const mat = CONDUIT_MATERIALS[handoff.state] ?? CONDUIT_MATERIALS.BLOCKED
      mesh.material = mat

      // If handoff is SATISFIED or IN_PROGRESS, place custody dossier at station
      if (handoff.state === 'SATISFIED' || handoff.state === 'IN_PROGRESS') {
        let dossier = this.dossiers.get(handoff.id)
        if (!dossier) {
          dossier = this.createDossierMesh()
          this.dossiers.set(handoff.id, dossier)
          this.rootGroup.add(dossier)
        }
        dossier.position.set(start[0], start[1] + DOSSIER_Y, start[2])
        dossier.visible = true
      } else {
        const dossier = this.dossiers.get(handoff.id)
        if (dossier) {
          dossier.visible = false
        }
      }
    }

    // Remove obsolete conduits
    for (const [id, mesh] of this.conduits.entries()) {
      if (!activeIds.has(id)) {
        this.rootGroup.remove(mesh)
        mesh.geometry.dispose()
        this.conduits.delete(id)
      }
    }

    // Remove obsolete dossiers
    for (const [id, mesh] of this.dossiers.entries()) {
      if (!activeIds.has(id)) {
        this.rootGroup.remove(mesh)
        mesh.geometry.dispose()
        this.dossiers.delete(id)
      }
    }
  }

  private createConduitMesh(
    start: readonly [number, number, number],
    end: readonly [number, number, number]
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(0.06, 0.02, 1)
    const mesh = new THREE.Mesh(geo, CONDUIT_MATERIALS.BLOCKED)
    mesh.castShadow = false
    mesh.receiveShadow = true
    this.positionConduitMesh(mesh, start, end)
    return mesh
  }

  private positionConduitMesh(
    mesh: THREE.Mesh,
    start: readonly [number, number, number],
    end: readonly [number, number, number]
  ): void {
    const vStart = new THREE.Vector3(start[0], start[1] + CONDUIT_Y, start[2])
    const vEnd = new THREE.Vector3(end[0], end[1] + CONDUIT_Y, end[2])

    const midpoint = new THREE.Vector3().addVectors(vStart, vEnd).multiplyScalar(0.5)
    const distance = vStart.distanceTo(vEnd)

    mesh.position.copy(midpoint)
    mesh.scale.set(1, 1, Math.max(distance, 0.1))
    mesh.lookAt(vEnd)
  }

  private createDossierMesh(): THREE.Mesh {
    // Stylized, restrained engineering work dossier folder (0.28m x 0.03m x 0.22m)
    const geo = new THREE.BoxGeometry(0.28, 0.025, 0.22)
    const mesh = new THREE.Mesh(geo, DOSSIER_MATERIAL)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  public dispose(): void {
    for (const mesh of this.conduits.values()) {
      mesh.geometry.dispose()
    }
    this.conduits.clear()

    for (const mesh of this.dossiers.values()) {
      mesh.geometry.dispose()
    }
    this.dossiers.clear()

    if (this.integrationSurfaceMesh) {
      this.rootGroup.remove(this.integrationSurfaceMesh)
      this.integrationSurfaceMesh = undefined
    }
  }
}
