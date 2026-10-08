# GRAVITAS — Wave V1-B-R Final Evidence Dossier

**Artifact Version:** 1.0.0  
**Generated At:** 2026-10-08T05:33:00Z  
**Branch:** `feat/v0-golden-loop`  
**Base Commit:** `a8bb8ba7e68bde2081a9ce3698c88124bed34cdd`  

---

## 1. Physical Verification Artifacts

### 1.1 Typecheck Proof
```
> npx tsc --noEmit
Exit code: 0
Diagnostic errors: 0
Packages verified: 12 (core, verifier, harnesses, orchestrator, gateways, prompts, git, browser-qa, agents, desktop, server, web)
```

### 1.2 Native K0 WorkSession Kernel Suite
```
> node --experimental-strip-types --loader ./packages/core/scripts/test-loader.mjs --test packages/core/src/kernel/__tests__/kernel.test.ts
✔ GRAVITAS K0 WORKSESSION KERNEL TEST SUITE
  tests: 51
  pass: 51
  fail: 0
  duration: 2935.855 ms
```

### 1.3 Vitest Test Execution
```
> npx vitest run --fileParallelism=false
Test Files: 97 passed (97)
Tests: 1651 passed (1651)
Duration: 443.55s
```

### 1.4 Physical Desktop Dogfood Execution
```
> node scripts/dogfood-view-switch.mjs
[DOGFOOD] Step 1: #cc-main visible: true, #living-hq visible: false, command pressed: true, world pressed: false
[DOGFOOD] Step 2 Health: mainPid=12280, kernelPid=19324, status=READY
[DOGFOOD] Step 3: activeSessions=0, canonicalRevision=1, hierarchySessions=0
[DOGFOOD] Step 3b Model Intelligence: providerStatus=AUTH_REQUIRED, qualifiedCount=0, candidateCount=3
[DOGFOOD] Step 4: Clicking #btn-view-world to activate Living HQ...
[DOGFOOD] Step 5: #living-hq visible: true, #cc-main visible: false, world pressed: true
[DOGFOOD] Step 6: kernelPid after spatial: 19324 (initial: 19324)
[DOGFOOD] Step 7: overview after spatial: activeSessions=0, canonicalRevision=1
[DOGFOOD] Step 8: #cc-main visible: true, #living-hq visible: false, cmd pressed: true
[DOGFOOD] Step 9: final canonical revision=1, kernelPid=19324
[DOGFOOD] Step 10: Checking kernel process uniqueness...
[DOGFOOD] Step 11: Sandbox check: {"hasProcess":false,"hasRequire":false,"hasBuffer":false,"hasIpcRenderer":false,"hasElectron":false,"hasBridge":true}
[DOGFOOD] Step 12: Requesting normal shutdown via gravitas:quit-app (requestQuitApplication)...
[DOGFOOD] Step 13: mainPid 12280 alive: false, kernelPid 19324 alive: false
DOGFOOD STATUS: PASS (13/13 steps passed)
```

---

## 2. Security & Boundary Proof Matrix

| Boundary | Invariant Enforced | Verification Mechanism | Status |
|---|---|---|---|
| **Zero Paid Spend** | Out-of-pocket cost = $0.00; paid fallback disabled | `BudgetPolicy.maxOutOfPocketUsd: 0`; rejected in `ModelRouter` | PROVEN |
| **Fail-Closed Auth** | Missing/unconfigured API key halts before network call | `status: 'AUTH_REQUIRED'` reported; provider adapter aborts | PROVEN |
| **K3 Dispatch Enforcement** | Network dispatch requires valid, unexpired, authorized K3 grant | `verifyK3DispatchGrant` called in `NvidiaNimAdapter.execute` | PROVEN |
| **SSRF Containment** | Non-allowlisted hosts, private IPs, and redirect hops rejected | Host allowlist check, private IP regex, `redirect: 'error'` | PROVEN |
| **Subprocess Isolation** | Child worker processes do not inherit raw provider API keys | `sanitizeSubprocessEnv` deletes `NVIDIA_API_KEY`, `NIM_API_KEY` | PROVEN |
| **Stream Scrubbing** | Output streams do not leak Bearer tokens or `nvapi-*` keys | `sanitizeOutput` regex scrubbing on stdout and stderr | PROVEN |
| **K5 Receipt Binding** | `VERIFIED_PASS` observations require authentic `verificationPlanId` | `ModelCapabilityHistory.recordObservation` asserts non-empty plan ID | PROVEN |
| **History Idempotency** | Duplicate execution observations do not skew success rates | `seenObservationIds` Set deduplication in `ModelCapabilityHistory` | PROVEN |
| **Escalation Bounds** | Max 2 escalations, 0 blind retries, stop for human on critical error | `EscalationManager.evaluateEscalation` deterministic rules | PROVEN |
| **Desktop Sandboxing** | Electron renderer possesses no Node, fs, or raw ipcRenderer authority | Preload bridge isolation verified in physical dogfood | PROVEN |

---

## 3. Epistemic Calibrations

1. **Model Capability Claims:** Models are not claimed as `QUALIFIED` simply because their schema is registered. Seeding produces `METADATA_VALIDATED` models that are `UNAVAILABLE` until proven.
2. **Offline Experience:** Gravitas functions fully without internet access. When uncredentialed, the UI truthfully presents `AUTH_REQUIRED`, 0 qualified models, and 3 candidate models in the catalog.
3. **Receipt Authenticity:** Successful model executions recorded into history must be bound to verifiable K5 test runner plans, ensuring model claims cannot masquerade as task completion proof.
4. **Zero Dollar Spend:** Paid fallback remains strictly disabled across all routing and budget policies.
