/**
 * Task Requirements and Capability Grants.
 *
 * Enforces:
 * 1. Tasks declare `requiredCapabilities`.
 * 2. Grants are immutable and issued only to eligible agents that possess 100% of required capabilities.
 * 3. Prohibited capabilities cannot be granted under any circumstance.
 */

import type { AgentRole } from '@gravitas/core'
import { isProhibitedWorkerCapability, validateRequestedCapabilities } from './capabilities.js'
import { isEligibleForProduction, type AgentDescriptor } from './descriptor.js'

export interface TaskRequirement {
  readonly taskId: string
  readonly requiredCapabilities: readonly string[]
  readonly role?: AgentRole | undefined
  readonly requireProductionReady?: boolean | undefined
}

export interface CapabilityGrant {
  readonly grantId: string
  readonly taskId: string
  readonly agentId: string
  readonly grantedCapabilities: readonly string[]
  readonly issuedAt: string
}

let grantCounter = 0

/**
 * Evaluates whether an agent can satisfy a task's capability requirements.
 */
export function canSatisfyRequirement(
  agent: AgentDescriptor,
  requirement: TaskRequirement
): { satisfied: boolean; missingCapabilities: readonly string[]; reason?: string } {
  // Check production qualification if demanded (default true)
  const requireProduction = requirement.requireProductionReady ?? true
  if (requireProduction && !isEligibleForProduction(agent)) {
    return {
      satisfied: false,
      missingCapabilities: [],
      reason: `Agent '${agent.id}' is not production eligible (status: ${agent.qualificationStatus})`,
    }
  }

  // Validate no prohibited capabilities are requested
  for (const cap of requirement.requiredCapabilities) {
    if (isProhibitedWorkerCapability(cap)) {
      return {
        satisfied: false,
        missingCapabilities: [cap],
        reason: `Capability '${cap}' is prohibited for workers`,
      }
    }
  }

  // Match capabilities
  const agentCaps = new Set(agent.capabilities)
  const missing = requirement.requiredCapabilities.filter((reqCap) => !agentCaps.has(reqCap))

  if (missing.length > 0) {
    return {
      satisfied: false,
      missingCapabilities: missing,
      reason: `Agent '${agent.id}' is missing required capabilities: ${missing.join(', ')}`,
    }
  }

  return {
    satisfied: true,
    missingCapabilities: [],
  }
}

/**
 * Issues an authoritative CapabilityGrant for an eligible agent.
 * Throws if the agent cannot satisfy the requirement.
 */
export function issueCapabilityGrant(
  agent: AgentDescriptor,
  requirement: TaskRequirement
): CapabilityGrant {
  validateRequestedCapabilities(requirement.requiredCapabilities)

  const evaluation = canSatisfyRequirement(agent, requirement)
  if (!evaluation.satisfied) {
    throw new Error(`Cannot issue grant: ${evaluation.reason}`)
  }

  grantCounter += 1
  return Object.freeze({
    grantId: `grant_${Date.now()}_${grantCounter}`,
    taskId: requirement.taskId,
    agentId: agent.id,
    grantedCapabilities: Object.freeze([...requirement.requiredCapabilities]),
    issuedAt: new Date().toISOString(),
  })
}
