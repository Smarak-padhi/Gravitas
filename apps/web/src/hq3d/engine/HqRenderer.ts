/**
 * WebGL Renderer Manager for Gravitas 3D Headquarters
 * Configures tone mapping, soft shadow mapping, DPR capping (max 2.0),
 * context loss resilience, and live performance telemetry collection.
 */

import * as THREE from 'three'
import type { PerformanceStats } from '../types.js'

export class HqRenderer {
  public readonly renderer: THREE.WebGLRenderer
  private lastFrameTime = performance.now()
  private frameTimes: number[] = []
  private readonly maxFrameSamples = 30
  private currentFps = 60
  private currentFrameTimeMs = 16.6

  constructor(
    canvas: HTMLCanvasElement,
    private readonly onContextLost?: () => void
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    })

    // Cinematic architectural rendering pipeline
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    // Respect Performance Budget: cap pixel ratio at 2.0
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2.0)
    this.renderer.setPixelRatio(dpr)

    // Context loss handling
    canvas.addEventListener('webglcontextlost', this.handleContextLost, false)
  }

  private handleContextLost = (event: Event): void => {
    event.preventDefault()
    if (this.onContextLost) {
      this.onContextLost()
    }
  }

  public setSize(width: number, height: number): void {
    this.renderer.setSize(width, height, false)
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    const now = performance.now()
    const deltaMs = now - this.lastFrameTime
    this.lastFrameTime = now

    // Smooth telemetry averaging
    if (deltaMs > 0 && deltaMs < 200) {
      this.frameTimes.push(deltaMs)
      if (this.frameTimes.length > this.maxFrameSamples) {
        this.frameTimes.shift()
      }
      const avgMs = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      this.currentFrameTimeMs = Number(avgMs.toFixed(1))
      this.currentFps = Math.round(1000 / avgMs)
    }

    this.renderer.render(scene, camera)
  }

  public getPerformanceStats(): PerformanceStats {
    return {
      fps: this.currentFps,
      frameTimeMs: this.currentFrameTimeMs,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    }
  }

  public resetTelemetry(): void {
    this.frameTimes = []
    this.lastFrameTime = performance.now()
  }

  public getPixelRatio(): number {
    return this.renderer.getPixelRatio()
  }

  public dispose(): void {
    const canvas = this.renderer.domElement
    canvas.removeEventListener('webglcontextlost', this.handleContextLost)
    this.renderer.dispose()
  }
}
