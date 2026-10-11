# GRAVITAS Wave V1-D-A-R4: Discriminative Negative Controls

**Document:** `docs/v1-d-a-r4/V1_D_A_R4_NEGATIVE_CONTROLS.md`  
**Wave:** V1-D-A-R4 (Adversarial Acceptance-Test Hardening)  
**Script:** `scripts/test-uninstall-negative-controls.mjs`  
**Date:** 2026-10-12  

---

## 1. Overview & Methodology

To prove that the hardened test assertions in `scripts/test-uninstall-adversarial.mjs` possess genuine discriminative power (falsifiability) and do not pass trivially, a dedicated negative control test suite was constructed: `scripts/test-uninstall-negative-controls.mjs`.

The suite tests the hardened assertions against 5 deliberately vulnerable or broken mock uninstallers. In each case, the test assertion must fail closed (Red) when exposed to the vulnerability, proving that the assertion is sensitive and incapable of reporting false confidence.

---

## 2. The 5 Negative Controls

### Control 1: Path Traversal Vulnerability Detection
- **Flawed Behavior:** Uninstaller trusts relative paths in `payload-inventory.json` without sanitization or allowlist gating, deleting `..\outside-canary.txt`.
- **Test Assertion:** Asserts existence of `outside-canary.txt`.
- **Observed Result:** Flawed uninstaller deleted the canary; the test assertion detected the missing file and flagged failure.
- **Classification:** **CONFIRMED FAIL-CLOSED (PASS)**

### Control 2: Indiscriminate Deletion Vulnerability Detection
- **Flawed Behavior:** Uninstaller executes `Remove-Item * -Recurse` on the app directory, deleting unlisted user notes (`my-precious-note.txt`).
- **Test Assertion:** Asserts existence of `my-precious-note.txt`.
- **Observed Result:** Flawed uninstaller deleted the user note; the test assertion detected the deletion and flagged failure.
- **Classification:** **CONFIRMED FAIL-CLOSED (PASS)**

### Control 3: Unscoped System-Wide Process Termination Detection
- **Flawed Behavior:** Uninstaller executes `Stop-Process -Name Gravitas -Force` globally without scoping by `MainModule.FileName` to `$ScriptDir`.
- **Test Assertion:** Asserts that external same-named process (`childExternal.pid`) is still alive.
- **Observed Result:** Flawed uninstaller killed the external process; the test assertion detected the process death and flagged failure.
- **Classification:** **CONFIRMED FAIL-CLOSED (PASS)**

### Control 4: Directory Junction Traversal Detection
- **Flawed Behavior:** Uninstaller deletes through intermediate directory junctions into external folders without `Test-ReparsePointInPath` validation.
- **Test Assertion:** Asserts existence of `victimPayload` under junction target.
- **Observed Result:** Flawed uninstaller deleted through the junction; the test assertion detected the deletion and flagged failure.
- **Classification:** **CONFIRMED FAIL-CLOSED (PASS)**

### Control 5: Corrupt Inventory Fragility Detection
- **Flawed Behavior:** Uninstaller throws an unhandled terminating exception when `payload-inventory.json` contains malformed JSON syntax.
- **Test Assertion:** Asserts that uninstaller completes cleanly with exit code 0 using the embedded build-time allowlist.
- **Observed Result:** Flawed uninstaller crashed with terminating error; the test assertion caught the non-zero exit code.
- **Classification:** **CONFIRMED FAIL-CLOSED (PASS)**

---

## 3. Physical Test Execution Output

```text
[NEGATIVE CONTROLS] Running 5 Hostile Negative Controls against Flawed Uninstallers...

[CONTROL 1] Testing detection of path-traversal vulnerable uninstaller...
  PASS (RED CONTROL CONFIRMED): Flawed uninstaller deleted canary; test assertion successfully caught traversal vulnerability!

[CONTROL 2] Testing detection of indiscriminate deletion uninstaller...
  PASS (RED CONTROL CONFIRMED): Flawed uninstaller deleted user note; test assertion successfully caught indiscriminate deletion!

[CONTROL 3] Testing detection of unscoped system-wide process killer...
  PASS (RED CONTROL CONFIRMED): Flawed uninstaller killed external process; test assertion successfully caught unscoped termination!

[CONTROL 4] Testing detection of junction-oblivious uninstaller...
  PASS (RED CONTROL CONFIRMED): Flawed uninstaller deleted through junction; test assertion successfully caught reparse-point traversal!

[CONTROL 5] Testing detection of corrupt inventory crash vulnerability...
  PASS (RED CONTROL CONFIRMED): Flawed uninstaller crashed on corrupt inventory; test assertion successfully caught brittle uninstaller failure!

======================================================
[NEGATIVE CONTROLS] Completed: 5 / 5 negative controls confirmed
======================================================
[NEGATIVE CONTROLS] ALL 5 NEGATIVE CONTROLS CONFIRMED DISCRIMINATIVE POWER (FAIL-CLOSED)!
```
