/**
 * @gravitas/orchestrator k4 — Architecture Arena Types
 *
 * Codifies the frozen P5 Architecture Arena contracts:
 * - ArchitectureQuestion & Constraints
 * - EvidenceItem, EvidenceTier, EvidenceFitness (10 orthogonal dimensions)
 * - ArchitectureCandidate, ArchitectureProposal, ReversibilityTier
 * - ScoutAssignment, ScoutResult & Structural Independence
 * - Contradiction, IncomparableBenchmark, AdversarialFinding
 * - DecisionPacket & HumanDecisionBlock
 * - ArenaBudgetPolicy & Provenance
 */

// ============================================================================
// 1. CONSTRAINTS & QUESTION CONTRACT
// ============================================================================

export type ConstraintClass =
  | 'HARD_CONSTRAINT'     // Absolute gating requirement; failure = immediate disqualification
  | 'SOFT_PREFERENCE'    // Desirable property; evaluated during comparative trade-off analysis
  | 'OPTIMIZATION_GOAL'  // Directional metric to maximize/minimize

export interface ArchitectureConstraint {
  readonly id: string
  readonly description: string
  readonly classification: ConstraintClass
  readonly evaluationCriteria: string
  readonly source: 'OPERATOR' | 'SYSTEM_INVARIANT' | 'PLATFORM_LIMITATION'
}

export interface ArchitectureQuestion {
  readonly questionId: string
  readonly title: string
  readonly decisionRequired: string
  readonly motivation: string
  readonly currentState: string
  readonly desiredOutcome: string
  readonly constraints: readonly ArchitectureConstraint[]
  readonly knownEvidenceRefs: readonly string[]
  readonly explicitUnknowns: readonly string[]
  readonly prohibitedAssumptions: readonly string[]
  readonly financialCeiling: {
    readonly autonomousIncrementalSpend: 0 // Absolute Invariant
    readonly allowComparisonWithPaidTech: boolean
  }
  readonly securityParameters: {
    readonly requiredContainmentLevel: 'HOST_SHARED' | 'RESTRICTED_SANDBOX' | 'ISOLATED_PROCESS'
    readonly forbiddenAuthorities: readonly string[]
  }
  readonly platformTarget: {
    readonly os: 'WINDOWS_11'
    readonly targetArch: 'x64' | 'arm64'
    readonly backgroundExecutionRequired: boolean
  }
  readonly targetWaveOwner?: string
  readonly humanAuthorityBoundary?: string
}

// ============================================================================
// 2. EVIDENCE MODEL & CLAIM-RELATIVE FITNESS
// ============================================================================

export type EvidenceTier =
  | 'PRIMARY_EVIDENCE'
  | 'REPRODUCIBLE_OBSERVATION'
  | 'OFFICIAL_CLAIM'
  | 'THIRD_PARTY_MEASUREMENT'
  | 'COMMUNITY_EXPERIENCE'
  | 'ARCHITECTURAL_INFERENCE'
  | 'SPECULATION'

export type TargetClaimType =
  | 'API_CONTRACT'
  | 'LOCAL_HOST_PERFORMANCE'
  | 'OPERATIONAL_RELIABILITY'
  | 'SUPPLY_CHAIN_MAINTENANCE'
  | 'SECURITY_CONTAINMENT'
  | 'ECOSYSTEM_ADOPTION'

export interface EvidenceFitness {
  readonly evidenceId: string
  readonly targetClaimType: TargetClaimType
  readonly directness: 'DIRECT_MEASUREMENT' | 'INDIRECT_ANALOGY'
  readonly authority: 'PRIMARY_SOURCE' | 'SECONDARY_AGGREGATOR'
  readonly reproducibility: 'FULLY_REPRODUCIBLE_LOCALLY' | 'EXTERNAL_ONLY' | 'UNREPRODUCIBLE'
  readonly environmentMatch: 'EXACT_WINDOWS_11_MATCH' | 'SIMILAR_DESKTOP' | 'DISPARATE_CLOUD_LINUX'
  readonly versionMatch: 'EXACT_VERSION_MATCH' | 'MINOR_VERSION_DRIFT' | 'MAJOR_VERSION_STALE'
  readonly freshness: 'CURRENT_RELEASE' | 'RECENT_HISTORICAL' | 'OBSOLETE'
  readonly conflictOfInterest: 'INDEPENDENT_THIRD_PARTY' | 'VENDOR_SELF_BENCHMARK' | 'COMMUNITY_ADVOCATE'
  readonly methodologyDisclosed: boolean
  readonly sampleQuality: 'SYSTEMATIC_TEST' | 'ANECDOTAL_INCIDENT'
}

export interface EvidenceItem {
  readonly evidenceId: string
  readonly claim: string
  readonly sourceUrl: string
  readonly sourceType:
    | 'SPECIFICATION'
    | 'SOURCE_CODE'
    | 'OFFICIAL_DOCS'
    | 'BENCHMARK'
    | 'ISSUE_TRACKER'
    | 'SYNTHETIC'
    | 'LOCAL_PROBE'
  readonly targetVersionOrCommit: string
  readonly retrievalDate: string // ISO 8601
  readonly tier: EvidenceTier
  readonly directQuoteOrSnippet: string
  readonly sha256Digest: string // SHA-256 of directQuoteOrSnippet
  readonly reproducibility: {
    readonly isReproducibleLocally: boolean
    readonly reproductionCommand?: string
  }
  readonly knownLimitations: readonly string[]
  readonly corroboratingEvidenceIds: readonly string[]
  readonly fitness?: EvidenceFitness
  readonly canonicalSourceId?: string // Tracks common-origin/underlying source
  readonly isDerived?: boolean        // True if synthesized from multiple items
}

export type EvidenceRelationship =
  | 'SUPPORTS'
  | 'CONTRADICTS'
  | 'QUALIFIES'
  | 'INSUFFICIENT'
  | 'CONTEXT_ONLY'

export interface ClaimEvidenceLink {
  readonly claimId: string
  readonly evidenceId: string
  readonly relationship: EvidenceRelationship
  readonly rationale: string
  readonly effectiveWeight: number // Computed from EvidenceFitness [0.0 - 1.0]
}

// ============================================================================
// 3. CANDIDATES & PROPOSALS
// ============================================================================

export type ReversibilityTier =
  | 'EASILY_REVERSIBLE'
  | 'MODERATELY_REVERSIBLE'
  | 'EXPENSIVE_TO_REVERSE'
  | 'FOUNDATIONAL'

export interface ComponentSpecification {
  readonly name: string
  readonly role: string
  readonly technologyCandidate: string
  readonly license: string
  readonly isExistingComponent: boolean
  readonly migrationDelta: string
}

export interface ArchitectureClaim {
  readonly claimId: string
  readonly candidateId: string
  readonly statement: string
  readonly claimType: TargetClaimType
  readonly supportingEvidenceIds: readonly string[]
  readonly contradictingEvidenceIds: readonly string[]
}

export interface ArchitectureCandidate {
  readonly candidateId: string
  readonly questionId: string
  readonly name: string
  readonly description: string
  readonly proposedApproachSummary: string
  readonly authorScoutId: string
  readonly components: readonly ComponentSpecification[]
  readonly claims: readonly ArchitectureClaim[]
  readonly reversibility: ReversibilityTier
  readonly financialImpact: {
    readonly autonomousCost: 0
    readonly optionalPaidTiers: string
    readonly localResourceFootprint: string
  }
  readonly securityImpact: {
    readonly attackSurfaceAdded: readonly string[]
    readonly requiredPermissions: readonly string[]
    readonly containmentFeasibility: string
  }
  readonly satisfiedConstraintIds: readonly string[]
  readonly violatedConstraintIds: readonly string[]
  readonly eligibilityStatus: 'ELIGIBLE' | 'DISQUALIFIED'
  readonly disqualificationReason?: string
  readonly sealedDigest?: string
}

// ============================================================================
// 4. SCOUTS & STRUCTURAL INDEPENDENCE
// ============================================================================

export type ScoutType =
  | 'TechnologyScout'
  | 'AlternativeScout'
  | 'CurrentSystemScout'
  | 'MigrationScout'
  | 'SecurityScout'
  | 'PerformanceScout'
  | 'ReliabilityScout'
  | 'DevXScout'
  | 'ZeroSpendScout'
  | 'WindowsDesktopScout'
  | 'EcosystemScout'
  | 'SimplicityScout'
  | 'ContrarianScout'

export interface ScoutAssignment {
  readonly assignmentId: string
  readonly questionId: string
  readonly scoutType: ScoutType
  readonly assignedHypothesisOrFocus: string
  readonly researchScope: {
    readonly requiredTopics: readonly string[]
    readonly prohibitedAssumptions: readonly string[]
    readonly minimumEvidenceSources: number
  }
  readonly constraints: {
    readonly autonomousIncrementalSpend: 0
    readonly targetOperatingSystem: 'WINDOWS_11'
    readonly forbiddenDependencies: readonly string[]
  }
  readonly resourceBudget: {
    readonly maxSearchQueries: number
    readonly maxUrlFetches: number
    readonly tokenBudgetCap: number
    readonly timeoutSeconds: number
  }
  readonly blindPhaseActive: boolean
  readonly inputHash: string
  readonly createdAt: string
  readonly visiblePriorEvidenceIds: readonly string[]
  readonly visiblePriorScoutResultIds: readonly string[]
}

export interface ScoutResult {
  readonly scoutAssignmentId: string
  readonly scoutType: ScoutType
  readonly completedAt: string
  readonly proposedCandidate?: ArchitectureCandidate
  readonly evidenceItems: readonly EvidenceItem[]
  readonly findings: readonly string[]
  readonly rawAssertions: readonly string[]
  readonly isFabricatedSourceFlag?: boolean
}

// ============================================================================
// 5. CONTRADICTIONS & INCOMPARABLE BENCHMARKS
// ============================================================================

export type ContradictionStatus =
  | 'UNRESOLVED'
  | 'RESOLVED_BY_VERSION_DISCRIMINATION'
  | 'RESOLVED_BY_ENVIRONMENT_DISCRIMINATION'
  | 'RESOLVED_BY_EMPIRICAL_PROBE'
  | 'RESOLVED_BY_TIER_OVERRIDE'
  | 'PERMANENT_DESIGN_TRADE_OFF'

export interface Contradiction {
  readonly contradictionId: string
  readonly questionId: string
  readonly claimA: {
    readonly statement: string
    readonly evidenceRef: string
    readonly candidateId: string
    readonly proponentScoutId: string
  }
  readonly claimB: {
    readonly statement: string
    readonly evidenceRef: string
    readonly candidateId: string
    readonly proponentScoutId: string
  }
  readonly suspectedCause: string
  readonly status: ContradictionStatus
  readonly resolutionDetails?: string
  readonly impactOnDecision: 'BLOCKING' | 'SIGNIFICANT' | 'MINOR' | 'NEGLIGIBLE'
}

export interface IncomparableBenchmark {
  readonly benchmarkAId: string
  readonly benchmarkBId: string
  readonly differingParameters: readonly (
    | 'OS_KERNEL'
    | 'HARDWARE_ENVIRONMENT'
    | 'WORKLOAD_DEFINITION'
    | 'PROXIMITY_LATENCY'
    | 'COMPILER_FLAGS'
  )[]
  readonly explanation: string
  readonly recommendation: 'REQUIRES_LOCAL_STANDARDIZED_EXPERIMENT'
}

// ============================================================================
// 6. ADVERSARIAL REVIEW
// ============================================================================

export interface AdversarialFinding {
  readonly findingId: string
  readonly candidateId: string
  readonly criticScoutId: string
  readonly severity: 'FATAL_FLAW' | 'MAJOR_RISK' | 'MINOR_CONCERN' | 'UNSUPPORTED_ASSUMPTION'
  readonly targetedArea: string
  readonly description: string
  readonly counterEvidenceIds: readonly string[]
  readonly falsificationArgument: string
}

export interface AdversarialReviewReport {
  readonly reviewId: string
  readonly candidateId: string
  readonly criticScoutId: string
  readonly findings: readonly AdversarialFinding[]
  readonly overallRecommendation:
    | 'RECOMMEND_REJECTION'
    | 'REQUIRE_MODIFICATION'
    | 'ACCEPTABLE_WITH_RISKS'
}

// ============================================================================
// 7. DECISION PACKET & SOVEREIGN HUMAN BLOCK
// ============================================================================

export type UncertaintyStatus =
  | 'KNOWN'
  | 'LIKELY'
  | 'UNCERTAIN'
  | 'UNKNOWN'
  | 'CONTRADICTED'
  | 'REQUIRES_EXPERIMENT'

export interface UncertaintyEntry {
  readonly topic: string
  readonly status: UncertaintyStatus
  readonly impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  readonly explanation: string
  readonly proposedResolutionPath: string
}

export interface TradeOffDimension {
  readonly dimension:
    | 'REVERSIBILITY'
    | 'OPERATIONAL_COMPLEXITY'
    | 'SUPPLY_CHAIN_MAINTENANCE'
    | 'PERFORMANCE_RESOURCE'
    | 'SECURITY_CONTAINMENT'
    | 'MIGRATION_COST'
    | 'ZERO_SPEND_RISK'
  readonly candidateAssessments: Record<
    string,
    {
      readonly rating: 'SUPERIOR' | 'ACCEPTABLE' | 'POOR' | 'DISQUALIFIED'
      readonly summary: string
      readonly supportingEvidenceRefs: readonly string[]
    }
  >
}

export type HumanDecisionDisposition =
  | 'APPROVE_PROPOSAL'
  | 'APPROVE_WITH_CONDITIONS'
  | 'REQUEST_MORE_EVIDENCE'
  | 'REQUEST_EXPERIMENT'
  | 'REJECT_ALL'
  | 'DEFER'
  | 'CHANGE_CONSTRAINT'

export interface HumanDecisionRecord {
  readonly decisionId: string
  readonly questionId: string
  readonly packetId: string
  readonly disposition: HumanDecisionDisposition
  readonly selectedCandidateId?: string
  readonly conditionsOrDirectives: string
  readonly humanOperatorSignature: string
  readonly timestamp: string
}

export interface DecisionPacket {
  readonly packetId: string
  readonly question: ArchitectureQuestion
  readonly generatedTimestamp: string
  readonly budgetAndProvenanceRef: string

  // Gating & Candidate Profiles
  readonly candidatesEvaluated: readonly {
    readonly candidateId: string
    readonly name: string
    readonly authorScoutId: string
    readonly eligibilityStatus: 'ELIGIBLE' | 'DISQUALIFIED'
    readonly disqualificationReason?: string
    readonly reversibility: ReversibilityTier
  }[]

  // Comparative Analysis
  readonly tradeOffMatrix: readonly TradeOffDimension[]

  // Adversarial Critique & Defense Summary
  readonly adversarialReviewSummary: readonly {
    readonly candidateId: string
    readonly fatalFlawsIdentified: number
    readonly majorRisksAccepted: readonly string[]
    readonly unsupportedAssumptions: readonly string[]
  }[]

  // Contradictions & Benchmark Incomparabilities
  readonly activeContradictions: readonly Contradiction[]
  readonly incomparableBenchmarks: readonly IncomparableBenchmark[]

  // Uncertainty Register
  readonly uncertaintyRegister: readonly UncertaintyEntry[]

  // Deferred Experiment Requests
  readonly deferredExperiments: readonly {
    readonly experimentId: string
    readonly hypothesis: string
    readonly requiredFutureWave: string
    readonly justification: string
  }[]

  // Synthesizer Impartial Summary (NO AUTONOMOUS WINNER)
  readonly synthesizerSummary: {
    readonly primaryTension: string
    readonly architecturalPaths: readonly {
      readonly candidateId: string
      readonly coreAdvantage: string
      readonly primaryCostOrRisk: string
      readonly idealIfOperatorPrioritizes: string
    }[]
  }

  // Sovereign Human Decision Block (Terminal State)
  readonly humanDecisionBlock: {
    readonly status: 'PENDING_HUMAN_REVIEW' | 'DECIDED'
    readonly disposition?: HumanDecisionDisposition
    readonly selectedCandidateId?: string
    readonly conditionsOrDirectives?: string
    readonly operatorSignature?: string
    readonly decidedTimestamp?: string
  }
}

// ============================================================================
// 8. BUDGET POLICY & PROVENANCE
// ============================================================================

export interface ArenaBudgetPolicy {
  readonly maxCandidates: number
  readonly maxClaimsPerCandidate: number
  readonly maxScouts: number
  readonly maxEvidenceItems: number
  readonly maxCritiqueRounds: number
  readonly maxRebuttalRounds: number
  readonly maxExecutions: number
  readonly tokenBudgetCap: number
  readonly timeoutMs: number
  readonly autonomousIncrementalCostCeiling: 0 // Absolute Invariant
}

export interface ArenaProvenance {
  readonly questionDigest: string
  readonly initiator: string
  readonly startTime: string
  readonly completionTime: string
  readonly activeBudgetPolicy: ArenaBudgetPolicy
  readonly scoutAssignments: readonly ScoutAssignment[]
  readonly sourceCitations: readonly string[]
  readonly evidenceDigests: readonly string[]
  readonly sealedCandidateDigests: readonly string[]
  readonly contradictionRefs: readonly string[]
  readonly terminalStatus: 'WAITING_FOR_HUMAN_DECISION' | 'DISQUALIFIED_ALL' | 'BUDGET_EXHAUSTED'
}
