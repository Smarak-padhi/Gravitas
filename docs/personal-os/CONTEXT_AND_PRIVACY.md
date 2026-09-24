# Gravitas Context Scopes & Privacy Architecture (Wave 12C.5)

## 1. The Principle of Least Context

A foundational vulnerability in naive multi-agent systems is broadcasting all user context into a single shared memory store or global prompt preamble.

$$\text{System Knowledge} \neq \text{Role Context}$$

### Core Privacy Invariant:
**The fact that Gravitas knows an item of information does NOT mean every agent role receives it.**
Context is injected into a worker's compiled prompt strictly on a verified need-to-know basis governed by the role's declared `contextScopes` and the task's execution contract.

---

## 2. The 7 Context Domains

| Context Domain | Scope & Contents | Access Sensitivity | Allowed Roles |
| :--- | :--- | :--- | :--- |
| **`PROJECT`** | Workspace codebase, AST symbols, package dependencies, open git branches, test output. | Low / Internal | `FrontendEngineer`, `BackendEngineer`, `SystemsEngineer`, `Integrator`, `IndependentReviewer`, `ChiefPlanner`. |
| **`LEARNING`** | Academic syllabi, study notes, concept mastery graphs, flashcard history, quiz scores. | Medium / Personal Academic | `LearningCoach`, `Researcher`, `ProjectScout`. |
| **`BUSINESS`** | Target company profiles, market research dossiers, business value propositions, public tech stacks. | Medium / Commercial | `LeadResearcher`, `OpportunityAnalyst`, `OutreachDrafter`, `ChiefPlanner`. |
| **`COMMUNICATION`** | Draft outreach emails, prospective client contact names, correspondence message history. | High / Professional Privacy | `OutreachDrafter` (drafting only; never recipient address book dumps). |
| **`PERSONAL`** | Daily schedule blocks, routine commitments, sleep time targets, hydration/stretch habits. | High / Personal Privacy | `PersonalCoach`, `ReminderService` (deterministic). |
| **`HEALTH`** | Workout frequency, step counts, rest intervals, activity levels. | **Restricted Sensitive** | `PersonalCoach` (**ONLY if explicitly toggled ON by user**). |
| **`SECRETS`** | API keys, database credentials, OAuth refresh tokens, signing certificates. | **Restricted Confidential**| **NEVER injected into LLM prompts.** Handled strictly by backend connectors. |

---

## 3. Role-to-Context Access Matrix

| Role | `PROJECT` | `LEARNING` | `BUSINESS` | `COMMUNICATION`| `PERSONAL` | `HEALTH` | `SECRETS` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Chief Planner** | YES | YES | YES | NO | NO | NO | NO |
| **Frontend Engineer** | YES | NO | NO | NO | NO | NO | NO |
| **Backend Engineer** | YES | NO | NO | NO | NO | NO | NO |
| **Systems Engineer** | YES | NO | NO | NO | NO | NO | NO |
| **Independent Reviewer**| YES | NO | NO | NO | NO | NO | NO |
| **Learning Coach** | NO | YES | NO | NO | NO | NO | NO |
| **Project Scout** | YES | YES | NO | NO | NO | NO | NO |
| **Researcher** | YES | YES | NO | NO | NO | NO | NO |
| **Lead Researcher** | NO | NO | YES | NO | NO | NO | NO |
| **Opportunity Analyst**| NO | NO | YES | NO | NO | NO | NO |
| **Outreach Drafter** | NO | NO | YES | YES | NO | NO | NO |
| **Personal Coach** | NO | NO | NO | NO | YES | OPT-IN | NO |

---

## 4. Secrets Boundary & Safe Credential Handling

To guarantee that API keys and authentication tokens are never leaked in LLM completion traces or evidence manifests:
1. **Secrets Live Outside Prompts:** Worker prompts never contain raw credentials (`OPENAI_API_KEY`, `SENDGRID_API_KEY`, `GITHUB_TOKEN`).
2. **Connector Proxying:** Connectors execute network requests using credentials securely stored in OS keychains or server environment files.
3. **Evidence Redaction:** Before any prompt compilation trace or subprocess stdio log is written to the `.evidence/` vault, an automated regex-based redaction filter scrubs known credential formats and authorization headers.
4. **Credential Boundary Specification:** See [CREDENTIAL_BOUNDARY.md](file:///c:/Users/smara/Desktop/Multi-agent/docs/personal-os/CREDENTIAL_BOUNDARY.md) for full Wave 12J in-memory vault, opaque handle, and token refresh specifications.
