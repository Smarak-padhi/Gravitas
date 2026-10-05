# SA2 Scout & Critic Protocols

## 1. Scout Roles & Protocol
Candidate pairs were evaluated across four distinct analytical perspectives:
- **`DUPLICATION_SCOUT`**: Evaluates verbatim phrasing, token similarity, and scope compatibility to identify exact and semantic equivalence.
- **`CONFLICT_SCOUT`**: Evaluates opposing modalities (`MUST` vs `AVOID`, `PREFER` vs `MUST_NOT`) and analyzes whether context overlap creates a true contradiction or an apparent conflict.
- **`CONTEXT_SCOUT`**: Evaluates platform boundaries (`ANDROID` vs `IOS`), viewport requirements, and product categories (editorial vs operational).
- **`VERSION_SCOUT`**: Evaluates API generations (Jetpack Navigation 3 vs Nav Compose, Swift 6 vs Swift 5, Next.js App Router vs Pages Router).

Assessments are stored in [`docs/skill-arena/sa2/scout-assessments.jsonl`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa2/scout-assessments.jsonl).

---

## 2. Critic Round & Protocol
Every scout assessment was reviewed by an independent **`SEMANTIC_CRITIC`**:
- Checks for overclaimed equivalence across incompatible modalities.
- Validates that apparent conflicts are not misclassified as true conflicts when contexts diverge.
- Audits control sample pairs to catch unexpected relationships.

Critic decisions are stored in [`docs/skill-arena/sa2/critic-assessments.jsonl`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa2/critic-assessments.jsonl).
