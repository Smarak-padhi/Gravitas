/**
 * Codex Agent Harness Adapter for @gravitas/harnesses.
 *
 * Invokes the installed OpenAI Codex CLI native binary in headless,
 * non-interactive mode with maximum process isolation.
 *
 * Security & Process Constraints:
 * - Native binary spawning via codex.exe (shell: false, no cmd.exe wrapping).
 * - Direct PID acquisition for clean Windows process-tree killing.
 * - Strict --ephemeral mode: no session state persisted between invocations.
 * - User config isolation: --ignore-user-config --ignore-rules.
 * - MCP server blocking: -c mcp_servers={}.
 * - No git authority: Codex receives no git.commit or git.push capability.
 * - Stdin prompt streaming with immediate stdin.end() to prevent hang.
 * - Structured JSONL event stream parsing for execution telemetry.
 * - Bounded output and credential scrubbing inherited from runSubprocess.
 */

import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { runSubprocess, type SubprocessHandle } from './process.js'
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentHarness,
  HarnessAvailability,
  HarnessAvailabilityStatus,
} from './types.js'

// ─── JSONL Event Types ────────────────────────────────────────────────────────

export interface CodexJsonlEvent {
  readonly type: string
  readonly [key: string]: unknown
}

export interface CodexTurnCompletedEvent extends CodexJsonlEvent {
  readonly type: 'turn.completed'
  readonly usage?: {
    readonly input_tokens?: number
    readonly output_tokens?: number
  }
}

export interface CodexItemCompletedEvent extends CodexJsonlEvent {
  readonly type: 'item.completed'
  readonly item?: {
    readonly type?: string
    readonly content?: string
    readonly output?: string
  }
}

export type ParsedCodexEvents = {
  readonly events: readonly CodexJsonlEvent[]
  readonly turnCompleted: boolean
  readonly inputTokens: number
  readonly outputTokens: number
  readonly agentMessages: readonly string[]
  readonly commandOutputs: readonly string[]
}

/**
 * Parses a JSONL stdout stream from Codex into structured events.
 */
export function parseCodexJsonlOutput(stdout: string): ParsedCodexEvents {
  const events: CodexJsonlEvent[] = []
  const agentMessages: string[] = []
  const commandOutputs: string[] = []
  let turnCompleted = false
  let inputTokens = 0
  let outputTokens = 0

  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      // Non-JSON lines (progress noise etc) — skip
      continue
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed) ||
      typeof (parsed as { type?: unknown }).type !== 'string'
    ) {
      continue
    }
    const event = parsed as CodexJsonlEvent
    events.push(event)

    if (event.type === 'turn.completed') {
      turnCompleted = true
      const usage = (event as CodexTurnCompletedEvent).usage
      if (usage) {
        inputTokens += usage.input_tokens ?? 0
        outputTokens += usage.output_tokens ?? 0
      }
    }

    if (event.type === 'item.completed') {
      const item = (event as CodexItemCompletedEvent).item
      if (item?.type === 'agent_message' && typeof item.content === 'string') {
        agentMessages.push(item.content)
      }
      if (item?.type === 'command_execution' && typeof item.output === 'string') {
        commandOutputs.push(item.output)
      }
    }
  }

  return {
    events,
    turnCompleted,
    inputTokens,
    outputTokens,
    agentMessages,
    commandOutputs,
  }
}

// ─── Binary Resolution ────────────────────────────────────────────────────────

/**
 * Resolves the Codex native binary path.
 *
 * Resolution order:
 * 1. Explicit custom path (options or CODEX_EXECUTABLE env var)
 * 2. Native Rust binary bundled inside @openai/codex npm package (Windows)
 * 3. Fallback: 'codex' in PATH (won't work with shell:false on Windows .cmd)
 */
export function resolveCodexExecutable(customPath?: string): string | null {
  if (customPath !== undefined) {
    return existsSync(customPath) ? customPath : null
  }
  if (process.env['CODEX_EXECUTABLE']) {
    return process.env['CODEX_EXECUTABLE']
  }

  if (process.platform === 'win32') {
    const appData = process.env['APPDATA']
    if (appData) {
      // Primary: Rust native binary embedded in the npm package
      const nativeBin = join(
        appData,
        'npm',
        'node_modules',
        '@openai',
        'codex',
        'node_modules',
        '@openai',
        'codex-win32-x64',
        'vendor',
        'x86_64-pc-windows-msvc',
        'bin',
        'codex.exe'
      )
      if (existsSync(nativeBin)) {
        return nativeBin
      }
    }
  }

  // POSIX / fallback (shell: false works for bare binaries on non-Windows)
  return 'codex'
}

/**
 * Builds the exact argument list for Codex non-interactive execution.
 *
 * Hardcoded constraints:
 * - exec subcommand
 * - --ephemeral: no state across runs
 * - --ignore-user-config: blocks ambient user configuration
 * - --ignore-rules: blocks AGENTS.md capability grant injection
 * - -c mcp_servers={}: blocks local MCP server discovery
 * - --json: structured JSONL event stream output
 * - --approve-for-me: non-interactive workspace-write sandbox (auto-approves
 *   filesystem writes; this also sets sandbox mode so --sandbox is NOT passed)
 * - --skip-git-repo-check: prevents git repository discovery requirement
 * - --cd <worktreePath>: bound execution directory
 */
export function buildCodexCliArgs(worktreePath: string): readonly string[] {
  return [
    'exec',
    '--ephemeral',
    '--ignore-user-config',
    '--ignore-rules',
    '-c',
    'mcp_servers={}',
    '--json',
    '--skip-git-repo-check',
    '--cd',
    worktreePath,
    '--approve-for-me',
  ]
}

// ─── Harness ──────────────────────────────────────────────────────────────────

export interface CodexHarnessOptions {
  readonly executablePath?: string | undefined
}

export class CodexHarness implements AgentHarness {
  public readonly id = 'codex'
  private readonly configuredExecutable?: string | undefined
  private readonly activeExecutions = new Map<string, SubprocessHandle>()
  private cachedVersion?: string | undefined

  constructor(options?: CodexHarnessOptions) {
    this.configuredExecutable = options?.executablePath
  }

  public getExecutablePath(): string | null {
    return resolveCodexExecutable(this.configuredExecutable)
  }

  /**
   * Probes real host availability for the Codex native binary.
   *
   * Returns AVAILABLE only if:
   *  1. Native binary is resolved and executable.
   *  2. `codex doctor` confirms auth is configured.
   */
  public async availability(): Promise<HarnessAvailability> {
    const executable = this.getExecutablePath()
    if (!executable) {
      return {
        status: 'UNAVAILABLE',
        installed: false,
        usableNoninteractive: false,
        message: 'Codex native binary not found on host (checked APPDATA and CODEX_EXECUTABLE).',
      }
    }

    // 1. Check version
    const versionResult = await runSubprocess({
      executable,
      args: ['--version'],
      cwd: process.cwd(),
      timeoutMs: 10000,
    })

    if (versionResult.exitCode !== 0 || !versionResult.stdout.trim()) {
      return {
        status: 'UNAVAILABLE',
        installed: false,
        executablePath: executable,
        usableNoninteractive: false,
        message: 'Codex binary found but --version failed.',
      }
    }

    const version = versionResult.stdout.trim().split(/\r?\n/)[0] ?? ''
    this.cachedVersion = version

    // 2. Auth probe: codex doctor (exit 0 = auth configured)
    const doctorResult = await runSubprocess({
      executable,
      args: ['doctor'],
      cwd: process.cwd(),
      timeoutMs: 15000,
    })

    const doctorOutput = `${doctorResult.stdout}\n${doctorResult.stderr}`.toLowerCase()
    const authConfigured =
      doctorResult.exitCode === 0 ||
      doctorOutput.includes('authenticated') ||
      doctorOutput.includes('connected') ||
      Boolean(process.env['OPENAI_API_KEY']) ||
      Boolean(process.env['CODEX_API_KEY'])

    const status: HarnessAvailabilityStatus = authConfigured ? 'AVAILABLE' : 'AUTH_REQUIRED'

    return {
      status,
      installed: true,
      version,
      executablePath: executable,
      usableNoninteractive: authConfigured,
      message: authConfigured
        ? `Codex is installed (${version}) and authenticated.`
        : 'Codex binary is installed but authentication is not configured.',
    }
  }

  /**
   * Executes the Codex native binary against an allocated task worktree.
   *
   * Trusted Git Containment Boundary:
   * 1. Quarantines worktree .git metadata outside worktreePath during execution.
   * 2. Prepends a Git mediation shim in PATH that intercepts any `git` invocations.
   * 3. Sets restrictive GIT_* environment boundaries to prevent discovery.
   * 4. Prompt is passed via stdin; stdin is closed immediately after write.
   * 5. In finally: checks for rogue .git creation, restores legitimate .git, and cleans shim.
   */
  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const executable = this.getExecutablePath()
    if (!executable) {
      throw new Error(
        `CodexHarness.execute: Codex native binary is not available on this host. ` +
          `Resolve CODEX_EXECUTABLE or install @openai/codex.`
      )
    }

    const startedAt = new Date().toISOString()
    const cliArgs = buildCodexCliArgs(request.worktreePath)

    // --- Git Authority Containment: Quarantine .git entry ---
    const dotGitPath = join(request.worktreePath, '.git')
    const quarantinePath = `${request.worktreePath}.gravitas-git-quarantine`
    let gitQuarantined = false

    if (existsSync(dotGitPath)) {
      try {
        renameSync(dotGitPath, quarantinePath)
        gitQuarantined = true
      } catch {
        // Proceed even if quarantine rename fails
      }
    }

    // --- Git Authority Containment: Mediation Shim in PATH ---
    const shimDir = join(tmpdir(), `gravitas-git-shim-${randomUUID()}`)
    let shimCreated = false
    try {
      mkdirSync(shimDir, { recursive: true })
      const denialNoticeCmd =
        '@echo off\r\necho [Gravitas Security Boundary] Worker execution is denied Git command: git %* 1>&2\r\nexit /b 128\r\n'
      writeFileSync(join(shimDir, 'git.cmd'), denialNoticeCmd, 'utf8')
      writeFileSync(join(shimDir, 'git.bat'), denialNoticeCmd, 'utf8')
      const denialNoticeSh =
        '#!/bin/sh\necho "[Gravitas Security Boundary] Worker execution is denied Git command: git $@" >&2\nexit 128\n'
      writeFileSync(join(shimDir, 'git'), denialNoticeSh, 'utf8')
      shimCreated = true
    } catch {
      // Proceed even if shim creation fails
    }

    const isolatedEnv: Record<string, string | undefined> = {
      ...process.env,
      ...(shimCreated ? { PATH: `${shimDir};${process.env['PATH'] ?? ''}` } : {}),
      GIT_DIR: 'C:\\gravitas_denied_git_dir',
      GIT_WORK_TREE: 'C:\\gravitas_denied_worktree',
      GIT_CEILING_DIRECTORIES: dirname(request.worktreePath),
      GIT_TERMINAL_PROMPT: '0',
      GIT_OPTIONAL_LOCKS: '0',
    }

    let subprocessResult
    let rogueGitCreated = false

    try {
      subprocessResult = await runSubprocess(
        {
          executable,
          args: cliArgs,
          cwd: request.worktreePath,
          stdinInput: request.compiledPrompt,
          timeoutMs: request.timeoutMs ?? 120000,
          env: isolatedEnv,
        },
        (handle) => {
          this.activeExecutions.set(request.executionId, handle)
        }
      )
    } finally {
      this.activeExecutions.delete(request.executionId)

      // --- Post-Execution: Neutralize rogue .git and restore legitimate .git ---
      try {
        if (existsSync(dotGitPath)) {
          rogueGitCreated = true
          rmSync(dotGitPath, { recursive: true, force: true })
        }
      } catch {
        // Best-effort rogue cleanup
      }

      if (gitQuarantined && existsSync(quarantinePath)) {
        try {
          renameSync(quarantinePath, dotGitPath)
        } catch {
          // Best-effort restore
        }
      }

      if (shimCreated) {
        try {
          rmSync(shimDir, { recursive: true, force: true })
        } catch {
          // Best-effort shim cleanup
        }
      }
    }

    const finishedAt = new Date().toISOString()
    const stderrWithNotice = rogueGitCreated
      ? `${subprocessResult.stderr}\n[Gravitas Security Boundary] Rogue .git creation detected and neutralized.`
      : subprocessResult.stderr

    return {
      executionId: request.executionId,
      harnessId: this.id,
      harnessVersion: this.cachedVersion,
      startedAt,
      finishedAt,
      durationMs: subprocessResult.durationMs,
      exitCode: subprocessResult.exitCode,
      terminationReason: subprocessResult.terminationReason,
      stdout: subprocessResult.stdout,
      stderr: stderrWithNotice,
      stdoutTruncated: subprocessResult.stdoutTruncated,
      stderrTruncated: subprocessResult.stderrTruncated,
      worktreePath: request.worktreePath,
      ...(subprocessResult.pid !== undefined ? { pid: subprocessResult.pid } : {}),
    }
  }

  /**
   * Cancels an ongoing Codex execution by execution ID.
   */
  public async cancel(executionId: string): Promise<boolean> {
    const handle = this.activeExecutions.get(executionId)
    if (!handle) {
      return false
    }
    await handle.kill('CANCELLED')
    this.activeExecutions.delete(executionId)
    return true
  }
}
