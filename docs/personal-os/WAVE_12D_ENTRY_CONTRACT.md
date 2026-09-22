# Wave 12D Entry Gate Contract & Scope Freeze (Wave 12C.5)

## 1. Scope Boundary for Wave 12D

$$\text{Wave 12D is STRICTLY a Minimal Role-Based Character Foundation Wave.}$$

### Wave 12D IS ALLOWED to implement:
1. Anchoring exactly **four (4) role-based humanoid characters** to their designated workstations in the 3D Headquarters:
   - `role:strategy:chief-planner` at `planning-table`
   - `role:engineering:frontend-engineer` at `codex-workstation`
   - `role:engineering:backend-engineer` at `fcc-workstation`
   - `role:quality:independent-reviewer` at `verification-lab-console`
2. Non-productive, subtle **idle breathing cycles** when workstations are idle.
3. Focused work postures (active monitor illumination, typing orientation) **if and only if** an authoritative task is active at that station in `RuntimeProjectionSnapshot`.
4. Dockable **2D Inspector Metadata**, truthfully presenting decoupled role vs. harness attributes (`ROLE`, `CURRENT HARNESS`, `TRANSPORT`, `PROVIDER`, `MODEL`).
5. Maintaining **Browser QA as the 9-Screen Device Matrix Wall** in Room 4 (pure infrastructure, not a humanoid character).

---

### Wave 12D is STRICTLY FORBIDDEN from implementing:
- ❌ **NO Locomotion:** No character walking between rooms or pathfinding across the floor.
- ❌ **NO Additional Roles:** Do NOT implement `PersonalCoach`, `LeadResearcher`, `OutreachDrafter`, or `Courier` characters during 12D.
- ❌ **NO Connectors:** Do NOT implement Calendar, Email, WhatsApp, or cloud connectors.
- ❌ **NO Autonomous Speech or Chat:** No freeform character-to-character chat simulation.
- ❌ **NO Fake Activity:** No simulated work animations without an active server task.
- ❌ **NO Scheduler Code Changes:** Do NOT alter `@gravitas/orchestrator` task scheduling in 12D.

---

## 2. Frozen Initial Character Roster Specifications

```typescript
export const WAVE_12D_FROZEN_ROSTER = [
  {
    roleId: 'role:strategy:chief-planner',
    displayName: 'Chief Planner',
    departmentId: 'STRATEGY',
    defaultStationId: 'planning-table',
    room: 'MISSION_CONTROL',
    visualArchetype: 'planner-male',
    accentColorToken: '#38bdf8', // Sky Blue
    badgeIcon: 'compass',
  },
  {
    roleId: 'role:engineering:frontend-engineer',
    displayName: 'Frontend Engineer',
    departmentId: 'ENGINEERING',
    defaultStationId: 'codex-workstation',
    room: 'AGENT_OPERATIONS',
    visualArchetype: 'engineer-female',
    accentColorToken: '#22d3ee', // Cyan
    badgeIcon: 'layout',
  },
  {
    roleId: 'role:engineering:backend-engineer',
    displayName: 'Backend Engineer',
    departmentId: 'ENGINEERING',
    defaultStationId: 'fcc-workstation',
    room: 'AGENT_OPERATIONS',
    visualArchetype: 'engineer-male',
    accentColorToken: '#10b981', // Emerald
    badgeIcon: 'database',
  },
  {
    roleId: 'role:quality:independent-reviewer',
    displayName: 'Independent Reviewer',
    departmentId: 'QUALITY',
    defaultStationId: 'verification-lab-console',
    room: 'VERIFICATION_CLEANROOM',
    visualArchetype: 'specialist-female',
    accentColorToken: '#f59e0b', // Amber
    badgeIcon: 'shield-check',
  },
] as const
```

---

## 3. Station Ownership & Role-to-Station Mapping

1. **Station Assignment Rule:**  
   When a task runs on a workstation, the 3D scene mounts the character corresponding to the task's assigned `AgentRole`. If no task is active, the default assigned role sits or stands in idle breathing posture.
2. **Unknown Role Fallback:**  
   If a task specifies an unrecognized role ID, the character representation resolves to `null` (or `NEUTRAL_HOLD`), strictly avoiding false assignment to Codex or FCC stations.

---

## 4. Verification Gates Mandatory for Wave 12D Sign-Off

Before Wave 12D can be approved upon completion, it must pass:
1. `npm run typecheck`: 0 errors across monorepo.
2. `npx vitest run --fileParallelism=false`: 627+ tests pass serially.
3. `npm run build`: Production build passes cleanly.
4. Playwright E2E tests:
   - Verify 4 characters mount at their exact 3D coordinates.
   - Verify clicking each character docks the 2D Inspector with decoupled metadata.
   - Verify characters remain idle when tasks are inactive.
   - Capture 4 deterministic screenshots under `docs/3d-hq/evidence/wave12d/`.
