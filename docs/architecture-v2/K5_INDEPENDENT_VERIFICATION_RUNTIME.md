# GRAVITAS K5 — INDEPENDENT VERIFICATION & ADVERSARIAL FALSIFICATION RUNTIME
## Comprehensive Architectural Specification, Epistemological Proofs, and Runtime Contracts

**Wave**: K5  
**Status**: COMPLETE, HARDENED & VERIFIED  
**Baseline Git Commit**: `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Total Test Suite Status**: 377 passing (51 K0, 108 Harnesses, 53 K2, 85 K3, 40 K4, 40 K5), 0 failures, 0 skips  

---

### 1. Locked Epistemological Invariants

```
WORKER_SUCCESS != VERIFIED_SUCCESS
TOOL_SUCCESS != VERIFIED_SUCCESS
SUPERVISOR_ACCEPTANCE != VERIFIED_SUCCESS

ARENA_EVIDENCE_REVIEW != K5_INDEPENDENT_VERIFICATION
ARCHITECTURE_DECISION != IMPLEMENTATION_AUTHORIZATION

RESULT != VERIFICATION
VERIFICATION != APPROVAL

HASH != SIGNATURE
HASH != EXTERNAL_TRUST
HASH != IMMUTABILITY
EVIDENCE_BUNDLE != TRUSTED_EVIDENCE

VERIFIER != APPROVER
VERIFICATION_PASS != HUMAN_APPROVAL

VERIFIED_SUCCESS != MERGE_AUTHORIZATION
VERIFIED_SUCCESS != RELEASE_AUTHORIZATION
VERIFIED_SUCCESS != DEPLOY_AUTHORIZATION
```

---

### 2. The Complete 31-Step Production Trace

K5 implements and executes the exact 31-step production chain without skipping steps or fabricating outcomes:

1. `WorkSession` initialized (`K0`).
2. `Run` created (`K0`).
3. `Task` created (`K0`).
4. `TaskAssignment` issued (`K2`).
5. `K3` CapabilityRequest / CapabilityGrant for Worker.
6. Worker dispatched through `K1` harness (`powershell-local`).
7. `WorkerResult` recorded in `K0`.
8. `VerificationRequest` received with `OrchestrationSessionState`.
9. `VerificationPlan` created and persisted via `CREATE_DURABLE_JOB` in `K0`.
10. `VerificationCriteria` pre-bound with monotonic sequence numbers before any verifier execution.
11. `VerifierAssignment` generated with structural independence (`verifierExecutorId != workerExecutorId`, `verifierExecutionId != workerExecutionId`, `verifierRoleId != workerRoleId`).
12. `K3` CapabilityRequest for independent verifier.
13. `K3` CapabilityGrant issued for independent verifier with scoped resource paths.
14. `K1` Harness surface resolution (`evaluateDispatch`).
15. Dispatch-time `K1 ∧ K3` revalidation at execution boundary.
16. Verifier dispatched through `K1` harness.
17. `RawObservation` captured and redacted.
18. Pre/post protected target-state comparison executed (`diffTargetState`).
19. `VerificationEvidence` normalized.
20. SHA-256 integrity digest computed (`CHANGE_DETECTION_RELATIVE_TO_REFERENCE_DIGEST`).
21. `VerificationFinding` derived per criterion.
22. `VerificationReport` synthesized with verdict (`VERIFIED_PASS`, `VERIFIED_FAIL`, `INCONCLUSIVE`).
23. `EvidenceManifest` generated with deterministic sorting.
24. `EvidenceBundle` created (`trustStatus: 'NOT_TRUSTED_EVIDENCE'`).
25. `K0` canonical persistence of Report and Bundle via `CREATE_DURABLE_JOB`.
26. Canonical reread from `K0` verified.
27. Verification verdict emitted.
28. Transition to `WAITING_FOR_HUMAN_APPROVAL` state.
29. Sovereign human operator approval recorded.
30. State updated to `HUMAN_APPROVED`.
31. Zero autonomous merge, push, or release execution verified.

---

### 3. Verification Criteria Pre-binding & Revision Safety

- **Pre-binding**: Criteria are persisted before any verifier execution. Every criterion has a monotonically increasing `boundAtSeq` matching its insertion order in `K0`.
- **Revision Safety**: Revisions to criteria can ONLY be authored by `HUMAN_OPERATOR` or `PLAN_AUTHOR`. All machine actors (`WORKER`, `VERIFIER`, `SUPERVISOR`, `TOOL`, `MODEL`, `TIMER`) are rejected with `ACTOR_NOT_AUTHORIZED`.
- **Staleness Handling**: When criterion $C$ is revised from $r_1$ to $r_2$:
  - Existing open assignments for $r_1$ are marked `SUPERSEDED`.
  - Results arriving late for $r_1$ are rejected with `STALE_CRITERION_REVISION`.
  - Evidence for $r_1$ does not satisfy $r_2$.

---

### 4. Verifier Safety, Containment & Target Mutation Detection

- **Pre/Post State Comparison**: The engine captures SHA-256 hashes of all protected paths and scratch directories before dispatch (`captureTargetState`) and immediately after execution.
- **Disqualification on Mutation**: If a verifier modifies any protected target path, the finding is immediately classified as `VERIFIER_MUTATED_TARGET` and the overall report verdict forced to `VERIFIED_FAIL`.
- **Scratch Isolation**: Verifiers are allowed to write ephemeral artifacts only inside declared scratch directories (`allowedScratchPrefixes`), which do not trigger mutation penalties.

---

### 5. Authority, Spend & Gate Algebra

$$\text{EXECUTE} \iff \text{K1.isEligible} \land \text{K3.isAuthorized}$$

| K1 Surface Ready | K3 Grant Authorized | Dispatch Decision | Outcome |
| :--- | :--- | :--- | :--- |
| **YES** | **YES** | **ALLOWED** | Verifier executes deterministically |
| **YES** | **NO** | **BLOCKED** | Blocked fail-closed by K3; zero execution |
| **NO** | **YES** | **BLOCKED** | Blocked fail-closed by K1; zero execution |
| **NO** | **NO** | **BLOCKED** | Blocked fail-closed by both; zero execution |

- **Cost Gating**: `UNKNOWN_COST` verifiers and `PAID` fallbacks are blocked fail-closed (`AUTONOMOUS_INCREMENTAL_SPEND = 0`).
- **Budgets**: `VerificationBudget` is fixed at plan creation. Verifiers cannot self-extend budgets.

---

### 6. Evidence Bundle & Hash Semantics

- **Digests as Change-Detection**: Digests strictly represent `CHANGE_DETECTION_RELATIVE_TO_REFERENCE_DIGEST`.
- **Non-Equivalences**:
  - `isDigitalSignature: false`
  - `confersExternalTrust: false`
  - `confersImmutability: false`
- **Bundle Trust Status**: `EvidenceBundle.trustStatus` is hardcoded to `'NOT_TRUSTED_EVIDENCE'`.
- **Deterministic Manifest**: `EvidenceManifest` orders criteria, evidence, and artifact paths deterministically to ensure reproducible core digests.

---

### 7. Process Restart Durability & Crash Recovery (K5-A to K5-F)

All K5 state entities (`PLAN`, `CRITERION`, `CLAIM`, `ASSIGNMENT`, `ASSIGNMENT_STATUS`, `OBSERVATION`, `MUTATION`, `EVIDENCE`, `FINDING`, `REPORT`, `BUNDLE`, `DECISION`, `STATE`, `TRACE`) are persisted through `K0` WorkSessionKernel commands (`CREATE_DURABLE_JOB`).

- **Crash K5-A (Plan persisted, crash before assignment)**: Resumes by creating assignments without phantom executions.
- **Crash K5-B (Assignment persisted, crash before dispatch)**: Resumes and re-evaluates K1/K3 gates before dispatching.
- **Crash K5-C (Crash during dispatch)**: If dispatch is started but no observation persisted, state becomes `UNKNOWN_EXTERNAL_OUTCOME`. Zero blind replay.
- **Crash K5-D (Observation persisted, crash before normalization)**: Resumes normalization without re-executing verifier.
- **Crash K5-E (Evidence persisted, crash before report/bundle)**: Resumes report and bundle synthesis.
- **Crash K5-F (Report persisted, crash before human gate)**: Resumes in `WAITING_FOR_HUMAN_APPROVAL` state.

---

### 8. Human Sovereignty Boundary

- **Approval Gate**: Only `HUMAN_OPERATOR` may approve a report.
- **Gating Prerequisite**: Approval is only permitted if report verdict is `VERIFIED_PASS`. Attempting to approve `VERIFIED_FAIL` or `INCONCLUSIVE` throws `APPROVAL_REQUIRES_VERIFIED_PASS`.
- **Zero Auto-Merge/Deploy**: `authorizesMerge: false`, `authorizesRelease: false`, `authorizesDeploy: false`, `integrationPerformedByK5: false`.
