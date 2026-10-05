# SA1 Scope Lock & Ingestion Perimeter

## Status: LOCKED & AUTHORIZED
- Wave: SA1 Atomic Rule Extraction & Provenance Corpus
- Governing Spec: `docs/architecture-v2/SKILL_ARENA_PROGRAM.md`
- Pre-SA1 Baseline Commit: `c684ad8d89e7c53e827173e46efd019fce9d3434`

---

## 1. SA0 Ingestion Boundary Adherence
In strict compliance with SA0 qualification gates:
- Only sources qualified with disposition **`ENTER_SA1`** were admitted to this extraction wave.
- Expected `ENTER_SA1` Count: **97 sources**
- Actual Admitted Count: **97 sources**
- Discrepancy: **0**

## 2. Ingestion Composition
1. **Ponytail Suite (4 sources)**:
   - `src-ponytail-core`, `src-ponytail-audit`, `src-ponytail-debt`, `src-ponytail-review`
2. **GSD Core Suite (53 sources)**:
   - 12 Core Workflow, 10 Quality Gates, 10 Project Lifecycle, 6 Ideation, 7 Codebase Intel, 8 Workstream Management
3. **Android / Jetpack Compose Skills (12 sources)**:
   - `android-edge-to-edge`, `android-styles`, `android-testing-setup`, `android-adaptive`, `android-intent-security`, `android-profiler`, `android-r8-analyzer`, `android-camerax`, `android-appfunctions`, `android-verified-email`, `android-restore-credentials`, `android-play-policy-insights`
4. **iOS / Swift Skills (22 sources)**:
   - `swiftui-patterns`, `swift-architecture`, `swiftui-animation`, `swiftui-liquid-glass`, `swiftui-performance`, `swift-concurrency`, `swift-security`, `swift-testing`, `ios-accessibility`, `ios-localization`, `swiftui-navigation`, `swiftui-gestures`, `swiftui-layout-components`, `swift-codable`, `ios-networking`, `metrickit`, `app-store-optimization`, `app-store-review`, `authentication`, `background-processing`, `mapkit`, `push-notifications`
5. **Builtin / Cross-Platform Skills (2 sources)**:
   - `src-graphify`, `src-generative_ui`
6. **External Candidates (2 sources)**:
   - `ext-vercel-agent-skills`, `ext-taste-skill`
7. **Component Primitives (2 sources)**:
   - `ref-shadcn-ui`, `ref-radix-primitives`

## 3. Strict Exclusions Enforced
- **REFERENCE_ONLY (55 sources)**: 0 rules extracted. Kept as passive corpora.
- **PROJECT_SPECIFIC_ONLY (6 sources)**: 0 rules extracted. Kept in historical domain silos.
- **TOOL_QUALIFICATION_SEPARATE (10 sources)**: 0 rules extracted. Routed to K1/K3.
- **QUARANTINED (1 source - arena-skiIl)**: 0 rules extracted. Binaries remain unexecuted.
- **REJECTED (4 sources)**: 0 rules extracted. Excluded from all pipelines.
- **UNRESOLVED (1 source - nemotron-cline-test)**: 0 rules extracted. Documented gap.
