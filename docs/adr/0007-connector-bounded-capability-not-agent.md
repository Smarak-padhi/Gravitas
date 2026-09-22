# ADR 0007: Connectors as Bounded Capability Transports, Not Autonomous Agents

**Status**: Accepted  
**Date**: 2026-09-22  
**Scope**: Integration subsystem (`packages/connectors`, `@gravitas/core`)  

---

## 1. Context

In naive personal AI concepts, developers frequently propose an "Email Agent," a "Calendar Agent," or a "WhatsApp Agent." These agents are often conceptualized as autonomous LLM loops that constantly poll inbox feeds, make spontaneous decisions, and converse directly with external third parties.

This design pattern is dangerous and brittle:
1. It exposes LLMs directly to prompt injection attacks embedded in incoming emails or messages.
2. It invites policy violations (e.g., unofficial browser automation hijacking personal WhatsApp web sessions).
3. It leaks API credentials and access tokens into prompt context.
4. It blurs the line between protocol handling and cognitive reasoning.

---

## 2. Decision

We mandate that external integrations are strictly **Connectors, NOT Agents**:

$$\text{Connector} \neq \text{AgentRole}$$

1. **Connectors Are Pure Protocol Bridges:** A `Connector` implements structured API protocols (IMAP/SMTP, CalDAV, GitHub Octokit). It contains zero LLM inference loops.
2. **Strict Capability Scoping:** Interactions are mediated by explicit capability grants (`CAP_READ_EMAIL`, `CAP_SEND_EMAIL`).
3. **Reasoning on Demand Only:** When semantic interpretation is required (e.g., summarizing an incoming email), the connector passes the sanitized payload to an assigned reasoning role (e.g., `OutreachDrafter` or `ChiefPlanner`).
4. **Out-of-Band Secrets:** Connector credentials (OAuth tokens, API keys) live exclusively in server-side secure memory and are never injected into LLM prompts.
5. **No Fragile Scraping:** Integrations must use official, supported APIs or standard protocols. Unofficial session hijacking of personal messaging accounts is strictly prohibited.

---

## 3. Consequences

- **Positive:** Immune to prompt injection originating from inbound message payloads attempting to hijack connector tools.
- **Positive:** Zero secret leakage in prompt traces or completions.
- **Positive:** Complies with platform terms of service and prevents account bans.
- **Negative:** Requires formal API credentials and developer setups for external platforms.
