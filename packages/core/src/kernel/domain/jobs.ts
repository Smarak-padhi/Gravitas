/**
 * Gravitas WorkSession Kernel — Durable Job Substrate
 *
 * Implements crash-resilient background job representation and leasing.
 * Invariant: DURABILITY != IN_MEMORY_CACHE
 */

export type DurableJobState = 'PENDING' | 'LEASED' | 'COMPLETED' | 'FAILED' | 'EXPIRED'

export interface DurableJob<TPayload = Record<string, unknown>> {
  readonly id: string
  readonly jobType: string
  readonly workSessionId?: string | undefined
  readonly state: DurableJobState
  readonly payload: TPayload
  readonly leaseOwner?: string | undefined
  readonly leasedAt?: string | undefined
  readonly leaseExpiresAt?: string | undefined
  readonly createdAt: string
  readonly updatedAt: string
}

export interface CreateDurableJobInput<TPayload = Record<string, unknown>> {
  readonly id?: string | undefined
  readonly jobType: string
  readonly workSessionId?: string | undefined
  readonly payload: TPayload
}

export interface ClaimJobLeaseInput {
  readonly jobId: string
  readonly leaseOwner: string
  readonly leaseDurationMs: number
}
