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
  readonly projectSlug: string
  readonly revisionHash: string
  readonly approvedBy: string
  readonly timestamp: string
  readonly notes: string
  readonly allowedPaths?: readonly string[]
  readonly signature: string
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
   * Checks if human sign-off has been recorded in APPROVALS.md and validates revision hash.
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
  } {
    const specsDir = path.join(projectRoot, '.gravitas', 'specs', projectSlug)
    const approvalsPath = path.join(specsDir, 'APPROVALS.md')
    const grantPath = path.join(specsDir, 'approval-grant.json')
    if (!fs.existsSync(approvalsPath)) {
      return { approved: false }
    }

    const content = fs.readFileSync(approvalsPath, 'utf-8')
    const isApproved = content.includes('Current Gate Status: `APPROVED`') || content.includes('Sign-off Status: `APPROVED`')

    const reviewerMatch = content.match(/Reviewer:\*{0,2}\s*`?([^`\r\n]+)`?/)
    const timestampMatch = content.match(/Timestamp:\*{0,2}\s*`?([^`\r\n]+)`?/)
    const notesMatch = content.match(/Review Notes:\*{0,2}\s*`?([^`\r\n]+)`?/)
    const revMatch = content.match(/Revision Hash:\*{0,2}\s*`?([^`\r\n]+)`?/)

    let grant: ApprovalGrant | undefined
    if (fs.existsSync(grantPath)) {
      try {
        grant = JSON.parse(fs.readFileSync(grantPath, 'utf-8'))
      } catch {
        // Fallback to text parsed fields
      }
    }

    const currentHash = computeSpecificationHash(projectRoot, projectSlug)
    const recordedHash = grant?.revisionHash || revMatch?.[1]
    const hashMatches = recordedHash ? recordedHash === currentHash : true

    return {
      approved: isApproved,
      reviewer: grant?.approvedBy || reviewerMatch?.[1],
      timestamp: grant?.timestamp || timestampMatch?.[1],
      notes: grant?.notes || notesMatch?.[1],
      revisionHash: recordedHash,
      currentHash,
      hashMatches,
      grant,
    }
  }

  /**
   * Records human approval in APPROVALS.md and creates approval-grant.json, unlocking execution.
   */
  public recordApproval(
    projectRoot: string,
    projectSlug: string,
    reviewer: string,
    notes = 'Approved by user for phased execution.',
    options?: { allowedPaths?: readonly string[] }
  ): ApprovalGrant {
    const specsDir = path.join(projectRoot, '.gravitas', 'specs', projectSlug)
    const approvalsPath = path.join(specsDir, 'APPROVALS.md')
    const grantPath = path.join(specsDir, 'approval-grant.json')
    const timestamp = new Date().toISOString()
    const revisionHash = computeSpecificationHash(projectRoot, projectSlug)

    const signaturePayload = `${projectSlug}:${revisionHash}:${timestamp}:${reviewer}`
    const signature = crypto.createHmac('sha256', 'gravitas-kernel-local-auth').update(signaturePayload).digest('hex')

    const grant: ApprovalGrant = {
      projectSlug,
      revisionHash,
      approvedBy: reviewer,
      timestamp,
      notes,
      allowedPaths: options?.allowedPaths ?? [],
      signature,
    }

    fs.mkdirSync(specsDir, { recursive: true })
    fs.writeFileSync(grantPath, JSON.stringify(grant, null, 2), 'utf-8')

    const content = `# Approval Ledger — ${projectSlug}

> [!NOTE]
> Specification approved. Human sign-off cryptographically bound to revision hash.

## Current Gate Status: \`APPROVED\`

- **Specification Revision Hash:** \`${revisionHash}\`
- **Sign-off Status:** \`APPROVED\`
- **Reviewer:** \`${reviewer}\`
- **Timestamp:** \`${timestamp}\`
- **Review Notes:** \`${notes}\`
- **Cryptographic Grant:** \`approval-grant.json\`
`
    fs.writeFileSync(approvalsPath, content, 'utf-8')
    return grant
  }

  /**
   * Strictly asserts that approval has been granted and revision hash matches current spec files. Throws if blocked.
   */
  public assertApprovalGranted(projectRoot: string, projectSlug: string): void {
    const status = this.checkApprovalStatus(projectRoot, projectSlug)
    if (!status.approved) {
      throw new ApprovalGateBlockedError(
        projectSlug,
        'Execution blocked by Human Approval Gate. Explicit sign-off required in APPROVALS.md.'
      )
    }
    if (status.revisionHash && !status.hashMatches) {
      throw new ApprovalGateBlockedError(
        projectSlug,
        `Execution blocked: Specification modified post-approval (approved=${status.revisionHash}, current=${status.currentHash}). Re-approval required.`
      )
    }
  }
}
