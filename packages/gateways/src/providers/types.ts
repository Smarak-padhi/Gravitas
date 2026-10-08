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

export interface K3DispatchCapabilityGrant {
  readonly grantId: string;
  readonly subjectId: string;
  readonly workSessionId: string;
  readonly runId: string;
  readonly taskId: string;
  readonly grantedCapabilities: readonly string[];
  readonly authorizedToolIds: readonly string[];
  readonly resourceScope: {
    readonly allowedPaths?: readonly string[] | undefined;
    readonly allowedOrigins?: readonly string[] | undefined;
    readonly allowedOperations?: readonly string[] | undefined;
  };
  readonly authorityCeiling: string;
  readonly costCeiling: string;
  readonly expiresAt: string;
  readonly status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  readonly credentialReferences?: readonly string[] | undefined;
}

export interface ProviderInferenceRequest {
  readonly model: string;
  readonly messages: readonly ProviderChatMessage[];
  readonly maxTokens?: number | undefined;
  readonly temperature?: number | undefined;
  readonly stream?: boolean | undefined;
  readonly credentialRef?: string | undefined;
  readonly customHeaders?: Record<string, string> | undefined;
  readonly capabilityGrant?: K3DispatchCapabilityGrant | undefined;
}

export type ProviderErrorTaxonomy =
  | 'AUTH_REQUIRED'
  | 'CAPABILITY_GRANT_REQUIRED'
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
