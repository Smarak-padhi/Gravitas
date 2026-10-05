# GRAVITAS K1 — ZERO-SPEND DISPATCH GATE AND COST ELIGIBILITY SPECIFICATION

**Wave**: K1 — Recursive Harness Adapter & Execution-Surface Qualification Loop  
**Date**: 2026-10-02  
**Status**: APPROVED_SPECIFICATION  

---

## 1. Zero-Spend Invariant

```text
AUTONOMOUS_INCREMENTAL_SPEND = $0.00
PROMOTIONAL CREDIT != PERMANENTLY FREE
SUBSCRIPTION IDENTITY != API ENTITLEMENT
UNKNOWN_COST fails closed
```

No GRAVITAS autonomous dispatch pathway may invoke external model APIs or host services that could incur unpredictable financial liability without explicit sovereign operator consent.

---

## 2. Decision Logic for Autonomous Execution

```typescript
export function isCostEligibleForAutonomousDispatch(
  eligibility: CostEligibility,
  promotionalCreditProven: boolean = false
): { allowed: boolean; reason: string } {
  switch (eligibility) {
    case 'LOCAL_FOSS':
      return { allowed: true, reason: 'LOCAL_FOSS: zero per-use cost confirmed.' }
    case 'INCLUDED_SUBSCRIPTION':
      return { allowed: true, reason: 'INCLUDED_SUBSCRIPTION: covered by existing subscription.' }
    case 'QUALIFIED_FREE_TIER':
      return { allowed: true, reason: 'QUALIFIED_FREE_TIER: verified free tier with documented limits.' }
    case 'PROMOTIONAL_CREDIT':
      if (promotionalCreditProven) {
        return { allowed: true, reason: 'PROMOTIONAL_CREDIT: eligibility proven at dispatch time.' }
      }
      return { allowed: false, reason: 'PROMOTIONAL_CREDIT: eligibility NOT proven. Dispatch BLOCKED.' }
    case 'PAID':
    case 'UNKNOWN_COST':
    default:
      return { allowed: false, reason: 'Cost class blocked for autonomous dispatch.' }
  }
}
```

---

## 3. Surface Mapping

1. **AWS Bedrock**: Classified as `PROMOTIONAL_CREDIT` (from POST_P8 environment delta). Since promotional balance query is unverified and AWS SDK is absent, state resolves to `COST_ELIGIBILITY_UNKNOWN` and dispatch is **BLOCKED**.
2. **OpenAI Codex CLI**: Open source executable, but API token drives billing. Classified as `UNKNOWN_COST` until credentials and free/subscription tiers are proven. Dispatch **BLOCKED**.
3. **Claude Code CLI**: Unauthenticated. Classified as `UNKNOWN_COST`. Dispatch **BLOCKED**.
4. **Free Claude Code (FCC)**: Infrastructure is `LOCAL_FOSS`. Dispatch eligible from cost perspective, but blocked on dynamic proxy daemon offline.
5. **Antigravity (`agy`)**: Classified as `INCLUDED_SUBSCRIPTION`. Dispatch **ALLOWED**.
6. **PowerShell Local**: System tool, zero spend. `LOCAL_FOSS`. Dispatch **ALLOWED** (deterministic scripts only).
