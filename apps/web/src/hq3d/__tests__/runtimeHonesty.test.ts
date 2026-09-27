/**
 * Gravitas 3D Headquarters — Runtime Honesty & Character State Invariants (Wave 12F-C)
 *
 * Verifies Section 11 Runtime Honesty requirements:
 * 1. IDLE does not show productive work (arms still, status IDLE, zero typing oscillation).
 * 2. PENDING alone does not automatically imply WORKING.
 * 3. PREPARING does not falsely imply worker execution (character in ATTENTION/alert, zero typing micro-motion).
 * 4. WORKER_RUNNING maps to the correct assigned role.
 * 5. WORKER_RUNNING maps Frontend Engineer to WORKING (FOCUSED posture, typing micro-motion active).
 * 6. End of worker execution stops WORKING (CLEANUP -> WAITING, stops typing).
 * 7. VERIFYING does not leave Frontend Engineer falsely working (FE becomes IDLE, Reviewer becomes VERIFYING).
 * 8. Browser QA only activates from actual QA state.
 * 9. Stale projection cannot resurrect productive character state.
 * 10. Terminal task (COMPLETED / FAILED / CANCELLED) cannot leave character permanently working.
 * 11. Role assignment is distinct from provider/model/harness.
 * 12. Provider changes do not change character identity.
 * 13. Reduced motion preserves semantic state without unnecessary motion (arms stay still, posture remains valid).
 */

import { describe, it, expect } from 'vitest'
import { deriveWorldState } from '../world/worldState.js'
import { deriveRolePresentationStates } from '../roles/roleStationMapping.js'
import { MaterialLibrary } from '../materials/materials.js'
import { HqCharacters } from '../geometry/characters.js'
import type { Task } from '@gravitas/core'
import type { RuntimeProjectionSnapshot } from '../../api/types.js'

function createTestProjection(overrides?: Partial<RuntimeProjectionSnapshot>): RuntimeProjectionSnapshot {
  return {
    schemaVersion: '1.0.0',
    epoch: 'test-epoch',
    revision: 1,
    activeTasks: overrides?.activeTasks ?? [],
    handoffs: overrides?.handoffs ?? [],
    ...overrides,
  }
}

function createTestTask(overrides?: Partial<Task>): Task {
  return {
    id: overrides?.id ?? 'test-task-1',
    runId: overrides?.runId ?? 'test-run-1',
    title: overrides?.title ?? 'Test Task',
    objective: overrides?.objective ?? 'Test Objective',
    state: overrides?.state ?? 'PLANNED',
    dependencies: overrides?.dependencies ?? [],
    acceptanceCriteria: overrides?.acceptanceCriteria ?? [],
    role: overrides?.role ?? 'role:engineering:frontend-engineer',
    createdAt: overrides?.createdAt ?? '2026-09-27T00:00:00Z',
    updatedAt: overrides?.updatedAt ?? '2026-09-27T00:00:00Z',
    ...overrides,
  }
}

describe('Runtime Honesty Assertions (Wave 12F-C)', () => {
  it('1. IDLE does not show productive work', () => {
    const materials = new MaterialLibrary()
    const characters = new HqCharacters(materials)

    const emptyProj = createTestProjection()
    const worldState = deriveWorldState({ projection: emptyProj, tasks: [] })
    const roleStates = deriveRolePresentationStates(worldState)
    characters.reconcileRoles(roleStates)

    const feState = roleStates.get('role:engineering:frontend-engineer')
    expect(feState?.characterState).toBe('IDLE')
    expect(feState?.currentTaskId).toBeNull()

    // Advance animation time
    characters.update(2.0, false)

    const fig = characters.getFigure('char-codex')
    expect(fig).toBeDefined()
    expect(fig?.userData.status).toBe('IDLE')

    // At IDLE, arms should have zero typing offset
    const ctrl = (characters as any).controllers.get('role:engineering:frontend-engineer')
    expect(ctrl).toBeDefined()
    expect(ctrl.armsLeftGroup.position.y).toBe(0.0)
    expect(ctrl.armsRightGroup.position.y).toBe(0.0)

    materials.dispose()
    characters.dispose()
  })

  it('2. PENDING alone does not automatically imply WORKING', () => {
    // In canonical task FSM, pending/planned tasks are PLANNED or READY without an executing worker
    const pendingTask = createTestTask({
      id: 'task-pending-1',
      title: 'Implement Navigation Header',
      state: 'PLANNED',
      role: 'role:engineering:frontend-engineer',
    })

    // Server projection has NO activeTasks running
    const proj = createTestProjection({ activeTasks: [] })
    const worldState = deriveWorldState({ projection: proj, tasks: [pendingTask] })
    const roleStates = deriveRolePresentationStates(worldState)

    const feState = roleStates.get('role:engineering:frontend-engineer')
    expect(feState?.characterState).toBe('IDLE')
    expect(feState?.characterState).not.toBe('FOCUSED')
  })

  it('3. PREPARING does not falsely imply worker execution', () => {
    const materials = new MaterialLibrary()
    const characters = new HqCharacters(materials)

    const preparingProj = createTestProjection({
      activeTasks: [
        {
          taskId: 'task-prep-1',
          roleId: 'role:engineering:frontend-engineer',
          phase: 'PREPARING',
          workerIdentity: 'codex',
          harnessId: 'codex',
          route: {
            transport: 'DIRECT',
            active: true,
            providerFallbackOccurred: false,
            transportFallbackOccurred: false,
          },
        },
      ],
    })

    const worldState = deriveWorldState({ projection: preparingProj, tasks: [] })
    const roleStates = deriveRolePresentationStates(worldState)
    characters.reconcileRoles(roleStates)

    const feState = roleStates.get('role:engineering:frontend-engineer')
    // Must be ATTENTION (alert / acknowledging assignment), NOT FOCUSED (typing)
    expect(feState?.characterState).toBe('ATTENTION')
    expect(feState?.characterState).not.toBe('FOCUSED')

    characters.update(1.0, false)
    const ctrl = (characters as any).controllers.get('role:engineering:frontend-engineer')
    expect(ctrl.armsLeftGroup.position.y).toBe(0.0)
    expect(ctrl.armsRightGroup.position.y).toBe(0.0)

    materials.dispose()
    characters.dispose()
  })

  it('4 & 5. WORKER_RUNNING maps to the correct assigned role and sets Frontend Engineer to WORKING (FOCUSED)', () => {
    const materials = new MaterialLibrary()
    const characters = new HqCharacters(materials)

    const runningProj = createTestProjection({
      activeTasks: [
        {
          taskId: 'task-run-1',
          roleId: 'role:engineering:frontend-engineer',
          phase: 'WORKER_RUNNING',
          workerIdentity: 'codex',
          harnessId: 'codex',
          route: {
            transport: 'DIRECT',
            active: true,
            providerFallbackOccurred: false,
            transportFallbackOccurred: false,
          },
        },
      ],
    })

    const worldState = deriveWorldState({ projection: runningProj, tasks: [] })
    const roleStates = deriveRolePresentationStates(worldState)
    characters.reconcileRoles(roleStates)

    const feState = roleStates.get('role:engineering:frontend-engineer')
    expect(feState?.characterState).toBe('FOCUSED')
    expect(feState?.currentTaskId).toBe('task-run-1')

    // Other roles must remain IDLE
    const beState = roleStates.get('role:engineering:backend-engineer')
    const reviewerState = roleStates.get('role:quality:independent-reviewer')
    expect(beState?.characterState).toBe('IDLE')
    expect(reviewerState?.characterState).toBe('IDLE')

    // Under update at time t = 0.5s, typing micro-motion is active
    characters.update(0.5, false)
    const ctrl = (characters as any).controllers.get('role:engineering:frontend-engineer')
    expect(ctrl.characterState).toBe('FOCUSED')
    expect(Math.abs(ctrl.armsLeftGroup.position.y)).toBeGreaterThan(0.0001)

    materials.dispose()
    characters.dispose()
  })

  it('6. End of worker execution stops WORKING', () => {
    const materials = new MaterialLibrary()
    const characters = new HqCharacters(materials)

    // Worker has finished execution and entered CLEANUP phase
    const cleanupProj = createTestProjection({
      activeTasks: [
        {
          taskId: 'task-clean-1',
          roleId: 'role:engineering:frontend-engineer',
          phase: 'CLEANUP',
          workerIdentity: 'codex',
          harnessId: 'codex',
          route: {
            transport: 'DIRECT',
            active: true,
            providerFallbackOccurred: false,
            transportFallbackOccurred: false,
          },
        },
      ],
    })

    const worldState = deriveWorldState({ projection: cleanupProj, tasks: [] })
    const roleStates = deriveRolePresentationStates(worldState)
    characters.reconcileRoles(roleStates)

    const feState = roleStates.get('role:engineering:frontend-engineer')
    // Candidate produced -> WAITING for handoff/verification, NOT typing
    expect(feState?.characterState).toBe('WAITING')
    expect(feState?.characterState).not.toBe('FOCUSED')

    characters.update(1.0, false)
    const ctrl = (characters as any).controllers.get('role:engineering:frontend-engineer')
    expect(ctrl.armsLeftGroup.position.y).toBe(0.0)
    expect(ctrl.armsRightGroup.position.y).toBe(0.0)

    materials.dispose()
    characters.dispose()
  })

  it('7. VERIFYING does not leave Frontend Engineer falsely working', () => {
    const materials = new MaterialLibrary()
    const characters = new HqCharacters(materials)

    // Task has moved to verification under Independent Reviewer
    const verifyingProj = createTestProjection({
      activeTasks: [
        {
          taskId: 'task-verify-1',
          roleId: 'role:quality:independent-reviewer',
          phase: 'VERIFYING',
          workerIdentity: 'reviewer',
          harnessId: 'deterministic-verifier',
          route: {
            transport: 'DIRECT',
            active: true,
            providerFallbackOccurred: false,
            transportFallbackOccurred: false,
          },
        },
      ],
    })

    const worldState = deriveWorldState({ projection: verifyingProj, tasks: [] })
    const roleStates = deriveRolePresentationStates(worldState)
    characters.reconcileRoles(roleStates)

    const feState = roleStates.get('role:engineering:frontend-engineer')
    expect(feState?.characterState).toBe('IDLE')
    expect(feState?.characterState).not.toBe('FOCUSED')

    const reviewerState = roleStates.get('role:quality:independent-reviewer')
    expect(reviewerState?.characterState).toBe('VERIFYING')

    characters.update(1.0, false)
    const feCtrl = (characters as any).controllers.get('role:engineering:frontend-engineer')
    expect(feCtrl.armsLeftGroup.position.y).toBe(0.0)

    materials.dispose()
    characters.dispose()
  })

  it('8. Browser QA only activates from actual QA state', () => {
    // When task is coding (WORKER_RUNNING on frontend), Browser QA station is IDLE
    const codingProj = createTestProjection({
      activeTasks: [
        {
          taskId: 'task-code-1',
          roleId: 'role:engineering:frontend-engineer',
          phase: 'WORKER_RUNNING',
          workerIdentity: 'codex',
          harnessId: 'codex',
          route: { transport: 'DIRECT', active: true, providerFallbackOccurred: false, transportFallbackOccurred: false },
        },
      ],
    })

    const codingWorld = deriveWorldState({ projection: codingProj, tasks: [] })
    expect(codingWorld.stations['browser-qa-matrix']?.status).toBe('IDLE')
    const codingRoles = deriveRolePresentationStates(codingWorld)
    const qaRoleCoding = codingRoles.get('role:quality:browser-qa')
    expect(qaRoleCoding?.characterState).toBe('IDLE')

    // When task has browser QA active
    const qaProj = createTestProjection({
      activeTasks: [
        {
          taskId: 'task-qa-1',
          roleId: 'role:quality:browser-qa',
          phase: 'BROWSER_QA',
          workerIdentity: 'browser-qa',
          harnessId: 'playwright',
          route: { transport: 'DIRECT', active: true, providerFallbackOccurred: false, transportFallbackOccurred: false },
        },
      ],
    })

    const qaWorld = deriveWorldState({ projection: qaProj, tasks: [] })
    expect(qaWorld.stations['browser-qa-matrix']?.status).toBe('BROWSER_QA')
    const qaRoles = deriveRolePresentationStates(qaWorld)
    const qaRoleActive = qaRoles.get('role:quality:browser-qa')
    expect(qaRoleActive?.characterState).toBe('FOCUSED')
  })

  it('9. Stale projection cannot resurrect productive character state', () => {
    // Current task is completed
    const completedTask = createTestTask({
      id: 'task-prev-1',
      title: 'Previous Work',
      state: 'SUCCEEDED',
      role: 'role:engineering:frontend-engineer',
    })

    // But projection arrives with empty active tasks (authoritative epoch advanced)
    const emptyProj = createTestProjection({ epoch: 'epoch-2', revision: 20, activeTasks: [] })
    const worldState = deriveWorldState({ projection: emptyProj, tasks: [completedTask] })
    const roleStates = deriveRolePresentationStates(worldState)

    const feState = roleStates.get('role:engineering:frontend-engineer')
    expect(feState?.characterState).not.toBe('FOCUSED')
    expect(['IDLE', 'SUCCESS']).toContain(feState?.characterState)
  })

  it('10. Terminal task cannot leave character permanently working', () => {
    const terminalStates: Array<Task['state']> = ['SUCCEEDED', 'FAILED', 'CANCELLED']

    for (const termState of terminalStates) {
      const task = createTestTask({
        id: `task-${termState}`,
        title: `Task ${termState}`,
        state: termState,
        role: 'role:engineering:frontend-engineer',
      })

      const proj = createTestProjection({ activeTasks: [] })
      const worldState = deriveWorldState({ projection: proj, tasks: [task] })
      const roleStates = deriveRolePresentationStates(worldState)

      const feState = roleStates.get('role:engineering:frontend-engineer')
      expect(feState?.characterState).not.toBe('FOCUSED')
    }
  })

  it('11 & 12. Role assignment is distinct from provider/model/harness, and provider changes do not change character identity', () => {
    // Frontend Engineer running under Codex harness
    const codexProj = createTestProjection({
      activeTasks: [
        {
          taskId: 'task-1',
          roleId: 'role:engineering:frontend-engineer',
          phase: 'WORKER_RUNNING',
          workerIdentity: 'codex',
          harnessId: 'codex',
          route: {
            transport: 'DIRECT',
            active: true,
            requestedProvider: 'openai',
            requestedModel: 'gpt-4o',
            actualProvider: 'openai',
            actualModel: 'gpt-4o',
            providerFallbackOccurred: false,
            transportFallbackOccurred: false,
          },
        },
      ],
    })

    const world1 = deriveWorldState({ projection: codexProj, tasks: [] })
    const roles1 = deriveRolePresentationStates(world1)
    const fe1 = roles1.get('role:engineering:frontend-engineer')
    expect(fe1?.displayName).toBe('Frontend Engineer')
    expect(fe1?.departmentId).toBe('ENGINEERING')
    expect(fe1?.currentHarness).toBe('codex')
    expect(fe1?.provider).toBe('openai')
    expect(fe1?.model).toBe('gpt-4o')

    // Same Frontend Engineer role running under Claude / FCC harness
    const claudeProj = createTestProjection({
      activeTasks: [
        {
          taskId: 'task-2',
          roleId: 'role:engineering:frontend-engineer',
          phase: 'WORKER_RUNNING',
          workerIdentity: 'claude-code',
          harnessId: 'claude-code',
          route: {
            transport: 'DIRECT',
            active: true,
            requestedProvider: 'anthropic',
            requestedModel: 'claude-3-7-sonnet',
            actualProvider: 'anthropic',
            actualModel: 'claude-3-7-sonnet',
            providerFallbackOccurred: false,
            transportFallbackOccurred: false,
          },
        },
      ],
    })

    const world2 = deriveWorldState({ projection: claudeProj, tasks: [] })
    const roles2 = deriveRolePresentationStates(world2)
    const fe2 = roles2.get('role:engineering:frontend-engineer')

    // Core role identity remains identical
    expect(fe2?.roleId).toBe(fe1?.roleId)
    expect(fe2?.displayName).toBe('Frontend Engineer')
    expect(fe2?.departmentId).toBe(fe1?.departmentId)
    expect(fe2?.stationId).toBe(fe1?.stationId)

    // Only tool / provider changed
    expect(fe2?.currentHarness).toBe('claude-code')
    expect(fe2?.provider).toBe('anthropic')
    expect(fe2?.model).toBe('claude-3-7-sonnet')
  })

  it('13. Reduced motion preserves semantic state without unnecessary motion', () => {
    const materials = new MaterialLibrary()
    const characters = new HqCharacters(materials)

    const runningProj = createTestProjection({
      activeTasks: [
        {
          taskId: 'task-rm-1',
          roleId: 'role:engineering:frontend-engineer',
          phase: 'WORKER_RUNNING',
          workerIdentity: 'codex',
          harnessId: 'codex',
          route: { transport: 'DIRECT', active: true, providerFallbackOccurred: false, transportFallbackOccurred: false },
        },
      ],
    })

    const worldState = deriveWorldState({ projection: runningProj, tasks: [] })
    const roleStates = deriveRolePresentationStates(worldState)
    characters.reconcileRoles(roleStates)

    // Update with reducedMotion = true
    characters.update(3.0, true)

    const ctrl = (characters as any).controllers.get('role:engineering:frontend-engineer')
    expect(ctrl.characterState).toBe('FOCUSED')
    // In reduced motion mode, torso leaning posture is preserved for semantic state:
    expect(ctrl.torsoGroup.rotation.x).toBe(0.07)
    // But arms must have zero continuous typing motion oscillation:
    expect(ctrl.armsLeftGroup.position.y).toBe(0.0)
    expect(ctrl.armsRightGroup.position.y).toBe(0.0)

    materials.dispose()
    characters.dispose()
  })
})
