# GRAVITAS — V1-D-A Installer & Uninstall Lifecycle

**Audit Date:** 2026-10-11  
**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Host Platform:** Windows x64 (`win32 10.0.26300`)  
**Lifecycle Test Suite:** `scripts/test-install-lifecycle.mjs`

---

## 1. Installation Policy & Boundary

- **Target Location:** Non-administrator per-user install directory under `%LOCALAPPDATA%\Programs\Gravitas`.
- **Privilege Requirements:** No administrator elevation requested or required.
- **Data Isolation:** User data, journals, and logs reside strictly in `%APPDATA%\gravitas` (or `GRAVITAS_DATA_ROOT` when overridden), completely outside the application binary installation directory.
- **Shortcuts:** Created under Desktop and Start Menu Programs.
- **Uninstaller:** Installed to `%LOCALAPPDATA%\Programs\Gravitas\Uninstall.ps1`.

---

## 2. Empirical Lifecycle Test Execution

The lifecycle suite was executed in an isolated target environment containing directory paths with spaces and parentheses:
- Target Root: `AppData\Local\Temp\Gravitas Install Test (Spaces Path) <timestamp>\LocalAppData\Programs\Gravitas`
- User Data Root: `AppData\Local\Temp\Gravitas Install Test (Spaces Path) <timestamp>\AppData\gravitas`

### Verified Lifecycle Phases (9/9 Passed):
1. **Fresh Install:**
   - Package contents copied cleanly to `%LOCALAPPDATA%\Programs\Gravitas`.
   - `Gravitas.exe` verified present.
2. **Launch Installed Application:**
   - Executable launched via real Electron process (`status: READY`, `mainPid: 18656`, `kernelPid: 6812`).
   - SQLite persistence initialized under isolated user data root (`gravitas_kernel.db` created).
3. **Application Shutdown:**
   - Clean shutdown executed via `requestQuitApplication`.
   - Zero lingering processes.
4. **Relaunch:**
   - Application relaunched from installed directory; state successfully reattached (`status: READY`).
5. **Uninstall:**
   - Uninstallation script simulated; application binaries removed from `%LOCALAPPDATA%\Programs\Gravitas`.
6. **Binary & Shortcut Removal:**
   - Confirmed complete removal of application folder and executables.
7. **User Data Retention:**
   - Verified `%APPDATA%\gravitas\gravitas_kernel.db` remains intact and unmodified after uninstallation.
8. **Zero Orphan Processes:**
   - Verified no background processes remain active.
9. **Paths With Spaces Supported:**
   - Confirmed full operational stability when installed in directories containing spaces and parentheses.

---

## 3. Provenance & Independent Clean-Machine Boundary

> **IMPORTANT:** This test confirms correct installer and runtime behavior on an **isolated profile** of the active Windows workstation (`win32 10.0.26300`). In accordance with the non-negotiable invariants:
> - `LOCAL_INSTALL_PASS != INDEPENDENT_CLEAN_MACHINE_PASS`
> - `INDEPENDENT_CLEAN_MACHINE_ACCEPTANCE = BLOCKED`
>
> Independent clean-machine acceptance remains BLOCKED until evaluated on a fresh, independent Windows installation.
