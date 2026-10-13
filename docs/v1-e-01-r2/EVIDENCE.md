# GRAVITAS Wave V1-E-01-R2 — Final Focused Repair Evidence

**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Branch:** `feat/v0-golden-loop`  
**Base Commit (V1-E-01-R1):** `1ec88d84f44824fbaf9691202c1487d84aab8cdd`  
**Target Milestone:** Wave V1-E-01-R2 (Final Focused Repair)  
**Date:** 2026-10-13  

---

## 1. Executive Summary

Wave V1-E-01-R2 completes the five remaining source-review repairs on top of Wave V1-E-01-R1 without redesigning the NVIDIA integration or enabling live network egress:
1. **Restricted Offline Grant Registration:** `authorizeOfflineNvidiaGrant` is gated by a module-private `Symbol` (`TRUSTED_ISSUER_TOKEN`), preventing arbitrary callers from registering self-constructed grants into `trustedGrants`. Deterministic offline tests use `issueOfflineNvidiaTestFixtureGrant`, which is restricted to test execution (`VITEST=true` or `NODE_ENV=test`), enforces fixed provider/endpoint/model/credential/cost scopes, and never represents offline test authority as human approval.
2. **Restored `ModelRouter.resolveModel()` Participation:** `KernelHost.dispatchModel()` executes `this.modelRouter.resolveModel(routeReq)` first. When production qualification fails closed (`NO_QUALIFIED_MODEL`) for metadata-only models in offline test mode (`customFetch` present), `KernelHost` routes through `ModelRouter.resolveOfflineTestModel(routeReq)` — which shares the router's candidate filtering, task affinity, and deterministic ranking while returning `qualificationDecision: 'UNQUALIFIED'` and an `OFFLINE_TEST_ROUTE:` reason without mutating `ModelRegistry`.
3. **Evidence-Derived `ExecutionItem` Claims:** Removed hardcoded `readinessStatus: 'READY'`, `costEligibility: 'OPERATOR_INCLUDED_ACCOUNT'`, and `dispatchAuthorization: 'AUTHORIZED'`. `ExecutionItem` now derives `qualificationStatus` (`QUALIFIED` vs `NOT_QUALIFIED`), `readinessStatus` (`READY` vs `NOT_READY`), `costEligibility` (`ZERO_DOLLAR_FREE` vs `UNKNOWN_COST`), `dispatchAuthorization`, `grantedCapabilities`, and `status` directly from routing, registry, K3 verification, and adapter evidence.
4. **Bounded Shutdown Drain & Kernel Operation Timeout:** Replaced unbounded `while (this.activeDispatches.size)` loops in `SHUTDOWN_REQUEST` and `shutdown()` with a finite deadline (`shutdownDrainTimeoutMs`, default 2000ms) and bounded kernel/adapter awaiting (`awaitBounded`), safely transitioning hung tasks to `RECOVERY_REQUIRED` so shutdown always completes deterministically.
5. **Strict `ACTIVE` K3 Grant Status Enforcement:** `verifyK3DispatchGrant` requires `grant.status === 'ACTIVE'` explicitly, rejecting `status: 'EXPIRED'` with `GRANT_EXPIRED` even when `expiresAt` is in the future.

---

## 2. Repairs Completed (5 Source-Review Findings)

### 1. Restrict `authorizeOfflineNvidiaGrant` & Controlled Test Fixture Issuance
- **Location:** `packages/gateways/src/security/k3DispatchEnforcement.ts`
- Added a module-private `TRUSTED_ISSUER_TOKEN = Symbol('gravitas.k3.trusted_offline_issuer')`.
- `authorizeOfflineNvidiaGrant(grant, issuerToken?)` throws `"Direct registration of self-constructed K3 grants is forbidden; use trusted policy issuer"` unless `issuerToken === TRUSTED_ISSUER_TOKEN`.
- Enforced strict scope invariants in `authorizeOfflineNvidiaGrant`:
  - `status === 'ACTIVE'`
  - `authorityCeiling === 'RESTRICTED_INFERENCE'`
  - `costCeiling === 'ZERO_DOLLAR_FREE'`
  - `providerId === 'provider:nvidia-nim'`
  - `toolId === 'tool:nvidia-nim:chat'`
  - `endpointOrigin === 'https://integrate.api.nvidia.com'`
  - `endpointClass === 'chat_completions'`
  - `allowedModels` non-empty and subset of `ALLOWED_OFFLINE_NVIDIA_MODELS`
  - `credentialVaultRef === 'vault:cred:nvidia-nim'`
- Added `issueOfflineNvidiaTestFixtureGrant(overrides)` restricted to `process.env['VITEST'] === 'true' || process.env['NODE_ENV'] === 'test'`, which creates a deep-frozen, scope-locked fixture registered in `trustedGrants` without claiming human approval (`issuedBy: 'policy-engine-k3-offline-test'`).

### 2. Restore Meaningful `ModelRouter.resolveModel()` Participation in `KernelHost.dispatchModel()`
- **Location:** `packages/gateways/src/models/router.ts`, `apps/desktop/src/kernel-host/kernelHost.ts`
- Refactored `ModelRouter` so `resolveModel()` and `resolveOfflineTestModel()` share `resolveWithMode(requirements, escalationPosition, mode)`:
  - `PRODUCTION` mode requires `qualificationStatus === 'QUALIFIED'` and returns `qualificationDecision: 'QUALIFIED'`.
  - `OFFLINE_TEST` mode accepts `QUALIFIED` or `METADATA_VALIDATED` models through the exact same candidate filtering (provider/model constraints, context window, tool calling, structured output, streaming, cost policy) and deterministic ranking, returning `qualificationDecision: 'UNQUALIFIED'` with `OFFLINE_TEST_ROUTE:` reason when a `METADATA_VALIDATED` model is selected.
- In `KernelHost.dispatchModel()`:
  - Calls `this.modelRouter.resolveModel(routeReq)` first.
  - Only when `this.customFetch` is present and `decision.qualificationDecision === 'NO_QUALIFIED_MODEL'`, calls `this.modelRouter.resolveOfflineTestModel(routeReq)`.
  - If routing returns `COST_BLOCKED` or no selected model, fails closed immediately (`Task State -> FAILED`) before credential lookup or adapter execution.

### 3. Evidence-Based `ExecutionItem` Claims
- **Location:** `apps/desktop/src/kernel-host/kernelHost.ts`
- Removed hardcoded `readinessStatus: 'READY'`, `costEligibility: 'OPERATOR_INCLUDED_ACCOUNT'`, and `dispatchAuthorization: 'AUTHORIZED'`.
- Computed `ExecutionItem` fields from actual runtime evidence:
  - `isQualified = decision.qualificationDecision === 'QUALIFIED' && routedModel?.qualificationStatus === 'QUALIFIED'`
  - `qualificationStatus`: `'QUALIFIED'` if `isQualified`, else `'NOT_QUALIFIED'`
  - `readinessStatus`: `'READY'` if `isQualified && response.terminationStatus === 'COMPLETED'`, else `'NOT_READY'`
  - `costEligibility`: `'ZERO_DOLLAR_FREE'` if `isQualified && routedModel?.costTier === 'FREE'`, else `'UNKNOWN_COST'`
  - `dispatchAuthorization`: `'AUTHORIZED'` if `k3Verification.authorized`, else `'BLOCKED'`
  - `grantedCapabilities`: `k3Verification.authorized ? [grant.grantId, grant.resourceScope.toolId, 'OFFLINE_TEST_INFERENCE'] : []`

### 4. Finite Shutdown Drain Deadline & Bounded Operation Recovery
- **Location:** `apps/desktop/src/kernel-host/kernelHost.ts`
- Added `KernelHostOptions.shutdownDrainTimeoutMs` (default `2000`ms) and `KernelHostOptions.kernelCommandTimeoutMs` (default `2000`ms).
- Replaced unbounded `while (this.activeDispatches.size)` loops in `SHUTDOWN_REQUEST` and `shutdown()` with `drainActiveDispatches()`, which aborts all active controllers and waits up to `shutdownDrainTimeoutMs` before clearing remaining entries.
- Wrapped adapter execution and kernel commands with `awaitBounded`, ensuring that if an adapter or kernel operation hangs past the deadline or during shutdown, `dispatchModel` recovers cleanly and transitions the task toward `RECOVERY_REQUIRED` best-effort without hanging host shutdown.

### 5. Require `ACTIVE` K3 Grant Status & Regression Test `EXPIRED` with Future Timestamp
- **Location:** `packages/gateways/src/security/k3DispatchEnforcement.ts`, `packages/gateways/src/__tests__/nvidia-provider.test.ts`, `apps/desktop/src/nvidia-dispatch-safety.test.ts`
- Updated `verifyK3DispatchGrant` step 2 to check `if (grant.status !== 'ACTIVE')`:
  - Returns `GRANT_REVOKED` when `grant.status === 'REVOKED'`.
  - Returns `GRANT_EXPIRED` when `grant.status === 'EXPIRED'` (or any non-`ACTIVE` status), prior to checking `expiresAt <= now`.
- Added regression tests in both `nvidia-provider.test.ts` (test `4a-2`) and `nvidia-dispatch-safety.test.ts` verifying that a trusted test fixture grant with `status: 'EXPIRED'` and `expiresAt` 60 seconds in the future fails closed with `GRANT_EXPIRED`.

---

## 3. Verification Results

### A. Targeted NVIDIA & Safety Tests
- **Command:** `npx vitest run packages/gateways/src/__tests__/nvidia-provider.test.ts apps/desktop/src/desktop-v1e-nvidia-router.test.ts apps/desktop/src/nvidia-dispatch-safety.test.ts`
- **Result:** 3 test files passed, 45 tests passed (13 in `nvidia-provider.test.ts`, 10 in `desktop-v1e-nvidia-router.test.ts`, 22 in `nvidia-dispatch-safety.test.ts`).

### B. Full Gateway & Desktop Test Suites
- **Command:** `npx vitest run packages/gateways apps/desktop`
- **Result:** 21 test files passed, 439 tests passed (120 gateway tests across 10 files + 319 desktop tests across 11 files).

### C. Kernel Core Test Suite
- **Command:** `npm run test:kernel`
- **Result:** 51 tests passed, 0 failed (`GRAVITAS K0 WORKSESSION KERNEL TEST SUITE`).

### D. Monorepo Typecheck
- **Command:** `npm run typecheck`
- **Result:** 12 workspaces passed (`@gravitas/agents`, `@gravitas/browser-qa`, `@gravitas/core`, `@gravitas/gateways`, `@gravitas/git`, `@gravitas/harnesses`, `@gravitas/orchestrator`, `@gravitas/prompts`, `@gravitas/verifier`, `@gravitas/desktop`, `@gravitas/server`, `@gravitas/web`), 0 errors.

### E. Desktop Package Build
- **Command:** `npm run build --workspace=@gravitas/desktop`
- **Result:** `Desktop package bundled successfully.`

---

## 4. Remaining Limitations

1. **Live NVIDIA Egress Remains Default-Denied:** `NvidiaNimAdapter` and `KernelHost` reject requests when no `customFetch` offline transport is supplied (`LIVE_NVIDIA_CALLS = 0`). Enabling live production egress requires explicit operator key onboarding and human approval gate policy in a future wave.
2. **NVIDIA Models Remain `METADATA_VALIDATED` by Default:** Without live qualification probes, NVIDIA catalog entries are routed via `resolveOfflineTestModel()` only when an offline `customFetch` transport is injected, and record `qualificationStatus: 'NOT_QUALIFIED'`, `readinessStatus: 'NOT_READY'`, and `costEligibility: 'UNKNOWN_COST'`.
