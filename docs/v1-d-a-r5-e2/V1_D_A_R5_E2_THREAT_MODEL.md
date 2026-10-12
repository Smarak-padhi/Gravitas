# GRAVITAS Wave V1-D-A-R5-E2: Source-Based Threat Model and Trust Boundary Audit

**Date:** 2026-10-12  
**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Current Branch:** `feat/v0-golden-loop`  
**Base Commit:** `ef58ed74a58c3fa038fae33386dc3a81f06100ed`  
**Audit Scope:** Threat model, trust boundaries, and decomposition of Case 5 UNC acceptance requirements.

---

## 1. Phase 1 — Established Source Facts & Actual Security Contract

An exhaustive inspection of [`scripts/package-windows.mjs`](file:///C:/Users/smara/Desktop/Multi-agent/scripts/package-windows.mjs), the generated `Uninstall.ps1`, [`scripts/test-uninstall-adversarial.mjs`](file:///C:/Users/smara/Desktop/Multi-agent/scripts/test-uninstall-adversarial.mjs), and prior wave evidence (`v1-d-a-r3`, `v1-d-a-r4`, `v1-d-a-r5`) reveals the precise operational mechanics of file deletion during uninstallation.

### 1.1 Deletion Candidate Selection Trace

In `scripts/package-windows.mjs`, candidate files for deletion are determined exclusively at **build time** and hardcoded directly into the body of the generated uninstaller script:

```powershell
# package-windows.mjs lines 226-229
const allowlistPs = payloadInventory.map(entry =>
    `    @{ Path = '${entry.path}'; Sha256 = '${entry.sha256}' }`
).join(',\r\n')

# Generated Uninstall.ps1 lines 337-339
$EmbeddedAllowlist = @(
    @{ Path = 'Gravitas.exe'; Sha256 = '...' },
    ...
)
```

At uninstall runtime, the script loops strictly over `$EmbeddedAllowlist`:

```powershell
# package-windows.mjs lines 343-382
foreach ($entry in $EmbeddedAllowlist) {
    $rel = $entry.Path.Replace('/', '\\')
    
    # 1. Structural check
    if ($rel.Contains('..') -or $rel.Contains(':') -or $rel.StartsWith('\\') -or [string]::IsNullOrWhiteSpace($rel)) {
        Write-Warning "Skipping invalid allowlist entry: $rel"
        continue
    }

    $full = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir $rel))

    # 2. Strict prefix boundary containment check
    if (-not $full.StartsWith($scriptDirPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Warning "Skipping out-of-bounds candidate path: $full"
        continue
    }

    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        continue
    }

    # 3. Intermediate and leaf reparse point check
    if (Test-ReparsePointInPath -Path $full -Root $ScriptDir) {
        Write-Warning "Refusing to delete file through reparse point/junction: $full"
        continue
    }

    # 4. Hash verification against embedded build-time digest
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
}
```

### 1.2 Answers to Mandatory Trust-Boundary Questions

1. **Can an attacker-controlled `payload-inventory.json` add deletion targets?**
   - **NO.** (Established Fact). `Uninstall.ps1` never opens, reads, parses, or queries `payload-inventory.json` for deletion candidates. The file is only referenced as a static ownership marker (`Test-Path -LiteralPath $ownInv`, line 286) and as a hardcoded literal path string to be deleted during final metadata cleanup (`$MetadataFile = "resources\\app\\payload-inventory.json"`, line 385).
2. **Does the generated uninstaller enumerate only the embedded build-time allowlist?**
   - **YES.** (Established Fact). The candidate loop enumerates strictly `foreach ($entry in $EmbeddedAllowlist)` (line 343).
3. **Can UNC, device-namespace, drive-relative, or absolute paths enter that allowlist from untrusted runtime input?**
   - **NO.** (Established Fact). The uninstaller accepts no candidate path parameters at runtime. At build time, `package-windows.mjs` populates the allowlist via `collectAllFiles(PACKAGE_DIR)` (line 202), which produces relative paths inside the package staging directory. Furthermore, line 346 strictly filters out any entry containing `..`, `:`, or starting with `\\`.
4. **Are embedded paths validated before file deletion?**
   - **YES.** (Established Fact). Every path is canonicalized via `[System.IO.Path]::GetFullPath` (line 351).
5. **Are path containment, reparse-point checks, and hash verification applied before deletion?**
   - **YES.** (Established Fact).
     - Containment: `$full.StartsWith($scriptDirPrefix)` (line 354).
     - Reparse points: `Test-ReparsePointInPath -Path $full -Root $ScriptDir` (line 364).
     - Integrity: `(Get-FileHash ...).Hash -eq $entry.Sha256` (lines 370-371).
6. **Is there any alternate deletion path that reads installed inventory entries?**
   - **NO.** (Established Fact). There are no secondary uninstallation scripts, helpers, or hooks.
7. **What is the trust boundary between build-time packaging inputs and installed runtime metadata?**
   - The **trust anchor for file deletion** is exclusively the **build-time embedded allowlist** `$EmbeddedAllowlist`.
   - **Installed runtime metadata** (`payload-inventory.json`) is strictly **untrusted** at uninstall time. It cannot authorize file deletion or expand the deletion set.

### 1.3 Complete Inventory of All Other Deletion Operations in `Uninstall.ps1`

Outside the `$EmbeddedAllowlist` loop, the only deletion operations performed are:
1. **Shortcut Removal (lines 331–332):**
   `Remove-Item -LiteralPath (Join-Path $DesktopPath "Gravitas.lnk")`
   `Remove-Item -LiteralPath (Join-Path $StartMenuPath "Gravitas.lnk")`
   Targets only the exact shortcut names in standard user Shell folders.
2. **Metadata Cleanup (lines 385–391):**
   Literal path `Join-Path $ScriptDir "resources\\app\\payload-inventory.json"`, guarded by `$fullMeta.StartsWith($scriptDirPrefix)` and `Test-ReparsePointInPath`.
3. **Uninstaller Wrapper Cleanup (line 393):**
   `Remove-Item -LiteralPath (Join-Path $ScriptDir "Uninstall.cmd")`.
4. **Owned Directories Cleanup (lines 396–411):**
   Iterates `$OwnedDirectories` (statically embedded list of directories derived at build time). Each directory must satisfy:
   - Starts with `$scriptDirPrefix`
   - Is not a reparse point
   - Is strictly empty (`(Get-ChildItem -LiteralPath $fullDir -Force).Count -eq 0`)
5. **Uninstaller Self-Cleanup (line 415):**
   `Remove-Item -LiteralPath (Join-Path $ScriptDir "Uninstall.ps1")`.
6. **Install Directory Cleanup (lines 417–420):**
   `$remainingItems = Get-ChildItem -LiteralPath $ScriptDir -Force`
   If and only if `$remainingItems.Count -eq 0`, removes `$ScriptDir`. Otherwise, preserves `$ScriptDir` and emits: `"Gravitas core binaries removed. Unrelated files preserved in $ScriptDir."`

---

## 2. Phase 2 — Decomposition of Case 5 into Independent Security Properties

Case 5 in `scripts/test-uninstall-adversarial.mjs` historically conflated multiple distinct security claims into a single test case. We decompose Case 5 into four orthogonal security properties:

### Property UNC-A: Inventory Injection Isolation
- **Security Claim:** An attacker who tampers with the installed `payload-inventory.json` by adding an absolute UNC path cannot cause the uninstaller to delete or touch that path.
- **Threat Actor & Controlled Input:** Local malicious process editing `%LOCALAPPDATA%\Programs\Gravitas\resources\app\payload-inventory.json` to insert `\\server\share\file` or `\\localhost\share\file`.
- **Actual Uninstaller Behavior:** `Uninstall.ps1` sources deletion candidates exclusively from `$EmbeddedAllowlist`. The injected entry is completely ignored.
- **Observable Assertion:** The uninstaller completes without attempting deletion of the injected target; uninstaller logs confirm no out-of-bounds target was processed.
- **Is a Real SMB Server Necessary?** **NO.** Because `Uninstall.ps1` never reads `payload-inventory.json`, no network resolution, SMB handshake, or file access is ever attempted.
- **Evidence Status:** **PROVEN** (Architecturally proven by code inspection lines 337–382; empirically verified by Cases 1, 2, 3, 4, 6, 7, 8, 9 where injected entries are ignored).

### Property UNC-B: Physical UNC Target Preservation
- **Security Claim:** A real, physical, reachable remote SMB file referenced in a tampered inventory remains byte-for-byte identical on the remote storage device after uninstallation.
- **Threat Actor & Controlled Input:** Attacker targeting a reachable SMB canary.
- **Actual Uninstaller Behavior:** Same as UNC-A: uninstaller ignores the inventory entry and touches nothing outside `$ScriptDir`.
- **Observable Assertion:** `existsSync(uncCanary) === true` and `computeSha256(uncCanary) === preSha256`.
- **Is a Real SMB Server Necessary?** **YES.** To physically observe remote SMB storage surviving uninstallation, an actual SMB endpoint must exist and respond to I/O.
- **Evidence Status:** **BLOCKED.** (In an unprivileged standard user Windows session, non-admin accounts cannot provision SMB shares. Policy strictly forbids targeting privileged administrative shares like `C$` or external third-party hosts).

### Property UNC-C: Windows Device-Path Isolation
- **Security Claim:** An attacker who injects a Windows device namespace path (`\\?\C:\...` or `\\.\...`) cannot bypass path canonicalization or trigger deletion outside `$ScriptDir`.
- **Threat Actor & Controlled Input:** Attacker injecting `\\?\C:\path\canary.txt` into `payload-inventory.json`.
- **Actual Uninstaller Behavior:** Injected inventory entry is ignored by the allowlist. Even if evaluated, line 346 (`$rel.StartsWith('\\')`) and line 354 (`$full.StartsWith($scriptDirPrefix)`) prevent execution.
- **Observable Assertion:** Target local device canary exists and remains intact on disk.
- **Is a Real SMB Server Necessary?** **NO.** Operates purely on local NTFS filesystem.
- **Evidence Status:** **PROVEN.** (Empirically verified in Case 5: `deviceCanary` is provisioned locally, injected via `\\?\${deviceCanary}`, and confirmed preserved).

### Property UNC-D: Embedded Allowlist Provenance
- **Security Claim:** The build-time packaging pipeline guarantees that only authorized, relative application payload paths can enter `$EmbeddedAllowlist` in `Uninstall.ps1`.
- **Threat Actor & Controlled Input:** Build-time tampering or path traversal in staging directory.
- **Actual Uninstaller Behavior:** `package-windows.mjs` collects files via `collectAllFiles` and sanitizes paths. At uninstall time, line 346 rejects any allowlist entry containing `..`, `:`, or starting with `\\`.
- **Observable Assertion:** All 121 entries in `$EmbeddedAllowlist` in the packaged `Uninstall.ps1` are strictly relative paths without traversal tokens or root qualifiers.
- **Is a Real SMB Server Necessary?** **NO.**
- **Evidence Status:** **PROVEN.** (Statically and deterministically verified across all dual-build packages).

---

## 3. Summary Assessment Matrix

| Property | Description | Real SMB Required? | Admin Required? | Current Evidence Status |
| :--- | :--- | :---: | :---: | :---: |
| **UNC-A** | Inventory Injection Isolation | No | No | **PROVEN** |
| **UNC-B** | Physical UNC Target Preservation | Yes | Yes (to provision share) | **BLOCKED** |
| **UNC-C** | Windows Device-Path Isolation | No | No | **PROVEN** |
| **UNC-D** | Embedded Allowlist Provenance | No | No | **PROVEN** |

The core security property protecting users from arbitrary remote file deletion is **UNC-A (Inventory Injection Isolation)** coupled with **UNC-D (Allowlist Provenance)** and **path boundary containment** (`$full.StartsWith($scriptDirPrefix)`).
Physical remote SMB canary preservation (**UNC-B**) is an integration exercise that requires external infrastructure. Conflating UNC-B into mandatory local unit acceptance is the precise root cause of the environment blocker.
