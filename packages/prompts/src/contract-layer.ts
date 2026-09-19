/**
 * Execution Contract layer compiler for @gravitas/prompts.
 *
 * Generates the EXECUTION_CONTRACT prompt layer from an authoritative ExecutionContract object.
 *
 * Source: CONTRACT — derived directly from the stored, validated ExecutionContract.
 * The UI text does NOT drive this layer; the live contract object does.
 *
 * Invariant: acceptance criteria and required evidence are preserved verbatim.
 * They are not summarized, truncated, or reformatted in ways that lose information.
 */

import type { ExecutionContract } from '@gravitas/core'

/**
 * Compiles the EXECUTION_CONTRACT prompt layer from a validated ExecutionContract.
 *
 * Returns a deterministic multi-line string.
 * Stable input produces byte-identical output (no timestamps, no random IDs).
 */
export function compileContractLayer(contract: ExecutionContract): string {
  const lines: string[] = []

  lines.push(`GOAL: ${contract.goal}`)
  lines.push(`REPOSITORY: ${contract.repository}`)
  lines.push(`BASE BRANCH: ${contract.baseBranch}`)

  if (contract.constraints.length > 0) {
    lines.push('')
    lines.push('ALLOWED MUTATION PATHS:')
    for (const constraint of contract.constraints) {
      lines.push(`  - ${constraint}`)
    }
  }

  lines.push('')
  lines.push('ACCEPTANCE CRITERIA:')
  for (let i = 0; i < contract.acceptanceCriteria.length; i++) {
    const ac = contract.acceptanceCriteria[i]!
    lines.push(`  ${i + 1}. [${ac.id}] ${ac.description}`)
    if (ac.verificationMethod) {
      lines.push(`     Verification method: ${ac.verificationMethod}`)
    }
  }

  if (contract.requiredEvidence.length > 0) {
    lines.push('')
    lines.push('REQUIRED EVIDENCE:')
    for (let i = 0; i < contract.requiredEvidence.length; i++) {
      const ev = contract.requiredEvidence[i]!
      const mandatory = ev.mandatory ? 'MANDATORY' : 'optional'
      lines.push(`  ${i + 1}. [${ev.id}] (${ev.type}, ${mandatory}) ${ev.description}`)
    }
  }

  return lines.join('\n')
}
