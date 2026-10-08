# GRAVITAS — Wave V1-C Doctor
## Diagnostic Engine & System Health Inspection

### 1. Overview

`GravitasDoctor` (`packages/core/src/doctor.ts`) provides a deterministic, repeatable, non-destructive health and readiness verification suite. It evaluates the environment before launch or on-demand from the desktop UI or terminal.

Key Invariants:
- **Zero Financial Cost:** Runs completely locally ($0.00 spend).
- **Zero Paid Probes:** Makes no external network calls or live model inference requests.
- **Fail-Closed Reporting:** Returns exit code `1` if any `REQUIRED` check fails, and exit code `0` if all required checks pass (even if optional agent harnesses are unavailable).
- **Zero Secret Leakage:** Never prints or logs plain API keys, tokens, or credential values.

---

### 2. Diagnostic Check Matrix (13 Checks)

| Check ID | Name | Severity | Description |
| :--- | :--- | :--- | :--- |
| `PLATFORM_WINDOWS_CHECK` | Windows Platform Environment | REQUIRED | Confirms Windows 10/11 platform (`win32`, `x64`). |
| `NODE_RUNTIME_CHECK` | Node.js Engine Version | REQUIRED | Verifies Node.js runtime meets `v22.0.0` or higher (detected `v24.13.0`). |
| `DATA_ROOT_WRITABLE_CHECK` | User Data Root Writability | REQUIRED | Confirms canonical data root is writable without permission errors. |
| `SQLITE_KERNEL_DB_CHECK` | SQLite Kernel Store | REQUIRED | Validates SQLite database readiness and schema integrity (`PRAGMA quick_check`). |
| `SCHEMA_MIGRATION_CHECK` | Schema Version Compatibility | REQUIRED | Confirms database matches canonical schema version `1`. |
| `ELECTRON_ASSETS_CHECK` | Electron Desktop Assets | REQUIRED | Verifies precompiled bundles exist in `apps/desktop/dist`. |
| `HARNESS_POWERSHELL_CHECK` | PowerShell Harness | OPTIONAL | Detects native Windows PowerShell (`powershell.exe`). |
| `HARNESS_CLAUDE_CODE_CHECK` | Claude Code CLI Harness | OPTIONAL | Detects Claude Code binary if present on host. |
| `HARNESS_CODEX_CHECK` | Codex CLI Harness | OPTIONAL | Detects Codex binary if present on host. |
| `HARNESS_AGY_CHECK` | Google Antigravity CLI | OPTIONAL | Detects Google Antigravity CLI (`agy.exe`). |
| `CREDENTIAL_NVIDIA_CHECK` | NVIDIA NIM Provider | OPTIONAL | Checks presence of `NVIDIA_API_KEY` (masked: `[CREDENTIAL_PRESENT:nvidia-nim]` or `[NOT_CONFIGURED]`). |
| `NETWORK_SPEND_POLICY_CHECK` | Network & Spend Policy | REQUIRED | Asserts `paidFallbackPermitted=false`, `outOfPocketSpendUsd=0.0`. |
| `RECOVERY_LOCK_CHECK` | Single-Writer Kernel Lock | REQUIRED | Verifies no conflicting active processes hold the kernel lock. |

---

### 3. Usage Interfaces

- **CLI Usage:**
  ```bash
  # Formatted human-readable output:
  npm run doctor

  # Machine-readable JSON output:
  node scripts/doctor.mjs --json
  ```
- **Desktop UI Integration:**
  Available under the **System** tab via the **Run System Doctor** button, or inside **Step 2 (Diagnostics)** of the First-Run Setup Wizard.
