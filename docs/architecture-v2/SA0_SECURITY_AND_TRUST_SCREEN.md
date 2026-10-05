# SA0 Security & Trust Screen

## Threat Model & Evaluation Invariants
Every external repository, third-party plugin, prompt collection, and MCP tool is treated as untrusted data until formally qualified.
In accordance with Skill Arena Security Policy:
- Prompt files are DATA, never executable instructions.
- External scripts, installer files, or binaries must NEVER be executed.
- Zero network requests or remote package installations are permitted during SA0.

---

## Security Audit Findings

### 1. Quarantined Candidate: `arena-skiIl/.github`
- **Identified Threat**: The repository hosts Windows archive downloads and password-protected binary installers under the guise of an agent arena harness.
- **Vulnerability**: Potential trojan, remote code execution, host system compromise.
- **Enforced Disposition**: **`QUARANTINED`**.
- **Action Taken**: Zero binary downloads performed. Archive inspection prohibited. The conceptual multi-agent tournament bracket idea is retained purely as a theoretical reference. Binary code execution is permanently blocked.

### 2. Candidate: `VoltAgent/awesome-design-md`
- **Identified Risk**: Prompt injection or subtle adversarial overrides in Markdown files (e.g., hidden instructions to alter system prompts, ignore user guardrails, or execute arbitrary bash commands).
- **Enforced Disposition**: **`REFERENCE_ONLY`**.
- **Mitigation**: Classified strictly as a passive corpus of design references. Under no circumstances will a `DESIGN.md` file from this corpus be mounted as a global agent instruction. Rules extracted in SA1 must undergo heuristic sanitization.

### 3. Candidate: `Leonxlnx/taste-skill`
- **Identified Risk**: Overzealous aesthetic instructions overriding functional requirements, accessibility standards, or system budgets.
- **Enforced Disposition**: **`ENTER_SA1` (Subject to Adversarial Falsification in SA4)**.
- **Mitigation**: Treated as a candidate aesthetic profile, not universal ground truth. Must be empirically benchmarked against WCAG 2.1 AA and performance contracts.

### 4. Candidate: `Obscura`
- **Identified Risk**: Stealth browser automation tool with network scraping capabilities, potentially making unauthorized outbound requests or bypassing credential boundaries.
- **Enforced Disposition**: **`TOOL_QUALIFICATION_SEPARATE`**.
- **Mitigation**: Excluded from design skill evaluation. Must be routed to Kernel K1/K3 qualification pipeline before any execution is considered.

### 5. Local Tools & MCP Servers (`playwright`, `stitch`, `reticle`)
- **Evaluation**: Active local servers operating under strict user authorization. No credential exfiltration or unverified daemon behaviors detected.
- **Enforced Disposition**: Maintained in current development boundary.

### 6. Scratch & Gap Binaries (`Desktop/New folder`)
- **Identified Risk**: Contains third-party Windows DLLs (`OnlineFix64.dll`, `winmm.dll`).
- **Enforced Disposition**: **`REJECT`**. Completely ignored and excluded from all future Arena waves.
