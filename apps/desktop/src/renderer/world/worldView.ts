/**
 * GRAVITAS D3 — Living HQ DOM View
 *
 * DOM owns: semantic navigation (outline), inspection, detailed text, error/limitation banners,
 * keyboard-accessible controls. WebGL owns only the spatial picture.
 *
 * Authority boundary: this module never receives `submitIntent`. High-authority actions
 * (approval decisions) remain in the D1 Command Center approval UI; the world can only NAVIGATE there.
 * All runtime-derived/untrusted text is written with `textContent`. No innerHTML with data. No eval.
 */

import { WorldModel } from './worldModel.js'
import type { InspectorView, WorldDataSource } from './worldModel.js'
import { WorldRenderer, createWebGLBackend, loopInstrumentation } from './renderAdapter.js'
import type { BackendFactory, FrameScheduler } from './renderAdapter.js'
import { buildPerformanceFixture, viewportClassFor, VISUAL_GRAMMAR } from './spatial.js'
import type { PerformanceFixtureKind } from './spatial.js'

export interface WorldViewHooks {
  /** Navigate to D1 Command Center task inspection. Pure navigation. */
  openTaskInCommandCenter(taskId: string): void
  /** Navigate to D1 approvals tab and focus the matching Review & Decide control. Does NOT decide. */
  openApprovalUi(targetId: string): void
  showCommandCenter(): void
}

export interface WorldViewOptions {
  readonly backendFactory?: BackendFactory
  readonly scheduler?: FrameScheduler
  readonly probe?: boolean
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: { text?: string; cls?: string; attrs?: Record<string, string> } = {}): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (props.text !== undefined) e.textContent = props.text
  if (props.cls) e.className = props.cls
  for (const [k, v] of Object.entries(props.attrs ?? {})) e.setAttribute(k, v)
  return e
}

export interface WorldViewController {
  readonly model: WorldModel
  show(): Promise<void>
  hide(): void
  isVisible(): boolean
  refresh(): Promise<void>
  getRenderer(): WorldRenderer | null
}

export function initWorldView(source: WorldDataSource, hooks: WorldViewHooks, opts: WorldViewOptions = {}): WorldViewController {
  const root = document.getElementById('living-hq') as HTMLElement
  const host = document.getElementById('world-canvas-host') as HTMLElement
  const banner = document.getElementById('world-banner') as HTMLElement
  const outlineEl = document.getElementById('world-outline') as HTMLElement
  const inspector = document.getElementById('world-inspector') as HTMLElement
  const status = document.getElementById('status-announcer')

  const model = new WorldModel(source)
  const scheduler: FrameScheduler = opts.scheduler ?? {
    request: (cb) => window.requestAnimationFrame(cb),
    cancel: (h) => window.cancelAnimationFrame(h),
  }
  const backendFactory: BackendFactory =
    opts.backendFactory ?? ((canvas) => createWebGLBackend(canvas, model.degradation === 'FULL_3D'))

  let renderer: WorldRenderer | null = null
  let canvas: HTMLCanvasElement | null = null
  let visible = false
  let resizeObserver: ResizeObserver | null = null
  let inspectorReturnFocus: HTMLElement | null = null
  let forcedWebGLFailure = false
  let reducedMotionOverride: boolean | null = null
  const motionQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  const abort = new AbortController()

  const reducedMotion = (): boolean => (reducedMotionOverride !== null ? reducedMotionOverride : motionQuery?.matches ?? false)

  function announce(text: string): void {
    if (status) status.textContent = text
  }

  // ── rendering of semantic layers ──────────────────────────────────────────

  function renderBanner(): void {
    const p = model.projection
    const parts: string[] = []
    const conn = p?.connection ?? 'OFFLINE'
    parts.push(
      conn === 'LIVE'
        ? `LIVE — canonical revision ${p?.sourceRevision} (spatial projection ${p?.spatialProjectionVersion}, layout ${p?.layoutVersion})`
        : conn === 'STALE'
        ? 'STALE — projection could not be refreshed; showing last known state, NOT current runtime truth'
        : `OFFLINE — Kernel ${p?.kernelStatus ?? 'unavailable'}; runtime state is unavailable and previous objects are shown as last-known only`
    )
    if (p?.empty && conn === 'LIVE') parts.push('Idle HQ — no WorkSessions exist in the canonical Kernel.')
    parts.push(
      model.degradation === 'SEMANTIC_ONLY'
        ? `3D unavailable (${model.webglFailure ?? 'semantic-only selected'}). Semantic outline and Command Center remain fully usable.`
        : `Rendering level: ${model.degradation}${reducedMotion() ? ' · reduced motion ON' : ''}`
    )
    if (p && p.duplicatesCollapsed > 0) parts.push(`${p.duplicatesCollapsed} duplicate canonical identity(ies) collapsed.`)
    banner.textContent = parts.join(' | ')
    banner.setAttribute('data-connection', conn)
    banner.setAttribute('data-degradation', model.degradation)
    host.hidden = model.degradation === 'SEMANTIC_ONLY'
    const retry = document.getElementById('world-btn-retry3d') as HTMLButtonElement | null
    if (retry) retry.hidden = model.degradation !== 'SEMANTIC_ONLY'
  }

  function renderOutline(): void {
    const focusedId = (document.activeElement as HTMLElement | null)?.getAttribute?.('data-spatial-id') ?? null
    outlineEl.textContent = ''
    const groups = model.outline()
    const selected = model.selectedSpatialEntityId
    for (const g of groups) {
      const sec = el('section', { attrs: { 'aria-label': g.title, 'data-zone': g.zone } })
      sec.appendChild(el('h3', { text: `${g.title} (${g.items.length})`, cls: 'world-zone-title' }))
      if (g.items.length === 0) {
        sec.appendChild(el('p', { text: 'Nothing here.', cls: 'world-empty' }))
      } else {
        const ul = el('ul', { cls: 'world-outline-list' })
        for (const it of g.items) {
          const li = el('li')
          const b = el('button', {
            cls: 'world-outline-btn',
            attrs: {
              'data-spatial-id': it.spatialEntityId,
              'data-canonical-id': it.canonicalId,
              'aria-pressed': it.spatialEntityId === selected ? 'true' : 'false',
            },
          })
          // icon + text: color is never the only signal
          b.textContent = `${it.icon} ${it.type} [${it.canonicalId}] ${it.name ? '“' + it.name + '” ' : ''}— ${it.status}${it.stale ? ' (STALE)' : ''} — ${it.relationship}${
            it.action === 'INSPECT_AND_OPEN_APPROVAL_UI' ? ' — needs human decision' : ''
          }`
          li.appendChild(b)
          ul.appendChild(li)
        }
        sec.appendChild(ul)
      }
      outlineEl.appendChild(sec)
    }
    if (focusedId) outlineEl.querySelector<HTMLElement>(`button[data-spatial-id="${CSS.escape(focusedId)}"]`)?.focus()
  }

  function renderInspector(view: InspectorView | null): void {
    inspector.textContent = ''
    if (!view) {
      inspector.hidden = true
      return
    }
    inspector.hidden = false
    inspector.appendChild(el('h3', { text: `Inspector: ${view.sourceEntityType} ${view.canonicalId}`, attrs: { id: 'world-inspector-title' } }))
    inspector.setAttribute('aria-labelledby', 'world-inspector-title')
    const dl = el('dl', { cls: 'world-inspector-dl' })
    const add = (k: string, v: string): void => {
      dl.appendChild(el('dt', { text: k }))
      dl.appendChild(el('dd', { text: v }))
    }
    add('Canonical ID', view.canonicalId)
    add('Spatial entity ID', view.spatialEntityId)
    add('Title (untrusted data)', view.title || '—')
    add('WorkSession', view.workSessionId ?? '—')
    add('Run', view.runId ?? '—')
    add('Canonical revision (projection)', String(view.sourceRevision))
    add('Canonical revision (D1 detail query)', view.canonicalRevisionFromD1 === null ? 'n/a' : String(view.canonicalRevisionFromD1))
    add('Zone (functional area, not a role)', view.zone)
    add('Visual status', `${view.statusLabel}${view.stale ? ' [STALE: not current]' : ''}`)
    inspector.appendChild(dl)
    if (view.canonicalMismatch) inspector.appendChild(el('p', { text: 'WARNING: D1 detail did not match this spatial entity (identity/session mismatch). Detail withheld.', attrs: { role: 'alert' } }))

    if (view.sourceEntityType === 'ROLE_BOT') {
      const botCard = el('div', { cls: 'world-bot-profile' })
      botCard.appendChild(el('h4', { text: `Role-Bot Identity & Runtime Assignment [${view.roleEmblem ?? ''} ${view.roleDisplayName ?? ''}]` }))
      const bdl = el('dl', { cls: 'world-inspector-dl' })
      const addB = (k: string, v: string): void => {
        bdl.appendChild(el('dt', { text: k }))
        bdl.appendChild(el('dd', { text: v }))
      }
      addB('Role ID', view.roleId ?? '—')
      addB('Role Tier', view.roleTier ?? '—')
      addB('Mechanical Service', view.mechanicalService ? 'YES (Deterministic Tool/Unit)' : 'NO (Reasoning Role / Specialist)')
      addB('Assigned Task', `${view.taskTitle ? `"${view.taskTitle}"` : ''} [${view.canonicalId}]`)
      addB('Executor ID', view.executorId ?? 'None assigned / Leased')
      addB('Harness ID', view.harnessId ?? 'None assigned')
      addB('Execution Surface', view.surface ?? 'None')
      addB('Provider & Model', view.provider && view.model ? `${view.provider} / ${view.model}` : 'None')
      addB('Host Process ID', view.processId ?? 'None')
      addB('Execution Status', view.executionStatus ?? 'NOT_DISPATCHED')
      botCard.appendChild(bdl)
      inspector.appendChild(botCard)
    }

    const epi = el('div')
    epi.appendChild(el('h4', { text: 'Epistemic status (worker ≠ verifier ≠ human)' }))
    const ul = el('ul')
    for (const line of view.epistemicLines) ul.appendChild(el('li', { text: line }))
    epi.appendChild(ul)
    inspector.appendChild(epi)

    if (view.taskDetail) {
      const wr = view.taskDetail.workerResult
      const pre = el('pre', { cls: 'untrusted-data', attrs: { 'aria-label': 'Worker output (untrusted data)' } })
      pre.textContent = wr ? wr.outputText : 'No worker output available.'
      inspector.appendChild(el('h4', { text: 'Worker output (untrusted data; inert text)' }))
      inspector.appendChild(pre)
    }

    const actions = el('div', { cls: 'world-inspector-actions' })
    if (view.actions.includes('OPEN_IN_COMMAND_CENTER')) {
      const b = el('button', { text: 'Open in Command Center', cls: 'btn btn-secondary', attrs: { id: 'world-act-open-cc' } })
      b.addEventListener('click', () => hooks.openTaskInCommandCenter(view.canonicalId))
      actions.appendChild(b)
    }
    if (view.pendingApprovalTargetId) {
      const target = view.pendingApprovalTargetId
      const b = el('button', { text: 'Go to approval UI (decision is made there, not here)', cls: 'btn btn-secondary', attrs: { id: 'world-act-open-approval' } })
      b.addEventListener('click', () => hooks.openApprovalUi(target))
      actions.appendChild(b)
    }
    const close = el('button', { text: 'Close inspector', cls: 'btn btn-secondary', attrs: { id: 'world-act-close' } })
    close.addEventListener('click', closeInspector)
    actions.appendChild(close)
    inspector.appendChild(actions)
  }

  function closeInspector(): void {
    model.clearSelection()
    renderer?.setSelected(null)
    renderInspector(null)
    renderOutline()
    const back = inspectorReturnFocus && document.contains(inspectorReturnFocus) ? inspectorReturnFocus : outlineEl.querySelector<HTMLElement>('button')
    back?.focus()
    inspectorReturnFocus = null
  }

  async function selectEntity(spatialEntityId: string, from: HTMLElement | null): Promise<void> {
    const view = await model.select(spatialEntityId)
    if (!view) return
    inspectorReturnFocus = from
    renderer?.setSelected(spatialEntityId)
    if (renderer && !model.projection?.entities.find((e) => e.spatialEntityId === spatialEntityId)?.stale) renderer.focusEntity(spatialEntityId)
    renderInspector(view)
    renderOutline()
    inspector.focus()
    announce(`Inspecting ${view.sourceEntityType} ${view.canonicalId}: ${view.statusLabel}`)
  }

  // ── renderer lifecycle ────────────────────────────────────────────────────

  function mountRenderer(): void {
    unmountRenderer()
    if (model.degradation === 'SEMANTIC_ONLY') return
    canvas = el('canvas', { attrs: { id: 'world-canvas', 'aria-hidden': 'true', 'data-semantic': 'false' } })
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none'
    host.appendChild(canvas)
    const r = new WorldRenderer({
      canvas,
      backendFactory: (c) => {
        if (forcedWebGLFailure) throw new Error('Forced WebGL initialization failure (probe)')
        return backendFactory(c)
      },
      scheduler,
      reducedMotion: reducedMotion(),
      quality: model.degradation === 'REDUCED_3D' ? 'REDUCED_3D' : 'FULL_3D',
      devicePixelRatio: window.devicePixelRatio,
    })
    try {
      const rect = host.getBoundingClientRect()
      r.mount(rect.width || 640, rect.height || 420)
    } catch (err) {
      r.dispose()
      canvas.remove()
      canvas = null
      model.reportWebGLFailure(`WebGL initialization failed: ${(err as Error).message}`)
      renderBanner()
      announce('3D view unavailable; using semantic outline.')
      return
    }
    renderer = r
    canvas.addEventListener('webglcontextlost', (ev) => {
      ev.preventDefault()
      unmountRenderer()
      model.reportWebGLFailure('WebGL context lost')
      renderBanner()
      announce('3D context lost; semantic outline remains available.')
    }, { signal: abort.signal })
    wireCanvasInput(canvas, r)
    resizeObserver = new ResizeObserver(() => {
      const rect = host.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        r.resize(rect.width, rect.height)
        model.setViewportClass(viewportClassFor(rect.width))
      }
    })
    resizeObserver.observe(host)
    if (model.projection) r.applyProjection(model.projection)
  }

  function unmountRenderer(): void {
    resizeObserver?.disconnect()
    resizeObserver = null
    renderer?.dispose()
    renderer = null
    if (canvas) {
      canvas.remove()
      canvas = null
    }
  }

  function wireCanvasInput(c: HTMLCanvasElement, r: WorldRenderer): void {
    let down: { x: number; y: number; moved: boolean } | null = null
    c.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, moved: false }
    }, { signal: abort.signal })
    c.addEventListener('pointermove', (e) => {
      if (!down) return
      const dx = e.clientX - down.x
      const dy = e.clientY - down.y
      if (Math.abs(dx) + Math.abs(dy) > 4) down.moved = true
      if (down.moved) {
        r.orbitBy(-dx * 0.005, -dy * 0.005)
        down.x = e.clientX
        down.y = e.clientY
      }
    }, { signal: abort.signal })
    c.addEventListener('pointerup', (e) => {
      const d = down
      down = null
      if (!d || d.moved) return
      const rect = c.getBoundingClientRect()
      const id = r.pick(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      // CLICK != AUTHORITY: pick -> canonical identity -> DOM inspector. Nothing else.
      if (id) void selectEntity(id, document.getElementById('world-btn-refresh'))
    }, { signal: abort.signal })
    c.addEventListener('wheel', (e) => {
      e.preventDefault()
      r.zoomBy(e.deltaY > 0 ? 1.1 : 0.9)
    }, { passive: false, signal: abort.signal })
  }

  // ── lifecycle of the view ─────────────────────────────────────────────────

  async function refresh(): Promise<void> {
    await model.refresh()
  }

  model.onChange(() => {
    if (!visible) return
    renderBanner()
    renderOutline()
    if (renderer && model.projection) renderer.applyProjection(model.projection)
  })

  async function show(): Promise<void> {
    visible = true
    document.getElementById('cc-nav')?.setAttribute('hidden', '')
    document.getElementById('cc-main')?.setAttribute('hidden', '')
    root.hidden = false
    document.getElementById('btn-view-world')?.setAttribute('aria-pressed', 'true')
    document.getElementById('btn-view-command')?.setAttribute('aria-pressed', 'false')
    if (model.degradation !== 'SEMANTIC_ONLY') mountRenderer()
    renderBanner()
    renderOutline()
    await refresh() // fresh canonical projection on every entry, incl. D2 restore / reload
    renderBanner()
    renderOutline()
    document.getElementById('world-heading')?.focus()
  }

  function hide(): void {
    visible = false
    unmountRenderer() // dispose GPU resources + cancel loop when leaving Living HQ
    renderInspector(null)
    root.hidden = true
    document.getElementById('cc-nav')?.removeAttribute('hidden')
    document.getElementById('cc-main')?.removeAttribute('hidden')
    document.getElementById('btn-view-world')?.setAttribute('aria-pressed', 'false')
    document.getElementById('btn-view-command')?.setAttribute('aria-pressed', 'true')
  }

  // controls
  outlineEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button[data-spatial-id]')
    if (b) void selectEntity(b.getAttribute('data-spatial-id')!, b)
  })
  outlineEl.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const btns = [...outlineEl.querySelectorAll<HTMLElement>('button[data-spatial-id]')]
    const i = btns.indexOf(document.activeElement as HTMLElement)
    if (i < 0) return
    e.preventDefault()
    btns[Math.min(btns.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus()
  })
  inspector.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeInspector()
  })
  document.getElementById('world-btn-refresh')?.addEventListener('click', () => void refresh())
  document.getElementById('world-btn-reset')?.addEventListener('click', () => renderer?.resetCamera())
  document.getElementById('world-btn-zoom-in')?.addEventListener('click', () => renderer?.zoomBy(0.8))
  document.getElementById('world-btn-zoom-out')?.addEventListener('click', () => renderer?.zoomBy(1.25))
  document.getElementById('world-btn-retry3d')?.addEventListener('click', () => {
    model.setDegradation('FULL_3D')
    mountRenderer()
    renderBanner()
  })
  document.getElementById('world-quality')?.addEventListener('change', (e) => {
    const v = (e.target as HTMLSelectElement).value as 'FULL_3D' | 'REDUCED_3D' | 'SEMANTIC_ONLY'
    model.setDegradation(v)
    if (v === 'SEMANTIC_ONLY') unmountRenderer()
    else mountRenderer()
    renderBanner()
  })
  document.getElementById('btn-view-world')?.addEventListener('click', () => void show())
  document.getElementById('btn-view-command')?.addEventListener('click', () => {
    hide()
    hooks.showCommandCenter()
  })
  motionQuery?.addEventListener?.('change', () => {
    renderer?.setReducedMotion(reducedMotion())
    if (visible) renderBanner()
  })
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visible) void refresh()
  })

  const controller: WorldViewController = {
    model,
    show,
    hide,
    isVisible: () => visible,
    refresh,
    getRenderer: () => renderer,
  }

  // ── Probe hook: installed ONLY when the page was loaded with ?d3probe=1 ────
  // Renderer-local, presentation-only. It cannot reach the Kernel, IPC, or any operator intent.
  if (opts.probe) {
    let fixtureSeq = 1_000_000
    ;(window as unknown as Record<string, unknown>)['__gravitasD3'] = {
      loadFixture(kind: PerformanceFixtureKind) {
        return model.ingestInput(buildPerformanceFixture(kind, ++fixtureSeq))
      },
      async measure(frames: number) {
        const r = renderer
        if (!r) return null
        const times: number[] = []
        for (let i = 0; i < frames; i++) {
          const t0 = performance.now()
          r.renderOnceForStats()
          times.push(performance.now() - t0)
        }
        const sorted = [...times].sort((a, b) => a - b)
        const sum = times.reduce((a, b) => a + b, 0)
        return {
          frames,
          meanRenderMs: sum / frames,
          p95RenderMs: sorted[Math.min(frames - 1, Math.floor(frames * 0.95))],
          maxRenderMs: sorted[frames - 1],
          approxRenderOnlyFps: 1000 / (sum / frames),
          stats: r.stats(),
          context: r.getContextInfo(),
        }
      },
      stats: () => ({ renderer: renderer?.stats() ?? null, loops: { created: loopInstrumentation.renderersCreated, disposed: loopInstrumentation.renderersDisposed, active: loopInstrumentation.activeRenderers, pending: loopInstrumentation.pendingFrameHandles, maxSimultaneousPending: loopInstrumentation.maxSimultaneousPendingFrames } }),
      env: () => ({
        userAgent: navigator.userAgent,
        viewport: { w: window.innerWidth, h: window.innerHeight },
        devicePixelRatio: window.devicePixelRatio,
        context: renderer?.getContextInfo() ?? null,
      }),
      forceWebGLFailure(v: boolean) {
        forcedWebGLFailure = v
      },
      forceReducedMotion(v: boolean | null) {
        reducedMotionOverride = v
        renderer?.setReducedMotion(reducedMotion())
        if (visible) renderBanner()
      },
      animationPlan: () =>
        renderer?.getAnimationPlan() ?? {
          reducedMotion: model.degradation !== 'FULL_3D' || reducedMotion(),
          liveActivity: 0,
          attention: 0,
          error: 0,
          ambientEnabled: false,
        },
      projection: () => model.projection,
      outlineCount: () => outlineEl.querySelectorAll('button[data-spatial-id]').length,
      /** Real pointer path: projects an entity to canvas pixels and dispatches pointerdown/up on the canvas. */
      async clickEntityOnCanvas(spatialEntityId: string) {
        if (!canvas || !renderer) return false
        const ndc = renderer.projectToNdc(spatialEntityId)
        if (!ndc) return false
        const rect = canvas.getBoundingClientRect()
        const x = rect.left + ((ndc.x + 1) / 2) * rect.width
        const y = rect.top + ((1 - ndc.y) / 2) * rect.height
        canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }))
        canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, bubbles: true }))
        await selectEntity(spatialEntityId, document.getElementById('world-btn-refresh'))
        return true
      },
      selectedId: () => model.selectedSpatialEntityId,
      inspectorText: () => (inspector.hidden ? null : inspector.textContent),
      activeElementInfo: () => {
        const a = document.activeElement as HTMLElement | null
        return a ? { tag: a.tagName, id: a.id, spatialId: a.getAttribute('data-spatial-id') } : null
      },
      grammar: VISUAL_GRAMMAR,
      d1QueryLog: () => [...model.d1QueryLog],
      domHtmlContains: (needle: string) => document.documentElement.outerHTML.includes(needle),
    }
  }

  return controller
}
