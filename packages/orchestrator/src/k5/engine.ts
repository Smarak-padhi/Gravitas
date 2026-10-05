/**
 * GRAVITAS K5 — Independent Verification Engine
 *
 * Production chain (repository naming preserved):
 *   K2 OrchestrationSessionState (workSessionId/runId/taskId, WorkerAssignment, WorkerResult,
 *   Supervisor iteration)
 *   → VerificationPlan + VerificationCriteria (bound BEFORE any result)
 *   → VerifierAssignment (structural independence checked)
 *   → K1 surface preflight → K3 CapabilityRequest/Grant → K3 ToolExecutionEngine
 *     (dispatch-time K3 revalidation + K1 dispatch gate) → RawObservation
 *   → pre/post target-state comparison → VerificationEvidence → VerificationFinding
 *   → VerificationReport → EvidenceManifest → EvidenceBundle
 *   → K0 canonical persistence (every step) → WAITING_FOR_HUMAN_APPROVAL.
 *
 * This module has no direct database, process, or network access. All persistence is the K0
 * command path (K5Store); all execution is K3 → K1.
 *
 * Authority: nothing in this file can approve, merge, release, or deploy.
 */

import { createHash, randomUUID } from 'node:crypto'
import { dirname } from 'node:path'
import type { k1 } from '@gravitas/harnesses'
import type { CapabilityGrantEngine, ToolExecutionEngine } from '../k3/index.js'
import type { OrchestrationSessionState } from '../k2/types.js'
import {
  canonicalJson,
  captureTargetState,
  computeIntegrityDigest,
  diffTargetState,
  digestOfCanonical,
  listFilesRecursive,
  makeRedactor,
  normalizeContent,
  readArtifactIfPresent,
  type RedactionPolicy,
} from './digest.js'
import { K5Store, type K5Record } from './store.js'
import {
  DEFAULT_VERIFICATION_BUDGET,
  type ApprovalActorKind,
  type AssignmentStatus,
  type CriterionAuthor,
  type CriterionOutcome,
  type EvidenceBundle,
  type EvidenceManifest,
  type HumanDecisionRecord,
  type IngestStatus,
  type K5State,
  type KernelLike,
  type ProvenancedClaim,
  type RawObservation,
  type TargetMutationRecord,
  type ToolOutcome,
  type VerificationBudget,
  type VerificationCriterion,
  type VerificationEvidence,
  type VerificationFinding,
  type VerificationPlan,
  type VerificationReport,
  type VerificationVerdict,
  type VerifierAssignment,
} from './types.js'

// ─── Errors ──────────────────────────────────────────────────────────────────

export class K5Error extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(`[K5:${code}] ${message}`)
    this.name = 'K5Error'
    this.code = code
  }
}

/** Thrown by the fault injector to model a process dying at a precise stage. */
export class SimulatedCrash extends Error {
  readonly stage: CrashStage
  constructor(stage: CrashStage) {
    super(`SimulatedCrash@${stage}`)
    this.name = 'SimulatedCrash'
    this.stage = stage
  }
}

export type CrashStage =
  | 'BEFORE_ASSIGNMENT'
  | 'BEFORE_DISPATCH'
  | 'AFTER_DISPATCH_BEFORE_OBSERVATION'
  | 'AFTER_OBSERVATION_BEFORE_EVIDENCE'
  | 'AFTER_EVIDENCE_BEFORE_REPORT'
  | 'AFTER_REPORT_BUNDLE_BEFORE_HUMAN_GATE'

// ─── Options ─────────────────────────────────────────────────────────────────

export interface VerificationEngineOptions {
  readonly kernel: KernelLike
  readonly workSessionId: string
  readonly grantEngine: CapabilityGrantEngine
  readonly toolEngine: ToolExecutionEngine
  /** Used read-only (evaluateDispatch) to resolve the eligible verifier surface. */
  readonly harnessRegistry: k1.HarnessRegistry
  readonly verifierExecutorId?: string
  readonly verifierRoleId?: string
  readonly verifierToolId?: string
  readonly verifierCapability?: string
  readonly verifierHarnessId?: string
  readonly redaction?: Partial<RedactionPolicy>
  readonly faultInjector?: (stage: CrashStage) => void
  /** Overridable for falsification fixtures (e.g. exit-0-but-wrong-output, mutating verifier). */
  readonly buildVerifierScript?: (criterion: VerificationCriterion) => string
}

export interface CriterionInput {
  readonly label: string
  readonly artifactPath: string
  readonly expectedContent: string
}

export interface RequestVerificationInput {
  readonly session: OrchestrationSessionState
  readonly criteria: readonly CriterionInput[]
  readonly protectedPaths?: readonly string[]
  readonly allowedScratchPrefixes?: readonly string[]
  readonly budget?: Partial<VerificationBudget>
  readonly author?: CriterionAuthor
}

export interface TraceEntry {
  readonly step: number
  readonly label: string
  readonly ids: Readonly<Record<string, string>>
}

const MACHINE_AUTHORS = new Set(['WORKER', 'ARTIFACT', 'VERIFIER', 'SUPERVISOR', 'TOOL', 'MODEL', 'TIMER'])

function hash8(...parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

function psQuote(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export class VerificationEngine {
  private readonly opts: VerificationEngineOptions
  private readonly store: K5Store
  private readonly redact: (t: string) => string
  private readonly verifierExecutorId: string
  private readonly verifierRoleId: string
  private readonly toolId: string
  private readonly capability: string
  private readonly harnessId: string

  constructor(opts: VerificationEngineOptions) {
    this.opts = opts
    this.store = new K5Store(opts.kernel, opts.workSessionId)
    this.redact = makeRedactor(opts.redaction)
    this.verifierExecutorId = opts.verifierExecutorId ?? 'executor:verifier:independent-1'
    this.verifierRoleId = opts.verifierRoleId ?? 'role:verification:independent-verifier'
    this.toolId = opts.verifierToolId ?? 'tool:powershell-local'
    this.capability = opts.verifierCapability ?? 'process.execute.deterministic'
    this.harnessId = opts.verifierHarnessId ?? 'powershell-local'
  }

  // ── Trace ──────────────────────────────────────────────────────────────────

  private async trace(planId: string, step: number, label: string, ids: Record<string, string>): Promise<void> {
    await this.store.append<TraceEntry>('TRACE', planId, `${planId}_${String(step).padStart(2, '0')}_${randomUUID().slice(0, 6)}`, {
      step,
      label,
      ids,
    })
  }

  getTrace(planId: string): TraceEntry[] {
    return this.store.of<TraceEntry>('TRACE', planId).map((r) => r.body)
  }

  private fault(stage: CrashStage): void {
    this.opts.faultInjector?.(stage)
  }

  // ── Derived views (always re-read from K0; no private authoritative cache) ─

  private plan(planId: string): VerificationPlan {
    const rec = this.store.of<VerificationPlan>('PLAN', planId)[0]
    if (!rec) throw new K5Error('UNKNOWN_PLAN', `No VerificationPlan ${planId} in K0`)
    return rec.body
  }

  getPlan(planId: string): VerificationPlan {
    return this.plan(planId)
  }

  /** Latest revision of each criterion. */
  getCurrentCriteria(planId: string): VerificationCriterion[] {
    const latest = new Map<string, VerificationCriterion>()
    for (const r of this.store.of<VerificationCriterion>('CRITERION', planId)) {
      const cur = latest.get(r.body.criterionId)
      if (!cur || r.body.revision > cur.revision) latest.set(r.body.criterionId, r.body)
    }
    return [...latest.values()].sort((a, b) => a.criterionId.localeCompare(b.criterionId))
  }

  getAllCriterionRevisions(planId: string): VerificationCriterion[] {
    return this.store.of<VerificationCriterion>('CRITERION', planId).map((r) => r.body)
  }

  getAssignments(planId: string): VerifierAssignment[] {
    return this.store.of<VerifierAssignment>('ASSIGNMENT', planId).map((r) => r.body)
  }

  getAssignmentStatus(assignmentId: string): AssignmentStatus {
    const rows = this.store
      .of<{ assignmentId: string; status: AssignmentStatus }>('ASSIGNMENT_STATUS')
      .filter((r) => r.body.assignmentId === assignmentId)
    return rows.length === 0 ? 'ASSIGNED' : rows[rows.length - 1]!.body.status
  }

  getObservations(planId: string): RawObservation[] {
    return this.store.of<RawObservation>('OBSERVATION', planId).map((r) => r.body)
  }

  getEvidence(planId: string): VerificationEvidence[] {
    return this.store.of<VerificationEvidence>('EVIDENCE', planId).map((r) => r.body)
  }

  getFindings(planId: string): VerificationFinding[] {
    return this.store.of<VerificationFinding>('FINDING', planId).map((r) => r.body)
  }

  getRejectedResults(planId: string): { reason: IngestStatus; observation: RawObservation }[] {
    return this.store
      .of<{ reason: IngestStatus; observation: RawObservation }>('REJECTED_RESULT', planId)
      .map((r) => r.body)
  }

  getClaims(planId: string): ProvenancedClaim[] {
    return this.store.of<ProvenancedClaim>('CLAIM', planId).map((r) => r.body)
  }

  getReport(planId: string): VerificationReport | undefined {
    return this.store.of<VerificationReport>('REPORT', planId).pop()?.body
  }

  getBundle(planId: string): EvidenceBundle | undefined {
    return this.store.of<EvidenceBundle>('BUNDLE', planId).pop()?.body
  }

  getDecision(planId: string): HumanDecisionRecord | undefined {
    return this.store.of<HumanDecisionRecord>('DECISION', planId).pop()?.body
  }

  getState(planId: string): K5State {
    const rows = this.store.of<{ state: K5State }>('STATE', planId)
    if (rows.length === 0) throw new K5Error('UNKNOWN_PLAN', `No state for plan ${planId}`)
    return rows[rows.length - 1]!.body.state
  }

  private async setState(planId: string, state: K5State, note = ''): Promise<void> {
    const cur = this.store.of<{ state: K5State }>('STATE', planId)
    if (cur.length > 0 && cur[cur.length - 1]!.body.state === state) return
    await this.store.append('STATE', planId, `${planId}_state_${cur.length + 1}_${state}`, { state, note })
  }

  // ── 1. Request → Plan → Criteria ───────────────────────────────────────────

  async requestVerification(input: RequestVerificationInput): Promise<VerificationPlan> {
    const { session } = input
    const last = [...session.history].reverse().find((h) => h.workerResult && h.assignment)
    if (!last || !last.workerResult || !last.assignment) {
      throw new K5Error('NO_WORKER_RESULT', 'K5 requires a real K2 iteration with an assignment and WorkerResult')
    }
    if (session.workSessionId !== this.opts.workSessionId) {
      throw new K5Error('SESSION_MISMATCH', 'K2 session belongs to a different WorkSession')
    }
    const snap = this.opts.kernel.getWorkSessionSnapshot(session.workSessionId)
    const k0Task = snap.tasks.find((t) => t.id === last.assignment!.taskId)
    if (!k0Task) throw new K5Error('TASK_NOT_IN_K0', `Task ${last.assignment.taskId} not found in K0`)
    if (!snap.runs.some((r) => r.id === session.runId)) throw new K5Error('RUN_NOT_IN_K0', `Run ${session.runId} not found in K0`)

    const budget: VerificationBudget = { ...DEFAULT_VERIFICATION_BUDGET, ...input.budget }
    if (input.criteria.length > budget.maxCriteria) {
      throw new K5Error('BUDGET_EXHAUSTED', `criteria ${input.criteria.length} > maxCriteria ${budget.maxCriteria}`)
    }

    const planId = `plan_${randomUUID().slice(0, 8)}`
    const taskId = last.assignment.taskId
    const author: CriterionAuthor = input.author ?? 'PLAN_AUTHOR'

    // Preserve Worker + Supervisor records as claims (historical, never promoted).
    await this.recordClaim(
      planId,
      'WORKER_CLAIM',
      `Worker reported ${last.workerResult.status}: ${last.workerResult.output ?? ''}`.slice(0, 2000),
      `workerExecution:${last.workerResult.executionId}`
    )
    await this.recordClaim(
      planId,
      'SUPERVISOR_CLAIM',
      `Supervisor session status ${session.status}: ${session.stopReason ?? ''}`.slice(0, 2000),
      `supervisorIteration:${session.currentIteration}`
    )

    // Criteria are bound and persisted BEFORE any verifier result exists.
    const refs: { criterionId: string; revision: number }[] = []
    for (const c of input.criteria) {
      const criterionId = `crit_${randomUUID().slice(0, 8)}`
      const crit: Omit<VerificationCriterion, 'boundAtSeq'> = {
        criterionId,
        revision: 1,
        label: c.label,
        planId,
        workSessionId: session.workSessionId,
        runId: session.runId,
        taskId,
        check: { kind: 'EXACT_ARTIFACT_CONTENT', artifactPath: c.artifactPath, expectedContent: c.expectedContent },
        author,
        boundAt: new Date().toISOString(),
      }
      await this.appendCriterion(planId, crit)
      refs.push({ criterionId, revision: 1 })
    }

    const protectedPaths = [...new Set([...(input.protectedPaths ?? []), ...input.criteria.map((c) => c.artifactPath)])].sort()
    const scratch = [...(input.allowedScratchPrefixes ?? [])]
    const plan: VerificationPlan = {
      planId,
      workSessionId: session.workSessionId,
      runId: session.runId,
      taskId,
      worker: {
        workerExecutionId: last.workerResult.executionId,
        workerExecutorId: last.assignment.executorId,
        workerAssignmentId: last.assignment.assignmentId,
        workerHarnessId: last.assignment.harnessId,
        workerRoleId: last.assignment.roleId,
        supervisorIteration: last.iterationNumber,
        workerReportedStatus: last.workerResult.status,
        supervisorSessionStatus: session.status,
      },
      criteria: refs,
      budget,
      protectedPaths,
      allowedScratchPrefixes: scratch,
      targetSnapshotBefore: this.captureAll(protectedPaths, scratch),
      createdAt: new Date().toISOString(),
    }
    await this.store.append('PLAN', planId, planId, plan)
    await this.setState(planId, 'PLAN_CREATED')

    await this.trace(planId, 8, 'VerificationRequest', { workSessionId: session.workSessionId, runId: session.runId, taskId })
    await this.trace(planId, 9, 'VerificationPlan persisted', { planId })
    await this.trace(planId, 10, 'criteria persisted', Object.fromEntries(refs.map((r) => [r.criterionId, `rev${r.revision}`])))
    return plan
  }

  private captureAll(protectedPaths: readonly string[], scratchPrefixes: readonly string[]): Record<string, string> {
    const files = new Set<string>(protectedPaths)
    for (const prefix of scratchPrefixes) for (const f of listFilesRecursive(prefix)) files.add(f)
    return captureTargetState([...files])
  }

  private async appendCriterion(planId: string, c: Omit<VerificationCriterion, 'boundAtSeq'>): Promise<VerificationCriterion> {
    const rows = this.store.load()
    const seq = (rows.length === 0 ? 0 : rows[rows.length - 1]!.seq) + 1
    const full: VerificationCriterion = { ...c, boundAtSeq: seq }
    await this.store.append('CRITERION', planId, `${c.criterionId}_rev${c.revision}`, full)
    return full
  }

  // ── Claims ─────────────────────────────────────────────────────────────────

  private async recordClaim(
    planId: string,
    provenance: ProvenancedClaim['provenance'],
    statement: string,
    sourceRef: string
  ): Promise<ProvenancedClaim> {
    const claim: ProvenancedClaim = {
      claimId: `claim_${randomUUID().slice(0, 8)}`,
      planId,
      provenance,
      statement: this.redact(statement),
      sourceRef,
      recordedAt: new Date().toISOString(),
      satisfiesIndependentVerification: false,
    }
    await this.store.append('CLAIM', planId, claim.claimId, claim)
    return claim
  }

  /** Worker-supplied statements (e.g. "tests passed") are stored as WORKER_CLAIM only. */
  async addWorkerClaim(planId: string, statement: string): Promise<ProvenancedClaim> {
    this.plan(planId)
    return this.recordClaim(planId, 'WORKER_CLAIM', statement, 'worker-supplied')
  }

  /** Anything from outside the verified chain: bundling/hashing never upgrades this provenance. */
  async ingestExternalClaim(planId: string, statement: string, sourceRef: string): Promise<ProvenancedClaim> {
    this.plan(planId)
    return this.recordClaim(planId, 'EXTERNAL_UNVERIFIED', statement, sourceRef)
  }

  // ── Criterion revision ─────────────────────────────────────────────────────

  async reviseCriterion(
    planId: string,
    criterionId: string,
    patch: { artifactPath?: string; expectedContent?: string },
    authorKind: string
  ): Promise<VerificationCriterion> {
    if (MACHINE_AUTHORS.has(authorKind) || (authorKind !== 'HUMAN_OPERATOR' && authorKind !== 'PLAN_AUTHOR')) {
      throw new K5Error('ACTOR_NOT_AUTHORIZED', `${authorKind} cannot revise verification criteria`)
    }
    const cur = this.getCurrentCriteria(planId).find((c) => c.criterionId === criterionId)
    if (!cur) throw new K5Error('UNKNOWN_CRITERION', criterionId)
    const next = await this.appendCriterion(planId, {
      ...cur,
      revision: cur.revision + 1,
      check: {
        kind: 'EXACT_ARTIFACT_CONTENT',
        artifactPath: patch.artifactPath ?? cur.check.artifactPath,
        expectedContent: patch.expectedContent ?? cur.check.expectedContent,
      },
      author: authorKind,
      boundAt: new Date().toISOString(),
    } as Omit<VerificationCriterion, 'boundAtSeq'>)
    // Open assignments against older revisions are superseded (their late results are classified by revision).
    for (const a of this.getAssignments(planId)) {
      if (a.criterionId === criterionId && a.criterionRevision < next.revision) {
        const st = this.getAssignmentStatus(a.assignmentId)
        if (st === 'ASSIGNED' || st === 'DISPATCH_STARTED') await this.setAssignmentStatus(planId, a.assignmentId, 'SUPERSEDED')
      }
    }
    return next
  }

  // ── Assignment ─────────────────────────────────────────────────────────────

  private async setAssignmentStatus(planId: string, assignmentId: string, status: AssignmentStatus): Promise<void> {
    const n = this.store.of('ASSIGNMENT_STATUS').filter((r) => (r.body as { assignmentId: string }).assignmentId === assignmentId).length
    await this.store.append('ASSIGNMENT_STATUS', planId, `${assignmentId}_s${n + 1}_${status}`, { assignmentId, status })
  }

  async assign(planId: string): Promise<VerifierAssignment[]> {
    const plan = this.plan(planId)
    const created: VerifierAssignment[] = []
    const existing = this.getAssignments(planId)
    for (const crit of this.getCurrentCriteria(planId)) {
      const already = existing.find(
        (a) =>
          a.criterionId === crit.criterionId &&
          a.criterionRevision === crit.revision &&
          !['SUPERSEDED', 'EXPIRED'].includes(this.getAssignmentStatus(a.assignmentId))
      )
      if (already) continue
      if (existing.length + created.length >= plan.budget.maxAssignments) break

      const verifierExecutionId = `vexec_${randomUUID().slice(0, 8)}`
      // Structural independence: verifier identity must differ from the Worker's.
      if (
        this.verifierExecutorId === plan.worker.workerExecutorId ||
        verifierExecutionId === plan.worker.workerExecutionId ||
        this.verifierRoleId === plan.worker.workerRoleId
      ) {
        throw new K5Error('SELF_VERIFICATION_REJECTED', 'Verifier must be distinct from Worker executor, execution, and role')
      }
      const a: VerifierAssignment = {
        assignmentId: `vasg_${randomUUID().slice(0, 8)}`,
        planId,
        criterionId: crit.criterionId,
        criterionRevision: crit.revision,
        workSessionId: plan.workSessionId,
        runId: plan.runId,
        taskId: plan.taskId,
        verifierExecutorId: this.verifierExecutorId,
        verifierExecutionId,
        verifierRoleId: this.verifierRoleId,
        independence: 'STRUCTURAL',
        modelDiversityClaimedAsIndependence: false,
        issuedAt: new Date().toISOString(),
      }
      await this.store.append('ASSIGNMENT', planId, a.assignmentId, a)
      created.push(a)
      await this.trace(planId, 11, 'VerifierAssignment', { assignmentId: a.assignmentId, criterionId: crit.criterionId, verifierExecutionId })
    }
    if (created.length > 0) await this.setState(planId, 'ASSIGNED')
    return created
  }

  // ── Execution (K1 ∧ K3) ────────────────────────────────────────────────────

  private defaultScript(c: VerificationCriterion): string {
    return `Get-Content -Raw -ErrorAction Stop -LiteralPath ${psQuote(c.check.artifactPath)}`
  }

  async executeAssignment(planId: string, assignmentId: string): Promise<IngestStatus | 'NOT_EXECUTABLE'> {
    const plan = this.plan(planId)
    const a = this.getAssignments(planId).find((x) => x.assignmentId === assignmentId)
    if (!a) return 'UNKNOWN_ASSIGNMENT'
    if (this.getAssignmentStatus(assignmentId) !== 'ASSIGNED') return 'NOT_EXECUTABLE'

    const crit = this.getCurrentCriteria(planId).find((c) => c.criterionId === a.criterionId)!
    if (crit.revision !== a.criterionRevision) {
      await this.setAssignmentStatus(planId, assignmentId, 'SUPERSEDED')
      return 'STALE_CRITERION_REVISION'
    }

    const executed = this.store.of<{ assignmentId: string; status: AssignmentStatus }>('ASSIGNMENT_STATUS', planId).filter((r) => r.body.status === 'DISPATCH_STARTED').length
    if (executed >= plan.budget.maxExecutions) {
      await this.setAssignmentStatus(planId, assignmentId, 'BLOCKED')
      return 'BUDGET_EXHAUSTED'
    }

    const base = {
      assignmentId,
      planId,
      criterionId: a.criterionId,
      criterionRevision: a.criterionRevision,
      workSessionId: a.workSessionId,
      runId: a.runId,
      taskId: a.taskId,
    }
    const blocked = async (outcome: ToolOutcome, status: string, detail: string, grantId?: string): Promise<IngestStatus> => {
      const obs = this.makeObservation(base, outcome, status, false, '', detail, false, grantId)
      return this.ingestObservation(obs)
    }

    // K1: resolve the eligible verifier surface (read-only gate evaluation; K5 cannot dispatch itself).
    const surface = await this.opts.harnessRegistry.evaluateDispatch(this.harnessId)
    await this.trace(planId, 14, 'K1 surface resolution', { harnessId: this.harnessId, allowed: String(surface.allowed), readiness: surface.readinessState })
    if (!surface.allowed) return blocked('BLOCKED_BY_K1', surface.readinessState, surface.reason)

    // K3: capability request → grant, bound to subject/session/run/task/capability.
    const requestId = `capreq_${randomUUID().slice(0, 8)}`
    await this.trace(planId, 12, 'K3 CapabilityRequest', { requestId, subjectId: a.verifierExecutorId, capability: this.capability })
    const decision = await this.opts.grantEngine.evaluateAndPersist({
      requestId,
      workSessionId: a.workSessionId,
      runId: a.runId,
      taskId: a.taskId,
      subjectId: a.verifierExecutorId,
      requestedCapabilities: [this.capability],
      requestedToolIds: [this.toolId],
      resourceScope: { allowedPaths: [dirname(crit.check.artifactPath)] },
      rationale: `Independent verification of criterion ${a.criterionId} rev ${a.criterionRevision}`,
    })
    if (!decision.granted || !decision.grant) return blocked('BLOCKED_BY_K3', decision.reasonCode, decision.rationale)
    const grant = decision.grant
    if (!grant.authorizedToolIds.includes(this.toolId)) {
      return blocked('BLOCKED_BY_K3', 'TOOL_NOT_AUTHORIZED_BY_GRANT', `Grant ${grant.grantId} does not authorise ${this.toolId}`, grant.grantId)
    }
    await this.trace(planId, 13, 'K3 CapabilityGrant', { grantId: grant.grantId, requestId })

    // Pre-execution protected-target state.
    const before = this.captureAll(plan.protectedPaths, plan.allowedScratchPrefixes)
    this.fault('BEFORE_DISPATCH')

    // Durable dispatch marker BEFORE dispatch: a crash after this point is an unknown external outcome.
    await this.setAssignmentStatus(planId, assignmentId, 'DISPATCH_STARTED')
    await this.setState(planId, 'EXECUTING')

    const script = (this.opts.buildVerifierScript ?? ((c) => this.defaultScript(c)))(crit)
    const result = await this.opts.toolEngine.executeTool({
      requestId: `toolreq_${randomUUID().slice(0, 8)}`,
      toolId: this.toolId,
      grantId: grant.grantId,
      subjectId: a.verifierExecutorId,
      workSessionId: a.workSessionId,
      taskId: a.taskId,
      operation: 'verify.exact-artifact-content',
      parameters: { script, targetPath: crit.check.artifactPath },
      timestamp: new Date().toISOString(),
    })
    await this.trace(planId, 15, 'dispatch-time K1/K3 revalidation + dispatch', { toolRequestId: result.toolRequestId, toolStatus: result.status })
    this.fault('AFTER_DISPATCH_BEFORE_OBSERVATION')
    await this.trace(planId, 16, 'verifier execution', { verifierExecutionId: a.verifierExecutionId, toolStatus: result.status })

    // Post-execution target-state comparison (detects verifier-side mutation).
    const after = this.captureAll(plan.protectedPaths, plan.allowedScratchPrefixes)
    const mutation = this.classifyMutation(plan, diffTargetState(before, after))
    await this.store.append('MUTATION', planId, `${assignmentId}_mutation`, { assignmentId, ...mutation })
    await this.trace(planId, 18, 'pre/post target-state comparison', {
      protectedMutationDetected: String(mutation.protectedMutationDetected),
      scratchChanges: String(mutation.changedScratchPaths.length),
    })

    let outcome: ToolOutcome
    if (result.status === 'SUCCESS') outcome = 'TOOL_EXECUTED'
    else if (result.status === 'UNKNOWN_EXTERNAL_OUTCOME') outcome = 'UNKNOWN_EXTERNAL_OUTCOME'
    else if (result.status === 'EXECUTION_FAILURE' && /Dispatch blocked/.test(result.errorOutput ?? '')) outcome = 'BLOCKED_BY_K1'
    else if (result.status === 'EXECUTION_FAILURE') outcome = 'EXECUTION_FAILURE'
    else outcome = 'BLOCKED_BY_K3'

    const stdoutRaw = result.output ?? ''
    const truncated = Buffer.byteLength(stdoutRaw, 'utf8') > plan.budget.maxOutputBytes
    const obs = this.makeObservation(
      base,
      outcome,
      result.status,
      result.status === 'SUCCESS',
      truncated ? stdoutRaw.slice(0, plan.budget.maxOutputBytes) : stdoutRaw,
      result.errorOutput ?? '',
      truncated,
      grant.grantId,
      result.toolRequestId
    )
    return this.ingestObservation(obs)
  }

  private classifyMutation(plan: VerificationPlan, changed: readonly string[]): TargetMutationRecord {
    const isProtected = (p: string): boolean => plan.protectedPaths.includes(p)
    const isScratch = (p: string): boolean => plan.allowedScratchPrefixes.some((pre) => p.startsWith(pre))
    const prot = changed.filter((p) => isProtected(p) || !isScratch(p))
    const scr = changed.filter((p) => !isProtected(p) && isScratch(p))
    return { changedProtectedPaths: prot, changedScratchPaths: scr, protectedMutationDetected: prot.length > 0 }
  }

  private makeObservation(
    base: {
      assignmentId: string
      planId: string
      criterionId: string
      criterionRevision: number
      workSessionId: string
      runId: string
      taskId: string
    },
    toolOutcome: ToolOutcome,
    toolStatus: string,
    exitedOk: boolean,
    stdout: string,
    stderr: string,
    truncated: boolean,
    grantId?: string,
    toolRequestId?: string
  ): RawObservation {
    const out = this.redact(stdout)
    return {
      observationId: `obs_${randomUUID().slice(0, 8)}`,
      ...base,
      grantId,
      toolRequestId,
      toolOutcome,
      toolStatus,
      toolExitedSuccessfully: exitedOk,
      stdout: out,
      stderr: this.redact(stderr),
      outputTruncated: truncated,
      observedAt: new Date().toISOString(),
      stdoutDigest: computeIntegrityDigest(out),
    }
  }

  // ── Ingestion (stale / duplicate / isolation gates) ────────────────────────

  async ingestObservation(obs: RawObservation): Promise<IngestStatus> {
    const planId = obs.planId
    const a = this.store
      .of<VerifierAssignment>('ASSIGNMENT')
      .map((r) => r.body)
      .find((x) => x.assignmentId === obs.assignmentId)
    if (!a) return 'UNKNOWN_ASSIGNMENT'

    // Cross-plan / cross-task / cross-run / cross-criterion contamination guard (stable IDs, not labels).
    if (
      a.planId !== obs.planId ||
      a.taskId !== obs.taskId ||
      a.runId !== obs.runId ||
      a.workSessionId !== obs.workSessionId ||
      a.criterionId !== obs.criterionId ||
      a.criterionRevision !== obs.criterionRevision
    ) {
      await this.store.append('REJECTED_RESULT', a.planId, `rej_${obs.observationId}`, { reason: 'ISOLATION_VIOLATION' as IngestStatus, observation: obs })
      return 'ISOLATION_VIOLATION'
    }

    // Duplicate delivery: same observation, or assignment already holds an observation.
    const existing = this.getObservations(planId)
    if (existing.some((o) => o.observationId === obs.observationId || o.assignmentId === obs.assignmentId)) return 'DUPLICATE_IGNORED'

    // Stale criterion revision (checked before assignment staleness).
    const latest = this.getCurrentCriteria(planId).find((c) => c.criterionId === obs.criterionId)
    if (!latest || obs.criterionRevision < latest.revision) {
      await this.store.append('REJECTED_RESULT', planId, `rej_${obs.observationId}`, { reason: 'STALE_CRITERION_REVISION' as IngestStatus, observation: obs })
      return 'STALE_CRITERION_REVISION'
    }

    const status = this.getAssignmentStatus(obs.assignmentId)
    if (status === 'SUPERSEDED' || status === 'EXPIRED') {
      await this.store.append('REJECTED_RESULT', planId, `rej_${obs.observationId}`, { reason: 'STALE_VERIFIER_RESULT' as IngestStatus, observation: obs })
      return 'STALE_VERIFIER_RESULT'
    }

    const plan = this.plan(planId)
    if (existing.length >= plan.budget.maxEvidence) return 'BUDGET_EXHAUSTED'

    await this.store.append('OBSERVATION', planId, obs.observationId, obs)
    await this.trace(planId, 17, 'RawObservation', { observationId: obs.observationId, toolOutcome: obs.toolOutcome })
    const next: AssignmentStatus =
      obs.toolOutcome === 'TOOL_EXECUTED'
        ? 'COMPLETED'
        : obs.toolOutcome === 'UNKNOWN_EXTERNAL_OUTCOME'
          ? 'UNKNOWN_EXTERNAL_OUTCOME'
          : obs.toolOutcome === 'EXECUTION_FAILURE'
            ? 'COMPLETED'
            : 'BLOCKED'
    await this.setAssignmentStatus(planId, obs.assignmentId, next)
    await this.setState(planId, next === 'UNKNOWN_EXTERNAL_OUTCOME' ? 'UNKNOWN_EXTERNAL_OUTCOME' : 'OBSERVED')
    return 'ACCEPTED'
  }

  /** Expire an assignment (e.g. lease timeout) so any late result is rejected as stale. */
  async expireAssignment(planId: string, assignmentId: string): Promise<void> {
    await this.setAssignmentStatus(planId, assignmentId, 'EXPIRED')
  }

  // ── Evidence normalisation ─────────────────────────────────────────────────

  async normalizeObservation(planId: string, observationId: string): Promise<VerificationEvidence | undefined> {
    const obs = this.getObservations(planId).find((o) => o.observationId === observationId)
    if (!obs) return undefined
    if (obs.toolOutcome !== 'TOOL_EXECUTED' || obs.outputTruncated) return undefined
    const evidenceId = `ev_${hash8(obs.assignmentId, obs.observationId)}`
    const existing = this.getEvidence(planId).find((e) => e.evidenceId === evidenceId)
    if (existing) return existing
    const plan = this.plan(planId)
    if (this.getEvidence(planId).length >= plan.budget.maxEvidence) return undefined
    const content = normalizeContent(obs.stdout)
    const ev: VerificationEvidence = {
      evidenceId,
      planId,
      assignmentId: obs.assignmentId,
      observationId: obs.observationId,
      criterionId: obs.criterionId,
      criterionRevision: obs.criterionRevision,
      runId: obs.runId,
      taskId: obs.taskId,
      provenance: 'DIRECT_VERIFIER_OBSERVATION',
      observedContent: content,
      integrity: computeIntegrityDigest(content),
    }
    await this.store.append('EVIDENCE', planId, evidenceId, ev)
    await this.setState(planId, 'EVIDENCE_NORMALIZED')
    await this.trace(planId, 19, 'VerificationEvidence', { evidenceId })
    await this.trace(planId, 20, 'integrity digest (change detection only)', { sha256: ev.integrity.digestHex.slice(0, 16) })
    return ev
  }

  // ── Findings → Report → Manifest → Bundle ──────────────────────────────────

  private computeFinding(planId: string, c: VerificationCriterion): VerificationFinding {
    const evidence = this.getEvidence(planId).filter((e) => e.criterionId === c.criterionId && e.criterionRevision === c.revision)
    const assignments = this.getAssignments(planId).filter((a) => a.criterionId === c.criterionId && a.criterionRevision === c.revision)
    const mutated = this.store
      .of<{ assignmentId: string; protectedMutationDetected: boolean }>('MUTATION', planId)
      .some((m) => m.body.protectedMutationDetected && assignments.some((a) => a.assignmentId === m.body.assignmentId))
    const mk = (outcome: CriterionOutcome, rationale: string, ids: string[] = []): VerificationFinding => ({
      findingId: `find_${hash8(planId, c.criterionId, String(c.revision), outcome)}`,
      planId,
      criterionId: c.criterionId,
      criterionRevision: c.revision,
      outcome,
      provenance: 'DERIVED_VERIFICATION_FINDING',
      evidenceIds: ids,
      rationale,
    })

    if (mutated) return mk('VERIFIER_MUTATED_TARGET', 'Verifier modified a protected target; no PASS is possible after target mutation.', evidence.map((e) => e.evidenceId))
    if (evidence.length === 0) {
      const sts = assignments.map((a) => this.getAssignmentStatus(a.assignmentId))
      if (assignments.length === 0) return mk('NOT_RUN', 'No verifier assignment exists for the current criterion revision.')
      if (sts.includes('BLOCKED')) return mk('BLOCKED', 'Verifier execution was blocked by K1/K3 gates; zero execution occurred.')
      if (sts.includes('UNKNOWN_EXTERNAL_OUTCOME')) return mk('INCONCLUSIVE', 'Verifier outcome unknown (possible external effects); no blind replay.')
      return mk('INCONCLUSIVE', 'No valid verifier evidence for the current criterion revision.')
    }
    const expected = normalizeContent(c.check.expectedContent)
    const verdicts = evidence.map((e) => e.observedContent === expected)
    const ids = evidence.map((e) => e.evidenceId).sort()
    if (verdicts.every(Boolean)) return mk('PASS', 'Independent observation matched exact expected content.', ids)
    if (verdicts.every((v) => !v)) return mk('FAIL', 'Independent observation did not match expected content.', ids)
    return mk('CONFLICTING_EVIDENCE', 'Credible verifier evidence disagrees; both preserved; no averaging or voting.', ids)
  }

  async synthesize(planId: string): Promise<{ report: VerificationReport; bundle: EvidenceBundle }> {
    const plan = this.plan(planId)
    const criteria = this.getCurrentCriteria(planId)
    const existingReport = this.getReport(planId)
    const existingBundle = this.getBundle(planId)
    const matchesAll =
      existingReport &&
      existingBundle &&
      criteria.every((c) =>
        existingReport.findings.some((f) => f.criterionId === c.criterionId && f.criterionRevision === c.revision)
      )
    if (matchesAll) return { report: existingReport!, bundle: existingBundle! }

    const findings = criteria.map((c) => this.computeFinding(planId, c))
    for (const f of findings) {
      if (!this.store.has('FINDING', f.findingId)) await this.store.append('FINDING', planId, f.findingId, f)
    }
    await this.trace(planId, 21, 'VerificationFinding', Object.fromEntries(findings.map((f) => [f.criterionId, f.outcome])))

    const mutRows = this.store.of<TargetMutationRecord & { assignmentId: string }>('MUTATION', planId).map((r) => r.body)
    const targetMutation: TargetMutationRecord = {
      changedProtectedPaths: [...new Set(mutRows.flatMap((m) => m.changedProtectedPaths))].sort(),
      changedScratchPaths: [...new Set(mutRows.flatMap((m) => m.changedScratchPaths))].sort(),
      protectedMutationDetected: mutRows.some((m) => m.protectedMutationDetected),
    }

    const reasons = findings.filter((f) => f.outcome !== 'PASS' && f.outcome !== 'FAIL').map((f) => `${f.criterionId}:${f.outcome}`)
    let verdict: VerificationVerdict
    if (findings.some((f) => f.outcome === 'FAIL' || f.outcome === 'VERIFIER_MUTATED_TARGET')) verdict = 'VERIFIED_FAIL'
    else if (findings.length > 0 && findings.every((f) => f.outcome === 'PASS')) verdict = 'VERIFIED_PASS'
    else verdict = 'INCONCLUSIVE'

    const allReports = this.store.of('REPORT', planId)
    const reportSeq = allReports.length + 1
    const report: VerificationReport = {
      reportId: `vrep_${hash8(planId, 'report', String(reportSeq))}`,
      planId,
      workSessionId: plan.workSessionId,
      runId: plan.runId,
      taskId: plan.taskId,
      verifierExecutorIds: [...new Set(this.getAssignments(planId).map((a) => a.verifierExecutorId))],
      findings,
      verdict,
      incomplete: reasons.length > 0,
      incompleteReasons: reasons,
      targetMutation,
      createdAt: new Date().toISOString(),
      isHumanApproval: false,
      authorizesMerge: false,
      authorizesRelease: false,
      authorizesDeploy: false,
    }
    await this.store.append('REPORT', planId, report.reportId, report)
    await this.trace(planId, 22, 'VerificationReport', { reportId: report.reportId, verdict: report.verdict })

    const bundleId = `bundle_${hash8(plan.planId, 'bundle', String(reportSeq))}`
    const bundle = this.buildBundle(plan, report, bundleId)
    await this.trace(planId, 23, 'EvidenceManifest', { bundleId: bundle.bundleId, manifestCoreSha256: bundle.manifestCoreDigest.digestHex.slice(0, 16) })
    await this.store.append('BUNDLE', planId, bundle.bundleId, bundle)
    await this.trace(planId, 24, 'EvidenceBundle', { bundleId: bundle.bundleId, trustStatus: bundle.trustStatus })
    await this.setState(planId, 'REPORT_AND_BUNDLE_READY')
    await this.trace(planId, 25, 'K0 persistence (report+bundle via CREATE_DURABLE_JOB)', { reportId: report.reportId, bundleId: bundle.bundleId })

    // Canonical reread proves what is in K0, not what is in memory.
    const reread = this.getReport(planId)
    await this.trace(planId, 26, 'canonical reread from K0', { reportId: reread?.reportId ?? 'MISSING', verdict: reread?.verdict ?? 'MISSING' })

    this.fault('AFTER_REPORT_BUNDLE_BEFORE_HUMAN_GATE')
    await this.setState(planId, 'WAITING_FOR_HUMAN_APPROVAL')
    await this.trace(planId, 27, `verdict ${verdict}`, { reportId: report.reportId })
    await this.trace(planId, 28, 'WAITING_FOR_HUMAN_APPROVAL', { humanApproval: 'ABSENT' })
    return { report, bundle }
  }

  buildManifest(plan: VerificationPlan, report: VerificationReport, bundleId: string, createdAt: string): EvidenceManifest {
    const criteria = this.getCurrentCriteria(plan.planId)
    const artifactPaths = [...new Set(criteria.map((c) => c.check.artifactPath))]
    return {
      bundleVersion: 'k5-bundle-1',
      bundleId,
      workSessionId: plan.workSessionId,
      runId: plan.runId,
      taskId: plan.taskId,
      verificationPlanId: plan.planId,
      verificationReportId: report.reportId,
      criterionRevisions: criteria.map((c) => ({ criterionId: c.criterionId, revision: c.revision })).sort((a, b) => a.criterionId.localeCompare(b.criterionId)),
      evidenceIds: this.getEvidence(plan.planId).map((e) => e.evidenceId).sort(),
      artifacts: artifactPaths
        .map((p) => ({
          artifactId: `art_${hash8(p)}`,
          path: p,
          integrity: computeIntegrityDigest(readArtifactIfPresent(p) ?? Buffer.alloc(0)),
        }))
        .sort((a, b) => a.path.localeCompare(b.path)),
      environmentRef: { platform: process.platform, nodeVersion: process.version },
      createdAt,
    }
  }

  private buildBundle(plan: VerificationPlan, report: VerificationReport, bundleId: string): EvidenceBundle {
    const createdAt = new Date().toISOString()
    const manifest = this.buildManifest(plan, report, bundleId, createdAt)
    const claims = this.getClaims(plan.planId)
    const unknowns = [
      ...report.incompleteReasons.map((r) => `Unresolved criterion outcome: ${r}`),
      ...claims.filter((c) => c.provenance === 'EXTERNAL_UNVERIFIED').map((c) => `External claim unverified: ${c.claimId}`),
    ]
    return {
      bundleId,
      manifest,
      manifestCoreDigest: manifestCoreDigest(manifest),
      criteria: this.getAllCriterionRevisions(plan.planId),
      plan,
      assignments: this.getAssignments(plan.planId),
      observations: this.getObservations(plan.planId),
      evidence: this.getEvidence(plan.planId),
      findings: report.findings,
      report,
      claims,
      gitWorktreeContext: {
        worktreePaths: [...new Set(this.getCurrentCriteria(plan.planId).map((c) => dirname(c.check.artifactPath)))].sort(),
        note: 'K5 does not run git; only artifact directory paths are recorded.',
      },
      limitations: [
        'Only EXACT_ARTIFACT_CONTENT criteria are implemented.',
        'Digests are change-detection metadata relative to a reference digest; not signatures, trust, or immutability.',
        'Verifier independence is STRUCTURAL (distinct executor/execution/role); model diversity is not claimed as independence.',
        'Verifier runs on the same host as the Worker; K3 grants are authorization metadata, not OS containment.',
      ],
      unknowns,
      trustStatus: 'NOT_TRUSTED_EVIDENCE',
    }
  }

  // ── Resumable pipeline (idempotent; safe to call after restart) ────────────

  async run(planId: string): Promise<VerificationReport> {
    this.plan(planId)
    const current = this.getCurrentCriteria(planId)
    const existingReport = this.getReport(planId)
    const matchesAll =
      existingReport &&
      current.every((c) =>
        existingReport.findings.some((f) => f.criterionId === c.criterionId && f.criterionRevision === c.revision)
      )
    if (matchesAll) {
      await this.setState(planId, 'WAITING_FOR_HUMAN_APPROVAL')
      return existingReport!
    }

    if (this.getAssignments(planId).length === 0) {
      this.fault('BEFORE_ASSIGNMENT')
      await this.assign(planId)
    } else {
      await this.assign(planId) // picks up any criterion revision lacking an assignment
    }

    for (const a of this.getAssignments(planId)) {
      const crit = current.find((c) => c.criterionId === a.criterionId)
      if (!crit || crit.revision !== a.criterionRevision) continue
      const st = this.getAssignmentStatus(a.assignmentId)
      if (st === 'ASSIGNED') {
        await this.executeAssignment(planId, a.assignmentId)
      } else if (st === 'DISPATCH_STARTED') {
        // Dispatch may have happened but no result was persisted: external outcome unknown. Never replay.
        await this.setAssignmentStatus(planId, a.assignmentId, 'UNKNOWN_EXTERNAL_OUTCOME')
        await this.setState(planId, 'UNKNOWN_EXTERNAL_OUTCOME')
      }
    }

    for (const o of this.getObservations(planId)) {
      this.fault('AFTER_OBSERVATION_BEFORE_EVIDENCE')
      await this.normalizeObservation(planId, o.observationId)
    }
    this.fault('AFTER_EVIDENCE_BEFORE_REPORT')
    return (await this.synthesize(planId)).report
  }

  // ── Human sovereignty ──────────────────────────────────────────────────────

  /** Only a HUMAN_OPERATOR may decide. No machine actor can approve; approval never integrates. */
  canApprove(kind: ApprovalActorKind): boolean {
    return kind === 'HUMAN_OPERATOR'
  }

  async recordHumanDecision(
    planId: string,
    actor: { kind: ApprovalActorKind; operatorId?: string },
    decision: 'APPROVED' | 'REJECTED',
    rationale: string
  ): Promise<HumanDecisionRecord> {
    if (!this.canApprove(actor.kind) || !actor.operatorId) {
      throw new K5Error('ACTOR_NOT_AUTHORIZED', `${actor.kind} cannot record a human approval decision`)
    }
    const report = this.getReport(planId)
    if (!report || this.getState(planId) !== 'WAITING_FOR_HUMAN_APPROVAL') {
      throw new K5Error('NOT_AT_HUMAN_GATE', 'Plan is not waiting for human approval')
    }
    if (decision === 'APPROVED' && report.verdict !== 'VERIFIED_PASS') {
      throw new K5Error('APPROVAL_REQUIRES_VERIFIED_PASS', `Cannot approve a ${report.verdict} report`)
    }
    const rec: HumanDecisionRecord = {
      decisionId: `dec_${randomUUID().slice(0, 8)}`,
      planId,
      decision,
      operatorId: actor.operatorId,
      rationale: this.redact(rationale),
      decidedAt: new Date().toISOString(),
      authorizesMerge: false,
      authorizesRelease: false,
      authorizesDeploy: false,
      integrationPerformedByK5: false,
    }
    await this.store.append('DECISION', planId, rec.decisionId, rec)
    await this.setState(planId, decision === 'APPROVED' ? 'HUMAN_APPROVED' : 'HUMAN_REJECTED')
    return rec
  }

  /** Budgets are frozen at plan creation; no actor (including the verifier) can extend them. */
  requestBudgetExtension(_planId: string, _by: string): { granted: false; reason: string } {
    return { granted: false, reason: 'Verification budgets are fixed at plan creation; extension requires a new human-authorised plan.' }
  }
}

// ─── Manifest helpers (pure) ─────────────────────────────────────────────────

/** Canonical core: everything except volatile bundleId/createdAt, key-sorted, arrays pre-sorted by builder. */
export function manifestCore(m: EvidenceManifest): Omit<EvidenceManifest, 'bundleId' | 'createdAt'> {
  const { bundleId: _b, createdAt: _c, ...core } = m
  return core
}

export function manifestCoreDigest(m: EvidenceManifest) {
  return digestOfCanonical(manifestCore(m))
}

export function verifyManifestAgainstReference(
  m: EvidenceManifest,
  reference: { digestHex: string }
): 'MATCHES_REFERENCE_DIGEST' | 'INTEGRITY_MISMATCH_RELATIVE_TO_REFERENCE_DIGEST' {
  return manifestCoreDigest(m).digestHex === reference.digestHex
    ? 'MATCHES_REFERENCE_DIGEST'
    : 'INTEGRITY_MISMATCH_RELATIVE_TO_REFERENCE_DIGEST'
}

export { canonicalJson }
export type { K5Record }
