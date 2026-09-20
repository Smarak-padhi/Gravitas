/**
 * Gateway Routing & BoundedScheduler Composition Integration Tests (Wave 11.3)
 *
 * Verifies that BoundedScheduler executes tasks with deterministic routing:
 * - Direct execution (Safe Default)
 * - Composed Gateway execution with qualified gateway
 * - Structured gateway rejection on unqualified / unhealthy gateway with GATEWAY_ONLY
 * - Explicit transport fallback with GATEWAY_WITH_DIRECT_FALLBACK
 * - Full route provenance in EvidenceManifest
 */

import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import {
  DefaultGatewayRegistry,
  InferenceRouter,
  type GatewayDescriptor,
  type GatewayHealth,
  type GatewayModel,
  type GatewayRequest,
  type GatewayResponse,
  type GatewayRouteOptions,
  type InferenceGateway,
} from '@gravitas/gateways'
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentHarness,
  HarnessAvailability,
} from '@gravitas/harnesses'
import { BoundedScheduler } from './scheduler.js'
import type { RunPlan } from './types.js'

const execFileAsync = promisify(execFile)

class MockRoutingHarness implements AgentHarness {
  public readonly id = 'mock-routing-worker'
  public recordedRequests: AgentExecutionRequest[] = []

  async availability(): Promise<HarnessAvailability> {
    return {
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      version: '1.0.0',
    }
  }

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    this.recordedRequests.push(request)
    const startedAt = new Date().toISOString()

    // Deterministic coding task: write src/math.js with add(a, b)
    const mathPath = join(request.worktreePath, 'src', 'math.js')
    await mkdir(join(request.worktreePath, 'src'), { recursive: true })
    await writeFile(mathPath, 'export function add(a, b) { return a + b }\n', 'utf8')

    return {
      executionId: request.executionId,
      harnessId: this.id,
      harnessVersion: '1.0.0',
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: 40,
      exitCode: 0,
      terminationReason: 'COMPLETED',
      stdout: 'Successfully implemented math.js',
      stderr: '',
      stdoutTruncated: false,
      stderrTruncated: false,
      worktreePath: request.worktreePath,
      routeProvenance: request.routeContext
        ? {
            workerId: this.id,
            transport: request.routeContext['transport'],
            gatewayId: request.routeContext['gatewayId'] ?? null,
            requestedProvider: request.routeContext['requestedProvider'] ?? null,
            requestedModel: request.routeContext['requestedModel'] ?? null,
            actualProvider: request.routeContext['transport'] === 'GATEWAY' ? 'openai' : 'direct',
            actualModel: request.routeContext['requestedModel'] ?? 'gpt-4o',
            providerFallbackOccurred: false,
            transportFallbackOccurred: request.routeContext['transportFallbackOccurred'] ?? false,
            routeDecisionReason: request.routeContext['reason'],
            routePolicyVersion: '1.0.0',
          }
        : undefined,
    }
  }

  async cancel(): Promise<boolean> {
    return true
  }
}

class MockGatewayInstance implements InferenceGateway {
  public readonly id: string
  public isHealthy: boolean

  constructor(id: string, isHealthy = true) {
    this.id = id
    this.isHealthy = isHealthy
  }

  async health(): Promise<GatewayHealth> {
    return {
      isHealthy: this.isHealthy,
      status: this.isHealthy ? 'HEALTHY' : 'UNHEALTHY',
    }
  }

  async listModels(): Promise<GatewayModel[]> {
    return [{ id: 'openai/gpt-4o', isAvailable: true }]
  }

  async route(request: GatewayRequest, options?: GatewayRouteOptions): Promise<GatewayResponse> {
    return {
      status: 200,
      body: { choices: [{ message: { content: 'Gateway mock' } }] },
      headers: {},
      gatewayId: this.id,
      actualModel: 'gpt-4o',
      actualProvider: 'openai',
      fallbackOccurred: false,
      latencyMs: 30,
      terminationReason: 'COMPLETED',
    }
  }
}

async function createGitRepo(): Promise<string> {
  const repoDir = join(
    tmpdir(),
    `gravitas-router-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  )
  await mkdir(repoDir, { recursive: true })
  await execFileAsync('git', ['init', '-b', 'main'], { cwd: repoDir })
  await execFileAsync('git', ['config', 'user.name', 'Gravitas Tester'], { cwd: repoDir })
  await execFileAsync('git', ['config', 'user.email', 'test@gravitas.local'], { cwd: repoDir })
  await execFileAsync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repoDir })

  await writeFile(join(repoDir, 'package.json'), JSON.stringify({ name: 'test-app', type: 'module' }), 'utf8')
  await execFileAsync('git', ['add', '.'], { cwd: repoDir })
  await execFileAsync('git', ['commit', '-m', 'Initial commit'], { cwd: repoDir })

  return repoDir
}

describe('BoundedScheduler Gateway Routing Composition (Wave 11.3)', () => {
  it('Run A: DIRECT Control — executes without gateway requirements and materializes result', async () => {
    const repoDir = await createGitRepo()
    const runtimeRoot = join(tmpdir(), `gravitas-rt-${Date.now()}`)
    const harness = new MockRoutingHarness()
    const registry = new DefaultGatewayRegistry()
    const events: any[] = []

    const plan: RunPlan = {
      runId: 'run-direct-control',
      goal: 'Implement math add function',
      repository: repoDir,
      baseBranch: 'main',
      tasks: [
        {
          id: 'T1',
          title: 'Implement add in math.js',
          objective: 'Add deterministic math function',
          requiresApproval: true,
          verificationPlan: {
            id: 'plan_verify_math',
            commands: [
              {
                id: 'cmd_verify_math',
                executable: process.execPath,
                args: [
                  '-e',
                  'import("./src/math.js").then(m => { if (m.add(2, 3) !== 5) process.exit(1); })',
                ],
                mandatory: true,
              },
            ],
          },
        },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run-direct-control',
      plan,
      repositoryRoot: repoDir,
      baseBranch: 'main',
      runtimeRoot,
      harness,
      gatewayRegistry: registry,
      autoPauseOnWaitingApproval: true,
      onEvent: (e) => events.push(e),
    })

    const result = await scheduler.execute()
    expect(result.status).toBe('WAITING_APPROVAL')

    // Verify route selection event
    const routeSelected = events.find((e) => e.type === 'ROUTE_SELECTED')
    expect(routeSelected).toBeDefined()
    expect(routeSelected.payload.transport).toBe('DIRECT')
    expect(routeSelected.payload.reason).toBe('DIRECT_DEFAULT')

    // Approve task and verify materialization
    const approvedTask = await scheduler.approveTask('T1')
    expect(approvedTask.state).toBe('APPROVED')
    const finalResult = await scheduler.execute()
    expect(finalResult.status).toBe('COMPLETED')
  }, 60000)

  it('Run B: GATEWAY Composition — routes through qualified OmniRoute gateway and captures provenance', async () => {
    const repoDir = await createGitRepo()
    const runtimeRoot = join(tmpdir(), `gravitas-rt-${Date.now()}`)
    const harness = new MockRoutingHarness()
    const registry = new DefaultGatewayRegistry()
    const gateway = new MockGatewayInstance('omniroute-local', true)
    registry.registerGateway(gateway, {
      id: 'omniroute-local',
      name: 'OmniRoute Local Gateway',
      version: '3.8.50',
      baseUrl: 'http://127.0.0.1:20139',
      securityProfile: 'wave11.2-isolated',
    })
    // Qualify gateway
    ;(registry as any).descriptors.set('omniroute-local', {
      ...(registry as any).descriptors.get('omniroute-local'),
      state: 'READY',
      qualificationDecision: 'APPROVED',
      qualificationMode: 'REAL',
    })

    const events: any[] = []
    let capturedEvidence: any = null

    const plan: RunPlan = {
      runId: 'run-gateway-composition',
      goal: 'Implement math add function via OmniRoute',
      repository: repoDir,
      baseBranch: 'main',
      tasks: [
        {
          id: 'T1',
          title: 'Implement add in math.js via gateway',
          objective: 'Add deterministic math function',
          requiresApproval: true,
          inferenceRoute: {
            transportPreference: 'GATEWAY',
            requestedGatewayId: 'omniroute-local',
            requestedProvider: 'openai',
            requestedModel: 'gpt-4o',
          },
          verificationPlan: {
            id: 'plan_verify_math',
            commands: [
              {
                id: 'cmd_verify_math',
                executable: process.execPath,
                args: [
                  '-e',
                  'import("./src/math.js").then(m => { if (m.add(10, 20) !== 30) process.exit(1); })',
                ],
                mandatory: true,
              },
            ],
          },
        },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run-gateway-composition',
      plan,
      repositoryRoot: repoDir,
      baseBranch: 'main',
      runtimeRoot,
      harness,
      gatewayRegistry: registry,
      autoPauseOnWaitingApproval: true,
      onEvent: (e) => events.push(e),
      onEvidence: (_, ref) => {
        capturedEvidence = ref
      },
    })

    const result = await scheduler.execute()
    expect(result.status).toBe('WAITING_APPROVAL')

    // Verify route selected event
    const routeSelected = events.find((e) => e.type === 'ROUTE_SELECTED')
    expect(routeSelected).toBeDefined()
    expect(routeSelected.payload.transport).toBe('GATEWAY')
    expect(routeSelected.payload.gatewayId).toBe('omniroute-local')
    expect(routeSelected.payload.requestedProvider).toBe('openai')
    expect(routeSelected.payload.requestedModel).toBe('gpt-4o')

    // Verify gateway lifecycle events
    expect(events.some((e) => e.type === 'GATEWAY_ROUTE_STARTED')).toBe(true)
    expect(events.some((e) => e.type === 'GATEWAY_ROUTE_COMPLETED')).toBe(true)

    // Verify EvidenceManifest contains route provenance
    expect(capturedEvidence).toBeDefined()
    const manifestJson = await readFile(capturedEvidence.manifestPath, 'utf8')
    const manifest = JSON.parse(manifestJson)
    expect(manifest.routeProvenance).toBeDefined()
    expect(manifest.routeProvenance.transport).toBe('GATEWAY')
    expect(manifest.routeProvenance.gatewayId).toBe('omniroute-local')
    expect(manifest.routeProvenance.actualProvider).toBe('openai')

    // Approve task and complete run
    await scheduler.approveTask('T1')
    const finalResult = await scheduler.execute()
    expect(finalResult.status).toBe('COMPLETED')
  }, 60000)

  it('Gateway Failure with GATEWAY_ONLY — structured rejection and zero silent fallback', async () => {
    const repoDir = await createGitRepo()
    const runtimeRoot = join(tmpdir(), `gravitas-rt-${Date.now()}`)
    const harness = new MockRoutingHarness()
    const registry = new DefaultGatewayRegistry()
    const gateway = new MockGatewayInstance('omniroute-local', false) // Unhealthy
    registry.registerGateway(gateway, {
      id: 'omniroute-local',
      name: 'OmniRoute Local Gateway',
      version: '3.8.50',
    })
    ;(registry as any).descriptors.set('omniroute-local', {
      ...(registry as any).descriptors.get('omniroute-local'),
      state: 'READY',
    })

    const events: any[] = []

    const plan: RunPlan = {
      runId: 'run-gateway-failure-only',
      goal: 'Test gateway failure handling',
      repository: repoDir,
      baseBranch: 'main',
      tasks: [
        {
          id: 'T1',
          title: 'Must fail cleanly on gateway unhealthy',
          objective: 'Test failure boundary',
          inferenceRoute: {
            transportPreference: 'GATEWAY',
            requestedGatewayId: 'omniroute-local',
            fallbackPolicy: 'GATEWAY_ONLY',
          },
        },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run-gateway-failure-only',
      plan,
      repositoryRoot: repoDir,
      baseBranch: 'main',
      runtimeRoot,
      harness,
      gatewayRegistry: registry,
      onEvent: (e) => events.push(e),
    })

    const result = await scheduler.execute()
    expect(result.status).toBe('FAILED')

    const task = result.tasks.find((t) => t.id === 'T1')
    expect(task?.state).toBe('FAILED')
    expect(task?.failureReason).toContain('GATEWAY_ROUTE_FAILED: GATEWAY_UNHEALTHY')

    const gatewayFailedEvent = events.find((e) => e.type === 'GATEWAY_ROUTE_FAILED')
    expect(gatewayFailedEvent).toBeDefined()
    expect(gatewayFailedEvent.payload.reason).toBe('GATEWAY_UNHEALTHY')
  })

  it('Gateway Fallback with GATEWAY_WITH_DIRECT_FALLBACK — falls back to DIRECT cleanly and records provenance', async () => {
    const repoDir = await createGitRepo()
    const runtimeRoot = join(tmpdir(), `gravitas-rt-${Date.now()}`)
    const harness = new MockRoutingHarness()
    const registry = new DefaultGatewayRegistry()
    const gateway = new MockGatewayInstance('omniroute-local', false) // Unhealthy
    registry.registerGateway(gateway, {
      id: 'omniroute-local',
      name: 'OmniRoute Local Gateway',
      version: '3.8.50',
    })
    ;(registry as any).descriptors.set('omniroute-local', {
      ...(registry as any).descriptors.get('omniroute-local'),
      state: 'READY',
    })

    const events: any[] = []

    const plan: RunPlan = {
      runId: 'run-gateway-with-fallback',
      goal: 'Test gateway fallback handling',
      repository: repoDir,
      baseBranch: 'main',
      tasks: [
        {
          id: 'T1',
          title: 'Must fallback to direct when gateway unhealthy',
          objective: 'Test fallback path',
          requiresApproval: false,
          inferenceRoute: {
            transportPreference: 'GATEWAY',
            requestedGatewayId: 'omniroute-local',
            fallbackPolicy: 'GATEWAY_WITH_DIRECT_FALLBACK',
          },
        },
      ],
    }

    const scheduler = new BoundedScheduler({
      runId: 'run-gateway-with-fallback',
      plan,
      repositoryRoot: repoDir,
      baseBranch: 'main',
      runtimeRoot,
      harness,
      gatewayRegistry: registry,
      onEvent: (e) => events.push(e),
    })

    const result = await scheduler.execute()
    expect(result.status).toBe('COMPLETED')

    const routeSelected = events.find((e) => e.type === 'ROUTE_SELECTED')
    expect(routeSelected).toBeDefined()
    expect(routeSelected.payload.transport).toBe('DIRECT')
    expect(routeSelected.payload.reason).toBe('DIRECT_FALLBACK_ALLOWED')
    expect(routeSelected.payload.transportFallbackOccurred).toBe(true)

    const fallbackEvent = events.find((e) => e.type === 'TRANSPORT_FALLBACK_OCCURRED')
    expect(fallbackEvent).toBeDefined()
    expect(fallbackEvent.payload.fallbackTransport).toBe('DIRECT')
  })
})
