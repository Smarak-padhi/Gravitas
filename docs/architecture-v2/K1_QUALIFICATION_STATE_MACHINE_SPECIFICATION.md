# GRAVITAS K1 — QUALIFICATION STATE MACHINE SPECIFICATION

**Wave**: K1 — Recursive Harness Adapter & Execution-Surface Qualification Loop  
**Date**: 2026-10-02  
**Status**: APPROVED_SPECIFICATION  

---

## 1. Qualification State Ladder

```text
UNDISCOVERED
     ↓
DISCOVERED
     ↓
INSTALLED
     ↓
AUTHENTICATED
     ↓
REACHABLE
     ↓
CAPABILITY_PROBED
     ↓
CONTAINMENT_TESTED
     ↓
QUALIFIED
```

### Invariants
1. **Monotonic Advancement**: Transitions can only advance by 1 step in sequence or remain idempotent (`toIdx === fromIdx + 1 || toIdx === fromIdx`).
2. **No Silent Downgrade**: Transitioning backwards in the qualification ladder is rejected fail-closed.
3. **Universal Block**: Any state may transition to `BLOCKED` or `NOT_APPLICABLE`.
4. **Qualification != Readiness**: Qualification is a durable ceiling based on static host probes. Readiness is evaluated dynamically per-dispatch.

---

## 2. Dispatch-Time Cost Gate

Autonomous dispatch is governed by:
`AUTONOMOUS_INCREMENTAL_SPEND = 0`

| Cost Class | Policy Behavior | Rationale |
|---|---|---|
| `LOCAL_FOSS` | **ALLOWED** | Zero marginal cost (PowerShell, local binary scripts). |
| `INCLUDED_SUBSCRIPTION` | **ALLOWED** | Bounded flat-rate operator account (`agy`). |
| `QUALIFIED_FREE_TIER` | **ALLOWED** | Verified free allowance with documented quota limits. |
| `PROMOTIONAL_CREDIT` | **CONDITIONAL** | Allowed **only if** proof of credit validity is explicitly attached. Otherwise fails closed to `COST_ELIGIBILITY_UNKNOWN`. |
| `PAID` | **BLOCKED** | Autonomous spend forbidden. Requires explicit human sovereign approval. |
| `UNKNOWN_COST` | **BLOCKED** | Fails closed unconditionally. Never silently converts to paid inference. |
