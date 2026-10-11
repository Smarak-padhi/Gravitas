# GRAVITAS Wave V1-D-A-R5: Red/Green Negative-Control Evidence

**Date:** 2026-10-12  
**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Branch:** `feat/v0-golden-loop`  
**Base Commit:** `cb723e09dadfa90748d5e19e7821b31ec7f8426a`

---

## 1. Negative-Control Suite Architecture

The negative-control test suite (`scripts/test-uninstall-negative-controls.mjs`) executes hostile mutated test doubles and simulated harness conditions to verify that test assertions fail closed when vulnerabilities are present.

### Control Suite Summary (8 / 8 Confirmed)

| Control ID | Target Failure / Vulnerability | Test Mechanism | Assertion Triggered | Status |
|:---|:---|:---|:---|:---|
| **Control 1** | Traversal Deletion | Mutated uninstaller executing unsanitized relative paths | External canary deletion detected | **PASS (RED CONFIRMED)** |
| **Control 2** | Indiscriminate App Directory Purge | Mutated uninstaller deleting untracked files (`Remove-Item $InstallDir\*`) | User document deletion detected | **PASS (RED CONFIRMED)** |
| **Control 3** | Unscoped Process Termination | Mutated uninstaller killing all node processes indiscriminately | Unscoped kill detected | **PASS (RED CONFIRMED)** |
| **Control 4** | Junction Traversal | Mutated uninstaller following junction into victim folder | Victim directory deletion detected | **PASS (RED CONFIRMED)** |
| **Control 5** | Corrupt Inventory Crash | Uninstaller executed with truncated/malformed JSON inventory | Missing/corrupt inventory error detected | **PASS (RED CONFIRMED)** |
| **Control A** | False-Clean Zero Exit on BLOCKED Case | Simulated runner execution with `GRAVITAS_SIMULATE_BLOCKED=1` | Nonzero exit code 2 enforced | **PASS (RED CONFIRMED)** |
| **Control B** | Injected UNC Deletion Assertion | Mutated uninstaller deleting exact target canary | Target canary disappearance detected | **PASS (RED CONFIRMED)** |
| **Control C** | Reparse Point Check Bypass | Mutated uninstaller omitting `Test-ReparsePointInPath` | Missing reparse-refusal warning detected | **PASS (RED CONFIRMED)** |

---

## 2. Terminal Execution Log: Hostile Negative Controls

```text
[NEGATIVE CONTROLS] Running Hostile Negative Controls against Flawed Uninstallers & Harness Gates...

[CONTROL 1] Testing detection of path traversal deletion via flawed uninstaller...
  PASS (RED CONTROL CONFIRMED): Flawed uninstaller deleted traversal canary; negative control caught the vulnerability!

[CONTROL 2] Testing detection of indiscriminate folder deletion via flawed uninstaller...
  PASS (RED CONTROL CONFIRMED): Flawed uninstaller wiped unrelated user file; negative control caught indiscriminate deletion!

[CONTROL 3] Testing detection of unscoped process termination via flawed uninstaller...
  PASS (RED CONTROL CONFIRMED): Flawed uninstaller killed unrelated process; negative control caught unscoped termination!

[CONTROL 4] Testing detection of junction traversal via flawed uninstaller...
  PASS (RED CONTROL CONFIRMED): Flawed uninstaller traversed junction and deleted victim; negative control caught junction vulnerability!

[CONTROL 5] Testing detection of uninstaller failure on corrupt inventory JSON...
  PASS (RED CONTROL CONFIRMED): Uninstaller safely refused/failed on corrupt inventory JSON (exit code: 1)!

[CONTROL A] Testing that simulated BLOCKED mandatory case produces nonzero exit code...
  PASS (RED CONTROL CONFIRMED): Simulated BLOCKED mandatory test resulted in nonzero process exit (code 2); runner strictly enforces no false-clean exit!

[CONTROL B] Testing detection when an uninstaller deletes an exact UNC target canary...
  PASS (RED CONTROL CONFIRMED): Flawed uninstaller deleted exact target canary; target-preservation assertion caught deletion!

[CONTROL C] Testing detection when an uninstaller bypasses reparse-point rejection...
  PASS (RED CONTROL CONFIRMED): Bypassing reparse check failed the reparse-refusal assertion (even though target survived); harness strictly requires positive refusal signal!

======================================================
[NEGATIVE CONTROLS] Summary: 8 / 8 confirmed
======================================================
[NEGATIVE CONTROLS] ALL 8 HOSTILE NEGATIVE CONTROLS CONFIRMED DISCRIMINATIVE POWER (FAIL-CLOSED)!
```

---

## 3. Terminal Execution Log: Adversarial Acceptance Suite

```text
======================================================
[ADVERSARIAL] Starting 20 Acceptance Test Cases...
======================================================

[TEST 1-14] Testing inventory tampering & path traversal defenses...
  PASS: Case 1 - Inventory hash mismatch rejected
  PASS: Case 2 - Upward traversal (..\) rejected
  PASS: Case 3 - Absolute path canary preserved
  PASS: Case 4 - Drive relative path canary preserved
  BLOCKED: Case 5 - Physical UNC fixture cannot be safely provisioned without administrator rights (device path canary verified locally)
  PASS: Case 6 - Mixed separators canary preserved
  PASS: Case 7 - Case sensitivity & duplicate path rejected
  PASS: Case 8 - Trailing spaces & dots canary preserved
  PASS: Case 9 - Missing inventory detected and handled fail-closed
  PASS: Case 10 - Corrupted inventory detected and handled fail-closed
  PASS: Case 11 - Truncated inventory detected and handled fail-closed
  PASS: Case 12 - Protected %APPDATA%\gravitas database preserved
  PASS: Case 13 - Arbitrary executable payload rejected
  PASS: Case 14 - Unrelated user file in app dir preserved

[TEST 15] Testing symlinked leaf payload file...
  PASS: Case 15 - Real NTFS file symlink detected; reparse-point refusal signal emitted; target canary preserved with matching hash

[TEST 16] Testing junction app directory...
  PASS: Case 16 - Junction directory detected; uninstaller safely refused execution

[TEST 17] Testing concurrently running Gravitas instance...
  PASS: Case 17 - In-tree running instance terminated cleanly before file removal

[TEST 18] Testing external unrelated process with same binary name...
  PASS: Case 18 - External process outside install directory untouched and running

[TEST 19] Testing read-only payload files...
  PASS: Case 19 - Read-only files removed without interactive prompt or failure

[TEST 20] Testing deeply nested directory structure...
  PASS: Case 20 - Deep directory hierarchy pruned cleanly

======================================================
[ADVERSARIAL] Summary: 19 PASS, 1 BLOCKED, 0 FAIL / 20 total
======================================================
[ADVERSARIAL] BLOCKED: 1 mandatory test(s) blocked by environmental limitations. Nonzero exit required.
Exit code: 2
```

---

## 4. Analysis of Adversarial Results

1. **Reparse Point Defense Verified:**
   Case 15 confirmed that when `Gravitas.exe` is replaced with an NTFS symbolic link pointing to an external file with the exact matching SHA-256 hash, the uninstaller explicitly detects the reparse point, logs `WARNING: Refusing to delete file through reparse point/junction`, preserves the external file, and leaves its bytes unchanged.
2. **Device Path Traversal Defense Verified:**
   Case 5 verified that injecting a Windows device path (`\\?\C:\...`) pointing to an existing file with matching hash does not allow the uninstaller to delete the target.
3. **UNC Environmental Blocker:**
   Standard Windows user accounts cannot create local SMB network shares. In strict compliance with security rules forbidding tests against privileged administrative shares (`C$`) or remote networks, the physical UNC execution is marked `BLOCKED`, and the runner exits with code 2 to ensure visibility and prevent false acceptance.
