# SA2 Context & Version Families

## 1. Context Families (43 Pairs)
Rules that appear to disagree or provide distinct instructions due to differing operating environments:
- **Mobile vs Desktop Windowing**:
  - Android `RULE-AND-ADAPT-000248` (Window size classes & navigation rails for foldables/tablets) vs Desktop Electron lifecycle (`RULE-IOS-BG-000670`).
  - *Context Distinction*: Touch-driven dynamic screen reflow vs multi-window desktop supervisor process models.
- **Dense Operational Tool vs Consumer Editorial**:
  - Hairline dividers and high information density (`RULE-TASTE-000704`) vs spacious generous whitespace in consumer apps (`RULE-AND-STYLE-000235`).
  - *Context Distinction*: Dashboard / IDE telemetry vs marketing landing pages.

---

## 2. Version Families (7 Pairs)
Rules whose divergence is driven by framework evolution:
- **Jetpack Compose Navigation**: Stable Nav Compose (`RULE-AND-E2E-000222`) vs experimental Jetpack Navigation 3 backstack scenes (`RULE-AND-CAM-000350`).
- **Swift Concurrency**: Swift 5 `@preconcurrency` / completion handlers vs Swift 6 strict concurrency (`Sendable`, actor isolation in `RULE-IOS-CONC-000540`).
- *Resolution Guideline for SA3*: Document version prerequisites explicitly; do not treat older stable guidance as defective.
