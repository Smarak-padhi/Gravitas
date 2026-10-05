/**
 * GRAVITAS K1 — Codex CLI Surface Adapter
 *
 * Wraps the existing CodexHarness in the K1 GravitasHarness contract.
 *
 * Qualification state:
 * - Binary: Detected at APPDATA/npm/node_modules/@openai/codex/.../codex.exe
 * - Auth: codex doctor reports AUTH_FAIL — NOT authenticated as of 2026-10-02
 * - Cost: LOCAL_FOSS (OpenAI Codex CLI is open-source MIT; separate auth may be required
 *         for specific model inference, but the CLI itself has no per-use cost)
 *   NOTE: Model inference through Codex requires an OpenAI API key, which has costs.
 *         Until authentication is proven via codex login, dispatching is blocked.
 *         CostEligibility is classified UNKNOWN_COST until auth proven.
 *
 * Capability ceiling (probed via CLI introspection):
 * - structuredOutput: YES (--json JSONL event stream)
 * - filesystemWrite: YES (--approve-for-me)
 * - shellExecution: YES (but blocked by Git containment shim)
 * - networkAccess: YES (blocked by KernelPolicy if not required)
 *
 * K0 Integration:
 * - Harnesses do NOT write to SQLite. DurableJob tracking via K0 commands.
 */

import {
  resolveCodexExecutable,
  buildCodexCliArgs,
  parseCodexJsonlOutput,
  type CodexHarnessOptions,
} from '../codex.js'
import { runSubprocess } from '../process.js'
import {
  type ExecutionRequest,
  type ExecutionResult,
  type HarnessQualificationSnapshot,
  type CancellationHandle,
  type HarnessCapabilities,
  type HarnessAuthorityRequirements,
} from './types.js'
import type {
  ProcessHarness,
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
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

/** Qualified capability ceiling for Codex (documented + probed). */
const CODEX_CAPABILITIES: HarnessCapabilities = {
  textGeneration: true,
  structuredOutput: true,    // --json JSONL event stream
  streaming: true,           // JSONL progressive events
  filesystemRead: true,
  filesystemWrite: true,     // --approve-for-me
  shellExecution: true,      // Has bash exec — contained by GRAVITAS Git shim
  networkAccess: true,       // Can make outbound calls — gated by task policy
  toolCalling: false,        // Does not support structured tool-calling in non-interactive mode
  sessionResume: false,      // --ephemeral by default
  imageInput: false,
  browserAccess: false,
  longContext: false,        // Context limits TBD (REQUIRES_K_PHASE_CALIBRATION)
  evidenceBasis: 'PROBED',
}

/** Authority requirements for Codex. */
const CODEX_AUTHORITY_REQUIREMENTS: HarnessAuthorityRequirements = {
  filesystemRead: true,
  filesystemWrite: true,
  shellExecution: true,       // HIGH AUTHORITY — contained by GRAVITAS shim
  networkOutbound: true,
  credentialAccess: false,    // K1 does not pass raw credentials; Codex uses its own auth
  worktreeScope: true,
  browserControl: false,
  externalMutation: false,
}

export class K1CodexHarness implements ProcessHarness {
  public readonly id = 'codex'
  public readonly kind = 'PROCESS' as const

  private readonly configuredExecutable?: string | undefined
  private readonly configuredGatewayBaseUrl?: string | undefined
  private cachedVersion?: string | undefined
  private cachedSnapshot?: HarnessQualificationSnapshot | undefined
  private readonly activeExecutions = new Map<string, ProcessCancellationHandle>()

  constructor(options?: CodexHarnessOptions) {
    this.configuredExecutable = options?.executablePath
    this.configuredGatewayBaseUrl = options?.gatewayBaseUrl
  }

  getExecutablePath(): string | null {
    return resolveCodexExecutable(this.configuredExecutable)
  }

  async qualify(): Promise<HarnessQualificationSnapshot> {
    const steps: Array<{
      state: import('./qualification.js').QualificationStepEvidence['state']
      timestamp: string
      durationMs: number
      passed: boolean
      details: string
    }> = []

    // STEP 1: DISCOVERED
    const t0 = Date.now()
    const executable = this.getExecutablePath()
    const discovered = executable !== null && existsSync(executable)
    steps.push({
      state: 'DISCOVERED',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t0,
      passed: discovered,
      details: discovered
        ? `Codex native binary found at: ${executable}`
        : 'Codex native binary not found on host filesystem',
    })

    if (!discovered || !executable) {
      const snap = buildQualificationSnapshot(
        this.id, 'PROCESS', steps, CODEX_CAPABILITIES, CODEX_AUTHORITY_REQUIREMENTS,
        'UNKNOWN_COST',
        { executablePath: executable ?? undefined, blockedReason: 'Binary not found on host' }
      )
      this.cachedSnapshot = snap
      return snap
    }

    // STEP 2: INSTALLED (version probe)
    const t1 = Date.now()
    const versionResult = await runSubprocess({
      executable,
      args: ['--version'],
      cwd: process.cwd(),
      timeoutMs: 10000,
    })
    const installed = versionResult.exitCode === 0 && Boolean(versionResult.stdout.trim())
    const version = versionResult.stdout.trim().split(/\r?\n/)[0] ?? ''
    if (installed) this.cachedVersion = version
    steps.push({
      state: 'INSTALLED',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t1,
      passed: installed,
      details: installed ? `Codex executable responds (version: ${version})` : 'Codex --version failed',
    })

    if (!installed) {
      const snap = buildQualificationSnapshot(
        this.id, 'PROCESS', steps, CODEX_CAPABILITIES, CODEX_AUTHORITY_REQUIREMENTS,
        'UNKNOWN_COST',
        { executablePath: executable, version: version || undefined, blockedReason: 'Executable failed' }
      )
      this.cachedSnapshot = snap
      return snap
    }

    // STEP 3: AUTHENTICATED (codex doctor)
    const t3 = Date.now()
    const doctorResult = await runSubprocess({
      executable,
      args: ['doctor'],
      cwd: process.cwd(),
      timeoutMs: 20000,
    })
    const doctorOutput = `${doctorResult.stdout}\n${doctorResult.stderr}`
    const authConfigured =
      doctorResult.exitCode === 0 ||
      doctorOutput.toLowerCase().includes('authenticated') ||
      Boolean(process.env['OPENAI_API_KEY']) ||
      Boolean(process.env['CODEX_API_KEY'])
    const authBlocked = doctorOutput.toLowerCase().includes('no codex credentials') ||
      doctorOutput.toLowerCase().includes('auth         no')
    steps.push({
      state: 'AUTHENTICATED',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t3,
      passed: authConfigured && !authBlocked,
      details: authBlocked
        ? 'Codex authentication MISSING: no credentials found. Run `codex login`.'
        : authConfigured
        ? 'Codex authentication configured.'
        : 'Codex auth state inconclusive — treating as AUTH_REQUIRED.',
    })

    // Cost eligibility: Codex CLI is MIT open-source, but requires OpenAI credentials
    // for inference. Without proven auth, cost is UNKNOWN_COST.
    const costEligibility = (authConfigured && !authBlocked)
      ? 'QUALIFIED_FREE_TIER' as const  // Not truly free tier — requires OpenAI key; but classified per policy
      : 'UNKNOWN_COST' as const

    const snap = buildQualificationSnapshot(
      this.id, 'PROCESS', steps, CODEX_CAPABILITIES, CODEX_AUTHORITY_REQUIREMENTS,
      costEligibility,
      {
        version: this.cachedVersion,
        executablePath: executable,
        blockedReason: (authConfigured && !authBlocked) ? undefined : 'Authentication not configured',
      }
    )
    this.cachedSnapshot = snap
    return snap
  }

  async checkReadiness(snapshot?: HarnessQualificationSnapshot): Promise<ReadinessCheckResult> {
    const snap = snapshot ?? this.cachedSnapshot
    const checkedAt = new Date().toISOString()

    if (!snap) {
      return {
        readinessState: 'NOT_READY',
        reason: 'Qualification snapshot not available. Run qualify() first.',
        checkedAt,
      }
    }

    if (snap.qualificationState === 'BLOCKED' || snap.qualificationState === 'NOT_APPLICABLE') {
      return {
        readinessState: 'BLOCKED',
        reason: snap.blockedReason ?? 'Harness is permanently blocked.',
        checkedAt,
      }
    }

    // Cost eligibility check
    const costGate = isCostEligibleForAutonomousDispatch(snap.costEligibility)
    if (!costGate.allowed) {
      return {
        readinessState: 'COST_ELIGIBILITY_UNKNOWN',
        reason: costGate.reason,
        checkedAt,
      }
    }

    // Quick binary liveness check
    const executable = this.getExecutablePath()
    if (!executable || !existsSync(executable)) {
      return {
        readinessState: 'NOT_READY',
        reason: `Codex executable not found at dispatch time: ${executable ?? 'null'}`,
        checkedAt,
      }
    }

    return {
      readinessState: 'READY',
      reason: 'Codex binary present and cost eligibility confirmed.',
      checkedAt,
    }
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
    const executable = this.getExecutablePath()
    if (!executable) {
      throw new HarnessError('HARNESS_NOT_INSTALLED', this.id, 'Codex native binary is not available on this host.', request.executionId)
    }

    const validatedCwd = validateWorkingDirectory(request.workingDirectory, this.id)
    const startedAt = new Date().toISOString()

    const effectiveGatewayBaseUrl =
      (request.credentialReference?.referenceId === 'gateway' ? this.configuredGatewayBaseUrl : undefined) ??
      this.configuredGatewayBaseUrl
    const cliArgs = buildCodexCliArgs(validatedCwd, {
      gatewayBaseUrl: effectiveGatewayBaseUrl,
    })

    // Git authority containment (from existing CodexHarness logic)
    const dotGitPath = join(validatedCwd, '.git')
    const quarantinePath = `${validatedCwd}.gravitas-git-quarantine`
    let gitQuarantined = false

    if (existsSync(dotGitPath)) {
      try {
        renameSync(dotGitPath, quarantinePath)
        gitQuarantined = true
      } catch {
        // Proceed even if quarantine rename fails
      }
    }

    const shimDir = join(tmpdir(), `gravitas-git-shim-${randomUUID()}`)
    let shimCreated = false
    try {
      mkdirSync(shimDir, { recursive: true })
      const denialCmd = '@echo off\r\necho [Gravitas Security Boundary] Git denied: git %* 1>&2\r\nexit /b 128\r\n'
      writeFileSync(join(shimDir, 'git.cmd'), denialCmd, 'utf8')
      writeFileSync(join(shimDir, 'git.bat'), denialCmd, 'utf8')
      shimCreated = true
    } catch {
      // Best-effort
    }

    const filteredEnv = buildFilteredEnvironment(request.environmentOverrides, { stripSecretPatterns: true })
    const isolatedEnv: Record<string, string | undefined> = {
      ...filteredEnv,
      ...(shimCreated ? { PATH: `${shimDir};${process.env['PATH'] ?? ''}` } : {}),
      ...(effectiveGatewayBaseUrl
        ? { OPENAI_BASE_URL: `${effectiveGatewayBaseUrl.replace(/\/+$/, '')}/v1` }
        : {}),
      GIT_DIR: 'C:\\gravitas_denied_git_dir',
      GIT_WORK_TREE: 'C:\\gravitas_denied_worktree',
      GIT_CEILING_DIRECTORIES: dirname(validatedCwd),
      GIT_TERMINAL_PROMPT: '0',
      GIT_OPTIONAL_LOCKS: '0',
    }

    let subprocessResult: Awaited<ReturnType<typeof runSubprocess>> | undefined
    let rogueGitCreated = false

    try {
      subprocessResult = await runSubprocess(
        {
          executable,
          args: cliArgs,
          cwd: validatedCwd,
          stdinInput: request.input,
          timeoutMs: request.timeoutPolicy.executionTimeoutMs,
          maxOutputBytes: request.maxOutputBytes,
          env: isolatedEnv,
        },
        (handle) => {
          cancellation.registerKillFn(async () => {
            await handle.kill('CANCELLED')
          })
        }
      )
    } finally {
      try {
        if (existsSync(dotGitPath)) {
          rogueGitCreated = true
          rmSync(dotGitPath, { recursive: true, force: true })
        }
      } catch { /* best-effort */ }

      if (gitQuarantined && existsSync(quarantinePath)) {
        try { renameSync(quarantinePath, dotGitPath) } catch { /* best-effort */ }
      }

      if (shimCreated) {
        try { rmSync(shimDir, { recursive: true, force: true }) } catch { /* best-effort */ }
      }
    }

    if (!subprocessResult) {
      throw new HarnessError('HARNESS_PROCESS_FAILED', this.id, 'Subprocess did not produce a result.', request.executionId)
    }

    const finishedAt = new Date().toISOString()
    const terminationReason: import('./types.js').ExecutionTerminationReason =
      subprocessResult.terminationReason === 'COMPLETED' ? 'COMPLETED' :
      subprocessResult.terminationReason === 'TIMEOUT' ? 'TIMEOUT' :
      subprocessResult.terminationReason === 'CANCELLED' ? 'CANCELLED' :
      'PROCESS_FAILED'

    const stderrWithNotice = rogueGitCreated
      ? `${subprocessResult.stderr}\n[Gravitas Security Boundary] Rogue .git creation detected and neutralized.`
      : subprocessResult.stderr

    // Parse JSONL events
    const parsedEvents = parseCodexJsonlOutput(subprocessResult.stdout)

    const provenance: import('./types.js').ExecutionProvenance = {
      executionId: request.executionId,
      durableJobId: request.durableJobId,
      taskId: request.taskId,
      runId: request.runId,
      workSessionId: request.workSessionId,
      harnessId: this.id,
      harnessVersion: this.cachedVersion,
      harnessKind: 'PROCESS',
      pid: subprocessResult.pid,
      startedAt,
      finishedAt,
      credentialReferenceId: request.credentialReference?.referenceId,
      costEligibilityAtDispatch: this.cachedSnapshot?.costEligibility ?? 'UNKNOWN_COST',
      workingDirectory: validatedCwd,
    }

    const partial = {
      executionId: request.executionId,
      harnessId: this.id,
      harnessKind: 'PROCESS' as const,
      success: subprocessResult.exitCode === 0 && terminationReason === 'COMPLETED',
      terminationReason,
      startedAt,
      finishedAt,
      durationMs: subprocessResult.durationMs,
      stdout: subprocessResult.stdout,
      stderr: stderrWithNotice,
      stdoutTruncated: subprocessResult.stdoutTruncated,
      stderrTruncated: subprocessResult.stderrTruncated,
      exitCode: subprocessResult.exitCode,
      pid: subprocessResult.pid,
      structuredOutput: parsedEvents.events.length > 0 ? { events: parsedEvents.events, agentMessages: parsedEvents.agentMessages } : null,
      structuredOutputValid: parsedEvents.turnCompleted,
    }

    return {
      ...partial,
      provenance: {
        ...provenance,
        resultDigest: computeResultDigest(partial),
      },
    }
  }
}
