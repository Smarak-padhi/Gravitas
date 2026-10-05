# D0 Failure and Recovery Model

## 1. Failure Modes
1. **Renderer Crash**: Handled via `render-process-gone` event. Kernel remains untouched. Window can be recreated.
2. **Kernel Crash**: Handled via `utilityProcess` exit event. Supervisor transitions state to `KERNEL_CRASHED`.
3. **IPC Protocol Mismatch**: Handled via schema validation; malformed messages return structured errors without crashing Main or Kernel.
4. **Main Process Termination**: Kernel is terminated cleanly on exit via OS process tree semantics; P6 durability allows state resumption on next launch.
