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
import { VerificationPolicyError } from './errors.js'
import { runVerificationCommand } from './runner.js'
import type {
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

  return {
    planId: plan.id,
    status: overallStatus,
    startedAt,
    completedAt,
    durationMs,
    commands: Object.freeze(commandResults),
    verifierGeneratedChanges: Object.freeze(verifierGeneratedChanges),
    ...(failureReason ? { failureReason } : {}),
  }
}
