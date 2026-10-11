# GRAVITAS Wave V1-D-A-R2: Independent Security and Inventory Audit Report

**Auditor:** Subagent B (Independent Security and Inventory Auditor)  
**Target Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Git HEAD Audited:** `b95e120fc4090eb0b71845b904690d20a08698ce`  
**Execution Environment:** Isolated sandbox under `$env:TEMP`  
**Date:** 2026-10-11T13:41:21Z  

---

## 1. Executive Summary & Classifications

An independent, hostile-assumption security and inventory audit was conducted on the Windows distribution artifacts generated from commit `b95e120fc4090eb0b71845b904690d20a08698ce`. Zero prior claims of PASS were taken for granted. All testing was executed in isolated sandboxes under `$env:TEMP` without modifying git worktree files.

| Metric / Audit Check | Status / Classification | Notes / Finding |
|---|:---:|---|
| **PAYLOAD_FILE_COUNT** | **122** | Physical files staged in `dist-package/gravitas-desktop-win32-x64` |
| **INVENTORIED_FILE_COUNT** | **121** | Entries listed inside `payload-inventory.json` `files` array |
| **UNINVENTORIED_REQUIRED_FILES** | **1** | `resources/app/payload-inventory.json` itself is omitted from inventory |
| **DUPLICATE_INVENTORY_PATHS** | **0** | No duplicated path entries detected in inventory |
| **PATH_ESCAPE_ENTRIES** | **0** | No path escapes (`..`) in committed package inventory |
| **INSTALL_TIME_HASH_ENFORCEMENT** | **PASS** | `Install-Gravitas.ps1` strictly validates SHA256 hashes of all inventoried files before copying |
| **UNINSTALL_INVENTORY_TAMPER_SAFETY** | **FAIL** | `Uninstall.ps1` blindly relies on unauthenticated local inventory without hash/signature verification |
| **REPARSE_POINT_SAFETY** | **PASS** | Reparse points (junctions/symlinks) are detected and refused at root and leaf levels |
| **UNRELATED_FILE_PRESERVATION** | **FAIL** | If `payload-inventory.json` is modified post-install, the uninstaller deletes arbitrary target files |
| **SECURITY_REVIEW** | **FAIL** | Critical uninstall boundary escape & unverified inventory reliance require remediation |

---

## 2. Phase 2 — Payload Inventory Completeness Audit

### 2.1 File Counts and Inventory Analysis
An automated inventory census was executed against `dist-package/gravitas-desktop-win32-x64` and compared directly against `resources/app/payload-inventory.json`:

- **Physical Files in Staging Directory:** 122 files
- **Entries in `payload-inventory.json`:** 121 entries
- **Declared `fileCount` in `payload-inventory.json`:** 121
- **Declared `payloadFileCount` in `manifest.json`:** 122

### 2.2 Coverage Analysis of Runtime Files
All core executable binaries, Electron dependencies, and bundles were audited:
- `Gravitas.exe`: **Inventoried** (SHA256 verified)
- Electron DLLs (`ffmpeg.dll`, `d3dcompiler_47.dll`, `vk_swiftshader.dll`, `vulkan-1.dll`): **Inventoried**
- Electron resources (`icudtl.dat`, `v8_context_snapshot.bin`, `chrome_*.pak`, `resources.pak`): **Inventoried**
- Production Application Bundle:
  - `resources/app/package.json`: **Inventoried**
  - `resources/app/dist/main/index.js`: **Inventoried**
  - `resources/app/dist/preload/index.cjs`: **Inventoried**
  - `resources/app/dist/renderer/index.html`: **Inventoried**
  - `resources/app/dist/kernel-host/kernelHost.js`: **Inventoried**
- **Omitted File:** `resources/app/payload-inventory.json` (present on disk, but absent from its own `files` array).

### 2.3 Root Cause in Packaging Script
In `scripts/package-windows.mjs` (lines 202–228):
1. Lines 202–210: Gathers all files in `PACKAGE_DIR` (121 files at this stage) into `payloadInventory`.
2. Lines 213–219: Writes `resources/app/payload-inventory.json` to disk with `files: payloadInventory` (121 files).
3. Lines 221–227: Appends `resources/app/payload-inventory.json` into the in-memory array `payloadInventory` (bringing count to 122) for the ZIP archive and manifest.
4. **Defect:** The updated array is never re-serialized to `payload-inventory.json` on disk, leaving a 1-file discrepancy between physical files (122), manifest `payloadFileCount` (122), and `payload-inventory.json` entries (121).

---

## 3. Phase 3 — Malicious Inventory & Uninstall Safety Verification

Physical testing was performed in isolated sandbox instances under `$env:TEMP` using PowerShell to test edge cases and boundary defenses in `Uninstall.ps1`.

### 3.1 Test Matrix & Sandbox Results

| Test ID | Test Scenario | Sandbox Behavior | Verdict |
|---|---|---|:---:|
| **Test A** | Path traversal (`..\victim_outside.txt`) targeting files outside install folder | Uninstaller followed relative traversal out of install root and deleted the outside file | **FAIL (VULNERABLE)** |
| **Test B/C** | Absolute / Drive-qualified path (`C:\...`) | `Join-Path` produced malformed compound path (`C:\Install\C:\...`); file preserved | **PASS** |
| **Test D** | UNC paths (`\\server\share\...`) | Handled without crashing or removing unauthorized network resources | **PASS** |
| **Test E** | Alternate path separators (`/` vs `\`) | Normalized properly via `.Replace('/', '\')`; intended files removed | **PASS** |
| **Test F** | Case-insensitive duplicates | Processed idempotently without crashing uninstaller | **PASS** |
| **Test G** | Relative path traversal to user data (`..\..\..\Roaming\gravitas\kernel.db`) | Traversed out to AppData and deleted canary user database | **FAIL (VULNERABLE)** |
| **Test H** | Trailing dots / spaces | Handled gracefully via safe directory cleanup fallback | **PASS** |
| **Test I1** | Install directory itself is a junction/symlink | Detected `ReparsePoint` flag; uninstaller cleanly refused execution (Exit 1) | **PASS** |
| **Test I2** | Leaf file inside install directory is a symlink | Detected `ReparsePoint` flag on leaf; preserved link target | **PASS** |
| **Test J1** | Missing `payload-inventory.json` | Failed ownership marker check; refused execution (Exit 1) | **PASS** |
| **Test J2** | Corrupted JSON syntax in `payload-inventory.json` | Caught parse exception; executed safe directory cleanup without deleting unverified files | **PASS** |
| **Test K** | **Tampered inventory entry targeting unrelated user file INSIDE install directory** | Deleted `unrelated-user-note.txt` without checking file hash or ownership | **FAIL (VULNERABLE)** |

---

## 4. Detailed Defect Analysis & Vulnerabilities

### Defect 1: Uninstaller Path Traversal Deletion (CRITICAL)
- **Location:** `scripts/package-windows.mjs` (lines 297–307) and generated `Install-Gravitas.ps1` (lines 248–258)
- **Code:**
  ```powershell
  foreach ($fileEntry in $inv.files) {
      $rel = $fileEntry.path.Replace('/', '\')
      $full = Join-Path $ScriptDir $rel
      if (Test-Path -LiteralPath $full -PathType Leaf) {
          $fItem = Get-Item -LiteralPath $full -Force
          if (-not $fItem.Attributes.HasFlag([System.IO.FileAttributes]::ReparsePoint)) {
              Remove-Item -LiteralPath $full -Force -ErrorAction SilentlyContinue
          }
      }
  }
  ```
- **Vulnerability Mechanism:** While `Install-Gravitas.ps1` explicitly checks:
  ```powershell
  if ($rel.Contains('..') -or [System.IO.Path]::IsPathRooted($rel)) { ... exit 1 }
  ```
  `Uninstall.ps1` completely omits path traversal checks. `Join-Path $ScriptDir $rel` resolves paths containing `..\`, allowing an attacker or corrupted inventory to target arbitrary files outside the installation folder (e.g., `%APPDATA%\gravitas\gravitas_kernel.db` or system files accessible to the user).

### Defect 2: Untrusted Inventory Metadata Authorizes File Deletion (HIGH)
- **Location:** `Uninstall.ps1` (lines 248–258)
- **Vulnerability Mechanism:** The uninstaller performs zero hash or digital signature verification before deleting files listed in `payload-inventory.json`. It blindly deletes whatever path is present in the file.
- If an unprivileged user or process adds an entry for an existing file (such as `unrelated-user-note.txt` or another document inside the directory), the uninstaller permanently deletes it during uninstall.

### Defect 3: Unauthenticated `payload-inventory.json` during Installation (MEDIUM)
- **Location:** `dist-package/Install-Gravitas.ps1` (lines 55–65)
- **Mechanism:** `manifest.json` is read on line 55 but never checked against any signature, and the SHA256 of `payload-inventory.json` is not pinned in `manifest.json`. The installer trusts `payload-inventory.json` to define what files and hashes are legitimate.

---

## 5. Required Remediations for V1-D-A-R3

1. **Fix Path Traversal in `Uninstall.ps1`:**
   Enforce canonical path bounding in `Uninstall.ps1`:
   ```powershell
   $full = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir $rel))
   if (-not $full.StartsWith($ScriptDir + "\", [System.StringComparison]::OrdinalIgnoreCase)) {
       Write-Warning "Skipping invalid/escaped inventory path: $rel"
       continue
   }
   ```
2. **Enforce Hash Verification Prior to Uninstallation Deletion:**
   Before executing `Remove-Item -LiteralPath $full`, verify that `(Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash -eq $fileEntry.sha256`. If the hash does not match the official package hash, preserve the file as user-modified or unrelated.
3. **Resolve Inventory Count Discrepancy in `package-windows.mjs`:**
   Ensure `payload-inventory.json` and `manifest.json` have consistent counts and that `payload-inventory.json` itself is properly accounted for or verified via `manifest.json`.
