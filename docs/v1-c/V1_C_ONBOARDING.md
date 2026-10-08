# GRAVITAS — Wave V1-C Onboarding
## First-Run Setup Wizard & Persistent Configuration

### 1. Overview

When GRAVITAS starts on a fresh workstation where onboarding has not yet been marked completed, the First-Run Setup Wizard guides the operator through platform invariants, environment diagnostics, directory configuration, operating mode selection, harness discovery, and security policies.

---

### 2. The 8-Step Setup Stepper

1. **Step A: Welcome & Local-First Philosophy (`#onboarding-step-1`)**
   - Introduces the local-first, fail-closed architecture.
   - Highlights that deterministic execution and verification precede any action.
   - Explains zero-dollar out-of-pocket commitment.

2. **Step B: Environment Diagnostics (`#onboarding-step-2`)**
   - Embedded interactive runner invoking `GravitasDoctor`.
   - Renders tabular check status with remediation instructions.

3. **Step C: Data Location & Storage Readiness (`#onboarding-step-3`)**
   - Displays resolved canonical `dataRoot` path.
   - Verifies SQLite transaction store readiness and single-writer lock status.

4. **Step D: Operating Mode Selection (`#onboarding-step-4`)**
   - Choice between:
     - `DETERMINISTIC_ONLY` (Default): Uses only local unit tests, deterministic tools, and local code. No external LLM or cloud API calls.
     - `ASSISTED`: Enables optional model intelligence if qualified zero-cost credentials are provided.

5. **Step E: Harness Discovery & Selection (`#onboarding-step-5`)**
   - Selects available execution harnesses (`harness:antigravity:host`, `harness:powershell`, `harness:claude-code`, `harness:codex`).

6. **Step F: Optional AI Provider Setup (`#onboarding-step-6`)**
   - Allows optional entry of NVIDIA NIM API key (`nvapi-...`).
   - Stored **strictly in volatile in-memory cache** (`ModelCredentialBroker`).
   - Key is **never persisted to disk** or exposed in logs.
   - Easily skipped with "Clear / Skip" button.

7. **Step G: Security & Spend Policy Confirmation (`#onboarding-step-7`)**
   - Explains strict financial bounds: $0.00 spending ceiling.
   - Paid fallback disabled; human approval mandatory for architectural gates.

8. **Step H: Review & Complete Setup (`#onboarding-step-8`)**
   - Summarizes chosen operating mode, active harnesses, and data root.
   - "Finish Setup" saves state atomically to `<dataRoot>/config.json`.

---

### 3. State Management & Recovery

- **Config Schema:** Versioned at `version: 1`.
- **Atomic File Writing:** Writes serialized JSON to `.config-tmp-<uuid>` and renames atomically to `config.json`.
- **Corrupted Config Recovery:** If `config.json` contains invalid JSON, it is copied to `config.json.corrupt-<timestamp>` for inspection and safe defaults are restored. No data is silently lost.
