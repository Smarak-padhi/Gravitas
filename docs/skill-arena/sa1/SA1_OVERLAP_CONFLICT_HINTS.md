# SA1 Overlap & Conflict Hints Ledger

## Invariant Notice
In Phase SA1, duplicate detection and conflict detection are **informational only**.
- Zero semantic merges have been performed.
- Zero conflicts have been resolved.
- Zero rules have been eliminated or averaged.
All rules remain distinct candidates in the corpus, awaiting SA2 arbitration.

---

## 1. Verbatim Duplicate Groups (21 Detected)
Identified exact textual statements repeated across sibling GSD workflow wrappers:
- `RULE-GSD-DISCUSS--000014` == `RULE-GSD-EXECUTE--000030`: Copilot VS Code question API compatibility note.
- `RULE-GSD-PLAN-PHA-000024` == `RULE-GSD-PLAN-REV-000086`: Copilot VS Code question API compatibility note.
- `RULE-GSD-DISCUSS--000014` == `RULE-GSD-NEW-PROJ-000101`: Copilot VS Code question API compatibility note.
- `RULE-GSD-SKETCH-000140` == `RULE-GSD-SPIKE-000144`: Copilot VS Code question API compatibility note.
- `RULE-GSD-PLAN-PHA-000027` == `RULE-GSD-SPEC-PHA-000150`: `--text` CLI flag behavior note.
*Resolution Action for SA2*: Preserve all 21 candidates with explicit cross-links (`duplicates[]`).

---

## 2. Potential Semantic Overlap Clusters
Clusters of rules sharing semantic target domains across different source frameworks:
1. **Focus & Keyboard Navigation**: 14 rules across Android Compose, iOS Accessibility, and Radix UI primitives.
2. **Audit & Verification Verification**: 13 rules across Ponytail audit, GSD quality gates, and Android Play Store audits.
3. **Token & Caching Models**: 11 rules across Android Credential Manager, GSD MemPalace, and iOS Keychain.

---

## 3. Potential Conflict Hints
Cross-source requirements that express competing priorities:
1. **Surface Richness vs Minimal Restraint**:
   - `RULE-TASTE-000703`: Strongly discourages multi-stop gradients and decorative layering.
   - `RULE-IOS-GLASS-000523`: Encourages translucent, multi-layered depth effects using Liquid Glass.
   - *Conflict Context*: Web/editorial aesthetic vs modern native Apple platform convention.
2. **Senior Developer Minimalism vs Workflow Formalism**:
   - `RULE-PONY-CORE-000008`: Forbids interfaces with one implementation or scaffolding for later.
   - `RULE-GSD-DISCUSS-000021`: Recommends formal phase contracts, context maps, and structured verification plans.
   - *Conflict Context*: Rapid one-shot task execution vs multi-phase systems engineering.
