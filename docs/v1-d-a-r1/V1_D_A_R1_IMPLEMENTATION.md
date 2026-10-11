# GRAVITAS Wave V1-D-A-R1: Windows Distribution Hardening & Recovery Implementation

**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Branch:** `feat/v0-golden-loop`  
**Base Commit:** `ac8f07c462c73888919bec0841e0531f1172f34f`  
**Frozen Baseline Ancestor:** `9839eee27fa7273343bf05ecb56d3996ff4687cd` (Wave V1-C)  

---

## 1. Executive Summary

Wave V1-D-A-R1 repairs confirmed defects in the Windows distribution packaging pipeline, installer security boundaries, and uninstallation recovery mechanics. It establishes reproducible artifact generation, strict fail-closed payload verification, path canonicalization, reparse point rejection, collision protection, and non-destructive uninstallation while strictly preserving human sovereignty, architectural boundaries, and the zero-spend policy.

---

## 2. Invariants & Security Principles Enforced

1. `ROLE ≠ EXECUTOR ≠ HARNESS ≠ MODEL ≠ PROVIDER ≠ GATEWAY ≠ PROCESS`
   - Real process boundaries are preserved across Electron Main, Preload, Renderer, and UtilityProcess KernelHost.
2. `HASH != SIGNATURE` and `HASH != EXTERNAL_TRUST`
   - SHA-256 payload integrity is cryptographically verified against local corruption or tampered staging before file writes.
   - This integrity hash is explicitly distinguished from an Authenticode digital code signature.
3. `INSTALLER_SIGNED = NO` and `PUBLISHER_AUTHENTICATION = NOT_IMPLEMENTED`
   - Explicitly documented in `manifest.json` and installer metadata.
4. `INSTALLER_BUILT != INSTALLER_ACCEPTED`
   - Package creation does not imply acceptance; rigorous adversarial and smoke verification is required.
5. `LOCAL_INSTALL_PASS != INDEPENDENT_CLEAN_MACHINE_PASS`
   - Local automated testing on the development host does not substitute for independent clean VM testing.
6. `INDEPENDENT_CLEAN_MACHINE_ACCEPTANCE = BLOCKED`
   - Retained truthfully until execution on an isolated, non-developer Windows VM is performed.
7. `LIVE_PROVIDER_QUALIFICATION = BLOCKED`
   - All AI provider tests utilize volatile synthetic tokens ($0.00 spend).

---

## 3. Detailed Implementation Changes

### 3.1 Packager & Deterministic Archive Generator (`scripts/package-windows.mjs`)

- **Normalized Build Epoch (`getBuildEpoch`):**
  - Resolves timestamp from `SOURCE_DATE_EPOCH` environment variable, falling back to git commit timestamp (`git log -1 --format=%ct`), and finally a static UTC baseline.
  - Generates stable, reproducible ISO string (`2026-10-11T04:23:24.000Z`) recorded across all manifests.

- **Deterministic Zip Generator (`createDeterministicZip`):**
  - Pure Node.js implementation avoiding platform-dependent external zip binaries (`zip`, `tar`, PowerShell `Compress-Archive`).
  - Standard Deflate compression (`level: 9`).
  - Strict lexicographical ordering of archive entries using `localeCompare`.
  - Normalized forward-slash path separators (`/`).
  - Standardized DOS timestamps computed directly from the UTC build epoch, eliminating host timezone variances.
  - Omission of host-specific extended attributes, UID/GID, or non-deterministic NTFS timestamps.
  - Independently verified byte-for-byte identical rebuilds (`683aaa2bd75996595910c5ab2b349cb502ea6d57b7b9bd6d15307e6883b10bc9`).

- **Cryptographic Payload Inventory (`resources/app/payload-inventory.json`):**
  - Enumerates all 121 packaged files with their relative paths, file size in bytes, and SHA-256 digests.
  - Automatically included in the root manifest (`payloadFileCount: 122`) and staging distribution.

- **Hardened Installer Template (`Install-Gravitas.ps1` & `Install-Gravitas.cmd`):**
  - Non-elevated execution in user context; defaults to `%LOCALAPPDATA%\Programs\Gravitas`.
  - Canonicalizes destination via `[System.IO.Path]::GetFullPath`.
  - Rejects drive root (`C:\`, `\`) using `[System.IO.Path]::GetPathRoot`.
  - Rejects targets overlapping `%SystemRoot%` or user data root (`%APPDATA%\gravitas`).
  - Verifies target is not an NTFS reparse point (junction/symlink).
  - Rejects installation into non-empty directories that do not contain Gravitas ownership markers.
  - Pre-installation integrity: reads `payload-inventory.json` and hashes every source file before touching the target directory; fails closed on any mismatch or path traversal attempt (`..`).
  - Scoped synchronous termination: identifies processes named `"Gravitas"` running strictly from the install directory, invokes `Stop-Process`, and synchronously awaits exit via `WaitForExit(3000)`.
  - Retries file copies up to 5 times to absorb temporary file-lock latency from filter drivers.
  - Creates user-scoped Desktop and Start Menu shortcuts.
  - Generates self-contained `Uninstall.cmd` and `Uninstall.ps1` in the installation directory.

- **Hardened Uninstaller Template (`Uninstall.ps1` & `Uninstall.cmd`):**
  - Checks canonical ownership markers (`Gravitas.exe` and `resources/app/payload-inventory.json`) before execution.
  - Checks against protected roots and reparse points.
  - Terminates running Gravitas processes strictly from the installation directory with `WaitForExit(3000)`.
  - Scoped owned-only deletion: reads `payload-inventory.json` and deletes strictly the documented files.
  - Removes shortcuts and empty subdirectories.
  - Preserves unrelated user files placed in the installation directory.
  - Completely preserves `%APPDATA%\gravitas` user database and configurations.

### 3.2 Adversarial & Lifecycle Verification Suite (`scripts/test-install-lifecycle.mjs`)

- Step 1: Real installer execution into isolated custom target (`testIsoRoot`).
- Step 2 (Adversarial): Corrupted payload DLL (`ffmpeg.dll`) fails closed before altering destination.
- Step 3 (Adversarial): NTFS directory junction target (`New-Item -ItemType Junction`) is rejected.
- Step 4 (Adversarial): Non-empty unrelated directory is rejected without touching existing files.
- Step 5: Clean launch of installed binary via Playwright; verifies healthy status and distinct OS processes (`mainPid != kernelPid`).
- Step 6: Clean application shutdown via `gravitas:quit-app` and Playwright `app.close()`.
- Step 7: Reinstallation / in-place upgrade over existing valid installation succeeds.
- Step 8: Execution of `Uninstall.ps1` cleanly removes Gravitas binaries.
- Step 9: Unrelated user file in app folder is preserved intact post-uninstall.
- Step 10: User data database (`gravitas_kernel.db`) in `%APPDATA%\gravitas` is preserved intact.
- Step 11: Confirms zero orphan processes remain in OS tasklist.

---

## 4. Packaging Artifact Inventory

| Artifact | File Name | Size (Bytes) | SHA-256 Digest |
|---|---|---|---|
| Main Executable | `gravitas-desktop-win32-x64/Gravitas.exe` | 245,726,208 | `49b61a030a520fc36a4b8fa5cce53fb4e935a7bdbbe4b80e9222f598e49cc7fa` |
| Distribution Zip | `Gravitas-0.0.1-win32-x64.zip` | 161,635,732 | `683aaa2bd75996595910c5ab2b349cb502ea6d57b7b9bd6d15307e6883b10bc9` |
| Launcher Script | `Install-Gravitas.cmd` | 100 | - |
| Installer Script | `Install-Gravitas.ps1` | ~12 KB | - |
| Distribution Manifest | `manifest.json` | 690 | - |
