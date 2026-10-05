/**
 * Gravitas WorkSession Finite State Machine (FSM)
 *
 * Enforces legal state progression. All illegal transitions fail closed.
 * Governed by invariant: STATE TRANSITION != ARBITRARY FIELD UPDATE
 */

import { InvalidWorkSessionTransitionError } from './errors.js'
import type { WorkSessionState } from './worksession.js'

export const WORKSESSION_TERMINAL_STATES: ReadonlySet<WorkSessionState> = new Set<WorkSessionState>([
  'COMPLETED',
  'FAILED',
  'CANCELLED',
])

export const WORKSESSION_ALLOWED_TRANSITIONS: Readonly<Record<WorkSessionState, readonly WorkSessionState[]>> = {
  CREATED: ['READY', 'CANCELLED'],
  READY: ['ACTIVE', 'PAUSED', 'CANCELLED'],
  ACTIVE: ['WAITING_APPROVAL', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'RECOVERY_REQUIRED'],
  WAITING_APPROVAL: ['ACTIVE', 'FAILED', 'CANCELLED', 'RECOVERY_REQUIRED'],
  PAUSED: ['READY', 'ACTIVE', 'CANCELLED'],
  RECOVERY_REQUIRED: ['READY', 'ACTIVE', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
} as const

export function canTransitionWorkSession(from: WorkSessionState, to: WorkSessionState): boolean {
  if (from === to) {
    return false
  }
  const allowed = WORKSESSION_ALLOWED_TRANSITIONS[from]
  return Boolean(allowed && allowed.includes(to))
}

export function isWorkSessionTerminal(state: WorkSessionState): boolean {
  return WORKSESSION_TERMINAL_STATES.has(state)
}

export function assertValidWorkSessionTransition(
  workSessionId: string,
  from: WorkSessionState,
  to: WorkSessionState,
  reason?: string
): void {
  if (!canTransitionWorkSession(from, to)) {
    throw new InvalidWorkSessionTransitionError(workSessionId, from, to, reason)
  }
}
