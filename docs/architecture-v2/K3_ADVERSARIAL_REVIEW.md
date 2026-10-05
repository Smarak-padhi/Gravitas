# GRAVITAS K3 — ADVERSARIAL RED-TEAM REVIEW
## Wave K3 Final Hardening: 12-Point Adversarial Audit

**Wave**: K3 — Tool Registry + CapabilityGrants Runtime  
**Review Type**: Exhaustive Adversarial Security & Capability Isolation Audit  
**Date**: 2026-10-02  
**Status**: PASSED (Zero Blocking Findings — All 12 Attack Vectors Defeated & Tested)  

---

## 1. Attack Vectors Audited & Empirical Defenses

| Pass | Attack Vector | Simulated Threat | Empirical Result | Verified Defense Mechanism |
|---|---|---|---|---|
| **A** | **Grant Forgery** | Attacker invents random UUID `grant_forged_uuid_99999` | **BLOCKED** | `GRANT_NOT_FOUND`: engine only resolves grants issued in canonical storage. Subprocesses = 0. |
| **B** | **Grant Tampering** | Attacker attempts mutating returned grant object in memory | **BLOCKED** | Defense-in-depth `Object.freeze` + canonical lookup ignores caller-side alterations. Subprocesses = 0. |
| **C** | **Subject / Task / Session Replay** | Reusing valid grant across workers, tasks, or sessions | **BLOCKED** | Tri-part binding (`subjectId`, `taskId`, `workSessionId`) enforced at dispatch time. Subprocesses = 0. |
| **D** | **Resource Scope Escape** | `../`, `..\`, UNC `//share`, drive-relative `C:`, null byte `\0`, URL-encoding `%2e%2e`, prefix collisions | **BLOCKED** | `isPathWithinAllowedScope` rigorously enforces directory boundary containment fail-closed. |
| **E** | **Revocation TOCTOU** | Grant revoked during resolution prior to dispatch | **BLOCKED** | `authorizeToolExecution` revalidates active status at dispatch moment; returns `GRANT_REVOKED`. |
| **F** | **Expiry TOCTOU** | Clock advances past `expiresAt` during queueing | **BLOCKED** | `authorizeToolExecution` evaluates `now > expiresAt` at dispatch; returns `GRANT_EXPIRED`. |
| **G** | **K1 / K3 Gate Bypass** | Attempting execution with only K1 ready or only K3 grant | **BLOCKED** | $\text{DISPATCH\_ALLOWED} = \text{K1\_ELIGIBLE} \wedge \text{K3\_AUTHORIZED}$. All 4 matrix cases tested. |
| **H** | **Human Approval Bypass** | Supervisor or Worker requests destructive/credential repair tool | **BLOCKED** | Destructive tools fail with `HUMAN_APPROVAL_REQUIRED`; sovereign human authorization required. |
| **I** | **Zero-Spend Bypass** | Requesting tools with `UNKNOWN_COST` or `PAID` | **BLOCKED** | Evaluator rejects candidate tools with `COST_UNKNOWN`. Autonomous spend ceiling remains `$0.00`. |
| **J** | **Secret Leakage** | Sentinel secret `K3_SENTINEL_SECRET_DO_NOT_STORE_XYZ123` passed | **AUDITED CLEAN** | Sentinel secret absent from grants, descriptors, results, logs, and events. Opaque refs only. |
| **K** | **Unknown-Outcome Blind Replay** | External crash occurs during tool execution | **BLOCKED** | Ambiguity returns `UNKNOWN_EXTERNAL_OUTCOME`; valid grant does NOT authorize blind automated replay. |
| **L** | **K0 Durability & Process Crash** | Process terminated after grant issuance or revocation | **DURABLE** | Grants and revocations rehydrated from K0 `CREATE_DURABLE_JOB` entities. Zero direct SQLite writes. |

---

## 2. Architectural Integrity Statement

K3 proves that:
1. Knowing a tool exists does NOT imply authority to invoke it (`TOOL_REGISTERED != TOOL_AUTHORIZED`).
2. Harness readiness does NOT bypass capability grants (`HARNESS_READY != TOOL_AUTHORIZED`).
3. Authority is scoped, bounded, least-privilege, and replay-resistant across subjects, tasks, and sessions.
4. Authority and revocation survive process crashes faithfully via K0 commands without direct SQLite bypass.
5. External execution ambiguity halts automated replay and protects human sovereignty.
