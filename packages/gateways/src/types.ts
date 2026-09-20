/**
 * Gravitas — Gateway Domain Types
 *
 * Distinct authority layer for external model transport and provider failover.
 * Inference gateways transport requests; Gravitas governs tasks, worktrees, and verification.
 */

import { z } from 'zod';

export type GatewayQualificationState = 'UNQUALIFIED' | 'READY' | 'DEGRADED' | 'DISABLED';

export interface GatewayDescriptor {
  readonly id: string;
  readonly name: string;
  readonly state: GatewayQualificationState;
  readonly version?: string | undefined;
  readonly baseUrl: string;
  readonly securityProfile: string;
  readonly configurationDigest?: string | undefined;
  readonly qualifiedAt?: string | undefined;
  readonly qualificationDecision?: 'APPROVED' | 'REJECTED' | undefined;
  readonly qualificationMode?: 'DRY' | 'REAL' | undefined;
}

export interface GatewayHealth {
  readonly isHealthy: boolean;
  readonly status: 'HEALTHY' | 'UNHEALTHY' | 'DEGRADED';
  readonly message?: string | undefined;
  readonly latencyMs?: number | undefined;
  readonly details?: Record<string, unknown> | undefined;
}

export interface GatewayModel {
  readonly id: string;
  readonly name?: string | undefined;
  readonly provider?: string | undefined;
  readonly contextWindow?: number | null | undefined;
  readonly isAvailable: boolean;
  readonly capabilities?: {
    readonly tools?: boolean | undefined;
    readonly vision?: boolean | undefined;
    readonly streaming?: boolean | undefined;
  } | undefined;
}

export interface GatewayRequest {
  readonly body: Record<string, unknown>;
  readonly headers?: Record<string, string> | undefined;
  readonly path?: string | undefined;
  readonly method?: 'POST' | 'GET' | undefined;
}

export interface GatewayRouteOptions {
  readonly model?: string | undefined;
  readonly timeoutMs?: number | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly headers?: Record<string, string> | undefined;
}

export interface GatewayResponse {
  readonly status: number;
  readonly body: Record<string, unknown>;
  readonly headers: Record<string, string>;
  readonly gatewayId: string;
  readonly requestedModel?: string | undefined;
  readonly actualModel?: string | undefined;
  readonly actualProvider?: string | undefined;
  readonly fallbackOccurred: boolean;
  readonly requestId?: string | undefined;
  readonly latencyMs: number;
  readonly terminationReason: 'COMPLETED' | 'ERROR' | 'TIMED_OUT' | 'CANCELLED';
  readonly error?: {
    readonly message: string;
    readonly type?: string | undefined;
    readonly code?: string | undefined;
    readonly retryable?: boolean | undefined;
  } | undefined;
}

export interface GatewayRouteObservation {
  readonly timestamp: string;
  readonly gatewayId: string;
  readonly requestedModel?: string | undefined;
  readonly actualModel?: string | undefined;
  readonly actualProvider?: string | undefined;
  readonly fallbackOccurred: boolean;
  readonly latencyMs: number;
  readonly status: number;
  readonly terminationReason: 'COMPLETED' | 'ERROR' | 'TIMED_OUT' | 'CANCELLED';
}

export interface InferenceGateway {
  readonly id: string;
  health(signal?: AbortSignal): Promise<GatewayHealth>;
  listModels(signal?: AbortSignal): Promise<GatewayModel[]>;
  route(request: GatewayRequest, options?: GatewayRouteOptions): Promise<GatewayResponse>;
}

export const GATEWAY_QUALIFICATION_SCHEMA_VERSION = '1.0.0';
export const GATEWAY_SECURITY_PROFILE_VERSION = 'wave11.2-isolated';

export const GatewayQualificationEvidenceSchema = z.object({
  schemaVersion: z.enum(['1.0.0', 'v1']),
  qualificationMode: z.enum(['DRY', 'REAL']),
  gatewayId: z.string().min(1),
  gatewayVersion: z.string().min(1),
  gatewayCommit: z.string().optional(),
  securityProfile: z.literal(GATEWAY_SECURITY_PROFILE_VERSION),
  adapterSecurityProfile: z.string().optional(),
  policyVersion: z.string().optional(),
  qualifiedAt: z.string().datetime(),
  decision: z.enum(['APPROVED', 'REJECTED']),
  experimentsPassed: z.number().int().nonnegative(),
  experimentsTotal: z.number().int().positive(),
  transparentModeDigest: z.string().min(1),
  configurationDigest: z.string().optional(),
  boundAddress: z.string().min(1),
  runtimeExecutable: z.string().optional(),
  runtimeIdentity: z.string().optional(),
  experiments: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      passed: z.boolean(),
      durationMs: z.number().nonnegative(),
      details: z.record(z.string(), z.unknown()).optional(),
      error: z.string().optional(),
    })
  ),
  userConfigHashesBefore: z.record(z.string(), z.string()),
  userConfigHashesAfter: z.record(z.string(), z.string()),
  configIntegrityMaintained: z.boolean(),
  tproxyRemainedInactive: z.boolean(),
  canarySecretsRedacted: z.boolean(),
});

export type GatewayQualificationEvidence = z.infer<typeof GatewayQualificationEvidenceSchema>;

// ─── Route Contracts (Wave 11.3) ──────────────────────────────────────────────

export type InferenceTransport = 'DIRECT' | 'GATEWAY';

export type InferenceRouteReason =
  | 'DIRECT_DEFAULT'
  | 'DIRECT_REQUIRED'
  | 'GATEWAY_EXPLICIT'
  | 'GATEWAY_REQUIRED_PROVIDER'
  | 'GATEWAY_UNQUALIFIED'
  | 'GATEWAY_UNHEALTHY'
  | 'GATEWAY_INCOMPATIBLE'
  | 'DIRECT_FALLBACK_ALLOWED'
  | 'NO_VALID_ROUTE';

export type InferenceFallbackPolicy = 'GATEWAY_ONLY' | 'GATEWAY_WITH_DIRECT_FALLBACK';

export interface InferenceRouteRequirement {
  readonly transportPreference?: InferenceTransport | undefined;
  readonly gatewayAllowlist?: readonly string[] | undefined;
  readonly gatewayDenylist?: readonly string[] | undefined;
  readonly providerAllowlist?: readonly string[] | undefined;
  readonly modelAllowlist?: readonly string[] | undefined;
  readonly requireFallback?: boolean | undefined;
  readonly requireProviderProvenance?: boolean | undefined;
  readonly fallbackPolicy?: InferenceFallbackPolicy | undefined;
  readonly requestedGatewayId?: string | undefined;
  readonly requestedProvider?: string | undefined;
  readonly requestedModel?: string | undefined;
  readonly workerProtocol?: string | undefined;
}

export interface ResolvedInferenceRoute {
  readonly workerId: string;
  readonly workerQualificationIdentity: string;
  readonly transport: InferenceTransport;
  readonly gatewayId?: string | undefined;
  readonly gatewayBaseUrl?: string | undefined;
  readonly gatewayQualificationIdentity?: string | undefined;
  readonly requestedProvider?: string | undefined;
  readonly requestedModel?: string | undefined;
  readonly actualProvider?: string | undefined;
  readonly actualModel?: string | undefined;
  readonly reason: InferenceRouteReason;
  readonly fallbackPolicy: InferenceFallbackPolicy;
  readonly routePolicyVersion: string;
  readonly providerFallbackOccurred?: boolean | undefined;
  readonly transportFallbackOccurred?: boolean | undefined;
}
