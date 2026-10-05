# GRAVITAS — POST-B0 DEFERRED PROGRAM SPECIFICATION
# SKILL ARENA: HISTORICAL CAPABILITY CURATION & FUTURE-PROJECT TOOLBOX
## Historical Capability Inventory & Evidence Ledger

**Document ID**: `DOC-SA-002`  
**Classification**: `POST-B0-DEFERRED-DESIGN`  
**Status**: `DEFERRED_CANDIDATE`  
**Value**: `HIGH`  
**Implementation Authorization**: `NO`  
**Created**: `2026-10-05T08:21:00+05:30`  
**Governing Baseline**: Phase B0 Freeze Gate (`docs/architecture-v2/B0_OBJECTIVE_LEDGER.md`)

---

## 1. Inventory Methodology & Evidence Standards

To avoid fabricating usage or constructing a speculative catalog, this inventory is reconstructed strictly from:
1. Active filesystem artifacts on the user's workstation (`C:\Users\smara\Desktop\`).
2. Installed agent runtimes, plugins, and skills (`C:\Users\smara\.gemini\`).
3. Formal audit reports, tool configurations, and test logs across previous projects (`o-travelz/reports/`, `ember-and-root/tests/`, etc.).
4. Existing GRAVITAS research registries (`research/SOURCES.md`, `gravitas-agent-specs/registries/`).

Every record in this inventory distinguishes between:
- **`USED_WITH_SUCCESS`**: Verified by code, passing test suites, build outputs, or formal post-mortem reports.
- **`USED_WITH_FRICTION`**: Documented difficulty, performance regression, or required override.
- **`EVALUATED_AND_REJECTED`**: Formally audited and explicitly rejected with recorded rationale.
- **`RECORDED_CANDIDATE`**: Identified external candidate recorded for future Arena evaluation without runtime adoption.
- **`UNKNOWN_GAP`**: Identified historical repository or tool whose internal patterns require future forensic auditing.

---

## 2. Historical Project Evidence Bases

### 2.1 Project: Ember & Root
- **Filesystem Path**: `C:\Users\smara\Desktop\ember-and-root`
- **Domain**: Tactile interactive web artifact / gamified focus journal.
- **Primary Source Artifacts**:
  - `docs/UI_UX_BRIEF.md`
  - `docs/EXPERIENCE_V2.md`
  - `tests/e2e/cinematic-experience.spec.ts`
  - `supabase/migrations/` (12 migration files establishing strict RLS and RPC schemas)
- **Extracted Capabilities**:
  - *Tactile / Object-First Philosophy*: Interfaces designed as physical artifacts rather than generic card grids; materiality and textural restraint over glowing gradients.
  - *Strict Spacing System*: 4px/8px baseline grid (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`) with zero arbitrary intermediate pixel offsets.
  - *Motion Discipline*: Micro-response (80–120ms press feedback), UI transitions (180–320ms), total sequence budget (<1.5s).
  - *Rigorous Reduced-Motion*: Under `prefers-reduced-motion: reduce`, animations collapse to instantaneous or `<=150ms` opacity fades; oscillation and motes eliminated while preserving 100% text readability.
  - *WCAG 2.1 AA Focus & Touch*: High-contrast 2px focus ring with 2px offset; touch targets `>=44x44px`.
  - *Lightweight Skeletons*: Subtle opacity pulses on surface containers rather than blocking spinners.
- **Explicitly Rejected Non-Transferable Elements**: Fantasy game lore (Ember, Root, Sparks, Satchel, Quests), copper/sage/parchment color schemes, XP/leveling animations.
- **Historical Outcome Evidence**: `USED_WITH_SUCCESS` (Audited and adapted for Gravitas Wave 12J-UX; documented in `docs/frontend/REFERENCE_AUDIT.md`).

---

### 2.2 Project: O-TRAVELZ
- **Filesystem Path**: `C:\Users\smara\Desktop\o-travelz`
- **Domain**: Large-scale tourism, geographical exploration, and transit system (Odisha).
- **Primary Source Artifacts**:
  - `frontend/src/index.css`
  - `frontend/src/App.tsx`
  - `reports/mobile_v4_m5_skill_application.json`
  - 31 Ponytail audit reports (`reports/transit_*_ponytail_review.json`, `reports/mobile_v4_m*_ponytail_review.json`)
  - Image identity audits across 81 destinations (`docs/81_DESTINATIONS_IMAGE_IDENTITY_AUDIT.json`)
- **Extracted Capabilities**:
  - *Typographic Hierarchy*: 4-tier typographic role model separating display titles, operational headers, body text, and monospace telemetry.
  - *Hairline Architectural Dividers*: Demarcating dense data views with 1px hairline borders (`--border-subtle`, `--border-default`) instead of heavy nested cards.
  - *High Information Density*: Structured metadata presentation (status badges, timestamps, coordinates, authority tags) without visual clutter.
  - *Mobile v4 Multi-Platform Rules*: Android Compose edge-to-edge patterns, SwiftUI MV state models, bilingual Odia/English localization.
- **Explicitly Rejected Non-Transferable Elements**: Mineral pigment palette (Chilika teal, temple clay, Kalinga brass), travel booking schemas, Leaflet tile styles.
- **Historical Outcome Evidence**: `USED_WITH_SUCCESS` (Mobile bootstrap verified in `reports/mobile_v4_m5_skill_application.json`; Ponytail debt reduction verified across 31 audit reports).

---

### 2.3 Project: Hospitality-AAMA & Algoryxz
- **Filesystem Paths**: `C:\Users\smara\Desktop\hospitality-aama`, `C:\Users\smara\Desktop\Algoryxz`
- **Domain**: Premium dining spatial experience & 3D WebGL interactive theatre.
- **Primary Source Artifacts**:
  - `hospitality-aama/docs/THREE_SCENE_ARCHITECTURE.md`
  - `hospitality-aama/docs/MOTION_CONTRACT.md`
  - `hospitality-aama/docs/PERFORMANCE_BUDGET.md`
  - `hospitality-aama/docs/COLOUR_MATERIAL_SYSTEM.md`
  - `Algoryxz/docs/DESIGN_IMPLEMENTATION_CONTRACT.md`
  - `Algoryxz/docs/THEATRE_RELEASE_CHECKPOINT_07_0.md`
  - Playwright browser QA scripts (`Algoryxz/scratch/live_browser_qa_08.js`)
- **Extracted Capabilities**:
  - *3-Tier + Spatial Token Model*: Primitive tokens -> Semantic tokens -> Component tokens -> Spatial/3D scene tokens.
  - *Three.js Performance Contract*: Zero-idle render loop (`cancelAnimationFrame` when camera/objects settle); clamped pixel ratio (`Math.min(window.devicePixelRatio, 1.5)`); mandatory cleanup and disposal of geometries, materials, and textures on unmount.
  - *Architectural 3D Composition & Lighting*: Physical environment scaling, grounded floor grids, conduit/raceway framing, temperature-calibrated lighting (5000–5500K key + restrained equipment status illumination).
  - *High-Mass Motion Physics*: Inertial transitions governed by mass and friction (`cubic-bezier(0.16, 1, 0.3, 1)`); zero cartoon bounce or wobble.
  - *Multi-Device Responsive Matrix*: Viewport testing across 1440x900, 1280x800, 768x1024, and 390x844 with zero horizontal scrollbar leaks.
- **Explicitly Rejected Non-Transferable Elements**: Restaurant table reservation flows, culinary plinths, stone masonry textures.
- **Historical Outcome Evidence**: `USED_WITH_SUCCESS` (Directly transferred to Gravitas Living HQ Zone 5 Server Bay 3D fixture in Wave 12J-UX; documented in `docs/frontend/REFERENCE_AUDIT.md`).

---

### 2.4 Project: Sherlock
- **Filesystem Path**: `C:\Users\smara\Desktop\sherlock`
- **Domain**: High-performance OSINT social media account discovery.
- **Primary Source Artifacts**: `pyproject.toml`, `sherlock_project/`, `tests/test_probes.py`, `.actor/actor.json`.
- **Extracted Capabilities**: Asynchronous network probing, target validation manifests, actor schema generation, headless CLI execution.
- **Historical Outcome Evidence**: `USED_WITH_SUCCESS` (Target probing and Pytest suites passing).

---

### 2.5 Project: SIH2026 (Smart India Hackathon)
- **Filesystem Path**: `C:\Users\smara\Desktop\SIH2026`
- **Domain**: Large-scale problem statement discovery, evaluation, and solution architecture.
- **Primary Source Artifacts**: `ANTIGRAVITY_SIH_2026_ANALYSIS.md`, `RESEARCH_METHODOLOGY.md`, `candidate_universe.csv`, `SIH26162_TECHNICAL_REALITY_GATE.md`.
- **Extracted Capabilities**: Multi-criteria trade-off matrices, technical reality gating, empirical data source registration, structured competitive analysis.
- **Historical Outcome Evidence**: `USED_WITH_SUCCESS` (Documented in hackathon final selection artifacts).

---

### 2.6 Project: Multi-agent (GRAVITAS Itself)
- **Filesystem Path**: `C:\Users\smara\Desktop\Multi-agent`
- **Domain**: Autonomous Multi-Agent Computer Operating System & Living Headquarters.
- **Primary Source Artifacts**: `docs/architecture-v2/`, `packages/`, `apps/desktop/`, 627 regression tests (`B0_REGRESSION_EVIDENCE.md`).
- **Extracted Capabilities**:
  - Kernel K0 (Durable jobs, SQLite event ledger, worksession recovery).
  - Kernel K1 (Surface qualification, zero-spend enforcement, headless CLI adapters).
  - Kernel K2 (Supervisor-worker trees, bounded turns, task handoff).
  - Kernel K3 (CapabilityGrants, tool authorization policy, credential boundary).
  - Kernel K4 (Architecture Arena, claim-relative evidential fitness, adversarial review).
  - Kernel K5 (Independent verifier, automated test harnesses, diff audit).
  - Desktop D0–D4 (Electron host, React shell, Three.js living headquarters, role presentation bots).
  - Build Convergence B0 (Strict typecheck, exactOptionalPropertyTypes, zero suppressions).
- **Historical Outcome Evidence**: `USED_WITH_SUCCESS` (All 627 unit/integration tests and 63 live desktop smoke steps passing).

---

### 2.7 Other Historical Projects (Identified Gaps for Future Audit)
- **`C:\Users\smara\Desktop\nemotron-cline-test`**: Local model evaluation experiment with Cline. Status: `EXPERIMENTAL_EVALUATION` (Requires inspection in SA0).
- **`C:\Users\smara\Desktop\DSW 1`**: Filesystem project present. Status: `UNKNOWN_GAP` (Requires inspection in SA0).
- **`C:\Users\smara\Desktop\MCSD`**: Filesystem project present. Status: `UNKNOWN_GAP` (Requires inspection in SA0).
- **`C:\Users\smara\Desktop\IIT BBSR`**: Filesystem project present. Status: `UNKNOWN_GAP` (Requires inspection in SA0).
- **`C:\Users\smara\Desktop\New folder`**: Filesystem folder present. Status: `UNKNOWN_GAP` (Requires inspection in SA0).

---

## 3. Tooling, Agent Harnesses & Runtime Inventory

### 3.1 Ponytail Plugin Suite (`@dietrichgebert/ponytail@4.9.0`)
- **Location**: `C:\Users\smara\.gemini\config\plugins\ponytail\`
- **Source Type**: `RULESET` / `AGENT_TOOL`
- **License**: MIT License (Author: Dietrich Gebert)
- **Forensic Audit**: Audited in `docs/frontend/PONYTAIL_AUDIT.md`. Contains zero 3D assets or character meshes; 100% prompt engineering and agent review rules.
- **Components**:
  1. `ponytail`: Core lazy senior developer mode (YAGNI, standard library first, native platform features before dependencies, minimal lines).
  2. `ponytail-audit`: Whole-codebase audit generating ranked deletion and simplification scorecards.
  3. `ponytail-debt`: Ledger tracking deliberate shortcuts and deferred items.
  4. `ponytail-gain`: Quantitative metric display of saved code and complexity reduction.
  5. `ponytail-help`: Reference card for ponytail commands.
  6. `ponytail-review`: Focused code review identifying speculative abstractions, dead code, and unneeded dependencies.
- **Historical Outcome Evidence**: `USED_WITH_SUCCESS` (Applied extensively in `o-travelz` across 31 audit reports and governed Gravitas Wave 12J-UX frontend consolidation).

---

### 3.2 GSD Core (`@opengsd/gsd-core@1.13.0`)
- **Location**: `C:\Users\smara\.gemini\antigravity\gsd-core`
- **Source Type**: `WORKFLOW` / `AGENT_TOOL`
- **License**: MIT License
- **Configuration**: Installed across Antigravity runtime with 72 skills registered in `C:\Users\smara\.gemini\config\skills`.
- **Core Machinery**:
  - `agent-skills-bootstrap.md`: Mandatory self-load contract for consumer agents to discover project skills without orchestrator bash execution.
  - `project-skills-discovery.md`: Discovery workflow scanning `.agents/skills/` and reading `SKILL.md` indexes.
  - `sync-skills.md`: Cross-runtime synchronization with strict runtime-id validation and cross-runtime refusal guards.
- **Historical Outcome Evidence**: `USED_WITH_SUCCESS` (Verified in `o-travelz/reports/tooling_gsd_setup.json`).

---

### 3.3 Automated Code Review & Agent Loop Extensions
- **CodeRabbit VS Code Extension (`coderabbit.coderabbit-vscode@0.21.6`)**:
  - Location: `C:\Users\smara\.antigravity-ide\extensions\coderabbit.coderabbit-vscode-0.21.6-universal\`
  - Purpose: Independent PR reviewer focusing on truth contracts, memory safety, and secrets hygiene without auto-merging.
  - Outcome: `USED_WITH_SUCCESS` (Configured in `o-travelz/reports/tooling_coderabbit_setup.json`).
- **Ralph Loop for Antigravity (`alexj11324.ralph-loop-for-antigravity-updated@0.7.43`)**:
  - Location: `C:\Users\smara\.antigravity-ide\extensions\alexj11324.ralph-loop-for-antigravity-updated-0.7.43-universal\`
  - Purpose: Subordinate iterative execution loop with hard stop token matching and bounded iterations (max 10).
  - Outcome: `USED_WITH_SUCCESS` (Verified in `o-travelz/reports/tooling_ralph_setup.json`).
- **Roo Code in VS Code (`rooveterinaryinc.roo-cline@3.54.0`)**:
  - Location: `C:\Users\smara\AppData\Roaming\Code\User\globalStorage\rooveterinaryinc.roo-cline\`
  - Purpose: Secondary PR review and targeted refactoring with single-writer lock concurrency.
  - Outcome: `USED_WITH_SUCCESS` (Verified in `o-travelz/reports/tooling_roo_setup.json`).

---

### 3.4 Antigravity Native Subagent Engine
- **Location**: In-process Antigravity runtime environment.
- **Mechanism**: `define_subagent`, `invoke_subagent`, `manage_subagents`, `send_message`.
- **Model Tiers**: `inherit`, `flash_lite`, `flash`, `pro`.
- **Capabilities**: Asynchronous parallel background execution, reactive wakeup, structured handoff, isolated conversation transcripts.
- **Historical Outcome Evidence**: `USED_WITH_SUCCESS` (Audited in `o-travelz/reports/research_subagents_capability_audit.json`).

---

### 3.5 Native Platform & Mobile Skills (72 Installed Skills)
Installed at `C:\Users\smara\.gemini\config\skills\`:

| Category | Skill Name | Core Domain | Historical Status |
| :--- | :--- | :--- | :--- |
| **Android / Compose** | `android-edge-to-edge` | Edge-to-edge layout, status/nav bar insets, IME paddings | `USED_WITH_SUCCESS` (Applied in `o-travelz` M5) |
| | `android-navigation-3` | Jetpack Navigation 3, backstacks, scene routing | `EVALUATED_AND_REJECTED` (Deferred in M5 for stable Nav Compose) |
| | `android-styles` | Jetpack Compose Styles API, Material 3 semantic themes | `USED_WITH_SUCCESS` (Applied in `o-travelz` M5 Theme.kt) |
| | `android-testing-setup` | Unit & UI testing architecture, JUnit 4 JVM fixtures | `USED_WITH_SUCCESS` (Applied in `o-travelz` M5 JVM tests) |
| | `android-adaptive` | Window size classes, foldables, tablets, nav rails | `ACTIVE_CAPABILITY` |
| | `android-agp-9-upgrade` | AGP 9 migration rules | `ACTIVE_CAPABILITY` |
| | `android-appfunctions` | Android AppFunctions, assistant execution | `ACTIVE_CAPABILITY` |
| | `android-camerax` | CameraX async recording & hardware interop | `ACTIVE_CAPABILITY` |
| | `android-intent-security` | Component hijacking prevention, Intent Redirection audit | `ACTIVE_CAPABILITY` |
| | `android-profiler` | Systrace, heap dumps, method tracing, SQL profiling | `ACTIVE_CAPABILITY` |
| | `android-r8-analyzer` | Proguard & R8 rule optimization | `ACTIVE_CAPABILITY` |
| | `android-restore-credentials`| Silent sign-in key recovery | `ACTIVE_CAPABILITY` |
| | `android-verified-email` | OTP-less verified email credential retrieval | `ACTIVE_CAPABILITY` |
| | `android-wear-compose-m3` | Wear OS Material 3 UI | `ACTIVE_CAPABILITY` |
| **iOS / Apple** | `swiftui-patterns` | Modern SwiftUI MV architecture, @Observable, @State | `USED_WITH_SUCCESS` (Applied in `o-travelz` M5) |
| | `swift-architecture` | Modular architecture, Clean/MV separation | `USED_WITH_SUCCESS` (Applied in `o-travelz` M5) |
| | `swiftui-animation` | PhaseAnimator, KeyframeAnimator, matched geometry | `ACTIVE_CAPABILITY` |
| | `swiftui-liquid-glass` | iOS 26+ Liquid Glass UI, glassEffect modifiers | `ACTIVE_CAPABILITY` |
| | `swiftui-navigation` | NavigationStack, NavigationSplitView, deep links | `ACTIVE_CAPABILITY` |
| | `swiftui-gestures` | Gesture composition, highPriorityGesture | `ACTIVE_CAPABILITY` |
| | `swiftui-performance` | View body update diagnostics, Instruments lanes | `ACTIVE_CAPABILITY` |
| | `ios-accessibility` | VoiceOver, Dynamic Type, custom rotors, traits | `ACTIVE_CAPABILITY` |
| | `ios-localization` | String Catalogs (.xcstrings), RTL layout | `ACTIVE_CAPABILITY` |
| | `swift-concurrency` | Swift 6 strict concurrency, Sendable, actors | `ACTIVE_CAPABILITY` |
| | `swift-security` | Keychain Services, CryptoKit, Secure Enclave | `ACTIVE_CAPABILITY` |
| | `swift-testing` | Swift Testing framework (@Test, #expect) | `ACTIVE_CAPABILITY` |
| | `metrickit` | Production telemetry, hang/crash diagnostic reports | `ACTIVE_CAPABILITY` |
| **Cross-Platform** | `graphify` | Persistent codebase knowledge graphs | `ACTIVE_CAPABILITY` |
| | `authentication` | ASAuthorizationController, passkeys, WebAuthn | `ACTIVE_CAPABILITY` |
| | `background-processing` | BGTaskScheduler, background URLSession | `ACTIVE_CAPABILITY` |
| | `debugging-instruments` | LLDB, interactive memory graph debugger | `ACTIVE_CAPABILITY` |

---

## 4. Candidate Design, Component & Reference Sources

Curated external sources recognized across GRAVITAS agent specifications (`gravitas-agent-specs/registries/DESIGN_SOURCE_REGISTRY.md`):

| Source Name | Category | Primary Use | Current Classification |
| :--- | :--- | :--- | :--- |
| **21st.dev** | `COMPONENT_LIBRARY` | Contemporary Tailwind/React component discovery. | `REFERENCE_ONLY` |
| **React Bits** | `MOTION_LIBRARY` | Motion, physics, and interaction reference snippets. | `REFERENCE_ONLY` |
| **Skiper UI** | `COMPONENT_LIBRARY` | Polished micro-interactions and tactile UI references. | `REFERENCE_ONLY` |
| **Codrops** | `DESIGN_REFERENCE` | Experimental web interaction, art direction, and typography research. | `REFERENCE_ONLY` |
| **shadcn/ui** | `COMPONENT_LIBRARY` | Accessible, copy-paste application primitives. | `CANDIDATE_COMPONENT_SOURCE` |
| **Radix Primitives** | `COMPONENT_LIBRARY` | Headless, unstyled WAI-ARIA compliant accessibility primitives. | `CANDIDATE_COMPONENT_SOURCE` |
| **Anime.js** | `CODE_LIBRARY` | Lightweight JavaScript animation engine. | `CANDIDATE_MOTION_ENGINE` |
| **Three.js** | `CODE_LIBRARY` | WebGL 3D rendering library used in Gravitas Living HQ. | `ACTIVE_CORE_DEPENDENCY` |
| **ThreeUI** | `COMPONENT_LIBRARY` | 3D spatial UI overlays and layout projection. | `RECORDED_CANDIDATE` |

---

## 5. Recent External Candidates (Recorded Without Ingestion)

The following candidates were identified in recent program sweeps and are recorded for future Arena evaluation. **None have been ingested into runtime code**:

1. **`vercel-labs/agent-skills`**:
   - Source Type: `SKILL` / `RULESET`
   - Claimed Scope: Curated skills for AI agents focusing on Next.js, web development, and deployment.
   - Evaluation Status: `RECORDED_CANDIDATE` (Awaits licensing check and atomic rule extraction in SA0/SA1).
2. **`VoltAgent/awesome-design-md`**:
   - Source Type: `DESIGN_REFERENCE` / `RULESET`
   - Claimed Scope: Collection of curated `DESIGN.md` guidelines for software and web design.
   - Evaluation Status: `RECORDED_CANDIDATE` (Awaits decomposition into Universal vs Aesthetic rules in SA1).
3. **`Leonxlnx/taste-skill` (including `skills/image-to-code-skill`)**:
   - Source Type: `SKILL` / `WORKFLOW`
   - Claimed Scope: Visual taste heuristics, typography rules, and screenshot-to-code guidelines.
   - Evaluation Status: `RECORDED_CANDIDATE` (Requires blind visual benchmark in SA4).
4. **`arena-skiIl/.github`**:
   - Source Type: `RESEARCH_SOURCE`
   - Evaluation Status: **`CONCEPTUAL_RESEARCH_ONLY` — BINARY STRICTLY REJECTED**.
   - Analysis: Contains useful conceptual models of multi-agent competitive task arenas and bracket progressions. However, the repository distributes Windows archives and password-protected binaries without verified open-source implementation. **Binary download and execution are permanently forbidden**.
5. **`Obscura`**:
   - Source Type: `AGENT_TOOL`
   - Scope: Headless browser automation and stealth crawling engine.
   - Evaluation Status: **`TOOL_QUALIFICATION_CANDIDATE` (NOT A DESIGN SKILL)**. Evaluated separately under K1 tool qualification standards.

---

## 6. Known vs. Unknown Gap Ledger

| Inventory Area | Known & Evidenced | Unknown Historical Gaps (For Wave SA0 Audit) |
| :--- | :--- | :--- |
| **Previous Projects** | Detailed files and reports for `ember-and-root`, `o-travelz`, `hospitality-aama`, `Algoryxz`, `sherlock`, `SIH2026`, and `Multi-agent`. | Exact contents and reusable rules in `nemotron-cline-test`, `DSW 1`, `MCSD`, and `IIT BBSR`. |
| **Agent Runtimes** | Exact versions, paths, and configurations for Ponytail (v4.9.0), GSD Core (v1.13.0), CodeRabbit (v0.21.6), Ralph Loop (v0.7.43), Roo Code (v3.54.0). | Exact historical commit logs of subagent prompt alterations across old sessions. |
| **Platform Skills** | Complete inventory of 72 skills in `config/skills` with exact descriptions and paths. | Evidentiary fitness scores for the ~40 skills not yet tested in a production wave. |
| **Component Libraries** | Documented usage of Radix, Lucide, Three.js, and CSS variables across active apps. | Precise license constraints and bundling footprints of all 21st.dev community snippets. |
| **External Candidates** | Architecture briefs for `agent-skills`, `awesome-design-md`, `taste-skill`, and `arena-skiIl`. | Line-by-line atomic rule breakdowns and conflict graphs. |
