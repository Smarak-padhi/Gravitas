# Coding Agent CLI Capability Matrix (September 2026)

This matrix benchmarks current coding agent harnesses for programmatic wrapping within our local-first multi-agent command center.

---

## 1. Comprehensive Agent Capability Matrix

| Feature / Dimension | Claude Code | OpenAI Codex CLI | Aider | Gemini CLI / ADK | OpenCode / Cline CLI | Goose (Block) | Amp |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Developer** | Anthropic | OpenAI | Paul Gauthier | Google Cloud | Community / Open | Block Open Source | Sourcegraph / Ind |
| **Latest Status (2026)**| Active Tier 1 [FACT] | Active Tier 1 [FACT] | Active Tier 1 [FACT] | Active Tier 1 [FACT] | Active [FACT] | Active [FACT] | Active [FACT] |
| **License** | Proprietary CLI | Proprietary CLI | Apache 2.0 [FACT] | Apache 2.0 [FACT] | MIT / Apache [FACT] | Apache 2.0 [FACT] | Proprietary [FACT] |
| **Non-Interactive Mode**| claude -p [FACT] | codex exec [FACT] | ider -m [FACT] | gemini -p [FACT] | Yes (--headless) | Yes (
un) | Yes |
| **Programmatic Input** | Stdin pipe & flags | Stdin pipe & args | File & flag input | Stdin & flags | Stdin & JSON IPC | CLI flags | CLI args |
| **Machine Structured Output**| --output-format json| --json (JSON Lines)| Raw stdout (parser)| --output-format json| JSON events | JSON logs | JSON stream |
| **Session Resumption** | Resume session ID [FACT]| --ephemeral flag | History files | Session state DB | Session UUID | SQLite sessions | Session token |
| **Worktree Support** | Path argument [FACT]| Working dir arg [FACT]| Git-native [FACT] | Cwd flag [FACT] | Cwd flag [FACT] | Cwd flag [FACT] | Cwd flag [FACT] |
| **MCP Client Support** | Yes (Native MCP) [FACT]| Yes (MCP tools) [FACT]| Yes (MCP plugin) | Yes (ADK tools) | Yes (Native MCP) | Yes (Native MCP) | Yes |
| **Subagent Spawning** | Supported via SDK | Multi-agent mode | No (single loop) | Native via ADK [FACT]| Community ext | Multi-toolkit | No |
| **Image / Screenshot Input**| Yes (multimodal) | Yes (multimodal) | Selected models | Yes (Gemini Vision) | Yes | Limited | Yes |
| **Approval Policies** | --allowedTools [FACT]| --sandbox [FACT] | --yes bypass [FACT] | Security configs | Granular prompts | Tool allowlist | Prompted |
| **Windows Support** | Excellent (Node/Native)| Excellent (Node/Py) | Excellent (Native) | Excellent (Cross) | Excellent | Good (Go/Win) | Good |
| **Wrappability Score** | **9.5 / 10** [INFERENCE]| **9.0 / 10** [INFERENCE]| **9.0 / 10** [INFERENCE]| **8.5 / 10** [INFERENCE]| **8.0 / 10** [INFERENCE]| **8.0 / 10** [INFERENCE]| **7.5 / 10** [INFERENCE]|

---

## 2. Deep Technical Analysis of Top Candidates

### 1. Claude Code
- **Invocation Command**: claude -p "<task_prompt>" --allowedTools "Read,Edit,Bash" --output-format json --max-turns 30
- **Session Persistence**: Persists session states in user application directories; session IDs can be resumed via --resume <session_id>.
- **Strengths**: Unmatched architectural reasoning, native tool event streaming, strong bash validation, official TypeScript/Python Agent SDK.
- **Orchestration Fit**: **Optimal for Complex Implementation & Refactoring**.

### 2. OpenAI Codex CLI
- **Invocation Command**: codex exec "<task_prompt>" --json --sandbox workspace-write
- **Session Persistence**: Supports --ephemeral for pristine task execution or session-file rollouts.
- **Strengths**: Native JSON-lines event streaming, explicit filesystem isolation sandboxes, robust API-key driven CI/CD automation.
- **Orchestration Fit**: **Optimal for Repository Analysis, Code Search, and Scaffolding**.

### 3. Aider
- **Invocation Command**: ider --message "<task_prompt>" --yes --no-auto-commits --model <model_name>
- **Session Persistence**: Reads/writes git history and .aider.chat.history.md.
- **Strengths**: Extremely lightweight, no heavy runtime daemon, deterministic git diff edits, supports local models via Ollama.
- **Orchestration Fit**: **Optimal for Focused Single-File Bug Fixes & Local Model Execution**.

---

## 3. Harness Wrapping & Safe Execution Strategy

To wrap arbitrary coding agents without coupling the Orchestrator to a single vendor CLI:

`	ypescript
interface AgentHarnessAdapter {
  id: string;
  name: string;
  spawnWorker(config: WorkerSpawnConfig): Promise<WorkerHandle>;
}

interface WorkerSpawnConfig {
  taskId: string;
  workspacePath: string;      // isolated Git worktree
  prompt: string;
  allowedTools: string[];
  maxTurns: number;
  environment: Record<string, string>; // strictly scoped secrets
  onOutputChunk: (chunk: OutputChunk) => void;
}

interface WorkerHandle {
  pid: number;
  interrupt(): Promise<void>;
  terminate(): Promise<void>;
  waitForCompletion(): Promise<ExecutionResult>;
}
`

### Context Explosion Mitigation [INFERENCE]
1. **Never pass the full repository context into CLI prompts**: Supply only the task description, acceptance criteria, and specific file pointers.
2. **Enforce Turn Limits**: Always invoke harnesses with explicit --max-turns (e.g., 20-30 turns) to prevent self-referential hallucination loops.
3. **Isolate stdout/stderr**: Stream raw logs to content-addressed disk files and parse only structured JSON status events into memory.
