# GRAVITAS V1-A — CAPABILITY KNOWLEDGE COMPILATION & SELECTION

**PACKAGE:** `@gravitas/prompts/capabilities`  
**STATUS:** IMPLEMENTED & TESTED (16/16 Invariants Passed)  

---

## 1. Architecture: Provenance to Prompt

To prevent runtime prompt construction from loading hundreds of historical research files, SA3 and Impeccable outputs were compiled into structured TypeScript profiles:

```
Skill Arena (SA3) & Pinned Impeccable
                 │
                 ▼
     [ CapabilityRegistry ]
                 │
                 ▼
[ DeterministicCapabilityResolver ] ◄── Task Context (Role, Files, Directives, DESIGN.md)
                 │
                 ▼
[ Compiled Prompt Section + SHA-256 Digest ]
```

---

## 2. Compiled Profile Inventory

1. **`PROFILE-GLOB-001` (Global Software Engineering Discipline):**
   - Rules: Codebase reuse, standard library before dependencies, minimal abstraction (YAGNI), atomic independent verification.
   - Activation: Unconditional across all software engineering tasks.

2. **`PROFILE-PLAT-001` (Android Platform Engineering):**
   - Rules: Jetpack Compose adaptive window size classes, AndroidManifest export security.
   - Activation: Android platform targets, `.kt`/`.gradle` files, or Android keywords.

3. **`PROFILE-PLAT-002` (iOS / Apple Platform Engineering):**
   - Rules: Swift 6 structured concurrency and MainActor isolation, Keychain Services storage.
   - Activation: iOS platform targets, `.swift`/`.xcodeproj` files, or Apple keywords.

4. **`PROFILE-PLAT-003` (Web Platform Standards & DOM Hygiene):**
   - Rules: Safe DOM textContent rendering (no raw innerHTML), semantic HTML landmarks and ARIA live regions.
   - Activation: Web platform targets, `.html`/`.tsx`/`.css` files, or browser keywords.

5. **`PROFILE-DESIGN-IMPECCABLE` (Impeccable Design-Engineering Baseline):**
   - Rules: 14 core rules spanning AI slop anti-patterns, typography pacing, 8pt spacing scales, 4.5:1 WCAG contrast floor, 44px touch target floor, reduced motion, and focus visibility.
   - Activation: Frontend roles (`frontend-engineer`), UI file extensions, or styling keywords. Excluded from backend-only tasks!

---

## 3. Explainability Invariant

For every resolution, `DeterministicCapabilityResolver` outputs an `ActivationDecision` recording:
- `profileId` and `version`
- `activated: boolean`
- `reason`: Exact match criteria (or rejection rationale)
- `provenance`: Upstream SA3 or Git commit reference
