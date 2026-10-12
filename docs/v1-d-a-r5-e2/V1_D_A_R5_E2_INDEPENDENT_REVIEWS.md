# GRAVITAS Wave V1-D-A-R5-E2: Independent Review Reports

**Date:** 2026-10-12  
**Repository:** `C:\Users\smara\Desktop\Multi-agent`  
**Current Branch:** `feat/v0-golden-loop`  
**Base Commit:** `ef58ed74a58c3fa038fae33386dc3a81f06100ed`  
**Audit Wave:** V1-D-A-R5-E2 (UNC Acceptance & Fixture Audit)  

---

## 1. Subagent B — Independent Security & Trust-Boundary Review

**Auditor:** Subagent B (Independent Security Reviewer)  
**Conversation ID:** `67df143e-f13c-4dcd-8b61-9b993f92bb85`  
**Focus:** Uninstaller Deletion Authority, Trust Boundaries, Case 5 Threat Decomposition, Negative Control B Rigor  

### 1.1 Executive Summary & Verdicts
```text
APPLICATION_SECURITY_VERDICT = PASS
ALLOWLIST_TRUST_BOUNDARY = PASS (STRICTLY ISOLATED)
INVENTORY_INJECTION_ISOLATION (UNC-A) = PROVEN (PASS)
DEVICE_PATH_ISOLATION (UNC-C) = PROVEN (PASS)
ALLOWLIST_PROVENANCE (UNC-D) = PROVEN (PASS)
PHYSICAL_UNC_TARGET_PRESERVATION (UNC-B) = BLOCKED (NON-ADMIN HOST LIMITATION)
NEGATIVE_CONTROL_B_CLASSIFICATION = SYNTHETIC_LOCAL_PROXY
RECOMMENDED_DECISION_FRAMEWORK = FRAMEWORK B (DECOMPOSED INVARIANTS)
```

### 1.2 Trust Boundary & Candidate Selection Analysis
1. **Source of Deletion Candidates:**
   - In `scripts/package-windows.mjs` (lines 137–151, 201–245), `collectAllFiles` inspects the staged application directory, captures relative paths, computes SHA-256 digests, and generates `$EmbeddedAllowlist` directly into the uninstaller script body.
   - At runtime, `Uninstall.ps1` evaluates candidates exclusively from this array (`foreach ($entry in $EmbeddedAllowlist)`).
2. **Decoupling from `payload-inventory.json`:**
   - `Uninstall.ps1` **never** queries or parses `payload-inventory.json` for deletion targets.
   - The file is used only as an installation existence marker (`Test-Path -LiteralPath $ownInv`, lines 218, 284) and deleted at the end as a known static artifact (`$MetadataFile = "resources\app\payload-inventory.json"`).
3. **Defense-in-Depth Validation Pipeline:**
   Before `Remove-Item` is executed on any candidate, six sequential validations are applied:
   - Syntactic token rejection: Rejects `..`, `:`, leading `\`, and whitespace (`line 400`).
   - Path resolution: Resolves canonical path via `[System.IO.Path]::GetFullPath((Join-Path $ScriptDir $rel))`.
   - Prefix boundary containment: Verifies `$full.StartsWith($scriptDirPrefix, [System.StringComparison]::OrdinalIgnoreCase)` (`line 408`).
   - Leaf existence verification: Verifies file exists and is a leaf (`Test-Path -LiteralPath $full -PathType Leaf`, `line 413`).
   - Hierarchical reparse-point rejection: Traverses from leaf to root ensuring no symlinks/junctions exist (`Test-ReparsePointInPath`, `line 418`).
   - Pre-deletion SHA-256 verification: Verifies current file hash matches `$entry.Sha256` (`line 424`).
4. **Hardcoded Deletions:**
   All other deletions (shortcuts, uninstaller wrapper, uninstaller script, owned directories) are strictly hardcoded and bounded to user folders or `$ScriptDir`.

### 1.3 Case 5 Decomposition Evaluation
- **UNC-A (Inventory Injection Isolation):** PROVEN. Injected UNC paths in `payload-inventory.json` are completely ignored because the uninstaller never reads the inventory for deletion.
- **UNC-B (Physical UNC Target Preservation):** BLOCKED on non-admin host. The code path provably rejects UNC paths via syntactic check (`$rel.StartsWith('\')`) and boundary check (`.StartsWith($scriptDirPrefix)`), but physical execution over a live SMB transport requires dedicated infrastructure.
- **UNC-C (Device-Path Isolation):** PROVEN. Device path (`\\?\C:\...`) is physically created and preserved; rejected by uninstaller.
- **UNC-D (Allowlist Provenance):** PROVEN. `$EmbeddedAllowlist` only contains clean relative application files generated at package build time.

### 1.4 Negative Control B Evaluation
- Negative Control B operates on a local temporary file (`cB-sandbox\unc-target-canary.txt`) and uses a synthetic test double script (`Remove-Item -LiteralPath $canary -Force`).
- Classified as **`SYNTHETIC_LOCAL_PROXY`**. It verifies assertion sensitivity but does not test real uninstaller behavior against network UNC paths.

---

## 2. Subagent C — Independent Windows Validation & Fixture Audit

**Auditor:** Subagent C (Independent Windows Validation Reviewer)  
**Conversation ID:** `bc3e8372-5397-4418-8aed-f183f03b0c69`  
**Focus:** Acceptance Test Mechanics, Fixture Feasibility, Host Configuration, Negative Controls, Runner Exit Integrity  

### 2.1 Executive Summary & Verdicts
```text
DEVICE_PATH_TRAVERSAL_DEFENSE = PASS
REPARSE_POINT_REFUSAL_DEFENSE = PASS
PHYSICAL_UNC_FIXTURE_EXECUTION = BLOCKED
NEGATIVE_CONTROL_B_CLASSIFICATION = SYNTHETIC_LOCAL_PROXY
RUNNER_EXIT_ENFORCEMENT = PASS (EXIT CODE 2 CONFIRMED)
OVERALL_WINDOWS_VALIDATION = BLOCKED
```

### 2.2 Acceptance Suite Forensic Findings
1. **Case 5 Implementation Mechanics:**
   - Case 5 relies on `Get-SmbShare` to passively probe for existing shares. On Windows client systems, standard shares are limited to admin shares (`C$`, `ADMIN$`), which the script properly filters out.
   - Because no safe non-administrative SMB shares exist, Case 5 does not provision any share and logs `status: 'BLOCKED'`.
   - The test injects a local device namespace path (`\\?\C:\...`) into `payload-inventory.json`.
   - **Tautological Check Finding:** Line 232 of `scripts/test-uninstall-adversarial.mjs` checks `computeSha256(deviceCanary) === computeSha256(deviceCanary)`. While file survival is verified by `existsSync(deviceCanary)`, the hash comparison is self-referential.
2. **Runner Exit Code Enforcement:**
   - The R5 test runner fix (`scripts/test-uninstall-adversarial.mjs` lines 360–371) correctly maps any `BLOCKED` test case to process exit code `2`.
   - The suite truthfully terminates with non-zero exit code when environmental prerequisites are unmet.
3. **Negative Control Suite Validation:**
   - Control A: Verified that a `BLOCKED` test case yields non-zero exit code.
   - Control B: Confirmed as `SYNTHETIC_LOCAL_PROXY`.
   - Control C: Verified that bypass of reparse point checks causes failure.
   - Controls 1–5: Verified detection of traversal, absolute paths, missing uninstaller, modified uninstaller, and corrupted inventory.

### 2.3 Fixture Feasibility Assessment
1. **User-Space Loopback SMB Server:**
   - **Architecturally Impossible** on Windows without elevation.
   - Port 445 is permanently bound by kernel driver `srv2.sys` (`LanmanServer`, PID 4).
   - Windows UNC path resolution (`\\hostname\share`) does not support non-standard ports (e.g. `\\127.0.0.1:4455\share` is invalid UNC syntax).
2. **Local Administrative Share Provisioning (`New-SmbShare`):**
   - Requires UAC elevation (`Run as Administrator`).
   - Non-administrative execution fails with `Access is denied` (Native Win32 error code 5).
3. **Dedicated Clean-Room VM Environment:**
   - The only secure, clean method to execute physical UNC testing without polluting host configuration or requiring dangerous host modifications is a dedicated Windows VM on an isolated virtual network.

---

## 3. Reconciliation & Consensus

| Dimension | Subagent B (Security) | Subagent C (Validation) | Reconciled Consensus |
|---|---|---|---|
| **Production Uninstaller Safety** | PASS (immune to UNC/inventory tampering) | PASS (allowlist boundary solid) | **PASS** |
| **Case 5 Physical Execution** | BLOCKED (host capability limitation) | BLOCKED (non-admin limitation) | **BLOCKED** |
| **Negative Control B** | SYNTHETIC_LOCAL_PROXY | SYNTHETIC_LOCAL_PROXY | **SYNTHETIC_LOCAL_PROXY** |
| **Runner Exit Code 2** | Verified (honest failure reporting) | Verified (exit code 2 enforced) | **PASS** |
| **Loopback User-Space SMB** | Impossible | Impossible | **IMPOSSIBLE** |
| **Recommended Decision** | Framework B (Decomposed Invariants) | Option A + Option B (Contract Refinement) | **CONTRACT_REFINEMENT_PROPOSED** |
