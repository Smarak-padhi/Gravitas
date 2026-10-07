# GRAVITAS V1-A — IMPECCABLE DESIGN RULEBOOK QUALIFICATION & PROVENANCE

**UPSTREAM REPOSITORY:** `https://github.com/pbakaus/impeccable`  
**PINNED COMMIT:** `bbcb29d9dee6c94915d760bcfc36818ad5be66ad`  
**LICENSE:** Apache-2.0  
**INTAKE MODE:** STATIC_KNOWLEDGE_ONLY (EVIDENCE_PINNED)  

---

## 1. Upstream Source Audit

The upstream repository was audited in read-only mode to extract design-engineering constraints without executing untrusted package scripts:
- **Observed Rules at Pinned Commit:** 61 deterministic detector rules across 7 domains (AI slop, typography, color/contrast, layout/spacing, touch/responsive, motion, design systems).
- **Observed Workflow Commands:** 24 CLI workflow commands (`init`, `craft`, `shape`, `audit`, `polish`, `distill`, `bolder`, `quieter`, `typeset`, etc.).

---

## 2. Pinned Extraction & Quarantined Surfaces

### Integrated Into V1 (`PROFILE-DESIGN-IMPECCABLE`):
- Pinned rule statements, rationale, and categorization.
- Mandatory accessibility constraints (WCAG 4.5:1 contrast, 44px touch targets).
- Static prompt guidelines for frontend engineers.

### Quarantined Surfaces (Strictly Excluded):
- `npx impeccable install` / lifecycle scripts
- Native precompiled engine binaries
- Network binary download fallbacks
- Provider-native shell hooks
- Live browser preview servers

No native binaries or hooks from Impeccable are permitted to execute in GRAVITAS V1.

---

## 3. Design Authority Hierarchy

$$\text{HUMAN DIRECTION} > \text{PROJECT DESIGN.md} > \text{CONTEXTUAL PROFILE} > \text{IMPECCABLE BASELINE}$$

- **Baseline Hygiene:** Impeccable establishes structural design engineering constraints.
- **Aesthetic Sovereignty:** Project `DESIGN.md` governs brand colors, personality, and visual style.
- **Conflict Handling:** If human directives or `DESIGN.md` attempt to lower safety or accessibility floors (e.g. text contrast below 4.5:1), GRAVITAS surfaces an `AccessibilityConflict` and holds the mandatory floor pending human clarification.
