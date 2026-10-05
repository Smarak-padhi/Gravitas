/**
 * GRAVITAS K3 — CapabilityGrant Engine & Authorization Policy
 *
 * Evaluates CapabilityRequests against Tool Registry truth, least-privilege,
 * resource scopes, cost ceilings, and human sovereign gates.
 *
 * Invariants:
 * - CAPABILITY REQUEST != CAPABILITY GRANT
 * - LEAST PRIVILEGE: Effective capabilities = REQUESTED ∩ SUPPORTED ∩ POLICY_ALLOWED
 * - ZERO SPEND: Unknown cost / paid surfaces fail closed.
 * - DESTRUCTIVE / HUMAN-ONLY tools require explicit human approval.
 * - WORKER / SUPERVISOR / MODEL CANNOT SELF-GRANT.
 */

import { randomUUID } from 'node:crypto'
import type { WorkSessionKernel } from '@gravitas/core/kernel'
import type { ToolRegistry } from './registry.js'
import type {
  CapabilityGrant,
  CapabilityRequest,
  GrantRevocationStatus,
  ToolDescriptor,
  ToolRequest,
} from './types.js'

export interface GrantPolicyDecision {
  readonly granted: boolean
  readonly reasonCode: string
  readonly rationale: string
  readonly grant?: CapabilityGrant | undefined
  readonly requiresHumanApproval?: boolean | undefined
}

export interface AuthorizationEvaluation {
  readonly authorized: boolean
  readonly denialReasonCode?: string | undefined
  readonly rationale: string
  readonly tool?: ToolDescriptor | undefined
}

/**
 * Validates whether a target path is strictly contained within allowed paths.
 * Enforces boundary containment and blocks null bytes, URL encodings,
 * directory traversals, UNC paths, and drive-relative escapes.
 */
export function isPathWithinAllowedScope(allowedPaths: readonly string[], rawTargetPath: string): boolean {
  if (!rawTargetPath || typeof rawTargetPath !== 'string') {
    return false
  }

  // 1. Check for null byte injection
  if (rawTargetPath.includes('\0')) {
    return false
  }

  // 2. Check for URL-encoded traversal characters (%2e, %2f, %5c)
  if (/%2e|%2f|%5c/i.test(rawTargetPath)) {
    return false
  }

  // 3. Normalize slashes to forward slash
  const normalizedTarget = rawTargetPath.replace(/\\/g, '/').trim()

  // 4. Check for path traversal segments (.. or /../ or \..\)
  if (/(^|\/)\.\.(\/|$)/.test(normalizedTarget) || normalizedTarget.includes('..')) {
    return false
  }

  // 5. Check for UNC paths (e.g. //server/share or \\server\share)
  if (normalizedTarget.startsWith('//')) {
    return false
  }

  // 6. Check for drive-relative paths (e.g. C:file without slash)
  if (/^[a-zA-Z]:[^/]/.test(normalizedTarget)) {
    return false
  }

  const lowerTarget = normalizedTarget.toLowerCase()

  // 7. Check against allowed paths with strict directory boundary semantics
  for (const allowed of allowedPaths) {
    const normAllowed = allowed.replace(/\\/g, '/').trim().toLowerCase()
    const withSlash = normAllowed.endsWith('/') ? normAllowed : normAllowed + '/'
    if (lowerTarget === normAllowed || lowerTarget.startsWith(withSlash)) {
      return true
    }
  }

  return false
}

export class CapabilityGrantEngine {
  private readonly registry: ToolRegistry
  private readonly kernel?: WorkSessionKernel | undefined
  private readonly grants: Map<string, CapabilityGrant> = new Map()

  constructor(registry: ToolRegistry, kernel?: WorkSessionKernel) {
    this.registry = registry
    this.kernel = kernel
  }

  public getKernel(): WorkSessionKernel | undefined {
    return this.kernel
  }

  /**
   * Evaluates a CapabilityRequest and issues a bounded CapabilityGrant if policy permits.
   */
  public evaluateRequest(request: CapabilityRequest, options?: { humanApproved?: boolean; durationMs?: number }): GrantPolicyDecision {
    const durationMs = options?.durationMs ?? 60000 // default 60s bounded lease
    const now = new Date()
    const expiresAt = new Date(now.getTime() + durationMs).toISOString()

    // 1. Validate request
    if (!request.requestedCapabilities || request.requestedCapabilities.length === 0) {
      return {
        granted: false,
        reasonCode: 'EMPTY_CAPABILITY_REQUEST',
        rationale: 'Request contained no capabilities.',
      }
    }

    // 2. Resolve matching tools for each requested capability
    const authorizedToolIds: string[] = []
    let requiresHuman = false

    for (const cap of request.requestedCapabilities) {
      const candidates = this.registry.findToolsForCapability(cap)
      if (candidates.length === 0) {
        return {
          granted: false,
          reasonCode: 'UNKNOWN_CAPABILITY',
          rationale: `No registered tool supports capability: "${cap}"`,
        }
      }

      // Check candidate qualifications
      const qualifiedCandidates = candidates.filter(c => c.qualificationState === 'QUALIFIED')
      if (qualifiedCandidates.length === 0) {
        const quarantined = candidates.some(c => c.qualificationState === 'QUARANTINED')
        return {
          granted: false,
          reasonCode: quarantined ? 'QUARANTINED_TOOL' : 'TOOL_NOT_QUALIFIED',
          rationale: `Candidate tool for capability "${cap}" is not qualified.`,
        }
      }

      // Check cost ceilings (Zero-Spend invariant)
      const costEligible = qualifiedCandidates.filter(c => c.costClass !== 'UNKNOWN_COST' && c.costClass !== 'PAID')
      if (costEligible.length === 0) {
        return {
          granted: false,
          reasonCode: 'COST_UNKNOWN',
          rationale: `Candidate tool for capability "${cap}" has unverified or non-zero cost.`,
        }
      }

      // Check human approval requirements
      for (const tool of costEligible) {
        if (tool.requiresHumanApproval || tool.sideEffectClass === 'DESTRUCTIVE') {
          requiresHuman = true
        }
        if (!authorizedToolIds.includes(tool.toolId)) {
          authorizedToolIds.push(tool.toolId)
        }
      }
    }

    // 3. Human gate enforcement
    if (requiresHuman && !options?.humanApproved) {
      return {
        granted: false,
        requiresHumanApproval: true,
        reasonCode: 'HUMAN_APPROVAL_REQUIRED',
        rationale: 'Protected or destructive capability requested. Sovereign human authorization required.',
      }
    }

    // 4. Issue bounded CapabilityGrant
    const grantId = `grant_${randomUUID().slice(0, 8)}`
    const grant: CapabilityGrant = {
      grantId,
      requestId: request.requestId,
      subjectId: request.subjectId,
      workSessionId: request.workSessionId,
      runId: request.runId,
      taskId: request.taskId,
      grantedCapabilities: Object.freeze([...request.requestedCapabilities]),
      authorizedToolIds: Object.freeze([...authorizedToolIds]),
      resourceScope: Object.freeze({ ...request.resourceScope }),
      authorityCeiling: requiresHuman ? 'DESTRUCTIVE_CREDENTIAL_STATE' : 'CODE_MUTATION',
      costCeiling: 'OPERATOR_INCLUDED_HOST_RUNTIME',
      issuedBy: 'CapabilityGrantEngine:Policy',
      issuedAt: now.toISOString(),
      expiresAt,
      status: 'ACTIVE',
      humanApprovalReference: options?.humanApproved ? 'human:approved:valid' : undefined,
    }

    this.grants.set(grantId, Object.freeze(grant))

    return {
      granted: true,
      reasonCode: 'POLICY_SATISFIED',
      rationale: 'All requested capabilities verified against least-privilege policy and qualified tools.',
      grant,
    }
  }

  /**
   * Revalidates a tool execution request at dispatch time against the active grant.
   */
  public authorizeToolExecution(req: ToolRequest): AuthorizationEvaluation {
    const grant = this.grants.get(req.grantId)
    if (!grant) {
      return {
        authorized: false,
        denialReasonCode: 'GRANT_NOT_FOUND',
        rationale: `CapabilityGrant '${req.grantId}' does not exist or has expired.`,
      }
    }

    // Replay / Subject Binding Checks
    if (grant.subjectId !== req.subjectId) {
      return {
        authorized: false,
        denialReasonCode: 'SUBJECT_MISMATCH',
        rationale: `Grant subject '${grant.subjectId}' does not match requester '${req.subjectId}'. Replay rejected.`,
      }
    }

    if (grant.taskId !== req.taskId || grant.workSessionId !== req.workSessionId) {
      return {
        authorized: false,
        denialReasonCode: 'TASK_SCOPE_MISMATCH',
        rationale: `Grant scope does not match workSession or task. Cross-task replay rejected.`,
      }
    }

    // Revocation status check
    if (grant.status === 'REVOKED') {
      return {
        authorized: false,
        denialReasonCode: 'GRANT_REVOKED',
        rationale: `CapabilityGrant '${req.grantId}' has been revoked.`,
      }
    }

    // Expiry check
    if (new Date() > new Date(grant.expiresAt)) {
      return {
        authorized: false,
        denialReasonCode: 'GRANT_EXPIRED',
        rationale: `CapabilityGrant '${req.grantId}' has expired at ${grant.expiresAt}.`,
      }
    }

    // Tool authorized by grant
    if (!grant.authorizedToolIds.includes(req.toolId)) {
      return {
        authorized: false,
        denialReasonCode: 'TOOL_NOT_AUTHORIZED_BY_GRANT',
        rationale: `Tool '${req.toolId}' is not authorized under this grant.`,
      }
    }

    // Verify Tool still exists and is qualified in registry
    const tool = this.registry.getTool(req.toolId)
    if (!tool || tool.qualificationState !== 'QUALIFIED') {
      return {
        authorized: false,
        denialReasonCode: 'TOOL_NOT_QUALIFIED',
        rationale: `Tool '${req.toolId}' is not in QUALIFIED state in registry.`,
      }
    }

    // Resource Scope enforcement (e.g. filesystem path traversal check)
    if (grant.resourceScope.allowedPaths && req.parameters['targetPath']) {
      const allowed = isPathWithinAllowedScope(
        grant.resourceScope.allowedPaths,
        String(req.parameters['targetPath'])
      )
      if (!allowed) {
        return {
          authorized: false,
          denialReasonCode: 'RESOURCE_SCOPE_VIOLATION',
          rationale: `Target path '${req.parameters['targetPath']}' violates granted resource scope.`,
        }
      }
    }

    return {
      authorized: true,
      rationale: 'Dispatch-time authorization revalidation passed.',
      tool,
    }
  }

  /**
   * Persists an issued grant to canonical K0 persistence via CREATE_DURABLE_JOB.
   */
  public async persistGrant(grantId: string): Promise<void> {
    const grant = this.grants.get(grantId)
    if (!grant) {
      throw new Error(`Cannot persist unknown grant '${grantId}'`)
    }
    if (!this.kernel) {
      return
    }
    await this.kernel.executeCommand({
      commandId: `cmd_persist_grant_${grant.grantId}`,
      commandType: 'CREATE_DURABLE_JOB',
      workSessionId: grant.workSessionId,
      payload: {
        jobId: `job_grant_${grant.grantId}`,
        jobType: 'CAPABILITY_GRANT',
        workSessionId: grant.workSessionId,
        payload: {
          grant: { ...grant },
          status: grant.status,
        },
      },
    })
  }

  /**
   * Evaluates a CapabilityRequest and persists the grant to K0 if permitted and kernel is present.
   */
  public async evaluateAndPersist(
    request: CapabilityRequest,
    options?: { humanApproved?: boolean; durationMs?: number }
  ): Promise<GrantPolicyDecision> {
    const decision = this.evaluateRequest(request, options)
    if (decision.granted && decision.grant && this.kernel) {
      await this.persistGrant(decision.grant.grantId)
    }
    return decision
  }

  /**
   * Revokes an active grant in memory.
   */
  public revokeGrant(grantId: string, _reason = 'Operator or policy revocation'): void {
    const grant = this.grants.get(grantId)
    if (grant) {
      this.grants.set(grantId, Object.freeze({
        ...grant,
        status: 'REVOKED' as const,
      }))
    }
  }

  /**
   * Revokes a grant and durably records the revocation in K0 persistence.
   */
  public async revokeAndPersist(grantId: string, reason = 'Operator or policy revocation'): Promise<void> {
    this.revokeGrant(grantId, reason)
    if (!this.kernel) {
      return
    }
    const grant = this.grants.get(grantId)
    const workSessionId = grant?.workSessionId ?? 'session_default'
    await this.kernel.executeCommand({
      commandId: `cmd_revoke_grant_${grantId}_${Date.now()}`,
      commandType: 'CREATE_DURABLE_JOB',
      workSessionId,
      payload: {
        jobId: `job_revocation_${grantId}`,
        jobType: 'GRANT_REVOCATION',
        workSessionId,
        payload: {
          grantId,
          revokedAt: new Date().toISOString(),
          reason,
        },
      },
    })
  }

  /**
   * Rehydrates all grants and revocations from canonical K0 durable jobs.
   */
  public async rehydrateFromKernel(): Promise<number> {
    if (!this.kernel) {
      return 0
    }
    // Query durable jobs from K0
    const jobs = this.kernel.getDurableJobsByState('PENDING')
    const grantJobs = jobs.filter((j: { jobType: string }) => j.jobType === 'CAPABILITY_GRANT')
    const revocationJobs = jobs.filter((j: { jobType: string }) => j.jobType === 'GRANT_REVOCATION')

    const revokedIds = new Set<string>()
    for (const rj of revocationJobs) {
      const p = rj.payload as Record<string, unknown> | undefined
      if (p && typeof p['grantId'] === 'string') {
        revokedIds.add(p['grantId'] as string)
      }
    }

    let loaded = 0
    for (const gj of grantJobs) {
      const p = gj.payload as Record<string, unknown> | undefined
      const rawGrant = p?.['grant'] as CapabilityGrant | undefined
      if (!rawGrant || typeof rawGrant.grantId !== 'string') {
        continue
      }

      const isRevoked = revokedIds.has(rawGrant.grantId) || rawGrant.status === 'REVOKED'
      const status: GrantRevocationStatus = isRevoked ? 'REVOKED' : 'ACTIVE'
      const restoredGrant: CapabilityGrant = {
        ...rawGrant,
        status,
      }
      this.grants.set(restoredGrant.grantId, Object.freeze(restoredGrant))
      loaded++
    }

    return loaded
  }

  public getGrant(grantId: string): CapabilityGrant | undefined {
    return this.grants.get(grantId)
  }
}
