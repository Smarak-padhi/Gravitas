/**
 * Bounded Architectural Perspective Camera Rig for Gravitas 3D Headquarters
 * Provides restrained telephoto perspective (FOV 30°), bounded orbital limits,
 * framing presets, and smooth interpolation (instant on reduced-motion).
 */

import * as THREE from 'three'
import type { CameraFramingPreset } from '../types.js'
import { HQ_OVERVIEW_PRESET } from '../world/rooms.js'

export class HqCameraRig {
  public readonly camera: THREE.PerspectiveCamera

  // Current Target (LookAt) and Position
  private targetLookAt: THREE.Vector3
  private currentLookAt: THREE.Vector3
  private targetPosition: THREE.Vector3
  private currentPosition: THREE.Vector3

  // Orbit controls state
  private isDragging = false
  private previousMousePosition = { x: 0, y: 0 }

  // Spherical Coordinates for Orbit
  private spherical: THREE.Spherical
  private isInterpolating = false
  private interpolationFactor = 0.08

  // Safety Bounds (WORLD_LAYOUT.md & CAMERA_INTERACTION.md)
  public static readonly MIN_DISTANCE = 4.0
  public static readonly MAX_DISTANCE = 45.0
  public static readonly MIN_POLAR_ANGLE = THREE.MathUtils.degToRad(20) // ~20 deg from zenith (steep)
  public static readonly MAX_POLAR_ANGLE = THREE.MathUtils.degToRad(75) // ~75 deg (prevents floor clipping)
  public static readonly MIN_AZIMUTH_ANGLE = THREE.MathUtils.degToRad(15) // ~15 deg (East limit)
  public static readonly MAX_AZIMUTH_ANGLE = THREE.MathUtils.degToRad(85) // ~85 deg (West limit)

  constructor(aspect = 16 / 9) {
    // 30° Field of View creates an exquisite architectural miniature perspective
    this.camera = new THREE.PerspectiveCamera(30, aspect, 0.5, 150.0)

    this.targetLookAt = new THREE.Vector3(...HQ_OVERVIEW_PRESET.target)
    this.currentLookAt = this.targetLookAt.clone()
    this.targetPosition = new THREE.Vector3(...HQ_OVERVIEW_PRESET.position)
    this.currentPosition = this.targetPosition.clone()

    this.camera.position.copy(this.currentPosition)
    this.camera.lookAt(this.currentLookAt)

    const offset = new THREE.Vector3().subVectors(this.currentPosition, this.currentLookAt)
    this.spherical = new THREE.Spherical().setFromVector3(offset)
    this.clampSpherical()
  }

  private clampSpherical(): void {
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius,
      HqCameraRig.MIN_DISTANCE,
      HqCameraRig.MAX_DISTANCE
    )
    this.spherical.phi = THREE.MathUtils.clamp(
      this.spherical.phi,
      HqCameraRig.MIN_POLAR_ANGLE,
      HqCameraRig.MAX_POLAR_ANGLE
    )
  }

  public setAspect(aspect: number): void {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }

  /**
   * Smoothly interpolates or instantly snaps camera to framing preset.
   */
  public setFraming(preset: CameraFramingPreset, reducedMotion = false): void {
    this.targetLookAt.set(...preset.target)
    this.targetPosition.set(...preset.position)

    if (reducedMotion) {
      // Instant snap for accessibility
      this.currentLookAt.copy(this.targetLookAt)
      this.currentPosition.copy(this.targetPosition)
      this.camera.position.copy(this.currentPosition)
      this.camera.lookAt(this.currentLookAt)
      const offset = new THREE.Vector3().subVectors(this.currentPosition, this.currentLookAt)
      this.spherical.setFromVector3(offset)
      this.clampSpherical()
      this.isInterpolating = false
    } else {
      this.isInterpolating = true
    }
  }

  public resetToOverview(reducedMotion = false): void {
    this.setFraming(HQ_OVERVIEW_PRESET, reducedMotion)
  }

  /**
   * Handles interactive pointer drag orbit
   */
  public onPointerDown(x: number, y: number): void {
    this.isDragging = true
    this.isInterpolating = false
    this.previousMousePosition = { x, y }
  }

  public onPointerMove(x: number, y: number): void {
    if (!this.isDragging) return

    const deltaX = x - this.previousMousePosition.x
    const deltaY = y - this.previousMousePosition.y
    this.previousMousePosition = { x, y }

    // Rotate spherical azimuth and elevation
    this.spherical.theta -= deltaX * 0.005
    this.spherical.phi -= deltaY * 0.005
    this.clampSpherical()

    // Recompute current position from spherical coordinates around lookAt
    const offset = new THREE.Vector3().setFromSpherical(this.spherical)
    this.currentPosition.copy(this.currentLookAt).add(offset)
    this.targetPosition.copy(this.currentPosition)
    this.camera.position.copy(this.currentPosition)
    this.camera.lookAt(this.currentLookAt)
  }

  public onPointerUp(): void {
    this.isDragging = false
  }

  public onWheel(deltaY: number): void {
    this.isInterpolating = false
    const zoomFactor = 1.0 + deltaY * 0.001
    this.spherical.radius *= zoomFactor
    this.clampSpherical()

    const offset = new THREE.Vector3().setFromSpherical(this.spherical)
    this.currentPosition.copy(this.currentLookAt).add(offset)
    this.targetPosition.copy(this.currentPosition)
    this.camera.position.copy(this.currentPosition)
    this.camera.lookAt(this.currentLookAt)
  }

  /**
   * Per-frame update called by the render loop
   */
  public update(): void {
    if (this.isInterpolating) {
      this.currentLookAt.lerp(this.targetLookAt, this.interpolationFactor)
      this.currentPosition.lerp(this.targetPosition, this.interpolationFactor)

      this.camera.position.copy(this.currentPosition)
      this.camera.lookAt(this.currentLookAt)

      const distPos = this.currentPosition.distanceTo(this.targetPosition)
      const distTarget = this.currentLookAt.distanceTo(this.targetLookAt)

      if (distPos < 0.05 && distTarget < 0.05) {
        this.currentPosition.copy(this.targetPosition)
        this.currentLookAt.copy(this.targetLookAt)
        this.camera.position.copy(this.currentPosition)
        this.camera.lookAt(this.currentLookAt)
        const offset = new THREE.Vector3().subVectors(this.currentPosition, this.currentLookAt)
        this.spherical.setFromVector3(offset)
        this.clampSpherical()
        this.isInterpolating = false
      }
    }
  }
}
