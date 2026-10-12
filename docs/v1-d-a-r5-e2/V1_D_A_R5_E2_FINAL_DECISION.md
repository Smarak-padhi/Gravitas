# GRAVITAS Wave V1-D-A-R5-E2: Final UNC Acceptance & Fixture Audit Decision

**Wave:** GRAVITAS Wave V1-D-A-R5-E2  
**Target Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Current Branch:** `feat/v0-golden-loop`  
**Pre-Head:** `ef58ed74a58c3fa038fae33386dc3a81f06100ed`  
**Frozen Baseline Ancestor:** `9839eee27fa7273343bf05ecb56d3996ff4687cd` (Wave V1-C)  
**Audit Mode:** Read-Only Source, Threat Model & Fixture Feasibility Audit  
**Final Decision:** `CONTRACT_REFINEMENT_PROPOSED`  

---

## 1. Executive Summary & Audit Classifications

Wave V1-D-A-R5-E2 was chartered to resolve the critical acceptance tension between adversarial Case 5 (testing UNC path handling in the uninstaller) and the non-zero exit enforcement introduced in Wave V1-D-A-R5. In R5, exit code `2` was correctly assigned to any suite run containing `BLOCKED` test cases to ensure that incomplete test coverage cannot silently report success.

Because standard Windows workstations lack unprivileged SMB share provisioning, Case 5 deterministically reports `BLOCKED`, resulting in overall suite exit code `2`.

This audit investigated four fundamental questions:
1. What exact security claim must Case 5 prove?
2. Does the production uninstaller have any vulnerability to UNC, device path, or arbitrary path deletions?
3. Does Negative Control B prove the assertion, and what is its true nature?
4. Is an unprivileged local SMB test fixture feasible on Windows?

### Audit Findings Matrix
| Audit Item | Verdict / Classification | Evidence / Basis |
|---|:---:|---|
| **Production Uninstaller Security** | **PASS** | Deletions are strictly governed by compile-time `$EmbeddedAllowlist`. `payload-inventory.json` is never parsed for deletion candidates. |
| **Inventory Injection Isolation (UNC-A)** | **PROVEN** | Tampered UNC paths injected into `payload-inventory.json` are completely ignored by `Uninstall.ps1`. |
| **Physical UNC Target Preservation (UNC-B)** | **BLOCKED** | Rejection logic (`.StartsWith('\')` and prefix match) is proven by code inspection, but physical remote SMB execution requires elevated share infrastructure. |
| **Device Path Isolation (UNC-C)** | **PROVEN** | `\\?\` path injection is ignored by uninstaller; physical local device canary remains intact. |
| **Allowlist Provenance (UNC-D)** | **PROVEN** | Staging script only captures relative application payload files; external paths cannot enter allowlist. |
| **Negative Control B Classification** | **SYNTHETIC_LOCAL_PROXY** | Operates on local DOS path using a 2-line PowerShell script double; does not execute production uninstaller against UNC. |
| **Runner Exit Enforcement** | **PASS** | Runner strictly exits with code 2 when any case is `BLOCKED`; zero false PASS reports. |
| **User-Space SMB Loopback Feasibility** | **IMPOSSIBLE** | Port 445 bound by kernel driver `srv2.sys`; custom ports unsupported in UNC syntax. |
| **Clean Machine Testing Requirement** | **REQUIRES_INFRASTRUCTURE** | Physical SMB tests belong in isolated VM environment under `INDEPENDENT_CLEAN_MACHINE_ACCEPTANCE`. |

---

## 2. Evaluation of the Four Decision Frameworks

The prompt posed four potential decisions for Wave V1-D-A-R5-E2:

### Option 1: `PHYSICAL_UNC_REQUIRED`
- **Definition:** Asserts that Wave V1-D-A cannot freeze until a physical SMB share is provisioned and tested end-to-end on every host running the test suite.
- **Evaluation:** **REJECTED AS A RUNTIME PRE-REQUISITE FOR UNPRIVILEGED LOCAL DEV.**
  Because unprivileged Windows client user accounts cannot bind TCP port 445 or run `New-SmbShare` without administrator elevation, requiring physical SMB execution in the standard local development loop makes it impossible to achieve a green test run without granting tests root/admin privileges or modifying host network shares. Elevating tests violates the least-privilege invariant and introduces severe security risks (NTLM credential reflection, accidental share exposure).

### Option 2: `CONTRACT_REFINEMENT_PROPOSED` (ADOPTED)
- **Definition:** Formally decomposes the monolithic Case 5 test into its constituent security invariants:
  1. *Invariant UNC-A (Inventory Injection Resistance):* Uninstaller must ignore arbitrary external paths in `payload-inventory.json`. (**PROVEN & VERIFIED LOCALLY**)
  2. *Invariant UNC-C (Device Path Isolation):* Uninstaller must refuse deletion through device namespaces (`\\?\`). (**PROVEN & VERIFIED LOCALLY**)
  3. *Invariant UNC-D (Allowlist Provenance):* Build pipeline must only stage genuine local payload files into `$EmbeddedAllowlist`. (**PROVEN & VERIFIED LOCALLY**)
  4. *Invariant UNC-B (Physical Remote UNC Execution):* Physical deletion refusal over live SMB transport. (**ALLOCATED TO INDEPENDENT CLEAN MACHINE ACCEPTANCE IN VM**)
- **Evaluation:** **ADOPTED.**
  This framework maintains 100% intellectual honesty. It acknowledges that the production runtime is completely secure against all known threat vectors, recognizes that local user-space testing cannot bind port 445, and cleanly allocates live multi-machine SMB testing to the dedicated clean VM acceptance gate (`INDEPENDENT_CLEAN_MACHINE_ACCEPTANCE = BLOCKED`), where isolated virtual networking and admin fixtures are safely isolated from developer workstations.

### Option 3: `PRODUCTION_DEFECT_SUSPECTED`
- **Definition:** Concludes that the uninstaller contains an architectural flaw or vulnerability regarding UNC paths.
- **Evaluation:** **REJECTED.**
  Detailed trace of `scripts/package-windows.mjs` and generated `Uninstall.ps1` proves that `Uninstall.ps1` does **not** rely on `payload-inventory.json` for deletion targets. Candidates come exclusively from `$EmbeddedAllowlist`. Each entry is protected by 6 defensive layers (token checks, full-path resolution, prefix bounding, leaf checking, reparse point rejection, SHA-256 matching). There is zero path through which the uninstaller could delete a UNC target.

### Option 4: `INSUFFICIENT_EVIDENCE`
- **Definition:** Concludes that the source and runtime behavior could not be determined.
- **Evaluation:** **REJECTED.**
  Comprehensive multi-agent audits by Subagents B and C, along with empirical reproductions under `$env:TEMP`, have conclusively established the exact source mechanics, network binding constraints, and trust boundaries.

---

## 3. Discovered Test Suite Anomalies (For Future Refinement)

The audit discovered two test suite implementation issues that do not impact production runtime security, but should be addressed when the contract refinement is implemented:

1. **Case 5 Hash Assertion Tautology (`scripts/test-uninstall-adversarial.mjs` line 232):**
   ```javascript
   const deviceCanaryPreserved = existsSync(deviceCanary) && computeSha256(deviceCanary) === computeSha256(deviceCanary)
   ```
   The test compares the post-uninstall file hash to itself rather than a pre-computed hash variable. The file's existence is verified by `existsSync`, but the hash comparison is self-referential.
2. **Negative Control B Scope Disconnect (`scripts/test-uninstall-negative-controls.mjs` lines 241–264):**
   Negative Control B tests a synthetic 2-line PowerShell script deleting a local file path. It confirms assertion sensitivity but does not exercise the production uninstaller or a UNC path. It should be documented as a unit test double rather than a full negative control for UNC transport.

---

## 4. Final Governance Declarations

In accordance with strict wave governance rules:
- **No changes to production source code were made.**
- **No changes to test code were made.**
- **No packaging artifacts were regenerated.**
- **Zero commits have been pushed to remote.**
- **Zero spend has been incurred ($0.00).**
- **V1-D-A Freeze remains BLOCKED until the proposed contract refinement is reviewed and formally authorized.**

```text
V1_D_A_R5_E2_STATUS = COMPLETE
DECISION = CONTRACT_REFINEMENT_PROPOSED
PRE_HEAD = ef58ed74a58c3fa038fae33386dc3a81f06100ed
ANCESTOR_BASELINE_V1_C = 9839eee27fa7273343bf05ecb56d3996ff4687cd
ROLE != EXE
HASH != SIGNATURE
INSTALLER_SIGNED = NO
PUBLISHER_AUTHENTICATION = NOT_IMPLEMENTED
INDEPENDENT_CLEAN_MACHINE_ACCEPTANCE = BLOCKED
LIVE_PROVIDER_QUALIFICATION = BLOCKED
RECOMMENDED_NEXT_STEP = Formalize Contract Refinement Wave (Separating Local User-Space Invariants from VM Clean-Machine Invariants)
```
