# SA1 Extraction Methodology & Audit Architecture

## 1. Multi-Stage Pipeline Overview

The SA1 extraction process followed a strict 4-stage pipeline:
1. **Source Discovery & Boundary Validation**: Validated the 97 `ENTER_SA1` candidate sources against `docs/architecture-v2/SA0_SOURCE_REGISTRY.md`. All other partitions (`REFERENCE_ONLY`, `PROJECT_SPECIFIC_ONLY`, `TOOL_QUALIFICATION_SEPARATE`, `QUARANTINED`, `REJECTED`, `UNRESOLVED`) were locked out.
2. **Directive AST/Pattern Parsing**: Read each source file, identified markdown sections, heading hierarchies, bullet-points, bold directives, and normative statements.
3. **Semantic Normalization**:
   - Resolved first-person pronouns and stripped conversational padding.
   - Assigned modality (`MUST`, `MUST_NOT`, `SHOULD`, `PREFER`, `AVOID`, `AESTHETIC_PREFERENCE`, `HEURISTIC`).
   - Assigned primary domain and contextual scopes (`ANDROID`, `IOS`, `GLOBAL_CANDIDATE`, `WEB`, `NEXTJS`, `REACT`).
   - Attached cryptographic provenance (source candidate ID, file path, commit/version, section heading, line locator).
4. **Machine-Readable Emission**:
   - `docs/skill-arena/sa1/rules.jsonl`: Line-delimited JSON corpus of all 708 `RuleCandidate` records.
   - `docs/skill-arena/sa1/provenance.json`: Cross-referenced provenance and coverage graph.

---

## 2. Invariant Adherence Checks
- **No Over-Atomization**: Sentences with coherent compound rationale were preserved as single propositions rather than shattered into word-level fragments.
- **No Modality Drift**: "Consider" or "prefer" statements were never upgraded to "MUST".
- **Zero Web Guesses or Synthetic Fillers**: Missing historical gaps were respected as gaps.
- **Zero Runtime Mutation**: No project code, package manifests, or test suites were modified.
