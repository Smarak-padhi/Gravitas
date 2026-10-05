# SA2-R Special Family Precision Audits

## 1. Special Audit: YAGNI vs Interfaces (Section 33)

### Scope & Rules
- Examines extreme minimalism (`ponytail` YAGNI: *"No unrequested abstractions: no interface with one implementation, no factory for one product, no config for a value that never changes"*) vs formal architecture / testing seams (*"Always define explicit interfaces for external services and dependency boundaries"*).

### Finding
- **Pattern D (Abstraction Level Separation)** completely reconciles this tension:
  - Ponytail's rule explicitly forbids *speculative internal abstractions* where only one implementation exists and no external seam is required.
  - Architectural seam rules mandate abstractions around *external system boundaries* (network I/O, databases, payment gateways, external processes) for test isolation.
- Within the audited conflict universe (7 edges involving Ponytail), Ponytail was actually paired with workflow commands or platform tools (e.g. `gsd-discuss-phase`, `ios-localization`, `android-intent-security`), all of which were pairing false positives (`INDEPENDENT`).
- Where abstraction-level differences appeared in other engineering pairs, they were reconciled to `COMPLEMENTARY` or `CONTEXT_VARIANT`.

---

## 2. Special Audit: Taste vs Liquid Glass (Section 34)

### Scope & Rules
- Minimalist, border-separated, non-skeuomorphic web design (`taste`: *"Avoid gradients, blur, decorative shadows, glassmorphism"*) vs Apple iOS 26+ translucent materials (`swiftui-liquid-glass`: *"Adopt GlassEffectContainer, interactive glass buttons, and morphing transitions"*).

### Finding
- **Pattern H (Aesthetic Grammar Separation)** applies:
  - These two design systems do not compete as universal imperatives.
  - They represent alternative, internally cohesive design grammars chosen per project profile:
    - Profile A: Minimalist / Brutalist / Information-Dense Web Application.
    - Profile B: Immersive / Native Apple Platform Liquid Glass UI.
  - Reconciled strictly to `CONTEXT_VARIANT`. Neither grammar is canonicalized or invalidated.

---

## 3. Special Audit: Ponytail vs Formal Workflows (Section 35)

### Scope & Rules
- Rapid, iterative, single-line shortcuts (`ponytail`: *"One line before fifty; stdlib before packages; do less"*) vs gated planning and verification lifecycles (`gsd-*`: *"Discuss phase -> Plan phase -> Execute phase -> Verify phase -> Milestone summary"*).

### Finding
- **Pattern I (Workflow Stage & Project Scale Separation)** applies:
  - Rapid prototyping, scratch scripts, and exploratory spikes benefit from Ponytail's minimal overhead.
  - Production releases, complex multi-phase systems, and team-coordinated codebases require GSD's formal verification contracts.
  - The apparent contradiction collapses once project scale and risk profile are specified (`CONTEXT_VARIANT`).

---

## 4. Special Audit: Accessibility Rules (Section 36)

### Scope & Rules
- 17 edges involving accessibility requirements from `ios-accessibility`, `radix-primitives`, and `edge-to-edge`.

### Finding
- **Zero Demotions**: No accessibility requirement was weakened or reduced to a stylistic preference.
- All 17 edges fell into two categories:
  1. *Checklist verification / Synergistic guidelines*: (e.g., `accessibilityReduceMotion` check + speakable label requirements) -> `COMPLEMENTARY`.
  2. *Lexical collisions on "focus"*: Android R8 report focus vs Radix modal dialog focus trap -> `INDEPENDENT`.
- Accessibility mandates retain their full normative strength without creating artificial conflicts with visual or performance guidance.

---

## 5. Special Audit: Security Rules (Section 37)

### Scope & Rules
- 191 edges involving security rules from `android-intent-security`, `android-restore-credentials`, `android-verified-email`, and `swift-security`.

### Finding
- Security rules were the largest single group of false conflicts due to `MODALITY_COLLAPSE`:
  - `android-intent-security` contained 36 internal edges where negative constraints (*"NEVER launch unverified nested intents"*) were paired with positive constraints (*"MUST set android:exported=false"*).
  - In reality, all of these rules are non-conflicting, mandatory components of Android's defense-in-depth security model.
  - All 36 same-source security edges were reclassified to `COMPLEMENTARY`.
  - Cross-platform security pairs (e.g. Android Keystore vs Apple App Store Privacy Manifest) were reclassified to `CONTEXT_VARIANT` (Platform Variant).

---

## 6. Special Audit: Version-Sensitive Rules (Section 38)

### Scope & Rules
- 346 edges involving version-sensitive rules or API-level specifications.

### Finding
- Reconciled 61 edges directly to `VERSION_VARIANT`.
- Examples include:
  - Android API Level 23 (hardware-backed keystore) vs API Level 34 (credential manager restore keys).
  - Android Navigation 2 (XML nav graphs) vs Navigation 3 (Compose scenes).
  - Android Play Billing Library PBL 6 vs PBL 7 migration rules.
  - Android Leanback TV UI vs Jetpack Compose for TV.
  - Swift 5 `@preconcurrency` imports vs Swift 6 strict concurrency data-race safety.
- Version distinctions were verified exclusively against frozen SA0/SA1 provenance without external web lookups.
