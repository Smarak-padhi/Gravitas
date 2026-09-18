# 03 - Coding Agent CLI Harnesses & Subagent Architecture

> **Document Type:** Phase 0 Technical Research  
> **Status:** Authoritative  
> **Classification:** FACT (from official CLI documentation) / INFERENCE (adapter design)  

---

## 1. The Critical Distinction: Model API vs. Agent Harness

One of the most dangerous architectural confusions in AI engineering is treating a **Model API** as an **Agent Harness**:

```
Model API (Raw Inference):
  Prompt Tokens In ---> [LLM Weights] ---> Completion Tokens Out

Agent Harness (Stateful Scaffolding):
  User Goal ---> [Harness Engine]
                   |
                   |-- Workspace / Git Inspection
                   |-- Context Assembly & Compaction
                   |-- Tool Execution Loop (Read, Edit, Bash)
                   |-- Subagent Delegation
                   `-- Terminal / Diff User Interface
```

### Concrete Examples [FACT]
- **Claude 3.5 Sonnet (API)** is a foundation model; **Claude Code** is Anthropic's stateful agent harness built on top of it.
- **o1 / o3 / GPT-4o (API)** are foundation models; **OpenAI Codex CLI** is OpenAI's dedicated coding harness.
- **Gemini 1.5 Pro (API)** is a foundation model; **Gemini CLI** and **Google ADK** are execution harnesses.

Our Multi-Agent Operating System must treat Agent Harnesses as **Worker Subprocesses** operating inside sandboxed Git worktrees.

---

## 2. Programmatic Execution Profiles of Top Harnesses

### 1. Claude Code (Anthropic)
- **Headless Invocations**:
  ```bash
  claude -p "Implement Gate 1 responsive layout" \
    --allowedTools "Read,Edit,Bash" \
    --output-format json \
    --max-turns 25 \
    --bare
  ```
- **Programmatic Integration [FACT]**:
  - `-p` runs headless and writes to stdout.
  - `--output-format json` emits structured JSON event envelopes for all tool calls and final summaries.
  - `--allowedTools` bypasses interactive terminal confirmation dialogs for safe automated execution.
  - `--bare` disables interactive plugins, hooks, and slow startup checks.
- **Session Resumption**: Supports session persistence in user data directories; can resume via `--resume <session_id>`.

### 2. OpenAI Codex CLI
- **Headless Invocations**:
  ```bash
  codex exec "Analyze and fix TypeScript errors in auth module" \
    --json \
    --sandbox workspace-write \
    --ephemeral
  ```
- **Programmatic Integration [FACT]**:
  - `codex exec` executes non-interactively without spawning the full interactive TUI.
  - `--json` emits newline-delimited JSON (JSON Lines) tracking reasoning, file edits, and tool status.
  - `--sandbox workspace-write` enforces filesystem bounds, prohibiting writes outside the current repository directory.
  - `--ephemeral` executes cleanly without persisting session artifacts to disk.

### 3. Aider (aider.chat)
- **Headless Invocations**:
  ```bash
  aider --message "Refactor header component for accessibility" \
    --yes \
    --no-auto-commits \
    --model anthropic/claude-3-5-sonnet-20241022
  ```
- **Programmatic Integration [FACT]**:
  - `--yes` automatically accepts all file modifications.
  - `--no-auto-commits` delegates commit ownership to our Orchestrator's checkpoint system.
  - Highly robust on Windows command lines with zero PTY dependencies.

---

## 3. Universal Harness Wrapper Specification

The Orchestrator interacts with all coding agents through a unified interface:

```typescript
export interface IAgentHarness {
  readonly id: string;
  readonly name: string;
  readonly supportedModels: string[];
  
  executeTask(params: HarnessTaskParams): Promise<HarnessTaskResult>;
}

export interface HarnessTaskParams {
  taskId: string;
  objective: string;
  workspacePath: string;           // Path to isolated Git Worktree
  allowedTools: string[];
  permissionLevel: PermissionTier; // L0 - L4
  timeoutMs: number;
  environmentVariables: Record<string, string>; // Scoped API tokens
  onEvent: (event: AgentExecutionEvent) => void; // Live streaming
}

export interface HarnessTaskResult {
  taskId: string;
  exitCode: number;
  status: 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'KILLED';
  summary: string;
  filesModified: string[];
  tokensConsumed: {
    input: number;
    output: number;
    totalCostUsd: number;
  };
  durationMs: number;
}
```

---

## 4. Context Explosion Prevention Strategy [INFERENCE]

Running multi-agent systems without context guards leads to exponential token waste and prompt corruption. We enforce three structural guardrails:

1. **Strict File-Scope Whitelisting**: Rather than loading the entire repository, the Orchestrator supplies only targeted file paths specified in the task contract.
2. **Hard Turn Ceilings**: Every harness call is capped at `--max-turns 30`. If an agent fails to conclude within 30 turns, the task is automatically paused for verifier intervention.
3. **Log Truncation & Content Addressing**: Massive build or test outputs (e.g. 50,000 lines of npm logs) are never piped directly into LLM prompts. They are saved to content-addressed disk files (`.evidence/logs/{hash}.txt`), and only the trailing 100 error lines are injected into the agent context.
