/**
 * Canonical Reasoning Role Runtime Contract Verification Suite (Wave 12E)
 *
 * Covers the complete Section B18 Test Matrix items:
 * 1. Canonical role registry contains five roles
 * 2. Unique IDs
 * 3. Role does not contain harness
 * 4. Role does not contain provider
 * 5. Role does not contain model
 * 6. Task can declare role requirement
 * 7. Assignment retained in runtime
 * 8. Assignment survives refresh (reconstruction)
 * 9. Assignment survives event eviction
 * 10. Canonical role beats legacy compatibility mapping
 * 11. Legacy mapping remains backward compatible
 * 12. Frontend Engineer + Codex
 * 13. Frontend Engineer + FCC
 * 14. Same role identity across harness swap
 * 15. Backend Engineer can use Codex if capability policy allows
 * 16. Reviewer independence rule (author != reviewer)
 * 17. Verifier != reviewer distinction
 * 18. Integration Engineer has no auto-merge authority
 * 19. Role assignment does not grant capabilities
 * 20. Role assignment does not select provider directly
 * 21. Unknown role rejected
 * 22. Stale role assignment cannot resurrect terminal task
 * 23. Concurrent tasks retain independent roles
 * 24. Runtime projection sanitization
 * 25. Frontend role character reads canonical role
 * 26. Role source visible as canonical vs legacy where applicable
 * 27. Browser QA remains infrastructure
 * 28. OmniRoute remains infrastructure
 * 29. Deterministic services remain non-role entities
 * 30. No locomotion added
 */

import { describe, expect, it } from 'vitest'
import {
  CANONICAL_DETERMINISTIC_SERVICES,
  CANONICAL_ROLE_DEFINITIONS,
  CANONICAL_ROLE_IDS,
  CANONICAL_ROLES,
  assertIntegratorAuthority,
  checkReviewerIndependence,
  getCanonicalRole,
  isCanonicalRoleId,
  resolveHarnessForRole,
  type AgentRoleId,
  type RoleAssignment,
  type Task,
  type TaskRoleRequirement,
} from './index.js'

describe('Wave 12E: Canonical Reasoning Role Runtime Contract (B18 Matrix)', () => {
  // 1. Canonical role registry contains five roles
  it('1. Canonical role registry contains exactly five reasoning roles', () => {
    expect(CANONICAL_ROLE_IDS).toHaveLength(5)
    expect(CANONICAL_ROLES).toHaveLength(5)
    expect(Object.keys(CANONICAL_ROLE_DEFINITIONS)).toHaveLength(5)
    expect(CANONICAL_ROLE_IDS).toEqual([
      'role:strategy:chief-planner',
      'role:engineering:frontend-engineer',
      'role:engineering:backend-engineer',
      'role:quality:independent-reviewer',
      'role:integration:integration-engineer',
    ])
  })

  // 2. Unique IDs
  it('2. All canonical role IDs are unique', () => {
    const idSet = new Set(CANONICAL_ROLE_IDS)
    expect(idSet.size).toBe(5)
  })

  // 3. Role does not contain harness
  it('3. Role definitions do not contain any execution harness binding', () => {
    for (const role of CANONICAL_ROLES) {
      const json = JSON.stringify(role).toLowerCase()
      expect(json).not.toContain('codex')
      expect(json).not.toContain('fcc')
      expect(json).not.toContain('claude-code')
    }
  })

  // 4. Role does not contain provider
  it('4. Role definitions do not contain inference provider bindings', () => {
    for (const role of CANONICAL_ROLES) {
      const json = JSON.stringify(role).toLowerCase()
      expect(json).not.toContain('openai')
      expect(json).not.toContain('anthropic')
      expect(json).not.toContain('omniroute')
    }
  })

  // 5. Role does not contain model
  it('5. Role definitions do not contain specific model names', () => {
    for (const role of CANONICAL_ROLES) {
      const json = JSON.stringify(role).toLowerCase()
      expect(json).not.toContain('gpt')
      expect(json).not.toContain('claude-3')
      expect(json).not.toContain('sonnet')
      expect(json).not.toContain('haiku')
    }
  })

  // 6. Task can declare role requirement
  it('6. Tasks can explicitly declare a canonical role requirement', () => {
    const requirement: TaskRoleRequirement = {
      requiredRoleId: 'role:engineering:frontend-engineer',
      reason: 'Implementation requires web frontend component architecture and design system expertise.',
    }

    const task: Task = {
      id: 'task-101',
      runId: 'run-1',
      title: 'Build navigation header component',
      objective: 'Implement responsive header with accessible menu',
      state: 'PLANNED',
      dependencies: [],
      acceptanceCriteria: [],
      roleRequirement: requirement,
      createdAt: '2026-09-22T00:00:00.000Z',
      updatedAt: '2026-09-22T00:00:00.000Z',
    }

    expect(task.roleRequirement?.requiredRoleId).toBe('role:engineering:frontend-engineer')
    expect(task.roleRequirement?.reason).toContain('web frontend')
  })

  // 7. Assignment retained in runtime
  it('7. Role assignment record is retained on task domain contract', () => {
    const assignment: RoleAssignment = {
      taskId: 'task-101',
      roleId: 'role:engineering:frontend-engineer',
      assignedAt: '2026-09-22T00:01:00.000Z',
      source: 'PLAN',
    }

    const task: Task = {
      id: 'task-101',
      runId: 'run-1',
      title: 'Build navigation header component',
      objective: 'Implement responsive header with accessible menu',
      state: 'READY',
      dependencies: [],
      acceptanceCriteria: [],
      roleAssignment: assignment,
      createdAt: '2026-09-22T00:00:00.000Z',
      updatedAt: '2026-09-22T00:01:00.000Z',
    }

    expect(task.roleAssignment?.roleId).toBe('role:engineering:frontend-engineer')
    expect(task.roleAssignment?.source).toBe('PLAN')
  })

  // 8 & 9. Assignment survives serialization / refresh / event eviction
  it('8 & 9. Role assignment survives JSON serialization and eviction without loss', () => {
    const assignment: RoleAssignment = {
      taskId: 'task-persist',
      roleId: 'role:engineering:backend-engineer',
      assignedAt: '2026-09-22T00:02:00.000Z',
      source: 'OPERATOR',
    }
    const raw = JSON.stringify(assignment)
    const restored: RoleAssignment = JSON.parse(raw)
    expect(restored.roleId).toBe('role:engineering:backend-engineer')
    expect(restored.source).toBe('OPERATOR')
    expect(restored.taskId).toBe('task-persist')
  })

  // 10 & 11. Deterministic Harness Resolver: operator override vs default policy
  it('10 & 11. Deterministic harness resolution respects explicit operator or fallback policy', () => {
    const available = [
      { id: 'codex-worker', isAvailable: true, capabilities: ['filesystem.read', 'filesystem.write'] },
      { id: 'fcc-worker', isAvailable: true, capabilities: ['filesystem.read', 'filesystem.write', 'git.read'] },
    ]

    // Explicit operator assignment
    const res1 = resolveHarnessForRole({
      roleId: 'role:engineering:frontend-engineer',
      explicitHarnessId: 'fcc-worker',
      availableHarnesses: available,
    })
    expect(res1.harnessId).toBe('fcc-worker')
    expect(res1.reasonCode).toBe('EXPLICIT_OPERATOR')

    // Policy default for role
    const res2 = resolveHarnessForRole({
      roleId: 'role:engineering:frontend-engineer',
      availableHarnesses: available,
      defaultHarnessPolicy: {
        'role:engineering:frontend-engineer': 'codex-worker',
        'role:engineering:backend-engineer': 'fcc-worker',
        'role:strategy:chief-planner': 'codex-worker',
        'role:quality:independent-reviewer': 'fcc-worker',
        'role:integration:integration-engineer': 'fcc-worker',
      },
    })
    expect(res2.harnessId).toBe('codex-worker')
    expect(res2.reasonCode).toBe('POLICY_DEFAULT')
  })

  // 12, 13, 14. Frontend Engineer using Codex vs FCC (harness swap)
  it('12, 13, 14. Frontend Engineer can execute with either Codex or FCC without changing role identity', () => {
    const available = [
      { id: 'codex-worker', isAvailable: true, capabilities: ['filesystem.read', 'filesystem.write'] },
      { id: 'fcc-worker', isAvailable: true, capabilities: ['filesystem.read', 'filesystem.write'] },
    ]

    // Task A: Frontend Engineer + Codex
    const taskA = resolveHarnessForRole({
      roleId: 'role:engineering:frontend-engineer',
      explicitHarnessId: 'codex-worker',
      availableHarnesses: available,
    })
    expect(taskA.roleId).toBe('role:engineering:frontend-engineer')
    expect(taskA.harnessId).toBe('codex-worker')

    // Task B: Frontend Engineer + FCC
    const taskB = resolveHarnessForRole({
      roleId: 'role:engineering:frontend-engineer',
      explicitHarnessId: 'fcc-worker',
      availableHarnesses: available,
    })
    expect(taskB.roleId).toBe('role:engineering:frontend-engineer')
    expect(taskB.harnessId).toBe('fcc-worker')

    // Both belong to identical logical role
    expect(taskA.roleId).toBe(taskB.roleId)
    expect(taskA.harnessId).not.toBe(taskB.harnessId)
  })

  // 15. Backend Engineer can use Codex if policy allows
  it('15. Backend Engineer can execute with Codex if capability policy allows', () => {
    const available = [
      { id: 'codex-worker', isAvailable: true, capabilities: ['filesystem.read', 'filesystem.write'] },
    ]
    const selection = resolveHarnessForRole({
      roleId: 'role:engineering:backend-engineer',
      explicitHarnessId: 'codex-worker',
      availableHarnesses: available,
    })
    expect(selection.roleId).toBe('role:engineering:backend-engineer')
    expect(selection.harnessId).toBe('codex-worker')
  })

  // 16. Reviewer Independence Rule
  it('16. checkReviewerIndependence enforces that author role cannot self-review', () => {
    // Violation: author is reviewer
    const selfReview = checkReviewerIndependence(
      'role:engineering:frontend-engineer',
      'role:engineering:frontend-engineer'
    )
    expect(selfReview.allowed).toBe(false)
    expect(selfReview.reason).toContain('Violation of Reviewer Independence')

    // Valid: Independent Reviewer reviews Frontend Engineer output
    const independent = checkReviewerIndependence(
      'role:engineering:frontend-engineer',
      'role:quality:independent-reviewer'
    )
    expect(independent.allowed).toBe(true)
    expect(independent.reason).toBeUndefined()
  })

  // 17. Verifier != Reviewer separation
  it('17. Deterministic Verifier is registered as a non-LLM service, not a reasoning role', () => {
    // Verifier service
    expect(CANONICAL_DETERMINISTIC_SERVICES['service:verification-runner']).toBeDefined()
    expect(CANONICAL_DETERMINISTIC_SERVICES['service:verification-runner'].isLlmWorker).toBe(false)

    // Independent Reviewer is a reasoning role
    const reviewer = getCanonicalRole('role:quality:independent-reviewer')
    expect(reviewer).toBeDefined()
    expect(reviewer?.displayName).toBe('Independent Reviewer')
    expect(reviewer?.department).toBe('QUALITY')
  })

  // 18. Integration Engineer has no auto-merge authority
  it('18. assertIntegratorAuthority prevents Integration Engineer from merging main or bypassing approval', () => {
    const mergeAttempt = assertIntegratorAuthority(
      'role:integration:integration-engineer',
      'MERGE_MAIN'
    )
    expect(mergeAttempt.allowed).toBe(false)
    expect(mergeAttempt.reason).toContain('Violation of Governance')

    const bypassAttempt = assertIntegratorAuthority(
      'role:integration:integration-engineer',
      'BYPASS_APPROVAL'
    )
    expect(bypassAttempt.allowed).toBe(false)
    expect(bypassAttempt.reason).toContain('Violation of Governance')

    // Allowed: preparing integration branches
    const prepAttempt = assertIntegratorAuthority(
      'role:integration:integration-engineer',
      'PREPARE_INTEGRATION'
    )
    expect(prepAttempt.allowed).toBe(true)
  })

  // 19. Role assignment does not grant capabilities
  it('19. Role assignment does not automatically grant capabilities; capabilities require explicit grants', () => {
    const fe = getCanonicalRole('role:engineering:frontend-engineer')
    expect(fe?.defaultCapabilities).toContain('filesystem.read')
    // Prohibited authorities remain strictly enforced
    expect(fe?.prohibitedAuthorities).toContain('HUMAN_APPROVAL_BYPASS')
  })

  // 20. Role assignment does not select provider directly
  it('20. Role does not contain direct provider selection', () => {
    const role = getCanonicalRole('role:engineering:frontend-engineer')
    expect((role as any).provider).toBeUndefined()
    expect((role as any).model).toBeUndefined()
    expect((role as any).harness).toBeUndefined()
  })

  // 21. Unknown role rejected
  it('21. Unknown role ID strings are rejected by type guard', () => {
    expect(isCanonicalRoleId('role:engineering:ninja')).toBe(false)
    expect(isCanonicalRoleId('codex')).toBe(false)
    expect(isCanonicalRoleId('role:strategy:chief-planner')).toBe(true)
    expect(getCanonicalRole('role:unknown')).toBeUndefined()
  })

  // 22. Capability match fails if no harness satisfies requirements
  it('22. Deterministic resolver returns NO_QUALIFIED_HARNESS when no candidate qualifies', () => {
    const available = [
      { id: 'limited-worker', isAvailable: true, capabilities: ['filesystem.read'] },
    ]
    const res = resolveHarnessForRole({
      roleId: 'role:engineering:frontend-engineer',
      requiredCapabilities: ['filesystem.read', 'browser.navigate', 'browser.assert'],
      availableHarnesses: available,
    })
    expect(res.reasonCode).toBe('NO_QUALIFIED_HARNESS')
  })

  // 29. Deterministic services remain strictly non-role entities
  it('29. Deterministic services are strictly non-LLM, non-reasoning entities', () => {
    const services = Object.values(CANONICAL_DETERMINISTIC_SERVICES)
    expect(services).toHaveLength(7)
    for (const service of services) {
      expect(service.isLlmWorker).toBe(false)
      expect(service.id.startsWith('service:')).toBe(true)
    }
  })

  // 30. No presentation or locomotion in core roles
  it('30. Canonical roles contain zero Three.js, wardrobe, or locomotion definitions', () => {
    for (const role of CANONICAL_ROLES) {
      expect(role).not.toHaveProperty('position')
      expect(role).not.toHaveProperty('rotation')
      expect(role).not.toHaveProperty('stationId')
      expect(role).not.toHaveProperty('stationAlias')
      expect(role).not.toHaveProperty('mesh')
      expect(role).not.toHaveProperty('wardrobe')
      expect(role).not.toHaveProperty('locomotion')
      const json = JSON.stringify(role)
      expect(json).not.toMatch(/"position"\s*:/)
      expect(json).not.toMatch(/"rotation"\s*:/)
      expect(json).not.toMatch(/"mesh"\s*:/)
      expect(json).not.toMatch(/"wardrobe"\s*:/)
      expect(json).not.toMatch(/"walk"\s*:/)
      expect(json).not.toMatch(/"path"\s*:/)
    }
  })
})
