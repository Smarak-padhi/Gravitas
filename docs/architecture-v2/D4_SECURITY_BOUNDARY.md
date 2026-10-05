# D4 Security Boundary & Sandboxing

## 1. Process Sandboxing & Isolation

- **Renderer Process**: Executed under Electron `sandbox: true`, `contextIsolation: true`, and `nodeIntegration: false`. No raw Node.js primitives (`process`, `require`, `fs`, `child_process`) are reachable from the renderer.
- **Kernel Process**: Executed in a separate Node.js `utilityProcess` host.
- **Preload API**: Bounded IPC via `contextBridge.exposeInMainWorld('gravitas', ...)`. Role-bot interactions only invoke selection methods.

## 2. Zero-Authority Projection Guarantee

Visual Role-Bots have:
1. **Zero State Mutation Authority**: Selecting a bot emits an event to local UI state for display in the inspector card. No IPC mutations or kernel commands are sent.
2. **Zero Capability Grant Surface**: Cannot grant, revoke, or modify capability tokens.
3. **Zero Approval Sovereignty**: Cannot bypass human gates or trigger autonomous approval.
4. **Zero Code Execution**: Bots do not run scripts, spawn shells, or execute tools.

## 3. Input Sanitization
All text fields originating from kernel data or task definitions are rendered strictly using `element.textContent`, preventing DOM-based XSS attacks.
