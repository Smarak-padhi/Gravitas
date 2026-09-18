# Command Line Interface (CLI) Catalog (September 2026)

This catalog details developer CLI tools available for direct execution or wrapping within the Multi-Agent Computer Operating System.

---

## 1. Core Developer Tools Catalog

| CLI Tool | Canonical Binary | Headless Flag | Output Parsing | Sandboxing Method | Windows Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Git** | git.exe | Default | Stdout / Porcelain | Worktree isolation | Native [FACT] |
| **Playwright CLI** | 
px @playwright/cli| --headless | JSON / Text output | Isolated user data dir | Native [FACT] |
| **GitHub CLI** | gh.exe | --json <fields> | Structured JSON | Scoped OAuth tokens | Native [FACT] |
| **Node / npm / pnpm** | 
ode, pnpm | Default | Standard exit codes | Job Object limits | Native [FACT] |
| **Python / uv** | python, uv | Default | Standard exit codes | Venv isolation | Native [FACT] |
| **Vercel CLI** | ercel.exe | --prod --yes | Stdout URLs / JSON | Token authentication | Native [FACT] |
| **Cloudflare Wrangler**| wrangler.exe | --json | JSON output | API Token scoping | Native [FACT] |
| **Docker CLI** | docker.exe | Default | JSON format | Container isolation | Windows Hyper-V [FACT] |

---

## 2. CLI Wrapping Architecture

### ConPTY vs. Standard Pipe Execution
On Windows, interactive command line utilities often fail or stall when attached to standard redirect pipes because they expect Windows Console Win32 APIs:
- **
ode-pty with ConPTY Backend**: Native Windows pseudo-console API. Accurately renders ANSI color codes, handles interactive TTY queries, and captures terminal escape codes.
- **Recommended Implementation for Command Center**: Use 
ode-pty / ConPTY for interactive terminal mirrors in the UI; use standard buffered subprocess execution with timeouts for deterministic non-interactive background worker tasks.

### Command Execution Sandbox Hierarchy
1. **Level 0 (Unrestricted Local Process)**: Standard developer commands executed in task worktree (git status, pnpm test).
2. **Level 1 (Windows Job Object Bound)**: Enforces hard CPU ceilings, memory caps (e.g. 4GB limit), and automated child-process process-tree termination upon task timeout.
3. **Level 2 (Windows Sandbox / Container)**: Ephemeral virtualized environment for running untrusted third-party scripts or evaluating unknown dependencies.
