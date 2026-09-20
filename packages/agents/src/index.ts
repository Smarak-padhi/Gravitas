/**
 * @gravitas/agents — Public Export Boundary.
 *
 * Minimal Agent Registry V0, typed capability vocabulary, qualification lifecycle,
 * and immutable task capability grants.
 */

export {
  CANONICAL_CAPABILITIES,
  PROHIBITED_WORKER_CAPABILITIES,
  isKnownCapability,
  getCapability,
  isProhibitedWorkerCapability,
  validateRequestedCapabilities,
  type CanonicalCapabilityId,
} from './capabilities.js'

export {
  isEligibleForProduction,
  type QualificationStatus,
  type AgentProvider,
  type AgentDescriptor,
} from './descriptor.js'

export {
  canSatisfyRequirement,
  issueCapabilityGrant,
  type TaskRequirement,
  type CapabilityGrant,
} from './grants.js'

export {
  CANONICAL_AGENTS,
  DefaultAgentRegistry,
  type AgentRegistry,
} from './registry.js'
