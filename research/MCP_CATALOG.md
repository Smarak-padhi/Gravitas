# Model Context Protocol (MCP) Ecosystem Catalog (September 2026)

This catalog details the current status, architecture, and server ecosystem of the Model Context Protocol following the landmark **2026-07-28 Stateless Core Specification**.

---

## 1. Specification Architecture Overview

`mermaid
flowchart LR
    Host[MCP Host / Orchestrator] <-->|JSON-RPC 2.0 over HTTP/SSE or Stdio| Server[MCP Server]
    Server <--> Tools[Tools]
    Server <--> Resources[Resources]
    Server <--> Prompts[Prompts]
    Server <--> Elicitation[Elicitation / Sampling]
`

### Core Primitives [FACT]
- **Tools**: Executable functions that models invoke with structured JSON Schema arguments. Produce structured results and text/image artifacts.
- **Resources**: File-like read-only data attachments (URI-addressable, e.g. ile:///, git://) used to provide static context to models.
- **Prompts**: Reusable templated interactions pre-defined by servers to guide model workflows.
- **Sampling**: Mechanism allowing an MCP server to request LLM completions back from the host/client (enabling agentic servers).
- **Elicitation**: Protocol flow enabling servers to query users for required input or confirmation mid-transaction.
- **Multi Round-Trip Requests (MRTR)**: Introduced in the 2026-07-28 spec, allowing single logical tool invocations to stream incremental progress and intermediate validations.

---

## 2. Official & High-Priority MCP Servers

| Server Name | Maintainer | Transport | Capabilities Provided | Security Risk | Windows Ready? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| @modelcontextprotocol/server-filesystem | Anthropic / MCP Core | Stdio / SSE | Local directory read/write/search | **High** (Disk write) | Yes [FACT] |
| @modelcontextprotocol/server-git | Anthropic / MCP Core | Stdio | Local repository commit/diff/log | Medium (Repo write) | Yes [FACT] |
| @playwright/mcp | Microsoft | Stdio / SSE | Browser automation & snapshots | High (Web traffic) | Yes [FACT] |
| @modelcontextprotocol/server-postgres | MCP Core | Stdio / SSE | SQL query inspection & schema read | High (Data access) | Yes [FACT] |
| @modelcontextprotocol/server-github | GitHub / MCP Core | Stdio / HTTP | Issue/PR creation, branch inspection| Medium (Remote repo)| Yes [FACT] |
| @modelcontextprotocol/server-memory | MCP Core | Stdio | Graph-based associative memory | Low (Internal state)| Yes [FACT] |
| @modelcontextprotocol/server-fetch | MCP Core | Stdio | Web content scraping and markdown | Medium (SSRF risk) | Yes [FACT] |

---

## 3. Remote vs. Local MCP Servers

### Local MCP Servers (Stdio)
- **Mechanism**: Orchestrator spawns server process as child subprocess; communicates over stdin/stdout.
- **Pros**: Zero networking overhead, no network ports exposed, inherits process sandbox.
- **Cons**: Process lifecycle bound to local host; difficult to share across distributed workers.
- **Verdict for V0**: **Default choice for all local dev tools (Git, Filesystem, Playwright).**

### Remote MCP Servers (HTTP + SSE / Streamable HTTP)
- **Mechanism**: Orchestrator connects to HTTP server with OAuth 2.0 Bearer token headers.
- **Pros**: Centralized deployment, shared cache, stateless scaling across workers.
- **Cons**: Requires credential delegation, mTLS/OAuth configuration, vulnerable to network interruption.
- **Verdict for V0**: **Reserved for external SaaS adapters (Cloudflare, Supabase, Linear).**

---

## 4. MCP Architectural Boundary Recommendations

### What MCP SHOULD Be in Our Operating System [INFERENCE]
1. **The Standardized Tool Surface for Shared Services**: Exposing browser automation, database inspection, and design tools across diverse agent harnesses.
2. **The Discovery Protocol for Extensible Capabilities**: Allowing users to drop custom community tools into the command center.

### What MCP SHOULD NOT Be in Our Operating System [INFERENCE]
1. **The Internal Task Orchestration Engine**: MCP lacks DAG task modeling, dependency tracking, retry budgets, and rollback mechanisms.
2. **The Git Worktree Isolation Layer**: Managing branch safety and merge locks must reside in our native Git Manager.
3. **The Core Event Bus**: Orchestrator event streaming (agent heartbeats, live logs, task state transitions) requires typed SQLite event sourcing, not JSON-RPC tool polling.
