# GRAVITAS K5 — STRUCTURAL VERIFIER INDEPENDENCE
## Verification Independence Model, Anti-Self-Review Constraints, and Identity Separation

**Wave**: K5  
**Status**: APPROVED_AND_FROZEN  

---

### 1. Independence Invariant

```
ROLE != EXECUTOR != HARNESS != MODEL != PROVIDER != GATEWAY != PROCESS
VERIFIER != AUTHOR
WORKER_SUCCESS != VERIFIED_SUCCESS
```

Structural verifier independence mandates that the entity evaluating task completion must be structurally separate from the Worker that produced the result.

---

### 2. Structural Independence Rules

In `VerificationEngine.assign()`:
1. `verifierExecutorId !== plan.worker.workerExecutorId` (Different executor instance).
2. `verifierExecutionId !== plan.worker.workerExecutionId` (Different execution run).
3. `verifierRoleId !== plan.worker.workerRoleId` (Different role classification, e.g. `role:verification:independent-verifier` vs engineering role).

Attempting to assign a verifier sharing identity with the worker throws:
```
[K5:SELF_VERIFICATION_REJECTED] Verifier must be distinct from Worker executor, execution, and role
```

---

### 3. Model Diversity vs Structural Independence

- Model diversity (e.g. running a different LLM family) is **NOT** claimed as independent verification.
- `VerifierAssignment.modelDiversityClaimedAsIndependence = false`.
- True verification requires deterministic oracle checks (e.g. test runner, compiler, exact artifact inspection, mutation diffing) executed under an independent role and subject.
