# SA2-R False-Conflict Root Cause Analysis

## 1. Overview & Purpose
Phase SA2 produced an unusually high conflict volume (667 conflict-like relationships). SA2-R analyzed every reclassified edge to identify the upstream heuristic failure that caused the false conflict.

This analysis is not about assigning blame; it identifies the precise mechanical failure modes in automated semantic matching to improve future Arena cycles.

---

## 2. Root Cause Distribution

| Failure Mode / Root Cause | Count | Percentage | Description |
| :--- | :--- | :--- | :--- |
| **`WORKFLOW_STAGE_COLLAPSE`** | 262 | 39.3% | Pairing rules from different lifecycle phases of GSD (Discuss vs Plan vs Execute vs Forensics vs Complete) and treating stage-specific behaviors as global contradictions. |
| **`MODALITY_COLLAPSE`** | 137 | 20.5% | Treating "NEVER X" and "MUST Y" from the same skill or domain as contradictory, even when X and Y are completely different actions (e.g. within `android-intent-security`). |
| **`PAIRING_FALSE_POSITIVE`** | 130 | 19.5% | Candidate generator pairing completely unrelated tools due to polysemous keyword collisions (e.g. "focus" in R8 report analyzer vs "focus" in Radix modal accessibility). |
| **`PLATFORM_COLLAPSE`** | 67 | 10.0% | Treating platform-specific guidelines (Android vs iOS vs Web) as competing in the same build environment. |
| **`VERSION_COLLAPSE`** | 61 | 9.1% | Treating generational API / framework differences (AGP 8 vs 9, Navigation 2 vs 3, Leanback vs Compose TV, PBL 6 vs 7, Swift 5 vs 6) as contemporary conflicts. |
| **`ABSTRACTION_LEVEL_COLLAPSE`** | 7 | 1.0% | Conflating general YAGNI minimalism ("no unrequested abstractions with one implementation") with testing seam requirements around external service boundaries. |
| **`LEXICAL_OPPOSITION_FALSE_POSITIVE`** | 3 | 0.4% | Syntactically inverted statements that express the exact same underlying engineering practice (e.g. ContentProvider selection query parameterization). |
| **`CONTEXT_COLLAPSE`** | 0 | 0.0% | (Subsumed by PLATFORM_COLLAPSE and WORKFLOW_STAGE_COLLAPSE). |
| **`OBJECTIVE_COLLAPSE`** | 0 | 0.0% | No edges driven solely by trade-off without context separation. |
| **`AESTHETIC_GRAMMAR_COLLAPSE`** | 0 | 0.0% | Aesthetic grammar pairs resolved cleanly via context profile tagging. |
| **`OTHER`** | 0 | 0.0% | All reclassifications cleanly categorized. |
| **TOTAL** | **667** | **100.0%** | |

---

## 3. Deep-Dive into Primary Failure Mechanisms

### Mechanism 1: Workflow Stage Collapse (39.3%)
- **How it occurred**: GSD includes dozens of modular sub-skills (`gsd-discuss-phase`, `gsd-plan-phase`, `gsd-execute-phase`, `gsd-complete-milestone`, `gsd-forensics`, etc.).
- `RULE-GSD-DISCUSS--000015` mandates: *"Read the appropriate workflow file BEFORE taking any action... Do not improvise from the summary."*
- Whenever another GSD command had an optional flag (e.g. `--view`, `--interactive`, `--verify-only`) or a phase-specific constraint (*"Do not modify files during forensics"*), the candidate generator flagged a modality mismatch, and SA2 labeled it `TRUE_CONFLICT`.
- **Lesson**: Workflow orchestration systems operate across discrete temporal phases; rules scoped to Phase $N$ do not compete with rules scoped to Phase $M$.

### Mechanism 2: Modality Collapse (20.5%)
- **How it occurred**: In `android-intent-security`, rules were extracted with explicit markers like `MUST:` and `NEVER:`.
- SA2's blocking algorithm paired negative constraints with positive requirements.
- The naive Scout saw `NEVER` vs `MUST` and assumed they were opposing directives on the same action, overlooking that they governed completely different security vectors (e.g. intent redirection sanitization vs broadcast receiver signature protection).
- **Lesson**: Opposing modality is only a conflict if the *predicate* (the action being required or forbidden) is identical.

### Mechanism 3: Polysemous Keyword Collisions (19.5%)
- **How it occurred**: Tokens with multiple semantic meanings across disciplines created high lexical overlap scores:
  - *"Focus"*: Report focus in `android-r8-analyzer` vs DOM keyboard focus in `radix-primitives`.
  - *"Detail"*: Detail pane in `android-adaptive` vs error detail in diagnostic logs.
  - *"Restore"*: Restore credentials in `android-restore-credentials` vs UI state restoration in `navigation-3`.
- **Lesson**: Lexical overlap blocking must incorporate domain/ontology gating to prevent cross-disciplinary false pairings.
