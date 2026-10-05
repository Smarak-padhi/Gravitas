# SA2 Candidate Generation & Multi-Pass Blocking Strategy

## 1. Problem Statement
The complete pairwise combination of 708 RuleCandidates yields:
$$\frac{708 \times 707}{2} = 250,278 \text{ unique pairs}$$
Evaluating every pair across multiple reasoning scouts is computationally wasteful and cost-prohibitive. SA2 uses a multi-pass deterministic blocking pipeline to capture high-recall plausible relationship candidates.

---

## 2. Multi-Pass Blocking Passes
1. **Pass 1: `VERBATIM_DUPLICATE_BLOCK`**: Identifies rules with identical normalized string text (P0_EXACT).
2. **Pass 2: `LEXICAL_OVERLAP_BLOCK`**: Identifies rule pairs with token Jaccard similarity $\ge 0.40$ or $\ge 4$ shared technical tokens (P1_HIGH / P2_MEDIUM).
3. **Pass 3: `SA1_HINT_BLOCK`**: Targeted keywords from SA1 seeds (`focus`, `reduced-motion`, `gradient`, `cache`, `audit`, `token`, `liquid glass`, etc.).
4. **Pass 4: `MODALITY_OPPOSITION_BLOCK`**: Targets plausible conflicts between opposing modalities (`MUST` vs `AVOID`, `PREFER` vs `AVOID`, etc.) sharing domain or technical terms.
5. **Pass 5: `CONTROL_SAMPLING_BLOCK`**: Stratified random sample of 100 pairs NOT selected by Passes 1–4 (P3_CONTROL) to audit recall.

---

## 3. Candidate Generation Results
```
============================================================
SA2 CANDIDATE BLOCKING VOLUME
============================================================
THEORETICAL_PAIR_COUNT                = 250278
BLOCKED_CANDIDATE_PAIR_COUNT          = 1323

PRIORITY BREAKDOWN:
- P0_EXACT                            = 35
- P1_HIGH                             = 966
- P2_MEDIUM                           = 222
- P3_CONTROL                          = 100
============================================================
```
All 1,323 candidate pairs are recorded in [`candidate-pairs.jsonl`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa2/candidate-pairs.jsonl).
