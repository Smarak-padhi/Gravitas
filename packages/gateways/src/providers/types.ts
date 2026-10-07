/**
 * Gravitas — Provider Adapter Interface & Normalization Contracts (Wave V1-B)
 *
 * Defines the contract implemented by LLM providers (e.g. NvidiaNimAdapter).
 */

import type { ProviderDescriptor } from '../models/types.js';

export interface ProviderChatMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface ProviderInferenceRequest {
  readonly model: string;
  readonly messages: readonly ProviderChatMessage[];
  readonly maxTokens?: number | undefined;
  readonly temperature?: number | undefined;
  readonly stream?: boolean | undefined;
  readonly credentialRef?: string | undefined;
  readonly customHeaders?: Record<string, string> | undefined;
}

export type ProviderErrorTaxonomy =
  | 'AUTH_REQUIRED'
  | 'COST_BLOCKED'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'MALFORMED_RESPONSE'
  | 'MODEL_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface ProviderInferenceResponse {
  readonly provider: string;
  readonly requestedModel: string;
  readonly actualModel: string;
  readonly requestId?: string | undefined;
  readonly latencyMs: number;
  readonly terminationStatus: 'COMPLETED' | 'ERROR' | 'TIMED_OUT' | 'CANCELLED';
  readonly outputContent?: string | undefined;
  readonly finishReason?: string | undefined;
  readonly tokenUsage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  } | undefined;
  readonly errorTaxonomy?: ProviderErrorTaxonomy | undefined;
  readonly errorMessage?: string | undefined;
  readonly transport: 'DIRECT' | 'GATEWAY';
  readonly fallbackStatus: boolean;
}

export interface ProviderAdapter {
  readonly providerId: string;
  readonly descriptor: ProviderDescriptor;

  execute(
    request: ProviderInferenceRequest,
    options?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<ProviderInferenceResponse>;

  health(signal?: AbortSignal): Promise<{
    isHealthy: boolean;
    status: 'AVAILABLE' | 'UNAVAILABLE' | 'AUTH_REQUIRED' | 'DEGRADED';
    message?: string;
  }>;
}
