# ADR 0005: Decoupling Agent Roles from Worker Harnesses

**Status**: Accepted  
**Date**: 2026-09-22  
**Scope**: `@gravitas/agents`, `@gravitas/orchestrator`, `@gravitas/web`  

---

## 1. Context

In early iterations of Gravitas (Waves 1 through 9), the system conflated agent identity with the subprocess CLI executing it. An agent was often referred to as "the Codex agent" or "the FCC worker." In the 3D Headquarters, workstations were labeled directly after harnesses (`codex-workstation`, `fcc-workstation`).

As Gravitas expands into a comprehensive Personal Operating System, this coupling creates severe architectural problems:
1. When switching an execution harness from Codex to Claude Code, or changing inference routing from Direct OpenAI to OmniRoute, the agent's identity should not artificially change.
2. An organizational responsibility (e.g., `FrontendEngineer`, `LeadResearcher`) is durable and defined by capabilities, prompt directives, and verification rules—not by an ephemeral subprocess adapter.

---

## 2. Decision

We establish the foundational identity decoupling:

$$\text{AgentRole} \neq \text{WorkerHarness} \neq \text{InferenceTransport} \neq \text{Provider} \neq \text{Model}$$

1. **The Role Is the Employee:** An `AgentRole` defines the functional responsibility (e.g., `FrontendEngineer`, `ChiefPlanner`).
2. **The Harness Is the Workstation / Tool:** A `WorkerHarness` (e.g., `codex-worker`, `fcc-worker`, `claude-code-worker`) is the supervised subprocess environment where the role executes.
3. **The Transport & Model Are Implementation Details:** Whether a task routes via `DIRECT` or `OmniRoute`, and whether it calls `gpt-4o` or `claude-3-7-sonnet`, is an infrastructure decision governed by qualification and cost policy.
4. **Presentation Invariant:** Characters in the 3D Headquarters represent **roles**. Changing harnesses or upstream models updates live telemetry in the docked 2D inspector, but never renames or alters the visual role character.

---

## 3. Consequences

- **Positive:** System logic remains completely stable when swapping or upgrading LLM harnesses or models.
- **Positive:** Clean qualification model: harnesses are evidence-tested for capabilities, and roles request qualified harnesses.
- **Positive:** Prevents anthropomorphic confusion (Codex, FCC, and OmniRoute are not characters).
- **Negative:** Requires mapping layer between task role requirements and available harness subprocesses in the orchestrator.
