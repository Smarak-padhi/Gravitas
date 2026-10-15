# GRAVITAS 2.0 — Security Issues Log & Execution Boundary Hardening
**Milestone:** Telemetry Codex Baseline / Pre-Autonomous Execution Gate  
**Date:** October 16, 2026  
**Status:** Open / Requires Remediation Before Expanding Agent Execution  

---

## Overview

In accordance with owner directives from the Phase 05.6 acceptance gate, autonomous project-writing and untrusted tool capabilities remain strictly disabled. The following three critical security issues have been logged and formally scheduled for remediation prior to authorizing broader agent execution or expanding agent capability sets.

---

### Issue SEC-01: Missing-Context Authorization Bypass Vulnerability

- **Severity:** High
- **Category:** Authorization / Access Control / Fail-Closed Enforcement
- **Description:**  
  When an authorization check or grant verification routine is invoked without complete context (e.g., null target path, undefined operation name, missing project ID, or uninitialized workspace directory), evaluation logic must never assume safe defaults or allow pass-through execution.
- **Current State:**  
  While `verifyGrantImmediate` in `ApprovalAuthority.ts` verifies HMAC signatures and validates expiration, missing fields in partial callers could theoretically result in ambiguous permission checks if an unvalidated capability is dispatched.
- **Required Remediation:**  
  Enforce strict schema validation and fail-closed behavior on all authorization contexts:
  1. Every capability invocation must supply an explicit, non-null `TargetContext` containing `{ projectId, absolutePath, operation, revisionId, timestamp }`.
  2. Any missing or malformed field must immediately throw `SecurityAuthorizationError` with code `ERR_AUTH_CONTEXT_INCOMPLETE`.
  3. Deny-by-default must be strictly asserted at the runtime execution boundary before any capability handler is triggered.

---

### Issue SEC-02: Arbitrary Action Callback Capability

- **Severity:** High
- **Category:** Code Execution Boundary / Unsafe Callback Invocation
- **Description:**  
  Action callbacks registered across agent event boundaries or dispatched via tool execution handlers must not permit execution of caller-supplied function references, dynamic code evaluation, or arbitrary method invocation.
- **Current State:**  
  The agent event bus and UI dispatcher allow event payloads with arbitrary data fields. If an untrusted tool or LLM-generated plan were to inject a callback function reference into an action queue, executing it could lead to arbitrary code execution in the renderer or main process.
- **Required Remediation:**  
  1. Restrict all cross-boundary actions to an immutable, strongly-typed enum of approved action identifiers (`APPROVED_ACTION_REGISTRY`).
  2. Forbid passing function pointers, lambda closures, or executable strings across IPC or event buses; serialize all actions strictly as plain JSON data payloads.
  3. Validate action arguments against rigid allowlists before dispatching to system services.

---

### Issue SEC-03: Revocation-Continue Mid-Execution Behavior

- **Severity:** High
- **Category:** Grant Lifecycle / Mid-Stream Revocation Handling
- **Description:**  
  When an owner revokes an authorization grant while a multi-step or batched capability operation is in progress, subsequent sub-steps must not continue based on a previously evaluated grant check.
- **Current State:**  
  Prior to Phase 05.6 hardening, validation was performed at the start of a transaction. While immediate pre-mutation checks were introduced in Phase 05.6, batched or pipelined capability tasks could still theoretically race if state revocation is not checked synchronously between consecutive mutating atomic operations.
- **Required Remediation:**  
  1. Assert synchronous re-verification of the grant's active status in `.gravitas/secure/approval-registry.json` before *every* individual atomic filesystem or process mutation.
  2. Implement an in-memory revocation bus with cancellation tokens that immediately aborts any in-flight execution pipelines if a `GRANT_REVOKED` signal is received.
  3. Ensure that an aborted pipeline rolls back any temporary uncommitted state cleanly and logs an audit record to SQLite WAL.

---

## Remediation Roadmap

These three issues must be resolved and backed by adversarial unit and integration tests before:
1. Enabling autonomous project writing or refactoring capabilities.
2. Granting shell execution permissions to any agent.
3. Expanding specialist mascot capabilities beyond read-only study assistance and interactive discovery.
