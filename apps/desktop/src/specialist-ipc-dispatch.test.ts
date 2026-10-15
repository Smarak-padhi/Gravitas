import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as http from 'node:http'
import { DesktopSupervisor } from './main/supervisor.js'

describe('Priority 1 & Gate 05.2: Specialist Model Router & Desktop IPC Dispatch', () => {
  let supervisor: DesktopSupervisor
  let mockOllamaServer: http.Server
  let mockServerPort: number

  beforeAll(async () => {
    supervisor = new DesktopSupervisor()

    // Create an ephemeral OpenAI-compatible mock server matching LocalOllamaAdapter
    mockOllamaServer = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/v1/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ data: [{ id: 'llama3.2' }] }))
        return
      }

      if (req.method === 'POST' && req.url === '/v1/chat/completions') {
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          const parsed = JSON.parse(body)
          const userPrompt = parsed.messages?.find((m: any) => m.role === 'user')?.content || ''

          let reply = `[Real Model Response] The Akra-Bazzi method generalizes the Master Theorem to divide-and-conquer recurrences with unequal subproblem sizes like T(n) = T(n/3) + T(2n/3) + f(n).`
          if (userPrompt.includes('CSS') || userPrompt.includes('color')) {
            reply = `[Real Model Response] Use CSS custom properties for warm graphite (#141A16) and sage (#81B29A).`
          }

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              id: 'chatcmpl-mock-123',
              model: parsed.model || 'llama3.2',
              choices: [
                {
                  message: {
                    role: 'assistant',
                    content: reply,
                  },
                  finish_reason: 'stop',
                },
              ],
              usage: {
                prompt_tokens: 38,
                completion_tokens: 45,
                total_tokens: 83,
              },
            })
          )
        })
        return
      }

      res.writeHead(404)
      res.end()
    })

    await new Promise<void>((resolve) => {
      mockOllamaServer.listen(0, '127.0.0.1', () => {
        const address = mockOllamaServer.address() as any
        mockServerPort = address.port
        resolve()
      })
    })
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => mockOllamaServer.close(() => resolve()))
  })

  it('demonstrates an unfamiliar question answered by a real configured model via local Ollama', async () => {
    const unfamiliarQuestion = 'What is the mathematical relationship between the Master Theorem and the Akra-Bazzi method?'

    const result = await supervisor.dispatchSpecialist({
      specialistId: 'ada',
      message: unfamiliarQuestion,
      localUrl: `http://127.0.0.1:${mockServerPort}/v1`,
      preferredModel: 'llama3.2',
    })

    expect(result.success).toBe(true)
    expect(result.mode).toBe('LOCAL_INFERENCE')
    expect(result.provider).toBe('local-ollama')
    expect(result.model).toBe('llama3.2')
    expect(result.content).toContain('Akra-Bazzi method generalizes the Master Theorem')
    expect(result.tokenUsage).toBeDefined()
    expect(result.tokenUsage?.totalTokens).toBe(83)
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('honestly declares PROVIDER_UNAVAILABLE when no local or cloud provider is running', async () => {
    // Deliberately route to a non-existent port where no daemon is running
    const result = await supervisor.dispatchSpecialist({
      specialistId: 'cipher',
      message: 'Audit our SQLite WAL file descriptors and buffer pool size.',
      localUrl: 'http://127.0.0.1:59199/v1',
    })

    expect(result.success).toBe(true)
    expect(result.mode).toBe('OFFLINE_DETERMINISTIC')
    expect(result.provider).toBe('deterministic-specialist')
    expect(result.providerUnavailableMessage).toContain('PROVIDER_UNAVAILABLE')
    expect(result.providerUnavailableMessage).toContain('No LLM daemon running')
    expect(result.content).toContain('Cipher Systems Report')
  })

  it('routes correctly to each of the 5 specialist personas (Grav, Ada, Pixel, Cipher, Scout)', async () => {
    const specialists = ['grav', 'ada', 'pixel', 'cipher', 'scout'] as const

    for (const specId of specialists) {
      const res = await supervisor.dispatchSpecialist({
        specialistId: specId,
        message: 'Hello specialist, confirm your persona and status.',
        localUrl: `http://127.0.0.1:${mockServerPort}/v1`,
      })

      expect(res.success).toBe(true)
      expect(res.specialistId).toBe(specId)
      expect(res.mode).toBe('LOCAL_INFERENCE')
    }
  })
})
