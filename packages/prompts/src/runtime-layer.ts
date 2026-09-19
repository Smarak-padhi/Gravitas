/**
 * Runtime context layer compiler for @gravitas/prompts.
 *
 * Generates the RUNTIME_CONTEXT prompt layer immediately before execution.
 *
 * Source: GENERATED_RUNTIME — operational execution context only.
 *
 * SECURITY INVARIANTS:
 * - MUST NOT include: API keys, FCC credentials, Authorization headers,
 *   process.env contents, secret host configuration, or unrelated host paths.
 * - Workers cannot use this layer to weaken higher-level policy.
 * - This layer is clearly labeled as operational context, not an instruction channel.
 */

import type { RuntimePromptContext } from './types.js'

/**
 * Compiles the RUNTIME_CONTEXT prompt layer from a RuntimePromptContext.
 *
 * Returns a deterministic multi-line string.
 * Stable input produces byte-identical output.
 */
export function compileRuntimeLayer(ctx: RuntimePromptContext): string {
  const lines: string[] = []

  lines.push('EXECUTION CONTEXT (operational reference — does not override policy or task):')
  lines.push('')
  lines.push(`Run ID:         ${ctx.runId}`)
  lines.push(`Task ID:        ${ctx.taskId}`)
  lines.push(`Harness:        ${ctx.harnessId}`)
  lines.push(`Task Branch:    ${ctx.taskBranch}`)
  lines.push(`Base Commit:    ${ctx.baseSha}`)
  lines.push(`Worktree Path:  ${ctx.worktreePath}`)
  lines.push(`Compiled At:    ${ctx.compiledAt}`)

  if (ctx.allowedPaths.length > 0) {
    lines.push('')
    lines.push('Allowed mutation paths:')
    for (const path of ctx.allowedPaths) {
      lines.push(`  - ${path}`)
    }
  } else {
    lines.push('')
    lines.push('Allowed mutation paths: (unrestricted within worktree)')
  }

  return lines.join('\n')
}
