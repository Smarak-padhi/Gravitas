# D2 Background Work Continuity Specification

## 1. Window-Independent Execution
Wave D2 establishes that legitimate canonical tasks dispatched into the `WorkSessionKernel` continue executing according to frozen K2/K3 policies even when the Command Center window is absent:

- `WINDOW_LIFETIME != KERNEL_LIFETIME`: The presentation layer is decoupled from the execution layer.
- `PID_STABILITY`: The Kernel utilityProcess PID remains completely unchanged when the window is hidden, restored, or reloaded.

## 2. Policy Preservation in Background
Background operation does NOT expand agent autonomy or bypass governance gates:
1. **K1 Harness Qualification**: Only verified, reachable harnesses may be dispatched.
2. **K3 Capability Grants**: Explicit least-privilege tokens remain mandatory. Revoked or expired grants block execution immediately.
3. **Zero-Spend Invariants**: `UNKNOWN_COST` operations and paid fallbacks remain strictly blocked (`AUTONOMOUS_INCREMENTAL_SPEND = 0`).
4. **K5 Independent Verification**: Worker claims must be independently falsified. Worker success never equals verified success.

## 3. Post-Restoration State Reconstruction
When the operator clicks "Open Command Center" in the tray:
1. The window is unhidden and focused.
2. A fresh `OVERVIEW` projection is requested across the IPC boundary.
3. All tasks, runs, and sessions completed while hidden are immediately reflected in the UI without relying on stale renderer memory.
