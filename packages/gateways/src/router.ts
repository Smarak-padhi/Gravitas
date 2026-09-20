/**
 * Gravitas — Deterministic Inference Router
 *
 * Resolves DIRECT vs GATEWAY transport without LLM involvement.
 * Enforces strict gateway qualification, protocol compatibility,
 * and explicit fallback boundaries.
 *
 * Core Invariant:
 * NO EXPLICIT GATEWAY REQUIREMENT -> DIRECT (Safe Default)
 */

import type { GatewayRegistry } from './registry.js';
import type {
  GatewayDescriptor,
  InferenceFallbackPolicy,
  InferenceRouteReason,
  InferenceRouteRequirement,
  ResolvedInferenceRoute,
} from './types.js';

export const ROUTE_POLICY_VERSION = '1.0.0';

export interface RouteResolutionInput {
  readonly workerId: string;
  readonly workerQualificationIdentity: string;
  readonly workerProtocol?: string | undefined;
  readonly requirement?: InferenceRouteRequirement | undefined;
  readonly checkHealth?: boolean | undefined;
  readonly healthTimeoutMs?: number | undefined;
}

export interface InferenceRouterOptions {
  readonly registry: GatewayRegistry;
  readonly defaultFallbackPolicy?: InferenceFallbackPolicy | undefined;
  readonly supportedProtocolsByGateway?: Record<string, readonly string[]> | undefined;
}

export const DEFAULT_GATEWAY_SUPPORTED_PROTOCOLS: Record<string, readonly string[]> = {
  'omniroute-local': ['openai_chat_completions', 'openai_models', 'openai_streaming'],
};

export class InferenceRouter {
  private readonly registry: GatewayRegistry;
  private readonly defaultFallbackPolicy: InferenceFallbackPolicy;
  private readonly supportedProtocols: Record<string, readonly string[]>;

  constructor(options: InferenceRouterOptions) {
    this.registry = options.registry;
    this.defaultFallbackPolicy = options.defaultFallbackPolicy ?? 'GATEWAY_ONLY';
    this.supportedProtocols = {
      ...DEFAULT_GATEWAY_SUPPORTED_PROTOCOLS,
      ...(options.supportedProtocolsByGateway ?? {}),
    };
  }

  /**
   * Evaluates protocol compatibility between a worker requirement and gateway capability.
   */
  public isProtocolCompatible(gatewayId: string, workerProtocol?: string): boolean {
    if (!workerProtocol) {
      // If worker specifies no protocol constraint, default compatible with standard gateways
      return true;
    }
    const gatewayProtocols = this.supportedProtocols[gatewayId] ?? ['openai_chat_completions'];
    return gatewayProtocols.includes(workerProtocol);
  }

  /**
   * Deterministically resolves inference route for a worker execution.
   */
  public async resolveRoute(input: RouteResolutionInput): Promise<ResolvedInferenceRoute> {
    const {
      workerId,
      workerQualificationIdentity,
      workerProtocol,
      requirement,
      checkHealth = true,
      healthTimeoutMs = 2000,
    } = input;

    const fallbackPolicy: InferenceFallbackPolicy =
      requirement?.fallbackPolicy ?? this.defaultFallbackPolicy;

    // 1. Safe Default: If no requirement or preference is DIRECT -> DIRECT
    if (!requirement || (!requirement.transportPreference && !requirement.requestedGatewayId && !requirement.requestedProvider)) {
      return {
        workerId,
        workerQualificationIdentity,
        transport: 'DIRECT',
        reason: 'DIRECT_DEFAULT',
        fallbackPolicy,
        routePolicyVersion: ROUTE_POLICY_VERSION,
      };
    }

    if (requirement.transportPreference === 'DIRECT') {
      return {
        workerId,
        workerQualificationIdentity,
        transport: 'DIRECT',
        reason: 'DIRECT_REQUIRED',
        fallbackPolicy,
        routePolicyVersion: ROUTE_POLICY_VERSION,
      };
    }

    // 2. Explicit GATEWAY resolution
    const targetGatewayId = requirement.requestedGatewayId ?? 'omniroute-local';

    const fallbackToDirect = (reason: InferenceRouteReason): ResolvedInferenceRoute => {
      if (fallbackPolicy === 'GATEWAY_WITH_DIRECT_FALLBACK') {
        return {
          workerId,
          workerQualificationIdentity,
          transport: 'DIRECT',
          reason: 'DIRECT_FALLBACK_ALLOWED',
          fallbackPolicy,
          routePolicyVersion: ROUTE_POLICY_VERSION,
          transportFallbackOccurred: true,
        };
      }
      return {
        workerId,
        workerQualificationIdentity,
        transport: 'GATEWAY',
        gatewayId: targetGatewayId,
        requestedProvider: requirement.requestedProvider,
        requestedModel: requirement.requestedModel,
        reason,
        fallbackPolicy,
        routePolicyVersion: ROUTE_POLICY_VERSION,
      };
    };

    // Check gateway denylist
    if (requirement.gatewayDenylist && requirement.gatewayDenylist.includes(targetGatewayId)) {
      return fallbackToDirect('NO_VALID_ROUTE');
    }

    // Check gateway allowlist
    if (requirement.gatewayAllowlist && !requirement.gatewayAllowlist.includes(targetGatewayId)) {
      return fallbackToDirect('NO_VALID_ROUTE');
    }

    // Check provider allowlist
    if (requirement.providerAllowlist && requirement.requestedProvider) {
      if (!requirement.providerAllowlist.includes(requirement.requestedProvider)) {
        return fallbackToDirect('NO_VALID_ROUTE');
      }
    }

    // Check model allowlist
    if (requirement.modelAllowlist && requirement.requestedModel) {
      if (!requirement.modelAllowlist.includes(requirement.requestedModel)) {
        return fallbackToDirect('NO_VALID_ROUTE');
      }
    }

    // Look up descriptor in registry
    const descriptor: GatewayDescriptor | undefined = this.registry.getDescriptor(targetGatewayId);
    if (!descriptor) {
      return fallbackToDirect('NO_VALID_ROUTE');
    }

    // Qualification check: must be READY
    if (descriptor.state !== 'READY') {
      return fallbackToDirect('GATEWAY_UNQUALIFIED');
    }

    // Protocol compatibility check
    if (!this.isProtocolCompatible(targetGatewayId, workerProtocol)) {
      return fallbackToDirect('GATEWAY_INCOMPATIBLE');
    }

    // Health check
    if (checkHealth) {
      const gateway = this.registry.getGateway(targetGatewayId);
      if (!gateway) {
        return fallbackToDirect('NO_VALID_ROUTE');
      }

      try {
        const controller = new AbortController();
        let timer: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error('Gateway health check timeout'));
          }, healthTimeoutMs);
        });

        const health = await Promise.race([
          gateway.health(controller.signal),
          timeoutPromise,
        ]);
        if (timer) clearTimeout(timer);

        if (!health.isHealthy) {
          return fallbackToDirect('GATEWAY_UNHEALTHY');
        }
      } catch {
        return fallbackToDirect('GATEWAY_UNHEALTHY');
      }
    }

    // All qualification and compatibility gates passed
    const reason: InferenceRouteReason = requirement.requestedProvider
      ? 'GATEWAY_REQUIRED_PROVIDER'
      : 'GATEWAY_EXPLICIT';

    return {
      workerId,
      workerQualificationIdentity,
      transport: 'GATEWAY',
      gatewayId: descriptor.id,
      gatewayBaseUrl: descriptor.baseUrl,
      gatewayQualificationIdentity: `${descriptor.id}@${descriptor.version ?? '3.8.50'}`,
      requestedProvider: requirement.requestedProvider,
      requestedModel: requirement.requestedModel,
      reason,
      fallbackPolicy,
      routePolicyVersion: ROUTE_POLICY_VERSION,
      transportFallbackOccurred: false,
    };
  }
}
