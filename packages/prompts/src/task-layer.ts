/**
 * Task layer compiler for @gravitas/prompts.
 *
 * Generates the TASK prompt layer from a Gravitas Task and its parent ExecutionContract.
 *
 * Source: TASK — generated from the authoritative task domain object.
 * Do not invent scheduler information or speculative task metadata.
 */

import type { ExecutionContract, Task } from '@gravitas/core'

/**
 * Compiles the TASK prompt layer for a given Task.
 *
 * Returns a deterministic multi-line string.
 * Stable input produces byte-identical output.
 */
export function compileTaskLayer(task: Task, contract: ExecutionContract): string {
  const lines: string[] = []

  lines.push(`TASK ID: ${task.id}`)
  lines.push(`TITLE: ${task.title}`)
  lines.push('')
  lines.push('OBJECTIVE:')
  lines.push(task.objective)

  if (contract.constraints.length > 0) {
    lines.push('')
    lines.push('ALLOWED MUTATION SCOPE:')
    for (const path of contract.constraints) {
      lines.push(`  - ${path}`)
    }
    lines.push('Modifications outside this scope are NOT permitted.')
  }

  lines.push('')
  lines.push('ACCEPTANCE CRITERIA TO SATISFY:')
  for (let i = 0; i < task.acceptanceCriteria.length; i++) {
    const ac = task.acceptanceCriteria[i]!
    lines.push(`  ${i + 1}. ${ac.description}`)
  }

  const requiresApproval = task.requiresApproval ?? true
  lines.push('')
  lines.push(`APPROVAL REQUIRED: ${requiresApproval ? 'Yes — a human must explicitly approve before this task is accepted.' : 'No — independent verification success is sufficient.'}`)

  return lines.join('\n')
}
