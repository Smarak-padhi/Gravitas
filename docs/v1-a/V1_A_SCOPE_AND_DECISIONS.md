# GRAVITAS V1-A — SCOPE AND ARCHITECTURAL DECISIONS

**WAVE:** V1-A (Architectural Convergence & Capability Integration)  
**STATUS:** COMPLETE  
**BRANCH:** `feat/v0-golden-loop`  
**PRE-V1-A HEAD:** `1f6c89943954567b099a3707ebae449f6f869fe7`  

---

## 1. Wave Objectives Accomplished

Wave V1-A successfully establishes a unified architectural foundation for GRAVITAS V1 without mutating or rewriting the proven K0–K5 execution kernel:

1. **Skill Arena Freeze at SA4-R2:**
   - Formalized the freeze of the entire Skill Arena research corpus (SA0–SA4-R2, 240 files).
   - Sealed all files with SHA-256 hashes in `docs/skill-arena/freeze-manifest.json` and documented epistemic limits in `SKILL_ARENA_FREEZE.md`.
   - Canceled synthetic expansion phases (SA5–SA8). Future efficacy will be measured via live model execution and K5 independent verification in V1-B.

2. **Runtime Capability Profile Subsystem:**
   - Extended `@gravitas/prompts` with `@gravitas/prompts/capabilities`.
   - Compiled the 4 approved SA3 global engineering rules (`PROFILE-GLOB-001`) and 3 platform profiles (`PROFILE-PLAT-001` Android, `PROFILE-PLAT-002` iOS, `PROFILE-PLAT-003` Web).
   - Implemented `DeterministicCapabilityResolver` ensuring explainable contextual activation without "load-everything" prompt bloat.

3. **Pinned Impeccable Design-Engineering Rulebook:**
   - Integrated the upstream design-engineering rulebook from `https://github.com/pbakaus/impeccable` pinned to commit `bbcb29d9dee6c94915d760bcfc36818ad5be66ad` (Apache-2.0).
   - Enforced the invariant: `IMPECCABLE_KNOWLEDGE != IMPECCABLE_RUNTIME`.
   - Implemented the Design Authority Hierarchy:
     $$\text{HUMAN DIRECTION} > \text{PROJECT DESIGN.md} > \text{CONTEXTUAL PROFILE} > \text{IMPECCABLE BASELINE}$$
   - Mandatory accessibility floors (WCAG 4.5:1 contrast, 44px touch targets) surface explicit conflicts when violated.

4. **Legacy Surface Reachability Audit & Quarantine:**
   - Audited `apps/server` and `apps/web`.
   - Confirmed `apps/desktop` has zero imports or dependencies on `apps/server` or `apps/web`.
   - Formally designated `apps/desktop` as the single canonical GUI and quarantined `apps/server` (which uses an in-memory registry) from V1 execution.

5. **Desktop Default & Spatial View Preservation:**
   - Verified that Command Center is the default active view in `apps/desktop` (`#cc-main` visible, `#living-hq` hidden by default).
   - Preserved Living HQ / Spatial View as an optional, reachable secondary projection without duplicating kernel state or introducing renderer privileges.

6. **Machine-Specific Path Cleansing:**
   - Cleansed personal user path references in `packages/harnesses/src/k1/agyAdapter.ts` and `fccAdapter.ts` docstrings.
   - Verified that production code uses dynamic `process.env.LOCALAPPDATA`, `os.homedir()`, and workspace-relative paths.

---

## 2. Speculative Agent Roles Audit

An audit of `gravitas-agent-specs/agents/` identified 24 role markdown specifications:
- **V1 Core Engineering Roles (Authoritative in `@gravitas/core`):**
  - `role:strategy:chief-planner` (Supervisor)
  - `role:engineering:frontend-engineer` (Frontend)
  - `role:engineering:backend-engineer` (Backend)
  - `role:quality:independent-reviewer` (Reviewer / Verifier)
  - `role:integration:integration-engineer` (Integrator)
- **Supporting / General-Purpose:**
  - `02-ARCHITECTURE-ARENA.md` (K4 Arena runtime)
  - `08-BROWSER-QA.md` (Browser QA package)
  - `22-SECURITY-CAPABILITY-AUDITOR.md` (K3 Grant auditor)
- **Speculative / Unreferenced by V1 Runtime:**
  - Roles such as Study Coach, Personal Coach, Outreach Assistant, Business Analyst, and Calendar Agent are classified as `SPECULATIVE_UNREFERENCED` and are excluded from active V1 prompt generation and capability resolution.
