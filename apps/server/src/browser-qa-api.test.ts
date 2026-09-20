import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { BrowserQaResult, ExecutionContract, Run, Task } from '@gravitas/core'
import type { AgentHarness } from '@gravitas/harnesses'
import { EventHub } from './events.js'
import { InMemoryRegistry } from './registry.js'
import { GravitasServer } from './server.js'
import { RunService } from './service.js'

describe('Server Browser QA & Agent Registry API Endpoints', () => {
  let server: GravitasServer
  let baseUrl: string
  let registry: InMemoryRegistry

  const mockHarness: AgentHarness = {
    id: 'mock_harness',
    name: 'Mock Harness',
    role: 'IMPLEMENTER',
    availability: async () => ({ isReady: true }),
    execute: async () => ({
      executionId: 'exec_1',
      harnessId: 'mock_harness',
      exitCode: 0,
      terminationReason: 'NORMAL',
      durationMs: 10,
      stdout: '',
      stderr: '',
    }),
  }

  beforeAll(async () => {
    registry = new InMemoryRegistry()
    const eventHub = new EventHub()
    const service = new RunService({
      registry,
      eventHub,
      harness: mockHarness,
    })

    server = new GravitasServer({ service, eventHub })
    const info = await server.start({ port: 0 })
    baseUrl = info.url
  })

  afterAll(async () => {
    if (server) {
      await server.stop()
    }
  })

  it('GET /api/v1/agents returns canonical agent descriptors', async () => {
    const res = await fetch(`${baseUrl}/api/v1/agents`)
    expect(res.status).toBe(200)

    const agents = (await res.json()) as any[]
    expect(Array.isArray(agents)).toBe(true)
    expect(agents.length).toBeGreaterThanOrEqual(4)

    const codex = agents.find((a) => a.id === 'codex-worker')
    expect(codex).toBeDefined()
    expect(codex.qualificationStatus).toBe('UNQUALIFIED')
    expect(codex.isProductionQualified).toBe(false)

    const browserQa = agents.find((a) => a.id === 'playwright-browser-qa')
    expect(browserQa).toBeDefined()
    expect(browserQa.qualificationStatus).toBe('READY')
    expect(browserQa.provider).toBe('playwright-qa')
  })

  it('GET /api/v1/capabilities returns canonical capability vocabulary', async () => {
    const res = await fetch(`${baseUrl}/api/v1/capabilities`)
    expect(res.status).toBe(200)

    const caps = (await res.json()) as any[]
    expect(Array.isArray(caps)).toBe(true)
    expect(caps.some((c) => c.id === 'browser.navigate')).toBe(true)
    expect(caps.some((c) => c.id === 'filesystem.read')).toBe(true)
    expect(caps.some((c) => c.id === 'verifier.deterministic')).toBe(true)
  })

  it('GET /api/v1/runs/:runId/tasks/:taskId/browser-qa returns 404 for nonexistent task', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs/run_fake/tasks/task_fake/browser-qa`)
    expect(res.status).toBe(404)
    const body = (await res.json()) as any
    expect(body.error.code).toBe('RUN_NOT_FOUND')
  })

  it('GET /api/v1/runs/:runId/tasks/:taskId/browser-qa returns verified BrowserQaResult', async () => {
    // Populate run and task
    const sampleRun: Run = {
      id: 'run_qa_api_1',
      goal: 'API Test',
      status: 'WAITING_APPROVAL',
      contractId: 'contract_1',
      taskIds: ['task_qa_1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const sampleTask: Task = {
      id: 'task_qa_1',
      runId: 'run_qa_api_1',
      title: 'UI Verification',
      objective: 'Verify UI',
      state: 'WAITING_APPROVAL',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const mockQaResult: BrowserQaResult = {
      taskId: 'task_qa_1',
      contractId: 'qa_contract_1',
      status: 'PASSED',
      durationMs: 342,
      steps: [
        {
          stepIndex: 1,
          action: { type: 'navigate', url: 'http://127.0.0.1:5173/' },
          status: 'PASSED',
          durationMs: 120,
        },
      ],
      observations: {
        consoleErrors: [],
        pageErrors: [],
        failedRequests: [],
      },
      screenshots: [
        {
          name: 'step1.png',
          path: '/evidence/step1.png',
        },
      ],
      timestamp: new Date().toISOString(),
    }

    registry.addRun(sampleRun)
    registry.addTask(sampleTask)
    registry.setBrowserQaResult('task_qa_1', mockQaResult)

    const res = await fetch(`${baseUrl}/api/v1/runs/run_qa_api_1/tasks/task_qa_1/browser-qa`)
    expect(res.status).toBe(200)

    const body = (await res.json()) as BrowserQaResult
    expect(body.taskId).toBe('task_qa_1')
    expect(body.status).toBe('PASSED')
    expect(body.steps).toHaveLength(1)
    expect(body.screenshots).toHaveLength(1)
  })
})
