/**
 * GRAVITAS K1 — AWS Bedrock API Surface Adapter (Stub)
 *
 * Implements the K1 ApiHarness contract for AWS Bedrock.
 *
 * QUALIFICATION STATUS AS OF 2026-10-02:
 * - AWS CLI: NOT INSTALLED (not found on PATH)
 * - AWS credentials in environment: NONE detected
 * - Bedrock entitlement: TEMPORARY_PROMOTIONAL_CREDIT_ENTITLEMENT (from POST_P8_PROVIDER_ENVIRONMENT_DELTA.md)
 * - SDK: @aws-sdk/client-bedrock-runtime NOT installed (deferred from K0)
 * - Cost eligibility: PROMOTIONAL_CREDIT (NOT PERMANENTLY FREE)
 * - Qualification state: DISCOVERED (account known) — NOT INSTALLED (no SDK)
 * - Autonomous dispatch: BLOCKED_COST_UNKNOWN
 *
 * CRITICAL INVARIANTS:
 * - PROMOTIONAL CREDIT != PERMANENTLY FREE
 * - UNKNOWN_COST fails closed — NEVER silently converts to paid inference
 * - Converting to paid plan does NOT grant autonomous spend authorization
 *   without explicit sovereign human financial approval
 * - Zero raw AWS credentials in source, SQLite, logs, prompts, tests, fixtures, screenshots
 *
 * This adapter is a structural STUB. It:
 * 1. Implements the K1 ApiHarness interface
 * 2. Returns NOT_INSTALLED at qualification
 * 3. Returns COST_ELIGIBILITY_UNKNOWN at readiness
 * 4. Throws HarnessError on any execute() call
 *
 * Real Bedrock SDK integration is DEFERRED to K2+ when:
 * - @aws-sdk/client-bedrock-runtime is explicitly installed (zero-spend, license-safe)
 * - Promotional credit balance is proven at dispatch time
 * - Human grants explicit Bedrock dispatch authorization
 *
 * Preserves: ROLE != HARNESS != MODEL != PROVIDER != GATEWAY != PROCESS
 *            Bedrock != "a model" != "Claude"
 *
 * Taxonomy:
 *   Role → Cognitive responsibility
 *   Executor → Leased task execution agent
 *   Harness → BedrockHarness (this adapter)
 *   Gateway/Transport → AWS Bedrock Runtime HTTP/SigV4
 *   Provider Boundary → AWS credential and account boundary
 *   Model Publisher → Anthropic, Amazon, Meta, Cohere, etc.
 *   Model → Specific foundation model/inference profile
 *   Process → Ephemeral Node execution context
 */

import type {
  ExecutionRequest,
  ExecutionResult,
  HarnessQualificationSnapshot,
  HarnessCapabilities,
  HarnessAuthorityRequirements,
  CancellationHandle,
} from './types.js'
import type {
  ApiHarness,
  ReadinessCheckResult,
} from './harness.js'
import {
  buildQualificationSnapshot,
} from './qualification.js'
import { HarnessError } from './types.js'

/** Capability ceiling for Bedrock (DOCUMENTED — not yet SDK-probed). */
const BEDROCK_CAPABILITIES: HarnessCapabilities = {
  textGeneration: true,
  structuredOutput: true,       // Foundation models support structured output via Converse API
  streaming: true,              // Bedrock InvokeModelWithResponseStream
  filesystemRead: false,        // API harness — no filesystem access
  filesystemWrite: false,       // API harness — no filesystem access
  shellExecution: false,        // API harness — no shell
  networkAccess: true,          // Outbound to AWS Bedrock endpoint
  toolCalling: true,            // Bedrock Converse API supports tool use
  sessionResume: false,         // Stateless API per-request
  imageInput: true,             // Some models (Claude 3+, Nova) support images
  browserAccess: false,
  longContext: true,            // Claude 3.5 Sonnet: 200k tokens; other models vary
  evidenceBasis: 'DOCUMENTED', // Bedrock SDK documentation; NOT yet empirically probed
}

/** Authority requirements for Bedrock. */
const BEDROCK_AUTHORITY_REQUIREMENTS: HarnessAuthorityRequirements = {
  filesystemRead: false,
  filesystemWrite: false,
  shellExecution: false,
  networkOutbound: true,        // Required for AWS Bedrock API calls
  credentialAccess: true,       // Requires AWS credential chain (via CredentialReference)
  worktreeScope: false,         // Not applicable — API harness
  browserControl: false,
  externalMutation: false,
}

export interface BedrockHarnessOptions {
  readonly region?: string | undefined
  readonly modelId?: string | undefined
  readonly credentialReferenceId?: string | undefined
}

export class K1BedrockHarness implements ApiHarness {
  public readonly id = 'bedrock'
  public readonly kind = 'API' as const
  public readonly providerId = 'aws-bedrock'

  public readonly region: string
  public readonly modelId?: string | undefined
  public readonly credentialReferenceId?: string | undefined

  constructor(options?: BedrockHarnessOptions) {
    this.region = options?.region ?? 'us-east-1'
    this.modelId = options?.modelId
    this.credentialReferenceId = options?.credentialReferenceId
  }

  async qualify(): Promise<HarnessQualificationSnapshot> {
    const steps: import('./qualification.js').QualificationStepEvidence[] = []
    const t0 = Date.now()

    // STEP 1: DISCOVERED
    // Account is known from environment observation (POST_P8_PROVIDER_ENVIRONMENT_DELTA.md).
    // SDK not installed, AWS CLI not found.
    steps.push({
      state: 'DISCOVERED',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t0,
      passed: true,  // Account existence is known
      details: 'AWS Bedrock account known via environment observation. ' +
               'Entitlement: TEMPORARY_PROMOTIONAL_CREDIT_ENTITLEMENT (not permanently free). ' +
               'AWS CLI: NOT INSTALLED. @aws-sdk/client-bedrock-runtime: NOT INSTALLED.',
    })

    // STEP 2: INSTALLED — FAILED (SDK not installed)
    const t1 = Date.now()
    steps.push({
      state: 'INSTALLED',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - t1,
      passed: false,
      details: '@aws-sdk/client-bedrock-runtime SDK not installed. ' +
               'Bedrock integration deferred to K2+ pending: ' +
               '(1) explicit SDK installation authorization, ' +
               '(2) promotional credit balance proof, ' +
               '(3) human Bedrock dispatch authorization.',
    })

    // Classification: PROMOTIONAL_CREDIT (NOT PERMANENTLY FREE)
    const snap = buildQualificationSnapshot(
      this.id, 'API', steps, BEDROCK_CAPABILITIES, BEDROCK_AUTHORITY_REQUIREMENTS,
      'PROMOTIONAL_CREDIT',  // Known entitlement type — but NOT proven at dispatch time
      {
        blockedReason:
          'AWS SDK not installed. PROMOTIONAL_CREDIT: proof required before dispatch. ' +
          'REQUIRES_K2_IMPLEMENTATION: Install @aws-sdk/client-bedrock-runtime and implement BedrockHarness.',
      }
    )
    return snap
  }

  async checkReadiness(_snapshot?: HarnessQualificationSnapshot): Promise<ReadinessCheckResult> {
    const checkedAt = new Date().toISOString()
    return {
      readinessState: 'COST_ELIGIBILITY_UNKNOWN',
      reason:
        'AWS Bedrock: BLOCKED_COST_UNKNOWN. ' +
        'SDK not installed. Promotional credit balance unknown. ' +
        'PROMOTIONAL_CREDIT != PERMANENTLY_FREE. ' +
        'Dispatch blocked until: SDK installed, credit proven, human authorization granted.',
      checkedAt,
    }
  }

  execute(request: ExecutionRequest): { result: Promise<ExecutionResult>; cancellation: CancellationHandle } {
    const error = new HarnessError(
      'HARNESS_NOT_INSTALLED',
      this.id,
      'AWS Bedrock SDK not installed. Bedrock dispatch is BLOCKED (COST_ELIGIBILITY_UNKNOWN). ' +
      'See K1BedrockHarness documentation for requirements.',
      request.executionId
    )

    const cancellation: CancellationHandle = {
      executionId: request.executionId,
      state: 'CANCELLED',
      cancel: async () => false,
    }

    return {
      result: Promise.reject(error),
      cancellation,
    }
  }
}
