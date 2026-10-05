# D2 System Tray Contract & Surface Boundaries

## 1. Principles of Tray Ownership
The system tray is owned and managed exclusively by the Electron Main Process (`DesktopSupervisor`).

**Invariants**:
- `RENDERER_OWNS_TRAY = NO`: The Chromium renderer context has zero handle or access to `Tray`, `Menu`, or `nativeImage`.
- `TRAY_STATUS != CANONICAL_STATE`: Tray status is a passive read-only projection derived from `DesktopSupervisor.getHealth()`.
- `TRAY_CANNOT_APPROVE = YES`: The tray surface has zero capability to record human decisions, execute tools, create capability grants, or trigger downstream deployments.
- `NO_HIGH_AUTHORITY_ACTIONS = YES`: All high-authority operational decisions require opening the full Command Center.

## 2. Minimal Tray Menu Structure
The tray context menu exposes strictly bounded lifecycle navigation:

```
+-----------------------------------+
|  Open Command Center              |
|  -------------------------------  |
|  Kernel Status: READY (disabled)  |
|  -------------------------------  |
|  Quit GRAVITAS                    |
+-----------------------------------+
```

1. **`Open Command Center`**: Calls `restoreCommandCenter()`, displaying and focusing the `BrowserWindow` and triggering a fresh projection update (`OVERVIEW`).
2. **`Kernel Status: <STATUS>`**: Non-clickable informational label displaying the current supervisor lifecycle status (`STARTING`, `READY`, `DEGRADED`, `OFFLINE`, `STOPPED`).
3. **`Quit GRAVITAS`**: Initiates controlled application shutdown (`quitDesktopApp()`).

## 3. Secret Redaction & Untrusted Content Containment
- **Zero Raw Secrets**: Tooltips and menu labels never include raw API keys, bearer tokens, or sensitive credentials. Tested with fake secret sentinel `SECRET_SENTINEL_D2_DO_NOT_LEAK`.
- **Zero Injection**: Untrusted worker outputs and tool execution strings are never parsed or evaluated as tray actions.
