# GRAVITAS — WAVE K0 WORKSESSION KERNEL CONTRACT
## Formal Domain Models, FSM Transition Matrix, Command Envelopes & Event Schema

**Status**: FROZEN SPECIFICATION & VERIFIED IMPLEMENTATION  
**Module**: `packages/core/src/kernel/`  
**Governing Invariant**:  
`ROLE ≠ EXECUTOR ≠ HARNESS ≠ MODEL ≠ PROVIDER ≠ GATEWAY ≠ PROCESS`  
`WORKER PROCESS ≠ CANONICAL DATABASE WRITER`  
`LIVE SUBSCRIPTION ≠ CANONICAL TRUTH`

---

## 1. Domain Entities & Type Contracts

### 1.1 WorkSession Entity
Located at [`packages/core/src/kernel/domain/worksession.ts`](file:///c:/Users/smara/Desktop/Multi-agent/packages/core/src/kernel/domain/worksession.ts):
```typescript
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
  readonly goal?: string | undefined // Ergonomic alias for objective
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
```

### 1.2 Runs and Tasks
```typescript
export interface WorkSessionRun {
  readonly id: string
  readonly workSessionId: string
  readonly goal: string
  readonly status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WorkSessionTask {
  readonly id: string
  readonly runId: string
  readonly workSessionId: string
  readonly title: string
  readonly state: 'PENDING' | 'READY' | 'RUNNING' | 'WAITING_APPROVAL' | 'INTERRUPTED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  readonly assignedRoleId?: string | undefined
  readonly requiresApproval: boolean
  readonly createdAt: string
  readonly updatedAt: string
}
```

---

## 2. Finite State Machine (FSM) Matrix

Located at [`packages/core/src/kernel/domain/fsm.ts`](file:///c:/Users/smara/Desktop/Multi-agent/packages/core/src/kernel/domain/fsm.ts).

### Transition Table

| From State | Allowed Target States | Description / Operational Meaning |
| :--- | :--- | :--- |
| `CREATED` | `READY`, `CANCELLED` | Session provisioned; transitioning to ready for dispatch. |
| `READY` | `ACTIVE`, `CANCELLED` | Work execution commenced. |
| `ACTIVE` | `WAITING_APPROVAL`, `PAUSED`, `COMPLETED`, `FAILED`, `CANCELLED`, `RECOVERY_REQUIRED` | Active execution. Transitions to approval gate, pause, terminal, or crash recovery. |
| `WAITING_APPROVAL` | `ACTIVE`, `CANCELLED` | Human approval gate. Approved $\to$ ACTIVE; Rejected $\to$ CANCELLED. Preserved across restarts. |
| `PAUSED` | `ACTIVE`, `CANCELLED` | Operator suspension. Resumed $\to$ ACTIVE; Terminated $\to$ CANCELLED. |
| `RECOVERY_REQUIRED` | `ACTIVE`, `FAILED`, `CANCELLED` | Recovered from abnormal restart. Operator / reconciler review before continuing. |
| `COMPLETED` | *(None)* | **Terminal State** (Immutable). Transitions rejected fail-closed. |
| `FAILED` | *(None)* | **Terminal State** (Immutable). Transitions rejected fail-closed. |
| `CANCELLED` | *(None)* | **Terminal State** (Immutable). Transitions rejected fail-closed. |

---

## 3. Command & Receipt Envelope Contracts

Located at [`packages/core/src/kernel/domain/commands.ts`](file:///c:/Users/smara/Desktop/Multi-agent/packages/core/src/kernel/domain/commands.ts):

```typescript
export type KernelCommandType =
  | 'CREATE_WORKSESSION'
  | 'CREATE_WORK_SESSION'
  | 'TRANSITION_WORKSESSION'
  | 'TRANSITION_WORK_SESSION'
  | 'CREATE_RUN'
  | 'CREATE_TASK'
  | 'TRANSITION_TASK'
  | 'CREATE_DURABLE_JOB'
  | 'CLAIM_JOB_LEASE'

export interface KernelCommand<TPayload = unknown> {
  readonly commandId: string
  readonly commandType?: KernelCommandType | undefined
  readonly type?: KernelCommandType | undefined // Ergonomic alias
  readonly targetAggregateId?: string | undefined
  readonly workSessionId?: string | undefined
  readonly expectedRevision?: number | undefined
  readonly payload: TPayload
}

export interface CommandReceipt {
  readonly commandId: string
  readonly commandType: string
  readonly targetAggregateId: string
  readonly expectedRevision?: number | undefined
  readonly requestHash: string
  readonly status: 'COMMITTED' | 'REJECTED'
  readonly resultJson: string
  readonly createdAt: string
}

export interface CommandResult<TResult = unknown> {
  readonly commandId: string
  readonly status: 'COMMITTED' | 'ALREADY_COMMITTED'
  readonly success: boolean
  readonly aggregateRevision: number
  readonly currentRevision: number
  readonly result: TResult
}
```

### Idempotency and Conflict Semantics
1. **Identical Re-delivery**: Re-issuing an identical `commandId` with the exact same semantic fingerprint returns the cached receipt with status `ALREADY_COMMITTED` and `success: true` without executing duplicate side-effects.
2. **Semantic Fingerprint Coverage**: The request hash is computed using a deterministic canonical representation covering:
   - `commandType`
   - `targetAggregateId`
   - `workSessionId`
   - `expectedRevision`
   - Deeply sorted, canonicalized JSON `payload`
3. **Conflicting Re-delivery**: Re-issuing an existing `commandId` with a different semantic fingerprint (different payload, command type, or target aggregate) raises `CommandConflictError` and fails closed.
4. **Optimistic Concurrency**: If `expectedRevision` is provided and does not equal the target aggregate's actual revision, `RevisionConflictError` is thrown and the transaction is aborted.

---

## 4. Durable Event Log Schema & Integrity

Located at [`packages/core/src/kernel/domain/events.ts`](file:///c:/Users/smara/Desktop/Multi-agent/packages/core/src/kernel/domain/events.ts):

```typescript
export type KernelAggregateType = 'WORKSESSION' | 'RUN' | 'TASK' | 'JOB' | 'KERNEL'

export interface DurableEvent<TPayload = Record<string, unknown>> {
  readonly sequenceId: number
  readonly sequenceNumber: number // Ergonomic monotonic counter alias
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
```

### Invariants:
- Monotonically increasing `sequence_id` assigned by SQLite `INTEGER PRIMARY KEY AUTOINCREMENT`.
- Reconstructed directly from SQLite; live pub/sub subscribers are secondary consumers.
- **Append-Only Contract**: Classified as `APPEND_ONLY_THROUGH_KERNEL_MUTATION_CONTRACT`. The WorkSession Kernel exposes only `appendDurableEvent` without update or delete APIs. Physical immutability against out-of-band host administrative database access is not claimed.
- **Durable Integrity**: Backed by SQLite DDL `CHECK` constraints on `aggregate_type IN ('WORKSESSION', 'RUN', 'TASK', 'JOB', 'KERNEL')` and `aggregate_revision >= 1`.
