# D4 Role-Bot Runtime & Projection Contract

## 1. System Invariants & Non-Authority Boundary

- **Projection Only**: Visual role-bots are derived entirely from canonical `WorkSessionState`, `TaskDef`, and `ExecutionItem` records.
- **Zero Mutation Authority**: Selecting, clicking, or interacting with a role-bot in the 3D scene or semantic DOM view issues NO state-mutating commands. It only updates the view selection.
- **Zero Capability Elevation**: Role-bots cannot request, authorize, or enforce capability grants.
- **Fail-Closed Fallback**: Any role ID not found in the role visual registry falls back safely to a generic specialist archetype (`CYLINDER_HEAD`, neutral grey palette) with zero privileged rights.

## 2. Projection Contract (`projectToSpatial`)

The projection pipeline maps canonical state into spatial entities:

```typescript
export interface SpatialRoleBotMetadata {
  roleId: string;
  roleTier: 'TIER1_REASONING' | 'TIER2_SPECIALIST' | 'TIER3_MECHANICAL';
  silhouette: 'CYLINDER_HEAD' | 'HELMET_OCTA' | 'CONE_PRISM' | 'TORUS_DEVICE' | 'BOX_UNIT';
  primaryColor: string;
  secondaryColor: string;
  emblem: string;
  mechanicalService: boolean;
  executorId?: string;
  harnessId?: string;
  harnessSurface?: string;
  modelFamily?: string;
  processId?: number;
  liveActivity?: boolean;
}
```

### Derivation Rules:
1. Every task with a valid role assignment yields a `SpatialEntity` with `sourceType: 'ROLE_BOT'`.
2. Spatial positions are calculated deterministically offset from the parent task's anchor node within the functional zone (`OPERATIONS`, `EXECUTION`, `VERIFICATION`, `STORAGE`).
3. Visual states follow the canonical execution lifecycle:
   - Task `PENDING` / `BLOCKED` -> Bot `BLOCKED` or `IDLE`.
   - Task `RUNNING` + Execution active -> Bot `ACTIVE` with `liveActivity: true`.
   - Execution succeeded -> Bot `WORKER_SUCCEEDED` (no celebration).
   - Verification complete -> Bot `VERIFIED_PASS` or `VERIFIED_FAIL`.
   - Gate pending -> Bot `AWAITING_HUMAN_APPROVAL` (requires operator decision).
