# 14 - Technical & Security Risk Register

> **Document Type:** Phase 0 Technical Architecture Specification  
> **Status:** Authoritative  
> **Classification:** FACT / INFERENCE (risk mitigation)  

---

## 1. System Failure Modes & Mitigations

| Risk ID | Category | Threat / Failure Mode | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | Security | **Indirect Prompt Injection**: Malicious web page visited during QA commands agent to exfiltrate tokens. | High | Critical | Strict data/instruction separation in XML envelopes; disable L3/L4 tools during browser ingestion turns. |
| **R-02** | Operational| **Infinite Execution Loop**: Two agents bounce tasks back and forth indefinitely, burning API budget. | High | High | Strict `max_retries = 3` cap; global per-goal token and USD budget ceilings; automatic transition to `WAITING_HUMAN`. |
| **R-03** | System | **Windows File Locking (`EBUSY` / `EPERM`)**: Windows holds file locks on node_modules or binaries in worktrees. | High | Medium | Execute worktrees on same NTFS volume; invoke PowerShell garbage-collect handles before tearing down worktrees. |
| **R-04** | Integrity | **Hallucinated Verification**: Implementer claims "all tests passed" when 3 unit tests failed. | High | High | Strict separation: Implementer CANNOT verify its own work. Verifier agent independently executes test runners. |
| **R-05** | Integrity | **Git Branch Corruption**: Agent executes `git reset --hard` or commits directly to `main`. | Medium | Critical | Git Worktree isolation; worker processes are restricted to `task/*` branches; commits to `main` are blocked at git hook level. |
| **R-06** | Financial | **Runaway API Costs**: Background worker invokes massive context models in unconstrained loop. | High | High | Real-time dollar metering against local pricing catalog; automatic hard cut-off if goal exceeds user-configured limit (e.g. $5.00). |
