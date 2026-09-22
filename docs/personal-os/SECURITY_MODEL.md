# Gravitas Security, Threat Matrix & Privacy Defense Model (Wave 12C.5)

## 1. Security Principles

As a Personal Operating System capable of operating email, reading local files, executing build scripts, and browsing the web, Gravitas must defend against aggressive adversarial attack vectors.

### Crucial Architectural Truth:
**Logical policy enforcement is not an OS hardware sandbox.** Unless tasks run in hardware-isolated microVMs (e.g., Firecracker), an agent with raw shell execution rights could attempt to escalate privileges. Gravitas minimizes this attack surface through strict worktree scoping, ephemeral subshells, connector mediation, and human approval gates.

---

## 2. Comprehensive Threat Matrix

| Threat Vector | Potential Risk | Architectural Boundary | Defense Mitigation | Remaining Limitation |
| :--- | :--- | :--- | :--- | :--- |
| **Prompt Injection via Inbound Email/Web** | Untrusted content instructs LLM to exfiltrate files or execute shell commands. | Connector / Prompt Compiler | Inbound text is treated as raw untrusted data inside XML-escaped data tags; instructions outside system block ignored. | Advanced zero-day jailbreaks may manipulate reasoning. |
| **Malicious Downloaded Files** | Courier downloads trojan or executable exploiting host OS. | Courier Staging Jail | Courier writes strictly to isolated `staging/downloads/`; execution bit (`+x`) stripped; path traversal blocked. | Vulnerabilities in local unzip/extractor binaries. |
| **Connector Credential Leakage** | Worker tries to read `.env` or keychain tokens. | Process Environment | Secrets held exclusively in server process; worker environment only receives transient proxy tokens. | A worker with arbitrary bash could attempt OS process inspection. |
| **Cross-Context Scope Leakage** | Frontend coding role reads private health or financial data. | Prompt Compiler Scope Filter | Context injector strictly validates role's `contextScopes`; sensitive blocks completely omitted. | Relies on correct compiler logic. |
| **Role Privilege Escalation** | Agent attempts to grant itself `CAP_MERGE_MAIN` or `CAP_SEND_EMAIL`. | Scheduler Admission Gate | Capability grants are cryptographically signed by orchestrator; worker proposals cannot alter active grant. | None (admission is server-side). |
| **Untrusted Webpage Instructions** | Web research role visits page saying "Delete your repository". | Capability Barrier | Web researcher has `READ` authority only. `CAP_DELETE_FILES` is absent from capability schema. | None (API denied at gateway). |
| **Memory Poisoning** | Malicious web page pollutes long-term memory with false facts. | Epistemic Classifier | Web text is classified as `INFERENCE` or unverified text, never as authoritative `FACT`. | Vector semantic drift over time. |
| **Secret Leakage in Evidence Logs** | API keys appear in stdout traces or git diff evidence. | Evidence Vault Ingestion Filter | Automated regex-based redaction engine scrubs known bearer token and API key patterns before writing to disk. | Novel non-standard key formats might bypass regex. |
| **Recursive Agent Spawning Abuse**| A rogue planner spawns 1,000 sub-agents to exhaust API balance. | Execution Budget Ceiling | Child tasks consume parent budget slice; hard limit on concurrent workers (`maxConcurrentWorkers: 4`). | None (enforced by supervisor). |
| **Notification Flooding / Spam** | Worker emits 500 events in 10 seconds, overwhelming operator. | Notification Policy Engine | Deduplication filter, sliding window rate limits (max 1 voice/60s), quiet hour suppression. | Visual clutter if UI filters disabled. |
