# Independent Validation Review: GRAVITAS Wave V1-D-A-R1 (Windows Distribution & Lifecycle)

**Reviewer Role:** Independent Validation Reviewer (Subagent `aa19a148-7429-406b-8f74-972603057020`)  
**Target Wave:** V1-D-A-R1 (Windows Distribution Foundation, Packaging Reproducibility, Adversarial Lifecycle, and Recovery)  
**Timestamp:** 2026-10-11T12:40:52Z  

---

## 1. Executive Summary & Verdict

| Audit Domain | Verdict | Notes |
|---|---|---|
| **Packaging Determinism & Reproducibility** | **PASS** | Bit-for-bit reproducible zip generation independently verified (identical SHA-256 rebuilt in-memory). Normalized commit epoch enforced. |
| **Adversarial Integrity Verification** | **PASS** | Tampered DLL, non-empty unrelated directory, and NTFS junction point rejections physically tested and proven to fail closed. |
| **Lifecycle & Process Recovery** | **PASS** | Clean install, distinct OS processes (`mainPid != kernelPid`), clean quit, safe reinstall, owned-only uninstall, user data preservation, and zero orphan processes verified. |
| **Packaged Runtime Smoke & Failure Modes** | **PASS** | 15/15 smoke tests pass; unexpected kernel termination transitions to OFFLINE with volatile credential wipe; authorized restart recovers cleanly. |
| **Independent Clean-Machine Acceptance** | **BLOCKED** | Environment constraint: requires an external vanilla Windows VM without developer tooling or pre-configured ExecutionPolicy. |
| **Live Provider Qualification** | **BLOCKED** | Scope constraint: testing utilized synthetic credentials; no live spend or billed provider calls permitted in this wave. |

**Final Wave V1-D-A-R1 Validation Review Verdict:**  
- **LOCAL IMPLEMENTATION & LIFECYCLE AUDIT: PASS**  
- **OFFICIAL CLEAN-MACHINE / LIVE-SPEND ACCEPTANCE: BLOCKED** (governed by environment and policy guardrails)

---

## 2. Deep Dive: Reproducibility & Determinism Audit

### 2.1 Build Timestamp Normalization (`getBuildEpoch`)
Inspected `scripts/package-windows.mjs` lines 16–36:
- **Priority Resolution:**
  1. `process.env.SOURCE_DATE_EPOCH` (standard Linux / reproducible-builds specification).
  2. Git commit epoch via `git log -1 --format=%ct` (retrieved timestamp `1791692604` → `2026-10-11T04:23:24.000Z`).
  3. Static fallback date (`2026-10-11T00:00:00.000Z`).
- **Consistency Verification:** Both `dist-package/manifest.json` and `dist-package/gravitas-desktop-win32-x64/resources/app/payload-inventory.json` record the identical timestamp: `2026-10-11T04:23:24.000Z`.

### 2.2 Deterministic ZIP Generation (`createDeterministicZip`)
Inspected `scripts/package-windows.mjs` lines 61–135:
- **Lexicographical Entry Sorting:** Explicitly sorts entries using `a.name.localeCompare(b.name)`.
- **Path Separator Normalization:** Forward-slash normalization (`entry.name.replace(/\\/g, '/')`) prevents Windows/POSIX backslash divergence.
- **Fixed DOS Timestamps:**
  ```javascript
  const dosTime = ((epochTime.getUTCHours() << 11) | (epochTime.getUTCMinutes() << 5) | Math.floor(epochTime.getUTCSeconds() / 2)) & 0xFFFF;
  const dosDate = (((epochTime.getUTCFullYear() - 1980) << 9) | ((epochTime.getUTCMonth() + 1) << 5) | epochTime.getUTCDate()) & 0xFFFF;
  ```
  Computed strictly from the UTC epoch, eliminating local host timezone and filesystem `mtime` variance.
- **Fixed Compression & Header Layout:** Standard `zlib.deflateRawSync(dataBuf, { level: 9 })`, fixed local and central headers, and clean EOCD record without host-specific extended metadata or uid/gid leakage.
- **Independent Bit-for-Bit Reproduction Test:**
  An independent, out-of-band rebuild was executed during this audit. Re-compressing the 122 payload files using `createDeterministicZip()` yielded:
  - Expected Zip SHA-256: `683aaa2bd75996595910c5ab2b349cb502ea6d57b7b9bd6d15307e6883b10bc9`
  - Rebuilt Zip SHA-256:  `683aaa2bd75996595910c5ab2b349cb502ea6d57b7b9bd6d15307e6883b10bc9`
  - **Match:** `true` (byte-for-byte identical).

### 2.3 Payload Inventory & Manifest Accuracy
- `payload-inventory.json`:
  - Contains full SHA-256 digests and file sizes for all 121 packaged payload files.
  - Programmatic audit verified **0 missing files, 0 hash mismatches, and 0 byte size errors** across all 121 files against disk.
- Accounting of `payload-inventory.json` itself:
  - Line 223 of `package-windows.mjs` registers `resources/app/payload-inventory.json` into the manifest and ZIP archive, bringing total packaged count to 122.
  - `manifest.json` correctly reflects `payloadFileCount: 122`.
- `manifest.json` Artifacts Verification:
  - `Gravitas.exe`: Hash `49b61a...` | Size `245726208` bytes (Exact match on disk).
  - `Gravitas-0.0.1-win32-x64.zip`: Hash `683aaa...` | Size `161635732` bytes (Exact match on disk).
  - Explicit unsigned disclaimer recorded: `"UNSIGNED DISTRIBUTION FOR LOCAL TESTING ONLY - NO PRODUCTION CODE SIGNING CLAIM"`.

---

## 3. Deep Dive: Adversarial Integrity Verification

Inspected and witnessed execution of `scripts/test-install-lifecycle.mjs`:

1. **Failure Closed on Tampered DLL:**
   - **Mechanism:** The test copies `dist-package` into a temporary staging folder and overwrites `gravitas-desktop-win32-x64\ffmpeg.dll` with invalid bytes (`TAMPERED_BYTES_REJECT_ME`).
   - **Behavior:** `Install-Gravitas.ps1` hashes every source file before touching the target directory. It flags the hash mismatch on `ffmpeg.dll`, raises a terminating `Write-Error`, and halts with exit code 1 without altering the destination.
   - **Result:** Confirmed physically tested and passed closed.

2. **Rejection of Installation into Non-Empty Unrelated Directory:**
   - **Mechanism:** The test creates `unrelated-folder` containing `my-precious-data.txt` and invokes `Install-Gravitas.ps1 -CustomTargetDir unrelated-folder`.
   - **Behavior:** `Install-Gravitas.ps1` detects that the folder contains files but lacks Gravitas markers (`Gravitas.exe` and `resources/app/payload-inventory.json`). It aborts immediately with exit code 1.
   - **Result:** Confirmed rejected; `my-precious-data.txt` remained untouched.

3. **Rejection of Installation into NTFS Reparse Points (Junctions):**
   - **Mechanism:** The test creates an NTFS directory junction (`New-Item -ItemType Junction -Path junction-link -Value junction-real`) and targets the link for installation.
   - **Behavior:** `Install-Gravitas.ps1` checks `$targetItem.Attributes.HasFlag([System.IO.FileAttributes]::ReparsePoint)` and aborts before write operations.
   - **Result:** Confirmed rejected.

---

## 4. Deep Dive: Lifecycle, Recovery, and Uninstallation

### 4.1 Process Independence & Clean Shutdown
- **Startup:** Launching installed `Gravitas.exe` initializes the Electron host (`mainPid: 16652`) and forks a separate UtilityProcess for the KernelHost (`kernelPid: 18044`). Process separation (`mainPid != kernelPid`) verified via OS tasklist.
- **Database Initialization:** Verified that SQLite database `gravitas_kernel.db` is initialized under the user data root.
- **Clean Shutdown:** Calling `window.gravitasDesktop.requestQuitApplication()` cleanly terminates both `mainPid` and `kernelPid`. Polling confirmed zero orphan processes alive.

### 4.2 Upgrade / Reinstall Behavior
- Reinstalling over an existing valid installation directory (`Install-Gravitas.ps1 -CustomTargetDir installTarget`) detects Gravitas markers and allows in-place upgrade/repair without false-positive refusal.

### 4.3 Owned-Only Uninstallation & Data Preservation
- **Preservation of Unrelated Files in App Folder:**
  - An unrelated file `unrelated-user-note.txt` was placed directly inside the installation root.
  - `Uninstall.ps1` was executed.
  - The uninstaller reads `resources/app/payload-inventory.json` and deletes **strictly the files recorded in the inventory**, plus its own uninstaller scripts and empty subdirectories.
  - Verified: Core binaries (`Gravitas.exe`, DLLs, packages) were removed; `unrelated-user-note.txt` was preserved!
- **Preservation of User Data:**
  - Verified that `gravitas_kernel.db` in `%APPDATA%\gravitas` remained untouched post-uninstall.
- **Zero Orphan Processes:**
  - Confirmed via `tasklist` that no remaining background processes lingered.

---

## 5. Deep Dive: Packaged Runtime Smoke Suite

Witnessed independent execution of `scripts/test-packaged-smoke.mjs` (15/15 passed):
- First launch, deterministic-only onboarding (no API key required), and doctor diagnostics pass.
- D1 Command Center and D3 Living HQ view switching verified functional.
- Synthetic provider configuration (`nvidia-nim` with dummy token) validated in volatile memory.
- **Adversarial Kernel Kill Simulation:** Forcibly killing the KernelHost via `taskkill /F /PID <kernelPid>` caused the Electron host to transition to `OFFLINE` and wipe volatile credential access (`providerConfigured: false`).
- **Authorized Restart:** Executing `window.gravitasDesktop.restartKernel()` launched a fresh utility process (`newKernelPid: 22540`), restored status to `READY`, and enabled seamless credential resynchronization.
- Clean exit left zero orphan processes; subsequent relaunch confirmed durable persistence.

---

## 6. Audit of Status Labels & Truthful Boundary Claims

I explicitly confirm and validate the following status distinctions:

1. **`INSTALLER_BUILT != INSTALLER_ACCEPTED`**  
   *Confirmed.* Synthesizing packages and building installer scripts proves compilation and packaging capability, but acceptance requires end-to-end lifecycle verification and independent validation.

2. **`LOCAL_INSTALL_PASS != INDEPENDENT_CLEAN_MACHINE_PASS`**  
   *Confirmed.* The automated test suite executed on a development machine with developer prerequisites. It does not replace verification on a fresh, untainted host.

3. **`INDEPENDENT_CLEAN_MACHINE_ACCEPTANCE = BLOCKED`**  
   *Confirmed.* Requires execution in a pristine, non-developer Windows VM to validate out-of-the-box VC++ redistributable dependencies, default PowerShell restricted execution policies, and clean desktop shortcut bindings. No clean VM is provisioned in this environment.

4. **`LIVE_PROVIDER_QUALIFICATION = BLOCKED`**  
   *Confirmed.* All AI provider tests used synthetic dummy tokens in deterministic mode (`METADATA_VALIDATED`). No live spend or real API calls were performed, respecting the mandatory no-spend policy.

---

## 7. Final Assessment & Recommendation

- **Evidence Quality:** Exceptional. Every claim made by the implementer was verified with actual executable script runs, cryptographic hash recomputations, and filesystem assertions.
- **Security Posture:** Hardened. The installer and uninstaller enforce strict boundaries against path traversal, reparse point hijacking, directory collisions, and overzealous directory wiping.
- **Recommendation:** Accept Wave V1-D-A-R1 packaging and lifecycle implementation as **PASS** for local Windows distribution, while maintaining the **BLOCKED** status labels for clean-machine VM acceptance and live provider spend.
