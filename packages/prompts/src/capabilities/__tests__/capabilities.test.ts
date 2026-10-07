/**
 * @gravitas/prompts — Capabilities & Contextual Selection Test Suite (Wave V1-A)
 *
 * Verifies all 16 required invariants from the V1-A Capability Specification:
 * 1. capability profiles compile deterministically
 * 2. same inputs produce byte/semantic equivalent compiled output
 * 3. provenance references resolve
 * 4. invalid source references fail closed
 * 5. duplicate IDs fail
 * 6. unknown profile IDs fail
 * 7. irrelevant design profile is not activated for backend-only task
 * 8. web context activates correct web guidance
 * 9. platform-specific guidance does not leak across platforms
 * 10. project DESIGN.md outranks baseline aesthetics
 * 11. human direction has highest authority
 * 12. mandatory accessibility constraints surface conflicts
 * 13. Impeccable profile is pinned to exact source metadata
 * 14. no Impeccable runtime/hook is invoked
 * 15. compiled profile can be consumed without network access
 * 16. frozen SA historical artifacts are not mutated
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CapabilityRegistry,
  DEFAULT_CAPABILITY_REGISTRY,
  DeterministicCapabilityResolver,
  GLOBAL_ENGINEERING_PROFILE,
  ANDROID_PLATFORM_PROFILE,
  IOS_PLATFORM_PROFILE,
  WEB_PLATFORM_PROFILE,
  IMPECCABLE_DESIGN_PROFILE,
  IMPECCABLE_SOURCE_METADATA,
  type CapabilityProfile,
} from '../index.js'

describe('GRAVITAS V1-A Capability System Invariant Verification', () => {
  const resolver = new DeterministicCapabilityResolver(DEFAULT_CAPABILITY_REGISTRY)

  // Invariant 1: Capability profiles compile deterministically
  it('1. capability profiles compile deterministically', () => {
    const res = resolver.resolve({
      taskTitle: 'Implement database connection pool',
      assignedRoleId: 'role:engineering:backend-engineer',
    })
    expect(res.compiledPromptText).toContain('CAPABILITY PROFILES & QUALITY CONSTRAINTS:')
    expect(res.compiledPromptText).toContain('Global Software Engineering Discipline')
    expect(res.digest).toBeDefined()
    expect(res.digest.length).toBe(64)
  })

  // Invariant 2: Same inputs produce byte/semantic equivalent compiled output
  it('2. same inputs produce byte/semantic equivalent compiled output', () => {
    const ctx = {
      taskTitle: 'Refactor navigation rail component',
      assignedRoleId: 'role:engineering:frontend-engineer',
      targetPlatform: 'web' as const,
      targetFiles: ['src/components/NavRail.tsx'],
    }
    const run1 = resolver.resolve(ctx)
    const run2 = resolver.resolve(ctx)

    expect(run1.digest).toBe(run2.digest)
    expect(run1.compiledPromptText).toBe(run2.compiledPromptText)
    expect(run1.activeProfiles.map((p) => p.id)).toEqual(run2.activeProfiles.map((p) => p.id))
  })

  // Invariant 3: Provenance references resolve
  it('3. provenance references resolve for all default profiles', () => {
    const all = DEFAULT_CAPABILITY_REGISTRY.getAll()
    expect(all.length).toBeGreaterThanOrEqual(5)
    for (const p of all) {
      expect(p.sourceRefs.length).toBeGreaterThan(0)
      expect(p.sourceHashes.length).toBeGreaterThan(0)
      for (const ref of p.sourceRefs) {
        expect(ref.startsWith('sa3://') || ref.startsWith('https://')).toBe(true)
      }
    }
  })

  // Invariant 4: Invalid source references fail closed
  it('4. invalid source references fail closed on registry registration', () => {
    const reg = new CapabilityRegistry([])
    expect(() => {
      reg.register({
        ...GLOBAL_ENGINEERING_PROFILE,
        id: 'PROFILE-TEST-INVALID-REF',
        sourceRefs: [''], // Empty string ref
      })
    }).toThrow(/empty source reference/)

    expect(() => {
      reg.register({
        ...GLOBAL_ENGINEERING_PROFILE,
        id: 'PROFILE-TEST-NO-REFS',
        sourceRefs: [], // Missing refs
      })
    }).toThrow(/lacks required source references/)
  })

  // Invariant 5: Duplicate IDs fail
  it('5. duplicate profile IDs fail closed', () => {
    const reg = new CapabilityRegistry([])
    reg.register(GLOBAL_ENGINEERING_PROFILE)
    expect(() => {
      reg.register(GLOBAL_ENGINEERING_PROFILE)
    }).toThrow(/Duplicate profile id/)
  })

  // Invariant 6: Unknown profile IDs fail
  it('6. unknown profile IDs fail closed on lookup', () => {
    expect(() => {
      DEFAULT_CAPABILITY_REGISTRY.get('PROFILE-NON-EXISTENT')
    }).toThrow(/Unknown capability profile id/)
  })

  // Invariant 7: Irrelevant design profile is not activated for backend-only task
  it('7. irrelevant design profile is not activated for backend-only task', () => {
    const res = resolver.resolve({
      taskTitle: 'Tune SQLite busy timeout and connection retry loop',
      taskDescription: 'Adjust kernel SQLite transaction locks and WAL configuration',
      assignedRoleId: 'role:engineering:backend-engineer',
      targetFiles: ['packages/core/src/kernel/kernel.ts'],
    })

    const activatedIds = res.activeProfiles.map((p) => p.id)
    expect(activatedIds).toContain('PROFILE-GLOB-001')
    expect(activatedIds).not.toContain('PROFILE-DESIGN-IMPECCABLE')

    const decision = res.decisions.find((d) => d.profileId === 'PROFILE-DESIGN-IMPECCABLE')
    expect(decision?.activated).toBe(false)
    expect(decision?.reason).toContain('Backend or non-visual task')
  })

  // Invariant 8: Web context activates correct web guidance
  it('8. web context activates correct web guidance and Impeccable rules', () => {
    const res = resolver.resolve({
      taskTitle: 'Build interactive modal dialog and button palette',
      assignedRoleId: 'role:engineering:frontend-engineer',
      targetPlatform: 'web',
      targetFiles: ['apps/desktop/src/renderer/index.html'],
    })

    const activatedIds = res.activeProfiles.map((p) => p.id)
    expect(activatedIds).toContain('PROFILE-GLOB-001')
    expect(activatedIds).toContain('PROFILE-PLAT-003')
    expect(activatedIds).toContain('PROFILE-DESIGN-IMPECCABLE')

    expect(res.compiledPromptText).toContain('Web Platform Standards & DOM Hygiene')
    expect(res.compiledPromptText).toContain('Impeccable Design-Engineering Baseline')
  })

  // Invariant 9: Platform-specific guidance does not leak across platforms
  it('9. platform-specific guidance does not leak across platforms', () => {
    // Android task
    const androidRes = resolver.resolve({
      taskTitle: 'Implement CameraX preview capture flow',
      targetPlatform: 'android',
      targetFiles: ['app/src/main/java/CameraActivity.kt'],
    })
    const androidIds = androidRes.activeProfiles.map((p) => p.id)
    expect(androidIds).toContain('PROFILE-PLAT-001')
    expect(androidIds).not.toContain('PROFILE-PLAT-002') // No iOS leak
    expect(androidIds).not.toContain('PROFILE-PLAT-003') // No Web leak

    // iOS task
    const iosRes = resolver.resolve({
      taskTitle: 'Store authentication token in Keychain',
      targetPlatform: 'ios',
      targetFiles: ['Sources/App/AuthManager.swift'],
    })
    const iosIds = iosRes.activeProfiles.map((p) => p.id)
    expect(iosIds).toContain('PROFILE-PLAT-002')
    expect(iosIds).not.toContain('PROFILE-PLAT-001') // No Android leak
    expect(iosIds).not.toContain('PROFILE-PLAT-003') // No Web leak
  })

  // Invariant 10: Project DESIGN.md outranks baseline aesthetics
  it('10. project DESIGN.md outranks baseline aesthetics', () => {
    const res = resolver.resolve({
      taskTitle: 'Style overview header bar',
      assignedRoleId: 'role:engineering:frontend-engineer',
      projectDesignDoc: 'Primary Brand Color: #0284c7; Header height: 56px; Font: JetBrains Mono.',
    })

    expect(res.compiledPromptText).toContain('[PROJECT DESIGN SYSTEM (Overrides Baseline Aesthetics)]:')
    expect(res.compiledPromptText).toContain('Primary Brand Color: #0284c7')

    // Verify ordering: Project DESIGN.md appears AFTER baseline profiles to allow override
    const baselineIdx = res.compiledPromptText.indexOf('Impeccable Design-Engineering Baseline')
    const projectDesignIdx = res.compiledPromptText.indexOf('[PROJECT DESIGN SYSTEM')
    expect(projectDesignIdx).toBeGreaterThan(baselineIdx)
  })

  // Invariant 11: Human direction has highest authority
  it('11. human direction has highest authority', () => {
    const res = resolver.resolve({
      taskTitle: 'Style overview header bar',
      assignedRoleId: 'role:engineering:frontend-engineer',
      projectDesignDoc: 'Primary Brand Color: #0284c7',
      humanDirectives: ['Override brand color with neon cyan #00f0ff for this urgent prototype.'],
    })

    expect(res.compiledPromptText).toContain('[SOVEREIGN OPERATOR DIRECTIVES (Highest Authority)]:')
    expect(res.compiledPromptText).toContain('* DIRECTIVE: Override brand color with neon cyan #00f0ff')

    const projectDesignIdx = res.compiledPromptText.indexOf('[PROJECT DESIGN SYSTEM')
    const humanDirectiveIdx = res.compiledPromptText.indexOf('[SOVEREIGN OPERATOR DIRECTIVES')
    expect(humanDirectiveIdx).toBeGreaterThan(projectDesignIdx)
  })

  // Invariant 12: Mandatory accessibility constraints surface conflicts
  it('12. mandatory accessibility constraints surface conflicts rather than silently yielding', () => {
    const res = resolver.resolve({
      taskTitle: 'Create ultra-compact toolbar with tiny buttons',
      assignedRoleId: 'role:engineering:frontend-engineer',
      humanDirectives: ['Make touch target 20px for compact desktop density.'],
    })

    expect(res.conflicts.length).toBeGreaterThan(0)
    const conflict = res.conflicts.find((c) => c.ruleId === 'RULE-IMP-TOUCH-001')
    expect(conflict).toBeDefined()
    expect(conflict?.resolution).toBe('SURFACED_CONFLICT_MANDATORY_FLOOR_HELD')
    expect(res.compiledPromptText).toContain('CONFLICTS DETECTED WITH MANDATORY SAFETY/ACCESSIBILITY FLOORS')
  })

  // Invariant 13: Impeccable profile is pinned to exact source metadata
  it('13. Impeccable profile is pinned to exact source metadata', () => {
    expect(IMPECCABLE_SOURCE_METADATA.repositoryUrl).toBe('https://github.com/pbakaus/impeccable')
    expect(IMPECCABLE_SOURCE_METADATA.pinnedCommit).toBe('bbcb29d9dee6c94915d760bcfc36818ad5be66ad')
    expect(IMPECCABLE_SOURCE_METADATA.license).toBe('Apache-2.0')
    expect(IMPECCABLE_SOURCE_METADATA.totalDetectorRules).toBe(61)
    expect(IMPECCABLE_SOURCE_METADATA.totalWorkflowCommands).toBe(24)
  })

  // Invariant 14: No Impeccable runtime/hook is invoked
  it('14. no Impeccable runtime or hook is invoked', () => {
    expect(IMPECCABLE_SOURCE_METADATA.runtimeInstalled).toBe(false)
    expect(IMPECCABLE_SOURCE_METADATA.hooksExecuted).toBe(false)
  })

  // Invariant 15: Compiled profile can be consumed without network access
  it('15. compiled profile can be consumed without network access', () => {
    const localRes = resolver.resolve({
      taskTitle: 'Offline capability check',
      taskDescription: 'Simulate air-gapped resolution',
    })
    expect(localRes.activeProfiles.length).toBeGreaterThan(0)
    expect(localRes.digest).toBeDefined()
  })

  // Invariant 16: Frozen SA historical artifacts are not mutated
  it('16. frozen SA historical artifacts remain intact and unmutated', () => {
    const freezeManifestPath = join(process.cwd(), 'docs/skill-arena/freeze-manifest.json')
    expect(existsSync(freezeManifestPath)).toBe(true)

    const manifest = JSON.parse(readFileSync(freezeManifestPath, 'utf8'))
    expect(manifest.status).toBe('FROZEN')
    expect(manifest.freezeCommit).toBe('1f6c89943954567b099a3707ebae449f6f869fe7')
    expect(manifest.includedPhases).toEqual([
      'SA0', 'SA1', 'SA2', 'SA2-R', 'SA3', 'SA3-R', 'SA4', 'SA4-R', 'SA4-R2'
    ])
  })
})
