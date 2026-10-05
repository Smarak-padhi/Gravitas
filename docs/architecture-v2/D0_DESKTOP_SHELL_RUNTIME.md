# D0 Desktop Shell Runtime Specification

## 1. Scope and Architectural Intent
Wave D0 implements the foundational Electron desktop shell for GRAVITAS without violating any frozen architectural boundaries established in P0–P8 and K0–K5.

**Core Invariants**:
- `DESKTOP_UI != KERNEL`
- `RENDERER != PRIVILEGED_KERNEL`
- `UI != CANONICAL_STATE`
- `MAIN != CANONICAL_STATE_AUTHORITY`
- `RENDERER_LIFETIME != KERNEL_CANONICAL_LIFETIME`
- `MAIN_PROCESS_CRASH != GUARANTEED_CONTINUOUS_KERNEL_SURVIVAL`

## 2. Process Topology
The runtime strictly enforces a three-tier process topology:
1. **Operating System Layer**: Process management and OS-level resources.
2. **Electron Main (`DesktopSupervisor`)**: Unprivileged supervisor managing application lifecycle, window lifecycle, and spawning the isolated `utilityProcess`.
3. **Headless KernelHost (`utilityProcess`)**: Runs Node.js `utilityProcess` executing `WorkSessionKernel` and SQLite local persistence.
4. **Sandboxed Chromium Renderer (`BrowserWindow`)**: Sandboxed unprivileged projection shell communicating strictly via `contextBridge` preload.

## 3. Protocol Versioning (`d0.1`)
All IPC interactions between Main and KernelHost follow the typed protocol schema:
- `HELLO`: Initial handshake establishing protocol version and environment details.
- `HEALTH_REQUEST` / `HEALTH_RESPONSE`: Heartbeat and liveness checks.
- `SNAPSHOT_REQUEST` / `SNAPSHOT_RESPONSE`: Read-only projection extraction.
- `SHUTDOWN_REQUEST` / `SHUTDOWN_ACK`: Clean lifecycle termination.
- `KERNEL_ERROR`: Structural error encapsulation.
