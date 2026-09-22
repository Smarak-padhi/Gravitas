import { type GravitasEvent } from '@gravitas/core'
import type { ResolvedInferenceRoute } from '@gravitas/gateways'

export type RuntimeExecutionPhase =
  | 'IDLE'
  | 'PREPARING'
  | 'WORKER_RUNNING'
  | 'VERIFYING'
  | 'BROWSER_QA'
  | 'CLEANUP'

export interface RuntimeTaskProjection {
  readonly taskId: string
  readonly phase: RuntimeExecutionPhase
  readonly workerIdentity?: string | undefined
  readonly route?: {
    readonly transport: string
    readonly requestedProvider: string | null
    readonly requestedModel: string | null
    readonly gatewayId: string | null
    readonly fallbackOccurred: boolean
  } | undefined
}

export interface RuntimeProjectionSnapshot {
  readonly epoch: number
  readonly activeTasks: readonly RuntimeTaskProjection[]
}

/**
 * Stores non-authoritative presentation-safe projection of runtime activity
 * specifically built for 3D HQ visualizations, decoupling rendering truth
 * from the authoritative TaskState FSM.
 */
export class RuntimeProjectionStore {
  private epoch = 0
  private readonly tasks = new Map<string, RuntimeTaskProjection>()

  public processEvent(event: GravitasEvent): void {
    const taskId = event.taskId
    if (!taskId) return

    let current = this.tasks.get(taskId)
    if (!current) {
      current = { taskId, phase: 'IDLE' }
      this.tasks.set(taskId, current)
    }

    let changed = false
    let newPhase = current.phase
    let newWorkerIdentity = current.workerIdentity

    switch (event.type) {
      case 'TASK_STATE_CHANGED': {
        const payload = event.payload as { toState: string }
        if (payload.toState === 'RUNNING') {
          newPhase = 'PREPARING'
          changed = true
        } else if (payload.toState === 'VERIFYING') {
          newPhase = 'VERIFYING'
          changed = true
        } else if (['WAITING_APPROVAL', 'APPROVED', 'SUCCEEDED', 'FAILED', 'CANCELLED'].includes(payload.toState)) {
          // Terminal/Cleanup states - remove ghost activity
          this.tasks.delete(taskId)
          this.epoch++
          return
        }
        break
      }
      case 'WORKER_STARTED': {
        newPhase = 'WORKER_RUNNING'
        const p = event.payload as { harnessId?: string }
        newWorkerIdentity = p.harnessId ?? 'unknown'
        changed = true
        break
      }
      case 'WORKER_FINISHED': {
        // usually moves to VERIFYING right after, but we can set it back to IDLE or PREPARING
        // wait, TASK_STATE_CHANGED to VERIFYING will happen
        break
      }
      case 'BROWSER_QA_STARTED': {
        newPhase = 'BROWSER_QA'
        changed = true
        break
      }
      case 'BROWSER_QA_COMPLETED':
      case 'BROWSER_QA_FAILED': {
        // Will be followed by TASK_STATE_CHANGED
        break
      }
      // Note: ROUTE_SELECTED / etc are processed via direct callback to ensure synchronous capture
    }

    if (changed) {
      this.tasks.set(taskId, {
        ...current,
        phase: newPhase,
        workerIdentity: newWorkerIdentity,
      })
      this.epoch++
    }
  }

  public processRouteResolved(taskId: string, route: ResolvedInferenceRoute): void {
    const current = this.tasks.get(taskId) ?? { taskId, phase: 'PREPARING' }
    
    // Strict sanitization boundary: no secrets, keys, or internal headers.
    this.tasks.set(taskId, {
      ...current,
      workerIdentity: route.workerId,
      route: {
        transport: route.transport,
        requestedProvider: route.requestedProvider ?? null,
        requestedModel: route.requestedModel ?? null,
        gatewayId: route.gatewayId ?? null,
        fallbackOccurred: route.transportFallbackOccurred ?? false,
      }
    })
    this.epoch++
  }

  public getSnapshot(): RuntimeProjectionSnapshot {
    return {
      epoch: this.epoch,
      activeTasks: Array.from(this.tasks.values()),
    }
  }

  public clear(): void {
    this.tasks.clear()
    this.epoch = 0
  }
}
