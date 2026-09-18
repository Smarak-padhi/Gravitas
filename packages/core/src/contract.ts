/**
 * ExecutionContract creation and validation for @gravitas/core.
 * Plain data specification compiled from a high-level goal.
 */

import { ContractValidationError } from './errors.js'
import type {
  AcceptanceCriterion,
  EvidenceRequirement,
  ExecutionContract,
} from './types.js'

/**
 * Input parameters for creating an ExecutionContract.
 */
export interface ExecutionContractInput {
  readonly version?: string
  readonly goal: string
  readonly repository: string
  readonly baseBranch: string
  readonly constraints?: readonly string[]
  readonly acceptanceCriteria: readonly AcceptanceCriterion[]
  readonly requiredEvidence?: readonly EvidenceRequirement[]
}

/**
 * Result of validating an ExecutionContract candidate.
 */
export interface ContractValidationResult {
  readonly valid: boolean
  readonly issues: readonly string[]
}

/**
 * Validates the invariants of an ExecutionContract or candidate input.
 * Pure function with zero external schema library dependencies.
 */
export function validateExecutionContract(candidate: unknown): ContractValidationResult {
  const issues: string[] = []

  if (!candidate || typeof candidate !== 'object') {
    return { valid: false, issues: ['ExecutionContract must be a non-null object'] }
  }

  const c = candidate as Record<string, unknown>

  // 1. version
  if (c['version'] !== undefined) {
    if (typeof c['version'] !== 'string' || c['version'].trim().length === 0) {
      issues.push('Contract "version" must be a non-empty string')
    }
  }

  // 2. goal
  if (typeof c['goal'] !== 'string' || c['goal'].trim().length === 0) {
    issues.push('Contract "goal" cannot be blank')
  }

  // 3. repository
  if (typeof c['repository'] !== 'string' || c['repository'].trim().length === 0) {
    issues.push('Contract "repository" cannot be blank')
  }

  // 4. baseBranch
  if (typeof c['baseBranch'] !== 'string' || c['baseBranch'].trim().length === 0) {
    issues.push('Contract "baseBranch" cannot be blank')
  }

  // 5. constraints
  if (c['constraints'] !== undefined) {
    if (!Array.isArray(c['constraints'])) {
      issues.push('Contract "constraints" must be an array of strings')
    } else {
      for (let i = 0; i < c['constraints'].length; i++) {
        if (typeof c['constraints'][i] !== 'string') {
          issues.push(`Constraint at index ${i} must be a string`)
        }
      }
    }
  }

  // 6. acceptanceCriteria
  if (!Array.isArray(c['acceptanceCriteria'])) {
    issues.push('Contract "acceptanceCriteria" must be an array')
  } else if (c['acceptanceCriteria'].length === 0) {
    issues.push('Contract must contain at least one acceptance criterion')
  } else {
    const seenAcIds = new Set<string>()
    for (let i = 0; i < c['acceptanceCriteria'].length; i++) {
      const ac = c['acceptanceCriteria'][i]
      if (!ac || typeof ac !== 'object') {
        issues.push(`Acceptance criterion at index ${i} must be an object`)
        continue
      }
      const acObj = ac as Record<string, unknown>
      const id = acObj['id']
      const desc = acObj['description']

      if (typeof id !== 'string' || id.trim().length === 0) {
        issues.push(`Acceptance criterion at index ${i} must have a non-empty "id"`)
      } else {
        const trimmedId = id.trim()
        if (seenAcIds.has(trimmedId)) {
          issues.push(`Duplicate acceptance criterion ID "${trimmedId}" detected at index ${i}`)
        }
        seenAcIds.add(trimmedId)
      }

      if (typeof desc !== 'string' || desc.trim().length === 0) {
        issues.push(`Acceptance criterion at index ${i} must have a non-empty "description"`)
      }
    }
  }

  // 7. requiredEvidence
  if (c['requiredEvidence'] !== undefined) {
    if (!Array.isArray(c['requiredEvidence'])) {
      issues.push('Contract "requiredEvidence" must be an array')
    } else {
      const seenEvidenceIds = new Set<string>()
      for (let i = 0; i < c['requiredEvidence'].length; i++) {
        const ev = c['requiredEvidence'][i]
        if (!ev || typeof ev !== 'object') {
          issues.push(`Required evidence at index ${i} must be an object`)
          continue
        }
        const evObj = ev as Record<string, unknown>
        const id = evObj['id']
        const type = evObj['type']
        const desc = evObj['description']

        if (typeof id !== 'string' || id.trim().length === 0) {
          issues.push(`Required evidence at index ${i} must have a non-empty "id"`)
        } else {
          const trimmedId = id.trim()
          if (seenEvidenceIds.has(trimmedId)) {
            issues.push(`Duplicate required evidence ID "${trimmedId}" detected at index ${i}`)
          }
          seenEvidenceIds.add(trimmedId)
        }

        if (typeof type !== 'string' || type.trim().length === 0) {
          issues.push(`Required evidence at index ${i} must have a non-empty "type"`)
        }

        if (typeof desc !== 'string' || desc.trim().length === 0) {
          issues.push(`Required evidence at index ${i} must have a non-empty "description"`)
        }

        if (typeof evObj['mandatory'] !== 'boolean') {
          issues.push(`Required evidence at index ${i} must specify boolean "mandatory"`)
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Creates and validates an immutable ExecutionContract.
 *
 * Throws ContractValidationError if any invariants are violated.
 */
export function createExecutionContract(input: ExecutionContractInput): ExecutionContract {
  const version = input.version?.trim() || '1.0.0'
  const goal = input.goal?.trim() ?? ''
  const repository = input.repository?.trim() ?? ''
  const baseBranch = input.baseBranch?.trim() ?? ''
  const constraints = Object.freeze([...(input.constraints ?? [])])
  const acceptanceCriteria = Object.freeze([...input.acceptanceCriteria])
  const requiredEvidence = Object.freeze([...(input.requiredEvidence ?? [])])

  const candidate = {
    version,
    goal,
    repository,
    baseBranch,
    constraints,
    acceptanceCriteria,
    requiredEvidence,
  }

  const validation = validateExecutionContract(candidate)
  if (!validation.valid) {
    throw new ContractValidationError(validation.issues)
  }

  return Object.freeze(candidate)
}
