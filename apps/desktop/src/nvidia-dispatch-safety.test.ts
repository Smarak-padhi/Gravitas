import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { KernelHost } from './kernel-host/kernelHost.js'
import { DesktopSupervisor } from './main/supervisor.js'
import { isAuthorizedRestartCaller, initMainIpc } from './main/index.js'
import { ipcMain } from 'electron'
import { validateDispatchPayload } from './dispatchValidation.js'
import {
  ModelCredentialBroker,
  ModelRegistry,
  ModelRouter,
  NvidiaNimAdapter,
  authorizeOfflineNvidiaDispatch,
  authorizeOfflineNvidiaGrant,
  issueOfflineNvidiaTestFixtureGrant,
  verifyK3DispatchGrant,
} from '@gravitas/gateways'
import type { DispatchModelRequest } from './types.js'

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() } }))

const model = 'meta/llama-3.1-8b-instruct'
const request = (extra = {}): DispatchModelRequest => ({ type: 'DISPATCH_MODEL_REQUEST', protocolVersion: 'd1.0', requestId: 'test', timestamp: new Date().toISOString(), modelId: model, prompt: 'Offline test', ...extra })
const grant = () => authorizeOfflineNvidiaDispatch({ subjectId: 'host', workSessionId: 'ws', runId: 'run', taskId: 'task', model })
const response = () => new Response(JSON.stringify({ model, choices: [{ message: { content: 'LABELED_MOCK' }, finish_reason: 'stop' }] }))

describe('V1-E-01-R1 & R2 dispatch safety', () => {
  let root: string
  const hosts: KernelHost[] = []
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'nim-safety-'))
    ModelCredentialBroker.getInstance().clearAll()
    ModelRegistry.getInstance().clear()
  })
  afterEach(async () => {
    for (const h of hosts.splice(0)) await h.shutdown()
    ModelCredentialBroker.getInstance().clearAll()
    vi.restoreAllMocks()
    rmSync(root, { recursive: true, force: true })
  })
  const host = async (fetchFn?: typeof fetch, extraOpts: Record<string, unknown> = {}) => {
    const h = new KernelHost({ dataRoot: root, customFetch: fetchFn, ...extraOpts })
    hosts.push(h)
    await h.start()
    return h
  }
  const credential = () => ModelCredentialBroker.getInstance().registerSecret('nvidia-nim', 'offline-fixture-credential')

  it('rejects missing frames, unrelated frames and unauthorized IPC before calling supervisor', async () => {
    const callbacks = new Map<string, Function>()
    vi.spyOn(ipcMain, 'handle').mockImplementation((name, fn) => { callbacks.set(name, fn) })
    const sup = { dispatchModel: vi.fn(), configureProvider: vi.fn() } as unknown as DesktopSupervisor
    const frame = { parent: null, url: pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'renderer/index.html')).href }
    const sender = { mainFrame: frame }
    const win = { isDestroyed: () => false, webContents: sender } as any
    initMainIpc(sup, () => win)
    for (const channel of ['gravitas:configure-provider', 'gravitas:dispatch-model']) {
      expect(() => callbacks.get(channel)!({ sender: {}, senderFrame: frame }, {})).toThrow('Unauthorized')
    }
    expect(isAuthorizedRestartCaller({ sender } as any, win)).toBe(false)
    expect(isAuthorizedRestartCaller({ sender, senderFrame: { ...frame } } as any, win)).toBe(false)
    expect(isAuthorizedRestartCaller({ sender, senderFrame: frame } as any, win)).toBe(true)
    expect(sup.dispatchModel).not.toHaveBeenCalled()
    expect(sup.configureProvider).not.toHaveBeenCalled()
  })

  it.each([{ maxTokens: 0 }, { maxTokens: 8193 }, { timeoutMs: NaN }, { timeoutMs: 120001 }, { modelId: '../ bad' }, { workSessionId: '' }, { messages: [] }, { messages: [{ role: 'tool', content: 'x' }] }, { customFetch: 'forged' }, { nvidiaAdapter: {} }])('rejects invalid input at Main and Kernel boundaries: %j', async extra => {
    const payload = { prompt: 'x', ...extra }
    expect(() => validateDispatchPayload(payload)).toThrow()
    await expect(new DesktopSupervisor({ dataRoot: root }).dispatchModel(payload as any)).rejects.toThrow()
    const transport = vi.fn(async () => response())
    const h = await host(transport)
    expect((await h.dispatchModel(request(extra))).success).toBe(false)
    expect(transport).not.toHaveBeenCalled()
    expect(h.getKernel().listWorkSessions()).toHaveLength(0)
  })

  it('rejects serialized grants and denies default live fetch even with trusted offline authority', async () => {
    const broker = ModelCredentialBroker.getInstance()
    const ref = credential()
    const live = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Live network forbidden'))
    const adapter = new NvidiaNimAdapter({ credentialBroker: broker })
    const req = { model, messages: [{ role: 'user' as const, content: 'x' }], credentialRef: ref, capabilityGrant: grant() }
    expect((await adapter.execute({ ...req, capabilityGrant: JSON.parse(JSON.stringify(req.capabilityGrant)) })).errorTaxonomy).toBe('CAPABILITY_GRANT_REQUIRED')
    expect((await adapter.execute(req)).errorMessage).toContain('egress is disabled')
    const h = await host()
    expect((await h.dispatchModel(request())).success).toBe(false)
    expect(live).not.toHaveBeenCalled()
  })

  it('restricts authorizeOfflineNvidiaGrant against self-constructed grants and rejects EXPIRED status with future timestamp', async () => {
    const issued = grant()
    expect(issued.authorityCeiling).toBe('RESTRICTED_INFERENCE')
    expect(issued.costCeiling).toBe('ZERO_DOLLAR_FREE')
    expect(issued.grantedCapabilities).toEqual(['provider:nvidia-nim'])
    expect(issued.resourceScope.allowedOrigins).toEqual(['https://integrate.api.nvidia.com'])
    expect(issued.credentialReferences).toEqual(['vault:cred:nvidia-nim'])
    expect(() => authorizeOfflineNvidiaGrant({ ...issued })).toThrow(/self-constructed grants cannot be registered/)

    const futureExpiredFixture = issueOfflineNvidiaTestFixtureGrant({
      status: 'EXPIRED',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })
    const verification = verifyK3DispatchGrant({
      grant: futureExpiredFixture,
      expectedProvider: 'nvidia-nim',
      endpointUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
      model,
      credentialRef: 'vault:cred:nvidia-nim',
    })
    expect(verification.authorized).toBe(false)
    expect(verification.failureReasonCode).toBe('GRANT_EXPIRED')
  })

  it('keeps metadata qualification unchanged, invokes ModelRouter, and records nonqualified/unknown cost claims', async () => {
    credential()
    const resolveModelSpy = vi.spyOn(ModelRouter.prototype, 'resolveModel')
    const resolveOfflineSpy = vi.spyOn(ModelRouter.prototype, 'resolveOfflineTestModel')
    const h = await host(async () => response())
    await h.getKernel().execute({ commandId: 'ws-create', commandType: 'CREATE_WORKSESSION', workSessionId: 'ws-existing', payload: { title: 'Existing', objective: 'Test', repositoryRoot: root } })
    const before = ModelRegistry.getInstance().getModel(model)!.qualificationState
    expect(before).toBe('METADATA_VALIDATED')
    const result = await h.dispatchModel(request({ workSessionId: 'ws-existing' }))
    expect(result.success).toBe(true)
    expect(resolveModelSpy).toHaveBeenCalledTimes(1)
    expect(resolveOfflineSpy).toHaveBeenCalledTimes(1)
    expect(resolveOfflineSpy.mock.results[0]?.value.qualificationDecision).toBe('UNQUALIFIED')
    const snapshot = h.getKernel().getWorkSessionSnapshot('ws-existing')
    expect(snapshot.tasks[0]).toMatchObject({ id: result.taskId, runId: result.runId, workSessionId: 'ws-existing', state: 'VERIFYING' })
    expect(snapshot.runs[0].id).toBe(result.runId)
    expect(ModelRegistry.getInstance().getModel(model)!.qualificationState).toBe(before)

    const execProj = h.generateExecutionProjection()
    const execItem = execProj.executions.find(e => e.executionId === result.executionId)!
    expect(execItem).toMatchObject({
      qualificationStatus: 'NOT_QUALIFIED',
      readinessStatus: 'NOT_READY',
      costEligibility: 'UNKNOWN_COST',
      dispatchAuthorization: 'AUTHORIZED',
      status: 'COMPLETED',
    })

    // Router cost policy blocks PAID models before any task or transport execution
    const existingModel = ModelRegistry.getInstance().getModel(model)!
    ModelRegistry.getInstance().registerModel({ ...existingModel, costClass: 'PAID' })
    const costBlocked = await h.dispatchModel(request({ workSessionId: 'ws-existing' }))
    expect(costBlocked.success).toBe(false)
    expect(costBlocked.errorTaxonomy).toBe('COST_BLOCKED')

    expect((await h.dispatchModel(request({ workSessionId: 'missing' }))).success).toBe(false)
    expect(h.getKernel().listWorkSessions()).toHaveLength(1)
  })

  it('missing and revoked credentials never reach transport', async () => {
    const transport = vi.fn(async () => response())
    const h = await host(transport)
    expect((await h.dispatchModel(request())).errorTaxonomy).toBe('AUTH_REQUIRED')
    credential()
    ModelCredentialBroker.getInstance().clearAll()
    expect((await h.dispatchModel(request())).errorTaxonomy).toBe('AUTH_REQUIRED')
    expect(transport).not.toHaveBeenCalled()
  })

  it('cancellation aborts transport and cannot become task success', async () => {
    credential()
    let observed: AbortSignal | undefined
    let started!: () => void
    const ready = new Promise<void>(resolve => { started = resolve })
    const h = await host(async (_url, options) => { observed = options?.signal as AbortSignal; started(); return new Promise<Response>(() => {}) })
    const pending = h.dispatchModel(request())
    await ready
    const ws = h.getKernel().listWorkSessions()[0]
    const task = h.getKernel().getWorkSessionSnapshot(ws.id).tasks[0]
    await h.handleOperatorIntent({ intentType: 'CANCEL_TASK', targetId: task.id, reason: 'Operator cancelled', actor: { kind: 'HUMAN_OPERATOR', operatorId: 'test-operator' } } as any)
    expect((await pending).terminationStatus).toBe('CANCELLED')
    expect(observed!.aborted).toBe(true)
    expect(h.getKernel().getWorkSessionSnapshot(ws.id).tasks[0].state).toBe('CANCELLED')
  })

  it('timeout and thrown provider errors leave tasks failed', async () => {
    credential()
    const h = await host(async () => new Promise<Response>(() => {}))
    const result = await h.dispatchModel(request({ timeoutMs: 10 }))
    expect(result.terminationStatus).toBe('TIMED_OUT')
    expect(h.getKernel().getWorkSessionSnapshot(result.workSessionId).tasks[0].state).toBe('FAILED')
  })

  it('shutdown aborts active dispatch before closing the canonical writer', async () => {
    credential()
    let started!: () => void
    const ready = new Promise<void>(resolve => { started = resolve })
    const h = await host(async () => { started(); return new Promise<Response>(() => {}) })
    const pending = h.dispatchModel(request())
    await ready
    await h.shutdown()
    hosts.splice(hosts.indexOf(h), 1)
    expect((await pending).terminationStatus).toBe('CANCELLED')
    const restarted = await host(async () => response())
    const ws = restarted.getKernel().listWorkSessions()[0]
    expect(restarted.getKernel().getWorkSessionSnapshot(ws.id).tasks[0].state).toBe('CANCELLED')
  })

  it('bounded shutdown drain recovers safely when adapter or kernel operations never settle', async () => {
    credential()
    let adapterStarted!: () => void
    const adapterReady = new Promise<void>(resolve => { adapterStarted = resolve })
    const unsettledAdapter = {
      execute: () => {
        adapterStarted()
        return new Promise<any>(() => {})
      },
    } as unknown as NvidiaNimAdapter
    const h1 = await host(async () => response(), { nvidiaAdapter: unsettledAdapter, shutdownDrainTimeoutMs: 40 })
    const pending1 = h1.dispatchModel(request())
    await adapterReady
    await h1.shutdown()
    hosts.splice(hosts.indexOf(h1), 1)
    expect((await pending1).success).toBe(false)

    // Also test a kernel operation (kernel.execute) that never settles during dispatch
    const h2 = await host(async () => response(), { shutdownDrainTimeoutMs: 40, kernelCommandTimeoutMs: 30 })
    const origExecute = h2.getKernel().execute.bind(h2.getKernel())
    vi.spyOn(h2.getKernel(), 'execute').mockImplementation(async (cmd: any) => {
      if (cmd.commandType === 'TRANSITION_TASK' && cmd.payload?.toState === 'RUNNING') {
        return new Promise(() => {})
      }
      return origExecute(cmd)
    })
    const timedOutKernelRes = await h2.dispatchModel(request({ timeoutMs: 40 }))
    expect(timedOutKernelRes.success).toBe(false)
    expect(timedOutKernelRes.errorMessage).toContain('Kernel command timed out')
    await h2.shutdown()
    hosts.splice(hosts.indexOf(h2), 1)
  })

  it('thrown provider failures and failed kernel commands cannot leave RUNNING tasks', async () => {
    credential()
    const h = await host(async () => { throw new Error('Offline transport failed') })
    const failed = await h.dispatchModel(request())
    expect(failed.success).toBe(false)
    expect(h.getKernel().getWorkSessionSnapshot(failed.workSessionId).tasks[0].state).toBe('FAILED')
    const execute = vi.spyOn(h.getKernel(), 'execute').mockResolvedValueOnce({ success: false } as any)
    const rejected = await h.dispatchModel(request())
    expect(rejected.success).toBe(false)
    expect(rejected.errorMessage).toBe('Kernel command failed')
    execute.mockRestore()
  })

  it('redacts output and errors even when credentials are revoked during transport', async () => {
    const ref = credential()
    const broker = ModelCredentialBroker.getInstance()
    // Read the fixture only in this trusted test; no secret-resolution IPC is exposed.
    const secret = broker.resolveSecret(ref)!
    const adapter = new NvidiaNimAdapter({ credentialBroker: broker, fetchFn: async () => {
      broker.clearAll()
      return new Response(JSON.stringify({ model, choices: [{ message: { content: secret }, finish_reason: 'stop' }] }))
    } })
    const result = await adapter.execute({ model, messages: [{ role: 'user', content: 'x' }], credentialRef: ref, capabilityGrant: grant() })
    expect(result.outputContent).toBe('[REDACTED_SECRET]')
  })

  it('restart marks interrupted dispatch tasks for recovery', async () => {
    const h = await host(async () => response())
    const k = h.getKernel()
    await k.execute({ commandId: 'ws', commandType: 'CREATE_WORKSESSION', workSessionId: 'ws', payload: { title: 'Restart test' } })
    await k.execute({ commandId: 'run', commandType: 'CREATE_RUN', workSessionId: 'ws', payload: { runId: 'run' } })
    await k.execute({ commandId: 'task', commandType: 'CREATE_TASK', workSessionId: 'ws', payload: { taskId: 'task', runId: 'run', title: 'Model Dispatch: interrupted' } })
    await k.execute({ commandId: 'running', commandType: 'TRANSITION_TASK', payload: { taskId: 'task', toState: 'RUNNING' } })
    await h.shutdown()
    hosts.splice(hosts.indexOf(h), 1)
    const restarted = await host(async () => response())
    expect(restarted.getKernel().getWorkSessionSnapshot('ws').tasks[0].state).toBe('RECOVERY_REQUIRED')
  })
})
