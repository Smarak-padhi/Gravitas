# SA2-R Conflict Precision Methodology

## 1. The Falsification Imperative

Phase SA2 produced 667 conflict-like relationships out of 1,009 active edges (429 `TRUE_CONFLICT`, 238 `APPARENT_CONFLICT`). SA2-R tests whether these edges satisfy the strict semantic criteria for conflict or whether they represent false positives stemming from lexical collision, modality collapse, or context collapse.

## 2. Locked Conflict Definitions

### A. TRUE_CONFLICT Requirements
An edge is classified as `TRUE_CONFLICT` if and only if **ALL** six conditions hold:
1. **Material Scope Overlap**: The rules apply to substantially the same decision, problem, or technical component.
2. **Compatible Preconditions**: The applicability conditions for both rules can hold simultaneously in the same environment.
3. **Actionable Incompatibility**: Following both rules simultaneously is impossible or meaningfully self-defeating.
4. **Context Does Not Reconcile Them**: The contradiction cannot be resolved by platform, framework, workflow stage, abstraction level, or risk profile.
5. **Modality Does Not Remove Contradiction**: The tension is not merely a consequence of "PREFER X" vs "MAY Y" or non-overlapping negative/positive scopes.
6. **Contradiction Exists in Source Meaning**: The conflict is semantic, not a syntactic accident of isolated keywords.

If any single condition fails, `TRUE_CONFLICT` is falsified and cannot be retained.

### B. APPARENT_CONFLICT Requirements
An edge is classified as `APPARENT_CONFLICT` if:
- The rules appear opposed upon initial reading, **BUT**
- Evidence demonstrates they may coexist once context, scope, modality, preconditions, abstraction level, or version are accounted for.
- Genuine tension remains that cannot be cleanly decoupled into independent or complementary guidelines.

## 3. Dual-Agent Independent Review Architecture

Every edge in the 667-candidate audit universe was evaluated by at least two independent analytical perspectives before consensus reconciliation:

1. **`CONFLICT_FALSIFIER`**:
   - Focus: Rigorous testing of Conditions A through F.
   - Method: Attempts to prove compatibility, non-overlapping scope, or independent operation.
2. **`CONTEXT_RECONCILER`**:
   - Focus: Testing Patterns A through J (Platform, Workflow Stage, Abstraction Level, Version, General vs Specific, Objective Trade-Offs, Aesthetic Grammars).
   - Method: Evaluates environmental boundaries and contextual containment.
3. **Specialized Reviewers**:
   - **`VERSION_REVIEWER`**: Deployed for all version-sensitive or API-level sensitive edges.
   - **`DESIGN_GRAMMAR_REVIEWER`**: Deployed for visual grammar and aesthetic edges.
   - **`ENGINEERING_BOUNDARY_REVIEWER`**: Deployed for architectural abstraction and YAGNI edges.

## 4. Consensus Adjudication Standards
- **No Majority Voting**: Decisions are grounded exclusively in semantic evidence, scope boundaries, and source text excerpts.
- **Conservative Default**: If two rules address distinct decisions without coupling, they are classified as `INDEPENDENT`. If they provide synergistic guidance for the same domain, they are classified as `COMPLEMENTARY`.
