# GRAVITAS — WAVE 12F-C REPORT
## Character System Closure + Authoritative Runtime Proof + Remote Provenance

### A. Git Provenance Before
- **Target Branch**: `feat/v0-golden-loop`
- **Starting Local HEAD (Wave 12F baseline)**: `3b065a6b5f426c44c0388ae05684628050b1d2ce`
- **Remote `origin/feat/v0-golden-loop` baseline**: `753d68c66979a2b0712d08bdb74157a0fb507cb9`
- **Main / `origin/main` baseline**: `778a8a5270ece822f822f214e52db72bb8265a1d` (Strictly untouched)
- **Remote URL**: `https://github.com/Smarak-padhi/Gravitas.git`

---

### B. Files Changed
1. `docs/3d-hq/CHARACTER_SYSTEM_V1.md`: Canonical Character System V1 specification freezing shared grammar vs. role identity, terminology, and rollout boundaries.
2. `apps/web/src/hq3d/geometry/heroBay/heroCharacter.ts`: Terminology updated to "PREMIUM STYLIZED MINIATURE HUMANOID"; verified hero character proportions and aesthetics.
3. `apps/web/src/hq3d/engine/HqScene.ts`: Floor 2 architectural night lighting calibrated with desk task spotlights, circulation wash, boundary grazing; dormant screen realism.
4. `apps/web/src/hq3d/geometry/characters.ts`: Rest-pose arm reset in `applyTypingPose` ensuring non-FOCUSED characters do not maintain keyboard interaction poses.
5. `apps/web/src/hq3d/roles/roleStationMapping.ts`: Authoritative runtime phase gating (`WORKER_RUNNING` -> `FOCUSED`, `PREPARING` -> `ATTENTION`, `CLEANUP`/finished -> `WAITING`).
6. `apps/web/src/hq3d/world/worldState.ts`: Active task phase mapping for orphan runtime projections.
7. `apps/web/src/hq3d/__tests__/runtimeHonesty.test.ts`: 11 regression unit tests enforcing runtime honesty invariants.
8. `tests/hq3d-wave12fc.spec.ts`: Playwright integration test suite executing deterministic causal transitions and benchmark capture.
9. `docs/3d-hq/evidence/12f-c/runtime-character-causal-proof.json`: Machine-readable causal proof artifact.
10. `docs/3d-hq/evidence/12f-c/benchmarks.json`: Machine-readable performance telemetry data.
11. `docs/3d-hq/evidence/12f-c/01-idle.png` through `10-browser-qa.png`: 10 visual evidence captures.

---

### C. Character System V1 Contract
Documented at `docs/3d-hq/CHARACTER_SYSTEM_V1.md`:
- **Visual Definition**: Defined as **PREMIUM STYLIZED MINIATURE HUMANOID** (deliberately stylized proportions, authored hair/eyewear, rounded clothing, visible hands and footwear, architectural miniature scale; explicitly rejects photorealism, Roblox proportions, generic mannequins, and provider mascots).
- **Core Separation**: `CHARACTER ROLE != HARNESS != MODEL != PROVIDER`.
  - Roles represent corporate and organizational responsibilities (Frontend Engineer, Backend Engineer, Independent Reviewer, Browser QA, Chief Planner).
  - Harnesses and models (Codex, FCC, GPT-4o, Claude, etc.) are interchangeable execution tools. Characters receive zero provider branding.
- **Shared Grammar**:
  - Coordinate system: Right-handed Y-up, desk facing forward Z.
  - Scale envelope: Height 1.40m – 1.55m, head 0.32m, torso 0.44m, leg 0.60m.
  - Rig / Animation: Head, torso, upper/lower arms, hands, legs, feet.
  - Animation states: `IDLE`, `ATTENTION` (acknowledged/preparing), `FOCUSED` (working/typing), `WAITING` (execution completed/handoff), `SUCCESS`, `FAILURE`.
  - Material families: Matte skin, brushed satin hair, wool/cotton/knit clothing, polished brass/graphite accessories.
- **Rollout Boundary**: Strict rule against simple reskins or color swaps. Mass rollout to other roles is deferred until individual role identities are approved.

---

### D. Night-Lighting Changes
- In `apps/web/src/hq3d/engine/HqScene.ts`:
  - Added dedicated Floor 2 warm-white architectural task spotlights (`deskSpot`, intensity 1.8, warm tone `#fff0dc`, cone angle `Math.PI / 4`, penumbra 0.5) illuminating the Frontend Engineer workstation, chair, and floor plane.
  - Added desk ambient fill (`deskFill`, intensity 0.8, warm white `#fff4e8`) to prevent harsh shadow falloff.
  - Calibrated night ambient ceiling and circulation wash so that Room Boundary, Circulation Path, Workstation, and Character are clearly legible in darkness.
  - Enforced dormant screen realism: monitors power down during idle/dormant periods; no neon, cyan washes, or fake emissives.

---

### E. Runtime → Character Causal Chain
```
Authoritative Backend Runtime Event
  └──> Scheduler / RunService Execution Phase
        └──> Runtime Projection State Snapshot (GET /api/v1/state or SSE)
              └──> Web Client: deriveWorldState (worldState.ts)
                    └──> Role Presentation Mapping: deriveRolePresentationStates (roleStationMapping.ts)
                          └──> Character Spatial / Animation State: setRoleState / setFigurePose
                                └──> 3D Engine: heroCharacter / CharacterManager render loop
```

---

### F. Evidence Type
**DETERMINISTIC_INTEGRATION**
- Utilizes deterministic test harness running the canonical web client against authoritative projection state transitions, without synthetic setTimeout tricks or direct DOM overrides.

---

### G. Exact State Sequence Proven
1. **IDLE**:
   - Authoritative Task: `null` (no active task).
   - Character State: `IDLE`.
   - Visual Evidence: `01-idle.png`. Character seated at rest, arms in lap, screens dormant, zero typing.
2. **ASSIGNED / PREPARING**:
   - Authoritative Task: `READY`, runtime phase `PREPARING`.
   - Character State: `ATTENTION`.
   - Visual Evidence: `02-assigned-preparing.png`. Character alerted/attentive, zero typing, screens dormant.
3. **WORKER_RUNNING**:
   - Authoritative Task: `RUNNING`, runtime phase `WORKER_RUNNING`.
   - Character State: `FOCUSED`.
   - Visual Evidence: `03-worker-running.png`. Character actively working with hands at keyboard, typing animation active.
4. **WORKER_FINISHED / CANDIDATE_PRODUCED**:
   - Authoritative Task: `RUNNING`, runtime phase `CLEANUP`.
   - Character State: `WAITING`.
   - Visual Evidence: `04-worker-finished.png`. Worker execution ended, character hands return to rest, typing stops immediately.
5. **VERIFYING**:
   - Authoritative Task: `VERIFYING`, runtime phase `VERIFYING`.
   - Character State: Frontend Engineer returns to `IDLE`; Independent Reviewer is active at verification bench.
   - Visual Evidence: `05-verifying.png`. Zero false typing by Frontend Engineer.
6. **DAY / NIGHT / CONTEXT / QA**:
   - `06-day.png`: Architectural day lighting reference.
   - `07-night.png`: Architectural night lighting with clear boundary, workstation, and character legibility.
   - `08-character-workstation-wide.png`: Wide workstation view showing grounding and scale.
   - `09-building-context.png`: Exterior isometric tower view.
   - `10-browser-qa.png`: Browser QA verification state active at F4 QA lab.

---

### H. Screenshot Evidence Paths
- `docs/3d-hq/evidence/12f-c/01-idle.png` (546 KB)
- `docs/3d-hq/evidence/12f-c/02-assigned-preparing.png` (530 KB)
- `docs/3d-hq/evidence/12f-c/03-worker-running.png` (530 KB)
- `docs/3d-hq/evidence/12f-c/04-worker-finished.png` (530 KB)
- `docs/3d-hq/evidence/12f-c/05-verifying.png` (530 KB)
- `docs/3d-hq/evidence/12f-c/06-day.png` (530 KB)
- `docs/3d-hq/evidence/12f-c/07-night.png` (488 KB)
- `docs/3d-hq/evidence/12f-c/08-character-workstation-wide.png` (546 KB)
- `docs/3d-hq/evidence/12f-c/09-building-context.png` (327 KB)
- `docs/3d-hq/evidence/12f-c/10-browser-qa.png` (441 KB)

---

### I. Machine-Readable Causal Evidence Path
- `docs/3d-hq/evidence/12f-c/runtime-character-causal-proof.json`

---

### J. Runtime Honesty Regression Tests
Location: `apps/web/src/hq3d/__tests__/runtimeHonesty.test.ts`
Tests (11 passed):
1. IDLE does not show productive work
2. PENDING alone does not automatically imply WORKING (FOCUSED)
3. PREPARING does not falsely imply worker execution
4. WORKER_RUNNING maps to the correct assigned role
5. WORKER_RUNNING maps Frontend Engineer to WORKING (FOCUSED)
6. End of worker execution stops WORKING (transitions to WAITING/IDLE)
7. VERIFYING does not leave Frontend Engineer falsely working
8. Browser QA only activates from actual QA state
9. Stale projection cannot resurrect productive character state
10. Terminal task cannot leave character permanently working
11. Role assignment is distinct from provider/model/harness & reduced motion preserves semantic state

---

### K. Performance Before / After
Recorded at `docs/3d-hq/evidence/12f-c/benchmarks.json`:
- **F2 Workstation Camera (10s continuous RAF benchmark)**:
  - Average FPS: **36.9 FPS** (stable 30-60 target under full shadow rendering)
  - Median Frame Time: **33.3 ms**
  - P95 Frame Time: **33.6 ms**
  - P99 Frame Time: **33.9 ms**
  - Draw Calls: **357**
  - Triangles: **41,012**
  - Geometries: **1,037**
  - Textures: **22**
- **Tower Overview Camera (5s continuous RAF benchmark)**:
  - Average FPS: **60.0 FPS**
  - Median Frame Time: **16.7 ms**
  - P95 Frame Time: **16.8 ms**
  - P99 Frame Time: **17.0 ms**
  - Draw Calls: **1,548**
  - Triangles: **117,462**
  - Geometries: **1,038**
  - Textures: **22**
- Comparison with Wave 12F baseline: Zero performance regression; draw calls and memory overhead remain within budgets.

---

### L. Typecheck
- Command: `npm run typecheck`
- Result: **0 errors**, all 11 workspace packages passed cleanly.

---

### M. Build
- Command: `npm run build`
- Result: **Exit Code 0**, all packages built, Vite production bundle generated cleanly.

---

### N. Focused Tests
- Command: `npx vitest run apps/web/src/hq3d/`
- Result: **10 test files passed (10/10), 219 tests passed (219/219)**.

---

### O. Full npm test
- Command: `npm test`
- Result: **79 test files passed (79/79), 1054 tests passed (1054/1054)** in 74.05s. Monolithic suite clean.

---

### P. Playwright / Integration Tests
- Command: `npx playwright test tests/hq3d-wave12fc.spec.ts`
- Result: **1 passed (1/1)** in 44.4s. All 10 screenshots and causal json produced.

---

### Q. npm audit
- Command: `npm audit`
- Exit Code: **1**
- Vulnerability Count: **5** (1 low, 1 moderate, 2 high, 1 critical)
- Severity / Scope: Transitive dependencies in `adm-zip` (via `onnxruntime-node`) and `dompurify` (via `monaco-editor`).
- Status: **Unchanged from baseline**.

---

### R. git diff --check
- Command: `git diff --check`
- Result: **Exit Code 0**, clean whitespace and formatting.

---

### S. Authority-Surface Diff Audit
Verified that Wave 12F-C did NOT modify:
- Git authority: **NO**
- Worktree authority: **NO**
- Worker containment: **NO**
- Verifier authority: **NO**
- Browser QA authority: **NO**
- Human approval: **NO**
- Task FSM semantics: **NO**
- Scheduler authority: **NO**
- Gateway qualification: **NO**
- Provider routing: **NO**
- OmniRoute behavior: **NO**
- DIRECT-default policy: **NO**
- CapabilityGrant semantics: **NO**
- Integration/materialization authority: **NO**

---

### T. Final HEAD
- (Recorded upon commit)

### U. Origin Feature SHA
- (Recorded upon push)

### V. ls-remote Feature SHA
- (Recorded upon push verification)

### W. Main / Origin-Main / Remote-Main SHA
- Baseline: `778a8a5270ece822f822f214e52db72bb8265a1d`
- Unmodified and untouched.

---

### X. Working Tree Status
- Clean upon committing changes.
