/**
 * Gravitas 3D Headquarters Scene Director
 * Coordinates HqScene, HqRenderer, HqCameraRig, and HqPicking.
 * Implements strict dual-condition render loop suspension (document.hidden + isViewActive),
 * pointer interaction, room framing shortcuts, and clean resource teardown.
 */

import type { RoomId, SelectedEntity, PerformanceStats } from '../types.js'
import { ROOM_DEFINITIONS, getRoomByKey } from '../world/rooms.js'
import { HqScene } from './HqScene.js'
import { HqRenderer } from './HqRenderer.js'
import { HqCameraRig } from './HqCamera.js'
import { HqPicking } from './HqPicking.js'

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

  private isViewActive = true
  private rafId: number | null = null
  private pointerDownCoord = { x: 0, y: 0 }
  private isPointerDown = false
  private reducedMotion = false

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
    const loop = (): void => {
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
  public frameRoom(roomId: RoomId): void {
    const room = ROOM_DEFINITIONS[roomId]
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
    this.cameraRig.resetToOverview(this.reducedMotion)
    this.picking.clearSelection()
    if (this.onEntitySelected) {
      this.onEntitySelected(null)
    }
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
