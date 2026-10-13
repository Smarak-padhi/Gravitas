# GRAVITAS Wave V1-E-01-R1 — NVIDIA Dispatch Safety Repair Evidence

**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Branch:** `feat/v0-golden-loop`  
**Previously Verified HEAD:** `6c147baf5b01676009c90250d7e8d9225eef8650`  
**Target Milestone:** Wave V1-E-01-R1 (NVIDIA Dispatch Safety Remediation)  
**Date:** 2026-10-13  

---

## 1. Executive Summary

Wave V1-E-01-R1 hardens and repairs the production dispatch pipeline introduced in V1-E-01 for NVIDIA NIM and model routing. The remediation ensures that:
- Untrusted renderer frames or hijacked IPC channels cannot trigger unvetted model dispatches or configuration mutations.
- Capability grants cannot be forged or self-issued; only trusted policy-issued grants validated by process-local identity are accepted.
- Live network egress remains strictly default-denied (`LIVE_NVIDIA_CALLS = 0`, zero out-of-pocket spend).
- Mock completions never prematurely promote models to `QUALIFIED` status.
- All request parameters are bounded and validated at both Main and Utility Process boundaries.
- Volatile credential isolation is strictly maintained with multi-layer redaction.
- Canonical WorkSession FSM transitions strictly validate state and command outcomes.
- Cancellation and timeouts reliably abort in-flight dispatches and recover safely.
- In-flight model inference completion transitions tasks to `VERIFYING`, preserving the separation between worker completion and verified success.

---

## 2. Repairs Completed (10 Repair Objectives)

### 1. IPC Security & Authorized Top-Level Renderer Validation
- **Location:** `apps/desktop/src/main/index.ts`
- Wrapped all `ipcMain.handle` endpoints (including `gravitas:dispatch-model` and `gravitas:configure-provider`) with an authorization gate checking `isAuthorizedRestartCaller(event, winGetter())`.
- Hardened `isAuthorizedRestartCaller` to verify that `event.senderFrame` exists, is top-level (`parent === null`), matches `event.sender.mainFrame`, and matches the canonical application renderer URL.
- Subframes, iframes, third-party URLs, and detached callers fail closed immediately.

### 2. Policy-Authorized K3 Capability Grants (Replacing Self-Issued Grants)
- **Location:** `packages/gateways/src/security/k3DispatchEnforcement.ts`
- Replaced open structural grant checks with a process-local authority boundary using `WeakSet<object>()` (`trustedGrants`).
- Serialized, cloned, or caller-forged grant objects fail closed with `MISSING_CAPABILITY_GRANT`.
- Introduced `authorizeOfflineNvidiaDispatch` and `authorizeOfflineNvidiaGrant`, freezing grants and enforcing non-empty fields, `ZERO_DOLLAR_FREE` / `0` cost ceilings, and `RESTRICTED_INFERENCE` / `NORMAL` authority ceilings.

### 3. Default-Deny Real NVIDIA Network Egress
- **Location:** `packages/gateways/src/providers/nvidia.ts`, `apps/desktop/src/kernel-host/kernelHost.ts`
- Removed default fallback to `globalThis.fetch`.
- If `customFetch` is omitted on `NvidiaNimAdapter`, requests fail closed immediately with `CAPABILITY_GRANT_REQUIRED` and error message `"Live NVIDIA egress is disabled"`.
- `KernelHost` rejects dispatch with `"Live NVIDIA egress is disabled; offline transport required"` when no offline transport is injected.

### 4. Removal of Premature Model Qualification
- **Location:** `apps/desktop/src/kernel-host/kernelHost.ts`
- Replaced `qualificationStatus: 'QUALIFIED'` in `ExecutionItem` with `qualificationStatus: 'NOT_QUALIFIED'`.
- Ensured offline mock inference completions do not mutate `ModelRegistry` catalog status from `METADATA_VALIDATED` to `QUALIFIED`.

### 5. Validation and Bounded Dispatch Requests
- **Location:** `apps/desktop/src/dispatchValidation.ts`, `apps/desktop/src/main/supervisor.ts`, `apps/desktop/src/kernel-host/kernelHost.ts`
- Introduced `validateDispatchPayload` to enforce strict schema boundaries:
  - Allowed properties whitelist; unknown fields throw immediately.
  - String length bounds (`prompt` <= 65536 chars, `modelId` and `workSessionId` bounded regex).
  - Bounded `messages` array (1 to 64 items, total content <= 65536 chars, strictly `system` | `user` | `assistant`).
  - Integer ranges: `maxTokens` (1..8192), `timeoutMs` (1..120000), `temperature` (0..2 float).
- Validated provider configuration payloads (`apiKey` length <= 4096, rejection of CRLF and null characters).

### 6. Preservation of Credential Isolation
- **Location:** `packages/gateways/src/credentials/modelCredentialBroker.ts`, `packages/gateways/src/providers/nvidia.ts`
- Secrets reside exclusively in the volatile memory singleton of `ModelCredentialBroker`.
- Sanitized strings across all secrets of length > 0 (previously > 5).
- In `NvidiaNimAdapter`, raw secrets are explicitly redacted from response text, finish reasons, request IDs, and HTTP error bodies before exposure.
- `KernelHost` applies `sanitizeText` to bounded outputs and error messages.

### 7. WorkSession Identity & Kernel Command Outcome Validation
- **Location:** `apps/desktop/src/kernel-host/kernelHost.ts`
- Validated that if a `workSessionId` is provided, it exists in SQLite and is in a valid active state (`['CREATED', 'READY', 'ACTIVE']`); terminal or missing sessions fail closed.
- Wrapped all kernel commands (`CREATE_WORKSESSION`, `CREATE_RUN`, `CREATE_TASK`, `TRANSITION_TASK`) with outcome validation (`if (!result.success) throw new Error('Kernel command failed')`).
- On host startup/reconciliation, any lingering `RUNNING` or `INTERRUPTED` dispatch tasks are reconciled to `RECOVERY_REQUIRED` with reason `"Provider transport interrupted by host restart"`.

### 8. Cancellation, Timeout, and Provider Failure Recovery
- **Location:** `apps/desktop/src/kernel-host/kernelHost.ts`, `packages/gateways/src/providers/nvidia.ts`
- Maintained `activeDispatches` registry mapping `taskId` and `dispatchKey` to `AbortController`.
- Wired `CANCEL_TASK` operator intent to abort active transport controllers.
- `NvidiaNimAdapter.execute` bounds network transport with `Promise.race` against `abortPromise`, mapping abort signals to `terminationStatus: 'CANCELLED'` and `errorTaxonomy: 'CANCELLED'`.
- Cleaned up event listeners and timers in `finally` blocks.
- On shutdown, `KernelHost` aborts all in-flight dispatches and awaits drain before closing the SQLite kernel.

### 9. Preservation of Core Distinction Invariants
- **Location:** `apps/desktop/src/kernel-host/kernelHost.ts`
- Preserved `WORKER_SUCCESS ≠ VERIFIED_SUCCESS`: successful model inference completion transitions the task to `toState: 'VERIFYING'`, not `SUCCEEDED`.
- WorkSession objective explicitly records: `"Offline NVIDIA inference awaiting independent verification"`.
- Execution item records execution completion while task state remains in `VERIFYING`, preserving verifier and approval gates.

### 10. Focused Regression Tests Added
- **Location:** `apps/desktop/src/nvidia-dispatch-safety.test.ts` (20 new tests)
- Verified unauthorized frame rejection, boundary schema validation, serialized grant rejection, default egress denial, qualification immutability, credential isolation and revocation redaction, operator cancellation, timeout and failure transitions, clean shutdown aborts, failed kernel command recovery, and restart reconciliation.
- Hardened existing tests in `apps/desktop/src/desktop-v1e-nvidia-router.test.ts`, `packages/gateways/src/__tests__/nvidia-provider.test.ts`, and `apps/desktop/src/onboarding.test.ts`.

---

## 3. Security Invariants Preserved

```text
ROLE ≠ EXECUTOR ≠ HARNESS ≠ MODEL ≠ PROVIDER ≠ GATEWAY ≠ PROCESS
WORKSESSION ≠ UI STATE ≠ PROCESS IDENTITY
WORKER_SUCCESS ≠ VERIFIED_SUCCESS
TOOL_SUCCESS ≠ VERIFIED_SUCCESS
VERIFIER ≠ APPROVER
ZERO OUT-OF-POCKET SPEND ($0.00)
```

- **Process & Surface Isolation:** Desktop renderer is an unprivileged projection; Main supervisor enforces window and frame provenance; Utility process owns single-writer SQLite database.
- **Authority Boundaries:** Capability grants cannot be constructed by untrusted callers; they require policy issuance.
- **Fail-Closed Execution:** Malformed payloads, unauthorized origins, and missing credentials reject synchronously without invoking network or mutating canonical state.

---

## 4. Live Egress & Spend Status

```text
LIVE_NVIDIA_CALLS = 0
LIVE_PROVIDER_QUALIFICATION = BLOCKED
INCREMENTAL_SPEND_USD = 0.00
```

All automated tests use explicitly labeled offline mocks (`createMockNvidiaFetch`, `LABELED_MOCK`). Default live egress is disabled across all adapters and hosts.

---

## 5. Verification Results

### A. Targeted Safety & Dispatch Test Suite
- `npx vitest run packages/gateways/src/__tests__/nvidia-provider.test.ts apps/desktop/src/desktop-v1e-nvidia-router.test.ts apps/desktop/src/nvidia-dispatch-safety.test.ts`
- **Result:** 3 test files, 43 passed, 0 failed (Duration: ~5.38s).

### B. Gateway Package Test Suite
- `npx vitest run packages/gateways`
- **Result:** 10 test files, 120 passed, 0 failed (Duration: ~2.32s).

### C. Kernel Core Test Suite
- `npm run test:kernel`
- **Result:** 51 passed, 0 failed (Duration: ~4.18s).

### D. Desktop Package Test Suite
- `npx vitest run apps/desktop`
- **Result:** 11 test files, 317 passed, 0 failed (Duration: ~8.20s).

### E. Monorepo Typecheck
- `npm run typecheck`
- **Result:** 12 workspaces passed (`@gravitas/agents`, `@gravitas/browser-qa`, `@gravitas/core`, `@gravitas/gateways`, `@gravitas/git`, `@gravitas/harnesses`, `@gravitas/orchestrator`, `@gravitas/prompts`, `@gravitas/verifier`, `@gravitas/desktop`, `@gravitas/server`, `@gravitas/web`), 0 errors.

### F. Desktop Build
- `npm run build --workspace=@gravitas/desktop`
- **Result:** Desktop package bundled successfully via `./build.mjs`.

---

## 6. Remaining Blockers & Next Steps

1. **Live Provider Onboarding:** Requires explicit human-in-the-loop operator key configuration and manual approval gate before live egress qualification can be enabled.
2. **Desktop Agent (Objective 2):** Ready for planning; requires approval before implementation of the always-on-top assistant.
