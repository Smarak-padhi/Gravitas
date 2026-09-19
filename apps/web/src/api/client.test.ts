import { describe, expect, it, vi, beforeEach } from 'vitest'
import { api, GravitasApiError } from './client.js'

describe('API Client (client.test.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches health successfully', async () => {
    const mockHealth = { status: 'ok', service: 'gravitas', version: '0.0.1', timestamp: '2026-09-20T00:00:00Z' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockHealth), { status: 200 }))

    const result = await api.getHealth()
    expect(result).toEqual(mockHealth)
  })

  it('fetches state summary and truthful harness status', async () => {
    const mockState = {
      service: 'gravitas',
      version: '0.0.1',
      runs: [],
      tasks: [],
      harness: { id: 'free-claude-code', status: 'AVAILABLE' },
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockState), { status: 200 }))

    const result = await api.getState()
    expect(result.harness.id).toBe('free-claude-code')
    expect(result.harness.status).toBe('AVAILABLE')
    expect(result.runs).toHaveLength(0)
  })

  it('fetches evidence diff safely', async () => {
    const mockDiff = { runId: 'run_123', taskId: 'task_123', diff: '--- a/src/math.js\n+++ b/src/math.js\n@@ -1 +1 @@\n-0\n+return a + b;' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockDiff), { status: 200 }))

    const result = await api.getEvidenceDiff('run_123', 'task_123')
    expect(result.diff).toContain('return a + b;')
  })

  it('throws GravitasApiError on error responses with requestId', async () => {
    const errorPayload = {
      error: {
        code: 'TASK_NOT_APPROVABLE',
        message: 'Task is not in WAITING_APPROVAL state',
        requestId: 'req_test_123',
      },
    }
    const mockFetch = vi.fn().mockImplementation(async () => {
      return new Response(JSON.stringify(errorPayload), {
        status: 409,
        headers: { 'X-Gravitas-Request-Id': 'req_test_123' },
      })
    })
    vi.spyOn(globalThis, 'fetch').mockImplementation(mockFetch)

    await expect(api.approveTask('run_1', 'task_1')).rejects.toThrow(GravitasApiError)
    try {
      await api.approveTask('run_1', 'task_1')
    } catch (err) {
      expect(err).toBeInstanceOf(GravitasApiError)
      const apiErr = err as GravitasApiError
      expect(apiErr.statusCode).toBe(409)
      expect(apiErr.code).toBe('TASK_NOT_APPROVABLE')
    }
  })
})
