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

export interface SpecificationManifest {
  readonly projectSlug: string
  readonly projectMdPath: string
  readonly questionsMdPath: string
  readonly decisionsMdPath: string
  readonly architectureMdPath: string
  readonly planMdPath: string
  readonly approvalsMdPath: string
  readonly isApproved: boolean
}

export class ApprovalGateBlockedError extends Error {
  public constructor(public readonly projectSlug: string, public readonly reason: string) {
    super(`APPROVAL_GATE_BLOCKED [${projectSlug}]: ${reason}`)
    this.name = 'ApprovalGateBlockedError'
  }
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

    // 6. APPROVALS.md (Initial State: PENDING)
    const approvalsMd = `# ${data.projectTitle} — Human Approval Ledger

> [!IMPORTANT]
> The execution engine strictly enforces that this document must record an \`APPROVED\` status
> before any file mutations or terminal commands are permitted to execute.

## Current Gate Status: \`PENDING_APPROVAL\`

- **Sign-off Status:** \`PENDING\`
- **Reviewer:** \`Awaiting Sign-off\`
- **Timestamp:** \`None\`
- **Review Notes:** \`Specification generated. User must review and approve to unlock execution.\`
`
    const approvalsMdPath = path.join(specsDir, 'APPROVALS.md')
    fs.writeFileSync(approvalsMdPath, approvalsMd, 'utf-8')

    return {
      projectSlug,
      projectMdPath,
      questionsMdPath,
      decisionsMdPath,
      architectureMdPath,
      planMdPath,
      approvalsMdPath,
      isApproved: false,
    }
  }

  /**
   * Checks if human sign-off has been recorded in APPROVALS.md.
   */
  public checkApprovalStatus(projectRoot: string, projectSlug: string): {
    approved: boolean
    reviewer?: string | undefined
    timestamp?: string | undefined
    notes?: string | undefined
  } {
    const approvalsPath = path.join(projectRoot, '.gravitas', 'specs', projectSlug, 'APPROVALS.md')
    if (!fs.existsSync(approvalsPath)) {
      return { approved: false }
    }

    const content = fs.readFileSync(approvalsPath, 'utf-8')
    const isApproved = content.includes('Current Gate Status: `APPROVED`') || content.includes('Sign-off Status: `APPROVED`')

    const reviewerMatch = content.match(/Reviewer:\*{0,2}\s*`?([^`\r\n]+)`?/)
    const timestampMatch = content.match(/Timestamp:\*{0,2}\s*`?([^`\r\n]+)`?/)
    const notesMatch = content.match(/Review Notes:\*{0,2}\s*`?([^`\r\n]+)`?/)

    return {
      approved: isApproved,
      reviewer: reviewerMatch?.[1],
      timestamp: timestampMatch?.[1],
      notes: notesMatch?.[1],
    }
  }

  /**
   * Records human approval in APPROVALS.md, unlocking execution.
   */
  public recordApproval(
    projectRoot: string,
    projectSlug: string,
    reviewer: string,
    notes = 'Approved by user for phased execution.'
  ): void {
    const approvalsPath = path.join(projectRoot, '.gravitas', 'specs', projectSlug, 'APPROVALS.md')
    const timestamp = new Date().toISOString()

    const content = `# Approval Ledger — ${projectSlug}

> [!NOTE]
> Specification approved. Human sign-off recorded.

## Current Gate Status: \`APPROVED\`

- **Sign-off Status:** \`APPROVED\`
- **Reviewer:** \`${reviewer}\`
- **Timestamp:** \`${timestamp}\`
- **Review Notes:** \`${notes}\`
`
    fs.mkdirSync(path.dirname(approvalsPath), { recursive: true })
    fs.writeFileSync(approvalsPath, content, 'utf-8')
  }

  /**
   * Strictly asserts that approval has been granted. Throws if blocked.
   */
  public assertApprovalGranted(projectRoot: string, projectSlug: string): void {
    const status = this.checkApprovalStatus(projectRoot, projectSlug)
    if (!status.approved) {
      throw new ApprovalGateBlockedError(
        projectSlug,
        'Execution blocked by Human Approval Gate. Explicit sign-off required in APPROVALS.md.'
      )
    }
  }
}
