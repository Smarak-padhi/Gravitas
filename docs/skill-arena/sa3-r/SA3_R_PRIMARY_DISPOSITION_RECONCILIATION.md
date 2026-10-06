# SA3-R Primary Disposition Reconciliation & Partition Proof

## 1. Mathematical Partition Invariant
Every rule $r \in \text{SA1}$ must map to exactly one primary disposition:
$$\mathcal{D}: \text{Rules}_{\text{SA1}} \to \{\text{SYNTHESIZED}, \text{PROFILE}, \text{VERSION\_FAMILY}, \text{HOLD}, \text{REJECT}, \text{RETAINED}\}$$

Such that:
1. $\forall r \in \text{SA1}, |\mathcal{D}(r)| = 1$
2. $\sum_{C \in \text{Categories}} |C| = |\text{SA1}| = 708$
3. $\text{Duplicates} = 0$

---

## 2. Recomputed Primary Accounting

| Primary Disposition Key | Count | Target Entity Class | Reconciliation Evidence |
| :--- | :---: | :--- | :--- |
| `SYNTHESIZED_INTO_PROPOSAL` | **21** | Canonical Candidates (`CANON-GLOB-*`, `CANON-CTX-*`, `CANON-SPEC-*`) | Maps into 14 distinct candidate objects. Every rule matches a declared `sourceRuleIds` entry. |
| `PROFILE_MEMBER` | **677** | Profile Objects (`PROFILE-DESIGN-*`, `PROFILE-PLAT-*`, `PROFILE-WORK-*`) | Disjoint union of Design (21) + Platform (390) + Workflow (266) = 677. |
| `VERSION_FAMILY_MEMBER` | **2** | Generational Version Families | Assigned to `VERSION-FAMILY-001` (1) and `VERSION-FAMILY-006` (1). |
| `TECHNICAL_VERIFICATION_HOLD` | **1** | Technical Verification Holds | Assigned to `HOLD-002` (`RULE-AND-R8-000317`). |
| `REJECTION_PROPOSED` | **3** | Rejection Proposals | Assigned to `REJECT-001` (1), `REJECT-002` (1), and `REJECT-003` (1). |
| `RETAINED_SEPARATELY` | **4** | Standalone Specialist Tools | Assigned to `RETAIN-RULE-PONY-CORE-000006`, `000010`, `000011`, and `000012`. |
| **SUM OF PRIMARY DISPOSITIONS** | **708** | **Exhaustive Partition** | **EXACT_MATCH (708 / 708)** |

---

## 3. Disjoint Partition Verification Findings
- **Total Input Rules in SA1**: 708
- **Total Rules in `rule-dispositions.jsonl`**: 708
- **Unique Rule IDs in Dispositions**: 708
- **Duplicate Primary Rule Assignments**: **0**
- **Unassigned SA1 Rules**: **0**
- **Unexpected Disposition Values**: **0**

Full machine verification is recorded in [`docs/skill-arena/sa3-r/primary-disposition-audit.json`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa3-r/primary-disposition-audit.json).
