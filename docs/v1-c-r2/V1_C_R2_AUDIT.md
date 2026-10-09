# GRAVITAS — Wave V1-C-R2 Audit Report
**Lifecycle Hardening, Host Identity & Credential Bridge Verification**

- **Repository:** `C:\Users\smara\Desktop\Multi-agent`
- **Branch:** `feat/v0-golden-loop`
- **Pre-Repair Base HEAD:** `3ebd09f8d6fef6589f93a7342f9925a8c211ebee`
- **Mode:** Narrow repair only. No new features.
- **Classification:** `CLEAN_MACHINE_ENVIRONMENT = ISOLATED_PROFILE`, `INDEPENDENT_CLEAN_MACHINE_ACCEPTANCE = BLOCKED`

---

## 1. Executive Summary & Defect Remediation

Wave V1-C-R2 closes all five confirmed defects from the V1-C-R credential bridge implementation:

| Defect ID | Description in V1-C-R | Remediated Behavior in V1-C-R2 | Evidence / Verification |
|---|---|---|---|
| **DEF-01** | Test in `onboarding.test.ts` ran in-process with shared `ModelCredentialBroker` singleton memory. Real process isolation was `NOT_PROVEN`. | Forked genuine OS process worker (`test-fixtures/isolated-kernel-worker.ts`) with distinct parent/child PIDs, independent broker memory heaps, and isolated lifecycle. | `apps/desktop/src/onboarding.test.ts` (test: *crosses real OS process boundary...*) |
| **DEF-02** | Provider ACK was not strictly bound to `providerId`, `op`, `generation`, and a unique `kernelInstanceId`. | `ConfigureProviderRequest` & `ConfigureProviderResponse` bound to `kernelInstanceId` (UUID), `generation` (monotonic integer), `op` (`CONFIGURE` \| `REVOKE`), `providerId: 'nvidia-nim'`. Stale/mismatched ACKs rejected fail-closed. | `apps/desktop/src/types.ts`, `apps/desktop/src/kernel-host/kernelHost.ts`, `apps/desktop/src/main/supervisor.ts` |
| **DEF-03** | Pending requests were not immediately rejected upon kernel process exit/crash. | Added `clearPendingRequestsForHost(reason, targetProcess)` called synchronously on `exit` and `error` events, rejecting all pending requests with explicit descriptive errors and clearing timers. | `apps/desktop/src/main/supervisor.ts:114-123`, `apps/desktop/src/onboarding.test.ts` |
| **DEF-04** | Credential resynchronization failure during `HELLO` handshake was swallowed silently. | `syncCredentialsToKernel()` returns explicit boolean; rejections/errors invoke `this.onError` with `'CREDENTIAL_SYNC_REJECTED'` or `'CREDENTIAL_SYNC_FAILED'`, clearing `executionProviderConfigured` to `false`. | `apps/desktop/src/main/supervisor.ts:741-799`, `apps/desktop/src/onboarding.test.ts` |
| **DEF-05** | `getOnboarding()` reported `providerConfigured` based solely on Main's memory broker, ignoring whether active host held the credential. | Implemented `isExecutionCredentialReady('nvidia-nim')`. `getOnboarding()` returns `providerConfigured: this.isExecutionCredentialReady('nvidia-nim')`. If host is offline, crashed, or unacknowledged, reports `false` (`AUTH_REQUIRED`). | `apps/desktop/src/main/supervisor.ts:108-116, 801-817`, `apps/desktop/src/onboarding.test.ts` |

---

## 2. Before vs After Code Audit

### A. Protocol Definition (`apps/desktop/src/types.ts`)
- **Before:** `ConfigureProviderRequest` and `ConfigureProviderResponse` lacked `kernelInstanceId`, `generation`, and `op`.
- **After:**
  - `HelloMessage`: includes `kernelInstanceId?: string`.
  - `ConfigureProviderRequest`: includes `expectedKernelInstanceId?: string`, `kernelInstanceId?: string`, `op: 'CONFIGURE' | 'REVOKE'`, `generation: number`.
  - `ConfigureProviderResponse`: includes `kernelInstanceId: string`, `op: 'CONFIGURE' | 'REVOKE'`, `generation: number`, `providerId: 'nvidia-nim'`.

### B. Execution Host Enforcement (`apps/desktop/src/kernel-host/kernelHost.ts`)
- **Before:** Checked only `expectedKernelPid`. Accepted empty string as revocation implicitly.
- **After:**
  - Generates immutable instance identity: `this.kernelInstanceId = opts.kernelInstanceId ?? randomUUID()`.
  - In `start()`: Announces `kernelInstanceId` in `HELLO` message.
  - In `handleMessage`: Validates `req.expectedKernelInstanceId === this.kernelInstanceId` (rejects with `[INSTANCE_MISMATCH]`), validates `req.expectedKernelPid` (rejects with `[HOST_MISMATCH]`), validates `req.providerId === 'nvidia-nim'`. Respects explicit `op: 'REVOKE'`.

### C. Supervisor Lifecycle & Correlation (`apps/desktop/src/main/supervisor.ts`)
- **Before:** Handshake caught errors silently (`catch { // Handshake sync warning }`). Requests were `{ resolve, reject }` without timers or process references. `providerConfigured` in `getOnboarding()` checked `hasInMemoryCredential` in Main process only.
- **After:**
  - Tracks `generation: number` (incremented on each process spawn).
  - Tracks `providerOpSequence: number` (incremented on each operation to serialize concurrent configure/revoke).
  - Tracks `executionProviderConfigured: boolean` (true ONLY when active kernel instance acknowledged `CONFIGURE`).
  - Stores rich `PendingRequestEntry` with `timer`, `processRef`, `generation`, `kernelInstanceId`, and `opSequence`.
  - In `exit` and `error` handlers: immediately calls `clearPendingRequestsForHost(reason, activeProcess)`.
  - `isExecutionCredentialReady('nvidia-nim')` enforces all invariants: status READY, active process, matching instance ID, acknowledged configuration, and Main secret available.

---

## 3. Security Boundary Guarantees
1. **Volatile In-Memory Secrets Only:** Secrets never written to disk, SQLite, or logs.
2. **Fail-Closed Execution:** An offline, crashing, or restarting host immediately revokes readiness and reports `AUTH_REQUIRED`.
3. **No Network Egress:** Zero live calls to external APIs ($0.00 spend).
