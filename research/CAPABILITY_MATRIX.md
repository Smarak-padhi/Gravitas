# Capability Execution Matrix: Architecture Decision Framework

This matrix evaluates execution channels across five distinct integration surfaces:
1. **Native API** (Direct REST/gRPC/SDK)
2. **MCP** (Model Context Protocol Server)
3. **CLI** (Process Execution & Shell Subprocess)
4. **Browser Automation** (DOM / Accessibility Snapshot / CDP)
5. **Desktop Automation** (Windows UIA / Vision Coordinates)

---

## 1. Multi-Surface Comparison Matrix

| Evaluation Dimension | Native API | MCP Server | CLI Tool | Browser Automation | Desktop Automation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Mechanism** | HTTP/gRPC SDK | JSON-RPC 2.0 (stdio/HTTP) | Child process stdout/stderr | Playwright CDP / BiDi | Windows UIA / Pixel Vision |
| **Deterministic Reliability** | **High (99.9%)** [FACT] | **High (98%)** [FACT] | **High (97%)** [FACT] | **Medium (85-92%)** [FACT] | **Low-Medium (70-85%)** [FACT] |
| **Token Efficiency** | **High** (compact schema) | **Moderate** (tool schemas) | **High** (raw text/flags) | **Low-Mod** (snapshots) | **Very Low** (vision tokens) |
| **Setup & Maintenance Overhead**| Low (API keys) | Medium (server daemon) | Low (executable in PATH) | Medium (headless engine) | High (display, OS permissions) |
| **Streaming Support** | Native (chunked/SSE) | Native (MRTR / SSE) | Native (stdout pipe) | Event-driven (CDP events) | Polling / Frame capture |
| **Structured Output** | Typed JSON / Proto | JSON Schema responses | Requires parsing/regex | JSON via evaluate() | OCR / Vision coordinate JSON |
| **Sandboxing & Isolation** | Token scoping / mTLS | In-process or stdio pipe | Windows Job Objects / WSL | Isolated Browser Contexts | Windows Sandbox / VM |
| **Interactive State Handling** | Stateless / Session IDs | Stateless core (2026 spec) | Ephemeral or daemon | Stateful session context | Stateful desktop OS session |
| **Windows Native Support** | Universal | Universal | Requires shell handling | Full (Chromium/Edge) | Full (Win32 / UIA / DirectX) |
| **Prompt Injection Risk** | Low (validated payloads) | Medium (untrusted tools) | Medium (shell injection) | **Critical** (web DOM injection)| **Critical** (screen OCR injection)|

---

## 2. Integration Classification Framework

`mermaid
flowchart TD
    Req([Action Required]) --> Q1{Is there a stable<br/>Direct API?}
    Q1 -- Yes --> A1[Use Native API]
    Q1 -- No --> Q2{Is there a maintained<br/>MCP Server?}
    Q2 -- Yes --> A2[Use MCP Server]
    Q2 -- No --> Q3{Is there a maintained<br/>CLI Tool?}
    Q3 -- Yes --> A3[Use CLI Tool]
    Q3 -- No --> Q4{Is target a Web App<br/>on Localhost / Cloud?}
    Q4 -- Yes --> A4[Use Playwright Browser]
    Q4 -- No --> Q5{Does Windows app have<br/>Accessibility / UIA Tree?}
    Q5 -- Yes --> A5[Use Windows UIA / pywinauto]
    Q5 -- No --> A6[Use Vision + Coordinate Control<br/>OmniParser / Claude Computer Use]
`

---

## 3. Specific Capability Decisions

| Integration Domain | Recommended Primary Surface | Secondary Fallback | Technical Rationale |
| :--- | :--- | :--- | :--- |
| **GitHub** | **Native API / @octokit** | gh CLI | API allows granular OAuth token scoping without shell escaping vulnerabilities. [INFERENCE] |
| **Local Git Operations** | **CLI (git) via Git Worktrees** | Native libgit2 | Official Git binary is universally compliant with submodules, hooks, and Windows NTFS semantics. [FACT] |
| **Playwright Browser** | **CLI for Coding Agents** | MCP for Orchestrator | Playwright CLI commands save token context during code generation; MCP is ideal for QA inspector loops. [FACT] |
| **Vercel / Cloudflare** | **Native API** | CLI (ercel, wrangler) | REST APIs provide deterministic deployment lifecycle webhooks and zero CLI session overhead. [FACT] |
| **Supabase / Neon DB** | **Native API / Postgres Wire** | MCP Server | Direct connection pooling provides millisecond latency and parameterized query safety. [FACT] |
| **Notion / Linear** | **Native API** | MCP Server | Official REST APIs support webhook subscription and typed schema parsing. [FACT] |
| **Terminal Execution** | **Native Child Process + ConPTY**| Windows Sandbox | ConPTY handles Windows terminal escape sequences and job isolation reliably. [FACT] |
| **Figma / Stitch** | **Native REST API** | Browser Automation | Direct API access downloads vector nodes and tokens deterministically. [FACT] |
| **Legacy Desktop GUI** | **Windows UIA (pywinauto)** | Vision (OmniParser) | UIA targets element names and control patterns reliably without pixel drift. [FACT] |
