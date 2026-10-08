/**
 * Gravitas — Model Registry & Qualification Ladder (Wave V1-B)
 *
 * Central registry for model descriptors, capability profiles, and qualification lifecycle.
 *
 * Qualification Ladder:
 * DISCOVERED -> METADATA_VALIDATED -> AUTH_AVAILABLE -> ZERO_COST_ELIGIBLE -> CAPABILITY_PROBED -> QUALIFIED
 */

import { getNvidiaProviderDescriptor, NVIDIA_SEEDED_MODELS } from '../providers/nvidia.js';
import type {
  ModelCapabilityDomain,
  ModelCapabilityProfile,
  ModelDescriptor,
  ModelQualificationState,
  ProviderDescriptor,
} from './types.js';

export class ModelRegistry {
  private static instance: ModelRegistry | null = null;
  private readonly providers = new Map<string, ProviderDescriptor>();
  private readonly models = new Map<string, ModelDescriptor>();
  private readonly capabilityProfiles = new Map<string, ModelCapabilityProfile>();

  public constructor() {
    this.seedDefaults();
  }

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  private seedDefaults(): void {
    // 1. Seed NVIDIA NIM provider
    this.registerProvider(getNvidiaProviderDescriptor());

    // 2. Seed NVIDIA NIM models
    for (const model of NVIDIA_SEEDED_MODELS) {
      this.registerModel(model);

      // Seed baseline declared capability profile
      const is70b = model.id.includes('70b');
      this.registerCapabilityProfile({
        modelId: model.id,
        providerId: model.providerId,
        declaredCapabilities: {
          CODE_GENERATION: true,
          CODE_REPAIR: true,
          REASONING: is70b,
          PLANNING: is70b,
          SUMMARIZATION: true,
          DESIGN_CRITIQUE: true,
          TOOL_USE: model.toolSupport === true,
          STRUCTURED_OUTPUT: model.structuredOutputSupport === true,
        },
        verifiedCapabilities: {},
      });
    }
  }

  public registerProvider(provider: ProviderDescriptor): void {
    this.providers.set(provider.id, { ...provider });
  }

  public getProvider(providerId: string): ProviderDescriptor | undefined {
    return this.providers.get(providerId);
  }

  public listProviders(): readonly ProviderDescriptor[] {
    return Array.from(this.providers.values());
  }

  public registerModel(model: ModelDescriptor): void {
    this.models.set(model.id, { ...model });
  }

  public getModel(modelId: string): ModelDescriptor | undefined {
    return this.models.get(modelId);
  }

  public listModels(): readonly ModelDescriptor[] {
    return Array.from(this.models.values());
  }

  public listQualifiedModels(): readonly ModelDescriptor[] {
    return Array.from(this.models.values()).filter(
      (m) => m.availability === 'AVAILABLE' && m.qualificationState === 'QUALIFIED'
    );
  }

  public registerCapabilityProfile(profile: ModelCapabilityProfile): void {
    this.capabilityProfiles.set(profile.modelId, { ...profile });
  }

  public getCapabilityProfile(modelId: string): ModelCapabilityProfile | undefined {
    return this.capabilityProfiles.get(modelId);
  }

  public updateQualificationState(modelId: string, state: ModelQualificationState): boolean {
    const existing = this.models.get(modelId);
    if (!existing) return false;
    this.models.set(modelId, {
      ...existing,
      qualificationState: state,
      availability: state === 'QUALIFIED' ? 'AVAILABLE' : (state === 'DEGRADED' ? 'DEGRADED' : 'UNAVAILABLE'),
      lastQualifiedAt: new Date().toISOString(),
    });
    return true;
  }

  public qualifyModel(modelId: string, _verificationIdentity?: string): boolean {
    return this.updateQualificationState(modelId, 'QUALIFIED');
  }

  public recordVerifiedCapability(modelId: string, domain: ModelCapabilityDomain, verified: boolean): void {
    const profile = this.capabilityProfiles.get(modelId);
    if (profile) {
      this.capabilityProfiles.set(modelId, {
        ...profile,
        verifiedCapabilities: {
          ...profile.verifiedCapabilities,
          [domain]: verified,
        },
      });
    }
  }

  public clear(): void {
    this.providers.clear();
    this.models.clear();
    this.capabilityProfiles.clear();
    this.seedDefaults();
  }
}
