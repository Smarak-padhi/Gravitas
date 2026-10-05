/**
 * GRAVITAS K1 — Claude Code CLI Surface Adapter
 *
 * Wraps the existing ClaudeCodeHarness in the K1 GravitasHarness contract.
 *
 * Qualification state as of 2026-10-02:
 * - Binary: Detected at APPDATA/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe
 * - Version: 2.1.276 (Claude Code)
 * - Auth: claude auth status → { "loggedIn": false, "authMethod": "none" }
 *   → STATE: AUTHENTICATED = FAIL (not logged in, no ANTHROPIC_API_KEY)
 *   → QUALIFICATION_CEILING: INSTALLED
 *   → DISPATCH_STATE: NOT_READY (auth required)
 *
 * Cost eligibility:
 *   UNKNOWN_COST until auth established.
 *   When authenticated via Claude Pro subscription: INCLUDED_SUBSCRIPTION
 *   When using ANTHROPIC_API_KEY: PAID (unless explicitly authorized)
 *
 * K0 Integration:
 * - Harnesses do NOT write to SQLite directly.
 * - ExecutionRequest.durableJobId references the K0 DurableJob being executed.
 */

import {
  resolveClaudeExecutable,
  buildClaudeCliArgs,
} from '../claude-code.js'
import { runSubprocess } from '../process.js'
import {
  type ExecutionRequest,
  type ExecutionResult,
  type HarnessQualificationSnapshot,
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
import type { CancellationHandle } from './types.js'
import { existsSync } from 'node:fs'

/** Capability ceiling for Claude Code (probed + documented). */
const CLAUDE_CODE_CAPABILITIES: HarnessCapabilities = {
  textGeneration: true,
  structuredOutput: true,     // --output-format json
  streaming: false,           // JSON output is final-only in headless mode
  filesystemRead: true,
  filesystemWrite: true,      // --permission-mode acceptEdits
  shellExecution: false,      // Bash tool denied via tool whitelist
  networkAccess: false,       // WebFetch denied via tool whitelist (when Edit,Read only)
  toolCalling: true,          // Supports structured tool calls (Edit, Read)
  sessionResume: false,       // --no-session-persistence
  imageInput: false,
  browserAccess: false,
  longContext: true,           // Claude 3.5 Sonnet+ supports 200k tokens
  evidenceBasis: 'PROBED',
}

/** Authority requirements for Claude Code. */
const CLAUDE_CODE_AUTHORITY_REQUIREMENTS: HarnessAuthorityRequirements = {
  filesystemRead: true,
  filesystemWrite: true,      // acceptEdits mode
  shellExecution: false,      // Denied via --tools Edit,Read
  networkOutbound: false,     // Denied when using Edit,Read tool whitelist
  credentialAccess: false,    // No credential injection via GRAVITAS
  worktreeScope: true,        // cwd must be bound to allocated worktree
  browserControl: false,
  externalMutation: false,
}

export class K1ClaudeCodeHarness implements ProcessHarness {
  public readonly id = 'claude-code'
  public readonly kind = 'PROCESS' as const

  private readonly configuredExecutable?: string | undefined
  private cachedVersion?: string | undefined
  private cachedSnapshot?: HarnessQualificationSnapshot | undefined
  private readonly activeExecutions = new Map<string, ProcessCancellationHandle>()

  constructor(options?: { executablePath?: string }) {
    this.configuredExecutable = options?.executablePath
  }

  getExecutablePath(): string | null {
    return resolveClaudeExecutable(this.configuredExecutable)
  }

  async qualify(): Promise<HarnessQualificationSnapshot> {
    const steps: import('./qualification.js').QualificationStepEvidence[] = []
    const executable = this.getExecutablePath()

    // STEP 1: DISCOVERED
    const t0 = Date.now()
    const discovered = executable !== null && existsSync(executable)
    steps.push({
      state: 'DISCOVERED',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t0,
      passed: discovered,
      details: discovered
        ? `Claude Code binary found at: ${executable}`
        : 'Claude Code binary not found on host filesystem',
    })

    if (!discovered || !executable) {
      const snap = buildQualificationSnapshot(
        this.id, 'PROCESS', steps, CLAUDE_CODE_CAPABILITIES, CLAUDE_CODE_AUTHORITY_REQUIREMENTS,
        'UNKNOWN_COST',
        { blockedReason: 'Claude Code binary not found' }
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
    const installed = versionResult.exitCode === 0 && Boolean(versionResult.stdout.trim())
    const version = versionResult.stdout.trim().split(/\r?\n/)[0] ?? ''
    if (installed) this.cachedVersion = version
    steps.push({
      state: 'INSTALLED',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t1,
      passed: installed,
      details: installed ? `Claude Code responds (version: ${version})` : 'Claude Code --version failed',
    })

    if (!installed) {
      const snap = buildQualificationSnapshot(
        this.id, 'PROCESS', steps, CLAUDE_CODE_CAPABILITIES, CLAUDE_CODE_AUTHORITY_REQUIREMENTS,
        'UNKNOWN_COST',
        { executablePath: executable, version: version || undefined, blockedReason: 'Executable failed' }
      )
      this.cachedSnapshot = snap
      return snap
    }

    // STEP 3: AUTHENTICATED (claude auth status)
    const t2 = Date.now()
    const authResult = await runSubprocess({
      executable,
      args: ['auth', 'status'],
      cwd: process.cwd(),
      timeoutMs: 8000,
    })
    let loggedIn = false
    let authMethod = 'none'
    try {
      const parsed = JSON.parse(authResult.stdout) as { loggedIn?: boolean; authMethod?: string }
      loggedIn = parsed.loggedIn === true
      authMethod = parsed.authMethod ?? 'none'
    } catch {
      loggedIn = Boolean(process.env['ANTHROPIC_API_KEY'])
      authMethod = process.env['ANTHROPIC_API_KEY'] ? 'api_key' : 'none'
    }
    steps.push({
      state: 'AUTHENTICATED',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t2,
      passed: loggedIn,
      details: loggedIn
        ? `Claude Code authenticated (authMethod: ${authMethod})`
        : 'Claude Code NOT authenticated. loggedIn=false, authMethod=none. Run `claude login` or set ANTHROPIC_API_KEY.',
    })

    // Cost eligibility based on auth method
    // authMethod 'claude_ai' = Claude.ai subscription = INCLUDED_SUBSCRIPTION
    // authMethod 'api_key' = Anthropic API = PAID (requires human authorization)
    // none = UNKNOWN_COST
    const costEligibility = loggedIn && authMethod === 'claude_ai'
      ? 'INCLUDED_SUBSCRIPTION' as const
      : loggedIn && authMethod === 'api_key'
        ? 'UNKNOWN_COST' as const  // API key may incur costs — needs explicit policy
        : 'UNKNOWN_COST' as const

    const snap = buildQualificationSnapshot(
      this.id, 'PROCESS', steps, CLAUDE_CODE_CAPABILITIES, CLAUDE_CODE_AUTHORITY_REQUIREMENTS,
      costEligibility,
      {
        version: this.cachedVersion,
        executablePath: executable,
        blockedReason: loggedIn ? undefined : 'Authentication required',
      }
    )
    this.cachedSnapshot = snap
    return snap
  }

  async checkReadiness(snapshot?: HarnessQualificationSnapshot): Promise<ReadinessCheckResult> {
    const snap = snapshot ?? this.cachedSnapshot
    const checkedAt = new Date().toISOString()

    if (!snap) {
      return { readinessState: 'NOT_READY', reason: 'No qualification snapshot available.', checkedAt }
    }
    if (snap.qualificationState === 'BLOCKED' || snap.qualificationState === 'NOT_APPLICABLE') {
      return { readinessState: 'BLOCKED', reason: snap.blockedReason ?? 'Permanently blocked.', checkedAt }
    }

    const costGate = isCostEligibleForAutonomousDispatch(snap.costEligibility)
    if (!costGate.allowed) {
      return { readinessState: 'COST_ELIGIBILITY_UNKNOWN', reason: costGate.reason, checkedAt }
    }

    // Quick auth re-check at dispatch time
    const executable = this.getExecutablePath()
    if (!executable || !existsSync(executable)) {
      return { readinessState: 'NOT_READY', reason: 'Claude Code executable not found.', checkedAt }
    }

    // Do NOT re-run full auth check on every dispatch — that would be too slow.
    // Trust the qualification snapshot for auth; re-qualify if auth changes.
    const authQualified = snap.qualificationState === 'AUTHENTICATED' ||
      snap.qualificationState === 'REACHABLE' ||
      snap.qualificationState === 'CAPABILITY_PROBED' ||
      snap.qualificationState === 'CONTAINMENT_TESTED' ||
      snap.qualificationState === 'QUALIFIED'

    if (!authQualified) {
      return {
        readinessState: 'NOT_READY',
        reason: `Claude Code qualification only at ${snap.qualificationState} — auth not proven.`,
        checkedAt,
      }
    }

    return { readinessState: 'READY', reason: 'Claude Code binary present and auth confirmed in qualification.', checkedAt }
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
      throw new HarnessError('HARNESS_NOT_INSTALLED', this.id, 'Claude Code binary not found.', request.executionId)
    }

    const validatedCwd = validateWorkingDirectory(request.workingDirectory, this.id)
    const startedAt = new Date().toISOString()

    const cliArgs = buildClaudeCliArgs({
      allowedTools: ['Edit', 'Read'],  // Default safe tool whitelist
      permissionMode: 'acceptEdits',
      outputFormat: 'json',
    })

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

    // Parse JSON output
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
