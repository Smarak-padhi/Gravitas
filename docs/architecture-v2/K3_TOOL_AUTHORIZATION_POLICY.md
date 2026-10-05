# GRAVITAS K3 — TOOL AUTHORIZATION POLICY

**Wave**: K3 — Tool Registry + CapabilityGrants Runtime  
**Status**: APPROVED CONTRACT  
**Date**: 2026-10-02  

---

## 1. Zero-Spend Financial Policy

$$\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$$

- Allowed cost classes for autonomous dispatch:
  - `LOCAL_FOSS`
  - `OPERATOR_INCLUDED_HOST_RUNTIME`
  - `OPERATOR_INCLUDED_ACCOUNT`
  - `INCLUDED_SUBSCRIPTION`
  - `QUALIFIED_FREE_TIER`
- Blocked cost classes:
  - `UNKNOWN_COST` $\rightarrow$ Fails closed (`COST_UNKNOWN`).
  - `PAID` $\rightarrow$ Fails closed (`COST_UNKNOWN` / `PAID_EXECUTION_FORBIDDEN`).
  - Paid fallback is strictly forbidden. Agents have zero payment authority.

---

## 2. Sovereign Human Gate Policy

Any tool operation classified with:
- `sideEffectClass === 'DESTRUCTIVE'`
- `authorityClass === 'DESTRUCTIVE_CREDENTIAL_STATE'`
- `requiresHumanApproval === true`

strictly halts execution and enters `WAITING_APPROVAL` with reason code `HUMAN_APPROVAL_REQUIRED`.
- **Worker Self-Grant**: FORBIDDEN.
- **Supervisor Self-Grant**: FORBIDDEN.
- **Tool Self-Grant**: FORBIDDEN.
- **Model Output Self-Grant**: FORBIDDEN.
- Human approval must precede grant issuance; autonomous bypass is architecturally impossible.
