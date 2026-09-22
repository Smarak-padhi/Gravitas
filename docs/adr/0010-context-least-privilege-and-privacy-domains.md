# ADR 0010: Context Scoping and Least-Privilege Domain Isolation

**Status**: Accepted  
**Date**: 2026-09-22  
**Scope**: Context Engine, Prompt Compiler (`packages/prompts`, `@gravitas/core`)  

---

## 1. Context

In a Personal Operating System, the orchestrator has access to highly diverse categories of user data:
- Software codebases, git diffs, and terminal logs.
- Academic syllabi, study notes, and quiz scores.
- Business prospects, lead dossiers, and client emails.
- Calendar meetings, personal habits, and daily routines.
- Private health metrics (sleep duration, workout logs).
- System secrets, API keys, and database passwords.

Passing this entire corpus into a shared context window or single agent prompt creates extreme privacy risks, token bloat, and cross-domain data leakage.

---

## 2. Decision

We establish **Least-Privilege Context Scoping**:

$$\text{Role Context} \subseteq \text{Declared Context Scopes for Assigned Role}$$

1. **Seven Isolated Context Domains:** Data is strictly categorized into `PROJECT`, `LEARNING`, `BUSINESS`, `COMMUNICATION`, `PERSONAL`, `HEALTH`, and `SECRETS`.
2. **Contractual Context Scopes:** Each `AgentRole` declares an immutable list of permitted `contextScopes`.
3. **Compiler Scope Enforcement:** The prompt compiler strictly filters out all context blocks outside the role's declared scopes.
4. **Health Data Opt-In:** The `HEALTH` context domain is disabled by default and requires explicit user enablement in Personal Settings.
5. **Secrets Air-Gap:** The `SECRETS` domain is never exposed to LLM prompts under any circumstances; it is managed exclusively by backend connectors.

---

## 3. Consequences

- **Positive:** Guarantees that a coding agent fixing a frontend bug cannot view private calendar events, business leads, or personal notes.
- **Positive:** Minimizes input token consumption per task execution.
- **Positive:** Defense-in-depth against prompt injection exfiltration attacks.
- **Negative:** If a complex cross-domain task arises, the planner must explicitly bridge information via intermediate task artifacts.
