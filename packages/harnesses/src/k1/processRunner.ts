/**
 * GRAVITAS K1 — Normalized Process Runner
 *
 * Wraps the existing runSubprocess with K1 normalization:
 * - Explicit working directory validation
 * - Environment allowlist / secret injection policy
 * - Structured output parsing and validation
 * - Bounded output with explicit truncation recording
 * - Cancellation handle
 * - Provenance capture
 *
 * Invariants:
 * - shell: false always
 * - No untrusted task content interpolated into command strings
 * - cwd validated before spawn
 * - Raw secrets never in env passed through prompts
 */

import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isAbsolute, resolve } from 'node:path'
import { runSubprocess, type SubprocessLaunchOptions } from '../process.js'
import type {
  ExecutionRequest,
  ExecutionResult,
  ExecutionProvenance,
  ExecutionTerminationReason,
  CancellationHandle,
  HarnessKind,
  CostEligibility,
} from './types.js'
import { HarnessError } from './types.js'

/**
 * Validates an execution working directory.
 * Returns normalized absolute path if valid.
 * Throws HarnessError if invalid.
 *
 * NOTE: Path validation does NOT claim to create a full filesystem sandbox.
 * Future K2/K3 will bind this to task/worktree policy enforcement.
 */
export function validateWorkingDirectory(workingDirectory: string, harnessId: string): string {
  if (!workingDirectory || typeof workingDirectory !== 'string') {
    throw new HarnessError(
      'WORKING_DIRECTORY_INVALID',
      harnessId,
      'Working directory must be a non-empty string.'
    )
  }
  if (!isAbsolute(workingDirectory)) {
    throw new HarnessError(
      'WORKING_DIRECTORY_INVALID',
      harnessId,
      `Working directory must be an absolute path. Received: "${workingDirectory}"`
    )
  }
  if (!existsSync(workingDirectory)) {
    throw new HarnessError(
      'WORKING_DIRECTORY_INVALID',
      harnessId,
      `Working directory does not exist on filesystem: "${workingDirectory}"`
    )
  }
  return resolve(workingDirectory)
}

/**
 * Builds a filtered environment for subprocess execution.
 *
 * Policy:
 * - Does NOT pass the entire parent process environment blindly
 * - Allows a specific allowlist of environment variable names from parent
 * - Applies provided overrides (MUST NOT contain raw secrets)
 * - Strips AWS credential vars by default (use CredentialReference instead)
 *
 * NEVER expose: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN,
 *               ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.
 */
export function buildFilteredEnvironment(
  overrides?: Readonly<Record<string, string>>,
  options?: {
    readonly allowParentEnvVars?: readonly string[]
    readonly stripSecretPatterns?: boolean
  }
): Record<string, string | undefined> {
  // Default allowlist — safe system variables only
  const defaultAllowList: readonly string[] = [
    'PATH',
    'PATHEXT',
    'SystemRoot',
    'TEMP',
    'TMP',
    'USERPROFILE',
    'HOME',
    'HOMEDRIVE',
    'HOMEPATH',
    'APPDATA',
    'LOCALAPPDATA',
    'PROGRAMFILES',
    'COMSPEC',
    'SystemDrive',
    'OS',
    'NUMBER_OF_PROCESSORS',
    'PROCESSOR_ARCHITECTURE',
    'LANG',
    'LC_ALL',
    'LC_CTYPE',
    'GIT_AUTHOR_NAME',
    'GIT_AUTHOR_EMAIL',
    'GIT_COMMITTER_NAME',
    'GIT_COMMITTER_EMAIL',
    'NODE_PATH',
    'npm_config_cache',
    'NODE_OPTIONS',
  ]

  const allowList = options?.allowParentEnvVars ?? defaultAllowList

  // Build environment from allowlist only
  const filtered: Record<string, string | undefined> = {}
  for (const key of allowList) {
    const val = process.env[key]
    if (val !== undefined) {
      filtered[key] = val
    }
  }

  // Strip secret patterns from result (defense-in-depth)
  const secretPatterns = [
    /^AWS_ACCESS_KEY_ID$/i,
    /^AWS_SECRET_ACCESS_KEY$/i,
    /^AWS_SESSION_TOKEN$/i,
    /^ANTHROPIC_API_KEY$/i,
    /^OPENAI_API_KEY$/i,
    /^CODEX_API_KEY$/i,
    /^GOOGLE_API_KEY$/i,
    /^GEMINI_API_KEY$/i,
    /^FCC_CLAUDE_EXECUTABLE$/i,
    /.*_SECRET_.*$/i,
    /.*_PRIVATE_KEY$/i,
    /.*_TOKEN$/i, // broad; refine per harness if needed
  ]

  // Apply overrides (no raw secrets should be in overrides)
  if (overrides) {
    for (const [key, val] of Object.entries(overrides)) {
      const isSecret = options?.stripSecretPatterns !== false &&
        secretPatterns.some(p => p.test(key))
      if (!isSecret) {
        filtered[key] = val
      }
    }
  }

  return filtered
}

/**
 * Validates and parses structured JSON output from a harness.
 * Returns null if output is empty or invalid JSON.
 * Preserves raw output separately.
 */
export function parseStructuredOutput(
  stdout: string
): { output: Record<string, unknown> | null; valid: boolean; error?: string } {
  const trimmed = stdout.trim()
  if (!trimmed) {
    return { output: null, valid: false, error: 'Empty output' }
  }

  // Try to find the last complete JSON object (some CLIs emit non-JSON noise before JSON)
  const jsonLines = trimmed.split(/\r?\n/).filter(l => l.trim().startsWith('{'))
  const candidate = jsonLines[jsonLines.length - 1]
  if (!candidate) {
    return { output: null, valid: false, error: 'No JSON object found in output' }
  }

  try {
    const parsed = JSON.parse(candidate)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { output: null, valid: false, error: 'Parsed value is not a JSON object' }
    }
    return { output: parsed as Record<string, unknown>, valid: true }
  } catch (err) {
    return {
      output: null,
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Computes a SHA-256 digest of an execution result for forensic integrity.
 */
export function computeResultDigest(result: Omit<ExecutionResult, 'provenance'>): string {
  const payload = JSON.stringify({
    executionId: result.executionId,
    harnessId: result.harnessId,
    success: result.success,
    terminationReason: result.terminationReason,
    exitCode: result.exitCode ?? null,
    stdoutHash: createHash('sha256').update(result.stdout).digest('hex'),
    stderrHash: createHash('sha256').update(result.stderr).digest('hex'),
    durationMs: result.durationMs,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
  })
  return createHash('sha256').update(payload).digest('hex')
}


/**
 * In-memory cancellation handle for process harnesses.
 */
export class ProcessCancellationHandle implements CancellationHandle {
  public readonly executionId: string
  private _state: CancellationHandle['state'] = 'PENDING'
  private _killFn?: (() => Promise<void>) | undefined

  constructor(executionId: string) {
    this.executionId = executionId
  }

  get state(): CancellationHandle['state'] {
    return this._state
  }

  registerKillFn(fn: () => Promise<void>): void {
    this._killFn = fn
  }

  async cancel(): Promise<boolean> {
    if (this._state !== 'PENDING' && this._state !== 'CANCEL_REQUESTED') {
      return false
    }
    this._state = 'CANCEL_REQUESTED'
    if (this._killFn) {
      await this._killFn()
      this._state = 'CANCELLED'
      return true
    }
    this._state = 'UNKNOWN_EXTERNAL_OUTCOME'
    return false
  }

  markCancelled(): void {
    this._state = 'CANCELLED'
  }

  markTerminated(): void {
    this._state = 'TERMINATED'
  }
}

/**
 * Normalized process execution runner for K1 adapters.
 * Wraps runSubprocess with K1 policies applied.
 */
export async function runNormalizedProcess(options: {
  harnessId: string
  harnessKind: HarnessKind
  request: ExecutionRequest
  executable: string
  args: readonly string[]
  stdinInput?: string
  costEligibilityAtDispatch: CostEligibility
  qualificationSnapshotHash?: string
  extraEnvOverrides?: Record<string, string>
  cancellationHandle: ProcessCancellationHandle
}): Promise<ExecutionResult> {
  const {
    harnessId,
    harnessKind,
    request,
    executable,
    args,
    stdinInput,
    costEligibilityAtDispatch,
    qualificationSnapshotHash,
    extraEnvOverrides,
    cancellationHandle,
  } = options

  // Validate working directory
  const validatedCwd = validateWorkingDirectory(request.workingDirectory, harnessId)

  // Build filtered environment
  const filteredEnv = buildFilteredEnvironment(
    { ...request.environmentOverrides, ...extraEnvOverrides },
    { stripSecretPatterns: true }
  ) as Record<string, string | undefined>

  const startedAt = new Date().toISOString()
  const maxBytes = request.maxOutputBytes ?? 2 * 1024 * 1024 // 2MB default

  const launchOptions: SubprocessLaunchOptions = {
    executable,
    args,
    cwd: validatedCwd,
    stdinInput,
    timeoutMs: request.timeoutPolicy.executionTimeoutMs,
    maxOutputBytes: maxBytes,
    env: filteredEnv,
  }

  let abortController: AbortController | undefined
  const abortSignal = (() => {
    abortController = new AbortController()
    return abortController.signal
  })()

  const subprocessResult = await runSubprocess(
    launchOptions,
    (handle) => {
      cancellationHandle.registerKillFn(async () => {
        await handle.kill('CANCELLED')
        abortController?.abort()
      })
    },
    abortSignal
  )

  const finishedAt = new Date().toISOString()

  // Map termination reason
  const terminationReason: ExecutionTerminationReason =
    subprocessResult.terminationReason === 'COMPLETED' ? 'COMPLETED' :
    subprocessResult.terminationReason === 'TIMEOUT' ? 'TIMEOUT' :
    subprocessResult.terminationReason === 'CANCELLED' ? 'CANCELLED' :
    'PROCESS_FAILED'

  const success = subprocessResult.exitCode === 0 && terminationReason === 'COMPLETED'

  // Parse structured output if requested
  let structuredOutput: Record<string, unknown> | null | undefined
  let structuredOutputValid: boolean | undefined
  if (request.outputMode === 'STRUCTURED' || request.outputMode === undefined) {
    const parsed = parseStructuredOutput(subprocessResult.stdout)
    structuredOutput = parsed.output
    structuredOutputValid = parsed.valid
  }

  const provenance: ExecutionProvenance = {
    executionId: request.executionId,
    durableJobId: request.durableJobId,
    taskId: request.taskId,
    runId: request.runId,
    workSessionId: request.workSessionId,
    harnessId,
    harnessKind,
    pid: subprocessResult.pid,
    startedAt,
    finishedAt,
    qualificationSnapshotHash,
    credentialReferenceId: request.credentialReference?.referenceId,
    costEligibilityAtDispatch,
    workingDirectory: validatedCwd,
  }

  const resultWithoutProvenance = {
    executionId: request.executionId,
    harnessId,
    harnessKind,
    success,
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

  const resultDigest = computeResultDigest(resultWithoutProvenance)

  return {
    ...resultWithoutProvenance,
    provenance: {
      ...provenance,
      resultDigest,
    },
  }
}
