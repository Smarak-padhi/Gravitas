# GRAVITAS — WAVE P8 VISUAL PROJECTION MODEL
## Unidirectional Projection Contract, Reconciliation & Animation System

**Status:** APPROVED ARCHITECTURAL SPECIFICATION  
**Wave:** P8 — Renderer Strategy Decision  
**Date:** 2026-10-01  
**Governing Invariants:**
- $\mathbf{VISUAL\ WORLD = PROJECTION\ OF\ RUNTIME\ STATE \quad (\text{NEVER THE SOURCE OF TRUTH})}$
- $\mathbf{VISUAL\ ENTITY \neq CANONICAL\ AGENT\ STATE}$
- $\mathbf{SCENE\ GRAPH \neq CONTROL\text{-}PLANE\ GRAPH}$
- $\mathbf{RENDERER\ EVENT \neq KERNEL\ EVENT}$
- $\mathbf{ANIMATION \neq WORK\ COMPLETION}$
- $\mathbf{100\ KERNEL\ EVENTS \neq 100\ RENDER\ FRAMES}$
- $\mathbf{GPU\ STATE \neq DURABLE\ STATE}$

---

## 1. The Unidirectional Projection Architecture

The visual world in GRAVITAS is strictly an **ephemeral downstream projection** of canonical Kernel state. 

```
+-------------------------------------------------------------------------+
| CANONICAL KERNEL STATE (P6 Authority: SQLite WAL + WorkSession Registry)|
+-------------------------------------------------------------------------+
                                     |
                                     | Unidirectional SSE / IPC Stream
                                     v
+-------------------------------------------------------------------------+
| PROJECTION ADAPTER (Renderer Engine: deriveWorldState / Reconciliation) |
| - Sanitizes incoming payloads                                           |
| - Coalesces high-frequency bursts                                       |
| - Maps canonical IDs to visual scene entities                           |
+-------------------------------------------------------------------------+
                                     |
                                     | Reactive Mutation
                                     v
+-------------------------------------------------------------------------+
| EPHEMERAL SCENE GRAPH (Three.js Scene + DOM Overlays)                   |
| - VisualAgent, VisualTask, VisualZone, VisualConnection                 |
| - Camera orientation, hover highlight, animation progress               |
+-------------------------------------------------------------------------+
```

### Non-Authority Invariants
1. **No Direct Upstream State Mutation:** The renderer cannot emit direct state mutations. Clicking "Approve Task" does **not** set `task.status = 'APPROVED'` in the renderer; it dispatches an unprivileged IPC command `submitApprovalDecision(taskId, decision)` to the Electron Main broker, which validates and forwards it to the Kernel.
2. **Crash Ephemerality:** If the renderer process crashes, restarts, or runs out of VRAM, the running WorkSessions continue uninterrupted. When the renderer recovers, it requests a canonical snapshot and re-projects the scene.

---

## 2. Projection Entity Taxonomy

Visual scene objects are ephemeral projections holding a reference to canonical Kernel identifiers:

```typescript
export interface VisualEntityBase {
  readonly visualId: string;        // Ephemeral renderer GUID
  readonly canonicalId: string;     // Canonical Kernel UUID (taskId, roleId, workSessionId)
  readonly entityType: 'AGENT' | 'TASK' | 'ZONE' | 'CONDUIT' | 'GATE';
  readonly epoch: number;           // Kernel snapshot revision sequence
}

export interface VisualAgent extends VisualEntityBase {
  readonly roleId: string;
  readonly roleName: string;
  readonly currentStationId: string;
  readonly targetStationId: string | null;
  readonly status: 'IDLE' | 'WORKING' | 'AWAITING_REVIEW' | 'BLOCKED' | 'ERROR';
  readonly currentTaskId: string | null;
  readonly currentToolActivity: string | null;
  readonly locomotionProgress: number; // 0.0 to 1.0 (ephemeral animation)
}

export interface VisualTask extends VisualEntityBase {
  readonly taskId: string;
  readonly title: string;
  readonly assignedRoleId: string;
  readonly status: 'QUEUED' | 'ACTIVE' | 'VERIFYING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'FAILED';
  readonly blockedByTaskIds: readonly string[];
  readonly screenAnchor: { x: number; y: number } | null;
}

export interface VisualConnection extends VisualEntityBase {
  readonly fromTaskId: string;
  readonly toTaskId: string;
  readonly connectionType: 'DAG_DEPENDENCY' | 'ARTIFACT_HANDOFF' | 'VERIFICATION_CONDUIT';
  readonly flowPulseActive: boolean;
}
```

---

## 3. Event Coalescing & Backpressure Architecture

Autonomous multi-agent swarms can emit bursts of hundreds of events per second (token streaming, tool invocations, lint checks, file mutations). If the renderer attempted to render every event as an independent frame:
- The main thread would freeze.
- V8 garbage collection would thrash.
- Animations would queue up and lag minutes behind system reality.

### The Invariant: $100\text{ Kernel Events} \neq 100\text{ Render Frames}$

```typescript
export class VisualEventCoalescer {
  private pendingEvents: KernelEvent[] = [];
  private latestSnapshot: RuntimeProjectionSnapshot | null = null;
  private rafScheduled = false;

  public onKernelEvent(event: KernelEvent): void {
    this.pendingEvents.push(event);
    this.scheduleFrame();
  }

  public onFullSnapshot(snapshot: RuntimeProjectionSnapshot): void {
    this.latestSnapshot = snapshot;
    this.scheduleFrame();
  }

  private scheduleFrame(): void {
    if (this.rafScheduled) return;
    this.rafScheduled = true;

    requestAnimationFrame((timestamp) => {
      this.rafScheduled = false;
      this.flushToSceneGraph(timestamp);
    });
  }

  private flushToSceneGraph(timestamp: number): void {
    // 1. If full snapshot received, reconcile full scene graph state
    if (this.latestSnapshot) {
      director.updateWorldState(deriveWorldState(this.latestSnapshot));
      this.latestSnapshot = null;
      this.pendingEvents = [];
      return;
    }

    // 2. Coalesce batched incremental events
    const batched = this.coalesceEventBatch(this.pendingEvents);
    this.pendingEvents = [];
    director.applyIncrementalBatch(batched);
  }
}
```

---

## 4. Animation Architecture & Interruptibility Contract

### The Animation Decoupling Invariant
$$\mathbf{ANIMATION \neq WORK\ COMPLETION}$$

1. **Rapid State Truth:** When the Kernel transitions a task from `ACTIVE` to `FAILED`, the visual status indicator, ARIA announcement, and inspector card update without waiting for animation completion.
2. **Interruptible Locomotion:** If an agent avatar is mid-transit walking to a review station and the task is suddenly cancelled or fails, the locomotion tween is immediately aborted. The avatar re-paths to the new target station without playing out an obsolete animation queue.
3. **No Stale Queues:** The renderer must not maintain an internal FIFO animation queue that visually replays stale events after they have completed or failed.
4. **Reduced Motion Adaptation:** When `prefers-reduced-motion` is active or the user toggles Reduced Motion in settings:
   - Spatial camera transitions jump directly ($\text{duration} = 0$).
   - Agent locomotion completes without walking tweening.
   - Status transitions use direct color swaps rather than animated pulses.
   - All critical status information is preserved.

---

## 5. Visual Truth & Projection Reconciliation

To guarantee protection against the **Visual Lie** (e.g. task visually green but Kernel reports failed):

1. **Epoch Fingerprinting:** Every Kernel snapshot carries a monotonically increasing `epoch` and a cryptographic SHA-256 state digest (`stateHash`).
2. **Periodic State Reconciliation:** Every 5 seconds, the renderer compares its projected `epoch` with the Kernel's latest heartbeat. If an event sequence gap is detected ($\text{renderer.epoch} < \text{kernel.epoch} - 1$):
   - The renderer flags the scene with a subtle `STALE_PROJECTION_RECONNECTING` banner.
   - Dispatches a request for an authoritative full snapshot `GET /api/v1/state/snapshot`.
   - Replaces the visual projection completely upon snapshot arrival.
3. **Human Approval Sovereignty:** The approval modal in Layer 3 displays the **canonical cryptographic provenance hash** of the artifact directly from Kernel evidence (`evidenceHash: 0xfe42...`). The operator approves the cryptographically hashed evidence, **never** the visual animation.
