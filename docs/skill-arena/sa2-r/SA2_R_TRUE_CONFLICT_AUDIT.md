# SA2-R True Conflict Precision Audit

## 1. Audit Overview
- **Population**: Exactly 429 edges originally classified as `TRUE_CONFLICT` in Phase SA2.
- **Coverage**: 100% (429 / 429 edges explicitly evaluated by `CONFLICT_FALSIFIER` and `CONTEXT_RECONCILER`).
- **Sampling Used**: NONE. Full forensic enumeration.

## 2. Quantitative Audit Results

| Metric | Count | Percentage |
| :--- | :--- | :--- |
| **Input TRUE_CONFLICT Edges** | 429 | 100.0% |
| **TRUE_CONFLICT Confirmed** | 0 | 0.0% |
| **TRUE_CONFLICT Reclassified** | 429 | 100.0% |
| **TRUE_CONFLICT Unresolved** | 0 | 0.0% |
| **Precision Estimate (`Confirmed / 429`)** | **0.0000** | **0.0%** |

## 3. Reclassification Destination Breakdown

| New Classification | Count | Primary Rationale |
| :--- | :--- | :--- |
| **`CONTEXT_VARIANT`** | 204 | Platform separation (Android vs iOS vs Web) and GSD workflow stage separation (Discuss vs Plan vs Execute vs Forensics). |
| **`COMPLEMENTARY`** | 107 | Intra-skill guidelines reinforcing each other (e.g. Android intent security rules, Android adaptive layout rules, Swift testing isolation). |
| **`INDEPENDENT`** | 76 | Polysemous lexical collisions or false pairing across unrelated domains (e.g. Graphify scan path vs GSD milestone completion). |
| **`VERSION_VARIANT`** | 40 | Framework generation disparities (AGP 8 vs 9, Navigation 2 vs 3, Leanback vs Compose TV, PBL 6 vs 7). |
| **`SEMANTIC_EQUIVALENT`** | 2 | Opposing polarity expressing identical safe practice (e.g. ContentProvider query parameterization; MapKit geocoding checklist). |

## 4. Key Falsification Findings

### Case A: Opposing Polarity of the Same Practice (e.g. EDGE-000770)
- **Rule A** (`android-intent-security`): `NEVER: use dynamic string concatenation to construct selection blocks inside a ContentProvider query...`
- **Rule B** (`android-intent-security`): `MUST: enforce parameterized selection structures in ContentProvider query/update methods.`
- **SA2 Error**: Scout saw "NEVER" vs "MUST" and labeled it `TRUE_CONFLICT`.
- **Falsification**: Both rules mandate the exact same security practice. Complying with one is complying with the other. Reclassified to `SEMANTIC_EQUIVALENT`.

### Case B: Multi-Faceted Security Standards within One Subsystem (e.g. EDGE-000739)
- **Rule A** (`android-intent-security`): `NEVER: launch a nested Intent received from an untrusted source without verifying its target...`
- **Rule B** (`android-intent-security`): `MUST: explicitly set android:exported="false" for all components that don't need external interaction...`
- **SA2 Error**: Modality opposition flag treated two independent security requirements as mutually exclusive.
- **Falsification**: An application must do both. Following Rule A does not prevent Rule B. Reclassified to `COMPLEMENTARY`.

### Case C: Cross-Platform Independence (e.g. EDGE-000215)
- **Rule A** (`android-restore-credentials`): `If app data backup and restore is enabled, get the restore key immediately after...`
- **Rule B** (`app-store-review`): `MUST: include PrivacyInfo.xcprivacy with valid required-reason APIs...`
- **SA2 Error**: Pair was formed on generic security tokens; scout flagged modality opposition.
- **Falsification**: One rule governs Android local backup credential callbacks; the other governs Apple iOS App Store submission privacy declarations. Reclassified to `CONTEXT_VARIANT` (Platform Variant).
