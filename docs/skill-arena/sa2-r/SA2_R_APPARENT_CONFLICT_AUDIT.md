# SA2-R Apparent Conflict Precision Audit

## 1. Audit Overview
- **Population**: Exactly 238 edges originally classified as `APPARENT_CONFLICT` in Phase SA2.
- **Coverage**: 100% (238 / 238 edges explicitly evaluated).
- **Sampling Used**: NONE. Full forensic enumeration.

## 2. Quantitative Audit Results

| Metric | Count | Percentage |
| :--- | :--- | :--- |
| **Input APPARENT_CONFLICT Edges** | 238 | 100.0% |
| **APPARENT_CONFLICT Confirmed** | 0 | 0.0% |
| **APPARENT_CONFLICT Reclassified** | 238 | 100.0% |
| **Promoted to TRUE_CONFLICT** | 0 | 0.0% |
| **Unresolved** | 0 | 0.0% |

## 3. Reclassification Destination Breakdown

| New Classification | Count | Primary Rationale |
| :--- | :--- | :--- |
| **`CONTEXT_VARIANT`** | 125 | Clear contextual segregation (different GSD stages or Android vs iOS). |
| **`INDEPENDENT`** | 54 | Complete absence of semantic or operational intersection (pairing false positives). |
| **`COMPLEMENTARY`** | 37 | Distinct guidelines that reinforce the same architectural outcome without tension. |
| **`VERSION_VARIANT`** | 21 | Version and API generation boundaries explain all differences cleanly. |
| **`SEMANTIC_EQUIVALENT`** | 1 | Syntactic paraphrase expressing identical rule (`EDGE-000284`: Swift Concurrency vs SwiftUI Patterns MainActor isolation). |

## 4. Key Reclassification Findings

### Case A: Semantic Identity Misclassified as Apparent Conflict (EDGE-000284)
- **Rule A** (`swift-concurrency`): `@Observable classes should be @MainActor for view models.`
- **Rule B** (`swiftui-patterns`): `Important: Isolate UI-bound @Observable stores and view models on @MainActor when SwiftUI views observe them.`
- **SA2 Error**: Scout saw slightly different contextual qualifiers and assigned `APPARENT_CONFLICT`.
- **Reconciliation**: Both rules teach the exact same Swift concurrency architectural mandate. Reclassified to `SEMANTIC_EQUIVALENT`.

### Case B: Superficial Keyword Clashes (e.g. EDGE-000343)
- **Rule A** (`android-r8-analyzer`): `Focus: : Omit sections (for example, Subsumed Rules, Configuration) if no issues or items found.`
- **Rule B** (`radix-primitives`): `Interactive modal dialogs must trap focus within the container while mounted and open.`
- **SA2 Error**: Lexical overlap on the polysemous word "focus" paired an Android build-analyzer reporting rule with a Web accessibility keyboard-focus rule.
- **Reconciliation**: Zero shared decision space. Reclassified to `INDEPENDENT`.

### Case C: General vs Specific Performance Guidelines (EDGE-000288)
- **Rule A** (`ios-networking`): `DON'T: Decode JSON on the main thread for large payloads.`
- **Rule B** (`swiftui-performance`): `Blocking MainActor with synchronous I/O.: File reads, JSON parsing of large payloads, and image decompression must run on cooperative background tasks.`
- **SA2 Error**: Classified as tension between networking and UI performance.
- **Reconciliation**: Rule B is the architectural principle; Rule A is its networking-specific application. Both mandate keeping heavy JSON decoding off the main thread. Reclassified to `COMPLEMENTARY`.
