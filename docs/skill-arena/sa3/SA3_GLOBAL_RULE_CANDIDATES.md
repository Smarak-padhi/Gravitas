# SA3 Global Engineering Candidates

## 1. Overview & Verification Threshold
Global Engineering Candidates represent universal software engineering principles that survive all globalization falsification batteries without conflicting with platform paradigms, performance boundaries, or architectural testability requirements.

Out of 9 globalization proposals evaluated, exactly **4 candidates** survived and achieved global status.

---

## 2. Global Candidates Inventory

### CANON-GLOB-001: Local Implementation Reuse
- **Candidate ID**: `CANON-GLOB-001`
- **Candidate Type**: `GLOBAL_ENGINEERING_CANDIDATE`
- **Statement**: Before introducing a new utility, helper, or data structure, inspect the existing codebase and reuse proven local implementations.
- **Source Rules**:
  - [`RULE-PONY-CORE-000002`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`ponytail` core principles)
- **Applies When**: All software engineering projects across all languages, frameworks, and architectures.
- **Does Not Apply When**: Greenfield project initialization where no existing codebase exists.
- **Modality**: `REQUIREMENT`
- **Scope**: `UNIVERSAL_ENGINEERING`
- **Evidence Class**: `EXPLICIT_DIRECTIVE`
- **Loss Audit**: `LOSSLESS` (preserves all source constraints).

---

### CANON-GLOB-002: Standard Library Primacy
- **Candidate ID**: `CANON-GLOB-002`
- **Candidate Type**: `GLOBAL_ENGINEERING_CANDIDATE`
- **Statement**: Prefer standard library capabilities over external third-party packages; never import an external dependency for trivial utility functions.
- **Source Rules**:
  - [`RULE-PONY-CORE-000003`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`ponytail` reach for stdlib)
  - [`RULE-PONY-CORE-000005`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`ponytail` avoid utility dependencies)
- **Applies When**: All production software repositories managing dependency trees and attack surfaces.
- **Does Not Apply When**: Standard library implementation has documented security flaws, lacks essential security patches, or fails hard performance constraints.
- **Modality**: `REQUIREMENT`
- **Scope**: `UNIVERSAL_ENGINEERING`
- **Evidence Class**: `EXPLICIT_DIRECTIVE`
- **Loss Audit**: `LOSSLESS` (synthesizes both rules cleanly without dropping exceptions).

---

### CANON-GLOB-003: Native Platform Primitives
- **Candidate ID**: `CANON-GLOB-003`
- **Candidate Type**: `GLOBAL_ENGINEERING_CANDIDATE`
- **Statement**: Leverage native platform and runtime primitives before layering custom emulation or heavy abstraction frameworks.
- **Source Rules**:
  - [`RULE-PONY-CORE-000004`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`ponytail` platform native before abstractions)
- **Applies When**: All software engineering layers with native runtime counterparts (HTML/CSS semantic elements, SQL constraints, OS primitives).
- **Does Not Apply When**: Cross-platform feature parity strictly mandates uniform abstracted behavior across disparate runtime environments.
- **Modality**: `RECOMMENDATION`
- **Scope**: `UNIVERSAL_ENGINEERING`
- **Evidence Class**: `EXPLICIT_DIRECTIVE`
- **Loss Audit**: `LOSSLESS`.

---

### CANON-GLOB-004: Minimal Verified Implementation (Occam Rule)
- **Candidate ID**: `CANON-GLOB-004`
- **Candidate Type**: `GLOBAL_ENGINEERING_CANDIDATE`
- **Statement**: Implement the minimal verified code that satisfies current requirements; avoid speculative scaffolding for hypothetical future needs.
- **Source Rules**:
  - [`RULE-PONY-CORE-000007`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`ponytail` minimal verifiable change)
  - [`RULE-PONY-CORE-000009`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl) (`ponytail` eliminate speculative abstractions)
- **Applies When**: All production software development cycles and refactoring workflows.
- **Does Not Apply When**: Formal contract-first architectural specifications explicitly require extensible interfaces up front.
- **Modality**: `HEURISTIC`
- **Scope**: `UNIVERSAL_ENGINEERING`
- **Evidence Class**: `EXPLICIT_DIRECTIVE`
- **Loss Audit**: `LOSSLESS`.
