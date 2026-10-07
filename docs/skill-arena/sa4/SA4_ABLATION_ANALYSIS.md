# SA4 Ablation Analysis

## 1. Objective of Ablation Testing
To determine whether observed treatment improvements represent genuine causal contributions from specific capability components rather than generic prompt length increases, targeted ablations were executed on winning treatments.

---

## 2. Experimental Ablations

### Ablation 1: Removal of Brutalist Design Profile (`PROFILE-DESIGN-001`) from B01
- **Baseline**: Full B01 Treatment (Minimalist brutalism + compound UI + Occam rules) $\to$ Score: 5/5.
- **Ablated Run**: Full Treatment minus `PROFILE-DESIGN-001` (`RUN-B01-ABLAT-NO-DESIGN`).
- **Observed Result**: Visual hierarchy dropped to 3.5/5. Monospaced executive metadata, 1px high-contrast rule dividers, and structured data callouts collapsed back into generic grey-card styling.
- **Empirical Verdict**: **`SUPPORTS_COMPONENT_CONTRIBUTION`**. The specific design profile is causally responsible for the editorial typographic authority.

---

### Ablation 2: Removal of Contextual Test Seam Rule (`CANON-CTX-001`) from B07
- **Baseline**: Full B07 Treatment (Stdlib primacy + YAGNI + pluggable clock seam) $\to$ Score: 5/5.
- **Ablated Run**: Full Treatment minus `CANON-CTX-001` (`RUN-B07-ABLAT-NO-SEAM`).
- **Observed Result**: Code implementation reverted to hardcoded `Date.now()` calls inside get/set methods, breaking deterministic time-travel unit testing without monkey patching.
- **Empirical Verdict**: **`SUPPORTS_COMPONENT_CONTRIBUTION`**. The contextual exception allowing test seams at boundary systems is causally necessary to prevent extreme YAGNI from destroying testability.
