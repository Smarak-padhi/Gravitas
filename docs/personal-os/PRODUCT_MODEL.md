# Gravitas Master Product Model (Wave 12C.5)

## 1. Master Product Definition

**GRAVITAS** is a local-first personal operations system (Personal OS) and multi-agent command center. It empowers an individual operator to govern complex engineering projects, academic studies, business initiatives, background digital logistics, and daily life routines through structured, verifiable multi-agent delegation.

### What Gravitas IS:
- **A Goal Decomposer & Scheduler:** Interprets high-level human objectives and compiles them into structured, dependency-aware Directed Acyclic Graphs (DAGs) of discrete tasks.
- **A Qualification-Based Orchestrator:** Delegates each task strictly to qualified specialist roles matching required capability grants and containment profiles.
- **A Deterministic Service Coordinator:** Directly invokes deterministic CLI tools, file system operations, git subcommands, and scheduled timers without wasting inference tokens or risking hallucination.
- **A Capability-Controlled Tool Operator:** Connects to external services (Calendar, Mail, Git repositories, Storage) through strictly bounded connectors guarded by capability grants and least-privilege context.
- **An Independent Verification Engine:** Runs verifiers, test suites, and deterministic headless browser checks strictly outside worker control before any output can be considered valid.
- **A Tamper-Evident Evidence Vault:** Archives cryptographic sha256 checksums, worktree diffs, verifier output manifests, and prompt compilation traces for every run.
- **A Compartmentalized Knowledge Base:** Preserves distinct domain contexts (engineering projects, active studies, business opportunities, personal routines) with strict domain boundaries.
- **A Consequential Action Governance Gate:** Enforces human oversight for consequential, external, financial, or destructive operations through clear, unskippable approval plinths and inbox items.
- **A Truthful Spatial Control Surface:** Projects authoritative runtime execution state into both a dense operational 2D dashboard and a spatial 3D architectural headquarters without visual fabrication.

---

### What Gravitas IS NOT:
- **NOT a Swarm of Permanently Running LLMs:** Gravitas does not spin up persistent LLM processes that burn tokens waiting for work. LLM workers are transient, task-scoped processes spawned on-demand and terminated upon execution completion.
- **NOT a Social Simulation or Entertainment Game:** Gravitas is not an "agent town" or roleplay toy where characters chat aimlessly with each other. Every interaction represents real computational work or verified system state.
- **NOT a Generic Chatbot Wrapper:** Gravitas does not direct raw user prompts into an unstructured text loop. All tasks are governed by formal ExecutionContracts, managed prompt compilation, and bounded FSM lifecycles.
- **NOT an Autonomous Mass Outreach / Spam Engine:** Gravitas strictly prohibits automated batch emailing, mass scraping, or unsolicited messaging. All external correspondence requires explicit draft review and human sign-off.
- **NOT an Unrestricted Desktop Automation Bot:** Gravitas does not grant arbitrary OS mouse/keyboard control. Tool interactions are mediated by formal APIs, sandboxed CLI processes, and containerized headless browser sessions.
- **NOT an Autonomous Financial Actor:** Gravitas cannot independently commit funds, execute payments, enter subscriptions, or bind the user legally.
- **NOT an Autonomous Main-Branch Merger:** Gravitas cannot silently merge candidate code into protected branches. All merges require verified golden loop proof and human approval.
- **NOT a Synthetic Illusion Engine:** The frontend (neither 2D nor 3D) never fabricates work activity, fake progress bars, simulated typing, or imagined coworker wanderings. If no task is running on a workstation, that workstation is physically and visually IDLE.

---

## 2. High-Level Architecture Diagram

```
                        ┌───────────────────────────────┐
                        │          HUMAN USER           │
                        │    (Goals, Approvals, Policy)  │
                        └───────────────┬───────────────┘
                                        │
                         Goal Intent    │  Authoritative State
                         & Approvals    │  & Evidence Reviews
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │                         GRAVITAS CORE ENGINE                          │
    │                                                                       │
    │  ┌────────────────────────┐         ┌──────────────────────────────┐  │
    │  │     Goal Composer      │         │      Bounded Scheduler       │  │
    │  │   & Task DAG Planner   │────────►│      & Dependency Queue      │  │
    │  └────────────────────────┘         └──────────────┬───────────────┘  │
    │                                                    │                  │
    │           ┌────────────────────────────────────────┴─────────┐        │
    │           ▼                                                  ▼        │
    │  ┌───────────────────┐                             ┌────────────────┐ │
    │  │  Reasoning Roles  │                             │ Deterministic  │ │
    │  │ (Agent Registry)  │                             │    Services    │ │
    │  └────────┬──────────┘                             └────────┬───────┘ │
    │           │                                                 │         │
    │           ▼                                                 ▼         │
    │  ┌───────────────────┐                             ┌────────────────┐ │
    │  │  Worker Harnesses │                             │  Job Queue &   │ │
    │  │ (Codex/FCC/Claude)│                             │  Courier Subsys│ │
    │  └────────┬──────────┘                             └────────┬───────┘ │
    │           │                                                 │         │
    │           ▼                                                 ▼         │
    │  ┌────────────────────────────────────────────────────────────────┐   │
    │  │                     Capability Grants & SDK                    │   │
    │  │             (Filesystem, Git, Connectors, Web QA)              │   │
    │  └────────────────────────────────┬───────────────────────────────┘   │
    │                                   │                                   │
    │                                   ▼                                   │
    │  ┌────────────────────────────────────────────────────────────────┐   │
    │  │         Independent Verifier & Browser QA Authority            │   │
    │  │               (Cleanroom Tests, Mutation Gates)                │   │
    │  └────────────────────────────────┬───────────────────────────────┘   │
    │                                   │                                   │
    │                                   ▼                                   │
    │  ┌────────────────────────────────────────────────────────────────┐   │
    │  │             Evidence Manifest & Provenance Archive             │   │
    │  └────────────────────────────────┬───────────────────────────────┘   │
    └───────────────────────────────────┼───────────────────────────────────┘
                                        │
                                        │ Push State Events (SSE)
                                        │ Pull Authoritative State (/state)
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │                        DUAL PRESENTATION LAYER                        │
    │                                                                       │
    │   ┌──────────────────────────────┐  ┌──────────────────────────────┐  │
    │   │  Dense 2D Operations Center  │  │   Living 3D Headquarters     │  │
    │   │   (Timeline, Runs, Inbox,    │  │  (Truthful World Projection, │  │
    │   │    Graph, Evidence Diffs)    │  │   Rooms, Stations, Dossiers) │  │
    │   └──────────────────────────────┘  └──────────────────────────────┘  │
    └───────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Operating Principles

### Principle 1: An Agent Claim Is Never Proof of Completion
A worker's declaration of success (`"I fixed the bug"`, `"All tests pass"`) is treated as unverified candidate output. The task remains in `RUNNING` until the worker process terminates. The orchestrator transitions the task to `VERIFYING`, executing test commands and mutation detectors completely outside the worker's execution environment. Only verified exit codes transition the task to `SUCCEEDED` or `WAITING_APPROVAL`.

### Principle 2: Complete Separation of Roles, Harnesses, and Models
A character in Gravitas represents an **organizational functional role** (e.g., `FrontendEngineer`, `LeadResearcher`). The execution engine (e.g., `codex-worker`, `fcc-worker`), the transport (`DIRECT`, `OmniRoute`), the inference provider, and the underlying LLM model are transient implementation details. Changing from OpenAI to Anthropic, or from Codex to Claude Code, changes worker qualification metrics, but never changes the role or employee identity.

### Principle 3: Least Privilege Context Isolation
Information is strictly partitioned into domain-specific silos. The `FrontendEngineer` working on a web component has zero access to personal calendar items, business lead dossiers, or private API keys. Context injection is contractually bounded: a role only sees prompt context explicitly declared in its `contextScopes`.

### Principle 4: Deterministic Foundation Over Stochastic Guesswork
If a task can be accomplished deterministically (running a test suite, computing a git diff, downloading an asset via HTTP, scheduling a cron reminder, parsing structured JSON), it must NEVER be entrusted to an LLM. Inference is reserved exclusively for novel reasoning, synthesis, code authoring, and creative problem solving.

### Principle 5: Truthful State Projection
The UI surfaces — whether the dense 2D Operations Dashboard or the spatial 3D Headquarters — are strictly downstream projection consumers of authoritative server state. The UI never calculates or mutates business logic. Every character position, desk illumination, rack LED, and physical dossier corresponds directly to an authoritative record in `RuntimeProjectionSnapshot` or canonical task lifecycle records.
