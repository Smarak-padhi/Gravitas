import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SpecialistModelRouter, SPECIALIST_PERSONA_PROMPTS } from '../runtime/SpecialistModelRouter.js'
import { LocalOllamaAdapter } from '../providers/localOllama.js'
import { ModelCredentialBroker } from '../credentials/modelCredentialBroker.js'

describe('Gate 05.2: Specialist Model Router & Local Provider', () => {
  let broker: ModelCredentialBroker

  beforeEach(() => {
    broker = ModelCredentialBroker.getInstance()
    broker.clearAll()
  })

  afterEach(() => {
    broker.clearAll()
    vi.restoreAllMocks()
  })

  it('defines distinct persona prompt configurations for all 5 specialists', () => {
    const specialists = ['grav', 'ada', 'pixel', 'cipher', 'scout'] as const

    for (const id of specialists) {
      const config = SPECIALIST_PERSONA_PROMPTS[id]
      expect(config).toBeDefined()
      expect(config.specialistId).toBe(id)
      expect(config.systemPrompt).toContain(config.name)
      expect(config.maxTokens).toBeGreaterThanOrEqual(1000)
    }

    expect(SPECIALIST_PERSONA_PROMPTS.ada.mathEnabled).toBe(true)
  })

  it('falls back gracefully to high-quality deterministic responses when offline', async () => {
    const router = new SpecialistModelRouter({ localUrl: 'http://127.0.0.1:59999/v1' })

    const resGrav = await router.dispatchSpecialist('grav', 'Check my agenda for today')
    expect(resGrav.mode).toBe('OFFLINE_DETERMINISTIC')
    expect(resGrav.provider).toBe('deterministic-specialist')
    expect(resGrav.content).toContain('Grav')

    const resAda = await router.dispatchSpecialist('ada', 'Quiz me on Master Theorem')
    expect(resAda.mode).toBe('OFFLINE_DETERMINISTIC')
    expect(resAda.content).toContain('Master Theorem')
    expect(resAda.content).toContain('T(n)') // KaTeX math present

    const resPixel = await router.dispatchSpecialist('pixel', 'Audit design tokens')
    expect(resPixel.mode).toBe('OFFLINE_DETERMINISTIC')
    expect(resPixel.content).toContain('WCAG')

    const resCipher = await router.dispatchSpecialist('cipher', 'Check SQLite status')
    expect(resCipher.mode).toBe('OFFLINE_DETERMINISTIC')
    expect(resCipher.content).toContain('SQLite WAL')

    const resScout = await router.dispatchSpecialist('scout', 'Index study notes')
    expect(resScout.mode).toBe('OFFLINE_DETERMINISTIC')
    expect(resScout.content).toContain('indexed')
  })

  it('LocalOllamaAdapter reports unavailable and returns taxonomy error when endpoint is down', async () => {
    const adapter = new LocalOllamaAdapter({ baseUrl: 'http://127.0.0.1:59999/v1', timeoutMs: 300 })
    const isAvail = await adapter.isAvailable(300)
    expect(isAvail).toBe(false)

    const resp = await adapter.execute({
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'hello' }],
    })

    expect(resp.terminationStatus).toBe('ERROR')
    expect(resp.errorTaxonomy).toBe('PROVIDER_UNAVAILABLE')
  })

  it('LocalOllamaAdapter successfully parses OpenAI-compatible response when online', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Hello from local Ollama!',
          },
        },
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 6,
        total_tokens: 18,
      },
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as any)

    const adapter = new LocalOllamaAdapter({ baseUrl: 'http://127.0.0.1:11434/v1' })
    const resp = await adapter.execute({
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'hi' }],
    })

    expect(resp.terminationStatus).toBe('COMPLETED')
    expect(resp.outputContent).toBe('Hello from local Ollama!')
    expect(resp.tokenUsage?.totalTokens).toBe(18)
  })

  it('redacts registered secrets and bearer tokens from specialist responses', async () => {
    const secret = 'nvapi-99887766554433221100'
    broker.registerSecret('nvidia-nim', secret)

    const textWithSecret = `Connecting with Bearer ${secret} for authorization`
    const redacted = broker.redactSensitive(textWithSecret)

    expect(redacted).not.toContain(secret)
    expect(redacted).toContain('[REDACTED')
  })

  it('reports correct inference status for local vs cloud vs deterministic mode', async () => {
    const router = new SpecialistModelRouter({ localUrl: 'http://127.0.0.1:59999/v1' })
    const status = await router.getInferenceStatus()

    expect(status.localAvailable).toBe(false)
    expect(status.cloudAvailable).toBe(false)
    expect(status.activeMode).toBe('DETERMINISTIC_FALLBACK')
    expect(status.providerName).toBe('deterministic-specialist')
  })
})
