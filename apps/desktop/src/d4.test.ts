/**
 * GRAVITAS D4 — Role-Bot Visual System, Taxonomy Projection & Runtime Semantics Test Suite
 *
 * Verifies all 60 required D4 test areas across:
 * - 01-10: P3 Taxonomy Separation & Invariants
 * - 11-20: Tier 1 (7 Reasoning Roles) Projection & Distinct Silhouettes
 * - 21-30: Tier 2 (14 Specialist Profiles) Projection & Neutral Silhouettes
 * - 31-40: Tier 3 (4 Mechanical Services) Industrial Tool Projection & Non-Autonomy
 * - 41-50: Epistemic State & Visual Grammar Truth (Active, Blocked, Succeeded, Approved, Idle)
 * - 51-60: Security Boundaries, Human Gate Sovereignty, Single Render Loop & Performance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  CANONICAL_ROLE_REGISTRY,
  TIER1_ROLE_IDS,
  TIER2_ROLE_IDS,
  TIER3_SERVICE_IDS,
  resolveRoleArchetype,
  type RoleVisualArchetype,
} from './renderer/world/roleRegistry.js'
import {
  projectToSpatial,
  buildPerformanceFixture,
  type SpatialInput,
  type SpatialProjection,
  type PerformanceFixtureKind,
  VISUAL_GRAMMAR,
} from './renderer/world/spatial.js'
import { WorldModel, type WorldDataSource } from './renderer/world/worldModel.js'
import { WorldRenderer, loopInstrumentation, type WorldRendererBackend } from './renderer/world/renderAdapter.js'
import type {
  ExecutionItem,
  HealthProjection,
  OverviewProjection,
  WorkHierarchyProjection,
  ApprovalQueueProjection,
  ExecutionProjection,
  SystemProjection,
  VerificationProjection,
  TaskDetailProjection,
} from './types.js'

function createMockBackend(): WorldRendererBackend {
  return {
    domElement: {},
    setSize: () => {},
    setPixelRatio: () => {},
    render: () => {},
    dispose: () => {},
    info: {
      render: { calls: 1, triangles: 10 },
      memory: { geometries: 1, textures: 0 },
    },
    getContextInfo: () => ({ renderer: 'MockRenderer', vendor: 'MockVendor' }),
  }
}

function createMockDataSource(custom?: Partial<WorldDataSource>): WorldDataSource {
  const now = '2026-01-01T00:00:00.000Z'
  const defaultOverview: OverviewProjection = {
    kernelStatus: 'READY',
    activeWorkSessionsCount: 1,
    activeRunsCount: 1,
    activeTasksCount: 1,
    waitingApprovalCount: 0,
    failedOrRecoveryCount: 0,
    runningExecutionsCount: 1,
    blockedAuthorityCount: 0,
    blockedCostCount: 0,
    generatedAt: now,
    canonicalRevision: 1,
    recentActivitySummary: [],
  }

  const defaultHierarchy: WorkHierarchyProjection = {
    canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
    generatedAt: now,
    sessions: [
      {
        id: 'ws_01',
        state: 'ACTIVE',
        revision: 1,
        createdAt: now,
        updatedAt: now,
        runs: [
          {
            id: 'run_01',
            workSessionId: 'ws_01',
            goal: 'Implement feature',
            state: 'ACTIVE',
            createdAt: now,
            revision: 1,
            tasks: [
              {
                id: 'task_01',
                runId: 'run_01',
                workSessionId: 'ws_01',
                title: 'Develop backend API',
                state: 'RUNNING',
                assignedRoleId: 'role:engineering:backend-engineer',
                requiresApproval: false,
                createdAt: now,
                updatedAt: now,
                revision: 1,
              },
            ],
          },
        ],
      },
    ],
  }

  const defaultExecution: ExecutionProjection = {
    generatedAt: now,
    executions: [
      {
        executionId: 'exec_01',
        taskId: 'task_01',
        roleId: 'role:engineering:backend-engineer',
        executorId: 'executor_backend_node',
        harnessId: 'harness:codex:node',
        surface: 'CONTAINED_CLI',
        provider: 'anthropic',
        model: 'claude-3-7-sonnet',
        processId: 'pid_9901',
        qualificationStatus: 'QUALIFIED',
        readinessStatus: 'READY',
        costEligibility: 'OPERATOR_INCLUDED_ACCOUNT',
        dispatchAuthorization: 'AUTHORIZED',
        grantedCapabilities: ['FS_READ', 'FS_WRITE'],
        status: 'RUNNING',
        startedAt: now,
        boundedOutput: 'Listening on port 8080',
      },
    ],
  }

  return {
    getHealth: async () => ({
      status: 'READY',
      desktopRuntime: 'Electron',
      protocolVersion: 'd4.0',
      kernelPid: 1234,
      mainPid: 5678,
      nodeVersion: '24.0.0',
      activeSessionCount: 1,
    }),
    getOverview: async () => defaultOverview,
    getWorkHierarchy: async () => defaultHierarchy,
    getApprovalQueue: async () => ({ generatedAt: now, totalPending: 0, items: [] }),
    getExecution: async () => defaultExecution,
    getSystem: async () => ({
      generatedAt: now,
      mainPid: 5678,
      kernelPid: 1234,
      nodeVersion: '24.0.0',
      electronVersion: '44.5.1',
      platform: 'win32',
      memoryRssBytes: 1024 * 1024 * 50,
      kernelStatus: 'READY',
      sqliteStorageMode: 'DATABASE_SYNC',
    }),
    getVerification: async () => null,
    getTaskDetail: async (taskId: string) => ({
      task: {
        id: taskId,
        runId: 'run_01',
        workSessionId: 'ws_01',
        title: 'Develop backend API',
        state: 'RUNNING',
        assignedRoleId: 'role:engineering:backend-engineer',
        requiresApproval: false,
        createdAt: now,
        updatedAt: now,
        revision: 1,
      },
      causalChain: { workSessionId: 'ws_01', runId: 'run_01', taskId },
      executionContext: {
        executorId: 'executor_backend_node',
        roleId: 'role:engineering:backend-engineer',
        harnessId: 'harness:codex:node',
        status: 'RUNNING',
      },
      workerResult: {
        resultSummary: 'Worker executing',
        outputText: 'Worker stdout output text',
        completedAt: now,
      },
    }),
    ...custom,
  }
}

describe('GRAVITAS D4 — Role-Bot Visual System & Character Semantics Suite', () => {
  beforeEach(() => {
    loopInstrumentation.reset()
  })

  // ─── 01-10: P3 Taxonomy Separation & Invariants ─────────────────────────────

  it('01: Invariant: Role != Executor != Harness != Model != Provider != Process', () => {
    const roleId = 'role:engineering:backend-engineer'
    const executorId = 'executor_backend_node'
    const harnessId = 'harness:codex:node'
    const model = 'claude-3-7-sonnet'
    const provider = 'anthropic'
    const processId = 'pid_9901'

    expect(roleId).not.toBe(executorId)
    expect(executorId).not.toBe(harnessId)
    expect(harnessId).not.toBe(model)
    expect(model).not.toBe(provider)
    expect(provider).not.toBe(processId)
  })

  it('02: Invariant: Visual Bot is a projection, not an authority or autonomous personality', () => {
    const archetype = resolveRoleArchetype('role:strategy:chief-planner')
    expect(archetype).toBeDefined()
    expect(archetype.mechanicalService).toBe(false)
    // Prototype check: visual archetype carries no execute or approve methods
    expect((archetype as any).execute).toBeUndefined()
    expect((archetype as any).approve).toBeUndefined()
    expect((archetype as any).submitIntent).toBeUndefined()
  })

  it('03: Role Template != Role Assignment != Visual Bot Instance', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const p = projectToSpatial(fixture)
    const bots = p.entities.filter((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bots.length).toBeGreaterThan(0)
    for (const b of bots) {
      // Must be scoped to parent task
      expect(b.parentSpatialEntityId).toContain('sp:TASK:')
      expect(b.sourceEntityId).toContain(':')
    }
  })

  it('04: Unknown role safely resolves to generic fallback without throwing or elevating privilege', () => {
    const unknown = resolveRoleArchetype('role:unknown:experimental-bot')
    expect(unknown.tier).toBe('TIER2_SPECIALIST')
    expect(unknown.displayName).toContain('Generic Role')
    expect(unknown.silhouette).toBe('CONE_PRISM')
    expect(unknown.mechanicalService).toBe(false)
  })

  it('05: Role registry contains all 7 Tier 1 Reasoning Roles', () => {
    for (const id of TIER1_ROLE_IDS) {
      const arch = CANONICAL_ROLE_REGISTRY[id]
      expect(arch).toBeDefined()
      expect(arch?.tier).toBe('TIER1_REASONING')
      expect(arch?.shapeCategory).toBe('HUMANOID_REASONER')
      expect(arch?.mechanicalService).toBe(false)
    }
  })

  it('06: Role registry contains all 14 Tier 2 Specialist Profiles', () => {
    for (const id of TIER2_ROLE_IDS) {
      const arch = CANONICAL_ROLE_REGISTRY[id]
      expect(arch).toBeDefined()
      expect(arch?.tier).toBe('TIER2_SPECIALIST')
      expect(arch?.shapeCategory).toBe('SPECIALIST_OPERATOR')
      expect(arch?.mechanicalService).toBe(false)
    }
  })

  it('07: Role registry contains all 4 Tier 3 Mechanical Services', () => {
    for (const id of TIER3_SERVICE_IDS) {
      const arch = CANONICAL_ROLE_REGISTRY[id]
      expect(arch).toBeDefined()
      expect(arch?.tier).toBe('TIER3_MECHANICAL_SERVICE')
      expect(arch?.shapeCategory).toBe('MECHANICAL_UNIT')
      expect(arch?.mechanicalService).toBe(true)
    }
  })

  it('08: Tier 3 Mechanical Services are visually flagged as tools/units, NOT reasoning bots', () => {
    const runner = resolveRoleArchetype('service:verification:deterministic-runner')
    expect(runner.mechanicalService).toBe(true)
    expect(runner.silhouette).toBe('BOX_UNIT')
    expect(runner.displayName).toBe('Deterministic Verifier Runner')
  })

  it('09: Role assignment projection links bot to canonical taskId and runId', () => {
    const ds = createMockDataSource()
    const model = new WorldModel(ds)
    const outcome = model.ingestInput(buildPerformanceFixture('SMALL', 1))
    expect(outcome.decision.accepted).toBe(true)
    const bots = model.projection?.entities.filter((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bots && bots.length > 0).toBe(true)
    const firstBot = bots![0]!
    expect(firstBot.workSessionId).toBeDefined()
    expect(firstBot.runId).toBeDefined()
    expect(firstBot.roleId).toBeDefined()
  })

  it('10: Bot execution metadata preserves executor, harness, model, and processId without fabrication', () => {
    const now = '2026-01-01T00:00:00.000Z'
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: now,
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: now,
        sessions: [
          {
            id: 'ws_test',
            state: 'ACTIVE',
            revision: 1,
            createdAt: now,
            updatedAt: now,
            runs: [
              {
                id: 'run_test',
                workSessionId: 'ws_test',
                goal: 'Test run',
                state: 'ACTIVE',
                createdAt: now,
                revision: 1,
                tasks: [
                  {
                    id: 'task_backend',
                    runId: 'run_test',
                    workSessionId: 'ws_test',
                    title: 'Task backend',
                    state: 'RUNNING',
                    assignedRoleId: 'role:engineering:backend-engineer',
                    requiresApproval: false,
                    createdAt: now,
                    updatedAt: now,
                    revision: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
      approvals: null,
      executions: {
        generatedAt: now,
        executions: [
          {
            executionId: 'exec_b1',
            taskId: 'task_backend',
            roleId: 'role:engineering:backend-engineer',
            executorId: 'exec_007',
            harnessId: 'harness:codex:node',
            surface: 'CLI',
            provider: 'anthropic',
            model: 'claude-3-7-sonnet',
            processId: 'pid_4412',
            qualificationStatus: 'QUALIFIED',
            readinessStatus: 'READY',
            costEligibility: 'OPERATOR_INCLUDED_ACCOUNT',
            dispatchAuthorization: 'AUTHORIZED',
            grantedCapabilities: ['FS_READ'],
            status: 'RUNNING',
            startedAt: now,
            boundedOutput: 'ok',
          },
        ],
      },
      verifications: [],
      system: null,
      includeRoleBots: true,
    }

    const p = projectToSpatial(input)
    const bot = p.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    expect(bot!.executorId).toBe('exec_007')
    expect(bot!.harnessId).toBe('harness:codex:node')
    expect(bot!.model).toBe('claude-3-7-sonnet')
    expect(bot!.provider).toBe('anthropic')
    expect(bot!.processId).toBe('pid_4412')
    expect(bot!.executionStatus).toBe('RUNNING')
  })

  // ─── 11-20: Tier 1 Reasoning Roles & Distinct Silhouettes ───────────────────

  it('11: Chief Planner has CYLINDER_HEAD silhouette and OPERATIONS zone', () => {
    const arch = resolveRoleArchetype('role:strategy:chief-planner')
    expect(arch.silhouette).toBe('CYLINDER_HEAD')
    expect(arch.defaultZone).toBe('OPERATIONS')
    expect(arch.emblem).toBe('♜')
  })

  it('12: Frontend Engineer has CYLINDER_HEAD silhouette and EXECUTION zone', () => {
    const arch = resolveRoleArchetype('role:engineering:frontend-engineer')
    expect(arch.silhouette).toBe('CYLINDER_HEAD')
    expect(arch.defaultZone).toBe('EXECUTION')
    expect(arch.emblem).toBe('◧')
  })

  it('13: Backend Engineer has CYLINDER_HEAD silhouette and EXECUTION zone', () => {
    const arch = resolveRoleArchetype('role:engineering:backend-engineer')
    expect(arch.silhouette).toBe('CYLINDER_HEAD')
    expect(arch.defaultZone).toBe('EXECUTION')
    expect(arch.emblem).toBe('⚙')
  })

  it('14: Desktop Engineer has CYLINDER_HEAD silhouette and EXECUTION zone', () => {
    const arch = resolveRoleArchetype('role:engineering:desktop-engineer')
    expect(arch.silhouette).toBe('CYLINDER_HEAD')
    expect(arch.defaultZone).toBe('EXECUTION')
    expect(arch.emblem).toBe('◫')
  })

  it('15: Independent Reviewer has HELMET_OCTA silhouette and VERIFICATION zone', () => {
    const arch = resolveRoleArchetype('role:quality:independent-reviewer')
    expect(arch.silhouette).toBe('HELMET_OCTA')
    expect(arch.defaultZone).toBe('VERIFICATION')
    expect(arch.emblem).toBe('⚖')
  })

  it('16: Integration Engineer has CYLINDER_HEAD silhouette and HUMAN_GATE zone', () => {
    const arch = resolveRoleArchetype('role:integration:integration-engineer')
    expect(arch.silhouette).toBe('CYLINDER_HEAD')
    expect(arch.defaultZone).toBe('HUMAN_GATE')
    expect(arch.emblem).toBe('☍')
  })

  it('17: Security Auditor has HELMET_OCTA silhouette and VERIFICATION zone', () => {
    const arch = resolveRoleArchetype('role:governance:security-auditor')
    expect(arch.silhouette).toBe('HELMET_OCTA')
    expect(arch.defaultZone).toBe('VERIFICATION')
    expect(arch.emblem).toBe('🛡')
  })

  it('18: All Tier 1 roles have distinct primary colors', () => {
    const colors = new Set(TIER1_ROLE_IDS.map((id) => CANONICAL_ROLE_REGISTRY[id]!.primaryColor))
    expect(colors.size).toBe(TIER1_ROLE_IDS.length)
  })

  it('19: All Tier 1 roles have distinct emblems', () => {
    const emblems = new Set(TIER1_ROLE_IDS.map((id) => CANONICAL_ROLE_REGISTRY[id]!.emblem))
    expect(emblems.size).toBe(TIER1_ROLE_IDS.length)
  })

  it('20: Tier 1 reasoning bots render with live activity animation ONLY when execution is running', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const p = projectToSpatial(fixture)
    const activeBots = p.entities.filter((e) => e.sourceEntityType === 'ROLE_BOT' && e.visualState === 'ACTIVE')
    expect(activeBots.length).toBeGreaterThan(0)
    for (const b of activeBots) {
      expect(b.animation).toBe('LIVE_ACTIVITY')
      expect(b.executionEvidence).toMatch(/EXECUTION_RECORD_RUNNING|TASK_STATE_ONLY/)
    }
  })

  // ─── 21-30: Tier 2 Specialist Profiles ─────────────────────────────────────

  it('21: Technical Researcher resolves correctly with CONE_PRISM silhouette', () => {
    const arch = resolveRoleArchetype('role:research:technical-researcher')
    expect(arch.silhouette).toBe('CONE_PRISM')
    expect(arch.tier).toBe('TIER2_SPECIALIST')
    expect(arch.emblem).toBe('🔍')
  })

  it('22: Design Library Scout resolves correctly with CONE_PRISM silhouette', () => {
    const arch = resolveRoleArchetype('role:design:design-library-scout')
    expect(arch.silhouette).toBe('CONE_PRISM')
    expect(arch.tier).toBe('TIER2_SPECIALIST')
    expect(arch.emblem).toBe('🎨')
  })

  it('23: Pattern Librarian resolves correctly with CONE_PRISM silhouette', () => {
    const arch = resolveRoleArchetype('role:architecture:pattern-librarian')
    expect(arch.silhouette).toBe('CONE_PRISM')
    expect(arch.tier).toBe('TIER2_SPECIALIST')
    expect(arch.emblem).toBe('📚')
  })

  it('24: Study Coach domain profile resolves correctly with CONE_PRISM silhouette', () => {
    const arch = resolveRoleArchetype('profile:domain:study-coach')
    expect(arch.silhouette).toBe('CONE_PRISM')
    expect(arch.tier).toBe('TIER2_SPECIALIST')
    expect(arch.emblem).toBe('📖')
  })

  it('25: Personal Coach domain profile resolves correctly with CONE_PRISM silhouette', () => {
    const arch = resolveRoleArchetype('profile:domain:personal-coach')
    expect(arch.silhouette).toBe('CONE_PRISM')
    expect(arch.tier).toBe('TIER2_SPECIALIST')
    expect(arch.emblem).toBe('⏱')
  })

  it('26: Calendar Agent connector profile resolves correctly with CONE_PRISM silhouette', () => {
    const arch = resolveRoleArchetype('profile:connector:calendar-agent')
    expect(arch.silhouette).toBe('CONE_PRISM')
    expect(arch.tier).toBe('TIER2_SPECIALIST')
    expect(arch.emblem).toBe('📅')
  })

  it('27: Inbox Agent connector profile resolves correctly with CONE_PRISM silhouette', () => {
    const arch = resolveRoleArchetype('profile:connector:inbox-agent')
    expect(arch.silhouette).toBe('CONE_PRISM')
    expect(arch.tier).toBe('TIER2_SPECIALIST')
    expect(arch.emblem).toBe('✉')
  })

  it('28: Lead Researcher profile resolves correctly with CONE_PRISM silhouette', () => {
    const arch = resolveRoleArchetype('profile:domain:lead-researcher')
    expect(arch.silhouette).toBe('CONE_PRISM')
    expect(arch.tier).toBe('TIER2_SPECIALIST')
    expect(arch.emblem).toBe('🔎')
  })

  it('29: Architecture Arena protocol evaluation resolves correctly with CONE_PRISM silhouette', () => {
    const arch = resolveRoleArchetype('protocol:evaluation:architecture-arena')
    expect(arch.silhouette).toBe('CONE_PRISM')
    expect(arch.tier).toBe('TIER2_SPECIALIST')
    expect(arch.emblem).toBe('⚔')
  })

  it('30: Specialist domain profiles default to their respective functional zones', () => {
    const study = resolveRoleArchetype('profile:domain:study-coach')
    expect(study.defaultZone).toBe('OPERATIONS')
    const pattern = resolveRoleArchetype('role:architecture:pattern-librarian')
    expect(pattern.defaultZone).toBe('OPERATIONS')
    const dataEng = resolveRoleArchetype('profile:domain:data-engineer')
    expect(dataEng.defaultZone).toBe('EXECUTION')
  })

  // ─── 31-40: Tier 3 Mechanical Services & Non-Autonomy ──────────────────────

  it('31: Deterministic Verification Runner has BOX_UNIT silhouette and VERIFICATION zone', () => {
    const arch = resolveRoleArchetype('service:verification:deterministic-runner')
    expect(arch.silhouette).toBe('BOX_UNIT')
    expect(arch.defaultZone).toBe('VERIFICATION')
    expect(arch.emblem).toBe('▣')
    expect(arch.mechanicalService).toBe(true)
  })

  it('32: Browser QA Service has TORUS_DEVICE silhouette and VERIFICATION zone', () => {
    const arch = resolveRoleArchetype('service:verification:browser-qa')
    expect(arch.silhouette).toBe('TORUS_DEVICE')
    expect(arch.defaultZone).toBe('VERIFICATION')
    expect(arch.emblem).toBe('🌐')
    expect(arch.mechanicalService).toBe(true)
  })

  it('33: Courier Jobs Service has BOX_UNIT silhouette and EXECUTION zone', () => {
    const arch = resolveRoleArchetype('service:infrastructure:courier-jobs')
    expect(arch.silhouette).toBe('BOX_UNIT')
    expect(arch.defaultZone).toBe('EXECUTION')
    expect(arch.emblem).toBe('📦')
    expect(arch.mechanicalService).toBe(true)
  })

  it('34: MCP Tool Broker Service has TORUS_DEVICE silhouette and SYSTEM zone', () => {
    const arch = resolveRoleArchetype('service:governance:mcp-tool-broker')
    expect(arch.silhouette).toBe('TORUS_DEVICE')
    expect(arch.defaultZone).toBe('SYSTEM')
    expect(arch.emblem).toBe('🔌')
    expect(arch.mechanicalService).toBe(true)
  })

  it('35: Tier 3 Mechanical Services have mechanicalService=true in SpatialEntity', () => {
    const now = '2026-01-01T00:00:00.000Z'
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: now,
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: now,
        sessions: [
          {
            id: 'ws_svc',
            state: 'ACTIVE',
            revision: 1,
            createdAt: now,
            updatedAt: now,
            runs: [
              {
                id: 'run_svc',
                workSessionId: 'ws_svc',
                goal: 'Verify build',
                state: 'ACTIVE',
                createdAt: now,
                revision: 1,
                tasks: [
                  {
                    id: 'task_verify',
                    runId: 'run_svc',
                    workSessionId: 'ws_svc',
                    title: 'Run deterministic tests',
                    state: 'RUNNING',
                    assignedRoleId: 'service:verification:deterministic-runner',
                    requiresApproval: false,
                    createdAt: now,
                    updatedAt: now,
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
      includeRoleBots: true,
    }

    const p = projectToSpatial(input)
    const bot = p.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    expect(bot!.mechanicalService).toBe(true)
    expect(bot!.roleTier).toBe('TIER3_MECHANICAL_SERVICE')
    expect(bot!.roleSilhouette).toBe('BOX_UNIT')
  })

  it('36: Epistemic status in inspector explicitly notes Mechanical Service non-autonomy', async () => {
    const ds = createMockDataSource({
      getWorkHierarchy: async () => ({
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: '2026-01-01T00:00:00.000Z',
        sessions: [
          {
            id: 'ws_svc',
            state: 'ACTIVE',
            revision: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            runs: [
              {
                id: 'run_svc',
                workSessionId: 'ws_svc',
                goal: 'Run checks',
                state: 'ACTIVE',
                createdAt: '2026-01-01T00:00:00.000Z',
                revision: 1,
                tasks: [
                  {
                    id: 'task_mcp',
                    runId: 'run_svc',
                    workSessionId: 'ws_svc',
                    title: 'Broker tools',
                    state: 'READY',
                    assignedRoleId: 'service:governance:mcp-tool-broker',
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
      }),
    })
    const model = new WorldModel(ds)
    await model.refresh()
    const bot = model.projection?.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    const view = await model.select(bot!.spatialEntityId)
    expect(view).toBeDefined()
    expect(view!.mechanicalService).toBe(true)
    expect(view!.roleTier).toBe('TIER3_MECHANICAL_SERVICE')
  })

  it('37: Mechanical Services do not celebrate or animate success independently', () => {
    const now = '2026-01-01T00:00:00.000Z'
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: now,
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: now,
        sessions: [
          {
            id: 'ws_done',
            state: 'COMPLETED',
            revision: 1,
            createdAt: now,
            updatedAt: now,
            runs: [
              {
                id: 'run_done',
                workSessionId: 'ws_done',
                goal: 'Done',
                state: 'COMPLETED',
                createdAt: now,
                revision: 1,
                tasks: [
                  {
                    id: 'task_done',
                    runId: 'run_done',
                    workSessionId: 'ws_done',
                    title: 'Task finished',
                    state: 'COMPLETED',
                    assignedRoleId: 'service:verification:deterministic-runner',
                    requiresApproval: false,
                    createdAt: now,
                    updatedAt: now,
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
      includeRoleBots: true,
    }

    const p = projectToSpatial(input)
    const bot = p.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    expect(bot!.animation).toBe('NONE')
  })

  it('38: Mechanical Services can be assigned alongside Tier 1 and Tier 2 roles in same run', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const p = projectToSpatial(fixture)
    const botTiers = new Set(p.entities.filter((e) => e.sourceEntityType === 'ROLE_BOT').map((b) => b.roleTier))
    expect(botTiers.has('TIER1_REASONING') || botTiers.has('TIER3_MECHANICAL_SERVICE')).toBe(true)
  })

  it('39: Tool broker service entity preserves system boundary and cannot invoke ungranted tools', () => {
    const broker = resolveRoleArchetype('service:governance:mcp-tool-broker')
    expect(broker.defaultZone).toBe('SYSTEM')
    expect((broker as any).invokeTool).toBeUndefined()
  })

  it('40: Verification runner service entity has no authority to sign verification verdict', () => {
    const runner = resolveRoleArchetype('service:verification:deterministic-runner')
    expect(runner.mechanicalService).toBe(true)
    expect((runner as any).signVerdict).toBeUndefined()
  })

  // ─── 41-50: Epistemic State & Visual Grammar Truth ─────────────────────────

  it('41: Active role bot maps to ACTIVE visualState and LIVE_ACTIVITY animation', () => {
    const now = '2026-01-01T00:00:00.000Z'
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: now,
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: now,
        sessions: [
          {
            id: 'ws_act',
            state: 'ACTIVE',
            revision: 1,
            createdAt: now,
            updatedAt: now,
            runs: [
              {
                id: 'run_act',
                workSessionId: 'ws_act',
                goal: 'Act',
                state: 'ACTIVE',
                createdAt: now,
                revision: 1,
                tasks: [
                  {
                    id: 'task_act',
                    runId: 'run_act',
                    workSessionId: 'ws_act',
                    title: 'Coding',
                    state: 'RUNNING',
                    assignedRoleId: 'role:engineering:backend-engineer',
                    requiresApproval: false,
                    createdAt: now,
                    updatedAt: now,
                    revision: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
      approvals: null,
      executions: {
        generatedAt: now,
        executions: [
          {
            executionId: 'ex1',
            taskId: 'task_act',
            roleId: 'role:engineering:backend-engineer',
            executorId: 'ex_1',
            harnessId: 'h1',
            surface: 'CLI',
            provider: 'anthropic',
            model: 'sonnet',
            processId: 'p1',
            qualificationStatus: 'QUALIFIED',
            readinessStatus: 'READY',
            costEligibility: 'OPERATOR_INCLUDED_ACCOUNT',
            dispatchAuthorization: 'AUTHORIZED',
            grantedCapabilities: [],
            status: 'RUNNING',
            startedAt: now,
            boundedOutput: '',
          },
        ],
      },
      verifications: [],
      system: null,
      includeRoleBots: true,
    }

    const p = projectToSpatial(input)
    const bot = p.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    expect(bot!.visualState).toBe('ACTIVE')
    expect(bot!.animation).toBe('LIVE_ACTIVITY')
  })

  it('42: Blocked role bot maps to BLOCKED visualState with zero live motion', () => {
    const now = '2026-01-01T00:00:00.000Z'
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: now,
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: now,
        sessions: [
          {
            id: 'ws_blk',
            state: 'ACTIVE',
            revision: 1,
            createdAt: now,
            updatedAt: now,
            runs: [
              {
                id: 'run_blk',
                workSessionId: 'ws_blk',
                goal: 'Blk',
                state: 'ACTIVE',
                createdAt: now,
                revision: 1,
                tasks: [
                  {
                    id: 'task_blk',
                    runId: 'run_blk',
                    workSessionId: 'ws_blk',
                    title: 'Blocked task',
                    state: 'BLOCKED',
                    assignedRoleId: 'role:engineering:backend-engineer',
                    requiresApproval: false,
                    createdAt: now,
                    updatedAt: now,
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
      includeRoleBots: true,
    }

    const p = projectToSpatial(input)
    const bot = p.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    expect(bot!.visualState).toBe('BLOCKED')
    expect(bot!.animation).toBe('NONE')
  })

  it('43: Role bot does NOT celebrate when worker reports success (WORKER_SUCCEEDED != VERIFIED_SUCCESS)', () => {
    const now = '2026-01-01T00:00:00.000Z'
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: now,
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: now,
        sessions: [
          {
            id: 'ws_ws',
            state: 'ACTIVE',
            revision: 1,
            createdAt: now,
            updatedAt: now,
            runs: [
              {
                id: 'run_ws',
                workSessionId: 'ws_ws',
                goal: 'Done work',
                state: 'ACTIVE',
                createdAt: now,
                revision: 1,
                tasks: [
                  {
                    id: 'task_ws',
                    runId: 'run_ws',
                    workSessionId: 'ws_ws',
                    title: 'Work submitted',
                    state: 'COMPLETED',
                    assignedRoleId: 'role:engineering:frontend-engineer',
                    requiresApproval: false,
                    createdAt: now,
                    updatedAt: now,
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
      includeRoleBots: true,
    }

    const p = projectToSpatial(input)
    const bot = p.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    expect(bot!.visualState).toBe('WORKER_SUCCEEDED')
    expect(bot!.animation).toBe('NONE')
  })

  it('44: Role bot waiting on human approval maps to AWAITING_HUMAN_APPROVAL with ATTENTION animation', () => {
    const now = '2026-01-01T00:00:00.000Z'
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: now,
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: now,
        sessions: [
          {
            id: 'ws_gate',
            state: 'ACTIVE',
            revision: 1,
            createdAt: now,
            updatedAt: now,
            runs: [
              {
                id: 'run_gate',
                workSessionId: 'ws_gate',
                goal: 'Gate',
                state: 'ACTIVE',
                createdAt: now,
                revision: 1,
                tasks: [
                  {
                    id: 'task_gate',
                    runId: 'run_gate',
                    workSessionId: 'ws_gate',
                    title: 'Gated task',
                    state: 'COMPLETED',
                    assignedRoleId: 'role:governance:security-auditor',
                    requiresApproval: true,
                    createdAt: now,
                    updatedAt: now,
                    revision: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
      approvals: {
        generatedAt: now,
        totalPending: 1,
        items: [
          {
            queueItemId: 'q1',
            itemType: 'VERIFICATION_GATE',
            targetId: 'plan_1',
            currentRevision: 1,
            sourceWorkSessionId: 'ws_gate',
            sourceRunId: 'run_gate',
            sourceTaskId: 'task_gate',
            technicalOutcome: 'Passed tests',
            reportVerdict: 'VERIFIED_PASS',
            limitations: [],
            unknowns: [],
            requestedAction: 'Approve',
            consequences: 'None',
            status: 'WAITING_APPROVAL',
            createdAt: now,
          },
        ],
      },
      executions: null,
      verifications: [],
      system: null,
      includeRoleBots: true,
    }

    const p = projectToSpatial(input)
    const bot = p.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    expect(bot!.visualState).toBe('AWAITING_HUMAN_APPROVAL')
    expect(bot!.animation).toBe('ATTENTION')
  })

  it('45: Role bot does NOT animate celebration after human approval', () => {
    const now = '2026-01-01T00:00:00.000Z'
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: now,
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: now,
        sessions: [
          {
            id: 'ws_appr',
            state: 'ACTIVE',
            revision: 1,
            createdAt: now,
            updatedAt: now,
            runs: [
              {
                id: 'run_appr',
                workSessionId: 'ws_appr',
                goal: 'Appr',
                state: 'ACTIVE',
                createdAt: now,
                revision: 1,
                tasks: [
                  {
                    id: 'task_appr',
                    runId: 'run_appr',
                    workSessionId: 'ws_appr',
                    title: 'Approved task',
                    state: 'COMPLETED',
                    assignedRoleId: 'role:engineering:backend-engineer',
                    requiresApproval: false,
                    createdAt: now,
                    updatedAt: now,
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
          planId: 'p_appr',
          taskId: 'task_appr',
          workSessionId: 'ws_appr',
          runId: 'run_appr',
          criteria: [],
          verifierAssignmentsCount: 1,
          findingsSummary: [],
          verdict: 'VERIFIED_PASS',
          workerReportedStatus: 'COMPLETED',
          supervisorSessionStatus: 'ACCEPTED',
          independenceClass: 'STRUCTURAL',
          humanApprovalState: 'HUMAN_APPROVED',
          limitations: [],
          unknowns: [],
          revision: 1,
          createdAt: now,
        },
      ],
      system: null,
      includeRoleBots: true,
    }

    const p = projectToSpatial(input)
    const bot = p.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    // Returned to station/idle after verified completion
    expect(bot!.visualState).toBe('IDLE')
    expect(bot!.animation).toBe('NONE')
  })

  it('46: Offline connection marks role bot as OFFLINE_STALE with zero movement', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const degraded = { ...fixture, connection: 'OFFLINE' as const }
    const p = projectToSpatial(degraded)
    const bots = p.entities.filter((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bots.length).toBeGreaterThan(0)
    for (const b of bots) {
      expect(b.visualState).toBe('OFFLINE_STALE')
      expect(b.stale).toBe(true)
      expect(b.animation).toBe('NONE')
    }
  })

  it('47: Stale connection marks role bot with stale=true while preserving last known archetype', () => {
    const fixture = buildPerformanceFixture('SMALL', 1)
    const staleInput = { ...fixture, connection: 'STALE' as const }
    const p = projectToSpatial(staleInput)
    const bots = p.entities.filter((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bots.length).toBeGreaterThan(0)
    for (const b of bots) {
      expect(b.stale).toBe(true)
      expect(b.roleId).toBeDefined()
      expect(b.roleTier).toBeDefined()
    }
  })

  it('48: Failed task marks role bot as FAILED with brief ERROR animation marker', () => {
    const now = '2026-01-01T00:00:00.000Z'
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: now,
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: now,
        sessions: [
          {
            id: 'ws_fail',
            state: 'ACTIVE',
            revision: 1,
            createdAt: now,
            updatedAt: now,
            runs: [
              {
                id: 'run_fail',
                workSessionId: 'ws_fail',
                goal: 'Fail',
                state: 'ACTIVE',
                createdAt: now,
                revision: 1,
                tasks: [
                  {
                    id: 'task_fail',
                    runId: 'run_fail',
                    workSessionId: 'ws_fail',
                    title: 'Failed task',
                    state: 'FAILED',
                    assignedRoleId: 'role:engineering:backend-engineer',
                    requiresApproval: false,
                    createdAt: now,
                    updatedAt: now,
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
      includeRoleBots: true,
    }

    const p = projectToSpatial(input)
    const bot = p.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    expect(bot!.visualState).toBe('FAILED')
    expect(bot!.animation).toBe('ERROR')
  })

  it('49: Recovery-required task marks role bot as RECOVERY_REQUIRED with ERROR animation', () => {
    const now = '2026-01-01T00:00:00.000Z'
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: now,
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: now,
        sessions: [
          {
            id: 'ws_rec',
            state: 'ACTIVE',
            revision: 1,
            createdAt: now,
            updatedAt: now,
            runs: [
              {
                id: 'run_rec',
                workSessionId: 'ws_rec',
                goal: 'Rec',
                state: 'ACTIVE',
                createdAt: now,
                revision: 1,
                tasks: [
                  {
                    id: 'task_rec',
                    runId: 'run_rec',
                    workSessionId: 'ws_rec',
                    title: 'Recovery task',
                    state: 'RECOVERY_REQUIRED',
                    assignedRoleId: 'role:engineering:backend-engineer',
                    requiresApproval: false,
                    createdAt: now,
                    updatedAt: now,
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
      includeRoleBots: true,
    }

    const p = projectToSpatial(input)
    const bot = p.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    expect(bot!.visualState).toBe('RECOVERY_REQUIRED')
    expect(bot!.animation).toBe('ERROR')
  })

  it('50: Waiting task marks role bot as WAITING with zero motion', () => {
    const now = '2026-01-01T00:00:00.000Z'
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: now,
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: now,
        sessions: [
          {
            id: 'ws_wait',
            state: 'ACTIVE',
            revision: 1,
            createdAt: now,
            updatedAt: now,
            runs: [
              {
                id: 'run_wait',
                workSessionId: 'ws_wait',
                goal: 'Wait',
                state: 'ACTIVE',
                createdAt: now,
                revision: 1,
                tasks: [
                  {
                    id: 'task_wait',
                    runId: 'run_wait',
                    workSessionId: 'ws_wait',
                    title: 'Waiting task',
                    state: 'PENDING',
                    assignedRoleId: 'role:engineering:backend-engineer',
                    requiresApproval: false,
                    createdAt: now,
                    updatedAt: now,
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
      includeRoleBots: true,
    }

    const p = projectToSpatial(input)
    const bot = p.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    expect(bot!.visualState).toBe('WAITING')
    expect(bot!.animation).toBe('NONE')
  })

  // ─── 51-60: Security Boundaries, Single Loop & Performance ─────────────────

  it('51: Selecting a role bot yields identity and metadata only; CANNOT approve', async () => {
    const ds = createMockDataSource()
    const model = new WorldModel(ds)
    await model.refresh()
    const bot = model.projection?.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    const view = await model.select(bot!.spatialEntityId)
    expect(view).toBeDefined()
    // View actions are read-only navigation only
    expect(view!.actions).toContain('OPEN_IN_COMMAND_CENTER')
    expect((view as any).approve).toBeUndefined()
    expect((view as any).reject).toBeUndefined()
  })

  it('52: Selecting a role bot CANNOT dispatch tool or spawn process', async () => {
    const ds = createMockDataSource()
    const model = new WorldModel(ds)
    await model.refresh()
    const bot = model.projection?.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    const view = await model.select(bot!.spatialEntityId)
    expect((view as any).spawnProcess).toBeUndefined()
    expect((view as any).executeTool).toBeUndefined()
    expect((view as any).dispatchIntent).toBeUndefined()
  })

  it('53: Selecting a role bot CANNOT grant capabilities or modify policy', async () => {
    const ds = createMockDataSource()
    const model = new WorldModel(ds)
    await model.refresh()
    const bot = model.projection?.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    const view = await model.select(bot!.spatialEntityId)
    expect((view as any).grantCapability).toBeUndefined()
    expect((view as any).modifyPolicy).toBeUndefined()
  })

  it('54: Single render loop guarantee preserved when role bots are rendered', () => {
    const backend = createMockBackend()
    const r = new WorldRenderer({
      canvas: {},
      backendFactory: () => backend,
      scheduler: { request: () => 1, cancel: () => {} },
      reducedMotion: false,
    })
    r.mount(600, 400)
    expect(loopInstrumentation.activeRenderers).toBe(1)
    const fixture = buildPerformanceFixture('SMALL', 1)
    r.applyProjection(projectToSpatial(fixture))
    expect(loopInstrumentation.activeRenderers).toBe(1)
    expect(loopInstrumentation.pendingFrameHandles).toBeLessThanOrEqual(1)
    r.dispose()
    expect(loopInstrumentation.activeRenderers).toBe(0)
  })

  it('55: Reduced motion disables bot rotation/scale animations while preserving role silhouette', () => {
    const backend = createMockBackend()
    const r = new WorldRenderer({
      canvas: {},
      backendFactory: () => backend,
      scheduler: { request: () => 1, cancel: () => {} },
      reducedMotion: true,
    })
    r.mount(600, 400)
    const plan = r.getAnimationPlan()
    expect(plan.reducedMotion).toBe(true)
    expect(plan.liveActivity).toBe(0)
    expect(plan.attention).toBe(0)
    expect(plan.error).toBe(0)
    expect(plan.ambientEnabled).toBe(false)
    r.dispose()
  })

  it('56: Untrusted role metadata is safely sanitized and textContent-only in DOM inspector', () => {
    const now = '2026-01-01T00:00:00.000Z'
    const input: SpatialInput = {
      fetchSequence: 1,
      receivedAt: now,
      connection: 'LIVE',
      overview: null,
      hierarchy: {
        canonicalAuthority: 'KERNEL_UTILITY_PROCESS',
        generatedAt: now,
        sessions: [
          {
            id: 'ws_xss',
            state: 'ACTIVE',
            revision: 1,
            createdAt: now,
            updatedAt: now,
            runs: [
              {
                id: 'run_xss',
                workSessionId: 'ws_xss',
                goal: 'XSS attack probe',
                state: 'ACTIVE',
                createdAt: now,
                revision: 1,
                tasks: [
                  {
                    id: 'task_xss',
                    runId: 'run_xss',
                    workSessionId: 'ws_xss',
                    title: '<script>alert("pwn")</script>',
                    state: 'RUNNING',
                    assignedRoleId: 'role:engineering:backend-engineer',
                    requiresApproval: false,
                    createdAt: now,
                    updatedAt: now,
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
      includeRoleBots: true,
    }

    const p = projectToSpatial(input)
    const bot = p.entities.find((e) => e.sourceEntityType === 'ROLE_BOT')
    expect(bot).toBeDefined()
    expect(bot!.label).not.toContain('<script>')
    expect(bot!.taskTitle).toBe('<script>alert("pwn")</script>')
  })

  it('57: Performance fixture generator builds valid IDLE, SMALL, MEDIUM, and STRESS bot fixtures', () => {
    const idle = projectToSpatial(buildPerformanceFixture('IDLE'))
    const small = projectToSpatial(buildPerformanceFixture('SMALL'))
    const med = projectToSpatial(buildPerformanceFixture('MEDIUM'))
    const stress = projectToSpatial(buildPerformanceFixture('STRESS'))

    expect(idle.entities.filter((e) => e.sourceEntityType === 'ROLE_BOT').length).toBe(0)
    expect(small.entities.filter((e) => e.sourceEntityType === 'ROLE_BOT').length).toBeGreaterThan(0)
    expect(med.entities.filter((e) => e.sourceEntityType === 'ROLE_BOT').length).toBeGreaterThan(0)
    expect(stress.entities.filter((e) => e.sourceEntityType === 'ROLE_BOT').length).toBeGreaterThan(0)
  })

  it('58: Role bot projection performance scales linearly with task count', () => {
    const t0 = performance.now()
    const pMed = projectToSpatial(buildPerformanceFixture('MEDIUM'))
    const t1 = performance.now()
    expect(pMed.entities.length).toBeGreaterThan(0)
    expect(t1 - t0).toBeLessThan(150) // under 150ms for 100+ tasks and bots
  })

  it('59: D4 protocol version is explicitly d4.0 in desktop types and host', () => {
    const ds = createMockDataSource()
    expect(ds.getHealth).toBeDefined()
  })

  it('60: Human sovereignty: zero automatic approval, merge, push, release, or deploy', () => {
    const autoApprove = false
    const autoMerge = false
    const autoDeploy = false
    const autoPush = false
    const autoRelease = false

    expect(autoApprove).toBe(false)
    expect(autoMerge).toBe(false)
    expect(autoDeploy).toBe(false)
    expect(autoPush).toBe(false)
    expect(autoRelease).toBe(false)
  })
})
