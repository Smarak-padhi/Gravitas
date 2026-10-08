/**
 * Gravitas — Model Domain Types (Wave V1-B)
 *
 * Distinct authority layer for Model Intelligence, Capabilities, and Routing.
 *
 * Invariants:
 * - MODEL_ROUTING != TRANSPORT_ROUTING
 * - PROVIDER != GATEWAY
 * - MODEL != PROVIDER
 * - MODEL != HARNESS
 * - HARNESS != GATEWAY
 * - GATEWAY != PROCESS
 * - ROLE != MODEL
 * - ZERO AUTONOMOUS INCREMENTAL SPEND ($0 Out-of-Pocket)
 */

export type ModelCapabilityDomain =
  | 'CODE_GENERATION'
  | 'CODE_REPAIR'
  | 'REASONING'
  | 'PLANNING'
  | 'SUMMARIZATION'
  | 'DESIGN_CRITIQUE'
  | 'TOOL_USE'
  | 'STRUCTURED_OUTPUT';

export type ModelCostClass = 'ZERO_DOLLAR_FREE' | 'PAID' | 'UNKNOWN';

export type ModelPrivacyClass = 'PUBLIC' | 'COMMERCIAL_NO_TRAIN' | 'SELF_HOSTED' | 'UNKNOWN';

export type ModelSource = 'NVIDIA_CATALOG' | 'COMMUNITY' | 'LOCAL' | 'MANUAL';

export type ModelQualificationState =
  | 'DISCOVERED'
  | 'METADATA_VALIDATED'
  | 'AUTH_AVAILABLE'
  | 'ZERO_COST_ELIGIBLE'
  | 'CAPABILITY_PROBED'
  | 'QUALIFIED'
  | 'UNAVAILABLE'
  | 'AUTH_REQUIRED'
  | 'COST_BLOCKED'
  | 'CAPABILITY_FAILED'
  | 'DEGRADED'
  | 'DISABLED';

export interface ProviderDescriptor {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly status: 'AVAILABLE' | 'UNAVAILABLE' | 'AUTH_REQUIRED' | 'DEGRADED';
  readonly transportSupport: readonly ('DIRECT' | 'GATEWAY')[];
  readonly authType: 'BEARER_TOKEN' | 'NONE';
  readonly credentialRef?: string | undefined;
}

export interface ModelCostKnowledge {
  readonly currency: 'USD';
  readonly pricePer1kPrompt: number;
  readonly pricePer1kCompletion: number;
  readonly isFreeDeveloperTier: boolean;
}

export interface ModelDescriptor {
  readonly id: string;
  readonly providerId: string;
  readonly displayName: string;
  readonly availability: 'AVAILABLE' | 'UNAVAILABLE' | 'DEGRADED';
  readonly qualificationState: ModelQualificationState;
  readonly modalities: readonly ('TEXT' | 'CODE' | 'VISION' | 'AUDIO')[];
  readonly toolSupport: boolean | 'UNKNOWN';
  readonly streamingSupport: boolean | 'UNKNOWN';
  readonly contextWindow: number | 'UNKNOWN';
  readonly reasoningSupport: boolean | 'UNKNOWN';
  readonly structuredOutputSupport: boolean | 'UNKNOWN';
  readonly costClass: ModelCostClass;
  readonly costKnowledge: ModelCostKnowledge;
  readonly privacyClass: ModelPrivacyClass;
  readonly source: ModelSource;
  readonly sourceVersion: string;
  readonly lastQualifiedAt?: string | undefined;
}

export interface ModelCapabilityProfile {
  readonly modelId: string;
  readonly providerId: string;
  readonly declaredCapabilities: Partial<Record<ModelCapabilityDomain, boolean>>;
  readonly verifiedCapabilities: Partial<Record<ModelCapabilityDomain, boolean>>;
}

export interface TaskModelRequirements {
  readonly requiredCapabilities?: readonly ModelCapabilityDomain[] | undefined;
  readonly preferredCostClass?: ModelCostClass | undefined;
  readonly requiresToolSupport?: boolean | undefined;
  readonly requiresStructuredOutput?: boolean | undefined;
  readonly requiresReasoning?: boolean | undefined;
  readonly minimumContextWindow?: number | undefined;
  readonly preferredTier?: 'FAST' | 'FRONTIER' | undefined;
  readonly taskDomain?: string | undefined;
  readonly taskComplexityClass?: 'LOW' | 'MEDIUM' | 'HIGH' | undefined;
  readonly riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | undefined;
  readonly excludedModelIds?: readonly string[] | undefined;
}

export interface RoutingPolicy {
  readonly policyVersion: string;
  readonly costConstraint: 'STRICT_ZERO_DOLLAR' | 'ANY';
  readonly allowUnverifiedCapabilities: boolean;
  readonly maxEscalations: number;
  readonly maxSameModelRetries: number;
}

export interface RoutingDecision {
  readonly selectedProvider: string | null;
  readonly selectedModel: string | null;
  readonly candidateModels: readonly string[];
  readonly rejectedCandidates: readonly { readonly modelId: string; readonly reason: string }[];
  readonly rejectionReasons: readonly string[];
  readonly costDecision: 'FREE_APPROVED' | 'COST_UNKNOWN_BLOCKED' | 'PAID_BLOCKED';
  readonly qualificationDecision: 'QUALIFIED' | 'UNQUALIFIED' | 'AUTH_REQUIRED' | 'NO_QUALIFIED_MODEL';
  readonly capabilityDecision: 'SATISFIED' | 'CAPABILITY_UNSUPPORTED';
  readonly historicalEvidenceUsed: boolean;
  readonly escalationPosition: number;
  readonly policyVersion: string;
  readonly reason: string;
}

export interface BudgetPolicy {
  readonly maxOutOfPocketUsd: number;
  readonly paidFallbackPermitted: boolean;
  readonly autoPurchasePermitted: boolean;
  readonly autoBillingChangePermitted: boolean;
  readonly autoCreditPurchasePermitted: boolean;
  readonly blockUnknownCost: boolean;
}

export const DEFAULT_V1_B_BUDGET_POLICY: BudgetPolicy = {
  maxOutOfPocketUsd: 0,
  paidFallbackPermitted: false,
  autoPurchasePermitted: false,
  autoBillingChangePermitted: false,
  autoCreditPurchasePermitted: false,
  blockUnknownCost: true,
};

export interface EscalationPolicy {
  readonly maxEscalations: number;
  readonly maxSameModelRetries: number;
}

export const DEFAULT_V1_B_ESCALATION_POLICY: EscalationPolicy = {
  maxEscalations: 2,
  maxSameModelRetries: 0,
};

export type EscalationActionType =
  | 'ESCALATE_TO_NEXT_MODEL'
  | 'RETRY_SAME_MODEL'
  | 'STOP_AND_REQUIRE_HUMAN';

export interface EscalationAction {
  readonly action: EscalationActionType;
  readonly reason: string;
  readonly humanGateRequired: boolean;
  readonly escalationPosition: number;
}

export interface ModelExecutionObservation {
  readonly observationId: string;
  readonly taskDomain: string;
  readonly taskComplexityClass: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly provider: string;
  readonly model: string;
  readonly qualificationIdentity: string;
  readonly attemptNumber: number;
  readonly k5VerifiedOutcome: 'VERIFIED_PASS' | 'VERIFIED_FAIL' | 'INCONCLUSIVE' | 'NOT_RUN';
  readonly latencyMs: number;
  readonly tokenUsage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  } | undefined;
  readonly failureClass?: string | undefined;
  readonly verificationPlanId?: string | undefined;
  readonly verificationReceiptId?: string | undefined;
  readonly verificationCompletedAt?: string | undefined;
  readonly timestamp: string;
}
