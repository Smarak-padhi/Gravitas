/**
 * Gravitas — Local Ollama & LM Studio Provider Adapter (Phase 05)
 *
 * Implements local-first OpenAI-compatible REST inference for:
 * - Ollama (default http://127.0.0.1:11434/v1)
 * - LM Studio (default http://127.0.0.1:1234/v1)
 * - Any local OpenAI-compatible endpoint
 *
 * Strict single-owner local-first semantics:
 * - Graceful fallback on connection refused
 * - Zero external cloud leakage when running local models
 * - Short health-check timeouts to avoid blocking UI interactions
 */

import type {
  ProviderAdapter,
  ProviderInferenceRequest,
  ProviderInferenceResponse,
  ProviderErrorTaxonomy,
} from './types.js'
import type { ProviderDescriptor } from '../models/types.js'
import { ModelCredentialBroker } from '../credentials/modelCredentialBroker.js'

export const LOCAL_OLLAMA_PROVIDER_ID = 'local-ollama'
export const LOCAL_OLLAMA_DEFAULT_URL = 'http://127.0.0.1:11434/v1'

export interface LocalLlmConfig {
  readonly baseUrl?: string
  readonly defaultModel?: string
  readonly timeoutMs?: number
}

export class LocalOllamaAdapter implements ProviderAdapter {
  public readonly providerId = LOCAL_OLLAMA_PROVIDER_ID
  public readonly descriptor: ProviderDescriptor
  private readonly baseUrl: string
  private readonly defaultModel: string
  private readonly timeoutMs: number
  private readonly credentialBroker: ModelCredentialBroker

  public constructor(config: LocalLlmConfig = {}) {
    const rawUrl =
      config.baseUrl ||
      process.env['LOCAL_LLM_URL'] ||
      process.env['OLLAMA_HOST'] ||
      LOCAL_OLLAMA_DEFAULT_URL

    this.baseUrl = rawUrl.replace(/\/+$/, '')
    this.defaultModel =
      config.defaultModel || process.env['LOCAL_LLM_MODEL'] || 'llama3.2'
    this.timeoutMs = config.timeoutMs ?? 5000
    this.credentialBroker = ModelCredentialBroker.getInstance()

    this.descriptor = {
      id: this.providerId,
      name: 'Local Ollama / LM Studio',
      baseUrl: this.baseUrl,
      status: 'AVAILABLE',
      transportSupport: ['DIRECT'],
      authType: 'NONE',
    }
  }

  /**
   * Quick non-blocking probe to verify if local daemon is running.
   */
  public async health(signal?: AbortSignal): Promise<{
    isHealthy: boolean
    status: 'AVAILABLE' | 'UNAVAILABLE' | 'AUTH_REQUIRED' | 'DEGRADED'
    message?: string
  }> {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 1200)
      if (signal) {
        signal.addEventListener('abort', () => controller.abort(), { once: true })
      }

      const endpoint = `${this.baseUrl}/models`
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (res.ok) {
        return { isHealthy: true, status: 'AVAILABLE' }
      }
      return {
        isHealthy: false,
        status: 'DEGRADED',
        message: `Local daemon returned HTTP ${res.status}`,
      }
    } catch (err: any) {
      return {
        isHealthy: false,
        status: 'UNAVAILABLE',
        message: err?.message || 'Local endpoint unreachable',
      }
    }
  }

  public async isAvailable(probeTimeoutMs = 1200): Promise<boolean> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), probeTimeoutMs)
    const result = await this.health(controller.signal)
    clearTimeout(timer)
    return result.isHealthy
  }

  /**
   * Executes inference via local endpoint using standard OpenAI-compatible format.
   */
  public async execute(
    request: ProviderInferenceRequest,
    options?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<ProviderInferenceResponse> {
    const startTime = Date.now()
    const modelToUse = request.model || this.defaultModel
    const timeout = options?.timeoutMs ?? this.timeoutMs
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    try {
      const endpoint = `${this.baseUrl}/chat/completions`
      const payload = {
        model: modelToUse,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        stream: false,
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(request.customHeaders || {}),
      }

      if (request.credentialRef) {
        const rawSecret = this.credentialBroker.resolveSecret(request.credentialRef)
        if (rawSecret) {
          headers['Authorization'] = `Bearer ${rawSecret}`
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timer)

      const latencyMs = Date.now() - startTime

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        const sanitized = this.credentialBroker.redactSensitive(errorBody)
        const errorTaxonomy: ProviderErrorTaxonomy =
          response.status === 401 || response.status === 403
            ? 'AUTH_REQUIRED'
            : response.status === 404
            ? 'MODEL_NOT_FOUND'
            : response.status === 429
            ? 'RATE_LIMITED'
            : 'PROVIDER_UNAVAILABLE'

        return {
          provider: this.providerId,
          requestedModel: modelToUse,
          actualModel: modelToUse,
          latencyMs,
          terminationStatus: 'ERROR',
          errorTaxonomy,
          errorMessage: `Local LLM HTTP ${response.status}: ${sanitized}`,
          transport: 'DIRECT',
          fallbackStatus: false,
        }
      }

      const json = (await response.json()) as any
      const content =
        json?.choices?.[0]?.message?.content ||
        json?.choices?.[0]?.text ||
        ''

      return {
        provider: this.providerId,
        requestedModel: modelToUse,
        actualModel: json?.model || modelToUse,
        latencyMs,
        terminationStatus: 'COMPLETED',
        outputContent: content.trim(),
        tokenUsage: {
          promptTokens: json?.usage?.prompt_tokens ?? 0,
          completionTokens: json?.usage?.completion_tokens ?? 0,
          totalTokens: json?.usage?.total_tokens ?? 0,
        },
        transport: 'DIRECT',
        fallbackStatus: false,
      }
    } catch (err: any) {
      clearTimeout(timer)
      const latencyMs = Date.now() - startTime
      const isTimeout = err?.name === 'AbortError'
      const errorTaxonomy: ProviderErrorTaxonomy = isTimeout ? 'TIMEOUT' : 'PROVIDER_UNAVAILABLE'
      const sanitized = this.credentialBroker.redactSensitive(String(err?.message || err))

      return {
        provider: this.providerId,
        requestedModel: modelToUse,
        actualModel: modelToUse,
        latencyMs,
        terminationStatus: isTimeout ? 'TIMED_OUT' : 'ERROR',
        errorTaxonomy,
        errorMessage: isTimeout
          ? `Local LLM request timed out after ${timeout}ms`
          : `Local LLM unavailable: ${sanitized}`,
        transport: 'DIRECT',
        fallbackStatus: false,
      }
    }
  }
}
