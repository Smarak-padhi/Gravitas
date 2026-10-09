# GRAVITAS — Wave V1-C-R2 Lifecycle & Security Falsification
**Identity Binding, Pending Request Invalidation & Race Safety**

- **Repository:** `C:\Users\smara\Desktop\Multi-agent`
- **Branch:** `feat/v0-golden-loop`
- **Pre-Repair Base HEAD:** `3ebd09f8d6fef6589f93a7342f9925a8c211ebee`

---

## 1. Identity & Lifecycle Model

To prevent any confusion between host process instances across restarts, crashes, and replacement, V1-C-R2 introduces three orthogonal identity coordinates:

1. **Kernel Instance Identity (`kernelInstanceId`):**
   - A cryptographically unique UUID generated on each `KernelHost` instantiation (`opts.kernelInstanceId ?? randomUUID()`).
   - Distinct from operating system PIDs (which can be recycled by the OS).
   - Announced during the initial `HELLO` message and validated in every message handshake.
2. **Lifecycle Generation (`generation`):**
   - A monotonic integer maintained by `DesktopSupervisor`, incremented whenever a new kernel host process is spawned (`this.generation++`).
   - Rejects messages originating from previous kernel process incarnations.
3. **Provider Operation Sequence (`providerOpSequence`):**
   - A monotonic integer incremented on every `configureProvider` invocation.
   - Prevents delayed asynchronous responses from previous configure calls from overwriting subsequent revocation operations.

---

## 2. Pending Request Exit Cleanup

When a kernel host terminates (via `exit`, `error`, crash, or shutdown):
- **Mechanism:** `clearPendingRequestsForHost(reason, activeProcess)` executes synchronously before state transitions.
- **Action:** For all outstanding requests matching that process, their Node `setTimeout` timers are cleared (`clearTimeout(entry.timer)`), they are deleted from `pendingRequests`, and their Promises are immediately rejected with:
  `Error: Kernel host terminated before responding: <reason>`
- **Readiness Invalidation:** `executionProviderConfigured` is reset to `false`, and `kernelInstanceId` is cleared.
- **Guarantees:** Zero hanging promises, zero leaked timers, zero unhandled rejections, and no possibility of a replacement host fulfilling an earlier host's request.

---

## 3. Negative Security Falsification Test Matrix

The following negative and edge-case security scenarios were implemented and verified in `apps/desktop/src/onboarding.test.ts`:

| Scenario ID | Test Case | Mechanism Tested | Expected Result | Result |
|---|---|---|---|---|
| **SEC-01** | Unsupported provider ID | `configureProvider({ providerId: 'unsupported' as any, apiKey: 'key' })` | Immediate failure with `[UNSUPPORTED_PROVIDER]`, `AUTH_REQUIRED`. | **PASS** |
| **SEC-02** | Instance UUID mismatch on host | Send `expectedKernelInstanceId: 'fake_uuid'` to `KernelHost` | Rejected with `[INSTANCE_MISMATCH]`, broker unchanged. | **PASS** |
| **SEC-03** | Host PID mismatch | Send `expectedKernelPid: 9999` to `KernelHost` | Rejected with `[HOST_MISMATCH]`, broker unchanged. | **PASS** |
| **SEC-04** | Stale / superseded configure ACK | Delayed configure ACK arrives after newer revocation is issued | State mutation ignored; execution credential remains `false`. | **PASS** |
| **SEC-05** | Host exit during pending request | Process exits while `getHealth()` is in flight | Promise rejects immediately with `Kernel host terminated before responding`. | **PASS** |
| **SEC-06** | Failed HELLO resynchronization | Host rejects resync on startup | Handshake marks provider not ready; `onError` invoked; fail closed. | **PASS** |
| **SEC-07** | Restart credential amnesia | Supervisor restarted; in-memory broker cleared; disk says configured | `getOnboarding()` truthfully returns `providerConfigured: false` (`AUTH_REQUIRED`). | **PASS** |
| **SEC-08** | Unsolicited / duplicate ACK | Unknown `requestId` arrives | Discarded without state mutation; logs `UNSOLICITED_PROVIDER_ACK`. | **PASS** |
| **SEC-09** | Zero disk key persistence | Configure valid synthetic key | `config.json` retains boolean flag only; key is absent from disk. | **PASS** |
| **SEC-10** | Zero diagnostic key exposure | Run `Doctor` diagnostics | Key absent from diagnostic checks and report payloads. | **PASS** |
| **SEC-11** | Zero network egress | Run entire test suite and dogfood | 0 HTTP requests to NVIDIA endpoints ($0.00 spend). | **PASS** |
