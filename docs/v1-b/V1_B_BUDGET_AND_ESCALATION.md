# GRAVITAS — Wave V1-B Budget & Escalation Specification

### 1. Zero-Dollar Spend Policy ($0.00 Limit)
Wave V1-B strictly enforces a zero out-of-pocket financial cost model:
- `maxOutOfPocketUsd: 0.00`
- `allowPaidFallback: false`
- `allowAutonomousCreditPurchase: false`
- `allowAutonomousBillingModification: false`

Any candidate model marked `costClass: 'PAID'` is rejected with `PAID_BLOCKED`.
Any candidate model with unknown cost metadata is rejected with `COST_UNKNOWN_BLOCKED`.
Autonomous spend is mathematically prohibited.

---

### 2. Bounded Escalation Policy
Model execution failure handling is bounded and deterministic under `EscalationManager`:

```
Attempt 0: Initial model (e.g. meta/llama-3.1-8b-instruct)
  │
  ├─ Failure (e.g. K5 verification fail)
  ▼
Attempt 1: Escalate to candidate 1 (e.g. meta/llama-3.1-70b-instruct)
  │
  ├─ Failure (e.g. K5 verification fail)
  ▼
Attempt 2: Max Escalations Reached (Bound = 2)
  │
  ▼
STOP_AND_REQUIRE_HUMAN (Fail-closed, human operator review queue)
```

#### Core Escalation Invariants:
1. **No Model Self-Escalation:** Models cannot choose their successors or request higher tiers autonomously.
2. **`MAX_ESCALATIONS = 2`:** At most 2 escalation steps are permitted before execution halts for human operator review.
3. **`MAX_SAME_MODEL_RETRIES = 0`:** Zero blind retries of the identical failed model. The system must switch to another qualified candidate or halt.
4. **Human Gate Failure Classes:** The following failure classes bypass autonomous escalation and require immediate human operator intervention:
   - `AUTH_REQUIRED`
   - `COST_BLOCKED`
   - `CAPABILITY_GRANT_REQUIRED`
   - `DESTRUCTIVE_ACTION_REQUIRED`
   - `UNKNOWN_EXTERNAL_OUTCOME`
   - `MERGE_REQUIRED`
   - `RELEASE_REQUIRED`
   - `DEPLOY_REQUIRED`

---

### 3. Epistemic Independence: K5 Verification vs Model Claims
In Gravitas:
- `MODEL_SAYS_DONE != VERIFIED_SUCCESS`
- `WORKER_SUCCESS != VERIFIED_SUCCESS`
- `PROVIDER_200 != VERIFIED_SUCCESS`

When a model executes, its output is treated as untrusted data until independent verifiers execute shell-free in the isolated task worktree.
Only when `VerificationStatus === 'PASSED'` does `ModelCapabilityHistory` record a `VERIFIED_PASS`. All model capability rankings are derived exclusively from these independent verifications.
