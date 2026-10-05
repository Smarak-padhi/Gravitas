# K0 RENDERER CONSTRAINT INPUT PACKET
## Architectural Boundary Contracts & State Projection Specifications for Phase K0

**Status:** APPROVED HANDOFF INPUT DOSSIER  
**Target Wave:** Phase K0 — WorkSession Kernel Implementation  
**Date:** 2026-10-01  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335` (Clean working tree)  
**Governing Invariants:**
- $\mathbf{P8\ RENDERER\ DECISION \neq PHASE\ K\ IMPLEMENTATION}$
- $\mathbf{P8\ OUTPUT \to K0\ INPUT}$
- $\mathbf{VISUAL\ WORLD = PROJECTION\ OF\ RUNTIME\ STATE \quad (\text{NEVER THE SOURCE OF TRUTH})}$
- $\mathbf{RENDERER \neq PRIVILEGED\ KERNEL}$
- $\mathbf{SCENE\ GRAPH \neq CONTROL\text{-}PLANE\ GRAPH}$
- $\mathbf{100\ KERNEL\ EVENTS \neq 100\ RENDER\ FRAMES}$
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$

---

## 1. Scope & Boundary of Phase K0

Wave P8 has finalized the **Living HQ Rendering Architecture**:
$$\mathbf{SELECTED\_RENDERER\_ARCHITECTURE = CANDIDATE\ F\ (HYBRID\ MULTI-LAYER\ ARCHITECTURE)}$$

Phase K0 retains **sovereign authority** over the **WorkSession Kernel Implementation** (process management, SQLite persistence, durable jobs, worker sandboxing, and execution traces). 

This document serves strictly as the **boundary specification** defining the data contracts, streaming formats, and backpressure expectations that the K0 Kernel must provide to downstream UI projections without compromising control-plane performance.

---

## 2. Kernel State Projection Contract (K0 $\to$ Renderer)

The K0 Kernel must expose two unprivileged, sanitized read endpoints/streams for visual projection:

### 1. Full State Snapshot Endpoint (`GET /api/v1/state/snapshot`)
Used on initial UI mount, window restore, or after recovering from a renderer crash:

```typescript
export interface RuntimeProjectionSnapshot {
  readonly epoch: number;               // Monotonically increasing revision sequence
  readonly timestamp: number;           // Unix millisecond timestamp
  readonly stateHash: string;           // SHA-256 digest of canonical database state
  readonly workSessions: readonly {
    readonly workSessionId: string;
    readonly title: string;
    readonly status: 'ACTIVE' | 'IDLE' | 'BLOCKED' | 'COMPLETED' | 'FAILED';
    readonly activeRoleId: string;
    readonly activeRoleName: string;
    readonly assignedStationId: string;
    readonly currentTaskId: string | null;
  }[];
  readonly tasks: readonly {
    readonly taskId: string;
    readonly workSessionId: string;
    readonly title: string;
    readonly status: 'QUEUED' | 'RUNNING' | 'VERIFYING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'FAILED';
    readonly assignedRoleId: string;
    readonly blockedBy: readonly string[];
    readonly evidenceDigest?: string;
  }[];
  readonly activeApprovals: readonly {
    readonly approvalId: string;
    readonly taskId: string;
    readonly roleId: string;
    readonly actionSummary: string;
    readonly evidenceDigest: string;    // Cryptographic hash of artifact for human sign-off
    readonly createdAt: number;
  }[];
}
```

### 2. Incremental Event Stream (`SSE /api/v1/events` or IPC Event Channel)
Emits granular progress events for real-time visual transitions:

```typescript
export type KernelProjectionEvent =
  | { type: 'WORKSESSION_SPAWNED'; workSessionId: string; roleId: string; epoch: number }
  | { type: 'TASK_TRANSITION'; taskId: string; fromStatus: string; toStatus: string; epoch: number }
  | { type: 'HANDOFF_DISPATCHED'; taskId: string; fromRoleId: string; toRoleId: string; epoch: number }
  | { type: 'APPROVAL_REQUESTED'; approvalId: string; taskId: string; evidenceDigest: string; epoch: number }
  | { type: 'APPROVAL_RESOLVED'; approvalId: string; decision: 'APPROVED' | 'REJECTED'; epoch: number }
  | { type: 'HEARTBEAT'; epoch: number; timestamp: number };
```

---

## 3. Backpressure & Coalescing Guarantees

1. **Kernel Freedom from Render Frequency:**
   - The K0 Kernel must never block, throttle, or synchronize its internal execution loops on renderer frame rate.
   - Kernel task execution continues at maximum speed regardless of whether the UI is running at 120 FPS, 1 FPS, or completely minimized with the render loop halted.
2. **Event Payload Sanitization:**
   - Raw agent prompt tokens, full stdout buffers, and internal secrets must **never** be broadcast over public visual projection events.
   - Downstream UI projections receive only high-level status metadata, sanitized summary strings, and truncated log slices. Full raw logs are retrieved on demand via paginated endpoints.
3. **Sequence Monotonicity:**
   - Every event must carry an incrementing integer `epoch` or `sequence` number. This enables the renderer to detect network drops or message gaps and automatically trigger snapshot reconciliation.

---

## 4. Human Approval Gate Contract (Renderer $\to$ K0)

When the operator interacts with an approval plinth in the Living HQ:
1. The renderer dispatches an unprivileged IPC command:
   ```typescript
   window.gravitasAPI.submitApprovalDecision({
     approvalId: 'app-901',
     taskId: 'T-142',
     decision: 'APPROVED',
     operatorComments: 'Approved after review.'
   });
   ```
2. **Kernel Sovereign Verification:**
   - The K0 Kernel **never trusts the renderer's visual state**.
   - Upon receiving the IPC command, the Kernel independently queries its internal SQLite database, confirms that `app-901` is actively in `PENDING` state, verifies caller authority, and records the human decision in the immutable audit log before transitioning the task.

---

## 5. Handoff Verification Sign-Off

- [x] Living HQ Renderer Architecture finalized: Candidate F (Hybrid Multi-Layer).
- [x] Unprivileged projection boundaries formal and complete.
- [x] Snapshot and event schemas defined without leaking internal secrets.
- [x] Backpressure and sequence monotonicity contracts established.
- [x] No implementation of Phase K0 code performed.
