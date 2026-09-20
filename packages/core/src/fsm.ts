/**
 * Task Finite State Machine (FSM) for @gravitas/core.
 * Pure transition engine with central transition rules and deterministic errors.
 */

import { InvalidStateTransitionError } from './errors.js'
import type { GravitasEvent, Task, TaskState } from './types.js'

/**
 * Terminal states in the Task lifecycle.
 * Once a task enters any of these states, no further transitions are allowed.
 */
export const TERMINAL_STATES: ReadonlySet<TaskState> = new Set<TaskState>([
  'APPROVED',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
])

/**
 * Successful terminal states.
 */
export const SUCCESSFUL_TERMINAL_STATES: ReadonlySet<TaskState> = new Set<TaskState>([
  'APPROVED',
  'SUCCEEDED',
])

/**
 * Failure terminal states.
 */
export const FAILED_TERMINAL_STATES: ReadonlySet<TaskState> = new Set<TaskState>([
  'FAILED',
  'CANCELLED',
])

/**
 * The canonical transition matrix defining all valid outbound transitions.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<TaskState, readonly TaskState[]>> = {
  PLANNED: ['BLOCKED', 'READY', 'CANCELLED'],
  BLOCKED: ['READY', 'CANCELLED'],
  READY: ['RUNNING', 'CANCELLED'],
  RUNNING: ['VERIFYING', 'FAILED', 'CANCELLED'],
  VERIFYING: ['SUCCEEDED', 'WAITING_APPROVAL', 'FAILED', 'CANCELLED'],
  WAITING_APPROVAL: ['APPROVED', 'FAILED', 'CANCELLED'],
  APPROVED: [],
  SUCCEEDED: [],
  FAILED: [],
  CANCELLED: [],
} as const

/**
 * Options for canTransition checks.
 */
export interface TransitionOptions {
  /**
   * Whether the task requires explicit human approval.
   * If true, VERIFYING cannot transition directly to SUCCEEDED.
   * If false, VERIFYING cannot transition to WAITING_APPROVAL.
   */
  readonly requiresApproval?: boolean | undefined
}

/**
 * Checks whether a transition from `from` to `to` is legally permitted.
 */
export function canTransition(
  from: TaskState,
  to: TaskState,
  options?: TransitionOptions | undefined
): boolean {
  if (from === to) {
    return false
  }

  const allowedTargets = ALLOWED_TRANSITIONS[from]
  if (!allowedTargets || !allowedTargets.includes(to)) {
    return false
  }

  // Refine VERIFYING based on approval requirement if specified
  if (from === 'VERIFYING') {
    if (options?.requiresApproval === true && to === 'SUCCEEDED') {
      return false
    }
    if (options?.requiresApproval === false && to === 'WAITING_APPROVAL') {
      return false
    }
  }

  return true
}

/**
 * Returns true if the state is terminal.
 */
export function isTerminalState(state: TaskState): boolean {
  return TERMINAL_STATES.has(state)
}

/**
 * Returns true if the state is a successful terminal state (APPROVED or SUCCEEDED).
 */
export function isSuccessfulState(state: TaskState): boolean {
  return SUCCESSFUL_TERMINAL_STATES.has(state)
}

/**
 * Returns true if the state is a failed terminal state (FAILED or CANCELLED).
 */
export function isFailedState(state: TaskState): boolean {
  return FAILED_TERMINAL_STATES.has(state)
}

/**
 * Options for transitionTask execution.
 */
export interface TransitionTaskOptions {
  readonly reason?: string | undefined
  readonly timestamp?: string | undefined
  readonly eventId?: string | undefined
}

/**
 * Result of a task transition containing both the updated immutable task
 * and the state change event.
 */
export interface TaskTransitionResult {
  readonly task: Task
  readonly event: GravitasEvent
}

/**
 * Transitions a task to a new state.
 *
 * Enforces FSM constraints deterministically.
 * Returns a new immutable Task object and an associated TASK_STATE_CHANGED event.
 * Never mutates the input task.
 *
 * Throws InvalidStateTransitionError if the transition is illegal.
 */
export function transitionTask(
  task: Task,
  to: TaskState,
  options?: TransitionTaskOptions | undefined
): TaskTransitionResult {
  const legallyAllowed = canTransition(task.state, to, {
    requiresApproval: task.requiresApproval,
  })

  if (!legallyAllowed) {
    let reasonDetail = options?.reason
    if (task.state === 'VERIFYING') {
      if (task.requiresApproval === true && to === 'SUCCEEDED') {
        reasonDetail = 'task requires human approval; must transition to WAITING_APPROVAL, not SUCCEEDED'
      } else if (task.requiresApproval === false && to === 'WAITING_APPROVAL') {
        reasonDetail = 'task does not require approval; must transition to SUCCEEDED, not WAITING_APPROVAL'
      }
    }
    throw new InvalidStateTransitionError(task.state, to, task.id, reasonDetail)
  }

  const now = options?.timestamp ?? new Date().toISOString()
  const eventId = options?.eventId ?? `evt_${task.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const updatedTask: Task = {
    ...task,
    state: to,
    updatedAt: now,
    ...(options?.reason ? { failureReason: options.reason, statusMessage: options.reason } : {}),
  }

  const event: GravitasEvent = {
    eventId,
    runId: task.runId,
    taskId: task.id,
    type: 'TASK_STATE_CHANGED',
    timestamp: now,
    payload: {
      fromState: task.state,
      toState: to,
      ...(options?.reason ? { reason: options.reason } : {}),
    },
  }

  return {
    task: updatedTask,
    event,
  }
}
