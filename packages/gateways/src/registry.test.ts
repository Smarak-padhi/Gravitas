import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DefaultGatewayRegistry } from './registry.js';
import { OmniRouteAdapter } from './omniroute.js';
import type { GatewayQualificationEvidence } from './types.js';

describe('GatewayRegistry Qualification State & Mode Transitions (Section 16)', () => {
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
      version: '3.8.50',
      securityProfile: 'wave11.2-isolated',
      configurationDigest: 'digest-alpha-1',
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

  // Section 16 Proof 1: DRY + APPROVED -> UNQUALIFIED
  it('DRY + APPROVED transitions to UNQUALIFIED (rejects DRY evidence for production readiness)', () => {
    const dryApprovedEvidence: GatewayQualificationEvidence = {
      schemaVersion: 'v1',
      qualificationMode: 'DRY',
      gatewayId: 'omniroute-local',
      gatewayVersion: '3.8.50',
      securityProfile: 'wave11.2-isolated',
      qualifiedAt: new Date().toISOString(),
      decision: 'APPROVED',
      experimentsPassed: 18,
      experimentsTotal: 18,
      transparentModeDigest: 'digest-alpha-1',
      configurationDigest: 'digest-alpha-1',
      boundAddress: 'http://127.0.0.1:20128',
      experiments: [],
      userConfigHashesBefore: {},
      userConfigHashesAfter: {},
      configIntegrityMaintained: true,
      tproxyRemainedInactive: true,
      canarySecretsRedacted: true,
    };

    writeFileSync(tempEvidencePath, JSON.stringify(dryApprovedEvidence), 'utf8');
    const loaded = registry.loadEvidence('omniroute-local', tempEvidencePath);

    expect(loaded).toBeDefined();
    expect(loaded?.qualificationMode).toBe('DRY');
    expect(loaded?.decision).toBe('APPROVED');

    const desc = registry.getDescriptor('omniroute-local');
    expect(desc?.state).toBe('UNQUALIFIED');
    expect(desc?.qualificationMode).toBe('DRY');
  });

  // Section 16 Proof 2: REAL + REJECTED -> UNQUALIFIED
  it('REAL + REJECTED transitions to UNQUALIFIED', () => {
    const realRejectedEvidence: GatewayQualificationEvidence = {
      schemaVersion: 'v1',
      qualificationMode: 'REAL',
      gatewayId: 'omniroute-local',
      gatewayVersion: '3.8.50',
      securityProfile: 'wave11.2-isolated',
      qualifiedAt: new Date().toISOString(),
      decision: 'REJECTED',
      experimentsPassed: 16,
      experimentsTotal: 18,
      transparentModeDigest: 'digest-alpha-1',
      configurationDigest: 'digest-alpha-1',
      boundAddress: 'http://127.0.0.1:20128',
      experiments: [],
      userConfigHashesBefore: {},
      userConfigHashesAfter: {},
      configIntegrityMaintained: false,
      tproxyRemainedInactive: true,
      canarySecretsRedacted: true,
    };

    writeFileSync(tempEvidencePath, JSON.stringify(realRejectedEvidence), 'utf8');
    registry.loadEvidence('omniroute-local', tempEvidencePath);

    const desc = registry.getDescriptor('omniroute-local');
    expect(desc?.state).toBe('UNQUALIFIED');
    expect(desc?.qualificationDecision).toBe('REJECTED');
  });

  // Section 16 Proof 3: REAL + APPROVED + version/profile/config match -> READY
  it('REAL + APPROVED + version/profile/config match transitions to READY', () => {
    const validRealEvidence: GatewayQualificationEvidence = {
      schemaVersion: 'v1',
      qualificationMode: 'REAL',
      gatewayId: 'omniroute-local',
      gatewayVersion: '3.8.50',
      securityProfile: 'wave11.2-isolated',
      adapterSecurityProfile: 'wave11.2-isolated',
      policyVersion: '1.0.0',
      qualifiedAt: new Date().toISOString(),
      decision: 'APPROVED',
      experimentsPassed: 18,
      experimentsTotal: 18,
      transparentModeDigest: 'digest-alpha-1',
      configurationDigest: 'digest-alpha-1',
      boundAddress: 'http://127.0.0.1:20128',
      runtimeExecutable: '/usr/local/bin/omniroute',
      runtimeIdentity: 'omniroute-v3.8.50',
      experiments: [],
      userConfigHashesBefore: {},
      userConfigHashesAfter: {},
      configIntegrityMaintained: true,
      tproxyRemainedInactive: true,
      canarySecretsRedacted: true,
    };

    writeFileSync(tempEvidencePath, JSON.stringify(validRealEvidence), 'utf8');
    const loaded = registry.loadEvidence('omniroute-local', tempEvidencePath);

    expect(loaded).toBeDefined();
    const desc = registry.getDescriptor('omniroute-local');
    expect(desc?.state).toBe('READY');
    expect(desc?.version).toBe('3.8.50');
    expect(desc?.qualificationDecision).toBe('APPROVED');
    expect(desc?.qualificationMode).toBe('REAL');
  });

  // Section 16 Proof 4: REAL + APPROVED + stale version -> UNQUALIFIED
  it('REAL + APPROVED + stale version transitions to UNQUALIFIED', () => {
    const staleVersionEvidence: GatewayQualificationEvidence = {
      schemaVersion: 'v1',
      qualificationMode: 'REAL',
      gatewayId: 'omniroute-local',
      gatewayVersion: '3.7.0-outdated',
      securityProfile: 'wave11.2-isolated',
      qualifiedAt: new Date().toISOString(),
      decision: 'APPROVED',
      experimentsPassed: 18,
      experimentsTotal: 18,
      transparentModeDigest: 'digest-alpha-1',
      configurationDigest: 'digest-alpha-1',
      boundAddress: 'http://127.0.0.1:20128',
      experiments: [],
      userConfigHashesBefore: {},
      userConfigHashesAfter: {},
      configIntegrityMaintained: true,
      tproxyRemainedInactive: true,
      canarySecretsRedacted: true,
    };

    writeFileSync(tempEvidencePath, JSON.stringify(staleVersionEvidence), 'utf8');
    registry.loadEvidence('omniroute-local', tempEvidencePath);

    const desc = registry.getDescriptor('omniroute-local');
    expect(desc?.state).toBe('UNQUALIFIED');
  });

  // Section 16 Proof 5: REAL + APPROVED + wrong security profile -> UNQUALIFIED
  it('REAL + APPROVED + wrong security profile transitions to UNQUALIFIED', () => {
    const wrongProfileEvidence = {
      schemaVersion: 'v1',
      qualificationMode: 'REAL',
      gatewayId: 'omniroute-local',
      gatewayVersion: '3.8.50',
      securityProfile: 'wave10-legacy-uncontained',
      qualifiedAt: new Date().toISOString(),
      decision: 'APPROVED',
      experimentsPassed: 18,
      experimentsTotal: 18,
      transparentModeDigest: 'digest-alpha-1',
      configurationDigest: 'digest-alpha-1',
      boundAddress: 'http://127.0.0.1:20128',
      experiments: [],
      userConfigHashesBefore: {},
      userConfigHashesAfter: {},
      configIntegrityMaintained: true,
      tproxyRemainedInactive: true,
      canarySecretsRedacted: true,
    };

    writeFileSync(tempEvidencePath, JSON.stringify(wrongProfileEvidence), 'utf8');
    registry.loadEvidence('omniroute-local', tempEvidencePath);

    const desc = registry.getDescriptor('omniroute-local');
    expect(desc?.state).toBe('UNQUALIFIED');
  });

  // Section 16 Proof 6: REAL + APPROVED + wrong configuration digest -> UNQUALIFIED
  it('REAL + APPROVED + wrong configuration digest transitions to UNQUALIFIED', () => {
    const wrongDigestEvidence: GatewayQualificationEvidence = {
      schemaVersion: 'v1',
      qualificationMode: 'REAL',
      gatewayId: 'omniroute-local',
      gatewayVersion: '3.8.50',
      securityProfile: 'wave11.2-isolated',
      qualifiedAt: new Date().toISOString(),
      decision: 'APPROVED',
      experimentsPassed: 18,
      experimentsTotal: 18,
      transparentModeDigest: 'mismatched-digest-beta',
      configurationDigest: 'mismatched-digest-beta',
      boundAddress: 'http://127.0.0.1:20128',
      experiments: [],
      userConfigHashesBefore: {},
      userConfigHashesAfter: {},
      configIntegrityMaintained: true,
      tproxyRemainedInactive: true,
      canarySecretsRedacted: true,
    };

    writeFileSync(tempEvidencePath, JSON.stringify(wrongDigestEvidence), 'utf8');
    registry.loadEvidence('omniroute-local', tempEvidencePath);

    const desc = registry.getDescriptor('omniroute-local');
    expect(desc?.state).toBe('UNQUALIFIED');
  });

  it('setDisabled() transitions to DISABLED and back to READY when valid REAL evidence exists', () => {
    const validRealEvidence: GatewayQualificationEvidence = {
      schemaVersion: 'v1',
      qualificationMode: 'REAL',
      gatewayId: 'omniroute-local',
      gatewayVersion: '3.8.50',
      securityProfile: 'wave11.2-isolated',
      qualifiedAt: new Date().toISOString(),
      decision: 'APPROVED',
      experimentsPassed: 18,
      experimentsTotal: 18,
      transparentModeDigest: 'digest-alpha-1',
      configurationDigest: 'digest-alpha-1',
      boundAddress: 'http://127.0.0.1:20128',
      experiments: [],
      userConfigHashesBefore: {},
      userConfigHashesAfter: {},
      configIntegrityMaintained: true,
      tproxyRemainedInactive: true,
      canarySecretsRedacted: true,
    };

    writeFileSync(tempEvidencePath, JSON.stringify(validRealEvidence), 'utf8');
    registry.loadEvidence('omniroute-local', tempEvidencePath);

    registry.setDisabled('omniroute-local', true);
    expect(registry.getDescriptor('omniroute-local')?.state).toBe('DISABLED');

    registry.setDisabled('omniroute-local', false);
    expect(registry.getDescriptor('omniroute-local')?.state).toBe('READY');
  });
});
