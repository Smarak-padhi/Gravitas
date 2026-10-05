# SA2-R Reclassification Summary

## 1. Executive Summary

Phase SA2-R audited 100% of the 667 conflict-like relationships produced by Phase SA2 (429 `TRUE_CONFLICT`, 238 `APPARENT_CONFLICT`).

Under strict falsification against locked Conditions A through F and Patterns A through J, **0 edges satisfied the criteria for TRUE_CONFLICT** and **0 edges retained unresolved tension for APPARENT_CONFLICT**. All 667 edges were reclassified to their true semantic relationships based on provenance evidence.

The effective relationship graph retains **exactly 1,009 active edges**, maintaining parity with Phase SA2 while eliminating artificial conflict noise.

---

## 2. Reclassification Migration Matrix

| Original SA2 Class | Count | Reclassified To | Reclassified Count | Primary Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **`TRUE_CONFLICT`** | 429 | `CONTEXT_VARIANT` | 204 | Platform / GSD lifecycle stage separation |
| | | `COMPLEMENTARY` | 107 | Intra-skill cohesive standards (e.g. security) |
| | | `INDEPENDENT` | 76 | Pairing false positives / lexical collisions |
| | | `VERSION_VARIANT` | 40 | Framework / API generation disparities |
| | | `SEMANTIC_EQUIVALENT` | 2 | Opposing polarity expressing same practice |
| **`APPARENT_CONFLICT`** | 238 | `CONTEXT_VARIANT` | 125 | Platform / GSD lifecycle stage separation |
| | | `INDEPENDENT` | 54 | Polysemous keyword clashes |
| | | `COMPLEMENTARY` | 37 | General vs specific performance / architecture |
| | | `VERSION_VARIANT` | 21 | Version boundaries resolving apparent tension |
| | | `SEMANTIC_EQUIVALENT` | 1 | Syntactic paraphrase expressing identical rule |
| **TOTAL** | **667** | | **667** | **100% Reclassified** |

---

## 3. Active Relationship Graph: Before vs After

| Relationship Class | Original SA2 Count | SA2-R Net Change | Effective SA2-R Count | Percentage of Graph |
| :--- | :--- | :--- | :--- | :--- |
| **`EXACT_EQUIVALENT`** | 35 | +0 | 35 | 3.5% |
| **`SEMANTIC_EQUIVALENT`** | 17 | +3 | 20 | 2.0% |
| **`PARTIAL_OVERLAP`** | 18 | +0 | 18 | 1.8% |
| **`COMPLEMENTARY`** | 222 | +144 | 366 | 36.3% |
| **`CONTEXT_VARIANT`** | 43 | +329 | 372 | 36.9% |
| **`VERSION_VARIANT`** | 7 | +61 | 68 | 6.7% |
| **`INDEPENDENT`** | 0 (active) | +130 | 130 | 12.9% |
| **`TRUE_CONFLICT`** | 429 | -429 | **0** | **0.0%** |
| **`APPARENT_CONFLICT`** | 238 | -238 | **0** | **0.0%** |
| **`UNRESOLVED`** | 0 | +0 | 0 | 0.0% |
| **TOTAL ACTIVE EDGES** | **1,009** | **0** | **1,009** | **100.0%** |

---

## 4. Key Reclassification Statistics
- **Conflict Reduction**: 667 conflict-like edges -> 0 (100% eliminated through contextual, version, and architectural precision).
- **Dominant Relationships in Reconciled Corpus**:
  1. `CONTEXT_VARIANT`: 372 edges (36.9%) — Reflects multi-platform and multi-stage nature of tools.
  2. `COMPLEMENTARY`: 366 edges (36.3%) — Reflects high degree of synergy across guidelines within each engineering domain.
  3. `INDEPENDENT`: 130 edges (12.9%) — Purged false-positive candidate pairings.
