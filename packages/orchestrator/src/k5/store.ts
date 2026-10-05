/**
 * GRAVITAS K5 — Canonical store (K0 persistence adapter).
 *
 * Every K5 record is an immutable, append-only entry persisted through the K0
 * kernel command path (CREATE_DURABLE_JOB). K5 never opens SQLite itself.
 *
 *   STORAGE REPRESENTATION != DOMAIN IDENTITY
 *   A VerificationPlan / Evidence / Report is a K5 domain record that happens to be
 *   stored in a K0 durable-job row. It is not a DurableJob in the domain sense and is
 *   never leased, claimed, or completed through job semantics.
 *
 * Append-only: historical (including negative) records are never updated or removed.
 */

import type { KernelLike } from './types.js'

export type K5RecordKind =
  | 'CLAIM'
  | 'PLAN'
  | 'CRITERION'
  | 'ASSIGNMENT'
  | 'ASSIGNMENT_STATUS'
  | 'OBSERVATION'
  | 'REJECTED_RESULT'
  | 'MUTATION'
  | 'EVIDENCE'
  | 'FINDING'
  | 'REPORT'
  | 'BUNDLE'
  | 'STATE'
  | 'DECISION'
  | 'TRACE'

export interface K5Record<T = unknown> {
  readonly recordId: string
  readonly kind: K5RecordKind
  readonly planId: string
  readonly seq: number
  readonly createdAt: string
  readonly body: T
}

const JOB_PREFIX = 'K5_'

export class K5Store {
  private readonly kernel: KernelLike
  private readonly workSessionId: string
  private nextSeqValue = 1

  constructor(kernel: KernelLike, workSessionId: string) {
    this.kernel = kernel
    this.workSessionId = workSessionId
    this.refreshSeq()
  }

  /** Reads all K5 records for this session back out of K0 (canonical reread), ordered by seq. */
  load(): K5Record[] {
    const snap = this.kernel.getWorkSessionSnapshot(this.workSessionId)
    const records: K5Record[] = []
    for (const job of snap.activeJobs) {
      if (!job.jobType.startsWith(JOB_PREFIX)) continue
      const p = job.payload as { record?: K5Record } | undefined
      if (p?.record) records.push(p.record)
    }
    records.sort((a, b) => a.seq - b.seq)
    return records
  }

  private refreshSeq(): void {
    const all = this.load()
    this.nextSeqValue = all.length === 0 ? 1 : all[all.length - 1]!.seq + 1
  }

  has(kind: K5RecordKind, recordId: string): boolean {
    return this.load().some((r) => r.kind === kind && r.recordId === recordId)
  }

  /**
   * Appends one immutable record. The K0 commandId is derived from (kind, recordId) so
   * re-delivery of the same logical record is idempotent at the kernel boundary.
   */
  async append<T>(kind: K5RecordKind, planId: string, recordId: string, body: T): Promise<K5Record<T>> {
    this.refreshSeq()
    const record: K5Record<T> = {
      recordId,
      kind,
      planId,
      seq: this.nextSeqValue,
      createdAt: new Date().toISOString(),
      body,
    }
    await this.kernel.executeCommand({
      commandId: `cmd_k5_${kind}_${recordId}`,
      commandType: 'CREATE_DURABLE_JOB',
      workSessionId: this.workSessionId,
      payload: {
        id: `k5_${kind}_${recordId}`,
        jobType: `${JOB_PREFIX}${kind}`,
        workSessionId: this.workSessionId,
        payload: { record },
      },
    })
    this.nextSeqValue += 1
    return record
  }

  of<T>(kind: K5RecordKind, planId?: string): K5Record<T>[] {
    return this.load().filter((r) => r.kind === kind && (planId === undefined || r.planId === planId)) as K5Record<T>[]
  }
}
