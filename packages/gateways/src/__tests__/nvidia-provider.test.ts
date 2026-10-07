import { describe, expect, it } from 'vitest';
import { NvidiaNimAdapter, NVIDIA_CHAT_ENDPOINT, NVIDIA_DEFAULT_BASE_URL, NVIDIA_PROVIDER_ID } from '../providers/nvidia.js';
import { ModelCredentialBroker } from '../credentials/modelCredentialBroker.js';
import type { ProviderInferenceRequest } from '../providers/types.js';

describe('GRAVITAS V1-B — NVIDIA NIM Provider Adapter Suite', () => {
  it('1. Endpoint Containment — rejects invalid or untrusted base URLs at construction', () => {
    expect(() => {
      new NvidiaNimAdapter({ baseUrl: 'http://insecure.api.nvidia.com' });
    }).toThrow(/Insecure protocol 'http:' rejected/);

    expect(() => {
      new NvidiaNimAdapter({ baseUrl: 'https://evil.attacker.com' });
    }).toThrow(/Host 'evil.attacker.com' is not authorized/);

    expect(() => {
      new NvidiaNimAdapter({ baseUrl: 'https://127.0.0.1' });
    }).toThrow(/Access to loopback or private network destination/);
  });

  it('2. Request Construction & 200 OK Response — normalized payload and successful inference', async () => {
    const broker = new ModelCredentialBroker();
    const credRef = broker.registerSecret('nvidia-nim', 'nvapi-dummy-test-key-12345678');

    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      capturedUrl = String(input);
      capturedHeaders = init?.headers as Record<string, string>;
      capturedBody = JSON.parse(init?.body as string);

      const mockResponsePayload = {
        id: 'chatcmpl-test-id-123',
        model: 'meta/llama-3.1-8b-instruct',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'def hello_world():\n    return "hello"',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 10,
          total_tokens: 25,
        },
      };

      return new Response(JSON.stringify(mockResponsePayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const adapter = new NvidiaNimAdapter({
      credentialBroker: broker,
      fetchFn: mockFetch as any,
    });

    const request: ProviderInferenceRequest = {
      model: 'meta/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: 'Write hello world' }],
      temperature: 0.2,
      maxTokens: 100,
      credentialRef: credRef,
    };

    const result = await adapter.execute(request);

    // Assert request dispatch
    expect(capturedUrl).toBe(NVIDIA_CHAT_ENDPOINT);
    expect(capturedHeaders['Authorization']).toBe('Bearer nvapi-dummy-test-key-12345678');
    expect(capturedHeaders['Content-Type']).toBe('application/json');
    expect(capturedBody.model).toBe('meta/llama-3.1-8b-instruct');
    expect(capturedBody.temperature).toBe(0.2);
    expect(capturedBody.max_tokens).toBe(100);

    // Assert normalized response
    expect(result.terminationStatus).toBe('COMPLETED');
    expect(result.provider).toBe(NVIDIA_PROVIDER_ID);
    expect(result.requestedModel).toBe('meta/llama-3.1-8b-instruct');
    expect(result.outputContent).toBe('def hello_world():\n    return "hello"');
    expect(result.tokenUsage?.totalTokens).toBe(25);
    expect(result.tokenUsage?.promptTokens).toBe(15);
    expect(result.tokenUsage?.completionTokens).toBe(10);
    expect(result.transport).toBe('DIRECT');
  });

  it('3. Missing Credential — fails closed with AUTH_REQUIRED when no credential is registered', async () => {
    const broker = new ModelCredentialBroker(); // empty broker
    const adapter = new NvidiaNimAdapter({
      credentialBroker: broker,
      fetchFn: (async () => new Response('{}')) as any,
    });

    const result = await adapter.execute({
      model: 'meta/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(result.terminationStatus).toBe('ERROR');
    expect(result.errorTaxonomy).toBe('AUTH_REQUIRED');
    expect(result.errorMessage).toContain('Credential resolution failed');
  });

  it('4. HTTP 401 / 403 — maps to AUTH_REQUIRED and redacts sensitive error messages', async () => {
    const broker = new ModelCredentialBroker();
    const credRef = broker.registerSecret('nvidia-nim', 'nvapi-invalid-key-999');

    const mockFetch = async (): Promise<Response> => {
      return new Response(JSON.stringify({ error: { message: 'Invalid API key: nvapi-invalid-key-999' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const adapter = new NvidiaNimAdapter({
      credentialBroker: broker,
      fetchFn: mockFetch as any,
    });

    const result = await adapter.execute({
      model: 'meta/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: 'test' }],
      credentialRef: credRef,
    });

    expect(result.terminationStatus).toBe('ERROR');
    expect(result.errorTaxonomy).toBe('AUTH_REQUIRED');
    expect(result.errorMessage).toContain('NVIDIA NIM API HTTP 401');
    // Ensure raw secret is redacted from the error message!
    expect(result.errorMessage).not.toContain('nvapi-invalid-key-999');
    expect(result.errorMessage).toContain('[REDACTED_NVIDIA_KEY]');
  });

  it('5. HTTP 402 — maps to COST_BLOCKED', async () => {
    const broker = new ModelCredentialBroker();
    const credRef = broker.registerSecret('nvidia-nim', 'nvapi-test-key');

    const mockFetch = async (): Promise<Response> => {
      return new Response('Payment required or credit balance exhausted', { status: 402 });
    };

    const adapter = new NvidiaNimAdapter({
      credentialBroker: broker,
      fetchFn: mockFetch as any,
    });

    const result = await adapter.execute({
      model: 'meta/llama-3.1-70b-instruct',
      messages: [{ role: 'user', content: 'test' }],
      credentialRef: credRef,
    });

    expect(result.terminationStatus).toBe('ERROR');
    expect(result.errorTaxonomy).toBe('COST_BLOCKED');
  });

  it('6. HTTP 429 — maps to RATE_LIMITED', async () => {
    const broker = new ModelCredentialBroker();
    const credRef = broker.registerSecret('nvidia-nim', 'nvapi-test-key');

    const mockFetch = async (): Promise<Response> => {
      return new Response('Too Many Requests', { status: 429 });
    };

    const adapter = new NvidiaNimAdapter({
      credentialBroker: broker,
      fetchFn: mockFetch as any,
    });

    const result = await adapter.execute({
      model: 'meta/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: 'test' }],
      credentialRef: credRef,
    });

    expect(result.terminationStatus).toBe('ERROR');
    expect(result.errorTaxonomy).toBe('RATE_LIMITED');
  });

  it('7. HTTP 500 / 503 — maps to PROVIDER_UNAVAILABLE', async () => {
    const broker = new ModelCredentialBroker();
    const credRef = broker.registerSecret('nvidia-nim', 'nvapi-test-key');

    const mockFetch = async (): Promise<Response> => {
      return new Response('Internal Server Error', { status: 503 });
    };

    const adapter = new NvidiaNimAdapter({
      credentialBroker: broker,
      fetchFn: mockFetch as any,
    });

    const result = await adapter.execute({
      model: 'meta/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: 'test' }],
      credentialRef: credRef,
    });

    expect(result.terminationStatus).toBe('ERROR');
    expect(result.errorTaxonomy).toBe('PROVIDER_UNAVAILABLE');
  });

  it('8. Malformed JSON Response — maps to MALFORMED_RESPONSE', async () => {
    const broker = new ModelCredentialBroker();
    const credRef = broker.registerSecret('nvidia-nim', 'nvapi-test-key');

    const mockFetch = async (): Promise<Response> => {
      return new Response('<<<NOT JSON>>>', { status: 200 });
    };

    const adapter = new NvidiaNimAdapter({
      credentialBroker: broker,
      fetchFn: mockFetch as any,
    });

    const result = await adapter.execute({
      model: 'meta/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: 'test' }],
      credentialRef: credRef,
    });

    expect(result.terminationStatus).toBe('ERROR');
    expect(result.errorTaxonomy).toBe('MALFORMED_RESPONSE');
  });

  it('9. Abort Signal / Timeout — maps to TIMEOUT', async () => {
    const broker = new ModelCredentialBroker();
    const credRef = broker.registerSecret('nvidia-nim', 'nvapi-test-key');

    const mockFetch = async (_url: any, init?: RequestInit): Promise<Response> => {
      return new Promise((_, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            const abortErr = new Error('The operation was aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        }
      });
    };

    const adapter = new NvidiaNimAdapter({
      credentialBroker: broker,
      fetchFn: mockFetch as any,
    });

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10);

    const result = await adapter.execute(
      {
        model: 'meta/llama-3.1-8b-instruct',
        messages: [{ role: 'user', content: 'test' }],
        credentialRef: credRef,
      },
      { signal: controller.signal }
    );

    expect(result.terminationStatus).toBe('TIMED_OUT');
    expect(result.errorTaxonomy).toBe('TIMEOUT');
  });

  it('10. Header Sanitization — forbids worker from overriding Host or Authorization headers', async () => {
    const broker = new ModelCredentialBroker();
    const credRef = broker.registerSecret('nvidia-nim', 'nvapi-real-key');

    let capturedHeaders: Record<string, string> = {};

    const mockFetch = async (_url: any, init?: RequestInit): Promise<Response> => {
      capturedHeaders = init?.headers as Record<string, string>;
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
    };

    const adapter = new NvidiaNimAdapter({
      credentialBroker: broker,
      fetchFn: mockFetch as any,
    });

    await adapter.execute({
      model: 'meta/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: 'test' }],
      credentialRef: credRef,
      customHeaders: {
        Host: 'spoofed.host.com',
        Authorization: 'Bearer spoofed-token',
        'X-Custom-Trace': 'trace-123',
      },
    });

    // The spoofed Host and Authorization should be ignored/stripped
    expect(capturedHeaders['X-Custom-Trace']).toBe('trace-123');
    expect(capturedHeaders['Authorization']).toBe('Bearer nvapi-real-key');
    expect(capturedHeaders['Host']).toBeUndefined();
  });
});
