/**
 * GRAVITAS D3 — Three.js Render Adapter
 *
 * Owns (and ONLY owns): scene, camera, lighting, geometry, materials, raycasting/picking,
 * spatial animation, GPU resource lifecycle.
 *
 * Does NOT own: approval truth, WorkSession/Task state, CapabilityGrants, verification outcome,
 * human decisions, K1 readiness, canonical event log. It consumes an immutable SpatialProjection
 * and returns spatialEntityIds from picking. It has no callback that can issue an operator intent.
 *
 * The WebGL backend is injected, so the scene graph, picking, animation scheduling, disposal and
 * single-loop guarantees are testable in Node without a GPU.
 */

import * as THREE from 'three'
import { VISUAL_GRAMMAR } from './spatial.js'
import type { AnimationClass, Glyph, RoleSilhouette, SpatialEntity, SpatialProjection, VisualState } from './spatial.js'
import { resolveRoleArchetype } from './roleRegistry.js'

export interface WorldRendererBackend {
  readonly domElement: unknown
  setSize(width: number, height: number, updateStyle?: boolean): void
  setPixelRatio(ratio: number): void
  render(scene: THREE.Scene, camera: THREE.Camera): void
  dispose(): void
  readonly info: { render: { calls: number; triangles: number }; memory: { geometries: number; textures: number } }
  getContextInfo?(): { renderer: string; vendor: string }
}

export type BackendFactory = (canvas: unknown) => WorldRendererBackend

export interface FrameScheduler {
  request(cb: (timeMs: number) => void): number
  cancel(handle: number): void
}

export interface WorldRendererOptions {
  readonly canvas: unknown
  readonly backendFactory: BackendFactory
  readonly scheduler: FrameScheduler
  readonly reducedMotion: boolean
  /** 'REDUCED_3D' lowers pixel ratio to 1 and disables ambient motion. Explicit operator choice only. */
  readonly quality?: 'FULL_3D' | 'REDUCED_3D'
  readonly devicePixelRatio?: number
}

/** Module-level instrumentation: proves "single render loop" across mount/unmount cycles. */
export const loopInstrumentation = {
  renderersCreated: 0,
  renderersDisposed: 0,
  pendingFrameHandles: 0,
  maxSimultaneousPendingFrames: 0,
  totalFramesRendered: 0,
  get activeRenderers(): number {
    return this.renderersCreated - this.renderersDisposed
  },
  reset(): void {
    this.renderersCreated = 0
    this.renderersDisposed = 0
    this.pendingFrameHandles = 0
    this.maxSimultaneousPendingFrames = 0
    this.totalFramesRendered = 0
  },
}

type GeometryKey = Glyph | RoleSilhouette | 'PLATE' | 'AMBIENT_RING'

function makeGeometry(key: GeometryKey): THREE.BufferGeometry {
  switch (key) {
    case 'CYLINDER_HEAD': {
      // Tier 1 Reasoning Silhouette: Cylinder torso + Spherical head
      const torso = new THREE.CylinderGeometry(0.4, 0.45, 0.8, 12)
      const head = new THREE.SphereGeometry(0.3, 10, 8)
      head.translate(0, 0.65, 0)
      const merged = mergeTwo(torso, head)
      torso.dispose()
      head.dispose()
      return merged
    }
    case 'HELMET_OCTA': {
      // Octahedral helmet shape
      return new THREE.OctahedronGeometry(0.65, 1)
    }
    case 'CONE_PRISM': {
      // Specialist operator silhouette
      return new THREE.ConeGeometry(0.55, 1.2, 5)
    }
    case 'TORUS_DEVICE': {
      // Specialist ring/device silhouette
      return new THREE.TorusGeometry(0.5, 0.18, 8, 16)
    }
    case 'BOX_UNIT': {
      // Tier 3 Mechanical Unit silhouette: Chamfered industrial unit
      const body = new THREE.BoxGeometry(0.85, 0.7, 0.85)
      const antenna = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6)
      antenna.translate(0, 0.55, 0)
      const merged = mergeTwo(body, antenna)
      body.dispose()
      antenna.dispose()
      return merged
    }
    case 'DISC':
      return new THREE.CylinderGeometry(0.7, 0.7, 0.15, 16)
    case 'CUBE':
    case 'CUBE_WIRE':
      return new THREE.BoxGeometry(1, 1, 1)
    case 'RING':
      return new THREE.TorusGeometry(0.55, 0.16, 8, 20)
    case 'HEX':
      return new THREE.CylinderGeometry(0.65, 0.65, 0.8, 6)
    case 'SPHERE':
      return new THREE.SphereGeometry(0.6, 12, 10)
    case 'DIAMOND':
    case 'DIAMOND_WIRE':
    case 'GHOST':
      return new THREE.OctahedronGeometry(0.7)
    case 'PYRAMID':
      return new THREE.ConeGeometry(0.7, 1.1, 4)
    case 'SPIKE':
      return new THREE.ConeGeometry(0.45, 1.4, 6)
    case 'KNOT':
      return new THREE.TorusKnotGeometry(0.45, 0.14, 48, 8)
    case 'CROSS': {
      const a = new THREE.BoxGeometry(1.1, 0.3, 0.3)
      const b = new THREE.BoxGeometry(0.3, 1.1, 0.3)
      const merged = mergeTwo(a, b)
      a.dispose()
      b.dispose()
      return merged
    }
    case 'SLAB':
      return new THREE.BoxGeometry(1.2, 0.2, 0.9)
    case 'PLATE':
      return new THREE.BoxGeometry(10, 0.05, 10)
    case 'AMBIENT_RING':
      return new THREE.TorusGeometry(2, 0.03, 6, 48)
  }
}

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const pa = a.getAttribute('position') as THREE.BufferAttribute
  const pb = b.getAttribute('position') as THREE.BufferAttribute
  const na = a.getAttribute('normal') as THREE.BufferAttribute
  const nb = b.getAttribute('normal') as THREE.BufferAttribute
  const ia = a.getIndex()!
  const ib = b.getIndex()!
  const pos = new Float32Array(pa.array.length + pb.array.length)
  pos.set(pa.array as Float32Array, 0)
  pos.set(pb.array as Float32Array, pa.array.length)
  const nor = new Float32Array(na.array.length + nb.array.length)
  nor.set(na.array as Float32Array, 0)
  nor.set(nb.array as Float32Array, na.array.length)
  const idx: number[] = []
  for (let i = 0; i < ia.count; i++) idx.push(ia.getX(i))
  for (let i = 0; i < ib.count; i++) idx.push(ib.getX(i) + pa.count)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  g.setIndex(idx)
  return g
}

const WIREFRAME_GLYPHS: ReadonlySet<Glyph> = new Set<Glyph>(['CUBE_WIRE', 'DIAMOND_WIRE', 'GHOST'])

export interface WorldStats {
  readonly mounted: boolean
  readonly entityMeshes: number
  readonly objectCount: number
  readonly decorativeMeshes: number
  readonly drawCalls: number
  readonly triangles: number
  readonly geometries: number
  readonly textures: number
  readonly cachedGeometries: number
  readonly cachedMaterials: number
  readonly framesRendered: number
  readonly pendingFrame: boolean
  readonly animatingEntities: number
  readonly reducedMotion: boolean
  readonly quality: 'FULL_3D' | 'REDUCED_3D'
}

interface Orbit {
  azimuth: number
  polar: number
  distance: number
  target: THREE.Vector3
}

const DEFAULT_ORBIT: Readonly<{ azimuth: number; polar: number; distance: number }> = { azimuth: 0, polar: 0.95, distance: 34 }
const MIN_DISTANCE = 6
const MAX_DISTANCE = 80

export class WorldRenderer {
  private readonly opts: WorldRendererOptions
  private backend: WorldRendererBackend | null = null
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400)
  private readonly raycaster = new THREE.Raycaster()
  private readonly geometries = new Map<GeometryKey, THREE.BufferGeometry>()
  private readonly materials = new Map<string, THREE.Material>()
  private readonly entityMeshes = new Map<string, THREE.Mesh>()
  private readonly decoMeshes = new Map<string, THREE.Mesh>()
  private readonly meshState = new Map<string, { visualState: VisualState; animation: AnimationClass; sourceRevision: number }>()
  private readonly transitionStart = new Map<string, number>()
  private projection: SpatialProjection | null = null
  private frameHandle: number | null = null
  private lastFrameTime = 0
  private framesRendered = 0
  private dirty = true
  private disposed = false
  private reducedMotion: boolean
  private quality: 'FULL_3D' | 'REDUCED_3D'
  private orbit: Orbit = { ...DEFAULT_ORBIT, target: new THREE.Vector3(0, 0, 2) }
  private navTween: { from: Orbit; to: Orbit; start: number; dur: number } | null = null
  private selectedId: string | null = null
  private width = 1
  private height = 1

  constructor(opts: WorldRendererOptions) {
    this.opts = opts
    this.reducedMotion = opts.reducedMotion
    this.quality = opts.quality ?? 'FULL_3D'
  }

  /** Throws if the backend cannot be created (e.g. WebGL unavailable). Caller must fall back to semantic UI. */
  mount(width: number, height: number): void {
    if (this.backend) return
    this.backend = this.opts.backendFactory(this.opts.canvas)
    loopInstrumentation.renderersCreated++
    const dpr = this.quality === 'REDUCED_3D' ? 1 : Math.min(this.opts.devicePixelRatio ?? 1, 2)
    this.backend.setPixelRatio(dpr)
    this.scene.background = new THREE.Color(0x0b0f19)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1f2937, 1.1)
    const dir = new THREE.DirectionalLight(0xffffff, 0.9)
    dir.position.set(10, 20, 8)
    this.scene.add(hemi, dir)
    this.resize(width, height)
    this.applyCamera()
    this.requestFrame()
  }

  get isMounted(): boolean {
    return this.backend !== null && !this.disposed
  }

  // ── projection ────────────────────────────────────────────────────────────

  applyProjection(p: SpatialProjection): void {
    if (!this.isMounted) return
    this.projection = p
    const live = new Set<string>()
    const now = this.lastFrameTime

    for (const d of p.decorations) {
      if (!this.decoMeshes.has(d.decorativeId)) {
        const mesh = new THREE.Mesh(this.geometry(d.kind === 'ZONE_PLATE' ? 'PLATE' : 'AMBIENT_RING'), this.decoMaterial(d.kind))
        mesh.position.set(d.position.x, d.kind === 'ZONE_PLATE' ? -0.6 : 0.2, d.position.z + (d.kind === 'ZONE_PLATE' ? 4 : 0))
        if (d.kind === 'AMBIENT_RING') mesh.rotation.x = Math.PI / 2
        mesh.userData = { semantic: false, decorativeId: d.decorativeId, kind: d.kind }
        this.scene.add(mesh)
        this.decoMeshes.set(d.decorativeId, mesh)
      }
    }

    for (const e of p.entities) {
      live.add(e.spatialEntityId)
      let mesh = this.entityMeshes.get(e.spatialEntityId)
      const geomKey: GeometryKey = (e.sourceEntityType === 'ROLE_BOT' && e.roleSilhouette) ? e.roleSilhouette : e.glyph
      if (!mesh) {
        mesh = new THREE.Mesh(this.geometry(geomKey), this.entityMaterial(e.visualState, e.glyph, e.sourceEntityType === 'ROLE_BOT' ? e.roleId : undefined))
        mesh.userData = { semantic: true, spatialEntityId: e.spatialEntityId }
        this.scene.add(mesh)
        this.entityMeshes.set(e.spatialEntityId, mesh)
      } else {
        const prev = this.meshState.get(e.spatialEntityId)
        if (prev && prev.visualState !== e.visualState) {
          if (!this.reducedMotion) this.transitionStart.set(e.spatialEntityId, now)
          mesh.geometry = this.geometry(geomKey)
          mesh.material = this.entityMaterial(e.visualState, e.glyph, e.sourceEntityType === 'ROLE_BOT' ? e.roleId : undefined)
        }
      }
      mesh.position.set(e.position.x, 0.4, e.position.z)
      this.meshState.set(e.spatialEntityId, { visualState: e.visualState, animation: e.animation, sourceRevision: e.sourceRevision })
    }

    // Deterministic removal: canonical entity gone => spatial entity gone. No ghosts.
    for (const [id, mesh] of this.entityMeshes) {
      if (!live.has(id)) {
        this.scene.remove(mesh)
        this.entityMeshes.delete(id)
        this.meshState.delete(id)
        this.transitionStart.delete(id)
        if (this.selectedId === id) this.selectedId = null
      }
    }
    this.markDirty()
  }

  // ── picking ───────────────────────────────────────────────────────────────

  /** NDC in [-1,1]. Returns a spatialEntityId or null. Decorative meshes are not pickable. */
  pick(ndcX: number, ndcY: number): string | null {
    if (!this.isMounted) return null
    this.camera.updateMatrixWorld(true)
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera)
    const hits = this.raycaster.intersectObjects([...this.entityMeshes.values()], false)
    for (const h of hits) {
      const id = h.object.userData['spatialEntityId']
      if (typeof id === 'string' && h.object.userData['semantic'] === true) return id
    }
    return null
  }

  /** Screen-space position (NDC) of an entity, for probes and focus; null if unknown. */
  projectToNdc(spatialEntityId: string): { x: number; y: number } | null {
    const m = this.entityMeshes.get(spatialEntityId)
    if (!m) return null
    this.camera.updateMatrixWorld(true)
    const v = m.position.clone().project(this.camera)
    return { x: v.x, y: v.y }
  }

  setSelected(spatialEntityId: string | null): void {
    this.selectedId = spatialEntityId && this.entityMeshes.has(spatialEntityId) ? spatialEntityId : null
    this.markDirty()
  }

  // ── camera (bounded; NAVIGATION animation class) ──────────────────────────

  orbitBy(dAzimuth: number, dPolar: number): void {
    this.orbit.azimuth += dAzimuth
    this.orbit.polar = Math.min(1.45, Math.max(0.25, this.orbit.polar + dPolar))
    this.applyCamera()
    this.markDirty()
  }

  zoomBy(factor: number): void {
    this.orbit.distance = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, this.orbit.distance * factor))
    this.applyCamera()
    this.markDirty()
  }

  focusEntity(spatialEntityId: string): boolean {
    const m = this.entityMeshes.get(spatialEntityId)
    if (!m) return false
    this.tweenTo({ azimuth: this.orbit.azimuth, polar: this.orbit.polar, distance: 14, target: m.position.clone() })
    return true
  }

  resetCamera(): void {
    this.tweenTo({ ...DEFAULT_ORBIT, target: new THREE.Vector3(0, 0, 2) })
  }

  private tweenTo(to: Orbit): void {
    if (this.reducedMotion) {
      this.orbit = to
      this.navTween = null
      this.applyCamera()
      this.markDirty()
      return
    }
    this.navTween = {
      from: { ...this.orbit, target: this.orbit.target.clone() },
      to,
      start: this.lastFrameTime,
      dur: 350,
    }
    this.requestFrame()
  }

  getCameraState(): { azimuth: number; polar: number; distance: number; target: { x: number; y: number; z: number }; tweening: boolean } {
    return {
      azimuth: this.orbit.azimuth,
      polar: this.orbit.polar,
      distance: this.orbit.distance,
      target: { x: this.orbit.target.x, y: this.orbit.target.y, z: this.orbit.target.z },
      tweening: this.navTween !== null,
    }
  }

  private applyCamera(): void {
    const { azimuth, polar, distance, target } = this.orbit
    this.camera.position.set(
      target.x + distance * Math.sin(polar) * Math.sin(azimuth),
      target.y + distance * Math.cos(polar),
      target.z + distance * Math.sin(polar) * Math.cos(azimuth)
    )
    this.camera.lookAt(target)
    this.camera.updateMatrixWorld(true)
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, Math.floor(width))
    this.height = Math.max(1, Math.floor(height))
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
    this.backend?.setSize(this.width, this.height, false)
    this.applyCamera()
    this.markDirty()
  }

  // ── motion policy ─────────────────────────────────────────────────────────

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced
    if (reduced) {
      // Remove continuous transforms; semantic glyph/state is unchanged.
      for (const m of this.entityMeshes.values()) {
        m.rotation.set(0, 0, 0)
        m.scale.set(1, 1, 1)
      }
      for (const m of this.decoMeshes.values()) {
        if (m.userData['kind'] === 'AMBIENT_RING') m.rotation.z = 0
      }
      this.transitionStart.clear()
      this.navTween = null
    }
    this.markDirty()
  }

  getAnimationPlan(): { reducedMotion: boolean; liveActivity: number; attention: number; error: number; ambientEnabled: boolean } {
    let live = 0
    let attention = 0
    let error = 0
    for (const s of this.meshState.values()) {
      if (s.animation === 'LIVE_ACTIVITY') live++
      else if (s.animation === 'ATTENTION') attention++
      else if (s.animation === 'ERROR') error++
    }
    return {
      reducedMotion: this.reducedMotion,
      liveActivity: this.reducedMotion ? 0 : live,
      attention: this.reducedMotion ? 0 : attention,
      error: this.reducedMotion ? 0 : error,
      ambientEnabled: !this.reducedMotion && this.quality === 'FULL_3D',
    }
  }

  // ── loop ──────────────────────────────────────────────────────────────────

  private animating(): boolean {
    if (this.navTween || this.transitionStart.size > 0) return true
    const plan = this.getAnimationPlan()
    return plan.liveActivity + plan.attention + plan.error > 0 || plan.ambientEnabled
  }

  private markDirty(): void {
    this.dirty = true
    this.requestFrame()
  }

  private requestFrame(): void {
    if (this.disposed || !this.backend || this.frameHandle !== null) return
    this.frameHandle = this.opts.scheduler.request((t) => this.tick(t))
    loopInstrumentation.pendingFrameHandles++
    loopInstrumentation.maxSimultaneousPendingFrames = Math.max(
      loopInstrumentation.maxSimultaneousPendingFrames,
      loopInstrumentation.pendingFrameHandles
    )
  }

  private tick(timeMs: number): void {
    this.frameHandle = null
    loopInstrumentation.pendingFrameHandles = Math.max(0, loopInstrumentation.pendingFrameHandles - 1)
    if (this.disposed || !this.backend) return
    const dt = this.lastFrameTime === 0 ? 0 : (timeMs - this.lastFrameTime) / 1000
    this.lastFrameTime = timeMs

    if (this.navTween) {
      const k = Math.min(1, (timeMs - this.navTween.start) / this.navTween.dur)
      const e = k * k * (3 - 2 * k)
      const { from, to } = this.navTween
      this.orbit.azimuth = from.azimuth + (to.azimuth - from.azimuth) * e
      this.orbit.polar = from.polar + (to.polar - from.polar) * e
      this.orbit.distance = from.distance + (to.distance - from.distance) * e
      this.orbit.target.copy(from.target).lerp(to.target, e)
      this.applyCamera()
      if (k >= 1) this.navTween = null
      this.dirty = true
    }

    if (!this.reducedMotion) {
      for (const [id, st] of this.meshState) {
        const mesh = this.entityMeshes.get(id)
        if (!mesh) continue
        let scale = 1
        const t0 = this.transitionStart.get(id)
        if (t0 !== undefined) {
          const k = Math.min(1, (timeMs - t0) / 400)
          scale = 1 + 0.35 * Math.sin(Math.PI * k) // STATE_TRANSITION
          if (k >= 1) this.transitionStart.delete(id)
        }
        if (st.animation === 'LIVE_ACTIVITY') mesh.rotation.y += dt * 2.2
        else if (st.animation === 'ATTENTION') scale *= 1 + 0.18 * Math.sin(timeMs / 220)
        else if (st.animation === 'ERROR') mesh.rotation.z = 0.12 * Math.sin(timeMs / 90)
        mesh.scale.setScalar(scale * (id === this.selectedId ? 1.25 : 1))
      }
      if (this.quality === 'FULL_3D') {
        for (const m of this.decoMeshes.values()) if (m.userData['kind'] === 'AMBIENT_RING') m.rotation.z += dt * 0.15 // AMBIENT
      }
      this.dirty = true
    } else {
      for (const [id, mesh] of this.entityMeshes) mesh.scale.setScalar(id === this.selectedId ? 1.25 : 1)
    }

    if (this.dirty) {
      this.backend.render(this.scene, this.camera)
      this.framesRendered++
      loopInstrumentation.totalFramesRendered++
      this.dirty = false
    }
    if (this.animating()) this.requestFrame()
  }

  /** Test/probe helper: force one synchronous render and return renderer stats. */
  renderOnceForStats(): WorldStats {
    if (this.backend) this.backend.render(this.scene, this.camera)
    return this.stats()
  }

  // ── stats / env ───────────────────────────────────────────────────────────

  stats(): WorldStats {
    let objectCount = 0
    this.scene.traverse(() => objectCount++)
    const info = this.backend?.info
    return {
      mounted: this.isMounted,
      entityMeshes: this.entityMeshes.size,
      objectCount,
      decorativeMeshes: this.decoMeshes.size,
      drawCalls: info?.render.calls ?? 0,
      triangles: info?.render.triangles ?? 0,
      geometries: info?.memory.geometries ?? 0,
      textures: info?.memory.textures ?? 0,
      cachedGeometries: this.geometries.size,
      cachedMaterials: this.materials.size,
      framesRendered: this.framesRendered,
      pendingFrame: this.frameHandle !== null,
      animatingEntities: this.getAnimationPlan().liveActivity,
      reducedMotion: this.reducedMotion,
      quality: this.quality,
    }
  }

  getContextInfo(): { renderer: string; vendor: string } | null {
    return this.backend?.getContextInfo?.() ?? null
  }

  getEntityMeshInfo(spatialEntityId: string): { geometryType: string; materialId: string; wireframe: boolean } | null {
    const m = this.entityMeshes.get(spatialEntityId)
    if (!m) return null
    const mat = m.material as THREE.MeshStandardMaterial
    return { geometryType: m.geometry.type, materialId: mat.name, wireframe: mat.wireframe }
  }

  // ── resources ─────────────────────────────────────────────────────────────

  private geometry(key: GeometryKey): THREE.BufferGeometry {
    let g = this.geometries.get(key)
    if (!g) {
      g = makeGeometry(key)
      this.geometries.set(key, g)
    }
    return g
  }

  private entityMaterial(state: VisualState, glyph: Glyph, roleId?: string): THREE.Material {
    const key = roleId ? `entity:${state}:${glyph}:${roleId}` : `entity:${state}:${glyph}`
    let m = this.materials.get(key)
    if (!m) {
      let color = VISUAL_GRAMMAR[state].color
      if (roleId) {
        const arch = resolveRoleArchetype(roleId)
        // If state is IDLE, WAITING, or ACTIVE, primary color is the archetype color tinted with state
        if (state === 'ACTIVE') {
          color = arch.primaryColor
        } else if (state === 'IDLE' || state === 'WAITING') {
          color = arch.primaryColor
        } else {
          color = VISUAL_GRAMMAR[state].color
        }
      }
      m = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.55,
        metalness: 0.1,
        wireframe: WIREFRAME_GLYPHS.has(glyph),
      })
      m.name = key
      this.materials.set(key, m)
    }
    return m
  }

  private decoMaterial(kind: string): THREE.Material {
    const key = `deco:${kind}`
    let m = this.materials.get(key)
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: kind === 'ZONE_PLATE' ? 0x111827 : 0x1e293b, roughness: 0.9 })
      m.name = key
      this.materials.set(key, m)
    }
    return m
  }

  /** Dispose every GPU resource, cancel the frame loop, drop the backend. Idempotent. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.frameHandle !== null) {
      this.opts.scheduler.cancel(this.frameHandle)
      this.frameHandle = null
      loopInstrumentation.pendingFrameHandles = Math.max(0, loopInstrumentation.pendingFrameHandles - 1)
    }
    for (const mesh of [...this.entityMeshes.values(), ...this.decoMeshes.values()]) this.scene.remove(mesh)
    this.entityMeshes.clear()
    this.decoMeshes.clear()
    this.meshState.clear()
    this.transitionStart.clear()
    for (const g of this.geometries.values()) g.dispose()
    this.geometries.clear()
    for (const m of this.materials.values()) m.dispose()
    this.materials.clear()
    this.scene.clear()
    if (this.backend) {
      this.backend.dispose()
      this.backend = null
      loopInstrumentation.renderersDisposed++
    }
  }
}

/** Real WebGL backend. Throws when WebGL is unavailable. */
export function createWebGLBackend(canvas: unknown, antialias = true): WorldRendererBackend {
  const renderer = new THREE.WebGLRenderer({ canvas: canvas as HTMLCanvasElement, antialias, alpha: false })
  return {
    domElement: renderer.domElement,
    setSize: (w, h, u) => renderer.setSize(w, h, u),
    setPixelRatio: (r) => renderer.setPixelRatio(r),
    render: (s, c) => renderer.render(s, c),
    dispose: () => {
      renderer.dispose()
      renderer.forceContextLoss()
    },
    info: renderer.info as unknown as WorldRendererBackend['info'],
    getContextInfo: () => {
      const gl = renderer.getContext()
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      return {
        renderer: String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
        vendor: String(ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)),
      }
    },
  }
}
