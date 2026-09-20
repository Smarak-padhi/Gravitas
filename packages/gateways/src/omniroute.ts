/**
 * Gravitas — OmniRoute Isolated Gateway Adapter
 *
 * Implements InferenceGateway over loopback HTTP.
 * Enforces strict zero-transformation headers and robust provenance extraction.
 */

import type {
  InferenceGateway,
  GatewayHealth,
  GatewayModel,
  GatewayRequest,
  GatewayResponse,
  GatewayRouteOptions,
} from './types.js';

export interface OmniRouteAdapterConfig {
  readonly id?: string | undefined;
  readonly baseUrl: string;
  readonly defaultTimeoutMs?: number | undefined;
  readonly apiKey?: string | undefined;
}

export class OmniRouteAdapter implements InferenceGateway {
  readonly id: string;
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly apiKey?: string | undefined;

  constructor(config: OmniRouteAdapterConfig) {
    this.id = config.id ?? 'omniroute-local';
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 60000;
    this.apiKey = config.apiKey;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async health(signal?: AbortSignal): Promise<GatewayHealth> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const onParentAbort = () => controller.abort();
      if (signal) signal.addEventListener('abort', onParentAbort, { once: true });
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await fetch(`${this.baseUrl}/api/health`, {
          method: 'GET',
          headers: this.buildHeaders(),
          signal: controller.signal,
        });

        const latencyMs = Date.now() - startTime;
        if (!res.ok) {
          return {
            isHealthy: false,
            status: 'UNHEALTHY',
            message: `Health endpoint returned status ${res.status}`,
            latencyMs,
          };
        }

        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const statusVal = data['status'];
        return {
          isHealthy: true,
          status: 'HEALTHY',
          message: typeof statusVal === 'string' ? statusVal : 'OK',
          latencyMs,
          details: data,
        };
      } finally {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onParentAbort);
      }
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      return {
        isHealthy: false,
        status: 'UNHEALTHY',
        message: `Health check failed: ${message}`,
        latencyMs,
      };
    }
  }

  async listModels(signal?: AbortSignal): Promise<GatewayModel[]> {
    const controller = new AbortController();
    const onParentAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onParentAbort, { once: true });
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: controller.signal,
      });

      if (!res.ok) {
        return [];
      }

      const raw = (await res.json().catch(() => null)) as { data?: unknown } | null;
      if (!raw || typeof raw !== 'object' || !Array.isArray(raw['data'])) {
        return [];
      }

      const seen = new Set<string>();
      const models: GatewayModel[] = [];

      for (const item of raw['data'] as Array<Record<string, unknown>>) {
        if (!item || typeof item !== 'object') continue;
        const idVal = item['id'];
        const id = typeof idVal === 'string' ? idVal.trim() : '';
        if (!id || seen.has(id)) continue;
        seen.add(id);

        const nameVal = item['name'];
        const name = typeof nameVal === 'string' ? nameVal : undefined;
        const ownedVal = item['owned_by'];
        const provVal = item['provider'];
        const provider = typeof ownedVal === 'string' ? ownedVal : typeof provVal === 'string' ? provVal : undefined;
        const ctxVal = item['context_window'];
        const lenVal = item['context_length'];
        const contextWindow = typeof ctxVal === 'number' ? ctxVal : typeof lenVal === 'number' ? lenVal : null;
        const isAvailable = item['available'] !== false && item['isAvailable'] !== false;

        models.push({
          id,
          name,
          provider,
          contextWindow,
          isAvailable,
        });
      }

      return models;
    } catch {
      return [];
    } finally {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onParentAbort);
    }
  }

  async route(request: GatewayRequest, options?: GatewayRouteOptions): Promise<GatewayResponse> {
    const startTime = Date.now();
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const bodyModel = request.body['model'];
    const requestedModel =
      options?.model ??
      (typeof bodyModel === 'string' ? bodyModel : undefined);

    const controller = new AbortController();
    let timedOut = false;
    let cancelled = false;

    const onParentAbort = () => {
      cancelled = true;
      controller.abort();
    };

    if (options?.signal) {
      if (options.signal.aborted) {
        return {
          status: 499,
          body: {},
          headers: {},
          gatewayId: this.id,
          requestedModel,
          fallbackOccurred: false,
          latencyMs: 0,
          terminationReason: 'CANCELLED',
          error: { message: 'Request aborted before sending', code: 'ABORTED' },
        };
      }
      options.signal.addEventListener('abort', onParentAbort, { once: true });
    }

    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const path = request.path ?? '/v1/chat/completions';
    const method = request.method ?? 'POST';
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    const outgoingBody: Record<string, unknown> = {
      ...request.body,
    };
    if (requestedModel) {
      outgoingBody['model'] = requestedModel;
    }

    const headers = this.buildHeaders(request.headers, options?.headers);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };
      if (method === 'POST') {
        fetchOptions.body = JSON.stringify(outgoingBody);
      }

      const res = await fetch(url, fetchOptions);

      const latencyMs = Date.now() - startTime;
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      const rawText = await res.text();
      let responseBody: Record<string, unknown> = {};
      try {
        responseBody = JSON.parse(rawText);
      } catch {
        return {
          status: res.status,
          body: { rawText },
          headers: responseHeaders,
          gatewayId: this.id,
          requestedModel,
          fallbackOccurred: false,
          latencyMs,
          terminationReason: 'ERROR',
          error: {
            message: `Malformed JSON response from upstream gateway: ${rawText.slice(0, 200)}`,
            code: 'MALFORMED_RESPONSE',
            type: 'upstream_format_error',
          },
        };
      }

      const modelVal = responseBody['model'];
      const actualModel =
        typeof modelVal === 'string'
          ? modelVal
          : responseHeaders['x-omniroute-model'] ?? undefined;

      const ownedVal = responseBody['owned_by'];
      const actualProvider =
        responseHeaders['x-omniroute-provider'] ??
        responseHeaders['x-omniroute-routed-via'] ??
        (typeof ownedVal === 'string' ? ownedVal : undefined);

      const fallbackOccurred =
        responseHeaders['x-omniroute-fallback'] === 'true' ||
        (requestedModel && actualModel ? requestedModel !== actualModel : false);

      const idVal = responseBody['id'];
      const requestId =
        responseHeaders['x-request-id'] ??
        (typeof idVal === 'string' ? idVal : undefined);

      if (!res.ok) {
        const errorObj = responseBody['error'];
        const errorMsg =
          typeof errorObj === 'object' && errorObj && 'message' in errorObj
            ? String((errorObj as Record<string, unknown>)['message'])
            : `Upstream HTTP error ${res.status}`;

        const isQuota = res.status === 429 || errorMsg.includes('quota') || errorMsg.includes('rate limit');

        return {
          status: res.status,
          body: responseBody,
          headers: responseHeaders,
          gatewayId: this.id,
          requestedModel,
          actualModel,
          actualProvider,
          fallbackOccurred,
          requestId,
          latencyMs,
          terminationReason: 'ERROR',
          error: {
            message: errorMsg,
            type: isQuota ? 'quota_error' : 'server_error',
            code: isQuota ? 'QUOTA_EXHAUSTED' : `HTTP_${res.status}`,
            retryable: isQuota || res.status >= 500,
          },
        };
      }

      return {
        status: res.status,
        body: responseBody,
        headers: responseHeaders,
        gatewayId: this.id,
        requestedModel,
        actualModel,
        actualProvider,
        fallbackOccurred,
        requestId,
        latencyMs,
        terminationReason: 'COMPLETED',
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);

      if (timedOut) {
        return {
          status: 504,
          body: {},
          headers: {},
          gatewayId: this.id,
          requestedModel,
          fallbackOccurred: false,
          latencyMs,
          terminationReason: 'TIMED_OUT',
          error: { message: `Request timed out after ${timeoutMs}ms`, code: 'TIMED_OUT', retryable: true },
        };
      }

      if (cancelled) {
        return {
          status: 499,
          body: {},
          headers: {},
          gatewayId: this.id,
          requestedModel,
          fallbackOccurred: false,
          latencyMs,
          terminationReason: 'CANCELLED',
          error: { message: 'Request aborted by caller', code: 'CANCELLED' },
        };
      }

      return {
        status: 502,
        body: {},
        headers: {},
        gatewayId: this.id,
        requestedModel,
        fallbackOccurred: false,
        latencyMs,
        terminationReason: 'ERROR',
        error: { message: `Network error connecting to gateway: ${message}`, code: 'NETWORK_ERROR', retryable: true },
      };
    } finally {
      clearTimeout(timeoutId);
      if (options?.signal) options.signal.removeEventListener('abort', onParentAbort);
    }
  }

  private buildHeaders(
    requestHeaders?: Record<string, string>,
    routeHeaders?: Record<string, string>
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-omniroute-compression': 'off',
      'x-omniroute-disabled-guardrails': '*',
      ...(requestHeaders ?? {}),
      ...(routeHeaders ?? {}),
    };

    if (this.apiKey && !headers['authorization'] && !headers['x-api-key']) {
      headers['authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }
}
