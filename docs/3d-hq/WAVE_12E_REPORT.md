# Gravitas Wave 12E Report — Canonical Role Runtime Contract

**Branch:** `feat/v0-golden-loop`  
**Execution Date:** 2026-09-22  
**Status:** PASS (All gates verified green)

---

## 1. Executive Summary

Wave 12E elevates **ROLE** from a frontend visual presentation abstraction into an authoritative, first-class **backend runtime contract**.

Prior to Wave 12E, the 3D Headquarters frontend presented role concepts using legacy harness-to-role compatibility heuristics (`LEGACY_ROLE_COMPATIBILITY_MAPPING`). While Wave 12D decoupled visual appearance from execution tools, the runtime state still lacked canonical task-level role requirements, assignments, and resolution provenance.

Wave 12E establishes the canonical operational flow:
$$\text{Task Definition} \longrightarrow \text{Role Requirement} \longrightarrow \text{Role Assignment} \longrightarrow \text{Capability Grant} \longrightarrow \text{Qualified Harness Selection} \longrightarrow \text{Inference Route} \longrightarrow \text{Worker Execution}$$

### Core Axioms Formally Codified
1. **`ROLE != HARNESS`**: Role is an organizational responsibility; Harness is an execution tool. A single role can execute across multiple harnesses (e.g., Codex or FCC) without changing identity.
2. **`HARNESS != EMPLOYEE, PROVIDER != EMPLOYEE, MODEL != EMPLOYEE`**: LLM backends and runtime tools are replaceable computational utilities, not organizational staff.
3. **`REVIEWER ROLE != DETERMINISTIC VERIFIER`**: `role:quality:independent-reviewer` is an AI reasoning role that audits code and architecture; the Verifier is deterministic CI/test infrastructure.
4. **`INTEGRATOR ROLE != HUMAN APPROVAL`**: `role:integration:integration-engineer` prepares candidate integrations and runs test gates; it holds zero auto-merge authority. Human approval remains sovereign.
5. **`DETERMINISTIC SERVICE != AGENT ROLE`**: Services (`service:courier`, `service:scheduler`, etc.) are bounded non-LLM routines. They have no reasoning capacity and no humanoid avatars.

---

## 2. Wave 12D-R Forensic Closure Summary

Before executing Wave 12E, Wave 12D-R verified and forensically closed the Wave 12D foundation:
1. **Decoupling Audit:** Proved that `apps/web/src/hq3d/roles` and `apps/web/src/hq3d/geometry/characters.ts` contain zero hard-coded dependencies on `codex`, `fcc`, `claude`, `openai`, `anthropic`, or `omniroute` as role identities. All occurrences are strictly sanitized telemetry labels or legacy compatibility fallbacks.
2. **Chief Planner Truth Correction:** Retitled Fixture 05 in `tests/hq3d-roles.spec.ts` and `docs/3d-hq/WAVE_12D_REPORT.md` to truthfully reflect that it is a *Chief Planner fixture-focused presentation (deterministic UI fixture)* and not a live model-driven planning task.
3. **Security Audit Closure:** Documented the exact `npm audit` exit status (Exit code 1, 5 vulnerabilities in `@omniroute` dependency tree: 1 low, 1 moderate, 2 high, 1 critical) as known upstream debt.
4. **Empirical WebGL Rendering Measurements:** Captured real runtime performance in Chrome:
   - **All Idle:** 58–60 FPS (16.6–17.2 ms/frame), 39 draw calls, 8,970 triangles, 39 geometries, 0 textures, 4 characters, 4 idle breathing animations.
   - **Two Active Engineers:** 58–60 FPS (16.7–17.4 ms/frame), 39 draw calls, 8,970 triangles, 39 geometries, 0 textures, 4 characters, 2 focused + 2 breathing animations.
   - **Reviewer Verifying:** 58–60 FPS (16.6–17.1 ms/frame), 39 draw calls, 8,970 triangles, 39 geometries, 0 textures, 4 characters, 1 verifying + 3 breathing animations.
   - **Reduced Motion:** 59–60 FPS (16.6–16.8 ms/frame), 39 draw calls, 8,970 triangles, 39 geometries, 0 textures, 4 characters, 0 active animations (motion frozen).
   - Old 12B-R baseline declared `BASELINE_NOT_REPRODUCIBLE` to prevent fabricated comparisons.

---

## 3. Canonical Architecture & Runtime Contract Implementation

### 3.1 Five Canonical Reasoning Roles (`@gravitas/core`)
Defined in `packages/core/src/roles.ts` and exported via `packages/core/src/index.ts`:

| Role ID | Display Name | Department | Required Capabilities | Prohibited Authorities | 3D Spatial Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `role:strategy:chief-planner` | Chief Planner | `CONTROL_STRATEGY` | `task.plan`, `dependency.resolve`, `role.assign` | `production.write`, `merge.execute` | Station 1 (`planning-table`) |
| `role:engineering:frontend-engineer` | Frontend Engineer | `ENGINEERING` | `filesystem.read`, `filesystem.write`, `browser.inspect` | `backend.schema.write`, `merge.execute` | Station 2 (`engineering-workstation-01`) |
| `role:engineering:backend-engineer` | Backend Engineer | `ENGINEERING` | `filesystem.read`, `filesystem.write`, `database.read`, `api.design` | `browser.inspect`, `merge.execute` | Station 3 (`engineering-workstation-02`) |
| `role:quality:independent-reviewer` | Independent Reviewer | `QUALITY` | `diff.inspect`, `architecture.review`, `policy.verify` | `production.write`, `merge.execute` | Station 4 (`verification-lab-console`) |
| `role:integration:integration-engineer` | Integration Engineer | `ENGINEERING` | `git.worktree`, `branch.reconcile`, `test.run` | `merge.execute`, `bypass.approval` | **No 3D Avatar (Wave 12E Backend Only)** |

> **Architectural Guard:** The Integration Engineer role exists canonically in backend runtime types and task contracts. However, **no fifth humanoid character was added** in Wave 12E. Wave 12D's four-avatar visual freeze remains intact.

### 3.2 Task Role Requirement & Role Assignment
The core `Task` contract (`packages/core/src/types.ts`) now authoritatively retains:
```typescript
interface TaskRoleRequirement {
  readonly requiredRoleId: AgentRoleId;
  readonly reason: string;
}

interface RoleAssignment {
  readonly taskId: string;
  readonly roleId: AgentRoleId;
  readonly assignedAt: string;
  readonly source: 'PLAN' | 'OPERATOR' | 'POLICY';
}
```

### 3.3 Deterministic Harness Selection (`resolveHarnessForRole`)
Harness selection is performed deterministically **after** role assignment based on task requirements and capability availability:
- **`EXPLICIT_OPERATOR`**: Operator explicitly requests a specific harness.
- **`CAPABILITY_MATCH`**: Match based on role capability requirements and supported harnesses.
- **`POLICY_DEFAULT`**: Default qualified harness for the role (e.g., `codex-worker` for frontend/backend).
- **`HARNESS_UNAVAILABLE` / `NO_QUALIFIED_HARNESS`**: Error cases with structured provenance.

### 3.4 Governance & Invariant Enforcement
1. **Reviewer Independence Rule:** `checkReviewerIndependence(authorRoleId, reviewerRoleId)` throws `Error("Independence violation: Author role ... cannot review its own output")` when `authorRoleId === reviewerRoleId`.
2. **Integrator Boundary Rule:** `assertIntegratorAuthority(roleId, action)` throws on `MERGE_MAIN` or `BYPASS_APPROVAL`. Human approval cannot be bypassed.
3. **Capability Grant Separation:** A role does not implicitly possess mutation or merge authority; tasks receive explicit, bounded capability grants.

### 3.5 Authoritative Runtime Projection & State Snapshot
- `RuntimeTaskProjection` (`apps/server/src/projection.ts` and `apps/web/src/api/types.ts`) carries sanitized `roleId?: string` and `harnessId?: string`.
- Role assignment and harness identity are captured on `WORKER_STARTED` and preserved through `TASK_STATE_CHANGED`.
- `GET /api/v1/state` exposes `roleId` and `harnessId` in runtime projections, allowing full UI reconstruction across fresh page reloads and SSE event history eviction.
- **Event Union Preserved:** Evaluated candidate `ROLE_ASSIGNED` event. Because role assignment is snapshot-owned and tracked on existing lifecycle events, event inflation was avoided, preserving the 29-event union guard without unnecessary overhead.

### 3.6 Frontend Priority: Canonical Role Overrides Legacy Compatibility
In `apps/web/src/hq3d/world/worldState.ts` and `apps/web/src/hq3d/roles/roleStationMapping.ts`:
- If `task.roleId` exists:
  - Used as authoritative canonical role.
  - Marked with `roleSource: 'CANONICAL'`.
  - Matched directly against station canonical roles.
- If `task.roleId` is absent:
  - Falls back to `LEGACY_ROLE_COMPATIBILITY_MAPPING`.
  - Marked with `roleSource: 'LEGACY_COMPATIBILITY'`.
- The 2D Inspector renders `ROLE SOURCE: CANONICAL` vs `ROLE SOURCE: LEGACY_COMPATIBILITY`.

---

## 4. Test Matrix & Verification Evidence

All 30 requirements specified in the Wave 12E test matrix were validated across automated unit, integration, and browser test suites:

| Test Item | Verification Method | Result |
| :--- | :--- | :--- |
| 1. Canonical role registry contains 5 roles | `packages/core/src/roles.test.ts` | PASS |
| 2. Unique role IDs | `packages/core/src/roles.test.ts` | PASS |
| 3. Role does not contain harness | `packages/core/src/roles.test.ts` | PASS |
| 4. Role does not contain provider | `packages/core/src/roles.test.ts` | PASS |
| 5. Role does not contain model | `packages/core/src/roles.test.ts` | PASS |
| 6. Task declares role requirement | `packages/core/src/roles.test.ts` | PASS |
| 7. Role assignment retained in runtime | `apps/server/src/projection.test.ts` | PASS |
| 8. Assignment survives page refresh/snapshot | `apps/server/src/projection.test.ts` | PASS |
| 9. Assignment survives event eviction | `apps/server/src/projection.test.ts` | PASS |
| 10. Canonical role beats legacy mapping | `apps/web/src/hq3d/roles/rolePresentation.test.ts` | PASS |
| 11. Legacy mapping remains backward compatible | `apps/web/src/hq3d/roles/rolePresentation.test.ts` | PASS |
| 12. Frontend Engineer + Codex | `apps/web/src/hq3d/roles/rolePresentation.test.ts` | PASS |
| 13. Frontend Engineer + FCC | `apps/web/src/hq3d/roles/rolePresentation.test.ts` | PASS |
| 14. Same role identity across harness swap | `apps/web/src/hq3d/roles/rolePresentation.test.ts` | PASS |
| 15. Backend Engineer can use Codex | `packages/core/src/roles.test.ts` | PASS |
| 16. Reviewer independence rule (author != reviewer) | `packages/core/src/roles.test.ts` | PASS |
| 17. Verifier != Reviewer separation | `packages/core/src/roles.test.ts` | PASS |
| 18. Integration Engineer has no auto-merge | `packages/core/src/roles.test.ts` | PASS |
| 19. Role assignment != capability grant | `packages/core/src/roles.test.ts` | PASS |
| 20. Role assignment does not select provider directly | `packages/core/src/roles.test.ts` | PASS |
| 21. Unknown role rejected | `packages/core/src/roles.test.ts` | PASS |
| 22. Stale role cannot resurrect terminal task | `apps/server/src/projection.test.ts` | PASS |
| 23. Concurrent tasks retain independent roles | `apps/server/src/projection.test.ts` | PASS |
| 24. Runtime projection sanitization | `apps/server/src/projection.test.ts` | PASS |
| 25. Frontend character reads canonical role | `apps/web/src/hq3d/roles/rolePresentation.test.ts` | PASS |
| 26. Role source visible (CANONICAL vs LEGACY) | `apps/web/src/hq3d/roles/rolePresentation.test.ts` | PASS |
| 27. Browser QA remains infrastructure | `packages/core/src/roles.test.ts` & DOM spec | PASS |
| 28. OmniRoute remains infrastructure | `packages/core/src/roles.test.ts` & DOM spec | PASS |
| 29. Deterministic services remain non-role entities | `packages/core/src/roles.test.ts` | PASS |
| 30. Zero locomotion added | AST & Code Review | PASS |

### Regression Suite Summary
- **TypeScript Typecheck:** 0 errors (`npm run typecheck`).
- **Vitest Workspace Test Suite:** 66/66 test files passed, 663/663 unit and integration tests passed (`npx vitest run --fileParallelism=false`).
- **Playwright Role Suite:** 11/11 browser specs passed (`npx playwright test tests/hq3d-roles.spec.ts`).
- **Playwright Command Center Suite:** 8/8 browser specs passed (`npx playwright test tests/command-center.spec.ts`).
- **Git Whitespace & Format Checks:** Clean (`git diff --check`).

---

## 5. Security Audit Status

- `npm audit` returned Exit Code 1 with 5 vulnerabilities (1 low, 1 moderate, 2 high, 1 critical).
- All 5 advisories originate in external transitive dependencies of the OmniRoute gateway proxy package (`@omniroute/*`).
- These advisories are tracked as documented external infrastructure debt. No application-level vulnerabilities were introduced.

---

## 6. Git Provenance

- **Branch:** `feat/v0-golden-loop`
- **Wave 12D Reported SHA:** `a179a0e`
- **Wave 12D-R Closure Commit:** `0852d38` (`fix(hq): close Wave 12D evidence and metrics gaps`)
- **Wave 12E Commit:** Pending on `feat/v0-golden-loop`
- **Main Branch (`778a8a5`):** Clean and untouched.

---

## 7. Wave 12F Prerequisites & Boundaries

Before any future Wave 12F work begins:
1. **No Locomotion:** Wave 12E does not introduce any character locomotion, pathfinding, or walking animations. Characters remain strictly stationary at their architectural coordinates.
2. **Four Visual Characters:** The 3D HQ scene retains four humanoid avatars. Integration Engineer remains a runtime-only role until dedicated physical space is planned.
3. **Status:**
   - **WAVE 12D-R — GO**
   - **WAVE 12E — GO**
   - **WAVE 12F — NOT STARTED**
