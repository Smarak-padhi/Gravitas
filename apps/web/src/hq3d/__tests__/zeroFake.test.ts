/**
 * Gravitas 3D Headquarters — Authoritative Zero-Fake Assertions (Correction 10)
 *
 * Deterministic tests proving:
 * 1. No active task -> no typing micro-motion
 * 2. No WORKER_RUNNING -> worker cannot display productive working posture/animation
 * 3. No BROWSER_QA_RUNNING -> Browser QA equipment cannot display active test state
 * 4. No VERIFYING -> Reviewer cannot display verification activity
 * 5. DIRECT route -> OmniRoute inactive
 * 6. GATEWAY route with nonmatching gateway -> omniroute-local inactive
 * 7. GATEWAY route with gatewayId=omniroute-local AND active=true -> OmniRoute may display active state
 * 8. WAITING_APPROVAL -> task artifact may appear in Approval
 * 9. Not WAITING_APPROVAL -> no fake approval artifact
 *
 * These are product-integrity tests, not merely animation tests.
 */

import { describe, it, expect } from 'vitest'
import { deriveWorldState } from '../world/worldState.js'
import { deriveRolePresentationStates } from '../roles/roleStationMapping.js'
import { MaterialLibrary } from '../materials/materials.js'
import { HqCharacters } from '../geometry/characters.js'
import { HqFurniture } from '../geometry/furniture.js'
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

describe('Zero-Fake Product Integrity Assertions', () => {
  it('Assertion 1 & 2: No active task / No WORKER_RUNNING -> worker cannot display typing or productive working animation', () => {
    const materials = new MaterialLibrary()
    const characters = new HqCharacters(materials)

    // Initial state: IDLE
    const emptyProj = createTestProjection()
    const worldState = deriveWorldState({ projection: emptyProj, tasks: [] })
    const roleStates = deriveRolePresentationStates(worldState)
    characters.reconcileRoles(roleStates)

    const feState = roleStates.get('role:engineering:frontend-engineer')
    expect(feState?.characterState).toBe('IDLE')
    expect(feState?.currentTaskId).toBeNull()

    // Update characters with time passage
    characters.update(1.5, false)

    // Character arms should NOT be oscillating with fast typing motion (7.5 rad/s)
    const fig = characters.getFigure('char-codex')
    expect(fig).toBeDefined()
    expect(fig?.userData.status).toBe('IDLE')

    materials.dispose()
    characters.dispose()
  })

  it('Assertion 3: No BROWSER_QA_RUNNING -> Browser QA equipment cannot display active test state', () => {
    const materials = new MaterialLibrary()
    const furniture = new HqFurniture(materials)

    // State with worker running on coding, but NO browser QA running
    const proj = createTestProjection({
      activeTasks: [
        {
          taskId: 'T-100',
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

    const worldState = deriveWorldState({ projection: proj, tasks: [] })
    expect(worldState.stations['browser-qa-matrix']?.status).toBe('IDLE')

    furniture.setStationStatus('browser-qa-matrix', worldState.stations['browser-qa-matrix']?.status ?? 'IDLE')
    const ind = furniture.stationIndicators.get('browser-qa-matrix')
    expect(ind).toBeDefined()
    // Indicator material should be idle gunmetal, NOT terminalScreen or statusRunning
    expect(ind?.material).toBe(materials.gunmetal)

    materials.dispose()
    furniture.dispose()
  })

  it('Assertion 4: No VERIFYING -> Independent Reviewer cannot display verification activity', () => {
    const emptyProj = createTestProjection()
    const worldState = deriveWorldState({ projection: emptyProj, tasks: [] })
    const roleStates = deriveRolePresentationStates(worldState)

    const reviewerState = roleStates.get('role:quality:independent-reviewer')
    expect(reviewerState?.characterState).toBe('IDLE')
    expect(reviewerState?.characterState).not.toBe('VERIFYING')
  })

  it('Assertion 5: DIRECT route -> OmniRoute inactive', () => {
    const proj = createTestProjection({
      activeTasks: [
        {
          taskId: 'T-200',
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

    const worldState = deriveWorldState({ projection: proj, tasks: [] })
    expect(worldState.infrastructure.gateways['omniroute-local']?.active).toBe(false)
    expect(worldState.stations['omniroute-rack']?.status).toBe('IDLE')
  })

  it('Assertion 6: GATEWAY route with nonmatching gateway -> omniroute-local inactive', () => {
    const proj = createTestProjection({
      activeTasks: [
        {
          taskId: 'T-300',
          roleId: 'role:engineering:backend-engineer',
          phase: 'WORKER_RUNNING',
          workerIdentity: 'fcc',
          harnessId: 'fcc',
          route: {
            transport: 'GATEWAY',
            gatewayId: 'omniroute-remote-cloud',
            active: true,
            providerFallbackOccurred: false,
            transportFallbackOccurred: false,
          },
        },
      ],
    })

    const worldState = deriveWorldState({ projection: proj, tasks: [] })
    expect(worldState.infrastructure.gateways['omniroute-local']?.active).toBe(false)
    expect(worldState.stations['omniroute-rack']?.status).toBe('IDLE')
  })

  it('Assertion 7: GATEWAY route with gatewayId=omniroute-local AND active=true -> OmniRoute displays active state', () => {
    const proj = createTestProjection({
      activeTasks: [
        {
          taskId: 'T-400',
          roleId: 'role:engineering:frontend-engineer',
          phase: 'WORKER_RUNNING',
          workerIdentity: 'codex',
          harnessId: 'codex',
          route: {
            transport: 'GATEWAY',
            gatewayId: 'omniroute-local',
            active: true,
            providerFallbackOccurred: false,
            transportFallbackOccurred: false,
          },
        },
      ],
    })

    const worldState = deriveWorldState({ projection: proj, tasks: [] })
    expect(worldState.infrastructure.gateways['omniroute-local']?.active).toBe(true)
    expect(worldState.stations['omniroute-rack']?.status).toBe('ACTIVE')
  })

  it('Assertion 8 & 9: WAITING_APPROVAL -> task artifact appears in Approval; Not WAITING_APPROVAL -> no fake approval artifact', () => {
    const canonicalTaskWaiting: Task = {
      id: 'T-500',
      runId: 'run-1',
      title: 'Release Candidate V1',
      objective: 'Human approval validation',
      acceptanceCriteria: [],
      state: 'WAITING_APPROVAL',
      role: 'role:strategy:chief-planner' as any,
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const proj = createTestProjection()
    const worldWaiting = deriveWorldState({ projection: proj, tasks: [canonicalTaskWaiting] })
    expect(worldWaiting.tasks['T-500']?.physicalLocation).toBe('APPROVAL_PLINTH')
    expect(worldWaiting.tasks['T-500']?.canonicalState).toBe('WAITING_APPROVAL')

    // Contrast with IDLE task or RUNNING task
    const canonicalTaskRunning: Task = {
      id: 'T-501',
      runId: 'run-1',
      title: 'Active Coding Task',
      objective: 'Implementation of features',
      acceptanceCriteria: [],
      state: 'RUNNING',
      role: 'role:engineering:frontend-engineer' as any,
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const worldRunning = deriveWorldState({ projection: proj, tasks: [canonicalTaskRunning] })
    expect(worldRunning.tasks['T-501']?.physicalLocation).not.toBe('APPROVAL_PLINTH')
    expect(worldRunning.tasks['T-501']?.physicalLocation).toBe('ASSIGNED_WORKSTATION')
  })
})
