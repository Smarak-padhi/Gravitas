/**
 * @gravitas/prompts — Impeccable Design-Engineering Capability Profile
 *
 * Compiles the qualified upstream design-engineering rulebook:
 * - Source Repository: https://github.com/pbakaus/impeccable
 * - Pinned Commit: bbcb29d9dee6c94915d760bcfc36818ad5be66ad
 * - License: Apache-2.0
 * - Extraction Version: 1.0.0
 *
 * Invariant Boundary:
 * IMPECCABLE_KNOWLEDGE != IMPECCABLE_RUNTIME
 * This module contains ONLY static, deterministic design rules and prompt guidance.
 * Zero external hooks, zero daemon binaries, zero live browser servers.
 *
 * Authority Hierarchy:
 * HUMAN DIRECTION > PROJECT DESIGN.md > CONTEXTUAL_PROFILE > IMPECCABLE_BASELINE
 * Mandatory accessibility and touch safety floors (e.g. 4.5:1 contrast, 44px touch targets)
 * cannot be silently disabled by project aesthetics.
 */

import type { CapabilityProfile } from '../types.js'

export const IMPECCABLE_SOURCE_METADATA = {
  repositoryUrl: 'https://github.com/pbakaus/impeccable',
  pinnedCommit: 'bbcb29d9dee6c94915d760bcfc36818ad5be66ad',
  license: 'Apache-2.0',
  totalDetectorRules: 61,
  totalWorkflowCommands: 24,
  runtimeInstalled: false,
  hooksExecuted: false,
} as const

export const IMPECCABLE_DESIGN_PROFILE: CapabilityProfile = {
  id: 'PROFILE-DESIGN-IMPECCABLE',
  version: '1.0.0',
  title: 'Impeccable Design-Engineering Baseline',
  category: 'DESIGN_ENGINEERING',
  scope: 'DESIGN_ENGINEERING_BASELINE',
  status: 'ACTIVE_CANONICAL',
  authorityClass: 'MANAGED_POLICY',
  conflicts: [],
  activationConditions: {
    requireFrontendContext: true,
    roles: ['role:engineering:frontend-engineer'],
    keywords: ['ui', 'design', 'frontend', 'layout', 'css', 'style', 'component', 'html', 'visual', 'color'],
    fileExtensions: ['.css', '.tsx', '.jsx', '.html', '.svg'],
  },
  sourceRefs: [
    'https://github.com/pbakaus/impeccable@bbcb29d9dee6c94915d760bcfc36818ad5be66ad',
  ],
  sourceHashes: [
    'sha256:bbcb29d9dee6c94915d760bcfc36818ad5be66ad',
  ],
  rules: [
    // 1. AI Slop Anti-Patterns
    {
      id: 'RULE-IMP-SLOP-001',
      sourceRuleId: 'IMP-SLOP-CARDS',
      statement: 'Avoid nested card proliferation; do not enclose cards inside parent cards with repetitive borders and drop-shadows.',
      severity: 'MANDATORY',
      category: 'AI_SLOP_ANTI_PATTERNS',
    },
    {
      id: 'RULE-IMP-SLOP-002',
      sourceRuleId: 'IMP-SLOP-GRADIENTS',
      statement: 'Reject generic purple-to-blue AI SaaS gradient tropes; anchor backgrounds in solid surfaces with calibrated dark/light luminance.',
      severity: 'MANDATORY',
      category: 'AI_SLOP_ANTI_PATTERNS',
    },
    {
      id: 'RULE-IMP-SLOP-003',
      sourceRuleId: 'IMP-SLOP-BADGES',
      statement: 'Eliminate meaningless decorative pill badges; badge elements must convey authentic semantic status or real runtime counts.',
      severity: 'RECOMMENDED',
      category: 'AI_SLOP_ANTI_PATTERNS',
    },

    // 2. Color & Contrast (Mandatory Accessibility Floor)
    {
      id: 'RULE-IMP-COLOR-001',
      sourceRuleId: 'IMP-COLOR-CONTRAST',
      statement: 'Enforce WCAG AA minimum 4.5:1 contrast ratio for normal body text and 3:1 for large text / graphical controls.',
      severity: 'MANDATORY',
      category: 'COLOR_AND_CONTRAST',
      isAccessibilityFloor: true,
    },
    {
      id: 'RULE-IMP-COLOR-002',
      sourceRuleId: 'IMP-COLOR-PALETTE',
      statement: 'Limit active primary hue palette to two functional accents; map secondary variations to semantic roles (success, warning, danger).',
      severity: 'RECOMMENDED',
      category: 'COLOR_AND_CONTRAST',
    },

    // 3. Typography & Pacing
    {
      id: 'RULE-IMP-TYPE-001',
      sourceRuleId: 'IMP-TYPE-RHYTHM',
      statement: 'Bound reading line length between 45 and 75 characters per line; set body line-height between 1.4 and 1.6.',
      severity: 'RECOMMENDED',
      category: 'TYPOGRAPHY',
    },
    {
      id: 'RULE-IMP-TYPE-002',
      sourceRuleId: 'IMP-TYPE-PAIRING',
      statement: 'Never mix more than two distinct font families on a single product surface; separate system UI font from code monospace font.',
      severity: 'RECOMMENDED',
      category: 'TYPOGRAPHY',
    },

    // 4. Layout & Spacing
    {
      id: 'RULE-IMP-LAYOUT-001',
      sourceRuleId: 'IMP-LAYOUT-GRID',
      statement: 'Constrain all padding, margin, and layout dimensions to an 8pt/4pt mathematical spacing scale.',
      severity: 'MANDATORY',
      category: 'LAYOUT_AND_SPACING',
    },
    {
      id: 'RULE-IMP-LAYOUT-002',
      sourceRuleId: 'IMP-LAYOUT-WHITESPACE',
      statement: 'Allow visual breathing room between discrete content groups; do not compress unrelated elements into tight grids.',
      severity: 'RECOMMENDED',
      category: 'LAYOUT_AND_SPACING',
    },

    // 5. Responsive & Touch (Mandatory Touch Floor)
    {
      id: 'RULE-IMP-TOUCH-001',
      sourceRuleId: 'IMP-TOUCH-TARGET',
      statement: 'Enforce minimum 44px by 44px interactive touch target size for buttons, inputs, and clickable list rows.',
      severity: 'MANDATORY',
      category: 'RESPONSIVE_AND_TOUCH',
      isAccessibilityFloor: true,
    },
    {
      id: 'RULE-IMP-TOUCH-002',
      sourceRuleId: 'IMP-TOUCH-INSETS',
      statement: 'Respect device safe area insets and avoid horizontal scrollbar clipping on constrained viewports.',
      severity: 'MANDATORY',
      category: 'RESPONSIVE_AND_TOUCH',
    },

    // 6. Motion & Animation
    {
      id: 'RULE-IMP-MOTION-001',
      sourceRuleId: 'IMP-MOTION-REDUCED',
      statement: 'Honor prefers-reduced-motion media query by disabling parallax, infinite loops, and heavy transition shifts.',
      severity: 'MANDATORY',
      category: 'MOTION',
      isAccessibilityFloor: true,
    },
    {
      id: 'RULE-IMP-MOTION-002',
      sourceRuleId: 'IMP-MOTION-TIMING',
      statement: 'Cap interactive animation durations at 150ms–300ms; use natural easing or spring physics instead of abrupt linear shifts.',
      severity: 'RECOMMENDED',
      category: 'MOTION',
    },

    // 7. Design System Consistency
    {
      id: 'RULE-IMP-SYS-001',
      sourceRuleId: 'IMP-SYS-TOKENS',
      statement: 'Centralize color, spacing, radius, and typography definitions into design tokens or CSS custom properties.',
      severity: 'MANDATORY',
      category: 'DESIGN_SYSTEM_CONSISTENCY',
    },
    {
      id: 'RULE-IMP-SYS-002',
      sourceRuleId: 'IMP-SYS-FOCUS',
      statement: 'Always preserve high-contrast visible focus indicators (:focus-visible) for all interactive keyboard tab stops.',
      severity: 'MANDATORY',
      category: 'DESIGN_SYSTEM_CONSISTENCY',
      isAccessibilityFloor: true,
    },
  ],
}
