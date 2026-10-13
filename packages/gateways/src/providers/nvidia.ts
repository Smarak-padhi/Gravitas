/**
 * Gravitas — NVIDIA NIM Provider Adapter (Wave V1-B)
 *
 * Implements direct OpenAI-compatible inference with integrate.api.nvidia.com:
 * - Fixed allowlisted HTTPS endpoint
 * - SSRF containment
 * - Memory-isolated Bearer authentication
 * - Normalized response and error taxonomy
 * - Zero-dollar spend policy enforcement
 */

import { ModelCredentialBroker } from '../credentials/modelCredentialBroker.js';
import type { ModelDescriptor, ProviderDescriptor } from '../models/types.js';
import { assertAllowedProviderEndpoint, sanitizeProviderHeaders } from '../security/networkContainment.js';
import { verifyK3DispatchGrant } from '../security/k3DispatchEnforcement.js';
import type {
  ProviderAdapter,
  ProviderErrorTaxonomy,
  ProviderInferenceRequest,
  ProviderInferenceResponse,
} from './types.js';

export const NVIDIA_PROVIDER_ID = 'nvidia-nim';
export const NVIDIA_DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com';
export const NVIDIA_CHAT_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
export const NVIDIA_CATALOG_SNAPSHOT_VERSION = '2026.10-v1b-snapshot';

export function getNvidiaProviderDescriptor(): ProviderDescriptor {
  const hasAuth = ModelCredentialBroker.getInstance().getCredentialHandle(NVIDIA_PROVIDER_ID).isAvailable;
  return {
    id: NVIDIA_PROVIDER_ID,
    name: 'NVIDIA NIM (Hosted API)',
    baseUrl: NVIDIA_DEFAULT_BASE_URL,
    status: hasAuth ? 'AVAILABLE' : 'AUTH_REQUIRED',
    transportSupport: ['DIRECT'],
    authType: 'BEARER_TOKEN',
    credentialRef: `vault:cred:${NVIDIA_PROVIDER_ID}`,
  };
}

export const NVIDIA_PROVIDER_DESCRIPTOR: ProviderDescriptor = getNvidiaProviderDescriptor();

/**
 * Versioned catalog snapshot of NVIDIA NIM free developer-tier candidate models.
 * Backed by provider metadata provenance.
 */
export const NVIDIA_SEEDED_MODELS: readonly ModelDescriptor[] = [
  {
    id: 'meta/llama-3.1-8b-instruct',
    providerId: NVIDIA_PROVIDER_ID,
    displayName: 'Meta Llama 3.1 8B Instruct (NIM)',
    availability: 'UNAVAILABLE',
    qualificationState: 'METADATA_VALIDATED',
    modalities: ['TEXT', 'CODE'],
    toolSupport: true,
    streamingSupport: true,
    contextWindow: 131072,
    reasoningSupport: false,
    structuredOutputSupport: true,
    costClass: 'ZERO_DOLLAR_FREE',
    costKnowledge: {
      currency: 'USD',
      pricePer1kPrompt: 0,
      pricePer1kCompletion: 0,
      isFreeDeveloperTier: true,
    },
    privacyClass: 'COMMERCIAL_NO_TRAIN',
    source: 'NVIDIA_CATALOG',
    sourceVersion: NVIDIA_CATALOG_SNAPSHOT_VERSION,
  },
  {
    id: 'meta/llama-3.1-70b-instruct',
    providerId: NVIDIA_PROVIDER_ID,
    displayName: 'Meta Llama 3.1 70B Instruct (NIM)',
    availability: 'UNAVAILABLE',
    qualificationState: 'METADATA_VALIDATED',
    modalities: ['TEXT', 'CODE'],
    toolSupport: true,
    streamingSupport: true,
    contextWindow: 131072,
    reasoningSupport: true,
    structuredOutputSupport: true,
    costClass: 'ZERO_DOLLAR_FREE',
    costKnowledge: {
      currency: 'USD',
      pricePer1kPrompt: 0,
      pricePer1kCompletion: 0,
      isFreeDeveloperTier: true,
    },
    privacyClass: 'COMMERCIAL_NO_TRAIN',
    source: 'NVIDIA_CATALOG',
    sourceVersion: NVIDIA_CATALOG_SNAPSHOT_VERSION,
  },
  {
    id: 'mistralai/mixtral-8x7b-instruct-v0.1',
    providerId: NVIDIA_PROVIDER_ID,
    displayName: 'Mistral Mixtral 8x7B Instruct (NIM)',
    availability: 'UNAVAILABLE',
    qualificationState: 'METADATA_VALIDATED',
    modalities: ['TEXT', 'CODE'],
    toolSupport: true,
    streamingSupport: true,
    contextWindow: 32768,
    reasoningSupport: false,
    structuredOutputSupport: true,
    costClass: 'ZERO_DOLLAR_FREE',
    costKnowledge: {
      currency: 'USD',
      pricePer1kPrompt: 0,
      pricePer1kCompletion: 0,
      isFreeDeveloperTier: true,
    },
    privacyClass: 'COMMERCIAL_NO_TRAIN',
    source: 'NVIDIA_CATALOG',
    sourceVersion: NVIDIA_CATALOG_SNAPSHOT_VERSION,
  },
];

export interface NvidiaNimAdapterOptions {
  readonly baseUrl?: string | undefined;
  readonly credentialBroker?: ModelCredentialBroker | undefined;
  readonly fetchFn?: typeof fetch | undefined;
}

export class NvidiaNimAdapter implements ProviderAdapter {
  public readonly providerId = NVIDIA_PROVIDER_ID;
  public get descriptor(): ProviderDescriptor {
    return getNvidiaProviderDescriptor();
  }
  private readonly baseUrl: string;
  private readonly broker: ModelCredentialBroker;
  private readonly customFetch?: typeof fetch | undefined;

  public constructor(options?: NvidiaNimAdapterOptions) {
    this.baseUrl = options?.baseUrl ?? NVIDIA_DEFAULT_BASE_URL;
    this.broker = options?.credentialBroker ?? ModelCredentialBroker.getInstance();
    this.customFetch = options?.fetchFn;

    // Validate endpoint containment at initialization
    assertAllowedProviderEndpoint(this.providerId, this.baseUrl);
  }

  public async health(_signal?: AbortSignal): Promise<{
    isHealthy: boolean;
    status: 'AVAILABLE' | 'UNAVAILABLE' | 'AUTH_REQUIRED' | 'DEGRADED';
    message?: string;
  }> {
    const handle = this.broker.getCredentialHandle(this.providerId);
    if (!handle.isAvailable) {
      return {
        isHealthy: false,
        status: 'AUTH_REQUIRED',
        message: 'No NVIDIA API credentials configured in broker',
      };
    }
    return {
      isHealthy: true,
      status: 'AVAILABLE',
      message: 'NVIDIA NIM provider endpoint verified and credential present',
    };
  }

  public async execute(
    request: ProviderInferenceRequest,
    options?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<ProviderInferenceResponse> {
    const startTime = Date.now();
    const endpoint = `${this.baseUrl}/v1/chat/completions`;

    // 1. Strict Endpoint Containment Assertion
    assertAllowedProviderEndpoint(this.providerId, endpoint);

    // 2. K3 Dispatch-Time CapabilityGrant Verification
    const k3Check = verifyK3DispatchGrant({
      grant: request.capabilityGrant,
      expectedProvider: this.providerId,
      endpointUrl: endpoint,
      model: request.model,
      credentialRef: request.credentialRef ?? `vault:cred:${this.providerId}`,
    });

    if (!k3Check.authorized) {
      return {
        provider: this.providerId,
        requestedModel: request.model,
        actualModel: request.model,
        latencyMs: Date.now() - startTime,
        terminationStatus: 'ERROR',
        errorTaxonomy: 'CAPABILITY_GRANT_REQUIRED',
        errorMessage: `K3 dispatch authorization failed: ${k3Check.message}`,
        transport: 'DIRECT',
        fallbackStatus: false,
      };
    }

    // No production transport is enabled in this wave. Injection is trusted construction only.
    if (!this.customFetch) return {
      provider: this.providerId, requestedModel: request.model, actualModel: request.model,
      latencyMs: Date.now() - startTime, terminationStatus: 'ERROR',
      errorTaxonomy: 'CAPABILITY_GRANT_REQUIRED', errorMessage: 'Live NVIDIA egress is disabled',
      transport: 'DIRECT', fallbackStatus: false,
    };

    // 3. Resolve Credential Reference
    const credRef = request.credentialRef ?? `vault:cred:${this.providerId}`;
    const rawSecret = this.broker.resolveSecret(credRef);

    if (!rawSecret) {
      return {
        provider: this.providerId,
        requestedModel: request.model,
        actualModel: request.model,
        latencyMs: Date.now() - startTime,
        terminationStatus: 'ERROR',
        errorTaxonomy: 'AUTH_REQUIRED',
        errorMessage: `Credential resolution failed for ref '${credRef}'. Authentication required.`,
        transport: 'DIRECT',
        fallbackStatus: false,
      };
    }

    const redact = (text: string) => this.broker.redactSensitive(text.split(rawSecret).join('[REDACTED_SECRET]'));

    // 4. Prepare OpenAI-compatible payload
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      stream: false,
    };
    if (request.maxTokens !== undefined) body['max_tokens'] = request.maxTokens;
    if (request.temperature !== undefined) body['temperature'] = request.temperature;

    // 5. Sanitize and construct headers (no worker header override for auth or host)
    const sanitizedCustom = request.customHeaders ? sanitizeProviderHeaders(request.customHeaders) : {};
    const headers: Record<string, string> = {
      ...sanitizedCustom,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${rawSecret}`,
    };

    // 6. Setup timeout / cancellation signal
    const timeoutMs = options?.timeoutMs ?? 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort(options?.signal?.reason);
    if (options?.signal?.aborted) onAbort();

    const abortPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
    // Consume rejection even if the signal was already aborted before transport starts.
    void abortPromise.catch(() => {});
    const bounded = <T>(promise: Promise<T>): Promise<T> => Promise.race([promise, abortPromise]);
    let combinedSignal: AbortSignal = controller.signal;
    if (options?.signal) {
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    const fetchImpl = this.customFetch;

    try {
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const response = await bounded(fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: combinedSignal,
        redirect: 'error',
      }));

      const latencyMs = Date.now() - startTime;
      const rawText = await bounded(response.text());

      if (!response.ok) {
        const errorTaxonomy = this.classifyHttpStatus(response.status);
        const cleanMsg = redact(
          `NVIDIA NIM API HTTP ${response.status}: ${rawText.slice(0, 300)}`
        );
        return {
          provider: this.providerId,
          requestedModel: request.model,
          actualModel: request.model,
          latencyMs,
          terminationStatus: 'ERROR',
          errorTaxonomy,
          errorMessage: cleanMsg,
          transport: 'DIRECT',
          fallbackStatus: false,
        };
      }

      // Parse JSON response
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch (err) {
        return {
          provider: this.providerId,
          requestedModel: request.model,
          actualModel: request.model,
          latencyMs,
          terminationStatus: 'ERROR',
          errorTaxonomy: 'MALFORMED_RESPONSE',
          errorMessage: 'Failed to parse JSON response from provider',
          transport: 'DIRECT',
          fallbackStatus: false,
        };
      }

      if (!parsed || typeof parsed !== 'object' || typeof parsed.choices?.[0]?.message?.content !== 'string' || (parsed.model !== undefined && parsed.model !== request.model)) throw new SyntaxError('Malformed provider response');
      const choice = parsed.choices?.[0];
      const outputContent = choice?.message?.content ?? '';
      const finishReason = typeof choice?.finish_reason === 'string' ? redact(choice.finish_reason).slice(0, 100) : undefined;
      const actualModel = parsed.model ?? request.model;
      const requestId = typeof parsed.id === 'string' ? redact(parsed.id).slice(0, 200) : undefined;

      const tokenUsage = parsed.usage
        ? {
            promptTokens: parsed.usage.prompt_tokens ?? 0,
            completionTokens: parsed.usage.completion_tokens ?? 0,
            totalTokens: parsed.usage.total_tokens ?? 0,
          }
        : undefined;

      return {
        provider: this.providerId,
        requestedModel: request.model,
        actualModel,
        requestId,
        latencyMs,
        terminationStatus: 'COMPLETED',
        outputContent: redact(outputContent).slice(0, 65536),
        finishReason,
        tokenUsage,
        transport: 'DIRECT',
        fallbackStatus: false,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;

      if (controller.signal.aborted || err?.name === 'AbortError') {
        return {
          provider: this.providerId,
          requestedModel: request.model,
          actualModel: request.model,
          latencyMs,
          terminationStatus: options?.signal?.aborted ? 'CANCELLED' : 'TIMED_OUT',
          errorTaxonomy: options?.signal?.aborted ? 'CANCELLED' : 'TIMEOUT',
          errorMessage: `Request timed out after ${timeoutMs}ms`,
          transport: 'DIRECT',
          fallbackStatus: false,
        };
      }

      const cleanError = redact(err?.message ?? String(err));
      return {
        provider: this.providerId,
        requestedModel: request.model,
        actualModel: request.model,
        latencyMs,
        terminationStatus: 'ERROR',
        errorTaxonomy: err instanceof SyntaxError ? 'MALFORMED_RESPONSE' : 'NETWORK_ERROR',
        errorMessage: cleanError,
        transport: 'DIRECT',
        fallbackStatus: false,
      };
    } finally {
      clearTimeout(timeoutId);
      options?.signal?.removeEventListener('abort', onAbort);
    }
  }

  private classifyHttpStatus(status: number): ProviderErrorTaxonomy {
    if (status === 401 || status === 403) return 'AUTH_REQUIRED';
    if (status === 402) return 'COST_BLOCKED';
    if (status === 404) return 'MODEL_NOT_FOUND';
    if (status === 429) return 'RATE_LIMITED';
    if (status >= 500) return 'PROVIDER_UNAVAILABLE';
    return 'UNKNOWN';
  }
}
