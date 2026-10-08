/**
 * Independent deterministic verifier for @gravitas/verifier.
 *
 * Guarantees:
 * - Commands execute strictly inside the allocated task worktree.
 * - Shell-free execution without AI or Bash mediation.
 * - Zero automatic retries on flaky commands.
 * - Detects verifier-generated mutations (post-test artifacts).
 * - Mandatory failures strictly produce FAILED status.
 */

import { executeGit } from '@gravitas/git'
import { normalizePathForScope } from '@gravitas/harnesses'
import { K5_AUTHORITY_BRAND } from '@gravitas/core'
import { VerificationPolicyError } from './errors.js'
import { runVerificationCommand } from './runner.js'

const verifiedExecutions = new WeakSet<VerificationResult>()
const legitimatelyIssuedReceipts = new WeakSet<object>()
import type {
  K5VerificationReceipt,
  VerificationCommandResult,
  VerificationPlan,
  VerificationResult,
  VerificationStatus,
} from './types.js'

export interface ExecuteVerificationInput {
  readonly plan: VerificationPlan
  readonly worktreePath: string
}

async function collectWorktreeChanges(worktreePath: string): Promise<Set<string>> {
  const statusResult = await executeGit({
    cwd: worktreePath,
    args: ['status', '--porcelain=v2'],
  })
  const set = new Set<string>()
  const statusLines = statusResult.stdout.split(/\r?\n/)
  for (const line of statusLines) {
    if (!line || line.startsWith('#')) continue
    const type = line.charAt(0)
    if (type === '1' || type === '2') {
      const parts = line.split(/\s+/)
      const filePath = parts[parts.length - 1]
      if (filePath) set.add(normalizePathForScope(filePath))
    } else if (type === '?') {
      const filePath = line.substring(2).trim()
      if (filePath) set.add(normalizePathForScope(filePath))
    }
  }
  return set
}

/**
 * Executes an independent verification plan against an allocated task worktree.
 */
export async function executeVerification(
  input: ExecuteVerificationInput
): Promise<VerificationResult> {
  const { plan, worktreePath } = input

  if (!plan.commands || plan.commands.length === 0) {
    throw new VerificationPolicyError(
      `Verification plan "${plan.id}" contains zero commands. At least one command is required.`
    )
  }

  const startedAt = new Date().toISOString()
  const startTime = Date.now()

  // 1. Capture worktree status before verification commands
  const preChanges = await collectWorktreeChanges(worktreePath)

  // 2. Execute verification commands sequentially
  const commandResults: VerificationCommandResult[] = []
  let overallStatus: VerificationStatus = 'PASSED'
  let failureReason: string | undefined

  for (const command of plan.commands) {
    const result = await runVerificationCommand(command, worktreePath)
    commandResults.push(result)

    const isCommandFailure =
      result.exitCode !== 0 || result.terminationReason !== 'COMPLETED'

    if (isCommandFailure) {
      if (command.mandatory) {
        overallStatus = 'FAILED'
        failureReason = `Mandatory command "${command.id}" failed with exit code ${result.exitCode} (${result.terminationReason})`
        // Stop on first mandatory failure
        break
      }
    }
  }

  // 3. Capture worktree status after verification to detect verifier-generated mutations
  const postChanges = await collectWorktreeChanges(worktreePath)
  const verifierGeneratedChanges = Array.from(postChanges).filter(
    (file) => !preChanges.has(file)
  )

  const completedAt = new Date().toISOString()
  const durationMs = Date.now() - startTime

  const verificationResult: VerificationResult = {
    planId: plan.id,
    status: overallStatus,
    startedAt,
    completedAt,
    durationMs,
    commands: Object.freeze(commandResults),
    verifierGeneratedChanges: Object.freeze(verifierGeneratedChanges),
    ...(failureReason ? { failureReason } : {}),
  }

  // Register into trusted execution set
  verifiedExecutions.add(verificationResult)

  return verificationResult
}

/**
 * Creates an authoritative K5 verification receipt from an executed verification result.
 * Strictly asserts that the VerificationResult was issued by executeVerification authority.
 */
export function createVerificationReceipt(
  verification: VerificationResult,
  context: {
    workSessionId: string
    taskId: string
    runId?: string | undefined
    attemptNumber?: number | undefined
  }
): K5VerificationReceipt {
  if (!verifiedExecutions.has(verification)) {
    throw new VerificationPolicyError(
      'Cannot issue authoritative K5 verification receipt: VerificationResult was not produced by executeVerification authority.'
    )
  }

  const receipt: K5VerificationReceipt = {
    receiptId: `k5rcpt_${context.workSessionId}_${context.taskId}_${verification.planId}_${Date.now()}`,
    planId: verification.planId,
    workSessionId: context.workSessionId,
    taskId: context.taskId,
    runId: context.runId ?? 'run-default',
    attemptNumber: context.attemptNumber ?? 1,
    verdict: verification.status === 'PASSED' ? 'VERIFIED_PASS' : 'VERIFIED_FAIL',
    commandsCount: verification.commands.length,
    passedCommandsCount: verification.commands.filter((c) => c.exitCode === 0).length,
    failedCommandsCount: verification.commands.filter((c) => c.exitCode !== 0).length,
    completedAt: verification.completedAt,
    issuedAt: new Date().toISOString(),
    superseded: false,
  }

  Object.defineProperty(receipt, K5_AUTHORITY_BRAND, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  })

  legitimatelyIssuedReceipts.add(receipt)
  return receipt
}

/**
 * Creates an authoritative receipt specifically for isolated unit tests.
 * Only intended for testing offline fixtures without spawning live shells.
 */
export function createAuthoritativeReceiptForTest(
  receipt: K5VerificationReceipt
): K5VerificationReceipt {
  Object.defineProperty(receipt, K5_AUTHORITY_BRAND, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  })
  legitimatelyIssuedReceipts.add(receipt)
  return receipt
}

/**
 * Asserts whether a given receipt was authoritatively issued by @gravitas/verifier.
 * Checked at the ModelCapabilityHistory registration boundary via private WeakSet reference.
 * Prevents in-process forging via Symbol.for or property spoofing.
 */
export function isAuthoritativeK5Receipt(receipt: unknown): boolean {
  return typeof receipt === 'object' && receipt !== null && legitimatelyIssuedReceipts.has(receipt as object)
}
