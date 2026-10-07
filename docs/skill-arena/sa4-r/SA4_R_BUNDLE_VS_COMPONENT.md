# GRAVITAS — SKILL ARENA SA4-R: BUNDLE VS COMPONENT ISOLATION AUDIT

## 1. Distinguishing Bundles from Individual Rules
A key requirement of SA4-R is to determine whether conclusions apply to entire capability bundles or to individual rules.

## 2. Forensic Classification of Tested Objects
1. **Individually Isolated Components**:
   - `PROFILE-DESIGN-001`: Proven via B01 ablation (R17) and cross-domain comparisons.
   - `PROFILE-DESIGN-002`: Proven via B02 crossover (R19) and dense layout evaluations.
   - `CANON-CTX-001`: Proven via B07 ablation (R18).
2. **Bundle-Level Supported Objects**:
   - `CANON-GLOB-001` through `CANON-GLOB-004`: Tested together in all 8 benchmarks. Their collective presence is validated across all domains, but individual single-rule contributions were not isolated.
   - `CANON-CTX-002` through `CANON-CTX-007`: Validated within their respective context benchmarks as parts of contextual bundles.
   - `PROFILE-PLAT-001` and `PROFILE-WORK-001`: Validated at bundle level in B04 and B08.
3. **Untested Objects**:
   - Specialists (5 rules: SPEC-001..005): Untested in SA4.
   - Version Families (6 families: VFAM-001..006): Untested in SA4.
   - Technical Holds (3 rules: HOLD-001..003): Quarantined and untested.

## 3. Claim Limitation
Claims of universal efficacy for individual global rules must be stated as **`VALIDATED_AT_BUNDLE_LEVEL`**, reserving isolated claims for ablated components.
