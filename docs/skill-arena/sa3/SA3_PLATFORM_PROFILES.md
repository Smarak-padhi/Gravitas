# SA3 Platform Profiles Dossier

## 1. Platform Isolation Architecture
Platform Profiles capture platform-bound idiom, compiler constraints, runtime concurrency guarantees, and system API conventions. Rules bound to an operating system or compiler toolchain cannot be generalized without introducing syntax errors or runtime panics on other platforms.

SA3 defines **3 Platform Profiles**:

---

## 2. Profile Definitions

### PROFILE-PLAT-001: Android Native Platform Profile
- **Profile ID**: `PROFILE-PLAT-001`
- **Name**: Android Native Platform Profile
- **Member Rules**: **188 rules**
- **Target OS / Runtime**: Android SDK (API Levels 24 through 35+), Android Runtime (ART), Jetpack Ecosystem.
- **Key Subsystems Covered**:
  - Jetpack Compose & Compose Material 3 UI.
  - CameraX capture pipelines and hardware sensor abstractions.
  - Intent security, PendingIntent mutability flags, and Component Export safety.
  - Room SQLite parameterized persistence.
  - Play Billing Library lifecycle management.
  - BackupAgent and CredentialManager Restore Keys.
  - R8 code shrinking and ProGuard keep rule hygiene.
- **Primary Tooling**: Android Studio, Gradle (AGP 8.x/9.x), Kotlin 1.9/2.0.

---

### PROFILE-PLAT-002: Apple iOS & Darwin Platform Profile
- **Profile ID**: `PROFILE-PLAT-002`
- **Name**: Apple iOS Platform Profile
- **Member Rules**: **185 rules**
- **Target OS / Runtime**: iOS 16 through iOS 26+, iPadOS, macOS, visionOS, Darwin runtime.
- **Key Subsystems Covered**:
  - SwiftUI declarative view composition and layout algorithms.
  - Swift 6 strict concurrency, actor isolation, and Sendable verification.
  - URLSession networking, async streams, and background transfer services.
  - MapKit / CoreLocation geographic coordinate querying.
  - MetricKit async production performance telemetry collection.
  - Apple Push Notification service (APNs) token registration and authorization.
  - Accessibility (VoiceOver, Dynamic Type, custom rotors).
  - Memory graph analysis and Instruments retain-cycle triage.
- **Primary Tooling**: Xcode, LLDB, Swift Package Manager, Instruments.

---

### PROFILE-PLAT-003: Web & Next.js Ecosystem Profile
- **Profile ID**: `PROFILE-PLAT-003`
- **Name**: Web & Next.js Ecosystem Profile
- **Member Rules**: **17 rules**
- **Target OS / Runtime**: Modern ECMAScript/TypeScript runtimes, V8/SpiderMonkey/JSC, Web Standards (DOM, WAI-ARIA), Next.js App Router.
- **Key Subsystems Covered**:
  - React Server Components (RSC) and Client Component boundaries.
  - Next.js server actions and cache invalidation protocols.
  - Tailwind CSS utility layout configurations.
  - Radix UI accessible headless primitives.
  - Edge runtime latency optimization.
- **Primary Tooling**: Node.js, Next.js, TypeScript, pnpm/npm.
