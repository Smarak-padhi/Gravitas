/**
 * @gravitas/prompts — Global Engineering Capability Profile
 *
 * Compiles the 4 approved SA3 global engineering candidates:
 * - CANON-GLOB-001: Codebase Reuse & Discovery
 * - CANON-GLOB-002: Standard Library Over External Dependencies
 * - CANON-GLOB-003: Minimal Abstraction & YAGNI
 * - CANON-GLOB-004: Atomic Independent Verification
 *
 * Provenance:
 * Frozen SA3 candidates derived from RULE-PONY-CORE-000002, 000003, 000005, 000008.
 */

import type { CapabilityProfile } from '../types.js'

export const GLOBAL_ENGINEERING_PROFILE: CapabilityProfile = {
  id: 'PROFILE-GLOB-001',
  version: '1.0.0',
  title: 'Global Software Engineering Discipline',
  category: 'GLOBAL_ENGINEERING',
  scope: 'UNIVERSAL_ENGINEERING',
  activationConditions: {}, // Activates on all engineering tasks unconditionally
  authorityClass: 'MANAGED_POLICY',
  conflicts: [],
  platform: 'universal',
  status: 'ACTIVE_CANONICAL',
  sourceRefs: [
    'sa3://canonical-candidates/CANON-GLOB-001',
    'sa3://canonical-candidates/CANON-GLOB-002',
    'sa3://canonical-candidates/CANON-GLOB-003',
    'sa3://canonical-candidates/CANON-GLOB-004',
  ],
  sourceHashes: [
    'sha256:d018ee87799015c99eefea985b8fae77c413b5bf9fef9034ecfead31faecb68d',
  ],
  rules: [
    {
      id: 'RULE-GLOB-001',
      sourceRuleId: 'RULE-PONY-CORE-000002',
      statement: 'Inspect existing codebase and reuse proven local implementations before introducing new utilities, helpers, or data structures.',
      rationale: 'Prevents reinvention and reduces codebase surface area bloat.',
      severity: 'MANDATORY',
      category: 'REUSE',
    },
    {
      id: 'RULE-GLOB-002',
      sourceRuleId: 'RULE-PONY-CORE-000003',
      statement: 'Reach for language standard library and platform primitives before reaching for custom code or external third-party dependencies.',
      rationale: 'Reduces dependency supply-chain risk and binary size.',
      severity: 'MANDATORY',
      category: 'DEPENDENCY_MINIMIZATION',
    },
    {
      id: 'RULE-GLOB-003',
      sourceRuleId: 'RULE-PONY-CORE-000005',
      statement: 'Choose the simplest minimal solution that actually works; reject speculative flexibility, premature generalizations, and dead abstractions (YAGNI).',
      rationale: 'Reduces maintenance burden and cognitive overhead.',
      severity: 'MANDATORY',
      category: 'SIMPLICITY',
    },
    {
      id: 'RULE-GLOB-004',
      sourceRuleId: 'RULE-PONY-CORE-000008',
      statement: 'Structure changes so each unit of work is atomically verifiable against automated test suites and compiler checks.',
      rationale: 'Ensures deterministic falsification and clean causal attribution.',
      severity: 'MANDATORY',
      category: 'VERIFICATION_DISCIPLINE',
    },
  ],
}
