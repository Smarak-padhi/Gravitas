import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { OmniRouteAdapter } from './omniroute.js';

describe('OmniRouteAdapter (HTTP Protocol Boundary)', () => {
  let server: http.Server;
  let serverPort: number;
  let lastReceivedHeaders: http.IncomingHttpHeaders = {};
  let lastReceivedBody: Record<string, unknown> = {};

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      lastReceivedHeaders = req.headers;
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${serverPort}`);

      if (url.pathname === '/api/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'HEALTHY', ok: true }));
        return;
      }

      if (url.pathname === '/v1/models') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            object: 'list',
            data: [
              { id: 'gpt-4o', object: 'model', owned_by: 'openai', context_window: 128000, available: true },
              { id: 'claude-3-5-sonnet', object: 'model', owned_by: 'anthropic', context_window: 200000, available: true },
            ],
          })
        );
        return;
      }

      if (url.pathname === '/v1/chat/completions') {
        let bodyStr = '';
        req.on('data', (c) => (bodyStr += c));
        req.on('end', () => {
          try {
            lastReceivedBody = JSON.parse(bodyStr);
          } catch {
            lastReceivedBody = {};
          }

          if (lastReceivedBody.model === 'slow-model') {
            setTimeout(() => {
              res.writeHead(200, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ id: 'slow_1', choices: [] }));
            }, 500);
            return;
          }

          if (lastReceivedBody.model === 'malformed-model') {
            res.writeHead(200, { 'content-type': 'text/plain' });
            res.end('NOT_JSON_BODY');
            return;
          }

          if (lastReceivedBody.model === 'error-500-model') {
            res.writeHead(500, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Provider internal crash', type: 'internal_error' } }));
            return;
          }

          if (lastReceivedBody.model === 'quota-429-model') {
            res.writeHead(429, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Quota limit exceeded', type: 'quota_error' } }));
            return;
          }

          res.setHeader('x-omniroute-model', 'gpt-4o-actual');
          res.setHeader('x-omniroute-provider', 'openai-direct');
          res.setHeader('x-omniroute-fallback', 'true');
          res.setHeader('x-request-id', 'req_test_123');
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              id: 'chatcmpl_test_123',
              object: 'chat.completion',
              model: 'gpt-4o-actual',
              choices: [
                {
                  index: 0,
                  message: { role: 'assistant', content: 'Response from mock gateway' },
                  finish_reason: 'stop',
                },
              ],
            })
          );
        });
        return;
      }

      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Not found' } }));
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          serverPort = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('health() returns HEALTHY when endpoint answers', async () => {
    const adapter = new OmniRouteAdapter({ baseUrl: `http://127.0.0.1:${serverPort}` });
    const health = await adapter.health();
    expect(health.isHealthy).toBe(true);
    expect(health.status).toBe('HEALTHY');
  });

  it('listModels() discovers available models with context length', async () => {
    const adapter = new OmniRouteAdapter({ baseUrl: `http://127.0.0.1:${serverPort}` });
    const models = await adapter.listModels();
    expect(models).toHaveLength(2);
    expect(models[0]?.id).toBe('gpt-4o');
    expect(models[0]?.contextWindow).toBe(128000);
    expect(models[1]?.id).toBe('claude-3-5-sonnet');
  });

  it('route() enforces mandatory zero-compression and guardrail-bypass headers', async () => {
    const adapter = new OmniRouteAdapter({ baseUrl: `http://127.0.0.1:${serverPort}` });
    const res = await adapter.route({
      body: {
        model: 'test-model',
        messages: [{ role: 'user', content: 'hello' }],
      },
    });

    expect(res.status).toBe(200);
    expect(res.terminationReason).toBe('COMPLETED');
    expect(lastReceivedHeaders['x-omniroute-compression']).toBe('off');
    expect(lastReceivedHeaders['x-omniroute-disabled-guardrails']).toBe('*');
  });

  it('route() accurately extracts fallback and provider provenance', async () => {
    const adapter = new OmniRouteAdapter({ baseUrl: `http://127.0.0.1:${serverPort}` });
    const res = await adapter.route({
      body: {
        model: 'requested-combo-model',
        messages: [{ role: 'user', content: 'test provenance' }],
      },
    });

    expect(res.requestedModel).toBe('requested-combo-model');
    expect(res.actualModel).toBe('gpt-4o-actual');
    expect(res.actualProvider).toBe('openai-direct');
    expect(res.fallbackOccurred).toBe(true);
    expect(res.requestId).toBe('req_test_123');
  });

  it('route() handles structured 429 quota exhaustion', async () => {
    const adapter = new OmniRouteAdapter({ baseUrl: `http://127.0.0.1:${serverPort}` });
    const res = await adapter.route({
      body: { model: 'quota-429-model', messages: [] },
    });

    expect(res.status).toBe(429);
    expect(res.terminationReason).toBe('ERROR');
    expect(res.error?.code).toBe('QUOTA_EXHAUSTED');
    expect(res.error?.type).toBe('quota_error');
    expect(res.error?.retryable).toBe(true);
  });

  it('route() handles structured 500 server error', async () => {
    const adapter = new OmniRouteAdapter({ baseUrl: `http://127.0.0.1:${serverPort}` });
    const res = await adapter.route({
      body: { model: 'error-500-model', messages: [] },
    });

    expect(res.status).toBe(500);
    expect(res.terminationReason).toBe('ERROR');
    expect(res.error?.message).toContain('Provider internal crash');
  });

  it('route() handles malformed non-JSON response gracefully', async () => {
    const adapter = new OmniRouteAdapter({ baseUrl: `http://127.0.0.1:${serverPort}` });
    const res = await adapter.route({
      body: { model: 'malformed-model', messages: [] },
    });

    expect(res.terminationReason).toBe('ERROR');
    expect(res.error?.code).toBe('MALFORMED_RESPONSE');
  });

  it('route() handles request timeout cleanly', async () => {
    const adapter = new OmniRouteAdapter({ baseUrl: `http://127.0.0.1:${serverPort}` });
    const res = await adapter.route(
      {
        body: { model: 'slow-model', messages: [] },
      },
      { timeoutMs: 100 }
    );

    expect(res.status).toBe(504);
    expect(res.terminationReason).toBe('TIMED_OUT');
  });

  it('route() handles client abort cancellation cleanly', async () => {
    const adapter = new OmniRouteAdapter({ baseUrl: `http://127.0.0.1:${serverPort}` });
    const controller = new AbortController();
    const promise = adapter.route(
      {
        body: { model: 'slow-model', messages: [] },
      },
      { signal: controller.signal }
    );

    controller.abort();
    const res = await promise;
    expect(res.status).toBe(499);
    expect(res.terminationReason).toBe('CANCELLED');
  });
});
