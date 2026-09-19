/**
 * Managed prompt compiler for @gravitas/prompts.
 *
 * Deterministically compiles the canonical six-layer prompt from a PromptCompilationRequest.
 *
 * Core invariants:
 * - Same normalized input → same bytes → same SHA-256.
 * - CRLF is normalized to LF before hashing and transmission.
 * - SHA-256 is computed over the exact UTF-8 bytes sent to the worker.
 * - No secondary prompt transformation is permitted inside the harness.
 * - Workers cannot reorder or inject layers.
 * - Repository content is not automatically promoted to policy.
 */

import { createHash } from 'node:crypto'
import {
  composePrompt,
  CANONICAL_PROMPT_LAYER_ORDER,
  type PromptLayerName,
} from '@gravitas/core'
import { GLOBAL_POLICY_TEXT, GLOBAL_POLICY_VERSION } from './global-policy.js'
import { getRoleTemplate, ROLE_TEMPLATE_VERSION } from './role-templates.js'
import { compileContractLayer } from './contract-layer.js'
import { compileTaskLayer } from './task-layer.js'
import { compileRuntimeLayer } from './runtime-layer.js'
import type {
  LayerMetadata,
  ManagedCompiledPrompt,
  PromptCompilationRequest,
} from './types.js'

/** Semantic version of the compiler algorithm. Increment when compilation logic changes. */
export const COMPILER_VERSION = '1' as const

/**
 * Normalizes a string to LF line endings and trims trailing whitespace from each line.
 * This is the canonical normalization applied before hashing.
 */
function normalizeText(text: string): string {
  // Normalize CRLF → LF, then CR → LF
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove trailing whitespace from each line
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
}


/**
 * Compiles a project context string for the PROJECT layer.
 * Returns undefined (layer omitted) if all fields are blank.
 */
function compileProjectLayer(
  ctx: PromptCompilationRequest['projectContext']
): string | undefined {
  if (!ctx) return undefined

  const parts: string[] = []

  if (ctx.projectName?.trim()) {
    parts.push(`PROJECT: ${ctx.projectName.trim()}`)
  }
  if (ctx.projectSummary?.trim()) {
    parts.push('')
    parts.push('SUMMARY:')
    parts.push(ctx.projectSummary.trim())
  }
  if (ctx.technicalConstraints?.trim()) {
    parts.push('')
    parts.push('TECHNICAL CONSTRAINTS:')
    parts.push(ctx.technicalConstraints.trim())
  }
  if (ctx.projectInstructions?.trim()) {
    parts.push('')
    parts.push('PROJECT INSTRUCTIONS:')
    parts.push(ctx.projectInstructions.trim())
  }

  if (parts.length === 0) return undefined
  return parts.join('\n')
}

/**
 * Layer source classification for the compilation request inputs.
 */
const LAYER_SOURCES: Record<
  PromptLayerName,
  LayerMetadata['source']
> = {
  GLOBAL: 'MANAGED_POLICY',
  PROJECT: 'PROJECT_INPUT',
  EXECUTION_CONTRACT: 'CONTRACT',
  TASK: 'TASK',
  AGENT_ROLE: 'MANAGED_POLICY',
  RUNTIME_CONTEXT: 'GENERATED_RUNTIME',
}

/**
 * Compiles a managed, hashed, versioned prompt from a PromptCompilationRequest.
 *
 * Pure function: identical normalized input → byte-identical output → identical SHA-256.
 */
export function compilePrompt(request: PromptCompilationRequest): ManagedCompiledPrompt {
  const compiledAt = new Date().toISOString()

  // 1. Resolve role
  const role = request.role ?? 'IMPLEMENTER'
  const roleTemplate = getRoleTemplate(role)
  const roleUsed = roleTemplate !== undefined ? role : ('none' as const)

  // 2. Build the six layer texts
  const projectText = compileProjectLayer(request.projectContext)
  const contractText = compileContractLayer(request.contract)
  const taskText = compileTaskLayer(request.task, request.contract)
  const runtimeText = request.runtimeContext
    ? compileRuntimeLayer(request.runtimeContext)
    : undefined

  // 3. Delegate to @gravitas/core composePrompt for canonical ordering + formatting
  // Use conditional spread to avoid exactOptionalPropertyTypes violations:
  // passing `project: undefined` is different from omitting the key in strict mode.
  const coreResult = composePrompt({
    task: taskText,
    ...(GLOBAL_POLICY_TEXT ? { global: GLOBAL_POLICY_TEXT } : {}),
    ...(projectText !== undefined ? { project: projectText } : {}),
    ...(contractText ? { executionContract: contractText } : {}),
    ...(roleTemplate !== undefined ? { agentRole: roleTemplate } : {}),
    ...(runtimeText !== undefined ? { runtimeContext: runtimeText } : {}),
  })

  // 4. Normalize to LF + trimEnd per line
  const normalizedText = normalizeText(coreResult.prompt)

  // 5. Compute exact byte provenance
  const textBytes = Buffer.from(normalizedText, 'utf8')
  const byteLength = textBytes.length
  const sha256 = createHash('sha256').update(textBytes).digest('hex')

  // 6. Build per-layer metadata
  // We need to know byte lengths per layer — re-split from the composed output
  const layerTexts: Record<PromptLayerName, string | undefined> = {
    GLOBAL: GLOBAL_POLICY_TEXT,
    PROJECT: projectText,
    EXECUTION_CONTRACT: contractText,
    TASK: taskText,
    AGENT_ROLE: roleTemplate,
    RUNTIME_CONTEXT: runtimeText,
  }

  const layerMetadata: LayerMetadata[] = CANONICAL_PROMPT_LAYER_ORDER.map(
    (name): LayerMetadata => {
      const rawText = layerTexts[name]
      const included = coreResult.includedLayers.includes(name)
      const layerByteLength = included && rawText
        ? Buffer.byteLength(rawText.trim(), 'utf8')
        : 0
      return {
        name,
        included,
        byteLength: layerByteLength,
        source: LAYER_SOURCES[name],
      }
    }
  )

  return Object.freeze({
    text: normalizedText,
    byteLength,
    sha256,
    includedLayers: coreResult.includedLayers,
    layerCount: coreResult.layerCount,
    compilerVersion: COMPILER_VERSION,
    globalPolicyVersion: GLOBAL_POLICY_VERSION,
    roleTemplateVersion: ROLE_TEMPLATE_VERSION,
    roleUsed: roleUsed as typeof roleUsed,
    compiledAt,
    layerMetadata: Object.freeze(layerMetadata),
  }) satisfies ManagedCompiledPrompt
}
