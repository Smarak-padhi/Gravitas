# TECHNICAL DEBT AND RISKS REGISTER

**Wave:** P2 — Current Backend Forensics  
**Status:** COMPLETE / RISK REGISTER ESTABLISHED  
**Date:** 2026-09-30  
**Repository Branch:** `feat/v0-golden-loop`  
**Git Commit Baseline:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariant:** `ROLE ≠ EXECUTOR ≠ HARNESS ≠ MODEL ≠ PROVIDER ≠ GATEWAY ≠ PROCESS`

---

## 1. Risk Categorization Summary

| Severity | Count | Summary |
| :--- | :--- | :--- |
| **CRITICAL** | 2 | In-memory control plane persistence loss; Single global harness coupling. |
| **HIGH** | 5 | Absence of OS-level process containment; Missing autonomous planner; Incomplete final run integration; Multi-parent cherry-pick fragility; Absent `node_modules` on disk. |
| **MEDIUM** | 3 | Agent spec divergence (25 specs vs 5 roles); Windows process termination edge cases; Large output stream truncation. |
| **LOW** | 2 | Living HQ 3D diorama rendering overhead; Gateway direct-fallback silent bypass. |

---

## 2. Exhaustive Analysis of CRITICAL and HIGH Findings

### TD-01: In-Memory Control Plane Volatility (CRITICAL)
- **Concrete Consequence**: Any process crash, server restart, or system reboot completely erases all active and historical runs, task execution statuses, contracts, evidence references, verifications, and event history.
- **Current Reachability**: Immediately reachable. Affects every execution of the server control plane.
- **Affected Subsystem**: `apps/server/src/registry.ts` (`InMemoryRegistry`), `apps/server/src/service.ts`.
- **Source Evidence**: `InMemoryRegistry` stores entities in private memory maps (`private readonly runs = new Map<string, Run>()`). It bears the explicit declaration: `In-memory only. Server restarts clear state.`
- **Security vs. Reliability vs. Architecture Impact**:
  - *Reliability*: Catastrophic state loss; active runs cannot be resumed or audited after an unexpected termination.
  - *Architecture*: Directly contradicts the Desktop Operating System objective requiring durable session state across reboots.
- **Runtime Scope**: Affects both current runtime operation and future intended deployment.

### TD-02: Single Global Harness Coupling — Invariant Violation (CRITICAL)
- **Concrete Consequence**: Tasks cannot be routed to specialized role executors or diverse model providers. All roles (strategy planner, frontend engineer, backend engineer, independent reviewer, integration engineer) execute through the single CLI harness configured on the server.
- **Current Reachability**: Directly reachable on every task execution dispatch.
- **Affected Subsystem**: `apps/server/src/index.ts:57`, `apps/server/src/service.ts:162`, `packages/orchestrator/src/scheduler.ts:746`.
- **Source Evidence**:
  - `apps/server/src/index.ts:57` defaults to `new FreeClaudeCodeHarness()`.
  - `RunService` accepts a single `harness?: AgentHarness` in its constructor.
  - `BoundedScheduler` executes all tasks via `this.harness.execute(...)` (`scheduler.ts:746`), ignoring `task.role` for harness selection.
- **Security vs. Reliability vs. Architecture Impact**:
  - *Architecture*: Direct violation of the fundamental program invariant: `ROLE ≠ EXECUTOR ≠ HARNESS ≠ MODEL ≠ PROVIDER ≠ GATEWAY ≠ PROCESS`.
  - *Reliability*: Single point of failure; if the default harness is unqualified or offline, the entire multi-agent workflow halts.
- **Runtime Scope**: Affects both current runtime operation and future intended deployment.

### TD-03: Lack of Autonomous LLM Planner (HIGH)
- **Concrete Consequence**: The system cannot autonomously take a high-level user goal ("Implement feature X") and decompose it into an execution DAG of tasks. The caller must manually specify the task graph, or the server executes a single dummy task.
- **Current Reachability**: Directly reachable whenever `POST /api/v1/runs` is invoked without client-provided `tasks` or `plan`.
- **Affected Subsystem**: `apps/server/src/service.ts:380-410` (`createRun`).
- **Source Evidence**: In `service.ts:383-398`, if tasks are omitted, the server falls back to:
  ```typescript
  const defaultTaskId = `task_${Date.now()}_${randomUUID().slice(0, 8)}`
  initialTasks.push({ id: defaultTaskId, title: 'Execute Goal', objective: goal, ... })
  ```
  No LLM prompt or reasoning engine is invoked to decompose goals into tasks.
- **Security vs. Reliability vs. Architecture Impact**:
  - *Architecture*: Leaves a core capability gap between user intent and multi-agent coordination.
  - *Reliability*: Reduces the multi-agent system to a single-agent executor unless external tooling supplies the plan.
- **Runtime Scope**: Affects current runtime capability and blocks autonomous multi-agent workflows.

### TD-04: Incomplete Final Run Integration (Stranded Task Commits) (HIGH)
- **Concrete Consequence**: Changes produced by verified, approved tasks are committed to isolated task branches (`gravitas/run_<runId>/task_<taskId>`), but are never integrated, merged, or rebased into `baseBranch`. At run completion, code changes remain stranded in Git history.
- **Current Reachability**: Directly reachable upon completion of every successful run.
- **Affected Subsystem**: `packages/orchestrator/src/composition.ts:40`, `packages/orchestrator/src/scheduler.ts:1012-1080`, `apps/server/src/service.ts:630-636`.
- **Source Evidence**:
  - `materializeVerifiedResult` runs `git commit -m "gravitas: verified result <taskId>"` within the isolated task worktree.
  - When all tasks complete, `service.executeRun` updates the run status to `COMPLETED`, publishes `run.completed`, and deletes the scheduler instance (`service.ts:631-633`).
  - No code exists to merge the final task commit into `baseBranch` or open a PR.
- **Security vs. Reliability vs. Architecture Impact**:
  - *Architecture*: Breaks the end-to-end delivery promise; requires manual operator intervention to retrieve results from Git branches.
  - *Reliability*: Orphaned branch heads can accumulate without human awareness.
- **Runtime Scope**: Affects current runtime and future operation.

### TD-05: Absence of OS-Level Process Containment for Harnesses (HIGH)
- **Concrete Consequence**: Spawned harness subprocesses run with the privileges of the host user account. A buggy or malicious worker script could read or modify files, install software, or access network endpoints outside the worktree.
- **Current Reachability**: Directly reachable on every harness invocation.
- **Affected Subsystem**: `packages/harnesses/src/process.ts:60`, `packages/agents/src/grants.ts:85`.
- **Source Evidence**:
  - `CapabilityGrantManager.requestGrant` verifies capability tokens in memory as metadata.
  - `runSubprocess` launches `child_process.spawn` directly. No GRAVITAS-enforced OS-level sandbox or containment boundary was identified for spawned harness subprocesses; their effective authority inherits the launching environment except where externally constrained.
  - `captureWorktreeMutation` only detects unauthorized path modifications post-hoc after execution has finished.
- **Security vs. Reliability vs. Architecture Impact**:
  - *Security*: Host vulnerability; absence of kernel-enforced sandboxing violates least-privilege principles.
  - *Architecture*: Pre-flight capability grants provide policy metadata, not operational containment.
- **Runtime Scope**: Affects current runtime security posture and future multi-agent autonomy.

### TD-06: Multi-Parent Git Composition Cherry-Pick Fragility (HIGH)
- **Concrete Consequence**: Tasks that depend on multiple upstream tasks (e.g., diamond DAGs) are composed by sequential Git cherry-picks. Any cherry-pick conflict causes immediate task failure with zero automated semantic reconciliation.
- **Current Reachability**: Directly reachable on any DAG containing multi-parent dependencies.
- **Affected Subsystem**: `packages/orchestrator/src/composition.ts:125-176` (`composeTaskWorktree`).
- **Source Evidence**: `composeTaskWorktree` branches from `parentCommitShas[0]`, then loops through subsequent parents calling `git cherry-pick <sha>`. If exit code is non-zero, it executes `git cherry-pick --abort`, deletes the worktree, and throws `CompositionConflictError`.
- **Security vs. Reliability vs. Architecture Impact**:
  - *Reliability*: High rate of false-positive task failures during non-conflicting parallel branch merges.
  - *Architecture*: Lacks a three-way merge or reconciliation engine.
- **Runtime Scope**: Affects current runtime for multi-parent DAGs.

### TD-07: Missing Workspace Node Modules & Build Artifacts (HIGH)
- **Concrete Consequence**: Unit tests, type checks, and application execution cannot be run directly in the repository environment without installing packages.
- **Current Reachability**: Immediate across the entire repository.
- **Affected Subsystem**: Repository root, workspace manifests.
- **Source Evidence**: `node_modules/` is absent on disk.
- **Security vs. Reliability vs. Architecture Impact**:
  - *Reliability*: Precludes live regression testing and verification until dependency installation is authorized and executed.
- **Runtime Scope**: Affects current verification capability.

---

## 3. Medium & Low Severity Findings

### TD-08: Agent Specification Divergence (25 Specs vs 5 Core Roles) (MEDIUM)
- **Component**: `gravitas-agent-specs/agents/` vs `packages/core/src/roles.ts`
- **Impact**: 20 out of 25 documented agent specs (e.g., Study Coach, Outreach Assistant) are not represented in the core TypeScript role enum `AgentRoleId`. They are dead documentation relative to the runtime engine.
- **Remedy**: Reconcile taxonomy in Phase P3.

### TD-09: Windows Process Termination Edge Cases (MEDIUM)
- **Component**: `packages/harnesses/src/process.ts:180-220` (`killProcessTree`)
- **Impact**: Relies on `taskkill.exe /PID <pid> /T /F`. Detached daemons or processes spawned with elevated tokens may escape termination.
- **Remedy**: Adopt Windows Job Objects in Phase P7/K.

### TD-10: Large Output Stream Truncation (MEDIUM)
- **Component**: `packages/harnesses/src/process.ts:35` (`DEFAULT_MAX_OUTPUT_BYTES = 512 * 1024`)
- **Impact**: Output exceeding 512KB is sliced with `... [output truncated]`, potentially discarding critical compiler error messages.
- **Remedy**: Stream full raw logs to disk in Phase P4/K.

### TD-11: Living HQ 3D Diorama Performance Overhead (LOW)
- **Component**: `apps/web/src/hq3d/`
- **Impact**: Three.js WebGL diorama continuously renders character locomotion and station animations, consuming GPU/CPU even during idle state.
- **Remedy**: Add frame throttling and background tab pausing.

### TD-12: Gateway Direct-Fallback Silent Bypass (LOW)
- **Component**: `packages/gateways/src/router.ts:72`
- **Impact**: When gateway routing is configured but fails, direct transport fallback occurs without prominent operator notification.
- **Remedy**: Emit high-severity system alert events on gateway fallback.

---

## 4. Wave P2 Forensic Sign-Off

The technical debts identified above represent accurate, source-verified forensic findings of the current GRAVITAS codebase as of commit `516e01c82cb4c3afd1080e72e68a4e1e56687335`. No implementation changes were introduced in Wave P2.
