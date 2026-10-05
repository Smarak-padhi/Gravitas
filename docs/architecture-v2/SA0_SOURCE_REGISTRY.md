# SA0 Source Registry & Qualification Catalog

## Taxonomy & Disposition Key
- **Source Types**: `SKILL`, `RULESET`, `WORKFLOW`, `DESIGN_REFERENCE`, `DESIGN_SYSTEM`, `COMPONENT_LIBRARY`, `MOTION_LIBRARY`, `CODE_LIBRARY`, `MCP_TOOL`, `AGENT_TOOL`, `RESEARCH_SOURCE`, `PROJECT_SPECIFIC_KNOWLEDGE`, `OTHER`
- **Qualification Status**: `DISCOVERED`, `SOURCE_VERIFIED`, `LICENSE_VERIFIED`, `USAGE_VERIFIED`, `CURRENTLY_AVAILABLE`, `STALE`, `UNRESOLVED`, `QUARANTINED`, `REJECTED_FROM_FUTURE_ARENA`
- **Recommended Disposition**: `ENTER_SA1`, `REFERENCE_ONLY`, `PROJECT_SPECIFIC_ONLY`, `TOOL_QUALIFICATION_SEPARATE`, `HUMAN_ONLY`, `QUARANTINE`, `REJECT`, `UNRESOLVED`

---

## 1. Installed Agent Skills & Plugins (`Partition A`)

### 1.1 Ponytail Suite (6 Skills)
- `src-ponytail-core`: Ponytail Core Senior Dev Heuristics | `RULESET` | MIT | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Used in O-TRAVELZ and Gravitas Wave 12J.
- `src-ponytail-audit`: Whole-codebase over-engineering audit | `AGENT_TOOL` | MIT | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | 31 audit reports in O-TRAVELZ.
- `src-ponytail-debt`: Deferred complexity ledger | `WORKFLOW` | MIT | `USAGE_VERIFIED` | `ENTER_SA1` | Medium Potential | Tracks intentional shortcuts.
- `src-ponytail-gain`: Complexity reduction scoreboard | `AGENT_TOOL` | MIT | `USAGE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | Static metric display.
- `src-ponytail-help`: Command cheat sheet | `OTHER` | MIT | `USAGE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | Reference documentation.
- `src-ponytail-review`: Over-engineering PR review | `AGENT_TOOL` | MIT | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Anti-bloat review pass.

### 1.2 GSD Core Suite (72 Skills)
- `src-gsd-core-workflow` (12 skills: `gsd-discuss-phase`, `gsd-plan-phase`, `gsd-execute-phase`, `gsd-verify-work`, `gsd-progress`, `gsd-next`, `gsd-fast`, `gsd-quick`, `gsd-pause-work`, `gsd-resume-work`, `gsd-ship`, `gsd-undo`): Spec-Driven Development engine | `WORKFLOW` | MIT | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Structured task execution.
- `src-gsd-quality-gates` (10 skills: `gsd-code-review`, `gsd-debug`, `gsd-audit-fix`, `gsd-secure-phase`, `gsd-eval-review`, `gsd-ui-review`, `gsd-audit-uat`, `gsd-validate-phase`, `gsd-forensics`, `gsd-plan-review-convergence`): Quality review gates | `WORKFLOW` | MIT | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Rigorous automated verification.
- `src-gsd-project-lifecycle` (10 skills: `gsd-new-project`, `gsd-new-milestone`, `gsd-complete-milestone`, `gsd-audit-milestone`, `gsd-milestone-summary`, `gsd-cleanup`, `gsd-stats`, `gsd-review-backlog`, `gsd-import`, `gsd-inbox`): Project lifecycle management | `WORKFLOW` | MIT | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Project scaffolding.
- `src-gsd-ideation` (6 skills: `gsd-explore`, `gsd-sketch`, `gsd-spike`, `gsd-spec-phase`, `gsd-mvp-phase`, `gsd-capture`): Idea routing and spiking | `WORKFLOW` | MIT | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Early stage ideation.
- `src-gsd-codebase-intel` (7 skills: `gsd-map-codebase`, `gsd-graphify`, `gsd-ingest-docs`, `gsd-extract-learnings`, `gsd-mempalace-capture`, `gsd-mempalace-recall`, `gsd-docs-update`): Knowledge graphs and docs | `WORKFLOW` | MIT | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Codebase mapping.
- `src-gsd-management` (8 skills: `gsd-manager`, `gsd-workstreams`, `gsd-thread`, `gsd-workspace`, `gsd-surface`, `gsd-settings`, `gsd-config`, `gsd-update`): Workstream coordination | `WORKFLOW` | MIT | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Coordination.
- `src-gsd-namespaces-and-utilities` (19 skills: `gsd-ns-*`, `gsd-help`, `gsd-health`, `gsd-pr-branch`, `gsd-profile-user`, `gsd-review`, `gsd-add-tests`, `gsd-ai-integration-phase`, `gsd-autonomous`, `gsd-ui-phase`, `gsd-ultraplan-phase`): Utilities and namespace facades | `WORKFLOW` | MIT | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | Redundant or wrapper tooling.

### 1.3 Android / Compose Skills (22 Skills)
- `src-android-edge-to-edge`: Adaptive edge-to-edge layout & system insets | `SKILL` | Apache-2.0 | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Proven in O-TRAVELZ Mobile v4.
- `src-android-styles`: Material 3 Compose Styles API & tokens | `SKILL` | Apache-2.0 | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Proven in O-TRAVELZ Theme.kt.
- `src-android-testing-setup`: Unit and UI testing harness architecture | `SKILL` | Apache-2.0 | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Proven in O-TRAVELZ JVM test suite.
- `src-android-adaptive`: Adaptive layouts, window size classes, nav rails | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Core multi-device capability.
- `src-android-intent-security`: Intent redirection audit & component protection | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Critical mobile security.
- `src-android-profiler`: Systrace, heap dump, and method tracing | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Mobile performance diagnostics.
- `src-android-r8-analyzer`: Proguard/R8 optimization rules | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | APK minification.
- `src-android-camerax`: CameraX async recording & hardware interop | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Specialized hardware.
- `src-android-appfunctions`: System agent shortcuts & on-device workflows | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | On-device agent actions.
- `src-android-verified-email`: OTP-less Credential Manager verification | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Mobile auth.
- `src-android-restore-credentials`: Silent sign-in key recovery | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Mobile auth recovery.
- `src-android-navigation-3`: Jetpack Navigation 3 backstacks | `SKILL` | Apache-2.0 | `USAGE_VERIFIED` | `REFERENCE_ONLY` | Medium Potential | Evaluated and rejected in O-TRAVELZ in favor of stable Nav Compose.
- `src-android-wear-compose-m3`: Wear OS Material 3 UI | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | Specialized wearable domain.
- `src-android-display-glasses`: XR Compose Glimmer toolkit | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | Specialized hardware.
- `src-android-leanback-compose`: TV Leanback migration toolkit | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | Legacy TV migration.
- `src-android-agp-9-upgrade`: AGP 9 migration rules | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | Ephemeral build migration.
- `src-android-migrate-xml-views`: XML View to Compose migration | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | Legacy migration.
- `src-android-media3-cast`: Google Cast Media3 integration | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | Specialized media casting.
- `src-android-play-billing`: PBL upgrade rules | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | Ephemeral billing migration.
- `src-android-play-policy-insights`: Play Store policy audit | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Compliance audit.
- `src-android-cli`: Android CLI management | `AGENT_TOOL` | Apache-2.0 | `SOURCE_VERIFIED` | `TOOL_QUALIFICATION_SEPARATE` | Medium Potential | CLI tool wrapper.
- `src-android-engage-sdk`: Play Engage SDK publishing | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | Niche publishing SDK.

### 1.4 iOS / Swift / Apple Skills (26 Skills)
- `src-swiftui-patterns`: Modern SwiftUI MV architecture & @Observable | `SKILL` | Apple Public | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Proven in O-TRAVELZ M5.
- `src-swift-architecture`: Modular architecture & state ownership | `SKILL` | Apple Public | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Proven in O-TRAVELZ M5.
- `src-swiftui-animation`: SwiftUI motion, springs, and KeyframeAnimator | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Native motion contracts.
- `src-swiftui-liquid-glass`: iOS 26+ Liquid Glass UI effects | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Advanced visual aesthetics.
- `src-swiftui-performance`: View body update diagnostics & Instruments | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Performance profiling.
- `src-swift-concurrency`: Swift 6 strict concurrency, Sendable, actors | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Concurrency correctness.
- `src-swift-security`: Keychain Services, CryptoKit, Secure Enclave | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Mobile security.
- `src-swift-testing`: Swift Testing framework (@Test, #expect) | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Modern test harnesses.
- `src-ios-accessibility`: VoiceOver, Dynamic Type, custom rotors | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Accessibility compliance.
- `src-ios-localization`: String Catalogs (.xcstrings) and RTL layout | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Internationalization.
- `src-swiftui-navigation`: NavigationStack & deep linking patterns | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Routing.
- `src-swiftui-gestures`: Gesture composition & priority resolution | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Interaction design.
- `src-swiftui-layout-components`: Stacks, grids, and scroll views | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Layout primitives.
- `src-swift-codable`: JSONDecoder, CodingKeys, strategies | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Serialization.
- `src-ios-networking`: URLSession async/await & request pipelines | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Networking.
- `src-metrickit`: MetricManager telemetry & diagnostics | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Production telemetry.
- `src-app-store-optimization`: ASO keyword & metadata strategy | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Store distribution.
- `src-app-store-review`: App Store guidelines & rejection prevention | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Submission auditing.
- `src-authentication`: ASAuthorizationController, passkeys, WebAuthn | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Modern authentication.
- `src-background-processing`: BGTaskScheduler & background fetch | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Background lifecycle.
- `src-mapkit`: MapKit & CoreLocation asynchronous streams | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Geospatial mapping.
- `src-push-notifications`: UNUserNotificationCenter & APNs | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `ENTER_SA1` | Medium Potential | Notification systems.
- `src-permissionkit`: Child communication safety & permissions | `SKILL` | Apple Public | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | Specialized parental consent.
- `src-debugging-instruments`: LLDB & memory graph debugger | `AGENT_TOOL` | Apple Public | `SOURCE_VERIFIED` | `TOOL_QUALIFICATION_SEPARATE` | High Potential | Debugging tools.
- `src-ios-ettrace-performance`: ETTrace flamegraph capture | `AGENT_TOOL` | Apple Public | `SOURCE_VERIFIED` | `TOOL_QUALIFICATION_SEPARATE` | Medium Potential | Performance profiling tool.
- `src-ios-memgraph-analysis`: Leaks CLI & memgraph analysis | `AGENT_TOOL` | Apple Public | `SOURCE_VERIFIED` | `TOOL_QUALIFICATION_SEPARATE` | High Potential | Memory leak analysis tool.

### 1.5 Builtin & Cross-Platform Skills (10 Skills)
- `src-graphify`: Persistent codebase knowledge graphs | `SKILL` | Proprietary/Internal | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Codebase architecture analysis.
- `src-agy-customizations`: Antigravity Customization Architecture | `SKILL` | Google Proprietary | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | High Potential | Environment reference.
- `src-antigravity_guide`: Comprehensive AGY guide & sitemap | `SKILL` | Google Proprietary | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | High Potential | Environment reference.
- `src-generative_ui`: Interactive HTML/React widgets | `SKILL` | Google Proprietary | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Proven in Gravitas artifacts.
- `src-migrate-workflows`: Legacy workflow migration | `WORKFLOW` | Google Proprietary | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | Maintenance workflow.
- `src-automation`: Antigravity automated triggers | `WORKFLOW` | Google Proprietary | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | System automation.
- `src-permissioned-github`: GitHub integration boundary | `WORKFLOW` | Google Proprietary | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Medium Potential | Platform boundary.
- `src-plugin`: Custom plugin packaging | `WORKFLOW` | Google Proprietary | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | System packaging.
- `src-ui-extension`: UI extension development | `WORKFLOW` | Google Proprietary | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | System extensions.
- `src-ui-plugin-navigation`: Navigation hooks for plugins | `WORKFLOW` | Google Proprietary | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Low Potential | System navigation.

---

## 2. MCP Servers (`Partition B`)
- `mcp-playwright`: Playwright browser automation server | `MCP_TOOL` | Apache-2.0 | `USAGE_VERIFIED` | `TOOL_QUALIFICATION_SEPARATE` | High Potential | Used in Algoryxz & Gravitas QA.
- `mcp-stitch`: Visual screen generation & design system tool | `MCP_TOOL` | Proprietary | `USAGE_VERIFIED` | `TOOL_QUALIFICATION_SEPARATE` | High Potential | Active design generation.
- `mcp-reticle`: UI coordinate inspection tool | `MCP_TOOL` | Proprietary | `SOURCE_VERIFIED` | `TOOL_QUALIFICATION_SEPARATE` | Medium Potential | Experimental visual probe.

---

## 3. Agent Extensions & Workflows (`Partition C`)
- `ext-coderabbit`: CodeRabbit automated PR review | `AGENT_TOOL` | Commercial | `USAGE_VERIFIED` | `TOOL_QUALIFICATION_SEPARATE` | High Potential | Truth & safety review.
- `ext-ralph-loop`: Ralph Loop iterative execution engine | `WORKFLOW` | MIT | `USAGE_VERIFIED` | `TOOL_QUALIFICATION_SEPARATE` | High Potential | Bounded loop runner.
- `ext-roo-code`: Roo Code CLI / VS Code extension | `AGENT_TOOL` | Apache-2.0 | `USAGE_VERIFIED` | `TOOL_QUALIFICATION_SEPARATE` | Medium Potential | Targeted refactoring.
- `engine-antigravity-subagents`: Antigravity Subagent Engine | `WORKFLOW` | System | `USAGE_VERIFIED` | `TOOL_QUALIFICATION_SEPARATE` | High Potential | Multi-agent execution core.

---

## 4. Historical Projects (`Partition D`)
- `proj-gravitas`: Autonomous Multi-Agent OS & Living HQ | `PROJECT_SPECIFIC_KNOWLEDGE` | MIT | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | K0-K5 runtime & D0-D4 HQ.
- `proj-ember-root`: Tactile focus journal & object-first UI | `PROJECT_SPECIFIC_KNOWLEDGE` | Proprietary | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | 4px grid, tactile physics, AA focus.
- `proj-o-travelz`: Tourism transit system & multi-platform UI | `PROJECT_SPECIFIC_KNOWLEDGE` | Proprietary | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Typographic hierarchy, hairline borders.
- `proj-hospitality-aama`: 3D dining spatial theatre & WebGL contract | `PROJECT_SPECIFIC_KNOWLEDGE` | Proprietary | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Zero-idle loop, high-mass physics.
- `proj-algoryxz`: Canonical theatre archive & WebGL performance | `PROJECT_SPECIFIC_KNOWLEDGE` | Proprietary | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Playwright QA, responsive matrix.
- `proj-sherlock`: Asynchronous OSINT network probe runner | `PROJECT_SPECIFIC_KNOWLEDGE` | MIT | `USAGE_VERIFIED` | `REFERENCE_ONLY` | Medium Potential | Headless CLI probing.
- `proj-sih2026`: Multi-criteria hackathon reality gating | `PROJECT_SPECIFIC_KNOWLEDGE` | Academic/Internal | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Trade-off matrices, reality gates.

---

## 5. Historical Gap Projects (`Partition E`)
- `gap-nemotron-cline`: Local model experiment with Cline | `OTHER` | Unknown | `UNRESOLVED` | `UNRESOLVED` | Unknown | Empty folder on disk.
- `gap-dsw-1`: Academic coursework & lab assignments | `OTHER` | Academic | `SOURCE_VERIFIED` | `REJECT` | Low Potential | Coursework assignments.
- `gap-mcsd`: Academic lab exercises & student notes | `OTHER` | Academic | `SOURCE_VERIFIED` | `REJECT` | Low Potential | Coursework exercises.
- `gap-iit-bbsr`: Temporary university research directory | `OTHER` | Academic | `SOURCE_VERIFIED` | `REJECT` | Low Potential | Empty tmp folder.
- `gap-new-folder`: Game fix DLL scratch directory | `OTHER` | Binary | `SOURCE_VERIFIED` | `REJECT` | Low Potential | Windows DLL binaries.

---

## 6. External Candidates (`Partition F`)
- `ext-vercel-agent-skills`: Curated web & Next.js agent skills | `SKILL` | Apache-2.0 | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | React/Next.js composition rules.
- `ext-awesome-design-md`: Curated collection of DESIGN.md files | `DESIGN_REFERENCE` | MIT | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | High Potential | Multi-site design corpus.
- `ext-taste-skill`: Visual taste & image-to-code heuristics | `SKILL` | MIT | `SOURCE_VERIFIED` | `ENTER_SA1` | High Potential | Visual taste heuristics.
- `ext-arena-skiIl`: Competitive multi-agent bracket concepts | `RESEARCH_SOURCE` | Non-Standard / Binary | `QUARANTINED` | `QUARANTINE` | Medium Potential (Concepts only) | Windows binary download quarantined.
- `ext-obscura`: Headless browser stealth crawler | `AGENT_TOOL` | MIT / Public | `SOURCE_VERIFIED` | `TOOL_QUALIFICATION_SEPARATE` | Medium Potential | Scraping/crawling engine.

---

## 7. Design & Component References (`Partition G`)
- `ref-21st-dev`: Tailwind/React component discovery | `COMPONENT_LIBRARY` | Varied Community | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | High Potential | Component inspiration.
- `ref-react-bits`: Motion, physics & interaction snippets | `MOTION_LIBRARY` | MIT | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | High Potential | Motion physics reference.
- `ref-skiper-ui`: Tactile UI micro-interaction references | `COMPONENT_LIBRARY` | Community | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Medium Potential | Micro-interactions.
- `ref-codrops`: Experimental web typography & interaction | `DESIGN_REFERENCE` | CC BY 4.0 | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | High Potential | Art direction.
- `ref-shadcn-ui`: Copy-paste accessible UI primitives | `COMPONENT_LIBRARY` | MIT | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Standard application primitives.
- `ref-radix-primitives`: Headless unstyled WAI-ARIA primitives | `COMPONENT_LIBRARY` | MIT | `USAGE_VERIFIED` | `ENTER_SA1` | High Potential | Accessibility primitives.
- `ref-anime-js`: JavaScript animation engine | `CODE_LIBRARY` | MIT | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Medium Potential | Motion engine.
- `ref-three-js`: WebGL 3D rendering library | `CODE_LIBRARY` | MIT | `USAGE_VERIFIED` | `REFERENCE_ONLY` | High Potential | Core 3D engine in Gravitas.
- `ref-three-ui`: Spatial 3D UI overlay concepts | `COMPONENT_LIBRARY` | MIT | `SOURCE_VERIFIED` | `REFERENCE_ONLY` | Medium Potential | 3D UI layouts.
