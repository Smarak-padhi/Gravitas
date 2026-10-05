# GRAVITAS K1 — K0 KERNEL INTEGRATION CONTRACT

**Wave**: K1 — Recursive Harness Adapter & Execution-Surface Qualification Loop  
**Date**: 2026-10-02  
**Status**: APPROVED_CONTRACT  

---

## 1. Single Canonical Writer Invariant

```text
HARNESS != CANONICAL DATABASE WRITER
REGISTRY != CANONICAL DATABASE WRITER
```

Harness execution layers, process managers, and API dispatchers MUST NOT write to the K0 SQLite database. All mutations to work sessions, tasks, and durable jobs MUST be mediated through typed `KernelCommand` envelopes submitted to `Kernel.execute(command)`.

---

## 2. Durable Job Lifecycle for Harness Tasks

```mermaid
sequenceDiagram
    participant Kernel as K0 WorkSession Kernel
    participant Reg as K1 Harness Registry
    participant Harn as Harness Adapter
    participant Sub as Subprocess / Remote API

    Kernel->>Reg: CREATE_DURABLE_JOB
    Reg->>Kernel: CLAIM_JOB_LEASE (jobId, leaseOwner)
    Note over Reg,Kernel: Job state -> LEASED
    Reg->>Harn: execute(ExecutionRequest)
    Harn->>Sub: spawn / invoke (with cancellation handle)
    Sub-->>Harn: SubprocessRunResult / API Response
    Harn-->>Reg: ExecutionResult (provenance + digest)
    alt Success
        Reg->>Kernel: COMPLETE_JOB (or TRANSITION_TASK)
    else Failure / Timeout
        Reg->>Kernel: FAIL_JOB (or TRANSITION_TASK)
    end
```

---

## 3. Idempotency and Lease Safety

1. **Lease Protection**: If a job lease expires before the harness completes, the K0 startup reconciler marks the lease `EXPIRED`.
2. **Cancellation Signal**: When K0 transitions a task or session to `CANCELLED`, the registered `CancellationHandle` triggers process tree termination (`taskkill /T /F` on Windows) to prevent orphan child processes.
3. **Receipt Matching**: Every command returned by K1 contains a cryptographically random `commandId` (UUIDv4) allowing deterministic replay and idempotent retries.
