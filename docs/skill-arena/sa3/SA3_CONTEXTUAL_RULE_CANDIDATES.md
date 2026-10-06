# SA3 Contextual Engineering Candidates

## 1. Contextual Boundary Rationale
Contextual Engineering Candidates represent best-practice engineering guidelines that are demonstrably valid and high-value within specific architectural layers or application scopes, but would introduce harm, compilation failures, or severe inefficiencies if applied globally.

Exactly **5 Contextual Engineering Candidates** were synthesized and audited.

---

## 2. Contextual Candidates Inventory

### CANON-CTX-001: Context-Bounded Abstraction & Test Seams
- **Candidate ID**: `CANON-CTX-001`
- **Candidate Type**: `CONTEXTUAL_ENGINEERING_CANDIDATE`
- **Statement**: Within internal business domains, avoid single-implementation speculative interfaces; at external system boundaries (network I/O, databases), isolate dependencies behind explicit test seams.
- **Source Rules**:
  - [`RULE-PONY-CORE-000001`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`ponytail` YAGNI abstraction ban)
  - [`RULE-PONY-CORE-000008`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`ponytail` no interface with one implementation)
- **Applies When**: Application services, domain layers, and external dependency integration boundaries.
- **Does Not Apply When**: Rapid throwaway spikes where unit test mocking is unnecessary.
- **Modality**: `RECOMMENDATION`
- **Scope**: `DOMAIN_AND_INTEGRATION_BOUNDARIES`
- **Known Conflicts Reconciled**: Reconciles Ponytail absolute anti-interface stance with Enterprise Clean Architecture requirements for mockable network/database seams.
- **Loss Audit**: `CONTEXT_FACTORIZATION` (preserves testing and anti-bloat constraints).

---

### CANON-CTX-002: Background Offloading for Heavy Payloads
- **Candidate ID**: `CANON-CTX-002`
- **Candidate Type**: `CONTEXTUAL_ENGINEERING_CANDIDATE`
- **Statement**: Offload heavy serialization, cryptographic hashing, and parsing of large payloads to cooperative background threads to prevent main-thread latency.
- **Source Rules**:
  - [`RULE-IOS-NET-000577`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`ios-networking` URLSession parsing offload)
  - [`RULE-IOS-PERF-000467`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`swiftui-performance` non-blocking UI runloops)
- **Applies When**: Client-side application runtimes processing large payloads (> 1MB) or complex JSON graphs.
- **Does Not Apply When**: Small payloads (< 10KB) where thread-hopping and context-switching overhead exceed parsing execution time.
- **Modality**: `REQUIREMENT`
- **Scope**: `CLIENT_PERFORMANCE`
- **Related Profiles**: `PROFILE-PLAT-002` (Apple iOS).
- **Loss Audit**: `CONTEXT_FACTORIZATION`.

---

### CANON-CTX-003: Compound UI Composition vs Boolean Flags
- **Candidate ID**: `CANON-CTX-003`
- **Candidate Type**: `CONTEXTUAL_ENGINEERING_CANDIDATE`
- **Statement**: In reusable component libraries, compose state and presentation using compound component patterns rather than multiplying boolean configuration flags.
- **Source Rules**:
  - [`RULE-VCL-000700`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`vercel-agent-skills` compound component layout)
  - [`RULE-SHAD-000704`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`shadcn-ui` primitives composition)
  - [`RULE-SHAD-000705`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`shadcn-ui` sub-component exposure)
- **Applies When**: Design systems and multi-tenant UI component libraries.
- **Does Not Apply When**: Simple non-reusable leaf components with binary states.
- **Modality**: `RECOMMENDATION`
- **Scope**: `UI_ARCHITECTURE`
- **Related Profiles**: `PROFILE-PLAT-003` (Web & Next.js), `PROFILE-DESIGN-004` (Headless Primitives).
- **Loss Audit**: `CONTEXT_FACTORIZATION`.

---

### CANON-CTX-004: Parameterized Data Query Enforcement
- **Candidate ID**: `CANON-CTX-004`
- **Candidate Type**: `CONTEXTUAL_ENGINEERING_CANDIDATE`
- **Statement**: Enforce parameterized query and selection statements in data access layers; strictly forbid dynamic string concatenation of untrusted input.
- **Source Rules**:
  - [`RULE-AND-SEC-000304`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`android-intent-security` SQL injection prevention)
- **Applies When**: All database, content provider, and persistence query construction.
- **Does Not Apply When**: Static, hardcoded constant query declarations with zero dynamic parameters.
- **Modality**: `REQUIREMENT`
- **Scope**: `DATA_SECURITY`
- **Related Profiles**: `PROFILE-PLAT-001` (Android Native).
- **Loss Audit**: `CONTEXT_FACTORIZATION`.

---

### CANON-CTX-005: MainActor View Model Isolation
- **Candidate ID**: `CANON-CTX-005`
- **Candidate Type**: `CONTEXTUAL_ENGINEERING_CANDIDATE`
- **Statement**: Isolate UI-bound observable stores and view models on the main actor/thread when observed by reactive view hierarchies.
- **Source Rules**:
  - [`RULE-IOS-CONC-000481`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`swift-concurrency` main actor binding)
  - [`RULE-IOS-PAT-000431`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`swiftui-patterns` observable state isolation)
- **Applies When**: Modern reactive declarative UI architectures (SwiftUI, Jetpack Compose).
- **Does Not Apply When**: Headless background workers, daemons, or CLI batch processing tools.
- **Modality**: `REQUIREMENT`
- **Scope**: `REACTIVE_UI_STATE`
- **Related Profiles**: `PROFILE-PLAT-002` (Apple iOS).
- **Version Sensitivity**: `SWIFT_6_AWARE`.
- **Loss Audit**: `CONTEXT_FACTORIZATION`.
