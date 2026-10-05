# GRAVITAS — OPERATOR AUTOMATION OPPORTUNITIES
## Grounded Analysis of Repetitive Workflows, Cognitive Friction, and Tool Capabilities

**Document Identifier**: `GRAVITAS-ARCH-P4-005`  
**Governing Milestone**: Wave P4 (Tool Registry & External Capability Architecture)  
**Requirement Mapping**: `REQ-P4-16`  
**Document Status**: Final Architectural Analysis  
**Date**: 2026-09-30  

---

### Foundational Invariant
$$\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$$
$$\text{CAPABILITY} \neq \text{TOOL} \neq \text{TRANSPORT} \neq \text{CREDENTIAL} \neq \text{AUTHORITY}$$
$$\text{TOOL DECLARATION} \neq \text{TOOL QUALIFICATION} \neq \text{TOOL AUTHORIZATION} \neq \text{TOOL EXECUTION}$$
$$\text{DISCOVERY} \neq \text{INSTALLATION} \neq \text{AUTHENTICATION} \neq \text{TRUST}$$

---

## 1. Executive Summary & Methodology

A foundational design mandate of GRAVITAS is **human sovereignty without human servitude**:
> The system must maximize operator leverage by eliminating repetitive manual mechanics, while strictly preserving sovereign human approval for consequential decisions.

This document identifies, analyzes, and prioritizes repetitive operator workflows grounded in direct evidence from the GRAVITAS repository history, Git activity, toolchain forensics, and development transcripts across Waves P0 through P3. It formulates concrete capability definitions, required authorities, sovereign human gates, risk assessments, and implementation wave recommendations.

None of the integrations evaluated here are authorized for installation during Wave P4. This analysis provides the objective evidentiary justification for future-wave connector implementations.

---

## 2. Evidence-Grounded Workflow Friction Analysis

#### Opportunity 1: Automated Cross-Model Advisory & Clipboard Elimination
- **Observed Manual Workflow**: In development transcripts and master plan notes, the operator frequently moves text back and forth between different AI tools (e.g. copying architecture drafts from Antigravity into ChatGPT/Claude for review, then copying critiques back into Antigravity).
- **Pain & Cognitive Friction**: High context switching; risk of clipboard truncation; narrative drift; loss of cryptographic provenance; tedious copy-paste loops.
- **Candidate Capability**: `capability:orchestration:cross-model-advisory`
- **Candidate Tool / Integration**: Kernel Bounded Messaging via `InferenceGateway` or Headless CLI Harness dispatch (`codex`, `claude`) using `AgentMessageEnvelope<T>`.
- **Authority Required**: `model.inference.invoke`
- **Human Gate Required**: None for read-only advisory critique; required if advisory triggers automated code mutations.
- **Zero-Cost Implementation Path**: Dispatch to existing local CLI harnesses (`codex`, `claude`) using existing authorized operator sessions, or local open-weights models (`LOCAL_FOSS` via Ollama).
- **Existing-Tool Path**: Reuses already-installed CLI surfaces identified in P1 baseline without adding external gateway dependencies.
- **Paid Dependency**: Cloud pay-per-token API is **STRICTLY EXCLUDED** under zero-spend default.
- **Free Quota Dependency**: Subject to CLI subscription allowances; zero incremental charges.
- **Rate-Limit Sensitivity**: Handled via exponential backoff; if subscription rate limit is reached, queue or fallback to local model.
- **Offline / Local Alternative**: 100% offline local inference via Ollama / llama.cpp (e.g. Qwen-2.5-Coder-32B on host GPU).
- **Recommendation Under Zero-Spend Policy**: **APPROVED (ZERO-SPEND SAFE)** via local CLI reuse or local FOSS model.

---

### Opportunity 2: Automated Git Worktree Provisioning & Concurrency Serialization
- **Observed Manual Workflow**: The operator and agents repeatedly execute `git status`, `git branch`, inspect untracked files, manually check whether edits bled into `packages/` or `apps/`, and verify that `.git/index.lock` collisions do not occur during parallel runs.
- **Pain & Cognitive Friction**: High anxiety over accidental workspace pollution; repetitive verification commands; manual cleanup of stale worktrees.
- **Candidate Capability**: `capability:git:isolated-worktree-management`
- **Candidate Tool / Integration**: Deterministic Service `service:worktree-manager` backed by `AsyncRepositoryMutex` and native Git CLI.
- **Authority Required**: `filesystem.write (.gravitas/worktrees/*)`, `git.branch.create`, `git.worktree.add`, `git.worktree.remove`
- **Human Gate Required**: None for ephemeral worktree creation/destruction; mandatory for merging into protected base branches (`main`, `feat/*`).
- **Zero-Cost Implementation Path**: 100% native in-process Git module (`@gravitas/git`) executing local Git commands (`LOCAL_FOSS`).
- **Existing-Tool Path**: Uses host Git binary (`git version 2.45+`) already installed and verified on system.
- **Paid Dependency**: NONE. Permanently zero-cost.
- **Free Quota Dependency**: NONE. Unbounded local execution.
- **Rate-Limit Sensitivity**: NONE. Bound only by local NVMe disk speed and OS process scheduler.
- **Offline / Local Alternative**: N/A (Already 100% offline and local).
- **Recommendation Under Zero-Spend Policy**: **APPROVED (ZERO-SPEND SAFE)**. Primary architecture foundation.

---

### Opportunity 3: Sovereign GitHub PR Creation & Issue Synchronization
- **Observed Manual Workflow**: The operator manually opens browser tabs, reviews task diffs, copies markdown descriptions, navigates to `github.com/Smarak-padhi/Gravitas`, opens pull requests, checks PR status, and links issues.
- **Pain & Cognitive Friction**: Repetitive browser UI clicking; manual copy-pasting of commit summaries and verification evidence; context switching between IDE and web.
- **Candidate Capability**: `capability:repository:create-pull-request`, `capability:repository:read-issues`
- **Candidate Tool / Integration**: GitHub CLI adapter (`gh pr create`) or official GitHub MCP Server (`github/github-mcp-server`).
- **Authority Required**: `github.pr.create`, `github.issue.read`, `github.pr.read` (PROHIBITED: `github.repo.delete`, `github.pr.merge`)
- **Human Gate Required**: **MANDATORY HUMAN APPROVAL GATE** before PR submission (operator reviews diff, title, and body preview in Command Center).
- **Zero-Cost Implementation Path**: Official GitHub CLI (`gh`) or `github-mcp-server` using existing personal GitHub account PAT.
- **Existing-Tool Path**: Reuses `gh` CLI already available on developer workstation.
- **Paid Dependency**: NONE for public and standard personal GitHub repositories.
- **Free Quota Dependency**: 5,000 requests/hour authenticated REST API quota; resets hourly.
- **Rate-Limit Sensitivity**: Hard stop on quota breach (HTTP 403); system queues non-urgent issue syncs.
- **Offline / Local Alternative**: Generate local PR bundle/patch file (`git format-patch`) for offline review.
- **Recommendation Under Zero-Spend Policy**: **APPROVED (ZERO-SPEND SAFE WITH QUOTA)**. Sovereign human gate strictly enforced.

---

### Opportunity 4: Automated Shell-Free Verification & Headless Browser QA
- **Observed Manual Workflow**: After agent code changes, the operator manually launches dev servers (`npm run dev`), opens browsers, clicks UI buttons, checks console logs, or runs ad-hoc curl requests to confirm endpoints work.
- **Pain & Cognitive Friction**: Visual inspection fatigue; inconsistent manual testing; inability to reproduce transient rendering glitches.
- **Candidate Capability**: `capability:verification:headless-browser-qa`
- **Candidate Tool / Integration**: Playwright MCP Adapter (`mcp/playwright` already present in local app data) or direct Playwright runner.
- **Authority Required**: `browser.navigate`, `browser.click`, `browser.snapshot`, `browser.console.read`, `network.loopback.access` (PROHIBITED: external internet navigation without explicit grant).
- **Human Gate Required**: None for test execution; approval required if browser QA triggers bug-filing or remediation commits.
- **Zero-Cost Implementation Path**: Local headless Chromium driven via Playwright MCP (`LOCAL_FOSS`).
- **Existing-Tool Path**: Reuses local Playwright installation located in user profile (`~/.gemini/antigravity/mcp/playwright`).
- **Paid Dependency**: NONE. Eliminates costly vision-model computer use ($0.03/screenshot).
- **Free Quota Dependency**: NONE. Bound only by host CPU and RAM.
- **Rate-Limit Sensitivity**: NONE.
- **Offline / Local Alternative**: 100% offline against loopback test server (`http://127.0.0.1:<port>`).
- **Recommendation Under Zero-Spend Policy**: **APPROVED (ZERO-SPEND SAFE)**. 100x cheaper and faster than visual coordinate clicking.

---

### Opportunity 5: Calendar Context Extraction & Project Milestone Tracking
- **Observed Manual Workflow**: The operator must mentally reconcile project milestone deadlines (e.g. Wave delivery targets) with personal schedule, meetings, and external commitments by manually checking Google Calendar or Outlook in separate tabs.
- **Pain & Cognitive Friction**: Schedule fragmentation; unplanned interruptions; missed focus blocks for complex multi-agent runs.
- **Candidate Capability**: `capability:calendar:read-schedule-context`
- **Candidate Tool / Integration**: Existing `GoogleCalendarAdapter` (`packages/orchestrator/src/connectors/calendar/googleCalendarAdapter.ts`) or Google Calendar API.
- **Authority Required**: `calendar.events.read` (STRICTLY PROHIBITED: `calendar.event.delete`, `calendar.events.write` without explicit human gate).
- **Human Gate Required**: Read-only schedule awareness requires zero gates. Creating focus blocks or scheduling reviews requires a **Two-Phase Human Approval Gate**.
- **Zero-Cost Implementation Path**: Direct Google Calendar API v3 via in-process adapter using operator's existing Google OAuth token.
- **Existing-Tool Path**: Directly activates existing prototype in `packages/orchestrator/src/connectors/calendar/googleCalendarAdapter.ts`.
- **Paid Dependency**: NONE. Google Calendar API is completely free for individual developer use (1,000,000 queries/day).
- **Free Quota Dependency**: 1,000,000 queries/day; hard reject on breach (no automatic credit card billing).
- **Rate-Limit Sensitivity**: Low (500 req/100sec per user); queries are cached locally for 15 minutes.
- **Offline / Local Alternative**: Local `.ics` iCalendar file parser reading exported schedule offline.
- **Recommendation Under Zero-Spend Policy**: **APPROVED (ZERO-SPEND SAFE WITH QUOTA)**. Existing in-repo adapter preferred over external MCP daemons.

---

### Opportunity 6: Actionable Email & Notification Triage
- **Observed Manual Workflow**: The operator manually monitors incoming communications (GitHub notification emails, team messages, alerts) and determines whether they relate to active GRAVITAS tasks.
- **Pain & Cognitive Friction**: Inattention to critical CI/CD failures; notification fatigue; manual copy-pasting of issue alerts into task descriptions.
- **Candidate Capability**: `capability:communication:triage-notifications`
- **Candidate Tool / Integration**: Gmail API / In-Process Connector + Windows Desktop Notifications (`BurntToast` / WinRT toast notifications).
- **Authority Required**: `email.messages.read`, `system.notification.emit` (STRICTLY PROHIBITED: `email.messages.send` without human approval).
- **Human Gate Required**: Zero for desktop toast notifications. Mandatory approval for sending any outbound message or email.
- **Zero-Cost Implementation Path**: In-process Gmail API with OAuth 2.0 PKCE + native WinRT toast notifications via PowerShell / C# bridge (`LOCAL_FOSS`).
- **Existing-Tool Path**: Native Windows notification system (`ToastNotificationManager`) requires zero external dependencies.
- **Paid Dependency**: NONE. Gmail API is free for personal accounts (1B quota units/day).
- **Free Quota Dependency**: High Google free quota; hard cutoff on breach.
- **Rate-Limit Sensitivity**: Low; triage polling runs every 10–15 minutes with exponential backoff.
- **Offline / Local Alternative**: Local file watcher monitoring Git hooks or CI webhook logs on localhost.
- **Recommendation Under Zero-Spend Policy**: **APPROVED (ZERO-SPEND SAFE WITH QUOTA)**. Outbound transmission remains behind sovereign human gate.

---

### Opportunity 7: Automated Architecture Decision Capture & Knowledge Graph Synchronization
- **Observed Manual Workflow**: In every wave, the operator and agent generate voluminous architectural conclusions (e.g. 25-spec taxonomy, 7-layer invariant, fallback policies). Keeping roadmaps, objective ledgers, and ADRs synchronized across 20+ markdown files requires meticulous manual editing.
- **Pain & Cognitive Friction**: Documentation drift; duplicate status ledgers; accidental contradiction between specs and code.
- **Candidate Capability**: `capability:knowledge:structured-decision-capture`
- **Candidate Tool / Integration**: Graphify AST extraction / Obsidian Local Markdown Vault Adapter / Local SQLite Store.
- **Authority Required**: `filesystem.write (docs/*, .planning/*)`
- **Human Gate Required**: Mandatory human review before finalizing architectural documents (human review checkpoint pattern).
- **Zero-Cost Implementation Path**: Local filesystem Markdown manipulation + in-process `sqlite-vec` indexing (`LOCAL_FOSS`).
- **Existing-Tool Path**: Reads and writes directly to local repository paths and local Obsidian vault.
- **Paid Dependency**: NONE. Notion SaaS is excluded in favor of local Markdown.
- **Free Quota Dependency**: NONE. 100% unbounded local compute.
- **Rate-Limit Sensitivity**: NONE.
- **Offline / Local Alternative**: 100% offline local files.
- **Recommendation Under Zero-Spend Policy**: **APPROVED (ZERO-SPEND SAFE)**. Preserves 100% data sovereignty and zero cloud spend.

---

## 3. Summary Opportunity & Prioritization Matrix (Zero-Spend Audited)

| Opportunity ID | Workflow Name | Category | Zero-Cost Implementation Path | Cost Category | Free Quota Dependency | Human Gate Required? | Target Wave |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **OPP-01** | Cross-Model Advisory | Dev / Orchestration | Local CLI Harness / Local Ollama | `ALREADY_OWNED` / `LOCAL_FOSS` | Subscription bounds / Unbounded local | No (advisory) | Phase K Core |
| **OPP-02** | Worktree Management | Dev / Git | Native `@gravitas/git` CLI | `LOCAL_FOSS` | None (Unbounded) | No (ephemeral) | Phase K Worktree |
| **OPP-03** | GitHub PR Sync | Dev / GitHub | Official `gh` CLI / GitHub MCP | `FREE_TIER` | 5,000 req/hr (Hard stop) | **YES (Mandatory)** | Phase K Connectors |
| **OPP-04** | Headless Browser QA | Dev / QA | Local Playwright MCP | `LOCAL_FOSS` | None (Host compute) | No (read/test) | Phase K Cleanroom |
| **OPP-05** | Calendar Context Awareness | Productivity / Time | In-Repo `GoogleCalendarAdapter` | `FREE_TIER` | 1M req/day (Hard stop) | No (read) / **YES (write)** | Phase D Desktop |
| **OPP-06** | Email & Notification Triage | Productivity / Alerts | In-Process Gmail + WinRT Toasts | `FREE_TIER` / `LOCAL_FOSS` | Standard personal quota | No (read) / **YES (send)** | Phase D Desktop |
| **OPP-07** | Knowledge Graph Sync | Documentation / Arch | Local Markdown + SQLite-vec | `LOCAL_FOSS` | None (Unbounded) | **YES (Final approval)** | Phase K Knowledge |

---

## 4. Architectural Rules Derived from Opportunity Analysis

1. **Read vs Write Authority Separation**:
   Every opportunity demonstrates that **Read** access can be granted with lower friction (under strict privacy and PII redaction rules), whereas **Write / Mutation / Communication** access MUST unconditionally trigger a **Two-Phase Human Approval Gate**.
2. **Untrusted External Data Boundary**:
   Tool outputs from external services (GitHub issues, emails, web pages) MUST be classified as `UNTRUSTED_EXTERNAL_DATA` to defend against indirect prompt injection.
3. **Zero Secrets in Agent Context**:
   GitHub tokens, Google OAuth tokens, and API keys must be retained inside an isolated Credential Broker. Agents interact with capabilities via opaque tokens (`CredentialReference`), never touching raw bearer tokens.
