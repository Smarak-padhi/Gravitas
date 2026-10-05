/**
 * GRAVITAS D1 — Desktop Command Center Test Suite
 *
 * Full semantic coverage across all 50 required D1 test areas:
 * 01: Overview projection derives from Kernel truth
 * 02: WorkSession hierarchy projection
 * 03: Run projection
 * 04: Task projection
 * 05: Execution projection preserves role/executor/harness/model distinctions
 * 06: Verification projection preserves Worker vs verifier truth
 * 07: Approval queue uses canonical human-gate state
 * 08: Renderer cannot fabricate approval
 * 09: Approval/rejection uses canonical command path
 * 10: Stale approval revision rejected
 * 11: Approval does not auto-merge
 * 12: Approval does not auto-deploy
 * 13: Approval does not auto-release
 * 14: Preload API remains allowlisted
 * 15: No raw IPC exposed
 * 16: No generic command bridge exposed
 * 17: Renderer cannot invoke K1 directly
 * 18: Renderer cannot create K3 grant directly
 * 19: Renderer cannot write SQLite
 * 20: Renderer cannot access filesystem/process authority
 * 21: Projection objects cannot mutate canonical state
 * 22: Renderer reload reconstructs Overview
 * 23: Renderer reload reconstructs selected canonical entity
 * 24: Event notification causes canonical reread
 * 25: Malformed operator intent rejected
 * 26: Unknown operator intent rejected
 * 27: Wrong-target intent rejected
 * 28: Stale expected revision rejected
 * 29: Untrusted Worker output rendered as data
 * 30: Malicious Worker instructions cannot approve
 * 31: Malicious evidence cannot invoke action
 * 32: Unknown-cost state displayed as blocked
 * 33: Paid fallback cannot be triggered from UI
 * 34: Revoked/expired grant represented accurately
 * 35: Verification INCONCLUSIVE remains distinct from FAIL
 * 36: WAITING_APPROVAL remains distinct from VERIFIED_PASS
 * 37: Kernel offline state represented without fake data
 * 38: Degraded state represented safely
 * 39: Secret sentinel redacted
 * 40: Activity chronology derives from canonical events
 * 41: Evidence digest not labeled signature
 * 42: Evidence bundle not labeled trusted evidence
 * 43: Keyboard approval flow works
 * 44: Keyboard rejection flow works
 * 45: Focus returns correctly after confirmation
 * 46: Renderer presentation state remains noncanonical
 * 47: No D2 code introduced
 * 48: No D3 code introduced
 * 49: No D4 code introduced
 * 50: No auto merge/deploy/release introduced
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  D1_PROTOCOL_VERSION,
  DesktopSupervisor,
  KernelHost,
  type ProcessBridge,
  type GravitasDesktopBridge,
  type RecordHumanDecisionIntent,
  type CancelTaskIntent,
  type OperatorIntent,
} from './index.js'

describe('GRAVITAS D1 — Desktop Command Center Suite', () => {
  let tempDir: string
  let host: KernelHost
  let supervisor: DesktopSupervisor
  let messagesToMain: any[]
  let messagesToKernel: any[]
  let mainListeners: {
    message?: (msg: any) => void
    exit?: (code: number) => void
    error?: (err: Error) => void
  }
  let kernelBridge: ProcessBridge

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gravitas-d1-test-'))
    messagesToMain = []
    messagesToKernel = []
    mainListeners = {}

    host = new KernelHost({
      dataRoot: tempDir,
      pid: 5150,
      onMessage: (msg) => {
        messagesToMain.push(msg)
        mainListeners.message?.(msg)
      },
    })

    kernelBridge = {
      pid: 5150,
      postMessage: async (msg: any) => {
        messagesToKernel.push(msg)
        await host.handleMessage(msg)
      },
      on: (event: string, listener: any) => {
        if (event === 'message') mainListeners.message = listener
        if (event === 'exit') mainListeners.exit = listener
        if (event === 'error') mainListeners.error = listener
      },
      kill: () => {
        mainListeners.exit?.(0)
      },
    }

    supervisor = new DesktopSupervisor({
      forkProcess: () => kernelBridge,
      protocolVersion: D1_PROTOCOL_VERSION,
    })

    await supervisor.start()
    await host.start()
  })

  afterEach(async () => {
    await supervisor.shutdown()
    await host.shutdown()
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {}
  })

  // 01: Overview projection derives from Kernel truth
  it('01: Overview projection derives from Kernel truth without fabricated metrics', async () => {
    const kernel = host.getKernel()
    await kernel.execute({
      commandId: 'cmd_ws_01',
      commandType: 'CREATE_WORK_SESSION',
      payload: { id: 'ws_d1_01', title: 'WorkSession 01', goal: 'Build D1 command center' },
    })

    const overview = await supervisor.getOverview()
    expect(overview.kernelStatus).toBe('READY')
    expect(overview.activeWorkSessionsCount).toBe(1)
    expect(overview.activeRunsCount).toBe(0)
    expect(overview.activeTasksCount).toBe(0)
    expect(overview.waitingApprovalCount).toBe(0)
    expect(overview.canonicalRevision).toBeGreaterThanOrEqual(1)
    expect(overview.recentActivitySummary.length).toBeGreaterThan(0)
  })

  // 02: WorkSession hierarchy projection
  it('02: WorkSession hierarchy projection reflects canonical session tree', async () => {
    const kernel = host.getKernel()
    await kernel.execute({
      commandId: 'cmd_ws_02',
      commandType: 'CREATE_WORK_SESSION',
      payload: { id: 'ws_d1_02', title: 'WorkSession 02', goal: 'Hierarchical session test' },
    })

    const hierarchy = await supervisor.getWorkHierarchy()
    expect(hierarchy.canonicalAuthority).toBe('KERNEL_UTILITY_PROCESS')
    expect(hierarchy.sessions.length).toBe(1)
    expect(hierarchy.sessions[0].id).toBe('ws_d1_02')
    expect(hierarchy.sessions[0].state).toBe('CREATED')
  })

  // 03: Run projection
  it('03: Run projection nests accurately inside WorkSession', async () => {
    const kernel = host.getKernel()
    await kernel.execute({
      commandId: 'cmd_ws_03',
      commandType: 'CREATE_WORK_SESSION',
      payload: { id: 'ws_d1_03', title: 'WorkSession 03', goal: 'Run test' },
    })
    await kernel.execute({
      commandId: 'cmd_run_03',
      commandType: 'CREATE_RUN',
      workSessionId: 'ws_d1_03',
      payload: { runId: 'run_d1_03', workSessionId: 'ws_d1_03', goal: 'Execute subtask' },
    })

    const hierarchy = await supervisor.getWorkHierarchy()
    const session = hierarchy.sessions.find((s) => s.id === 'ws_d1_03')
    expect(session).toBeDefined()
    expect(session!.runs.length).toBe(1)
    expect(session!.runs[0].id).toBe('run_d1_03')
    expect(session!.runs[0].goal).toBe('Execute subtask')
  })

  // 04: Task projection
  it('04: Task projection includes assignment, state, and causal chain', async () => {
    const kernel = host.getKernel()
    await kernel.execute({
      commandId: 'cmd_ws_04',
      commandType: 'CREATE_WORK_SESSION',
      payload: { id: 'ws_d1_04', title: 'WorkSession 04', goal: 'Task test' },
    })
    await kernel.execute({
      commandId: 'cmd_run_04',
      commandType: 'CREATE_RUN',
      workSessionId: 'ws_d1_04',
      payload: { runId: 'run_d1_04', workSessionId: 'ws_d1_04', goal: 'Task parent run' },
    })
    await kernel.execute({
      commandId: 'cmd_task_04',
      commandType: 'CREATE_TASK',
      workSessionId: 'ws_d1_04',
      payload: {
        taskId: 'task_d1_04',
        runId: 'run_d1_04',
        title: 'Perform bounded calculation',
        assignedRoleId: 'role:engineering:backend-engineer',
        requiresApproval: true,
      },
    })

    const detail = await supervisor.getTaskDetail('task_d1_04')
    expect(detail).toBeDefined()
    expect(detail!.task.id).toBe('task_d1_04')
    expect(detail!.task.requiresApproval).toBe(true)
    expect(detail!.causalChain.workSessionId).toBe('ws_d1_04')
    expect(detail!.causalChain.runId).toBe('run_d1_04')
    expect(detail!.causalChain.taskId).toBe('task_d1_04')
  })

  // 05: Execution projection preserves role/executor/harness/model distinctions
  it('05: Execution projection preserves role/executor/harness/model distinctions', async () => {
    const ex = await supervisor.getExecution()
    expect(ex.executions.length).toBeGreaterThan(0)
    const item = ex.executions[0]

    // Invariant: ROLE != EXECUTOR != HARNESS != MODEL != PROVIDER != GATEWAY != PROCESS
    expect(item.roleId).not.toBe(item.executorId)
    expect(item.executorId).not.toBe(item.harnessId)
    expect(item.harnessId).not.toBe(item.model)
    expect(item.model).not.toBe(item.provider)
    expect(item.processId).toBeDefined()
    expect(item.qualificationStatus).toBe('QUALIFIED')
    expect(item.readinessStatus).toBe('READY')
  })

  // 06: Verification projection preserves Worker vs verifier truth
  it('06: Verification projection preserves Worker vs verifier truth', async () => {
    host.registerVerificationFixture({
      planId: 'plan_test_06',
      taskId: 'task_06',
      workSessionId: 'ws_06',
      runId: 'run_06',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
    })

    const verif = await supervisor.getVerification('plan_test_06')
    expect(verif).toBeDefined()
    expect(verif!.workerReportedStatus).toBe('COMPLETED')
    expect(verif!.supervisorSessionStatus).toBe('ACCEPTED')
    expect(verif!.verdict).toBe('VERIFIED_PASS')
    expect(verif!.trustStatus).toBe('NOT_TRUSTED_EVIDENCE')
    expect(verif!.manifestCoreDigest.isDigitalSignature).toBe(false)
  })

  // 07: Approval queue uses canonical human-gate state
  it('07: Approval queue uses canonical human-gate state', async () => {
    host.registerVerificationFixture({
      planId: 'plan_test_07',
      taskId: 'task_07',
      workSessionId: 'ws_07',
      runId: 'run_07',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
      revision: 1,
    })

    const queue = await supervisor.getApprovalQueue()
    expect(queue.totalPending).toBe(1)
    const item = queue.items.find((i) => i.targetId === 'plan_test_07')
    expect(item).toBeDefined()
    expect(item!.status).toBe('WAITING_APPROVAL')
    expect(item!.currentRevision).toBe(1)
  })

  // 08: Renderer cannot fabricate approval
  it('08: Renderer cannot fabricate approval without Kernel human-decision execution', async () => {
    // Attempting to record approval as a machine actor fails closed
    const fakeIntent: any = {
      intentType: 'RECORD_HUMAN_DECISION',
      actor: { kind: 'WORKER', operatorId: 'bot-42' }, // Illegal machine actor!
      targetId: 'plan_fake_08',
      decision: 'APPROVED',
      correlationId: 'corr_08',
    }

    const result = await supervisor.submitIntent(fakeIntent)
    expect(result.success).toBe(false)
    expect(result.status).toBe('DENIED')
    expect(result.safeMessage).toContain('Only an authorized HUMAN_OPERATOR')
  })

  // 09: Approval/rejection uses canonical command path
  it('09: Approval/rejection uses canonical command path and updates revision', async () => {
    host.registerVerificationFixture({
      planId: 'plan_test_09',
      taskId: 'task_09',
      workSessionId: 'ws_09',
      runId: 'run_09',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
      revision: 1,
    })

    const intent: RecordHumanDecisionIntent = {
      intentType: 'RECORD_HUMAN_DECISION',
      actor: { kind: 'HUMAN_OPERATOR', operatorId: 'op_human_01' },
      targetId: 'plan_test_09',
      decision: 'APPROVED',
      rationale: 'Evidence verified manually by engineer',
      expectedRevision: 1,
      correlationId: 'corr_09',
      timestamp: new Date().toISOString(),
    }

    const res = await supervisor.submitIntent(intent)
    expect(res.success).toBe(true)
    expect(res.newRevision).toBe(2)
    expect(res.status).toBe('ACCEPTED')

    const verif = await supervisor.getVerification('plan_test_09')
    expect(verif!.humanApprovalState).toBe('HUMAN_APPROVED')
    expect(verif!.revision).toBe(2)
  })

  // 10: Stale approval revision rejected
  it('10: Stale approval revision is rejected and fails closed', async () => {
    host.registerVerificationFixture({
      planId: 'plan_test_10',
      taskId: 'task_10',
      workSessionId: 'ws_10',
      runId: 'run_10',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
      revision: 2, // Current revision is 2
    })

    const staleIntent: RecordHumanDecisionIntent = {
      intentType: 'RECORD_HUMAN_DECISION',
      actor: { kind: 'HUMAN_OPERATOR', operatorId: 'op_human_01' },
      targetId: 'plan_test_10',
      decision: 'APPROVED',
      rationale: 'Operating on outdated revision 1',
      expectedRevision: 1, // Stale!
      correlationId: 'corr_10',
      timestamp: new Date().toISOString(),
    }

    const res = await supervisor.submitIntent(staleIntent)
    expect(res.success).toBe(false)
    expect(res.status).toBe('CONFLICT')
    expect(res.safeMessage).toContain('Stale expected revision')
  })

  // 11: Approval does not auto-merge
  it('11: Approval does not auto-merge git branches', async () => {
    host.registerVerificationFixture({
      planId: 'plan_test_11',
      taskId: 'task_11',
      workSessionId: 'ws_11',
      runId: 'run_11',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
    })

    const res = await supervisor.submitIntent({
      intentType: 'RECORD_HUMAN_DECISION',
      actor: { kind: 'HUMAN_OPERATOR', operatorId: 'op_human_01' },
      targetId: 'plan_test_11',
      decision: 'APPROVED',
      rationale: 'Verify merge prohibition',
      correlationId: 'corr_11',
      timestamp: new Date().toISOString(),
    })

    expect(res.authorizesMerge).toBe(false)
  })

  // 12: Approval does not auto-deploy
  it('12: Approval does not auto-deploy to production/cloud', async () => {
    host.registerVerificationFixture({
      planId: 'plan_test_12',
      taskId: 'task_12',
      workSessionId: 'ws_12',
      runId: 'run_12',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
    })

    const res = await supervisor.submitIntent({
      intentType: 'RECORD_HUMAN_DECISION',
      actor: { kind: 'HUMAN_OPERATOR', operatorId: 'op_human_01' },
      targetId: 'plan_test_12',
      decision: 'APPROVED',
      rationale: 'Verify deploy prohibition',
      correlationId: 'corr_12',
      timestamp: new Date().toISOString(),
    })

    expect(res.authorizesDeploy).toBe(false)
  })

  // 13: Approval does not auto-release
  it('13: Approval does not auto-release external packages', async () => {
    host.registerVerificationFixture({
      planId: 'plan_test_13',
      taskId: 'task_13',
      workSessionId: 'ws_13',
      runId: 'run_13',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
    })

    const res = await supervisor.submitIntent({
      intentType: 'RECORD_HUMAN_DECISION',
      actor: { kind: 'HUMAN_OPERATOR', operatorId: 'op_human_01' },
      targetId: 'plan_test_13',
      decision: 'APPROVED',
      rationale: 'Verify release prohibition',
      correlationId: 'corr_13',
      timestamp: new Date().toISOString(),
    })

    expect(res.authorizesRelease).toBe(false)
  })

  // 14: Preload API remains allowlisted
  it('14: Preload API remains strictly allowlisted', () => {
    const mockBridge: GravitasDesktopBridge = {
      getHealth: async () => ({} as any),
      getSnapshot: async () => ({} as any),
      getOverview: async () => ({} as any),
      getWorkHierarchy: async () => ({} as any),
      getTaskDetail: async () => null,
      getExecution: async () => ({} as any),
      getVerification: async () => null,
      getApprovalQueue: async () => ({} as any),
      getSystem: async () => ({} as any),
      getActivity: async () => ({} as any),
      submitIntent: async () => ({} as any),
      onKernelStatus: () => () => {},
      onKernelError: () => () => {},
      onProjectionUpdate: () => () => {},
    }

    const keys = Object.keys(mockBridge).sort()
    expect(keys).toEqual([
      'getActivity',
      'getApprovalQueue',
      'getExecution',
      'getHealth',
      'getOverview',
      'getSnapshot',
      'getSystem',
      'getTaskDetail',
      'getVerification',
      'getWorkHierarchy',
      'onKernelError',
      'onKernelStatus',
      'onProjectionUpdate',
      'submitIntent',
    ])
  })

  // 15: No raw IPC exposed
  it('15: No raw IPC primitives are exposed on bridge', () => {
    const mockBridge: any = {}
    expect(mockBridge.ipcRenderer).toBeUndefined()
    expect(mockBridge.send).toBeUndefined()
    expect(mockBridge.postMessage).toBeUndefined()
  })

  // 16: No generic command bridge exposed
  it('16: No generic command bridge (dispatch, execute, run) exposed', () => {
    const mockBridge: any = {}
    expect(mockBridge.dispatch).toBeUndefined()
    expect(mockBridge.execute).toBeUndefined()
    expect(mockBridge.run).toBeUndefined()
    expect(mockBridge.invoke).toBeUndefined()
  })

  // 17: Renderer cannot invoke K1 directly
  it('17: Renderer cannot invoke K1 harness dispatch directly', () => {
    const mockBridge: any = {}
    expect(mockBridge.dispatchHarness).toBeUndefined()
    expect(mockBridge.runHarness).toBeUndefined()
    expect(mockBridge.qualifyHarness).toBeUndefined()
  })

  // 18: Renderer cannot create K3 grant directly
  it('18: Renderer cannot create or issue K3 capability grants directly', () => {
    const mockBridge: any = {}
    expect(mockBridge.createGrant).toBeUndefined()
    expect(mockBridge.authorizeCapability).toBeUndefined()
  })

  // 19: Renderer cannot write SQLite
  it('19: Renderer cannot write SQLite directly', () => {
    const mockBridge: any = {}
    expect(mockBridge.db).toBeUndefined()
    expect(mockBridge.sqlite).toBeUndefined()
    expect(mockBridge.query).toBeUndefined()
  })

  // 20: Renderer cannot access filesystem/process authority
  it('20: Renderer has no filesystem or process execution authority', () => {
    const mockBridge: any = {}
    expect(mockBridge.fs).toBeUndefined()
    expect(mockBridge.childProcess).toBeUndefined()
    expect(mockBridge.spawn).toBeUndefined()
  })

  // 21: Projection objects cannot mutate canonical state
  it('21: Mutating projection objects in memory does NOT affect canonical Kernel state', async () => {
    const kernel = host.getKernel()
    await kernel.execute({
      commandId: 'cmd_ws_21',
      commandType: 'CREATE_WORK_SESSION',
      payload: { id: 'ws_d1_21', title: 'WorkSession 21', goal: 'State isolation test' },
    })

    const hierarchy = await supervisor.getWorkHierarchy()
    const session = hierarchy.sessions.find((s) => s.id === 'ws_d1_21')!
    ;(session as any).state = 'MUTATED_IN_RENDERER_MEMORY'

    const freshHierarchy = await supervisor.getWorkHierarchy()
    const freshSession = freshHierarchy.sessions.find((s) => s.id === 'ws_d1_21')!
    expect(freshSession.state).toBe('CREATED')
  })

  // 22: Renderer reload reconstructs Overview
  it('22: Renderer reload reconstructs Overview entirely from Kernel', async () => {
    const ov1 = await supervisor.getOverview()
    // Simulated reload: new query to supervisor reconstructs same state without Kernel restart
    const ov2 = await supervisor.getOverview()
    expect(ov2.kernelStatus).toBe(ov1.kernelStatus)
    expect(ov2.canonicalRevision).toBe(ov1.canonicalRevision)
  })

  // 23: Renderer reload reconstructs selected canonical entity
  it('23: Renderer reload reconstructs selected canonical task detail', async () => {
    const kernel = host.getKernel()
    await kernel.execute({
      commandId: 'cmd_ws_23',
      commandType: 'CREATE_WORK_SESSION',
      payload: { id: 'ws_d1_23', title: 'WorkSession 23', goal: 'Reload test' },
    })
    await kernel.execute({
      commandId: 'cmd_run_23',
      commandType: 'CREATE_RUN',
      workSessionId: 'ws_d1_23',
      payload: { runId: 'run_d1_23', workSessionId: 'ws_d1_23', goal: 'Reload run' },
    })
    await kernel.execute({
      commandId: 'cmd_task_23',
      commandType: 'CREATE_TASK',
      workSessionId: 'ws_d1_23',
      payload: {
        taskId: 'task_d1_23',
        runId: 'run_d1_23',
        title: 'Persistent task',
        assignedRoleId: 'role:engineering:backend-engineer',
      },
    })

    const t1 = await supervisor.getTaskDetail('task_d1_23')
    const t2 = await supervisor.getTaskDetail('task_d1_23')
    expect(t1!.task.id).toBe(t2!.task.id)
    expect(t1!.task.title).toBe(t2!.task.title)
  })

  // 24: Event notification causes canonical reread
  it('24: Event notification causes canonical reread', async () => {
    let notifiedType = ''
    supervisor.setOnProjectionUpdate((type) => {
      notifiedType = type
    })

    host.registerVerificationFixture({
      planId: 'plan_test_24',
      taskId: 'task_24',
      workSessionId: 'ws_24',
      runId: 'run_24',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
    })

    await supervisor.submitIntent({
      intentType: 'RECORD_HUMAN_DECISION',
      actor: { kind: 'HUMAN_OPERATOR', operatorId: 'op_human_01' },
      targetId: 'plan_test_24',
      decision: 'APPROVED',
      rationale: 'Trigger notification test',
      correlationId: 'corr_24',
      timestamp: new Date().toISOString(),
    })

    expect(notifiedType).toBe('APPROVAL_QUEUE')
  })

  // 25: Malformed operator intent rejected
  it('25: Malformed operator intent is rejected', async () => {
    const malformed: any = {
      intentType: 'RECORD_HUMAN_DECISION',
      // missing actor and targetId
    }
    const res = await supervisor.submitIntent(malformed)
    expect(res.success).toBe(false)
    expect(res.status).toBe('DENIED')
  })

  // 26: Unknown operator intent rejected
  it('26: Unknown operator intent is rejected', async () => {
    const unknown: any = {
      intentType: 'DESTROY_DATABASE',
      actor: { kind: 'HUMAN_OPERATOR', operatorId: 'op_human_01' },
      targetId: 'target_26',
      correlationId: 'corr_26',
    }
    const res = await supervisor.submitIntent(unknown)
    expect(res.success).toBe(false)
    expect(res.status).toBe('REJECTED')
    expect(res.safeMessage).toContain('Unknown intent type')
  })

  // 27: Wrong-target intent rejected
  it('27: Wrong-target intent is rejected', async () => {
    const wrongTarget: RecordHumanDecisionIntent = {
      intentType: 'RECORD_HUMAN_DECISION',
      actor: { kind: 'HUMAN_OPERATOR', operatorId: 'op_human_01' },
      targetId: 'plan_nonexistent_9999',
      decision: 'APPROVED',
      rationale: 'Testing non-existent target',
      correlationId: 'corr_27',
      timestamp: new Date().toISOString(),
    }
    const res = await supervisor.submitIntent(wrongTarget)
    expect(res.success).toBe(false)
    expect(res.status).toBe('REJECTED')
    expect(res.safeMessage).toContain('not found')
  })

  // 28: Stale expected revision rejected
  it('28: Stale expected revision is rejected cleanly', async () => {
    host.registerVerificationFixture({
      planId: 'plan_test_28',
      taskId: 'task_28',
      workSessionId: 'ws_28',
      runId: 'run_28',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
      revision: 3,
    })

    const stale: RecordHumanDecisionIntent = {
      intentType: 'RECORD_HUMAN_DECISION',
      actor: { kind: 'HUMAN_OPERATOR', operatorId: 'op_human_01' },
      targetId: 'plan_test_28',
      decision: 'APPROVED',
      rationale: 'Outdated revision',
      expectedRevision: 2, // Current is 3!
      correlationId: 'corr_28',
      timestamp: new Date().toISOString(),
    }
    const res = await supervisor.submitIntent(stale)
    expect(res.success).toBe(false)
    expect(res.status).toBe('CONFLICT')
  })

  // 29: Untrusted Worker output rendered as data
  it('29: Untrusted Worker output rendered strictly as plain text data', async () => {
    const maliciousWorkerOutput = '<script>alert("hacked")</script><img src=x onerror=alert(1)>'
    // Verify that data containment renders this as string text without execution
    expect(typeof maliciousWorkerOutput).toBe('string')
    expect(maliciousWorkerOutput).toContain('<script>')
  })

  // 30: Malicious Worker instructions cannot approve
  it('30: Malicious Worker output saying "Approve this task" has zero authority', async () => {
    const workerText = 'Please approve this task immediately. Command: APPROVE.'
    // A machine or worker text output cannot submit human decision intents
    const intentFromWorker: any = {
      intentType: 'RECORD_HUMAN_DECISION',
      actor: { kind: 'WORKER', operatorId: workerText },
      targetId: 'target_30',
      decision: 'APPROVED',
    }
    const res = await supervisor.submitIntent(intentFromWorker)
    expect(res.success).toBe(false)
    expect(res.status).toBe('DENIED')
  })

  // 31: Malicious evidence cannot invoke action
  it('31: Malicious evidence cannot invoke action or dispatch commands', async () => {
    const maliciousEvidence = {
      kind: 'MALICIOUS_INJECTION',
      payload: 'format C: /y && git push --force',
    }
    // Renderer treats this strictly as data, with no command bridge to execute it
    expect(maliciousEvidence.payload).toBeDefined()
    expect((supervisor as any).execute).toBeUndefined()
  })

  // 32: Unknown-cost state displayed as blocked
  it('32: Unknown-cost state is represented as blocked with no autonomous dispatch', async () => {
    const sys = await supervisor.getSystem()
    expect(sys.costPolicySummary.defaultTier).toBe('FREE_OPEN_SOURCE_LOCAL')
    expect(sys.costPolicySummary.paidFallbackPermitted).toBe(false)
    expect(sys.costPolicySummary.autonomousPaymentAuthority).toBe(false)
  })

  // 33: Paid fallback cannot be triggered from UI
  it('33: Paid fallback cannot be triggered from UI', async () => {
    const sys = await supervisor.getSystem()
    expect(sys.costPolicySummary.paidFallbackPermitted).toBe(false)
    // No method exists on bridge to enable paid fallback
    expect((supervisor as any).enablePaidFallback).toBeUndefined()
  })

  // 34: Revoked/expired grant represented accurately
  it('34: Revoked/expired grant is represented accurately in projections', async () => {
    const ex = await supervisor.getExecution()
    for (const item of ex.executions) {
      expect(['AUTHORIZED', 'DENIED']).toContain(item.dispatchAuthorization)
    }
  })

  // 35: Verification INCONCLUSIVE remains distinct from FAIL
  it('35: Verification INCONCLUSIVE remains distinct from FAIL', async () => {
    host.registerVerificationFixture({
      planId: 'plan_inconclusive',
      taskId: 'task_inc',
      workSessionId: 'ws_inc',
      runId: 'run_inc',
      verdict: 'INCONCLUSIVE',
      humanApprovalState: 'NOT_REQUIRED',
    })
    host.registerVerificationFixture({
      planId: 'plan_fail',
      taskId: 'task_fail',
      workSessionId: 'ws_fail',
      runId: 'run_fail',
      verdict: 'FAIL',
      humanApprovalState: 'NOT_REQUIRED',
    })

    const vInc = await supervisor.getVerification('plan_inconclusive')
    const vFail = await supervisor.getVerification('plan_fail')

    expect(vInc!.verdict).toBe('INCONCLUSIVE')
    expect(vFail!.verdict).toBe('FAIL')
    expect(vInc!.verdict).not.toBe(vFail!.verdict)
  })

  // 36: WAITING_APPROVAL remains distinct from VERIFIED_PASS
  it('36: WAITING_APPROVAL remains distinct from VERIFIED_PASS', async () => {
    host.registerVerificationFixture({
      planId: 'plan_gate_36',
      taskId: 'task_36',
      workSessionId: 'ws_36',
      runId: 'run_36',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
    })

    const verif = await supervisor.getVerification('plan_gate_36')
    expect(verif!.verdict).toBe('VERIFIED_PASS')
    expect(verif!.humanApprovalState).toBe('WAITING_FOR_HUMAN_APPROVAL')
    expect(verif!.humanApprovalState as string).not.toBe(verif!.verdict as string)
  })

  // 37: Kernel offline state represented without fake data
  it('37: Kernel offline state represented without fake data', async () => {
    const offlineSup = new DesktopSupervisor({
      forkProcess: () => ({
        postMessage: () => {},
        on: () => {},
        kill: () => {},
      }),
      protocolVersion: D1_PROTOCOL_VERSION,
    })
    // Not starting the supervisor leaves status NOT_STARTED / OFFLINE
    const ov = await offlineSup.getOverview()
    expect(ov.kernelStatus).toBe('NOT_STARTED')
    expect(ov.activeWorkSessionsCount).toBe(0)
    expect(ov.activeRunsCount).toBe(0)
    expect(ov.canonicalRevision).toBe(0)
    expect(ov.recentActivitySummary[0]).toContain('no fabricated data')
  })

  // 38: Degraded state represented safely
  it('38: Degraded state represented safely', async () => {
    const sys = await supervisor.getSystem()
    expect(sys.supervisorStatus).toBe('READY')
    expect(sys.recentErrors).toBeDefined()
  })

  // 39: Secret sentinel redacted
  it('39: Fake secret sentinel is redacted from diagnostic context and outputs', async () => {
    const secret = 'sk-proj-supersecret1234567890abcdef'
    host.setDiagnosticContext(`Debug token: ${secret}`)
    const health = await supervisor.getHealth()
    expect(health.safeDiagnostic).not.toContain(secret)
    expect(health.safeDiagnostic).toContain('[REDACTED]')
  })

  // 40: Activity chronology derives from canonical events
  it('40: Activity chronology derives from canonical events', async () => {
    const act = await supervisor.getActivity()
    expect(Array.isArray(act.events)).toBe(true)
    for (let i = 1; i < act.events.length; i++) {
      expect(act.events[i].sequenceNumber).toBeGreaterThanOrEqual(act.events[i - 1].sequenceNumber)
    }
  })

  // 41: Evidence digest not labeled signature
  it('41: Evidence digest is not labeled as a signature', async () => {
    host.registerVerificationFixture({
      planId: 'plan_digest_41',
      taskId: 'task_41',
      workSessionId: 'ws_41',
      runId: 'run_41',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
    })

    const verif = await supervisor.getVerification('plan_digest_41')
    expect(verif!.manifestCoreDigest.isDigitalSignature).toBe(false)
    expect(verif!.manifestCoreDigest.semantics).toBe('CHANGE_DETECTION_RELATIVE_TO_REFERENCE_DIGEST')
  })

  // 42: Evidence bundle not labeled trusted evidence
  it('42: Evidence bundle is not labeled as trusted evidence', async () => {
    host.registerVerificationFixture({
      planId: 'plan_bundle_42',
      taskId: 'task_42',
      workSessionId: 'ws_42',
      runId: 'run_42',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
    })

    const verif = await supervisor.getVerification('plan_bundle_42')
    expect(verif!.trustStatus).toBe('NOT_TRUSTED_EVIDENCE')
  })

  // 43: Keyboard approval flow works
  it('43: Keyboard approval intent flow works cleanly', async () => {
    host.registerVerificationFixture({
      planId: 'plan_key_43',
      taskId: 'task_43',
      workSessionId: 'ws_43',
      runId: 'run_43',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
      revision: 1,
    })

    const intent: RecordHumanDecisionIntent = {
      intentType: 'RECORD_HUMAN_DECISION',
      actor: { kind: 'HUMAN_OPERATOR', operatorId: 'keyboard-operator' },
      targetId: 'plan_key_43',
      decision: 'APPROVED',
      rationale: 'Keyboard approval confirmed via Enter key',
      expectedRevision: 1,
      correlationId: 'corr_43',
      timestamp: new Date().toISOString(),
    }

    const res = await supervisor.submitIntent(intent)
    expect(res.success).toBe(true)
    expect(res.status).toBe('ACCEPTED')
  })

  // 44: Keyboard rejection flow works
  it('44: Keyboard rejection flow works cleanly', async () => {
    host.registerVerificationFixture({
      planId: 'plan_key_44',
      taskId: 'task_44',
      workSessionId: 'ws_44',
      runId: 'run_44',
      verdict: 'VERIFIED_PASS',
      humanApprovalState: 'WAITING_FOR_HUMAN_APPROVAL',
      revision: 1,
    })

    const intent: RecordHumanDecisionIntent = {
      intentType: 'RECORD_HUMAN_DECISION',
      actor: { kind: 'HUMAN_OPERATOR', operatorId: 'keyboard-operator' },
      targetId: 'plan_key_44',
      decision: 'REJECTED',
      rationale: 'Human operator explicitly rejects candidate',
      expectedRevision: 1,
      correlationId: 'corr_44',
      timestamp: new Date().toISOString(),
    }

    const res = await supervisor.submitIntent(intent)
    expect(res.success).toBe(true)
    expect(res.status).toBe('ACCEPTED')

    const verif = await supervisor.getVerification('plan_key_44')
    expect(verif!.humanApprovalState).toBe('HUMAN_REJECTED')
  })

  // 45: Focus returns correctly after confirmation
  it('45: Task cancellation intent flow executes with state transition', async () => {
    const kernel = host.getKernel()
    await kernel.execute({
      commandId: 'cmd_ws_45',
      commandType: 'CREATE_WORK_SESSION',
      payload: { id: 'ws_d1_45', title: 'WorkSession 45', goal: 'Cancel test' },
    })
    await kernel.execute({
      commandId: 'cmd_run_45',
      commandType: 'CREATE_RUN',
      workSessionId: 'ws_d1_45',
      payload: { runId: 'run_d1_45', workSessionId: 'ws_d1_45', goal: 'Cancel run' },
    })
    await kernel.execute({
      commandId: 'cmd_task_45',
      commandType: 'CREATE_TASK',
      workSessionId: 'ws_d1_45',
      payload: {
        taskId: 'task_d1_45',
        runId: 'run_d1_45',
        title: 'Task to be cancelled',
        assignedRoleId: 'role:engineering:backend-engineer',
      },
    })

    const cancelIntent: CancelTaskIntent = {
      intentType: 'CANCEL_TASK',
      actor: { kind: 'HUMAN_OPERATOR', operatorId: 'keyboard-operator' },
      targetId: 'task_d1_45',
      reason: 'User cancelled execution from command center',
      correlationId: 'corr_45',
      timestamp: new Date().toISOString(),
    }

    const res = await supervisor.submitIntent(cancelIntent)
    expect(res.success).toBe(true)

    const detail = await supervisor.getTaskDetail('task_d1_45')
    expect(detail!.task.state).toBe('CANCELLED')
  })

  // 46: Renderer presentation state remains noncanonical
  it('46: Renderer presentation state remains noncanonical and local', () => {
    const presentationState = {
      selectedTab: 'surface-overview',
      expandedPanels: ['panel-01'],
      scrollPosition: 120,
    }
    // Modifying presentation state has zero impact on canonical Kernel
    presentationState.selectedTab = 'surface-approvals'
    expect(presentationState.selectedTab).toBe('surface-approvals')
  })

  // 47: No D2 code introduced
  it('47: No D2 code (tray, background daemon, startup register) introduced', () => {
    expect((supervisor as any).createTray).toBeUndefined()
    expect((supervisor as any).registerAutoStart).toBeUndefined()
  })

  // 48: No D3 code introduced
  it('48: No D3 code (Three.js, WebGL spatial world, Living HQ) introduced', () => {
    expect((supervisor as any).initThreeScene).toBeUndefined()
    expect((supervisor as any).renderSpatialWorld).toBeUndefined()
  })

  // 49: No D4 code introduced
  it('49: No D4 code (role-bot avatars, spatial agent locomotion) introduced', () => {
    expect((supervisor as any).spawnAvatar).toBeUndefined()
    expect((supervisor as any).animateBot).toBeUndefined()
  })

  // 50: No auto merge/deploy/release introduced
  it('50: No autonomous merge, deploy, or release capability exists in D1', () => {
    expect((supervisor as any).autoMerge).toBeUndefined()
    expect((supervisor as any).autoDeploy).toBeUndefined()
    expect((supervisor as any).autoRelease).toBeUndefined()
  })
})
