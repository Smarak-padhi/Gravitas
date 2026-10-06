# SA3 Version Families Dossier

## 1. Version-Family Architectural Rationale
Framework APIs, language semantics, and compiler toolchains undergo breaking evolutions across major releases. Treating rules from disparate major versions as universal truths creates compiler errors or forces legacy patterns upon modern projects.

Version Families group mutually incompatible or evolving API patterns across explicit generational boundaries, allowing agents and developers to select the precise pattern matching their project's toolchain version.

SA3 identifies **6 Version Families**:

---

## 2. Version Families Catalog

### VERSION-FAMILY-001: Android Navigation Architecture
- **Family ID**: `VERSION-FAMILY-001`
- **Topic**: Android Navigation Architecture
- **Platform / Framework**: Android / Jetpack Navigation
- **Version Range**: Navigation 2.x (XML Backstack) $\rightarrow$ Navigation 3.x (Compose Scenes)
- **Generational Variants**:
  - `LEGACY_V2`: XML-based navigation graphs, `NavHostFragment`, and `FragmentNavigator` backstack management.
  - `MODERN_V3`: Type-safe Scene composables, multi-pane list-detail scenes, and ViewModel scoping.
- **Member Rules**: 1 rule (`RULE-AND-ADAPT-000245`).

---

### VERSION-FAMILY-002: Android Gradle Plugin (AGP) Build Architecture
- **Family ID**: `VERSION-FAMILY-002`
- **Topic**: Android Gradle Plugin Build Architecture
- **Platform / Framework**: Android / Android Gradle Plugin
- **Version Range**: AGP 8.x $\rightarrow$ AGP 9.0
- **Generational Variants**:
  - `AGP_8`: Traditional Transform API and legacy R8 configuration flags.
  - `AGP_9`: Modern Artifact API, strict Java 17/21 toolchain enforcement, and modernized R8 keep rule consumer models.

---

### VERSION-FAMILY-003: Google Play Billing Library Protocol
- **Family ID**: `VERSION-FAMILY-003`
- **Topic**: Google Play Billing Library Protocol
- **Platform / Framework**: Android / Play Billing Library (PBL)
- **Version Range**: PBL 5.x / 6.x $\rightarrow$ PBL 7.x
- **Generational Variants**:
  - `PBL_6`: Legacy `BillingClient.queryPurchasesAsync` and `SkuDetails` data structures.
  - `PBL_7`: `ProductDetails`, multi-offer subscription tokens, and strict lifecycle connection retry policies.

---

### VERSION-FAMILY-004: Android TV User Interface Toolkit
- **Family ID**: `VERSION-FAMILY-004`
- **Topic**: Android TV User Interface Toolkit
- **Platform / Framework**: Android / `androidx.tv` & Leanback
- **Version Range**: Leanback Support Fragments $\rightarrow$ Jetpack Compose for TV
- **Generational Variants**:
  - `LEANBACK`: Legacy `BrowseSupportFragment`, `Presenter`, `ArrayObjectAdapter`, and TV XML Views.
  - `COMPOSE_TV`: `androidx.tv.material3`, `TransformingLazyColumn`, and TV `focusRestorer` APIs.

---

### VERSION-FAMILY-005: Swift Concurrency & Data-Race Safety
- **Family ID**: `VERSION-FAMILY-005`
- **Topic**: Swift Concurrency & Data-Race Safety
- **Platform / Framework**: Apple / Swift Language Runtime
- **Version Range**: Swift 5.9 (`@preconcurrency`) $\rightarrow$ Swift 6 (Strict Concurrency)
- **Generational Variants**:
  - `SWIFT_5`: Approachable concurrency with `@preconcurrency` opt-outs and unchecked `@unchecked Sendable`.
  - `SWIFT_6`: Default `@MainActor` isolation, complete Sendable verification, and `nonisolated(nonsending)` task mechanics.

---

### VERSION-FAMILY-006: Apple Material & Depth Translucency
- **Family ID**: `VERSION-FAMILY-006`
- **Topic**: Apple Material & Depth Translucency
- **Platform / Framework**: Apple / SwiftUI
- **Version Range**: iOS 15–17 (Material blurs) $\rightarrow$ iOS 26+ (Liquid Glass)
- **Generational Variants**:
  - `MATERIAL_BLUR`: Static `.background(.ultraThinMaterial)` translucent styling.
  - `LIQUID_GLASS`: Interactive `GlassEffectContainer`, morphing glass transitions, and glass toolbar styles.
- **Member Rules**: 1 rule (`RULE-IOS-GLASS-000454`).
