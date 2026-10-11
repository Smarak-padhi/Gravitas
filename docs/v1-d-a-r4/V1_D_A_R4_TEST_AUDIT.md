# GRAVITAS Wave V1-D-A-R4: Adversarial Test Suite Audit

**Document:** `docs/v1-d-a-r4/V1_D_A_R4_TEST_AUDIT.md`  
**Wave:** V1-D-A-R4 (Adversarial Acceptance-Test Hardening)  
**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Starting Commit:** `8135fffd34e6a1fa233f876a92151201beffd803`  
**Date:** 2026-10-12  

---

## 1. Executive Summary

In Wave V1-D-A-R4, the adversarial acceptance-test suite (`scripts/test-uninstall-adversarial.mjs`) was audited, overhauled, and hardened to eliminate all instances of "test theater" and unverified pass claims.

All 20 test cases now enforce observable on-disk postconditions, real canary preservation, strict exit-code assertions, transparent platform link testing, and verified process lifecycle boundaries.

---

## 2. Forensic Audit of Previous Deficiencies & Remediations

| Case | Previous Weakness | Remediation Applied | Observable Postcondition Verified |
|---|---|---|---|
| **Case 3** | Unconditional `results.case3 = true` | Dedicated `abs-target-canary.txt` created at absolute path outside sandbox | `existsSync(absCanary) === true` |
| **Case 4** | Unconditional `results.case4 = true` | Dedicated `drive-rel-canary.txt` created; `C:drive-rel-canary.txt` injected | `existsSync(driveRelCanary) === true` |
| **Case 5** | Unconditional `results.case5 = true` | Dedicated `unc-target-canary.txt` created; `\\localhost\c$\...` injected | `existsSync(uncCanary) === true` |
| **Case 6** | Unconditional `results.case6 = true` | Dedicated `mixed-sep-canary.txt` created; mixed slashes `..//` and `..\\//` injected | `existsSync(mixedSepCanary) === true` |
| **Case 7** | Unconditional `results.case7 = true` | `UPPERCASE_UNRELATED.TXT` created; `GRAVITAS.EXE` duplicate injected | `existsSync(upperCaseCanary) === true && !existsSync(Gravitas.exe)` |
| **Case 10** | Single execution without `-Force` verification | Two-step test: without `-Force` (asserts preservation + warning) and with `-Force` (asserts deletion) | Non-force: `existsSync(targetFile) === true`; Force: `!existsSync(targetFile) === true` |
| **Case 13** | Blind `catch (_)` swallowing all errors | Captures exit code, asserts `exitCode !== 0`, checks error message regex `/reparse\s*point/i`, asserts target preserved | `juncRes.exitCode === 1 && /reparse\s*point/i.test(stderr) && existsSync(target)` |
| **Case 14** | Missing candidate payload in junction target | Adds candidate payload under junction target to test leaf deletion traversal through intermediate junction | `existsSync(victimFile) && existsSync(victimPayload) && /reparse\s*point/i.test(...)` |
| **Case 15** | Substituted `HardLink` for `SymbolicLink` | Uses native `fs.symlinkSync(..., 'file')` to create genuine NTFS file symbolic link; tests `lstatSync.isSymbolicLink()` | Real symlink: `existsSync(symTargetCanary) === true` (PASS). If unprivileged: reports `BLOCKED` |
| **Case 16** | Unconditional `results.case16 = true` without checks | Checks removal of remaining allowlisted files, preservation of unrelated files, preservation of user DB, clean exit 0 | `!existsSync(ffmpeg.dll) && existsSync(keepMe) && existsSync(retDb) && exitCode === 0` |
| **Case 18** | Launched Electron with CLI params; unconditional `true` | Copies Windows `ping.exe` mock to both internal and external `Gravitas.exe`; verifies both alive before uninstall | Internal terminated: `!isPidAlive(internalPid)`; External preserved: `isPidAlive(externalPid)` |
| **All Cases** | Host Desktop shortcut pollution | Added `cleanHostShortcuts()` removing `Gravitas.lnk` in test `finally` block | Zero host pollution; zero orphan processes |

---

## 3. Physical Test Execution Results

```text
[ADVERSARIAL] Running 20 Mandatory Hardened Adversarial Acceptance Tests...

[TEST 1-9] Testing Inventory Tampering and Path Escape Rejection...
  PASS: Case 1 - Outside parent traversal canary preserved
  PASS: Case 2 - Multi-level traversal user data canary preserved
  PASS: Case 3 - Absolute Windows path canary preserved
  PASS: Case 4 - Drive relative path canary preserved
  PASS: Case 5 - UNC / device path canary preserved
  PASS: Case 6 - Mixed separators traversal canary preserved
  PASS: Case 7 - Case-insensitive duplicates handled safely; uppercase unrelated file preserved, legitimate exe removed
  PASS: Case 8 - Invented unrelated file in app root preserved
  PASS: Case 9 - Invented file with matching hash preserved (embedded allowlist enforced)

[TEST 10] Testing policy for modified legitimate installed file...
  PASS: Case 10 - Modified application file preserved without -Force and removed with -Force per documented policy

[TEST 11] Testing uninstaller execution when inventory is missing...
  PASS: Case 11 - Missing inventory: uninstaller exited 0 and cleaned up application binaries via embedded allowlist

[TEST 12] Testing uninstaller execution when inventory is corrupt...
  PASS: Case 12 - Corrupt inventory: uninstaller exited 0 and safely executed via embedded allowlist

[TEST 13] Testing root junction rejection...
  PASS: Case 13 - Root directory junction rejected immediately with exit code 1; target preserved

[TEST 14] Testing nested intermediate directory junction traversal prevention...
  PASS: Case 14 - Nested intermediate directory junction traversal blocked; victim files preserved

[TEST 15] Testing symlinked leaf payload file...
  PASS: Case 15 - Real NTFS file symlink detected; target canary preserved

[TEST 16 & 17] Testing partial uninstall retry and repeated uninstall...
  PASS: Case 16 - Partial uninstall retry verified: remaining payload removed, unrelated file & user DB preserved, exit code 0
  PASS: Case 17 - Repeated uninstall exited cleanly with code 0; uninstaller removed itself

[TEST 18] Testing termination of active process running strictly from target & preservation of external process...
  PASS: Case 18 - Active internal process (PID 12284) terminated cleanly; external process (PID 10192) preserved

[TEST 19] Testing preservation of unrelated files and AppData...
  PASS: Case 19 - Unrelated file and AppData user database 100% preserved; application binaries removed

[TEST 20] Testing clean normal install and complete uninstallation...
  PASS: Case 20 - Normal install/uninstall completed cleanly with exit code 0

======================================================
[ADVERSARIAL] Completed: 20 passed, 0 blocked / 20 total tests
======================================================
[ADVERSARIAL] ALL EXECUTABLE ADVERSARIAL TESTS PASSED!
```
