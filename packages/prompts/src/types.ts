/**
 * Prompt model types for @gravitas/prompts.
 *
 * Provider-neutral, version-stamped, immutable data definitions.
 * No vendor-specific prompt formats — same compiled intent works with any compatible harness.
 */

import type { AgentRole, ExecutionContract, Task, PromptLayerName } from '@gravitas/core'

/**
 * Stable project-level prompt context.
 *
 * Describes project conventions and background helpful to the worker.
 * This is EXPLICIT TRUSTED INPUT — not automatically scraped from the repository.
 *
 * Trust level: PROJECT_INPUT
 * Injection boundary: Do NOT include secrets, API keys, or credential-bearing fields.
 */
export interface ProjectPromptContext {
  /** Short human-readable project name. */
  readonly projectName?: string | undefined
  /** 1–3 sentence description of the project purpose and tech stack. */
  readonly projectSummary?: string | undefined
  /** Stable technical constraints or conventions (e.g. "TypeScript strict mode, ESM only"). */
  readonly technicalConstraints?: string | undefined
  /** Arbitrary project-specific instructions useful to the worker. */
  readonly projectInstructions?: string | undefined
}

/**
 * Runtime context generated immediately before worker execution.
 *
 * Trust level: GENERATED_RUNTIME
 * This layer is operational context, not an instruction channel.
 * Workers cannot use this layer to weaken higher-level policy.
 *
 * MUST NOT include: API keys, FCC credentials, environment secrets, unrelated host paths.
 */
export interface RuntimePromptContext {
  readonly runId: string
  readonly taskId: string
  readonly worktreePath: string
  readonly taskBranch: string
  readonly baseSha: string
  /** File paths the worker is allowed to modify (from contract constraints). */
  readonly allowedPaths: readonly string[]
  /** Unique harness identifier (e.g. 'claude-code', 'fcc'). */
  readonly harnessId: string
  /** ISO 8601 timestamp at which this runtime context was generated. */
  readonly compiledAt: string
}

/**
 * Full request to compile a managed prompt.
 */
export interface PromptCompilationRequest {
  /** Explicit trusted project context (optional; omitted layers are absent from output). */
  readonly projectContext?: ProjectPromptContext | undefined
  /** The validated ExecutionContract driving this compilation. */
  readonly contract: ExecutionContract
  /** The specific task to execute. */
  readonly task: Task
  /** Agent role to apply. Defaults to IMPLEMENTER if omitted. */
  readonly role?: AgentRole | undefined
  /** Generated runtime context (optional; omitted for preview compilations). */
  readonly runtimeContext?: RuntimePromptContext | undefined
}

/**
 * Metadata about a single compiled layer.
 */
export interface LayerMetadata {
  readonly name: PromptLayerName
  readonly included: boolean
  readonly byteLength: number
  readonly source: 'MANAGED_POLICY' | 'PROJECT_INPUT' | 'CONTRACT' | 'TASK' | 'GENERATED_RUNTIME'
}

/**
 * The managed compiled prompt artifact.
 *
 * sha256 === SHA-256 of exact UTF-8 bytes of `text`.
 * byteLength === Buffer.byteLength(text, 'utf8').
 *
 * Invariant: sha256 is computed over the exact bytes sent to the harness.
 * No secondary transformation is permitted inside the harness except transport encoding.
 */
export interface ManagedCompiledPrompt {
  /** The full normalized prompt text (LF line endings, no trailing whitespace per layer). */
  readonly text: string
  /** Exact UTF-8 byte length of `text`. */
  readonly byteLength: number
  /** SHA-256 hex digest of Buffer.from(text, 'utf8'). */
  readonly sha256: string
  /** Canonical layers included (in CANONICAL_PROMPT_LAYER_ORDER order). */
  readonly includedLayers: readonly PromptLayerName[]
  /** Count of included layers. */
  readonly layerCount: number
  /** Version identifier for the prompt compiler algorithm. */
  readonly compilerVersion: string
  /** Version identifier for the global worker policy text. */
  readonly globalPolicyVersion: string
  /** Version identifier for the role template used (or 'none'). */
  readonly roleTemplateVersion: string
  /** The role applied, or 'none' if no role layer was generated. */
  readonly roleUsed: AgentRole | 'none'
  /** ISO 8601 timestamp at which this prompt was compiled. */
  readonly compiledAt: string
  /** Per-layer metadata including source classification and byte size. */
  readonly layerMetadata: readonly LayerMetadata[]
}

/**
 * Request payload for POST /api/v1/prompts/preview.
 *
 * Accepts either a run/task reference (preferred when task exists)
 * or an inline contract + project context for preview before run creation.
 */
export interface PromptPreviewRequest {
  /** Reference an existing run+task for authoritative contract compilation. */
  readonly runId?: string | undefined
  readonly taskId?: string | undefined
  /** Inline project context (merged with run project context if both provided). */
  readonly projectContext?: ProjectPromptContext | undefined
  /** Agent role to apply (defaults to IMPLEMENTER). */
  readonly role?: AgentRole | undefined
  /**
   * Optional override for runtime context fields in preview mode.
   * When omitted, RUNTIME_CONTEXT layer is excluded from preview compilation.
   */
  readonly runtimeContextOverride?: Partial<RuntimePromptContext> | undefined
}

/**
 * Layer preview item returned by the preview API.
 */
export interface PromptLayerPreview {
  readonly name: PromptLayerName
  readonly included: boolean
  readonly source: 'MANAGED_POLICY' | 'PROJECT_INPUT' | 'CONTRACT' | 'TASK' | 'GENERATED_RUNTIME'
  readonly byteLength: number
  /** Sanitized preview text of the layer content. Never contains secrets. */
  readonly text: string
}

/**
 * Response payload for POST /api/v1/prompts/preview.
 */
export interface PromptPreviewResponse {
  readonly compiledPrompt: string
  readonly byteLength: number
  readonly sha256: string
  readonly compilerVersion: string
  readonly globalPolicyVersion: string
  readonly roleTemplateVersion: string
  readonly roleUsed: AgentRole | 'none'
  readonly compiledAt: string
  /** Whether RUNTIME_CONTEXT was included (false when no runtime context was provided). */
  readonly runtimeContextIncluded: boolean
  readonly layers: readonly PromptLayerPreview[]
}

/**
 * Response payload for GET /api/v1/runs/:runId/tasks/:taskId/prompt.
 */
export interface TaskPromptResponse {
  readonly runId: string
  readonly taskId: string
  readonly compiled: boolean
  /** Present when compiled === true. */
  readonly prompt?: {
    readonly sha256: string
    readonly byteLength: number
    readonly compilerVersion: string
    readonly globalPolicyVersion: string
    readonly roleTemplateVersion: string
    readonly roleUsed: AgentRole | 'none'
    readonly compiledAt: string
    readonly includedLayers: readonly PromptLayerName[]
    readonly layerMetadata: readonly LayerMetadata[]
    /** Full compiled text (sanitized, no secrets). */
    readonly text: string
  } | undefined
}
