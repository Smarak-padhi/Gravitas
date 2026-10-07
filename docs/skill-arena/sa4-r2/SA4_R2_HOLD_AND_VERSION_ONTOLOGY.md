# GRAVITAS — SKILL ARENA SA4-R2: TECHNICAL HOLD & VERSION FAMILY ONTOLOGY

## 1. Technical Verification Holds Ontology
In SA4-R human reports, `HOLD-001..003` were occasionally described casually as "3 rules."
Forensic examination of `docs/skill-arena/sa3/technical-verification-holds.json` clarifies the exact ontology:
- **`TECHNICAL_HOLD_OBJECTS`**: Exactly **3** candidate hold objects:
  1. `HOLD-001`: Android Display Glasses Glimmer XR (`sourceRuleIds: []`)
  2. `HOLD-002`: R8 Configuration Analyzer Internal Protobuf (`sourceRuleIds: ["RULE-AND-R8-000317"]`)
  3. `HOLD-003`: Jetpack Media3 Cast RemoteCastPlayer (`sourceRuleIds: []`)
- **`TECHNICAL_HOLD_PRIMARY_ATOMIC_RULES`**: Exactly **1** primary atomic rule from SA1 (`RULE-AND-R8-000317`).
- **Leakage & Resolution**: `TECHNICAL_HOLD_LEAKAGE = 0`, `TECHNICAL_HOLDS_RESOLVED = 0`. All 3 objects remained quarantined.

## 2. Version Families Ontology
Similarly, version families represent multi-generation architectural migration structures, not simple atomic rules:
- **`VERSION_FAMILY_OBJECTS`**: Exactly **6** version family objects (`VERSION-FAMILY-001` through `VERSION-FAMILY-006`).
- **`VERSION_FAMILY_PRIMARY_RULES`**: Exactly **2** primary atomic rules from SA1:
  - `RULE-AND-ADAPT-000245` under `VERSION-FAMILY-001` (Android Navigation Architecture)
  - `RULE-IOS-GLASS-000454` under `VERSION-FAMILY-006` (iOS SwiftUI Liquid Glass Adoption)
- All 6 version family objects remained untested in SA4 (`OUT_OF_SCOPE_UNTESTED`).
