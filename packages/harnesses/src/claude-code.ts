/**
 * Claude Code Agent Harness Adapter for @gravitas/harnesses.
 *
 * Invokes the installed Claude Code CLI in headless, non-interactive mode.
 *
 * Security & Process Constraints:
 * - cwd strictly bound to the allocated task worktree.
 * - Shell-free argument passing (shell: false).
 * - Minimum required permissions: `--permission-mode acceptEdits`.
 * - Tool restrictions: Whitelist `--tools Edit,Read` to deny arbitrary Bash execution.
 * - Ephemeral execution: `--no-session-persistence` and `--output-format json`.
 * - Prompt streaming through stdin (bypasses Windows CLI length limitations).
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { runSubprocess, type SubprocessHandle } from './process.js'
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentHarness,
  HarnessAvailability,
  HarnessAvailabilityStatus,
} from './types.js'

/**
 * Resolves the real Claude Code executable binary on the host system.
 * Handles Windows npm-installed packaged binary (@anthropic-ai/claude-code/bin/claude.exe)
 * without invoking cmd.exe or shell interpreters.
 */
export function resolveClaudeExecutable(customPath?: string): string | null {
  if (customPath !== undefined) {
    return customPath
  }
  if (process.env['CLAUDE_EXECUTABLE']) {
    return process.env['CLAUDE_EXECUTABLE']
  }
  if (process.platform === 'win32') {
    const appData = process.env['APPDATA']
    if (appData) {
      const npmBin = join(appData, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe')
      if (existsSync(npmBin)) {
        return npmBin
      }
    }
    const localAppData = process.env['LOCALAPPDATA']
    if (localAppData) {
      const localBin = join(localAppData, 'Programs', 'claude', 'claude.exe')
      if (existsSync(localBin)) {
        return localBin
      }
    }
  }
  return 'claude'
}

/**
 * Builds the exact noninteractive argument list for Claude Code.
 */
export function buildClaudeCliArgs(options?: {
  readonly allowedTools?: readonly string[] | undefined
  readonly outputFormat?: 'json' | 'text' | undefined
  readonly permissionMode?: string | undefined
}): readonly string[] {
  const tools = options?.allowedTools?.join(',') || 'Edit,Read'
  const outputFormat = options?.outputFormat ?? 'json'
  const permissionMode = options?.permissionMode ?? 'acceptEdits'

  return [
    '-p',
    '--output-format',
    outputFormat,
    '--no-session-persistence',
    '--permission-mode',
    permissionMode,
    '--tools',
    tools,
  ]
}

export class ClaudeCodeHarness implements AgentHarness {
  public readonly id = 'claude-code'
  private readonly configuredExecutable?: string | undefined
  private readonly activeExecutions = new Map<string, SubprocessHandle>()
  private cachedVersion?: string | undefined

  constructor(options?: { executablePath?: string | undefined }) {
    this.configuredExecutable = options?.executablePath
  }

  public getExecutablePath(): string {
    return resolveClaudeExecutable(this.configuredExecutable) ?? 'claude'
  }

  /**
   * Queries real host capability for Claude Code.
   */
  public async availability(): Promise<HarnessAvailability> {
    const executable = this.getExecutablePath()

    // 1. Check if claude executable exists and query version
    const versionResult = await runSubprocess({
      executable,
      args: ['--version'],
      cwd: process.cwd(),
      timeoutMs: 5000,
    })

    if (versionResult.exitCode !== 0 || !versionResult.stdout.trim()) {
      return {
        status: 'UNAVAILABLE',
        installed: false,
        executablePath: executable,
        usableNoninteractive: false,
        message: 'Claude Code CLI not found or executable failed.',
      }
    }

    const version = versionResult.stdout.trim().split(/\r?\n/)[0] ?? ''
    this.cachedVersion = version

    // 2. Check auth status
    const authResult = await runSubprocess({
      executable,
      args: ['auth', 'status'],
      cwd: process.cwd(),
      timeoutMs: 5000,
    })

    let loggedIn = false
    try {
      const parsed = JSON.parse(authResult.stdout) as { loggedIn?: boolean }
      loggedIn = parsed.loggedIn === true
    } catch {
      // If parsing fails, check if ANTHROPIC_API_KEY is present in env
      loggedIn = Boolean(process.env['ANTHROPIC_API_KEY'])
    }

    const status: HarnessAvailabilityStatus = loggedIn ? 'AVAILABLE' : 'AUTH_REQUIRED'

    return {
      status,
      installed: true,
      version,
      executablePath: executable,
      usableNoninteractive: loggedIn,
      message: loggedIn
        ? 'Claude Code is installed and authenticated.'
        : 'Claude Code is installed but not authenticated (run claude login or set ANTHROPIC_API_KEY).',
    }
  }

  /**
   * Executes Claude Code against an allocated task worktree.
   */
  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startedAt = new Date().toISOString()
    const cliArgs = buildClaudeCliArgs({
      allowedTools: request.permissions?.allowedTools ?? ['Edit', 'Read'],
      permissionMode: 'acceptEdits',
      outputFormat: 'json',
    })

    const subprocessResult = await runSubprocess(
      {
        executable: this.getExecutablePath(),
        args: cliArgs,
        cwd: request.worktreePath,
        stdinInput: request.compiledPrompt,
        timeoutMs: request.timeoutMs ?? 60000,
      },
      (handle) => {
        this.activeExecutions.set(request.executionId, handle)
      }
    )

    this.activeExecutions.delete(request.executionId)
    const finishedAt = new Date().toISOString()

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
      stderr: subprocessResult.stderr,
      stdoutTruncated: subprocessResult.stdoutTruncated,
      stderrTruncated: subprocessResult.stderrTruncated,
      worktreePath: request.worktreePath,
      ...(subprocessResult.pid !== undefined ? { pid: subprocessResult.pid } : {}),
    }
  }

  /**
   * Cancels an ongoing execution by execution ID.
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
