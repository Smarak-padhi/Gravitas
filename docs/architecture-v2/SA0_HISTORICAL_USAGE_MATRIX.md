# SA0 Historical Usage & Evidentiary Value Matrix

## Methodology
This matrix records empirical evidence of candidate source utilization across historical projects. Claims of value are strictly grounded in repository evidence (code commits, test reports, configurations, or audit logs).

| Project | Candidate / Source | Used For | Direct Evidence Artifact | Outcome | Reusability Signal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ember & Root** | Tactile Object Philosophy | Physical material feel, cards as physical surfaces | `docs/UI_UX_BRIEF.md`, `tests/e2e/cinematic-experience.spec.ts` | `USED_WITH_SUCCESS` | HIGH (Universal tactile aesthetic) |
| **Ember & Root** | 4px Baseline Grid | Spacing discipline across all UI layouts | `docs/EXPERIENCE_V2.md` | `USED_WITH_SUCCESS` | HIGH (Universal spacing token rules) |
| **Ember & Root** | Reduced Motion Contract | Motion collapse to <=150ms opacity fades | `docs/EXPERIENCE_V2.md#motion-accessibility` | `USED_WITH_SUCCESS` | HIGH (Universal accessibility rule) |
| **Ember & Root** | Game Lore & Copper Palette | Fantasy RPG narrative & warm copper/sage colors | `supabase/migrations/` | `USED_WITH_SUCCESS` | REJECT (Project-specific only) |
| **O-TRAVELZ** | Ponytail Plugin Suite | Senior dev code review, anti-bloat audits | 31 audit reports (`reports/*_ponytail_review.json`) | `USED_WITH_SUCCESS` | HIGH (Proven anti-overengineering rules) |
| **O-TRAVELZ** | GSD Core Workflow | Spec-driven phase planning & milestone audits | `reports/tooling_gsd_setup.json`, `.planning/` | `USED_WITH_SUCCESS` | HIGH (Structured execution discipline) |
| **O-TRAVELZ** | Android Edge-to-Edge | Mobile status/nav bar insets & IME handling | `reports/mobile_v4_m5_skill_application.json` | `USED_WITH_SUCCESS` | HIGH (Essential Android UI standard) |
| **O-TRAVELZ** | Android Compose Styles | Material 3 token mapping in Theme.kt | `reports/mobile_v4_m5_skill_application.json` | `USED_WITH_SUCCESS` | HIGH (Semantic theme token model) |
| **O-TRAVELZ** | Android Navigation 3 | Declarative scene routing evaluation | `reports/mobile_v4_m5_skill_application.json` | `EVALUATED_AND_REJECTED` | MEDIUM (Stay with stable Nav Compose) |
| **O-TRAVELZ** | SwiftUI MV Patterns | Modular SwiftUI architecture with @Observable | `reports/mobile_v4_m5_skill_application.json` | `USED_WITH_SUCCESS` | HIGH (Modern Apple platform architecture) |
| **O-TRAVELZ** | Hairline Dividers & Density | Dense transit telemetry presentation | `frontend/src/index.css` | `USED_WITH_SUCCESS` | HIGH (High-density telemetry layout) |
| **Hospitality-AAMA** | Three.js Zero-Idle Loop | Cancelling animation frames when camera settles | `docs/THREE_SCENE_ARCHITECTURE.md`, `PERFORMANCE_BUDGET.md` | `USED_WITH_SUCCESS` | HIGH (Universal WebGL performance rule) |
| **Hospitality-AAMA** | High-Mass Motion Physics | Inertial cubic-bezier easing without cartoon bounce | `docs/MOTION_CONTRACT.md` | `USED_WITH_SUCCESS` | HIGH (Universal mature motion standard) |
| **Hospitality-AAMA** | Environmental Lighting | Calibrated 5000K key light & architectural raceways | `docs/COLOUR_MATERIAL_SYSTEM.md` | `USED_WITH_SUCCESS` | HIGH (Living HQ 3D composition) |
| **Algoryxz** | 3-Tier + Spatial Token Model | Primitive -> Semantic -> Component -> 3D tokens | `docs/DESIGN_IMPLEMENTATION_CONTRACT.md` | `USED_WITH_SUCCESS` | HIGH (Universal design token architecture) |
| **Algoryxz** | Playwright Browser QA | Automated headless browser verification | `scratch/live_browser_qa_08.js` | `USED_WITH_SUCCESS` | HIGH (Independent verification harness) |
| **Sherlock** | Async Network Prober | High-concurrency CLI network inspection | `pyproject.toml`, `tests/test_probes.py` | `USED_WITH_SUCCESS` | MEDIUM (CLI probing architecture) |
| **SIH2026** | Technical Reality Gating | Multi-criteria feasibility trade-off analysis | `SIH26162_TECHNICAL_REALITY_GATE.md` | `USED_WITH_SUCCESS` | HIGH (Decision arbitration criteria) |
| **Multi-agent (Gravitas)** | Kernel K0 State Machine | Durable WorkSession event ledger & lock manager | `packages/core/src/kernel/`, 51 tests | `USED_WITH_SUCCESS` | HIGH (Core durable execution) |
| **Multi-agent (Gravitas)** | Harness K1 Adapter Engine | Zero-spend policy & qualified process runners | `packages/harnesses/src/k1/`, 108 tests | `USED_WITH_SUCCESS` | HIGH (Surface qualification) |
| **Multi-agent (Gravitas)** | Authority K3 Grant Model | CapabilityGrant issuance & tool scoping | `packages/orchestrator/src/k3/`, 85 tests | `USED_WITH_SUCCESS` | HIGH (Strict security boundaries) |
| **Multi-agent (Gravitas)** | Architecture Arena K4 | Fitness function scoring & scout arbitration | `packages/orchestrator/src/k4/`, 40 tests | `USED_WITH_SUCCESS` | HIGH (Arena evaluation runtime) |
| **Multi-agent (Gravitas)** | Verifier K5 Engine | Adversarial falsification & cryptographic digests | `packages/orchestrator/src/k5/`, 40 tests | `USED_WITH_SUCCESS` | HIGH (Independent epistemological gate) |
| **Multi-agent (Gravitas)** | Living HQ D3-D4 3D World | 25-role presentation bots & spatial projection | `apps/desktop/src/renderer/`, 120 tests | `USED_WITH_SUCCESS` | HIGH (Spatial desktop projection) |
