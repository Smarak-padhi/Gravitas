# GRAVITAS — Wave V1-B Deterministic Model Routing

### 1. Invariants of Model Routing
1. **No LLM Meta-Authority:** An LLM is never permitted to decide which LLM is assigned execution authority. Routing is purely algebraic and deterministic.
2. **Deterministic Outputs:** For any identical task requirement and system state, the router produces the identical decision object with full provenance.
3. **Fail-Closed Default:** If candidates fail qualification, budget, or capability checks, routing fails closed immediately with an explicit error taxonomy.
4. **Historical Separation:** High-level self-reported model claims do not bias routing; only independent K5 verification outcomes influence candidate ranking.

---

### 2. Multi-Candidate Deterministic Ranking Algorithm

When `ModelRouter.resolveModel(requirements)` is called, the algorithm executes 7 sequential phases:

#### Phase 1: Candidate Discovery & Qualification Filter
- Retrieve registered models from `ModelRegistry`.
- Filter out models whose `qualificationState !== 'QUALIFIED'` or `availability !== 'AVAILABLE'`.
- Filter out any models explicitly excluded by task requirements (`excludedModelIds`).
- Verify provider status (`status !== 'AVAILABLE'`). If provider is in `AUTH_REQUIRED`, return `AUTH_REQUIRED` immediately.

#### Phase 2: Zero-Dollar Budget Policy Compliance
- Enforce `BudgetPolicy` ($0.00 ceiling):
  - Reject models with `costClass === 'PAID'` (`PAID_BLOCKED`).
  - Reject models with `costClass === 'UNKNOWN'` (`COST_UNKNOWN_BLOCKED`).
  - Permit only models with `costClass === 'ZERO_DOLLAR_FREE'`.

#### Phase 3: Capability & Modality Filtering
- Check required modalities (default `['TEXT', 'CODE']`).
- Check tool support requirement if requested.
- Check minimum context window (e.g. if task requires 128k tokens, reject models with 32k limits).
- If no candidates survive, fail closed with `CAPABILITY_UNSUPPORTED`.

#### Phase 4: Tier Preference Filtering
- Determine requested tier from `preferredTier` or map task complexity:
  - `LOW` $\rightarrow$ `FAST`
  - `MEDIUM` $\rightarrow$ `BALANCED`
  - `HIGH` / `CRITICAL` $\rightarrow$ `FRONTIER`
- If candidates exist matching the preferred tier, isolate that candidate subset.
- If no candidate matches preferred tier, gracefully fall back to all surviving qualified candidates.

#### Phase 5: Empirical K5 History Tie-Breaking
- For each surviving candidate, query `ModelCapabilityHistory.queryVerifiedSuccessRate(modelId, taskDomain)`.
- If empirical pass rates diverge (e.g. Model A has 90% verified passes vs Model B's 40%), rank the candidate with the highest verified pass rate first.

#### Phase 6: Context Window Tie-Breaking
- If verified pass rates are equal, rank candidate with larger context window first.

#### Phase 7: Deterministic Lexicographical Terminal Tie-Breaker
- If all prior metrics are equal, sort alphabetically by `modelId` (e.g. `meta/llama-3.1-8b-instruct` before `mistralai/mixtral-8x7b-instruct-v0.1`).

---

### 3. Fail-Closed Error Taxonomy
When no candidate can be selected, `RoutingDecision` returns `selectedModel: null` with structured reason codes:
- `NO_QUALIFIED_MODEL`: Candidate pool empty or disqualified.
- `AUTH_REQUIRED`: Provider requires credentials that are not configured.
- `PAID_BLOCKED`: Candidates require monetary payment under zero-dollar spend policy.
- `COST_UNKNOWN_BLOCKED`: Pricing metadata unverified.
- `CAPABILITY_UNSUPPORTED`: Missing context window, tool, or modality capabilities.
