# GRAVITAS K3 — RUNTIME AUTHORITY EVIDENCE REPORT
## Wave K3: Tool Registry & CapabilityGrant Runtime Hardening

**Timestamp**: 2026-10-02T12:05:00+05:30  
**Environment**: Windows 11 Pro / Node.js 24 (native `node:sqlite`) / PowerShell 5.1 Host Runtime  
**Git Working Tree**: Branch `feat/v0-golden-loop`, HEAD `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Test Suite Regression Result**:
- `test:kernel`: **51/51 PASS** (100%)
- `test:harnesses`: **108/108 PASS** (100%)
- `test:k2`: **53/53 PASS** (100%)
- `test:k3`: **85/85 PASS** (100%)
- **Total Unique Tests**: **297/297 PASS** (0 failures, 0 skips)
- `git diff --check`: **CLEAN** (0 errors, 0 warnings)

---

## 1. Ordered 33-Stage Positive Runtime Trace

The following trace represents the canonical end-to-end execution path verified by empirical runtime test `k3.test.ts`:

| Stage | Name | Entity / ID | Description & Evidence |
|---|---|---|---|
| 01 | WorkSession Created | `ws_k3_alpha` | Created via `CREATE_WORKSESSION` in K0 SQLite database |
| 02 | Objective Bound | `ws_k3_alpha` | Objective bound: "Deterministic host script execution under least privilege" |
| 03 | Run Created | `run_k3_01` | Created via `CREATE_RUN` under `ws_k3_alpha` |
| 04 | Supervisor Iteration Started | `iter_01` | Closed-loop iteration initiated by Supervisor |
| 05 | Task Created | `task_k3_01` | Created via `CREATE_TASK` with role `role:engineering:backend-engineer` |
| 06 | Required Capability Identified | `process.execute.deterministic` | Worker/Supervisor identifies required capability |
| 07 | CapabilityRequest Constructed | `req-algebra-a` | Request specifies `requestedCapabilities: ['process.execute.deterministic']` |
| 08 | CapabilityRequest Represented | `req-algebra-a` | Captured as structured request in orchestrator memory and event stream |
| 09 | Tool Registry Queried | `ToolRegistry` | Registry queried for candidates providing capability |
| 10 | ToolDescriptor Resolved | `tool:powershell-local` | Resolved descriptor: kind `LOCAL_PROCESS_TOOL`, version `5.1.0` |
| 11 | Tool Qualification Checked | `QUALIFIED` | `tool.qualificationState === 'QUALIFIED'` verified |
| 12 | Tool Cost Classification Checked | `OPERATOR_INCLUDED_HOST_RUNTIME` | Cost class verified zero-spend compatible |
| 13 | Capability Match Evaluated | `MATCHED` | Requested capability strictly supported by candidate tool |
| 14 | Resource Scope Evaluated | `ALLOWED` | Resource scope contains valid working directory and paths |
| 15 | Side-Effect / Authority Class Evaluated | `CODE_MUTATION` | Non-destructive local operation verified |
| 16 | Human-Gate Requirement Evaluated | `AUTONOMOUS_PERMITTED` | `requiresHumanApproval === false`; autonomous dispatch allowed |
| 17 | CapabilityGrant Issued | `grant_7b19e2a` | Bounded grant created with 60s lease, status `ACTIVE` |
| 18 | Grant Subject Binding Confirmed | `worker-01` | Grant bound strictly to `worker-01` |
| 19 | WorkSession Binding Confirmed | `ws_k3_alpha` | Grant bound strictly to `ws_k3_alpha` |
| 20 | Task Binding Confirmed | `task_k3_01` | Grant bound strictly to `task_k3_01` |
| 21 | Resource Binding Confirmed | `ResourceScope` | Path containment confirmed |
| 22 | Expiry / Revocation Checked | `ACTIVE` | `status === 'ACTIVE'` and `now < expiresAt` |
| 23 | K1 Harness Resolution Initiated | `powershell-local` | Resolved from `HarnessRegistry` |
| 24 | K1 Eligibility Passed | `READY` | Host binary verified, zero cost verified |
| 25 | Dispatch-Time K3 Grant Revalidation | `AUTHORIZED` | `grantEngine.authorizeToolExecution(req)` passes at dispatch time |
| 26 | Dispatch-Time K1 Readiness Passed | `READY` | Harness dispatch-time check confirms runtime availability |
| 27 | Execution Started | `exec_tool_a1b2` | Subprocess spawned via `runSubprocess` with `shell: false` |
| 28 | Execution Completed | `exec_tool_a1b2` | Exit code 0, duration 408ms |
| 29 | ToolResult Normalized | `treq-algebra-a` | Status `SUCCESS`, output `GATE_ALGEBRA_OK`, duration recorded |
| 30 | K0 Canonical Mutation Persisted | `task_k3_01` | Result recorded via K0 command boundary |
| 31 | Canonical State Re-Read | `task_k3_01` | Snapshot retrieved from K0 writer |
| 32 | Supervisor Evaluates Result | `EVALUATION_PASS` | Acceptance criteria verified against normalized tool output |
| 33 | Terminal State Reached | `SUCCEEDED` | Task reached terminal `SUCCEEDED` state |

---

## 2. K1 $\wedge$ K3 Gate Algebra: 4-Way Empirical Proof

The orchestrator enforces the invariant that dispatch requires both K1 eligibility and K3 authorization:
$$\text{DISPATCH\_ALLOWED} = \text{K1\_ELIGIBLE} \wedge \text{K3\_AUTHORIZED}$$

All four combinations are empirically verified in test 66 (`packages/orchestrator/src/k3/k3.test.ts`):

| Case | K1 State | K3 State | Execution Status | Subprocess Spawns | Result |
|---|---|---|---|---|---|
| **Case A** | `ELIGIBLE` (`READY`) | `AUTHORIZED` (valid grant) | `SUCCESS` | 1 | **EXECUTION ALLOWED** |
| **Case B** | `ELIGIBLE` (`READY`) | `DENIED` (subject mismatch) | `DENIED` | 0 | **EXECUTION BLOCKED** |
| **Case C** | `BLOCKED` (harness missing) | `AUTHORIZED` (valid grant) | `EXECUTION_FAILURE` | 0 | **EXECUTION BLOCKED** |
| **Case D** | `BLOCKED` (harness missing) | `DENIED` (no grant) | `DENIED` | 0 | **EXECUTION BLOCKED** |

---

## 3. Grant Durability Across Process Restarts (Tests 56–58)

1. **Durable Grant Issuance (Test 56)**:
   - Grant issued and persisted via K0 command `CREATE_DURABLE_JOB` (`jobType: 'CAPABILITY_GRANT'`).
   - SQLite process cleanly shut down via `kernel.shutdown()`.
   - New `WorkSessionKernel` instantiated on the same database root and started.
   - `engine.rehydrateFromKernel()` executed: recovered exact canonical grant ID, granted capabilities (`['fixture.read']`), resource scope, and original `expiresAt`.
2. **Durable Grant Revocation (Test 57)**:
   - Grant issued, then revoked via `engine.revokeAndPersist(...)`, creating a `GRANT_REVOCATION` durable job in K0.
   - Kernel process terminated and restarted.
   - On rehydration, grant status is restored as `REVOKED`.
   - Dispatch attempt with the grant returns `{ authorized: false, denialReasonCode: 'GRANT_REVOKED' }`. Process restart cannot resurrect revoked authority.
3. **Grant Expiry Preservation (Test 58)**:
   - Bounded grant issued with 15ms duration.
   - Clock advanced past 15ms.
   - Process restarted and rehydrated.
   - Dispatch attempt returns `{ authorized: false, denialReasonCode: 'GRANT_EXPIRED' }`. Lifetime is NOT reset by restart.

---

## 4. Replay Resistance & Scope Isolation (Tests 59–64, 81–82)

- **Subject Replay Blocked**: Grant issued to `worker-alice`, requested by `worker-bob` $\rightarrow$ `SUBJECT_MISMATCH`.
- **Task Replay Blocked**: Grant issued to `task-01`, requested for `task-02` $\rightarrow$ `TASK_SCOPE_MISMATCH`.
- **WorkSession Replay Blocked**: Grant issued under `ws_alpha`, requested under `ws_beta` $\rightarrow$ `TASK_SCOPE_MISMATCH`.
- **Resource Replay Blocked**: Grant scoped to `C:/safe/workspace`, requested on `C:/other/private` $\rightarrow$ `RESOURCE_SCOPE_VIOLATION`.
- **Grant Tampering Blocked**: In-memory caller mutation of returned grant object is ignored; authorization looks up stored canonical grant.
- **Forged Grant ID Blocked**: Arbitrary caller-generated UUID $\rightarrow$ `GRANT_NOT_FOUND`.
- **Concurrent Grant Isolation**: Worker A with Grant A and Resource A, and Worker B with Grant B and Resource B cannot access each other's grants or resources.
- **Human Approval Replay Blocked**: Human approval granted for Task A cannot authorize Task B without fresh approval.

---

## 5. Path Traversal Hardening (Test 65)

Function `isPathWithinAllowedScope` rigorously validates Windows and Unix path scopes:
- `../` and `..\` directory traversals: **BLOCKED**
- Absolute paths outside allowed root (`C:/Windows/System32`, `/etc/shadow`): **BLOCKED**
- Prefix substring collisions (`/var/data` vs `/var/database`): **BLOCKED**
- UNC paths (`//attacker-server/share`, `\\server\share`): **BLOCKED**
- Drive-relative paths (`C:payload.ps1` without slash): **BLOCKED**
- Null byte injection (`\0`): **BLOCKED**
- URL-encoded traversals (`%2e%2e`): **BLOCKED**
- Mixed slashes and Windows case insensitivity within allowed scope: **ALLOWED**

---

## 6. Raw Secret Audit (Test 68)

Sentinel secret `K3_SENTINEL_SECRET_DO_NOT_STORE_XYZ123` was audited across:
- `CapabilityGrant` JSON representation: **ABSENT**
- `ToolDescriptor` catalogs: **ABSENT**
- `ToolResult` data structures: **ABSENT**
- K0 `durable_jobs` and `durable_events`: **ABSENT**
- Log streams and error rationales: **ABSENT**
- Only opaque credential references (e.g. `cred_ref_vault_123`) are permitted.

---

## 7. Ambiguous External Outcomes & No Blind Replay (Tests 73, 74, 78)

- Simulated or crash-induced external process ambiguity returns status `UNKNOWN_EXTERNAL_OUTCOME`.
- Valid `CapabilityGrant` existence does **NOT** authorize automated blind replay.
- Ambiguous outcomes route strictly to human review or deterministic reconciliation.
- Subsequent revocation of the grant permanently locks dispatch for that grant ID.

---

## 8. Zero SQLite Direct Writes in K3 (Test 85)

K3 production code was verified to contain zero direct imports of `node:sqlite`, zero `DatabaseSync`, and zero raw SQL commands:
- `WORKER_WRITES_SQLITE_DIRECTLY = NO`
- `TOOL_WRITES_SQLITE_DIRECTLY = NO`
- `SUPERVISOR_WRITES_SQLITE_DIRECTLY = NO`
- `K3_AUTHORIZATION_ENGINE_WRITES_SQLITE_DIRECTLY = NO`
All persistent mutations flow strictly through frozen K0 `WorkSessionKernel.executeCommand()`.
