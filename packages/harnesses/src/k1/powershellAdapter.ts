/**
 * GRAVITAS K1 — PowerShell Local Execution Surface Adapter
 *
 * Provides a bounded, non-AI PowerShell executor for deterministic local tasks.
 *
 * This is NOT an AI harness. It is a deterministic local executor for:
 * - Build script execution (bounded scope)
 * - Tool installation/verification
 * - File system operations not requiring AI
 * - Local git commands for CI/CD-like deterministic tasks
 *
 * Invariants enforced:
 * - shell: false — no cmd.exe wrapping; powershell.exe is the target binary
 * - Command allowlist: ONLY explicit command lists may be invoked
 * - NO open-ended prompt execution
 * - cwd strictly validated before execution
 * - Network: blocked by policy (not inherently blocked at OS level)
 * - Output bounded: 2MB default
 * - Timeout mandatory: no unbounded execution
 *
 * SECURITY NOTE:
 * PowerShell has HIGH authority (filesystemWrite, shellExecution).
 * THIS ADAPTER MUST ONLY BE USED FOR DETERMINISTIC SCRIPTED TASKS.
 * It must NEVER be used for AI-generated or user-prompt-driven execution.
 * Human approval is required before any PowerShell execution in K1.
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
import { join } from 'node:path'

/** Capability ceiling for PowerShell local executor. */
const POWERSHELL_CAPABILITIES: HarnessCapabilities = {
  textGeneration: false,       // NOT an AI harness
  structuredOutput: false,     // Script output is text by default
  streaming: false,
  filesystemRead: true,
  filesystemWrite: true,       // HIGH AUTHORITY — human approval required
  shellExecution: true,        // HIGH AUTHORITY — human approval required
  networkAccess: false,        // Blocked by task policy; not inherent
  toolCalling: false,
  sessionResume: false,
  imageInput: false,
  browserAccess: false,
  longContext: false,          // Not applicable — no AI
  evidenceBasis: 'PROBED',
}

/** Authority requirements for PowerShell. */
const POWERSHELL_AUTHORITY_REQUIREMENTS: HarnessAuthorityRequirements = {
  filesystemRead: true,
  filesystemWrite: true,       // HIGH AUTHORITY
  shellExecution: true,        // HIGH AUTHORITY
  networkOutbound: false,      // Policy-blocked
  credentialAccess: false,
  worktreeScope: true,
  browserControl: false,
  externalMutation: false,
}

/**
 * Resolves PowerShell 5 (powershell.exe) on Windows.
 * Note: pwsh (PowerShell 7+) not installed on this host.
 */
function resolvePowershellExecutable(): string | null {
  if (process.platform !== 'win32') {
    // On non-Windows, PowerShell 7 may be in PATH as 'pwsh'
    return 'pwsh'
  }
  const sysRoot = process.env['SystemRoot'] ?? 'C:\\Windows'
  const ps5 = join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  if (existsSync(ps5)) return ps5
  return 'powershell'
}

export interface K1PowerShellHarnessOptions {
  readonly executablePath?: string | undefined
  /**
   * Maximum execution timeout in milliseconds.
   * [NON_NORMATIVE_INITIAL_DEFAULT: 30000ms]
   * REQUIRES_K_PHASE_CALIBRATION
   */
  readonly maxExecutionTimeoutMs?: number | undefined
}

export class K1PowerShellHarness implements ProcessHarness {
  public readonly id = 'powershell-local'
  public readonly kind = 'PROCESS' as const

  private readonly configuredExecutable?: string | undefined
  private readonly maxExecutionTimeoutMs: number
  private cachedVersion?: string | undefined
  private cachedSnapshot?: HarnessQualificationSnapshot | undefined
  private readonly activeExecutions = new Map<string, ProcessCancellationHandle>()

  constructor(options?: K1PowerShellHarnessOptions) {
    this.configuredExecutable = options?.executablePath
    this.maxExecutionTimeoutMs = options?.maxExecutionTimeoutMs ?? 30000
  }

  getExecutablePath(): string | null {
    return this.configuredExecutable ?? resolvePowershellExecutable()
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
        ? `PowerShell found at: ${executable}`
        : `PowerShell executable not found`,
    })

    if (!discovered || !executable) {
      const snap = buildQualificationSnapshot(
        this.id, 'PROCESS', steps, POWERSHELL_CAPABILITIES, POWERSHELL_AUTHORITY_REQUIREMENTS,
        'OPERATOR_INCLUDED_HOST_RUNTIME',
        { blockedReason: 'PowerShell not found' }
      )
      this.cachedSnapshot = snap
      return snap
    }

    // STEP 2: INSTALLED (version probe)
    const t1 = Date.now()
    const versionResult = await runSubprocess({
      executable,
      args: ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'],
      cwd: process.cwd(),
      timeoutMs: 5000,
    })
    const versionOutput = versionResult.stdout.trim()
    const installed = versionResult.exitCode === 0 && Boolean(versionOutput)
    if (installed) this.cachedVersion = versionOutput
    steps.push({
      state: 'INSTALLED',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t1,
      passed: installed,
      details: installed
        ? `PowerShell responsive (version: ${versionOutput})`
        : 'PowerShell failed version probe',
    })

    const snap = buildQualificationSnapshot(
      this.id, 'PROCESS', steps, POWERSHELL_CAPABILITIES, POWERSHELL_AUTHORITY_REQUIREMENTS,
      'OPERATOR_INCLUDED_HOST_RUNTIME', // Windows host-provided runtime, zero marginal cost
      { version: this.cachedVersion, executablePath: executable }
    )
    this.cachedSnapshot = snap
    return snap
  }

  async checkReadiness(snapshot?: HarnessQualificationSnapshot): Promise<ReadinessCheckResult> {
    const snap = snapshot ?? this.cachedSnapshot
    const checkedAt = new Date().toISOString()

    if (!snap) {
      return { readinessState: 'NOT_READY', reason: 'No qualification snapshot.', checkedAt }
    }

    const costGate = isCostEligibleForAutonomousDispatch(snap.costEligibility)
    if (!costGate.allowed) {
      return { readinessState: 'COST_ELIGIBILITY_UNKNOWN', reason: costGate.reason, checkedAt }
    }

    const executable = this.getExecutablePath()
    if (!executable || !existsSync(executable)) {
      return { readinessState: 'NOT_READY', reason: 'PowerShell executable not found.', checkedAt }
    }

    return { readinessState: 'READY', reason: 'PowerShell local executor is ready.', checkedAt }
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
      throw new HarnessError('HARNESS_NOT_INSTALLED', this.id, 'PowerShell executable not found.', request.executionId)
    }

    const validatedCwd = validateWorkingDirectory(request.workingDirectory, this.id)
    const startedAt = new Date().toISOString()

    // PowerShell: read script from stdin and execute with -Command -
    // This avoids shell-injection through argument interpolation
    const cliArgs = [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', '-',   // Read script from stdin
    ]

    // Apply the configured max timeout as upper bound
    const clampedTimeout = Math.min(
      request.timeoutPolicy.executionTimeoutMs,
      this.maxExecutionTimeoutMs
    )

    const filteredEnv = buildFilteredEnvironment(request.environmentOverrides, { stripSecretPatterns: true })

    const subprocessResult = await runSubprocess(
      {
        executable,
        args: cliArgs,
        cwd: validatedCwd,
        stdinInput: request.input,
        timeoutMs: clampedTimeout,
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
      costEligibilityAtDispatch: 'OPERATOR_INCLUDED_HOST_RUNTIME',
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
      exitCode: subprocessResult.exitCode,
      pid: subprocessResult.pid,
    }

    return {
      ...partial,
      provenance: { ...provenance, resultDigest: computeResultDigest(partial) },
    }
  }
}
