# GRAVITAS Wave V1-D-A-R5-E2: Fixture Feasibility and Acceptance Audit

**Date:** 2026-10-12  
**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Current Branch:** `feat/v0-golden-loop`  
**Base Commit:** `ef58ed74a58c3fa038fae33386dc3a81f06100ed`  
**Audit Scope:** Forensic evaluation of Case 5 implementation, negative Control B, and Windows SMB test fixture feasibility.

---

## 1. Phase 3 — Forensic Inspection of R5 Case 5 Implementation

Inspection of [`scripts/test-uninstall-adversarial.mjs`](file:///C:/Users/smara/Desktop/Multi-agent/scripts/test-uninstall-adversarial.mjs#L151-L246) reveals the exact runtime mechanics of Case 5:

### 1.1 Injected Inventory Entries
In Case 5, the test runner injects:
```javascript
// scripts/test-uninstall-adversarial.mjs line 197
inv.files.push({ path: devicePath, sha256: computeSha256(deviceCanary) })

// scripts/test-uninstall-adversarial.mjs lines 198-200
if (safeUncShareAvailable && uncFixtureTarget) {
  inv.files.push({ path: uncFixtureTarget, sha256: computeSha256(uncFixtureTarget) })
}
```
1. `devicePath`: Local device namespace path (`\\?\C:\Users\...\device-target-canary.txt`). Target file is physically written to disk with known content.
2. `uncFixtureTarget`: Local UNC path (`\\localhost\<shareName>\unc-canary-...txt`). Only injected if a safe user SMB share is discovered.

### 1.2 Device Canary Reachability & Assertion Flaw
The device canary (`deviceCanary`) is physically created under `sandboxDir` and is reachable. However, an inspection of line 232 reveals a subtle assertion tautology:
```javascript
// scripts/test-uninstall-adversarial.mjs line 232
const deviceCanaryPreserved = existsSync(deviceCanary) && computeSha256(deviceCanary) === computeSha256(deviceCanary)
```
- **Finding:** While `existsSync(deviceCanary)` genuinely proves the file still exists, `computeSha256(deviceCanary) === computeSha256(deviceCanary)` compares the file's current hash against itself rather than comparing against a stored pre-uninstall hash variable (`preDeviceHash`). While not compromising safety (since the file is not touched at all), this tautological comparison is technically imperfect and should store `preDeviceHash` before uninstallation.

### 1.3 `Get-SmbShare` Capability Probe vs Actual Fixture
Lines 158–169 execute:
```powershell
Get-SmbShare | Where-Object { -not $_.Name.EndsWith("$") } | Select-Object -ExpandProperty Name
```
- **Finding:** This code is a **passive host capability probe**, NOT a test fixture provisioner. It queries whether the developer's personal machine happens to already have existing non-administrative file shares configured.
- When run on a clean developer machine or standard client installation, no non-administrative user SMB shares exist.
- Because creating a new SMB share on Windows requires Administrator privileges (`SeSecurityPrivilege`), an unprivileged process cannot provision a local share.
- The test correctly observes that no unprivileged user share exists and takes the fail-closed `else` branch (lines 241–246), setting `results.case5_uncOrDevicePath = 'BLOCKED: ...'`.

### 1.4 Exit Code Enforcement
Lines 576–579:
```javascript
if (blockedCount > 0) {
  console.error(`[ADVERSARIAL] BLOCKED: ${blockedCount} mandatory test(s) blocked by environmental limitations. Nonzero exit required.`)
  process.exit(2)
}
```
- **Finding:** The test runner strictly exits with code 2 whenever any mandatory test is blocked, preventing false-clean zero exit status.

---

## 2. Phase 4 — Forensic Audit of Negative Control B

Inspection of [`scripts/test-uninstall-negative-controls.mjs`](file:///C:/Users/smara/Desktop/Multi-agent/scripts/test-uninstall-negative-controls.mjs#L238-L263) reveals:

```javascript
// scripts/test-uninstall-negative-controls.mjs lines 242-253
console.log('\n[CONTROL B] Testing detection when an uninstaller deletes an exact UNC target canary...')
const cBDir = join(testRoot, 'cB-sandbox')
mkdirSync(cBDir, { recursive: true })
const cBCanary = join(cBDir, 'unc-target-canary.txt')
writeFileSync(cBCanary, 'CANARY TO BE DELETED BY UNSAFE DOUBLE')

// Flawed uninstaller that specifically deletes the targeted canary
const flawedUninstallerB = `
  $canary = "${cBCanary.replace(/\\/g, '\\\\')}"
  Remove-Item -LiteralPath $canary -Force -ErrorAction SilentlyContinue
`
execFileSync('powershell.exe', ['-NoProfile', '-Command', flawedUninstallerB])

const uncDeletionDetected = !existsSync(cBCanary)
if (uncDeletionDetected) {
  results.controlB_uncTargetDeletionDetection = true
  ...
}
```

### 2.1 Audit Findings on Control B
1. **Target Classification:** Uses a purely local filesystem path under `tmpdir()` (`cBCanary = join(cBDir, 'unc-target-canary.txt')`). It does NOT use a genuine UNC path (`\\server\share`).
2. **Execution Classification:** Executes a synthetic 2-line PowerShell script double (`flawedUninstallerB`), NOT a mutated version of `Uninstall.ps1`.
3. **Discriminative Power:** It proves that if a flawed uninstaller deletes a referenced canary, the test assertion (`!existsSync(cBCanary)`) detects the deletion.
4. **Production Relevancy:** It proves nothing about the production uninstaller's UNC handling or network stack interaction.
5. **Formal Classification:** Explicitly **`SYNTHETIC_LOCAL_PROXY`**, NOT physical UNC validation.

---

## 3. Phase 5 — Safe Fixture Feasibility Analysis

We analyze five candidate testing mechanisms for evaluating UNC deletion safety:

| Fixture Option | Admin Required? | Network Exposure | Tests Physical UNC? | Feasible & Safe for Acceptance? |
| :--- | :---: | :---: | :---: | :--- |
| **Option 1: Existing isolated SMB share** | No (if pre-existing) | Local LAN / Host | Yes | **UNSUITABLE.** In standard client environments, non-admin users do not have pre-existing shares. Probing user shares risks touching developer personal files. |
| **Option 2: Loopback-only disposable SMB service** | **YES** | Localhost (`127.0.0.1`) | Yes | **INFEASIBLE.** Windows kernel service `LanmanServer` reserves TCP port 445 and 139. Non-admin processes cannot bind port 445 or install kernel drivers. |
| **Option 3: Disposable Windows VM on private virtual switch** | **YES** (hypervisor setup) | Isolated Host-Only Switch | Yes | **SUITABLE FOR VM ACCEPTANCE.** High isolation, but requires clean virtual machine infrastructure outside unprivileged test process. |
| **Option 4: Local `\\?\` Windows device path** | **NO** | None | No (Local NTFS) | **SUITABLE FOR UNC-C.** Validates device-namespace canonicalization without network dependencies. |
| **Option 5: Synthetic local-path proxy** | **NO** | None | No | **SUITABLE FOR NEGATIVE CONTROLS ONLY.** Confirms test harness fail-closed behavior, not production uninstaller behavior. |

### 3.1 The Windows Port 445 & SMB Service Constraint
On Windows:
1. TCP port 445 is bound exclusively by the Windows kernel system process (`System`, PID 4) for SMB file sharing via the driver `srv2.sys`.
2. Even on `127.0.0.1`, user-mode applications cannot bind port 445 without disabling Windows file sharing.
3. Managing shares via `New-SmbShare` or `net share` calls into the Server Service RPC interface, requiring `Administrators` or `Server Operators` group membership.
4. Therefore, **an unprivileged user process cannot safely or transiently provision a loopback SMB share on Windows.**

### 3.2 Prerequisites for a Preferred Physical SMB Fixture (If Deemed Mandatory)
If the project leadership determines that physical remote SMB canary testing (**UNC-B**) is mandatory for release:
1. **Isolated Infrastructure:** Must be executed within an isolated Windows VM or continuous integration test runner on a private host-only virtual network.
2. **Strict Share Scoping:** Must use a dedicated disposable share name (e.g. `\\gravitas-test-host\gravitas-disposable-share\`).
3. **No Administrative Shares:** Must strictly forbid `C$`, `ADMIN$`, `IPC$`, or any system drive root.
4. **Dedicated Canary:** Must contain only transient canary files with pre-recorded SHA-256 digests.
5. **Automated Teardown:** Must verify complete deletion of the disposable share and temporary directory upon test completion.
6. **Explicit Human Gate:** Must require explicit administrator consent prior to provisioning.
