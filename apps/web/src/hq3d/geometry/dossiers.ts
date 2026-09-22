/**
 * Physical Task Dossier Geometry Manager for Gravitas 3D Headquarters (Wave 12C)
 * Represents active, queued, verifying, and terminal tasks as tangible architectural
 * artifacts placed strictly at their semantic physical locations in the scene.
 *
 * Physical Semantics:
 * - PLANNING_AREA: Mission Planning Table surface
 * - ASSIGNED_WORKSTATION: Assigned worker desk (Codex desk / FCC desk)
 * - VERIFICATION_BENCH: Independent Verifier Cleanroom console
 * - BROWSER_QA_MATRIX: Browser QA device testing matrix
 * - APPROVAL_PLINTH: Mezzanine human approval plinth
 * - FAILURE_HOLD: Quarantined failure podium (never rejected chute without human rejection)
 * - COMPLETED_TRAY: Repository vault delivery tray (never archived repo without proof)
 * - NEUTRAL_HOLD: Unassigned / neutral buffer
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../materials/materials.js'
import type { PhysicalLocation, WorldTaskState } from '../world/worldState.js'

export class HqTaskDossiers {
  public readonly group: THREE.Group
  private readonly materials: MaterialLibrary
  private readonly dossierMeshes = new Map<string, THREE.Group>()
  private readonly sharedGeometries: THREE.BufferGeometry[] = []

  // Pre-created geometries for zero-allocation reconciliation
  private readonly baseGeo: THREE.BoxGeometry
  private readonly trimGeo: THREE.BoxGeometry
  private readonly lensGeo: THREE.BoxGeometry

  constructor(materials: MaterialLibrary) {
    this.materials = materials
    this.group = new THREE.Group()
    this.group.name = 'hq-task-dossiers'

    this.baseGeo = new THREE.BoxGeometry(0.32, 0.03, 0.22)
    this.trimGeo = new THREE.BoxGeometry(0.34, 0.01, 0.24)
    this.lensGeo = new THREE.BoxGeometry(0.28, 0.015, 0.18)

    this.sharedGeometries.push(this.baseGeo, this.trimGeo, this.lensGeo)
  }

  /**
   * Reconciles physical 3D dossiers in-place against authoritative world tasks.
   */
  public reconcileTasks(tasks: Readonly<Record<string, WorldTaskState>>): void {
    const activeIds = new Set(Object.keys(tasks))

    // 1. Remove obsolete dossiers
    for (const [taskId, meshGroup] of this.dossierMeshes.entries()) {
      if (!activeIds.has(taskId)) {
        this.group.remove(meshGroup)
        this.dossierMeshes.delete(taskId)
      }
    }

    // 2. Group tasks by location to compute neat layout offsets
    const locationCounts = new Map<PhysicalLocation, number>()

    for (const task of Object.values(tasks)) {
      const loc = task.physicalLocation
      const index = locationCounts.get(loc) ?? 0
      locationCounts.set(loc, index + 1)

      let meshGroup = this.dossierMeshes.get(task.id)
      if (!meshGroup) {
        meshGroup = this.createDossierMesh(task)
        this.dossierMeshes.set(task.id, meshGroup)
        this.group.add(meshGroup)
      }

      this.updateDossierMesh(meshGroup, task, index)
    }
  }

  private createDossierMesh(task: WorldTaskState): THREE.Group {
    const group = new THREE.Group()
    group.name = `task:${task.id}`

    // Base body (dark walnut / graphite)
    const base = new THREE.Mesh(this.baseGeo, this.materials.walnut)
    base.position.set(0.0, 0.015, 0.0)
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)

    // Brushed brass beveled bezel
    const bezel = new THREE.Mesh(this.trimGeo, this.materials.brass)
    bezel.position.set(0.0, 0.005, 0.0)
    group.add(bezel)

    // Status display lens
    const lens = new THREE.Mesh(this.lensGeo, this.resolveTaskMaterial(task))
    lens.position.set(0.0, 0.035, 0.0)
    lens.name = 'dossier-lens'
    group.add(lens)

    return group
  }

  private updateDossierMesh(group: THREE.Group, task: WorldTaskState, slotIndex: number): void {
    group.userData = {
      type: 'task',
      id: task.id,
      name: task.title,
      room: this.resolveRoomName(task.physicalLocation),
      status: `${task.canonicalState}${task.runtimePhase ? ` (${task.runtimePhase})` : ''}`,
      description: `Task ${task.id} at ${task.physicalLocation}`,
    }

    // Resolve physical position
    const pos = this.resolvePosition(task, slotIndex)
    group.position.set(pos[0], pos[1], pos[2])

    // Update status lens material
    const lens = group.getObjectByName('dossier-lens') as THREE.Mesh | undefined
    if (lens) {
      lens.material = this.resolveTaskMaterial(task)
    }

    // Hide if in neutral hold or unassigned
    group.visible = task.physicalLocation !== 'NEUTRAL_HOLD'
  }

  private resolvePosition(task: WorldTaskState, slotIndex: number): [number, number, number] {
    const spacing = 0.38
    const offset = slotIndex * spacing

    switch (task.physicalLocation) {
      case 'PLANNING_AREA':
        return [-4.5 + offset, 0.88, 5.5]

      case 'ASSIGNED_WORKSTATION':
        if (task.assignedStationId === 'codex-workstation') {
          return [-6.5 + offset * 0.5, 0.76, 1.2]
        }
        if (task.assignedStationId === 'fcc-workstation') {
          return [-1.8 + offset * 0.5, 0.76, 1.2]
        }
        return [-4.2 + offset * 0.5, 0.76, 1.2]

      case 'VERIFICATION_BENCH':
        return [6.0 + offset * 0.4, 1.15, 6.2]

      case 'BROWSER_QA_MATRIX':
        return [6.2 + offset * 0.4, 0.88, -1.2]

      case 'APPROVAL_PLINTH':
        return [0.0 + offset * 0.35, 3.16, 8.5]

      case 'FAILURE_HOLD':
        return [-7.5 + offset * 0.4, 0.88, 5.5]

      case 'COMPLETED_TRAY':
        return [-6.5 + offset * 0.4, 1.05, -8.0]

      case 'NEUTRAL_HOLD':
      default:
        return [0.0, -10.0, 0.0]
    }
  }

  private resolveTaskMaterial(task: WorldTaskState): THREE.Material {
    if (task.runtimePhase === 'VERIFYING') {
      return this.materials.statusVerifying
    }
    if (task.runtimePhase === 'BROWSER_QA') {
      return this.materials.terminalScreen
    }
    if (task.runtimePhase === 'WORKER_RUNNING' || task.runtimePhase === 'PREPARING') {
      return this.materials.statusRunning
    }

    switch (task.canonicalState) {
      case 'READY':
        return this.materials.statusReady
      case 'RUNNING':
        return this.materials.statusRunning
      case 'WAITING_APPROVAL':
        return this.materials.statusWaiting
      case 'SUCCEEDED':
      case 'APPROVED':
        return this.materials.statusSuccess
      case 'FAILED':
        return this.materials.statusFailure
      default:
        return this.materials.gunmetal
    }
  }

  private resolveRoomName(location: PhysicalLocation): string {
    switch (location) {
      case 'PLANNING_AREA':
        return 'Mission Control'
      case 'ASSIGNED_WORKSTATION':
        return 'Agent Operations'
      case 'VERIFICATION_BENCH':
        return 'Verification Cleanroom'
      case 'BROWSER_QA_MATRIX':
        return 'Browser QA Lab'
      case 'APPROVAL_PLINTH':
        return 'Approval Control Mezzanine'
      case 'COMPLETED_TRAY':
        return 'Repository Vault'
      case 'FAILURE_HOLD':
        return 'Quarantine Hold'
      case 'NEUTRAL_HOLD':
      default:
        return 'Neutral Buffer'
    }
  }

  public dispose(): void {
    for (const geo of this.sharedGeometries) {
      geo.dispose()
    }
    this.sharedGeometries.length = 0
    this.dossierMeshes.clear()
    this.group.clear()
  }
}
