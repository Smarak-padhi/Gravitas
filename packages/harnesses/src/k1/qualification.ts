/**
 * GRAVITAS K1 — Qualification State Machine
 *
 * Enforces the sequential qualification ladder:
 * UNDISCOVERED → DISCOVERED → INSTALLED → AUTHENTICATED → REACHABLE
 *   → CAPABILITY_PROBED → CONTAINMENT_TESTED → QUALIFIED
 *
 * Invariants:
 * - Qualification only advances, never silently downgrades
 * - A harness can be BLOCKED at any stage
 * - QUALIFIED represents a static ceiling (durable evidence)
 * - QUALIFIED != READY (readiness is dynamic, qualification is static)
 * - Safe Fallback Rule: fallback NEVER silently downgrades containment
 */

import {
  type QualificationState,
  type HarnessKind,
  type CostEligibility,
  type HarnessCapabilities,
  type HarnessAuthorityRequirements,
  type HarnessQualificationSnapshot,
  QUALIFICATION_ORDER,
} from './types.js'
import { createHash } from 'node:crypto'

/**
 * Evidence record for a qualification step.
 */
export interface QualificationStepEvidence {
  readonly state: QualificationState
  readonly timestamp: string         // ISO-8601
  readonly durationMs: number
  readonly passed: boolean
  readonly details: string
  readonly rawOutput?: string | undefined
}

/**
 * Full qualification record for a single harness.
 */
export interface HarnessQualificationRecord {
  readonly harnessId: string
  readonly harnessKind: HarnessKind
  readonly qualifiedAt: string
  readonly currentState: QualificationState
  readonly steps: readonly QualificationStepEvidence[]
  readonly snapshot: HarnessQualificationSnapshot
}

/**
 * Determines whether a qualification state transition is valid.
 * Qualification only advances (or moves to BLOCKED from any state).
 */
export function isValidQualificationTransition(
  from: QualificationState,
  to: QualificationState
): boolean {
  // BLOCKED is always a valid destination from any state
  if (to === 'BLOCKED') return true
  // NOT_APPLICABLE is always a valid final state
  if (to === 'NOT_APPLICABLE') return true

  const fromIdx = QUALIFICATION_ORDER.indexOf(from)
  const toIdx = QUALIFICATION_ORDER.indexOf(to)

  if (fromIdx === -1 || toIdx === -1) return false

  // Can only advance by at most one step at a time in the ladder
  // (or stay the same for idempotent re-qualification)
  return toIdx === fromIdx + 1 || toIdx === fromIdx
}

/**
 * Returns the maximum qualification ceiling given a set of steps.
 * Used to determine the durable evidence-backed qualification state.
 */
export function computeQualificationCeiling(
  steps: readonly QualificationStepEvidence[]
): QualificationState {
  const passed = steps.filter(s => s.passed).map(s => s.state)
  if (passed.length === 0) return 'UNDISCOVERED'

  const maxIdx = passed.reduce((maxI, state) => {
    const idx = QUALIFICATION_ORDER.indexOf(state)
    return idx > maxI ? idx : maxI
  }, -1)

  return maxIdx >= 0 ? (QUALIFICATION_ORDER[maxIdx] ?? 'UNDISCOVERED') : 'UNDISCOVERED'
}

/**
 * Computes a SHA-256 hash of a qualification snapshot for provenance.
 */
export function hashQualificationSnapshot(snapshot: HarnessQualificationSnapshot): string {
  const normalized = JSON.stringify({
    harnessId: snapshot.harnessId,
    harnessKind: snapshot.harnessKind,
    qualificationState: snapshot.qualificationState,
    costEligibility: snapshot.costEligibility,
    capabilities: snapshot.capabilities,
    version: snapshot.version ?? null,
    qualifiedAt: snapshot.qualifiedAt,
  })
  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Validates the zero-spend dispatch gate.
 * Returns true only if the cost eligibility is acceptable for autonomous dispatch.
 *
 * Invariants:
 * - UNKNOWN_COST fails closed
 * - PAID fails closed
 * - PROMOTIONAL_CREDIT requires explicit proof (requiresProof = true)
 */
export function isCostEligibleForAutonomousDispatch(
  eligibility: CostEligibility,
  promotionalCreditProven: boolean = false
): { allowed: boolean; reason: string } {
  switch (eligibility) {
    case 'LOCAL_FOSS':
      return { allowed: true, reason: 'LOCAL_FOSS: zero per-use cost confirmed.' }

    case 'OPERATOR_INCLUDED_HOST_RUNTIME':
      return { allowed: true, reason: 'OPERATOR_INCLUDED_HOST_RUNTIME: host OS runtime with zero marginal cost.' }

    case 'INCLUDED_SUBSCRIPTION':
      return { allowed: true, reason: 'INCLUDED_SUBSCRIPTION: covered by existing subscription.' }

    case 'QUALIFIED_FREE_TIER':
      return { allowed: true, reason: 'QUALIFIED_FREE_TIER: verified free tier with documented limits.' }

    case 'PROMOTIONAL_CREDIT':
      if (promotionalCreditProven) {
        return { allowed: true, reason: 'PROMOTIONAL_CREDIT: eligibility proven at dispatch time.' }
      }
      return {
        allowed: false,
        reason: 'PROMOTIONAL_CREDIT: eligibility NOT proven. Dispatch BLOCKED (COST_ELIGIBILITY_UNKNOWN).',
      }

    case 'PAID':
      return {
        allowed: false,
        reason: 'PAID: autonomous spend BLOCKED. Explicit sovereign human financial approval required.',
      }

    case 'UNKNOWN_COST':
      return {
        allowed: false,
        reason: 'UNKNOWN_COST fails closed. Dispatch BLOCKED until cost class is determined.',
      }

    default:
      return {
        allowed: false,
        reason: `Unrecognized cost eligibility class. Dispatch BLOCKED.`,
      }
  }
}

/**
 * Builds a qualification snapshot from a completed qualification record.
 */
export function buildQualificationSnapshot(
  harnessId: string,
  harnessKind: HarnessKind,
  steps: readonly QualificationStepEvidence[],
  capabilities: HarnessCapabilities,
  authorityRequirements: HarnessAuthorityRequirements,
  costEligibility: CostEligibility,
  options?: {
    version?: string | undefined
    executablePath?: string | undefined
    blockedReason?: string | undefined
    toolSchemaHash?: string | undefined
  }
): HarnessQualificationSnapshot {
  const qualificationState = computeQualificationCeiling(steps)
  const evidenceList = steps.map(s =>
    `[${s.state}] ${s.passed ? 'PASS' : 'FAIL'} (${s.durationMs}ms): ${s.details}`
  )

  return {
    harnessId,
    harnessKind,
    qualificationState,
    costEligibility,
    capabilities,
    authorityRequirements,
    version: options?.version,
    executablePath: options?.executablePath,
    qualifiedAt: new Date().toISOString(),
    evidence: evidenceList,
    toolSchemaHash: options?.toolSchemaHash,
    blockedReason: options?.blockedReason,
  }
}
