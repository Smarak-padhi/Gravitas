# GRAVITAS Wave V1-D-A-R1: Physical Recovery & Adversarial Evidence

**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Execution Date:** 2026-10-11  
**Target Platform:** Windows x64 (`win32 10.0.26300`)  

---

## 1. Adversarial Integrity Test Evidence

Source: `scripts/test-install-lifecycle.mjs`

### Test 1: Corrupted Payload DLL Rejection (Fail-Closed)
- **Input:** `dist-package/gravitas-desktop-win32-x64/ffmpeg.dll` modified with invalid bytes (`TAMPERED_BYTES_REJECT_ME`).
- **Invocation:** `powershell.exe -NoProfile -ExecutionPolicy Bypass -File Install-Gravitas.ps1 -CustomTargetDir <testTarget>`
- **Observed Behavior:**
  ```
  Verifying source payload integrity...
  Payload integrity check failed: hash mismatch for 'ffmpeg.dll'. Expected c5e86..., found b5260...
  ```
- **Exit Code:** `1` (terminating error).
- **Target Filesystem Impact:** Zero bytes written to destination.
- **Verdict:** **PASS (Fail-Closed)**

### Test 2: Overwrite Protection of Unrelated Existing Directory
- **Input:** Existing directory containing `my-precious-data.txt` lacking `Gravitas.exe` and `resources/app/payload-inventory.json`.
- **Invocation:** `powershell.exe -NoProfile -ExecutionPolicy Bypass -File Install-Gravitas.ps1 -CustomTargetDir <unrelatedDir>`
- **Observed Behavior:**
  ```
  Target directory exists and contains non-Gravitas files. Refusing to overwrite unrelated directory.
  ```
- **Exit Code:** `1`.
- **Target Filesystem Impact:** `my-precious-data.txt` remained completely untouched.
- **Verdict:** **PASS (Protected)**

### Test 3: Rejection of NTFS Directory Junctions (Reparse Points)
- **Input:** Target path created as NTFS directory junction via PowerShell `New-Item -ItemType Junction`.
- **Invocation:** `powershell.exe -NoProfile -ExecutionPolicy Bypass -File Install-Gravitas.ps1 -CustomTargetDir <junctionLink>`
- **Observed Behavior:**
  ```
  Invalid target path: Destination directory is a reparse point (junction/symlink). Aborting.
  ```
- **Exit Code:** `1`.
- **Verdict:** **PASS (Blocked)**

---

## 2. Packaged Process Boundary & Lifecycle Evidence

### Clean Installation & Distinct OS Process Execution
- Installed to: `%TEMP%\Gravitas Actual Installer Test ...\LocalAppData\Programs\Gravitas`
- Executable: `Gravitas.exe` (SHA-256: `49b61a030a520fc36a4b8fa5cce53fb4e935a7bdbbe4b80e9222f598e49cc7fa`)
- Launch verification:
  - `mainPid`: `16652`
  - `kernelPid`: `18044`
  - `mainPid != kernelPid`: **TRUE** (Separate OS processes via `utilityProcess.fork`)
  - Status: `READY`
  - Database: `gravitas_kernel.db` created under isolated user data root.
- Clean shutdown:
  - Invoked `window.gravitasDesktop.requestQuitApplication()`
  - Verified `mainPid 16652 alive: false`, `kernelPid 18044 alive: false`.
  - Zero orphan processes remaining in OS process table.

### Reinstallation / Upgrade Over Existing Installation
- Executed `Install-Gravitas.ps1 -CustomTargetDir <installTarget>` over previous install.
- Detected canonical Gravitas markers; successfully refreshed binaries without collision refusal.
- Retried file operations with `WaitForExit` and locked-file retries to ensure zero contention errors.

### Owned-Only Uninstallation & Data Preservation
- Staged user file: `unrelated-user-note.txt` placed in installation folder before uninstall.
- Executed: `Uninstall.ps1`
- Observed Output:
  ```
  Gravitas core binaries removed. Unrelated files preserved in <installTarget>.
  Gravitas uninstalled successfully. User data preserved under %APPDATA%\gravitas.
  ```
- Verification:
  - `Gravitas.exe` removed: **TRUE**
  - All packaged DLLs and resources removed: **TRUE**
  - `Uninstall.ps1` and `Uninstall.cmd` removed: **TRUE**
  - `unrelated-user-note.txt` preserved: **TRUE**
  - SQLite database in `%APPDATA%\gravitas` preserved: **TRUE**

---

## 3. Packaged Runtime Failure & Recovery Evidence

Source: `scripts/test-packaged-smoke.mjs`

### Adversarial Utility Process Termination
- Active KernelHost PID: `21908`
- Simulated unexpected kill: `taskkill /F /PID 21908`
- Electron Main supervisor state transition:
  - `status`: `OFFLINE`
  - `providerConfigured`: `false` (volatile token wiped immediately from memory)
- Pending requests fail closed without stalling the desktop UI.

### Authorized Desktop IPC Recovery
- Renderer invoked `window.gravitasDesktop.restartKernel()`
- Electron Main verified caller origin and active window identity.
- Fresh UtilityProcess launched:
  - `newKernelPid`: `22540` (`newKernelPid != oldKernelPid`)
  - `status`: `READY`
- Credential resynchronization:
  - Volatile synthetic token restored: `providerConfigured: true`
- Clean exit: zero lingering processes.
- Subsequent cold relaunch: durable database state intact (`status: READY`).

---

## 4. Full Regression Verification Record

| Test Suite | Command | Result | Notes |
|---|---|---|---|
| Workspace Typecheck | `npm run typecheck` | **PASS** | 13/13 workspaces clean (`tsc --noEmit`) |
| Vitest Full Suite | `npx vitest run --fileParallelism=false` | **PASS** | 104 files passed, 1,717 tests passed (0 failures) |
| WorkSession Kernel Suite | `npm run test:kernel` | **PASS** | 51 tests passed (0 failures) |
| Desktop Bundle | `node apps/desktop/build.mjs` | **PASS** | Dist bundles generated |
| Desktop Dogfood | `node scripts/dogfood-view-switch.mjs` | **PASS** | 13/13 steps passed, zero orphans |
| System Diagnostics | `npm run doctor` | **PASS** | Exit code 0, overallStatus: PASS |
| Machine Diagnostics | `node scripts/doctor.mjs --json` | **PASS** | 11 OK, 0 BLOCKED, 0 WARNING, 2 UNAVAILABLE |
| Installer Lifecycle | `node scripts/test-install-lifecycle.mjs` | **PASS** | 11/11 lifecycle & adversarial steps passed |
| Packaged Smoke | `node scripts/test-packaged-smoke.mjs` | **PASS** | 15/15 packaged runtime smoke steps passed |
