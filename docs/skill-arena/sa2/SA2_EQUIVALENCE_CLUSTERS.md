# SA2 Equivalence Clusters & Semantic Deduplication Map

## Invariant Notice
Cluster membership does **not** authorize rule deletion or canonical promotion. All 708 rules remain preserved in the SA1 corpus. These clusters prepare non-canonical synthesis options for SA3.

---

## 1. Exact Duplicate Clusters (15 Clusters, 35 Pairs)
Formed by identical normalized statements repeated across GSD workflow skills:
- **Cluster EQ-EX-01**: Copilot VS Code `vscode_askquestions` compatibility directive (`RULE-GSD-DISCUSS--000014`, `RULE-GSD-EXECUTE--000030`, `RULE-GSD-PLAN-PHA-000024`, `RULE-GSD-PLAN-REV-000086`, `RULE-GSD-NEW-PROJ-000101`, `RULE-GSD-SKETCH-000140`, `RULE-GSD-SPIKE-000144`).
- **Cluster EQ-EX-02**: `--text` plain text numbered lists flag directive (`RULE-GSD-PLAN-PHA-000027`, `RULE-GSD-SPEC-PHA-000150`, `RULE-GSD-DISCUSS--000017`).
- **Cluster EQ-EX-03**: `--skip-research` planning flag directive (`RULE-GSD-PLAN-PHA-000025`, `RULE-GSD-DISCUSS--000015`).
- *Additional clusters detailed in [`docs/skill-arena/sa2/clusters.json`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa2/clusters.json).*

---

## 2. Semantic Equivalence Clusters (8 Clusters, 17 Pairs)
Formed by identical practical intent expressed with slight lexical variation:
- **Cluster EQ-SEM-01**: Keyboard Focus Visibility (Radix UI `RULE-RADIX-000707` and iOS Accessibility `RULE-IOS-A11Y-000570`). Both enforce mandatory visible focus indicators on interactive controls.
- **Cluster EQ-SEM-02**: Avoid Boolean Prop Proliferation (Vercel Agent Skills `RULE-VCL-000701` and Ponytail `RULE-PONY-CORE-000008`). Both favor composition and compound components over flag bloat.
- **Cluster EQ-SEM-03**: Reduced Motion Collapse (Ember & Root philosophy reflected in `RULE-IOS-ANIM-000516` and Android Styles `RULE-AND-STYLE-000241`). Both mandate collapsing animations to instant or <=150ms fades under accessibility reduction.
