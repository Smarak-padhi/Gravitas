/**
 * Gravitas WorkSession Domain Model
 *
 * Defines canonical durable fields, derived views, and validation rules.
 * Governed by invariant: WORKSESSION IDENTITY != PROCESS IDENTITY
 */

export type WorkSessionState =
  | 'CREATED'
  | 'READY'
  | 'ACTIVE'
  | 'WAITING_APPROVAL'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RECOVERY_REQUIRED'

export interface WorkSession {
  readonly id: string
  readonly title: string
  readonly objective: string
  readonly goal?: string | undefined
  readonly repositoryRoot: string
  readonly baseBranch: string
  readonly state: WorkSessionState
  readonly revision: number
  readonly createdAt: string
  readonly updatedAt: string
  readonly terminalReason?: string | undefined
  readonly recoveryMetadata?: Readonly<Record<string, unknown>> | undefined
  readonly metadata?: Readonly<Record<string, unknown>> | undefined
}

export interface CreateWorkSessionInput {
  readonly id?: string | undefined
  readonly title: string
  readonly objective: string
  readonly repositoryRoot: string
  readonly baseBranch?: string | undefined
  readonly metadata?: Readonly<Record<string, unknown>> | undefined
}

export interface WorkSessionRun {
  readonly id: string
  readonly workSessionId: string
  readonly goal: string
  readonly status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WorkSessionTask {
  readonly id: string
  readonly runId: string
  readonly workSessionId: string
  readonly title: string
  readonly state:
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
  readonly assignedRoleId: string
  readonly requiresApproval: boolean
  readonly createdAt: string
  readonly updatedAt: string
}
