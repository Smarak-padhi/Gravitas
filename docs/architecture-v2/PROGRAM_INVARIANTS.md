# GRAVITAS — GLOBAL PROGRAM INVARIANTS
## Non-Negotiable Operational & Architectural Rules

**Document Status**: Current P0/P1 evidence and planning artifact. The frozen master planning contracts remain governing project context; repository/runtime evidence is ultimate ground truth.

---

### Foundational Invariant
$$\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$$

---

## The 20 Mandatory Program Invariants

1. **Repository/Runtime Evidence Overrides Reports**: Historical claims, planning documents, commit messages, and previous agent summaries are non-authoritative context. Only direct repository state, filesystem contents, command output, and verified runtime behavior constitute ground truth.
2. **No Wave Self-Approves the Next Wave**: An executing agent or wave cannot declare its successor authorized or proceed into subsequent phases automatically. Each wave boundary is an absolute execution halt.
3. **Every Wave Ends at Human Review**: Advancement across any wave gate requires explicit human review and authorization based on auditable evidence.
4. **Deterministic Work Must Not Consume LLM Inference Unnecessarily**: Compilers, linters, tests, formatters, diff inspectors, Git operations, and deterministic validation must be executed directly by host tooling, never mediated through wasteful LLM calls.
5. **Agents Communicate Exclusively Through GRAVITAS**: Agents are strictly forbidden from forming direct, unmediated communication channels or loops with each other. All inter-agent requests, questions, answers, and artifacts flow canonically through the GRAVITAS kernel:
   $$\text{Worker} \rightarrow \text{GRAVITAS} \rightarrow \text{Supervisor/Specialist} \rightarrow \text{GRAVITAS} \rightarrow \text{Worker}$$
6. **Human Approval Remains Sovereign**: Real decisions, architectural pivots, scope expansions, external integrations, financial expenditures, and destructive operations unconditionally require sovereign human sign-off.
7. **Frontend State is Projection, Not Runtime Truth**: The desktop UI, 3D headquarters, 2.5D visualizers, and 2D inspectors are projections of canonical GRAVITAS kernel state. UI commands may request actions, but the UI does not become the source of runtime truth or bypass kernel authorization/state transitions.
8. **Capability Authority Must Be Explicit and Scoped**: Agents operate under the principle of least privilege. Every action requires an explicit, machine-readable `CapabilityGrant` defining permitted filesystem paths, network destinations, and execution scopes.
9. **Credentials Must Never Be Copied into Evidence/Logs**: Authentication tokens, OAuth cookies, API keys, passwords, and sensitive environment variables must be actively redacted and never stored in session state, telemetry, transcripts, or committed artifacts.
10. **Main Branch Must Never Be Modified Casually**: All worker execution occurs in isolated, ephemeral Git worktrees. The `main` branch is protected and can only receive validated, approved changes through governed integration.
11. **Provider Names Must Not Become Logical Roles**: System roles represent organizational responsibilities (e.g., `Backend Engineer`, `Browser QA`), never vendor or model brands (e.g., no "Codex Agent" or "Claude Role").
12. **A Tool Being Installed Does Not Mean It Is Qualified**: Physical presence of a binary on the host machine proves existence only. A tool cannot be utilized in production workflows without passing the full qualification progression.
13. **Successful `--version` Output Proves Installation at Most, Not Readiness**: Executing `--version` demonstrates only that a binary is on the search path and executable. It provides zero proof of authentication, network reachability, sandbox containment, tool authorization, or automation readiness.
14. **Qualification States May Not Be Skipped**: Every candidate harness must advance sequentially through the qualification ladder:
    $$\text{DISCOVERED} \rightarrow \text{INSTALLED} \rightarrow \text{AUTHENTICATED} \rightarrow \text{REACHABLE} \rightarrow \text{CAPABILITY\_PROBED} \rightarrow \text{CONTAINMENT\_TESTED} \rightarrow \text{QUALIFIED} \rightarrow \text{READY}$$
    Skipping any state invalidates qualification.
15. **Architecture Choices Require Evidence and Alternatives**: Technology selections (languages, frameworks, databases, IPC protocols, renderers) must emerge from empirical benchmarks, constraints, and Architecture Arena evaluations comparing at least two viable alternatives—never from stack familiarity.
16. **Every Meaningful Automated Action Must Be Attributable**: Every file edit, test run, prompt execution, and state transition must record its initiating Role, assigned Executor, Harness used, timestamp, and task context in durable evidence logs.
17. **Evidence Must Describe What Actually Happened, Not What an Agent Claims Happened**: Logs, git diffs, process exit codes, and test stdout are evidence; LLM natural language self-assessments are not.
18. **No Auto-Merge**: Under no circumstances may an automated agent merge execution worktrees or candidate branches into primary branches without passing verification and receiving explicit human approval.
19. **No Destructive Integration Without Human Authorization**: Overwriting working directories, dropping tables, purging databases, killing unrelated OS processes, or making irreversible external mutations requires explicit, interactive human confirmation.
20. **Every Later Wave Inherits Unresolved Risks from Earlier Waves**: Unresolved questions, technical debt, or safety flags identified in prior waves are not erased by phase progression; they carry forward as explicit blocking considerations until remediated.
