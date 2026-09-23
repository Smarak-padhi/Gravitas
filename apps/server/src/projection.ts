import { randomUUID } from 'node:crypto'
import { type GravitasEvent } from '@gravitas/core'
import type { ResolvedInferenceRoute } from '@gravitas/gateways'

export type RuntimeExecutionPhase =
  | 'IDLE'
  | 'PREPARING'
  | 'WORKER_RUNNING'
  | 'CLEANUP'
  | 'VERIFYING'
  | 'BROWSER_QA'

export interface RuntimeRouteProjection {
  readonly transport: 'DIRECT' | 'GATEWAY'
  readonly active: boolean
  readonly gatewayId: string | null
  readonly requestedProvider: string | null
  readonly requestedModel: string | null
  readonly actualProvider?: string | null | undefined
  readonly actualModel?: string | null | undefined
  readonly providerFallbackOccurred: boolean
  readonly transportFallbackOccurred: boolean
}

export interface RuntimeVerificationProjection {
  readonly status: 'RUNNING' | 'PASSED' | 'FAILED'
}

export interface RuntimeBrowserQaProjection {
  readonly status: 'RUNNING' | 'PASSED' | 'FAILED'
}

export interface RuntimeHandoffProjection {
  readonly handoffId: string
  readonly kind: 'DEPENDENCY' | 'REVIEW' | 'INTEGRATION' | 'VERIFICATION' | 'APPROVAL'
  readonly sourceTaskId: string
  readonly targetTaskId: string
  readonly sourceRoleId?: string | undefined
  readonly targetRoleId?: string | undefined
  readonly state: 'BLOCKED' | 'READY' | 'IN_PROGRESS' | 'SATISFIED' | 'FAILED'
  readonly reasonCode?: string | undefined
}

export type ArtifactCustodyLocation =
  | 'PRODUCER_DESK'
  | 'REVIEW_INBOX'
  | 'REVIEW_BENCH'
  | 'INTEGRATION_INBOX'
  | 'INTEGRATION_BENCH'
  | 'APPROVAL_PLINTH'
  | 'COMPLETED_TRAY'
  | 'FAILURE_HOLD'
  | 'NEUTRAL_HOLD'

export interface RuntimeArtifactProjection {
  readonly artifactId: string
  readonly sourceTaskId: string
  readonly sourceRoleId?: string | undefined
  readonly sourceHarnessId?: string | undefined
  readonly commitSha?: string | undefined
  readonly verificationState:
    | 'UNVERIFIED'
    | 'VERIFYING'
    | 'VERIFIED'
    | 'FAILED'
  readonly reviewState:
    | 'NOT_REQUIRED'
    | 'PENDING'
    | 'IN_REVIEW'
    | 'PASSED'
    | 'CHANGES_REQUIRED'
  readonly integrationState:
    | 'NOT_READY'
    | 'READY'
    | 'PREPARING'
    | 'PREPARED'
    | 'CONFLICT'
    | 'INTEGRATED'
  readonly currentCustody: ArtifactCustodyLocation
}

export interface RuntimeTaskProjection {
  readonly taskId: string
  readonly phase: RuntimeExecutionPhase
  readonly roleId?: string | undefined
  readonly harnessId?: string | undefined
  readonly workerIdentity?: string | undefined
  readonly route?: RuntimeRouteProjection | undefined
  readonly verification?: RuntimeVerificationProjection | undefined
  readonly browserQa?: RuntimeBrowserQaProjection | undefined
}

export interface RuntimeProjectionSnapshot {
  readonly schemaVersion: '1.0.0'
  readonly epoch: string
  readonly revision: number
  readonly activeTasks: readonly RuntimeTaskProjection[]
  readonly handoffs?: readonly RuntimeHandoffProjection[] | undefined
  readonly artifacts?: readonly RuntimeArtifactProjection[] | undefined
}

/**
 * Stores non-authoritative presentation-safe projection of runtime activity
 * specifically built for 3D HQ visualizations, decoupling rendering truth
 * from the authoritative TaskState FSM.
 */
export class RuntimeProjectionStore {
  private readonly epoch: string
  private revision: number = 0
  private readonly tasks = new Map<string, RuntimeTaskProjection>()
  private readonly handoffs = new Map<string, RuntimeHandoffProjection>()
  private readonly artifacts = new Map<string, RuntimeArtifactProjection>()
  private readonly terminalTaskIds = new Set<string>()

  public constructor(epochId?: string) {
    this.epoch = epochId ?? `proj_epoch_${randomUUID()}`
  }

  public getEpoch(): string {
    return this.epoch
  }

  public getRevision(): number {
    return this.revision
  }

  public isTerminal(taskId: string): boolean {
    return this.terminalTaskIds.has(taskId)
  }

  public processEvent(event: GravitasEvent): void {
    const taskId = event.taskId
    if (!taskId) return

    // Stale update protection: terminal tasks cannot be resurrected by delayed callbacks
    if (this.terminalTaskIds.has(taskId)) {
      return
    }

    let current = this.tasks.get(taskId)
    let changed = false

    switch (event.type) {
      case 'TASK_STATE_CHANGED': {
        const payload = event.payload as { fromState?: string; toState: string; roleId?: string }
        const roleId = payload.roleId ?? current?.roleId
        if (payload.toState === 'RUNNING') {
          if (!current) {
            current = { taskId, phase: 'PREPARING', ...(roleId ? { roleId } : {}) }
            this.tasks.set(taskId, current)
            changed = true
          } else if (current.phase !== 'PREPARING' && current.phase !== 'WORKER_RUNNING') {
            current = { ...current, phase: 'PREPARING', ...(roleId ? { roleId } : {}) }
            this.tasks.set(taskId, current)
            changed = true
          } else if (roleId && current.roleId !== roleId) {
            current = { ...current, roleId }
            this.tasks.set(taskId, current)
            changed = true
          }
        } else if (payload.toState === 'VERIFYING') {
          if (!current) {
            current = { taskId, phase: 'VERIFYING', ...(roleId ? { roleId } : {}) }
            this.tasks.set(taskId, current)
            changed = true
          } else if (current.phase !== 'VERIFYING' && current.phase !== 'BROWSER_QA') {
            current = { ...current, phase: 'VERIFYING', ...(roleId ? { roleId } : {}) }
            this.tasks.set(taskId, current)
            changed = true
          } else if (roleId && current.roleId !== roleId) {
            current = { ...current, roleId }
            this.tasks.set(taskId, current)
            changed = true
          }
        } else if (
          ['WAITING_APPROVAL', 'APPROVED', 'SUCCEEDED', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(
            payload.toState
          )
        ) {
          // Terminal/Cleanup states - remove from activeTasks and record in terminalTaskIds
          this.terminalTaskIds.add(taskId)
          if (this.tasks.has(taskId)) {
            this.tasks.delete(taskId)
            this.revision++
          }
          return
        }
        break
      }

      case 'WORKER_STARTED': {
        const p = event.payload as { harnessId?: string; roleId?: string }
        const workerId = p.harnessId ?? current?.workerIdentity ?? 'unknown'
        const roleId = p.roleId ?? current?.roleId
        const harnessId = p.harnessId ?? current?.harnessId ?? workerId
        const existingRoute = current?.route
        const updatedRoute: RuntimeRouteProjection | undefined = existingRoute
          ? { ...existingRoute, active: true }
          : undefined

        current = {
          ...(current ?? { taskId }),
          phase: 'WORKER_RUNNING',
          ...(roleId ? { roleId } : {}),
          ...(harnessId ? { harnessId } : {}),
          workerIdentity: workerId,
          route: updatedRoute,
        }
        this.tasks.set(taskId, current)
        changed = true
        break
      }

      case 'WORKER_FINISHED': {
        if (current) {
          const updatedRoute: RuntimeRouteProjection | undefined = current.route
            ? { ...current.route, active: false }
            : undefined

          current = {
            ...current,
            phase: 'CLEANUP',
            route: updatedRoute,
          }
          this.tasks.set(taskId, current)
          changed = true
        }
        break
      }

      case 'ROUTE_SELECTED': {
        const p = event.payload as {
          transport?: string
          gatewayId?: string | null
          requestedProvider?: string | null
          requestedModel?: string | null
          transportFallbackOccurred?: boolean
        }
        const transport: 'DIRECT' | 'GATEWAY' = p.transport === 'GATEWAY' ? 'GATEWAY' : 'DIRECT'
        const existingRoute = current?.route
        const updatedRoute: RuntimeRouteProjection = {
          transport,
          active: existingRoute?.active ?? (current?.phase === 'WORKER_RUNNING'),
          gatewayId: p.gatewayId ?? null,
          requestedProvider: p.requestedProvider ?? null,
          requestedModel: p.requestedModel ?? null,
          actualProvider: existingRoute?.actualProvider ?? null,
          actualModel: existingRoute?.actualModel ?? null,
          providerFallbackOccurred: existingRoute?.providerFallbackOccurred ?? false,
          transportFallbackOccurred: p.transportFallbackOccurred ?? false,
        }

        current = {
          ...(current ?? { taskId, phase: 'PREPARING' }),
          route: updatedRoute,
        }
        this.tasks.set(taskId, current)
        changed = true
        break
      }

      case 'GATEWAY_ROUTE_STARTED': {
        const p = event.payload as {
          gatewayId?: string | null
          requestedProvider?: string | null
          requestedModel?: string | null
        }
        const existingRoute = current?.route
        const updatedRoute: RuntimeRouteProjection = {
          transport: 'GATEWAY',
          active: true,
          gatewayId: p.gatewayId ?? existingRoute?.gatewayId ?? null,
          requestedProvider: p.requestedProvider ?? existingRoute?.requestedProvider ?? null,
          requestedModel: p.requestedModel ?? existingRoute?.requestedModel ?? null,
          actualProvider: existingRoute?.actualProvider ?? null,
          actualModel: existingRoute?.actualModel ?? null,
          providerFallbackOccurred: existingRoute?.providerFallbackOccurred ?? false,
          transportFallbackOccurred: existingRoute?.transportFallbackOccurred ?? false,
        }

        current = {
          ...(current ?? { taskId, phase: 'WORKER_RUNNING' }),
          route: updatedRoute,
        }
        this.tasks.set(taskId, current)
        changed = true
        break
      }

      case 'GATEWAY_ROUTE_COMPLETED':
      case 'GATEWAY_ROUTE_FAILED': {
        if (current?.route && current.route.active) {
          current = {
            ...current,
            route: {
              ...current.route,
              active: false,
            },
          }
          this.tasks.set(taskId, current)
          changed = true
        }
        break
      }

      case 'PROVIDER_FALLBACK_OCCURRED': {
        const p = event.payload as {
          originalProvider?: string
          fallbackProvider?: string
        }
        if (current?.route) {
          current = {
            ...current,
            route: {
              ...current.route,
              providerFallbackOccurred: true,
              actualProvider: p.fallbackProvider ?? null,
            },
          }
          this.tasks.set(taskId, current)
          changed = true
        }
        break
      }

      case 'TRANSPORT_FALLBACK_OCCURRED': {
        const p = event.payload as {
          fallbackTransport?: string
        }
        if (current?.route) {
          current = {
            ...current,
            route: {
              ...current.route,
              transport: p.fallbackTransport === 'GATEWAY' ? 'GATEWAY' : 'DIRECT',
              transportFallbackOccurred: true,
            },
          }
          this.tasks.set(taskId, current)
          changed = true
        }
        break
      }

      case 'VERIFICATION_STARTED': {
        current = {
          ...(current ?? { taskId }),
          phase: 'VERIFYING',
          verification: { status: 'RUNNING' },
        }
        this.tasks.set(taskId, current)
        changed = true
        break
      }

      case 'VERIFICATION_FINISHED': {
        const p = event.payload as { status?: string }
        const status = p.status === 'PASSED' ? 'PASSED' : 'FAILED'
        current = {
          ...(current ?? { taskId, phase: 'VERIFYING' }),
          verification: { status },
        }
        this.tasks.set(taskId, current)
        changed = true
        break
      }

      case 'BROWSER_QA_STARTED': {
        current = {
          ...(current ?? { taskId }),
          phase: 'BROWSER_QA',
          browserQa: { status: 'RUNNING' },
        }
        this.tasks.set(taskId, current)
        changed = true
        break
      }

      case 'BROWSER_QA_COMPLETED': {
        current = {
          ...(current ?? { taskId, phase: 'BROWSER_QA' }),
          browserQa: { status: 'PASSED' },
        }
        this.tasks.set(taskId, current)
        changed = true
        break
      }

      case 'BROWSER_QA_FAILED': {
        current = {
          ...(current ?? { taskId, phase: 'BROWSER_QA' }),
          browserQa: { status: 'FAILED' },
        }
        this.tasks.set(taskId, current)
        changed = true
        break
      }
    }

    if (changed) {
      this.revision++
    }
  }

  public processRouteResolved(taskId: string, route: ResolvedInferenceRoute): void {
    if (this.terminalTaskIds.has(taskId)) return

    const current = this.tasks.get(taskId) ?? { taskId, phase: 'PREPARING' }
    const transport: 'DIRECT' | 'GATEWAY' = route.transport === 'GATEWAY' ? 'GATEWAY' : 'DIRECT'

    // Strict sanitization boundary: allowlisted fields only.
    // No headers, secrets, api keys, tokens, or raw configuration objects.
    const sanitizedRoute: RuntimeRouteProjection = {
      transport,
      active: current.phase === 'WORKER_RUNNING',
      gatewayId: route.gatewayId ?? null,
      requestedProvider: route.requestedProvider ?? null,
      requestedModel: route.requestedModel ?? null,
      actualProvider: (route as any).actualProvider ?? null,
      actualModel: (route as any).actualModel ?? null,
      providerFallbackOccurred: (route as any).providerFallbackOccurred ?? false,
      transportFallbackOccurred: route.transportFallbackOccurred ?? false,
    }

    this.tasks.set(taskId, {
      ...current,
      workerIdentity: route.workerId,
      route: sanitizedRoute,
    })
    this.revision++
  }

  public getSnapshot(): RuntimeProjectionSnapshot {
    return {
      schemaVersion: '1.0.0',
      epoch: this.epoch,
      revision: this.revision,
      activeTasks: Array.from(this.tasks.values()).map((t) => ({
        taskId: t.taskId,
        phase: t.phase,
        ...(t.roleId !== undefined ? { roleId: t.roleId } : {}),
        ...(t.harnessId !== undefined ? { harnessId: t.harnessId } : {}),
        ...(t.workerIdentity !== undefined ? { workerIdentity: t.workerIdentity } : {}),
        ...(t.route !== undefined
          ? {
              route: {
                transport: t.route.transport,
                active: t.route.active,
                gatewayId: t.route.gatewayId,
                requestedProvider: t.route.requestedProvider,
                requestedModel: t.route.requestedModel,
                ...(t.route.actualProvider !== undefined && t.route.actualProvider !== null
                  ? { actualProvider: t.route.actualProvider }
                  : {}),
                ...(t.route.actualModel !== undefined && t.route.actualModel !== null
                  ? { actualModel: t.route.actualModel }
                  : {}),
                providerFallbackOccurred: t.route.providerFallbackOccurred,
                transportFallbackOccurred: t.route.transportFallbackOccurred,
              },
            }
          : {}),
        ...(t.verification !== undefined
          ? {
              verification: {
                status: t.verification.status,
              },
            }
          : {}),
        ...(t.browserQa !== undefined
          ? {
              browserQa: {
                status: t.browserQa.status,
              },
            }
          : {}),
      })),
      handoffs: Array.from(this.handoffs.values()).map((h) => ({
        handoffId: h.handoffId,
        kind: h.kind,
        sourceTaskId: h.sourceTaskId,
        targetTaskId: h.targetTaskId,
        ...(h.sourceRoleId ? { sourceRoleId: h.sourceRoleId } : {}),
        ...(h.targetRoleId ? { targetRoleId: h.targetRoleId } : {}),
        state: h.state,
        ...(h.reasonCode ? { reasonCode: h.reasonCode } : {}),
      })),
      artifacts: Array.from(this.artifacts.values()).map((a) => ({
        artifactId: a.artifactId,
        sourceTaskId: a.sourceTaskId,
        ...(a.sourceRoleId ? { sourceRoleId: a.sourceRoleId } : {}),
        ...(a.sourceHarnessId ? { sourceHarnessId: a.sourceHarnessId } : {}),
        ...(a.commitSha ? { commitSha: a.commitSha } : {}),
        verificationState: a.verificationState,
        reviewState: a.reviewState,
        integrationState: a.integrationState,
        currentCustody: a.currentCustody,
      })),
    }
  }

  public setHandoff(handoff: RuntimeHandoffProjection): void {
    this.handoffs.set(handoff.handoffId, handoff)
    this.revision++
  }

  public setHandoffs(handoffs: readonly RuntimeHandoffProjection[]): void {
    for (const h of handoffs) {
      this.handoffs.set(h.handoffId, h)
    }
    this.revision++
  }

  public getHandoffs(): readonly RuntimeHandoffProjection[] {
    return Array.from(this.handoffs.values())
  }

  public setArtifact(artifact: RuntimeArtifactProjection): void {
    this.artifacts.set(artifact.artifactId, artifact)
    this.revision++
  }

  public setArtifacts(artifacts: readonly RuntimeArtifactProjection[]): void {
    for (const a of artifacts) {
      this.artifacts.set(a.artifactId, a)
    }
    this.revision++
  }

  public getArtifacts(): readonly RuntimeArtifactProjection[] {
    return Array.from(this.artifacts.values())
  }

  public clear(): void {
    this.tasks.clear()
    this.handoffs.clear()
    this.artifacts.clear()
    this.terminalTaskIds.clear()
    this.revision = 0
  }
}
