# Gravitas Personal Operating System & Organizational Architecture Freeze (Wave 12C.5)

## Overview

This directory contains the definitive architecture freeze for **Gravitas as a Personal Operations System (Personal OS)**. 

Gravitas is a local-first personal command center and operations system designed to understand human intent, decompose multi-step goals into verifiable task DAGs, delegate execution to qualified specialist organizational roles, coordinate deterministic services and capability-controlled connectors, verify all mutations with independent evidence, maintain compartmentalized context across domains, and project execution truthfully into both a dense operational command center and a 3D spatial Headquarters.

This architectural freeze establishes the foundational models, domain boundaries, security contracts, and organizational taxonomy before physical character identities, animations, or locomotion are introduced in Wave 12D.

---

## Core Invariants

1. **The Role Is the Employee; the Harness Is the Tool:**  
   `AgentRole != WorkerHarness != InferenceTransport != Provider != Model`. Roles (e.g., `FrontendEngineer`, `LeadResearcher`) represent durable functional responsibilities. Harnesses (e.g., `codex-worker`, `fcc-worker`) and transports (`DIRECT`, `OmniRoute`) are interchangeable execution engines. Codex, FCC, Claude, and OmniRoute are not characters.

2. **Truthful Spatial Projection, Never Simulation:**  
   The 3D Headquarters is a pure projection and control surface for authoritative backend state. It never simulates work or fabricates activity to look alive. An object moves or changes state if and only if authoritative server state proves it.

3. **Reasoning Roles vs. Deterministic Services:**  
   Reasoning occurs only when necessary. Routine downloads, file conversions, cron reminders, data scraping, and test execution are handled by deterministic services. Background execution does not run persistent LLM daemons.

4. **Connectors Are Capability-Controlled Bridges, Not Agents:**  
   Connectors (Email, Calendar, GitHub, Filesystem) execute bounded external capabilities governed by explicit permission grants. Connectors never hold autonomous reasoning loops or store plain-text secrets in LLM prompts.

5. **Human Governance for Consequential Actions:**  
   Autonomy is granted by policy, never claimed by an agent. Actions with irreversible real-world side effects (external communication, publishing, financial transactions, branch integration, destructive disk operations) require explicit human approval.

6. **Context Least Privilege:**  
   Gravitas knowing a fact does not mean every role receives it. Information is partitioned into strict context domains (`PROJECT`, `LEARNING`, `BUSINESS`, `COMMUNICATION`, `PERSONAL`, `HEALTH`, `SECRETS`). Roles only receive context strictly required for their task contract.

---

## Document Index

| Document | Topic & Scope |
| :--- | :--- |
| [PRODUCT_MODEL.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/PRODUCT_MODEL.md) | Master product concept, what Gravitas is vs. is not, operating principles. |
| [ORGANIZATION.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/ORGANIZATION.md) | Component classification matrix (8 classes), departments, authority scopes. |
| [ROLE_MODEL.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/ROLE_MODEL.md) | `AgentRole` domain contract, capabilities, context scopes, and separation from harnesses. |
| [HARNESS_MODEL.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/HARNESS_MODEL.md) | `WorkerHarness` qualification, process containment, transports, and evidence capture. |
| [CAPABILITY_MODEL.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/CAPABILITY_MODEL.md) | Granular authority classes (`READ`, `SAFE_WRITE`, `EXTERNAL_WRITE`, `SENSITIVE_READ`, `DESTRUCTIVE`, `FINANCIAL`). |
| [AUTONOMY_MODEL.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/AUTONOMY_MODEL.md) | Autonomy levels (`L0 SUGGEST` to `L4 STANDING_POLICY`), escalations, and boundaries. |
| [EXECUTION_BUDGETS.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/EXECUTION_BUDGETS.md) | Token, tool call, concurrency, wall-clock, cost ceilings, and child budget inheritance. |
| [CONTEXT_AND_PRIVACY.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/CONTEXT_AND_PRIVACY.md) | Multi-tenant context scoping, boundary isolation, prompt sanitization, secrets handling. |
| [CONNECTOR_ARCHITECTURE.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/CONNECTOR_ARCHITECTURE.md) | Connector SDK, integration models (Calendar, Mail, Git, Storage), policy-safe protocols. |
| [BACKGROUND_JOBS.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/BACKGROUND_JOBS.md) | Deterministic job engine vs. reasoning workflows, state lifecycle, failure isolation. |
| [TRIGGERS_AND_SCHEDULING.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/TRIGGERS_AND_SCHEDULING.md) | Event triggers, cron schedules, condition watchers, reminder queues, and scheduler boundaries. |
| [NOTIFICATIONS_AND_VOICE.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/NOTIFICATIONS_AND_VOICE.md) | Event bus routing, priority taxonomy, quiet hours, TTS/Voice policy (voice eligibility). |
| [MEMORY_ARCHITECTURE.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/MEMORY_ARCHITECTURE.md) | 5 memory classes (Operational, Episodic, Structured Domain, Semantic, Preferences) & provenance. |
| [LEARNING_SYSTEM.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/LEARNING_SYSTEM.md) | Study coach, concept mastery tracking, spaced revision intervals, practice project synthesis. |
| [PERSONAL_OPERATIONS.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/PERSONAL_OPERATIONS.md) | Workload balancing, routine reminders, non-diagnostic wellness insights, daily rhythm. |
| [BUSINESS_OPERATIONS.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/BUSINESS_OPERATIONS.md) | Algoryxz pipeline: Lead Researcher, Opportunity Analyst, Outreach drafter, human approval. |
| [COURIER_SYSTEM.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/COURIER_SYSTEM.md) | Deterministic file intake, asset downloads, checksum verification, staging storage. |
| [HUMAN_APPROVAL.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/HUMAN_APPROVAL.md) | Governance tiers: prepare vs. execute vs. integrate vs. publish approval gates. |
| [HQ_ORGANIZATION.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/HQ_ORGANIZATION.md) | Spatial room-to-system mapping, interactive stations, physical dossiers, activation rules. |
| [CHARACTER_MODEL.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/CHARACTER_MODEL.md) | Role visual identities, inspector metadata decoupling, staged roster (Wave 12D initial roster). |
| [MOBILE_COMPANION.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/MOBILE_COMPANION.md) | Desktop command center vs. mobile companion boundary (approvals, today view, notifications). |
| [FAILURE_MODEL.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/FAILURE_MODEL.md) | Graceful degradation, transport fallback policies, circuit breakers, truthful failure reporting. |
| [SECURITY_MODEL.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/SECURITY_MODEL.md) | Threat matrix (prompt injection, memory poisoning, privilege escalation, credential safety). |
| [OBSERVABILITY.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/OBSERVABILITY.md) | Comprehensive audit trails: Task, Role, Harness, Model, Capability, Approval correlation. |
| [MIGRATION_PLAN.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/MIGRATION_PLAN.md) | Seamless evolutionary migration path from Waves 0–12C to the Personal OS architecture. |
| [IMPLEMENTATION_ROADMAP.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/IMPLEMENTATION_ROADMAP.md) | Multi-wave post-12C implementation sequence (Waves 12C.5 through Wave 20). |
| [WAVE_12D_ENTRY_CONTRACT.md](file:///C:/Users/smara/Desktop/Multi-agent/docs/personal-os/WAVE_12D_ENTRY_CONTRACT.md) | Strict entry gate contract, initial 4-character roster, allowed implementation scope for Wave 12D. |

---

## Architectural Decision Records (ADRs)

The fundamental decisions governing this architecture are recorded in `docs/adr/`:

- [ADR 0005: Decoupling Agent Roles from Worker Harnesses](file:///C:/Users/smara/Desktop/Multi-agent/docs/adr/0005-role-decoupled-from-worker-harness.md)
- [ADR 0006: Strict Separation of Reasoning Roles and Deterministic Services](file:///C:/Users/smara/Desktop/Multi-agent/docs/adr/0006-reasoning-role-vs-deterministic-service.md)
- [ADR 0007: Connectors as Bounded Capability Transports, Not Autonomous Agents](file:///C:/Users/smara/Desktop/Multi-agent/docs/adr/0007-connector-bounded-capability-not-agent.md)
- [ADR 0008: Tiered Human Approval Boundaries for Consequential Actions](file:///C:/Users/smara/Desktop/Multi-agent/docs/adr/0008-human-approval-governance-boundaries.md)
- [ADR 0009: 3D Headquarters as Truthful State Projection, Not Visual Simulation](file:///C:/Users/smara/Desktop/Multi-agent/docs/adr/0009-hq-truthful-projection-not-simulation.md)
- [ADR 0010: Context Scoping and Least-Privilege Domain Isolation](file:///C:/Users/smara/Desktop/Multi-agent/docs/adr/0010-context-least-privilege-and-privacy-domains.md)
- [ADR 0011: Background Work Execution Without Persistent LLM Daemons](file:///C:/Users/smara/Desktop/Multi-agent/docs/adr/0011-background-jobs-without-persistent-llms.md)
