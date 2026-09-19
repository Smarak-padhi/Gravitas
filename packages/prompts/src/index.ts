/**
 * @gravitas/prompts — Public Export Boundary
 *
 * Managed deterministic prompt compilation with SHA-256 provenance.
 * Provider-neutral: compiled prompts work with any compatible AgentHarness.
 *
 * Trust hierarchy (highest → lowest):
 *   MANAGED_POLICY (global policy, role templates) — Gravitas-managed, not user-editable
 *   PROJECT_INPUT  (project context) — explicit trusted user input
 *   CONTRACT       (execution contract layer) — derived from validated ExecutionContract
 *   TASK           (task layer) — derived from authoritative Task object
 *   GENERATED_RUNTIME (runtime context) — generated immediately before execution
 *
 * Injection boundary:
 *   Repository content (README, CLAUDE.md, comments, worker output) is NOT automatically
 *   promoted to policy. Only Gravitas-compiled layers constitute authoritative instructions.
 */

// Types
export type {
  ProjectPromptContext,
  RuntimePromptContext,
  PromptCompilationRequest,
  LayerMetadata,
  ManagedCompiledPrompt,
  PromptPreviewRequest,
  PromptLayerPreview,
  PromptPreviewResponse,
  TaskPromptResponse,
} from './types.js'

// Global policy
export { GLOBAL_POLICY_TEXT, GLOBAL_POLICY_VERSION } from './global-policy.js'

// Role templates
export {
  IMPLEMENTER_TEMPLATE,
  RESEARCHER_TEMPLATE,
  REVIEWER_TEMPLATE,
  ROLE_TEMPLATE_VERSION,
  getRoleTemplate,
} from './role-templates.js'

// Layer compilers (exported for testing and server-side preview)
export { compileContractLayer } from './contract-layer.js'
export { compileTaskLayer } from './task-layer.js'
export { compileRuntimeLayer } from './runtime-layer.js'

// Managed compiler (primary public API)
export { compilePrompt, COMPILER_VERSION } from './compiler.js'
