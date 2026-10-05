# SA2 Relationship Summary & Corpus Graph

## 1. Graph Statistics
The machine-readable relationship graph is stored in [`docs/skill-arena/sa2/relationships.jsonl`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa2/relationships.jsonl).

```
============================================================
SA2 RELATIONSHIP EDGES
============================================================
TOTAL_EVALUATED_PAIRS                 = 1323
TOTAL_MEANINGFUL_RELATIONSHIPS        = 1009
INDEPENDENT_REVIEWED_PAIRS            = 314

RELATIONSHIP BREAKDOWN:
- EXACT_EQUIVALENT                    = 35
- SEMANTIC_EQUIVALENT                 = 17
- PARTIAL_OVERLAP                     = 18
- COMPLEMENTARY                       = 222
- CONTEXT_VARIANT                     = 43
- VERSION_VARIANT                     = 7
- TRUE_CONFLICT                       = 429
- APPARENT_CONFLICT                   = 238
- UNRESOLVED                          = 0
============================================================
```

---

## 2. Key Observations
1. **Exact & Semantic Equivalences (52 pairs)**:
   - 35 exact duplicates stem from shared GSD Copilot question wrappers and identical prompt flags.
   - 17 semantic equivalences represent identical directives across different wording (e.g., focus ring visibility requirements across Android and iOS guidelines).
2. **Complementary Guidelines (222 pairs)**:
   - Guidelines in the same domain that address different stages of development (e.g., edge-to-edge planning vs IME padding application).
3. **Contextual & Version Variants (50 pairs)**:
   - 43 context variants capture differing rules between iOS and Android or Web and Native.
   - 7 version variants capture evolution from legacy to modern Jetpack Navigation and Swift strict concurrency.
4. **Conflicts (667 pairs)**:
   - 238 apparent conflicts reconcile cleanly once context (web vs native glass) or workflow stage (rapid task vs system phase) is recognized.
   - 429 true conflicts represent genuine philosophical or architectural trade-offs (e.g., strict YAGNI minimalism forbidding abstractions vs structured enterprise scaffolding requiring interfaces and factories).
