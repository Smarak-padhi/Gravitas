# SA2 Scope Lock & Authoritative Ingestion Perimeter

## Status: LOCKED & AUTHORIZED
- Wave: SA2 Independent Semantic Duplicate, Overlap & Conflict Arena
- Governing Spec: `docs/architecture-v2/SKILL_ARENA_PROGRAM.md`
- Pre-SA2 Baseline Commit: `867252a559868f0cb6ee52668582d2f7fb5f7fe0`

---

## 1. Corpus Truth & Input Invariants
- Pre-SA2 Verified Rule Count: **708 RuleCandidates**
- Unique Rule IDs: **708**
- Input Corpus File: [`docs/skill-arena/sa1/rules.jsonl`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl)
- Provenance Graph: [`docs/skill-arena/sa1/provenance.json`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/provenance.json)

## 2. Invariants Strictly Preserved
- **SEMANTIC_EQUIVALENCE != CANONICALIZATION**: Identifying semantic duplicates does NOT merge or delete either rule candidate.
- **TRUE_CONFLICT != RESOLUTION**: Recording direct contradictions preserves both opposing directives; neither rule is eliminated or averaged.
- **AESTHETIC_PREFERENCE != ENGINEERING_REQUIREMENT**: Style choices (taste heuristics) are explicitly marked contextual variants and prevented from overriding universal engineering constraints.
- **ZERO_MUTATION**: The SA1 corpus of 708 rules remains 100% frozen and unmodified.
