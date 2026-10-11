# GRAVITAS Wave V1-D-A-R5: Findings and Repairs

**Date:** 2026-10-12  
**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Branch:** `feat/v0-golden-loop`  
**Base Commit:** `cb723e09dadfa90748d5e19e7821b31ec7f8426a`  
**Scope:** Test-evidence and harness hardening (`scripts/test-uninstall-adversarial.mjs`, `scripts/test-uninstall-negative-controls.mjs`, `docs/v1-d-a-r5/`). Zero production or installer generator changes.

---

## 1. Executive Summary

Wave V1-D-A-R5 resolves three concrete audit findings identified in the Wave V1-D-A-R4 adversarial test suite:
1. **Finding R5-01 (Runner Exit Logic):** The adversarial test runner allowed tests classified as `BLOCKED` to coexist with an overall process exit code of 0.
2. **Finding R5-02 (Case 5 UNC Target & Fixture):** Case 5 targeted a privileged administrative share (`\\localhost\c$\gravitas-unc-dummy.txt`) while asserting survival of an unrelated local canary (`unc-target-canary.txt`).
3. **Finding R5-03 (Case 15 Symlink Verification Rigor):** Case 15 proved NTFS symlink creation and external canary survival, but did not rule out hash mismatch or verify the positive reparse-point refusal signal emitted by the uninstaller.

All three findings have been resolved in the acceptance test suite. In accordance with strict security specifications forbidding targeting privileged administrative shares (`C$`) or arbitrary network endpoints, unprivileged UNC fixture provisioning without administrator elevation is classified as `BLOCKED`, and the test runner enforces a fail-closed nonzero exit code (exit 2).

---

## 2. Detailed Findings and Implementation Repairs

### Finding R5-01: Adversarial Runner Fail-Closed Exit Enforcement

- **Vulnerability / Weakness:** In Wave V1-D-A-R4, `scripts/test-uninstall-adversarial.mjs` checked:
  ```javascript
  if (passedCount + blockedCount !== totalCount || passedCount < totalCount - blockedCount) {
    process.exit(1)
  } else {
    // Exited 0 even if blockedCount > 0!
  }
  ```
  This permitted environment-blocked cases to masquerade as an overall clean pass in automated CI/orchestrator pipelines.
- **Repair:**
  The exit logic in `scripts/test-uninstall-adversarial.mjs` was restructured to strictly fail closed:
  ```javascript
  if (blockedCount > 0) {
    console.error(`[ADVERSARIAL] BLOCKED: ${blockedCount} mandatory test(s) blocked by environmental limitations. Nonzero exit required.`)
    process.exit(2)
  }

  if (failedCount > 0) {
    console.error(`[ADVERSARIAL] FAIL: ${failedCount} adversarial test(s) failed assertion!`)
    process.exit(1)
  }

  if (passedCount !== totalCount) {
    console.error(`[ADVERSARIAL] Incomplete run: only ${passedCount}/${totalCount} tests passed.`)
    process.exit(1)
  }

  console.log('[ADVERSARIAL] ALL 20 MANDATORY ADVERSARIAL TESTS PASSED!')
  ```
  Additionally, an environment variable hook (`process.env.GRAVITAS_SIMULATE_BLOCKED === '1'`) was provided for automated negative control harness testing.

---

### Finding R5-02: Case 5 UNC Fixture & Device Path Integrity

- **Vulnerability / Weakness:**
  1. **Canary Mismatch:** Case 5 previously created a local canary `unc-target-canary.txt`, but injected `\\localhost\c$\gravitas-unc-dummy.txt` into `payload-inventory.json`. It then asserted `existsSync(uncCanary)`, asserting the survival of a file that was never targeted by the uninstaller.
  2. **Privileged Share Violation:** Injecting `\\localhost\c$\...` targeted a privileged administrative Windows share (`C$`), violating the least-privilege sandbox and security testing policy.
- **Repair:**
  1. **Eliminated Canary Mismatch:** Case 5 now creates a local device path canary (`\\?\...`) with known hash, injects its path and hash into `payload-inventory.json`, and asserts survival of that exact file and digest.
  2. **Non-Administrative Share Inspection:** Case 5 attempts to query existing non-administrative user SMB shares. On standard Windows client systems without administrator rights, non-admin accounts cannot create new SMB shares (`New-SmbShare` fails with `Access Denied`).
  3. **Mandatory Policy Compliance:** In strict adherence to Section 1 ("Do not use real system files, privileged administrative shares, or arbitrary network hosts as deletion targets. If a reachable UNC fixture cannot be safely provisioned without administrator rights or host configuration changes, classify the UNC-specific physical case as BLOCKED, exit nonzero, and document the limitation"), Case 5 marks the UNC scenario as `BLOCKED` with nonzero exit (code 2), while proving device-path canonicalization safety locally.

---

### Finding R5-03: Case 15 Symlink Reparse-Point Refusal Verification

- **Vulnerability / Weakness:**
  Case 15 created a symlink from `Gravitas.exe` to an external dummy text file (`symlink-target-canary.txt`), ran the uninstaller, and checked `existsSync(symTargetCanary)`.
  This had two major gaps:
  1. The dummy text file had a different SHA-256 hash than `Gravitas.exe`. Therefore, the uninstaller could have skipped deleting it due to hash mismatch rather than reparse-point rejection.
  2. The test did not verify whether the uninstaller positively recognized the reparse point and emitted its refusal warning (`WARNING: Refusing to delete file through reparse point/junction`).
- **Repair:**
  Case 15 was overhauled to provide rigorous proof of reparse-point refusal:
  1. The external target canary `symlink-target-canary.exe` is copied directly from `Gravitas.exe`, ensuring **100% identical file content and SHA-256 hash**.
  2. The original `Gravitas.exe` is replaced with a real NTFS file symbolic link pointing to `symlink-target-canary.exe`, verified via `lstatSync.isSymbolicLink()`.
  3. The uninstaller is executed and its output captured.
  4. The test verifies:
     - `symUninstRes.exitCode === 0` (clean execution without crash)
     - `existsSync(symTargetCanary)` (external target still exists)
     - `postCanaryHash === preCanaryHash` (exact bit-for-bit bytes preserved)
     - `/Refusing to delete file through reparse point\/junction/i.test(symText)` (positive verification that the uninstaller detected the reparse point and refused deletion).

---

## 3. Host Environment Constraints

| Security Property | Test Verification Mechanism | Host Constraint | Status |
|:---|:---|:---|:---|
| Device Path Traversal Defense | Injected `\\?\C:\...` with matching hash | Local NTFS filesystem | **PASS** |
| Reparse Point File Deletion Defense | Real NTFS symlink with matching hash & explicit refusal signal | Local NTFS filesystem | **PASS** |
| UNC Share Deletion Defense | Injected `\\localhost\<share>\<file>` | Creating SMB shares requires Windows elevation (`SeAuditPrivilege`/Administrator) | **BLOCKED (Exit 2)** |
| Runner Fail-Closed Gate | Negative Control A (Simulated BLOCKED) | Automated runner gate | **PASS** |

The classification of Case 5 as `BLOCKED` with exit code 2 is mathematically and operationally correct, ensuring that unverified physical UNC deletions cannot pass undetected.
