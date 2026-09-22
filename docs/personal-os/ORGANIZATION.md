# Gravitas Component Taxonomy & Organizational Architecture (Wave 12C.5)

## 1. Component Classification System

To prevent architectural blurring, every system component in Gravitas belongs to exactly one declared **Architectural Class**. Authority, state mutation rights, and resource access are strictly governed by class definitions.

### The 8 Architectural Classes

| Class | Definition & Purpose | Authority & Mutation Rights | Reasoning Capacity |
| :--- | :--- | :--- | :--- |
| **`REASONING_ROLE`** | Logical organizational agent responsible for domain analysis, planning, code creation, or synthesis. | Proposes candidate mutations and task plans. Cannot directly verify or approve its own output. | Full LLM reasoning via assigned WorkerHarness. |
| **`DETERMINISTIC_SERVICE`** | High-performance, deterministic computational engine (e.g., test runner, cron scheduler, git wrapper, downloader). | Executes bounded algorithmic operations. Emits verifiable execution outcomes and telemetry. | Zero LLM reasoning. Pure code execution. |
| **`CONNECTOR`** | Bounded capability bridge mediating interactions with external platforms (e.g., GitHub API, IMAP/SMTP, Google Calendar, OS filesystem). | Executes reads and writes strictly within granted capability scopes. Never stores secrets in prompts. | Zero LLM reasoning. Strict protocol handler. |
| **`WORKER_HARNESS`** | Subprocess supervisor and execution adapter hosting LLM reasoning environments (e.g., `codex-worker`, `fcc-worker`, `claude-code-worker`). | Manages execution lifetime, process isolation, environment injection, and raw output streaming. | Host container for reasoning roles. |
| **`VERIFICATION_AUTHORITY`** | Independent gatekeeper executing objective test commands and mutation audits against candidate work. | Authoritative right to transition task state from `RUNNING` to `VERIFYING`, `SUCCEEDED`, or `WAITING_APPROVAL`. | Independent assertion suite & headless browser. |
| **`HUMAN_AUTHORITY`** | The human operator acting through dedicated UI surfaces (Command Center, Mezzanine Plinth, Mobile Companion). | Ultimate governance right to approve, reject, cancel, or re-route tasks and authorize consequential side effects. | Human intelligence & strategic intent. |
| **`INFRASTRUCTURE`** | Core routing, transport, and runtime foundations (e.g., `InferenceGateway`, `OmniRoute`, server-sent events bus, local state registry). | Manages message transport, model qualification checks, and client state synchronization. | Pure infrastructure layer. |
| **`OUTPUT_CHANNEL`** | Presentation and alert mechanisms delivering verified state to the user (e.g., 2D Operations UI, 3D HQ Canvas, Desktop Notifications, Voice TTS). | Pure read-only projection or alert delivery. Zero state mutation rights. | Formatter / Renderer / Audio synthesizer. |

---

## 1.1 Canonical Axioms & Non-Negotiable Invariants (Wave 12E)

The following boundaries are foundational and absolute:

1. **`ROLE != HARNESS`**:
   - `ROLE` is organizational responsibility (e.g., `role:engineering:frontend-engineer`).
   - `HARNESS` is an execution tool/runtime (e.g., `codex-worker`, `fcc-worker`).
   - The Frontend Engineer can use Codex, FCC, or any future harness without changing role identity or presentation.
   - A harness (e.g., Codex) can execute frontend, backend, or review tasks if capability policy permits.
   - **Harness != Employee, Provider != Employee, Model != Employee**.

2. **`REVIEWER ROLE != DETERMINISTIC VERIFIER`**:
   - `Independent Reviewer` (`role:quality:independent-reviewer`) is a semantic reasoning role that inspects architecture, logic, and diffs.
   - `Independent Verifier` is deterministic testing infrastructure executing concrete assertion suites and headless browser commands.
   - Deterministic test execution is never anthropomorphized into an AI reviewer.

3. **`INTEGRATOR ROLE != HUMAN APPROVAL`**:
   - `Integration Engineer` (`role:integration:integration-engineer`) reconciles branches, resolves conflicts, and runs integration suites.
   - It possesses **zero** authority to self-approve or auto-merge to protected branches. Human approval is strictly required.

4. **`DETERMINISTIC SERVICE != AGENT ROLE`**:
   - Services (`service:courier`, `service:scheduler`, `service:notification`, `service:file-indexer`, `service:git`, `service:verification-runner`) are deterministic, non-LLM workers. They are not assigned AI agent roles or 3D humanoid avatars.


---

## 2. Component Classification Matrix

| Component Name | Architectural Class | Primary Responsibility | Authority Scope |
| :--- | :--- | :--- | :--- |
| **Chief Planner** | `REASONING_ROLE` | Decomposes goals into structured task DAGs. | Proposes tasks, dependencies, and required capabilities. |
| **Integrator** | `REASONING_ROLE` | Resolves integration conflicts and verifies cross-task coherence. | Proposes candidate branch merges for approval. |
| **Frontend Engineer** | `REASONING_ROLE` | Implements UI/UX components, client-side logic, and CSS styles. | Modifies frontend worktrees within task change scope. |
| **Backend Engineer** | `REASONING_ROLE` | Implements API endpoints, business logic, and database schemas. | Modifies backend worktrees within task change scope. |
| **Systems Engineer** | `REASONING_ROLE` | Configures infrastructure, CI/CD, build tools, and container definitions. | Modifies build configs, devtools, and scripts. |
| **Independent Reviewer**| `REASONING_ROLE` | Performs semantic code reviews and architectural audits. | Emits review comments and flags policy violations. |
| **Researcher** | `REASONING_ROLE` | Investigates technical documentation, APIs, and libraries. | Synthesizes technical folios and research dossiers. |
| **Learning Coach** | `REASONING_ROLE` | Evaluates conceptual understanding, identifies weak areas, creates revision plans. | Proposes study schedules and conceptual exercises. |
| **Project Scout** | `REASONING_ROLE` | Suggests practical coding projects to apply recently learned concepts. | Proposes project briefs and skill-practice roadmaps. |
| **Personal Coach** | `REASONING_ROLE` | Analyzes daily rhythm, workload distribution, and scheduled commitments. | Proposes break intervals and workload rebalancing. |
| **Lead Researcher** | `REASONING_ROLE` | Investigates public market data, company profiles, and public technical stacks. | Produces factual lead dossiers with citations. |
| **Opportunity Analyst**| `REASONING_ROLE` | Evaluates business/client fit based strictly on verified research facts. | Analyzes opportunity viability and strategic value. |
| **Outreach Drafter** | `REASONING_ROLE` | Crafts tailored, professional communication drafts for prospective clients. | Generates candidate drafts; requires human sign-off. |
| **Courier (Planning)** | `REASONING_ROLE` | Analyzes what assets, datasets, or libraries need to be retrieved. | Enqueues deterministic `DownloadJob` / `CloneJob`. |
| **Courier (Worker)** | `DETERMINISTIC_SERVICE`| Executes downloads, unzipping, checksum verification, and file placement. | Local disk writes strictly in staging folders. |
| **Bounded Scheduler** | `DETERMINISTIC_SERVICE`| Resolves DAG dependencies and dispatches tasks to qualified workers. | Authoritative task scheduling and FSM state advancement. |
| **Reminder Service** | `DETERMINISTIC_SERVICE`| Evaluates cron schedules and triggers timed reminder events. | Dispatches timed notification events. |
| **Background Job Queue**| `DETERMINISTIC_SERVICE`| FIFO queue managing background file operations, indexing, and cleanup. | Manages background process execution. |
| **Independent Verifier**| `VERIFICATION_AUTHORITY`| Executes verification commands in isolated worktree cleanroom. | Authoritative verdict: PASS -> `SUCCEEDED`/`WAITING_APPROVAL`. |
| **Browser QA Runner** | `VERIFICATION_AUTHORITY`| Runs deterministic headless Playwright scenarios and captures screenshots. | Authoritative verdict for visual/DOM criteria. |
| **Calendar Connector** | `CONNECTOR` | Interfaces with Google/Apple Calendar via CalDAV/OAuth APIs. | Reads schedules; creates candidate events on approval. |
| **Email Connector** | `CONNECTOR` | Interfaces with email providers via IMAP/SMTP or REST APIs. | Reads headers; stages drafts; sends only upon approval. |
| **Messaging Connector**| `CONNECTOR` | Interfaces with official WhatsApp Business / Telegram Bot APIs. | Reads messages; stages outbound replies for human approval. |
| **GitHub Connector** | `CONNECTOR` | Interfaces with GitHub REST/GraphQL APIs. | Reads PRs/issues; creates candidate branches/PRs. |
| **Filesystem Connector**| `CONNECTOR` | Scoped local filesystem reader/writer. | Reads/writes files within allowed workspace paths. |
| **Codex Worker** | `WORKER_HARNESS` | Subprocess harness executing Codex CLI in isolated workspace. | Subprocess management; stdio streaming. |
| **FCC Worker** | `WORKER_HARNESS` | Subprocess harness executing Free Claude Code CLI. | Subprocess management; stdio streaming. |
| **OmniRoute Gateway** | `INFRASTRUCTURE` | Qualified local routing proxy distributing inference requests. | Request routing, provider failover, token tracking. |
| **Human Operator** | `HUMAN_AUTHORITY` | The real-world user governing the system. | Absolute authority to approve, reject, modify, or halt. |
| **Desktop Notifier** | `OUTPUT_CHANNEL` | Native OS desktop notification dispatch. | Emits desktop alerts based on notification policy. |
| **Voice / TTS Engine** | `OUTPUT_CHANNEL` | Text-to-speech engine synthesizing critical alerts and briefing summaries. | Audio output only; zero interaction logic. |
| **2D Operations UI** | `OUTPUT_CHANNEL` | Dense React-based command center (Timeline, Runs, DAG, Inbox). | Renders authoritative system state; sends user intent. |
| **3D Headquarters** | `OUTPUT_CHANNEL` | Spatial Three.js headquarters scene. | Renders pure projection of authoritative server state. |

---

## 3. Initial Organizational Structure (The 9 Departments)

Gravitas organizes all reasoning roles, services, and authorities into nine coherent operational departments.

```
                      ┌───────────────────────────────┐
                      │    HUMAN APPROVAL / CONTROL   │
                      │     (Mezzanine / Governance)  │
                      └───────────────┬───────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
┌─────────────────────────┐                           ┌───────────────────┐
│   STRATEGY / PLANNING   │                           │  QUALITY ASSURE   │
│  - Chief Planner        │                           │  - Indep Verifier │
│  - Project Scout        │                           │  - Browser QA     │
│  - Bounded Scheduler    │                           │  - Indep Reviewer │
└───────────┬─────────────┘                           └─────────▲─────────┘
            │                                                   │
            ├─────────────────────────┬─────────────────────────┤
            ▼                         ▼                         ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌─────────────────────┐
│      ENGINEERING      │ │       KNOWLEDGE       │ │  BUSINESS / ALGORYXZ│
│ - Frontend Engineer   │ │ - Researcher          │ │ - Lead Researcher   │
│ - Backend Engineer    │ │ - Learning Coach      │ │ - Opportunity Anal. │
│ - Systems Engineer    │ │ - Study Memory Store  │ │ - Outreach Drafter  │
│ - Integrator          │ │                       │ │ - CRM State Store   │
└───────────┬───────────┘ └───────────┬───────────┘ └───────────┬─────────┘
            │                         │                         │
            └─────────────────────────┼─────────────────────────┘
                                      ▼
                        ┌───────────────────────────┐
                        │    PERSONAL OPERATIONS    │
                        │ - Personal Coach          │
                        │ - Reminder Service        │
                        │ - Calendar / Daily Rhythm │
                        └─────────────┬─────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
┌─────────────────────────┐                           ┌───────────────────┐
│     DIGITAL LOGISTICS   │                           │   INFRASTRUCTURE  │
│ - Courier Service       │                           │ - OmniRoute Racks │
│ - Background Job Queue  │                           │ - Worker Harnesses│
│ - Downloader / Extractor│                           │ - SSE Event Bus   │
└─────────────────────────┘                           └───────────────────┘
```

### Department Breakdown

#### 1. Control / Strategy
- **Purpose:** Interpret human goals, decompose objectives into DAGs, schedule execution order, and manage strategic milestones.
- **Roles:** Chief Planner, Project Scout.
- **Services:** Bounded Scheduler, Dependency Resolver.
- **Authority:** Proposes tasks, contracts, and deadlines. Does not execute code or access private credentials.
- **Dependencies:** Consumes human goals; outputs task DAGs to Engineering, Knowledge, and Business departments.

#### 2. Engineering
- **Purpose:** Implement verified code changes, refactor architectures, update tests, and manage multi-package workspaces.
- **Roles:** Frontend Engineer, Backend Engineer, Systems Engineer, Integrator.
- **Services:** Git CLI operations, TypeScript build pipeline.
- **Authority:** Safe read/write within isolated task worktrees. Zero direct merge rights to base branches.
- **Dependencies:** Receives tasks from Strategy; submits candidate branches to Quality department.

#### 3. Quality Assurance
- **Purpose:** Independently verify worker candidate output against objective criteria, assertion suites, and visual regression tests.
- **Roles:** Independent Reviewer (semantic review).
- **Services:** Independent Verifier (test command execution), Browser QA Runner (headless Playwright scenarios).
- **Authority:** Authoritative state advancement (`RUNNING` -> `VERIFYING` -> `SUCCEEDED` / `WAITING_APPROVAL` / `FAILED`).
- **Dependencies:** Evaluates output from Engineering; delivers verified dossiers to Approval mezzanine.

#### 4. Knowledge & Learning
- **Purpose:** Maintain structured concept mastery, manage spaced repetition intervals, synthesize research papers, and guide technical learning.
- **Roles:** Researcher, Learning Coach.
- **Services:** Study Schedule Evaluator, Concept Mastery Graph, Document Indexer.
- **Authority:** Read-only web/doc search; writes strictly to learning notebook and concept graphs.
- **Dependencies:** Interacts with Strategy (to schedule study blocks) and Personal Operations.

#### 5. Personal Operations
- **Purpose:** Monitor daily rhythm, organize calendar time blocks, trigger hydration/stretch reminders, and provide non-diagnostic wellness suggestions.
- **Roles:** Personal Coach.
- **Services:** Reminder Service, Calendar Ingestion Service, Daily Rhythm Aggregator.
- **Authority:** Evaluates user commitments and schedules. Zero medical diagnosis authority.
- **Dependencies:** Coordinates with Calendar Connector and Notification Bus.

#### 6. Business Operations (Algoryxz Pipeline)
- **Purpose:** Research public corporate technology stacks, analyze commercial opportunities, and prepare verified business outreach drafts.
- **Roles:** Lead Researcher, Opportunity Analyst, Outreach Drafter.
- **Services:** Lead Dossier Generator, Fact Verification Checker.
- **Authority:** Public domain web research only. Zero autonomous outbound messaging. All outreach requires human sign-off.
- **Dependencies:** Receives research objectives; delivers outreach packets to Approval department.

#### 7. Digital Logistics (Courier Subsystem)
- **Purpose:** Perform deterministic file operations: asset downloading, archive extraction, checksum verification, and media transcoding.
- **Roles:** Courier Planning Role (evaluates what needs to be downloaded).
- **Services:** Downloader Daemon, Hash Verifier, Archive Extractor, Staging Storage Manager.
- **Authority:** Bounded writes to local `staging/` and `cache/` directories.
- **Dependencies:** Serves Engineering, Knowledge, and Business departments on demand.

#### 8. Infrastructure & Gateways
- **Purpose:** Provide resilient execution environments, model routing proxies, process isolation, and local SSE synchronization.
- **Roles:** None (pure infrastructure).
- **Services:** OmniRoute Gateway, Inference Router, Codex Harness Adapter, FCC Harness Adapter, Claude Code Adapter, Process Supervisor.
- **Authority:** Process execution, network proxying, model qualification enforcement.
- **Dependencies:** Foundational substrate for all active reasoning roles.

#### 9. Human Approval & Governance (Mezzanine)
- **Purpose:** Centralized human governance for all consequential real-world operations.
- **Roles:** Human Operator (you).
- **Services:** Approval Plinth, Human Inbox Dispatcher, Policy Override Console.
- **Authority:** Absolute final sign-off for code integration, email dispatch, external communication, and destructive file actions.
- **Dependencies:** Oversees all other departments.

---

## 4. Special Subsystem Boundaries

### A. The Courier Boundary: Reasoning vs. Deterministic Downloading
A common architectural flaw in agent systems is letting an LLM remain active while downloading multi-gigabyte datasets or models. Gravitas strictly separates the Courier into two distinct components:
1. **Courier Reasoning Role (`REASONING_ROLE`):** Evaluates a project goal, identifies the correct URLs, validates license terms, and defines expected file hashes. It enqueues a `DownloadJob`.
2. **Courier Execution Service (`DETERMINISTIC_SERVICE`):** A lightweight background HTTP downloader streams the file to `staging/downloads/`, verifies the SHA256 checksum, extracts archives if requested, and notifies the orchestrator upon completion. The LLM process is shut down during the download.

### B. The Calendar & Inbox Boundary: Connectors + Services vs. Roles
Gravitas rejects the anti-pattern of a permanent "Calendar Agent" or "Email Agent" running continuously:
- **Calendar:** The `CalendarConnector` fetches raw iCal/REST events. A deterministic `CalendarService` indexes event timestamps, detects conflicts, and alerts the `ReminderService`. An LLM reasoning role (`PersonalCoach` or `Planner`) is invoked only when the user asks for schedule restructuring or conflict resolution.
- **Inbox:** The `EmailConnector` polls headers over secure IMAP/REST. A deterministic `InboxService` extracts sender, subject, and unread flags. A reasoning role is invoked only when semantic message summarization, categorization, or reply drafting is explicitly requested.
