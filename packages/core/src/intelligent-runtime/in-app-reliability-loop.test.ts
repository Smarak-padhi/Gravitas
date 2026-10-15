import { describe, it, expect, vi } from 'vitest'
import {
  InAppReliabilityLoop,
  type ValidationCheckResult,
} from './InAppReliabilityLoop.js'

describe('Gate 05.3: In-App Reliability Loop', () => {
  it('successfully executes a task lifecycle through verification and emits studio events', async () => {
    const loop = new InAppReliabilityLoop()
    const events: any[] = []
    const unsub = loop.subscribe((e) => events.push(e))

    const plan = [
      {
        description: 'Update SQLite schema migration',
        action: async () => 'Migration script 004 applied successfully',
        targetPath: 'data/migrations/004.sql',
      },
      {
        description: 'Verify index integrity',
        action: async () => 'Index ideas_fts created',
      },
    ]

    const validationRunner = async (): Promise<ValidationCheckResult[]> => [
      {
        checkName: 'SQLite WAL Pragmas',
        command: 'PRAGMA journal_mode',
        exitCode: 0,
        passed: true,
        outputEvidence: 'wal',
      },
      {
        checkName: 'Schema Version Check',
        passed: true,
        outputEvidence: 'v4',
      },
    ]

    const receipt = await loop.executeTaskLifecycle(
      'Apply migration 004 for FTS indices',
      {
        title: 'Apply SQLite FTS Migration',
        allowedPaths: ['data/migrations/'],
      },
      plan,
      validationRunner,
      undefined,
      { assignedMascot: 'cipher' }
    )

    unsub()

    expect(receipt.status).toBe('VERIFIED')
    expect(receipt.budgetUsed.withinBudget).toBe(true)
    expect(receipt.stepsExecuted).toHaveLength(2)
    expect(receipt.stepsExecuted[0]?.status).toBe('EXECUTED')
    expect(receipt.validationChecks).toHaveLength(2)
    expect(receipt.validationChecks.every((c) => c.passed)).toBe(true)
    expect(receipt.recoveryAttempts).toBe(0)
    expect(receipt.studioEventEmitted).toBe(true)

    // Verify studio events were emitted
    expect(events.length).toBeGreaterThanOrEqual(2)
    expect(events[0].eventType).toBe('TASK_STARTED')
    expect(events[events.length - 1].eventType).toBe('TASK_VERIFIED')
    expect(events[events.length - 1].bubbleKind).toBe('success')
  })

  it('triggers bounded recovery loop on validation failure and succeeds if recovered', async () => {
    const loop = new InAppReliabilityLoop()
    let checkAttempts = 0

    const plan = [
      {
        description: 'Add CSS token for warm background',
        action: async () => 'Added --studio-bg: #141A16',
      },
    ]

    const validationRunner = async (): Promise<ValidationCheckResult[]> => {
      checkAttempts++
      if (checkAttempts === 1) {
        return [
          {
            checkName: 'WCAG AA Contrast Check',
            passed: false,
            outputEvidence: 'Contrast 3.8:1 below threshold 4.5:1',
          },
        ]
      }
      return [
        {
          checkName: 'WCAG AA Contrast Check',
          passed: true,
          outputEvidence: 'Contrast 4.8:1 passes AA',
        },
      ]
    }

    const recoveryStrategy = async (failed: ValidationCheckResult) => {
      // Correct token to higher contrast
      return true
    }

    const receipt = await loop.executeTaskLifecycle(
      'Update studio background token with WCAG compliance',
      { title: 'Update Studio Color Token' },
      plan,
      validationRunner,
      recoveryStrategy,
      { assignedMascot: 'pixel' }
    )

    expect(receipt.status).toBe('VERIFIED')
    expect(receipt.recoveryAttempts).toBe(1)
  })

  it('executes safe rollback and marks FAILED when recovery attempts are exhausted', async () => {
    const loop = new InAppReliabilityLoop()

    const plan = [
      {
        description: 'Unstable system operation',
        action: async () => 'Written tentative changes',
      },
    ]

    const validationRunner = async (): Promise<ValidationCheckResult[]> => [
      {
        checkName: 'Unit Test Suite',
        command: 'vitest run',
        exitCode: 1,
        passed: false,
        outputEvidence: 'Test failed: AssertError',
      },
    ]

    const recoveryStrategy = async () => false // Recovery fails

    const receipt = await loop.executeTaskLifecycle(
      'Unstable task requiring rollback',
      { title: 'Unstable Task' },
      plan,
      validationRunner,
      recoveryStrategy
    )

    expect(receipt.status).toBe('FAILED')
    expect(receipt.recoveryAttempts).toBe(2)
    expect(receipt.rollbackExecuted).toBe(true)
  })

  it('strictly blocks execution when human approval is required but not signed off', async () => {
    const loop = new InAppReliabilityLoop()

    const actionSpy = vi.fn().mockResolvedValue('Done')
    const validationSpy = vi.fn().mockResolvedValue([])

    const receipt = await loop.executeTaskLifecycle(
      'Deploy production migration',
      {
        title: 'Production Migration',
        requiresHumanApproval: true,
      },
      [{ description: 'Drop legacy table', action: actionSpy }],
      validationSpy,
      undefined,
      { approverSignedOff: false }
    )

    expect(receipt.status).toBe('BLOCKED')
    expect(actionSpy).not.toHaveBeenCalled()
    expect(validationSpy).not.toHaveBeenCalled()
  })
})
