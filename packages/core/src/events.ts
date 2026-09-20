/**
 * Minimal event model and factories for @gravitas/core.
 * All events are JSON-serializable plain objects with a standard envelope.
 */

import type {
  BrowserQaResult,
  ExecutionContract,
  GravitasEvent,
  GravitasEventType,
  Run,
  RunStatus,
  Task,
  TaskState,
} from './types.js'

let eventCounter = 0

/**
 * Generates a unique monotonic event identifier.
 */
export function generateEventId(prefix = 'evt'): string {
  eventCounter += 1
  return `${prefix}_${Date.now()}_${eventCounter}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Options for event factory creation.
 */
export interface EventCreationOptions {
  readonly taskId?: string | undefined
  readonly eventId?: string | undefined
  readonly timestamp?: string | undefined
}

/**
 * Factory for creating a generic GravitasEvent.
 */
export function createGravitasEvent(
  type: GravitasEventType,
  runId: string,
  payload: Record<string, unknown>,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  const event: GravitasEvent = {
    eventId: options?.eventId ?? generateEventId(),
    runId,
    type,
    timestamp: options?.timestamp ?? new Date().toISOString(),
    payload: Object.freeze({ ...payload }),
    ...(options?.taskId !== undefined ? { taskId: options.taskId } : {}),
  }
  return event
}

/**
 * Emits a RUN_CREATED event.
 */
export function createRunCreatedEvent(
  run: Run,
  options?: { eventId?: string | undefined; timestamp?: string | undefined } | undefined
): GravitasEvent {
  return createGravitasEvent(
    'RUN_CREATED',
    run.id,
    {
      goal: run.goal,
      contractId: run.contractId,
      status: run.status,
      taskIds: run.taskIds,
    },
    options
  )
}

/**
 * Emits a TASK_CREATED event.
 */
export function createTaskCreatedEvent(
  task: Task,
  options?: { eventId?: string | undefined; timestamp?: string | undefined } | undefined
): GravitasEvent {
  return createGravitasEvent(
    'TASK_CREATED',
    task.runId,
    {
      title: task.title,
      objective: task.objective,
      state: task.state,
      dependencies: task.dependencies,
      acceptanceCriteria: task.acceptanceCriteria,
      ...(task.role ? { role: task.role } : {}),
      requiresApproval: task.requiresApproval ?? false,
    },
    {
      eventId: options?.eventId,
      timestamp: options?.timestamp,
      taskId: task.id,
    }
  )
}

/**
 * Emits a TASK_STATE_CHANGED event.
 */
export function createTaskStateChangedEvent(input: {
  runId: string
  taskId: string
  fromState: TaskState
  toState: TaskState
  reason?: string | undefined
  eventId?: string | undefined
  timestamp?: string | undefined
}): GravitasEvent {
  return createGravitasEvent(
    'TASK_STATE_CHANGED',
    input.runId,
    {
      fromState: input.fromState,
      toState: input.toState,
      ...(input.reason ? { reason: input.reason } : {}),
    },
    {
      taskId: input.taskId,
      eventId: input.eventId,
      timestamp: input.timestamp,
    }
  )
}

/**
 * Emits an EXECUTION_CONTRACT_CREATED event.
 */
export function createExecutionContractCreatedEvent(
  runId: string,
  contract: ExecutionContract,
  options?: { eventId?: string | undefined; timestamp?: string | undefined } | undefined
): GravitasEvent {
  return createGravitasEvent(
    'EXECUTION_CONTRACT_CREATED',
    runId,
    {
      version: contract.version,
      goal: contract.goal,
      repository: contract.repository,
      baseBranch: contract.baseBranch,
      constraints: contract.constraints,
      acceptanceCriteriaCount: contract.acceptanceCriteria.length,
      requiredEvidenceCount: contract.requiredEvidence.length,
    },
    options
  )
}

/**
  * Emits a RUN_STATE_CHANGED event.
  */
export function createRunStateChangedEvent(
  runId: string,
  fromStatus: RunStatus,
  toStatus: RunStatus,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent(
    'RUN_STATE_CHANGED',
    runId,
    { fromStatus, toStatus },
    options
  )
}

/**
  * Emits a WORKER_STARTED event.
  */
export function createWorkerStartedEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown> = {},
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('WORKER_STARTED', runId, payload, { ...options, taskId })
}

/**
  * Emits a WORKER_FINISHED event.
  */
export function createWorkerFinishedEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown> = {},
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('WORKER_FINISHED', runId, payload, { ...options, taskId })
}

/**
  * Emits a VERIFICATION_STARTED event.
  */
export function createVerificationStartedEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown> = {},
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('VERIFICATION_STARTED', runId, payload, { ...options, taskId })
}

/**
  * Emits a VERIFICATION_FINISHED event.
  */
export function createVerificationFinishedEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown> = {},
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('VERIFICATION_FINISHED', runId, payload, { ...options, taskId })
}

/**
  * Emits an EVIDENCE_CREATED event.
  */
export function createEvidenceCreatedEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown> = {},
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('EVIDENCE_CREATED', runId, payload, { ...options, taskId })
}

/**
  * Emits an APPROVAL_REQUIRED event.
  */
export function createApprovalRequiredEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown> = {},
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('APPROVAL_REQUIRED', runId, payload, { ...options, taskId })
}

/**
  * Emits a TASK_APPROVED event.
  */
export function createTaskApprovedEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown> = {},
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('TASK_APPROVED', runId, payload, { ...options, taskId })
}

/**
  * Emits a TASK_REJECTED event.
  */
export function createTaskRejectedEvent(
  runId: string,
  taskId: string,
  reason?: string | undefined,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent(
    'TASK_REJECTED',
    runId,
    { ...(reason !== undefined ? { reason } : {}) },
    { ...options, taskId }
  )
}

/**
  * Emits a RUN_COMPLETED event.
  */
export function createRunCompletedEvent(
  runId: string,
  payload: Record<string, unknown> = {},
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('RUN_COMPLETED', runId, payload, options)
}

/**
  * Emits a RUN_FAILED event.
  */
export function createRunFailedEvent(
  runId: string,
  payload: Record<string, unknown> = {},
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('RUN_FAILED', runId, payload, options)
}

/**
 * Emits a RUN_PLAN_CREATED event.
 */
export function createRunPlanCreatedEvent(
  runId: string,
  payload: Record<string, unknown>,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('RUN_PLAN_CREATED', runId, payload, options)
}

/**
 * Emits a TASK_READY event.
 */
export function createTaskReadyEvent(
  runId: string,
  taskId: string,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('TASK_READY', runId, {}, { ...options, taskId })
}

/**
 * Emits a TASK_SCHEDULED event.
 */
export function createTaskScheduledEvent(
  runId: string,
  taskId: string,
  slot: number,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('TASK_SCHEDULED', runId, { slot }, { ...options, taskId })
}

/**
 * Emits a TASK_RESULT_MATERIALIZED event.
 */
export function createTaskResultMaterializedEvent(
  runId: string,
  taskId: string,
  commitSha: string,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent(
    'TASK_RESULT_MATERIALIZED',
    runId,
    { commitSha },
    { ...options, taskId }
  )
}

/**
 * Emits a TASK_COMPOSITION_CONFLICT event.
 */
export function createTaskCompositionConflictEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown>,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent(
    'TASK_COMPOSITION_CONFLICT',
    runId,
    payload,
    { ...options, taskId }
  )
}

/**
 * Emits a BROWSER_QA_STARTED event.
 */
export function createBrowserQaStartedEvent(
  runId: string,
  taskId: string,
  payload: { readonly contractId: string; readonly actionCount: number },
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent(
    'BROWSER_QA_STARTED',
    runId,
    payload,
    { ...options, taskId }
  )
}

/**
 * Emits a BROWSER_QA_COMPLETED event.
 */
export function createBrowserQaCompletedEvent(
  runId: string,
  taskId: string,
  result: BrowserQaResult,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent(
    'BROWSER_QA_COMPLETED',
    runId,
    { result },
    { ...options, taskId }
  )
}

/**
 * Emits a BROWSER_QA_FAILED event.
 */
export function createBrowserQaFailedEvent(
  runId: string,
  taskId: string,
  payload: { readonly contractId: string; readonly error: string; readonly result?: BrowserQaResult | undefined },
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent(
    'BROWSER_QA_FAILED',
    runId,
    payload,
    { ...options, taskId }
  )
}

/**
 * Emits a ROUTE_SELECTED event.
 */
export function createRouteSelectedEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown>,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('ROUTE_SELECTED', runId, payload, { ...options, taskId })
}

/**
 * Emits a GATEWAY_ROUTE_STARTED event.
 */
export function createGatewayRouteStartedEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown>,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('GATEWAY_ROUTE_STARTED', runId, payload, { ...options, taskId })
}

/**
 * Emits a GATEWAY_ROUTE_COMPLETED event.
 */
export function createGatewayRouteCompletedEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown>,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('GATEWAY_ROUTE_COMPLETED', runId, payload, { ...options, taskId })
}

/**
 * Emits a GATEWAY_ROUTE_FAILED event.
 */
export function createGatewayRouteFailedEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown>,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('GATEWAY_ROUTE_FAILED', runId, payload, { ...options, taskId })
}

/**
 * Emits a PROVIDER_FALLBACK_OCCURRED event.
 */
export function createProviderFallbackOccurredEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown>,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('PROVIDER_FALLBACK_OCCURRED', runId, payload, { ...options, taskId })
}

/**
 * Emits a TRANSPORT_FALLBACK_OCCURRED event.
 */
export function createTransportFallbackOccurredEvent(
  runId: string,
  taskId: string,
  payload: Record<string, unknown>,
  options?: EventCreationOptions | undefined
): GravitasEvent {
  return createGravitasEvent('TRANSPORT_FALLBACK_OCCURRED', runId, payload, { ...options, taskId })
}

/**
 * In-memory event collector for testing domain behaviors and event sequences.
 */
export class InMemoryEventCollector {
  private readonly events: GravitasEvent[] = []

  public emit(event: GravitasEvent): void {
    this.events.push(event)
  }

  public getEvents(): readonly GravitasEvent[] {
    return [...this.events]
  }

  public getByType(type: GravitasEventType): readonly GravitasEvent[] {
    return this.events.filter((e) => e.type === type)
  }

  public clear(): void {
    this.events.length = 0
  }
}
