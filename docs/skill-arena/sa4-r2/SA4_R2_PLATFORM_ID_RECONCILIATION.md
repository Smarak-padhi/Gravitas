# GRAVITAS — SKILL ARENA SA4-R2: PLATFORM PROFILE ID RECONCILIATION

## 1. Canonical SA3 Baseline Source Truth
Inspection of the frozen machine artifact `docs/skill-arena/sa3/platform-profiles.json` establishes the indisputable canonical profile identifiers:
- **`PROFILE-PLAT-001`**: Android Native Platform Profile (Core: Android API 23+, AndroidX, Jetpack Lifecycle).
- **`PROFILE-PLAT-002`**: Apple iOS Platform Profile (Core: iOS 17+, SwiftUI, AppKit/UIKit).
- **`PROFILE-PLAT-003`**: Web & Next.js Ecosystem Profile (Core: HTML5, CSS3, DOM, React/Next.js).

## 2. Audit of SA4 and SA4-R Misattributions
During Phase SA4 and SA4-R, an inadvertent mapping inversion occurred:
- In `docs/skill-arena/sa4/bundle-manifests.jsonl` and `SA4_BENCHMARK_TASKS.md`, `PROFILE-PLAT-001` was mistakenly described as "Modern Web Frontend."
- In `docs/skill-arena/sa4-r/platform-profile-audit.json` and human dossiers, `PROFILE-PLAT-001` was listed as "Web Modern Frontend" and `PROFILE-PLAT-002` was called "Android Jetpack Compose."

## 3. Authoritative SA4-R2 Reconciliation
- **Immutability Principle**: Prior artifacts in `docs/skill-arena/sa4/` and `sa4-r/` remain frozen and are not modified in place.
- **Authoritative Mapping Locked in SA4-R2**:
  - `ANDROID_PROFILE_ID = PROFILE-PLAT-001`
  - `IOS_PROFILE_ID = PROFILE-PLAT-002`
  - `WEB_PROFILE_ID = PROFILE-PLAT-003`
- All prior conflicting references are cataloged as historical misattributions superseded by this document.

## 4. Benchmark B04 Scope Truth
- **Tested Fixture**: B04 evaluated responsive card layouts implemented in an HTML5/CSS3 web DOM fixture.
- **Classification**: **`MATERIAL_3_DESIGN_GUIDANCE_TESTED_ON_WEB_FIXTURE`**.
- **Native Platform Boundaries**:
  - `ANDROID_NATIVE_RUNTIME_TESTED = NO`
  - `IOS_NATIVE_RUNTIME_TESTED = NO`
  - `WEB_FIXTURE_TESTED = YES`
