# ADR 0003: Local Control Plane HTTP API and Live Event Stream

**Status**: Accepted  
**Date**: 2026-09-19  
**Scope**: `@gravitas/server` and `@gravitas/core`  

---

## 1. Context

Waves 1–4 proved deterministic task state machines, isolated Git worktree management, safe worker harness adapters, and independent verification with cryptographic evidence manifests.

However, these capabilities were accessible only as direct in-process TypeScript module calls. To prepare for the future Gravitas Command Center frontend and local CLI tools, Gravitas required a lightweight, trustworthy, local-only backend boundary.

---

## 2. Decision

We introduce `@gravitas/server` (`apps/server/`), establishing a local HTTP control plane and live event stream with the following architectural invariants:

1. **Zero-Dependency Native HTTP Server**:
   - Built on Node.js native `node:http`. Avoids heavy backend frameworks (Express, Fastify, Nest) to maintain zero vulnerabilities, fast startup, and complete control over TCP connections and sockets.
   - Default network binding is strictly loopback: `127.0.0.1` (never `0.0.0.0`). Prevents LAN exposure without explicit operator intent.
   - Tests bind to port `0` (ephemeral port) to ensure complete test isolation and avoid port collisions.

2. **Unidirectional Live Stream via Server-Sent Events (SSE)**:
   - Live event updates are delivered via `GET /api/v1/events` (`Content-Type: text/event-stream`).
   - SSE avoids WebSocket complexity, handshake overhead, and bidirectional state synchronization issues.
   - Closed client sockets are automatically unregistered from the active subscriber set, guaranteeing zero memory leaks.

3. **In-Memory Volatile Registry**:
   - Stores runs, execution contracts, tasks, evidence references, mutations, and verification results in centralized in-memory structures.
   - Bounded recent event history (FIFO capacity 1000) avoids unbounded memory growth.
   - **Explicit limitation**: State is non-persistent; server restarts clear all registry data.

4. **Human Approval Authority & Invariant Preservation**:
   - `POST /api/v1/runs/:runId/tasks/:taskId/approve` and `POST /api/v1/runs/:runId/tasks/:taskId/reject` are valid **only** when the task state is `WAITING_APPROVAL`.
   - Any attempt to approve a task that is not in `WAITING_APPROVAL` (such as `FAILED` or `RUNNING`) returns `409 Conflict`.
   - `APPROVED` remains strictly a human/API action; agent workers can never mark themselves approved.

5. **Path Traversal Protection on Evidence**:
   - Evidence lookups (`GET /api/v1/runs/:runId/tasks/:taskId/evidence`) resolve strictly through registry-controlled references stored during verification.
   - No arbitrary filesystem paths or file download endpoints exist, completely neutralizing path traversal attacks.

6. **Bounded Request Payloads & Sanitized Error Envelopes**:
   - Request bodies are strictly capped at 256 KiB (`413 Payload Too Large`).
   - Error responses follow a standard envelope `{ error: { code, message, requestId } }`.
   - Absolute host paths, stack traces, and environment variables are strictly suppressed from all API responses.

---

## 3. Consequences

- Future clients (CLI, Command Center UI) can interact with Gravitas using standard REST and SSE protocols.
- Automated tests run with zero external AI / network provider dependencies through dependency injection.
- Production persistence and authentication remain deferred to future waves.
