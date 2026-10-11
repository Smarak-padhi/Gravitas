# GRAVITAS Wave V1-D-A-R4: Independent Subagent Reviews

**Document:** `docs/v1-d-a-r4/V1_D_A_R4_SUBAGENT_REVIEWS.md`  
**Wave:** V1-D-A-R4 (Adversarial Acceptance-Test Hardening)  
**Starting Commit:** `8135fffd34e6a1fa233f876a92151201beffd803`  
**Review Cycles:** 2 (Phase 1 Diagnosis + Phase 5 Final Review)  
**Date:** 2026-10-12  

---

## 1. Review Summary Table

| Subagent | Role | Conversation ID | Phase 1 Diagnosis | Phase 5 Final Verdict | Both Reviewed Exact Candidate |
|---|---|---|---|---|---|
| **Subagent B** | Independent Security Reviewer | `67df143e-f13c-4dcd-8b61-9b993f92bb85` | Identified 7 unconditional assignments, hardlink substitution, missing process checks | **PASS** | **YES** |
| **Subagent C** | Build & Reproducibility Auditor | `bc3e8372-5397-4418-8aed-f183f03b0c69` | Identified exit-code omission, host shortcut pollution, flawed mock Electron spawn | **PASS** | **YES** |

---

## 2. Subagent B Report Summary (Security Reviewer)

- **Audited Files:** `scripts/test-uninstall-adversarial.mjs`, `scripts/test-uninstall-negative-controls.mjs`.
- **Findings:**
  1. All 7 unconditional boolean assignments (Cases 3–7, 16, 18) eliminated and replaced with tangible assertions.
  2. Cases 1–9 employ real on-disk canary targets and assert their survival after uninstallation.
  3. Case 10 tests both non-force preservation and force-enabled deletion.
  4. Cases 11 & 12 assert clean exit code 0 and binary cleanup via the embedded allowlist.
  5. Case 13 asserts non-zero exit code 1, reparse-point error output, and target preservation.
  6. Case 14 asserts intermediate junction refusal and victim file/payload preservation.
  7. Case 15 attempts a real NTFS file symbolic link and asserts canary survival (passed physically on host; includes fallback for unprivileged environments).
  8. Case 16 asserts remaining allowlist binaries removed, unrelated files preserved, user DB preserved, and clean exit.
  9. Case 18 asserts process liveness before uninstall, verifies internal process termination, and verifies external process preservation.
  10. Negative controls confirm fail-closed behavior across all 5 vulnerability archetypes.
- **Verdict:** **PASS**

---

## 3. Subagent C Report Summary (Build & Reproducibility Auditor)

- **Audited Files:** `scripts/test-uninstall-adversarial.mjs`, `scripts/test-uninstall-negative-controls.mjs`.
- **Findings:**
  1. `cleanHostShortcuts()` in `finally` prevents host Desktop and Start Menu shortcut pollution.
  2. `runUninstall` explicitly captures `{ success, exitCode, stdout, stderr }` and tests assert exit code 0 or 1 strictly.
  3. Case 18 uses standard `ping.exe` mock with 30s sleep; verifies pre-uninstall liveness and post-uninstall scoped termination.
  4. Case 15 tests native NTFS file symlinks with transparent privilege handling.
  5. Case 16 rigorously validates partial retry postconditions.
  6. 5/5 negative controls confirm fail-closed discriminative power.
- **Verdict:** **PASS**
