# D1 Command Center Runtime Architecture Specification

## 1. Scope and Architectural Intent
Wave D1 implements the GRAVITAS desktop Command Center on top of the frozen Wave D0 Electron foundation and frozen K0–K5 Kernel without moving canonical authority into Electron, the renderer, or UI state.

**Foundational Invariants**:
- `DESKTOP_UI != KERNEL`
- `RENDERER != PRIVILEGED_KERNEL`
- `UI != CANONICAL_STATE`
- `MAIN != CANONICAL_STATE_AUTHORITY`
- `RENDERER_LIFETIME != KERNEL_CANONICAL_LIFETIME`
- `MAIN_PROCESS_CRASH != GUARANTEED_CONTINUOUS_KERNEL_SURVIVAL`
- `RENDERER = PROJECTION + BOUNDED_OPERATOR_INTENT`
- `WORKER_SUCCESS != VERIFIED_SUCCESS`
- `TOOL_SUCCESS != VERIFIED_SUCCESS`
- `SUPERVISOR_ACCEPTANCE != VERIFIED_SUCCESS`
- `VERIFIER != APPROVER`
- `VERIFICATION_PASS != HUMAN_APPROVAL`
- `HUMAN_APPROVAL != MERGE_AUTHORIZATION`
- `HUMAN_APPROVAL != DEPLOY_AUTHORIZATION`
- `HUMAN_APPROVAL != RELEASE_AUTHORIZATION`

## 2. Multi-Process Topology & Boundary Isolation
The D1 runtime preserves the 3-process architecture established and proven in D0:

```
+-------------------------------------------------------------+
|                      Host OS (Windows 11)                   |
+-------------------------------------------------------------+
                              |
       +----------------------+----------------------+
       |                                             |
+--------------------------------+       +------------------------------------+
|  Electron Main (PID: Main)     |       |  Chromium Renderer (PID: Renderer) |
|  DesktopSupervisor             |       |  Command Center Shell              |
|  - Window Lifecycle            |  IPC  |  - Sandbox: true, NodeIntegration: |
|  - Process Spawning            |<----->|    false, ContextIsolation: true  |
|  - Channel Mediation           |       |  - CSP: default-src 'none'; ...    |
|  - Offline Degraded Projection |       |  - UI != CANONICAL STATE           |
+--------------------------------+       +------------------------------------+
               ^
               | MessagePort IPC (Typed Protocol d1.0)
               v
+---------------------------------------------+
|  Node.js utilityProcess (PID: Kernel)       |
|  KernelHost Engine                          |
|  - PID != Main PID                          |
|  - Holds Single Canonical WorkSessionKernel |
|  - Holds SQLite Database Connection         |
|  - Produces Projections Directly from K0..K5|
|  - Evaluates Bounded Operator Intents       |
+---------------------------------------------+
```

1. **Chromium Renderer**: Sandboxed browser process (`sandbox: true`, `nodeIntegration: false`, `contextIsolation: true`). Contains zero Node.js runtime bindings, zero SQLite access, and zero shell execution ability. All UI interaction is restricted to querying read-only projections and emitting structured operator intents.
2. **Electron Main (`DesktopSupervisor`)**: Unprivileged coordinator. Manages the BrowserWindow lifecycle, launches the Kernel utility process, proxies IPC messages across the context boundary, and provides safe offline fallback projections if the Kernel is unavailable or stopped. Main process has no direct authority to mutate Kernel state independently.
3. **Node.js KernelHost (`utilityProcess`)**: Isolated headless Node.js process owning the single-writer connection to `WorkSessionKernel`. Executes entirely decoupled from the renderer lifecycle. When the renderer is refreshed or crashes, the Kernel process remains running, and all session state remains intact.

## 3. Protocol Versioning (`d1.0`)
D1 introduces version `'d1.0'`, which extends and maintains backward compatibility with `'d0.1'`.
The typed protocol covers:
- **Handshake**: `HELLO` / `READY` exchange establishing PID separation, protocol version, and subsystem capabilities.
- **Health**: `HEALTH_REQUEST` / `HEALTH_RESPONSE` heartbeat probes.
- **Projections**:
  - `GET_OVERVIEW_REQUEST` / `GET_OVERVIEW_RESPONSE`
  - `GET_WORK_HIERARCHY_REQUEST` / `GET_WORK_HIERARCHY_RESPONSE`
  - `GET_TASK_DETAIL_REQUEST` / `GET_TASK_DETAIL_RESPONSE`
  - `GET_EXECUTION_REQUEST` / `GET_EXECUTION_RESPONSE`
  - `GET_VERIFICATION_REQUEST` / `GET_VERIFICATION_RESPONSE`
  - `GET_APPROVAL_QUEUE_REQUEST` / `GET_APPROVAL_QUEUE_RESPONSE`
  - `GET_SYSTEM_REQUEST` / `GET_SYSTEM_RESPONSE`
  - `GET_ACTIVITY_REQUEST` / `GET_ACTIVITY_RESPONSE`
- **Operator Intents**:
  - `OPERATOR_INTENT_REQUEST` / `OPERATOR_INTENT_RESPONSE`
- **Events**:
  - `PROJECTION_UPDATED` notification broadcast to subscribed renderers upon canonical state change.
- **Lifecycle**:
  - `SHUTDOWN_REQUEST` / `SHUTDOWN_ACK` clean exit negotiation.

## 4. The 6 Primary Command Center Surfaces
1. **Overview Surface**: High-level telemetry of the active environment: kernel status, active work sessions count, pending human approvals count, and recent chronological activity feed.
2. **Work Hierarchy Surface**: Canonical tree projection mapping `WorkSession` -> `WorkSessionRun` -> `WorkSessionTask`, displaying run status (`PENDING`, `RUNNING`, `SUCCEEDED`, `CANCELLED`) and task state without UI-side fabrication.
3. **Execution Surface**: Forensic visibility into K1/K2/K3 execution cycles: Role assignments, Executor leases, Harness selections, tool executions, mutation diff summaries, execution costs, and tokens consumed.
4. **Verification Surface**: Complete K5 epistemological verification audit: criteria pre-binding, verification plan status, evidence manifests, negative and positive evidence preservation, falsification suite results, and immutable report digests.
5. **Approvals Surface**: Sovereign Human-Gate Inbox: enumerates all tasks awaiting human authorization. Displays criteria, verification verdicts (`VERIFIED_PASS`, `VERIFIED_FAIL`, etc.), expected revisions, and provides explicit, bounded Approve and Reject controls.
6. **System Surface**: Diagnostics and environment telemetry: Main PID, Kernel PID, PID distinction proof, Electron and Node versions, protocol version, memory consumption, and supervisor status.

## 5. Lifecycle and Resilience
- **Renderer Reload**: Reloading the renderer (`webContents.reload()`) does not restart or interrupt the Kernel. Kernel PID remains stable, and the UI reconstructs completely from canonical Kernel projections upon reload.
- **Controlled Shutdown**: Closing the shell or issuing a shutdown request sends `SHUTDOWN_REQUEST` to the KernelHost. The Kernel flushes state, acknowledges via `SHUTDOWN_ACK`, and exits cleanly. Zero orphan utility processes remain.
