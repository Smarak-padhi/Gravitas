import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  DeepDiscoveryEngine,
  ApprovalGateBlockedError,
} from './DeepDiscoveryEngine.js'

describe('Gate 05.4: Deep Discovery Engine & Strict Approval Gate', () => {
  let tempDir: string
  let engine: DeepDiscoveryEngine

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gravitas-discovery-test-'))
    engine = new DeepDiscoveryEngine()
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
  })

  it('generates adaptive discovery interview questions for underspecified requests', () => {
    const interview = engine.generateDiscoveryInterview('Build a new feature for notes')

    expect(interview.ambiguityScore).toBeGreaterThanOrEqual(50)
    expect(interview.recommendedQuestions.length).toBeGreaterThanOrEqual(2)
    expect(interview.recommendedQuestions.some((q) => q.includes('stack'))).toBe(true)
  })

  it('saves and loads global developer preferences in .gravitas/preferences.json', () => {
    const saved = engine.saveGlobalPreferences(
      {
        author: 'Smarak Padhi <smarakpadhi58@gmail.com>',
        strictVerification: true,
        localFirst: true,
      },
      tempDir
    )

    expect(saved.author).toContain('Smarak')

    const loaded = engine.loadGlobalPreferences(tempDir)
    expect(loaded.author).toBe(saved.author)
    expect(loaded.strictVerification).toBe(true)
  })

  it('generates canonical specification suite in .gravitas/specs/<project>/', () => {
    const projectSlug = 'portfolio-accessibility-revamp'
    const manifest = engine.generateSpecificationSuite(tempDir, projectSlug, {
      projectTitle: 'Portfolio Accessibility Revamp',
      intent: 'Make personal portfolio accessible with WCAG AAA contrast and keyboard shortcuts.',
      discussion: {
        topic: 'Accessible Theme & Keyboard Navigation',
        answeredQuestions: [
          {
            question: 'What is the target WCAG contrast level?',
            answer: 'WCAG AAA (7:1 ratio for body text, 4.5:1 for headers).',
            clarifiedAt: '2026-10-15T12:00:00Z',
          },
        ],
        resolvedDecisions: [
          {
            decisionTitle: 'Adopt CSS Custom Properties for Tokens',
            rationale: 'Allows runtime theme toggles without CSS-in-JS dependencies.',
            status: 'ACCEPTED',
          },
        ],
      },
      architectureOverview: 'Single-page portfolio with semantic landmark tags and CSS tokens.',
      phasedPlan: [
        {
          phase: 'Phase 1: Semantic Markup & Tokens',
          tasks: ['Add CSS tokens in styles.css', 'Add skip-to-content link'],
        },
      ],
    })

    expect(manifest.isApproved).toBe(false)
    expect(fs.existsSync(manifest.projectMdPath)).toBe(true)
    expect(fs.existsSync(manifest.questionsMdPath)).toBe(true)
    expect(fs.existsSync(manifest.decisionsMdPath)).toBe(true)
    expect(fs.existsSync(manifest.architectureMdPath)).toBe(true)
    expect(fs.existsSync(manifest.planMdPath)).toBe(true)
    expect(fs.existsSync(manifest.approvalsMdPath)).toBe(true)

    // Verify initial APPROVALS.md status is PENDING
    const approvalStatus = engine.checkApprovalStatus(tempDir, projectSlug)
    expect(approvalStatus.approved).toBe(false)
  })

  it('strictly blocks execution until human approval is signed off in APPROVALS.md', () => {
    const projectSlug = 'disposable-fixture'
    engine.generateSpecificationSuite(tempDir, projectSlug, {
      projectTitle: 'Disposable Test',
      intent: 'Verify approval gate enforcement.',
      discussion: { topic: 'Testing', answeredQuestions: [], resolvedDecisions: [] },
      architectureOverview: 'Test architecture',
      phasedPlan: [{ phase: 'Phase 1', tasks: ['Task 1'] }],
    })

    // Must throw ApprovalGateBlockedError when not signed off
    expect(() => {
      engine.assertApprovalGranted(tempDir, projectSlug)
    }).toThrow(ApprovalGateBlockedError)

    // User signs off
    engine.recordApproval(tempDir, projectSlug, 'Smarak Padhi <smarakpadhi58@gmail.com>', 'Approved for execution')

    // Now assertion must pass cleanly
    expect(() => {
      engine.assertApprovalGranted(tempDir, projectSlug)
    }).not.toThrow()

    const status = engine.checkApprovalStatus(tempDir, projectSlug)
    expect(status.approved).toBe(true)
    expect(status.reviewer).toContain('Smarak')
  })
})
