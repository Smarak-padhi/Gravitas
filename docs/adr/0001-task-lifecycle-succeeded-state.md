# ADR 0001: Introduction of `SUCCEEDED` State in Task FSM

**Status**: Accepted  
**Date**: 2026-09-18  
**Scope**: `@gravitas/core` domain model  

---

## 1. Context

In Phase 0, the task lifecycle specified nine states:
`PLANNED`, `BLOCKED`, `READY`, `RUNNING`, `VERIFYING`, `WAITING_APPROVAL`, `APPROVED`, `FAILED`, `CANCELLED`.

The core invariant of Gravitas is:
> **AN AGENT CLAIM IS NEVER PROOF OF COMPLETION.**
> Worker output such as "done", "tests pass", or "looks correct" must never transition a task to VERIFIED or DONE. Verification must originate outside the worker execution.

Furthermore, `APPROVED` is defined strictly as an explicit human authorization to integrate or accept work.

---

## 2. Problem

When executing multi-task DAGs (for example, `INSPECT -> IMPLEMENT -> VERIFY -> INTEGRATE`), an internal task (e.g., `INSPECT`) finishes execution and independent verification confirms its output is valid.

Under the 9-state model, there was no valid terminal state for that completed internal task:
1. **If it transitions to `WAITING_APPROVAL`**: The entire pipeline deadlocks waiting for a human to approve internal steps (like AST analysis or repository inspection), leading to severe human fatigue and blocking automated multi-step pipelines.
2. **If it transitions automatically to `APPROVED`**: The orchestrator violates its own core invariant: `APPROVED` is cheapened to mean "verifier finished", destroying the audit guarantee that human approval is required for `WAITING_APPROVAL -> APPROVED`.
3. **If it stays in `VERIFYING`**: The task is never terminal, meaning downstream tasks depending on task completion cannot distinguish "currently running verification" from "verified and done".

---

## 3. Decision

We introduce exactly one minimal successful terminal task state:
**`SUCCEEDED`**.

The task lifecycle now comprises 10 states:
`PLANNED`, `BLOCKED`, `READY`, `RUNNING`, `VERIFYING`, `WAITING_APPROVAL`, `APPROVED`, `SUCCEEDED`, `FAILED`, `CANCELLED`.

### Transition Semantics
1. **Automated / Intermediate Tasks (`requiresApproval: false` / default)**:
   `VERIFYING -> SUCCEEDED`  
   When independent verification succeeds, the task enters `SUCCEEDED` (terminal).
2. **Human-Gated Tasks (`requiresApproval: true`)**:
   `VERIFYING -> WAITING_APPROVAL -> APPROVED`  
   When independent verification succeeds, the task pauses in `WAITING_APPROVAL` until explicit human approval triggers `APPROVED` (terminal).
3. **Dependency Satisfaction**:
   Downstream tasks by default accept either `['SUCCEEDED', 'APPROVED']` as satisfying their dependency (`DEFAULT_SATISFYING_STATES`). Individual dependency edges can customize this if an upstream in-progress state is required.

---

## 4. Consequences

- **Positive**: Complete separation between automated task completion (`SUCCEEDED`) and human governance (`APPROVED`).
- **Positive**: Internal tasks progress through the DAG without artificial human deadlocks.
- **Positive**: The core invariant is completely preserved: an agent claim never marks a task `SUCCEEDED` or `APPROVED` — only the independent verifier transitions to `SUCCEEDED` or `WAITING_APPROVAL`, and only an authorized human can transition `WAITING_APPROVAL -> APPROVED`.
- **Negative**: Adds one state to the state enum (10 states instead of 9). The FSM transition matrix and terminal state sets have been updated and verified with 136 automated tests.
