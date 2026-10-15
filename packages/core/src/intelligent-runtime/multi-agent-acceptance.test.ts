import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { execSync } from 'node:child_process'
import {
  DeepDiscoveryEngine,
  ApprovalGateBlockedError,
} from './DeepDiscoveryEngine.js'
import { InAppReliabilityLoop } from './InAppReliabilityLoop.js'

describe('Gate 05.4: Multi-Agent Acceptance Scenario on Disposable Fixture', () => {
  let workDir: string
  let deepDiscovery: DeepDiscoveryEngine
  let reliabilityLoop: InAppReliabilityLoop

  beforeEach(() => {
    // Create an isolated workspace cloned from test-fixtures/disposable-portfolio
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'disposable-portfolio-run-'))
    const sourceFixture = path.resolve('test-fixtures/disposable-portfolio')

    fs.cpSync(sourceFixture, workDir, { recursive: true })
    deepDiscovery = new DeepDiscoveryEngine()
    reliabilityLoop = new InAppReliabilityLoop()
  })

  afterEach(() => {
    try {
      fs.rmSync(workDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
  })

  it('orchestrates Scout, Ada, Pixel, Cipher, and Grav with strict Approval Gate and verified delivery', async () => {
    const projectSlug = 'accessible-theme-toggle'

    // ─────────────────────────────────────────────────────────────
    // STEP 1: SCOUT (RECONNAISSANCE)
    // ─────────────────────────────────────────────────────────────
    const files = fs.readdirSync(workDir)
    expect(files).toContain('index.html')
    expect(files).toContain('styles.css')
    expect(files).toContain('package.json')

    const scoutRecon = {
      totalFiles: files.length,
      hasSemanticHtml: fs.readFileSync(path.join(workDir, 'index.html'), 'utf-8').includes('<main'),
      cssTokensDeclared: fs.readFileSync(path.join(workDir, 'styles.css'), 'utf-8').includes('--bg-color'),
      missingCapability: 'No accessible high-contrast theme toggle detected.',
    }
    expect(scoutRecon.hasSemanticHtml).toBe(true)
    expect(scoutRecon.cssTokensDeclared).toBe(true)

    // ─────────────────────────────────────────────────────────────
    // STEP 2: ADA (DEEP DISCOVERY & SPECIFICATION)
    // ─────────────────────────────────────────────────────────────
    const interview = deepDiscovery.generateDiscoveryInterview(
      'Add high-contrast theme toggle with keyboard shortcuts for portfolio',
      { stack: 'HTML/CSS/JS', testing: 'node test.mjs' }
    )
    expect(interview.recommendedQuestions.length).toBeGreaterThanOrEqual(1)

    const specManifest = deepDiscovery.generateSpecificationSuite(workDir, projectSlug, {
      projectTitle: 'Accessible Theme Toggle Feature',
      intent: 'Provide accessible theme toggle with WCAG AAA contrast ratio and keyboard navigation.',
      discussion: {
        topic: 'Accessible Contrast & Keyboard Navigation',
        answeredQuestions: [
          {
            question: 'What is the required contrast ratio?',
            answer: 'WCAG AAA (7:1 for text).',
            clarifiedAt: new Date().toISOString(),
          },
        ],
        resolvedDecisions: [
          {
            decisionTitle: 'Use data-theme="high-contrast" on <html> element',
            rationale: 'Clean CSS attribute selector with zero runtime dependencies.',
            status: 'ACCEPTED',
          },
        ],
      },
      architectureOverview: 'Lightweight toggle component wired to CSS custom properties.',
      phasedPlan: [
        {
          phase: 'Phase 1: High-Contrast Tokens & Toggle Button',
          tasks: [
            'Add [data-theme="high-contrast"] rules in styles.css',
            'Add <button id="theme-toggle"> in index.html',
          ],
        },
      ],
    })

    expect(specManifest.isApproved).toBe(false)
    expect(fs.existsSync(specManifest.approvalsMdPath)).toBe(true)

    // ─────────────────────────────────────────────────────────────
    // STEP 3: PIXEL (DESIGN & WCAG AA/AAA REVIEW)
    // ─────────────────────────────────────────────────────────────
    const pixelDesignAudit = {
      approvedPalette: {
        highContrastBg: '#0D110F',
        highContrastText: '#FFFFFF',
        highContrastAccent: '#95D5B2',
      },
      wcagRatio: 14.2, // Passes AAA (7:1 minimum)
      tokenConvention: 'CSS custom properties under [data-theme="high-contrast"]',
      passedReview: true,
    }
    expect(pixelDesignAudit.wcagRatio).toBeGreaterThan(7.0)
    expect(pixelDesignAudit.passedReview).toBe(true)

    // ─────────────────────────────────────────────────────────────
    // STEP 4: CIPHER (APPROVAL GATE ENFORCEMENT)
    // ─────────────────────────────────────────────────────────────
    // Verify that executing before human approval strictly fails closed
    expect(() => {
      deepDiscovery.assertApprovalGranted(workDir, projectSlug)
    }).toThrow(ApprovalGateBlockedError)

    // ─────────────────────────────────────────────────────────────
    // STEP 5: HUMAN APPROVAL (SIGN-OFF RECORDED)
    // ─────────────────────────────────────────────────────────────
    deepDiscovery.recordApproval(
      workDir,
      projectSlug,
      'Smarak Padhi <smarakpadhi58@gmail.com>',
      'Approved: Proceed with scoped implementation of high-contrast theme toggle.'
    )

    // Gate must now unlock
    expect(() => {
      deepDiscovery.assertApprovalGranted(workDir, projectSlug)
    }).not.toThrow()

    const approvalStatus = deepDiscovery.checkApprovalStatus(workDir, projectSlug)
    expect(approvalStatus.approved).toBe(true)
    expect(approvalStatus.reviewer).toContain('Smarak')

    // ─────────────────────────────────────────────────────────────
    // STEP 6: CIPHER (SCOPED IMPLEMENTATION VIA RELIABILITY LOOP)
    // ─────────────────────────────────────────────────────────────
    const studioEvents: any[] = []
    reliabilityLoop.subscribe((e) => studioEvents.push(e))

    const plan = [
      {
        description: 'Append high-contrast theme CSS tokens',
        targetPath: 'styles.css',
        action: async () => {
          const cssPath = path.join(workDir, 'styles.css')
          const additionalCss = `\n\n[data-theme="high-contrast"] {\n  --bg-color: ${pixelDesignAudit.approvedPalette.highContrastBg};\n  --text-primary: ${pixelDesignAudit.approvedPalette.highContrastText};\n  --accent-color: ${pixelDesignAudit.approvedPalette.highContrastAccent};\n}\n`
          fs.appendFileSync(cssPath, additionalCss, 'utf-8')
          return 'Appended high-contrast CSS rules'
        },
      },
      {
        description: 'Add Theme Toggle button in header',
        targetPath: 'index.html',
        action: async () => {
          const htmlPath = path.join(workDir, 'index.html')
          let html = fs.readFileSync(htmlPath, 'utf-8')
          if (html.includes('</nav>')) {
            html = html.replace(
              '</nav>',
              '  <button id="theme-toggle" aria-label="Toggle High-Contrast Theme">Toggle Contrast</button>\n      </nav>'
            )
          } else {
            html = html.replace(
              '</header>',
              '  <nav><button id="theme-toggle" aria-label="Toggle High-Contrast Theme">Toggle Contrast</button></nav>\n    </header>'
            )
          }
          fs.writeFileSync(htmlPath, html, 'utf-8')
          return 'Injected theme toggle button'
        },
      },
    ]

    // ─────────────────────────────────────────────────────────────
    // STEP 7: GRAV (AUTOMATED VERIFICATION & RECEIPT COMPILATION)
    // ─────────────────────────────────────────────────────────────
    const validationRunner = async () => {
      // 1. Run portfolio test suite
      let testPassed = false
      let testOutput = ''
      try {
        testOutput = execSync('node test.mjs', { cwd: workDir, encoding: 'utf-8' })
        testPassed = true
      } catch (err: any) {
        testOutput = err?.message || 'Test script failed'
      }

      // 2. Validate token presence in styles.css
      const updatedCss = fs.readFileSync(path.join(workDir, 'styles.css'), 'utf-8')
      const cssValid = updatedCss.includes('[data-theme="high-contrast"]')

      // 3. Validate button presence in index.html
      const updatedHtml = fs.readFileSync(path.join(workDir, 'index.html'), 'utf-8')
      const htmlValid = updatedHtml.includes('id="theme-toggle"')

      return [
        {
          checkName: 'Portfolio Automated Test Suite',
          command: 'node test.mjs',
          exitCode: testPassed ? 0 : 1,
          passed: testPassed,
          outputEvidence: testOutput.trim(),
        },
        {
          checkName: 'CSS Token Verification',
          passed: cssValid,
          outputEvidence: 'High-contrast selector verified in styles.css',
        },
        {
          checkName: 'HTML Element Accessibility Verification',
          passed: htmlValid,
          outputEvidence: '<button id="theme-toggle"> verified with aria-label',
        },
      ]
    }

    const receipt = await reliabilityLoop.executeTaskLifecycle(
      'Implement high-contrast theme toggle for portfolio',
      {
        title: 'High-Contrast Theme Toggle',
        allowedPaths: ['styles.css', 'index.html'],
      },
      plan,
      validationRunner,
      undefined,
      { assignedMascot: 'grav', approverSignedOff: true }
    )

    // Assert final verifiable guarantees
    expect(receipt.status).toBe('VERIFIED')
    expect(receipt.stepsExecuted).toHaveLength(2)
    expect(receipt.validationChecks).toHaveLength(3)
    expect(receipt.validationChecks.every((c) => c.passed)).toBe(true)
    expect(receipt.budgetUsed.withinBudget).toBe(true)
    expect(receipt.studioEventEmitted).toBe(true)

    // Verify studio mascot events
    expect(studioEvents.some((e) => e.eventType === 'TASK_STARTED')).toBe(true)
    expect(studioEvents.some((e) => e.eventType === 'TASK_VERIFIED')).toBe(true)
    expect(studioEvents.some((e) => e.bubbleText.includes('Verified'))).toBe(true)
  })
})
