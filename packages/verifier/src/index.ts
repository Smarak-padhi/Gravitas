/**
 * @gravitas/verifier — Public Export Boundary
 *
 * Independent deterministic verification, verification policies,
 * state transition authority, and audit-ready evidence collection.
 *
 * Defining Invariant:
 * AN AGENT CLAIM IS NEVER PROOF OF COMPLETION.
 */

// Domain types
export type {
  VerificationStatus,
  VerificationCommand,
  VerificationPlan,
  VerificationCommandResult,
  VerificationResult,
  EvidenceManifest,
  EvidenceBundleInput,
  EvidenceBundleResult,
} from './types.js'

// Domain errors
export {
  VerificationExecutionError,
  EvidenceCollectionError,
  VerificationPolicyError,
} from './errors.js'

// Deterministic command runner
export { runVerificationCommand } from './runner.js'

// Independent verifier
export { executeVerification, type ExecuteVerificationInput } from './verifier.js'

// State transition authority
export {
  applyVerificationOutcome,
  type ApplyVerificationOutcomeInput,
} from './state-authority.js'

// Evidence collector & bundle writer
export { writeEvidenceBundle } from './evidence.js'
