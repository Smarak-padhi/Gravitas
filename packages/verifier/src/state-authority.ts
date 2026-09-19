/**
 * Central State Transition Authority for @gravitas/verifier.
 *
 * Defining Invariant:
 * AN AGENT CLAIM IS NEVER PROOF OF COMPLETION.
 *
 * Translates independent verification results and mutation audits into
 * legal FSM state transitions.
 *
 * Rules:
 * 1. Task MUST currently be in state VERIFYING.
 * 2. Unexpected file mutations or Git HEAD commits unconditionally result in FAILED.
 * 3. Verification failure unconditionally results in FAILED.
 * 4. Verification success + requiresApproval=true transitions to WAITING_APPROVAL.
 * 5. Verification success + requiresApproval=false transitions to SUCCEEDED.
 * 6. WAITING_APPROVAL NEVER transitions automatically to APPROVED.
 */

import { transitionTask, type Task, type TaskTransitionResult } from '@gravitas/core'
import type { MutationCapture } from '@gravitas/harnesses'
import { VerificationPolicyError } from './errors.js'
import type { VerificationResult } from './types.js'

export interface ApplyVerificationOutcomeInput {
  readonly task: Task
  readonly verification: VerificationResult
  readonly mutation: MutationCapture
}

export function applyVerificationOutcome(
  input: ApplyVerificationOutcomeInput
): TaskTransitionResult {
  const { task, verification, mutation } = input

  if (task.state !== 'VERIFYING') {
    throw new VerificationPolicyError(
      `Cannot apply verification outcome to task "${task.id}" in state "${task.state}". Task must be in VERIFYING state.`
    )
  }

  // 1. Mutation integrity gate
  if (mutation.headMutated) {
    return transitionTask(task, 'FAILED', {
      reason: 'Mutation boundary violated: worker committed to Git HEAD (headMutated=true).',
    })
  }

  if (mutation.unexpectedChanges.length > 0) {
    return transitionTask(task, 'FAILED', {
      reason: `Mutation boundary violated: unexpected changes detected: ${mutation.unexpectedChanges.join(', ')}`,
    })
  }

  // 2. Verification result gate
  if (verification.status === 'PASSED') {
    if (task.requiresApproval) {
      return transitionTask(task, 'WAITING_APPROVAL', {
        reason: 'Independent verification PASSED; awaiting human approval.',
      })
    } else {
      return transitionTask(task, 'SUCCEEDED', {
        reason: 'Independent verification PASSED; approval not required.',
      })
    }
  }

  // Verification FAILED
  return transitionTask(task, 'FAILED', {
    reason: verification.failureReason ?? 'Independent verification FAILED.',
  })
}
