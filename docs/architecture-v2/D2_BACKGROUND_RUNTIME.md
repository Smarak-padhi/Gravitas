# D2 Background Runtime Specification

## 1. Scope & Architectural Intent
Wave D2 implements background and system tray desktop operation for GRAVITAS without violating any frozen architectural boundaries established in P0–P8, K0–K5, and D0–D1.

**Governing Invariants**:
- `WINDOW_LIFETIME != KERNEL_LIFETIME`
- `MAIN_PROCESS_CRASH != GUARANTEED_CONTINUOUS_KERNEL_SURVIVAL`
- `TRAY_STATUS != CANONICAL_STATE`
- `DESKTOP_UI != KERNEL`
- `RENDERER != PRIVILEGED_KERNEL`
- `UI != CANONICAL_STATE`
- `MAIN != CANONICAL_STATE_AUTHORITY`
- `AUTO_MERGE = DISABLED`
- `AUTO_PUSH = DISABLED`
- `AUTO_RELEASE = DISABLED`
- `AUTO_DEPLOY = DISABLED`

## 2. Multi-Process Lifecycle Architecture
The D2 runtime preserves the three-tier multi-process topology proven in D0 and D1:
1. **Operating System Layer**: Windows 11 host process environment.
2. **Electron Main (`DesktopSupervisor`)**:
   - Owns application lifecycle.
   - Owns system tray lifecycle (`Tray`, `Menu`, `nativeImage`).
   - Spawns and supervises the isolated Node.js `utilityProcess` hosting `WorkSessionKernel`.
   - Manages Command Center `BrowserWindow` visibility.
3. **KernelHost (`utilityProcess`)**:
   - Single canonical writer connection to `WorkSessionKernel` and local SQLite persistence.
   - Independent process lifetime: continues running uninterrupted when the Command Center window is hidden or destroyed.
4. **Command Center Renderer (`BrowserWindow`)**:
   - Unprivileged sandboxed Chromium window.
   - Closing the window triggers a hide action (`WINDOW_HIDDEN`), preserving the running DesktopSupervisor and KernelHost.

## 3. Desktop Lifecycle State Machine
```
   [START]
      │
      ▼
 WINDOW_OPEN ─────────────(Window Close Event)───────────► WINDOW_HIDDEN / BACKGROUND_ACTIVE
      ▲                                                              │
      │                                                              │
      └─────────────────(Tray: Open Command Center)──────────────────┘
                                                              │
                                                   (Tray: Quit GRAVITAS)
                                                              │
                                                              ▼
                                                       QUIT_REQUESTED
                                                              │
                                                              ▼
                                                       KERNEL_STOPPING
                                                              │
                                                              ▼
                                                         APP_EXITING
                                                              │
                                                              ▼
                                                           [EXIT 0]
```

- `WINDOW_OPEN`: Command Center is visible and focused.
- `WINDOW_HIDDEN`: Window is hidden to background; DesktopSupervisor and KernelHost remain active.
- `BACKGROUND_ACTIVE`: Canonical Kernel tasks continue execution without active presentation window.
- `QUIT_REQUESTED`: Operator explicitly selected "Quit GRAVITAS" from Tray menu.
- `KERNEL_STOPPING`: Supervisor dispatched `SHUTDOWN_REQUEST` to KernelHost and awaits `SHUTDOWN_ACK`.
- `APP_EXITING`: Kernel cleanly flushed and terminated; Tray destroyed; Electron exits with code 0.
