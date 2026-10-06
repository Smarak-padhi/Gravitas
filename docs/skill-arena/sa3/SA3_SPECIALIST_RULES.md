# SA3 Specialist Rules & Retained Guidance

## 1. Specialist Rule Governance
Specialist rules represent highly targeted engineering capabilities that address deep vertical hardware interfaces, specialized operating system subsystems, or standalone optimization passes. They cannot be merged into broader profiles or global rules without losing critical domain constraints.

In SA3, specialist capabilities are organized into:
1. **5 Proposed Specialist Canonical Candidates** (`CANON-SPEC-001` through `005`).
2. **4 Retained Standalone Specialist Rules** (`RETAIN-RULE-PONY-*`).

---

## 2. Proposed Specialist Canonical Candidates

### CANON-SPEC-001: CameraX Hardware Feature Parity Fallbacks
- **Candidate ID**: `CANON-SPEC-001`
- **Candidate Type**: `SPECIALIST_RULE_CANDIDATE`
- **Statement**: In Android CameraX capture pipelines, handle hardware-dependent feature parity fallbacks explicitly (auto-focus and flash variations across physical sensors).
- **Source Rule**: [`RULE-AND-CAM-000352`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`android-camerax`)
- **Applies When**: Android native camera capture integration.
- **Does Not Apply When**: Standard system photo picker integrations.
- **Modality**: `REQUIREMENT`
- **Scope**: `CAMERA_HARDWARE_INTEGRATION`
- **Loss Audit**: `CONTEXT_FACTORIZATION`.

---

### CANON-SPEC-002: MetricKit Async Diagnostic Telemetry Buffering
- **Candidate ID**: `CANON-SPEC-002`
- **Candidate Type**: `SPECIALIST_RULE_CANDIDATE`
- **Statement**: Collect production iOS performance telemetry using MetricKit async diagnostic payload subscribers, buffering metrics across system report deliveries.
- **Source Rule**: [`RULE-IOS-MET-000587`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`metrickit`)
- **Applies When**: Production iOS telemetry and diagnostic reporting infrastructure.
- **Does Not Apply When**: Local development builds or simulator testing environments.
- **Modality**: `RECOMMENDATION`
- **Scope**: `IOS_DIAGNOSTICS`
- **Loss Audit**: `CONTEXT_FACTORIZATION`.

---

### CANON-SPEC-003: Graceful Fallbacks in Geocoding Workflows
- **Candidate ID**: `CANON-SPEC-003`
- **Candidate Type**: `SPECIALIST_RULE_CANDIDATE`
- **Statement**: In geocoding and reverse geocoding workflows, gracefully handle empty results, network timeouts, and rate limits without throwing unhandled exceptions.
- **Source Rule**: [`RULE-IOS-MAP-000650`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`mapkit`)
- **Applies When**: MapKit / CoreLocation geographic query workflows.
- **Does Not Apply When**: Static offline coordinate projections.
- **Modality**: `REQUIREMENT`
- **Scope**: `LOCATION_SERVICES`
- **Loss Audit**: `CONTEXT_FACTORIZATION`.

---

### CANON-SPEC-004: APNs Explicit User Notification Authorization
- **Candidate ID**: `CANON-SPEC-004`
- **Candidate Type**: `SPECIALIST_RULE_CANDIDATE`
- **Statement**: In APNs push notification implementations, request user alert/sound authorization before attempting device token registration callback handling.
- **Source Rule**: [`RULE-IOS-PUSH-000653`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`push-notifications`)
- **Applies When**: iOS push notification infrastructure setup.
- **Does Not Apply When**: Local notification scheduling that requires no remote APNs token.
- **Modality**: `REQUIREMENT`
- **Scope**: `REMOTE_NOTIFICATIONS`
- **Loss Audit**: `CONTEXT_FACTORIZATION`.

---

### CANON-SPEC-005: Android BackupAgent Restore Key Lifecycle
- **Candidate ID**: `CANON-SPEC-005`
- **Candidate Type**: `SPECIALIST_RULE_CANDIDATE`
- **Statement**: When implementing Android BackupAgent credential restore keys, complete credential retrieval inside onRestoreFinished callback rather than onRestore.
- **Source Rule**: [`RULE-AND-REST-000389`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`android-restore-credentials`)
- **Applies When**: Android CredentialManager Restore Key integration with cloud backup.
- **Does Not Apply When**: Standard interactive user login flows.
- **Modality**: `REQUIREMENT`
- **Scope**: `ANDROID_RESTORE_CREDENTIALS`
- **Loss Audit**: `CONTEXT_FACTORIZATION`.

---

## 3. Retained Standalone Specialist Rules

Four rules from the `ponytail` capability suite were identified as high-value specialized workflows that must be preserved as standalone tools rather than blended into broader synthesis:
1. `RULE-PONY-CORE-000006` (`RETAIN-RULE-PONY-CORE-000006`): "Can it be one line?: One line." — Retained as an optional brevity code-golfing heuristic; prohibited from leaking into general coding standards.
2. `RULE-PONY-AUDIT-000010` (`RETAIN-RULE-PONY-AUDIT-000010`): Whole-repo audit for over-engineering — Retained as an offline refactoring inspection tool.
3. `RULE-PONY-DEBT-000011` (`RETAIN-RULE-PONY-DEBT-000011`): Harvest `ponytail:` comments into a debt ledger — Retained as a technical debt tracking utility.
4. `RULE-PONY-REV-000012` (`RETAIN-RULE-PONY-REV-000012`): Code review focused exclusively on over-engineering — Retained as a pull-request review lens.
