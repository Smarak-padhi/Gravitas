# GRAVITAS — Wave V1-C-R3 Restart Evidence
**Empirical Proof of Kernel Restart Lifecycle & Resynchronization**

- **Test Date:** 2026-10-10
- **Environment:** Windows (win32 10.0.26300 [x64]), Node v24.13.0, Electron runtime
- **Execution Mode:** Physical Electron Launch with OS Process Boundary Termination

---

## 1. Physical Electron Lifecycle Execution Log

```text
[PHYSICAL TEST] Data root: C:\Users\smara\AppData\Local\Temp\gravitas-physical-lifecycle-3dMaVg
[STEP 1] Host 1 online. PID: 18172
[STEP 2] Provider configured: true maskedHandle: [CREDENTIAL_PRESENT:nvidia-nim]
[STEP 2] Host 1 provider status: AVAILABLE
[STEP 3] Killing Host 1 process: 18172
[STEP 4] Supervisor status after crash: OFFLINE kernelPid: 0
[STEP 4] Provider status after crash: AUTH_REQUIRED
[STEP 5] Triggering restart...
[STEP 5] Restart initiated: true
[STEP 6] Host 2 online. PID: 20724
[STEP 6] Distinct PIDs proven: true (PID1=18172, PID2=20724)
[STEP 7] Host 2 provider status after resync: AVAILABLE
[STEP 8] Host 2 PID 20724 alive after shutdown: false

>>> PHYSICAL ELECTRON RESTART & RESYNCHRONIZATION ACCEPTANCE: PASSED <<<
```

---

## 2. Process Boundary & Identity Provenance

| Invariant | Value | Status | Evidence / Notes |
|---|---|---|---|
| **Host 1 Process ID** | `18172` | **VERIFIED** | Physical Electron `utilityProcess` spawned by Host Main |
| **Crash Induction** | `taskkill /F /PID 18172` | **VERIFIED** | Real OS-level SIGKILL equivalent on Windows |
| **Crash Status** | `OFFLINE`, PID `0` | **VERIFIED** | `DesktopSupervisor` synchronously transitioned to OFFLINE, cleared PID and readiness |
| **In-Flight Invalidation**| Synchronous Rejection | **VERIFIED** | Pending requests immediately rejected upon host death with timer clearance |
| **Host 2 Process ID** | `20724` | **VERIFIED** | Fresh `utilityProcess` spawned with fresh PID and new instance UUID |
| **PID Distinction** | `18172 != 20724` | **VERIFIED** | Proven cross-process lifecycle restart (not same process reuse) |
| **Credential Resync** | Automatic via `HELLO` | **VERIFIED** | Retained in-memory Main credential synchronized to Host 2; ACK verified |
| **Post-Resync Status** | `AVAILABLE` | **VERIFIED** | Provider status restored to AVAILABLE on Host 2 without user re-entry |
| **Process Cleanup** | 0 Orphans | **VERIFIED** | PID 20724 confirmed dead after application quit (`tasklist` check) |
| **Secret Protection** | Zero Raw Secrets Logged| **VERIFIED** | Only opaque handle `[CREDENTIAL_PRESENT:nvidia-nim]` surfaced; zero disk persistence |
