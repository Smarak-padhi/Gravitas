# GRAVITAS Wave V1-E-01 — NVIDIA & Model Router Recovery Evidence

**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Branch:** `feat/v0-golden-loop`  
**Target Milestone:** Wave V1-E-01 (NVIDIA & Model Router Recovery)  
**Date:** 2026-10-12  

---

## 1. Executive Summary

Wave V1-E-01 establishes the shortest safe production dispatch pipeline connecting:
```text
Desktop UI (Renderer)
   ↓
Model Selection (meta/llama-3.1-8b-instruct, meta/llama-3.1-70b-instruct, mistralai/mixtral-8x7b-instruct-v0.1)
   ↓
Model Router (@gravitas/gateways Deterministic ModelRouter)
   ↓
KernelHost / UtilityProcess (Single-writer WorkSessionKernel)
   ↓
NVIDIA NIM Provider Adapter (NvidiaNimAdapter with K3 Capability Grant Verification)
   ↓
Provider Response (Offline mock for tests; live egress blocked)
   ↓
WorkSession & SQLite Kernel (Task SUCCEEDED/FAILED, ExecutionItem registered)
   ↓
Desktop UI Projections (Overview, WorkHierarchy, Execution, TaskDetail, System)
```

Zero out-of-pocket spend policy ($0.00) is enforced.
Zero live NVIDIA egress calls were performed during this wave (`LIVE_NVIDIA_CALLS = 0`, `LIVE_PROVIDER_QUALIFICATION = BLOCKED`).

---

## 2. Architecture Findings

1. **Existing Components Identified:**
   - `packages/gateways/src/providers/nvidia.ts`: `NvidiaNimAdapter` implementation containing strict `verifyK3DispatchGrant`, URL containment to `https://integrate.api.nvidia.com`, and bearer token injection.
   - `packages/gateways/src/models/router.ts`: `ModelRouter` providing deterministic ranking based on budget policy (`STRICT_ZERO_DOLLAR`), latency, and declared capability profiles.
   - `packages/gateways/src/models/registry.ts`: `ModelRegistry` containing seed catalog descriptors for `NVIDIA_SEEDED_MODELS`.
   - `packages/gateways/src/credentials/modelCredentialBroker.ts`: Volatile memory `ModelCredentialBroker` singleton with key redaction.
   - `apps/desktop/src/kernel-host/kernelHost.ts`: Single-writer `KernelHost` owning SQLite `WorkSessionKernel`.
   - `apps/desktop/src/main/supervisor.ts`: `DesktopSupervisor` orchestrating IPC and credential synchronization across the host boundary.

2. **Gaps Located:**
   - `NvidiaNimAdapter` was previously disconnected from the production `utilityProcess` dispatch path.
   - `ModelRouter` lacked `requestedModelId` constraint filtering in `TaskModelRequirements`.
   - `KernelHost` did not expose a `DISPATCH_MODEL_REQUEST` IPC handler.
   - `DesktopSupervisor` lacked model dispatch IPC coordination (`gravitas:dispatch-model`).
   - The Desktop UI Command Center lacked an interactive surface for model selection and router dispatch.

---

## 3. Exact Runtime Gaps Repaired

1. **`TaskModelRequirements` & `ModelRouter` Filtering:**
   - Added optional `requestedModelId?: string` to `TaskModelRequirements` in `packages/gateways/src/models/types.ts`.
   - Added filter step in `ModelRouter.resolveModel` to prioritize explicitly selected candidate models.

2. **IPC Protocol & Desktop Bridge Definition:**
   - Added `DesktopModelDispatchPayload` and `DesktopModelDispatchResult` interfaces in `apps/desktop/src/types.ts`.
   - Added `DispatchModelRequest` and `DispatchModelResponse` message types to `D1MainToKernelMessage` and `D1KernelToMainMessage` unions.
   - Extended `GravitasDesktopBridge` with `dispatchModel(payload: DesktopModelDispatchPayload): Promise<DesktopModelDispatchResult>`.

3. **Preload & Main Process Forwarding:**
   - Implemented `dispatchModel` IPC invocation in `apps/desktop/src/preload/index.ts`.
   - Registered `gravitas:dispatch-model` handler in `apps/desktop/src/main/index.ts`.
   - Added `dispatchModel` method to `DesktopSupervisor` with correlation ID management and `DISPATCH_MODEL_REQUEST` message handling.

4. **`KernelHost` Production Dispatch Implementation:**
   - Integrated `ModelRegistry`, `ModelRouter`, and `NvidiaNimAdapter` inside `KernelHost`.
   - Supported constructor injection of `customFetch` and `nvidiaAdapter` for deterministic testing.
   - On `DISPATCH_MODEL_REQUEST`:
     - Checks model availability in catalog (`MODEL_NOT_FOUND` on failure).
     - Checks volatile credential handle availability (`AUTH_REQUIRED` on failure).
     - Resolves routing decision deterministically via `ModelRouter`.
     - Creates WorkSession, Run, and Task in the SQLite `WorkSessionKernel`.
     - Constructs a scoped K3 `CapabilityGrant` with `allowedOrigins: ['https://integrate.api.nvidia.com']` and `grantedCapabilities: ['provider:nvidia-nim']`.
     - Invokes `NvidiaNimAdapter.complete()`.
     - Transitions Task status to `SUCCEEDED` or `FAILED` via canonical kernel FSM commands.
     - Registers `ExecutionItem` with bounded output into `executionRegistry`.
     - Emits `PROJECTION_UPDATED` for `WORK_HIERARCHY`, `EXECUTION`, `OVERVIEW`, and `TASK_DETAIL`.
     - Returns typed `DispatchModelResponse`.

5. **Desktop Command Center UI Integration:**
   - Added `#card-model-dispatch` to `surface-execution` in `apps/desktop/src/renderer/index.html`.
   - Implemented `initModelDispatch(bridge)` controller in `apps/desktop/src/renderer/renderer.ts`.
   - Ensured untrusted model outputs are strictly rendered as text (`.textContent`), preserving script injection safety.

---

## 4. Tests Executed & Actual Results

### Targeted Wave V1-E-01 Suite (`apps/desktop/src/desktop-v1e-nvidia-router.test.ts`)
10/10 tests passed:
- `1. Model Selection: Registry lists NVIDIA NIM models and Router routes deterministically`: PASS
- `2. Missing Credentials: Fails closed with AUTH_REQUIRED without leaking secrets or hanging`: PASS
- `3. Unsupported Model: Fails explicitly with MODEL_NOT_FOUND`: PASS
- `4. Production Dispatch: Credential configuration, K3 dispatch grant, and successful response`: PASS
- `5. Credential Revocation: Revoking credential immediately halts subsequent dispatch`: PASS
- `6. WorkSession & Projections: Task execution and output are synced into canonical SQLite kernel`: PASS
- `7. Provider Error Classification: HTTP 401, 429, and 500 cleanly mapped and fail-closed`: PASS
- `8. DesktopSupervisor Bridge: End-to-end dispatch through host supervisor coordination`: PASS
- `9. UI Controller Wiring: DOM interactions bind to bridge without raw HTML injection`: PASS
- `10. Boundary Invariants: Live egress blocked ($0 spend) and mocks explicitly labeled`: PASS

### Regression Verification Suites
- **Gateways Test Suite:** 120/120 tests passed (`npx vitest run packages/gateways`).
- **Kernel Test Suite:** 51/51 tests passed (`npm run test:kernel`).
- **Desktop Test Suite:** 297/297 tests passed (`npx vitest run apps/desktop`).
- **Monorepo Typecheck:** 0 errors across all workspaces (`npm run typecheck`).
- **Desktop Build:** Bundled successfully (`npm run build --workspace=@gravitas/desktop`).

---

## 5. Security Invariants Preserved

```text
ROLE ≠ EXECUTOR ≠ HARNESS ≠ MODEL ≠ PROVIDER ≠ GATEWAY ≠ PROCESS
WORKSESSION ≠ UI STATE ≠ PROCESS IDENTITY
WORKER_SUCCESS ≠ VERIFIED_SUCCESS
TOOL_SUCCESS ≠ VERIFIED_SUCCESS
VERIFIER ≠ APPROVER
ZERO OUT-OF-POCKET SPEND ($0.00)
```

- **Credential Containment:** Secrets exist only in volatile `ModelCredentialBroker` memory. Zero secrets written to SQLite, filesystem config, IPC responses, or renderer payloads.
- **K3 Capability Grant Enforcement:** Requests to `NvidiaNimAdapter` require an active K3 grant matching the origin `https://integrate.api.nvidia.com` and capability `provider:nvidia-nim`.
- **Fail-Closed Design:** Unauthenticated requests, unauthorized origins, and unsupported models fail deterministically without network calls.

---

## 6. Live Egress & Qualification Status

```text
LIVE_NVIDIA_CALLS = 0
LIVE_PROVIDER_QUALIFICATION = BLOCKED
INCREMENTAL_SPEND_USD = 0.00
```

All automated tests executed against labeled offline mocks. No live API calls were made to NVIDIA endpoints. Live qualification remains blocked pending explicit human authorization and provisioned test keys.

---

## 7. Remaining Blockers & Next Feature Increment

1. **Remaining Blockers:**
   - Live credential provisioning and live qualification require human operator key entry and explicit authorization.
   - Code signing & installer acceptance for production distribution remain deferred/blocked.

2. **Next Feature Increment:**
   - Wave V1-E-02: Live provider qualification gate under operator supervision.
   - Streaming completion support through `KernelHost` to Desktop UI.
