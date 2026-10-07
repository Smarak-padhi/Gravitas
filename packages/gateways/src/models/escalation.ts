/**
 * Gravitas — Bounded Model Escalation Policy & Algebra (Wave V1-B)
 *
 * Enforces strict escalation boundaries without model self-escalation:
 * - NO MODEL SELF-ESCALATION
 * - MAX_ESCALATIONS = 2
 * - MAX_SAME_MODEL_RETRIES = 0 (No blind retry of failed model)
 * - Critical failure classes stop fail-closed and require human gate
 */

import {
  DEFAULT_V1_B_ESCALATION_POLICY,
  type EscalationAction,
  type EscalationPolicy,
} from './types.js';

export const HUMAN_GATE_FAILURE_CLASSES = new Set([
  'AUTH_REQUIRED',
  'COST_BLOCKED',
  'CAPABILITY_GRANT_REQUIRED',
  'DESTRUCTIVE_ACTION_REQUIRED',
  'UNKNOWN_EXTERNAL_OUTCOME',
  'MERGE_REQUIRED',
  'RELEASE_REQUIRED',
  'DEPLOY_REQUIRED',
]);

export class EscalationManager {
  private readonly policy: EscalationPolicy;

  public constructor(policy?: EscalationPolicy) {
    this.policy = policy ?? DEFAULT_V1_B_ESCALATION_POLICY;
  }

  /**
   * Deterministically evaluates the required action when a model attempt fails.
   */
  public evaluateEscalation(
    currentAttempt: number,
    failureClass: string,
    lastModelId: string
  ): EscalationAction {
    // 1. Check if human gate is strictly required for this failure class
    if (HUMAN_GATE_FAILURE_CLASSES.has(failureClass)) {
      return {
        action: 'STOP_AND_REQUIRE_HUMAN',
        reason: `Failure class '${failureClass}' requires sovereign human operator decision; autonomous escalation prohibited.`,
        humanGateRequired: true,
        escalationPosition: currentAttempt,
      };
    }

    // 2. Check escalation depth bounds
    if (currentAttempt >= this.policy.maxEscalations) {
      return {
        action: 'STOP_AND_REQUIRE_HUMAN',
        reason: `Maximum escalation bound (${this.policy.maxEscalations}) exhausted. Halting for human review.`,
        humanGateRequired: true,
        escalationPosition: currentAttempt,
      };
    }

    // 3. Forbid blind same-model retries under default policy
    if (this.policy.maxSameModelRetries === 0) {
      // Must escalate to a different qualified candidate
      return {
        action: 'ESCALATE_TO_NEXT_MODEL',
        reason: `Failure '${failureClass}' on model '${lastModelId}' authorized bounded escalation to next qualified candidate (attempt ${currentAttempt + 1} of ${this.policy.maxEscalations}).`,
        humanGateRequired: false,
        escalationPosition: currentAttempt + 1,
      };
    }

    return {
      action: 'RETRY_SAME_MODEL',
      reason: `Transient retry on model '${lastModelId}' permitted.`,
      humanGateRequired: false,
      escalationPosition: currentAttempt,
    };
  }
}
