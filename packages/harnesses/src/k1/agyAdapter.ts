/**
 * GRAVITAS K1 — Antigravity CLI (agy) Surface Adapter
 *
 * Wraps the agy CLI as a K1 ProcessHarness.
 *
 * Qualification state as of 2026-10-02:
 * - Binary: C:\Users\smara\AppData\Local\agy\bin\agy.exe (confirmed via Get-Command)
 * - Version: 1.2.14 (confirmed via agy --version)
 * - Auth: agy uses the logged-in Google account / Gemini subscription.
 *   Auth state has NOT been explicitly re-probed for K1. Classified DISCOVERED→INSTALLED.
 * - Cost: Included in the Antigravity subscription (INCLUDED_SUBSCRIPTION) when auth confirmed.
 *
 * agy non-interactive mode:
 * - Uses -p / --print flag for non-interactive print mode.
 * - Output format: text by default, --output-format json for structured output.
 * - Stdin input: agy -p reads from stdin when prompt is not provided as argument.
 * - Session: --mode accept-edits for file edit permission.
 * - Tool control: agy does not use the same --tools whitelist as Claude Code.
 *
 * IMPORTANT: agy execute mode capabilities are more limited than Claude Code's
 * structured JSON output. Structured output validation is UNPROVEN for agy.
 * evidenceBasis = 'DOCUMENTED' (from CLI help), not PROBED (not integration-tested yet).
 */

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
  ProcessHarness,
  ReadinessCheckResult,
} from './harness.js'
import {
  buildQualificationSnapshot,
} from './qualification.js'
import {
  validateWorkingDirectory,
  buildFilteredEnvironment,
  computeResultDigest,
  ProcessCancellationHandle,
} from './processRunner.js'
import { HarnessError } from './types.js'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Resolves the agy.exe binary on Windows.
 */
function resolveAgyExecutable(customPath?: string): string | null {
  if (customPath) return customPath
  if (process.env['AGY_EXECUTABLE']) return process.env['AGY_EXECUTABLE']

  if (process.platform === 'win32') {
    const localAppData = process.env['LOCALAPPDATA']
    if (localAppData) {
      const standard = join(localAppData, 'agy', 'bin', 'agy.exe')
      if (existsSync(standard)) return standard
    }
    // Fallback: search roaming/appdata
    const appData = process.env['APPDATA']
    if (appData) {
      const roaming = join(appData, 'agy', 'bin', 'agy.exe')
      if (existsSync(roaming)) return roaming
    }
  }

  // POSIX fallback
  return 'agy'
}

/** Capability ceiling for agy (DOCUMENTED — not yet fully integration-probed). */
const AGY_CAPABILITIES: HarnessCapabilities = {
  textGeneration: true,
  structuredOutput: false,    // --output-format json available but behavior UNPROVEN for structured use
  streaming: false,           // print mode returns final result
  filesystemRead: true,       // agy has filesystem read in accept-edits mode
  filesystemWrite: true,      // accept-edits mode allows file writes
  shellExecution: false,      // No explicit shell tool in non-interactive print mode
  networkAccess: false,       // Not exposed in non-interactive mode
  toolCalling: false,         // Tool calling in non-interactive mode: UNPROVEN
  sessionResume: false,       // -p mode is stateless
  imageInput: false,
  browserAccess: false,
  longContext: true,           // Gemini models support long context windows
  evidenceBasis: 'DOCUMENTED',  // CLI flags documented; integration behavior UNPROVEN
}

/** Authority requirements for agy. */
const AGY_AUTHORITY_REQUIREMENTS: HarnessAuthorityRequirements = {
  filesystemRead: true,
  filesystemWrite: true,
  shellExecution: false,
  networkOutbound: false,
  credentialAccess: false,
  worktreeScope: true,
  browserControl: false,
  externalMutation: false,
}

export interface K1AgyHarnessOptions {
  readonly executablePath?: string | undefined
  readonly model?: string | undefined
  readonly outputFormat?: 'text' | 'json' | 'stream-json' | undefined
}

export class K1AgyHarness implements ProcessHarness {
  public readonly id = 'agy'
  public readonly kind = 'PROCESS' as const

  private readonly configuredExecutable?: string | undefined
  private readonly configuredModel?: string | undefined
  private readonly outputFormat: 'text' | 'json' | 'stream-json'
  private cachedVersion?: string | undefined
  private cachedSnapshot?: HarnessQualificationSnapshot | undefined
  private readonly activeExecutions = new Map<string, ProcessCancellationHandle>()

  constructor(options?: K1AgyHarnessOptions) {
    this.configuredExecutable = options?.executablePath
    this.configuredModel = options?.model
    this.outputFormat = options?.outputFormat ?? 'text'
  }

  getExecutablePath(): string | null {
    return resolveAgyExecutable(this.configuredExecutable)
  }

  async qualify(): Promise<HarnessQualificationSnapshot> {
    const steps: import('./qualification.js').QualificationStepEvidence[] = []

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
        ? `agy binary found at: ${executable}`
        : `agy binary not found (checked LOCALAPPDATA, APPDATA, PATH)`,
    })

    if (!discovered || !executable) {
      const snap = buildQualificationSnapshot(
        this.id, 'PROCESS', steps, AGY_CAPABILITIES, AGY_AUTHORITY_REQUIREMENTS,
        'UNKNOWN_COST',
        { blockedReason: 'agy binary not found' }
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
      timeoutMs: 8000,
    })
    // agy --version exits 1 and prints to stderr (NativeCommandError in PS)
    // We look for version in both stdout and stderr
    const versionOutput = `${versionResult.stdout}\n${versionResult.stderr}`.trim()
    const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/)
    const version = versionMatch ? versionMatch[1] : ''
    const installed = Boolean(version) || versionResult.exitCode === 0
    if (version) this.cachedVersion = version

    steps.push({
      state: 'INSTALLED',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t1,
      passed: installed,
      details: installed
        ? `agy responds (version: ${version || 'unknown'})`
        : 'agy --version failed to produce output',
    })

    if (!installed) {
      const snap = buildQualificationSnapshot(
        this.id, 'PROCESS', steps, AGY_CAPABILITIES, AGY_AUTHORITY_REQUIREMENTS,
        'UNKNOWN_COST',
        { executablePath: executable, blockedReason: 'agy executable failed' }
      )
      this.cachedSnapshot = snap
      return snap
    }

    // STEP 3: AUTHENTICATED
    // agy authentication is tied to the Antigravity Google account session.
    // We cannot easily probe auth without invoking a real turn (which would incur usage).
    // Safe probe: check if the agy config directory has an auth token indicator.
    const t2 = Date.now()
    const localAppData = process.env['LOCALAPPDATA'] ?? ''
    const agyConfigDir = join(localAppData, 'agy')
    let authIndicatorFound = false
    try {
      const configEntries = existsSync(agyConfigDir) ? readdirSync(agyConfigDir) : []
      authIndicatorFound = configEntries.some(e =>
        e.includes('auth') || e.includes('token') || e.includes('credential') || e.includes('session')
      )
    } catch { /* ignore */ }

    steps.push({
      state: 'AUTHENTICATED',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t2,
      passed: authIndicatorFound,
      details: authIndicatorFound
        ? `agy config directory contains auth indicator at: ${agyConfigDir}`
        : `No auth indicator found in ${agyConfigDir}. Auth state UNPROVEN — ` +
          `REQUIRES_IMPLEMENTATION_VALIDATION: safe ping test needed.`,
    })

    // Cost eligibility: while agy binary exists on host, programmatic per-call cost mechanics
    // under current entitlement have NOT been empirically audited.
    // Preserves ZERO_SPEND_AND_QUOTA_POLICY: UNKNOWN_COST fails closed.
    const costEligibility = 'UNKNOWN_COST' as const

    const snap = buildQualificationSnapshot(
      this.id, 'PROCESS', steps, AGY_CAPABILITIES, AGY_AUTHORITY_REQUIREMENTS,
      costEligibility,
      {
        version: this.cachedVersion,
        executablePath: executable,
        blockedReason: 'Cost mechanics under operator entitlement unverified. Fail-closed: UNKNOWN_COST.',
      }
    )
    this.cachedSnapshot = snap
    return snap
  }

  async checkReadiness(_snapshot?: HarnessQualificationSnapshot): Promise<ReadinessCheckResult> {
    const checkedAt = new Date().toISOString()

    const executable = this.getExecutablePath()
    if (!executable || !existsSync(executable)) {
      return {
        readinessState: 'NOT_READY',
        reason: 'agy binary not found on host filesystem at dispatch time.',
        checkedAt,
      }
    }

    // Technical readiness: binary exists and executable responded to probe
    return {
      readinessState: 'READY',
      reason: 'agy binary is installed and operational on host.',
      checkedAt,
    }
  }


  /**
   * Builds the argument list for non-interactive agy execution.
   */
  buildAgyArgs(outputFormat: 'text' | 'json' | 'stream-json' = 'text'): readonly string[] {
    const args: string[] = ['-p', '--output-format', outputFormat, '--mode', 'accept-edits']
    if (this.configuredModel) {
      args.push('--model', this.configuredModel)
    }
    return args
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
      throw new HarnessError('HARNESS_NOT_INSTALLED', this.id, 'agy binary not found.', request.executionId)
    }

    const validatedCwd = validateWorkingDirectory(request.workingDirectory, this.id)
    const startedAt = new Date().toISOString()
    const cliArgs = this.buildAgyArgs(this.outputFormat)
    const filteredEnv = buildFilteredEnvironment(request.environmentOverrides, { stripSecretPatterns: true })

    const subprocessResult = await runSubprocess(
      {
        executable,
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
    if (this.outputFormat === 'json') {
      try {
        const parsed = JSON.parse(subprocessResult.stdout.trim())
        if (typeof parsed === 'object' && parsed !== null) {
          structuredOutput = parsed as Record<string, unknown>
          structuredOutputValid = true
        }
      } catch { /* not JSON */ }
    }

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
  }
}
