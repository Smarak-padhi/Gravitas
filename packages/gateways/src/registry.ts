/**
 * Gravitas — Gateway Registry
 *
 * Tracks known inference gateways and governs their qualification state transitions.
 * A gateway is UNQUALIFIED by default and transitions to READY only with valid,
 * non-stale, APPROVED qualification evidence matching the active security profile.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  GatewayQualificationEvidenceSchema,
  type GatewayDescriptor,
  type GatewayQualificationEvidence,
  type GatewayQualificationState,
  type InferenceGateway,
  GATEWAY_SECURITY_PROFILE_VERSION,
} from './types.js';

export interface GatewayRegistry {
  registerGateway(gateway: InferenceGateway, descriptor: Omit<GatewayDescriptor, 'state'>): void;
  getGateway(id: string): InferenceGateway | undefined;
  getDescriptor(id: string): GatewayDescriptor | undefined;
  listGateways(): GatewayDescriptor[];
  loadEvidence(id: string, evidencePath: string): GatewayQualificationEvidence | null;
  getEvidence(id: string): GatewayQualificationEvidence | undefined;
  setDisabled(id: string, disabled: boolean): void;
}

export class DefaultGatewayRegistry implements GatewayRegistry {
  private readonly gateways = new Map<string, InferenceGateway>();
  private readonly descriptors = new Map<string, GatewayDescriptor>();
  private readonly evidenceMap = new Map<string, GatewayQualificationEvidence>();

  registerGateway(gateway: InferenceGateway, descriptor: Omit<GatewayDescriptor, 'state'>): void {
    this.gateways.set(gateway.id, gateway);
    this.descriptors.set(gateway.id, {
      ...descriptor,
      state: 'UNQUALIFIED',
    });
  }

  getGateway(id: string): InferenceGateway | undefined {
    return this.gateways.get(id);
  }

  getDescriptor(id: string): GatewayDescriptor | undefined {
    return this.descriptors.get(id);
  }

  listGateways(): GatewayDescriptor[] {
    return Array.from(this.descriptors.values());
  }

  getEvidence(id: string): GatewayQualificationEvidence | undefined {
    return this.evidenceMap.get(id);
  }

  loadEvidence(id: string, evidencePath: string): GatewayQualificationEvidence | null {
    const descriptor = this.descriptors.get(id);
    if (!descriptor) {
      return null;
    }

    const resolvedPath = resolve(evidencePath);
    if (!existsSync(resolvedPath)) {
      this.descriptors.set(id, {
        ...descriptor,
        state: 'UNQUALIFIED',
        qualificationDecision: undefined,
      });
      return null;
    }

    try {
      const raw = JSON.parse(readFileSync(resolvedPath, 'utf8'));
      const parsed = GatewayQualificationEvidenceSchema.safeParse(raw);

      if (!parsed.success) {
        this.descriptors.set(id, {
          ...descriptor,
          state: 'UNQUALIFIED',
          qualificationDecision: 'REJECTED',
        });
        return null;
      }

      const evidence = parsed.data;

      // Validation gates
      const isSchemaMatch =
        evidence.schemaVersion === '1.0.0' || evidence.schemaVersion === 'v1';
      const isRealMode = evidence.qualificationMode === 'REAL';
      const isSecurityProfileMatch =
        evidence.securityProfile === GATEWAY_SECURITY_PROFILE_VERSION &&
        (!evidence.adapterSecurityProfile || evidence.adapterSecurityProfile === GATEWAY_SECURITY_PROFILE_VERSION);
      const isGatewayIdMatch = evidence.gatewayId === id;
      const isVersionMatch = !descriptor.version || evidence.gatewayVersion === descriptor.version;
      const isConfigDigestMatch =
        !descriptor.configurationDigest ||
        evidence.configurationDigest === descriptor.configurationDigest ||
        evidence.transparentModeDigest === descriptor.configurationDigest;
      const isApproved = evidence.decision === 'APPROVED';
      const isConfigIntact = evidence.configIntegrityMaintained === true;
      const isTproxyInactive = evidence.tproxyRemainedInactive === true;
      const isCanaryRedacted = evidence.canarySecretsRedacted === true;
      const allPassed = evidence.experimentsPassed === evidence.experimentsTotal;

      const isValid =
        isSchemaMatch &&
        isRealMode &&
        isSecurityProfileMatch &&
        isGatewayIdMatch &&
        isVersionMatch &&
        isConfigDigestMatch &&
        isApproved &&
        isConfigIntact &&
        isTproxyInactive &&
        isCanaryRedacted &&
        allPassed;

      this.evidenceMap.set(id, evidence);

      const newState: GatewayQualificationState = isValid ? 'READY' : 'UNQUALIFIED';

      this.descriptors.set(id, {
        ...descriptor,
        state: newState,
        version: evidence.gatewayVersion,
        securityProfile: evidence.securityProfile,
        configurationDigest: evidence.configurationDigest ?? evidence.transparentModeDigest,
        qualifiedAt: evidence.qualifiedAt,
        qualificationDecision: evidence.decision,
        qualificationMode: evidence.qualificationMode,
      });

      return evidence;
    } catch {
      this.descriptors.set(id, {
        ...descriptor,
        state: 'UNQUALIFIED',
        qualificationDecision: 'REJECTED',
      });
      return null;
    }
  }

  setDisabled(id: string, disabled: boolean): void {
    const descriptor = this.descriptors.get(id);
    if (!descriptor) return;

    if (disabled) {
      this.descriptors.set(id, {
        ...descriptor,
        state: 'DISABLED',
      });
    } else {
      const evidence = this.evidenceMap.get(id);
      const isReady =
        evidence &&
        evidence.qualificationMode === 'REAL' &&
        evidence.decision === 'APPROVED' &&
        evidence.securityProfile === GATEWAY_SECURITY_PROFILE_VERSION;

      this.descriptors.set(id, {
        ...descriptor,
        state: isReady ? 'READY' : 'UNQUALIFIED',
      });
    }
  }
}
