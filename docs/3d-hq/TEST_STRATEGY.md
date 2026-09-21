# GRAVITAS 3D HEADQUARTERS — TEST STRATEGY & VERIFICATION MATRIX
## Deterministic Testing, Headless Validation & Visual QA Specification

> **CORE MANDATE**: We must be able to prove that `TASK_STARTED` produces the expected world state deterministically in automated CI **without relying on screenshot interpretation alone**.  
> A screenshot is not runtime proof; an agent claim is never proof of completion.

---

## 1. Multi-Tiered Verification Pyramid

The 3D Headquarters is validated across four distinct, automated testing tiers:

```
                  /\
                 /  \     TIER 4: Playwright E2E & Visual Regression Tests
                /----\    (Canvas rendering, picking, inspector docking, screenshots)
               /      \
              /--------\  TIER 3: Headless Three.js Scene Graph Tests
             /          \ (Object counts, material assignment, mixer bindings)
            /------------\
           /              \ TIER 2: World State Adapter Unit Tests (Pure TS)
          /----------------\ (deriveWorldState: events -> entity states, 100% deterministic)
         /                  \
        /--------------------\ TIER 1: Core Event & Engine Contract Tests
       +----------------------+ (packages/core, packages/orchestrator)
```

---

## 2. Tier 2: World State Adapter Unit Tests (Vitest)

Because `deriveWorldState()` is a pure function, the entire state projection pipeline is tested at microsecond speeds in Node.js with zero WebGL or browser dependencies:

### Test Suite Structure (`apps/web/src/features/hq/worldStateAdapter.test.ts`)
1. **Initial Boot & Empty Floor**:
   - Given an empty `Run` or `tasks = []`.
   - Assert `worldState.agents.every(a => a.state === 'IDLE')`.
   - Assert `worldState.tasks.length === 0`.
   - Assert `worldState.rooms.find(r => r.id === 'MISSION_CONTROL').activeTaskCount === 0`.
2. **Task Creation & Scheduling**:
   - Given a task in state `READY` assigned to `worker-codex`.
   - Assert `worldState.agents.find(a => a.id === 'worker-codex').state === 'ASSIGNED'`.
   - Assert `worldState.tasks[0].location === 'TRANSIT_TO_WORKER'`.
3. **Execution State Transition**:
   - Given a task transitioning from `READY` to `RUNNING` with `WORKER_STARTED`.
   - Assert `worldState.agents.find(a => a.id === 'worker-codex').state === 'WORKING'`.
   - Assert `worldState.tasks[0].location === 'WORKSTATION'`.
   - Assert workstation desk LED is `'ACTIVE'`.
4. **Independent Verification Cleanroom**:
   - Given a task in `VERIFYING` state.
   - Assert `worldState.tasks[0].location === 'VERIFICATION_BENCH'`.
   - Assert `worldState.agents.find(a => a.id === 'verifier').state === 'VERIFYING'`.
5. **Human Approval Gate**:
   - Given a task in `WAITING_APPROVAL`.
   - Assert `worldState.tasks[0].location === 'APPROVAL_PLINTH'`.
   - Assert `worldState.alert.severity === 'WARNING'`.
6. **Multi-Worker Dependency Block**:
   - Given `T1` (Codex, `RUNNING`) and `T2` (FCC, `BLOCKED` on `T1`).
   - Assert `worldState.handoffs.length === 1`.
   - Assert `worldState.handoffs[0].state === 'LOCKED'`.
   - Assert `worldState.agents.find(a => a.id === 'worker-fcc').state === 'WAITING_DEPENDENCY'`.

---

## 3. Tier 3: Headless Three.js Scene Graph Tests (Vitest)

Tests verify that the Three.js controller correctly maps `WorldState` into scene graph meshes:
- Verifies that `SceneManager.reconcile(worldState)` spawns meshes matching `worldState.tasks.length`.
- Verifies that changing `agent.state` to `'WORKING'` binds the active `TypingAction` clip on the agent's `AnimationMixer`.
- Verifies that unmounted tasks trigger immediate `geometry.dispose()` and `material.dispose()` to prevent memory leaks.

---

## 4. Tier 4: Playwright E2E & Browser Automation

Playwright browser tests (`apps/web/tests/e2e/hq3d.spec.ts`) validate full interactive flows:

1. **Canvas Mount & Context Initialization**:
   - Launches Chromium with WebGL enabled.
   - Navigates to `@gravitas/web`.
   - Asserts `<canvas data-testid="hq-3d-canvas">` is visible and `gl.isContextLost() === false`.
2. **Raycast Picking to 2D Inspector Flow**:
   - Simulates click at coordinates corresponding to the Codex workstation.
   - Asserts 2D `TaskInspector` opens docked in the viewport.
   - Asserts task title and live execution status match engine state.
3. **Keyboard Shortcut Traversal**:
   - Presses key `'6'`.
   - Asserts camera completes smooth transition to `ROOM_APPROVAL` framing.
4. **Dual-Mode Toggle Parity**:
   - Presses `Alt+V`.
   - Asserts 3D canvas hides and 2D `OfficeFloor` DOM mounts instantly without error.

---

## 5. Visual QA Strategy & Deterministic Screenshot Baselines

Screenshots supplement runtime proof; they do not replace it. For every implementation wave, deterministic Playwright screenshots must be captured under controlled resolutions and lighting:

| Screenshot ID | Scenario & Viewport | Visual Acceptance Invariant |
| :--- | :--- | :--- |
| **`01_hq_overview_quiet`** | Desktop \(1920 \times 1080\), Zero Tasks | All workstations empty/standby; soft neutral ambient light; clean limestone pavers. |
| **`02_codex_active_working`** | Desktop \(1920 \times 1080\), `RUNNING` Task | Codex character seated; desk CRT illuminated blue; work packet open on desk blotter. |
| **`03_multi_worker_handoff`** | Desktop \(1920 \times 1080\), T1 & T2 | Codex working; FCC in standby; orange glowing dependency spline connecting workstations. |
| **`04_verification_cleanroom`**| Room Focus \(1280 \times 800\), `VERIFYING` | Packet on cleanroom bench; verifier inspecting; diff scale balanced with amber guide lights. |
| **`05_approval_mezzanine`**   | Room Focus \(1280 \times 800\), `WAITING_APPROVAL` | Packet illuminated under warm amber spotlight on Mezzanine Plinth; signet stamper hovering. |
| **`06_task_inspector_docked`** | Desktop \(1920 \times 1080\), Split View | 3D canvas taking 60% viewport; 2D TaskInspector docked at right displaying unified git diff. |
| **`07_reduced_motion_mode`**  | Desktop \(1920 \times 1080\), `prefers-reduced-motion` | Characters in dignified static poses; zero blur or transition artifacts. |
| **`08_laptop_compact_view`**  | Laptop \(1366 \times 768\) | Aspect ratio properly scaled; no geometry clipping; UI elements legible. |
| **`09_mobile_fallback_mode`** | Mobile \(390 \times 844\) | Switched to high-density 2D list mode with room selector tabs. |
