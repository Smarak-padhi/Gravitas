/**
 * Prompt API Tests for @gravitas/server.
 *
 * Verifies:
 * - POST /api/v1/prompts/preview: valid compile, invalid request, no harness invocation
 * - GET /api/v1/runs/:runId/tasks/:taskId/prompt: 404 before execution, metadata after execution
 *
 * Zero AI calls.
 */

import { createServer, type Server } from 'node:http'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { InMemoryRegistry } from './registry.js'
import { EventHub } from './events.js'
import { RunService } from './service.js'
import { createRequestListener } from './app.js'

// ---------------------------------------------------------------------------
// Fake harness that records what prompt text it received
// ---------------------------------------------------------------------------

const ALWAYS_SUCCEED_SCRIPT = `
process.exitCode = 0
`

function makeFakeHarness(executeStub?: (req: any) => any) {
  let executeCallCount = 0
  let lastPromptReceived: string | undefined
  return {
    id: 'fake-harness-prompt-api',
    availability: async () => ({ status: 'AVAILABLE' as const, usableNoninteractive: true }),
    execute: async (req: any) => {
      executeCallCount++
      lastPromptReceived = req.compiledPrompt
      if (executeStub) return executeStub(req)
      return {
        executionId: req.executionId,
        exitCode: 0,
        terminationReason: 'COMPLETED',
        durationMs: 50,
        stdout: 'done',
        stderr: '',
      }
    },
    cancel: async () => {},
    getExecuteCallCount: () => executeCallCount,
    getLastPromptReceived: () => lastPromptReceived,
  }
}

// ---------------------------------------------------------------------------
// Test server helpers
// ---------------------------------------------------------------------------

async function startServer() {
  const registry = new InMemoryRegistry()
  const eventHub = new EventHub(registry)
  const harness = makeFakeHarness()
  const service = new RunService({
    registry,
    eventHub,
    harness,
    defaultRepository: '/repos/gravitas-test',
  })
  const listener = createRequestListener({ service, eventHub })
  const server = createServer(listener)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const addr = server.address() as { port: number }
  const baseUrl = `http://127.0.0.1:${addr.port}`
  return { server, service, registry, harness, baseUrl }
}

async function stopServer(server: Server) {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  )
}

// ---------------------------------------------------------------------------
// POST /api/v1/prompts/preview
// ---------------------------------------------------------------------------

describe('POST /api/v1/prompts/preview', () => {
  let ctx: Awaited<ReturnType<typeof startServer>>

  beforeEach(async () => {
    ctx = await startServer()
  })

  afterEach(async () => {
    await stopServer(ctx.server)
  })

  it('returns 404 for unknown runId', async () => {
    const res = await fetch(`${ctx.baseUrl}/api/v1/prompts/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: 'nonexistent', taskId: 'also-nonexistent' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 when runId/taskId are missing', async () => {
    const res = await fetch(`${ctx.baseUrl}/api/v1/prompts/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as any
    expect(body.error.code).toBe('INVALID_PREVIEW_REQUEST')
  })

  it('returns compiled prompt preview with hash, byteLength, layers for valid run/task', async () => {
    // Create a run
    const createRes = await fetch(`${ctx.baseUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: 'Add input validation to the API handler',
        acceptanceCriteria: [{ description: 'Validated inputs reject bad data' }],
        requiredEvidence: [{ type: 'GIT_DIFF', description: 'Non-empty diff', mandatory: true }],
        projectContext: {
          projectName: 'Gravitas',
          projectSummary: 'Local-first multi-agent command center',
        },
      }),
    })
    expect(createRes.status).toBe(201)
    const created = await createRes.json() as any
    const { runId } = created
    const taskId = created.tasks[0].id

    // Preview the prompt
    const previewRes = await fetch(`${ctx.baseUrl}/api/v1/prompts/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, taskId }),
    })
    expect(previewRes.status).toBe(200)
    const preview = await previewRes.json() as any

    // Core fields
    expect(preview.compiledPrompt).toBeTypeOf('string')
    expect(preview.compiledPrompt.length).toBeGreaterThan(100)
    expect(preview.byteLength).toBeGreaterThan(0)
    expect(preview.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(preview.compilerVersion).toBe('1')
    expect(preview.globalPolicyVersion).toBe('1')
    expect(preview.roleTemplateVersion).toBe('1')
    expect(preview.compiledAt).toBeTypeOf('string')

    // Layers
    expect(Array.isArray(preview.layers)).toBe(true)
    expect(preview.layers.length).toBe(6)
    const layerNames = preview.layers.map((l: any) => l.name)
    expect(layerNames).toContain('GLOBAL')
    expect(layerNames).toContain('PROJECT')
    expect(layerNames).toContain('EXECUTION_CONTRACT')
    expect(layerNames).toContain('TASK')
    expect(layerNames).toContain('AGENT_ROLE')
    expect(layerNames).toContain('RUNTIME_CONTEXT')

    // Goal and project context should appear in compiled prompt
    expect(preview.compiledPrompt).toContain('Add input validation to the API handler')
    expect(preview.compiledPrompt).toContain('Gravitas')

    // RUNTIME_CONTEXT not included (no runtimeContextOverride provided)
    expect(preview.runtimeContextIncluded).toBe(false)

    // Source classifications
    const globalLayer = preview.layers.find((l: any) => l.name === 'GLOBAL')
    const projectLayer = preview.layers.find((l: any) => l.name === 'PROJECT')
    expect(globalLayer?.source).toBe('MANAGED_POLICY')
    expect(projectLayer?.source).toBe('PROJECT_INPUT')
  })

  it('does NOT invoke the worker harness during preview', async () => {
    const createRes = await fetch(`${ctx.baseUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: 'Preview only test',
        acceptanceCriteria: [{ description: 'Preview test criterion' }],
        requiredEvidence: [{ type: 'GIT_DIFF', description: 'Diff', mandatory: true }],
      }),
    })
    const created = await createRes.json() as any

    await fetch(`${ctx.baseUrl}/api/v1/prompts/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: created.runId, taskId: created.tasks[0].id }),
    })

    // Harness must NOT have been called
    expect(ctx.harness.getExecuteCallCount()).toBe(0)
  })

  it('supports 405 on wrong method', async () => {
    const res = await fetch(`${ctx.baseUrl}/api/v1/prompts/preview`, { method: 'GET' })
    expect(res.status).toBe(405)
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/runs/:runId/tasks/:taskId/prompt
// ---------------------------------------------------------------------------

describe('GET /api/v1/runs/:runId/tasks/:taskId/prompt', () => {
  let ctx: Awaited<ReturnType<typeof startServer>>

  beforeEach(async () => {
    ctx = await startServer()
  })

  afterEach(async () => {
    await stopServer(ctx.server)
  })

  it('returns compiled: false before task has been executed', async () => {
    const createRes = await fetch(`${ctx.baseUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: 'Prompt retrieval test',
        acceptanceCriteria: [{ description: 'Retrieval test criterion' }],
        requiredEvidence: [{ type: 'GIT_DIFF', description: 'Diff', mandatory: true }],
      }),
    })
    const created = await createRes.json() as any
    const { runId } = created
    const taskId = created.tasks[0].id

    const res = await fetch(`${ctx.baseUrl}/api/v1/runs/${runId}/tasks/${taskId}/prompt`)
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.compiled).toBe(false)
    expect(body.prompt).toBeUndefined()
  })

  it('returns 404 for unknown runId', async () => {
    const res = await fetch(`${ctx.baseUrl}/api/v1/runs/nonexistent/tasks/also-nonexistent/prompt`)
    expect(res.status).toBe(404)
  })

  it('returns 404 for unknown taskId', async () => {
    const createRes = await fetch(`${ctx.baseUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: 'Task ID test',
        acceptanceCriteria: [{ description: 'Task ID criterion' }],
        requiredEvidence: [{ type: 'GIT_DIFF', description: 'Diff', mandatory: true }],
      }),
    })
    const created = await createRes.json() as any

    const res = await fetch(
      `${ctx.baseUrl}/api/v1/runs/${created.runId}/tasks/unknown-task-id/prompt`
    )
    expect(res.status).toBe(404)
  })
})
