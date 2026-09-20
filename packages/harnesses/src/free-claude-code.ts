/**
 * Free Claude Code Agent Harness Adapter for @gravitas/harnesses.
 *
 * Invokes the installed Free Claude Code launcher (fcc-claude) which proxies
 * execution through a locally running fcc-server.
 *
 * Security & Process Constraints:
 * - cwd strictly bound to the allocated task worktree.
 * - Shell-free argument passing (shell: false).
 * - Minimum required permissions: `--permission-mode acceptEdits`.
 * - Tool restrictions: Whitelist `--tools Edit,Read` (denies arbitrary Bash, WebFetch, MCP).
 * - Ephemeral execution: `--no-session-persistence` and `--output-format json`.
 * - Prompt streaming through stdin.
 * - Zero provider secrets or tokens retained in execution metadata.
 */

import { existsSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { runSubprocess, type SubprocessHandle } from './process.js'
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentHarness,
  HarnessAvailability,
  HarnessAvailabilityStatus,
} from './types.js'

export const DEFAULT_FCC_PROXY_URL = 'http://127.0.0.1:8082'

/**
 * Resolves the real fcc-claude launcher executable binary on the host system.
 * Resolution order:
 * 1. Explicit configured path if supplied
 * 2. Environment variable FCC_CLAUDE_EXECUTABLE if set
 * 3. Documented Windows location: %USERPROFILE%/.local/bin/fcc-claude.exe
 * 4. Fallback to 'fcc-claude' for PATH resolution
 */
export function resolveFccLauncher(customPath?: string): string | null {
  if (customPath !== undefined) {
    return customPath
  }
  if (process.env['FCC_CLAUDE_EXECUTABLE']) {
    return process.env['FCC_CLAUDE_EXECUTABLE']
  }
  if (process.platform === 'win32') {
    const localBin = join(homedir(), '.local', 'bin', 'fcc-claude.exe')
    if (existsSync(localBin)) {
      return localBin
    }
  } else {
    const localBin = join(homedir(), '.local', 'bin', 'fcc-claude')
    if (existsSync(localBin)) {
      return localBin
    }
  }
  return 'fcc-claude'
}

export interface FccHealthResult {
  readonly reachable: boolean
  readonly healthy: boolean
  readonly latencyMs?: number | undefined
  readonly error?: string | undefined
}

/**
 * Probes the local FCC proxy health endpoint without transmitting credentials.
 */
export async function checkFccProxyHealth(
  proxyRootUrl: string = DEFAULT_FCC_PROXY_URL,
  timeoutMs: number = 2000
): Promise<FccHealthResult> {
  const normalizedUrl = proxyRootUrl.replace(/\/+$/, '')
  const healthUrl = `${normalizedUrl}/health`
  const startTime = Date.now()

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    })
    clearTimeout(timer)
    const latencyMs = Date.now() - startTime

    if (response.status >= 200 && response.status < 300) {
      return {
        reachable: true,
        healthy: true,
        latencyMs,
      }
    }

    return {
      reachable: true,
      healthy: false,
      latencyMs,
      error: `Health check returned HTTP ${response.status}`,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      reachable: false,
      healthy: false,
      error: `Proxy not reachable at ${healthUrl}: ${message}`,
    }
  }
}

export interface BuildFccCliArgsOptions {
  readonly allowedTools?: readonly string[] | undefined
  readonly outputFormat?: 'json' | 'text' | undefined
  readonly permissionMode?: string | undefined
  readonly strictIsolation?: boolean | undefined
  readonly mcpConfigFile?: string | undefined
}

/**
 * Builds the exact noninteractive argument list for Free Claude Code.
 */
export function buildFccCliArgs(options?: BuildFccCliArgsOptions): readonly string[] {
  const tools = options?.allowedTools?.join(',') || 'Edit,Read'
  const outputFormat = options?.outputFormat ?? 'json'
  const permissionMode = options?.permissionMode ?? 'acceptEdits'
  const strictIsolation = options?.strictIsolation ?? true

  const args = [
    '-p',
    '--output-format',
    outputFormat,
    '--no-session-persistence',
    '--permission-mode',
    permissionMode,
    '--tools',
    tools,
  ]

  if (strictIsolation) {
    args.push(
      '--strict-mcp-config',
      '--safe-mode',
      '--setting-sources',
      ''
    )
    if (options?.mcpConfigFile) {
      args.push('--mcp-config', options.mcpConfigFile)
    }
  }

  return args
}

export interface FreeClaudeCodeHarnessOptions {
  readonly launcherPath?: string | undefined
  readonly proxyUrl?: string | undefined
  readonly strictIsolation?: boolean | undefined
  readonly mcpConfigFile?: string | undefined
  readonly runtimeTempDir?: string | undefined
}

export class FreeClaudeCodeHarness implements AgentHarness {
  public readonly id = 'free-claude-code'
  private readonly configuredLauncher?: string | undefined
  private readonly proxyUrl: string
  private readonly strictIsolation: boolean
  private readonly mcpConfigFile?: string | undefined
  private readonly runtimeTempDir?: string | undefined
  private readonly activeExecutions = new Map<string, SubprocessHandle>()
  private cachedVersion?: string | undefined

  constructor(options?: FreeClaudeCodeHarnessOptions) {
    this.configuredLauncher = options?.launcherPath
    this.proxyUrl = options?.proxyUrl ?? DEFAULT_FCC_PROXY_URL
    this.strictIsolation = options?.strictIsolation ?? true
    this.mcpConfigFile = options?.mcpConfigFile
    this.runtimeTempDir = options?.runtimeTempDir
  }

  public getLauncherPath(): string {
    return resolveFccLauncher(this.configuredLauncher) ?? 'fcc-claude'
  }

  /**
   * Queries real host capability for Free Claude Code.
   *
   * Distinguishes:
   * - UNAVAILABLE: launcher binary not found.
   * - INSTALLED: launcher binary exists, but local proxy is unreachable.
   * - AVAILABLE: launcher exists AND local proxy health check succeeds.
   */
  public async availability(): Promise<HarnessAvailability> {
    const launcher = this.getLauncherPath()

    // 1. Verify launcher binary exists / can run
    const versionResult = await runSubprocess({
      executable: launcher,
      args: ['--version'],
      cwd: process.cwd(),
      timeoutMs: 5000,
    })

    if (versionResult.terminationReason === 'PROCESS_ERROR') {
      return {
        status: 'UNAVAILABLE',
        installed: false,
        executablePath: launcher,
        usableNoninteractive: false,
        message: `Free Claude Code launcher not found at "${launcher}".`,
      }
    }

    // Capture version if output exists
    const versionLine = (versionResult.stdout || versionResult.stderr).trim().split(/\r?\n/)[0] ?? ''
    if (versionLine) {
      this.cachedVersion = versionLine
    }

    // 2. Probe proxy health
    const health = await checkFccProxyHealth(this.proxyUrl, 2000)

    if (!health.healthy) {
      const reason = health.reachable
        ? `Proxy server at ${this.proxyUrl} is unhealthy (${health.error ?? 'unknown error'}).`
        : `Proxy server is not reachable at ${this.proxyUrl}. Start it in another terminal with: fcc-server`

      return {
        status: 'INSTALLED',
        installed: true,
        executablePath: launcher,
        version: this.cachedVersion,
        usableNoninteractive: false,
        message: reason,
      }
    }

    const status: HarnessAvailabilityStatus = 'AVAILABLE'

    return {
      status,
      installed: true,
      executablePath: launcher,
      version: this.cachedVersion,
      usableNoninteractive: true,
      message: `Free Claude Code is ready (proxy reachable at ${this.proxyUrl}, latency: ${health.latencyMs ?? 0}ms).`,
    }
  }

  /**
   * Executes Free Claude Code against an allocated task worktree.
   */
  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startedAt = new Date().toISOString()
    const launcher = this.getLauncherPath()

    let ephemeralMcpPath: string | undefined
    let effectiveMcpConfigFile = this.mcpConfigFile

    if (this.strictIsolation && !effectiveMcpConfigFile) {
      const baseDir = this.runtimeTempDir ?? tmpdir()
      const safeId = `${request.runId}-${request.taskId}`.replace(/[^a-zA-Z0-9_-]/g, '_')
      ephemeralMcpPath = join(baseDir, `gravitas-mcp-empty-${safeId}.json`)
      await writeFile(ephemeralMcpPath, JSON.stringify({ mcpServers: {} }, null, 2), 'utf8')
      effectiveMcpConfigFile = ephemeralMcpPath
    }

    try {
      const cliArgs = buildFccCliArgs({
        allowedTools: request.permissions?.allowedTools ?? ['Edit', 'Read'],
        permissionMode: 'acceptEdits',
        outputFormat: 'json',
        strictIsolation: this.strictIsolation,
        mcpConfigFile: effectiveMcpConfigFile,
      })

      const subprocessResult = await runSubprocess(
        {
          executable: launcher,
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
    } finally {
      if (ephemeralMcpPath) {
        try {
          await rm(ephemeralMcpPath, { force: true })
        } catch {
          // Best-effort cleanup
        }
      }
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
