# P4 OBJECTIVE LEDGER: TOOL REGISTRY + MCP / PLUGIN / CONNECTOR ARCHITECTURE

**Wave:** P4 — Tool Registry + MCP / Plugin / Connector Architecture  
**Date:** 2026-09-30  
**Git Baseline Commit:** `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Governing Invariants:**
- $\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$
- $\text{CAPABILITY} \neq \text{TOOL} \neq \text{TRANSPORT} \neq \text{CREDENTIAL} \neq \text{AUTHORITY}$
- $\text{TOOL DECLARATION} \neq \text{TOOL QUALIFICATION} \neq \text{TOOL AUTHORIZATION} \neq \text{TOOL EXECUTION}$
- $\text{DISCOVERY} \neq \text{INSTALLATION} \neq \text{AUTHENTICATION} \neq \text{TRUST}$
- $\text{UNTRUSTED TOOL DATA} \neq \text{EXECUTABLE INSTRUCTION}$
- $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$
- $\mathbf{FREE\_QUOTA\_EXHAUSTED \longrightarrow STOP \mid SAFE\_FREE\_FALLBACK \mid WAIT \quad (\text{NEVER } \longrightarrow BILL)}$
- $\mathbf{UNKNOWN\_COST \neq FREE \quad (\text{FAIL CLOSED})}$
- $\mathbf{EXISTING\_ENTITLEMENT \neq FREE\_TIER \neq PERMANENTLY\_FREE}$
- $\mathbf{SUBSCRIPTION\_IDENTITY \neq API\_ENTITLEMENT}$
- $\mathbf{REUSE > ADD\_DEPENDENCY}$

---

## 1. Ledger Status Legend

- `UNSTARTED`: Requirement identified; research/investigation not initiated.
- `IN_PROGRESS`: Active investigation or draft design in flight.
- `RESEARCHED`: Authoritative ecosystem evidence and specifications gathered.
- `DESIGNED`: Formal TypeScript contract, lifecycle, and architecture specified.
- `SCENARIO_VALIDATED`: Walked through and verified across operational scenarios.
- `INDEPENDENT_REVIEWED`: Reviewed by specialized subagent or adversarial red-team critic.
- `COMPLETE`: Fully designed, scenario-validated, independently reviewed, and verified.
- `BLOCKED`: Blocked by external dependency requiring human decision or intervention.

*Rule: A requirement may transition to `COMPLETE` only when formal design, scenario validation, independent review, and zero-spend verification have all been satisfied without open blockers.*

---

## 2. P4 Requirements & Completion Ledger

| Req ID | Requirement Description | Status | Architecture Reference | Reviewer / Auditor | Unresolved Issues | Final Disposition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-P4-01** | **Governing Invariants & Conceptual Boundaries**<br>Strict independence across the 11 governing invariants; zero-spend mandate; fail-closed handling on unknown costs; reuse preference. | `COMPLETE` | `TOOL_REGISTRY_ARCHITECTURE.md` (§1)<br>`ZERO_SPEND_AND_QUOTA_POLICY.md` (§1) | Architecture Lead / Adversarial Red Team | None | Invariants strictly enforced and verified across all contracts |
| **REQ-P4-02** | **Tool Registry Domain Model & TypeScript Contracts**<br>Formal contracts for `CapabilityDefinition`, `ToolDefinition`, `ToolInstance`, `ToolTransportDescriptor`, `ToolSchemaDigest`, `CostProfile`, etc. | `COMPLETE` | `TOOL_REGISTRY_ARCHITECTURE.md` (§2) | Architecture Lead / Adversarial Red Team | None | Strongly typed contracts defined and verified |
| **REQ-P4-03** | **Capability-First Resolution & Zero-Spend Algorithm**<br>Deterministic resolution of generic capabilities to eligible tool instances incorporating `CostEligibilityCheck` and 5-tier cost scoring. | `COMPLETE` | `TOOL_REGISTRY_ARCHITECTURE.md` (§3) | Architecture Lead / Adversarial Red Team | None | Algorithm validated in Scenarios A, P, R, S, T, U |
| **REQ-P4-04** | **Tool Taxonomy & Semantic Classification**<br>Classify tools by operational semantics, authority domains, and cost profiles rather than vendor branding. | `COMPLETE` | `TOOL_REGISTRY_ARCHITECTURE.md` (§4) | Architecture Lead / Adversarial Red Team | None | 7-domain taxonomy & 8 cost categories established |
| **REQ-P4-05** | **Transport Abstraction Layer & Rate-Limit Middleware**<br>Decoupling tool semantics from physical transport; transport-level response header auditing and zero-cost backoff/queueing. | `COMPLETE` | `MCP_AND_EXTERNAL_CAPABILITY_ARCHITECTURE.md` (§1, §6) | Architecture Lead / Adversarial Red Team | None | Validated in Scenarios H, P, W |
| **REQ-P4-06** | **Generic MCP Client / Adapter Architecture**<br>Full MCP 2026 specification support: streamable HTTP, stdio, negotiation, tools, resources, prompts, progress, cancellation, error mapping. | `COMPLETE` | `MCP_AND_EXTERNAL_CAPABILITY_ARCHITECTURE.md` (§2) | Scout A / Adversarial Red Team | None | Spec research integrated; sampling intercepted |
| **REQ-P4-07** | **Non-MCP Capability Adapters**<br>First-class adapters for CLI subprocesses, native in-process libraries, REST APIs, and OS automation without forced MCP wrapping. | `COMPLETE` | `MCP_AND_EXTERNAL_CAPABILITY_ARCHITECTURE.md` (§3) | Architecture Lead / Adversarial Red Team | None | Native `@gravitas/git`, Obsidian, and UIA verified |
| **REQ-P4-08** | **Tool Qualification Lifecycle & Dynamic Readiness**<br>9-state qualification ladder (`DISCOVERED` to `READY`); distinction between static capability ceiling (`QUALIFIED`) and dynamic readiness (`READY`/`RATE_LIMITED`). | `COMPLETE` | `TOOL_REGISTRY_ARCHITECTURE.md` (§5) | Architecture Lead / Adversarial Red Team | None | Validated in Scenarios B, C, D, P, Q |
| **REQ-P4-09** | **Granular Tool Authority & Financial Scoping**<br>Fine-grained capability scoping (`<domain>.<resource>.<action>`) with explicit `financial.*` authorities reserved exclusively for human sovereignty. | `COMPLETE` | `TOOL_AUTHORITY_AND_CREDENTIAL_MODEL.md` (§1) | Security Architect / Adversarial Red Team | None | Verified in Scenarios G, L, M, S |
| **REQ-P4-10** | **Mutation Classification & Sovereign Human Gates**<br>Classify operations (`READ_ONLY` to `COMMUNICATION`, `FINANCIAL`) with mandatory human preview & sign-off for external/financial mutations. | `COMPLETE` | `TOOL_AUTHORITY_AND_CREDENTIAL_MODEL.md` (§2) | Security Architect / Adversarial Red Team | None | Verified in Scenarios E, F, G, S |
| **REQ-P4-11** | **`CredentialReference` Architecture & Payment Prohibition**<br>Opaque credential handles; zero raw secrets in prompts/logs; Credential Broker strictly refuses to store or broker payment instruments. | `COMPLETE` | `TOOL_AUTHORITY_AND_CREDENTIAL_MODEL.md` (§3) | Security Architect / Adversarial Red Team | None | Verified in Scenarios G, I & Threat Vector TV-05, TV-13 |
| **REQ-P4-12** | **Tool Invocation Lifecycle & Comprehensive Provenance**<br>Two-phase preview/execution pipeline; 12-point invocation provenance recording inputs, outputs, digests, and financial decision codes. | `COMPLETE` | `TOOL_AUTHORITY_AND_CREDENTIAL_MODEL.md` (§4) | Architecture Lead / Adversarial Red Team | None | 12-point provenance verified in Scenario G, U |
| **REQ-P4-13** | **Tool Result Trust & Prompt Injection Defenses**<br>Untrusted external data boundaries; explicit classification of tool outputs as `[UNTRUSTED_TOOL_DATA]`; prompt injection sanitization. | `COMPLETE` | `TOOL_AUTHORITY_AND_CREDENTIAL_MODEL.md` (§5) | Scout F / Adversarial Red Team | None | Tested and verified against Threat Vector TV-01 |
| **REQ-P4-14** | **Tool Schema Drift Detection & Version Pinning**<br>RFC 8785 canonical JSON schema hashing; automatic detection of unauthorized tool changes; immediate quarantine on drift. | `COMPLETE` | `TOOL_REGISTRY_ARCHITECTURE.md` (§5.2)<br>`MCP_AND_EXTERNAL_CAPABILITY_ARCHITECTURE.md` (§4) | Architecture Lead / Adversarial Red Team | None | Verified in Scenario D & Threat Vector TV-02 |
| **REQ-P4-15** | **Ecosystem Research & Zero-Spend Candidate Re-Audit**<br>Sourced, authoritative research across 21 tools with comprehensive cost, quota, rate-limit, and free-alternative fields. | `COMPLETE` | `P4_TOOL_ECOSYSTEM_RESEARCH.md` | Scouts A–F / Research Lead | None | 21 candidates classified into 6 formal zero-spend states |
| **REQ-P4-16** | **Operator Workflow Automation Opportunities**<br>Catalog of 7 concrete operator workflows grounded in repository evidence with zero-cost implementation paths and existing-tool reuse. | `COMPLETE` | `OPERATOR_AUTOMATION_OPPORTUNITIES.md` | Workflow Analyst / Architecture Lead | None | All 7 workflows mapped to zero-cost local paths |
| **REQ-P4-17** | **Operational Architectural Scenarios (A through W)**<br>Exhaustive end-to-end walkthroughs of 23 required scenarios verifying capability resolution, security, fallback, drift, rate limits, and zero-spend. | `COMPLETE` | `P4_TOOL_SCENARIOS.md` | Architecture Lead / Adversarial Red Team | None | All 23 scenarios passed with 10-point traces |
| **REQ-P4-18** | **Adversarial Red-Team Audit & Financial Safety Verification**<br>Independent adversarial critique attacking tool poisoning, confused deputy, silent overage, retry storms, and unexpected billing. | `COMPLETE` | `P4_ADVERSARIAL_REVIEW.md` | Adversarial Red Team | None | Threat Vectors TV-01 to TV-14 audited; zero-spend verified; VERDICT: PASS |
| **REQ-P4-19** | **Zero-Spend & Quota Policy Architecture**<br>Dedicated policy contract formalizing autonomous cost ceiling ($0.00), quota reserve, rate-limit models, and sovereign financial human gate. | `COMPLETE` | `ZERO_SPEND_AND_QUOTA_POLICY.md` | Policy Architect / Adversarial Red Team | None | Authoritative policy contract established |

---

## 3. Recursive Loop Log

- **Cycle 1 (Initiation & Scoping)**: Initialized P4 Objective Ledger. Established governing invariants, 18 architectural requirements, and scope boundaries. Commenced ecosystem research across 6 specialist research domains.
- **Cycle 2 (Domain Modeling & Architectural Contracts)**: Formulated formal TypeScript contracts for `TOOL_REGISTRY_ARCHITECTURE.md`, `TOOL_AUTHORITY_AND_CREDENTIAL_MODEL.md`, and `MCP_AND_EXTERNAL_CAPABILITY_ARCHITECTURE.md`. Defined capability resolution, 9-stage qualification ladder, zero-secret credential broker, and RFC 8785 schema hashing.
- **Cycle 3 (Operator Opportunity Analysis)**: Completed `OPERATOR_AUTOMATION_OPPORTUNITIES.md`, analyzing 7 concrete operator workflows grounded in repository evidence.
- **Cycle 4 (Scenario Operationalization)**: Formulated `P4_TOOL_SCENARIOS.md` covering all 15 operational walkthroughs (Scenarios A through O) with full 10-point architectural traces.
- **Cycle 5 (Ecosystem Synthesis)**: Completed multi-scout research (Scouts A through F) and authored `P4_TOOL_ECOSYSTEM_RESEARCH.md`, providing an authoritative 21-candidate evaluation matrix and categorized shortlists.
- **Cycle 6 (Adversarial Audit & Remediation Verification)**: Conducted systematic red-team audit (`P4_ADVERSARIAL_REVIEW.md`), evaluating Threat Vectors TV-01 through TV-07. Addressed delimiter smuggling, canonical path normalization, and token expiry. Rendered final verdict: **PASS**.
- **Cycle 7 (Initial P4 Reconciliation)**: Verified git status clean on tracked files. Concluded initial P4 baseline.
- **Cycle 8 (Zero-Spend & Rate-Limit Architecture Correction Loop)**: Integrated human-mandated Zero-Spend requirement:
  - Authored authoritative `ZERO_SPEND_AND_QUOTA_POLICY.md` establishing $\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$, 8 cost categories, `CostEligibilityCheck`, rate-limit dimensions, configurable `QuotaReservePolicy`, and sovereign financial gates.
  - Updated `TOOL_REGISTRY_ARCHITECTURE.md` with `CostCategory`, `CostProfile`, 5-tier cost preference scoring, and zero-spend eligibility in `resolveCapability`.
  - Updated `MCP_AND_EXTERNAL_CAPABILITY_ARCHITECTURE.md` with transport header auditing, HTTP 429 jittered backoff, and quota exhaustion defense.
  - Updated `TOOL_AUTHORITY_AND_CREDENTIAL_MODEL.md` with `financial.*` authorities and strict prohibition of payment instruments in the Credential Broker.
  - Re-audited all 21 candidates in `P4_TOOL_ECOSYSTEM_RESEARCH.md` across 20 cost and quota dimensions with free-alternative pathways.
  - Updated `OPERATOR_AUTOMATION_OPPORTUNITIES.md` with zero-cost paths and existing-tool reuse for all 7 workflows.
  - Expanded `P4_TOOL_SCENARIOS.md` with Scenarios P through W (rate limits, credit expiry, paid exclusion, subscription vs API, unknown cost fail-closed, local vs cloud, security vs cost, retry storm).
  - Expanded `P4_ADVERSARIAL_REVIEW.md` with Threat Vectors TV-08 through TV-14 and executed the definitive Financial Safety Audit.
- **Cycle 9 (Financial Safety Seal & Verification)**: Confirmed that zero autonomous paths can create monetary charges without Smarak's explicit authorization. Verified git status clean on all tracked files.
- **Cycle 10 (Final Zero-Spend Policy Precision Pass)**: Decoupled hard-coded operational heuristics and arbitrary numeric bounds into configurable policy contracts (`PricingFreshnessPolicy`, `ToolRetryBudget`, `CostPreferencePolicy`, `QuotaReservePolicy`), explicitly labeling all numeric instances as `[NON-NORMATIVE EXAMPLE]`. Normalized provider-specific rate-limit and billing signals into canonical internal representations (`NormalizedProviderStatus`) with multi-signal disambiguation. Formally defined the Payment Instrument Boundary (`AGENT PAYMENT AUTHORITY = NONE` vs `HUMAN-INITIATED EXTERNAL PAYMENT`) and affirmed that Zero-Spend denotes Zero Incremental Monetary Cost. Corrected architecture-vs-implementation terminology across all P4 artifacts. Re-verified all 21 research candidates and the financial adversarial audit. Confirmed all 19 requirements (`REQ-P4-01` through `REQ-P4-19`) are fully verified, policy-decoupled, and `COMPLETE`.
