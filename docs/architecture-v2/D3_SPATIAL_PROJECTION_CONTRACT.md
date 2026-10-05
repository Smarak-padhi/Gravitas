# D3 Spatial Projection Contract

## 1. Projection Pipeline & Pure Functions

The Living HQ spatial projection contract guarantees that the visual world is a strictly deterministic, reproducible function of the canonical state.

```typescript
export interface SpatialProjection {
  readonly version: 'd3.0'
  readonly layoutVersion: 'd3.layout.1'
  readonly generatedAt: string
  readonly sourceRevision: number
  readonly entities: readonly SpatialEntity[]
  readonly decorations: readonly SpatialDecoration[]
  readonly kernelStatus: KernelLifecycleStatus
  readonly degradedReason?: 'OFFLINE' | 'STALE' | 'REDUCED'
  readonly notes: readonly string[]
}
```

## 2. Spatial Entities & Layout Zones

Spatial coordinates are deterministically calculated across four operational zones:
1. `OPERATIONS` (`z: -4.0`): WorkSessions and Runs.
2. `EXECUTION` (`z: 0.0`): Active tasks and worker execution nodes.
3. `VERIFICATION` (`z: 4.0`): Verification nodes, evidence evaluation, test reports.
4. `HUMAN_GATE` (`z: 8.0`): Pending approval markers requiring human review.
5. `SYSTEM` (`z: -8.0`): Kernel status anchor and runtime telemetry.

## 3. Revision Monotonicity (`decideAcceptance`)

Candidate projections are validated against current state:
```typescript
export function decideAcceptance(
  current: SpatialProjection | null,
  candidate: SpatialProjection
): { accept: boolean; reason: string } {
  if (!current) return { accept: true, reason: 'INITIAL_PROJECTION' }
  if (candidate.sourceRevision < current.sourceRevision) {
    return { accept: false, reason: 'STALE_REVISION' }
  }
  return { accept: true, reason: 'REVISION_ADVANCED_OR_EQUAL' }
}
```
Candidates with lower revision numbers are discarded without affecting scene state.
