# GRAVITAS — CURRENT TOOLCHAIN BASELINE
## Wave P0 Toolchain & Runtime Environment Audit

**Evidence Category**: PROVEN for the commands and process observations recorded below; conclusions about architectural suitability are outside P0.  
**Document Status**: Current P0/P1 evidence and planning artifact. The frozen master planning contracts remain governing project context; repository/runtime evidence is ultimate ground truth.

---

## 1. Primary Runtimes & Package Managers

| Tool | Status | Proven Version / Path | Evidence Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | INSTALLED | `v24.13.0` (`C:\Program Files\nodejs\node.exe`) | `node --version` |
| **npm** | INSTALLED | `11.6.2` (`C:\Program Files\nodejs\npm.cmd`) | `npm --version` |
| **Git** | INSTALLED | `2.54.0.windows.1` (`C:\Program Files\Git\cmd\git.exe`) | `git --version` |
| **Python** | INSTALLED | `Python 3.12.10` (`C:\Users\smara\AppData\Local\Programs\Python\Python312\python.exe`) | `python --version` |
| **py Launcher** | INSTALLED | `Python 3.14.5`, `Python 3.12 (64-bit)`, `CPython 3.14.0` | `py -0` |
| **pnpm** | ABSENT | Not recognized on PATH | `pnpm --version` |
| **yarn** | ABSENT | Not recognized on PATH | `yarn --version` |
| **bun** | ABSENT | Not recognized on PATH | `bun --version` |
| **deno** | ABSENT | Not recognized on PATH | `deno --version` |
| **Rust / cargo** | ABSENT | Not recognized on PATH | `cargo --version` |
| **Go** | ABSENT | Not recognized on PATH | `go version` |

---

## 2. Host Shell & Operating System Environment

- **Operating System**: Microsoft Windows (Windows NT build `10.0.26100.9549`)
- **Shell**: Windows PowerShell `5.1.26100.9549` (Desktop Edition, CLR `4.0.30319.42000`)
- **Configured Git Identity**: Present; personal identity value intentionally omitted from the architecture baseline.
- **Filesystem**: NTFS at `C:\`

---

## 3. Currently Running GRAVITAS-Relevant Services

Probed via `Get-Process`, `Get-CimInstance Win32_Process`, `Get-Service`, and `Get-NetTCPConnection`:

| PID | Process Name | Path / Command | Listening Port | Relevance |
| :--- | :--- | :--- | :--- | :--- |
| **8684** | `codex-windows-sandbox-service.exe` | Windows Service `CodexSandboxService` (DisplayName: "ChatGPT") | None (Local IPC) | Elevated Windows sandbox backend used by Codex CLI |
| **3008, 5820, 11660, 18064, 18244, 18960** | `Antigravity.exe` | `C:\Users\smara\AppData\Local\Programs\antigravity\Antigravity.exe` | `57922`, `57924` | Antigravity IDE (Electron host) |
| **8412** | `language_server.exe` | `C:\Users\smara\AppData\Local\Programs\antigravity\resources\bin\language_server.exe` | `57925`, `57926` | Antigravity internal language server service |
| **12200, 20444** | `node.exe` | `npx @_davideast/stitch-mcp proxy` | None (stdio) | Stitch MCP server process running under npx |
| **8036, 19244** | `node.exe` | `npx @playwright/mcp@latest` | None (stdio) | Playwright MCP server process running under npx |
| **13184, 11196** | `node.exe` | `node ... astro preview --port 4321` | `127.0.0.1:4321` | Algoryxz project preview server |
| **16668** | `msedgewebview2.exe` | `C:\Program Files (x86)\Microsoft\EdgeWebView\Application\...` | `127.0.0.1:9222` | WebView2 runtime (Edge debug port open) |
| **6784** | `postgres.exe` | Local PostgreSQL service | `5432` | Local relational database |
| **5920** | `mysqld.exe` | Local MySQL service | `3306`, `33060` | Local relational database |

**Crucial Finding**: No GRAVITAS `@gravitas/server` or `@gravitas/web` processes are currently running.
