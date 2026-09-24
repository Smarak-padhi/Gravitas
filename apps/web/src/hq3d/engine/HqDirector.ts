/**
 * Gravitas 3D Headquarters Scene Director
 * Coordinates HqScene, HqRenderer, HqCameraRig, and HqPicking.
 * Implements strict dual-condition render loop suspension (document.hidden + isViewActive),
 * pointer interaction, room framing shortcuts, and clean resource teardown.
 */

import type { RoomId, StationId, SelectedEntity, PerformanceStats } from '../types.js'
import type { RoleId } from '../roles/types.js'
import type { WorldState } from '../world/worldState.js'
import {
  ROOM_DEFINITIONS,
  getRoomByKey,
  ELEVATOR_PRESET,
  WORKSTATION_PRESETS,
  CHARACTER_PRESETS,
} from '../world/rooms.js'
import { STATION_DEFINITIONS } from '../world/stations.js'
import { HqScene, type AtmosphereMode } from './HqScene.js'
import { HqRenderer } from './HqRenderer.js'
import { HqCameraRig } from './HqCamera.js'
import { HqPicking } from './HqPicking.js'

export interface ElevatorTransition {
  readonly targetRoomId: RoomId
  readonly startTime: number
  readonly duration: number
  readonly startHeight: number
  readonly targetHeight: number
  readonly onComplete?: (() => void) | undefined
}

export interface HqDirectorOptions {
  canvas: HTMLCanvasElement
  onEntitySelected?: (entity: SelectedEntity | null) => void
  onContextLost?: () => void
  reducedMotion?: boolean
}

export class HqDirector {
  public readonly scene: HqScene
  public readonly renderer: HqRenderer
  public readonly cameraRig: HqCameraRig
  public readonly picking: HqPicking

  private currentWorldState: WorldState | null = null
  private isViewActive = true
  private rafId: number | null = null
  private pointerDownCoord = { x: 0, y: 0 }
  private isPointerDown = false
  private reducedMotion = false
  private elevatorTransition: ElevatorTransition | null = null
  private onElevatorChange?: ((active: boolean) => void) | undefined

  private readonly canvas: HTMLCanvasElement
  private readonly onEntitySelected?: (entity: SelectedEntity | null) => void

  constructor(options: HqDirectorOptions) {
    this.canvas = options.canvas
    this.onEntitySelected = options.onEntitySelected
    this.reducedMotion = options.reducedMotion ?? false

    // 1. Initialize Subsystems
    this.scene = new HqScene()
    this.renderer = new HqRenderer(options.canvas, options.onContextLost)
    this.cameraRig = new HqCameraRig(
      options.canvas.clientWidth / (options.canvas.clientHeight || 1)
    )
    this.picking = new HqPicking(this.scene.materials)

    // Add selection indicator ring into scene
    this.scene.scene.add(this.picking.getSelectionMesh())

    // 2. Attach Event Listeners
    this.bindEvents()

    // 3. Start Render Loop if eligible
    this.evaluateRenderLoopState()
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced
  }

  public setViewActive(active: boolean): void {
    if (this.isViewActive !== active) {
      this.isViewActive = active
      this.evaluateRenderLoopState()
    }
  }

  /**
   * Authoritative World State Update (Wave 12C)
   *
   * Skips scene reconciliation ONLY when the complete reconciliation identity matches:
   * 1. projectionEpoch
   * 2. projectionRevision
   * 3. canonicalTaskFingerprint
   *
   * Returns true if reconciliation executed, false if skipped as identical.
   */
  public updateWorldState(next: WorldState): boolean {
    if (this.currentWorldState) {
      const prev = this.currentWorldState.revisionIdentity
      const nextRev = next.revisionIdentity
      const same =
        prev.projectionEpoch === nextRev.projectionEpoch &&
        prev.projectionRevision === nextRev.projectionRevision &&
        prev.canonicalTaskFingerprint === nextRev.canonicalTaskFingerprint

      if (same) {
        return false // Skip reconciliation: exact authoritative identity match
      }
    }

    this.currentWorldState = next
    this.scene.reconcileWorld(next, this.reducedMotion)
    return true
  }

  public getCurrentWorldState(): WorldState | null {
    return this.currentWorldState
  }

  private evaluateRenderLoopState(): void {
    const shouldRun =
      this.isViewActive && (typeof document === 'undefined' || !document.hidden)

    if (shouldRun && this.rafId === null) {
      this.startLoop()
    } else if (!shouldRun && this.rafId !== null) {
      this.stopLoop()
    }
  }

  private startLoop(): void {
    const loop = (timestamp: number): void => {
      const timeSeconds = timestamp * 0.001

      // Advance spatial elevator transition if active
      if (this.elevatorTransition) {
        const now = performance.now()
        const elapsed = now - this.elevatorTransition.startTime
        const t = Math.min(1.0, Math.max(0.0, elapsed / this.elevatorTransition.duration))

        if (t < 0.2) {
          const doorProgress = 1.0 - t / 0.2
          this.scene.architecture.setElevatorDoorOpen(doorProgress)
        } else if (t < 0.75) {
          this.scene.architecture.setElevatorDoorOpen(0.0)
          const moveT = (t - 0.2) / 0.55
          const smoothT = moveT * moveT * (3 - 2 * moveT)
          const currentY =
            this.elevatorTransition.startHeight +
            (this.elevatorTransition.targetHeight - this.elevatorTransition.startHeight) * smoothT
          this.scene.architecture.setElevatorHeight(currentY)
        } else if (t < 0.9) {
          this.scene.architecture.setElevatorHeight(this.elevatorTransition.targetHeight)
          const doorProgress = (t - 0.75) / 0.15
          this.scene.architecture.setElevatorDoorOpen(doorProgress)
        } else {
          this.scene.architecture.setElevatorDoorOpen(1.0)
          this.scene.architecture.setElevatorHeight(this.elevatorTransition.targetHeight)
          const trans = this.elevatorTransition
          this.elevatorTransition = null
          if (this.onElevatorChange) this.onElevatorChange(false)
          this.frameRoom(trans.targetRoomId)
          if (trans.onComplete) trans.onComplete()
        }
      }

      this.scene.update(timeSeconds, this.reducedMotion)
      this.cameraRig.update()
      this.renderer.render(this.scene.scene, this.cameraRig.camera)
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    this.canvas.addEventListener('pointermove', this.onPointerMove)
    this.canvas.addEventListener('pointerup', this.onPointerUp)
    this.canvas.addEventListener('wheel', this.onWheel, { passive: true })

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange)
    }
  }

  private unbindEvents(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('wheel', this.onWheel)

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange)
    }
  }

  private onVisibilityChange = (): void => {
    this.evaluateRenderLoopState()
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.isPointerDown = true
    this.pointerDownCoord = { x: e.clientX, y: e.clientY }
    this.cameraRig.onPointerDown(e.clientX, e.clientY)
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (this.isPointerDown) {
      this.cameraRig.onPointerMove(e.clientX, e.clientY)
    }
  }

  private onPointerUp = (e: PointerEvent): void => {
    this.isPointerDown = false
    this.cameraRig.onPointerUp()

    // Determine if this was a click rather than a drag
    const dx = Math.abs(e.clientX - this.pointerDownCoord.x)
    const dy = Math.abs(e.clientY - this.pointerDownCoord.y)
    if (dx < 6 && dy < 6) {
      this.handleClick(e)
    }
  }

  private onWheel = (e: WheelEvent): void => {
    this.cameraRig.onWheel(e.deltaY)
  }

  private handleClick(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    const picked = this.picking.pick(x, y, this.cameraRig.camera, this.scene.scene)
    if (this.onEntitySelected) {
      this.onEntitySelected(picked)
    }
  }

  public handleResize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return
    this.cameraRig.setAspect(width / height)
    this.renderer.setSize(width, height)
  }

  /**
   * Framed camera navigation by Room ID
   */
  public frameRoom(roomId: string): void {
    const normalized =
      roomId === 'VERIFICATION_CLEANROOM'
        ? ('VERIFICATION_LAB' as RoomId)
        : roomId === 'INFRASTRUCTURE_SERVERS'
          ? ('INFRASTRUCTURE_ROOM' as RoomId)
          : (roomId as RoomId)
    const room = ROOM_DEFINITIONS[normalized]
    if (room) {
      this.cameraRig.setFraming(room.cameraPreset, this.reducedMotion)
      if (this.onEntitySelected) {
        this.onEntitySelected({
          id: room.id,
          type: 'room',
          name: room.name,
          room: room.name,
          status: 'Active Zone',
          description: `Architectural zone with camera preset [Key ${room.numberKey}].`,
        })
      }
    }
  }

  /**
   * Framed camera navigation by shortcut key ('1'–'6')
   */
  public frameRoomByKey(key: string): boolean {
    const room = getRoomByKey(key)
    if (room) {
      this.frameRoom(room.id)
      return true
    }
    return false
  }

  /**
   * Reset camera to full overview
   */
  public resetToOverview(): void {
    if (this.elevatorTransition) {
      this.skipElevator()
    }
    this.cameraRig.resetToOverview(this.reducedMotion)
    this.picking.clearSelection()
    if (this.onEntitySelected) {
      this.onEntitySelected(null)
    }
  }

  public isElevatorActive(): boolean {
    return this.elevatorTransition !== null
  }

  public setOnElevatorChange(cb?: ((active: boolean) => void) | undefined): void {
    this.onElevatorChange = cb
  }

  /**
   * Spatial Elevator Navigation
   * Approaching elevator -> doors close -> bounded vertical transit -> selected floor -> doors open -> room framing.
   */
  public navigateToFloorWithElevator(roomId: RoomId, onComplete?: () => void): void {
    const targetHeight = roomId === 'APPROVAL_MEZZANINE' ? 2.95 : 0.0
    const startHeight = this.scene.architecture.getElevatorHeight()

    if (this.reducedMotion) {
      // Instantaneous cut for accessibility
      this.scene.architecture.setElevatorHeight(targetHeight)
      this.scene.architecture.setElevatorDoorOpen(1.0)
      this.frameRoom(roomId)
      if (onComplete) onComplete()
      return
    }

    this.cameraRig.setFraming(ELEVATOR_PRESET, false)
    this.elevatorTransition = {
      targetRoomId: roomId,
      startTime: performance.now(),
      duration: 1300,
      startHeight,
      targetHeight,
      onComplete,
    }
    if (this.onElevatorChange) this.onElevatorChange(true)
  }

  /**
   * Immediately skips elevator transition and settles in target room.
   */
  public skipElevator(): void {
    if (!this.elevatorTransition) return
    const trans = this.elevatorTransition
    this.elevatorTransition = null
    this.scene.architecture.setElevatorHeight(trans.targetHeight)
    this.scene.architecture.setElevatorDoorOpen(1.0)
    if (this.onElevatorChange) this.onElevatorChange(false)
    this.frameRoom(trans.targetRoomId)
    if (trans.onComplete) trans.onComplete()
  }

  /**
   * Day / Evening / Night Atmosphere Lighting Controls
   */
  public setAtmosphere(mode: AtmosphereMode): void {
    this.scene.setAtmosphere(mode)
  }

  public getAtmosphere(): AtmosphereMode {
    return this.scene.getAtmosphere()
  }

  public frameWorkstation(key: string): void {
    const upper = key.toUpperCase()
    const lookupKey = upper.startsWith('WS_') ? upper : `WS_${upper}`
    const preset = WORKSTATION_PRESETS[lookupKey] || WORKSTATION_PRESETS[key]
    if (preset) {
      this.cameraRig.setFraming(preset, this.reducedMotion)
    }
  }

  public frameCharacter(key: string): void {
    const upper = key.toUpperCase()
    const lookupKey = upper.startsWith('CHAR_') ? upper : `CHAR_${upper}`
    const preset =
      CHARACTER_PRESETS[lookupKey] ||
      CHARACTER_PRESETS[key] ||
      WORKSTATION_PRESETS[`WS_${upper}`]
    if (preset) {
      this.cameraRig.setFraming(preset, this.reducedMotion)
    }
  }

  /**
   * Accessible Role Selection (Wave 12D)
   * Selects character figure, activating corner brackets and inspector metadata.
   */
  public selectRole(roleId: RoleId): SelectedEntity | null {
    const fig = this.scene.characters.getFigure(roleId)
    if (!fig) return null

    const u = fig.userData
    const entity: SelectedEntity = {
      id: roleId,
      type: 'character',
      name: (u.name as string) || 'Role Character',
      room: (u.room as string) || 'Agent Operations',
      role: (u.role as string) || (u.name as string) || 'Reasoning Role',
      status: (u.status as string) || 'IDLE',
      description: (u.description as string) || '',
      roleMetadata: u.roleMetadata,
    }

    this.picking.setSelection(entity, fig)
    if (this.onEntitySelected) {
      this.onEntitySelected(entity)
    }
    return entity
  }

  /**
   * Accessible Station Selection
   */
  public selectStation(stationId: StationId): SelectedEntity | null {
    const stationObj =
      this.scene.infrastructure.group.getObjectByName(`station:${stationId}`) ||
      this.scene.furniture.group.getObjectByName(`station:${stationId}`)
    const stationDef = STATION_DEFINITIONS[stationId]
    if (!stationDef) return null
    const room = ROOM_DEFINITIONS[stationDef.roomId]
    const entity: SelectedEntity = {
      id: stationDef.id,
      type: 'station',
      name: stationDef.name,
      room: room ? room.name : stationDef.roomId,
      role: stationDef.role,
      status: stationDef.status,
      description: stationDef.description,
    }
    if (stationObj) {
      this.picking.setSelection(entity, stationObj)
    }
    if (this.onEntitySelected) {
      this.onEntitySelected(entity)
    }
    return entity
  }

  public getPerformanceStats(): PerformanceStats {
    return this.renderer.getPerformanceStats()
  }

  public dispose(): void {
    this.stopLoop()
    this.unbindEvents()
    this.picking.dispose()
    this.scene.dispose()
    this.renderer.dispose()
  }
}
