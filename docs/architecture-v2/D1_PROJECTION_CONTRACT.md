# D1 Canonical Projection Contract

## 1. Principles of Projection Architecture
In GRAVITAS Wave D1, the desktop user interface is strictly a **projection** of the underlying canonical state managed by `WorkSessionKernel`.

**Core Guarantees**:
1. **Zero UI Authority**: The renderer holds no authority to alter state directly. All UI views are passive projections derived from canonical entities.
2. **Structured-Clone Safety**: All projections sent across IPC boundaries are plain JavaScript objects containing primitive values, strings, numbers, booleans, and nested plain objects/arrays. Zero class instances, prototypes, or hidden methods cross the boundary.
3. **Epistemological Integrity**: Worker claims and Supervisor approvals are explicitly presented as subjective historical claims, while independent verification results are presented as verified observations.
4. **No State Fabrication**: If the Kernel is offline or disconnected, projections explicitly display degraded/offline status rather than fabricating empty or placeholder records.

## 2. Projection Schemas

### 2.1 Overview Projection (`OverviewProjection`)
```typescript
interface OverviewProjection {
  kernelStatus: 'READY' | 'STARTING' | 'STOPPED' | 'ERROR'
  activeWorkSessionsCount: number
  waitingApprovalCount: number
  recentActivity: Array<{
    id: string
    timestamp: string
    eventType: string
    summary: string
    sessionId?: string
    taskId?: string
  }>
  canonicalRevision: number
}
```

### 2.2 Work Hierarchy Projection (`WorkHierarchyProjection`)
Represents the hierarchical breakdown of work:
```typescript
interface WorkHierarchyProjection {
  sessions: Array<{
    id: string
    title: string
    state: string
    activeRunId: string | null
    createdAt: string
    runs: Array<{
      id: string
      runNumber: number
      status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'CANCELLED'
      startedAt: string | null
      completedAt: string | null
      tasks: Array<{
        id: string
        taskNumber: number
        roleId: string
        state: 'PENDING' | 'ASSIGNED' | 'EXECUTING' | 'VERIFYING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
        assignedExecutorId: string | null
        leaseExpiresAt: string | null
      }>
    }>
  }>
  canonicalRevision: number
}
```

### 2.3 Task Detail Projection (`TaskDetailProjection`)
Detailed inspection of a specific task, including boundaries, capability grants, and execution history:
```typescript
interface TaskDetailProjection {
  taskId: string
  sessionId: string
  runId: string
  taskNumber: number
  roleId: string
  state: string
  assignedExecutorId: string | null
  leaseExpiresAt: string | null
  capabilityGrants: Array<{
    toolId: string
    grantedAt: string
    authorityScope: string
  }>
  executionHistory: Array<{
    sequence: number
    actionType: string
    status: string
    timestamp: string
  }>
  canonicalRevision: number
}
```

### 2.4 Execution Projection (`ExecutionProjection`)
Provides forensic visibility into K1/K2/K3 execution details:
```typescript
interface ExecutionProjection {
  executions: Array<{
    id: string
    taskId: string
    roleId: string
    executorId: string
    harnessId: string
    modelId: string
    toolExecutionsCount: number
    costUsd: number
    tokensUsed: number
    startedAt: string
    completedAt: string | null
    status: string
  }>
  canonicalRevision: number
}
```

### 2.5 Verification Projection (`VerificationProjection`)
Presents K5 verification plans, criteria pre-binding, evidence manifests, and verification reports:
```typescript
interface VerificationProjection {
  verifications: Array<{
    planId: string
    taskId: string
    runId: string
    criteriaRevision: number
    status: 'PLANNED' | 'EXECUTING' | 'VERIFIED_PASS' | 'VERIFIED_FAIL' | 'INCONCLUSIVE'
    verifiersCount: number
    evidenceCount: number
    reportDigest: string | null
    createdAt: string
  }>
  canonicalRevision: number
}
```

### 2.6 Approval Queue Projection (`ApprovalQueueProjection`)
Enumerates all items awaiting sovereign human decision:
```typescript
interface ApprovalQueueItem {
  id: string
  taskId: string
  runId: string
  sessionId: string
  currentRevision: number
  verificationVerdict: 'VERIFIED_PASS' | 'VERIFIED_FAIL' | 'INCONCLUSIVE' | 'UNVERIFIED'
  requestedAction: string
  summary: string
  createdAt: string
}

interface ApprovalQueueProjection {
  items: ApprovalQueueItem[]
  canonicalRevision: number
}
```

### 2.7 System Projection (`SystemProjection`)
Diagnostics, host metrics, and runtime boundaries:
```typescript
interface SystemProjection {
  electronVersion: string
  nodeVersion: string
  platform: string
  mainPid: number
  kernelPid: number
  pidsDistinct: boolean
  supervisorStatus: 'INITIALIZING' | 'STARTING' | 'READY' | 'STOPPED' | 'ERROR'
  protocolVersion: string
  memoryUsageMb: number
  canonicalRevision: number
}
```

### 2.8 Activity Projection (`ActivityProjection`)
Chronological audit trail of canonical system events:
```typescript
interface ActivityProjection {
  events: Array<{
    id: string
    timestamp: string
    source: string
    eventType: string
    summary: string
  }>
  canonicalRevision: number
}
```

## 3. Projection Invalidation and Refresh
- **Proactive Invalidation**: When an operator intent modifies canonical state, or when a background kernel transition occurs, the KernelHost emits a typed `PROJECTION_UPDATED` notification containing the projection type and the updated `canonicalRevision`.
- **Subscriber Dispatch**: Electron Main proxies this notification to all connected renderer webContents.
- **Manual Refresh**: Renderers may issue a `REFRESH_PROJECTION` intent at any time to obtain the latest projection without causing any state mutation.
