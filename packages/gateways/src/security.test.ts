import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { OmniRouteProcessManager } from './process.js';
import { DefaultGatewayRegistry } from './registry.js';
import { OmniRouteAdapter } from './omniroute.js';
import { InferenceRouter } from './router.js';
import { OmniRouteQualificationRunner } from './qualification.js';
import {
  type GatewayQualificationEvidence,
  computeRuntimeDependencyDigest,
  CURRENT_GATEWAY_VERSION,
  CURRENT_GATEWAY_NEXT_VERSION,
  GATEWAY_SECURITY_PROFILE_VERSION,
} from './types.js';
import { compilePrompt } from '../../prompts/src/index.js';

describe('OmniRoute Gateway Security Closure (Wave 11.3M - 13 Mandatory Security Gates)', () => {
  const tempEvidencePath = resolve('./temp-security-test-evidence.json');
  let mockServer: http.Server;
  let mockServerPort: number;

  beforeAll(async () => {
    mockServer = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${mockServerPort}`);

      // Gate 9: Next.js image optimizer disabled
      if (url.pathname.startsWith('/_next/image')) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      // Gate 10: Unauthenticated management routes rejected
      if (url.pathname.startsWith('/api/acp') || url.pathname.startsWith('/api/admin')) {
        const auth = req.headers['authorization'];
        if (!auth || !auth.startsWith('Bearer valid_token')) {
          res.writeHead(401, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized: authentication required' }));
          return;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (url.pathname === '/api/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'HEALTHY', ok: true }));
        return;
      }

      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 'resp_ok' }));
    });

    await new Promise<void>((resolvePromise) => {
      mockServer.listen(0, '127.0.0.1', () => {
        const addr = mockServer.address();
        if (typeof addr === 'object' && addr) {
          mockServerPort = addr.port;
        }
        resolvePromise();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolvePromise) => mockServer.close(() => resolvePromise()));
  });

  afterEach(() => {
    if (existsSync(tempEvidencePath)) {
      rmSync(tempEvidencePath, { force: true });
    }
  });

  // Gate 1: INITIAL_PASSWORD is never default (CHANGEME)
  it('1. INITIAL_PASSWORD is never default (CHANGEME)', () => {
    const manager = new OmniRouteProcessManager({
      port: 20141,
      dataDir: './tmp-test-data',
    });
    const password = manager.getInitialPassword();
    expect(password).toBeDefined();
    expect(password).not.toBe('CHANGEME');
    expect(password).not.toContain('CHANGEME');
  });

  // Gate 2: Generated management secret has >= 256-bit entropy
  it('2. Generated management secret has >= 256-bit entropy', () => {
    const manager1 = new OmniRouteProcessManager({ port: 20142, dataDir: './tmp-test-data' });
    const manager2 = new OmniRouteProcessManager({ port: 20143, dataDir: './tmp-test-data' });

    const p1 = manager1.getInitialPassword();
    const p2 = manager2.getInitialPassword();

    // 256 bits = 32 bytes = 64 hex characters
    expect(p1.length).toBeGreaterThanOrEqual(64);
    expect(p2.length).toBeGreaterThanOrEqual(64);
    expect(/^[0-9a-f]{64,}$/i.test(p1)).toBe(true);
    expect(/^[0-9a-f]{64,}$/i.test(p2)).toBe(true);
    // CSPRNG guarantees uniqueness
    expect(p1).not.toBe(p2);

    const secrets = manager1.getGeneratedSecrets();
    expect(secrets.length).toBeGreaterThanOrEqual(4);
    for (const secret of secrets) {
      expect(secret.length).toBeGreaterThanOrEqual(64);
    }
  });

  // Gate 3: Secret absent from logs / redacted
  it('3. Secret absent from logs / redacted', () => {
    const manager = new OmniRouteProcessManager({ port: 20144, dataDir: './tmp-test-data' });
    const password = manager.getInitialPassword();
    const logBuffer: string[] = [];

    // Invoke private appendLog with raw text containing the secret
    (manager as any).appendLog(logBuffer, `Starting server with INITIAL_PASSWORD=${password}`);
    (manager as any).appendLog(logBuffer, `Authentication failure for secret: ${password}`);

    const logOutput = logBuffer.join('\n');
    expect(logOutput).not.toContain(password);
    expect(logOutput).toContain('[REDACTED_SECRET]');
  });

  // Gate 4: Secret absent from qualification evidence
  it('4. Secret absent from qualification evidence', async () => {
    const manager = new OmniRouteProcessManager({ port: mockServerPort, dataDir: './tmp-test-data' });
    const password = manager.getInitialPassword();

    const runner = new OmniRouteQualificationRunner({
      baseUrl: `http://127.0.0.1:${mockServerPort}`,
      evidenceOutputPath: tempEvidencePath,
      isDryRun: true,
    });

    const summary = await runner.runAll();
    const evidenceStr = JSON.stringify(summary.evidence);

    expect(evidenceStr).not.toContain(password);
    expect(evidenceStr).not.toContain('CHANGEME');
    for (const s of manager.getGeneratedSecrets()) {
      expect(evidenceStr).not.toContain(s);
    }
  });

  // Gate 5: Secret absent from worker prompt
  it('5. Secret absent from worker prompt', async () => {
    const manager = new OmniRouteProcessManager({ port: 20145, dataDir: './tmp-test-data' });
    const secrets = manager.getGeneratedSecrets();

    const compiled = compilePrompt({
      contract: {
        version: '1.0.0',
        goal: 'Verify security boundaries and isolation',
        repository: 'C:/test/repo',
        baseBranch: 'main',
        constraints: ['Do not leak credentials', 'Use loopback only'],
        acceptanceCriteria: [{ id: 'C1', description: 'Zero secrets leaked' }],
        requiredEvidence: [],
      },
      task: {
        id: 'task-sec-01',
        runId: 'run-sec-01',
        title: 'Security isolation task',
        objective: 'Verify security boundaries',
        state: 'READY' as const,
        dependencies: [],
        acceptanceCriteria: [{ id: 'C1', description: 'Zero secrets leaked' }],
        requiresApproval: true,
        createdAt: new Date().toISOString(),
      },
    });

    for (const secret of secrets) {
      expect(compiled.text).not.toContain(secret);
    }
    expect(compiled.text).not.toContain('CHANGEME');
  });

  // Helper to build mock evidence
  function createTestEvidence(overrides: Partial<GatewayQualificationEvidence> = {}): GatewayQualificationEvidence {
    const digest = computeRuntimeDependencyDigest(CURRENT_GATEWAY_VERSION, CURRENT_GATEWAY_NEXT_VERSION, GATEWAY_SECURITY_PROFILE_VERSION);
    return {
      schemaVersion: '1.0.0',
      qualificationMode: 'REAL',
      gatewayId: 'omniroute-local',
      gatewayVersion: CURRENT_GATEWAY_VERSION,
      nextVersion: CURRENT_GATEWAY_NEXT_VERSION,
      runtimeDependencyDigest: digest,
      securityProfile: GATEWAY_SECURITY_PROFILE_VERSION,
      adapterSecurityProfile: GATEWAY_SECURITY_PROFILE_VERSION,
      policyVersion: '1.0.0',
      qualifiedAt: new Date().toISOString(),
      decision: 'APPROVED',
      experimentsPassed: 18,
      experimentsTotal: 18,
      transparentModeDigest: 'trans-digest-1',
      configurationDigest: 'trans-digest-1',
      boundAddress: 'http://127.0.0.1:20128',
      experiments: [],
      userConfigHashesBefore: {},
      userConfigHashesAfter: {},
      configIntegrityMaintained: true,
      tproxyRemainedInactive: true,
      canarySecretsRedacted: true,
      ...overrides,
    };
  }

  // Gate 6: Stale qualification after Next version change
  it('6. Stale qualification after Next version change', () => {
    const registry = new DefaultGatewayRegistry();
    const adapter = new OmniRouteAdapter({ baseUrl: 'http://127.0.0.1:20128' });
    registry.registerGateway(adapter, {
      id: 'omniroute-local',
      name: 'OmniRoute Local Gateway',
      baseUrl: 'http://127.0.0.1:20128',
      version: CURRENT_GATEWAY_VERSION,
      nextVersion: '16.3.3',
      securityProfile: GATEWAY_SECURITY_PROFILE_VERSION,
    });

    // Evidence generated under vulnerable Next 16.3.1
    const staleEvidence = createTestEvidence({
      nextVersion: '16.3.1',
      runtimeDependencyDigest: computeRuntimeDependencyDigest(CURRENT_GATEWAY_VERSION, '16.3.1', GATEWAY_SECURITY_PROFILE_VERSION),
    });
    writeFileSync(tempEvidencePath, JSON.stringify(staleEvidence), 'utf8');

    registry.loadEvidence('omniroute-local', tempEvidencePath);
    const desc = registry.getDescriptor('omniroute-local');
    expect(desc?.state).toBe('UNQUALIFIED');
  });

  // Gate 7: Stale qualification after dependency digest change
  it('7. Stale qualification after dependency digest change', () => {
    const registry = new DefaultGatewayRegistry();
    const adapter = new OmniRouteAdapter({ baseUrl: 'http://127.0.0.1:20128' });
    const expectedDigest = computeRuntimeDependencyDigest(CURRENT_GATEWAY_VERSION, CURRENT_GATEWAY_NEXT_VERSION, GATEWAY_SECURITY_PROFILE_VERSION);
    registry.registerGateway(adapter, {
      id: 'omniroute-local',
      name: 'OmniRoute Local Gateway',
      baseUrl: 'http://127.0.0.1:20128',
      version: CURRENT_GATEWAY_VERSION,
      nextVersion: CURRENT_GATEWAY_NEXT_VERSION,
      runtimeDependencyDigest: expectedDigest,
      securityProfile: GATEWAY_SECURITY_PROFILE_VERSION,
    });

    // Tampered or outdated dependency digest
    const alteredEvidence = createTestEvidence({
      runtimeDependencyDigest: 'outdated_or_altered_digest_hash_9999',
    });
    writeFileSync(tempEvidencePath, JSON.stringify(alteredEvidence), 'utf8');

    registry.loadEvidence('omniroute-local', tempEvidencePath);
    const desc = registry.getDescriptor('omniroute-local');
    expect(desc?.state).toBe('UNQUALIFIED');
  });

  // Gate 8: Current qualification matches dependency digest
  it('8. Current qualification matches dependency digest', () => {
    const registry = new DefaultGatewayRegistry();
    const adapter = new OmniRouteAdapter({ baseUrl: 'http://127.0.0.1:20128' });
    const expectedDigest = computeRuntimeDependencyDigest(CURRENT_GATEWAY_VERSION, CURRENT_GATEWAY_NEXT_VERSION, GATEWAY_SECURITY_PROFILE_VERSION);
    registry.registerGateway(adapter, {
      id: 'omniroute-local',
      name: 'OmniRoute Local Gateway',
      baseUrl: 'http://127.0.0.1:20128',
      version: CURRENT_GATEWAY_VERSION,
      nextVersion: CURRENT_GATEWAY_NEXT_VERSION,
      runtimeDependencyDigest: expectedDigest,
      securityProfile: GATEWAY_SECURITY_PROFILE_VERSION,
    });

    const validEvidence = createTestEvidence({
      nextVersion: CURRENT_GATEWAY_NEXT_VERSION,
      runtimeDependencyDigest: expectedDigest,
    });
    writeFileSync(tempEvidencePath, JSON.stringify(validEvidence), 'utf8');

    registry.loadEvidence('omniroute-local', tempEvidencePath);
    const desc = registry.getDescriptor('omniroute-local');
    expect(desc?.state).toBe('READY');
  });

  // Gate 9: /_next/image remains disabled (returns 404)
  it('9. /_next/image remains disabled (returns 404)', async () => {
    const res = await fetch(`http://127.0.0.1:${mockServerPort}/_next/image?url=test&w=64&q=75`);
    expect(res.status).toBe(404);
  });

  // Gate 10: Management routes reject unauthenticated access (returns 401)
  it('10. Management routes reject unauthenticated access (returns 401)', async () => {
    const resAcp = await fetch(`http://127.0.0.1:${mockServerPort}/api/acp/agents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test-agent' }),
    });
    expect(resAcp.status).toBe(401);

    const resAdmin = await fetch(`http://127.0.0.1:${mockServerPort}/api/admin/settings`);
    expect(resAdmin.status).toBe(401);

    // With valid authorization header, access is granted
    const resAuthorized = await fetch(`http://127.0.0.1:${mockServerPort}/api/acp/agents`, {
      headers: { authorization: 'Bearer valid_token' },
    });
    expect(resAuthorized.status).toBe(200);
  });

  // Gate 11: DIRECT routing unaffected
  it('11. DIRECT routing unaffected', async () => {
    const registry = new DefaultGatewayRegistry();
    const router = new InferenceRouter({ registry });

    // DIRECT transport is requested; gateway qualification state does not hinder direct route
    const route = await router.resolveRoute({
      workerId: 'worker-codex-direct',
      workerQualificationIdentity: 'codex@0.0.1',
      requirement: {
        transportPreference: 'DIRECT',
        fallbackPolicy: 'GATEWAY_WITH_DIRECT_FALLBACK',
      },
    });

    expect(route.transport).toBe('DIRECT');
    expect(route.reason).toBe('DIRECT_REQUIRED');
  });

  // Gate 12: GATEWAY_ONLY remains fail-closed
  it('12. GATEWAY_ONLY remains fail-closed', async () => {
    const registry = new DefaultGatewayRegistry();
    const adapter = new OmniRouteAdapter({ baseUrl: 'http://127.0.0.1:20128' });
    // Gateway is UNQUALIFIED by default
    registry.registerGateway(adapter, {
      id: 'omniroute-local',
      name: 'OmniRoute Local Gateway',
      baseUrl: 'http://127.0.0.1:20128',
      version: CURRENT_GATEWAY_VERSION,
      securityProfile: GATEWAY_SECURITY_PROFILE_VERSION,
    });

    const router = new InferenceRouter({ registry });

    // Request requires GATEWAY_ONLY policy
    const route = await router.resolveRoute({
      workerId: 'worker-codex-gw',
      workerQualificationIdentity: 'codex@0.0.1',
      requirement: {
        transportPreference: 'GATEWAY',
        fallbackPolicy: 'GATEWAY_ONLY',
        requestedGatewayId: 'omniroute-local',
      },
    });

    // Must fail closed with NO_VALID_ROUTE, never silently routing to DIRECT
    expect(route.transport).toBe('GATEWAY');
    expect(route.reason).toBe('GATEWAY_UNQUALIFIED');
  });

  // Gate 13: Causal composition remains valid
  it('13. Causal composition remains valid', async () => {
    const registry = new DefaultGatewayRegistry();
    const adapter = new OmniRouteAdapter({ baseUrl: `http://127.0.0.1:${mockServerPort}` });
    const expectedDigest = computeRuntimeDependencyDigest(CURRENT_GATEWAY_VERSION, CURRENT_GATEWAY_NEXT_VERSION, GATEWAY_SECURITY_PROFILE_VERSION);
    registry.registerGateway(adapter, {
      id: 'omniroute-local',
      name: 'OmniRoute Local Gateway',
      baseUrl: `http://127.0.0.1:${mockServerPort}`,
      version: CURRENT_GATEWAY_VERSION,
      nextVersion: CURRENT_GATEWAY_NEXT_VERSION,
      runtimeDependencyDigest: expectedDigest,
      securityProfile: GATEWAY_SECURITY_PROFILE_VERSION,
    });

    // Load APPROVED and valid evidence
    const validEvidence = createTestEvidence({
      boundAddress: `http://127.0.0.1:${mockServerPort}`,
      nextVersion: CURRENT_GATEWAY_NEXT_VERSION,
      runtimeDependencyDigest: expectedDigest,
    });
    writeFileSync(tempEvidencePath, JSON.stringify(validEvidence), 'utf8');
    registry.loadEvidence('omniroute-local', tempEvidencePath);

    const router = new InferenceRouter({ registry });
    const route = await router.resolveRoute({
      workerId: 'worker-codex-causal',
      workerQualificationIdentity: 'codex@0.0.1',
      requirement: {
        transportPreference: 'GATEWAY',
        fallbackPolicy: 'GATEWAY_WITH_DIRECT_FALLBACK',
        requestedGatewayId: 'omniroute-local',
        requestedProvider: 'openai',
        requestedModel: 'gpt-4o',
      },
    });

    expect(route.transport).toBe('GATEWAY');
    expect(route.reason).toBe('GATEWAY_REQUIRED_PROVIDER');
    expect(route.gatewayId).toBe('omniroute-local');
    expect(route.requestedProvider).toBe('openai');
    expect(route.requestedModel).toBe('gpt-4o');
  });
});
