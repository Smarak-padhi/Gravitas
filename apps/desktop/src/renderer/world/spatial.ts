/**
 * GRAVITAS D3 — Spatial Projection (pure, GPU-independent)
 *
 *   CanonicalProjection (D1)  ->  SpatialProjection (this module)  ->  RenderScene (renderAdapter.ts)
 *
 * This module imports ONLY types. It has no Three.js, DOM, Electron, Node, or I/O dependency,
 * so every mapping decision is unit-testable without a GPU.
 *
 * Invariants:
 * - SPATIAL_WORLD != CANONICAL_STATE            (everything here is DERIVED_SPATIAL_STATE)
 * - VISUAL_STATE != EXECUTION_STATE
 * - ANIMATION != EXECUTION
 * - PRESENCE != PROCESS_LIVENESS
 * - POSITION != AUTHORITY, ROOM != ROLE
 * - WORKER_SUCCESS != VERIFIED_SUCCESS; VERIFIED_PASS != HUMAN_APPROVAL
 * - Nothing in a SpatialEntity can carry an action, grant, or command.
 */

import type {
  ApprovalQueueProjection,
  ExecutionProjection,
  ExecutionItem,
  KernelLifecycleStatus,
  OverviewProjection,
  SystemProjection,
  VerificationProjection,
  WorkHierarchyProjection,
} from '../../types.js'
import { resolveRoleArchetype, type RoleTier, type RoleVisualArchetype } from './roleRegistry.js'

export type RoleSilhouette = RoleVisualArchetype['silhouette']

export const SPATIAL_PROJECTION_VERSION = 'd3.0'
export const D4_SPATIAL_PROJECTION_VERSION = 'd4.0'
export const SPATIAL_LAYOUT_VERSION = 'd3.layout.1'
export const D4_SPATIAL_LAYOUT_VERSION = 'd4.layout.1'

// ─── Vocabulary ──────────────────────────────────────────────────────────────

export type SourceEntityType = 'WORK_SESSION' | 'RUN' | 'TASK' | 'APPROVAL_GATE' | 'SYSTEM' | 'ROLE_BOT'

/** Zones are functional areas, NOT roles. ROOM != ROLE. */
export type ZoneId = 'OPERATIONS' | 'EXECUTION' | 'VERIFICATION' | 'HUMAN_GATE' | 'SYSTEM'

export type ViewportClass = 'COMPACT' | 'REGULAR' | 'WIDE'

export type ConnectionState = 'LIVE' | 'STALE' | 'OFFLINE'

export type VisualState =
  | 'IDLE'
  | 'WAITING'
  | 'ACTIVE'
  | 'BLOCKED'
  | 'WORKER_SUCCEEDED' // worker reported success; NOT verified
  | 'VERIFIED_PASS' // verifier verdict; NOT human approved
  | 'VERIFICATION_INCONCLUSIVE'
  | 'VERIFICATION_FAILED'
  | 'AWAITING_HUMAN_APPROVAL'
  | 'HUMAN_APPROVED'
  | 'HUMAN_REJECTED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RECOVERY_REQUIRED'
  | 'UNKNOWN'
  | 'OFFLINE_STALE'

/**
 * Animation semantics (D3_VISUAL_STATE_GRAMMAR.md):
 * AMBIENT         decorative only; never attached to an operational entity; implies nothing.
 * STATE_TRANSITION one-shot easing when canonical state of an entity changed.
 * LIVE_ACTIVITY   continuous; ONLY for a task whose canonical state is active AND connection is LIVE.
 * ATTENTION       pulse for items that need the human (pending approval gate).
 * ERROR           brief shake marker for failed / recovery-required entities.
 * NAVIGATION      camera tween on focus/reset.
 * NONE            no motion.
 */
export type AnimationClass =
  | 'NONE'
  | 'AMBIENT'
  | 'STATE_TRANSITION'
  | 'LIVE_ACTIVITY'
  | 'ATTENTION'
  | 'ERROR'
  | 'NAVIGATION'

export type Glyph =
  | 'DISC'
  | 'CUBE'
  | 'RING'
  | 'HEX'
  | 'SPHERE'
  | 'DIAMOND'
  | 'DIAMOND_WIRE'
  | 'PYRAMID'
  | 'KNOT'
  | 'CROSS'
  | 'SLAB'
  | 'SPIKE'
  | 'CUBE_WIRE'
  | 'GHOST'

export interface VisualGrammarEntry {
  readonly glyph: Glyph
  /** Text/icon channel — color is NEVER the only signal. */
  readonly icon: string
  readonly label: string
  readonly color: number
  readonly animation: AnimationClass
}

export const VISUAL_GRAMMAR: Readonly<Record<VisualState, VisualGrammarEntry>> = {
  IDLE: { glyph: 'DISC', icon: '○', label: 'IDLE', color: 0x64748b, animation: 'NONE' },
  WAITING: { glyph: 'CUBE', icon: '⏸', label: 'WAITING (not executing)', color: 0x94a3b8, animation: 'NONE' },
  ACTIVE: { glyph: 'RING', icon: '▶', label: 'ACTIVE (task state reports execution)', color: 0x38bdf8, animation: 'LIVE_ACTIVITY' },
  BLOCKED: { glyph: 'HEX', icon: '■', label: 'BLOCKED', color: 0xf59e0b, animation: 'NONE' },
  WORKER_SUCCEEDED: { glyph: 'SPHERE', icon: '◐', label: 'WORKER REPORTED SUCCESS (UNVERIFIED)', color: 0xa78bfa, animation: 'NONE' },
  VERIFIED_PASS: { glyph: 'DIAMOND', icon: '◆', label: 'VERIFIED PASS (NOT HUMAN-APPROVED)', color: 0x34d399, animation: 'NONE' },
  VERIFICATION_INCONCLUSIVE: { glyph: 'DIAMOND_WIRE', icon: '◇?', label: 'VERIFICATION INCONCLUSIVE', color: 0xfbbf24, animation: 'NONE' },
  VERIFICATION_FAILED: { glyph: 'PYRAMID', icon: '▲✖', label: 'VERIFICATION FAILED', color: 0xef4444, animation: 'ERROR' },
  AWAITING_HUMAN_APPROVAL: { glyph: 'KNOT', icon: '✋', label: 'WAITING FOR HUMAN APPROVAL', color: 0xfacc15, animation: 'ATTENTION' },
  HUMAN_APPROVED: { glyph: 'CROSS', icon: '✚', label: 'HUMAN APPROVED (no merge/deploy implied)', color: 0x22c55e, animation: 'NONE' },
  HUMAN_REJECTED: { glyph: 'SLAB', icon: '⊘', label: 'HUMAN REJECTED', color: 0xdc2626, animation: 'NONE' },
  FAILED: { glyph: 'PYRAMID', icon: '✖', label: 'FAILED', color: 0xef4444, animation: 'ERROR' },
  CANCELLED: { glyph: 'SLAB', icon: '—', label: 'CANCELLED', color: 0x6b7280, animation: 'NONE' },
  RECOVERY_REQUIRED: { glyph: 'SPIKE', icon: '⚠', label: 'RECOVERY REQUIRED', color: 0xf97316, animation: 'ERROR' },
  UNKNOWN: { glyph: 'CUBE_WIRE', icon: '?', label: 'UNKNOWN STATE (unmapped canonical state)', color: 0x9ca3af, animation: 'NONE' },
  OFFLINE_STALE: { glyph: 'GHOST', icon: '⌀', label: 'OFFLINE / STALE (last known, not current)', color: 0x475569, animation: 'NONE' },
}

// ─── Entity / Projection shapes ──────────────────────────────────────────────

export interface SpatialEntity {
  /** Deterministic, derived from canonical identity — never index-based. */
  readonly spatialEntityId: string
  readonly sourceEntityType: SourceEntityType
  readonly sourceEntityId: string
  readonly sourceRevision: number
  readonly workSessionId: string | null
  readonly runId: string | null
  readonly parentSpatialEntityId: string | null
  readonly zone: ZoneId
  readonly visualState: VisualState
  /** The pre-degradation state, kept so the inspector can show "last known". */
  readonly lastKnownVisualState: VisualState
  readonly glyph: Glyph
  readonly icon: string
  readonly statusLabel: string
  /** Extra epistemic detail (worker/verifier/human lines) for inspector + a11y. */
  readonly epistemicLines: readonly string[]
  readonly animation: AnimationClass
  /** UNTRUSTED display text. Sanitized + truncated; DOM textContent ONLY. */
  readonly label: string
  readonly position: { readonly x: number; readonly z: number }
  readonly stale: boolean
  /** Always true for entities in `entities`; decorative objects live in `decorations`. */
  readonly operational: true
  /** Present only when a pending approval gate exists for this entity. */
  readonly pendingApprovalTargetId: string | null
  readonly executionEvidence: 'EXECUTION_RECORD_RUNNING' | 'TASK_STATE_ONLY' | 'NONE'
  /** D4 Role-Bot identity projection metadata (present ONLY when sourceEntityType === 'ROLE_BOT') */
  readonly roleId?: string
  readonly roleTier?: RoleTier
  readonly roleDisplayName?: string
  readonly roleEmblem?: string
  readonly roleSilhouette?: RoleSilhouette
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

export interface DecorativeElement {
  readonly decorativeId: string
  readonly kind: 'ZONE_PLATE' | 'AMBIENT_RING'
  readonly zone: ZoneId | null
  /** Decorative objects are explicitly non-semantic and non-pickable. */
  readonly semantic: false
  readonly position: { readonly x: number; readonly z: number }
}

export interface SpatialProjection {
  readonly spatialProjectionVersion: typeof SPATIAL_PROJECTION_VERSION
  readonly layoutVersion: typeof SPATIAL_LAYOUT_VERSION
  readonly viewportClass: ViewportClass
  /** overview.canonicalRevision at generation time (CANONICAL_SOURCE_STATE copy, not authority). */
  readonly sourceRevision: number
  /** Monotonic request sequence assigned by the view at request issue time. */
  readonly fetchSequence: number
  readonly generatedAt: string | null
  readonly lastCanonicalUpdateAt: string | null
  readonly receivedAt: string
  readonly connection: ConnectionState
  readonly kernelStatus: KernelLifecycleStatus | 'UNAVAILABLE'
  readonly entities: readonly SpatialEntity[]
  readonly decorations: readonly DecorativeElement[]
  readonly empty: boolean
  readonly duplicatesCollapsed: number
  readonly mappingNotes: readonly string[]
}

export interface SpatialInput {
  readonly fetchSequence: number
  readonly receivedAt: string
  readonly connection: ConnectionState
  readonly overview: OverviewProjection | null
  readonly hierarchy: WorkHierarchyProjection | null
  readonly approvals: ApprovalQueueProjection | null
  readonly executions: ExecutionProjection | null
  readonly verifications: readonly VerificationProjection[]
  readonly system: SystemProjection | null
  /** D4 flag: set to false if role-bots should not be synthesized (defaults to true) */
  readonly includeRoleBots?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function codeUnitCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Untrusted text -> bounded, control-char-free text. Never HTML, never code. */
export function sanitizeLabel(text: unknown, max = 80): string {
  const s = typeof text === 'string' ? text : String(text ?? '')
  // eslint-disable-next-line no-control-regex
  const cleaned = s.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned.length > max ? cleaned.slice(0, max - 1) + '…' : cleaned
}

export function viewportClassFor(widthPx: number): ViewportClass {
  if (widthPx < 700) return 'COMPACT'
  if (widthPx < 1400) return 'REGULAR'
  return 'WIDE'
}

const COLUMNS: Readonly<Record<ViewportClass, number>> = { COMPACT: 2, REGULAR: 3, WIDE: 4 }
const ZONE_ORDER: readonly ZoneId[] = ['OPERATIONS', 'EXECUTION', 'VERIFICATION', 'HUMAN_GATE', 'SYSTEM']
const ZONE_SPACING_X = 12
const SLOT_SPACING = 2.2

export function zoneOriginX(zone: ZoneId): number {
  return (ZONE_ORDER.indexOf(zone) - (ZONE_ORDER.length - 1) / 2) * ZONE_SPACING_X
}

export const ZONE_DISPLAY_NAMES: Readonly<Record<ZoneId, string>> = {
  OPERATIONS: 'Operations (WorkSessions & Runs)',
  EXECUTION: 'Execution (Tasks)',
  VERIFICATION: 'Verification (Worker result / Verifier / Human decision)',
  HUMAN_GATE: 'Human Gate (needs operator)',
  SYSTEM: 'System',
}

export const OUTLINE_ZONE_ORDER: readonly ZoneId[] = ['HUMAN_GATE', 'EXECUTION', 'VERIFICATION', 'OPERATIONS', 'SYSTEM']

function spatialId(type: SourceEntityType, parts: readonly string[]): string {
  return `sp:${type}:${parts.join('/')}`
}

function mapTaskState(raw: string): VisualState {
  switch (String(raw).toUpperCase()) {
    case 'PENDING':
    case 'CREATED':
    case 'READY':
    case 'QUEUED':
      return 'WAITING'
    case 'RUNNING':
    case 'IN_PROGRESS':
    case 'EXECUTING':
    case 'ACTIVE':
      return 'ACTIVE'
    case 'BLOCKED':
      return 'BLOCKED'
    case 'COMPLETED':
    case 'SUCCEEDED':
      return 'WORKER_SUCCEEDED'
    case 'FAILED':
      return 'FAILED'
    case 'CANCELLED':
    case 'CANCELED':
      return 'CANCELLED'
    case 'RECOVERY_REQUIRED':
      return 'RECOVERY_REQUIRED'
    default:
      return 'UNKNOWN'
  }
}

function zoneForTaskState(v: VisualState): ZoneId {
  switch (v) {
    case 'WORKER_SUCCEEDED':
    case 'VERIFIED_PASS':
    case 'VERIFICATION_INCONCLUSIVE':
    case 'VERIFICATION_FAILED':
    case 'AWAITING_HUMAN_APPROVAL':
    case 'HUMAN_APPROVED':
    case 'HUMAN_REJECTED':
      return 'VERIFICATION'
    default:
      return 'EXECUTION'
  }
}

/** Aggregation priority for session/run (higher = more attention-worthy). */
const PRIORITY: readonly VisualState[] = [
  'RECOVERY_REQUIRED',
  'FAILED',
  'VERIFICATION_FAILED',
  'AWAITING_HUMAN_APPROVAL',
  'BLOCKED',
  'ACTIVE',
  'VERIFICATION_INCONCLUSIVE',
  'WAITING',
]

function aggregate(children: readonly VisualState[]): VisualState {
  for (const p of PRIORITY) if (children.includes(p)) return p
  return 'IDLE'
}

interface Draft {
  id: string
  type: SourceEntityType
  srcId: string
  rev: number
  ws: string | null
  run: string | null
  parent: string | null
  zone: ZoneId
  state: VisualState
  label: string
  lines: string[]
  pendingTarget: string | null
  execEvidence: SpatialEntity['executionEvidence']
  sortKey: string
  roleId?: string
  roleTier?: RoleTier
  roleDisplayName?: string
  roleEmblem?: string
  roleSilhouette?: RoleSilhouette
  mechanicalService?: boolean
  executorId?: string
  harnessId?: string
  surface?: string
  provider?: string
  model?: string
  processId?: string
  executionStatus?: string
  taskTitle?: string
}

// ─── Core mapping ────────────────────────────────────────────────────────────

export function projectToSpatial(input: SpatialInput, viewportClass: ViewportClass = 'REGULAR'): SpatialProjection {
  const notes: string[] = []
  const drafts = new Map<string, Draft>()
  let duplicates = 0
  const put = (d: Draft): void => {
    if (drafts.has(d.id)) {
      duplicates++
      return // first-writer-wins; identical canonical identity never creates a second entity
    }
    drafts.set(d.id, d)
  }

  const pendingByTask = new Map<string, string>() // taskId -> targetId
  const pendingItems = (input.approvals?.items ?? []).filter((i) => i.status === 'WAITING_APPROVAL')
  for (const it of pendingItems) {
    if (it.sourceTaskId) pendingByTask.set(`${it.sourceWorkSessionId}/${it.sourceTaskId}`, it.targetId)
  }
  const verifByTask = new Map<string, VerificationProjection>()
  for (const v of input.verifications) verifByTask.set(`${v.workSessionId}/${v.taskId}`, v)
  const runningExec = new Set((input.executions?.executions ?? []).filter((e) => e.status === 'RUNNING').map((e) => e.taskId))

  let lastUpdate: string | null = null

  for (const s of input.hierarchy?.sessions ?? []) {
    if (!lastUpdate || s.updatedAt > lastUpdate) lastUpdate = s.updatedAt
    const sessionSp = spatialId('WORK_SESSION', [s.id])
    const sessionChildren: VisualState[] = []

    for (const r of s.runs) {
      const runSp = spatialId('RUN', [s.id, r.id])
      const runChildren: VisualState[] = []

      for (const t of r.tasks) {
        const key = `${s.id}/${t.id}`
        const ver = verifByTask.get(key)
        const pendingTarget = pendingByTask.get(key) ?? null
        let state = mapTaskState(t.state)
        const lines: string[] = [`Worker/task state (canonical): ${t.state}`]
        const terminalBad = state === 'FAILED' || state === 'CANCELLED' || state === 'RECOVERY_REQUIRED'

        if (!terminalBad && (ver || pendingTarget)) {
          if (ver) {
            lines.push(`Verifier verdict: ${ver.verdict} (plan ${ver.planId}, independence ${ver.independenceClass})`)
            lines.push(`Human approval state: ${ver.humanApprovalState}`)
          } else {
            lines.push('Human approval state: WAITING_FOR_HUMAN_APPROVAL (from approval queue)')
          }
          if (ver?.humanApprovalState === 'HUMAN_APPROVED') state = 'HUMAN_APPROVED'
          else if (ver?.humanApprovalState === 'HUMAN_REJECTED') state = 'HUMAN_REJECTED'
          else if (pendingTarget || ver?.humanApprovalState === 'WAITING_FOR_HUMAN_APPROVAL') state = 'AWAITING_HUMAN_APPROVAL'
          else if (ver?.verdict === 'VERIFIED_PASS') state = 'VERIFIED_PASS'
          else if (ver?.verdict === 'INCONCLUSIVE') state = 'VERIFICATION_INCONCLUSIVE'
          else if (ver?.verdict === 'FAIL') state = 'VERIFICATION_FAILED'
        } else if (state === 'WORKER_SUCCEEDED') {
          lines.push('Verification: none recorded in projection (worker success is NOT verified success)')
        }
        if (state === 'UNKNOWN') notes.push(`Unmapped task state '${sanitizeLabel(t.state, 40)}' for ${t.id} rendered as UNKNOWN`)

        const execEvidence: Draft['execEvidence'] =
          state === 'ACTIVE' ? (runningExec.has(t.id) ? 'EXECUTION_RECORD_RUNNING' : 'TASK_STATE_ONLY') : 'NONE'

        put({
          id: spatialId('TASK', [s.id, r.id, t.id]),
          type: 'TASK',
          srcId: t.id,
          rev: t.revision,
          ws: s.id,
          run: r.id,
          parent: runSp,
          zone: zoneForTaskState(state),
          state,
          label: sanitizeLabel(t.title),
          lines,
          pendingTarget,
          execEvidence,
          sortKey: `${s.id}/${r.id}/${t.id}`,
        })
        runChildren.push(state)

        // D4: Project Role-Bot visual identity if enabled or execution record exists
        const exec = (input.executions?.executions ?? []).find((e) => e.taskId === t.id)
        const shouldSynthesizeBot = input.includeRoleBots === true || (input.includeRoleBots !== false && (exec !== undefined || t.assignedRoleId?.startsWith('role:strategy') || t.assignedRoleId?.startsWith('role:engineering') || t.assignedRoleId?.startsWith('role:quality') || t.assignedRoleId?.startsWith('role:governance') || t.assignedRoleId?.startsWith('role:research') || t.assignedRoleId?.startsWith('service:')))
        if (t.assignedRoleId && shouldSynthesizeBot && t.assignedRoleId !== 'role:tester') {
          const archetype = resolveRoleArchetype(t.assignedRoleId)
          const botLines: string[] = [
            `Role: ${archetype.displayName} (${archetype.roleId})`,
            `Role Tier: ${archetype.tier}`,
            `Task Assignment: ${t.id} ("${sanitizeLabel(t.title, 40)}")`,
          ]
          if (exec) {
            botLines.push(`Executor: ${exec.executorId}`)
            botLines.push(`Harness: ${exec.harnessId} (Surface: ${exec.surface})`)
            botLines.push(`Model / Provider: ${exec.model} / ${exec.provider}`)
            botLines.push(`Process: ${exec.processId} | Status: ${exec.status}`)
            botLines.push(`Qualification: ${exec.qualificationStatus} | Readiness: ${exec.readinessStatus}`)
            botLines.push(`Dispatch Auth: ${exec.dispatchAuthorization}`)
          } else {
            botLines.push('Execution Record: None recorded (role assigned, awaiting dispatch/execution)')
          }
          botLines.push('TAXONOMY BOUNDARY: Role != Executor != Harness != Model != Process')
          botLines.push('AUTHORITY BOUNDARY: Visual bot != Canonical Agent != Capability Grant != Authority')

          // Derive bot visual state
          let botVisualState: VisualState = 'IDLE'
          if (exec?.status === 'RUNNING' || state === 'ACTIVE') {
            botVisualState = 'ACTIVE'
          } else if (state === 'BLOCKED') {
            botVisualState = 'BLOCKED'
          } else if (state === 'AWAITING_HUMAN_APPROVAL') {
            botVisualState = 'AWAITING_HUMAN_APPROVAL'
          } else if (state === 'WORKER_SUCCEEDED') {
            botVisualState = 'WORKER_SUCCEEDED'
          } else if (state === 'VERIFIED_PASS' || state === 'HUMAN_APPROVED') {
            botVisualState = 'IDLE' // returned to station/idle after verified completion
          } else if (state === 'FAILED' || state === 'RECOVERY_REQUIRED') {
            botVisualState = state
          } else if (state === 'WAITING') {
            botVisualState = 'WAITING'
          }

          const botEvidence: SpatialEntity['executionEvidence'] =
            botVisualState === 'ACTIVE' ? (exec?.status === 'RUNNING' ? 'EXECUTION_RECORD_RUNNING' : 'TASK_STATE_ONLY') : 'NONE'

          put({
            id: spatialId('ROLE_BOT', [s.id, r.id, t.id, archetype.roleId]),
            type: 'ROLE_BOT',
            srcId: `${t.id}:${archetype.roleId}`,
            rev: t.revision,
            ws: s.id,
            run: r.id,
            parent: spatialId('TASK', [s.id, r.id, t.id]),
            zone: archetype.defaultZone,
            state: botVisualState,
            label: sanitizeLabel(`${archetype.emblem} ${archetype.displayName}`),
            lines: botLines,
            pendingTarget: null,
            execEvidence: botEvidence,
            sortKey: `${s.id}/${r.id}/${t.id}/bot`,
            roleId: archetype.roleId,
            roleTier: archetype.tier,
            roleDisplayName: archetype.displayName,
            roleEmblem: archetype.emblem,
            roleSilhouette: archetype.silhouette,
            mechanicalService: archetype.mechanicalService,
            executorId: exec?.executorId,
            harnessId: exec?.harnessId,
            surface: exec?.surface,
            provider: exec?.provider,
            model: exec?.model,
            processId: exec?.processId,
            executionStatus: exec?.status,
            taskTitle: t.title,
          })
        }
      }

      const runState = aggregate(runChildren)
      put({
        id: runSp,
        type: 'RUN',
        srcId: r.id,
        rev: r.revision,
        ws: s.id,
        run: r.id,
        parent: sessionSp,
        zone: 'OPERATIONS',
        state: runState,
        label: sanitizeLabel(r.goal),
        lines: [`Run state (canonical): ${r.state}`, `Tasks: ${r.tasks.length}`],
        pendingTarget: null,
        execEvidence: 'NONE',
        sortKey: `${s.id}/${r.id}`,
      })
      sessionChildren.push(runState)
    }

    put({
      id: sessionSp,
      type: 'WORK_SESSION',
      srcId: s.id,
      rev: s.revision,
      ws: s.id,
      run: null,
      parent: null,
      zone: 'OPERATIONS',
      state: aggregate(sessionChildren),
      label: sanitizeLabel(s.id),
      lines: [`WorkSession state (canonical): ${s.state}`, `Runs: ${s.runs.length}`],
      pendingTarget: null,
      execEvidence: 'NONE',
      sortKey: s.id,
    })
  }

  for (const it of pendingItems) {
    const taskSp =
      it.sourceTaskId && it.sourceRunId
        ? spatialId('TASK', [it.sourceWorkSessionId, it.sourceRunId, it.sourceTaskId])
        : null
    put({
      id: spatialId('APPROVAL_GATE', [it.queueItemId]),
      type: 'APPROVAL_GATE',
      srcId: it.queueItemId,
      rev: it.currentRevision,
      ws: it.sourceWorkSessionId,
      run: it.sourceRunId ?? null,
      parent: taskSp,
      zone: 'HUMAN_GATE',
      state: 'AWAITING_HUMAN_APPROVAL',
      label: sanitizeLabel(`${it.itemType} ${it.targetId}`),
      lines: [
        `Approval item type: ${it.itemType}`,
        `Technical outcome (untrusted text): ${sanitizeLabel(it.technicalOutcome, 120)}`,
        'Decision is recorded ONLY in the Command Center approval UI.',
      ],
      pendingTarget: it.targetId,
      execEvidence: 'NONE',
      sortKey: it.queueItemId,
    })
  }

  // System entity: truthful kernel health.
  const kernelStatus: SpatialProjection['kernelStatus'] = input.system?.kernelStatus ?? input.overview?.kernelStatus ?? 'UNAVAILABLE'
  put({
    id: spatialId('SYSTEM', ['kernel']),
    type: 'SYSTEM',
    srcId: 'kernel',
    rev: input.overview?.canonicalRevision ?? 0,
    ws: null,
    run: null,
    parent: null,
    zone: 'SYSTEM',
    state: kernelStatus === 'READY' ? 'IDLE' : kernelStatus === 'DEGRADED' ? 'BLOCKED' : 'OFFLINE_STALE',
    label: `Kernel ${kernelStatus}`,
    lines: [
      `Kernel status (canonical): ${kernelStatus}`,
      input.system ? `Kernel PID ${input.system.kernelPid} / Main PID ${input.system.mainPid}` : 'System projection unavailable',
    ],
    pendingTarget: null,
    execEvidence: 'NONE',
    sortKey: 'kernel',
  })

  // Layout: stable ID-ordered slots per zone.
  const cols = COLUMNS[viewportClass]
  const byZone = new Map<ZoneId, Draft[]>()
  for (const d of drafts.values()) {
    const arr = byZone.get(d.zone) ?? []
    arr.push(d)
    byZone.set(d.zone, arr)
  }
  const degraded = input.connection !== 'LIVE'
  const entities: SpatialEntity[] = []
  for (const zone of ZONE_ORDER) {
    const arr = (byZone.get(zone) ?? []).sort((a, b) => codeUnitCompare(a.sortKey, b.sortKey) || codeUnitCompare(a.id, b.id))
    arr.forEach((d, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const effective: VisualState = degraded && d.type !== 'SYSTEM' ? 'OFFLINE_STALE' : d.state
      const g = VISUAL_GRAMMAR[effective]
      const anim: AnimationClass = degraded ? 'NONE' : g.animation
      entities.push({
        spatialEntityId: d.id,
        sourceEntityType: d.type,
        sourceEntityId: d.srcId,
        sourceRevision: d.rev,
        workSessionId: d.ws,
        runId: d.run,
        parentSpatialEntityId: d.parent,
        zone,
        visualState: effective,
        lastKnownVisualState: d.state,
        glyph: g.glyph,
        icon: g.icon,
        statusLabel: degraded && d.type !== 'SYSTEM' ? `${g.label} — last known: ${VISUAL_GRAMMAR[d.state].label}` : g.label,
        epistemicLines: d.lines,
        animation: anim,
        label: d.label,
        position: { x: zoneOriginX(zone) + (col - (cols - 1) / 2) * SLOT_SPACING, z: row * SLOT_SPACING },
        stale: degraded,
        operational: true,
        pendingApprovalTargetId: d.pendingTarget,
        executionEvidence: degraded ? 'NONE' : d.execEvidence,
        roleId: d.roleId,
        roleTier: d.roleTier,
        roleDisplayName: d.roleDisplayName,
        roleEmblem: d.roleEmblem,
        roleSilhouette: d.roleSilhouette,
        mechanicalService: d.mechanicalService,
        executorId: d.executorId,
        harnessId: d.harnessId,
        surface: d.surface,
        provider: d.provider,
        model: d.model,
        processId: d.processId,
        executionStatus: d.executionStatus,
        taskTitle: d.taskTitle,
      })
    })
  }

  const decorations: DecorativeElement[] = [
    ...ZONE_ORDER.map((z) => ({
      decorativeId: `deco:plate:${z}`,
      kind: 'ZONE_PLATE' as const,
      zone: z,
      semantic: false as const,
      position: { x: zoneOriginX(z), z: 0 },
    })),
    { decorativeId: 'deco:ambient-ring', kind: 'AMBIENT_RING' as const, zone: null, semantic: false as const, position: { x: 0, z: -6 } },
  ]

  const operationalNonSystem = entities.filter((e) => e.sourceEntityType !== 'SYSTEM').length
  return {
    spatialProjectionVersion: SPATIAL_PROJECTION_VERSION,
    layoutVersion: SPATIAL_LAYOUT_VERSION,
    viewportClass,
    sourceRevision: input.overview?.canonicalRevision ?? 0,
    fetchSequence: input.fetchSequence,
    generatedAt: input.overview?.generatedAt ?? null,
    lastCanonicalUpdateAt: lastUpdate,
    receivedAt: input.receivedAt,
    connection: input.connection,
    kernelStatus,
    entities,
    decorations,
    empty: operationalNonSystem === 0,
    duplicatesCollapsed: duplicates,
    mappingNotes: notes,
  }
}

// ─── Ordering / staleness ────────────────────────────────────────────────────

export interface AcceptDecision {
  readonly accepted: boolean
  readonly reason: 'FIRST' | 'NEWER_REVISION' | 'NEWER_SEQUENCE' | 'STALE_REVISION' | 'STALE_SEQUENCE'
}

/**
 * Revision ordering. D1 task revisions are constant in the current KernelHost, so the canonical
 * `sourceRevision` alone cannot order task-state changes; the view-assigned `fetchSequence`
 * breaks ties. A projection that arrives later but was REQUESTED earlier can never roll the world back.
 */
export function decideAcceptance(current: SpatialProjection | null, next: SpatialProjection): AcceptDecision {
  if (!current) return { accepted: true, reason: 'FIRST' }
  if (next.sourceRevision < current.sourceRevision) return { accepted: false, reason: 'STALE_REVISION' }
  if (next.sourceRevision > current.sourceRevision) return { accepted: true, reason: 'NEWER_REVISION' }
  if (next.fetchSequence <= current.fetchSequence) return { accepted: false, reason: 'STALE_SEQUENCE' }
  return { accepted: true, reason: 'NEWER_SEQUENCE' }
}

/** Re-project the last accepted input with a degraded connection; keeps ordering keys unchanged. */
export function degradeProjection(current: SpatialProjection, connection: ConnectionState): SpatialProjection {
  if (connection === 'LIVE') return current
  const entities = current.entities.map((e) => {
    if (e.sourceEntityType === 'SYSTEM') return e
    const g = VISUAL_GRAMMAR.OFFLINE_STALE
    return {
      ...e,
      visualState: 'OFFLINE_STALE' as const,
      lastKnownVisualState: e.stale ? e.lastKnownVisualState : e.visualState,
      glyph: g.glyph,
      icon: g.icon,
      statusLabel: `${g.label} — last known: ${VISUAL_GRAMMAR[e.stale ? e.lastKnownVisualState : e.visualState].label}`,
      animation: 'NONE' as const,
      stale: true,
      executionEvidence: 'NONE' as const,
    }
  })
  return { ...current, connection, entities }
}

// ─── Selection (identity only; carries NO authority) ─────────────────────────

export interface SelectionResolution {
  readonly spatialEntityId: string
  readonly sourceEntityType: SourceEntityType
  readonly sourceEntityId: string
  readonly sourceRevision: number
  readonly workSessionId: string | null
  readonly runId: string | null
  readonly zone: ZoneId
  /** Which existing D1 read-only query can inspect it. */
  readonly inspectVia: 'getTaskDetail' | 'getWorkHierarchy' | 'getApprovalQueue' | 'getSystem'
}

export function resolveSelection(p: SpatialProjection, spatialEntityId: string): SelectionResolution | null {
  const e = p.entities.find((x) => x.spatialEntityId === spatialEntityId)
  if (!e) return null
  return {
    spatialEntityId: e.spatialEntityId,
    sourceEntityType: e.sourceEntityType,
    sourceEntityId: e.sourceEntityId,
    sourceRevision: e.sourceRevision,
    workSessionId: e.workSessionId,
    runId: e.runId,
    zone: e.zone,
    inspectVia:
      e.sourceEntityType === 'TASK' || e.sourceEntityType === 'ROLE_BOT'
        ? 'getTaskDetail'
        : e.sourceEntityType === 'APPROVAL_GATE'
        ? 'getApprovalQueue'
        : e.sourceEntityType === 'SYSTEM'
        ? 'getSystem'
        : 'getWorkHierarchy',
  }
}

// ─── Semantic outline (accessible equivalent) ────────────────────────────────

export type OutlineAction = 'INSPECT' | 'INSPECT_AND_OPEN_APPROVAL_UI'

export interface OutlineItem {
  readonly spatialEntityId: string
  readonly name: string
  readonly type: SourceEntityType
  readonly canonicalId: string
  readonly status: string
  readonly icon: string
  readonly relationship: string
  readonly zone: ZoneId
  readonly stale: boolean
  readonly action: OutlineAction
}

export interface OutlineGroup {
  readonly zone: ZoneId
  readonly title: string
  readonly items: readonly OutlineItem[]
}

/** Only meaningful entities. Decorations are never included. */
export function buildOutline(p: SpatialProjection): readonly OutlineGroup[] {
  return OUTLINE_ZONE_ORDER.map((zone) => ({
    zone,
    title: ZONE_DISPLAY_NAMES[zone],
    items: p.entities
      .filter((e) => e.zone === zone)
      .map((e) => ({
        spatialEntityId: e.spatialEntityId,
        name: e.label,
        type: e.sourceEntityType,
        canonicalId: e.sourceEntityId,
        status: e.statusLabel,
        icon: e.icon,
        relationship: e.workSessionId
          ? `WorkSession ${e.workSessionId}${e.runId ? ` › Run ${e.runId}` : ''}`
          : 'System',
        zone: e.zone,
        stale: e.stale,
        action: (e.pendingApprovalTargetId ? 'INSPECT_AND_OPEN_APPROVAL_UI' : 'INSPECT') as OutlineAction,
      })),
  }))
}

// ─── Performance fixtures (definitions only; no performance guarantee) ───────

export type PerformanceFixtureKind = 'IDLE' | 'SMALL' | 'MEDIUM' | 'STRESS'

export const PERFORMANCE_FIXTURE_DEFINITIONS: Readonly<
  Record<PerformanceFixtureKind, { sessions: number; runsPerSession: number; tasksPerRun: number; note: string }>
> = {
  IDLE: { sessions: 0, runsPerSession: 0, tasksPerRun: 0, note: 'No work; system entity only' },
  SMALL: { sessions: 1, runsPerSession: 2, tasksPerRun: 3, note: '1 session, 2 runs, 6 tasks' },
  MEDIUM: { sessions: 5, runsPerSession: 4, tasksPerRun: 5, note: '5 sessions, 20 runs, 100 tasks' },
  STRESS: { sessions: 20, runsPerSession: 5, tasksPerRun: 8, note: '20 sessions, 100 runs, 800 tasks' },
}

const FIXTURE_TASK_STATES = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'BLOCKED', 'RECOVERY_REQUIRED']

/** Deterministic, clearly synthetic canonical-shaped input. IDs prefixed `fx_`. */
export function buildPerformanceFixture(kind: PerformanceFixtureKind, fetchSequence = 1): SpatialInput {
  const d = PERFORMANCE_FIXTURE_DEFINITIONS[kind]
  const now = '2026-01-01T00:00:00.000Z'
  const sessions = []
  let tasks = 0
  let runs = 0
  for (let si = 0; si < d.sessions; si++) {
    const sid = `fx_ws_${String(si).padStart(3, '0')}`
    const runList = []
    for (let ri = 0; ri < d.runsPerSession; ri++) {
      const rid = `fx_run_${String(si).padStart(3, '0')}_${ri}`
      const taskList = []
      for (let ti = 0; ti < d.tasksPerRun; ti++) {
        const tid = `fx_task_${String(si).padStart(3, '0')}_${ri}_${ti}`
        const roleCandidates = [
          'role:strategy:chief-planner',
          'role:engineering:frontend-engineer',
          'role:engineering:backend-engineer',
          'role:quality:independent-reviewer',
          'role:research:technical-researcher',
          'service:verification:deterministic-runner',
        ]
        const assignedRole = roleCandidates[(si + ri + ti) % roleCandidates.length]!
        taskList.push({
          id: tid,
          runId: rid,
          workSessionId: sid,
          title: `Fixture task ${ti}`,
          state: FIXTURE_TASK_STATES[(si + ri + ti) % FIXTURE_TASK_STATES.length]!,
          assignedRoleId: assignedRole,
          requiresApproval: false,
          createdAt: now,
          updatedAt: now,
          revision: 1,
        })
        tasks++
      }
        runs++
        runList.push({ id: rid, workSessionId: sid, goal: `Fixture run ${ri}`, state: 'ACTIVE', createdAt: now, tasks: taskList, revision: 1 })
      }
      sessions.push({ id: sid, state: 'ACTIVE', revision: 1 + d.runsPerSession * d.tasksPerRun, createdAt: now, updatedAt: now, runs: runList })
    }
    const sampleExecutions: ExecutionItem[] = []
    if (tasks > 0) {
      // Create execution records for the first few tasks
      const sampleCount = Math.min(tasks, 12)
      for (let i = 0; i < sampleCount; i++) {
        sampleExecutions.push({
          executionId: `fx_exec_${i}`,
          taskId: `fx_task_000_0_${i % d.tasksPerRun}`,
          roleId: 'role:engineering:backend-engineer',
          executorId: `exec_worker_${i}`,
          harnessId: i % 2 === 0 ? 'harness:codex:node' : 'harness:claude-code:cli',
          surface: 'CLI_CONTAINED',
          provider: 'anthropic',
          model: 'claude-3-7-sonnet',
          processId: `pid_${5000 + i}`,
          qualificationStatus: 'QUALIFIED',
          readinessStatus: 'READY',
          costEligibility: 'FREE_OPEN_SOURCE_LOCAL',
          dispatchAuthorization: 'AUTHORIZED',
          grantedCapabilities: ['FS_READ', 'FS_WRITE'],
          status: i === 0 ? 'RUNNING' : 'COMPLETED',
          startedAt: now,
          boundedOutput: `Execution ${i} output`,
        })
      }
    }
  return {
    fetchSequence,
    receivedAt: now,
    connection: 'LIVE',
    overview: {
      kernelStatus: 'READY',
      activeWorkSessionsCount: d.sessions,
      activeRunsCount: runs,
      activeTasksCount: tasks,
      waitingApprovalCount: 0,
      failedOrRecoveryCount: 0,
      runningExecutionsCount: 0,
      blockedAuthorityCount: 0,
      blockedCostCount: 0,
      generatedAt: now,
      canonicalRevision: 1 + d.sessions,
      recentActivitySummary: [],
    },
    hierarchy: { canonicalAuthority: 'KERNEL_UTILITY_PROCESS', generatedAt: now, sessions },
    approvals: { generatedAt: now, totalPending: 0, items: [] },
    executions: { generatedAt: now, executions: sampleExecutions },
    verifications: [],
    system: null,
  }
}
