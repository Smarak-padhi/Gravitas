# GRAVITAS — Wave V1-D-A-R3 Uninstaller Security Architecture & Trust Model

**Wave:** GRAVITAS Wave V1-D-A-R3  
**Target Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Auditor Reviewers:** Subagent B (Security), Subagent C (Build/Reproducibility)  
**Implementation Files:** [`scripts/package-windows.mjs`](file:///C:/Users/smara/Desktop/Multi-agent/scripts/package-windows.mjs), [`dist-package/Install-Gravitas.ps1`](file:///C:/Users/smara/Desktop/Multi-agent/dist-package/Install-Gravitas.ps1)  

---

## 1. Problem Statement: The Mutable Inventory Trust Flaw

Prior to Wave V1-D-A-R3, the generated uninstaller script (`Uninstall.ps1`) derived candidate file deletion paths by parsing `resources/app/payload-inventory.json` from the local installation directory:
```powershell
# VULNERABLE HISTORICAL PATTERN (R1 / R2)
$inv = Get-Content -LiteralPath $invPath -Raw | ConvertFrom-Json
foreach ($fileEntry in $inv.files) {
    $rel = $fileEntry.path.Replace('/', '\')
    $full = Join-Path $ScriptDir $rel
    if (Test-Path -LiteralPath $full -PathType Leaf) {
        Remove-Item -LiteralPath $full -Force -ErrorAction SilentlyContinue
    }
}
```

### Critical Flaws in the Historical Pattern
1. **No Independent Trust Anchor:** `payload-inventory.json` resides in `%LOCALAPPDATA%\Programs\Gravitas\resources\app\`, a user-writable directory. Any unprivileged process in the user's logon session could edit this JSON file.
2. **Hash Beside Editable File Is Not An Anchor:** Even if the uninstaller checked `(Get-FileHash $full).Hash -eq $fileEntry.sha256`, an attacker targeting a victim file could simply compute that victim's SHA-256 and insert both the victim's path and hash into `payload-inventory.json`.
3. **Missing Path Boundary Enforcement:** `Join-Path` did not check for parent directory traversal (`..`), drive colons (`:`), or UNC prefixes. Injecting `..\..\..\AppData\Roaming\gravitas\kernel.db` caused the uninstaller to delete critical user data.
4. **Intermediate Junction Bypass:** Reparse points were tested only on `$ScriptDir` and the leaf file. If an intermediate directory (such as `resources`) was replaced with an NTFS directory junction, the uninstaller traversed through it and deleted external files.

---

## 2. Hardened Architecture: Embedded Independent Allowlist

In Wave V1-D-A-R3, the uninstaller's trust model was redesigned so that **candidate deletion paths are strictly decoupled from the mutable installed inventory file**.

### 2.1 The Trusted Anchor: Build-Time `$EmbeddedAllowlist`
During packaging (`package-windows.mjs`), the exact relative paths and SHA-256 digests of all 121 application payload files are statically embedded into `Uninstall.ps1`:
```powershell
$EmbeddedAllowlist = @(
    @{ Path = 'chrome_100_percent.pak'; Sha256 = 'ab7c4b7b6cb8832a31d44b95ec50ce52294f49422a3bdde4e21968eca2930cbe' },
    ... [121 build-time entries] ...
)
```
- **Trust Decoupling:** `Uninstall.ps1` **never** reads candidate deletion paths from `payload-inventory.json`.
- **Falsification Principle Satisfied:** Changing, adding, or modifying entries in `payload-inventory.json` grants **zero** deletion authority.

---

## 3. Defense-in-Depth Mechanisms

### 3.1 Strict Path Containment & Normalization
Before evaluating any candidate path:
1. Reject segments containing `..`, `:`, rooted leading slashes, UNC paths, or whitespace:
   ```powershell
   if ($rel.Contains('..') -or $rel.Contains(':') -or $rel.StartsWith('\') -or [string]::IsNullOrWhiteSpace($rel)) {
       Write-Warning "Skipping invalid allowlist entry: $rel"
       continue
   }
   ```
2. Canonical full path resolution:
   ```powershell
   $full = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir $rel))
   ```
3. Strict prefix containment check:
   ```powershell
   $scriptDirPrefix = $ScriptDir + '\'
   if (-not $full.StartsWith($scriptDirPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
       Write-Warning "Skipping out-of-bounds candidate path: $full"
       continue
   }
   ```

### 3.2 Hierarchical Reparse Point / Junction Verification
To prevent junction-based traversal escapes through intermediate directories:
```powershell
function Test-ReparsePointInPath {
    param (
        [string]$Path,
        [string]$Root
    )
    $curr = [System.IO.Path]::GetFullPath($Path)
    $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\')
    while ($curr.Length -gt $rootFull.Length) {
        if (Test-Path -LiteralPath $curr) {
            $item = Get-Item -LiteralPath $curr -Force
            if ($item.Attributes.HasFlag([System.IO.FileAttributes]::ReparsePoint)) {
                return $true
            }
        }
        $parent = [System.IO.Path]::GetDirectoryName($curr)
        if ($parent -eq $curr -or [string]::IsNullOrEmpty($parent)) { break }
        $curr = $parent
    }
    return $false
}
```
If the leaf item or **any parent directory** between `$ScriptDir` and `$full` is an NTFS reparse point (junction or symlink), the uninstaller refuses deletion.

### 3.3 Hash-Gated Deletion & Modified Application File Policy
Before invoking `Remove-Item`:
```powershell
$fileHash = (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLower()
if ($fileHash -eq $entry.Sha256.ToLower()) {
    Remove-Item -LiteralPath $full -Force -ErrorAction SilentlyContinue
} else {
    if ($Force) {
        Remove-Item -LiteralPath $full -Force -ErrorAction SilentlyContinue
    } else {
        Write-Warning "Application file modified since installation; preserved for safety: $rel"
    }
}
```
- **Policy:** If an application binary has been modified (e.g. patched, corrupted, or replaced), it is **preserved by default** with a warning, preventing destruction of modified files unless explicitly requested via `-Force`.

### 3.4 Scoped Directory Pruning
`Uninstall.ps1` no longer recursively wipes arbitrary empty directories. Instead, it embeds `$OwnedDirectories`—the exact set of directories created by Gravitas at install time (sorted descending by depth). Only empty owned directories are removed; user-created directories are preserved.

### 3.5 Process-Path-Scoped Shutdown
Active Gravitas processes are only terminated if their executable path begins strictly with `$ScriptDir + '\'`, preventing accidental termination of unrelated processes with the same name.

---

## 4. Non-Self-Referential Inventory Design

To resolve the R2 inventory count discrepancy without circular SHA-256 dependencies:
- `payload-inventory.json` inventories only the 121 installable payload files.
- It explicitly declares itself as metadata:
  ```json
  {
    "version": "0.0.1",
    "builtAt": "2026-10-11T13:50:12.000Z",
    "metadataFile": "resources/app/payload-inventory.json",
    "packagedTotalFiles": 122,
    "payloadFileCount": 121,
    "inventoryMetadataFileCount": 1,
    "files": [ ... 121 entries ... ]
  }
  ```
- **Accounting Reconciliation:**
  `PACKAGED_TOTAL_FILES (122) = PAYLOAD_FILES (121) + INVENTORY_METADATA_FILES (1)`
  `UNINVENTORIED_PAYLOAD_FILES = 0`

---

## 5. Security Boundary & Threat Model Scope

### What This Architecture RESISTS:
1. Malicious edits to `payload-inventory.json` attempting to delete arbitrary files on the filesystem.
2. Parent directory traversal (`..\..\`) toward sensitive user profile folders or system paths.
3. Path escaping via alternate data streams (`:`), UNC paths (`\\`), or rooted drive paths (`C:\`).
4. NTFS junction or symlink substitution on intermediate subfolders or leaf targets.
5. Accidental deletion of unrelated user files or user data (`%APPDATA%\gravitas`).
6. Uninstaller crash or incomplete binary deletion when `payload-inventory.json` is missing or corrupt.

### What This Architecture DOES NOT RESIST (Explicit Boundary Limitations):
1. **Compromised User Session:** An attacker with code execution privileges in the user's session can directly overwrite `Uninstall.ps1` or run arbitrary PowerShell commands as the user. (The uninstaller is a local, unsigned per-user script).
2. **Elevated Attackers:** An administrator can modify files and NTFS permissions arbitrarily.
3. **Signed Code Authenticity:** Without an Authenticode code-signing certificate, the package cannot prove publisher identity against man-in-the-middle download attacks.
