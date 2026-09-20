import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DefaultGatewayRegistry } from './registry.js';
import { OmniRouteAdapter } from './omniroute.js';
import type { GatewayQualificationEvidence } from './types.js';

describe('GatewayRegistry', () => {
  const tempEvidencePath = resolve('./temp-test-gateway-evidence.json');
  let registry: DefaultGatewayRegistry;
  let adapter: OmniRouteAdapter;

  beforeEach(() => {
    registry = new DefaultGatewayRegistry();
    adapter = new OmniRouteAdapter({ baseUrl: 'http://127.0.0.1:20128' });
    registry.registerGateway(adapter, {
      id: 'omniroute-local',
      name: 'OmniRoute Local Gateway',
      baseUrl: 'http://127.0.0.1:20128',
      securityProfile: 'wave11.2-isolated',
    });
  });

  afterEach(() => {
    if (existsSync(tempEvidencePath)) {
      rmSync(tempEvidencePath, { force: true });
    }
  });

  it('initializes registered gateway in UNQUALIFIED state', () => {
    const desc = registry.getDescriptor('omniroute-local');
    expect(desc).toBeDefined();
    expect(desc?.state).toBe('UNQUALIFIED');
  });

  it('transitions to READY when valid APPROVED qualification evidence is loaded', () => {
    const validEvidence: GatewayQualificationEvidence = {
      schemaVersion: 'v1',
      gatewayId: 'omniroute-local',
      gatewayVersion: '3.8.50',
      securityProfile: 'wave11.2-isolated',
      qualifiedAt: new Date().toISOString(),
      decision: 'APPROVED',
      experimentsPassed: 18,
      experimentsTotal: 18,
      transparentModeDigest: 'abc123digest',
      boundAddress: 'http://127.0.0.1:20128',
      experiments: [
        { id: 'exp1', description: 'desc', passed: true, durationMs: 10 },
      ],
      userConfigHashesBefore: { 'config.json': 'hash1' },
      userConfigHashesAfter: { 'config.json': 'hash1' },
      configIntegrityMaintained: true,
      tproxyRemainedInactive: true,
      canarySecretsRedacted: true,
    };

    writeFileSync(tempEvidencePath, JSON.stringify(validEvidence), 'utf8');
    const loaded = registry.loadEvidence('omniroute-local', tempEvidencePath);

    expect(loaded).toBeDefined();
    expect(loaded?.decision).toBe('APPROVED');

    const desc = registry.getDescriptor('omniroute-local');
    expect(desc?.state).toBe('READY');
    expect(desc?.version).toBe('3.8.50');
    expect(desc?.qualificationDecision).toBe('APPROVED');
  });

  it('remains UNQUALIFIED if decision is REJECTED', () => {
    const rejectedEvidence: GatewayQualificationEvidence = {
      schemaVersion: 'v1',
      gatewayId: 'omniroute-local',
      gatewayVersion: '3.8.50',
      securityProfile: 'wave11.2-isolated',
      qualifiedAt: new Date().toISOString(),
      decision: 'REJECTED',
      experimentsPassed: 15,
      experimentsTotal: 18,
      transparentModeDigest: 'abc123digest',
      boundAddress: 'http://127.0.0.1:20128',
      experiments: [],
      userConfigHashesBefore: {},
      userConfigHashesAfter: {},
      configIntegrityMaintained: false,
      tproxyRemainedInactive: true,
      canarySecretsRedacted: true,
    };

    writeFileSync(tempEvidencePath, JSON.stringify(rejectedEvidence), 'utf8');
    registry.loadEvidence('omniroute-local', tempEvidencePath);

    const desc = registry.getDescriptor('omniroute-local');
    expect(desc?.state).toBe('UNQUALIFIED');
    expect(desc?.qualificationDecision).toBe('REJECTED');
  });

  it('remains UNQUALIFIED if security profile mismatches', () => {
    const staleProfileEvidence = {
      schemaVersion: 'v1',
      gatewayId: 'omniroute-local',
      gatewayVersion: '3.8.50',
      securityProfile: 'wave10-legacy',
      qualifiedAt: new Date().toISOString(),
      decision: 'APPROVED',
      experimentsPassed: 18,
      experimentsTotal: 18,
      transparentModeDigest: 'abc',
      boundAddress: 'http://127.0.0.1:20128',
      experiments: [],
      userConfigHashesBefore: {},
      userConfigHashesAfter: {},
      configIntegrityMaintained: true,
      tproxyRemainedInactive: true,
      canarySecretsRedacted: true,
    };

    writeFileSync(tempEvidencePath, JSON.stringify(staleProfileEvidence), 'utf8');
    registry.loadEvidence('omniroute-local', tempEvidencePath);

    const desc = registry.getDescriptor('omniroute-local');
    expect(desc?.state).toBe('UNQUALIFIED');
  });

  it('setDisabled() transitions to DISABLED and back to READY when valid evidence exists', () => {
    const validEvidence: GatewayQualificationEvidence = {
      schemaVersion: 'v1',
      gatewayId: 'omniroute-local',
      gatewayVersion: '3.8.50',
      securityProfile: 'wave11.2-isolated',
      qualifiedAt: new Date().toISOString(),
      decision: 'APPROVED',
      experimentsPassed: 18,
      experimentsTotal: 18,
      transparentModeDigest: 'digest',
      boundAddress: 'http://127.0.0.1:20128',
      experiments: [],
      userConfigHashesBefore: {},
      userConfigHashesAfter: {},
      configIntegrityMaintained: true,
      tproxyRemainedInactive: true,
      canarySecretsRedacted: true,
    };

    writeFileSync(tempEvidencePath, JSON.stringify(validEvidence), 'utf8');
    registry.loadEvidence('omniroute-local', tempEvidencePath);

    registry.setDisabled('omniroute-local', true);
    expect(registry.getDescriptor('omniroute-local')?.state).toBe('DISABLED');

    registry.setDisabled('omniroute-local', false);
    expect(registry.getDescriptor('omniroute-local')?.state).toBe('READY');
  });
});
