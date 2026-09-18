# Primary Research Sources & Evidence Base (September 2026)

This repository documents the foundational technical research and system architecture for the **Multi-Agent Computer Operating System**.
All findings, capability evaluations, and architectural decisions adhere strictly to our truth classification taxonomy:
- **[FACT]**: Verified directly from primary documentation, official specifications, RFCs, or code repositories.
- **[INFERENCE]**: Architectural deductions and engineering conclusions derived from verified technical properties.
- **[EXPERIMENT]**: Concrete architectural hypotheses that Phase 0 / V0 implementation prototypes must test empirically.
- **[UNKNOWN]**: Items currently lacking authoritative verification or dependent on proprietary internal roadmaps.

---

## 1. Specifications & Standards

### Model Context Protocol (MCP)
- **Specification Release**: 2026-07-28 Official Core Spec (Stateless Architecture)
- **Canonical URL**: [modelcontextprotocol.io/specification](https://modelcontextprotocol.io/specification)
- **Repository**: [github.com/modelcontextprotocol/specification](https://github.com/modelcontextprotocol/specification)
- **Access Date**: September 18, 2026
- **[FACT]**: The 2026-07-28 revision established a stateless protocol core over HTTP/SSE and streamable JSON-RPC, deprecating mandatory sticky connection states. Introduced Multi Round-Trip Requests (MRTR), header-based routing, cacheable list results, and OAuth 2.0 / OIDC authorization headers.

### OpenTelemetry Semantic Conventions for Generative AI & Agents
- **Specification**: OpenTelemetry GenAI Semantic Conventions v1.31+
- **Canonical URL**: [opentelemetry.io/docs/specs/semconv/gen-ai/](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- **Access Date**: September 18, 2026
- **[FACT]**: Standardizes span naming for gen_ai.system, gen_ai.request.model, gen_ai.usage.input_tokens, gen_ai.usage.output_tokens, and agent execution traces.

### W3C UI Automation & Accessible Rich Internet Applications (WAI-ARIA)
- **Specification**: W3C ARIA 1.3 / WebDriver BiDi
- **Canonical URL**: [w3.org/TR/wai-aria/](https://www.w3.org/TR/wai-aria/)
- **Access Date**: September 18, 2026
- **[FACT]**: Standardizes accessibility trees (roles, states, names) providing token-efficient, robust semantic targets for browser automation compared to raw DOM trees or pixel coordinates.

---

## 2. Coding Agent Surfaces & CLI Harnesses

### Claude Code (Anthropic)
- **Documentation**: [docs.anthropic.com/en/docs/agents-and-tools/claude-code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code)
- **Access Date**: September 18, 2026
- **[FACT]**: Supports headless, non-interactive execution via claude -p "<prompt>". Outputs machine-parseable streaming JSON via --output-format json and stream-json. Pre-approves tool execution via --allowedTools "Read,Edit,Bash". Configurable limits via --max-turns. Official TypeScript and Python Agent SDKs exist for embedded in-process harness control.

### OpenAI Codex CLI (codex exec)
- **Repository**: [github.com/openai/codex](https://github.com/openai/codex)
- **Documentation**: [platform.openai.com/docs/codex-cli](https://platform.openai.com/docs/codex-cli)
- **Access Date**: September 18, 2026
- **[FACT]**: Provides headless batch execution via codex exec "<prompt>". Delivers machine-readable events via --json (JSON Lines). Enforces security boundaries via --sandbox workspace-write (defaulting to read-only). Accepts piped input and environment-based auth (OPENAI_API_KEY).

### Aider (ider.chat)
- **Documentation**: [aider.chat/docs/usage/modes.html](https://aider.chat/docs/usage/modes.html)
- **Repository**: [github.com/paul-gauthier/aider](https://github.com/paul-gauthier/aider)
- **Access Date**: September 18, 2026
- **[FACT]**: Designed for terminal and headless scripting via ider --message "<prompt>" (or -m) combined with --yes (auto-confirm) and --no-auto-commits. Pure stdout/stderr output without PTY requirements. Mature Windows PowerShell compatibility.

### Gemini CLI & Google Agent Development Kit (ADK)
- **Documentation**: [cloud.google.com/vertex-ai/docs/agent-development-kit](https://cloud.google.com/vertex-ai/docs/agent-development-kit)
- **Repository**: [github.com/google/adk](https://github.com/google/adk)
- **Access Date**: September 18, 2026
- **[FACT]**: Headless operation via gemini -p "<prompt>" --output-format json. Google ADK provides modular agent definitions (LLM, Workflow, Custom), ADK Web telemetry UI, and vendor-neutral deployment options.

---

## 3. Browser & Desktop Automation

### Microsoft Playwright & Playwright MCP
- **Repository**: [github.com/microsoft/playwright](https://github.com/microsoft/playwright)
- **MCP Server**: [github.com/microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- **Documentation**: [playwright.dev/docs/agentic-automation](https://playwright.dev/docs/agentic-automation)
- **Access Date**: September 18, 2026
- **[FACT]**: Microsoft maintains two distinct surfaces. Playwright MCP (@playwright/mcp) is optimized for LLM tool calling using structured accessibility snapshots. Playwright CLI (@playwright/cli) is optimized for coding agents running fast shell commands against a persistent browser daemon, saving up to 80% in token consumption.

### OmniParser V2 (Microsoft Research)
- **Repository**: [github.com/microsoft/OmniParser](https://github.com/microsoft/OmniParser)
- **Access Date**: September 18, 2026
- **[FACT]**: Pure vision model that transforms screenshots into structured interactive bounding boxes and parsed icons, allowing vision models to navigate desktop GUIs without accessibility tree metadata.

### Windows UI Automation (UIA) & pywinauto
- **Documentation**: [learn.microsoft.com/en-us/windows/win32/winauto/entry-uiauto-win32](https://learn.microsoft.com/en-us/windows/win32/winauto/entry-uiauto-win32)
- **Repository**: [github.com/pywinauto/pywinauto](https://github.com/pywinauto/pywinauto)
- **Access Date**: September 18, 2026
- **[FACT]**: Native Windows programmatic UI hierarchy with zero external process overhead. pywinauto wraps UIA for fast element querying and native input dispatching.

---

## 4. Orchestration & Systems Infrastructure

### LangGraph
- **Repository**: [github.com/langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)
- **Access Date**: September 18, 2026
- **[FACT]**: State graph framework supporting cyclic agent graphs, durable node-level persistence checkpointers (Postgres, SQLite), human-in-the-loop interruption breakpoints, and time-travel rollbacks.

### Temporal Technologies
- **Repository**: [github.com/temporalio/sdk-python](https://github.com/temporalio/sdk-python)
- **Canonical URL**: [temporal.io](https://temporal.io)
- **Access Date**: September 18, 2026
- **[FACT]**: Durable execution engine providing deterministic event sourcing, automatic retry backoffs, and execution state survival across server crashes.

### Tauri 2.x Architecture
- **Canonical URL**: [tauri.app](https://tauri.app)
- **Access Date**: September 18, 2026
- **[FACT]**: Uses Windows native WebView2. Generates small binaries (~5-10MB) with 40-80MB idle RAM (compared to Electron at 150-400MB). Exposes fine-grained capability-based IPC security boundaries.
