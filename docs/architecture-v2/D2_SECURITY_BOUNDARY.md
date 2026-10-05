# D2 Security Boundary & Authority Audit Specification

## 1. Process Sandboxing & Zero Privilege Expansion
Wave D2 preserves all security controls established in D0 and D1:
- `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`.
- Strict Content Security Policy (`connect-src 'none'`).
- Preload bridge exposes only allowlisted typed methods. The only additions for D2 are:
  - `requestHideWindow(): Promise<void>`
  - `requestQuitApplication(): Promise<void>`
- Zero raw Electron objects (`Tray`, `Menu`, `nativeImage`, `BrowserWindow`, `ipcRenderer`, `app`, `shell`) are exposed to the renderer context.

## 2. No OS Services & No Autostart
- `AUTO_START_ENABLED = NO`: No calls to `app.setLoginItemSettings`, no Windows Task Scheduler (`schtasks`) jobs, and no Windows Registry `Run` keys.
- `OS_SERVICE_INSTALLED = NO`: Zero Windows Service creation (`sc.exe`, `New-Service`).

## 3. Single Instance Policy
- `SINGLE_INSTANCE_POLICY = IMPLEMENTED`: Evaluated via `app.requestSingleInstanceLock()`.
- If a secondary instance is launched, it receives `false` from `requestSingleInstanceLock()` and exits immediately.
- The primary instance catches the `'second-instance'` event, restores the existing Command Center window, and focuses it. Zero duplicate Kernel processes are created.

## 4. Local Desktop Notification Decision
- `LOCAL_NOTIFICATION_SUPPORT = DEFERRED_WITH_REASON`:
  - **Reason**: Background continuity and operator awareness are fully satisfied by system tray status tooltips and menu inspection. Adding local notifications in D2 would expand attack surface without increasing operational safety.
  - Notifications remain strictly deferred to a future wave if human-attention audio/visual chimes are explicitly requested.
