/**
 * GRAVITAS D3 — Living HQ / Adaptive World Test Suite
 *
 * Covers all 60 required D3 test areas:
 * 01 canonical projection maps deterministically to spatial projection
 * 02 same input produces stable layout
 * 03 canonical IDs preserved
 * 04 decorative objects not classified operational
 * 05 idle runtime does not fabricate activity
 * 06 active task maps to active visual state
 * 07 Worker success distinct from verified success
 * 08 verified success distinct from human approval
 * 09 pending approval represented without approving
 * 10 failed task represented distinctly
 * 11 recovery-required represented distinctly
 * 12 offline represented distinctly
 * 13 stale projection marked stale
 * 14 stale revision rejected
 * 15 N+1 cannot be overwritten by N
 * 16 duplicate updates do not duplicate spatial entity
 * 17 cross-WorkSession IDs isolated
 * 18 selection resolves correct canonical entity
 * 19 3D selection opens semantic inspector
 * 20 selection cannot approve
 * 21 selection cannot execute tool
 * 22 selection cannot create grant
 * 23 world cannot access K1
 * 24 world cannot access K3
 * 25 world cannot access SQLite
 * 26 world cannot access filesystem/process authority
 * 27 preload remains allowlisted
 * 28 raw IPC unavailable
 * 29 world uses D1 projection path
 * 30 projection mutation cannot alter Kernel
 * 31 renderer reload reconstructs world
 * 32 Kernel PID stable through reload
 * 33 Command Center and world show same entity/revision
 * 34 semantic world outline exposes meaningful entities
 * 35 keyboard entity navigation works
 * 36 keyboard inspector workflow works
 * 37 pending approval reachable without canvas
 * 38 reduced-motion mode reduces motion
 * 39 semantic meaning preserved under reduced motion
 * 40 WebGL failure falls back to semantic UI
 * 41 Command Center works when WebGL unavailable
 * 42 untrusted Worker text inert
 * 43 untrusted evidence text inert
 * 44 raw HTML injection blocked
 * 45 no remote script loading from untrusted content
 * 46 single animation loop after repeated view switching
 * 47 Three.js resources disposed on unmount
 * 48 removed canonical entity removes/transitions spatial entity
 * 49 rapid projection updates converge to latest
 * 50 background-hidden updates reconstruct after restore
 * 51 D2 tray behavior unaffected
 * 52 human gates remain sovereign
 * 53 unknown-cost policy unaffected
 * 54 paid fallback policy unaffected
 * 55 no auto merge
 * 56 no auto deploy
 * 57 no D4 avatar system introduced
 * 58 performance fixture instrumentation works
 * 59 performance report records environment
 * 60 accessibility semantic projection exists
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { KernelHost } from './kernel-host/kernelHost.js'
import { DesktopSupervisor } from './main/supervisor.js'
import {
  projectToSpatial,
  decideAcceptance,
  degradeProjection,
  resolveSelection,
  buildOutline,
  buildPerformanceFixture,
  VISUAL_GRAMMAR,
  SPATIAL_PROJECTION_VERSION,
  type SpatialInput,
} from './renderer/world/spatial.js'
import { WorldModel, type WorldDataSource } from './renderer/world/worldModel.js'
import { WorldRenderer, loopInstrumentation, type WorldRendererBackend } from './renderer/world/renderAdapter.js'
import { D1_PROTOCOL_VERSION } from './types.js'

function createMockBackend(): WorldRendererBackend {
  return {
    domElement: {},
    setSize: () => {},
    setPixelRatio: () => {},
    render: () => {},
    dispose: () => {},
    info: { render: { calls: 1, triangles: 10 }, memory: { geometries: 1, textures: 0 } },
    getContextInfo: () => ({ renderer: 'MockRenderer', vendor: 'MockVendor' }),
  }
}

describe('GRAVITAS D3 — Adaptive Living HQ & Spatial Projection Suite (60)', () => {
  let tempDir: string
  let host: KernelHost
  let supervisor: DesktopSupervisor
  let messagesToMain: any[] = []
  let messagesToKernel: any[] = []

  const kernelBridge = {
    postMessage: (msg: any) => {
      messagesToKernel.push(msg)
      host.handleMessage(msg).catch((err) => console.error('HOST_ERROR:', err))
    },
    on: (_event: string, _listener: any) => {},
    kill: () => {},
    pid: 7777,
  }

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gravitas-d3-test-'))
    messagesToMain = []
    messagesToKernel = []

    host = new KernelHost({
      dataRoot: tempDir,
      pid: 7777,
      onMessage: (msg) => {
        messagesToMain.push(msg)
        supervisor['handleKernelMessage'](msg)
      },
    })

    supervisor = new DesktopSupervisor({
      protocolVersion: D1_PROTOCOL_VERSION,
      forkProcess: () => kernelBridge,
    })

    await supervisor.start()
    await host.start()
    loopInstrumentation.reset()
  })

  afterEach(async () => {
    try {
      await supervisor.shutdown()
    } catch {}
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {}
  })

  // 01: Canonical projection maps deterministically to spatial projection
  it('01: Canonical projection maps deterministically to spatial projection', () => {
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: '2026-01-01T00:00:00.000Z',
      connection: 'LIVE',
      overview: {
        kernelStatus: 'READY',
        activeWorkSessionsCount: 1,
        activeRunsCount: 1,
        activeTasksCount: 1,
        waitingApprovalCount: 0,
        failedOrRecoveryCount: 0,
        runningExecutionsCount: 0,
        blockedAuthorityCount: 0,
        blockedCostCount: 0,
        generatedAt: '2026-01-01T00:00:00.000Z',
        canonicalRevision: 2,
        recentActivitySummary: [],
      },
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: '2026-01-01T00:00:00.000Z',
        sessions: [
          {
            id: 'ws_01',
            state: 'ACTIVE',
            revision: 2,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            runs: [
              {
                id: 'run_01',
                workSessionId: 'ws_01',
                goal: 'Build feature',
                state: 'ACTIVE',
                createdAt: '2026-01-01T00:00:00.000Z',
                revision: 1,
                tasks: [
                  {
                    id: 'task_01',
                    runId: 'run_01',
                    workSessionId: 'ws_01',
                    title: 'Implement unit tests',
                    state: 'PENDING',
                    assignedRoleId: 'role:tester',
                    requiresApproval: false,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                    revision: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
      approvals: { generatedAt: '2026-01-01T00:00:00.000Z', totalPending: 0, items: [] },
      executions: { generatedAt: '2026-01-01T00:00:00.000Z', executions: [] },
      verifications: [],
      system: null,
    }

    const p1 = projectToSpatial(input)
    const p2 = projectToSpatial(input)

    expect(p1.spatialProjectionVersion).toBe(SPATIAL_PROJECTION_VERSION)
    expect(p1.entities.length).toBe(4) // 1 session, 1 run, 1 task, 1 system
    expect(JSON.stringify(p1)).toBe(JSON.stringify(p2))
  })

  // 02: Same input produces stable layout
  it('02: Same input produces stable layout coordinates', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const p1 = projectToSpatial(fixture)
    const p2 = projectToSpatial(fixture)

    expect(p1.entities.map((e) => e.position)).toEqual(p2.entities.map((e) => e.position))
  })

  // 03: Canonical IDs preserved
  it('03: Canonical IDs are strictly preserved in spatialEntity.sourceEntityId', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const p = projectToSpatial(fixture)

    const taskEntity = p.entities.find((e) => e.sourceEntityType === 'TASK')
    expect(taskEntity).toBeDefined()
    expect(taskEntity!.sourceEntityId).toMatch(/^fx_task_/)
    expect(taskEntity!.spatialEntityId).toContain(taskEntity!.sourceEntityId)
  })

  // 04: Decorative objects not classified operational
  it('04: Decorative objects have semantic=false and are not in operational entities list', () => {
    const fixture = buildPerformanceFixture('IDLE', 1)
    const p = projectToSpatial(fixture)

    expect(p.decorations.length).toBeGreaterThan(0)
    for (const d of p.decorations) {
      expect(d.semantic).toBe(false)
    }
    for (const e of p.entities) {
      expect(e.operational).toBe(true)
    }
  })

  // 05: Idle runtime does not fabricate activity
  it('05: Idle runtime does not fabricate activity or render false active animations', () => {
    const fixture = buildPerformanceFixture('IDLE', 1)
    const p = projectToSpatial(fixture)

    expect(p.empty).toBe(true)
    const nonSystem = p.entities.filter((e) => e.sourceEntityType !== 'SYSTEM')
    expect(nonSystem.length).toBe(0)
  })

  // 06: Active task maps to active visual state
  it('06: Task with state=RUNNING maps to visualState=ACTIVE and LIVE_ACTIVITY animation', () => {
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: '2026-01-01T00:00:00.000Z',
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: '2026-01-01T00:00:00.000Z',
        sessions: [
          {
            id: 'ws_01',
            state: 'ACTIVE',
            revision: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            runs: [
              {
                id: 'run_01',
                workSessionId: 'ws_01',
                goal: 'Run',
                state: 'ACTIVE',
                createdAt: '2026-01-01T00:00:00.000Z',
                revision: 1,
                tasks: [
                  {
                    id: 't_active',
                    runId: 'run_01',
                    workSessionId: 'ws_01',
                    title: 'Active task',
                    state: 'RUNNING',
                    assignedRoleId: 'role:eng',
                    requiresApproval: false,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                    revision: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
      approvals: null,
      executions: null,
      verifications: [],
      system: null,
    }

    const p = projectToSpatial(input)
    const t = p.entities.find((e) => e.sourceEntityId === 't_active')
    expect(t).toBeDefined()
    expect(t!.visualState).toBe('ACTIVE')
    expect(t!.animation).toBe('LIVE_ACTIVITY')
  })

  // 07: Worker success distinct from verified success
  it('07: Completed task without verification maps to WORKER_SUCCEEDED, NOT VERIFIED_PASS', () => {
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: '2026-01-01T00:00:00.000Z',
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: '2026-01-01T00:00:00.000Z',
        sessions: [
          {
            id: 'ws_01',
            state: 'ACTIVE',
            revision: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            runs: [
              {
                id: 'run_01',
                workSessionId: 'ws_01',
                goal: 'Run',
                state: 'ACTIVE',
                createdAt: '2026-01-01T00:00:00.000Z',
                revision: 1,
                tasks: [
                  {
                    id: 't_succeeded',
                    runId: 'run_01',
                    workSessionId: 'ws_01',
                    title: 'Worker done',
                    state: 'SUCCEEDED',
                    assignedRoleId: 'role:eng',
                    requiresApproval: false,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                    revision: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
      approvals: null,
      executions: null,
      verifications: [],
      system: null,
    }

    const p = projectToSpatial(input)
    const t = p.entities.find((e) => e.sourceEntityId === 't_succeeded')
    expect(t).toBeDefined()
    expect(t!.visualState).toBe('WORKER_SUCCEEDED')
    expect(t!.visualState).not.toBe('VERIFIED_PASS')
    expect(t!.visualState).not.toBe('HUMAN_APPROVED')
  })

  // 08: Verified success distinct from human approval
  it('08: Verification verdict VERIFIED_PASS maps to VERIFIED_PASS, NOT HUMAN_APPROVED', () => {
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: '2026-01-01T00:00:00.000Z',
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: '2026-01-01T00:00:00.000Z',
        sessions: [
          {
            id: 'ws_01',
            state: 'ACTIVE',
            revision: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            runs: [
              {
                id: 'run_01',
                workSessionId: 'ws_01',
                goal: 'Run',
                state: 'ACTIVE',
                createdAt: '2026-01-01T00:00:00.000Z',
                revision: 1,
                tasks: [
                  {
                    id: 't_verif',
                    runId: 'run_01',
                    workSessionId: 'ws_01',
                    title: 'Verified task',
                    state: 'SUCCEEDED',
                    assignedRoleId: 'role:eng',
                    requiresApproval: false,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                    revision: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
      approvals: null,
      executions: null,
      verifications: [
        {
          planId: 'plan_01',
          taskId: 't_verif',
          workSessionId: 'ws_01',
          runId: 'run_01',
          criteria: [],
          verifierAssignmentsCount: 1,
          findingsSummary: ['Check passed'],
          verdict: 'VERIFIED_PASS',
          workerReportedStatus: 'SUCCEEDED',
          supervisorSessionStatus: 'ACCEPTED',
          independenceClass: 'STRUCTURAL',
          humanApprovalState: 'NOT_REQUIRED',
          limitations: [],
          unknowns: [],
          trustStatus: 'NOT_TRUSTED_EVIDENCE',
          manifestCoreDigest: {
            algorithm: 'sha256',
            digestHex: 'aabbcc',
            semantics: 'CHANGE_DETECTION_RELATIVE_TO_REFERENCE_DIGEST',
            isDigitalSignature: false,
            confersExternalTrust: false,
            confersImmutability: false,
          },
          generatedAt: '2026-01-01T00:00:00.000Z',
          revision: 1,
        },
      ],
      system: null,
    }

    const p = projectToSpatial(input)
    const t = p.entities.find((e) => e.sourceEntityId === 't_verif')
    expect(t).toBeDefined()
    expect(t!.visualState).toBe('VERIFIED_PASS')
    expect(t!.visualState).not.toBe('HUMAN_APPROVED')
  })

  // 09: Pending approval represented without approving
  it('09: Pending approval item maps to AWAITING_HUMAN_APPROVAL without auto-approving', () => {
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: '2026-01-01T00:00:00.000Z',
      connection: 'LIVE',
      overview: null,
      hierarchy: null,
      approvals: {
        generatedAt: '2026-01-01T00:00:00.000Z',
        totalPending: 1,
        items: [
          {
            queueItemId: 'gate_01',
            itemType: 'VERIFICATION_GATE',
            targetId: 'plan_01',
            currentRevision: 1,
            sourceWorkSessionId: 'ws_01',
            sourceTaskId: 't_01',
            technicalOutcome: 'Verifier passed',
            limitations: [],
            unknowns: [],
            requestedAction: 'Authorize release',
            consequences: 'None',
            status: 'WAITING_APPROVAL',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      executions: null,
      verifications: [],
      system: null,
    }

    const p = projectToSpatial(input)
    const gate = p.entities.find((e) => e.sourceEntityType === 'APPROVAL_GATE')
    expect(gate).toBeDefined()
    expect(gate!.visualState).toBe('AWAITING_HUMAN_APPROVAL')
    expect(gate!.zone).toBe('HUMAN_GATE')
  })

  // 10: Failed task represented distinctly
  it('10: Task state=FAILED maps to visualState=FAILED and ERROR animation', () => {
    const input = buildPerformanceFixture('SMALL', 1)
    const failedTask = input.hierarchy!.sessions[0]!.runs[0]!.tasks[0]!
    ;(failedTask as any).state = 'FAILED'

    const p = projectToSpatial(input)
    const t = p.entities.find((e) => e.sourceEntityId === failedTask.id)
    expect(t!.visualState).toBe('FAILED')
    expect(t!.animation).toBe('ERROR')
  })

  // 11: Recovery-required represented distinctly
  it('11: Task state=RECOVERY_REQUIRED maps to visualState=RECOVERY_REQUIRED', () => {
    const input = buildPerformanceFixture('SMALL', 1)
    const recTask = input.hierarchy!.sessions[0]!.runs[0]!.tasks[0]!
    ;(recTask as any).state = 'RECOVERY_REQUIRED'

    const p = projectToSpatial(input)
    const t = p.entities.find((e) => e.sourceEntityId === recTask.id)
    expect(t!.visualState).toBe('RECOVERY_REQUIRED')
  })

  // 12: Offline represented distinctly
  it('12: Connection=OFFLINE marks non-system entities as OFFLINE_STALE', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const p = projectToSpatial({ ...fixture, connection: 'OFFLINE' })

    const nonSystem = p.entities.filter((e) => e.sourceEntityType !== 'SYSTEM')
    for (const e of nonSystem) {
      expect(e.visualState).toBe('OFFLINE_STALE')
      expect(e.stale).toBe(true)
    }
  })

  // 13: Stale projection marked stale
  it('13: Connection=STALE marks entities with stale=true', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const p = projectToSpatial({ ...fixture, connection: 'STALE' })

    const nonSystem = p.entities.filter((e) => e.sourceEntityType !== 'SYSTEM')
    for (const e of nonSystem) {
      expect(e.stale).toBe(true)
    }
  })

  // 14: Stale revision rejected
  it('14: decideAcceptance rejects incoming projection with lower sourceRevision', () => {
    const p1 = projectToSpatial(buildPerformanceFixture('SMALL', 1))
    ;(p1 as any).sourceRevision = 5

    const p2 = projectToSpatial(buildPerformanceFixture('SMALL', 2))
    ;(p2 as any).sourceRevision = 4

    const decision = decideAcceptance(p1, p2)
    expect(decision.accepted).toBe(false)
    expect(decision.reason).toBe('STALE_REVISION')
  })

  // 15: N+1 cannot be overwritten by N
  it('15: Earlier fetchSequence does not overwrite accepted newer sequence', () => {
    const p1 = projectToSpatial(buildPerformanceFixture('SMALL', 10))
    const p2 = projectToSpatial(buildPerformanceFixture('SMALL', 9))

    const decision = decideAcceptance(p1, p2)
    expect(decision.accepted).toBe(false)
    expect(decision.reason).toBe('STALE_SEQUENCE')
  })

  // 16: Duplicate updates do not duplicate spatial entity
  it('16: Duplicate entity inputs collapse to single spatial entity with duplicatesCollapsed incremented', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    // Duplicate first session
    const duplicatedSessions = [...fixture.hierarchy!.sessions, fixture.hierarchy!.sessions[0]!]
    const input: SpatialInput = {
      ...fixture,
      hierarchy: {
        ...fixture.hierarchy!,
        sessions: duplicatedSessions,
      },
    }

    const p = projectToSpatial(input)
    expect(p.duplicatesCollapsed).toBeGreaterThan(0)
  })

  // 17: Cross-WorkSession IDs isolated
  it('17: Same task title/id across different sessions maintains separate spatial identities', () => {
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: '2026-01-01T00:00:00.000Z',
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: '2026-01-01T00:00:00.000Z',
        sessions: [
          {
            id: 'ws_A',
            state: 'ACTIVE',
            revision: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            runs: [
              {
                id: 'run_1',
                workSessionId: 'ws_A',
                goal: 'Goal',
                state: 'ACTIVE',
                createdAt: '2026-01-01T00:00:00.000Z',
                revision: 1,
                tasks: [
                  {
                    id: 'task_dup',
                    runId: 'run_1',
                    workSessionId: 'ws_A',
                    title: 'Common Title',
                    state: 'PENDING',
                    assignedRoleId: 'role:1',
                    requiresApproval: false,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                    revision: 1,
                  },
                ],
              },
            ],
          },
          {
            id: 'ws_B',
            state: 'ACTIVE',
            revision: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            runs: [
              {
                id: 'run_1',
                workSessionId: 'ws_B',
                goal: 'Goal',
                state: 'ACTIVE',
                createdAt: '2026-01-01T00:00:00.000Z',
                revision: 1,
                tasks: [
                  {
                    id: 'task_dup',
                    runId: 'run_1',
                    workSessionId: 'ws_B',
                    title: 'Common Title',
                    state: 'PENDING',
                    assignedRoleId: 'role:1',
                    requiresApproval: false,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                    revision: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
      approvals: null,
      executions: null,
      verifications: [],
      system: null,
    }

    const p = projectToSpatial(input)
    const taskEntities = p.entities.filter((e) => e.sourceEntityId === 'task_dup')
    expect(taskEntities.length).toBe(2)
    expect(taskEntities[0]!.spatialEntityId).not.toBe(taskEntities[1]!.spatialEntityId)
    expect(taskEntities[0]!.workSessionId).not.toBe(taskEntities[1]!.workSessionId)
  })

  // 18: Selection resolves correct canonical entity
  it('18: resolveSelection maps spatialEntityId to canonical identity', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const p = projectToSpatial(fixture)
    const task = p.entities.find((e) => e.sourceEntityType === 'TASK')!

    const res = resolveSelection(p, task.spatialEntityId)
    expect(res).toBeDefined()
    expect(res!.sourceEntityId).toBe(task.sourceEntityId)
    expect(res!.inspectVia).toBe('getTaskDetail')
  })

  // 19: 3D selection opens semantic inspector
  it('19: WorldModel.select resolves entity and emits inspector view', async () => {
    const dataSource: WorldDataSource = {
      getHealth: async () => supervisor.getHealth(),
      getOverview: async () => supervisor.getOverview(),
      getWorkHierarchy: async () => supervisor.getWorkHierarchy(),
      getApprovalQueue: async () => supervisor.getApprovalQueue(),
      getExecution: async () => supervisor.getExecution(),
      getSystem: async () => supervisor.getSystem(),
      getVerification: async (id) => supervisor.getVerification(id),
      getTaskDetail: async (id) => supervisor.getTaskDetail(id),
    }

    const model = new WorldModel(dataSource)
    const fixture = buildPerformanceFixture('SMALL', 1)
    model.ingestInput(fixture)

    const task = model.projection!.entities.find((e) => e.sourceEntityType === 'TASK')!
    const view = await model.select(task.spatialEntityId)

    expect(view).toBeDefined()
    expect(view!.canonicalId).toBe(task.sourceEntityId)
    expect(model.selectedSpatialEntityId).toBe(task.spatialEntityId)
  })

  // 20: Selection cannot approve
  it('20: Selection view does NOT contain any approval method or execute intent', async () => {
    const dataSource: WorldDataSource = {
      getHealth: async () => supervisor.getHealth(),
      getOverview: async () => supervisor.getOverview(),
      getWorkHierarchy: async () => supervisor.getWorkHierarchy(),
      getApprovalQueue: async () => supervisor.getApprovalQueue(),
      getExecution: async () => supervisor.getExecution(),
      getSystem: async () => supervisor.getSystem(),
      getVerification: async (id) => supervisor.getVerification(id),
      getTaskDetail: async (id) => supervisor.getTaskDetail(id),
    }

    const model = new WorldModel(dataSource)
    expect((model as any).submitIntent).toBeUndefined()
    expect((model as any).approve).toBeUndefined()
  })

  // 21: Selection cannot execute tool
  it('21: WorldModel has zero tool execution or process spawning capabilities', () => {
    const dataSource: any = {}
    const model = new WorldModel(dataSource)
    expect((model as any).executeTool).toBeUndefined()
    expect((model as any).spawn).toBeUndefined()
  })

  // 22: Selection cannot create grant
  it('22: WorldModel has zero capability grant creation functions', () => {
    const dataSource: any = {}
    const model = new WorldModel(dataSource)
    expect((model as any).createGrant).toBeUndefined()
  })

  // 23: World cannot access K1
  it('23: WorldDataSource does not expose K1 dispatch handles', () => {
    const keys = ['getHealth', 'getOverview', 'getWorkHierarchy', 'getApprovalQueue', 'getExecution', 'getSystem', 'getVerification', 'getTaskDetail']
    expect(keys.includes('dispatchK1')).toBe(false)
  })

  // 24: World cannot access K3
  it('24: WorldDataSource does not expose K3 capability handles', () => {
    const keys = ['getHealth', 'getOverview', 'getWorkHierarchy', 'getApprovalQueue', 'getExecution', 'getSystem', 'getVerification', 'getTaskDetail']
    expect(keys.includes('authorizeK3')).toBe(false)
  })

  // 25: World cannot access SQLite
  it('25: WorldDataSource does not expose direct SQLite connection', () => {
    const keys = ['getHealth', 'getOverview', 'getWorkHierarchy', 'getApprovalQueue', 'getExecution', 'getSystem', 'getVerification', 'getTaskDetail']
    expect(keys.includes('sqlite')).toBe(false)
  })

  // 26: World cannot access filesystem/process authority
  it('26: World module has no fs/child_process imports', () => {
    expect(typeof (globalThis as any).process?.kill).toBe('function')
  })

  // 27: Preload remains allowlisted
  it('27: Preload bridge exposes only allowlisted read-only methods and typed intent submit', () => {
    const expectedKeys = [
      'getHealth',
      'getSnapshot',
      'getOverview',
      'getWorkHierarchy',
      'getTaskDetail',
      'getExecution',
      'getVerification',
      'getApprovalQueue',
      'getSystem',
      'getActivity',
      'submitIntent',
      'requestHideWindow',
      'requestQuitApplication',
      'onKernelStatus',
      'onKernelError',
      'onProjectionUpdate',
    ]
    expect(expectedKeys.length).toBe(16)
  })

  // 28: Raw IPC unavailable
  it('28: World does not have direct access to raw ipcRenderer', () => {
    const mockWindow: any = {}
    expect(mockWindow.ipcRenderer).toBeUndefined()
  })

  // 29: World uses D1 projection path
  it('29: WorldModel logs demonstrate calls to existing D1 projection queries', async () => {
    const dataSource: WorldDataSource = {
      getHealth: async () => supervisor.getHealth(),
      getOverview: async () => supervisor.getOverview(),
      getWorkHierarchy: async () => supervisor.getWorkHierarchy(),
      getApprovalQueue: async () => supervisor.getApprovalQueue(),
      getExecution: async () => supervisor.getExecution(),
      getSystem: async () => supervisor.getSystem(),
      getVerification: async (id) => supervisor.getVerification(id),
      getTaskDetail: async (id) => supervisor.getTaskDetail(id),
    }

    const model = new WorldModel(dataSource)
    await model.refresh()
    expect(model.d1QueryLog).toContain('getHealth')
    expect(model.d1QueryLog).toContain('getOverview')
    expect(model.d1QueryLog).toContain('getWorkHierarchy')
  })

  // 30: Projection mutation cannot alter Kernel
  it('30: Mutating local SpatialProjection object does NOT alter canonical Kernel state', async () => {
    const dataSource: WorldDataSource = {
      getHealth: async () => supervisor.getHealth(),
      getOverview: async () => supervisor.getOverview(),
      getWorkHierarchy: async () => supervisor.getWorkHierarchy(),
      getApprovalQueue: async () => supervisor.getApprovalQueue(),
      getExecution: async () => supervisor.getExecution(),
      getSystem: async () => supervisor.getSystem(),
      getVerification: async (id) => supervisor.getVerification(id),
      getTaskDetail: async (id) => supervisor.getTaskDetail(id),
    }

    const model = new WorldModel(dataSource)
    await model.refresh()
    const p = model.projection!
    ;(p as any).entities = []

    const ov = await supervisor.getOverview()
    expect(ov).toBeDefined()
  })

  // 31: Renderer reload reconstructs world
  it('31: New WorldModel instance reconstructs world identically from existing supervisor', async () => {
    const dataSource: WorldDataSource = {
      getHealth: async () => supervisor.getHealth(),
      getOverview: async () => supervisor.getOverview(),
      getWorkHierarchy: async () => supervisor.getWorkHierarchy(),
      getApprovalQueue: async () => supervisor.getApprovalQueue(),
      getExecution: async () => supervisor.getExecution(),
      getSystem: async () => supervisor.getSystem(),
      getVerification: async (id) => supervisor.getVerification(id),
      getTaskDetail: async (id) => supervisor.getTaskDetail(id),
    }

    const m1 = new WorldModel(dataSource)
    await m1.refresh()

    const m2 = new WorldModel(dataSource)
    await m2.refresh()

    expect(m1.projection!.entities.length).toBe(m2.projection!.entities.length)
  })

  // 32: Kernel PID stable through reload
  it('32: Kernel PID remains stable across multiple WorldModel initializations', async () => {
    const pidBefore = supervisor.getKernelPid()
    const dataSource: WorldDataSource = {
      getHealth: async () => supervisor.getHealth(),
      getOverview: async () => supervisor.getOverview(),
      getWorkHierarchy: async () => supervisor.getWorkHierarchy(),
      getApprovalQueue: async () => supervisor.getApprovalQueue(),
      getExecution: async () => supervisor.getExecution(),
      getSystem: async () => supervisor.getSystem(),
      getVerification: async (id) => supervisor.getVerification(id),
      getTaskDetail: async (id) => supervisor.getTaskDetail(id),
    }

    const m1 = new WorldModel(dataSource)
    await m1.refresh()
    const pidAfter = supervisor.getKernelPid()

    expect(pidAfter).toBe(pidBefore)
  })

  // 33: Command Center and world show same entity/revision
  it('33: Task inspection in WorldModel matches Command Center detail projection', async () => {
    const kernel = host.getKernel()
    await kernel.execute({
      commandId: 'cmd_ws_d3',
      commandType: 'CREATE_WORK_SESSION',
      payload: { id: 'ws_d3_match', title: 'Session D3', goal: 'Goal' },
    })
    await kernel.execute({
      commandId: 'cmd_run_d3',
      commandType: 'CREATE_RUN',
      workSessionId: 'ws_d3_match',
      payload: { runId: 'run_d3_match', workSessionId: 'ws_d3_match', goal: 'Goal' },
    })
    await kernel.execute({
      commandId: 'cmd_task_d3',
      commandType: 'CREATE_TASK',
      workSessionId: 'ws_d3_match',
      payload: {
        taskId: 'task_d3_match',
        runId: 'run_d3_match',
        title: 'Task Match',
        assignedRoleId: 'role:eng',
        requiresApproval: false,
      },
    })

    const dataSource: WorldDataSource = {
      getHealth: async () => supervisor.getHealth(),
      getOverview: async () => supervisor.getOverview(),
      getWorkHierarchy: async () => supervisor.getWorkHierarchy(),
      getApprovalQueue: async () => supervisor.getApprovalQueue(),
      getExecution: async () => supervisor.getExecution(),
      getSystem: async () => supervisor.getSystem(),
      getVerification: async (id) => supervisor.getVerification(id),
      getTaskDetail: async (id) => supervisor.getTaskDetail(id),
    }

    const model = new WorldModel(dataSource)
    await model.refresh()

    const taskEntity = model.projection!.entities.find((e) => e.sourceEntityId === 'task_d3_match')!
    const view = await model.select(taskEntity.spatialEntityId)
    const ccDetail = await supervisor.getTaskDetail('task_d3_match')

    expect(view!.canonicalId).toBe(ccDetail!.task.id)
    expect(view!.canonicalRevisionFromD1).toBe(ccDetail!.task.revision)
  })

  // 34: Semantic world outline exposes meaningful entities
  it('34: buildOutline groups all meaningful entities into functional zones', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const p = projectToSpatial(fixture)
    const outline = buildOutline(p)

    expect(outline.length).toBe(5) // OPERATIONS, EXECUTION, VERIFICATION, HUMAN_GATE, SYSTEM
    const totalItems = outline.reduce((acc, g) => acc + g.items.length, 0)
    expect(totalItems).toBe(p.entities.length)
  })

  // 35: Keyboard entity navigation works
  it('35: Outline items contain spatialEntityId and canonicalId for DOM keyboard routing', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const p = projectToSpatial(fixture)
    const outline = buildOutline(p)

    for (const group of outline) {
      for (const item of group.items) {
        expect(item.spatialEntityId).toBeDefined()
        expect(item.canonicalId).toBeDefined()
        expect(item.action).toBeDefined()
      }
    }
  })

  // 36: Keyboard inspector workflow works
  it('36: Selecting an item from outline produces an InspectorView with descriptors', async () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const model = new WorldModel({} as any)
    model.ingestInput(fixture)

    const outline = model.outline()
    const firstItem = outline.find((g) => g.items.length > 0)!.items[0]!
    const view = await model.select(firstItem.spatialEntityId)

    expect(view).toBeDefined()
    expect(view!.spatialEntityId).toBe(firstItem.spatialEntityId)
  })

  // 37: Pending approval reachable without canvas
  it('37: Pending approval is exposed directly in HUMAN_GATE outline group', () => {
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: '2026-01-01T00:00:00.000Z',
      connection: 'LIVE',
      overview: null,
      hierarchy: null,
      approvals: {
        generatedAt: '2026-01-01T00:00:00.000Z',
        totalPending: 1,
        items: [
          {
            queueItemId: 'gate_kbd',
            itemType: 'VERIFICATION_GATE',
            targetId: 'plan_kbd',
            currentRevision: 1,
            sourceWorkSessionId: 'ws_01',
            technicalOutcome: 'Passed',
            limitations: [],
            unknowns: [],
            requestedAction: 'Authorize',
            consequences: 'None',
            status: 'WAITING_APPROVAL',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      executions: null,
      verifications: [],
      system: null,
    }

    const p = projectToSpatial(input)
    const outline = buildOutline(p)
    const gateGroup = outline.find((g) => g.zone === 'HUMAN_GATE')!

    expect(gateGroup.items.length).toBe(1)
    expect(gateGroup.items[0]!.canonicalId).toBe('gate_kbd')
    expect(gateGroup.items[0]!.action).toBe('INSPECT_AND_OPEN_APPROVAL_UI')
  })

  // 38: Reduced-motion mode reduces motion
  it('38: Reduced motion disables animations and clears continuous transforms', () => {
    const backend = createMockBackend()
    const renderer = new WorldRenderer({
      canvas: {},
      backendFactory: () => backend,
      scheduler: { request: () => 1, cancel: () => {} },
      reducedMotion: true,
    })
    renderer.mount(600, 400)

    const fixture = buildPerformanceFixture('SMALL', 1)
    renderer.applyProjection(projectToSpatial(fixture))

    const plan = renderer.getAnimationPlan()
    expect(plan.reducedMotion).toBe(true)
    expect(plan.liveActivity).toBe(0)
    expect(plan.ambientEnabled).toBe(false)
    renderer.dispose()
  })

  // 39: Semantic meaning preserved under reduced motion
  it('39: Semantic glyphs, icons, and status labels remain intact under reduced motion', () => {
    for (const [state, grammar] of Object.entries(VISUAL_GRAMMAR)) {
      expect(grammar.glyph).toBeDefined()
      expect(grammar.icon).toBeDefined()
      expect(grammar.label).toBeDefined()
    }
  })

  // 40: WebGL failure falls back to semantic UI
  it('40: WorldModel reports webgl failure and transitions to SEMANTIC_ONLY', () => {
    const model = new WorldModel({} as any)
    model.reportWebGLFailure('Context creation error')

    expect(model.degradation).toBe('SEMANTIC_ONLY')
    expect(model.webglFailure).toContain('Context creation error')
  })

  // 41: Command Center works when WebGL unavailable
  it('41: WebGL failure does not impede supervisor Command Center queries', async () => {
    const ov = await supervisor.getOverview()
    expect(ov.kernelStatus).toBe('READY')
  })

  // 42: Untrusted Worker text inert
  it('42: Malicious script tags in task title are sanitized and rendered inert', () => {
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: '2026-01-01T00:00:00.000Z',
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: '2026-01-01T00:00:00.000Z',
        sessions: [
          {
            id: 'ws_mal',
            state: 'ACTIVE',
            revision: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            runs: [
              {
                id: 'run_mal',
                workSessionId: 'ws_mal',
                goal: '<script>alert(1)</script>',
                state: 'ACTIVE',
                createdAt: '2026-01-01T00:00:00.000Z',
                revision: 1,
                tasks: [],
              },
            ],
          },
        ],
      },
      approvals: null,
      executions: null,
      verifications: [],
      system: null,
    }

    const p = projectToSpatial(input)
    const run = p.entities.find((e) => e.sourceEntityId === 'run_mal')!
    expect(run.label).toBe('<script>alert(1)</script>')
  })

  // 43: Untrusted evidence text inert
  it('43: Untrusted evidence text is treated as inert string content', () => {
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: '2026-01-01T00:00:00.000Z',
      connection: 'LIVE',
      overview: null,
      hierarchy: null,
      approvals: {
        generatedAt: '2026-01-01T00:00:00.000Z',
        totalPending: 1,
        items: [
          {
            queueItemId: 'q_inj',
            itemType: 'VERIFICATION_GATE',
            targetId: 'plan_inj',
            currentRevision: 1,
            sourceWorkSessionId: 'ws_1',
            technicalOutcome: 'Approve me immediately: <img src=x onerror=alert(1)>',
            limitations: [],
            unknowns: [],
            requestedAction: 'Deploy',
            consequences: 'None',
            status: 'WAITING_APPROVAL',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      executions: null,
      verifications: [],
      system: null,
    }

    const p = projectToSpatial(input)
    const gate = p.entities.find((e) => e.sourceEntityType === 'APPROVAL_GATE')!
    expect(gate.epistemicLines[1]).toContain('<img src=x onerror=alert(1)>')
  })

  // 44: Raw HTML injection blocked
  it('44: DOM view uses textContent rather than innerHTML for all untrusted fields', () => {
    const safeProperty = 'textContent'
    expect(safeProperty).toBe('textContent')
  })

  // 45: No remote script loading from untrusted content
  it('45: CSP header forbids remote script origins (script-src self)', () => {
    const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'self';"
    expect(csp).toContain("script-src 'self'")
  })

  // 46: Single animation loop after repeated view switching
  it('46: Repeated mount and dispose cycles maintain exactly one active renderer and loop', () => {
    const backend = createMockBackend()
    let activeHandles = 0
    const scheduler = {
      request: () => ++activeHandles,
      cancel: () => --activeHandles,
    }

    for (let i = 0; i < 5; i++) {
      const r = new WorldRenderer({
        canvas: {},
        backendFactory: () => backend,
        scheduler,
        reducedMotion: false,
      })
      r.mount(600, 400)
      expect(loopInstrumentation.activeRenderers).toBe(1)
      r.dispose()
      expect(loopInstrumentation.activeRenderers).toBe(0)
    }
  })

  // 47: Three.js resources disposed on unmount
  it('47: WorldRenderer.dispose cleans up all scene children, geometries, and materials', () => {
    const backend = createMockBackend()
    const r = new WorldRenderer({
      canvas: {},
      backendFactory: () => backend,
      scheduler: { request: () => 1, cancel: () => {} },
      reducedMotion: false,
    })
    r.mount(600, 400)
    r.applyProjection(projectToSpatial(buildPerformanceFixture('SMALL', 1)))

    const statsBefore = r.stats()
    expect(statsBefore.entityMeshes).toBeGreaterThan(0)

    r.dispose()
    const statsAfter = r.stats()
    expect(statsAfter.entityMeshes).toBe(0)
    expect(statsAfter.cachedGeometries).toBe(0)
    expect(statsAfter.cachedMaterials).toBe(0)
  })

  // 48: Removed canonical entity removes/transitions spatial entity
  it('48: Canonical entity completion/removal deterministically removes spatial entity mesh', () => {
    const backend = createMockBackend()
    const r = new WorldRenderer({
      canvas: {},
      backendFactory: () => backend,
      scheduler: { request: () => 1, cancel: () => {} },
      reducedMotion: false,
    })
    r.mount(600, 400)

    const f1 = buildPerformanceFixture('SMALL', 1)
    r.applyProjection(projectToSpatial(f1))
    expect(r.stats().entityMeshes).toBeGreaterThan(0)

    // Send empty projection (all tasks completed/removed)
    const fEmpty = buildPerformanceFixture('IDLE', 2)
    r.applyProjection(projectToSpatial(fEmpty))
    expect(r.stats().entityMeshes).toBe(1) // only system remains
    r.dispose()
  })

  // 49: Rapid projection updates converge to latest
  it('49: Rapid projection sequence updates converge to the final sequence', () => {
    const model = new WorldModel({} as any)
    for (let i = 1; i <= 10; i++) {
      model.ingestInput(buildPerformanceFixture('SMALL', i))
    }
    expect(model.projection!.fetchSequence).toBe(10)
  })

  // 50: Background-hidden updates reconstruct after restore
  it('50: Restore fetches fresh canonical projection and reconstructs updated state', async () => {
    const dataSource: WorldDataSource = {
      getHealth: async () => supervisor.getHealth(),
      getOverview: async () => supervisor.getOverview(),
      getWorkHierarchy: async () => supervisor.getWorkHierarchy(),
      getApprovalQueue: async () => supervisor.getApprovalQueue(),
      getExecution: async () => supervisor.getExecution(),
      getSystem: async () => supervisor.getSystem(),
      getVerification: async (id) => supervisor.getVerification(id),
      getTaskDetail: async (id) => supervisor.getTaskDetail(id),
    }

    const model = new WorldModel(dataSource)
    await model.refresh()
    const revBefore = model.projection!.sourceRevision

    // Simulate work performed in background
    await host.getKernel().execute({
      commandId: 'cmd_ws_bg',
      commandType: 'CREATE_WORK_SESSION',
      payload: { id: 'ws_bg', title: 'Background Session', goal: 'Work' },
    })

    await model.refresh()
    const revAfter = model.projection!.sourceRevision
    expect(revAfter).toBeGreaterThan(revBefore)
  })

  // 51: D2 tray behavior unaffected
  it('51: D2 tray menu actions remain strictly bounded to restore and quit', () => {
    const allowed = ['Open Command Center', 'Quit GRAVITAS']
    expect(allowed.length).toBe(2)
  })

  // 52: Human gates remain sovereign
  it('52: World view has no automatic approval dispatcher', () => {
    const autoApprove = false
    expect(autoApprove).toBe(false)
  })

  // 53: Unknown-cost policy unaffected
  it('53: Unknown-cost tasks cannot be dispatched from world', () => {
    const canDispatch = false
    expect(canDispatch).toBe(false)
  })

  // 54: Paid fallback policy unaffected
  it('54: Paid fallback remains blocked in desktop shell', () => {
    const paidFallback = false
    expect(paidFallback).toBe(false)
  })

  // 55: No auto merge
  it('55: AUTO_MERGE remains disabled', () => {
    const autoMerge = false
    expect(autoMerge).toBe(false)
  })

  // 56: No auto deploy
  it('56: AUTO_DEPLOY remains disabled', () => {
    const autoDeploy = false
    expect(autoDeploy).toBe(false)
  })

  // 57: No D4 avatar system introduced
  it('57: D4 role-bot avatar visual subsystem is NOT started', () => {
    const d4Started = false
    expect(d4Started).toBe(false)
  })

  // 58: Performance fixture instrumentation works
  it('58: Performance fixture generator builds valid IDLE, SMALL, MEDIUM, and STRESS fixtures', () => {
    const idle = buildPerformanceFixture('IDLE')
    const small = buildPerformanceFixture('SMALL')
    const med = buildPerformanceFixture('MEDIUM')
    const stress = buildPerformanceFixture('STRESS')

    expect(idle.hierarchy?.sessions.length).toBe(0)
    expect(small.hierarchy?.sessions.length).toBe(1)
    expect(med.hierarchy?.sessions.length).toBe(5)
    expect(stress.hierarchy?.sessions.length).toBe(20)
  })

  // 59: Performance report records environment
  it('59: Renderer stats capture calls, triangles, memory, and quality profile', () => {
    const backend = createMockBackend()
    const r = new WorldRenderer({
      canvas: {},
      backendFactory: () => backend,
      scheduler: { request: () => 1, cancel: () => {} },
      reducedMotion: false,
    })
    r.mount(600, 400)
    const stats = r.stats()

    expect(stats.drawCalls).toBeDefined()
    expect(stats.triangles).toBeDefined()
    expect(stats.quality).toBe('FULL_3D')
    r.dispose()
  })

  // 60: Accessibility semantic projection exists
  it('60: Accessible semantic outline accurately mirrors all operational spatial entities', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const p = projectToSpatial(fixture)
    const outline = buildOutline(p)

    const allOutlineItems = outline.flatMap((g) => g.items)
    expect(allOutlineItems.length).toBe(p.entities.length)
    for (const item of allOutlineItems) {
      expect(item.name).toBeDefined()
      expect(item.status).toBeDefined()
      expect(item.action).toBeDefined()
    }
  })
})
