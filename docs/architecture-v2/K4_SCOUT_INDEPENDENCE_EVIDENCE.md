# GRAVITAS K4 — SCOUT INDEPENDENCE EVIDENCE
## First-Pass Blind Isolation, Epistemological Weights & Common-Origin Detection

**Status**: WAVE K4 EVIDENCE ARTIFACT (HARDENED & RECONCILED)  
**Date**: 2026-10-03  
**Baseline Git Commit**: `516e01c82cb4c3afd1080e72e68a4e1e56687335`  

---

## 1. Principles of Scout Independence

- `SCOUT != ADVOCATE != CRITIC != SYNTHESIZER != DECISION_MAKER`
- `NUMBER_OF_AGENTS != STRENGTH_OF_EVIDENCE`
- `CONSENSUS != CORRECTNESS`
- `CRITIC != AUTHOR (STRUCTURAL INDEPENDENCE ENFORCED)`

True multi-agent evaluation requires that scouts do not contaminate one another during initial research passes, and that structural roles cannot review their own proposals.

---

## 2. Structural Isolation & Blind Phase Enforcement (Tests 06, 07, 16, 38)

### 2.1 First-Pass Blind Isolation (Test 07)
When a ScoutAssignment is generated via `createScoutAssignment()`:
- `isBlindPhaseActive: true` is set for first-pass exploration.
- `visiblePriorEvidenceIds: []` and `visiblePriorScoutResultIds: []` ensure the scout is unaware of other scouts' findings or existence.
- The assignment input is hashed (`inputHash`), ensuring cryptographic reproducibility of the assignment specification.
- Scout A cannot see Scout B's first-pass results before completion; Scout B cannot see Scout A's.

### 2.2 Concurrent Scout Isolation (Test 38)
When two Scout assignments are concurrently active (`assign-concurrent-a` and `assign-concurrent-b`):
- Scout A's result links exclusively to Assignment A.
- Scout B's result links exclusively to Assignment B.
- Zero cross-assignment result or evidence contamination occurs.

### 2.3 Structural Critic Independence (Test 16)
In `packages/orchestrator/src/k4/arena.ts`, adversarial review enforces:
```typescript
if (report.criticScoutId === candidate.authorScoutId) {
  throw new Error(`Structural independence violation: Critic ${report.criticScoutId} cannot review its own authored candidate ${report.candidateId}`)
}
```
Attempting to assign `scout-alpha` to review candidate `cand-jsonl` (authored by `scout-alpha`) throws an immediate fail-closed error. Self-review is structurally blocked.

---

## 3. Epistemological Weights & Claim-Relative Evidence (Tests 09–13)

### 3.1 10-Dimensional Evidence Fitness Evaluation
Evidence fitness is evaluated relative to the specific target claim using the 10 orthogonal P5 dimensions:
1. `directness`: Direct measurement vs indirect analogy.
2. `authority`: Primary standard/source vs secondary aggregator.
3. `reproducibility`: Fully reproducible locally vs external only vs unreproducible.
4. `environmentMatch`: Windows 11 host match vs desktop vs disparate cloud Linux.
5. `versionMatch`: Exact matching software version vs minor drift vs major stale.
6. `freshness`: Current active release vs recent historical vs obsolete.
7. `conflictOfInterest`: Independent 3rd party vs vendor self-benchmark vs community advocate.
8. `methodologyDisclosed`: Documented benchmark setup vs undisclosed numbers.
9. `sampleQuality`: Systematic repeatable test suite vs single anecdotal datapoint.
10. `reversibility`: Cost to reverse if finding proves false.

### 3.2 Anti-Majoritarian / Claim-Relative Principle
- Source fitness is claim-relative: primary sources (specifications, RFCs, local probes) provide stronger direct support for contract and reproducible claims ($\ge 0.90$).
- Community popularity metrics (50k GitHub stars) provide weak contextual evidence ($< 0.35$).
- Primary evidence overrides secondary consensus regardless of headcount; consensus does not equal truth.

### 3.3 Common-Origin & Duplicate Detection (Test 12, 13)
- Duplicate persistence command deliveries are idempotent and do not inflate evidence count (`DUPLICATE_EVIDENCE_IDEMPOTENT = YES`).
- When multiple scouts submit evidence items that cite the identical underlying blog post or canonical URL (`canonicalSourceId` / `sourceUrl`), `ArchitectureArena.ingestEvidence()` flags them with `isCommonOrigin: true` and prevents synthetic weight inflation (`COMMON_ORIGIN_DETECTED = YES`).
