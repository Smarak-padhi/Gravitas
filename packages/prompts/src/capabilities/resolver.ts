/**
 * @gravitas/prompts — Deterministic Capability Resolver
 *
 * Implements explainable, deterministic selection of capability profiles.
 *
 * Invariants:
 * - NO "LOAD EVERYTHING" — activates only relevant profiles.
 * - Selection is 100% explainable (WHY activated, WHY rejected, WHAT provenance, WHAT version).
 * - Zero model inference required.
 * - Design Authority Hierarchy:
 *     HUMAN DIRECTION > PROJECT DESIGN.md > CONTEXTUAL PROFILE > IMPECCABLE BASELINE
 * - Mandatory accessibility floors cannot be silently disabled.
 */

import { createHash } from 'node:crypto'
import type { CapabilityRegistry } from './registry.js'
import type {
  CapabilityProfile,
  ProfileActivationContext,
  ActivationDecision,
  AccessibilityConflict,
  CapabilityResolutionResult,
} from './types.js'

export class DeterministicCapabilityResolver {
  private readonly registry: CapabilityRegistry

  constructor(registry: CapabilityRegistry) {
    this.registry = registry
  }

  public resolve(context: ProfileActivationContext): CapabilityResolutionResult {
    const activeProfiles: CapabilityProfile[] = []
    const decisions: ActivationDecision[] = []
    const conflicts: AccessibilityConflict[] = []

    const textToScan = `${context.taskTitle} ${context.taskDescription ?? ''}`.toLowerCase()
    const targetFiles = context.targetFiles ?? []
    const assignedRole = context.assignedRoleId ?? ''
    const explicitPlatform = context.targetPlatform

    // Determine frontend context
    const isFrontendRole = assignedRole.includes('frontend') || assignedRole.includes('ui')
    const hasUiExtension = targetFiles.some((f) => /\.(css|scss|html|tsx|jsx|vue|svelte|svg)$/i.test(f))
    const hasUiKeywords = /\b(ui|design|frontend|css|html|layout|styling|visual|theme|color|button|modal|typography)\b/i.test(textToScan)
    const isFrontendContext = isFrontendRole || hasUiExtension || hasUiKeywords

    // Determine platform context
    const hasAndroidFiles = targetFiles.some((f) => /\.(kt|kts|gradle|xml)$/i.test(f))
    const hasAndroidKeywords = /\b(android|compose|kotlin|gradle|jetpack|aar)\b/i.test(textToScan)
    const isAndroidContext = explicitPlatform === 'android' || hasAndroidFiles || hasAndroidKeywords

    const hasIosFiles = targetFiles.some((f) => /\.(swift|xcstrings|plist|xcodeproj|xcworkspace)$/i.test(f))
    const hasIosKeywords = /\b(ios|swift|swiftui|apple|xcode|macos|keychain)\b/i.test(textToScan)
    const isIosContext = explicitPlatform === 'ios' || hasIosFiles || hasIosKeywords

    const hasWebFiles = targetFiles.some((f) => /\.(html|css|tsx|jsx|ts|mjs)$/i.test(f))
    const hasWebKeywords = /\b(web|browser|dom|css|html|react|vite|electron)\b/i.test(textToScan)
    const isWebContext = explicitPlatform === 'web' || (!isAndroidContext && !isIosContext && (hasWebFiles || hasWebKeywords))

    for (const profile of this.registry.getAll()) {
      let activated = false
      let reason = ''

      if (profile.category === 'GLOBAL_ENGINEERING') {
        activated = true
        reason = 'Activated globally for all engineering tasks (Universal discipline).'
      } else if (profile.category === 'PLATFORM') {
        if (profile.platform === 'android') {
          if (explicitPlatform === 'ios' || explicitPlatform === 'web') {
            activated = false
            reason = `Rejected: Task explicitly targets ${explicitPlatform}; cross-platform Android leak prevented.`
          } else if (isAndroidContext) {
            activated = true
            reason = 'Activated by Android platform context (file match or keywords).'
          } else {
            activated = false
            reason = 'Rejected: Task does not match Android target criteria.'
          }
        } else if (profile.platform === 'ios') {
          if (explicitPlatform === 'android' || explicitPlatform === 'web') {
            activated = false
            reason = `Rejected: Task explicitly targets ${explicitPlatform}; cross-platform iOS leak prevented.`
          } else if (isIosContext) {
            activated = true
            reason = 'Activated by iOS platform context (file match or keywords).'
          } else {
            activated = false
            reason = 'Rejected: Task does not match iOS target criteria.'
          }
        } else if (profile.platform === 'web') {
          if (explicitPlatform === 'android' || explicitPlatform === 'ios') {
            activated = false
            reason = `Rejected: Task explicitly targets ${explicitPlatform}; cross-platform Web leak prevented.`
          } else if (isWebContext) {
            activated = true
            reason = 'Activated by Web platform context (browser/DOM environment).'
          } else {
            activated = false
            reason = 'Rejected: Task does not match Web target criteria.'
          }
        }
      } else if (profile.category === 'DESIGN_ENGINEERING') {
        if (isFrontendContext) {
          activated = true
          reason = 'Activated by Frontend / UI context (role, UI files, or design keywords).'
        } else {
          activated = false
          reason = 'Rejected: Backend or non-visual task; visual design profile is irrelevant.'
        }
      } else {
        activated = false
        reason = `Rejected: Default inactive status for category ${profile.category}.`
      }

      if (activated) {
        activeProfiles.push(profile)
      }

      decisions.push({
        profileId: profile.id,
        profileTitle: profile.title,
        version: profile.version,
        activated,
        reason,
        provenance: profile.sourceRefs,
      })
    }

    // Check for accessibility floor conflicts against project DESIGN.md or human directives
    if (isFrontendContext) {
      const impeccableProfile = activeProfiles.find((p) => p.id === 'PROFILE-DESIGN-IMPECCABLE')
      if (impeccableProfile) {
        const checkDirectives = [
          ...(context.humanDirectives ?? []).map((d) => ({ text: d, source: 'HUMAN_DIRECTIVE' as const })),
          ...(context.projectDesignDoc ? [{ text: context.projectDesignDoc, source: 'PROJECT_DESIGN_MD' as const }] : []),
        ]

        for (const dir of checkDirectives) {
          const lower = dir.text.toLowerCase()
          if (lower.includes('low contrast') || lower.includes('contrast 2:') || lower.includes('ignore wcag')) {
            conflicts.push({
              ruleId: 'RULE-IMP-COLOR-001',
              ruleStatement: 'Enforce WCAG AA minimum 4.5:1 contrast ratio.',
              conflictingDirective: dir.text,
              source: dir.source,
              resolution: 'SURFACED_CONFLICT_MANDATORY_FLOOR_HELD',
            })
          }
          if (lower.includes('touch target 20') || lower.includes('smaller than 44px') || lower.includes('compact touch')) {
            conflicts.push({
              ruleId: 'RULE-IMP-TOUCH-001',
              ruleStatement: 'Enforce minimum 44px by 44px interactive touch target size.',
              conflictingDirective: dir.text,
              source: dir.source,
              resolution: 'SURFACED_CONFLICT_MANDATORY_FLOOR_HELD',
            })
          }
        }
      }
    }

    // Compile active prompt section text
    const promptLines: string[] = []
    promptLines.push('CAPABILITY PROFILES & QUALITY CONSTRAINTS:')

    for (const p of activeProfiles) {
      promptLines.push(`\n[PROFILE: ${p.title} (${p.id} v${p.version})]`)
      for (const r of p.rules) {
        const floorMarker = r.isAccessibilityFloor ? ' [MANDATORY ACCESSIBILITY FLOOR]' : r.isSecurityFloor ? ' [MANDATORY SECURITY FLOOR]' : ''
        promptLines.push(`- (${r.severity}) ${r.statement}${floorMarker}`)
      }
    }

    // Apply Project DESIGN.md (outranks baseline aesthetics)
    if (context.projectDesignDoc?.trim()) {
      promptLines.push('\n[PROJECT DESIGN SYSTEM (Overrides Baseline Aesthetics)]:')
      promptLines.push(context.projectDesignDoc.trim())
    }

    // Apply Human Directives (Highest Authority)
    if (context.humanDirectives && context.humanDirectives.length > 0) {
      promptLines.push('\n[SOVEREIGN OPERATOR DIRECTIVES (Highest Authority)]:')
      for (const d of context.humanDirectives) {
        promptLines.push(`* DIRECTIVE: ${d}`)
      }
    }

    // Surface conflicts if any
    if (conflicts.length > 0) {
      promptLines.push('\n[ATTENTION: CONFLICTS DETECTED WITH MANDATORY SAFETY/ACCESSIBILITY FLOORS]:')
      for (const c of conflicts) {
        promptLines.push(`! CONFLICT: "${c.conflictingDirective}" (${c.source}) conflicts with ${c.ruleId} ("${c.ruleStatement}"). Resolution: Mandatory floor is held pending explicit operator clarification.`)
      }
    }

    const compiledPromptText = promptLines.join('\n')
    const digest = createHash('sha256').update(compiledPromptText, 'utf8').digest('hex')

    return {
      activeProfiles,
      decisions,
      conflicts,
      compiledPromptText,
      digest,
    }
  }
}
