# D1 Operator Intent Contract & Mutation Semantics

## 1. Principles of Operator Intent
In GRAVITAS Wave D1, the user interface cannot directly invoke database mutations or execute backend methods. Instead, user interactions emit strongly typed, bounded **Operator Intents**.

**Governing Rules**:
1. **Strictly Closed Schema**: Only explicitly defined intent structures are accepted. Arbitrary shell commands, dynamic method invocation, and raw SQL queries are structurally impossible.
2. **Actor Kind Verification**: Only intents with `actorKind: 'HUMAN_OPERATOR'` are permitted. Machine actors (workers, tools, harnesses, automated supervisors) attempting to submit intents are strictly rejected.
3. **Optimistic Concurrency & Revision Checking**: Mutations targeting state entities require an `expectedRevision`. If the entity's current revision does not match `expectedRevision`, the intent is rejected fail-closed to prevent race conditions or acting on stale information.
4. **Gate Algebra Enforcement**: Human approval requires prior verification pass (`VERIFIED_PASS`). An attempt to approve an unverified or failed task is blocked fail-closed.
5. **No Automatic Downstream Actions**: Recording an approval intent NEVER triggers git merges, deployments, network publishes, or budget expansion.

## 2. Intent Specifications

### 2.1 Record Human Decision Intent (`RecordHumanDecisionIntent`)
Used by the operator to record a sovereign approval or rejection decision against an item in the approval queue:
```typescript
interface RecordHumanDecisionIntent {
  intentType: 'RECORD_HUMAN_DECISION'
  actorKind: 'HUMAN_OPERATOR'
  itemId: string
  decision: 'APPROVE' | 'REJECT'
  expectedRevision: number
  reason: string
}
```

**Evaluation Rules**:
- Validates `actorKind === 'HUMAN_OPERATOR'`. Returns `DENIED` otherwise.
- Looks up the targeted approval item by `itemId`. If not found, returns `REJECTED`.
- Verifies `expectedRevision === currentRevision`. If mismatched, returns `REJECTED` (`STALE_APPROVAL_REVISION`).
- If `decision === 'APPROVE'`, verifies `verificationVerdict === 'VERIFIED_PASS'`. If the verdict is `VERIFIED_FAIL`, `INCONCLUSIVE`, or `UNVERIFIED`, approval is blocked fail-closed with `REJECTED`.
- Durably records the human decision in `WorkSessionKernel`.
- Increments `canonicalRevision` and emits `PROJECTION_UPDATED`.
- Explicitly guarantees `authorizesMerge: false`, `authorizesDeploy: false`, `authorizesRelease: false`.

### 2.2 Cancel Task Intent (`CancelTaskIntent`)
Used by the operator to abort an ongoing or queued task:
```typescript
interface CancelTaskIntent {
  intentType: 'CANCEL_TASK'
  actorKind: 'HUMAN_OPERATOR'
  taskId: string
  reason: string
}
```

**Evaluation Rules**:
- Validates `actorKind === 'HUMAN_OPERATOR'`.
- Invokes `WorkSessionKernel.handleCancelTask(taskId, reason)`.
- Updates task state to `CANCELLED`.
- Releases active executor leases.
- Increments `canonicalRevision` and broadcasts update.

### 2.3 Refresh Projection Intent (`RefreshProjectionIntent`)
Used to request a fresh projection computation without mutating any state:
```typescript
interface RefreshProjectionIntent {
  intentType: 'REFRESH_PROJECTION'
  actorKind: 'HUMAN_OPERATOR'
  projectionType: 'OVERVIEW' | 'WORK_HIERARCHY' | 'TASK_DETAIL' | 'EXECUTION' | 'VERIFICATION' | 'APPROVAL_QUEUE' | 'SYSTEM' | 'ACTIVITY'
}
```

**Evaluation Rules**:
- Validates `actorKind === 'HUMAN_OPERATOR'`.
- Performs a zero-mutation read of canonical state and signals success.

## 3. Intent Result Structure (`IntentResult`)
All intents yield a bounded, structured result:
```typescript
interface IntentResult {
  success: boolean
  intentType: OperatorIntent['intentType']
  status: 'ACCEPTED' | 'REJECTED' | 'DENIED'
  safeMessage: string
  updatedRevision?: number
}
```
Zero raw exceptions, stack traces, or internal database error strings are leaked to the renderer.
