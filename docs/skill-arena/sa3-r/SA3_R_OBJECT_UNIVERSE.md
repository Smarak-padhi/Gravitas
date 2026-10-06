# SA3-R Object Universe Definition & Cardinality Ledger

## 1. Accounting Isolation & Disjoint Object Universes
A critical source of ambiguity in synthesis pipelines is the conflation of different object layers (e.g. counting an architectural profile object as if it were an atomic rule, or summing profile references as if they were mutually exclusive primary dispositions).

SA3-R formally separates the capability graph into **12 distinct, non-overlapping entity universes**.

---

## 2. Cardinality Ledger

| Universe Name | Type Description | Stored In | Exact Cardinality |
| :--- | :--- | :--- | :---: |
| **RULE Records** | Provenance-backed atomic rules extracted from source skills | `sa1/rules.jsonl` | **708** |
| **PRIMARY_DISPOSITION Records** | Exhaustive, mutually exclusive classification of each SA1 rule | `sa3/rule-dispositions.jsonl` | **708** |
| **CANONICAL_CANDIDATE Records** | Multi-tier capability candidate objects (Global, Contextual, Specialist) | `sa3/canonical-candidates.jsonl` | **14** |
| **PROFILE Objects** | High-level architectural capability groupings (Design, Platform, Workflow) | `sa3/*-profiles.json` | **10** |
| **PROFILE MEMBERSHIP References** | Total direct rule references held across all profile objects | `sa3/*-profiles.json` | **677** |
| **VERSION_FAMILY Objects** | Cross-generational API progression groupings | `sa3/version-families.json` | **6** |
| **VERSION_FAMILY MEMBER References** | Direct rule references held in version family objects | `sa3/version-families.json` | **2** |
| **TECHNICAL_HOLD Objects** | Subsystem claims held pending physical empirical verification | `sa3/technical-verification-holds.json`| **3** |
| **TECHNICAL_HOLD RULE References** | Direct rule references bound to technical holds | `sa3/technical-verification-holds.json`| **1** |
| **REJECTION Objects** | Formal deprecation/quarantine proposal objects | `sa3/rejection-proposals.json` | **3** |
| **REJECTION RULE References** | Direct rule references bound to rejection proposals | `sa3/rejection-proposals.json` | **3** |
| **SYNTHESIS_AUDIT Records** | Constraint conservation audit records for canonical candidates | `sa3/synthesis-audits.jsonl` | **14** |
| **GLOBALIZATION Records** | Falsification stress-test evaluations for candidate global rules | `sa3/globalization-falsification.jsonl` | **9** |
| **RETAINED_SEPARATELY Target Objects**| Standalone specialist refactoring tools preserved outside synthesis | `sa3/rule-dispositions.jsonl` | **4** |

---

## 3. Inviolable Rule: Never Add Unlike Units
- $\text{Objects} \neq \text{Rules}$. For example, there are 3 technical hold objects, but exactly 1 primary held rule.
- $\text{References} \neq \text{Primary Dispositions}$. While references can in theory overlap across secondary views, primary dispositions form a strict mathematical partition:
  $$\sum \text{PrimaryDispositions} = 708$$
Full machine audit details are preserved in [`docs/skill-arena/sa3-r/object-universe.json`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa3-r/object-universe.json).
