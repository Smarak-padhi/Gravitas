/**
 * Gravitas WorkSession Kernel — Command Boundary & Envelopes
 *
 * Implements deterministic command envelopes, results, and idempotency tracking.
 */

import type { CreateWorkSessionInput, WorkSessionState } from './worksession.js'
import type { ClaimJobLeaseInput, CreateDurableJobInput } from './jobs.js'

export interface KernelCommand<TPayload = unknown> {
  readonly commandId: string
  readonly commandType?: string | undefined
  readonly type?: string | undefined
  readonly targetAggregateId?: string | undefined
  readonly workSessionId?: string | undefined
  readonly expectedRevision?: number | undefined
  readonly correlationId?: string | undefined
  readonly causationId?: string | undefined
  readonly payload: TPayload
}

export interface CommandResult<TResult = unknown> {
  readonly commandId: string
  readonly status: 'COMMITTED' | 'ALREADY_COMMITTED'
  readonly success: boolean
  readonly aggregateRevision: number
  readonly currentRevision: number
  readonly result: TResult
}

export interface CommandReceipt {
  readonly commandId: string
  readonly commandType: string
  readonly targetAggregateId: string
  readonly expectedRevision?: number | undefined
  readonly requestHash: string
  readonly status: 'COMMITTED' | 'FAILED'
  readonly resultJson: string
  readonly createdAt: string
}

// Concrete command payloads
export interface CreateWorkSessionPayload extends CreateWorkSessionInput {}

export interface TransitionWorkSessionPayload {
  readonly workSessionId?: string | undefined
  readonly toState?: WorkSessionState | undefined
  readonly targetState?: WorkSessionState | undefined
  readonly reason?: string | undefined
}

export interface CreateRunPayload {
  readonly workSessionId?: string | undefined
  readonly runId?: string | undefined
  readonly goal?: string | undefined
}

export interface CreateTaskPayload {
  readonly runId?: string | undefined
  readonly workSessionId?: string | undefined
  readonly taskId?: string | undefined
  readonly title: string
  readonly assignedRoleId?: string | undefined
  readonly requiresApproval?: boolean | undefined
}

export interface TransitionTaskPayload {
  readonly taskId: string
  readonly toState?:
    | 'PENDING'
    | 'READY'
    | 'ASSIGNED'
    | 'RUNNING'
    | 'VERIFYING'
    | 'WAITING_APPROVAL'
    | 'APPROVED'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CANCELLED'
    | 'INTERRUPTED'
    | 'RECOVERY_REQUIRED'
    | undefined
  readonly targetState?:
    | 'PENDING'
    | 'READY'
    | 'ASSIGNED'
    | 'RUNNING'
    | 'VERIFYING'
    | 'WAITING_APPROVAL'
    | 'APPROVED'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CANCELLED'
    | 'INTERRUPTED'
    | 'RECOVERY_REQUIRED'
    | undefined
  readonly reason?: string | undefined
}

export interface CreateDurableJobPayload extends CreateDurableJobInput {}

export interface ClaimJobLeasePayload extends ClaimJobLeaseInput {}

export interface CompleteJobPayload {
  readonly jobId: string
  readonly result?: Record<string, unknown> | undefined
}
