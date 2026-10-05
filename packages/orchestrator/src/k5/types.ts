/**
 * GRAVITAS K5 — Independent Verification Domain Model
 *
 * Locked invariants (enforced by runtime + tests, not by naming):
 *   WORKER_SUCCESS != VERIFIED_SUCCESS
 *   TOOL_SUCCESS != VERIFIED_SUCCESS
 *   SUPERVISOR_ACCEPTANCE != VERIFIED_SUCCESS
 *   RESULT != VERIFICATION            VERIFICATION != APPROVAL
 *   HASH != SIGNATURE / EXTERNAL_TRUST / IMMUTABILITY
 *   EVIDENCE_BUNDLE != TRUSTED_EVIDENCE
 *   VERIFIER != APPROVER              VERIFIED_PASS != MERGE/RELEASE/DEPLOY AUTHORIZATION
 *   STORAGE REPRESENTATION != DOMAIN IDENTITY
 *     (K5 entities are stored as K0 durable-job rows; a VerificationPlan is NOT a DurableJob)
 *
 * Claim semantics: Worker/Supervisor records are legitimate historical claims.
 * They are PRESERVED, never erased, and never able to satisfy a criterion that
 * requires independent verification.
 */

// ─── Provenance ──────────────────────────────────────────────────────────────

export type ClaimProvenance =
  | 'WORKER_CLAIM'
  | 'SUPERVISOR_CLAIM'
  | 'DIRECT_VERIFIER_OBSERVATION'
  | 'DERIVED_VERIFICATION_FINDING'
  | 'EXTERNAL_UNVERIFIED'

export interface ProvenancedClaim {
  readonly claimId: string
  readonly planId: string
  readonly provenance: ClaimProvenance
  readonly statement: string
  readonly sourceRef: string
  readonly recordedAt: string
  /** Literal false: no claim record can itself satisfy independent verification. */
  readonly satisfiesIndependentVerification: false
}

// ─── Digest semantics ────────────────────────────────────────────────────────

/**
 * SHA-256 digest = integrity / change-detection metadata RELATIVE TO A REFERENCE DIGEST.
 * It is not a signature, not authorship, not external trust, not immutability.
 */
export interface IntegrityDigest {
  readonly algorithm: 'sha256'
  readonly digestHex: string
  readonly byteLength: number
  readonly semantics: 'CHANGE_DETECTION_RELATIVE_TO_REFERENCE_DIGEST'
  readonly isDigitalSignature: false
  readonly confersExternalTrust: false
  readonly confersImmutability: false
}

export type IntegrityComparison =
  | 'MATCHES_REFERENCE_DIGEST'
  | 'CONTENT_CHANGED_RELATIVE_TO_REFERENCE_DIGEST'

// ─── Criteria ────────────────────────────────────────────────────────────────

export type CriterionAuthor = 'HUMAN_OPERATOR' | 'PLAN_AUTHOR'

export interface ExactArtifactContentCheck {
  readonly kind: 'EXACT_ARTIFACT_CONTENT'
  /** Absolute path of the artifact under verification. */
  readonly artifactPath: string
  /** Exact expected content (CRLF/LF and one trailing newline are normalised). */
  readonly expectedContent: string
}

export interface VerificationCriterion {
  readonly criterionId: string
  readonly revision: number
  readonly label: string
  readonly planId: string
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly check: ExactArtifactContentCheck
  readonly author: CriterionAuthor
  readonly boundAt: string
  /** Sequence number of the persisted record; must be lower than every observation it judges. */
  readonly boundAtSeq: number
}

// ─── Plan / Assignment ───────────────────────────────────────────────────────

export interface VerificationBudget {
  readonly maxCriteria: number
  readonly maxAssignments: number
  readonly maxExecutions: number
  readonly maxRetries: number
  readonly maxEvidence: number
  readonly maxOutputBytes: number
  readonly maxWallClockMs: number
}

export const DEFAULT_VERIFICATION_BUDGET: VerificationBudget = {
  maxCriteria: 16,
  maxAssignments: 16,
  maxExecutions: 16,
  maxRetries: 0,
  maxEvidence: 64,
  maxOutputBytes: 65536,
  maxWallClockMs: 120000,
}

export interface WorkerContext {
  readonly workerExecutionId: string
  readonly workerExecutorId: string
  readonly workerAssignmentId: string
  readonly workerHarnessId: string
  readonly workerRoleId: string
  readonly supervisorIteration: number
  readonly workerReportedStatus: string
  readonly supervisorSessionStatus: string
}

export interface VerificationPlan {
  readonly planId: string
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly worker: WorkerContext
  readonly criteria: readonly { readonly criterionId: string; readonly revision: number }[]
  readonly budget: VerificationBudget
  readonly protectedPaths: readonly string[]
  readonly allowedScratchPrefixes: readonly string[]
  readonly targetSnapshotBefore: Readonly<Record<string, string>>
  readonly createdAt: string
}

export type IndependenceClassification = 'STRUCTURAL' | 'NOT_PROVEN'

export type AssignmentStatus =
  | 'ASSIGNED'
  | 'DISPATCH_STARTED'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'SUPERSEDED'
  | 'EXPIRED'
  | 'UNKNOWN_EXTERNAL_OUTCOME'

export interface VerifierAssignment {
  readonly assignmentId: string
  readonly planId: string
  readonly criterionId: string
  readonly criterionRevision: number
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly verifierExecutorId: string
  readonly verifierExecutionId: string
  readonly verifierRoleId: string
  readonly independence: IndependenceClassification
  /** Model diversity is never treated as verification independence. */
  readonly modelDiversityClaimedAsIndependence: false
  readonly issuedAt: string
}

// ─── Observation / Evidence / Finding ────────────────────────────────────────

export type ToolOutcome =
  | 'TOOL_EXECUTED'
  | 'BLOCKED_BY_K3'
  | 'BLOCKED_BY_K1'
  | 'UNKNOWN_EXTERNAL_OUTCOME'
  | 'EXECUTION_FAILURE'

export interface RawObservation {
  readonly observationId: string
  readonly assignmentId: string
  readonly planId: string
  readonly criterionId: string
  readonly criterionRevision: number
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly grantId?: string | undefined
  readonly toolRequestId?: string | undefined
  readonly toolOutcome: ToolOutcome
  readonly toolStatus: string
  /** Process/tool exit success is recorded but NEVER interpreted as criterion satisfaction. */
  readonly toolExitedSuccessfully: boolean
  readonly stdout: string
  readonly stderr: string
  readonly outputTruncated: boolean
  readonly observedAt: string
  readonly stdoutDigest: IntegrityDigest
}

export interface VerificationEvidence {
  readonly evidenceId: string
  readonly planId: string
  readonly assignmentId: string
  readonly observationId: string
  readonly criterionId: string
  readonly criterionRevision: number
  readonly runId: string
  readonly taskId: string
  readonly provenance: 'DIRECT_VERIFIER_OBSERVATION'
  readonly observedContent: string
  readonly integrity: IntegrityDigest
}

export type CriterionOutcome =
  | 'PASS'
  | 'FAIL'
  | 'INCONCLUSIVE'
  | 'NOT_RUN'
  | 'BLOCKED'
  | 'VERIFIER_MUTATED_TARGET'
  | 'CONFLICTING_EVIDENCE'

export interface VerificationFinding {
  readonly findingId: string
  readonly planId: string
  readonly criterionId: string
  readonly criterionRevision: number
  readonly outcome: CriterionOutcome
  readonly provenance: 'DERIVED_VERIFICATION_FINDING'
  readonly evidenceIds: readonly string[]
  readonly rationale: string
}

// ─── Report / Manifest / Bundle ──────────────────────────────────────────────

export type VerificationVerdict = 'VERIFIED_PASS' | 'VERIFIED_FAIL' | 'INCONCLUSIVE'

export interface TargetMutationRecord {
  readonly changedProtectedPaths: readonly string[]
  readonly changedScratchPaths: readonly string[]
  readonly protectedMutationDetected: boolean
}

export interface VerificationReport {
  readonly reportId: string
  readonly planId: string
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly verifierExecutorIds: readonly string[]
  readonly findings: readonly VerificationFinding[]
  readonly verdict: VerificationVerdict
  readonly incomplete: boolean
  readonly incompleteReasons: readonly string[]
  readonly targetMutation: TargetMutationRecord
  readonly createdAt: string
  readonly isHumanApproval: false
  readonly authorizesMerge: false
  readonly authorizesRelease: false
  readonly authorizesDeploy: false
}

export interface ManifestArtifactRef {
  readonly artifactId: string
  readonly path: string
  readonly integrity: IntegrityDigest
}

export interface EvidenceManifest {
  readonly bundleVersion: 'k5-bundle-1'
  readonly bundleId: string
  readonly workSessionId: string
  readonly runId: string
  readonly taskId: string
  readonly verificationPlanId: string
  readonly verificationReportId: string
  readonly criterionRevisions: readonly { readonly criterionId: string; readonly revision: number }[]
  readonly evidenceIds: readonly string[]
  readonly artifacts: readonly ManifestArtifactRef[]
  readonly environmentRef: { readonly platform: string; readonly nodeVersion: string }
  readonly createdAt: string
}

export interface EvidenceBundle {
  readonly bundleId: string
  readonly manifest: EvidenceManifest
  /** Digest over canonical manifest core (excludes volatile createdAt/bundleId). Change detection only. */
  readonly manifestCoreDigest: IntegrityDigest
  readonly criteria: readonly VerificationCriterion[]
  readonly plan: VerificationPlan
  readonly assignments: readonly VerifierAssignment[]
  readonly observations: readonly RawObservation[]
  readonly evidence: readonly VerificationEvidence[]
  readonly findings: readonly VerificationFinding[]
  readonly report: VerificationReport
  readonly claims: readonly ProvenancedClaim[]
  readonly gitWorktreeContext: { readonly worktreePaths: readonly string[]; readonly note: string }
  readonly limitations: readonly string[]
  readonly unknowns: readonly string[]
  /** Literal: completeness / packaging / hashing never makes a bundle trusted evidence. */
  readonly trustStatus: 'NOT_TRUSTED_EVIDENCE'
}

// ─── State machine & approval ───────────────────────────────────────────────

export type K5State =
  | 'PLAN_CREATED'
  | 'ASSIGNED'
  | 'EXECUTING'
  | 'OBSERVED'
  | 'EVIDENCE_NORMALIZED'
  | 'REPORT_AND_BUNDLE_READY'
  | 'WAITING_FOR_HUMAN_APPROVAL'
  | 'UNKNOWN_EXTERNAL_OUTCOME'
  | 'HUMAN_APPROVED'
  | 'HUMAN_REJECTED'

export type ApprovalActorKind =
  | 'HUMAN_OPERATOR'
  | 'VERIFIER'
  | 'WORKER'
  | 'SUPERVISOR'
  | 'TOOL'
  | 'TIMER'
  | 'MODEL'
  | 'EVIDENCE_BUNDLE'

export interface HumanDecisionRecord {
  readonly decisionId: string
  readonly planId: string
  readonly decision: 'APPROVED' | 'REJECTED'
  readonly operatorId: string
  readonly rationale: string
  readonly decidedAt: string
  /** Approval never integrates anything: merge/push/deploy/release are outside K5. */
  readonly authorizesMerge: false
  readonly authorizesRelease: false
  readonly authorizesDeploy: false
  readonly integrationPerformedByK5: false
}

export type IngestStatus =
  | 'ACCEPTED'
  | 'DUPLICATE_IGNORED'
  | 'STALE_CRITERION_REVISION'
  | 'STALE_VERIFIER_RESULT'
  | 'ISOLATION_VIOLATION'
  | 'UNKNOWN_ASSIGNMENT'
  | 'BUDGET_EXHAUSTED'

export interface KernelLike {
  executeCommand<T = unknown>(cmd: {
    commandId: string
    commandType: string
    workSessionId?: string
    payload: unknown
  }): Promise<T>
  getWorkSessionSnapshot(id: string): {
    activeJobs: readonly { id: string; jobType: string; payload: unknown }[]
    tasks: readonly { id: string; state: string }[]
    runs: readonly { id: string }[]
  }
}
