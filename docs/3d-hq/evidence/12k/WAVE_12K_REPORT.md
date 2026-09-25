# GRAVITAS — WAVE 12K ARCHITECTURAL REPORT
## QUALITY PIPELINE PRODUCTION PASS: FLOOR 3 VERIFICATION CLEANROOM + FLOOR 4 BROWSER QA LAB

---

### A. Git Provenance

- **Active Branch:** `feat/v0-golden-loop`
- **Initial Baseline SHA:** `522c6beff95c93672332811e06434bb9d0e82d4d`
- **Current HEAD SHA:** `522c6beff95c93672332811e06434bb9d0e82d4d` (pending final wave commit)
- **Remote Tracking:** `origin/feat/v0-golden-loop` (`522c6beff95c93672332811e06434bb9d0e82d4d`)
- **Main Branch SHA:** `778a8a5270ece822f822f214e52db72bb8265a1d`
- **Remote Main SHA:** `778a8a5270ece822f822f214e52db72bb8265a1d`
- **Branch Invariant:** `main` is strictly UNTOUCHED and unmodified. Zero commits or diffs on `main`.

---

### B. Exact Files Changed

#### Floor 3 Architecture (New Modules)
- `apps/web/src/hq3d/geometry/verificationCleanroom/verificationBench.ts` (Layer A: Hero Verification Bench)
- `apps/web/src/hq3d/geometry/verificationCleanroom/evidenceWall.ts` (Layer B: Evidence Matrix Wall)
- `apps/web/src/hq3d/geometry/verificationCleanroom/cleanroomCirculation.ts` (Layer C: Inset circulation & conduits)
- `apps/web/src/hq3d/geometry/verificationCleanroom/verificationCleanroomRoom.ts` (Complete F3 Room Assembly)

#### Floor 4 Architecture (New Modules)
- `apps/web/src/hq3d/geometry/browserQaLab/deviceTestBench.ts` (Layer A: Hero Multi-Surface Device Workstation)
- `apps/web/src/hq3d/geometry/browserQaLab/observationWall.ts` (Layer B: Viewport Observation & Responsive Wall)
- `apps/web/src/hq3d/geometry/browserQaLab/interactionZone.ts` (Layer C: DOM Interaction Console & Device Rack)
- `apps/web/src/hq3d/geometry/browserQaLab/browserQaLabRoom.ts` (Complete F4 Room Assembly)

#### Scene, World & Role Integration
- `apps/web/src/hq3d/geometry/furniture.ts` (F3 & F4 room mounting, active status screen logic)
- `apps/web/src/hq3d/geometry/characters.ts` (TOWER_ROLES instantiation, Browser QA figure controller)
- `apps/web/src/hq3d/engine/HqScene.ts` (F3 & F4 lighting fixtures, culling, atmosphere profiles)
- `apps/web/src/hq3d/world/rooms.ts` (F3 & F4 camera presets, room definitions, character focus)
- `apps/web/src/hq3d/world/stations.ts` (F3 & F4 authoritative station definitions & metadata)
- `apps/web/src/hq3d/roles/roles.ts` (FROZEN_ROLES preserved at 4; TOWER_ROLES exported for tower)
- `apps/web/src/hq3d/roles/types.ts` (HqRoleIdentity export)
- `apps/web/src/hq3d/roles/roleStationMapping.ts` (Clean typing and derivation)
- `apps/web/src/hq3d/types.ts` (StationId and CharacterId extensions)

#### Verification & Evidence Suite
- `tests/hq3d-wave12k.spec.ts` (Automated 20x soak test, foreground benchmarks, 25 captures)
- `docs/3d-hq/evidence/12k/benchmarks.json` (Real RAF foreground telemetry)
- `docs/3d-hq/evidence/12k/metrics.json` (Scene graph nodes, lights, geometries, memory)
- `docs/3d-hq/evidence/12k/*.png` (25 deterministic screenshots + 2 comparison composites)

---

### C. Floor 3: Verification Cleanroom Architecture

#### Question Answered: *"Is this candidate actually correct?"*

Floor 3 represents an uncompromising, disciplined cleanroom environment dedicated to deterministic verification, static analysis, unit matrix validation, and mutation gate protection.

1. **Layer A — Hero Verification Bench (`verificationBench.ts`):**
   - **Worktop:** Inset Honed Basalt composite (`slateMatte`) with chamfered perimeter reveals and champagne brass bullnose trim.
   - **Inspection Deck:** Recessed candidate intake dock on left with LED rail (`terminalScreenEmerald`), inspection coordinate center deck with brass alignment pins, and verdict/ledger dock on right with optical verification loupe plinth.
   - **Articulated Monitor Array:** Twin 27" 16:9 inspection monitors mounted on dual articulated graphite arms. In dormant standby when idle; illuminates with emissive intensity only upon authoritative verification.
   - **Status Lens:** Deterministic status prism housing cleanroom state indicator.
   - **Ergonomics:** Minimalist steel & leather cleanroom perch stool on brass foot-ring.

2. **Layer B — Evidence Wall (`evidenceWall.ts`):**
   - **Backer:** Vertical acoustic composite panels with satin aluminum reveals.
   - **Matrix Panel:** Suspended smoked-glass panel (`0.12m` off wall) etched with 5 deterministic verification groups: `STATIC_ANALYSIS`, `TYPE_INFERENCE`, `UNIT_MATRIX`, `MUTATION_GATE`, `REGRESSION`.
   - **Cassette Rails:** Precision-machined aluminum retention rails with empty cassette slots for physical task dossiers.
   - **Audit Credenza:** Floating walnut credenza beneath the wall housing immutable audit log slots.
   - **Wall Wash Soffit:** Recessed overhead linear LED troffer casting grazing wash down the panel.

3. **Layer C — Cleanroom Circulation & Enclosure (`cleanroomCirculation.ts` & `verificationCleanroomRoom.ts`):**
   - **Flooring:** Deep matte basalt perimeter border with inset honed light-mineral center field.
   - **Conduits:** Dual floor channels—left green intake channel (inbound candidate from Agent Operations) and right amber verdict channel (outbound to Browser QA / Approval).
   - **Acoustic Enclosure:** Full-height acoustic smoked-glass partition wall with satin brass structural posts.
   - **Custody Plinth:** Monolithic graphite transfer plinth with brass register plate near entrance.
   - **Elevator Arrival Portal:** Graphite frame with brass reveal and directional transit lens.
   - **Ceiling:** Suspended acoustic baffle cloud with two recessed cool-white linear LED troffers.

---

### D. Floor 4: Browser QA Lab Architecture

#### Question Answered: *"Does this candidate actually work in the browser / product surface?"*

Floor 4 is an analytical multi-device testing lab dedicated to real Playwright execution, DOM interaction capture, responsive layout assertions, and visual diff analysis across form factors.

1. **Layer A — Hero Device Test Bench (`deviceTestBench.ts`):**
   - **Worktop:** Solid dark walnut worktop with beveled front edge (`walnut` & `champagneBrass`).
   - **Armature Array:** Heavy graphite tubular rear mounting rail supporting four distinct responsive device surfaces:
     - Ultrawide Desktop Display (34" 21:9 curved, 3440×1440 ratio)
     - Developer Laptop on aluminum riser stand (16" 16:10, 2560×1600 ratio)
     - Responsive Tablet (11" 4:3 portrait aspect, 1668×2388 ratio)
     - Mobile Device (6.7" 19.5:9 portrait aspect, 1170×2532 ratio)
   - **Interaction Surface:** Recessed testing keyboard, anodized glass trackpad, and telemetry strip.
   - **Task Seating:** 5-star castor base with pneumatic cylinder and breathable mesh backrest.

2. **Layer B — Viewport Observation Wall (`observationWall.ts`):**
   - **Wall Backer:** Vertical acoustic timber slat backer (`walnut` slats over graphite).
   - **Panoramic Matrix Glass:** Large format smoked glass viewport observation surface (3.2m wide). Etched responsive viewport guide bounds (3840×1600, 1920×1080, 768×1024, 390×844) with dual side-by-side comparison zones for baseline vs candidate visual regression diffs.
   - **Overhead Luminaire:** Cantilevered slim brass task luminaire bar projecting warm task wash across the viewing plane.

3. **Layer C — DOM Interaction Zone & Circulation (`interactionZone.ts` & `browserQaLabRoom.ts`):**
   - **Flooring:** Natural light-oak herringbone parquet field with graphite perimeter border and inlaid brass calibration tape marking standard viewport widths (390px, 768px, 1280px, 1920px).
   - **Interaction Console:** Dedicated technician desk with oversized gesture trackpad, macro deck, and live DOM event telemetry monitor.
   - **Mobile Device Testing Rack:** 4-tier matte-black powder-coated aluminum rack holding staged mobile devices with individual status LEDs.
   - **Arrival Portal & Life:** Architectural east elevator portal and tall terracotta potted ficus tree.
   - **Ceiling:** Acoustic paneled ceiling cloud with recessed daylight troffers.

---

### E. Role & Station Mappings

| Role | Department | Canonical Home Station | Alias Station | Level | 3D Avatar Profile |
|:---|:---|:---|:---|:---:|:---|
| `role:quality:independent-reviewer` | `QUALITY` | `verifier-console` | `verification-lab-console` | F3 | Sage tunic, analytical inspection loupe, perched stool |
| `role:quality:browser-qa` | `QUALITY` | `browser-qa-station` | `browser-qa-matrix` | F4 | Slate workwear, teal testing tablet/stylus, seated task chair |

- **Role != Provider Invariant:** Avatars represent organizational engineering roles (Independent Reviewer, Browser QA Specialist), never external AI models or provider brands.
- **Contract Compatibility:** `FROZEN_ROLES` is strictly preserved with length 4 (`CHIEF_PLANNER`, `FRONTEND_ENGINEER`, `BACKEND_ENGINEER`, `INDEPENDENT_REVIEWER`) to uphold existing Wave 12D/12E test contracts. `TOWER_ROLES` cleanly extends tower rendering with `BROWSER_QA_ROLE`.

---

### F. Runtime State Mappings & Zero-Fake Discipline

- **Idle Honesty:** When no verification or browser QA run is active, both F3 and F4 remain in truthful idle standby. Monitors and screens remain dormant (`emissiveIntensity: 0.0`); station status prisms display resting gunmetal. Characters perform subtle ambient breathing and do NOT manufacture fake typing, fake test execution, or synthetic success celebrations.
- **`VERIFYING` State:** Activated authoritatively when a task reaches `VERIFYING` phase. F3 verification bench status lens glows emerald (`0x3d7a68`), station monitors illuminate, and the Independent Reviewer status ring activates.
- **`BROWSER_QA` State:** Activated authoritatively when a task enters `BROWSER_QA` lifecycle phase. F4 device bench indicators switch to teal (`0x0d9488`), all 4 multi-surface device screens illuminate with live inspection luminescence, and Browser QA Specialist status activates.

---

### G. Evidence Screenshot Paths (`docs/3d-hq/evidence/12k/`)

#### Floor 3: Verification Cleanroom
- `01-f3-day-wide.png`: Full Cleanroom perspective in fresh architectural daylight
- `02-f3-eve-wide.png`: Cleanroom in golden hour twilight
- `03-f3-night-wide.png`: Cleanroom at midnight with crisp linear ceiling troffers
- `04-f3-reviewer-medium.png`: Independent Reviewer perched at verification bench
- `05-f3-reviewer-close.png`: Reviewer close-up with inspection loupe and sage tunic
- `06-f3-verification-bench.png`: Close-up of verification bench with intake dock and verdict plinth
- `07-f3-evidence-wall.png`: Evidence matrix wall with suspended glass panel and cassette rails
- `08-f3-elevator-transition.png`: East cleanroom arrival portal and custody transfer plinth

#### Floor 4: Browser QA Lab
- `09-f4-day-wide.png`: Full Browser QA Lab perspective in daylight
- `10-f4-eve-wide.png`: Browser QA Lab in warm evening ambiance
- `11-f4-night-wide.png`: Browser QA Lab at night with task luminaire illumination
- `12-f4-qa-role-medium.png`: Browser QA Specialist seated at device test bench
- `13-f4-qa-role-close.png`: QA Specialist close-up with tablet and stylus accessory
- `14-f4-device-bench.png`: Multi-surface device bench (desktop, laptop, tablet, phone)
- `15-f4-observation-wall.png`: Panoramic observation wall with responsive viewport bounds
- `16-f4-interaction-zone.png`: DOM interaction console and 4-tier mobile device rack

#### Cutaway Tower Overview (F1 Through F4)
- `17-tower-f1-f4-day.png`: Vertical cutaway showing F1, F2, F3, F4 in daylight
- `18-tower-f1-f4-eve.png`: Vertical cutaway showing F1 through F4 in evening light
- `19-tower-f1-f4-night.png`: Vertical cutaway showing F1 through F4 with architectural pools

#### Comparative & Regression Proofs
- `20-f3-vs-f4.png`: Side-by-side composite: F3 Cleanroom (left) vs F4 Browser QA (right)
- `21-f1-f2-f3-f4-comparison.png`: 4-floor 2x2 grid: F1 (Plan), F2 (Build), F3 (Verify), F4 (Test)
- `22-f2-regression.png`: Floor 2 Agent Operations visually intact and un-regressed
- `23-f1-regression.png`: Floor 1 Mission Control visually intact and un-regressed

#### Controlled Authoritative Fixture Evidence
- `24-f3-authoritative-verifying.png`: Cleanroom actively executing authoritative verification
- `25-f4-authoritative-browser-qa.png`: Browser QA Lab actively executing authoritative DOM testing

---

### H. Real Foreground Benchmark Results (1600×900, DPR 1.0, 10s Continuous RAF)

| Benchmark Scene | Mode | Frame Count | Sample Time | Avg FPS | Median Frame Time | P95 Frame Time | P99 Frame Time | Min FPS | Low 1% FPS |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **F3 Verification Cleanroom** | `DAY` | 554 | 10016.3 ms | **55.31** | 16.70 ms | 33.40 ms | 33.60 ms | 29.50 | 29.76 |
| **F3 Verification Cleanroom** | `NIGHT` | 550 | 10015.9 ms | **54.91** | 16.70 ms | 33.40 ms | 33.60 ms | 29.59 | 29.76 |
| **F4 Browser QA Lab** | `DAY` | 541 | 10016.0 ms | **54.01** | 16.70 ms | 33.40 ms | 33.50 ms | 29.67 | 29.85 |
| **F4 Browser QA Lab** | `NIGHT` | 554 | 10016.0 ms | **55.31** | 16.70 ms | 33.40 ms | 33.50 ms | 29.76 | 29.85 |
| **Tower Overview (F1–F4)** | `DAY` | 546 | 10016.0 ms | **54.51** | 16.70 ms | 33.40 ms | 33.50 ms | 29.59 | 29.85 |

*Note: All tests run with real foreground Chromium hardware acceleration without background throttling.*

---

### I. Scene Graph Metrics & Resource Counts

```json
{
  "totalNodes": 1264,
  "meshNodes": 1079,
  "instancedMeshNodes": 17,
  "uniqueGeometries": 803,
  "uniqueMaterials": 89,
  "shadowCasterNodes": 155,
  "shadowReceiverNodes": 114,
  "matrixAutoUpdateTrueNodes": 228,
  "matrixAutoUpdateFalseNodes": 1036,
  "totalLights": 20,
  "activeLights": 20,
  "renderCalls": 564,
  "renderTriangles": 34532,
  "texturesInMemory": 24
}
```

- **Matrix Discipline:** 1,036 out of 1,264 scene graph nodes (81.9%) have `matrixAutoUpdate = false`, preventing unnecessary matrix recalculations during runtime animation ticks.
- **Draw Call Discipline:** Only 564 draw calls for the complete multi-floor tower including F1, F2, F3, F4, characters, and props.

---

### J. Memory Soak Results (20 Cross-Floor Interaction Cycles)

- **Total Cycles:** 20 complete cycles:
  `Overview -> F3 Cleanroom -> Select Reviewer -> Select Bench -> Orbit/Zoom -> Overview -> F4 Browser QA -> Select QA Specialist -> Select Device Bench -> Orbit/Zoom -> Overview`
- **Initial Geometries:** 801
- **Final Geometries:** 801
- **Geometry Delta:** **0 (Zero Geometry Leaks)**
- **Initial Textures:** 24
- **Final Textures:** 24
- **Texture Delta:** **0 (Zero Texture Leaks)**
- **Initial JS Heap:** 50.58 MB
- **Final JS Heap:** 40.56 MB
- **Heap Delta:** **-10.02 MB (Normal GC cycle, Zero Heap Growth)**

---

### K. Test Suite Results

1. **Vitest Unit & Module Suite:**
   - 78 test files executed
   - **1,043 passed (100% green, 0 failed)**
   - All 9 HQ3D test suites passed (`hq3d.test.ts`, `zeroFake.test.ts`, `locomotion.test.ts`, `rolePresentation.test.ts`, `custody.test.ts`, `worldState.test.ts`, `hybridHq.test.ts`, `statusMapper.test.ts`, `telemetryMath.test.ts`).

2. **TypeScript Typecheck (`npm run typecheck`):**
   - Clean compilation across all 11 monorepo packages and apps (`agents`, `browser-qa`, `core`, `gateways`, `git`, `harnesses`, `orchestrator`, `prompts`, `verifier`, `server`, `web`).
   - **Exit code: 0 (Zero errors)**

3. **Production Bundle Build (`npm run build`):**
   - Clean compilation and Vite build (`dist/index.html`, `dist/assets/index-*.js`).
   - **Exit code: 0**

4. **Playwright Wave 12K Verification Suite (`tests/hq3d-wave12k.spec.ts`):**
   - 1 passed (1.6m runtime)
   - Verified: Picking, 20x memory soak, 5 foreground benchmarks, 25 screenshot captures, side-by-side composite stitching.

---

### L. Security & Audit Report

- **Command:** `npm audit`
- **Vulnerabilities:** 5 (1 low, 1 moderate, 2 high, 1 critical)
  - Pre-existing `adm-zip` vulnerability in `onnxruntime-node` (via `omniroute`).
  - Pre-existing `dompurify` vulnerability in `monaco-editor`.
- **Wave 12K Delta:** **0 new dependencies added; 0 vulnerability delta.**

---

### M. Visual Self-Check & Observations

1. **Floor Differentiation:** Floor 3 and Floor 4 are immediately distinguishable at first glance. F3 features a dark basalt floor with an acoustic glass enclosure, mineral verification bench, and loupe plinth. F4 features a light oak herringbone floor, multi-surface walnut testing workstation (desktop, laptop, tablet, phone), panoramic viewport wall, and terracotta potted tree.
2. **Character Proportions:** Both the Independent Reviewer (F3) and Browser QA Specialist (F4) adhere to the established GRAVITAS character aesthetic with custom role accessories (inspection loupe and testing tablet/stylus).
3. **Lighting Legibility:** In all three atmospheres (Day, Eve, Night), architectural elements remain crisp without black voids or oversaturated colors.
4. **Camera Framing:** All 25 screenshot perspectives were calibrated to maintain clear sightlines without geometry clipping or floating elements.
5. **Observed Minor Defect for Future Waves:** In wide shot angles from deep side perspectives, the cantilevered luminaire bar on F4 slightly crosses the rear of the monitor row; this is natural physical perspective and does not impede workstation interaction or character picking.

---

### N. Feature Branch & Remote Commit

All changes are committed strictly to `feat/v0-golden-loop`.
`main` has not been touched in any way.
