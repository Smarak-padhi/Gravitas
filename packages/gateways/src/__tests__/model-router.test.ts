import { describe, expect, it } from 'vitest';
import { ModelRouter, MODEL_ROUTER_POLICY_VERSION } from '../models/router.js';
import { ModelRegistry } from '../models/registry.js';
import { ModelCapabilityHistory } from '../models/history.js';
import type { TaskModelRequirements } from '../models/types.js';

describe('GRAVITAS V1-B — Deterministic Model Router Suite', () => {
  it('1. Deterministic Decision — Identical input always yields identical routing decision', () => {
    const registry = new ModelRegistry();
    const history = new ModelCapabilityHistory();
    const router = new ModelRouter({ registry, history });

    const req: TaskModelRequirements = {
      taskDomain: 'code_generation',
      taskComplexityClass: 'LOW',
      preferredTier: 'FAST',
    };

    const decision1 = router.resolveModel(req);
    const decision2 = router.resolveModel(req);

    expect(decision1.selectedModel).toBe('meta/llama-3.1-8b-instruct');
    expect(decision1.selectedProvider).toBe('nvidia-nim');
    expect(decision1.costDecision).toBe('FREE_APPROVED');
    expect(decision1.qualificationDecision).toBe('QUALIFIED');
    expect(decision1.policyVersion).toBe(MODEL_ROUTER_POLICY_VERSION);

    // Deep equality check proves strict determinism
    expect(decision1).toEqual(decision2);
  });

  it('2. Qualified Candidate Selected — Fast candidate selected when FAST tier requested', () => {
    const registry = new ModelRegistry();
    const router = new ModelRouter({ registry });

    const decision = router.resolveModel({ preferredTier: 'FAST' });
    expect(decision.selectedModel).toBe('meta/llama-3.1-8b-instruct');
    expect(decision.qualificationDecision).toBe('QUALIFIED');
    expect(decision.costDecision).toBe('FREE_APPROVED');
    expect(decision.reason).toContain('Deterministically selected');
  });

  it('3. Frontier Candidate Selected — 70B candidate selected when FRONTIER tier requested', () => {
    const registry = new ModelRegistry();
    const router = new ModelRouter({ registry });

    const decision = router.resolveModel({ preferredTier: 'FRONTIER' });
    expect(decision.selectedModel).toBe('meta/llama-3.1-70b-instruct');
    expect(decision.qualificationDecision).toBe('QUALIFIED');
  });

  it('4. Unqualified Candidate Rejected — Unqualified models cannot be selected', () => {
    const registry = new ModelRegistry();
    registry.updateQualificationState('meta/llama-3.1-8b-instruct', 'UNAVAILABLE');
    registry.updateQualificationState('meta/llama-3.1-70b-instruct', 'DEGRADED');
    registry.updateQualificationState('mistralai/mixtral-8x7b-instruct-v0.1', 'DISABLED');

    const router = new ModelRouter({ registry });
    const decision = router.resolveModel({});

    expect(decision.selectedModel).toBeNull();
    expect(decision.qualificationDecision).toBe('NO_QUALIFIED_MODEL');
    expect(decision.rejectedCandidates.length).toBe(3);
    expect(decision.rejectedCandidates[0]?.reason).toContain('MODEL_NOT_QUALIFIED');
  });

  it('5. Unsupported Capability Rejected — Fails closed when required capability is missing', () => {
    const registry = new ModelRegistry();
    const router = new ModelRouter({ registry });

    // Request non-existent or unsupported modality / context requirement
    const decision = router.resolveModel({
      minimumContextWindow: 200000, // Exceeds all candidate context windows (max is 128k)
    });

    expect(decision.selectedModel).toBeNull();
    expect(decision.capabilityDecision).toBe('CAPABILITY_UNSUPPORTED');
    expect(decision.reason).toContain('No model in registry possesses the required capability');
  });

  it('6. Provider Unavailable Rejected — Fails closed when provider is unavailable', () => {
    const registry = new ModelRegistry();
    registry.registerProvider({
      id: 'nvidia-nim',
      name: 'NVIDIA NIM',
      baseUrl: 'https://integrate.api.nvidia.com',
      status: 'UNAVAILABLE',
      transportSupport: ['DIRECT'],
      authType: 'BEARER_TOKEN',
    });

    const router = new ModelRouter({ registry });
    const decision = router.resolveModel({});

    expect(decision.selectedModel).toBeNull();
    expect(decision.qualificationDecision).toBe('NO_QUALIFIED_MODEL');
    expect(decision.rejectionReasons[0]).toContain('PROVIDER_UNAVAILABLE: nvidia-nim');
  });

  it('7. Provider Auth Required Rejected — Fails closed when provider reports AUTH_REQUIRED', () => {
    const registry = new ModelRegistry();
    registry.registerProvider({
      id: 'nvidia-nim',
      name: 'NVIDIA NIM',
      baseUrl: 'https://integrate.api.nvidia.com',
      status: 'AUTH_REQUIRED',
      transportSupport: ['DIRECT'],
      authType: 'BEARER_TOKEN',
    });

    const router = new ModelRouter({ registry });
    const decision = router.resolveModel({});

    expect(decision.selectedModel).toBeNull();
    expect(decision.qualificationDecision).toBe('AUTH_REQUIRED');
    expect(decision.reason).toContain('Authentication required');
  });

  it('8. Paid Model Blocked by Zero-Spend Budget — Paid candidates rejected under $0 policy', () => {
    const registry = new ModelRegistry();
    // Register a paid model
    registry.registerModel({
      id: 'custom/paid-model-405b',
      providerId: 'nvidia-nim',
      displayName: 'Paid Frontier 405B',
      availability: 'AVAILABLE',
      qualificationState: 'QUALIFIED',
      modalities: ['TEXT', 'CODE'],
      toolSupport: true,
      streamingSupport: true,
      contextWindow: 131072,
      reasoningSupport: true,
      structuredOutputSupport: true,
      costClass: 'PAID',
      costKnowledge: {
        currency: 'USD',
        pricePer1kPrompt: 0.05,
        pricePer1kCompletion: 0.15,
        isFreeDeveloperTier: false,
      },
      privacyClass: 'COMMERCIAL_NO_TRAIN',
      source: 'MANUAL',
      sourceVersion: '1.0',
    });

    // Exclude free models to isolate paid candidate
    const router = new ModelRouter({ registry });
    const decision = router.resolveModel({
      excludedModelIds: [
        'meta/llama-3.1-8b-instruct',
        'meta/llama-3.1-70b-instruct',
        'mistralai/mixtral-8x7b-instruct-v0.1',
      ],
    });

    expect(decision.selectedModel).toBeNull();
    expect(decision.costDecision).toBe('PAID_BLOCKED');
    expect(decision.reason).toContain('Candidate models require payment; blocked by zero-dollar budget policy');
  });

  it('9. Unknown Cost Blocked Fail-Closed — Models with unknown pricing rejected under default policy', () => {
    const registry = new ModelRegistry();
    registry.registerModel({
      id: 'custom/unknown-cost-model',
      providerId: 'nvidia-nim',
      displayName: 'Unknown Cost Model',
      availability: 'AVAILABLE',
      qualificationState: 'QUALIFIED',
      modalities: ['TEXT'],
      toolSupport: false,
      streamingSupport: false,
      contextWindow: 4096,
      reasoningSupport: false,
      structuredOutputSupport: false,
      costClass: 'UNKNOWN',
      costKnowledge: {
        currency: 'USD',
        pricePer1kPrompt: -1,
        pricePer1kCompletion: -1,
        isFreeDeveloperTier: false,
      },
      privacyClass: 'UNKNOWN',
      source: 'MANUAL',
      sourceVersion: '1.0',
    });

    const router = new ModelRouter({ registry });
    const decision = router.resolveModel({
      excludedModelIds: [
        'meta/llama-3.1-8b-instruct',
        'meta/llama-3.1-70b-instruct',
        'mistralai/mixtral-8x7b-instruct-v0.1',
      ],
    });

    expect(decision.selectedModel).toBeNull();
    expect(decision.costDecision).toBe('COST_UNKNOWN_BLOCKED');
    expect(decision.reason).toContain('unknown cost; blocked fail-closed');
  });

  it('10. Historical Evidence Tie-Breaking — Model with superior K5 verified pass rate wins tie-break', () => {
    const registry = new ModelRegistry();
    const history = new ModelCapabilityHistory();

    // Record high success rate for mixtral (10/10 passes)
    for (let i = 0; i < 10; i++) {
      history.recordObservation({
        observationId: `obs_mix_${i}`,
        taskDomain: 'code_generation',
        taskComplexityClass: 'LOW',
        provider: 'nvidia-nim',
        model: 'mistralai/mixtral-8x7b-instruct-v0.1',
        qualificationIdentity: 'mixtral@v1b',
        attemptNumber: 1,
        k5VerifiedOutcome: 'VERIFIED_PASS',
        latencyMs: 120,
        timestamp: new Date().toISOString(),
      });
    }

    // Record low success rate for llama-8b (2/10 passes)
    for (let i = 0; i < 10; i++) {
      history.recordObservation({
        observationId: `obs_8b_${i}`,
        taskDomain: 'code_generation',
        taskComplexityClass: 'LOW',
        provider: 'nvidia-nim',
        model: 'meta/llama-3.1-8b-instruct',
        qualificationIdentity: 'llama8b@v1b',
        attemptNumber: 1,
        k5VerifiedOutcome: i < 2 ? 'VERIFIED_PASS' : 'VERIFIED_FAIL',
        latencyMs: 110,
        timestamp: new Date().toISOString(),
      });
    }

    const router = new ModelRouter({ registry, history });
    const decision = router.resolveModel({
      taskDomain: 'code_generation',
      excludedModelIds: ['meta/llama-3.1-70b-instruct'], // Exclude 70B
    });

    // Mixtral wins because its verified success rate is 100% vs 20%
    expect(decision.selectedModel).toBe('mistralai/mixtral-8x7b-instruct-v0.1');
    expect(decision.historicalEvidenceUsed).toBe(true);
  });
});
