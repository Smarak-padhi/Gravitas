/**
 * GRAVITAS K1 — Free Claude Code (FCC) Surface Adapter
 *
 * Wraps the existing FreeClaudeCodeHarness in the K1 GravitasHarness contract.
 *
 * Qualification state as of 2026-10-02:
 * - Launcher binary: fcc-claude.exe resolved via %USERPROFILE%\.local\bin or PATH
 * - Proxy server: fcc-server.exe resolved via %USERPROFILE%\.local\bin or PATH
 * - Proxy health: NOT RUNNING (timeout on http://127.0.0.1:8082/health)
 *   → STATE: INSTALLED (binary present, proxy NOT running)
 *   → DISPATCH STATE: NOT_READY until fcc-server is started
 *
 * FCC is classified as:
 * - HarnessKind: DAEMON (requires a running local daemon for operation)
 * - CostEligibility: LOCAL_FOSS (fcc-claude is open-source; proxies through local fcc-server)
 *
 * NOTE: FCC relies on an underlying model provider (the fcc-server routes to Claude models).
 * The "free" aspect is the local proxy architecture, not unlimited free model inference.
 * Classification LOCAL_FOSS applies to the harness infrastructure, not the inference itself.
 * Full cost model of fcc-server depends on the subscription/auth it was configured with.
 *
 * OPERATIONAL REQUIREMENT:
 * Before dispatching to FCC, a human operator must start fcc-server in a separate terminal.
 * This is NOT autonomously startable by GRAVITAS (would require shell execution authority
 * beyond K1 scope and would be a human-gated action).
 */

import {
  resolveFccLauncher,
  buildFccCliArgs,
  checkFccProxyHealth,
  DEFAULT_FCC_PROXY_URL,
  type FreeClaudeCodeHarnessOptions,
} from '../free-claude-code.js'
import { runSubprocess } from '../process.js'
import {
  type ExecutionRequest,
  type ExecutionResult,
  type HarnessQualificationSnapshot,
  type HarnessCapabilities,
  type HarnessAuthorityRequirements,
  type CancellationHandle,
} from './types.js'
import type {
  DaemonHarness,
  ReadinessCheckResult,
} from './harness.js'
import {
  buildQualificationSnapshot,
  isCostEligibleForAutonomousDispatch,
} from './qualification.js'
import {
  validateWorkingDirectory,
  buildFilteredEnvironment,
  computeResultDigest,
  ProcessCancellationHandle,
} from './processRunner.js'
import { HarnessError } from './types.js'
import { existsSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Capability ceiling for FCC (same as Claude Code, modulated by proxy). */
const FCC_CAPABILITIES: HarnessCapabilities = {
  textGeneration: true,
  structuredOutput: true,     // --output-format json
  streaming: false,
  filesystemRead: true,
  filesystemWrite: true,      // --permission-mode acceptEdits
  shellExecution: false,      // Denied via --tools Edit,Read
  networkAccess: false,       // Denied via tool whitelist
  toolCalling: true,
  sessionResume: false,       // --no-session-persistence
  imageInput: false,
  browserAccess: false,
  longContext: true,           // Inherits from underlying Claude models
  evidenceBasis: 'PROBED',
}

/** Authority requirements for FCC. */
const FCC_AUTHORITY_REQUIREMENTS: HarnessAuthorityRequirements = {
  filesystemRead: true,
  filesystemWrite: true,
  shellExecution: false,
  networkOutbound: false,     // Routes through local daemon only
  credentialAccess: false,
  worktreeScope: true,
  browserControl: false,
  externalMutation: false,
}

export class K1FccHarness implements DaemonHarness {
  public readonly id = 'free-claude-code'
  public readonly kind = 'DAEMON' as const
  public readonly daemonUrl: string

  private readonly configuredLauncher?: string | undefined
  private readonly strictIsolation: boolean
  private readonly mcpConfigFile?: string | undefined
  private cachedVersion?: string | undefined
  private cachedSnapshot?: HarnessQualificationSnapshot | undefined
  private readonly activeExecutions = new Map<string, ProcessCancellationHandle>()

  constructor(options?: FreeClaudeCodeHarnessOptions) {
    this.configuredLauncher = options?.launcherPath
    this.daemonUrl = options?.proxyUrl ?? DEFAULT_FCC_PROXY_URL
    this.strictIsolation = options?.strictIsolation ?? true
    this.mcpConfigFile = options?.mcpConfigFile
  }

  getLauncherPath(): string {
    return resolveFccLauncher(this.configuredLauncher) ?? 'fcc-claude'
  }

  async isDaemonRunning(): Promise<boolean> {
    const health = await checkFccProxyHealth(this.daemonUrl, 2000)
    return health.healthy
  }

  async qualify(): Promise<HarnessQualificationSnapshot> {
    const steps: import('./qualification.js').QualificationStepEvidence[] = []

    // STEP 1: DISCOVERED (launcher binary exists)
    const t0 = Date.now()
    const launcher = this.getLauncherPath()
    const launcherExists = launcher !== null && existsSync(launcher)
    steps.push({
      state: 'DISCOVERED',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t0,
      passed: launcherExists,
      details: launcherExists
        ? `FCC launcher found at: ${launcher}`
        : `FCC launcher not found at: ${launcher}`,
    })

    if (!launcherExists) {
      const snap = buildQualificationSnapshot(
        this.id, 'DAEMON', steps, FCC_CAPABILITIES, FCC_AUTHORITY_REQUIREMENTS,
        'UNKNOWN_COST',
        { blockedReason: 'FCC launcher binary not found' }
      )
      this.cachedSnapshot = snap
      return snap
    }

    // STEP 2: INSTALLED (probe for process execution response)
    // NOTE: fcc-claude --version itself tries to connect to the proxy.
    // So we verify binary existence only — INSTALLED is binary presence.
    const t1 = Date.now()
    steps.push({
      state: 'INSTALLED',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t1,
      passed: true,
      details: `FCC launcher binary exists and is accessible at: ${launcher}`,
    })

    // STEP 3: REACHABLE (daemon health probe)
    const t2 = Date.now()
    const health = await checkFccProxyHealth(this.daemonUrl, 3000)
    steps.push({
      state: 'REACHABLE',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t2,
      passed: health.healthy,
      details: health.healthy
        ? `FCC proxy healthy at ${this.daemonUrl} (latency: ${health.latencyMs}ms)`
        : `FCC proxy NOT running at ${this.daemonUrl}: ${health.error ?? 'unreachable'}. ` +
          `Start with: fcc-server`,
    })

    // FCC is LOCAL_FOSS (open-source proxy infrastructure)
    const costEligibility = 'LOCAL_FOSS' as const

    const snap = buildQualificationSnapshot(
      this.id, 'DAEMON', steps, FCC_CAPABILITIES, FCC_AUTHORITY_REQUIREMENTS,
      costEligibility,
      {
        executablePath: launcher,
        version: this.cachedVersion,
        blockedReason: health.healthy ? undefined : 'FCC proxy daemon is not running',
      }
    )
    this.cachedSnapshot = snap
    return snap
  }

  async checkReadiness(snapshot?: HarnessQualificationSnapshot): Promise<ReadinessCheckResult> {
    const snap = snapshot ?? this.cachedSnapshot
    const checkedAt = new Date().toISOString()

    if (!snap) {
      return { readinessState: 'NOT_READY', reason: 'No qualification snapshot. Run qualify() first.', checkedAt }
    }

    const costGate = isCostEligibleForAutonomousDispatch(snap.costEligibility)
    if (!costGate.allowed) {
      return { readinessState: 'COST_ELIGIBILITY_UNKNOWN', reason: costGate.reason, checkedAt }
    }

    // Daemon liveness — must check at every dispatch for DAEMON harnesses
    const daemonRunning = await this.isDaemonRunning()
    if (!daemonRunning) {
      return {
        readinessState: 'NOT_READY',
        reason: `FCC proxy daemon is not running at ${this.daemonUrl}. Start fcc-server before dispatching.`,
        checkedAt,
      }
    }

    return { readinessState: 'READY', reason: `FCC proxy running at ${this.daemonUrl}.`, checkedAt }
  }

  execute(request: ExecutionRequest): { result: Promise<ExecutionResult>; cancellation: CancellationHandle } {
    const cancellation = new ProcessCancellationHandle(request.executionId)
    this.activeExecutions.set(request.executionId, cancellation)

    const result = this._runExecution(request, cancellation).finally(() => {
      this.activeExecutions.delete(request.executionId)
    })

    return { result, cancellation }
  }

  private async _runExecution(
    request: ExecutionRequest,
    cancellation: ProcessCancellationHandle
  ): Promise<ExecutionResult> {
    const launcher = this.getLauncherPath()
    if (!launcher || !existsSync(launcher)) {
      throw new HarnessError('HARNESS_NOT_INSTALLED', this.id, 'FCC launcher not found.', request.executionId)
    }

    const validatedCwd = validateWorkingDirectory(request.workingDirectory, this.id)
    const startedAt = new Date().toISOString()

    // Create ephemeral empty MCP config for strict isolation
    let ephemeralMcpPath: string | undefined
    let effectiveMcpConfigFile = this.mcpConfigFile
    if (this.strictIsolation && !effectiveMcpConfigFile) {
      const safeId = `${request.runId}-${request.taskId}`.replace(/[^a-zA-Z0-9_-]/g, '_')
      ephemeralMcpPath = join(tmpdir(), `gravitas-mcp-${safeId}.json`)
      await writeFile(ephemeralMcpPath, JSON.stringify({ mcpServers: {} }, null, 2), 'utf8')
      effectiveMcpConfigFile = ephemeralMcpPath
    }

    try {
      const cliArgs = buildFccCliArgs({
        allowedTools: ['Edit', 'Read'],
        permissionMode: 'acceptEdits',
        outputFormat: 'json',
        strictIsolation: this.strictIsolation,
        mcpConfigFile: effectiveMcpConfigFile,
      })

      const filteredEnv = buildFilteredEnvironment(request.environmentOverrides, { stripSecretPatterns: true })

      const subprocessResult = await runSubprocess(
        {
          executable: launcher,
          args: cliArgs,
          cwd: validatedCwd,
          stdinInput: request.input,
          timeoutMs: request.timeoutPolicy.executionTimeoutMs,
          maxOutputBytes: request.maxOutputBytes,
          env: filteredEnv,
        },
        (handle) => {
          cancellation.registerKillFn(async () => {
            await handle.kill('CANCELLED')
          })
        }
      )

      const finishedAt = new Date().toISOString()
      const terminationReason: import('./types.js').ExecutionTerminationReason =
        subprocessResult.terminationReason === 'COMPLETED' ? 'COMPLETED' :
        subprocessResult.terminationReason === 'TIMEOUT' ? 'TIMEOUT' :
        subprocessResult.terminationReason === 'CANCELLED' ? 'CANCELLED' :
        'PROCESS_FAILED'

      let structuredOutput: Record<string, unknown> | null = null
      let structuredOutputValid = false
      try {
        const parsed = JSON.parse(subprocessResult.stdout.trim())
        if (typeof parsed === 'object' && parsed !== null) {
          structuredOutput = parsed as Record<string, unknown>
          structuredOutputValid = true
        }
      } catch { /* not JSON */ }

      const provenance: import('./types.js').ExecutionProvenance = {
        executionId: request.executionId,
        durableJobId: request.durableJobId,
        taskId: request.taskId,
        runId: request.runId,
        workSessionId: request.workSessionId,
        harnessId: this.id,
        harnessVersion: this.cachedVersion,
        harnessKind: 'DAEMON',
        startedAt,
        finishedAt,
        costEligibilityAtDispatch: 'LOCAL_FOSS',
        workingDirectory: validatedCwd,
      }

      const partial = {
        executionId: request.executionId,
        harnessId: this.id,
        harnessKind: 'DAEMON' as const,
        success: subprocessResult.exitCode === 0 && terminationReason === 'COMPLETED',
        terminationReason,
        startedAt,
        finishedAt,
        durationMs: subprocessResult.durationMs,
        stdout: subprocessResult.stdout,
        stderr: subprocessResult.stderr,
        stdoutTruncated: subprocessResult.stdoutTruncated,
        stderrTruncated: subprocessResult.stderrTruncated,
        structuredOutput,
        structuredOutputValid,
        exitCode: subprocessResult.exitCode,
        pid: subprocessResult.pid,
      }

      return {
        ...partial,
        provenance: { ...provenance, resultDigest: computeResultDigest(partial) },
      }
    } finally {
      if (ephemeralMcpPath) {
        try { await rm(ephemeralMcpPath, { force: true }) } catch { /* best-effort */ }
      }
    }
  }
}
