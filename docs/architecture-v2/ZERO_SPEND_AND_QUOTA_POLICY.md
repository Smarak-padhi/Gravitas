# GRAVITAS — ZERO-SPEND & QUOTA POLICY ARCHITECTURE
## Autonomous Cost Guardrails, Free-Tier Rate Limiting, and Financial Sovereignty

**Document Identifier**: `GRAVITAS-ARCH-P4-006`  
**Governing Milestone**: Wave P4 (Tool Registry + MCP / Plugin / Connector Architecture)  
**Date**: 2026-09-30  
**Repository Baseline Commit**: `516e01c82cb4c3afd1080e72e68a4e1e56687335`  
**Document Status**: Authoritative Policy Contract  

---

### Foundational Invariants `[INVARIANT]`
$$\mathbf{AUTONOMOUS\_INCREMENTAL\_SPEND = 0}$$
$$\mathbf{FREE\_QUOTA\_EXHAUSTED \longrightarrow STOP \mid SAFE\_FREE\_FALLBACK \mid WAIT \quad (\text{NEVER } \longrightarrow BILL)}$$
$$\mathbf{UNKNOWN\_COST \neq FREE \quad (\text{FAIL CLOSED})}$$
$$\mathbf{EXISTING\_ENTITLEMENT \neq FREE\_TIER \neq PERMANENTLY\_FREE}$$
$$\mathbf{SUBSCRIPTION\_IDENTITY \neq API\_ENTITLEMENT}$$
$$\mathbf{COST\ CANNOT\ OVERRIDE\ SAFETY}$$
$$\mathbf{REUSE > ADD\_DEPENDENCY}$$

---

## 1. Zero-Spend Autonomous Mandate & Scope Boundary

GRAVITAS is designed as a desktop-first multi-agent operating system operating under sovereign human authority. The financial principle governing all autonomous operations is absolute:

> **Under no circumstances may a conforming GRAVITAS implementation autonomously create a monetary charge, upgrade an account tier, purchase credits, enter billable overage, initiate a paid subscription, or invoke any capability that incurs incremental monetary cost without prior, explicit, out-of-band human authorization.**

### 1.1 Definition: Zero Incremental Monetary Cost
In this architecture, **zero-spend** specifically and exclusively denotes **zero incremental monetary cost**:
- It **does NOT mean** zero host CPU, zero RAM, zero electricity, zero local NVMe disk usage, or zero background bandwidth.
- It **does NOT mean** refunding or amortizing the sunk cost of an existing operator subscription.
- It **specifically means**: Autonomous activity must **never create a new monetary debit, credit card charge, invoice line item, or paid ledger transaction** beyond an explicitly verified and pre-authorized existing entitlement.
- Physical host resource utilization (CPU, memory, disk, network) is independently governed by `TaskOperationalPolicy` and host OS limits, not by the financial zero-spend policy.

### 1.2 Core Operating Rules:
1. **Default Spend Ceiling**: The autonomous incremental spend budget is specified as strictly `$0.00 USD`.
2. **Fail-Closed on Uncertainty**: If the pricing model, billing status, or marginal cost of an invocation cannot be proven to be zero incremental cost, it is classified as `UNKNOWN_COST` and blocked from autonomous dispatch.
3. **Never Bill on Exhaustion**: When a free tier, quota, or promotional credit is exhausted, the system must **never** transition into paid overage. Permitted transitions are strictly: `STOP`, `SAFE_FREE_FALLBACK`, or `WAIT`.
4. **Subscription Disambiguation**: Possession of a consumer/desktop web subscription (e.g. ChatGPT Plus, Claude Pro, GitHub Copilot Individual) does **not** imply that programmatic API endpoints or third-party gateways are covered. API access must be independently verified as zero incremental cost before invocation.
5. **Cost Cannot Override Safety**: A free capability must never be selected if it fails required security, containment, qualification, or authority constraints. If no safe zero-cost capability exists, execution must halt cleanly and escalate to the operator.

---

## 2. Capability Cost Taxonomy `[ARCHITECTURAL CONTRACT]`

To eliminate ambiguity between "free right now" and "permanently non-billable", the architecture classifies all capabilities, tools, and execution surfaces into eight mutually exclusive cost categories:

```typescript
export type CostCategory =
  /**
   * 1. LOCAL_FOSS: Locally executed, open-source or free software running on host compute.
   * Zero external network dependency, zero usage billing, permanently zero incremental monetary cost.
   * Examples: @gravitas/git, ripgrep, local SQLite, AST parser.
   */
  | 'LOCAL_FOSS'

  /**
   * 2. ALREADY_OWNED: The operator already possesses a perpetual license or system entitlement.
   * Invoking this capability creates zero incremental cost.
   * Examples: Installed Windows OS APIs, local Office license, pre-purchased desktop utilities.
   */
  | 'ALREADY_OWNED'

  /**
   * 3. INCLUDED_SUBSCRIPTION: Capability is explicitly covered by an active flat-rate subscription
   * where the verified terms guarantee zero marginal cost for programmatic usage.
   * Examples: Flat-rate enterprise tooling with unmetered API, unmetered GitHub Team actions.
   */
  | 'INCLUDED_SUBSCRIPTION'

  /**
   * 4. FREE_TIER: An external remote service offering a bounded, recurring free allowance
   * without requiring credit card entry or where overage is strictly disabled.
   * Examples: Brave Search free tier (2,000 queries/mo), GitHub API unauthenticated (60 req/hr).
   */
  | 'FREE_TIER'

  /**
   * 5. FREE_CREDIT: A temporary, finite, or promotional credit balance (e.g., $5 sign-up grant).
   * High risk: will deplete and potentially transition to paid overage or fail abruptly.
   */
  | 'FREE_CREDIT'

  /**
   * 6. PAY_AS_YOU_GO: Metered utility billing where every API call, token, or gigabyte
   * increments a financial ledger. Excluded from default autonomous dispatch.
   */
  | 'PAY_AS_YOU_GO'

  /**
   * 7. PAID_ADDON: An optional feature requiring an explicit plan upgrade, seat expansion,
   * or marketplace transaction. Excluded from default autonomous dispatch.
   */
  | 'PAID_ADDON'

  /**
   * 8. UNKNOWN_COST: Pricing terms, billing meter status, or overage conditions are unverified.
   * Fails closed: treated identically to PAY_AS_YOU_GO until verified.
   */
  | 'UNKNOWN_COST';
```

---

## 3. Cost Eligibility & Quota Data Model `[TYPESCRIPT CONTRACT]`

```typescript
export type OverageBehavior =
  | 'HARD_STOP_REJECT'      // Provider rejects requests when quota is exhausted
  | 'AUTOMATIC_OVERAGE_BILL'// DANGEROUS: Provider silently bills payment method for usage over quota
  | 'THROTTLE_DEGRADE'      // Provider throttles bandwidth/rate but incurs no monetary charge
  | 'UNKNOWN';              // Unverified overage behavior (treated as AUTOMATIC_OVERAGE_BILL)

export interface QuotaDescriptor {
  readonly unit: 'REQUESTS' | 'TOKENS' | 'BYTES' | 'HOURS' | 'CREDITS';
  readonly limitTotal: number;
  readonly remainingObservable?: number | undefined;
  readonly resetTimestampIso?: string | undefined;
  readonly period: 'MINUTE' | 'HOUR' | 'DAY' | 'MONTH' | 'TOTAL_GRANT';
  readonly overageBehavior: OverageBehavior;
  readonly hardSpendingCapConfigured: boolean;
}

export interface CostProfile {
  readonly category: CostCategory;
  readonly incrementalCostPossibility: boolean;
  readonly requiresPaymentMethod: boolean;
  readonly activePromotionalCredit: boolean;
  readonly creditExpiryIso?: string | undefined;
  readonly quotas: readonly QuotaDescriptor[];
  readonly evidenceSource: string;
  readonly evidenceTimestampIso: string;
  readonly confidence: 'PROVEN_LOCAL' | 'VERIFIED_API_DOCS' | 'UNVERIFIED_HEURISTIC';
}

export interface CostEligibilityDecision {
  readonly eligible: boolean;
  readonly decisionCode:
    | 'ZERO_COST_ALLOWED'
    | 'AUTHORIZED_ENTITLEMENT_ALLOWED'
    | 'BLOCK_PAID_CAPABILITY_EXCLUDED'
    | 'BLOCK_UNKNOWN_COST_FAIL_CLOSED'
    | 'BLOCK_COST_EVIDENCE_STALE'
    | 'BLOCK_QUOTA_EXHAUSTED'
    | 'BLOCK_QUOTA_RESERVE_VIOLATION'
    | 'BLOCK_CREDIT_EXPIRING_SOON'
    | 'BLOCK_OVERAGE_RISK_DETECTED';
  readonly reason: string;
  readonly evaluatedCategory: CostCategory;
  readonly fallbackRecommendation?: string | undefined;
}
```

---

## 4. Multi-Signal Billing Detection Architecture `[ARCHITECTURAL CONTRACT]`

Conforming implementations must **not** rely exclusively on HTTP response status codes (such as HTTP 402 or 429) to determine billing state. External providers use heterogeneous protocols and status conventions.

### 4.1 Canonical Normalized Provider States
Capability adapters must translate provider-specific signals into standardized internal kernel states:

```typescript
export type NormalizedProviderStatus =
  | 'OPERATIONAL'                // Normal execution; zero-cost quota verified
  | 'RATE_LIMITED'               // Temporal throughput exceeded (e.g. burst/RPM limit)
  | 'QUOTA_EXHAUSTED'            // Volume allowance depleted for the current period
  | 'PAYMENT_REQUIRED'           // Explicit billing paywall or metered debit signal
  | 'AUTHORIZATION_DENIED'       // Scopes, tokens, or permissions invalid
  | 'BILLING_STATE_CHANGED'      // Provider terms, tier, or card status transitioned
  | 'UNKNOWN_PROVIDER_REJECTION';// Unrecognized rejection format (fails closed)
```

### 4.2 Multi-Signal Ingestion Sources
Adapters must synthesize billing and quota status across multiple observable evidence channels:
1. **Documented API Response Bodies**: JSON error payloads containing specific rejection codes (e.g. `insufficient_quota`, `credit_exhausted`, `billing_not_active`).
2. **Dedicated Quota Endpoints**: Explicit telemetry queries to vendor status/usage APIs (e.g. `/v1/usage`, `/user/rate_limit`).
3. **Account & Entitlement Metadata**: Local configuration specifying pre-authenticated license tiers, contract bounds, or organization policies.
4. **Transport Headers**: Provider-specific headers (`X-RateLimit-*`, `Retry-After`, `X-Account-Tier`, vendor quota headers) inspected where documented.
5. **Static Qualification Evidence**: Cryptographically pinned qualification dossiers recorded during tool onboarding.
6. **Operator Declaration**: Explicit out-of-band operator configurations designating specific endpoints as covered by enterprise billing.

*Fail-Safe Rule*: If a provider's rejection response does not match documented, expected structures, it is classified as `UNKNOWN_PROVIDER_REJECTION` and fails closed.

---

## 5. Configurable Pricing Freshness Policy (`PricingFreshnessPolicy`)

Pricing terms, free tiers, and promotional credits are volatile. However, fixed intervals (such as a hardcoded 30-day window) are an architectural anti-pattern. Conforming implementations must evaluate evidence freshness according to a configurable `PricingFreshnessPolicy`.

### 5.1 Policy Definition
```typescript
export interface PricingFreshnessRule {
  readonly costCategory: CostCategory;
  /** Maximum duration (in seconds) that cached pricing evidence remains valid */
  readonly maximumTtlSeconds: number;
  /** Whether external network verification is required upon TTL expiration */
  readonly requireRevalidation: boolean;
}

export interface PricingFreshnessPolicy {
  readonly rules: readonly PricingFreshnessRule[];
  /** Default fallback TTL for unlisted categories */
  readonly defaultTtlSeconds: number;
  /** Whether promotional credits require daily freshness checks */
  readonly strictPromotionalCreditTtl: boolean;
}
```

### 5.2 Architectural Requirement
> **Architecture Requirement**: Cost evidence for potentially billable external capabilities must be sufficiently fresh according to the active `PricingFreshnessPolicy` before autonomous zero-spend eligibility can be established.

If pricing evidence is older than the policy-specified TTL:
1. The tool's cost status transitions to `COST_EVIDENCE_STALE`.
2. Autonomous dispatch of that capability is blocked (`BLOCK_COST_EVIDENCE_STALE`).
3. The tool must undergo asynchronous pricing revalidation or receive operator re-attestation before returning to an eligible state.

### 5.3 Non-Normative Reference Examples `[NON-NORMATIVE EXAMPLE]`
*The following numbers are illustrative reference examples, NOT universal architectural constants:*
- `LOCAL_FOSS`: `maximumTtlSeconds: 31536000` (1 year / perpetual; local code does not change pricing).
- `ALREADY_OWNED`: `maximumTtlSeconds: 7776000` (90 days; local software licenses change rarely).
- `INCLUDED_SUBSCRIPTION`: `maximumTtlSeconds: 2592000` (30 days; subscription terms review cycle).
- `FREE_TIER`: `maximumTtlSeconds: 1209600` (14 days; vendor free-tier monitoring).
- `FREE_CREDIT`: `maximumTtlSeconds: 86400` (24 hours; fast-expiring promotional balances).

---

## 6. Configurable Retry & Financial Safety Budget (`ToolRetryBudget`)

A common financial vulnerability in autonomous agent frameworks is the **retry storm**: when an external API fails, naive loops repeatedly retry invocations, burning through token allotments, free quotas, or promotional credits.

### 6.1 Architectural Requirement
> **Architecture Requirement**: Retries on external capabilities must be strictly bounded by configurable operational policy and must terminate before they can create uncontrolled quota, token, compute, or financial exposure.

### 6.2 Policy Contract
```typescript
export interface ToolRetryBudget {
  /** Maximum consecutive attempts for transient failures before circuit breaker opens */
  readonly maxAttempts: number;
  /** Minimum and maximum backoff duration in milliseconds */
  readonly initialBackoffMs: number;
  readonly maxBackoffMs: number;
  readonly backoffJitterFactor: number;
  /** Maximum quota or credit consumption permitted across all retries in a single task */
  readonly maxQuotaDrainUnits: number;
  /** Action taken when retry budget is exhausted */
  readonly onExhausted: 'CIRCUIT_BREAKER_TRIP_DEGRADE' | 'FAIL_TASK_HALT' | 'ESCALATE_HUMAN';
}
```

### 6.3 Non-Normative Reference Examples `[NON-NORMATIVE EXAMPLE]`
*The following numbers are illustrative reference examples, NOT universal architectural constants:*
- Default transient max attempts: `maxAttempts: 3` (configurable per task or role).
- Default initial backoff: `initialBackoffMs: 1000` with exponential multiplier $2.0$.
- Default maximum task quota drain: `maxQuotaDrainUnits: 5` calls.

When `maxAttempts` or `maxQuotaDrainUnits` is exceeded, the circuit breaker opens, transitioning the tool instance to `DEGRADED` or `RATE_LIMITED` and preventing further invocations.

---

## 7. Configurable Quota Reserve Policy (`QuotaReservePolicy`)

Autonomous agents must not monopolize 100% of an operator's free service allowances, leaving zero capacity for interactive human workflows.

```typescript
export interface QuotaReservePolicy {
  /** Fraction of total free quota reserved for the human operator (e.g. 0.20 = 20%) [NON-NORMATIVE EXAMPLE] */
  readonly operatorReserveFraction: number;

  /** Minimum absolute quota units that must remain before autonomous dispatch */
  readonly minimumAbsoluteReserve: number;

  /** Action taken when reserve threshold is breached */
  readonly onReserveBreached: 'STOP' | 'DEFER_UNTIL_RESET' | 'FALLBACK_LOCAL';

  /** Whether emergency tasks (e.g. disaster recovery, safety rollback) may consume reserve */
  readonly emergencyOverridePermitted: boolean;
}
```

*Architectural Invariant*: Specific reserve percentages (such as 20%) are **configurable policy**, not hardcoded constants.

---

## 8. Capability Selection & Cost Preference Policy (`CostPreferencePolicy`)

### 8.1 Prerequisites Before Cost Evaluation
In GRAVITAS, candidates must satisfy mandatory structural gates **prior** to any cost-based ranking:
$$\mathbf{Security\ Gate} \longrightarrow \mathbf{Containment\ Gate} \longrightarrow \mathbf{Qualification\ Gate} \longrightarrow \mathbf{Authority\ Grant\ Gate} \longrightarrow \mathbf{Cost\ Eligibility\ Check}$$

**Under no circumstances may a free tool outrank an ineligible candidate merely through scoring mathematics.** If a candidate fails security or qualification, it is eliminated before cost ranking.

### 8.2 Semantic Cost Preference Policy
Rather than relying on arbitrary "magic" score numbers (+500, +400), selection order is governed by an explicit semantic preference policy:

```typescript
export interface CostPreferencePolicy {
  /** Explicit ordered ranking of cost categories */
  readonly preferredCategoryOrder: readonly CostCategory[];
  /** Secondary tie-breaking dimensions */
  readonly tieBreakers: readonly ('LOWEST_LATENCY' | 'LOCAL_TRANSPORT' | 'HIGHEST_RELIABILITY')[];
}

export const DEFAULT_COST_PREFERENCE_POLICY: CostPreferencePolicy = {
  preferredCategoryOrder: [
    'LOCAL_FOSS',
    'ALREADY_OWNED',
    'INCLUDED_SUBSCRIPTION',
    'FREE_TIER',
    'FREE_CREDIT',
    // PAY_AS_YOU_GO, PAID_ADDON, and UNKNOWN_COST are excluded under AUTONOMOUS_INCREMENTAL_SPEND = 0
  ],
  tieBreakers: ['LOCAL_TRANSPORT', 'LOWEST_LATENCY', 'HIGHEST_RELIABILITY'],
};
```

---

## 9. AI Model & Inference Cost Policy

The zero-spend invariant applies with equal force to LLM inference and harness execution:
1. **Local Model Invariant**: Local models executed on host GPU/CPU (e.g. via Ollama, llama.cpp, LocalAI) are classified as `LOCAL_FOSS` (zero incremental monetary cost).
2. **Subscription Disambiguation**: Chat web subscriptions (e.g. Claude Pro, ChatGPT Plus) **do not** include OpenAI API or Anthropic API access. An agent cannot call `api.openai.com` or `api.anthropic.com` under a web subscription without creating metered charges.
3. **Gateway Disambiguation**: OmniRoute or local proxy gateways routing requests to upstream cloud providers must pass the `CostEligibilityCheck` for the target upstream provider before dispatching.
4. **Harness Qualification**: If a harness requires paid API inference, it is marked as `PAID_EXCLUDED_BY_DEFAULT`. It cannot be selected autonomously while `AUTONOMOUS_INCREMENTAL_SPEND = 0`.

---

## 10. Payment-Instrument Boundary & Sovereign Human Financial Gate

To preserve absolute safety while maintaining flexibility for future product expansion, the architecture establishes a strict separation between autonomous agent authority and human payment workflows:

$$\mathbf{AGENT\_PAYMENT\_AUTHORITY = NONE \quad (STRICT\ DEFAULT)}$$
$$\mathbf{HUMAN\_INITIATED\_EXTERNAL\_PAYMENT \quad (OUT-OF-BAND\ ONLY)}$$

### 10.1 Agent Payment Authority Prohibition
1. Autonomous agents, roles, and executors have **zero authority** to initiate financial debits, execute purchases, link credit cards, or approve billing upgrades.
2. The Credential Broker strictly refuses to store, manage, or inject payment instruments (credit card numbers, CVVs, bank account routing numbers, or payment gateway API tokens with unrestricted charge permissions) into agent contexts or tool execution transports.
3. Any attempt by a tool or agent to query or acquire payment credentials triggers an immediate kernel security exception (`PAYMENT_CREDENTIALS_PROHIBITED`).

### 10.2 Human-Initiated External Payment Workflows
1. If an operator explicitly chooses to purchase an API credit package, subscribe to a service tier, or provision a paid cloud resource, that transaction occurs **exclusively out-of-band under direct human interaction**.
2. Following the human transaction, GRAVITAS may later be instructed to observe the resulting entitlement (e.g. reading a scoped API token or updated quota balance) **without ever possessing or storing the underlying payment instrument**.
3. This preserves full future commercial and operational flexibility while maintaining the zero-spend autonomous guarantee.

```typescript
export interface FinancialAuthorizationRequest {
  readonly authorizationId: string;
  readonly toolId: string;
  readonly providerName: string;
  readonly costCategory: 'PAY_AS_YOU_GO' | 'PAID_ADDON' | 'TIER_UPGRADE';
  readonly estimatedChargeRange: {
    readonly minUsd: number;
    readonly maxUsd: number;
    readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  readonly reason: string;
  readonly requiredOperatorAction:
    | 'APPROVE_EXPLICIT_SPEND_BUDGET'
    | 'LINK_PAYMENT_METHOD'
    | 'MANUAL_PORTAL_INTERVENTION';
  readonly hardSpendingCapMandatory: boolean;
}
```
