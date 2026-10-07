/**
 * @gravitas/prompts — Capability Knowledge Subsystem
 *
 * Public entrypoint for runtime capability profiles, registries, and resolvers.
 */

export type {
  CapabilityCategory,
  CapabilityPlatform,
  RuleSeverity,
  ProfileStatus,
  CapabilityRule,
  ActivationConditions,
  CapabilityProfile,
  ProfileActivationContext,
  ActivationDecision,
  AccessibilityConflict,
  CapabilityResolutionResult,
} from './types.js'

export { GLOBAL_ENGINEERING_PROFILE } from './profiles/global.js'
export {
  ANDROID_PLATFORM_PROFILE,
  IOS_PLATFORM_PROFILE,
  WEB_PLATFORM_PROFILE,
  PLATFORM_PROFILES,
} from './profiles/platforms.js'
export {
  IMPECCABLE_DESIGN_PROFILE,
  IMPECCABLE_SOURCE_METADATA,
} from './profiles/impeccable.js'

export { CapabilityRegistry, DEFAULT_CAPABILITY_REGISTRY } from './registry.js'
export { DeterministicCapabilityResolver } from './resolver.js'
