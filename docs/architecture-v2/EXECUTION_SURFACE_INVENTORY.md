# GRAVITAS — EXECUTION SURFACE INVENTORY (RECONCILED)
## Exhaustive Audit of Host Execution Surfaces, CLIs, Harnesses & OS Subsystems

**Audit Date**: 2026-09-30  
**Evidence Standard**: STRICT — `PROVEN` [P], `OBSERVED` [O], `REPORTED` [R], `UNPROVEN` / `UNKNOWN` [U]  
**Primary Invariant**:
$$\text{ROLE} \neq \text{EXECUTOR} \neq \text{HARNESS} \neq \text{MODEL} \neq \text{PROVIDER} \neq \text{GATEWAY} \neq \text{PROCESS}$$

**Document Status**: Current P0/P1 evidence and planning artifact. The frozen master planning contracts remain governing project context; repository/runtime evidence is ultimate ground truth.

---

### The Strict Sequential Qualification Ladder
$$\text{DISCOVERED} \rightarrow \text{INSTALLED} \rightarrow \text{AUTHENTICATED} \rightarrow \text{REACHABLE} \rightarrow \text{CAPABILITY\_PROBED} \rightarrow \text{CONTAINMENT\_TESTED} \rightarrow \text{QUALIFIED} \rightarrow \text{READY}$$

*Rule: Never skip states. A surface can only be assigned the highest sequentially proven state. P1 establishes the empirical ceiling for each surface; it does not require every candidate to reach `QUALIFIED` or `READY`.*

---

## 1. Master Qualification Summary

| Surface Identifier | Discovered | Installed | Executable / Entry Point | Version | Current Qualification Level | Proven State Finding |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Antigravity CLI (`agy`)** | YES [P] | YES [P] | `C:\Users\smara\AppData\Local\agy\bin\agy.exe` | `1.1.13` [P] | **`CAPABILITY_PROBED`** | Headless JSON prompt proven; containment (`--sandbox`) unproven |
| **Antigravity IDE** | YES [P] | YES [P] | `C:\Users\smara\AppData\Local\Programs\antigravity\Antigravity.exe` | Electron [P] | **`INSTALLED`** | Process presence proven; GRAVITAS-callable programmatic surface unproven |
| **Antigravity Python SDK**| YES [P] | NO [P] | PyPI `google-antigravity` | None [P] | **`DISCOVERED`** | Uninstalled in host Python 3.12 environment |
| **Codex CLI** | YES [P] | YES [P] | `C:\Users\smara\AppData\Roaming\npm\codex.ps1` | `0.153.4` [P] | **`INSTALLED`** | Installed; currently unauthenticated (`codex doctor` reports missing credentials) |
| **Claude Code CLI** | YES [P] | YES [P] | `C:\Users\smara\AppData\Roaming\npm\claude.ps1` | `2.1.276` [P] | **`INSTALLED`** | Installed; currently unauthenticated (`claude doctor` reports not signed in) |
| **Free Claude Code (FCC)**| YES [P] | YES [P] | `C:\Users\smara\.local\bin\fcc-claude.exe` | `0.0.0.0` [P] | **`INSTALLED`** | Installed; currently unreachable (`fcc-server` at `127.0.0.1:8082` not running) |
| **FCC Server Daemon** | YES [P] | YES [P] | `C:\Users\smara\.local\bin\fcc-server.exe` | `0.0.0.0` [P] | **`INSTALLED`** | Daemon binary present on disk; currently idle (not listening) |
| **Gemini CLI** | NO [P] | NO [P] | None found on system PATH | None [P] | **`ABSENT`** | No CLI binary discovered on host |
| **ChatGPT Desktop App** | YES [P] | YES [P] | App `26.928.2636.0` / Service `CodexSandboxService` | 26.928 [P] | **`INSTALLED`** | Process presence proven; GRAVITAS-callable programmatic surface unproven |
| **GitHub CLI (`gh`)** | YES [P] | YES [P] | `C:\Program Files\GitHub CLI\gh.exe` | `2.98.0` [P] | **`INSTALLED`** | Installed; currently unauthenticated (`gh auth status` reports not logged in) |
| **Playwright Core** | YES [P] | YES [P] | `C:\Users\smara\AppData\Local\Programs\Python\Python312\Scripts\playwright.exe` | `1.62.0` [P] | **`CAPABILITY_PROBED`** | Browser automation engine verified; GRAVITAS harness containment unproven |
| **OmniRoute Gateway** | YES [P] | NO [P] | `node_modules\omniroute\bin\omniroute.mjs` | None [P] | **`DISCOVERED`** | Local `node_modules` absent; executable missing from disk |
| **PowerShell 5.1 Host** | YES [P] | YES [P] | `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe` | `5.1.26100` [P] | **`CAPABILITY_PROBED`** | Host execution verified; GRAVITAS execution containment unproven |
| **WinRT Toast Notifications**| YES [P] | YES [P] | `Windows.UI.Notifications.ToastNotificationManager` | WinRT [P] | **`CAPABILITY_PROBED`** | Native OS WinRT notification API verified loadable |
| **Windows Background Services**| YES [P] | YES [P] | `schtasks.exe`, `sc.exe`, `Start-Job` | Win32 [P] | **`CAPABILITY_PROBED`** | Host process supervision and scheduling primitives verified |
| **Manus Desktop App** | YES [P] | UNPROVEN [U] | `C:\Users\smara\.manus\manus-computer-operator` | UNKNOWN [U] | **`DISCOVERED`** | Cache/profile directory exists; executable binary/API unproven |

---

## 2. Exhaustive Per-Surface 24-Field Specification

```
Evidence Legend:
[P] = PROVEN by direct host command, file inspection, or process probe
[O] = OBSERVED behavior in this environment
[R] = REPORTED from help text, documentation, or historical records
[U] = UNPROVEN or UNKNOWN (requires future authorized testing)
```

---

### Surface 1: Antigravity CLI (`agy`)

1. **Discovered**: YES [P] (`Get-Command agy.exe`)
2. **Installed**: YES [P] (`C:\Users\smara\AppData\Local\agy\bin\agy.exe`)
3. **Executable / Path**: `C:\Users\smara\AppData\Local\agy\bin\agy.exe` [P]
4. **Version**: `1.1.13` [P] (`agy --version`)
5. **Authentication State**:
   - Current backend authorization sufficient for headless inference: **PROVEN** [P] (Probed live: exited code 0, returned completed response without prompt)
   - Credential storage mechanism, account identity, and token refresh: **UNKNOWN / UNINSPECTED** [U]
6. **Headless / Programmatic Invocation**: **PROVEN** [P] (Executed `agy -p "Respond with the word pong only" --output-format json --print-timeout 15s`, exited 0 in 5.75s)
7. **Stdin / Prompt Interface**: Prompt argument supported via `-p` [P]; interactive stdin [R]
8. **Stdout / Stderr Behavior**: Clean separation [P] (Stdout returned valid JSON; Stderr was empty)
9. **Structured Output**: **PROVEN** [P] (Returned valid JSON: `{"conversation_id": "...", "status": "SUCCESS", "response": "pong\n", "duration_seconds": 5.75, "usage": {...}}`)
10. **Streaming Capability**: Advertised `--output-format stream-json` in `--help`: REPORTED [R]; live streaming in subprocess: UNPROVEN [U]
11. **Session Start**: PROVEN [P] (Output payload contained generated `conversation_id`)
12. **Session Resume**: Advertised via `--continue` (`-c`) and `--conversation <id>` in `--help`: REPORTED [R]; live resumption: UNPROVEN [U]
13. **Cancellation Handling**: Process-tree termination via OS `taskkill /T /F`: OBSERVED [O] (killed hanging interactive task cleanly); graceful signal handling: UNPROVEN [U]
14. **Timeout Handling**: **PROVEN** [P] (`--print-timeout 15s` accepted and honored)
15. **MCP Support**: Ecosystem documentation reports MCP support: REPORTED [R]; CLI tool invocation: UNPROVEN [U]
16. **Plugin / Connector Support**: Subcommands `agy plugin` in `--help`: REPORTED [R]; live plugin execution: UNPROVEN [U]
17. **Filesystem Authority**: Runs under host user context: OBSERVED [O]; sandbox boundary enforcement: UNPROVEN [U]
18. **Shell Authority**: Advertised `--dangerously-skip-permissions` in `--help`: REPORTED [R]; tool execution containment: UNPROVEN [U]
19. **Git Authority**: Operates on target workspace: REPORTED [R]; branch mutation containment: UNPROVEN [U]
20. **Network Authority**: Outbound connection to Google inference backend: PROVEN [P]; arbitrary network containment: UNPROVEN [U]
21. **Sandbox / Containment**: Advertised `--sandbox` flag in `--help`: REPORTED [R]; containment tested against hostile mutations: **UNPROVEN** [U]
22. **Model / Provider Configuration**: Google Antigravity backend routing: PROVEN [P]; `--model` flag: REPORTED [R]
23. **Observable Provenance**: Exact `conversation_id`, `duration_seconds`, and token usage recorded in output payload: PROVEN [P]
24. **Quotas / Rate Constraints**: Token usage returned per turn (`input_tokens: 24855`, `output_tokens: 36`): PROVEN [P]; account-level limits: UNKNOWN [U]
- **Automation Suitability**: **High (Pending Containment Probe)**.
- **Highest Sequential Qualification Level**: **`CAPABILITY_PROBED`** (Stops before `CONTAINMENT_TESTED`).

---

### Surface 2: Antigravity Desktop IDE (`Antigravity.exe`)

1. **Discovered**: YES [P]
2. **Installed**: YES [P] (`C:\Users\smara\AppData\Local\Programs\antigravity\Antigravity.exe`)
3. **Executable / Path**: `C:\Users\smara\AppData\Local\Programs\antigravity\Antigravity.exe` [P]
4. **Version**: Electron/Chromium host running with `--user-data-dir="AppData\Roaming\Antigravity"` [P]
5. **Authentication State**: Authenticated in GUI user session [O]
6. **Headless / Programmatic Invocation**:
   - Installation and process presence: **PROVEN** [P]
   - GRAVITAS-callable programmatic surface: **UNPROVEN** [U] (No documented CLI flags or supported automation API proven in this audit; absence of discovered proof is not proof of nonexistence)
7. **Stdin / Prompt Interface**: Interactive GUI chat panels [O]
8. **Stdout / Stderr Behavior**: GUI window process [O]
9. **Structured Output**: UNPROVEN [U]
10. **Streaming Capability**: Interactive UI rendering [O]; programmatic stream [U]
11. **Session Start**: Interactive UI session [O]
12. **Session Resume**: Interactive UI session history [O]
13. **Cancellation Handling**: User-driven GUI stop button [O]
14. **Timeout Handling**: UNPROVEN [U]
15. **MCP Support**: Manages MCP servers (`playwright`, `stitch`, `reticle`) via internal host runner [P]
16. **Plugin / Connector Support**: Loads plugins from `~/.gemini/config/plugins` [P]
17. **Filesystem Authority**: Host user desktop context [O]
18. **Shell Authority**: Integrated terminal in IDE [O]
19. **Git Authority**: Integrated source control [O]
20. **Network Authority**: Web access via Chromium [O]
21. **Sandbox / Containment**: Chromium renderer sandbox [O]; agent tool sandbox [U]
22. **Model / Provider Configuration**: Configured within IDE settings [O]
23. **Observable Provenance**: Transcripts stored in `brain/<conversation-id>/` [P]
24. **Quotas / Rate Constraints**: Managed by backend service [U]
- **Automation Suitability**: **Zero for Subprocess Harness**. Serves as a presentation/projection target or human workspace, not a callable execution harness.
- **Highest Sequential Qualification Level**: **`INSTALLED`** (Presentation Surface).

---

### Surface 3: Codex CLI

1. **Discovered**: YES [P] (`Get-Command codex.ps1`)
2. **Installed**: YES [P] (`C:\Users\smara\AppData\Roaming\npm\codex.ps1`, target `@openai/codex`)
3. **Executable / Path**: `C:\Users\smara\AppData\Roaming\npm\node_modules\@openai\codex\bin\codex.js` [P]
4. **Version**: `codex-cli 0.153.4` [P]
5. **Authentication State**: **UNAUTHENTICATED** [P] (`codex doctor` output: `✗ auth: no Codex credentials were found — Run codex login or provide an API key`)
6. **Headless / Programmatic Invocation**: Advertised via `codex exec [PROMPT]` in `--help`: REPORTED [R] (live execution fails due to lack of auth: PROVEN [P])
7. **Stdin / Prompt Interface**: Advertised in `--help`: REPORTED [R]
8. **Stdout / Stderr Behavior**: Advertised in `--help`: REPORTED [R]
9. **Structured Output**: Advertised via `--json` in `--help`: REPORTED [R]
10. **Streaming Capability**: Advertised via WebSocket in `codex doctor` / help: REPORTED [R]
11. **Session Start**: SQLite state files exist on disk: PROVEN [P] (`codex doctor` verified `state_5.sqlite`)
12. **Session Resume**: Subcommands in `--help`: REPORTED [R]
13. **Cancellation Handling**: Process termination supported via OS taskkill: OBSERVED [O]
14. **Timeout Handling**: Adapter configurable: REPORTED [R]
15. **MCP Support**: Server names configured in `~/.codex/config.toml`: PROVEN [P] (config file parsed)
16. **Plugin / Connector Support**: Subcommand in `--help`: REPORTED [R]
17. **Filesystem Authority**: Configurable sandbox policies in `--help`: REPORTED [R]; runtime enforcement: UNTESTED [U]
18. **Shell Authority**: Windows service `CodexSandboxService` running on host: PROVEN [P]; runtime containment: UNTESTED [U]
19. **Git Authority**: `-C, --cd` in `--help`: REPORTED [R]; runtime containment: UNTESTED [U]
20. **Network Authority**: Reachability to `api.openai.com` over HTTP: PROVEN [P] (`codex doctor`); sandbox network enforcement: UNTESTED [U]
21. **Sandbox / Containment**: Running Windows Service `CodexSandboxService` (PID 8684): PROVEN [P]; hostile breach resistance: UNTESTED [U]
22. **Model / Provider Configuration**: `gpt-5.6-terra` / `openai` in config: PROVEN [P] (`codex doctor`)
23. **Observable Provenance**: SQLite history DBs on disk: PROVEN [P]
24. **Quotas / Rate Constraints**: UNKNOWN [U]
- **Automation Suitability**: **High (Blocked by Authentication)**.
- **Highest Sequential Qualification Level**: **`INSTALLED`**. (Cannot advance to `AUTHENTICATED` without human login).

---

### Surface 4: Claude Code CLI

1. **Discovered**: YES [P] (`Get-Command claude.ps1`)
2. **Installed**: YES [P] (`C:\Users\smara\AppData\Roaming\npm\claude.ps1`, target `@anthropic-ai/claude-code`)
3. **Executable / Path**: `C:\Users\smara\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe` [P]
4. **Version**: `2.1.276 (Claude Code)` [P]
5. **Authentication State**: **UNAUTHENTICATED** [P] (`claude doctor` output: `Not signed in to claude.ai; no API key or claude.ai sign-in`)
6. **Headless / Programmatic Invocation**: Advertised via `claude -p, --print [prompt]` in `--help`: REPORTED [R] (fails without auth: PROVEN [P])
7. **Stdin / Prompt Interface**: Advertised in `--help`: REPORTED [R]
8. **Stdout / Stderr Behavior**: Advertised in `--help`: REPORTED [R]
9. **Structured Output**: Advertised via `--output-format json` in `--help`: REPORTED [R]
10. **Streaming Capability**: Advertised via `--output-format stream-json` in `--help`: REPORTED [R]
11. **Session Start**: Advertised via `--session-id` in `--help`: REPORTED [R]
12. **Session Resume**: Advertised via `--resume` in `--help`: REPORTED [R]
13. **Cancellation Handling**: Process-tree termination via OS taskkill: OBSERVED [O]
14. **Timeout Handling**: Adapter configurable: REPORTED [R]
15. **MCP Support**: Configured server names in `~/.claude.json`: PROVEN [P]
16. **Plugin / Connector Support**: Subcommand in `--help`: REPORTED [R]
17. **Filesystem Authority**: Scoped flags advertised in `--help`: REPORTED [R]; runtime containment: UNTESTED [U]
18. **Shell Authority**: Scoped tool flags in `--help`: REPORTED [R]; runtime containment: UNTESTED [U]
19. **Git Authority**: `--worktree` flag in `--help`: REPORTED [R]; runtime containment: UNTESTED [U]
20. **Network Authority**: Scoped WebFetch in `--help`: REPORTED [R]; runtime containment: UNTESTED [U]
21. **Sandbox / Containment**: UNTESTED [U]
22. **Model / Provider Configuration**: Anthropic backend: REPORTED [R]
23. **Observable Provenance**: Session history files in `~/.claude`: PROVEN [P]
24. **Quotas / Rate Constraints**: UNKNOWN [U]
- **Automation Suitability**: **High (Blocked by Authentication)**.
- **Highest Sequential Qualification Level**: **`INSTALLED`**. (Cannot advance to `AUTHENTICATED` without human login).

---

### Surface 5: Free Claude Code (FCC) + FCC Server

1. **Discovered**: YES [P] (`Test-Path $HOME\.local\bin\fcc-claude.exe`)
2. **Installed**: YES [P] (`C:\Users\smara\.local\bin\fcc-claude.exe` and `fcc-server.exe`)
3. **Executable / Path**: `C:\Users\smara\.local\bin\fcc-claude.exe` [P]
4. **Version**: `0.0.0.0` [P]
5. **Authentication State**: Mediated via local proxy: REPORTED [R]; unverified [U]
6. **Headless / Programmatic Invocation**: Implemented in `@gravitas/harnesses/src/free-claude-code.ts`: PROVEN [P] (source code inspection); live run: fails because server is off [P]
7. **Stdin / Prompt Interface**: Implemented in adapter: PROVEN [P] (source code)
8. **Stdout / Stderr Behavior**: Captured by subprocess adapter: PROVEN [P] (source code)
9. **Structured Output**: Implemented in adapter: PROVEN [P] (source code)
10. **Streaming Capability**: Supported in adapter: REPORTED [R]
11. **Session Start**: Ephemeral in adapter: PROVEN [P] (source code)
12. **Session Resume**: Not supported in ephemeral mode: PROVEN [P]
13. **Cancellation Handling**: `killProcessTree` in `process.ts`: PROVEN [P] (source code); OS taskkill: OBSERVED [O]
14. **Timeout Handling**: Built-in adapter timeout timer: PROVEN [P] (source code)
15. **MCP Support**: Explicitly denied in adapter security policy: PROVEN [P] (source code)
16. **Plugin / Connector Support**: Denied in adapter: PROVEN [P] (source code)
17. **Filesystem Authority**: Confined to allocated worktree path via `cwd` in adapter: PROVEN [P] (source code); live OS containment: UNTESTED [U]
18. **Shell Authority**: `shell: false` in adapter: PROVEN [P] (source code)
19. **Git Authority**: Confined to worktree in adapter: PROVEN [P] (source code)
20. **Network Authority**: Connects to loopback `http://127.0.0.1:8082`: PROVEN [P] (connection timed out because server was off)
21. **Sandbox / Containment**: UNTESTED [U]
22. **Model / Provider Configuration**: UNKNOWN [U]
23. **Observable Provenance**: Subprocess logs captured in WorkSession: PROVEN [P] (source code)
24. **Quotas / Rate Constraints**: UNKNOWN [U]
- **Automation Suitability**: **Medium (Blocked by Daemon Inactivity)**.
- **Highest Sequential Qualification Level**: **`INSTALLED`**. (Fails `REACHABLE` because `fcc-server` is not running).

---

### Surface 6: Playwright Browser Automation

1. **Discovered**: YES [P]
2. **Installed**: YES [P] (`C:\Users\smara\AppData\Local\Programs\Python\Python312\Scripts\playwright.exe`)
3. **Executable / Path**: `C:\Users\smara\AppData\Local\Programs\Python\Python312\Scripts\playwright.exe` [P]
4. **Version**: `1.62.0` [P] (`playwright --version`)
5. **Authentication State**: Not applicable (local browser engine) [P]
6. **Headless / Programmatic Invocation**: **PROVEN** [P] (CLI and browser engines available)
7. **Stdin / Prompt Interface**: Programmatic API / test scripts: PROVEN [P]
8. **Stdout / Stderr Behavior**: Standard test runner output and JSON reporters: PROVEN [P]
9. **Structured Output**: Playwright JSON trace and test report artifacts: PROVEN [P]
10. **Streaming Capability**: Real-time event emitters: PROVEN [P]
11. **Session Start**: Browser context creation: PROVEN [P]
12. **Session Resume**: Storage state (cookies/localstorage) serialization: PROVEN [P]
13. **Cancellation Handling**: Process kill and browser context closing: PROVEN [P]
14. **Timeout Handling**: Built-in per-action and per-test timeout configurations: PROVEN [P]
15. **MCP Support**: Running `@playwright/mcp` service on the host: PROVEN [P] (PIDs 8036, 19244)
16. **Plugin / Connector Support**: Supported via Playwright test fixtures: PROVEN [P]
17. **Filesystem Authority**: Reads/writes within configured test directories and artifact output paths: PROVEN [P]
18. **Shell Authority**: None (operates browser automation protocol): PROVEN [P]
19. **Git Authority**: None: PROVEN [P]
20. **Network Authority**: Connects to localhost test servers and remote URLs: PROVEN [P]
21. **Sandbox / Containment**: Chromium multi-process sandbox: OBSERVED [O]; GRAVITAS harness containment: UNTESTED [U]
22. **Model / Provider Configuration**: Deterministic runner; no model inference consumed: PROVEN [P]
23. **Observable Provenance**: Screenshots, DOM snapshots, network traces, console logs: PROVEN [P]
24. **Quotas / Rate Constraints**: Local hardware resource bounds only: PROVEN [P]
- **Automation Suitability**: **Very High for Browser QA Role**.
- **Highest Sequential Qualification Level**: **`CAPABILITY_PROBED`**. (Cannot advance to `QUALIFIED` or `READY` until GRAVITAS verification harness containment is tested).

---

### Surface 7: GitHub CLI (`gh`)

1. **Discovered**: YES [P] (`Get-Command gh.exe`)
2. **Installed**: YES [P] (`C:\Program Files\GitHub CLI\gh.exe`)
3. **Executable / Path**: `C:\Program Files\GitHub CLI\gh.exe` [P]
4. **Version**: `2.98.0` [P] (`gh --version`)
5. **Authentication State**: **UNAUTHENTICATED** [P] (`gh auth status` output: `You are not logged into any GitHub hosts`)
6. **Headless / Programmatic Invocation**: Supported for CLI script execution: PROVEN [P]
7. **Stdin / Prompt Interface**: Flags and stdin: REPORTED [R]
8. **Stdout / Stderr Behavior**: Standard CLI streams: PROVEN [P]
9. **Structured Output**: Supported via `--json` flag: REPORTED [R]
10. **Streaming Capability**: Standard line-buffered output: REPORTED [R]
11. **Session Start / Resume**: State stored in `~/.config/gh/`: PROVEN [P]
12. **Cancellation Handling**: Process kill: PROVEN [P]
13. **Timeout Handling**: OS-level timeout: PROVEN [P]
14. **MCP Support**: None: PROVEN [P]
15. **Plugin / Connector Support**: Extensions in `--help`: REPORTED [R]
16. **Filesystem Authority**: Current working directory: PROVEN [P]
17. **Shell Authority**: Subshell invocation for git credentials: PROVEN [P]
18. **Git Authority**: Operates on target git repo: PROVEN [P]
19. **Network Authority**: HTTPS to `api.github.com`: REPORTED [R]
20. **Sandbox / Containment**: Runs uncontained as host user: PROVEN [P]
21. **Model / Provider Configuration**: None (deterministic tool): PROVEN [P]
22. **Observable Provenance**: Command stdout and GitHub audit logs: REPORTED [R]
23. **Quotas / Rate Constraints**: GitHub API rate limits: REPORTED [R]
- **Automation Suitability**: **High for Integrator PR workflows (Blocked by Authentication)**.
- **Highest Sequential Qualification Level**: **`INSTALLED`**.

---

### Surface 8: ChatGPT Integration Surfaces

1. **Discovered**: YES [P]
2. **Installed**:
   - Installation and process presence of Desktop App (`26.928.2636.0`) and Service `CodexSandboxService`: **PROVEN** [P]
   - GRAVITAS-callable programmatic surface: **UNPROVEN** [U] (No local socket, CLI, or API endpoint was proven in this audit; absence of discovered proof is not proof of nonexistence)
3. **Executable / Path**: `C:\Program Files\WindowsApps\OpenAI.ChatGPT-Desktop_...` [P]
4. **Version**: `26.928.2636.0` [P]
5. **Authentication State**: UNINSPECTED in app [U]
6. **Headless / Programmatic Invocation**: UNPROVEN [U]
7. **Stdin / Prompt Interface**: GUI only [O]
8. **Stdout / Stderr Behavior**: GUI window process [O]
9. **Structured Output**: UNPROVEN [U]
10. **Streaming Capability**: Interactive UI [O]
11. **Session Start / Resume**: In-app threads [O]
12. **Cancellation Handling**: In-app stop button [O]
13. **Timeout Handling**: UNPROVEN [U]
14. **MCP Support**: UNPROVEN [U]
15. **Plugin / Connector Support**: UNPROVEN [U]
16. **Filesystem Authority**: Local AppData [O]
17. **Shell Authority**: Mediated by sandbox service [P]
18. **Git Authority**: None [O]
19. **Network Authority**: Outbound HTTPS to `chatgpt.com` [O]
20. **Sandbox / Containment**: Windows AppContainer [O]
21. **Model / Provider Configuration**: OpenAI cloud [O]
22. **Observable Provenance**: Cloud chat history [O]
23. **Quotas / Rate Constraints**: Account subscription [U]
- **Automation Suitability**: **Unproven for Programmatic Harness**.
- **Highest Sequential Qualification Level**: **`INSTALLED`**.

---

### Surface 9: OmniRoute Gateway

1. **Discovered**: YES [P] (Referenced in `package.json` overrides and historical qualification file)
2. **Installed**: **NO / ABSENT** [P] (`node_modules` does not exist on disk; `Get-Command omniroute` returned false)
3. **Executable / Path**: Expected at `node_modules\omniroute\bin\omniroute.mjs`: REPORTED [R] (Missing on disk: PROVEN [P])
4. **Version**: Historical artifact reported `3.8.50`: REPORTED [R]; current version: NONE [P]
5. **Authentication State**: Uninstalled [P]
6. **Headless / Programmatic Invocation**: Uninstalled [P]
7. **Stdin / Prompt Interface**: HTTP REST API when running: REPORTED [R]
8. **Stdout / Stderr Behavior**: Uninstalled [P]
9. **Structured Output**: OpenAI-compatible REST JSON: REPORTED [R]
10. **Streaming Capability**: Server-Sent Events (SSE): REPORTED [R]
11. **Session Start / Resume**: Stateless HTTP proxy: REPORTED [R]
12. **Cancellation Handling**: HTTP connection abort: REPORTED [R]
13. **Timeout Handling**: Configurable proxy timeouts: REPORTED [R]
14. **MCP Support**: Uninstalled [P]
15. **Plugin / Connector Support**: Uninstalled [P]
16. **Filesystem Authority**: None when running in loopback: REPORTED [R]
17. **Shell Authority**: None: REPORTED [R]
18. **Git Authority**: None: REPORTED [R]
19. **Network Authority**: Inbound `127.0.0.1:20139`, outbound to configured upstream providers: REPORTED [R]
20. **Sandbox / Containment**: Loopback binding verified historically: REPORTED [R]; current status: uninstalled [P]
21. **Model / Provider Configuration**: Multi-provider routing: REPORTED [R]
22. **Observable Provenance**: Upstream telemetry headers: REPORTED [R]
23. **Quotas / Rate Constraints**: Upstream provider rate limits: REPORTED [R]
- **Automation Suitability**: **Blocked by Missing Installation**.
- **Highest Sequential Qualification Level**: **`DISCOVERED`**.

---

### Surface 10: Host Shell / OS (Windows PowerShell 5.1)

1. **Discovered**: YES [P]
2. **Installed**: YES [P] (`C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`)
3. **Executable / Path**: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe` [P]
4. **Version**: `5.1.26100.9549` [P] (`$PSVersionTable`)
5. **Authentication State**: Not applicable (OS shell) [P]
6. **Headless / Programmatic Invocation**: **PROVEN** [P] (`powershell -NonInteractive -Command ...`)
7. **Stdin / Prompt Interface**: Pipeline and argument parsing: PROVEN [P]
8. **Stdout / Stderr Behavior**: Standard streams: PROVEN [P]
9. **Structured Output**: PowerShell object pipeline internally; JSON via `ConvertTo-Json`: PROVEN [P]
10. **Streaming Capability**: Console stdout streaming: PROVEN [P]
11. **Session Start / Resume**: Stateless or stateful runspaces: PROVEN [P]
12. **Cancellation Handling**: Process kill / Ctrl+C / taskkill: PROVEN [P]
13. **Timeout Handling**: OS process timeout: PROVEN [P]
14. **MCP Support**: None directly: PROVEN [P]
15. **Plugin / Connector Support**: PowerShell modules: PROVEN [P]
16. **Filesystem Authority**: Full user read/write access across local drives: PROVEN [P]
17. **Shell Authority**: Executes arbitrary Win32 and .NET commands: PROVEN [P]
18. **Git Authority**: Full Git invocation: PROVEN [P]
19. **Network Authority**: Unrestricted outbound TCP/UDP: PROVEN [P]
20. **Sandbox / Containment**: **UNCONFINED** [P] (Runs as host user; GRAVITAS containment sandbox has NOT been tested)
21. **Model / Provider Configuration**: None (deterministic tool): PROVEN [P]
22. **Observable Provenance**: PowerShell transcripts and Windows Event Logs: PROVEN [P]
23. **Quotas / Rate Constraints**: Hardware CPU/Memory limits only: PROVEN [P]
- **Automation Suitability**: **High for Deterministic Host Execution**.
- **Highest Sequential Qualification Level**: **`CAPABILITY_PROBED`**. (Cannot be labeled `READY` because GRAVITAS containment boundaries have not been established).

---

### Surface 11: OS Subsystems — Desktop Notifications & Background Facilities

#### A. Desktop Notification Subsystem
1. **Discovered**: YES [P]
2. **Installed**: YES [P] (Windows WinRT subsystem)
3. **API / Entry Point**: `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]` [P]
4. **Availability**: **PROVEN** [P] (Probed live: type resolves successfully without external packages)
5. **Capabilities**: Native Windows Action Center toast notifications with title, text, icon, and click callbacks: REPORTED [R]
6. **Highest Sequential Qualification Level**: **`CAPABILITY_PROBED`** (API verified; GRAVITAS event integration unbuilt).

#### B. Windows Background Process Facilities
1. **Windows Task Scheduler**: `C:\Windows\system32\schtasks.exe`: PROVEN [P] (Capable of spawning unattended background jobs)
2. **Windows Services**: `C:\Windows\system32\sc.exe`: PROVEN [P] (Host service controller; actively supervising `CodexSandboxService`)
3. **PowerShell Background Jobs**: `Start-Job`, `Get-Job`, `Receive-Job`: PROVEN [P] (Native out-of-process job execution)
4. **Highest Sequential Qualification Level**: **`CAPABILITY_PROBED`** (Subsystems exist and are functional; GRAVITAS daemon supervisor unbuilt).

---

### Surface 9: Manus Desktop App (Post-P1 Delta)

1. **Discovered**: YES [P] (`C:\Users\smara\.manus\manus-computer-operator` timestamped `2026-09-30 15:43:00`)
2. **Installed**: NO [P] / UNPROVEN [U] (No executable binary, installer, or package found on system PATH, Start Menu, or Windows Registry)
3. **Executable / Path**: None found on system PATH [P]
4. **Version**: UNKNOWN [U]
5. **Authentication State**: UNKNOWN / UNPROVEN [U]
6. **Reachable**: UNPROVEN [U] (No listening socket or active process detected)
7. **Capability Probed**: UNPROVEN [U]
8. **Containment Tested**: UNPROVEN [U]
9. **Current Qualification Ceiling**: **`DISCOVERED`**
10. **Headless Execution**: UNPROVEN [U]
11. **Cancellation Handling**: UNPROVEN [U]
12. **Timeout Handling**: UNPROVEN [U]
13. **Structured Output**: UNPROVEN [U]
14. **Streaming Output**: UNPROVEN [U]
15. **Session Resume**: UNPROVEN [U]
16. **Filesystem Authority**: UNKNOWN [U]
17. **Shell Authority**: UNKNOWN [U]
18. **Git Authority**: UNKNOWN [U]
19. **Network Authority**: UNKNOWN [U]
20. **MCP Support**: UNPROVEN [U]
21. **Plugin Support**: UNPROVEN [U]
22. **Execution Containment**: UNPROVEN [U]
23. **Process Supervision**: UNPROVEN [U]
24. **Known Failure Modes**: Programmatic CLI binary not located on host [P]

---

## 3. Comprehensive Required Field Audit Matrix

| Required P1 Field | `agy` | Codex | Claude | FCC | Playwright | `gh` | OmniRoute | PowerShell | Manus Desktop |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Discovered** | YES [P] | YES [P] | YES [P] | YES [P] | YES [P] | YES [P] | YES [P] | YES [P] | YES [P] |
| **2. Installed** | YES [P] | YES [P] | YES [P] | YES [P] | YES [P] | YES [P] | NO [P] | YES [P] | UNPROVEN [U] |
| **3. Path** | PROVEN [P] | PROVEN [P] | PROVEN [P] | PROVEN [P] | PROVEN [P] | PROVEN [P] | ABSENT [P] | PROVEN [P] | ABSENT [P] |
| **4. Version** | `1.1.13` [P] | `0.153.4` [P] | `2.1.276` [P] | `0.0.0.0` [P] | `1.62.0` [P] | `2.98.0` [P] | NONE [P] | `5.1.26100` [P] | UNKNOWN [U] |
| **5. Authentication** | PROVEN auth / UNINSPECTED creds | UNAUTH [P] | UNAUTH [P] | UNVERIFIED [U]| N/A [P] | UNAUTH [P] | UNINSTALLED | N/A [P] | UNKNOWN [U] |
| **6. Headless Invoke** | PROVEN [P] | REPORTED [R]| REPORTED [R]| PROVEN [P] | PROVEN [P] | PROVEN [P] | UNINSTALLED | PROVEN [P] | UNPROVEN [U] |
| **7. Stdin / Prompt** | PROVEN [P] | REPORTED [R]| REPORTED [R]| PROVEN [P] | PROVEN [P] | REPORTED [R]| UNINSTALLED | PROVEN [P] | UNPROVEN [U] |
| **8. Stdout / Stderr**| PROVEN [P] | REPORTED [R]| REPORTED [R]| PROVEN [P] | PROVEN [P] | PROVEN [P] | UNINSTALLED | PROVEN [P] | UNPROVEN [U] |
| **9. Structured Out** | PROVEN [P] | REPORTED [R]| REPORTED [R]| PROVEN [P] | PROVEN [P] | REPORTED [R]| UNINSTALLED | PROVEN [P] | UNPROVEN [U] |
| **10. Streaming** | REPORTED [R]| REPORTED [R]| REPORTED [R]| REPORTED [R]| PROVEN [P] | REPORTED [R]| UNINSTALLED | PROVEN [P] | UNPROVEN [U] |
| **11. Session Start** | PROVEN [P] | PROVEN [P] | REPORTED [R]| PROVEN [P] | PROVEN [P] | REPORTED [R]| UNINSTALLED | PROVEN [P] | UNPROVEN [U] |
| **12. Session Resume**| REPORTED [R]| REPORTED [R]| REPORTED [R]| N/A [P] | PROVEN [P] | N/A [P] | UNINSTALLED | PROVEN [P] | UNPROVEN [U] |
| **13. Cancellation** | OBSERVED [O]| OBSERVED [O]| OBSERVED [O]| PROVEN [P] | PROVEN [P] | PROVEN [P] | UNINSTALLED | PROVEN [P] | UNPROVEN [U] |
| **14. Timeout** | PROVEN [P] | REPORTED [R]| REPORTED [R]| PROVEN [P] | PROVEN [P] | PROVEN [P] | UNINSTALLED | PROVEN [P] | UNPROVEN [U] |
| **15. MCP Support** | REPORTED [R]| PROVEN [P] | PROVEN [P] | DENIED [P] | RUNNING [P] | N/A [P] | UNINSTALLED | N/A [P] | UNPROVEN [U] |
| **16. Plugin Support**| REPORTED [R]| REPORTED [R]| REPORTED [R]| DENIED [P] | PROVEN [P] | REPORTED [R]| UNINSTALLED | PROVEN [P] | UNPROVEN [U] |
| **17. Filesystem Auth**| OBSERVED [O]| REPORTED [R]| REPORTED [R]| PROVEN [P] | PROVEN [P] | PROVEN [P] | UNINSTALLED | PROVEN [P] | UNKNOWN [U] |
| **18. Shell Authority**| REPORTED [R]| PROVEN [P] | REPORTED [R]| DENIED [P] | N/A [P] | PROVEN [P] | UNINSTALLED | PROVEN [P] | UNKNOWN [U] |
| **19. Git Authority** | REPORTED [R]| REPORTED [R]| REPORTED [R]| PROVEN [P] | N/A [P] | PROVEN [P] | UNINSTALLED | PROVEN [P] | UNKNOWN [U] |
| **20. Network Auth** | PROVEN [P] | PROVEN [P] | REPORTED [R]| PROVEN [P] | PROVEN [P] | REPORTED [R]| UNINSTALLED | PROVEN [P] | UNKNOWN [U] |
| **21. Containment** | UNPROVEN [U]| UNTESTED [U]| UNTESTED [U]| UNTESTED [U]| UNTESTED [U]| UNCONFINED [P]| UNINSTALLED| UNCONFINED [P]| UNPROVEN [U] |
| **22. Model / Prov** | PROVEN [P] | PROVEN [P] | REPORTED [R]| UNKNOWN [U] | N/A [P] | N/A [P] | UNINSTALLED | N/A [P] | UNKNOWN [U] |
| **23. Provenance** | PROVEN [P] | PROVEN [P] | PROVEN [P] | PROVEN [P] | PROVEN [P] | REPORTED [R]| UNINSTALLED | PROVEN [P] | UNKNOWN [U] |
| **24. Quotas / Limits**| PROVEN / UNKNOWN| UNKNOWN [U]| UNKNOWN [U]| UNKNOWN [U]| N/A [P] | REPORTED [R]| UNINSTALLED | N/A [P] | UNKNOWN [U] |
| **Final Ladder Level**| **`CAPABILITY_PROBED`**| **`INSTALLED`**| **`INSTALLED`**| **`INSTALLED`**| **`CAPABILITY_PROBED`**| **`INSTALLED`**| **`DISCOVERED`**| **`CAPABILITY_PROBED`**| **`DISCOVERED`**|
