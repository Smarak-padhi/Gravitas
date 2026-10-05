# GRAVITAS K3 — CRASH, REVOCATION & REPLAY SEMANTICS
## Wave K3 Final Hardening: Durability, Crash Taxonomy & Replay Protection

**Wave**: K3 — Tool Registry + CapabilityGrants Runtime  
**Status**: APPROVED CONTRACT & EMPIRICALLY VERIFIED  
**Date**: 2026-10-02  

---

## 1. Crash Semantics Across Authorization Stages (Verified in Tests 75–80)

- **K3-CRASH-A** (Capability request created, crash before decision): Request resumes safely; zero authority leaked. No implicit grant is generated.
- **K3-CRASH-B** (Grant issued durably, crash before worker receipt): Grant recovered within exact canonical scope; zero duplicate authority expansion.
- **K3-CRASH-C** (Grant validated, crash before tool starts): Safe restart; fresh dispatch-time authorization is mandatory before any tool starts.
- **K3-CRASH-D** (Tool may have executed, crash before result persistence): Ambiguous outcome $\rightarrow$ classified as `UNKNOWN_EXTERNAL_OUTCOME`. **BLIND RETRY IS STRICTLY FORBIDDEN**.
- **K3-CRASH-E** (Grant revoked, crash, restart): Revocation status is durably preserved via K0 `GRANT_REVOCATION` jobs. Process restart cannot resurrect revoked authority.
- **K3-CRASH-F** (`WAITING_APPROVAL` session, crash, restart): WorkSession preserves `WAITING_APPROVAL`; auto-advance is forbidden.

---

## 2. Invariant: Grant Validity $\neq$ Replay Safety (Tests 50, 73, 74)

Having an `ACTIVE` and non-expired `CapabilityGrant` does NOT mean an operation is safe to replay after an interrupted or ambiguous execution:
- External side effects may have already executed or mutated host state.
- If outcome is ambiguous, orchestrator logs `UNKNOWN_EXTERNAL_OUTCOME` and routes to `WAIT_FOR_HUMAN` or operator reconciliation.
- Revocation of a grant after an ambiguous outcome permanently locks subsequent dispatch.

---

## 3. Canonical Durability Mechanism

1. **Storage Substrate**:
   - `CapabilityGrant` and `GrantRevocation` records are persisted as typed `DurableJob` entities in K0 SQLite database via `WorkSessionKernel.executeCommand({ commandType: 'CREATE_DURABLE_JOB', ... })`.
   - `WORKER_WRITES_SQLITE_DIRECTLY = NO`
   - `TOOL_WRITES_SQLITE_DIRECTLY = NO`
   - `SUPERVISOR_WRITES_SQLITE_DIRECTLY = NO`
   - `K3_AUTHORIZATION_ENGINE_WRITES_SQLITE_DIRECTLY = NO`
2. **Rehydration**:
   - On process restart, `CapabilityGrantEngine.rehydrateFromKernel()` queries durable jobs from K0, restoring all canonical grants, active statuses, and revocations without loss of lifetime or scope bounds.
