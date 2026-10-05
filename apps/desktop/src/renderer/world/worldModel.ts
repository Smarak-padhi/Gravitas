/**
 * GRAVITAS D3 — World Model (DOM-free, GPU-free controller logic)
 *
 * The Living HQ obtains runtime truth ONLY through the read-only subset of the frozen D1
 * bridge declared in `WorldDataSource`. `submitIntent`, `requestHideWindow`, and
 * `requestQuitApplication` are deliberately absent from this type: the world has NO
 * compile-time path to an operator intent. Selection returns identity + descriptors only.
 *
 * Invariants: UI != CANONICAL_STATE, SPATIAL_WORLD != CANONICAL_STATE, CLICK != AUTHORITY,
 * SPATIAL_ATTENTION_MARKER != APPROVAL, WEBGL_FAILURE != APPLICATION_FAILURE.
 */

import type {
  GravitasDesktopBridge,
  KernelLifecycleStatus,
  TaskDetailProjection,
  VerificationProjection,
} from '../../types.js'
import {
  buildOutline,
  decideAcceptance,
  degradeProjection,
  projectToSpatial,
  resolveSelection,
} from './spatial.js'
import type {
  AcceptDecision,
  ConnectionState,
  OutlineGroup,
  SpatialEntity,
  SpatialInput,
  SpatialProjection,
  ViewportClass,
} from './spatial.js'

/** Read-only D1 subset. No intent submission, no lifecycle control. */
export type WorldDataSource = Pick<
  GravitasDesktopBridge,
  'getHealth' | 'getOverview' | 'getWorkHierarchy' | 'getApprovalQueue' | 'getExecution' | 'getSystem' | 'getVerification' | 'getTaskDetail'
>

export type DegradationLevel = 'FULL_3D' | 'REDUCED_3D' | 'SEMANTIC_ONLY'

export type InspectorAction = 'OPEN_IN_COMMAND_CENTER' | 'OPEN_APPROVAL_UI'

export interface InspectorView {
  readonly spatialEntityId: string
  /** UNTRUSTED display text — textContent only. */
  readonly title: string
  readonly sourceEntityType: SpatialEntity['sourceEntityType']
  readonly canonicalId: string
  readonly sourceRevision: number
  /** Revision as re-read from the D1 detail query (tasks only). Used for cross-view equality. */
  readonly canonicalRevisionFromD1: number | null
  readonly workSessionId: string | null
  readonly runId: string | null
  readonly zone: SpatialEntity['zone']
  readonly statusLabel: string
  readonly stale: boolean
  readonly epistemicLines: readonly string[]
  readonly taskDetail: TaskDetailProjection | null
  readonly canonicalMismatch: boolean
  readonly pendingApprovalTargetId: string | null
  readonly actions: readonly InspectorAction[]
  /** D4 Role-Bot identity projection metadata */
  readonly roleId?: string
  readonly roleTier?: string
  readonly roleDisplayName?: string
  readonly roleEmblem?: string
  readonly roleSilhouette?: string
  readonly mechanicalService?: boolean
  readonly executorId?: string
  readonly harnessId?: string
  readonly surface?: string
  readonly provider?: string
  readonly model?: string
  readonly processId?: string
  readonly executionStatus?: string
  readonly taskTitle?: string
}

export interface RefreshOutcome {
  readonly decision: AcceptDecision | { accepted: false; reason: 'FLOOR_SEQUENCE' } | { accepted: true; reason: 'DEGRADED' }
  readonly connection: ConnectionState
}

type Listener = () => void

const OFFLINE_STATUSES: ReadonlySet<KernelLifecycleStatus> = new Set<KernelLifecycleStatus>([
  'OFFLINE',
  'FAILED',
  'STOPPED',
  'STOPPING',
  'NOT_STARTED',
  'STARTING',
])

export class WorldModel {
  private readonly source: WorldDataSource
  private readonly now: () => string
  private seq = 0
  private current: SpatialProjection | null = null
  private floorSeq = 0
  private viewportClass: ViewportClass
  private level: DegradationLevel = 'FULL_3D'
  private webglFailureReason: string | null = null
  private selectedId: string | null = null
  private readonly listeners = new Set<Listener>()
  public readonly d1QueryLog: string[] = []

  constructor(source: WorldDataSource, opts: { viewportClass?: ViewportClass; now?: () => string } = {}) {
    this.source = source
    this.viewportClass = opts.viewportClass ?? 'REGULAR'
    this.now = opts.now ?? (() => new Date().toISOString())
  }

  onChange(l: Listener): () => void {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  private emit(): void {
    for (const l of this.listeners) l()
  }

  get projection(): SpatialProjection | null {
    return this.current
  }

  get degradation(): DegradationLevel {
    return this.level
  }

  get webglFailure(): string | null {
    return this.webglFailureReason
  }

  get selectedSpatialEntityId(): string | null {
    return this.selectedId
  }

  nextSequence(): number {
    return ++this.seq
  }

  outline(): readonly OutlineGroup[] {
    return this.current ? buildOutline(this.current) : []
  }

  setViewportClass(v: ViewportClass): void {
    if (v === this.viewportClass) return
    this.viewportClass = v
    this.emit()
  }

  setDegradation(level: DegradationLevel): void {
    this.level = level
    if (level !== 'SEMANTIC_ONLY') this.webglFailureReason = null
    this.emit()
  }

  /** WEBGL_FAILURE != APPLICATION_FAILURE: only the presentation level changes. */
  reportWebGLFailure(reason: string): void {
    this.webglFailureReason = reason.slice(0, 200)
    this.level = 'SEMANTIC_ONLY'
    this.emit()
  }

  // ── ingestion ──────────────────────────────────────────────────────────────

  /** Pure-input path (used by refresh, fixtures, and tests). Applies revision ordering. */
  ingestInput(input: SpatialInput): RefreshOutcome {
    if (input.fetchSequence <= this.floorSeq) {
      return { decision: { accepted: false, reason: 'FLOOR_SEQUENCE' }, connection: this.current?.connection ?? 'OFFLINE' }
    }
    const next = projectToSpatial(input, this.viewportClass)
    const decision = decideAcceptance(this.current, next)
    if (decision.accepted) {
      this.current = next
      if (this.selectedId && !next.entities.some((e) => e.spatialEntityId === this.selectedId)) this.selectedId = null
      this.emit()
    }
    return { decision, connection: next.connection }
  }

  private degrade(connection: ConnectionState, seq: number, kernelStatus?: KernelLifecycleStatus): RefreshOutcome {
    this.floorSeq = Math.max(this.floorSeq, seq)
    if (this.current) {
      this.current = degradeProjection(this.current, connection)
    } else {
      this.current = projectToSpatial(
        {
          fetchSequence: seq,
          receivedAt: this.now(),
          connection,
          overview: null,
          hierarchy: null,
          approvals: null,
          executions: null,
          verifications: [],
          system: kernelStatus ? ({ kernelStatus } as never) : null,
        },
        this.viewportClass
      )
    }
    this.emit()
    return { decision: { accepted: true, reason: 'DEGRADED' }, connection }
  }

  /** Fetch via D1 read-only queries, project, order, apply. Never throws. */
  async refresh(): Promise<RefreshOutcome> {
    const seq = this.nextSequence()
    const q = <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      this.d1QueryLog.push(name)
      return fn()
    }
    const [health, overview, hierarchy, approvals, executions, system, firstVerif] = await Promise.allSettled([
      q('getHealth', () => this.source.getHealth()),
      q('getOverview', () => this.source.getOverview()),
      q('getWorkHierarchy', () => this.source.getWorkHierarchy()),
      q('getApprovalQueue', () => this.source.getApprovalQueue()),
      q('getExecution', () => this.source.getExecution()),
      q('getSystem', () => this.source.getSystem()),
      q('getVerification', () => this.source.getVerification()),
    ])

    const status = health.status === 'fulfilled' ? health.value.status : null
    if (status !== null && OFFLINE_STATUSES.has(status)) return this.degrade('OFFLINE', seq, status)
    if (health.status === 'rejected' || overview.status === 'rejected' || hierarchy.status === 'rejected') {
      return this.degrade('STALE', seq)
    }

    const verifs = new Map<string, VerificationProjection>()
    if (firstVerif.status === 'fulfilled' && firstVerif.value) verifs.set(firstVerif.value.planId, firstVerif.value)
    if (approvals.status === 'fulfilled') {
      const extra = await Promise.allSettled(
        approvals.value.items
          .filter((i) => i.status === 'WAITING_APPROVAL' && !verifs.has(i.targetId))
          .map((i) => q('getVerification', () => this.source.getVerification(i.targetId)))
      )
      for (const r of extra) if (r.status === 'fulfilled' && r.value) verifs.set(r.value.planId, r.value)
    }

    return this.ingestInput({
      fetchSequence: seq,
      receivedAt: this.now(),
      connection: 'LIVE',
      overview: overview.value,
      hierarchy: hierarchy.value,
      approvals: approvals.status === 'fulfilled' ? approvals.value : null,
      executions: executions.status === 'fulfilled' ? executions.value : null,
      verifications: [...verifs.values()],
      system: system.status === 'fulfilled' ? system.value : null,
    })
  }

  // ── selection / inspection (identity only) ─────────────────────────────────

  /**
   * Resolve a spatial selection to a semantic inspector view via the D1 read-only task query.
   * Returns descriptors of navigable actions; performs NO mutation, grant, dispatch or approval.
   */
  async select(spatialEntityId: string): Promise<InspectorView | null> {
    const p = this.current
    if (!p) return null
    const res = resolveSelection(p, spatialEntityId)
    const e = p.entities.find((x) => x.spatialEntityId === spatialEntityId)
    if (!res || !e) return null
    this.selectedId = spatialEntityId

    let detail: TaskDetailProjection | null = null
    let mismatch = false
    if (res.inspectVia === 'getTaskDetail') {
      this.d1QueryLog.push('getTaskDetail')
      const targetTaskId = e.sourceEntityType === 'ROLE_BOT' ? res.sourceEntityId.split(':')[0]! : res.sourceEntityId
      try {
        detail = await this.source.getTaskDetail(targetTaskId)
      } catch {
        detail = null
      }
      if (detail && (detail.task.id !== targetTaskId || detail.causalChain.workSessionId !== res.workSessionId)) {
        mismatch = true
        detail = null
      }
    }

    const actions: InspectorAction[] = []
    if ((e.sourceEntityType === 'TASK' || e.sourceEntityType === 'ROLE_BOT') && !mismatch) actions.push('OPEN_IN_COMMAND_CENTER')
    if (e.pendingApprovalTargetId) actions.push('OPEN_APPROVAL_UI')

    this.emit()
    return {
      spatialEntityId,
      title: e.label,
      sourceEntityType: e.sourceEntityType,
      canonicalId: e.sourceEntityId,
      sourceRevision: e.sourceRevision,
      canonicalRevisionFromD1: detail ? detail.task.revision : null,
      workSessionId: e.workSessionId,
      runId: e.runId,
      zone: e.zone,
      statusLabel: e.statusLabel,
      stale: e.stale,
      epistemicLines: e.epistemicLines,
      taskDetail: detail,
      canonicalMismatch: mismatch,
      pendingApprovalTargetId: e.pendingApprovalTargetId,
      actions,
      roleId: e.roleId,
      roleTier: e.roleTier,
      roleDisplayName: e.roleDisplayName,
      roleEmblem: e.roleEmblem,
      roleSilhouette: e.roleSilhouette,
      mechanicalService: e.mechanicalService,
      executorId: e.executorId,
      harnessId: e.harnessId,
      surface: e.surface,
      provider: e.provider,
      model: e.model,
      processId: e.processId,
      executionStatus: e.executionStatus,
      taskTitle: e.taskTitle,
    }
  }

  clearSelection(): void {
    this.selectedId = null
    this.emit()
  }
}
