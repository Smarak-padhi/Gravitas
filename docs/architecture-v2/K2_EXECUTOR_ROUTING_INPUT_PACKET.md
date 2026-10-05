# GRAVITAS K2 — EXECUTOR ROUTING INPUT PACKET
## Handoff from Frozen Wave K1 to Future Wave K2

**Source Wave**: K1 (Harness Adapter Layer & Execution-Surface Qualification)  
**Target Wave**: K2 (Executor / Role Routing, Capability Grant, and Task Dispatch)  
**State**: INPUT_PACKET_ONLY — K2 IMPLEMENTATION IS STRICTLY NOT AUTHORIZED  

---

## 1. Upstream Frozen Contracts Delivered by K1

Wave K2 can rely on the following immutable foundations:

1. **Normalized Harness Interface (`GravitasHarness`)**:
   - Every surface exposes `qualify()`, `checkReadiness()`, and `execute(request: ExecutionRequest)`.
   - Distinct structural kinds: `PROCESS`, `API`, `DAEMON`.
2. **Durable Qualification Snapshot vs Dynamic Readiness**:
   - Qualification snapshots provide certified capability ceilings (`PROBED` vs `DOCUMENTED`).
   - Dynamic readiness checks verify per-dispatch health, credentials, and network connectivity.
3. **Zero-Spend Fail-Closed Gate**:
   - `UNKNOWN_COST` and `PAID` fail closed.
   - `PROMOTIONAL_CREDIT` requires explicit entitlement validation before dispatch.
   - Only `LOCAL_FOSS` and `INCLUDED_SUBSCRIPTION` are unconditionally autonomous.
4. **Normalized Execution Request / Result**:
   - Uniform cancellation handle, output truncation telemetry, and SHA-256 provenance digest.
5. **K0 Durable Job Contract**:
   - `HARNESS != CANONICAL DATABASE WRITER`. K2 routing must mediate all task state updates through K0 `KernelCommand` envelopes.

---

## 2. K2 Responsibilities and Scope Boundaries

When K2 is authorized by human approval, it will address:

1. **Role → Executor Mapping**:
   - Matching cognitive responsibilities (from the 5 canonical roles and 25 specialist profiles) to leased executors.
2. **Executor → Harness Resolution**:
   - Selecting qualified, ready harnesses from `HarnessRegistry` based on required capabilities and containment tiers.
   - Implementing safe fallback algorithms that **never silently downgrade containment**.
3. **Capability Grant Tokens**:
   - Enforcing operational constraints, path restrictions, and timeout policies on task execution.
4. **K0 Job Lifecycle Integration**:
   - Emitting `CREATE_DURABLE_JOB`, `CLAIM_JOB_LEASE`, and job termination commands to K0 kernel.

---

## 3. Strict Prohibitions for K2

- Do NOT implement autonomous self-routing loops without human sovereignty gates for destructive mutations.
- Do NOT downgrade containment when falling back between execution surfaces.
- Do NOT persist raw credentials in any routing table or log artifact.
- Do NOT begin Phase D Living HQ UI implementation.
