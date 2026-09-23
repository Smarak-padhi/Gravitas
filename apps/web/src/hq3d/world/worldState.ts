/**
 * Gravitas 3D Headquarters — Pure World State Projection Domain (Wave 12C)
 *
 * Implements the pure, deterministic adapter:
 * AUTHORITATIVE SERVER TRUTH -> PURE WORLD PROJECTION -> STABLE SCENE RECONCILIATION
 *
 * Core Rules:
 * - 100% pure, deterministic, side-effect free (no Three.js, DOM, fetch, Date.now, timers).
 * - Distinguishes active execution truth (RuntimeProjectionSnapshot) from durable lifecycle truth (canonical Tasks).
 * - Physical locations strictly follow semantic truth (e.g. FAILURE_HOLD, COMPLETED_TRAY, PLANNING_AREA).
 * - Multi-route gateway aggregation on infrastructure state.
 * - Presentation station mapping abstracted via StationMappingConfig (null for unknown workers -> NEUTRAL_HOLD).
 */

import type { AgentRole, Task, TaskState } from '@gravitas/core'
import type {
  RuntimeProjectionSnapshot,
  RuntimeTaskPhase,
  RuntimeTaskProjection,
} from '../../api/types.js'
import type { RoomId, StationId } from '../types.js'
import { STATION_DEFINITIONS } from './stations.js'
import { getStationForCanonicalRole } from '../roles/roles.js'
import { LEGACY_ROLE_COMPATIBILITY_MAPPING } from '../roles/roleStationMapping.js'

// ─── Physical Location Semantics ──────────────────────────────────────────────

export type PhysicalLocation =
  | 'PLANNING_AREA'         // Canonical READY / queued with no execution ownership
  | 'ASSIGNED_WORKSTATION'  // PREPARING or WORKER_RUNNING at worker desk
  | 'VERIFICATION_BENCH'   // Deterministic verifier running
  | 'BROWSER_QA_MATRIX'     // Playwright Browser QA running
  | 'APPROVAL_PLINTH'       // Canonical WAITING_APPROVAL
  | 'FAILURE_HOLD'          // Canonical FAILED (never rejected chute without human rejection)
  | 'COMPLETED_TRAY'        // Canonical SUCCEEDED / COMPLETED (never archived base repo without proof)
  | 'NEUTRAL_HOLD'          // Unassigned / unknown station fallback

// ─── Semantic Station Statuses (Zero Color Definitions) ─────────────────────────

export type StationStatus =
  | 'IDLE'
  | 'ACTIVE'
  | 'VERIFYING'
  | 'BROWSER_QA'
  | 'WAITING_APPROVAL'
  | 'FAILED'
  | 'COMPLETED'

// ─── World Task State ──────────────────────────────────────────────────────────

export interface WorldRouteProvenance {
  readonly transport: 'DIRECT' | 'GATEWAY'
  readonly gatewayId?: string | null | undefined
  readonly active: boolean
  readonly requestedProvider?: string | null | undefined
  readonly requestedModel?: string | null | undefined
  readonly actualProvider?: string | null | undefined
  readonly actualModel?: string | null | undefined
  readonly providerFallbackOccurred: boolean
  readonly transportFallbackOccurred: boolean
}

export interface WorldTaskState {
  readonly id: string
  readonly title: string
  readonly canonicalState: TaskState
  readonly runtimePhase?: RuntimeTaskPhase | undefined
  readonly physicalLocation: PhysicalLocation
  readonly assignedStationId?: StationId | string | null | undefined
  readonly roleId?: string | null | undefined
  readonly roleSource?: 'CANONICAL' | 'LEGACY_COMPATIBILITY' | null | undefined
  readonly harnessId?: string | null | undefined
  readonly workerId?: string | null | undefined
  readonly routeProvenance?: WorldRouteProvenance | undefined
}

// ─── World Station State ───────────────────────────────────────────────────────

export interface WorldStationState {
  readonly id: StationId
  readonly roomId: RoomId
  readonly status: StationStatus
  readonly activeTaskId?: string | null | undefined
  readonly activeRoleId?: string | null | undefined
  readonly workerIdentity?: string | null | undefined
  readonly activeRoute?: WorldRouteProvenance | undefined
}

// ─── Multi-Route Gateway Infrastructure State ─────────────────────────────────

export interface WorldGatewayInfraState {
  readonly gatewayId: string
  readonly active: boolean
  readonly activeTaskIds: readonly string[]
  readonly activeRouteCount: number
  readonly warningState: {
    readonly providerFallbackOccurred: boolean
    readonly transportFallbackOccurred: boolean
  }
}

export interface WorldInfraState {
  readonly gateways: Readonly<Record<string, WorldGatewayInfraState>>
}

// ─── Revision Identity (Authoritative + Deterministic Cache Key) ───────────────

export interface WorldRevisionIdentity {
  readonly projectionEpoch: string
  readonly projectionRevision: number
  readonly canonicalTaskFingerprint: string // deterministic client cache key only
}

// ─── World Handoff State (Wave 12F) ──────────────────────────────────────────

export interface WorldHandoffState {
  readonly id: string
  readonly kind: 'DEPENDENCY' | 'REVIEW' | 'INTEGRATION' | 'VERIFICATION' | 'APPROVAL'
  readonly sourceTaskId: string
  readonly targetTaskId: string
  readonly sourceStationId?: StationId | null | undefined
  readonly targetStationId?: StationId | null | undefined
  readonly sourceRoleId?: string | null | undefined
  readonly targetRoleId?: string | null | undefined
  readonly state: 'BLOCKED' | 'READY' | 'IN_PROGRESS' | 'SATISFIED' | 'FAILED'
  readonly reasonCode?: string | undefined
}

// ─── World State (Presentation-Only Domain Contract) ──────────────────────────

export interface WorldState {
  readonly revisionIdentity: WorldRevisionIdentity
  readonly stations: Readonly<Record<StationId, WorldStationState>>
  readonly tasks: Readonly<Record<string, WorldTaskState>>
  readonly handoffs: readonly WorldHandoffState[]
  readonly infrastructure: WorldInfraState
  readonly alertLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL'
}

// ─── Station Mapping Strategy (Abstracted for Wave 12C.5) ─────────────────────

export interface StationMappingConfig {
  readonly resolveStationId: (task: {
    readonly taskId: string
    readonly workerId?: string | null | undefined
    readonly role?: AgentRole | string | undefined
  }) => StationId | null | undefined
}

export const DEFAULT_STATION_MAPPING: StationMappingConfig = {
  resolveStationId: ({ workerId }) => {
    if (!workerId) return null
    const norm = workerId.toLowerCase()
    if (norm.includes('codex')) return 'codex-workstation'
    if (norm.includes('fcc') || norm.includes('claude')) return 'fcc-workstation'
    // Unknown workers explicitly do not default to Codex/FCC to prevent fake occupancy
    return null
  },
}

// ─── Canonical Task Fingerprint ───────────────────────────────────────────────

export function computeCanonicalTaskFingerprint(tasks: readonly Task[]): string {
  if (!tasks || tasks.length === 0) return 'empty'
  return tasks
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((t) => `${t.id}:${t.state}:${t.updatedAt || ''}`)
    .join(';')
}

// ─── Pure World State Derivation ──────────────────────────────────────────────

export interface DeriveWorldStateInput {
  readonly projection: RuntimeProjectionSnapshot
  readonly tasks: readonly Task[]
  readonly run?: { readonly id: string; readonly status: string } | null | undefined
  readonly stationMapping?: StationMappingConfig | undefined
}

export function deriveWorldState(input: DeriveWorldStateInput): WorldState {
  const { projection, tasks, stationMapping = DEFAULT_STATION_MAPPING } = input

  // 1. Initialize stations to IDLE based on architectural definitions
  const stations: Record<StationId, WorldStationState> = {} as Record<
    StationId,
    WorldStationState
  >
  for (const def of Object.values(STATION_DEFINITIONS)) {
    stations[def.id] = {
      id: def.id,
      roomId: def.roomId,
      status: 'IDLE',
      activeTaskId: null,
      workerIdentity: null,
      activeRoute: undefined,
    }
  }

  // 2. Build quick-lookup maps
  const activeTaskMap = new Map<string, RuntimeTaskProjection>()
  if (projection?.activeTasks) {
    for (const at of projection.activeTasks) {
      activeTaskMap.set(at.taskId, at)
    }
  }

  const canonicalTaskMap = new Map<string, Task>()
  if (tasks) {
    for (const ct of tasks) {
      canonicalTaskMap.set(ct.id, ct)
    }
  }

  // 3. Reconcile tasks (combining active projection + durable canonical lifecycle)
  const worldTasks: Record<string, WorldTaskState> = {}

  // Process all canonical tasks first
  for (const ct of canonicalTaskMap.values()) {
    const activeProj = activeTaskMap.get(ct.id)
    const workerId = activeProj?.workerIdentity ?? null
    const harnessId = activeProj?.harnessId ?? workerId

    // Section B12: Canonical Role vs Legacy Mapping
    // 1. Check for canonical role identity from active projection, task assignment, or requirement
    const canonicalRoleId =
      activeProj?.roleId ??
      (ct as any).roleAssignment?.roleId ??
      (ct as any).roleRequirement?.requiredRoleId ??
      (typeof ct.role === 'string' && ct.role.startsWith('role:') ? ct.role : null)

    let assignedStationId: StationId | null | undefined = null
    let roleId: string | null = null
    let roleSource: 'CANONICAL' | 'LEGACY_COMPATIBILITY' | null = null

    if (canonicalRoleId) {
      roleId = canonicalRoleId
      roleSource = 'CANONICAL'
      const canonicalStation = getStationForCanonicalRole(canonicalRoleId)
      assignedStationId = ((ct as any).assignedStationId as StationId) ?? (canonicalStation as StationId) ?? null
    } else {
      assignedStationId = stationMapping.resolveStationId({
        taskId: ct.id,
        workerId,
        role: ct.role,
      })
      if (assignedStationId && LEGACY_ROLE_COMPATIBILITY_MAPPING[assignedStationId]) {
        roleId = LEGACY_ROLE_COMPATIBILITY_MAPPING[assignedStationId]
        roleSource = 'LEGACY_COMPATIBILITY'
      }
    }

    let physicalLocation: PhysicalLocation = 'NEUTRAL_HOLD'
    let routeProvenance: WorldRouteProvenance | undefined = undefined

    if (activeProj) {
      // Task is actively running in runtime projection
      const phase = activeProj.phase
      const route = activeProj.route

      if (route) {
        routeProvenance = {
          transport: route.transport,
          gatewayId: route.gatewayId ?? null,
          active: route.active,
          requestedProvider: route.requestedProvider ?? null,
          requestedModel: route.requestedModel ?? null,
          actualProvider: route.actualProvider ?? (route.requestedProvider ? 'UNKNOWN' : null),
          actualModel: route.actualModel ?? (route.requestedModel ? 'UNKNOWN' : null),
          providerFallbackOccurred: route.providerFallbackOccurred ?? false,
          transportFallbackOccurred: route.transportFallbackOccurred ?? false,
        }
      }

      if (phase === 'PREPARING') {
        if (assignedStationId) {
          physicalLocation = 'ASSIGNED_WORKSTATION'
          stations[assignedStationId] = {
            ...stations[assignedStationId],
            status: 'ACTIVE',
            activeTaskId: ct.id,
            activeRoleId: roleId,
            workerIdentity: workerId,
            activeRoute: routeProvenance,
          }
        } else {
          physicalLocation = 'NEUTRAL_HOLD'
        }
      } else if (phase === 'WORKER_RUNNING') {
        if (assignedStationId) {
          physicalLocation = 'ASSIGNED_WORKSTATION'
          stations[assignedStationId] = {
            ...stations[assignedStationId],
            status: 'ACTIVE',
            activeTaskId: ct.id,
            activeRoleId: roleId,
            workerIdentity: workerId,
            activeRoute: routeProvenance,
          }
        } else {
          physicalLocation = 'NEUTRAL_HOLD'
        }
      } else if (phase === 'CLEANUP') {
        if (assignedStationId) {
          physicalLocation = 'ASSIGNED_WORKSTATION'
          stations[assignedStationId] = {
            ...stations[assignedStationId],
            status: 'ACTIVE',
            activeTaskId: ct.id,
            activeRoleId: roleId,
            workerIdentity: workerId,
            activeRoute: routeProvenance,
          }
        }
      } else if (phase === 'VERIFYING') {
        physicalLocation = 'VERIFICATION_BENCH'
        stations['verifier-console'] = {
          ...stations['verifier-console'],
          status: 'VERIFYING',
          activeTaskId: ct.id,
          workerIdentity: 'verifier',
          activeRoute: routeProvenance,
        }
      } else if (phase === 'BROWSER_QA') {
        physicalLocation = 'BROWSER_QA_MATRIX'
        stations['browser-qa-matrix'] = {
          ...stations['browser-qa-matrix'],
          status: 'BROWSER_QA',
          activeTaskId: ct.id,
          workerIdentity: 'browser-qa',
          activeRoute: routeProvenance,
        }
      }
    } else {
      // Terminal or non-active lifecycle states
      switch (ct.state) {
        case 'READY': {
          physicalLocation = 'PLANNING_AREA'
          stations['planning-table'] = {
            ...stations['planning-table'],
            status: 'ACTIVE',
            activeTaskId: ct.id,
          }
          break
        }
        case 'WAITING_APPROVAL': {
          physicalLocation = 'APPROVAL_PLINTH'
          stations['approval-plinth'] = {
            ...stations['approval-plinth'],
            status: 'WAITING_APPROVAL',
            activeTaskId: ct.id,
          }
          break
        }
        case 'FAILED': {
          physicalLocation = 'FAILURE_HOLD'
          break
        }
        case 'SUCCEEDED':
        case 'APPROVED': {
          physicalLocation = 'COMPLETED_TRAY'
          stations['repository-vault'] = {
            ...stations['repository-vault'],
            status: 'COMPLETED',
            activeTaskId: ct.id,
          }
          break
        }
        default: {
          physicalLocation = 'NEUTRAL_HOLD'
          break
        }
      }
    }

    worldTasks[ct.id] = {
      id: ct.id,
      title: ct.title,
      canonicalState: ct.state,
      runtimePhase: activeProj?.phase,
      physicalLocation,
      assignedStationId: assignedStationId ?? null,
      roleId,
      roleSource,
      harnessId,
      workerId,
      routeProvenance,
    }
  }

  // Also catch any orphan active projection tasks not yet in canonical list
  for (const at of activeTaskMap.values()) {
    if (!worldTasks[at.taskId]) {
      const canonicalRoleId = at.roleId ?? null
      let assignedStationId: StationId | null | undefined = null
      let roleId: string | null = null
      let roleSource: 'CANONICAL' | 'LEGACY_COMPATIBILITY' | null = null

      if (canonicalRoleId) {
        roleId = canonicalRoleId
        roleSource = 'CANONICAL'
        const canonicalStation = getStationForCanonicalRole(canonicalRoleId)
        assignedStationId = (canonicalStation as StationId) ?? null
      } else {
        assignedStationId = stationMapping.resolveStationId({
          taskId: at.taskId,
          workerId: at.workerIdentity,
        })
        if (assignedStationId && LEGACY_ROLE_COMPATIBILITY_MAPPING[assignedStationId]) {
          roleId = LEGACY_ROLE_COMPATIBILITY_MAPPING[assignedStationId]
          roleSource = 'LEGACY_COMPATIBILITY'
        }
      }

      worldTasks[at.taskId] = {
        id: at.taskId,
        title: `Task ${at.taskId}`,
        canonicalState: 'RUNNING',
        runtimePhase: at.phase,
        physicalLocation: assignedStationId ? 'ASSIGNED_WORKSTATION' : 'NEUTRAL_HOLD',
        assignedStationId: assignedStationId ?? null,
        roleId,
        roleSource,
        harnessId: at.harnessId ?? at.workerIdentity ?? null,
        workerId: at.workerIdentity ?? null,
        routeProvenance: at.route
          ? {
              transport: at.route.transport,
              gatewayId: at.route.gatewayId ?? null,
              active: at.route.active,
              requestedProvider: at.route.requestedProvider ?? null,
              requestedModel: at.route.requestedModel ?? null,
              actualProvider: at.route.actualProvider ?? (at.route.requestedProvider ? 'UNKNOWN' : null),
              actualModel: at.route.actualModel ?? (at.route.requestedModel ? 'UNKNOWN' : null),
              providerFallbackOccurred: at.route.providerFallbackOccurred ?? false,
              transportFallbackOccurred: at.route.transportFallbackOccurred ?? false,
            }
          : undefined,
      }
    }
  }

  // 4. Multi-Route Gateway Infrastructure Aggregation
  const gatewayMap: Record<string, {
    active: boolean
    activeTaskIds: string[]
    activeRouteCount: number
    providerFallbackOccurred: boolean
    transportFallbackOccurred: boolean
  }> = {}

  let anyProviderFallback = false
  let anyTransportFallback = false

  for (const at of activeTaskMap.values()) {
    if (at.route?.transport === 'GATEWAY') {
      const gid = at.route.gatewayId ?? 'omniroute-local'
      if (!gatewayMap[gid]) {
        gatewayMap[gid] = {
          active: false,
          activeTaskIds: [],
          activeRouteCount: 0,
          providerFallbackOccurred: false,
          transportFallbackOccurred: false,
        }
      }

      if (at.route.active) {
        gatewayMap[gid].active = true
        gatewayMap[gid].activeTaskIds.push(at.taskId)
        gatewayMap[gid].activeRouteCount += 1
      }

      if (at.route.providerFallbackOccurred) {
        gatewayMap[gid].providerFallbackOccurred = true
        anyProviderFallback = true
      }
      if (at.route.transportFallbackOccurred) {
        gatewayMap[gid].transportFallbackOccurred = true
        anyTransportFallback = true
      }
    } else if (at.route?.transportFallbackOccurred) {
      anyTransportFallback = true
    }
  }

  const finalGateways: Record<string, WorldGatewayInfraState> = {}
  for (const [gid, gstate] of Object.entries(gatewayMap)) {
    finalGateways[gid] = {
      gatewayId: gid,
      active: gstate.active,
      activeTaskIds: Object.freeze(gstate.activeTaskIds),
      activeRouteCount: gstate.activeRouteCount,
      warningState: Object.freeze({
        providerFallbackOccurred: gstate.providerFallbackOccurred,
        transportFallbackOccurred: gstate.transportFallbackOccurred,
      }),
    }
  }

  // Update omniroute-rack station status based strictly on active gateway routes
  const omniGateway = finalGateways['omniroute-local']
  if (omniGateway && omniGateway.active) {
    stations['omniroute-rack'] = {
      ...stations['omniroute-rack'],
      status: 'ACTIVE',
      activeTaskId: omniGateway.activeTaskIds[0] ?? null,
      activeRoute: {
        transport: 'GATEWAY',
        gatewayId: 'omniroute-local',
        active: true,
        providerFallbackOccurred: omniGateway.warningState.providerFallbackOccurred,
        transportFallbackOccurred: omniGateway.warningState.transportFallbackOccurred,
      },
    }
  }

  // Update dispatch-console station status based on background jobs & runs
  const recentRuns = projection?.recentJobRuns ?? []
  const backgroundJobs = projection?.backgroundJobs ?? []
  const runningRun = recentRuns.find((r) => r.status === 'RUNNING')
  const waitingRun = recentRuns.find((r) => r.status === 'WAITING_APPROVAL')
  const hasFailedRun = recentRuns.some((r) => r.status === 'FAILED')

  if (runningRun) {
    stations['dispatch-console'] = {
      ...stations['dispatch-console'],
      status: 'ACTIVE',
      activeTaskId: runningRun.jobId,
    }
  } else if (waitingRun) {
    stations['dispatch-console'] = {
      ...stations['dispatch-console'],
      status: 'WAITING_APPROVAL',
      activeTaskId: waitingRun.jobId,
    }
  } else if (hasFailedRun) {
    stations['dispatch-console'] = {
      ...stations['dispatch-console'],
      status: 'FAILED',
    }
  } else if (backgroundJobs.some((j) => j.status === 'ENABLED')) {
    stations['dispatch-console'] = {
      ...stations['dispatch-console'],
      status: 'IDLE',
    }
  }

  // 5. Derive canonical handoffs
  const worldHandoffs: WorldHandoffState[] = []
  if (projection?.handoffs && projection.handoffs.length > 0) {
    for (const h of projection.handoffs) {
      const sourceStationId = h.sourceRoleId
        ? ((getStationForCanonicalRole(h.sourceRoleId) as StationId) ?? null)
        : null
      const targetStationId = h.targetRoleId
        ? ((getStationForCanonicalRole(h.targetRoleId) as StationId) ?? null)
        : null

      worldHandoffs.push({
        id: h.handoffId,
        kind: h.kind,
        sourceTaskId: h.sourceTaskId,
        targetTaskId: h.targetTaskId,
        sourceStationId,
        targetStationId,
        sourceRoleId: h.sourceRoleId,
        targetRoleId: h.targetRoleId,
        state: h.state,
        reasonCode: h.reasonCode,
      })
    }
  } else {
    for (const task of tasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        for (const dep of task.dependencies) {
          const upstreamTask = canonicalTaskMap.get(dep.taskId)
          const sourceRoleId = (upstreamTask?.roleAssignment?.roleId ?? upstreamTask?.role) as
            | string
            | undefined
          const targetRoleId = (task.roleAssignment?.roleId ?? task.role) as string | undefined
          const isUpstreamSatisfied =
            upstreamTask &&
            (upstreamTask.state === 'SUCCEEDED' || upstreamTask.state === 'APPROVED')
          const isUpstreamFailed =
            upstreamTask && (upstreamTask.state === 'FAILED' || upstreamTask.state === 'CANCELLED')
          const handoffState = isUpstreamSatisfied
            ? 'SATISFIED'
            : isUpstreamFailed
              ? 'FAILED'
              : 'BLOCKED'

          worldHandoffs.push({
            id: `handoff_${dep.taskId}_to_${task.id}`,
            kind:
              targetRoleId === 'role:integration:integration-engineer'
                ? 'INTEGRATION'
                : 'DEPENDENCY',
            sourceTaskId: dep.taskId,
            targetTaskId: task.id,
            sourceStationId: sourceRoleId
              ? ((getStationForCanonicalRole(sourceRoleId) as StationId) ?? null)
              : null,
            targetStationId: targetRoleId
              ? ((getStationForCanonicalRole(targetRoleId) as StationId) ?? null)
              : null,
            sourceRoleId,
            targetRoleId,
            state: handoffState,
            reasonCode: isUpstreamSatisfied
              ? 'UPSTREAM_SATISFIED'
              : isUpstreamFailed
                ? 'UPSTREAM_FAILED'
                : 'UPSTREAM_PENDING',
          })
        }
      }
    }
  }

  // 6. Alert Level Determination
  let alertLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL' = 'NORMAL'
  const hasFailedTask = Object.values(worldTasks).some(
    (t) => t.canonicalState === 'FAILED'
  )
  if (hasFailedTask) {
    alertLevel = 'CRITICAL'
  } else if (anyProviderFallback || anyTransportFallback) {
    alertLevel = 'ELEVATED'
  }

  // 7. Build Immutable WorldState with Revision Identity
  const canonicalTaskFingerprint = computeCanonicalTaskFingerprint(tasks)

  const revisionIdentity: WorldRevisionIdentity = Object.freeze({
    projectionEpoch: projection?.epoch ?? 'proj_epoch_uninitialized',
    projectionRevision: projection?.revision ?? 0,
    canonicalTaskFingerprint,
  })

  return Object.freeze({
    revisionIdentity,
    stations: Object.freeze(stations),
    tasks: Object.freeze(worldTasks),
    handoffs: Object.freeze(worldHandoffs),
    infrastructure: Object.freeze({
      gateways: Object.freeze(finalGateways),
    }),
    alertLevel,
  })
}
