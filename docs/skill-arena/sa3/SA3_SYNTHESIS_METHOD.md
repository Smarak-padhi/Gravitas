# SA3 Synthesis Method & Formal Rigor Framework

## 1. Objective and Theoretical Principles
Phase SA3 synthesizes the 708 frozen SA1 atomic rules, using the 1,009 reconciled relationships established in Phase SA2-R, into structured candidate capability objects. The method guarantees:
1. **Provenance Preservation**: Every candidate, profile, or hold maintains unbroken bidirectional pointers to original source rules and source file locators.
2. **Context-Aware Partitioning**: Broad generalizations that fail under specific domains (e.g. mobile vs web, strict enterprise vs rapid spike) are prevented from leaking into global guidance.
3. **Lossless Factorization**: When merging overlapping or equivalent rules, all preconditions, exception clauses, and negative boundaries are factored into explicit candidate fields (`appliesWhen`, `doesNotApplyWhen`, `scope`, `modality`).

---

## 2. Six-Tier Disposition Taxonomy
Every SA1 rule is categorized into exactly one primary disposition:
1. `SYNTHESIZED_INTO_PROPOSAL`: Synthesized into a Proposed Canonical Candidate (`CANON-GLOB-*`, `CANON-CTX-*`, `CANON-SPEC-*`).
2. `PROFILE_MEMBER`: Assigned to a specialized design, platform, or workflow capability profile.
3. `VERSION_FAMILY_MEMBER`: Grouped under a version-sensitive architectural progression family.
4. `TECHNICAL_VERIFICATION_HOLD`: Held pending verification on physical hardware, emulators, or multi-environment compilers.
5. `REJECTION_PROPOSED`: Formally proposed for deprecation or deletion (e.g., obsolete SDKs, unsandboxed shell scripts, prompt boilerplate).
6. `RETAINED_SEPARATELY`: Retained as standalone specialist rules where synthesis would dilute extreme domain nuance.

---

## 3. Four-Tier Globalization Falsification Battery
Before any candidate is admitted to `GLOBAL_ENGINEERING_CANDIDATE` status, it must undergo systematic falsification testing across 4 operational contexts:
- **Test 1: Greenfield vs Legacy Maintenance**: Does the rule function when starting a new codebase from scratch?
- **Test 2: High-Performance / Systems Programming**: Does the rule force performance degradations or memory bloat?
- **Test 3: Cross-Platform Heterogeneity**: Does the rule assume language-specific or OS-specific capabilities?
- **Test 4: Strict Enterprise Auditing & Testability**: Does the rule prevent clean dependency injection, mocking, or formal architectural verification?

Candidates that fail any test are immediately demoted to `CONTEXTUAL_ENGINEERING_CANDIDATE`, assigned to a specific profile, or held.
