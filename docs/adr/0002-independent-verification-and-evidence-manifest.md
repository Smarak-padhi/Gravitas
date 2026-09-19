# ADR 0002: Independent Verification Engine and Cryptographic Evidence Manifest

**Status**: Accepted  
**Date**: 2026-09-19  
**Scope**: `@gravitas/verifier` and `@gravitas/harnesses`  

---

## 1. Context

The foundational invariant of Gravitas states:
> **AN AGENT CLAIM IS NEVER PROOF OF COMPLETION.**
> Worker output such as "done", "tests pass", or "looks correct" must never transition a task to VERIFIED or DONE. Verification must originate outside the worker execution.

In Wave 3, real AI coding agents were invoked within disposable worktrees. While agents produced code modifications, the system required a deterministic, independent authority to verify whether task mutations actually satisfy acceptance criteria and to record cryptographic evidence for human review.

---

## 2. Decision

We introduce `@gravitas/verifier`, an independent verification engine with the following guarantees:

1. **Gravitas-Owned Command Execution**:
   - Verification commands are strictly shell-free (`shell: false`), passing explicit executables and argument arrays without shell interpolation or agent manipulation.
   - Commands execute exclusively within the allocated task worktree, strictly isolating the user's primary repository.
   - Verifier execution captures exit code, execution duration, bounded sanitized output, and SHA-256 hashes of stdout and stderr.

2. **Mutation Integrity Gate**:
   - An independent verification pass cannot override an unauthorized mutation.
   - If `unexpectedChanges` contains files or directories outside the allowed scope, or if the worker created an unexpected Git commit (`headMutated: true`), the task unconditionally transitions to `FAILED`.

3. **Central State Transition Authority**:
   - Only `applyVerificationOutcome` translates verification and mutation outcomes into legal FSM state transitions.
   - Verification `PASSED` + `requiresApproval: true` transitions to `WAITING_APPROVAL` (never automatically `APPROVED`).
   - Verification `PASSED` + `requiresApproval: false` transitions to `SUCCEEDED`.
   - Verification `FAILED` unconditionally transitions to `FAILED`.

4. **Cryptographic Evidence Manifest (Approach B)**:
   - Evidence bundles are written to an external runtime directory (`<runtimeRoot>/runs/<runId>/tasks/<taskId>`), never touching the target repo or primary working tree.
   - Manifest hashing adopts **Approach B**: `evidence-manifest.json` documents SHA-256 hashes of all component artifacts (`task.json`, `worker.json`, `mutation.json`, `verification.json`, `diff.patch`), and a separate `evidence-manifest.sha256` artifact records the SHA-256 hash of the manifest itself, preventing recursive self-hashing cycles.

---

## 3. Consequences

- **Positive**: Complete provider neutrality; verifier is unaware of whether code was written by Claude, another model, or human candidate.
- **Positive**: Worker stdout or exit codes have zero authority over task state.
- **Positive**: Verifier-generated mutations (such as test coverage or build caches) are tracked and observable.
- **Positive**: Complete evidence bundle enables offline, tamper-evident audit trails.
