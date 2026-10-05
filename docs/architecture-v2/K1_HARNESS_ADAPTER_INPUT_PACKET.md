# GRAVITAS — WAVE K1 HARNESS ADAPTER INPUT PACKET
## Upstream Interface Contract for External Execution Surfaces

**Status**: FROZEN INTERFACE SPECIFICATION  
**Scope**: Handoff Contract for Wave K1 Harness Integration  
**Notice**: This document defines interface contracts only. Zero K1 implementation code has been written during Wave K0.

---

## 1. Governing Architectural Invariant

Preserve this invariant across all K1 adapters:

$$\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$$

- **Role**: Cognitive persona and policy requirements (e.g., `Architect`, `CodeReviewer`).
- **Executor**: Stateful task execution agent instance leased by the kernel.
- **Harness**: Process wrapper interfacing with a CLI, SDK, or external engine (e.g., `agy`, `Codex`, `Claude Code`, `FCC`, `Bedrock`).
- **Model**: Underlying neural network weights (e.g., `claude-3-5-sonnet`, `gemini-1.5-pro`).
- **Provider**: Commercial host offering the model API (e.g., Anthropic, Google Cloud, AWS Bedrock).
- **Gateway**: Routing / multiplexing transport proxy (e.g., OmniRoute, Litellm).
- **Process**: Ephemeral OS child process spawned to execute work.

---

## 2. K0 Kernel Surface Consumed by K1

The K0 kernel provides the following durable primitives for K1 harnesses:

### 2.1 Job Claiming & Leasing
Harness runners lease units of work via `CLAIM_JOB_LEASE`:
```typescript
interface ClaimJobLeasePayload {
  readonly jobId: string
  readonly leaseOwner: string
  /**
   * Lease duration requested.
   * [NON_NORMATIVE_EXAMPLE: 120000 ms]
   * REQUIRES_K1_OPERATIONAL_CALIBRATION per harness type.
   */
  readonly leaseDurationMs?: number
}
```
If a harness process crashes or experiences host preemption, the K0 `StartupReconciler` automatically detects expired leases upon kernel restart and returns jobs to `EXPIRED` for reassignment or escalation.

### 2.2 Task State Progression
Harnesses do not mutate SQLite tables directly; they issue `TRANSITION_TASK` commands:
```typescript
interface TransitionTaskPayload {
  readonly taskId: string
  readonly targetState: 'READY' | 'RUNNING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  readonly reason?: string
}
```

### 2.3 Command Idempotency
All harness interactions must provide a deterministically generated `commandId`. The K0 kernel computes a complete semantic fingerprint across `commandType`, `targetAggregateId`, `workSessionId`, `expectedRevision`, and canonicalized payload to guarantee that identical retries succeed without duplicate side effects, while mutated payloads fail closed.

---

## 3. Candidate Execution / Provider Surfaces Inventory

Wave K1 inherits the following candidate execution surfaces discovered during P1/P4 and the post-P8 environment inventory:
1. **Codex CLI**: Local CLI-based harness.
2. **Claude Code CLI**: Local CLI-based harness.
3. **FCC (Fast Code Context)**: Structured code intelligence engine.
4. **Antigravity CLI (`agy`)**: Local extension CLI harness.
5. **Amazon Bedrock**: Cloud foundation model execution surface (`TEMPORARY_PROMOTIONAL_CREDIT_ENTITLEMENT`, AWS Free Plan, zero paid fallback).
6. **OmniRoute**: Local HTTP gateway proxy.

*Notice*: This list represents inventory input only. It is **NOT** a ranking, **NOT** qualification, and **NOT** dispatch authorization.

---

## 4. Sequential Qualification Ladder (Requirement for K1)

Each K1 adapter must strictly adhere to the frozen P1/P3 qualification ladder before autonomous dispatch is authorized:
1. `DISCOVERED`: Binary exists on host filesystem or endpoint configuration identified without secrets.
2. `INSTALLED`: Binary executes cleanly or client transport initializes.
3. `AUTHENTICATED`: Credentials valid; auth probe/ping succeeds without persisting secrets.
4. `REACHABLE`: Network / local IPC latency within threshold.
5. `CAPABILITY_PROBED`: Tool support, structured output, and context limits verified.
6. `CONTAINMENT_TESTED`: Worktree / process isolation verified.
7. `QUALIFIED`: Certified safe for task assignment.
8. `READY`: Dispatch-time operational checks pass for the chosen model/request.

*Readiness Normalization*: CLI/on-demand harnesses execute ephemerally when invoked, whereas daemon harnesses may listen continuously. K1 must normalize harness-specific lifecycle states into the frozen qualification ladder rather than assuming all harnesses are "actively listening daemons".

*Fallback Rule*: A fallback from a preferred harness to a secondary harness must **never** downgrade containment or security guarantees!
