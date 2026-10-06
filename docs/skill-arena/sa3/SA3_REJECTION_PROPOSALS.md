# SA3 Rejection Proposals Dossier

## 1. Rejection Criteria & Rigor Standard
Rules are marked `REJECTION_PROPOSED` when they represent obsolete legacy workarounds, hazardous unsandboxed execution patterns, or non-technical conversational filler. Rejection proposals do NOT delete the source from provenance records; they explicitly document why the rule must NOT enter active canonical guidance or future project templates.

SA3 defines **3 Rejection Proposals**:

---

## 2. Rejection Proposals Catalog

### REJECT-001: Raw Shell Command Execution Without Sandbox Isolation
- **Proposal ID**: `REJECT-001`
- **Reason Category**: `TOOL_INSTALLER_SCRIPT`
- **Member Rules**: 1 rule ([`RULE-AND-R8-000315`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl))
- **Statement / Directive**: Direct execution of unverified shell scripts into host environment without permission checks, sandbox isolation, or error trapping.
- **Rationale for Rejection**: Directly executing ad-hoc shell commands violates agent security safety boundaries. Tool execution must occur through monitored containerized harnesses or explicitly reviewed CLI wrappers, not raw agent shell injection.
- **Alternative Guidance**: Utilize audited workspace tools with explicit user permission boundaries.

---

### REJECT-002: Obsolete Android API Level 23 Minimum Workarounds
- **Proposal ID**: `REJECT-002`
- **Reason Category**: `OBSOLETE_WORKAROUND`
- **Member Rules**: 1 rule ([`RULE-AND-SEC-000261`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl))
- **Statement / Directive**: Code paths and intent filters dedicated to handling Android 6.0 (API Level 23) runtime permission quirks.
- **Rationale for Rejection**: Android API Level 23 was released in 2015 and has been end-of-life for years. Google Play Store requires minimum target API Level 34+ for all submissions. Preserving legacy compatibility hacks for obsolete API levels bloats codebase maintenance without delivering user value.
- **Alternative Guidance**: Standardize on modern Android SDK security baselines (API 26+ minimum, API 34+ target).

---

### REJECT-003: Conversational Prompt Wrapper Boilerplate
- **Proposal ID**: `REJECT-003`
- **Reason Category**: `PROMPT_FILLER_BOILERPLATE`
- **Member Rules**: 1 rule ([`RULE-AND-R8-000325`](file:///c:/Users/smara/Desktop/Multi-agent/docs/skill-arena/sa1/rules.jsonl))
- **Statement / Directive**: Text asserting conversational output format constraints (e.g., "Output ONLY the raw Markdown report in the chat. Do NOT output explanations.").
- **Rationale for Rejection**: This directive is prompt scaffolding specific to an ephemeral chat interface rather than an engineering or design capability. Including conversational prompt wrappers in an engineering knowledge corpus introduces noise and pollutes architectural reasoning.
- **Alternative Guidance**: Configure system prompts and output schemas at the orchestrator/harness configuration layer.
