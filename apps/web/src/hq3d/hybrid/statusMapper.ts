/**
 * Gravitas Wave 12H — Deterministic Status Message Mapper
 *
 * Maps canonical WorldState, Task, and RuntimeProjection transitions
 * into concise operational speech bubbles for illustrated agents.
 *
 * Zero LLM calls. Zero fabricated facts. Purely deterministic.
 */

import type { RoleId } from '../roles/types.js'
import type { AgentStatusMessage } from './types.js'

export interface StateTransitionEvent {
  readonly roleId: RoleId
  readonly taskId?: string
  readonly taskTitle?: string
  readonly previousState?: string
  readonly currentState?: string
  readonly event?: string
  readonly runtimePhase?: string
  readonly timestamp?: number
  readonly errorCount?: number
  readonly dependencyTaskId?: string
  readonly dependencyRoleName?: string
}

/**
 * Derives a concise, operational speech bubble message from a canonical state transition.
 * Returns null if the state is UNKNOWN, unassigned, or non-operational.
 */
export function deriveAgentStatusMessage(
  eventObj: StateTransitionEvent
): AgentStatusMessage | null {
  const {
    roleId,
    taskId,
    taskTitle,
    currentState: rawCurrentState,
    event: rawEvent,
    runtimePhase,
    timestamp = Date.now(),
    errorCount,
    dependencyTaskId,
    dependencyRoleName,
  } = eventObj

  const currentState = rawCurrentState || rawEvent || ''

  // Rule: UNKNOWN or unassigned states produce zero fabricated messages
  if (!currentState || currentState === 'UNKNOWN' || currentState === 'NEUTRAL' || currentState === 'IDLE') {
    return null
  }

  const shortTaskId = taskId ? (taskId.length > 8 ? taskId.slice(0, 8) : taskId) : 'Task'

  // 1. Dependency Waiting
  if (currentState === 'BLOCKED' || currentState === 'DEPENDENCY_WAIT') {
    const depText = dependencyTaskId
      ? `Waiting for ${dependencyTaskId}${dependencyRoleName ? ` from ${dependencyRoleName}` : ''}.`
      : 'Waiting for upstream dependencies.'
    return {
      id: `msg-${roleId}-${timestamp}`,
      roleId,
      taskId,
      category: 'DEPENDENCY_WAIT',
      shortText: depText,
      timestamp,
      severity: 'warning',
      expiresAfterMs: 6000,
    }
  }

  // 2. Active Task Execution (WORKER_RUNNING / TASK_STARTED)
  if (runtimePhase === 'WORKER_RUNNING' || currentState === 'WORKING' || currentState === 'TASK_STARTED') {
    const titleSnippet = taskTitle ? `: ${taskTitle.slice(0, 28)}` : ''
    return {
      id: `msg-${roleId}-${timestamp}`,
      roleId,
      taskId,
      category: 'TASK_STARTED',
      shortText: `Working on ${shortTaskId}${titleSnippet}`,
      timestamp,
      severity: 'info',
      expiresAfterMs: 5000,
    }
  }

  // 3. Task Completed / Handoff Started (Worker finished -> sending to Review)
  if (
    currentState === 'COMPLETED' ||
    currentState === 'TASK_COMPLETED' ||
    currentState === 'HANDOFF_STARTED' ||
    runtimePhase === 'VERIFYING'
  ) {
    if (roleId === 'role:engineering:frontend-engineer' || roleId === 'role:engineering:backend-engineer') {
      return {
        id: `msg-${roleId}-${timestamp}`,
        roleId,
        taskId,
        category: 'TASK_COMPLETED',
        shortText: `Implementation finished. Sending ${shortTaskId} to Review.`,
        timestamp,
        severity: 'success',
        expiresAfterMs: 5500,
      }
    }
  }

  // 4. Handoff Received by Reviewer
  if (
    currentState === 'HANDOFF_RECEIVED' ||
    (roleId === 'role:quality:independent-reviewer' && (currentState === 'REVIEWING' || runtimePhase === 'VERIFYING'))
  ) {
    return {
      id: `msg-${roleId}-${timestamp}`,
      roleId,
      taskId,
      category: 'HANDOFF_RECEIVED',
      shortText: `Got ${shortTaskId}. Running verification.`,
      timestamp,
      severity: 'info',
      expiresAfterMs: 5000,
    }
  }

  // 5. Verification Passed
  if (currentState === 'VERIFICATION_PASSED') {
    return {
      id: `msg-${roleId}-${timestamp}`,
      roleId,
      taskId,
      category: 'VERIFICATION_PASSED',
      shortText: `All checks passed. Sending this for your approval.`,
      timestamp,
      severity: 'success',
      expiresAfterMs: 6000,
    }
  }

  // 6. Verification Failed
  if (currentState === 'VERIFICATION_FAILED') {
    const errText = errorCount && errorCount > 0 ? `found ${errorCount} problems` : 'found issues'
    return {
      id: `msg-${roleId}-${timestamp}`,
      roleId,
      taskId,
      category: 'VERIFICATION_FAILED',
      shortText: `Verification ${errText}. Returning ${shortTaskId} to Engineering.`,
      timestamp,
      severity: 'error',
      expiresAfterMs: 6500,
    }
  }

  // 7. Waiting Approval (Human Sign-off)
  if (currentState === 'WAITING_APPROVAL') {
    return {
      id: `msg-${roleId}-${timestamp}`,
      roleId,
      taskId,
      category: 'WAITING_APPROVAL',
      shortText: `${shortTaskId} ready for operator review and approval.`,
      timestamp,
      severity: 'success',
      expiresAfterMs: 7000,
    }
  }

  // 8. Task Execution Failed
  if (currentState === 'FAILED' || currentState === 'TASK_FAILED') {
    return {
      id: `msg-${roleId}-${timestamp}`,
      roleId,
      taskId,
      category: 'TASK_FAILED',
      shortText: `Execution halted with error. Retaining failure log.`,
      timestamp,
      severity: 'error',
      expiresAfterMs: 6500,
    }
  }

  // Idle or ambient states produce no status message
  return null
}
