# GRAVITAS — Wave V1-D-A-R2 Final Acceptance Decision

**Wave:** GRAVITAS Wave V1-D-A-R2  
**Target Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Committed Target HEAD:** `b95e120fc4090eb0b71845b904690d20a08698ce`  
**Frozen Baseline Ancestor:** `9839eee27fa7273343bf05ecb56d3996ff4687cd` (Wave V1-C)  
**Audit Mode:** Read-Only Audit with Independent Subagents  
**Final Decision:** `V1_D_A_R2_STATUS = REPAIR_REQUIRED`  

---

## 1. Executive Summary & Acceptance Verdict

In Wave V1-D-A-R2, the committed Windows distribution package (`b95e120fc4090eb0b71845b904690d20a08698ce`) underwent rigorous, multi-agent independent audit to resolve three critical acceptance questions:
1. Complete payload inventory coverage and uninstaller safety against manipulated inventory files.
2. Full bit-for-bit packaging reproducibility across independent runs.
3. Review provenance of prior subagents and verification of the exact committed HEAD.

While **Phase 4 (Full-Build Reproducibility)** achieved complete 100% byte-for-byte determinism across all 122 files, ZIP archive, scripts, and manifests, **Phase 3 (Malicious Inventory & Uninstall Safety)** and **Phase 2 (Payload Inventory Completeness)** discovered critical security vulnerabilities in the uninstaller script and an inventory count omission.

Therefore, **Wave V1-D-A cannot be frozen at this time**. The implementation requires a focused repair wave before distribution freeze.

```
V1_D_A_R2_STATUS = REPAIR_REQUIRED
V1_D_A_FREEZE = BLOCKED
```

---

## 2. Summary of Subagent Audit Results

### 2.1 Subagent B: Security & Inventory Auditor
- **Phase 2 (Payload Inventory Completeness):**
  - Staged physical files: `122`
  - Listed in `payload-inventory.json`: `121`
  - Missing file: `1` (`resources/app/payload-inventory.json` itself is physically deployed in `dist-package/gravitas-desktop-win32-x64` but omitted from its own inventory list)
  - Duplicate entries: `0`
  - Path escape entries in base inventory: `0`
- **Phase 3 (Malicious Inventory & Uninstall Safety):**
  - `Install-Gravitas.ps1` enforces strict path traversal validation (`..` checks and root path checks) and SHA-256 pre-verification: **PASS**.
  - `Uninstall.ps1` **lacks all path traversal checks** and blindly trusts relative paths in `payload-inventory.json`: **FAIL**.
  - `Uninstall.ps1` **does not verify SHA-256 digests** before deletion, deleting any file named in the inventory: **FAIL**.

### 2.2 Subagent C: Build Reproducibility & Provenance Auditor
- **Phase 4 (Full-Build Reproducibility):**
  - Two complete independent packaging executions into `$env:TEMP\gravitas-build-1` and `$env:TEMP\gravitas-build-2`.
  - Byte-for-byte SHA-256 and byte-count equality verified across all 122 runtime files, `Gravitas.exe`, `payload-inventory.json`, `manifest.json`, `Install-Gravitas.ps1`, `Install-Gravitas.cmd`, `Uninstall.ps1`, and `Gravitas-0.0.1-win32-x64.zip` (`82a6c43de188b82347403834931b5779b6de30b5f29ba454cb68a76a41645b4e`, 161,635,732 bytes).
  - All reproducibility gates: **PASS**.
- **Phase 5 (Review Provenance):**
  - Prior R1 reviewers evaluated pre-commit working tree files on top of parent commit `ac8f07c462c73888919bec0841e0531f1172f34f`.
  - Fresh execution on committed HEAD `b95e120fc4090eb0b71845b904690d20a08698ce` verified 11/11 lifecycle tests pass and 15/15 smoke tests pass: **PASS**.

---

## 3. Concrete Blocking Defects

### Defect 1: Uninstaller Path Traversal Vulnerability (CRITICAL)
- **Location:** `scripts/package-windows.mjs` (lines 297–304) and generated `dist-package/Uninstall.ps1`
- **Vulnerability:**
  ```powershell
  $rel = $fileEntry.path.Replace('/', '\')
  $full = Join-Path $ScriptDir $rel
  if (Test-Path -LiteralPath $full -PathType Leaf) {
      Remove-Item -LiteralPath $full -Force -ErrorAction SilentlyContinue
  }
  ```
  `Join-Path` does not restrict resolution to `$ScriptDir`. If an attacker or unprivileged process tampers with `payload-inventory.json` to insert `..\..\..\victim.txt` or `..\..\AppData\Roaming\gravitas\kernel.db`, `Uninstall.ps1` resolves the path outside the application installation folder and deletes the target file.
- **Physical Proof:** Confirmed by Subagent B in disposable sandbox testing under `$env:TEMP`: an injected relative path successfully deleted an external canary file and simulated user data outside `$ScriptDir`.

### Defect 2: Unverified Deletion in Uninstaller (HIGH)
- **Location:** `Uninstall.ps1`
- **Vulnerability:** The uninstaller deletes files solely based on whether their relative path exists on disk, without verifying the SHA-256 digest against `$fileEntry.sha256`. If `payload-inventory.json` is modified to include an unrelated file located inside `$ScriptDir`, the uninstaller deletes it upon uninstall without validating that it was an authentic Gravitas payload file.

### Defect 3: Inventory File Count Mismatch (MEDIUM)
- **Location:** `scripts/package-windows.mjs` (lines 212–254)
- **Discrepancy:** The staged package contains 122 physical files, but `payload-inventory.json` contains 121 entries.
- **Root Cause:** In `package-windows.mjs`, `payload-inventory.json` is written to disk *before* its own entry is pushed into the `inventoryFiles` array. The file on disk was never updated with its own self-referential entry, leaving `resources/app/payload-inventory.json` uninventoried.

---

## 4. Remediation Mandate for Wave V1-D-A-R3

To achieve a clean distribution freeze, Wave V1-D-A-R3 must execute a narrow, targeted repair addressing exactly these three defects:
1. **Path Boundary Hardening in `Uninstall.ps1`:**
   Enforce that `$rel` does not contain `..`, is not rooted, and canonicalize `$full` with `[System.IO.Path]::GetFullPath($full)`, strictly requiring `$full.StartsWith($ScriptDir + [System.IO.Path]::DirectorySeparatorChar)`.
2. **Hash or Ownership Verification in `Uninstall.ps1`:**
   Enforce SHA-256 hash verification `(Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash -eq $fileEntry.sha256` before deleting any file, ensuring modified or foreign files are never deleted by the uninstaller.
3. **Payload Inventory Completeness in `package-windows.mjs`:**
   Ensure `payload-inventory.json` accurately accounts for all packaged runtime files (122 files), including its own entry if distributed in the payload.

---

## 5. Non-Negotiable Classification Status

```
V1_D_A_R2_STATUS = REPAIR_REQUIRED
V1_D_A_FREEZE = BLOCKED
ROLE ≠ EXE
HASH ≠ SIGNATURE
INSTALLER_SIGNED = NO
PUBLISHER_AUTHENTICATION = NOT_IMPLEMENTED
INDEPENDENT_CLEAN_MACHINE_ACCEPTANCE = BLOCKED
LIVE_PROVIDER_QUALIFICATION = BLOCKED
RECOMMENDED_NEXT_STEP = Wave V1-D-A-R3 Narrow Security Repair
```
