# GRAVITAS Wave D2: Failure Modes & Recovery Model

## 1. Governing Principle
`MAIN_PROCESS_CRASH != GUARANTEED_CONTINUOUS_KERNEL_SURVIVAL`
`KERNEL_CRASH != SILENT_TRAY_RECOVERY`
`WINDOW_CLOSED != KERNEL_TERMINATED`

## 2. Failure Mode Taxonomy & Remediation

| Failure Mode | Trigger / Symptom | Detection Mechanism | Recovery & Remediation |
|---|---|---|---|
| **1. Window Close by Operator** | Operator clicks window "X" or presses Alt+F4. | BrowserWindow `'close'` event listener in Electron Main. | Intercepted via `event.preventDefault()`. Window hidden (`win.hide()`), lifecycle updated to `WINDOW_HIDDEN`. Kernel utilityProcess continues unaffected. |
| **2. Kernel utilityProcess Crash While Hidden** | Unhandled exception or fatal OOM in Kernel process while UI is minimized to tray. | utilityProcess `'exit'` / `'error'` event listeners in DesktopSupervisor. | DesktopSupervisor transitions `kernelHealth` to `'CRASHED'`. Tray updates status item to disabled `Kernel Status: CRASHED`. When window is restored, UI receives error projection and prompts operator for controlled restart. No silent state fabrication. |
| **3. Duplicate Desktop Launch** | Operator attempts to launch a second instance of the GRAVITAS desktop app. | Electron `app.requestSingleInstanceLock()`. | Lock acquisition returns `false`. Second instance terminates immediately. First instance receives `'second-instance'` event, restores and focuses its BrowserWindow. No second Kernel process or SQLite lock contention created. |
| **4. Redundant Application Quit Dispatch** | Operator clicks "Quit GRAVITAS" in tray while a quit is already progressing, or multiple quit IPCs fire. | `quitInProgress` guard and state machine in DesktopSupervisor. | Quit transition is idempotent. Redundant calls return immediately. Supervisor flushes pending writes to SQLite, sends shutdown message to utilityProcess, waits for exit, then destroys tray and window. |
| **5. Trapped Human Gate in Background** | A task hits an approval requirement while the Command Center window is hidden. | Kernel state machine emits `PENDING` approval. | Execution in background pauses at the gate. The gate remains strictly `PENDING`. No autonomous bypass occurs. Tray status reflects active/pending state. When the operator reopens the window, the gate is projected for sovereign decision. |
| **6. Unexpected Electron Main Process Termination** | Electron Main killed via Task Manager or host OS termination. | OS process hierarchy. | utilityProcess attached to Electron Main lifetime; OS terminates child process. No false claim of continuous daemon execution. State is preserved on disk in atomic SQLite database; on subsequent restart, Kernel performs state reconciliation. |
