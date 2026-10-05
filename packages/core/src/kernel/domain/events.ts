/**
 * Gravitas WorkSession Kernel — Durable Event Model
 *
 * Distinguishes:
 * DURABLE EVENT != LOG MESSAGE
 * AUDIT EVENT != DEBUG LOG
 * TIMESTAMP != EVENT ORDER
 */

export type KernelAggregateType = 'WORKSESSION' | 'RUN' | 'TASK' | 'JOB' | 'KERNEL'

export interface DurableEvent<TPayload = Record<string, unknown>> {
  readonly sequenceId: number
  readonly sequenceNumber: number
  readonly eventId: string
  readonly aggregateType: KernelAggregateType
  readonly aggregateId: string
  readonly eventType: string
  readonly aggregateRevision: number
  readonly occurredAt: string
  readonly commandId?: string | undefined
  readonly correlationId?: string | undefined
  readonly causationId?: string | undefined
  readonly payload: TPayload
}

export interface AppendEventParams<TPayload = Record<string, unknown>> {
  readonly eventId?: string | undefined
  readonly aggregateType: KernelAggregateType
  readonly aggregateId: string
  readonly eventType: string
  readonly aggregateRevision: number
  readonly occurredAt?: string | undefined
  readonly commandId?: string | undefined
  readonly correlationId?: string | undefined
  readonly causationId?: string | undefined
  readonly payload: TPayload
}
