# GRAVITAS K3 — TOOL REGISTRY ARCHITECTURE

**Wave**: K3 — Tool Registry + CapabilityGrants Runtime  
**Status**: IMPLEMENTED & EMPIRICALLY VERIFIED  
**Date**: 2026-10-02  

---

## 1. Core Architectural Contracts & Invariants

```text
SKILL != TOOL != HARNESS != GATEWAY != PROVIDER != MODEL != PROCESS
CAPABILITY != TOOL != TRANSPORT != CREDENTIAL != AUTHORITY
TOOL DISCOVERY != TOOL REGISTRATION != TOOL QUALIFICATION != TOOL AUTHORIZATION != TOOL EXECUTION
TOOL INSTALLED != TOOL TRUSTED
TOOL QUALIFIED != TOOL AUTHORIZED
CAPABILITY REQUEST != CAPABILITY GRANT
CAPABILITY GRANT != CREDENTIAL
CAPABILITY GRANT != EXECUTION
CREDENTIAL REFERENCE != CREDENTIAL VALUE
ROLE != AUTHORITY
HARNESS READY != TOOL AUTHORIZED
TOOL OUTPUT != CANONICAL STATE
TOOL SUCCESS != TASK SUCCESS
TOOL SUCCESS != INDEPENDENT VERIFICATION
AUTONOMOUS_INCREMENTAL_SPEND = 0
```

---

## 2. Tool Registry Topology

The `ToolRegistry` maintains a typed catalog of tools categorized by:
- **`ToolKind`**: `LOCAL_PROCESS_TOOL`, `BUILTIN_KERNEL_TOOL`, `MCP_TOOL`, `PLUGIN_TOOL`, `GATEWAY_TOOL`, `API_TOOL`, `HUMAN_ONLY_TOOL`.
- **`ToolQualificationState`**: `DISCOVERED`, `PROBED`, `SCHEMA_PINNED`, `QUALIFIED`, `QUARANTINED`, `UNQUALIFIED`.
- **`SideEffectClass`**: `READ_ONLY`, `LOCAL_REVERSIBLE_MUTATION`, `LOCAL_IRREVERSIBLE_MUTATION`, `MUTATING_EXTERNAL`, `DESTRUCTIVE`, `FINANCIAL`.
- **`AuthorityClass`**: `READ_ONLY`, `CODE_MUTATION`, `DEPENDENCY_RESOLUTION`, `INTEGRATION_GATE`, `DESTRUCTIVE_CREDENTIAL_STATE`, `HUMAN_APPROVAL_BYPASS`, `PRODUCTION_DEPLOY`, `FINANCIAL_TRANSACTION`.

---

## 3. CapabilityGrant Engine & Least Privilege

Authority is never ambient. It is mediated by explicit, time-bounded, task-scoped `CapabilityGrant` records:
- **Subject Binding**: Grants are strictly bound to an individual worker `subjectId`. Cross-worker replay fails closed (`SUBJECT_MISMATCH`).
- **Task & Session Binding**: Grants are bound to an explicit `taskId` and `workSessionId`. Cross-task replay fails closed (`TASK_SCOPE_MISMATCH`).
- **Least-Privilege Intersection**: Effective authority is limited to $\text{REQUESTED} \cap \text{SUPPORTED} \cap \text{QUALIFIED} \cap \text{POLICY\_ALLOWED}$.
- **Resource Scopes**: Allowed paths, origins, and operations are validated at dispatch time. Path traversal (`../`) fails closed (`RESOURCE_SCOPE_VIOLATION`).
- **Revocation & Expiry**: Revoked or expired grants are rejected at dispatch time before any subprocess is spawned.

---

## 4. K1 + K3 Gate Algebra

Autonomous dispatch requires simultaneous satisfaction of both K1 execution surface readiness and K3 capability authorization:

$$\text{DISPATCH\_ALLOWED} = \text{K1\_SURFACE\_ELIGIBLE} \wedge \text{K3\_GRANT\_VALID} \wedge \text{RESOURCE\_SCOPE\_VALID} \wedge \text{ZERO\_SPEND\_VALID} \wedge \text{HUMAN\_GATE\_SATISFIED}$$

- If K1 is READY but K3 grant is absent $\rightarrow$ `DENIED` (`GRANT_NOT_FOUND`).
- If K3 grant is valid but K1 harness is blocked $\rightarrow$ `EXECUTION_FAILURE`.
- If both pass $\rightarrow$ Execution proceeds.
