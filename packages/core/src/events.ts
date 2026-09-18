/**
 * Minimal event model and factories for @gravitas/core.
 * All events are JSON-serializable plain objects with a standard envelope.
 */

import type {
  ExecutionContract,
  GravitasEvent,
  GravitasEventType,
  Run,
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
