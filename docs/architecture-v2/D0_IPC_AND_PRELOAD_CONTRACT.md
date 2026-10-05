# D0 IPC and Preload Bridge Contract

## 1. Secure Preload Exposure
The renderer context does NOT receive raw `ipcRenderer` or Node.js built-ins.
It receives only the `window.gravitasDesktop` bridge object via `contextBridge.exposeInMainWorld`:
```typescript
export interface GravitasDesktopBridge {
  getHealth(): Promise<HealthProjection>
  getSnapshot(): Promise<DesktopKernelSnapshot>
  onKernelStatus(callback: (status: KernelLifecycleStatus) => void): () => void
  onKernelError(callback: (err: SafeDesktopError) => void): () => void
}
```

## 2. Strict Read-Only Projection Boundary
The preload bridge exposes ONLY read-only and subscription methods:
- `getHealth()`: Queries `DesktopSupervisor.getHealth()`. Returns a projection clone (`HealthProjection`).
- `getSnapshot()`: Queries `DesktopSupervisor.getSnapshot()`. Returns a projection clone (`DesktopKernelSnapshot`).
- `onKernelStatus(callback)`: Subscribes to status update events pushed from Main via `gravitas:kernel-status`.
- `onKernelError(callback)`: Subscribes to safe error events pushed from Main via `gravitas:kernel-error`.

There is NO `dispatch`, NO `execute`, NO `run`, NO `sendPrompt`, NO `sendCommand`, NO `invokeTool`, NO `invokeHarness`, NO `createGrant`, and NO `mutateKernel` API exposed to the renderer or preload bridge.

## 3. Projection Immutability
All responses from the bridge are plain JSON data clones. Modifying objects in the renderer has zero effect on the internal kernel state.
