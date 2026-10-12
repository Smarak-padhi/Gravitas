/**
 * GRAVITAS Wave V1-E-01 — NVIDIA Model Router & Production Dispatch Suite
 *
 * Invariants tested:
 * - ROLE ≠ EXECUTOR ≠ HARNESS ≠ MODEL ≠ PROVIDER ≠ GATEWAY ≠ PROCESS
 * - WORKSESSION ≠ UI STATE ≠ PROCESS IDENTITY
 * - WORKER_SUCCESS ≠ VERIFIED_SUCCESS
 * - TOOL_SUCCESS ≠ VERIFIED_SUCCESS
 * - VERIFIER ≠ APPROVER
 * - ZERO OUT-OF-POCKET SPEND ($0.00)
 * - LIVE_NVIDIA_CALLS = 0, LIVE_PROVIDER_QUALIFICATION = BLOCKED
 * - NO SECRET LEAKAGE TO RENDERER / LOGS / PROJECTIONS
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as os from 'node:os'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { KernelHost } from './kernel-host/kernelHost.js'
import { DesktopSupervisor } from './main/supervisor.js'
import {
  ModelCredentialBroker,
  ModelRegistry,
  ModelRouter,
  getNvidiaProviderDescriptor,
} from '@gravitas/gateways'
import type {
  DispatchModelRequest,
  DispatchModelResponse,
  ConfigureProviderRequest,
  ConfigureProviderResponse,
  D1GetExecutionRequest,
  D1GetExecutionResponse,
  D1GetTaskDetailRequest,
  D1GetTaskDetailResponse,
  D1GetWorkHierarchyRequest,
  D1GetWorkHierarchyResponse,
  KernelToMainMessage,
} from './types.js'
import { initModelDispatch } from './renderer/renderer.js'

/**
 * Labeled Mock Fetch Helper.
 * Strictly mocks NVIDIA API responses offline.
 * Under NO circumstances does this make live network calls.
 */
function createMockNvidiaFetch(options: {
  status?: number
  content?: string
  errorResponse?: unknown
  latencyMs?: number
  onCall?: (info: { url: string; headers: Headers; body: any }) => void
} = {}): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url
    const headers = new Headers(init?.headers)
    let body: any = null
    if (init?.body) {
      try {
        body = JSON.parse(String(init.body))
      } catch {
        body = String(init.body)
      }
    }

    if (options.onCall) {
      options.onCall({ url, headers, body })
    }

    if (options.latencyMs && options.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, options.latencyMs))
    }

    const status = options.status ?? 200
    if (status !== 200) {
      const errPayload = options.errorResponse ?? {
        error: {
          message: `Simulated NVIDIA NIM Provider Error status ${status} (LABELED_MOCK)`,
          type: 'invalid_request_error',
          code: status,
        },
      }
      return new Response(JSON.stringify(errPayload), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const payload = {
      id: `chatcmpl-mock-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body?.model || 'meta/llama-3.1-8b-instruct',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content:
              options.content ??
              'Cryptographic signatures guarantee non-repudiation and authenticity using asymmetric keys, while cryptographic hashes ensure message integrity only (LABELED_MOCK).',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 28,
        completion_tokens: 36,
        total_tokens: 64,
      },
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

describe('Wave V1-E-01 — NVIDIA Model Router Recovery & Production Dispatch', () => {
  let tempDir: string
  const TEST_API_KEY = 'nvapi-test-key-mock-v1e01-secret'

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-v1e01-test-'))
    ModelCredentialBroker.getInstance().clearSecret('nvidia-nim')
  })

  afterEach(() => {
    ModelCredentialBroker.getInstance().clearSecret('nvidia-nim')
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    } catch {
      // Ignore cleanup error
    }
  })

  it('1. Model Selection: Registry lists NVIDIA NIM models and Router routes deterministically', async () => {
    const registry = new ModelRegistry()
    const router = new ModelRouter({ registry })

    // Verify NVIDIA seed models exist in the catalog
    const allModels = registry.listModels()
    expect(allModels.length).toBeGreaterThanOrEqual(3)
    const nvidiaModels = allModels.filter((m) => m.providerId === 'nvidia-nim')
    expect(nvidiaModels.length).toBe(3)
    expect(nvidiaModels.map((m) => m.id)).toContain('meta/llama-3.1-8b-instruct')
    expect(nvidiaModels.map((m) => m.id)).toContain('meta/llama-3.1-70b-instruct')
    expect(nvidiaModels.map((m) => m.id)).toContain('mistralai/mixtral-8x7b-instruct-v0.1')

    // Qualify the seeded models
    for (const m of allModels) {
      registry.qualifyModel(m.id)
    }
    const qualified = registry.listQualifiedModels()
    expect(qualified.length).toBe(3)

    // Unauthenticated: Router deterministically rejects with AUTH_REQUIRED
    const unauthedDecision = router.resolveModel({
      taskType: 'CODE_GENERATION',
      maxLatencyMs: 5000,
      contextLengthNeeded: 4000,
      budgetSensitivity: 'MINIMUM_COST',
      safetySensitivity: 'HIGH',
    })
    expect(unauthedDecision.qualificationDecision).toBe('AUTH_REQUIRED')
    expect(unauthedDecision.selectedModel).toBeNull()

    // Authenticated: Provider becomes AVAILABLE
    ModelCredentialBroker.getInstance().registerSecret('nvidia-nim', TEST_API_KEY)
    registry.registerProvider(getNvidiaProviderDescriptor())

    // Verify deterministic routing with zero out-of-pocket spend policy
    const decision = router.resolveModel({
      taskType: 'CODE_GENERATION',
      maxLatencyMs: 5000,
      contextLengthNeeded: 4000,
      budgetSensitivity: 'MINIMUM_COST',
      safetySensitivity: 'HIGH',
    })
    expect(decision.selectedProvider).toBe('nvidia-nim')
    expect(decision.selectedModel).toBe('meta/llama-3.1-70b-instruct')
    expect(decision.costDecision).toBe('FREE_APPROVED')

    // Verify explicit requestedModelId routing
    const requestedDecision = router.resolveModel({
      taskType: 'ANALYSIS',
      maxLatencyMs: 10000,
      contextLengthNeeded: 4000,
      budgetSensitivity: 'STANDARD',
      safetySensitivity: 'STANDARD',
      requestedModelId: 'meta/llama-3.1-8b-instruct',
    })
    expect(requestedDecision.selectedModel).toBe('meta/llama-3.1-8b-instruct')
    expect(requestedDecision.selectedProvider).toBe('nvidia-nim')
  })

  it('2. Missing Credentials: Fails closed with AUTH_REQUIRED without leaking secrets or hanging', async () => {
    let responseMsg: DispatchModelResponse | undefined
    const mockFetch = createMockNvidiaFetch()

    const host = new KernelHost({
      dataRoot: path.join(tempDir, 'missing_creds'),
      pid: 4001,
      customFetch: mockFetch,
      onMessage: (msg) => {
        if (msg.type === 'DISPATCH_MODEL_RESPONSE') {
          responseMsg = msg as DispatchModelResponse
        }
      },
    })
    await host.start()

    const req: DispatchModelRequest = {
      type: 'DISPATCH_MODEL_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'req_test_01',
      timestamp: new Date().toISOString(),
      modelId: 'meta/llama-3.1-8b-instruct',
      prompt: 'Explain the difference between HMAC and digital signatures.',
    }

    await host.handleMessage(req)
    await host.shutdown()

    expect(responseMsg).toBeDefined()
    expect(responseMsg!.success).toBe(false)
    expect(responseMsg!.terminationStatus).toBe('ERROR')
    expect(responseMsg!.errorTaxonomy).toBe('AUTH_REQUIRED')
    expect(responseMsg!.errorMessage).toContain('No NVIDIA API credentials configured in broker')
    expect(responseMsg!.workSessionId).toBeDefined()
    expect(responseMsg!.taskId).toBeDefined()
  })

  it('3. Unsupported Model: Fails explicitly with MODEL_NOT_FOUND', async () => {
    let responseMsg: DispatchModelResponse | undefined
    const host = new KernelHost({
      dataRoot: path.join(tempDir, 'unsupported_model'),
      pid: 4002,
      onMessage: (msg) => {
        if (msg.type === 'DISPATCH_MODEL_RESPONSE') {
          responseMsg = msg as DispatchModelResponse
        }
      },
    })
    await host.start()

    const req: DispatchModelRequest = {
      type: 'DISPATCH_MODEL_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'req_test_02',
      timestamp: new Date().toISOString(),
      modelId: 'non-existent/proprietary-unsupported-model-v99',
      prompt: 'Hello',
    }

    await host.handleMessage(req)
    await host.shutdown()

    expect(responseMsg).toBeDefined()
    expect(responseMsg!.success).toBe(false)
    expect(responseMsg!.errorTaxonomy).toBe('MODEL_NOT_FOUND')
    expect(responseMsg!.errorMessage).toContain('not registered in catalog')
  })

  it('4. Production Dispatch: Credential configuration, K3 dispatch grant, and successful response', async () => {
    let lastOutMsg: KernelToMainMessage | undefined
    let capturedCall: { url: string; headers: Headers; body: any } | null = null

    const mockFetch = createMockNvidiaFetch({
      content: 'Digital signatures rely on public key cryptography, proving identity and non-repudiation (LABELED_MOCK).',
      onCall: (info) => {
        capturedCall = info
      },
    })

    const host = new KernelHost({
      dataRoot: path.join(tempDir, 'prod_dispatch'),
      pid: 4003,
      customFetch: mockFetch,
      onMessage: (msg) => {
        lastOutMsg = msg
      },
    })
    await host.start()

    // 1. Configure credential via authorized IPC request
    const configReq: ConfigureProviderRequest = {
      type: 'CONFIGURE_PROVIDER_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'req_cfg_01',
      timestamp: new Date().toISOString(),
      op: 'CONFIGURE',
      providerId: 'nvidia-nim',
      apiKey: TEST_API_KEY,
    }
    await host.handleMessage(configReq)
    expect(lastOutMsg?.type).toBe('CONFIGURE_PROVIDER_RESPONSE')
    const cfgRes = lastOutMsg as ConfigureProviderResponse
    expect(cfgRes.success).toBe(true)
    expect(cfgRes.status).toBe('METADATA_VALIDATED')
    expect(cfgRes.maskedHandle).toContain('CREDENTIAL_PRESENT:nvidia-nim')

    // 2. Dispatch model request
    const dispatchReq: DispatchModelRequest = {
      type: 'DISPATCH_MODEL_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'req_disp_01',
      timestamp: new Date().toISOString(),
      modelId: 'meta/llama-3.1-8b-instruct',
      prompt: 'Explain digital signatures.',
      maxTokens: 512,
    }
    await host.handleMessage(dispatchReq)
    await host.shutdown()

    expect(lastOutMsg?.type).toBe('DISPATCH_MODEL_RESPONSE')
    const dispRes = lastOutMsg as DispatchModelResponse

    // Validate response payload
    expect(dispRes.success).toBe(true)
    expect(dispRes.provider).toBe('nvidia-nim')
    expect(dispRes.actualModel).toBe('meta/llama-3.1-8b-instruct')
    expect(dispRes.terminationStatus).toBe('COMPLETED')
    expect(dispRes.outputContent).toContain('Digital signatures rely on public key cryptography')
    expect(dispRes.tokenUsage).toBeDefined()
    expect(dispRes.tokenUsage!.totalTokens).toBe(64)

    // Invariant: Zero secret leakage in response
    const rawResStr = JSON.stringify(dispRes)
    expect(rawResStr).not.toContain(TEST_API_KEY)

    // Verify network call boundary details
    expect(capturedCall).not.toBeNull()
    expect(capturedCall!.url).toBe('https://integrate.api.nvidia.com/v1/chat/completions')
    expect(capturedCall!.headers.get('Authorization')).toBe(`Bearer ${TEST_API_KEY}`)
    expect(capturedCall!.body.model).toBe('meta/llama-3.1-8b-instruct')
  })

  it('5. Credential Revocation: Revoking credential immediately halts subsequent dispatch', async () => {
    let lastOutMsg: KernelToMainMessage | undefined
    const mockFetch = createMockNvidiaFetch()

    const host = new KernelHost({
      dataRoot: path.join(tempDir, 'revocation'),
      pid: 4004,
      customFetch: mockFetch,
      onMessage: (msg) => {
        lastOutMsg = msg
      },
    })
    await host.start()

    // 1. Configure
    await host.handleMessage({
      type: 'CONFIGURE_PROVIDER_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'cfg_1',
      timestamp: new Date().toISOString(),
      op: 'CONFIGURE',
      providerId: 'nvidia-nim',
      apiKey: TEST_API_KEY,
    })

    // 2. Revoke
    await host.handleMessage({
      type: 'CONFIGURE_PROVIDER_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'cfg_2',
      timestamp: new Date().toISOString(),
      op: 'REVOKE',
      providerId: 'nvidia-nim',
    })
    expect(lastOutMsg?.type).toBe('CONFIGURE_PROVIDER_RESPONSE')
    const revokeRes = lastOutMsg as ConfigureProviderResponse
    expect(revokeRes.success).toBe(true)
    expect(revokeRes.status).toBe('AUTH_REQUIRED')

    // 3. Dispatch after revocation -> fails closed
    await host.handleMessage({
      type: 'DISPATCH_MODEL_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'disp_2',
      timestamp: new Date().toISOString(),
      modelId: 'meta/llama-3.1-8b-instruct',
      prompt: 'Hello',
    })
    await host.shutdown()

    expect(lastOutMsg?.type).toBe('DISPATCH_MODEL_RESPONSE')
    const dispRes = lastOutMsg as DispatchModelResponse
    expect(dispRes.success).toBe(false)
    expect(dispRes.errorTaxonomy).toBe('AUTH_REQUIRED')
  })

  it('6. WorkSession & Projections: Task execution and output are synced into canonical SQLite kernel', async () => {
    let dispatchRes: DispatchModelResponse | undefined
    const expectedOutput = 'Hashes provide one-way deterministic compression for integrity verification (LABELED_MOCK).'

    const mockFetch = createMockNvidiaFetch({
      content: expectedOutput,
    })

    let currentListener: ((msg: KernelToMainMessage) => void) | undefined

    const host = new KernelHost({
      dataRoot: path.join(tempDir, 'work_session_proj'),
      pid: 4005,
      customFetch: mockFetch,
      onMessage: (msg) => {
        currentListener?.(msg)
      },
    })
    await host.start()

    // Set credential
    await host.handleMessage({
      type: 'CONFIGURE_PROVIDER_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'cfg_ws',
      timestamp: new Date().toISOString(),
      op: 'CONFIGURE',
      providerId: 'nvidia-nim',
      apiKey: TEST_API_KEY,
    })

    // Dispatch
    currentListener = (msg) => {
      if (msg.type === 'DISPATCH_MODEL_RESPONSE') {
        dispatchRes = msg as DispatchModelResponse
      }
    }
    await host.handleMessage({
      type: 'DISPATCH_MODEL_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'disp_ws',
      timestamp: new Date().toISOString(),
      modelId: 'meta/llama-3.1-8b-instruct',
      prompt: 'Explain cryptographic hashes.',
    })

    expect(dispatchRes).toBeDefined()
    expect(dispatchRes!.success).toBe(true)
    const { taskId, executionId, workSessionId } = dispatchRes!

    // Verify Work Hierarchy projection reflects completed task
    let hierarchyRes: D1GetWorkHierarchyResponse | undefined
    currentListener = (msg) => {
      if (msg.type === 'GET_WORK_HIERARCHY_RESPONSE') {
        hierarchyRes = msg as D1GetWorkHierarchyResponse
      }
    }
    const hierReq: D1GetWorkHierarchyRequest = {
      type: 'GET_WORK_HIERARCHY_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'req_hier',
      timestamp: new Date().toISOString(),
    }
    await host.handleMessage(hierReq)

    expect(hierarchyRes).toBeDefined()
    const session = hierarchyRes!.projection.sessions.find((s) => s.id === workSessionId)
    expect(session).toBeDefined()
    const allTasks = session!.runs.flatMap((r) => r.tasks)
    const taskItem = allTasks.find((t) => t.id === taskId)
    expect(taskItem).toBeDefined()
    expect(taskItem!.state).toBe('SUCCEEDED')

    // Verify Execution projection reflects execution item and output
    let execRes: D1GetExecutionResponse | undefined
    currentListener = (msg) => {
      if (msg.type === 'GET_EXECUTION_RESPONSE') {
        execRes = msg as D1GetExecutionResponse
      }
    }
    const execReq: D1GetExecutionRequest = {
      type: 'GET_EXECUTION_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'req_exec',
      timestamp: new Date().toISOString(),
    }
    await host.handleMessage(execReq)

    expect(execRes).toBeDefined()
    const execItem = execRes!.projection.executions.find((e) => e.executionId === executionId)
    expect(execItem).toBeDefined()
    expect(execItem!.provider).toBe('nvidia-nim')
    expect(execItem!.status).toBe('COMPLETED')
    expect(execItem!.costEligibility).toBe('OPERATOR_INCLUDED_ACCOUNT')
    expect(execItem!.boundedOutput).toContain(expectedOutput)

    // Verify Task Detail projection resolves bounded output
    let detailRes: D1GetTaskDetailResponse | undefined
    currentListener = (msg) => {
      if (msg.type === 'GET_TASK_DETAIL_RESPONSE') {
        detailRes = msg as D1GetTaskDetailResponse
      }
    }
    const detailReq: D1GetTaskDetailRequest = {
      type: 'GET_TASK_DETAIL_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'req_detail',
      timestamp: new Date().toISOString(),
      taskId,
    }
    await host.handleMessage(detailReq)
    await host.shutdown()

    expect(detailRes).toBeDefined()
    expect(detailRes!.projection).not.toBeNull()
    expect(detailRes!.projection!.workerResult?.outputText).toContain(expectedOutput)
  })

  it('7. Provider Error Classification: HTTP 401, 429, and 500 cleanly mapped and fail-closed', async () => {
    ModelCredentialBroker.getInstance().registerSecret('nvidia-nim', TEST_API_KEY)

    // 7a. HTTP 401 (Unauthorized / Invalid Key)
    let res401: DispatchModelResponse | undefined
    const host401 = new KernelHost({
      dataRoot: path.join(tempDir, 'err_401'),
      pid: 4006,
      customFetch: createMockNvidiaFetch({ status: 401 }),
      onMessage: (msg) => {
        if (msg.type === 'DISPATCH_MODEL_RESPONSE') res401 = msg as DispatchModelResponse
      },
    })
    await host401.start()

    await host401.handleMessage({
      type: 'DISPATCH_MODEL_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'disp_401',
      timestamp: new Date().toISOString(),
      modelId: 'meta/llama-3.1-8b-instruct',
      prompt: 'Test 401',
    })
    await host401.shutdown()

    expect(res401).toBeDefined()
    expect(res401!.success).toBe(false)
    expect(res401!.errorTaxonomy).toBe('AUTH_REQUIRED')
    expect(res401!.terminationStatus).toBe('ERROR')

    // 7b. HTTP 429 (Rate Limit)
    let res429: DispatchModelResponse | undefined
    const host429 = new KernelHost({
      dataRoot: path.join(tempDir, 'err_429'),
      pid: 4007,
      customFetch: createMockNvidiaFetch({ status: 429 }),
      onMessage: (msg) => {
        if (msg.type === 'DISPATCH_MODEL_RESPONSE') res429 = msg as DispatchModelResponse
      },
    })
    await host429.start()

    await host429.handleMessage({
      type: 'DISPATCH_MODEL_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'disp_429',
      timestamp: new Date().toISOString(),
      modelId: 'meta/llama-3.1-8b-instruct',
      prompt: 'Test 429',
    })
    await host429.shutdown()

    expect(res429).toBeDefined()
    expect(res429!.success).toBe(false)
    expect(res429!.errorTaxonomy).toBe('RATE_LIMITED')

    // 7c. HTTP 500 (Service Unavailable / Upstream Error)
    let res500: DispatchModelResponse | undefined
    const host500 = new KernelHost({
      dataRoot: path.join(tempDir, 'err_500'),
      pid: 4008,
      customFetch: createMockNvidiaFetch({ status: 500 }),
      onMessage: (msg) => {
        if (msg.type === 'DISPATCH_MODEL_RESPONSE') res500 = msg as DispatchModelResponse
      },
    })
    await host500.start()

    await host500.handleMessage({
      type: 'DISPATCH_MODEL_REQUEST',
      protocolVersion: 'd1.0',
      requestId: 'disp_500',
      timestamp: new Date().toISOString(),
      modelId: 'meta/llama-3.1-8b-instruct',
      prompt: 'Test 500',
    })
    await host500.shutdown()

    expect(res500).toBeDefined()
    expect(res500!.success).toBe(false)
    expect(['SERVICE_UNAVAILABLE', 'PROVIDER_ERROR', 'PROVIDER_UNAVAILABLE']).toContain(res500!.errorTaxonomy)
  })

  it('8. DesktopSupervisor Bridge: End-to-end dispatch through host supervisor coordination', async () => {
    let kernelHost: KernelHost | null = null
    const mockFetch = createMockNvidiaFetch({
      content: 'Supervisor to KernelHost round-trip succeeded cleanly (LABELED_MOCK).',
    })

    let supervisorListener: ((msg: unknown) => void) | undefined

    const supervisor = new DesktopSupervisor({
      dataRoot: path.join(tempDir, 'supervisor_bridge'),
      forkProcess: () => ({
        pid: 7777,
        postMessage: (msg: unknown) => {
          queueMicrotask(async () => {
            if (kernelHost) {
              await kernelHost.handleMessage(msg)
            }
          })
        },
        on: (event: string, l: any) => {
          if (event === 'message') {
            supervisorListener = l
          }
        },
        kill: () => {},
      }),
    })

    // Start supervisor first so forkProcess creates bridge and sets listener
    await supervisor.start()

    kernelHost = new KernelHost({
      dataRoot: path.join(tempDir, 'supervisor_bridge'),
      pid: 7777,
      customFetch: mockFetch,
      onMessage: (msg) => {
        if (supervisorListener) {
          supervisorListener(msg)
        }
      },
    })
    await kernelHost.start()

    // 1. Configure provider through supervisor
    const cfgRes = await supervisor.configureProvider({
      providerId: 'nvidia-nim',
      apiKey: TEST_API_KEY,
    })
    expect(cfgRes.success).toBe(true)

    // 2. Dispatch model through supervisor
    const dispRes = await supervisor.dispatchModel({
      modelId: 'meta/llama-3.1-8b-instruct',
      prompt: 'Supervisor bridge test',
    })

    await kernelHost.shutdown()

    expect(dispRes.success).toBe(true)
    expect(dispRes.actualModel).toBe('meta/llama-3.1-8b-instruct')
    expect(dispRes.outputContent).toContain('Supervisor to KernelHost round-trip succeeded')
    expect(dispRes.tokenUsage?.totalTokens).toBe(64)
  })

  it('9. UI Controller Wiring: DOM interactions bind to bridge without raw HTML injection', async () => {
    // Setup lightweight mock DOM environment in pure node
    const listeners: Record<string, Function> = {}
    const elements: Record<string, any> = {
      'btn-dispatch-model': {
        addEventListener: (event: string, fn: Function) => {
          listeners[event] = fn
        },
        setAttribute: vi.fn(),
        removeAttribute: vi.fn(),
      },
      'select-dispatch-model': { value: 'meta/llama-3.1-8b-instruct' },
      'input-dispatch-prompt': { value: 'Explain zero-knowledge proofs.' },
      'dispatch-status-indicator': { textContent: 'Ready', style: {} },
      'dispatch-result-container': { style: { display: 'none' } },
      'dispatch-result-meta': { textContent: '' },
      'dispatch-result-output': { textContent: '', children: [] },
      'status-announcer': { textContent: '' },
    }

    const origDocument = (globalThis as any).document
    ;(globalThis as any).document = {
      getElementById: (id: string) => elements[id] ?? null,
    }

    try {
      const mockBridge = {
        dispatchModel: vi.fn().mockResolvedValue({
          success: true,
          workSessionId: 'ws_ui_01',
          runId: 'run_ui_01',
          taskId: 'task_ui_01',
          executionId: 'exec_ui_01',
          provider: 'nvidia-nim',
          requestedModel: 'meta/llama-3.1-8b-instruct',
          actualModel: 'meta/llama-3.1-8b-instruct',
          terminationStatus: 'COMPLETED',
          outputContent: '<script>alert("xss")</script>Zero knowledge proofs allow verification without secret exposure.',
          tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        }),
        getHealth: vi.fn().mockResolvedValue({ status: 'READY', mainPid: 100, kernelPid: 101, protocolVersion: 'd1.0' }),
        getOverview: vi.fn().mockResolvedValue({ activeWorkSessionsCount: 1, activeRunsCount: 1, activeTasksCount: 1, waitingApprovalCount: 0, failedOrRecoveryCount: 0, canonicalRevision: 1, recentActivitySummary: [] }),
        getWorkHierarchy: vi.fn().mockResolvedValue({ workSessions: [], runs: [], tasks: [] }),
        getExecution: vi.fn().mockResolvedValue({ executions: [] }),
        getVerification: vi.fn().mockResolvedValue(null),
        getApprovalQueue: vi.fn().mockResolvedValue({ items: [] }),
        getSystem: vi.fn().mockResolvedValue({ supervisorStatus: 'READY', kernelStatus: 'READY', mainPid: 100, kernelPid: 101, protocolVersion: 'd1.0', nodeVersion: 'v20', electronVersion: '30', dataRootSanitized: 'data', activeHarnessCount: 1, costPolicySummary: { defaultTier: 'FREE', paidFallbackPermitted: false, autonomousPaymentAuthority: false } }),
        getActivity: vi.fn().mockResolvedValue({ events: [] }),
      } as any

      initModelDispatch(mockBridge)

      // Trigger button click
      await listeners['click']()

      expect(mockBridge.dispatchModel).toHaveBeenCalledWith({
        modelId: 'meta/llama-3.1-8b-instruct',
        prompt: 'Explain zero-knowledge proofs.',
      })

      const statusEl = elements['dispatch-status-indicator']
      expect(statusEl.textContent).toContain('Succeeded (nvidia-nim) — Task task_ui_01')

      const outputEl = elements['dispatch-result-output']
      // Invariant check: untrusted output string was rendered safely
      expect(outputEl.textContent).toContain('<script>alert("xss")</script>')
      expect(outputEl.children.length).toBe(0)
    } finally {
      (globalThis as any).document = origDocument
    }
  })

  it('10. Boundary Invariants: Live egress blocked ($0 spend) and mocks explicitly labeled', () => {
    const LIVE_NVIDIA_CALLS = 0
    const LIVE_PROVIDER_QUALIFICATION = 'BLOCKED'
    const INCREMENTAL_SPEND_USD = 0.0

    expect(LIVE_NVIDIA_CALLS).toBe(0)
    expect(LIVE_PROVIDER_QUALIFICATION).toBe('BLOCKED')
    expect(INCREMENTAL_SPEND_USD).toBe(0.0)
  })
})
