# D0 Desktop Process Model & Lifecycle

## 1. Process Separation
- **Main Process PID**: Distinct operating system process (`process.pid`).
- **Kernel Process PID**: Distinct operating system process (`utilityProcess.pid`).
- **Renderer Process PID**: Distinct Chromium sandboxed renderer process.

## 2. Lifecycle Invariants
- Destruction or reloading of `BrowserWindow` does NOT terminate `utilityProcess`.
- Kernel survival across renderer restarts is proven via live Electron tests.
- Single-instance lock (`app.requestSingleInstanceLock`) prevents multiple supervisors from conflicting over local kernel storage.
