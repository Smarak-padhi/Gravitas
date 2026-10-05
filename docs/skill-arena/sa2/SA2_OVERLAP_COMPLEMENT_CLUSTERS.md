# SA2 Overlap & Complementary Clusters

## 1. Overlap Clusters (18 Pairs)
Overlap occurs where rules share conceptual domains but apply to distinct frameworks:
- **State Restoration & Credential Handling**: `RULE-AND-REST-000397` (Android Restore Credentials) overlaps with `RULE-IOS-AUTH-000650` (iOS AuthenticationServices). Both govern silent credential restoration, but bind to platform-specific APIs.
- **Background Task Execution**: `RULE-AND-APPF-000365` (Android AppFunctions) overlaps with `RULE-IOS-BG-000665` (iOS BGTaskScheduler). Both define background processing windows and limits.

---

## 2. Complementary Clusters (222 Pairs)
Complementary relationships occur where two rules from the same framework reinforce each other without conflict:
- **Android Edge-to-Edge Pipeline**: Insets planning (`RULE-AND-E2E-000220`), status bar padding (`RULE-AND-E2E-000225`), and IME keyboard padding (`RULE-AND-E2E-000228`) form a sequential, mutually reinforcing pipeline.
- **SwiftUI View Architecture**: Model-View separation (`RULE-IOS-PAT-000495`), `@Observable` state ownership (`RULE-IOS-PAT-000500`), and isolated previews (`RULE-IOS-PAT-000508`) combine into a complete architecture guide.
