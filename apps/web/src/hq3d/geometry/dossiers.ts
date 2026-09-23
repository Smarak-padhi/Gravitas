/**
 * Physical Task Dossier Geometry Manager for Gravitas 3D Headquarters (Wave 12C / 12H)
 * Represents active, queued, verifying, and terminal tasks as tangible architectural
 * artifacts placed strictly at their semantic physical locations in the scene.
 *
 * Wave 12H enhances this with PhysicalDossierMesh for authoritative artifact custody:
 * - Warm paper folio with brass corner clasp.
 * - Verified artifact seal (emerald/titanium disc).
 * - Review passed band vs changes required muted red tab.
 * - Graphite integration sleeve vs split red/amber conflict clasp.
 * - Gold approval tab for human approval pending.
 * - Closed completed dossier for approved archive.
 * - Mechanical seal pressing gesture acknowledging confirmed approval.
 */

import * as THREE from 'three'
import type { MaterialLibrary } from '../materials/materials.js'
import type { PhysicalLocation, WorldTaskState } from '../world/worldState.js'
import type { ArtifactInspectorMetadata } from '../types.js'

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

// ─────────────────────────────────────────────────────────────────────────────
// WAVE 12H — PhysicalDossierMesh for Authoritative Artifact Custody
// ─────────────────────────────────────────────────────────────────────────────

export interface DossierVisualOptions {
  readonly verificationState: 'UNVERIFIED' | 'VERIFYING' | 'VERIFIED' | 'FAILED'
  readonly reviewState: 'NOT_REQUIRED' | 'PENDING' | 'IN_REVIEW' | 'PASSED' | 'CHANGES_REQUIRED'
  readonly integrationState: 'NOT_READY' | 'READY' | 'PREPARING' | 'PREPARED' | 'CONFLICT' | 'INTEGRATED'
  readonly requiresHumanApproval: boolean
  readonly isApproved?: boolean
  readonly isRejected?: boolean
}

export class PhysicalDossierMesh {
  public readonly group: THREE.Group
  public readonly artifactId: string

  private readonly folioMesh: THREE.Mesh
  private readonly claspMesh: THREE.Mesh
  private readonly sealMesh: THREE.Mesh
  private readonly reviewTabMesh: THREE.Mesh
  private readonly integrationSleeveMesh: THREE.Mesh
  private readonly approvalTabMesh: THREE.Mesh

  // Clasp/seal gesture animation state
  private gestureProgress: number = 1.0 // 1.0 = resting
  private isGesturing: boolean = false

  public constructor(artifactId: string, _materials?: MaterialLibrary) {
    this.artifactId = artifactId
    this.group = new THREE.Group()
    this.group.name = `dossier-${artifactId}`

    // 1. Base Paper Folio (0.35m x 0.02m x 0.25m)
    const folioGeo = new THREE.BoxGeometry(0.35, 0.02, 0.25)
    const folioMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Clean architectural bond paper
      roughness: 0.85,
      metalness: 0.05,
    })
    this.folioMesh = new THREE.Mesh(folioGeo, folioMat)
    this.folioMesh.castShadow = true
    this.folioMesh.receiveShadow = true
    this.group.add(this.folioMesh)

    // Tag root userData for raycasting & inspector selection
    this.folioMesh.userData = {
      entityType: 'artifact',
      artifactId,
    }

    // 2. Brass Corner Clasp (top left)
    const claspGeo = new THREE.BoxGeometry(0.04, 0.024, 0.04)
    const claspMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Brass
      roughness: 0.35,
      metalness: 0.8,
    })
    this.claspMesh = new THREE.Mesh(claspGeo, claspMat)
    this.claspMesh.position.set(-0.16, 0.002, -0.11)
    this.group.add(this.claspMesh)

    // 3. Verification Seal (small disc on center right)
    const sealGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.006, 16)
    const sealMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald verification seal
      roughness: 0.4,
      metalness: 0.6,
    })
    this.sealMesh = new THREE.Mesh(sealGeo, sealMat)
    this.sealMesh.position.set(0.12, 0.012, 0.0)
    this.sealMesh.visible = false
    this.group.add(this.sealMesh)

    // 4. Review Tab (colored band on edge)
    const reviewGeo = new THREE.BoxGeometry(0.08, 0.022, 0.015)
    const reviewMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.5,
      metalness: 0.3,
    })
    this.reviewTabMesh = new THREE.Mesh(reviewGeo, reviewMat)
    this.reviewTabMesh.position.set(0.0, 0.0, 0.125)
    this.reviewTabMesh.visible = false
    this.group.add(this.reviewTabMesh)

    // 5. Integration Sleeve (dark graphite wrap around left half)
    const sleeveGeo = new THREE.BoxGeometry(0.18, 0.024, 0.254)
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark slate graphite
      roughness: 0.6,
      metalness: 0.4,
      transparent: true,
      opacity: 0.9,
    })
    this.integrationSleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat)
    this.integrationSleeveMesh.position.set(-0.08, 0.0, 0.0)
    this.integrationSleeveMesh.visible = false
    this.group.add(this.integrationSleeveMesh)

    // 6. Gold Human Approval Tab (top right tab)
    const approvalGeo = new THREE.BoxGeometry(0.06, 0.025, 0.03)
    const approvalMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Gold
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.85,
    })
    this.approvalTabMesh = new THREE.Mesh(approvalGeo, approvalMat)
    this.approvalTabMesh.position.set(0.14, 0.003, -0.11)
    this.approvalTabMesh.visible = false
    this.group.add(this.approvalTabMesh)
  }

  public updateVisualState(options: DossierVisualOptions): void {
    // 1. Verification seal
    if (options.verificationState === 'VERIFIED') {
      this.sealMesh.visible = true
      ;(this.sealMesh.material as THREE.MeshStandardMaterial).color.setHex(0x10b981) // Emerald
    } else if (options.verificationState === 'VERIFYING') {
      this.sealMesh.visible = true
      ;(this.sealMesh.material as THREE.MeshStandardMaterial).color.setHex(0x38bdf8) // Pulsing cyan
    } else if (options.verificationState === 'FAILED') {
      this.sealMesh.visible = true
      ;(this.sealMesh.material as THREE.MeshStandardMaterial).color.setHex(0xef4444) // Red
    } else {
      this.sealMesh.visible = false
    }

    // 2. Review Tab
    if (options.reviewState === 'PASSED') {
      this.reviewTabMesh.visible = true
      ;(this.reviewTabMesh.material as THREE.MeshStandardMaterial).color.setHex(0x10b981) // Green passed
    } else if (options.reviewState === 'CHANGES_REQUIRED') {
      this.reviewTabMesh.visible = true
      ;(this.reviewTabMesh.material as THREE.MeshStandardMaterial).color.setHex(0xef4444) // Muted red
    } else if (options.reviewState === 'IN_REVIEW') {
      this.reviewTabMesh.visible = true
      ;(this.reviewTabMesh.material as THREE.MeshStandardMaterial).color.setHex(0x38bdf8) // Review in progress
    } else {
      this.reviewTabMesh.visible = false
    }

    // 3. Integration Sleeve
    if (options.integrationState === 'PREPARED' || options.integrationState === 'INTEGRATED') {
      this.integrationSleeveMesh.visible = true
      ;(this.integrationSleeveMesh.material as THREE.MeshStandardMaterial).color.setHex(0x334155) // Sleek graphite
    } else if (options.integrationState === 'CONFLICT') {
      this.integrationSleeveMesh.visible = true
      ;(this.integrationSleeveMesh.material as THREE.MeshStandardMaterial).color.setHex(0xb91c1c) // Amber/red conflict
    } else {
      this.integrationSleeveMesh.visible = false
    }

    // 4. Approval Tab
    if (options.requiresHumanApproval && !options.isApproved && !options.isRejected) {
      this.approvalTabMesh.visible = true
    } else {
      this.approvalTabMesh.visible = false
    }

    // 5. Approved / Rejected styling
    if (options.isApproved) {
      ;(this.claspMesh.material as THREE.MeshStandardMaterial).color.setHex(0x10b981) // Sealed emerald clasp
    } else if (options.isRejected) {
      ;(this.claspMesh.material as THREE.MeshStandardMaterial).color.setHex(0xef4444) // Rejected red clasp
    }
  }

  /**
   * Triggers mechanical approval gesture (clasp presses down firmly onto folio).
   */
  public triggerApprovalGesture(): void {
    this.gestureProgress = 0.0
    this.isGesturing = true
  }

  public updateGesture(deltaSeconds: number, reducedMotion: boolean = false): void {
    if (!this.isGesturing) return

    if (reducedMotion) {
      this.gestureProgress = 1.0
      this.claspMesh.scale.set(1.0, 0.8, 1.0)
      this.isGesturing = false
      return
    }

    this.gestureProgress += deltaSeconds * 3.0 // ~330ms duration
    if (this.gestureProgress >= 1.0) {
      this.gestureProgress = 1.0
      this.isGesturing = false
      this.claspMesh.scale.set(1.0, 0.85, 1.0) // Finished pressed state
    } else {
      // Subtle downward compression & release
      const scaleY = 1.0 - Math.sin(this.gestureProgress * Math.PI) * 0.35
      this.claspMesh.scale.set(1.0, scaleY, 1.0)
    }
  }

  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z)
  }

  public setInspectorMetadata(
    metadata: ArtifactInspectorMetadata,
    room: string,
    status: string
  ): void {
    const data = {
      type: 'artifact',
      id: this.artifactId,
      artifactId: this.artifactId,
      name: `Work Product Dossier (${this.artifactId})`,
      room,
      status,
      description: `Authoritative work product dossier in physical custody at ${status}.`,
      artifactMetadata: metadata,
    }
    this.group.userData = data
    this.folioMesh.userData = data
  }

  public dispose(): void {
    this.folioMesh.geometry.dispose()
    ;(this.folioMesh.material as THREE.Material).dispose()

    this.claspMesh.geometry.dispose()
    ;(this.claspMesh.material as THREE.Material).dispose()

    this.sealMesh.geometry.dispose()
    ;(this.sealMesh.material as THREE.Material).dispose()

    this.reviewTabMesh.geometry.dispose()
    ;(this.reviewTabMesh.material as THREE.Material).dispose()

    this.integrationSleeveMesh.geometry.dispose()
    ;(this.integrationSleeveMesh.material as THREE.Material).dispose()

    this.approvalTabMesh.geometry.dispose()
    ;(this.approvalTabMesh.material as THREE.Material).dispose()
  }
}
