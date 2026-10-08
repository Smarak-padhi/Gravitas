import { describe, expect, it } from 'vitest';
import { K5_AUTHORITY_BRAND } from '@gravitas/core';
import { ModelRouter, MODEL_ROUTER_POLICY_VERSION } from '../models/router.js';
import { ModelRegistry } from '../models/registry.js';
import { ModelCapabilityHistory } from '../models/history.js';
import type { TaskModelRequirements } from '../models/types.js';

function createQualifiedFixtureRegistry(): ModelRegistry {
  const registry = new ModelRegistry();
  registry.registerProvider({
    id: 'nvidia-nim',
    name: 'NVIDIA NIM (Cloud Inference)',
    category: 'CLOUD_INFERENCE',
    endpoint: 'https://integrate.api.nvidia.com/v1',
    status: 'AVAILABLE',
    isFreeTierAvailable: true,
    zeroCostPolicyEnforced: true,
    requiresCredentials: true,
    supportedCostClasses: ['FREE_TIER'],
  });
  registry.qualifyModel('meta/llama-3.1-8b-instruct');
  registry.qualifyModel('meta/llama-3.1-70b-instruct');
  registry.qualifyModel('mistralai/mixtral-8x7b-instruct-v0.1');
  return registry;
}

describe('GRAVITAS V1-B — Deterministic Model Router Suite', () => {
  it('1. Deterministic Decision — Identical input always yields identical routing decision on qualified models', () => {
    const registry = createQualifiedFixtureRegistry();
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
    const registry = createQualifiedFixtureRegistry();
    const router = new ModelRouter({ registry });

    const decision = router.resolveModel({ preferredTier: 'FAST' });
    expect(decision.selectedModel).toBe('meta/llama-3.1-8b-instruct');
    expect(decision.qualificationDecision).toBe('QUALIFIED');
    expect(decision.costDecision).toBe('FREE_APPROVED');
    expect(decision.reason).toContain('Deterministically selected');
  });

  it('3. Frontier Candidate Selected — 70B candidate selected when FRONTIER tier requested', () => {
    const registry = createQualifiedFixtureRegistry();
    const router = new ModelRouter({ registry });

    const decision = router.resolveModel({ preferredTier: 'FRONTIER' });
    expect(decision.selectedModel).toBe('meta/llama-3.1-70b-instruct');
    expect(decision.qualificationDecision).toBe('QUALIFIED');
  });

  it('4. Unprobed Catalog Default — Fails closed with AUTH_REQUIRED or NO_QUALIFIED_MODEL', () => {
    // 4a. Default uncredentialed catalog reports AUTH_REQUIRED
    const defaultRegistry = new ModelRegistry();
    const router1 = new ModelRouter({ registry: defaultRegistry });
    const decision1 = router1.resolveModel({});
    expect(decision1.selectedModel).toBeNull();
    expect(decision1.qualificationDecision).toBe('AUTH_REQUIRED');

    // 4b. When provider is AVAILABLE but models are unprobed (METADATA_VALIDATED), reports NO_QUALIFIED_MODEL
    const availableRegistry = new ModelRegistry();
    availableRegistry.registerProvider({
      id: 'nvidia-nim',
      name: 'NVIDIA NIM (Cloud Inference)',
      category: 'CLOUD_INFERENCE',
      endpoint: 'https://integrate.api.nvidia.com/v1',
      status: 'AVAILABLE',
      isFreeTierAvailable: true,
      zeroCostPolicyEnforced: true,
      requiresCredentials: true,
      supportedCostClasses: ['FREE_TIER'],
    });
    const router2 = new ModelRouter({ registry: availableRegistry });
    const decision2 = router2.resolveModel({});
    expect(decision2.selectedModel).toBeNull();
    expect(decision2.qualificationDecision).toBe('NO_QUALIFIED_MODEL');
    expect(decision2.rejectedCandidates.length).toBe(3);
    expect(decision2.rejectedCandidates[0]?.reason).toContain('MODEL_NOT_QUALIFIED');
  });

  it('5. Unsupported Capability Rejected — Fails closed when required capability is missing', () => {
    const registry = createQualifiedFixtureRegistry();
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
    const registry = createQualifiedFixtureRegistry();
    registry.registerProvider({
      id: 'nvidia-nim',
      name: 'NVIDIA NIM',
      category: 'CLOUD_INFERENCE',
      endpoint: 'https://integrate.api.nvidia.com/v1',
      status: 'UNAVAILABLE',
      isFreeTierAvailable: true,
      zeroCostPolicyEnforced: true,
      requiresCredentials: true,
      supportedCostClasses: ['FREE_TIER'],
    });

    const router = new ModelRouter({ registry });
    const decision = router.resolveModel({});

    expect(decision.selectedModel).toBeNull();
    expect(decision.qualificationDecision).toBe('NO_QUALIFIED_MODEL');
    expect(decision.rejectionReasons[0]).toContain('PROVIDER_UNAVAILABLE: nvidia-nim');
  });

  it('7. Provider Auth Required Rejected — Fails closed when provider reports AUTH_REQUIRED', () => {
    const registry = createQualifiedFixtureRegistry();
    registry.registerProvider({
      id: 'nvidia-nim',
      name: 'NVIDIA NIM',
      category: 'CLOUD_INFERENCE',
      endpoint: 'https://integrate.api.nvidia.com/v1',
      status: 'AUTH_REQUIRED',
      isFreeTierAvailable: true,
      zeroCostPolicyEnforced: true,
      requiresCredentials: true,
      supportedCostClasses: ['FREE_TIER'],
    });

    const router = new ModelRouter({ registry });
    const decision = router.resolveModel({});

    expect(decision.selectedModel).toBeNull();
    expect(decision.qualificationDecision).toBe('AUTH_REQUIRED');
    expect(decision.reason).toContain('Authentication required');
  });

  it('8. Paid Model Blocked by Zero-Spend Budget — Paid candidates rejected under $0 policy', () => {
    const registry = createQualifiedFixtureRegistry();
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
    const registry = createQualifiedFixtureRegistry();
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
    const registry = createQualifiedFixtureRegistry();
    const history = new ModelCapabilityHistory();

    // Record high success rate for mixtral (10/10 passes) with valid K5 receipt binding
    for (let i = 0; i < 10; i++) {
      const receiptId = `receipt-k5-mix-${i}`;
      history.registerAuthoritativeReceipt({
        receiptId,
        planId: 'plan-k5-tiebreak-mixtral',
        workSessionId: 'ws-test',
        taskId: `task-mix-${i}`,
        runId: 'run-test',
        attemptNumber: 1,
        verdict: 'VERIFIED_PASS',
        commandsCount: 1,
        passedCommandsCount: 1,
        failedCommandsCount: 0,
        completedAt: new Date(Date.now() - 1000).toISOString(),
        issuedAt: new Date(Date.now() - 1000).toISOString(),
        [K5_AUTHORITY_BRAND]: true,
      });
      history.recordObservation({
        observationId: `obs_mix_${i}`,
        taskId: `task-mix-${i}`,
        taskDomain: 'code_generation',
        taskComplexityClass: 'LOW',
        provider: 'nvidia-nim',
        model: 'mistralai/mixtral-8x7b-instruct-v0.1',
        qualificationIdentity: 'mixtral@v1b',
        attemptNumber: 1,
        k5VerifiedOutcome: 'VERIFIED_PASS',
        latencyMs: 120,
        verificationPlanId: 'plan-k5-tiebreak-mixtral',
        verificationReceiptId: receiptId,
        verificationCompletedAt: new Date(Date.now() - 1000).toISOString(),
        timestamp: new Date().toISOString(),
      });
    }

    // Record low success rate for llama-8b (2/10 passes)
    for (let i = 0; i < 10; i++) {
      const receiptId = `receipt-k5-8b-${i}`;
      const verdict = i < 2 ? 'VERIFIED_PASS' : 'VERIFIED_FAIL';
      history.registerAuthoritativeReceipt({
        receiptId,
        planId: 'plan-k5-tiebreak-8b',
        workSessionId: 'ws-test',
        taskId: `task-8b-${i}`,
        runId: 'run-test',
        attemptNumber: 1,
        verdict,
        commandsCount: 1,
        passedCommandsCount: verdict === 'VERIFIED_PASS' ? 1 : 0,
        failedCommandsCount: verdict === 'VERIFIED_FAIL' ? 1 : 0,
        completedAt: new Date(Date.now() - 1000).toISOString(),
        issuedAt: new Date(Date.now() - 1000).toISOString(),
        [K5_AUTHORITY_BRAND]: true,
      });
      history.recordObservation({
        observationId: `obs_8b_${i}`,
        taskId: `task-8b-${i}`,
        taskDomain: 'code_generation',
        taskComplexityClass: 'LOW',
        provider: 'nvidia-nim',
        model: 'meta/llama-3.1-8b-instruct',
        qualificationIdentity: 'llama8b@v1b',
        attemptNumber: 1,
        k5VerifiedOutcome: verdict,
        latencyMs: 110,
        verificationPlanId: 'plan-k5-tiebreak-8b',
        verificationReceiptId: receiptId,
        verificationCompletedAt: new Date(Date.now() - 1000).toISOString(),
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
