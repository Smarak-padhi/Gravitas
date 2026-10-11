# GRAVITAS — V1-D-A Packaging Evidence

**Audit Date:** 2026-10-11  
**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Host Environment:** Windows x64 (`win32 10.0.26300`)  
**Node Version:** `v24.13.0`  
**Electron Runtime:** `v44.5.1` (Chrome `152.0.7977.130`, Node `24.21.0`, V8 `15.2.124.28-electron.0`)  
**Packaging Engine:** Deterministic native Node packager (`scripts/package-windows.mjs`)  
**Base Commit:** `9839eee27fa7273343bf05ecb56d3996ff4687cd`

---

## 1. Distribution Artifacts & Cryptographic Hashes

All packaging outputs are generated reproducibly under `dist-package/`:

| Artifact Name | Path | Size | SHA-256 Checksum | Signature Status |
|---|---|---|---|---|
| **Gravitas Executable** | `gravitas-desktop-win32-x64/Gravitas.exe` | 245,726,208 bytes | `49b61a030a520fc36a4b8fa5cce53fb4e935a7bdbbe4b80e9222f598e49cc7fa` | **UNSIGNED** (Local Test Only) |
| **Distribution Archive** | `Gravitas-0.0.1-win32-x64.zip` | 158,503,402 bytes | `d8fb31bad409d307fe28a781bd5c4ba243929f877097b6a55b94adaf28ee51ad` | **UNSIGNED** (Local Test Only) |
| **Windows Launcher** | `Install-Gravitas.cmd` | 96 bytes | N/A (Script) | N/A |
| **Per-User Installer** | `Install-Gravitas.ps1` | 2,806 bytes | N/A (Script) | N/A |
| **Artifact Manifest** | `manifest.json` | 663 bytes | N/A (Descriptor) | N/A |

> **Signing Notice:** `isSigned = false`. No production code-signing certificate is claimed or attached. Artifacts are explicitly marked and validated for local and staging environments.

---

## 2. Packaged Runtime Smoke Test Verification

The smoke suite (`scripts/test-packaged-smoke.mjs`) was executed against the packaged standalone executable (`dist-package/gravitas-desktop-win32-x64/Gravitas.exe`) using an isolated, ephemeral user data directory.

### Verified Gates (15/15 Passed):
1. **Fresh First Launch:** Packaged Electron binary launched cleanly (`status: READY`).
2. **Onboarding Wizard:** Initial state loaded without exceptions (`step: WELCOME`, `completed: false`).
3. **Deterministic-Only Mode:** Operates fully without requiring API keys or network requests.
4. **Doctor Diagnostics:** Ran against installed environment (`overallStatus: WARN/PASS`, `exitCode: 0`).
5. **D1 Command Center:** Visible and responsive (`#cc-main`).
6. **D3 Living HQ View Switch:** Switched to `#living-hq` and restored `#cc-main` cleanly.
7. **Distinct OS Process:** Main process (`mainPid = 26284`) and KernelHost (`kernelPid = 27024`) ran in distinct, active Windows OS processes.
8. **K0 Database Initialization:** Initialized SQLite store at `<dataRoot>/gravitas_kernel.db` with WAL/SHM journals and `kernel.lock`.
9. **Durable Persistence Across Restart:** Relaunch preserved database state and reacquired clean lock.
10. **Truthful Provider Status:** Reported `AUTH_REQUIRED` / unconfigured when credentials absent.
11. **Volatile Synthetic Credential:** Configured synthetic key in Main volatile memory without writing to disk.
12. **Unexpected Host Termination:** Terminated `kernelPid 27024` via `taskkill /F`; supervisor immediately transitioned to `OFFLINE` and marked provider status `AUTH_REQUIRED`.
13. **Authorized IPC Restart:** Renderer invoked `gravitas:restart-kernel`; supervisor spawned fresh replacement `utilityProcess` (`newKernelPid = 24840`).
14. **Credential Resynchronization:** Retained volatile credentials immediately resynchronized to replacement host (`providerConfigured: true`).
15. **Zero Process Orphans:** Clean exit via `requestQuitApplication` terminated all processes; zero orphan processes remaining (`mainAlive = false`, `kernelAlive = false`).
