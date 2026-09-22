# Gravitas AgentRole Domain Model & Canonical Runtime Contract (Wave 12E)

## 1. The Fundamental Identity Decoupling

In Gravitas, an agent's organizational identity is completely decoupled from execution engines, LLM providers, and models:

$$\text{Role} \neq \text{Harness} \neq \text{Transport} \neq \text{Provider} \neq \text{Model} \neq \text{Service} \neq \text{Connector} \neq \text{Character}$$

### Explicit Non-Negotiable Axioms
- **Reviewer Role $\neq$ Deterministic Verifier**: Reviewer is a logical reasoning/code-review role. Verifier is deterministic infrastructure.
- **Integrator Role $\neq$ Human Approval**: Integrator prepares branches and checks integration boundaries; Human approval remains absolute.
- **Courier Service $\neq$ Agent Role**: Courier is a deterministic file/integrity service; it is never an LLM worker.
- **Harness $\neq$ Employee**: Codex, FCC, and Claude Code are runtime execution harnesses (tools), not employees.
- **Provider $\neq$ Employee**: OpenAI, Anthropic, and local endpoints are service providers, not team members.
- **Model $\neq$ Employee**: Model weights (`gpt-4o`, `claude-3-7-sonnet`) are runtime engine configurations.
- **Character $\neq$ Role**: Visual 3D characters in the HQ are pure spatial projections of assigned roles.

### Canonical Flow
```text
Task Definition
      ↓
Role Requirement
      ↓
Role Assignment
      ↓
Capability Grant
      ↓
Qualified Harness Selection
      ↓
Inference Route
      ↓
Worker Execution
      ↓
Independent Review
      ↓
Deterministic Verification
      ↓
Human Approval / Integration
```

---

## 2. Canonical Reasoning Role Roster (Wave 12E)

Wave 12E establishes five canonical reasoning roles in `@gravitas/core`:

| Canonical Role ID | Display Name | Department | Core Responsibilities | Prohibited Authorities |
| :--- | :--- | :--- | :--- | :--- |
| `role:strategy:chief-planner` | Chief Planner | `CONTROL_STRATEGY` | Decompose operator goals into directed acyclic task graphs (DAG), establish topological sequence, assign specialties, identify verification requirements. | `CODE_MUTATION`, `HUMAN_APPROVAL_BYPASS` |
| `role:engineering:frontend-engineer` | Frontend Engineer | `ENGINEERING` | Implement UI components, design tokens, client state machines, React/TypeScript logic, accessibility, and browser QA tests. | `HUMAN_APPROVAL_BYPASS`, `INDEPENDENT_REVIEW` |
| `role:engineering:backend-engineer` | Backend Engineer | `ENGINEERING` | Implement server REST endpoints, SSE streams, domain contracts, database schemas, and integration test suites. | `HUMAN_APPROVAL_BYPASS`, `INDEPENDENT_REVIEW` |
| `role:quality:independent-reviewer` | Independent Reviewer | `QUALITY` | Semantic architectural review, security audits, verification of acceptance criteria against diff evidence. Cannot review its own authored work. | `CODE_MUTATION`, `HUMAN_APPROVAL_BYPASS` |
| `role:integration:integration-engineer` | Integration Engineer | `INTEGRATION` | Reconcile independently produced task branch results, resolve integration conflicts, run integration smoke suites, prepare candidate branches. | `HUMAN_APPROVAL_BYPASS`, `MERGE_MAIN` |

### Visual Avatar Rule (Wave 12E Boundary)
- Exactly **four** visual humanoid characters exist in the 3D HQ (Chief Planner, Frontend Engineer, Backend Engineer, Independent Reviewer).
- **Integration Engineer exists canonically in the runtime registry without a 5th visual avatar in Wave 12E**.
- Physical expansion of workstations and characters is strictly deferred to future waves (Wave 12F+).

---

## 3. Core Role Invariants

### Invariant 1: Reviewer Independence Invariant
$$\text{AUTHOR\_ROLE}(\text{task}) \neq \text{REVIEW\_ROLE}(\text{task result})$$
An author role can never serve as the independent reviewer for its own output. Independence is logical responsibility and separate execution context.

### Invariant 2: Capability Grant $\neq$ Role Assignment
A role does not automatically gain authority. Even if Frontend Engineer logically requires filesystem write authority, the task must receive an explicit `CapabilityGrant`. Roles cannot widen or override capability policy.

### Invariant 3: Integration Engineer Authority Ceiling
Integration Engineer has no authority to auto-merge `main` or bypass `WAITING_APPROVAL`. Consequential merges always require human sign-off on the Mezzanine.

### Invariant 4: Deterministic Harness Resolution
Harness selection happens *after* role assignment via a deterministic resolver (`resolveHarnessForRole`), never via an LLM.

---

## 4. Deterministic Services (Strictly Non-LLM)

Deterministic operations are handled by deterministic services, never by humanoid reasoning roles or idle LLM daemons:

| Service ID | Name | Purpose | LLM Worker? |
| :--- | :--- | :--- | :--- |
| `service:courier` | Courier Service | Asset downloads, file movement, SHA256 integrity verification | **No** |
| `service:scheduler` | Scheduler Service | DAG topological evaluation, dependency unblocking, dispatch | **No** |
| `service:notification` | Notification Service | Bounded OS desktop notifications, inbox alerts, webhooks | **No** |
| `service:voice` | Voice / TTS Service | Audio briefing generation from pre-approved scripts | **No** |
| `service:file-indexer` | File Indexer Service | AST symbol indexing, worktree file tree inspection | **No** |
| `service:git` | Git Worktree Service | Worktree allocation, isolated branch management, diff captures | **No** |
| `service:verification-runner` | Verification Runner | Deterministic command execution (builds, tests, lints) | **No** |

---

## 5. Future Personal OS Role Taxonomy (Document Only)

The following roles define the future organizational roadmap for Gravitas Personal OS. They are documented here to freeze taxonomy and are **not** implemented in Wave 12E:

### Engineering Department
- Chief Planner
- Frontend Engineer
- Backend Engineer
- Independent Reviewer
- Integration Engineer

### Research Department
- **Research Analyst**: Deep-dive technical exploration, library evaluation, API compatibility audits.
- **Opportunity Researcher**: Market, academic, product, and competitor landscape analysis.

### Learning Department
- **Learning Coach**: Personalized study roadmaps, conceptual mastery tracking, active-recall prompt generation.
- **Study Planner**: Daily/weekly study calendar scheduling, DSA & Data Science progression planning.
- **Knowledge Reviewer**: Weakness identification, spaced-repetition drills, project recommendations.

### Business Department
- **Business Strategist**: Business discovery, technical proposal architecture, strategic positioning.
- **Lead Researcher**: Public business discovery, company verification, factual lead dossier generation.
- **Outreach Specialist**: Tailored communication drafting for prospective partners/clients (strictly approval-gated).

### Personal Operations
- **Personal Coach**: Daily priority planning, evening reflection summaries, routine optimization.
- **Daily Planner**: Calendar agenda organization, schedule rebalancing, travel/prep time buffers.
- **Wellness Observer**: Water intake reminders, posture/movement suggestions, workload balance observations (strictly evidence-based suggestions; **zero** medical diagnoses).

### Communications Department
- **Inbox Analyst**: Email inbox summarization, priority triage, draft responses for review (zero unapproved sends).

### Future Connectors (Bounded API Bridges)
- Google Calendar (OAuth/CalDAV)
- Gmail (IMAP/SMTP/OAuth)
- WhatsApp-compatible provider (Official Cloud API)
- GitHub (REST/GraphQL)
- Notion (Official API)
- Cloud Storage (S3-compatible / Google Drive)

---

## 6. Personal OS Governance: Autonomy Ladder (Part D)

No role may self-promote its autonomy level. The human operator sets standing policy across five discrete autonomy tiers:

| Tier | Level Name | Semantic Definition | Examples |
| :--- | :--- | :--- | :--- |
| **L0** | `SUGGEST` | Agent observes and suggests actions without preparing payloads. | Break suggestions, study topic suggestions |
| **L1** | `PREPARE` | Agent prepares a complete draft or branch but takes no external action. | Email drafts, PR candidate branches, calendar event drafts |
| **L2** | `EXECUTE_SAFE` | Agent autonomously executes actions with zero blast radius or external mutation. | File downloads, SHA256 checks, test runs, calendar read |
| **L3** | `EXECUTE_CONSEQUENTIAL_WITH_APPROVAL` | Agent stages consequential action; execution blocks until explicit human sign-off. | Sending emails, sending messages, merging to main, deleting data, spending funds |
| **L4** | `STANDING_POLICY` | Agent executes consequential action autonomously strictly under pre-approved rule sets. | Auto-running nightly integration tests, bounded staging deployments |
