/**
 * Gravitas — Deterministic Model Router (Wave V1-B)
 *
 * Selects AI models without LLM involvement.
 *
 * Invariants:
 * - NO LLM DECIDES WHICH LLM RECEIVES AUTHORITY
 * - ZERO AUTONOMOUS INCREMENTAL SPEND ($0 Out-of-Pocket)
 * - FAIL CLOSED: Unknown cost, unqualified models, and missing auth reject deterministically
 * - COMPLETE EXPLAINABILITY: Every rejection and selection reason recorded
 */

import { ModelCapabilityHistory } from './history.js';
import { ModelRegistry } from './registry.js';
import {
  DEFAULT_V1_B_BUDGET_POLICY,
  type BudgetPolicy,
  type ModelDescriptor,
  type RoutingDecision,
  type RoutingPolicy,
  type TaskModelRequirements,
} from './types.js';

export const MODEL_ROUTER_POLICY_VERSION = '1.0.0';

export const DEFAULT_V1_B_ROUTING_POLICY: RoutingPolicy = {
  policyVersion: MODEL_ROUTER_POLICY_VERSION,
  costConstraint: 'STRICT_ZERO_DOLLAR',
  allowUnverifiedCapabilities: true,
  maxEscalations: 2,
  maxSameModelRetries: 0,
};

export interface ModelRouterOptions {
  readonly registry?: ModelRegistry | undefined;
  readonly history?: ModelCapabilityHistory | undefined;
  readonly defaultBudgetPolicy?: BudgetPolicy | undefined;
  readonly defaultRoutingPolicy?: RoutingPolicy | undefined;
}

export class ModelRouter {
  private readonly registry: ModelRegistry;
  private readonly history: ModelCapabilityHistory;
  private readonly budgetPolicy: BudgetPolicy;
  private readonly routingPolicy: RoutingPolicy;

  public constructor(options?: ModelRouterOptions) {
    this.registry = options?.registry ?? ModelRegistry.getInstance();
    this.history = options?.history ?? ModelCapabilityHistory.getInstance();
    this.budgetPolicy = options?.defaultBudgetPolicy ?? DEFAULT_V1_B_BUDGET_POLICY;
    this.routingPolicy = options?.defaultRoutingPolicy ?? DEFAULT_V1_B_ROUTING_POLICY;
  }

  /**
   * Deterministically resolves a model and provider for the given task requirements.
   */
  public resolveModel(
    requirements: TaskModelRequirements,
    escalationPosition = 0
  ): RoutingDecision {
    const allModels = this.registry.listModels();
    const candidateModels: string[] = [];
    const rejectedCandidates: { modelId: string; reason: string }[] = [];
    const eligible: ModelDescriptor[] = [];

    let seenAuthBlocked = false;
    let seenCostBlocked = false;
    let seenUnknownCostBlocked = false;
    let seenCapabilityUnsupported = false;

    for (const model of allModels) {
      // 1. Excluded models from previous failed attempts in this escalation chain
      if (requirements.excludedModelIds?.includes(model.id)) {
        rejectedCandidates.push({
          modelId: model.id,
          reason: 'EXCLUDED_FROM_PRIOR_FAILED_ATTEMPT',
        });
        continue;
      }

      // 2. Provider availability & status
      const provider = this.registry.getProvider(model.providerId);
      if (!provider || provider.status === 'UNAVAILABLE') {
        rejectedCandidates.push({
          modelId: model.id,
          reason: `PROVIDER_UNAVAILABLE: ${model.providerId}`,
        });
        continue;
      }
      if (provider.status === 'AUTH_REQUIRED') {
        seenAuthBlocked = true;
        rejectedCandidates.push({
          modelId: model.id,
          reason: `PROVIDER_AUTH_REQUIRED: ${model.providerId}`,
        });
        continue;
      }

      // 3. Qualification state
      if (model.qualificationState !== 'QUALIFIED') {
        if (model.qualificationState === 'AUTH_REQUIRED') seenAuthBlocked = true;
        if (model.qualificationState === 'COST_BLOCKED') seenCostBlocked = true;
        rejectedCandidates.push({
          modelId: model.id,
          reason: `MODEL_NOT_QUALIFIED: ${model.qualificationState}`,
        });
        continue;
      }

      // 4. Budget & Cost Enforcement ($0 strictly enforced)
      if (this.budgetPolicy.maxOutOfPocketUsd === 0) {
        if (model.costClass === 'PAID') {
          seenCostBlocked = true;
          rejectedCandidates.push({
            modelId: model.id,
            reason: 'PAID_MODEL_BLOCKED_BY_ZERO_SPEND_POLICY',
          });
          continue;
        }
        if (model.costClass === 'UNKNOWN' && this.budgetPolicy.blockUnknownCost) {
          seenUnknownCostBlocked = true;
          rejectedCandidates.push({
            modelId: model.id,
            reason: 'UNKNOWN_COST_BLOCKED_BY_POLICY',
          });
          continue;
        }
      }

      // 5. Tool Support Requirements
      if (requirements.requiresToolSupport && model.toolSupport !== true) {
        seenCapabilityUnsupported = true;
        rejectedCandidates.push({
          modelId: model.id,
          reason: 'TOOL_SUPPORT_REQUIRED_BUT_UNSUPPORTED',
        });
        continue;
      }

      // 6. Structured Output Requirements
      if (requirements.requiresStructuredOutput && model.structuredOutputSupport !== true) {
        seenCapabilityUnsupported = true;
        rejectedCandidates.push({
          modelId: model.id,
          reason: 'STRUCTURED_OUTPUT_REQUIRED_BUT_UNSUPPORTED',
        });
        continue;
      }

      // 7. Reasoning Support Requirements
      if (requirements.requiresReasoning && model.reasoningSupport !== true) {
        seenCapabilityUnsupported = true;
        rejectedCandidates.push({
          modelId: model.id,
          reason: 'REASONING_SUPPORT_REQUIRED_BUT_UNSUPPORTED',
        });
        continue;
      }

      // 8. Context Window Requirements
      if (
        requirements.minimumContextWindow !== undefined &&
        (typeof model.contextWindow !== 'number' || model.contextWindow < requirements.minimumContextWindow)
      ) {
        seenCapabilityUnsupported = true;
        rejectedCandidates.push({
          modelId: model.id,
          reason: `CONTEXT_WINDOW_TOO_SMALL: requires ${requirements.minimumContextWindow}, has ${model.contextWindow}`,
        });
        continue;
      }

      // 9. Specific Capability Domains
      if (requirements.requiredCapabilities && requirements.requiredCapabilities.length > 0) {
        const profile = this.registry.getCapabilityProfile(model.id);
        let allCapabilitiesSatisfied = true;

        for (const cap of requirements.requiredCapabilities) {
          const declared = profile?.declaredCapabilities[cap] === true;
          const verified = profile?.verifiedCapabilities[cap] === true;
          const satisfied = this.routingPolicy.allowUnverifiedCapabilities ? (declared || verified) : verified;

          if (!satisfied) {
            allCapabilitiesSatisfied = false;
            break;
          }
        }

        if (!allCapabilitiesSatisfied) {
          seenCapabilityUnsupported = true;
          rejectedCandidates.push({
            modelId: model.id,
            reason: `REQUIRED_CAPABILITIES_UNSATISFIED: ${requirements.requiredCapabilities.join(', ')}`,
          });
          continue;
        }
      }

      // All filters passed: model is an eligible candidate
      candidateModels.push(model.id);
      eligible.push(model);
    }

    // Fail-Closed Outcome Handling when no candidates qualify
    if (eligible.length === 0) {
      let qualDecision: RoutingDecision['qualificationDecision'] = 'NO_QUALIFIED_MODEL';
      let costDecision: RoutingDecision['costDecision'] = 'FREE_APPROVED';
      let capDecision: RoutingDecision['capabilityDecision'] = 'SATISFIED';
      let primaryReason = 'No candidate model satisfied all task and policy requirements.';

      if (seenAuthBlocked) {
        qualDecision = 'AUTH_REQUIRED';
        primaryReason = 'Authentication required: credentials missing or unconfigured for eligible providers.';
      } else if (seenCostBlocked) {
        costDecision = 'PAID_BLOCKED';
        primaryReason = 'Candidate models require payment; blocked by zero-dollar budget policy.';
      } else if (seenUnknownCostBlocked) {
        costDecision = 'COST_UNKNOWN_BLOCKED';
        primaryReason = 'Candidate models have unknown cost; blocked fail-closed by budget policy.';
      } else if (seenCapabilityUnsupported) {
        capDecision = 'CAPABILITY_UNSUPPORTED';
        primaryReason = 'No model in registry possesses the required capability profile for this task.';
      }

      return {
        selectedProvider: null,
        selectedModel: null,
        candidateModels,
        rejectedCandidates,
        rejectionReasons: rejectedCandidates.map((r) => `${r.modelId}: ${r.reason}`),
        costDecision,
        qualificationDecision: qualDecision,
        capabilityDecision: capDecision,
        historicalEvidenceUsed: false,
        escalationPosition,
        policyVersion: this.routingPolicy.policyVersion,
        reason: primaryReason,
      };
    }

    // Deterministic Candidate Ranking & Tie-breaking
    // Key 1: Preferred tier match
    // Key 2: Empirical historical K5 verified success rate (descending)
    // Key 3: Context window (descending)
    // Key 4: Lexicographical order by model ID (ascending)
    eligible.sort((a, b) => {
      // 1. Preferred tier
      if (requirements.preferredTier === 'FAST') {
        const aIsFast = a.id.includes('8b') ? 1 : 0;
        const bIsFast = b.id.includes('8b') ? 1 : 0;
        if (aIsFast !== bIsFast) return bIsFast - aIsFast;
      } else if (requirements.preferredTier === 'FRONTIER') {
        const aIsFrontier = a.id.includes('70b') ? 1 : 0;
        const bIsFrontier = b.id.includes('70b') ? 1 : 0;
        if (aIsFrontier !== bIsFrontier) return bIsFrontier - aIsFrontier;
      }

      // 2. Historical K5 verified success rate
      const aHistory = this.history.queryVerifiedSuccessRate(a.id, requirements.taskDomain);
      const bHistory = this.history.queryVerifiedSuccessRate(b.id, requirements.taskDomain);
      if (aHistory.successRate !== bHistory.successRate) {
        return bHistory.successRate - aHistory.successRate;
      }

      // 3. Context window
      const aCtx = typeof a.contextWindow === 'number' ? a.contextWindow : 0;
      const bCtx = typeof b.contextWindow === 'number' ? b.contextWindow : 0;
      if (aCtx !== bCtx) {
        return bCtx - aCtx;
      }

      // 4. Stable tie-breaker: lexicographical order
      return a.id.localeCompare(b.id);
    });

    const chosen = eligible[0]!;
    const historyUsed = this.history.getObservations({ modelId: chosen.id }).length > 0;

    return {
      selectedProvider: chosen.providerId,
      selectedModel: chosen.id,
      candidateModels,
      rejectedCandidates,
      rejectionReasons: rejectedCandidates.map((r) => `${r.modelId}: ${r.reason}`),
      costDecision: 'FREE_APPROVED',
      qualificationDecision: 'QUALIFIED',
      capabilityDecision: 'SATISFIED',
      historicalEvidenceUsed: historyUsed,
      escalationPosition,
      policyVersion: this.routingPolicy.policyVersion,
      reason: `Deterministically selected model '${chosen.id}' via provider '${chosen.providerId}' satisfying all constraints under $0 budget.`,
    };
  }
}
