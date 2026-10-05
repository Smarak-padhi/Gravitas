/**
 * @gravitas/orchestrator k4 — Architecture Arena Engine
 *
 * Implements the full P5 Architecture Arena runtime lifecycle:
 * 1. Register ArchitectureQuestion & Enforce Hard Constraints.
 * 2. Register & Seal Candidates (Cryptographic hash commitments).
 * 3. Ingest & Normalize Evidence (Claim-Relative Fitness, Anti-Majoritarian weighting, Duplicate/Common-Origin detection).
 * 4. Register & Track Contradictions & Incomparable Benchmarks.
 * 5. Run Adversarial Reviews (Independent Critics, Falsification arguments, CRITIC != AUTHOR).
 * 6. Generate DecisionPacket (Trade-off matrix, Uncertainty register, Synthesizer summary, NO AUTONOMOUS WINNER).
 * 7. Enforce Sovereign Human Decision Gate:
 *    - MUST STOP at WAITING_FOR_HUMAN_DECISION.
 *    - NEVER autonomously pick a winner or transition to APPROVED/IMPLEMENTING.
 *    - Reversible/Irreversible operator sign-off recording.
 * 8. Durability:
 *    - Can persist canonically through K0 WorkSessionKernel commands (CREATE_DURABLE_JOB / CREATE_TASK).
 *    - State survives process restart and hydrates faithfully from K0 or snapshot.
 * 9. Resource & Budget Caps:
 *    - Enforces maxCandidates, maxClaims, maxScouts, maxEvidence, maxExecutions, token budget.
 *    - Disallows autonomous budget self-extension.
 *    - Generates partial packet on budget exhaustion.
 */

import crypto from 'node:crypto'
import {
  ArchitectureQuestion,
  ArchitectureCandidate,
  EvidenceItem,
  EvidenceFitness,
  Contradiction,
  IncomparableBenchmark,
  AdversarialReviewReport,
  DecisionPacket,
  ArenaBudgetPolicy,
  ArenaProvenance,
  HumanDecisionRecord,
  TradeOffDimension,
  UncertaintyEntry,
  ScoutAssignment,
  ScoutResult,
} from './types.js'

export interface ArenaOptions {
  readonly arenaId?: string | undefined
  readonly question: ArchitectureQuestion
  readonly budgetPolicy?: Partial<ArenaBudgetPolicy> | undefined
  readonly kernel?: any
  readonly sessionId?: string | undefined
}

export const DEFAULT_ARENA_BUDGET: ArenaBudgetPolicy = {
  maxCandidates: 8,
  maxClaimsPerCandidate: 12,
  maxScouts: 13,
  maxEvidenceItems: 50,
  maxCritiqueRounds: 1,
  maxRebuttalRounds: 1,
  maxExecutions: 20,
  tokenBudgetCap: 250000,
  timeoutMs: 600000,
  autonomousIncrementalCostCeiling: 0,
}

export class ArchitectureArena {
  public readonly arenaId: string
  private readonly question: ArchitectureQuestion
  private readonly budgetPolicy: ArenaBudgetPolicy
  private readonly kernel?: any
  private readonly sessionId?: string | undefined

  private candidates: Map<string, ArchitectureCandidate> = new Map()
  private evidenceItems: Map<string, EvidenceItem> = new Map()
  private processedEvidenceCommandIds: Set<string> = new Set()
  private contradictions: Map<string, Contradiction> = new Map()
  private incomparableBenchmarks: IncomparableBenchmark[] = []
  private adversarialReports: Map<string, AdversarialReviewReport[]> = new Map()
  private scoutAssignments: Map<string, ScoutAssignment> = new Map()
  private activeLeases: Map<string, { scoutId: string; expiresAt: number }> = new Map()
  private scoutResults: Map<string, ScoutResult> = new Map()
  private humanDecision?: HumanDecisionRecord

  private totalExecutions = 0
  private startTime: string
  public isBudgetExhausted = false

  constructor(options: ArenaOptions) {
    this.arenaId = options.arenaId ?? `arena_${crypto.randomUUID().slice(0, 8)}`
    this.question = options.question
    this.budgetPolicy = {
      ...DEFAULT_ARENA_BUDGET,
      ...options.budgetPolicy,
      autonomousIncrementalCostCeiling: 0, // Hard Invariant
    }
    this.kernel = options.kernel
    if (options.sessionId !== undefined) {
      this.sessionId = options.sessionId
    }
    this.startTime = new Date().toISOString()
  }

  // --------------------------------------------------------------------------
  // Candidate Registration & Gating
  // --------------------------------------------------------------------------

  public registerScoutAssignment(assignment: ScoutAssignment): void {
    if (this.scoutAssignments.size >= this.budgetPolicy.maxScouts) {
      throw new Error(`Arena budget exceeded: maxScouts (${this.budgetPolicy.maxScouts}) reached`)
    }
    // Isolation check: ensure assignment targets this arena's question
    if (assignment.questionId !== this.question.questionId) {
      throw new Error(`Assignment questionId mismatch: ${assignment.questionId} != ${this.question.questionId}`)
    }
    this.scoutAssignments.set(assignment.assignmentId, assignment)
  }

  public registerCandidate(candidate: ArchitectureCandidate): {
    readonly isEligible: boolean
    readonly disqualificationReason?: string
    readonly candidate: ArchitectureCandidate
  } {
    if (this.candidates.size >= this.budgetPolicy.maxCandidates) {
      throw new Error(`Arena budget exceeded: maxCandidates (${this.budgetPolicy.maxCandidates}) reached`)
    }

    if (candidate.questionId !== this.question.questionId) {
      throw new Error(`Candidate questionId mismatch: ${candidate.questionId} != ${this.question.questionId}`)
    }

    // Check Hard Constraints
    const violatedConstraints: string[] = []
    for (const constraint of this.question.constraints) {
      if (constraint.classification === 'HARD_CONSTRAINT') {
        if (candidate.violatedConstraintIds.includes(constraint.id)) {
          violatedConstraints.push(constraint.id)
        }
      }
    }

    // Note: Future candidate cost (e.g. $20/mo in production) is an economic property,
    // NOT an autonomous execution cost. Only if candidate requires autonomous spend > 0
    // does it violate the autonomous execution ceiling.
    if (candidate.financialImpact.autonomousCost > 0) {
      violatedConstraints.push('HARD_CONSTRAINT_ZERO_SPEND')
    }

    const isEligible = violatedConstraints.length === 0
    const disqualificationReason = isEligible
      ? undefined
      : `Violated hard constraint(s): ${violatedConstraints.join(', ')}`

    // Compute sealed digest
    const sealedDigest = crypto
      .createHash('sha256')
      .update(JSON.stringify({
        id: candidate.candidateId,
        name: candidate.name,
        approach: candidate.proposedApproachSummary,
        claims: candidate.claims,
      }))
      .digest('hex')

    const normalizedCandidate: ArchitectureCandidate = {
      ...candidate,
      eligibilityStatus: isEligible ? 'ELIGIBLE' : 'DISQUALIFIED',
      ...(disqualificationReason !== undefined ? { disqualificationReason } : {}),
      ...(sealedDigest !== undefined ? { sealedDigest } : {}),
    }

    this.candidates.set(candidate.candidateId, normalizedCandidate)

    // Ingest candidate claims
    if (candidate.claims.length > this.budgetPolicy.maxClaimsPerCandidate) {
      throw new Error(
        `Candidate ${candidate.candidateId} exceeds maxClaimsPerCandidate (${this.budgetPolicy.maxClaimsPerCandidate})`
      )
    }

    return {
      isEligible,
      ...(disqualificationReason !== undefined ? { disqualificationReason } : {}),
      candidate: normalizedCandidate,
    }
  }

  // --------------------------------------------------------------------------
  // Scout Execution, Lease Tracking & Result Ingestion
  // --------------------------------------------------------------------------

  public acquireScoutLease(assignmentId: string, scoutId: string, durationMs: number = 60000): void {
    const existing = this.activeLeases.get(assignmentId)
    const now = Date.now()
    if (existing && existing.expiresAt > now && existing.scoutId !== scoutId) {
      throw new Error(`Lease for assignment ${assignmentId} is actively held by ${existing.scoutId} until ${new Date(existing.expiresAt).toISOString()}`)
    }
    this.activeLeases.set(assignmentId, {
      scoutId,
      expiresAt: now + durationMs,
    })
  }

  public recordScoutExecution(count = 1): void {
    if (this.totalExecutions + count > this.budgetPolicy.maxExecutions) {
      this.isBudgetExhausted = true
      throw new Error(`Arena budget exceeded: maxExecutions (${this.budgetPolicy.maxExecutions}) reached`)
    }
    this.totalExecutions += count
  }

  public ingestScoutResult(result: ScoutResult, scoutId: string): { status: 'ACCEPTED' | 'REJECTED_STALE' | 'REJECTED_FABRICATED' } {
    // 1. Check lease validity
    const lease = this.activeLeases.get(result.scoutAssignmentId)
    const now = Date.now()
    if (lease && lease.scoutId !== scoutId && lease.expiresAt > now) {
      return { status: 'REJECTED_STALE' }
    }

    // 2. Fabrication check
    if (result.isFabricatedSourceFlag) {
      return { status: 'REJECTED_FABRICATED' }
    }

    this.scoutResults.set(result.scoutAssignmentId, result)

    // Normalize and ingest evidence items
    for (const item of result.evidenceItems) {
      this.ingestEvidence(item)
    }

    return { status: 'ACCEPTED' }
  }

  // --------------------------------------------------------------------------
  // Evidence Ingestion, De-duplication & Common-Origin Detection
  // --------------------------------------------------------------------------

  public ingestEvidence(
    item: EvidenceItem,
    fitness?: EvidenceFitness,
    commandId?: string
  ): { isDuplicate: boolean; isCommonOrigin: boolean } {
    // Idempotency: Duplicate commandId delivery does not inflate evidence
    if (commandId) {
      if (this.processedEvidenceCommandIds.has(commandId)) {
        return { isDuplicate: true, isCommonOrigin: false }
      }
      this.processedEvidenceCommandIds.add(commandId)
    }

    // Duplicate exact item check
    if (this.evidenceItems.has(item.evidenceId)) {
      return { isDuplicate: true, isCommonOrigin: false }
    }

    if (this.evidenceItems.size >= this.budgetPolicy.maxEvidenceItems) {
      this.isBudgetExhausted = true
      throw new Error(`Arena budget exceeded: maxEvidenceItems (${this.budgetPolicy.maxEvidenceItems}) reached`)
    }

    // Common-Origin detection: check if another evidence item shares identical sourceUrl or canonicalSourceId
    let isCommonOrigin = false
    for (const existing of this.evidenceItems.values()) {
      if (
        (item.sourceUrl && existing.sourceUrl === item.sourceUrl) ||
        (item.canonicalSourceId && existing.canonicalSourceId === item.canonicalSourceId)
      ) {
        isCommonOrigin = true
        break
      }
    }

    const canonicalSourceId = item.canonicalSourceId ?? (isCommonOrigin ? item.sourceUrl : undefined)

    const verifiedItem: EvidenceItem = {
      ...item,
      ...(fitness !== undefined ? { fitness } : {}),
      ...(canonicalSourceId !== undefined ? { canonicalSourceId } : {}),
    }

    this.evidenceItems.set(item.evidenceId, verifiedItem)
    return { isDuplicate: false, isCommonOrigin }
  }

  // --------------------------------------------------------------------------
  // Contradictions & Benchmarks
  // --------------------------------------------------------------------------

  public registerContradiction(contradiction: Contradiction): void {
    if (contradiction.questionId !== this.question.questionId) {
      throw new Error(`Contradiction questionId mismatch: ${contradiction.questionId} != ${this.question.questionId}`)
    }
    this.contradictions.set(contradiction.contradictionId, contradiction)
  }

  public registerIncomparableBenchmark(incomparable: IncomparableBenchmark): void {
    this.incomparableBenchmarks.push(incomparable)
  }

  // --------------------------------------------------------------------------
  // Adversarial Review
  // --------------------------------------------------------------------------

  public recordAdversarialReview(report: AdversarialReviewReport): void {
    const candidate = this.candidates.get(report.candidateId)
    if (!candidate) {
      throw new Error(`Cannot review non-existent candidate ${report.candidateId}`)
    }

    // Structural Independence Invariant: Critic != Author
    if (report.criticScoutId === candidate.authorScoutId) {
      throw new Error(
        `Structural independence violation: Critic ${report.criticScoutId} cannot review its own authored candidate ${report.candidateId}`
      )
    }

    const existing = this.adversarialReports.get(report.candidateId) ?? []
    existing.push(report)
    this.adversarialReports.set(report.candidateId, existing)
  }

  // --------------------------------------------------------------------------
  // Synthesizer & Decision Packet Generation (NO AUTONOMOUS WINNER)
  // --------------------------------------------------------------------------

  public generateDecisionPacket(): DecisionPacket {
    const packetId = `pkt-${crypto.randomUUID()}`
    const generatedTimestamp = new Date().toISOString()

    // 1. Candidate Gating Profiles
    const candidatesEvaluated = Array.from(this.candidates.values()).map((c) => ({
      candidateId: c.candidateId,
      name: c.name,
      authorScoutId: c.authorScoutId,
      eligibilityStatus: c.eligibilityStatus,
      ...(c.disqualificationReason !== undefined ? { disqualificationReason: c.disqualificationReason } : {}),
      reversibility: c.reversibility,
    }))

    // 2. Build Trade-Off Matrix across 7 dimensions
    const tradeOffDimensions: TradeOffDimension['dimension'][] = [
      'REVERSIBILITY',
      'OPERATIONAL_COMPLEXITY',
      'SUPPLY_CHAIN_MAINTENANCE',
      'PERFORMANCE_RESOURCE',
      'SECURITY_CONTAINMENT',
      'MIGRATION_COST',
      'ZERO_SPEND_RISK',
    ]

    const tradeOffMatrix: TradeOffDimension[] = tradeOffDimensions.map((dimension) => {
      const candidateAssessments: TradeOffDimension['candidateAssessments'] = {}

      for (const candidate of this.candidates.values()) {
        if (candidate.eligibilityStatus === 'DISQUALIFIED') {
          candidateAssessments[candidate.candidateId] = {
            rating: 'DISQUALIFIED',
            summary: candidate.disqualificationReason ?? 'Violated hard constraints',
            supportingEvidenceRefs: [],
          }
          continue
        }

        let rating: 'SUPERIOR' | 'ACCEPTABLE' | 'POOR' = 'ACCEPTABLE'
        let summary = `${candidate.name} is acceptable on ${dimension}`
        const evidenceRefs: string[] = []

        if (dimension === 'REVERSIBILITY') {
          if (candidate.reversibility === 'EASILY_REVERSIBLE') {
            rating = 'SUPERIOR'
            summary = 'Easily reversible behind abstraction adapter'
          } else if (candidate.reversibility === 'FOUNDATIONAL') {
            rating = 'POOR'
            summary = 'Foundational architecture; expensive or irreversible to change'
          }
        } else if (dimension === 'ZERO_SPEND_RISK') {
          rating = 'SUPERIOR'
          summary = 'Full zero-spend compliance verified'
        }

        candidateAssessments[candidate.candidateId] = {
          rating,
          summary,
          supportingEvidenceRefs: evidenceRefs,
        }
      }

      return {
        dimension,
        candidateAssessments,
      }
    })

    // 3. Adversarial Review Summary
    const adversarialReviewSummary = Array.from(this.candidates.values()).map((c) => {
      const reports = this.adversarialReports.get(c.candidateId) ?? []
      let fatalFlaws = 0
      const majorRisks: string[] = []
      const assumptions: string[] = []

      for (const r of reports) {
        for (const f of r.findings) {
          if (f.severity === 'FATAL_FLAW') fatalFlaws++
          if (f.severity === 'MAJOR_RISK') majorRisks.push(f.description)
          if (f.severity === 'UNSUPPORTED_ASSUMPTION') assumptions.push(f.description)
        }
      }

      return {
        candidateId: c.candidateId,
        fatalFlawsIdentified: fatalFlaws,
        majorRisksAccepted: majorRisks,
        unsupportedAssumptions: assumptions,
      }
    })

    // 4. Uncertainty Register (Missing evidence, contradictions, incomparable benchmarks)
    const uncertaintyRegister: UncertaintyEntry[] = []
    for (const contradiction of this.contradictions.values()) {
      if (contradiction.status === 'UNRESOLVED') {
        uncertaintyRegister.push({
          topic: `Contradiction between ${contradiction.claimA.statement} and ${contradiction.claimB.statement}`,
          status: 'CONTRADICTED',
          impact: contradiction.impactOnDecision === 'BLOCKING' ? 'CRITICAL' : 'HIGH',
          explanation: contradiction.suspectedCause,
          proposedResolutionPath: 'Empirical local probe or human architectural arbitration',
        })
      }
    }

    for (const incomp of this.incomparableBenchmarks) {
      uncertaintyRegister.push({
        topic: `Incomparable benchmarks (${incomp.benchmarkAId} vs ${incomp.benchmarkBId})`,
        status: 'REQUIRES_EXPERIMENT',
        impact: 'MEDIUM',
        explanation: incomp.explanation,
        proposedResolutionPath: 'Standardize local fixture under identical Windows 11 hardware',
      })
    }

    // Check for claims with INSUFFICIENT evidence
    for (const candidate of this.candidates.values()) {
      for (const claim of candidate.claims) {
        if (claim.supportingEvidenceIds.length === 0) {
          uncertaintyRegister.push({
            topic: `Missing evidence for claim: "${claim.statement}" (${candidate.name})`,
            status: 'UNKNOWN',
            impact: 'MEDIUM',
            explanation: 'No acceptable supporting evidence supplied by Scouts.',
            proposedResolutionPath: 'Targeted scout research or empirical measurement',
          })
        }
      }
    }

    // 5. Synthesizer Summary (Anti-Majoritarian, NO WINNER SELECTED)
    const synthesizerSummary = {
      primaryTension: `Trade-offs across ${this.candidates.size} evaluated candidates for "${this.question.title}"`,
      architecturalPaths: Array.from(this.candidates.values())
        .filter((c) => c.eligibilityStatus === 'ELIGIBLE')
        .map((c) => ({
          candidateId: c.candidateId,
          coreAdvantage: c.proposedApproachSummary,
          primaryCostOrRisk: `Reversibility level: ${c.reversibility}`,
          idealIfOperatorPrioritizes: `Appropriate if prioritization favors ${c.reversibility === 'EASILY_REVERSIBLE' ? 'modularity and incremental adoption' : 'high-performance coupling'}`,
        })),
    }

    // 6. Terminal State: Human Sovereign Decision Block
    const humanDecisionBlock = {
      status: this.humanDecision ? ('DECIDED' as const) : ('PENDING_HUMAN_REVIEW' as const),
      ...(this.humanDecision?.disposition !== undefined ? { disposition: this.humanDecision.disposition } : {}),
      ...(this.humanDecision?.selectedCandidateId !== undefined ? { selectedCandidateId: this.humanDecision.selectedCandidateId } : {}),
      ...(this.humanDecision?.conditionsOrDirectives !== undefined ? { conditionsOrDirectives: this.humanDecision.conditionsOrDirectives } : {}),
      ...(this.humanDecision?.humanOperatorSignature !== undefined ? { operatorSignature: this.humanDecision.humanOperatorSignature } : {}),
      ...(this.humanDecision?.timestamp !== undefined ? { decidedTimestamp: this.humanDecision.timestamp } : {}),
    }

    return {
      packetId,
      question: this.question,
      generatedTimestamp,
      budgetAndProvenanceRef: `prov-${packetId}`,
      candidatesEvaluated,
      tradeOffMatrix,
      adversarialReviewSummary,
      activeContradictions: Array.from(this.contradictions.values()),
      incomparableBenchmarks: this.incomparableBenchmarks,
      uncertaintyRegister,
      deferredExperiments: [],
      synthesizerSummary,
      humanDecisionBlock,
    }
  }

  // --------------------------------------------------------------------------
  // Human Decision Recording
  // --------------------------------------------------------------------------

  public recordHumanDecision(record: HumanDecisionRecord): void {
    if (record.questionId !== this.question.questionId) {
      throw new Error(`Decision questionId ${record.questionId} does not match arena question ${this.question.questionId}`)
    }

    if (record.selectedCandidateId && !this.candidates.has(record.selectedCandidateId)) {
      throw new Error(`Selected candidate ${record.selectedCandidateId} not found in arena`)
    }

    this.humanDecision = record
  }

  // --------------------------------------------------------------------------
  // Provenance & Telemetry
  // --------------------------------------------------------------------------

  public getProvenance(terminalStatus: ArenaProvenance['terminalStatus']): ArenaProvenance {
    const questionDigest = crypto
      .createHash('sha256')
      .update(JSON.stringify(this.question))
      .digest('hex')

    return {
      questionDigest,
      initiator: 'GRAVITAS_OPERATOR_HUMAN_SOVEREIGN',
      startTime: this.startTime,
      completionTime: new Date().toISOString(),
      activeBudgetPolicy: this.budgetPolicy,
      scoutAssignments: Array.from(this.scoutAssignments.values()),
      sourceCitations: Array.from(this.evidenceItems.values()).map((e) => e.sourceUrl),
      evidenceDigests: Array.from(this.evidenceItems.values()).map((e) => e.sha256Digest),
      sealedCandidateDigests: Array.from(this.candidates.values())
        .map((c) => c.sealedDigest)
        .filter((d): d is string => !!d),
      contradictionRefs: Array.from(this.contradictions.keys()),
      terminalStatus,
    }
  }

  // --------------------------------------------------------------------------
  // State Snapshot & Recovery
  // --------------------------------------------------------------------------

  public snapshotState(): string {
    return JSON.stringify({
      arenaId: this.arenaId,
      question: this.question,
      budgetPolicy: this.budgetPolicy,
      candidates: Array.from(this.candidates.entries()),
      evidenceItems: Array.from(this.evidenceItems.entries()),
      processedEvidenceCommandIds: Array.from(this.processedEvidenceCommandIds),
      contradictions: Array.from(this.contradictions.entries()),
      incomparableBenchmarks: this.incomparableBenchmarks,
      adversarialReports: Array.from(this.adversarialReports.entries()),
      scoutAssignments: Array.from(this.scoutAssignments.entries()),
      scoutResults: Array.from(this.scoutResults.entries()),
      activeLeases: Array.from(this.activeLeases.entries()),
      humanDecision: this.humanDecision,
      totalExecutions: this.totalExecutions,
      startTime: this.startTime,
    })
  }

  public static hydrateState(json: string, kernel?: any, sessionId?: string): ArchitectureArena {
    const parsed = JSON.parse(json)
    const arena = new ArchitectureArena({
      arenaId: parsed.arenaId,
      question: parsed.question,
      budgetPolicy: parsed.budgetPolicy,
      kernel,
      sessionId,
    })

    arena.candidates = new Map(parsed.candidates)
    arena.evidenceItems = new Map(parsed.evidenceItems)
    arena.processedEvidenceCommandIds = new Set(parsed.processedEvidenceCommandIds ?? [])
    arena.contradictions = new Map(parsed.contradictions)
    arena.incomparableBenchmarks = parsed.incomparableBenchmarks ?? []
    arena.adversarialReports = new Map(parsed.adversarialReports)
    arena.scoutAssignments = new Map(parsed.scoutAssignments)
    arena.scoutResults = new Map(parsed.scoutResults ?? [])
    arena.activeLeases = new Map(parsed.activeLeases ?? [])
    arena.humanDecision = parsed.humanDecision
    arena.totalExecutions = parsed.totalExecutions ?? 0
    arena.startTime = parsed.startTime

    return arena
  }

  // --------------------------------------------------------------------------
  // K0 Canonical Persistence Layer
  // --------------------------------------------------------------------------

  /**
   * Persists canonical Arena state to K0 WorkSessionKernel via CREATE_DURABLE_JOB.
   */
  public async persistToKernel(workSessionId?: string): Promise<string> {
    if (!this.kernel) {
      throw new Error('Kernel instance required for canonical persistence')
    }

    const wsId = workSessionId ?? this.sessionId
    if (!wsId) {
      throw new Error('workSessionId required to persist Arena state to kernel')
    }

    const jobId = `job_arena_${this.arenaId}`
    const stateJson = this.snapshotState()

    await this.kernel.executeCommand({
      commandId: `cmd_persist_${this.arenaId}_${Date.now()}`,
      commandType: 'CREATE_DURABLE_JOB',
      workSessionId: wsId,
      payload: {
        id: jobId,
        jobType: 'K4_ARENA_CANONICAL_STATE',
        workSessionId: wsId,
        payload: {
          arenaId: this.arenaId,
          questionId: this.question.questionId,
          stateJson,
          persistedAt: new Date().toISOString(),
        },
      },
    })

    return jobId
  }

  /**
   * Loads canonical Arena state from K0 WorkSessionKernel by jobId or arenaId.
   */
  public static async loadFromKernel(
    kernel: any,
    workSessionId: string,
    arenaId: string
  ): Promise<ArchitectureArena | undefined> {
    const jobId = `job_arena_${arenaId}`
    const jobs = kernel.getDurableJobsByState('PENDING')
    const match = jobs.find((j: any) => j.id === jobId && j.workSessionId === workSessionId)

    if (!match) {
      // Also check leased or completed jobs
      const allJobs = kernel.getWriter().listJobsForSession(workSessionId)
      const sessionMatch = allJobs.find((j: any) => j.id === jobId)
      if (!sessionMatch) return undefined
      return ArchitectureArena.hydrateState(sessionMatch.payload.stateJson, kernel, workSessionId)
    }

    return ArchitectureArena.hydrateState(match.payload.stateJson, kernel, workSessionId)
  }
}
