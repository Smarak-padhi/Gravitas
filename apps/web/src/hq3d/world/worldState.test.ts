/**
 * Comprehensive Unit Tests for Gravitas 3D Headquarters World State Projection (Wave 12C)
 * Validates pure projection, physical location semantics, multi-route gateway aggregation,
 * unknown worker isolation, and reconciliation identity logic across fixtures A through O.
 */

import { describe, expect, it } from 'vitest'
import type { Task } from '@gravitas/core'
import {
  deriveWorldState,
  computeCanonicalTaskFingerprint,
  DEFAULT_STATION_MAPPING,
  type StationMappingConfig,
} from './worldState.js'
import {
  FIXTURE_A_EMPTY,
  FIXTURE_B_READY_QUEUED,
  FIXTURE_C_PREPARING,
  FIXTURE_D_WORKER_RUNNING_DIRECT,
  FIXTURE_E_WORKER_RUNNING_GATEWAY_ACTIVE,
  FIXTURE_F_WORKER_RUNNING_AFTER_GATEWAY_CALL,
  FIXTURE_G_VERIFYING,
  FIXTURE_H_BROWSER_QA_RUNNING,
  FIXTURE_I_WAITING_APPROVAL,
  FIXTURE_J_FAILED,
  FIXTURE_K_COMPLETED,
  FIXTURE_L_PROVIDER_FALLBACK,
  FIXTURE_M_TRANSPORT_FALLBACK,
  FIXTURE_N_UNKNOWN_PROVIDER_MODEL,
  FIXTURE_O_MULTIPLE_CONCURRENT_TASKS,
} from './fixtures.js'

describe('Wave 12C — Pure World State Projection Domain', () => {
  it('is strictly deterministic: identical inputs produce identical WorldState', () => {
    const res1 = deriveWorldState(FIXTURE_O_MULTIPLE_CONCURRENT_TASKS)
    const res2 = deriveWorldState(FIXTURE_O_MULTIPLE_CONCURRENT_TASKS)
    expect(res1).toEqual(res2)
  })

  it('Fixture A (EMPTY): all stations idle, zero tasks, alert NORMAL', () => {
    const state = deriveWorldState(FIXTURE_A_EMPTY)
    expect(state.revisionIdentity.projectionRevision).toBe(0)
    expect(Object.keys(state.tasks)).toHaveLength(0)
    expect(state.alertLevel).toBe('NORMAL')
    expect(state.stations['omniroute-rack'].status).toBe('IDLE')
    expect(state.stations['planning-table'].status).toBe('IDLE')
    expect(state.stations['codex-workstation'].status).toBe('IDLE')
    expect(state.stations['fcc-workstation'].status).toBe('IDLE')
  })

  it('Fixture B (READY/Queued): task in PLANNING_AREA, planning table active', () => {
    const state = deriveWorldState(FIXTURE_B_READY_QUEUED)
    const task = state.tasks['task-b-ready']
    expect(task).toBeDefined()
    expect(task.physicalLocation).toBe('PLANNING_AREA')
    expect(state.stations['planning-table'].status).toBe('ACTIVE')
    expect(state.stations['planning-table'].activeTaskId).toBe('task-b-ready')
    expect(state.stations['codex-workstation'].status).toBe('IDLE')
  })

  it('Fixture C (PREPARING): task at ASSIGNED_WORKSTATION, codex workstation active', () => {
    const state = deriveWorldState(FIXTURE_C_PREPARING)
    const task = state.tasks['task-c-prep']
    expect(task).toBeDefined()
    expect(task.physicalLocation).toBe('ASSIGNED_WORKSTATION')
    expect(task.assignedStationId).toBe('codex-workstation')
    expect(state.stations['codex-workstation'].status).toBe('ACTIVE')
    expect(state.stations['codex-workstation'].activeTaskId).toBe('task-c-prep')
    expect(state.stations['fcc-workstation'].status).toBe('IDLE')
  })

  it('Fixture D (WORKER_RUNNING DIRECT): workstation active, omniroute rack IDLE', () => {
    const state = deriveWorldState(FIXTURE_D_WORKER_RUNNING_DIRECT)
    const task = state.tasks['task-d-direct']
    expect(task).toBeDefined()
    expect(task.physicalLocation).toBe('ASSIGNED_WORKSTATION')
    expect(task.assignedStationId).toBe('codex-workstation')
    expect(task.routeProvenance?.transport).toBe('DIRECT')
    expect(state.stations['codex-workstation'].status).toBe('ACTIVE')
    // OmniRoute rack must NOT illuminate for DIRECT transport
    expect(state.stations['omniroute-rack'].status).toBe('IDLE')
  })

  it('Fixture E (WORKER_RUNNING GATEWAY ACTIVE): fcc active and omniroute rack ACTIVE', () => {
    const state = deriveWorldState(FIXTURE_E_WORKER_RUNNING_GATEWAY_ACTIVE)
    const task = state.tasks['task-e-gw-active']
    expect(task).toBeDefined()
    expect(task.physicalLocation).toBe('ASSIGNED_WORKSTATION')
    expect(task.assignedStationId).toBe('fcc-workstation')
    expect(task.routeProvenance?.transport).toBe('GATEWAY')
    expect(task.routeProvenance?.active).toBe(true)

    // OmniRoute rack illuminates ACTIVE
    expect(state.stations['omniroute-rack'].status).toBe('ACTIVE')
    expect(state.stations['omniroute-rack'].activeTaskId).toBe('task-e-gw-active')

    const gw = state.infrastructure.gateways['omniroute-local']
    expect(gw).toBeDefined()
    expect(gw.active).toBe(true)
    expect(gw.activeRouteCount).toBe(1)
    expect(gw.activeTaskIds).toContain('task-e-gw-active')
  })

  it('Fixture F (WORKER_RUNNING_AFTER_GATEWAY_CALL): workstation active but omniroute rack IDLE', () => {
    const state = deriveWorldState(FIXTURE_F_WORKER_RUNNING_AFTER_GATEWAY_CALL)
    const task = state.tasks['task-f-gw-inactive']
    expect(task).toBeDefined()
    expect(task.physicalLocation).toBe('ASSIGNED_WORKSTATION')
    expect(task.assignedStationId).toBe('fcc-workstation')
    expect(state.stations['fcc-workstation'].status).toBe('ACTIVE')

    // Since route.active is false, OmniRoute rack must remain IDLE
    expect(state.stations['omniroute-rack'].status).toBe('IDLE')
    const gw = state.infrastructure.gateways['omniroute-local']
    expect(gw?.active).toBe(false)
    expect(gw?.activeRouteCount).toBe(0)
  })

  it('Fixture G (VERIFYING): task at VERIFICATION_BENCH, verifier console active, worker stations IDLE', () => {
    const state = deriveWorldState(FIXTURE_G_VERIFYING)
    const task = state.tasks['task-g-verifying']
    expect(task).toBeDefined()
    expect(task.physicalLocation).toBe('VERIFICATION_BENCH')
    expect(state.stations['verifier-console'].status).toBe('VERIFYING')
    expect(state.stations['verifier-console'].activeTaskId).toBe('task-g-verifying')
    expect(state.stations['browser-qa-matrix'].status).toBe('IDLE')
    expect(state.stations['codex-workstation'].status).toBe('IDLE')
  })

  it('Fixture H (BROWSER_QA_RUNNING): task at BROWSER_QA_MATRIX, verifier console IDLE', () => {
    const state = deriveWorldState(FIXTURE_H_BROWSER_QA_RUNNING)
    const task = state.tasks['task-h-browser-qa']
    expect(task).toBeDefined()
    expect(task.physicalLocation).toBe('BROWSER_QA_MATRIX')
    expect(state.stations['browser-qa-matrix'].status).toBe('BROWSER_QA')
    expect(state.stations['browser-qa-matrix'].activeTaskId).toBe('task-h-browser-qa')
    expect(state.stations['verifier-console'].status).toBe('IDLE')
  })

  it('Fixture I (WAITING_APPROVAL): task at APPROVAL_PLINTH, approval plinth station active', () => {
    const state = deriveWorldState(FIXTURE_I_WAITING_APPROVAL)
    const task = state.tasks['task-i-waiting-approval']
    expect(task).toBeDefined()
    expect(task.physicalLocation).toBe('APPROVAL_PLINTH')
    expect(state.stations['approval-plinth'].status).toBe('WAITING_APPROVAL')
    expect(state.stations['approval-plinth'].activeTaskId).toBe('task-i-waiting-approval')
  })

  it('Fixture J (FAILED): task at FAILURE_HOLD, alertLevel CRITICAL, never rejected chute', () => {
    const state = deriveWorldState(FIXTURE_J_FAILED)
    const task = state.tasks['task-j-failed']
    expect(task).toBeDefined()
    expect(task.physicalLocation).toBe('FAILURE_HOLD')
    expect(state.alertLevel).toBe('CRITICAL')
  })

  it('Fixture K (COMPLETED): task at COMPLETED_TRAY, repository vault active', () => {
    const state = deriveWorldState(FIXTURE_K_COMPLETED)
    const task = state.tasks['task-k-completed']
    expect(task).toBeDefined()
    expect(task.physicalLocation).toBe('COMPLETED_TRAY')
    expect(state.stations['repository-vault'].status).toBe('COMPLETED')
  })

  it('Fixture L (PROVIDER_FALLBACK): gateway warningState flagged and alert ELEVATED', () => {
    const state = deriveWorldState(FIXTURE_L_PROVIDER_FALLBACK)
    const gw = state.infrastructure.gateways['omniroute-local']
    expect(gw?.warningState.providerFallbackOccurred).toBe(true)
    expect(gw?.warningState.transportFallbackOccurred).toBe(false)
    expect(state.alertLevel).toBe('ELEVATED')
  })

  it('Fixture M (TRANSPORT_FALLBACK): transport fallback flagged and alert ELEVATED', () => {
    const state = deriveWorldState(FIXTURE_M_TRANSPORT_FALLBACK)
    const task = state.tasks['task-m-transport-fallback']
    expect(task).toBeDefined()
    expect(task.routeProvenance?.transportFallbackOccurred).toBe(true)
    expect(state.alertLevel).toBe('ELEVATED')
  })

  it('Fixture N (UNKNOWN_PROVIDER_MODEL): handles missing/unknown provider & model safely', () => {
    const state = deriveWorldState(FIXTURE_N_UNKNOWN_PROVIDER_MODEL)
    const task = state.tasks['task-n-unknown-model']
    expect(task).toBeDefined()
    expect(task.routeProvenance?.requestedProvider).toBe('mystery-corp')
    expect(task.routeProvenance?.actualProvider).toBe('UNKNOWN')
    expect(task.routeProvenance?.actualModel).toBe('UNKNOWN')
  })

  it('Fixture O (MULTIPLE_CONCURRENT_TASKS): multi-route gateway aggregation counts active tasks correctly', () => {
    const state = deriveWorldState(FIXTURE_O_MULTIPLE_CONCURRENT_TASKS)
    expect(Object.keys(state.tasks)).toHaveLength(2)

    // Task 1: codex workstation active (DIRECT)
    expect(state.tasks['task-o-1']?.physicalLocation).toBe('ASSIGNED_WORKSTATION')
    expect(state.stations['codex-workstation'].status).toBe('ACTIVE')

    // Task 2: fcc workstation active (GATEWAY ACTIVE)
    expect(state.tasks['task-o-2']?.physicalLocation).toBe('ASSIGNED_WORKSTATION')
    expect(state.stations['fcc-workstation'].status).toBe('ACTIVE')

    // Multi-route gateway aggregation
    const gw = state.infrastructure.gateways['omniroute-local']
    expect(gw?.active).toBe(true)
    expect(gw?.activeRouteCount).toBe(1)
    expect(gw?.activeTaskIds).toEqual(['task-o-2'])
  })

  it('never defaults unknown workers to Codex or FCC (routes to NEUTRAL_HOLD)', () => {
    const customMapping: StationMappingConfig = {
      resolveStationId: DEFAULT_STATION_MAPPING.resolveStationId,
    }

    const unkTask: Task = {
      id: 'task-unknown-worker',
      runId: 'run-unk',
      title: 'Unknown Specialist Task',
      objective: 'Specialist Objective',
      state: 'RUNNING',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-22T10:00:00.000Z',
      updatedAt: '2026-09-22T10:00:00.000Z',
    }

    const state = deriveWorldState({
      projection: {
        schemaVersion: '1.0.0',
        epoch: 'epoch-1',
        revision: 1,
        activeTasks: [
          {
            taskId: 'task-unknown-worker',
            phase: 'WORKER_RUNNING',
            workerIdentity: 'custom-fine-tuned-agent-99',
            route: {
              transport: 'DIRECT',
              active: true,
              providerFallbackOccurred: false,
              transportFallbackOccurred: false,
            },
          },
        ],
      },
      tasks: [unkTask],
      stationMapping: customMapping,
    })

    const task = state.tasks['task-unknown-worker']
    expect(task.assignedStationId).toBeNull()
    expect(task.physicalLocation).toBe('NEUTRAL_HOLD')
    // Neither workstation should be marked active for unknown worker
    expect(state.stations['codex-workstation'].status).toBe('IDLE')
    expect(state.stations['fcc-workstation'].status).toBe('IDLE')
  })

  it('reconciliation identity detects canonical task lifecycle change without revision bump', () => {
    const taskBefore: Task = {
      id: 'task-reconcile-test',
      runId: 'run-1',
      title: 'Test Task',
      objective: 'Obj',
      state: 'RUNNING',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-22T10:00:00.000Z',
      updatedAt: '2026-09-22T10:00:00.000Z',
    }

    const taskAfter: Task = {
      ...taskBefore,
      state: 'WAITING_APPROVAL',
      updatedAt: '2026-09-22T10:01:00.000Z',
    }

    const fp1 = computeCanonicalTaskFingerprint([taskBefore])
    const fp2 = computeCanonicalTaskFingerprint([taskAfter])
    expect(fp1).not.toBe(fp2)

    const state1 = deriveWorldState({
      projection: {
        schemaVersion: '1.0.0',
        epoch: 'epoch-same',
        revision: 42,
        activeTasks: [],
      },
      tasks: [taskBefore],
    })

    const state2 = deriveWorldState({
      projection: {
        schemaVersion: '1.0.0',
        epoch: 'epoch-same',
        revision: 42, // identical projection revision!
        activeTasks: [],
      },
      tasks: [taskAfter],
    })

    // Despite epoch & revision matching, canonicalTaskFingerprint differs
    expect(state1.revisionIdentity.projectionEpoch).toBe(state2.revisionIdentity.projectionEpoch)
    expect(state1.revisionIdentity.projectionRevision).toBe(state2.revisionIdentity.projectionRevision)
    expect(state1.revisionIdentity.canonicalTaskFingerprint).not.toBe(
      state2.revisionIdentity.canonicalTaskFingerprint
    )
  })
})
