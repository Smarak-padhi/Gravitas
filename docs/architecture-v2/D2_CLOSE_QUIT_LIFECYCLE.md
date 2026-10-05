# D2 Close vs Quit Lifecycle Specification

## 1. Deterministic Close Policy
In Wave D2, clicking the Command Center window close button (`X`) or issuing a standard window close command triggers a deterministic **Hide** action rather than application termination:

```typescript
win.on('close', (event) => {
  if (!isQuittingApp) {
    event.preventDefault()
    win.hide()
    setLifecycleState('WINDOW_HIDDEN')
  }
})
```

### Guarantees
1. **DesktopSupervisor Remains Alive**: The Electron Main process event loop continues running.
2. **Kernel utilityProcess Remains Alive**: The Node.js utilityProcess holding SQLite database locks and active work sessions continues uninterrupted.
3. **Tray Remains Active**: The system tray icon remains interactive, reflecting the current Kernel health status.

## 2. Explicit Application Quit
To terminate GRAVITAS, the operator must select **"Quit GRAVITAS"** from the system tray menu.

### Shutdown Sequence
1. **Flag Quit Request**: `isQuittingApp = true`, state transitions to `QUIT_REQUESTED`.
2. **Halt Intents**: No further operator intents are accepted.
3. **Dispatch SHUTDOWN_REQUEST**: `DesktopSupervisor` sends a typed `SHUTDOWN_REQUEST` to `KernelHost`.
4. **Flush & Acknowledge**: `WorkSessionKernel` flushes pending SQLite transactions, transitions state to `STOPPED`, and replies with `SHUTDOWN_ACK`.
5. **Destroy Tray & Windows**: Tray icon is destroyed and BrowserWindow instances are closed.
6. **Clean Exit**: Electron Main exits with code `0`. Zero orphan utilityProcesses remain in the OS process table.
7. **Idempotency**: Repeated quit calls cleanly return without throwing errors or spawning duplicate requests.
