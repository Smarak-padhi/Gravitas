/**
 * Gravitas — Deep Discovery & Project Memory Engine (Gate 05.4)
 *
 * Implements the mandatory 5-phase engineering protocol:
 * DISCUSS → SPECIFY → APPROVE → EXECUTE → VERIFY
 *
 * Invariants:
 * 1. Deep Discovery interview clarifies ambiguous goals before any code changes.
 * 2. Generates canonical specification artifacts in `.gravitas/specs/<project>/`:
 *    - PROJECT.md
 *    - QUESTIONS.md
 *    - DECISIONS.md
 *    - ARCHITECTURE.md
 *    - PLAN.md
 *    - APPROVALS.md
 * 3. Human Approval Gate: Strictly blocks execution until explicit sign-off is recorded in APPROVALS.md.
 * 4. Persistent project memory: Tracks global preferences and project profiles in `.gravitas/`.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'
import { validatePathAgainstAllowlist } from './path-security.js'

export interface GlobalPreferences {
  readonly author: string
  readonly preferredStack: readonly string[]
  readonly localFirst: boolean
  readonly strictVerification: boolean
  readonly defaultTimeoutMs: number
}

export interface ProjectProfile {
  readonly projectId: string
  readonly projectTitle: string
  readonly rootPath: string
  readonly targetStack: string
  readonly verificationCommand: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface DiscussionInterview {
  readonly topic: string
  readonly vision?: string
  readonly references?: readonly string[]
  readonly typography?: { readonly bodyFont?: string; readonly headingFont?: string }
  readonly colors?: { readonly background?: string; readonly text?: string; readonly accent?: string; readonly contrastRatio?: number }
  readonly layout?: { readonly mode?: string; readonly maxContentWidth?: string }
  readonly animation?: { readonly spring?: string; readonly reducedMotionSupported?: boolean }
  readonly features?: readonly string[]
  readonly constraints?: readonly string[]
  readonly answeredQuestions: readonly {
    readonly question: string
    readonly answer: string
    readonly clarifiedAt: string
  }[]
  readonly resolvedDecisions: readonly {
    readonly decisionTitle: string
    readonly rationale: string
    readonly status: 'ACCEPTED' | 'PROPOSED' | 'REJECTED'
  }[]
}

export interface ApprovalGrant {
  readonly grantId: string
  readonly projectSlug: string
  readonly revisionHash: string
  readonly operation: 'EXECUTE_PLAN' | 'RUN_TOOL' | 'ALL_SCOPED_OPERATIONS'
  readonly allowedPaths: readonly string[]
  readonly allowedTools: readonly string[]
  readonly approvedBy: string
  readonly issuedAt: string
  readonly expiresAt: string
  readonly userConsentVerified: boolean
  readonly signature: string
  readonly notes?: string
  /** @deprecated Kept for backward compatibility with existing tests */
  readonly timestamp?: string
}

export interface SpecificationManifest {
  readonly projectSlug: string
  readonly revisionHash: string
  readonly projectMdPath: string
  readonly questionsMdPath: string
  readonly decisionsMdPath: string
  readonly architectureMdPath: string
  readonly planMdPath: string
  readonly approvalsMdPath: string
  readonly grantJsonPath?: string
  readonly isApproved: boolean
}

export class ApprovalGateBlockedError extends Error {
  public constructor(public readonly projectSlug: string, public readonly reason: string) {
    super(`APPROVAL_GATE_BLOCKED [${projectSlug}]: ${reason}`)
    this.name = 'ApprovalGateBlockedError'
  }
}

/**
 * Computes deterministic SHA-256 revision hash across specification artifacts:
 * PROJECT.md + ARCHITECTURE.md + PLAN.md
 */
export function computeSpecificationHash(projectRoot: string, projectSlug: string): string {
  const specsDir = path.join(projectRoot, '.gravitas', 'specs', projectSlug)
  const files = ['PROJECT.md', 'ARCHITECTURE.md', 'PLAN.md']
  const hasher = crypto.createHash('sha256')
  for (const f of files) {
    const p = path.join(specsDir, f)
    if (fs.existsSync(p)) {
      hasher.update(fs.readFileSync(p, 'utf-8'))
    }
  }
  return `sha256:${hasher.digest('hex')}`
}

export class DeepDiscoveryEngine {
  private readonly defaultGlobalPrefs: GlobalPreferences = {
    author: 'Smarak Padhi <smarakpadhi58@gmail.com>',
    preferredStack: ['TypeScript', 'React', 'Node.js', 'SQLite WAL', 'Vitest'],
    localFirst: true,
    strictVerification: true,
    defaultTimeoutMs: 30000,
  }

  /**
   * Loads global preferences from `.gravitas/preferences.json` or returns defaults.
   */
  public loadGlobalPreferences(baseDir = process.cwd()): GlobalPreferences {
    const prefsPath = path.join(baseDir, '.gravitas', 'preferences.json')
    try {
      if (fs.existsSync(prefsPath)) {
        const raw = fs.readFileSync(prefsPath, 'utf-8')
        return { ...this.defaultGlobalPrefs, ...JSON.parse(raw) }
      }
    } catch {
      // Use defaults
    }
    return this.defaultGlobalPrefs
  }

  /**
   * Saves global preferences to `.gravitas/preferences.json`.
   */
  public saveGlobalPreferences(prefs: Partial<GlobalPreferences>, baseDir = process.cwd()): GlobalPreferences {
    const gravitasDir = path.join(baseDir, '.gravitas')
    fs.mkdirSync(gravitasDir, { recursive: true })
    const merged = { ...this.loadGlobalPreferences(baseDir), ...prefs }
    fs.writeFileSync(path.join(gravitasDir, 'preferences.json'), JSON.stringify(merged, null, 2), 'utf-8')
    return merged
  }

  /**
   * Generates probing questions to clarify ambiguous project requirements.
   */
  public generateDiscoveryInterview(
    intent: string,
    existingContext: { stack?: string; testing?: string } = {}
  ): {
    ambiguityScore: number
    recommendedQuestions: readonly string[]
  } {
    const questions: string[] = []
    let ambiguityScore = 0

    if (!existingContext.stack && !/react|vue|node|python|electron|vanilla/i.test(intent)) {
      questions.push('What is the preferred UI and runtime stack (e.g. Vanilla HTML/CSS, React, Vue)?')
      ambiguityScore += 25
    }

    if (!existingContext.testing && !/test|vitest|playwright|jest/i.test(intent)) {
      questions.push('What test runner or automated verification command should be used to validate the feature?')
      ambiguityScore += 25
    }

    if (!/theme|dark|responsive|mobile|desktop/i.test(intent)) {
      questions.push('What are the visual styling, responsive layout, and accessibility (WCAG) requirements?')
      ambiguityScore += 20
    }

    if (!/scope|boundary|constraint|must not/i.test(intent)) {
      questions.push('What boundaries, preserved files, or out-of-scope constraints apply to this task?')
      ambiguityScore += 20
    }

    return {
      ambiguityScore,
      recommendedQuestions: questions.length > 0 ? questions : ['Are there any legacy files or backwards-compatibility constraints?'],
    }
  }

  /**
   * Generates the canonical structured specification document set in `.gravitas/specs/<project_slug>/`.
   */
  public generateSpecificationSuite(
    projectRoot: string,
    projectSlug: string,
    data: {
      projectTitle: string
      intent: string
      discussion: DiscussionInterview
      architectureOverview: string
      phasedPlan: readonly { phase: string; tasks: readonly string[] }[]
    }
  ): SpecificationManifest {
    const specsDir = path.join(projectRoot, '.gravitas', 'specs', projectSlug)
    fs.mkdirSync(specsDir, { recursive: true })

    const dateStr = new Date().toISOString()

    // 1. PROJECT.md
    const projectMd = `# ${data.projectTitle}
**Project Slug:** \`${projectSlug}\`
**Created At:** ${dateStr}
**Status:** SPECIFIED (Awaiting Human Approval)

## 1. Intent & Scope
${data.intent}

## 2. Core Constraints
- Single-owner local-first operation.
- No unverified success; all features require automated verification evidence.
- Zero-leakage credential isolation.
`
    const projectMdPath = path.join(specsDir, 'PROJECT.md')
    fs.writeFileSync(projectMdPath, projectMd, 'utf-8')

    // 2. QUESTIONS.md
    let questionsMd = `# ${data.projectTitle} — Discovery Questions & Answers
**Clarified Topic:** ${data.discussion.topic}

| Question | Clarified Answer | Timestamp |
| :--- | :--- | :--- |
`
    for (const q of data.discussion.answeredQuestions) {
      questionsMd += `| ${q.question.replace(/\|/g, '-')} | ${q.answer.replace(/\|/g, '-')} | ${q.clarifiedAt} |\n`
    }
    const questionsMdPath = path.join(specsDir, 'QUESTIONS.md')
    fs.writeFileSync(questionsMdPath, questionsMd, 'utf-8')

    // 3. DECISIONS.md (ADRs)
    let decisionsMd = `# ${data.projectTitle} — Architectural Decisions (ADR Ledger)

`
    for (let i = 0; i < data.discussion.resolvedDecisions.length; i++) {
      const d = data.discussion.resolvedDecisions[i]
      if (!d) continue
      decisionsMd += `### ADR-${i + 1}: ${d.decisionTitle}
- **Status:** \`${d.status}\`
- **Rationale:** ${d.rationale}

`
    }
    const decisionsMdPath = path.join(specsDir, 'DECISIONS.md')
    fs.writeFileSync(decisionsMdPath, decisionsMd, 'utf-8')

    // 4. ARCHITECTURE.md
    const architectureMd = `# ${data.projectTitle} — Architecture & System Design

## 1. Overview
${data.architectureOverview}

## 2. Component Boundaries
- **Reconnaissance:** Specialist agent reads context and documents structure.
- **Specification:** Ada & Pixel define contracts and visual tokens.
- **Execution:** Cipher executes scoped code edits.
- **Verification:** Grav verifies build commands and compiles machine-checkable receipt.
`
    const architectureMdPath = path.join(specsDir, 'ARCHITECTURE.md')
    fs.writeFileSync(architectureMdPath, architectureMd, 'utf-8')

    // 5. PLAN.md
    let planMd = `# ${data.projectTitle} — Implementation Plan

`
    for (const phase of data.phasedPlan) {
      planMd += `## ${phase.phase}
`
      for (const t of phase.tasks) {
        planMd += `- [ ] ${t}\n`
      }
      planMd += '\n'
    }
    const planMdPath = path.join(specsDir, 'PLAN.md')
    fs.writeFileSync(planMdPath, planMd, 'utf-8')

    const initialRevisionHash = computeSpecificationHash(projectRoot, projectSlug)

    // 6. APPROVALS.md (Initial State: PENDING)
    const approvalsMd = `# ${data.projectTitle} — Human Approval Ledger

> [!IMPORTANT]
> The execution engine strictly enforces that this document and its cryptographic grant must record an \`APPROVED\` status
> matching the current specification revision hash before any file mutations or terminal commands are permitted to execute.

## Current Gate Status: \`PENDING_APPROVAL\`

- **Specification Revision Hash:** \`${initialRevisionHash}\`
- **Sign-off Status:** \`PENDING\`
- **Reviewer:** \`Awaiting Sign-off\`
- **Timestamp:** \`None\`
- **Review Notes:** \`Specification generated. User must review and approve to unlock execution.\`
`
    const approvalsMdPath = path.join(specsDir, 'APPROVALS.md')
    fs.writeFileSync(approvalsMdPath, approvalsMd, 'utf-8')

    return {
      projectSlug,
      revisionHash: initialRevisionHash,
      projectMdPath,
      questionsMdPath,
      decisionsMdPath,
      architectureMdPath,
      planMdPath,
      approvalsMdPath,
      grantJsonPath: path.join(specsDir, 'approval-grant.json'),
      isApproved: false,
    }
  }

  /**
   * Retrieves or creates the application-owned machine authority secret key.
   * Stored in `.gravitas/secure/authority.key`, protected from ordinary spec edits.
   */
  public getOrCreateAuthorityKey(projectRoot = process.cwd()): string {
    const secureDir = path.join(projectRoot, '.gravitas', 'secure')
    const keyPath = path.join(secureDir, 'authority.key')
    try {
      if (fs.existsSync(keyPath)) {
        const key = fs.readFileSync(keyPath, 'utf-8').trim()
        if (key.length >= 32) return key
      }
    } catch {
      // Create fresh key if unreadable
    }

    fs.mkdirSync(secureDir, { recursive: true })
    const freshKey = crypto.randomBytes(32).toString('hex')
    try {
      fs.writeFileSync(keyPath, freshKey, { encoding: 'utf-8', mode: 0o600 })
    } catch {
      fs.writeFileSync(keyPath, freshKey, 'utf-8')
    }
    return freshKey
  }

  /**
   * Computes HMAC-SHA256 signature for an approval grant binding all authorization scopes.
   */
  public computeGrantSignature(secretKey: string, grant: Omit<ApprovalGrant, 'signature'>): string {
    const normPaths = (grant.allowedPaths || []).map((p) => path.resolve(p)).sort().join(',')
    const normTools = (grant.allowedTools || []).slice().sort().join(',')
    const payload = [
      grant.grantId,
      grant.projectSlug,
      grant.revisionHash,
      grant.operation,
      normPaths,
      normTools,
      grant.issuedAt,
      grant.expiresAt,
      grant.userConsentVerified ? 'true' : 'false',
      grant.approvedBy,
    ].join('::')

    return crypto.createHmac('sha256', secretKey).update(payload).digest('hex')
  }

  /**
   * Loads the application-owned secure grants registry from `.gravitas/secure/approval-registry.json`.
   */
  public getSecureRegistry(projectRoot = process.cwd()): Record<string, ApprovalGrant> {
    const regPath = path.join(projectRoot, '.gravitas', 'secure', 'approval-registry.json')
    try {
      if (fs.existsSync(regPath)) {
        return JSON.parse(fs.readFileSync(regPath, 'utf-8'))
      }
    } catch {
      // Empty registry
    }
    return {}
  }

  /**
   * Saves an approval grant to the application-owned secure grants registry.
   */
  public saveSecureGrant(projectRoot: string, grant: ApprovalGrant): void {
    const secureDir = path.join(projectRoot, '.gravitas', 'secure')
    fs.mkdirSync(secureDir, { recursive: true })
    const reg = this.getSecureRegistry(projectRoot)
    reg[grant.projectSlug] = grant
    fs.writeFileSync(path.join(secureDir, 'approval-registry.json'), JSON.stringify(reg, null, 2), 'utf-8')
  }

  /**
   * Checks if human sign-off has been authenticated in application secure state and validates revision hash.
   */
  public checkApprovalStatus(projectRoot: string, projectSlug: string): {
    approved: boolean
    reviewer?: string | undefined
    timestamp?: string | undefined
    notes?: string | undefined
    revisionHash?: string | undefined
    currentHash?: string | undefined
    hashMatches?: boolean | undefined
    grant?: ApprovalGrant | undefined
    signatureValid?: boolean | undefined
    expired?: boolean | undefined
    violationReason?: string | undefined
  } {
    const secureRegistry = this.getSecureRegistry(projectRoot)
    const specsDir = path.join(projectRoot, '.gravitas', 'specs', projectSlug)
    const grantPath = path.join(specsDir, 'approval-grant.json')
    const approvalsPath = path.join(specsDir, 'APPROVALS.md')

    let grant = secureRegistry[projectSlug]

    // Fallback to reading grant from specs directory, but ONLY if its signature verifies with application key!
    if (!grant && fs.existsSync(grantPath)) {
      try {
        grant = JSON.parse(fs.readFileSync(grantPath, 'utf-8'))
      } catch {
        // Ignored
      }
    }

    if (!grant) {
      return { approved: false, violationReason: 'No authorization grant recorded.' }
    }

    const secretKey = this.getOrCreateAuthorityKey(projectRoot)
    const expectedSig = this.computeGrantSignature(secretKey, grant)
    const signatureValid = grant.signature === expectedSig

    const currentHash = computeSpecificationHash(projectRoot, projectSlug)
    const hashMatches = grant.revisionHash === currentHash
    const expired = grant.expiresAt ? new Date(grant.expiresAt).getTime() <= Date.now() : false

    const isApproved = signatureValid && hashMatches && !expired && grant.userConsentVerified === true

    return {
      approved: isApproved,
      reviewer: grant.approvedBy,
      timestamp: grant.issuedAt || grant.timestamp,
      notes: grant.notes,
      revisionHash: grant.revisionHash,
      currentHash,
      hashMatches,
      grant,
      signatureValid,
      expired,
      violationReason: !signatureValid
        ? 'Invalid cryptographic signature: grant forged or tampered'
        : !hashMatches
        ? `Specification modified post-approval (grant=${grant.revisionHash}, current=${currentHash})`
        : expired
        ? 'Authorization grant has expired'
        : undefined,
    }
  }

  /**
   * Records authenticated owner approval in application-owned secure state and mirrors to APPROVALS.md.
   */
  public recordApproval(
    projectRoot: string,
    projectSlug: string,
    reviewer: string,
    notes = 'Approved by user for phased execution.',
    options?: {
      allowedPaths?: readonly string[]
      allowedTools?: readonly string[]
      operation?: 'EXECUTE_PLAN' | 'RUN_TOOL' | 'ALL_SCOPED_OPERATIONS'
      ttlSeconds?: number
      userConsentVerified?: boolean
      expiresAt?: string
    }
  ): ApprovalGrant {
    const specsDir = path.join(projectRoot, '.gravitas', 'specs', projectSlug)
    const approvalsPath = path.join(specsDir, 'APPROVALS.md')
    const grantPath = path.join(specsDir, 'approval-grant.json')
    const issuedAt = new Date().toISOString()
    const ttlMs = (options?.ttlSeconds || 3600) * 1000
    const expiresAt = options?.expiresAt || new Date(Date.now() + ttlMs).toISOString()
    const revisionHash = computeSpecificationHash(projectRoot, projectSlug)
    const secretKey = this.getOrCreateAuthorityKey(projectRoot)

    const grantId = `grant_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const operation = options?.operation || 'ALL_SCOPED_OPERATIONS'
    const allowedPaths = (options?.allowedPaths || []).map((p) => path.resolve(p))
    const allowedTools = options?.allowedTools || ['fs.writeFile', 'fs.appendFile', 'command.exec', 'testRunner']
    const userConsentVerified = options?.userConsentVerified !== false

    const grantData: Omit<ApprovalGrant, 'signature'> = {
      grantId,
      projectSlug,
      revisionHash,
      operation,
      allowedPaths,
      allowedTools,
      approvedBy: reviewer,
      issuedAt,
      expiresAt,
      userConsentVerified,
      notes,
      timestamp: issuedAt,
    }

    const signature = this.computeGrantSignature(secretKey, grantData)
    const grant: ApprovalGrant = {
      ...grantData,
      signature,
    }

    // 1. Save in application-owned secure store (Authorization source)
    this.saveSecureGrant(projectRoot, grant)

    // 2. Mirror into spec directory as readable artifact
    fs.mkdirSync(specsDir, { recursive: true })
    fs.writeFileSync(grantPath, JSON.stringify(grant, null, 2), 'utf-8')

    const content = `# Approval Ledger — ${projectSlug}

> [!NOTE]
> Specification approved. Human sign-off cryptographically bound to revision hash and scope.
> Authorization stored in application-owned secure state.

## Current Gate Status: \`APPROVED\`

- **Grant ID:** \`${grantId}\`
- **Specification Revision Hash:** \`${revisionHash}\`
- **Sign-off Status:** \`APPROVED\`
- **Reviewer:** \`${reviewer}\`
- **Operation Authorized:** \`${operation}\`
- **Issued At:** \`${issuedAt}\`
- **Expires At:** \`${expiresAt}\`
- **Allowed Tools:** \`${allowedTools.join(', ')}\`
- **Allowed Paths:** \`${allowedPaths.join(', ')}\`
- **Review Notes:** \`${notes}\`
- **Cryptographic Grant:** \`approval-grant.json\` (Signature verified via application authority key)
`
    fs.writeFileSync(approvalsPath, content, 'utf-8')
    return grant
  }

  /**
   * Strictly asserts that approval has been granted and authenticated in application secure state,
   * matches current spec files, is not expired, and permits requested operation and scopes. Throws if blocked.
   */
  public assertApprovalGranted(
    projectRoot: string,
    projectSlug: string,
    options?: {
      operation?: string
      requestedPaths?: readonly string[]
      requestedTools?: readonly string[]
    }
  ): void {
    const status = this.checkApprovalStatus(projectRoot, projectSlug)
    if (!status.approved || !status.grant) {
      throw new ApprovalGateBlockedError(
        projectSlug,
        status.violationReason || 'Execution blocked by Human Approval Gate. Explicit sign-off required.'
      )
    }

    const grant = status.grant

    // 1. Check operation scope
    if (options?.operation && grant.operation !== 'ALL_SCOPED_OPERATIONS' && grant.operation !== options.operation) {
      throw new ApprovalGateBlockedError(
        projectSlug,
        `Execution blocked: Operation "${options.operation}" is not authorized by grant (authorized: "${grant.operation}").`
      )
    }

    // 2. Check path scopes
    if (options?.requestedPaths && options.requestedPaths.length > 0) {
      if (!grant.allowedPaths || grant.allowedPaths.length === 0) {
        throw new ApprovalGateBlockedError(
          projectSlug,
          'Execution blocked: No write scope authorized in approval grant.'
        )
      }
      for (const target of options.requestedPaths) {
        const val = validatePathAgainstAllowlist(target, grant.allowedPaths)
        if (!val.allowed) {
          throw new ApprovalGateBlockedError(
            projectSlug,
            `Execution blocked: Target path "${target}" violates approval grant scope.`
          )
        }
      }
    }

    // 3. Check tool scopes
    if (options?.requestedTools && options.requestedTools.length > 0) {
      for (const tool of options.requestedTools) {
        if (!grant.allowedTools.includes(tool)) {
          throw new ApprovalGateBlockedError(
            projectSlug,
            `Execution blocked: Tool "${tool}" violates approval grant scope (allowed: [${grant.allowedTools.join(', ')}]).`
          )
        }
      }
    }
  }
}
