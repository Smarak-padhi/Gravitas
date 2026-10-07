/**
 * @gravitas/prompts — Capability Profile Types
 *
 * Models versioned, provenance-backed capability knowledge objects synthesized
 * from Skill Arena (SA3) and qualified design-engineering sources (Impeccable).
 *
 * Invariants:
 * - SOURCE_SKILL != CANONICAL_SKILL
 * - RAW_RULE != APPROVED_RULE
 * - DESIGN_REFERENCE != GLOBAL_INSTRUCTION
 * - HUMAN_DIRECTION > PROJECT DESIGN.md > CONTEXTUAL_PROFILE > IMPECCABLE_BASELINE
 * - ACCESSIBILITY_FLOOR != OPTIONAL_AESTHETIC
 */

export type CapabilityCategory =
  | 'GLOBAL_ENGINEERING'
  | 'PLATFORM'
  | 'CONTEXTUAL'
  | 'DESIGN_ENGINEERING'
  | 'SPECIALIST'

export type CapabilityPlatform = 'android' | 'ios' | 'web' | 'universal'

export type RuleSeverity = 'MANDATORY' | 'RECOMMENDED' | 'ADVISORY'

export type ProfileStatus = 'ACTIVE_CANONICAL' | 'DEPRECATED' | 'TECHNICAL_HOLD'

export interface CapabilityRule {
  readonly id: string
  readonly statement: string
  readonly rationale?: string | undefined
  readonly sourceRuleId: string
  readonly severity: RuleSeverity
  readonly category: string
  readonly isAccessibilityFloor?: boolean | undefined
  readonly isSecurityFloor?: boolean | undefined
}

export interface ActivationConditions {
  readonly platforms?: readonly ('android' | 'ios' | 'web')[] | undefined
  readonly roles?: readonly string[] | undefined
  readonly keywords?: readonly string[] | undefined
  readonly fileExtensions?: readonly string[] | undefined
  readonly requireFrontendContext?: boolean | undefined
}

export interface CapabilityProfile {
  readonly id: string
  readonly version: string
  readonly title: string
  readonly category: CapabilityCategory
  readonly scope: string
  readonly activationConditions: ActivationConditions
  readonly rules: readonly CapabilityRule[]
  readonly sourceRefs: readonly string[]
  readonly sourceHashes: readonly string[]
  readonly authorityClass: string
  readonly conflicts: readonly string[]
  readonly platform?: CapabilityPlatform | undefined
  readonly context?: readonly string[] | undefined
  readonly status: ProfileStatus
}

export interface ProfileActivationContext {
  readonly taskTitle: string
  readonly taskDescription?: string | undefined
  readonly assignedRoleId?: string | undefined
  readonly targetPlatform?: CapabilityPlatform | undefined
  readonly targetFiles?: readonly string[] | undefined
  readonly projectDesignDoc?: string | undefined
  readonly humanDirectives?: readonly string[] | undefined
}

export interface ActivationDecision {
  readonly profileId: string
  readonly profileTitle: string
  readonly version: string
  readonly activated: boolean
  readonly reason: string
  readonly provenance: readonly string[]
}

export interface AccessibilityConflict {
  readonly ruleId: string
  readonly ruleStatement: string
  readonly conflictingDirective: string
  readonly source: 'HUMAN_DIRECTIVE' | 'PROJECT_DESIGN_MD'
  readonly resolution: 'SURFACED_CONFLICT_MANDATORY_FLOOR_HELD'
}

export interface CapabilityResolutionResult {
  readonly activeProfiles: readonly CapabilityProfile[]
  readonly decisions: readonly ActivationDecision[]
  readonly conflicts: readonly AccessibilityConflict[]
  readonly compiledPromptText: string
  readonly digest: string
}
