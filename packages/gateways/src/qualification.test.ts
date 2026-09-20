import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { OmniRouteQualificationRunner } from './qualification.js';

describe('OmniRouteQualificationRunner (Deterministic Suite)', () => {
  let server: http.Server;
  let serverPort: number;
  const testEvidencePath = resolve('./test-qualification-evidence.json');

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${serverPort}`);

      res.setHeader('x-omniroute-compression', 'off');
      res.setHeader('x-omniroute-disabled-guardrails', '*');
      res.setHeader('x-omniroute-provider', 'mock-provider');
      res.setHeader('x-omniroute-model', 'gpt-4o-mock');
      res.setHeader('x-request-id', 'req_qual_test');

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
            data: [{ id: 'mock-model-1', available: true }],
          })
        );
        return;
      }

      if (url.pathname === '/v1/chat/completions') {
        let bodyStr = '';
        req.on('data', (c) => (bodyStr += c));
        req.on('end', () => {
          let bodyObj: Record<string, unknown> = {};
          try {
            bodyObj = JSON.parse(bodyStr);
          } catch {
            // pass
          }

          if (bodyObj.model === 'force-500-model') {
            res.writeHead(500, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Forced server failure' } }));
            return;
          }

          if (bodyObj.model === 'force-429-quota-model') {
            res.writeHead(429, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Quota exceeded', type: 'quota_error' } }));
            return;
          }

          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              id: 'chatcmpl_qual_123',
              model: typeof bodyObj.model === 'string' ? bodyObj.model : 'mock-model-1',
              choices: [{ index: 0, message: { role: 'assistant', content: 'Echo' } }],
              echo: bodyObj,
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
    if (existsSync(testEvidencePath)) {
      rmSync(testEvidencePath, { force: true });
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('executes all 18 mandatory qualification experiments and produces APPROVED evidence', async () => {
    const runner = new OmniRouteQualificationRunner({
      baseUrl: `http://127.0.0.1:${serverPort}`,
      evidenceOutputPath: testEvidencePath,
      isDryRun: true,
    });

    const summary = await runner.runAll();

    expect(summary.decision).toBe('APPROVED');
    expect(summary.evidence.experimentsPassed).toBe(18);
    expect(summary.evidence.experimentsTotal).toBe(18);
    expect(summary.evidence.configIntegrityMaintained).toBe(true);
    expect(summary.evidence.tproxyRemainedInactive).toBe(true);
    expect(summary.evidence.canarySecretsRedacted).toBe(true);
    expect(existsSync(testEvidencePath)).toBe(true);
  });
});
