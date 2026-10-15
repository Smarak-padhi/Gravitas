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

  it('guarantees that zero validations can NEVER produce VERIFIED status', async () => {
    const loop = new InAppReliabilityLoop()

    const plan = [
      {
        description: 'Trivial in-memory task',
        action: async () => 'In-memory state updated',
      },
    ]

    // Empty validation checks array
    const emptyValidationRunner = async (): Promise<ValidationCheckResult[]> => []

    const receipt = await loop.executeTaskLifecycle(
      'Perform task without checks',
      { title: 'Unchecked Task' },
      plan,
      emptyValidationRunner
    )

    expect(receipt.status).not.toBe('VERIFIED')
    expect(receipt.status).toBe('COMPLETED_UNVERIFIED')
    expect(receipt.validationChecks).toHaveLength(0)
  })

  it('fails verification if any required validation criterion is missing or unverified', async () => {
    const loop = new InAppReliabilityLoop()

    const plan = [
      {
        description: 'Update user settings',
        action: async () => 'Settings updated',
      },
    ]

    // Two criteria required by contract
    const contract = {
      title: 'Update User Settings',
      validationCriteria: ['Database row persisted', 'Audit log written'],
    }

    // Only one check provided and passed
    const partialValidationRunner = async (): Promise<ValidationCheckResult[]> => [
      {
        checkName: 'Database row persisted',
        passed: true,
        outputEvidence: 'Row id=42 present in sqlite',
      },
    ]

    const receipt = await loop.executeTaskLifecycle(
      'Update user settings with criteria',
      contract,
      plan,
      partialValidationRunner
    )

    expect(receipt.status).not.toBe('VERIFIED')
    expect(receipt.status).toBe('PARTIAL')
    expect(receipt.criteriaEvaluation?.some((c) => !c.passed)).toBe(true)
  })

  it('guarantees that failed execution steps cannot silently produce VERIFIED completions', async () => {
    const loop = new InAppReliabilityLoop()

    const plan = [
      {
        description: 'Failing execution step',
        action: async () => {
          throw new Error('Database disk full')
        },
      },
    ]

    // Even if validation somehow returned true, failure in execution steps must prevent VERIFIED
    const mockValidationRunner = async (): Promise<ValidationCheckResult[]> => [
      {
        checkName: 'Synthetic Health Check',
        passed: true,
      },
    ]

    const receipt = await loop.executeTaskLifecycle(
      'Execute task with crashing step',
      { title: 'Crashing Task' },
      plan,
      mockValidationRunner
    )

    expect(receipt.status).not.toBe('VERIFIED')
    expect(['FAILED', 'PARTIAL']).toContain(receipt.status)
    expect(receipt.stepsExecuted[0].status).toBe('FAILED')
  })

  it('strictly blocks execution paths outside contract allowedPaths', async () => {
    const loop = new InAppReliabilityLoop()

    const plan = [
      {
        description: 'Attempt to overwrite /etc/hosts or out-of-scope system file',
        targetPath: 'C:/Windows/System32/drivers/etc/hosts',
        action: async () => 'Attempted write',
      },
    ]

    const receipt = await loop.executeTaskLifecycle(
      'Malicious or out-of-scope path mutation',
      {
        title: 'Scoped Edit',
        allowedPaths: ['src/components/'],
      },
      plan,
      async () => []
    )

    expect(receipt.status).not.toBe('VERIFIED')
    expect(receipt.stepsExecuted[0].status).toBe('FAILED')
    expect(receipt.stepsExecuted[0].outputSnippet).toContain('violates contract allowedPaths')
  })

  it('strictly blocks unauthorized tools outside contract allowedTools', async () => {
    const loop = new InAppReliabilityLoop()

    const plan = [
      {
        description: 'Attempt shell execution without authorization',
        toolName: 'unauthorized_exec_shell',
        action: async () => 'Ran shell',
      },
    ]

    const receipt = await loop.executeTaskLifecycle(
      'Unauthorized tool execution',
      {
        title: 'Restricted Tool Task',
        allowedTools: ['read', 'write'], // 'unauthorized_exec_shell' is not allowed
      },
      plan,
      async () => []
    )

    expect(receipt.status).not.toBe('VERIFIED')
    expect(receipt.stepsExecuted[0].status).toBe('FAILED')
    expect(receipt.stepsExecuted[0].outputSnippet).toContain('not permitted by contract allowedTools')
  })

  it('records honest offline tokens and labeled reconnaissance status in receipt', async () => {
    const loop = new InAppReliabilityLoop()

    const receipt = await loop.executeTaskLifecycle(
      'Verify honest metadata receipt',
      {
        title: 'Metadata Honest Receipt',
      },
      [{ description: 'Read state', action: async () => 'State read' }],
      async () => [{ checkName: 'Quick Check', passed: true }]
    )

    expect(receipt.status).toBe('VERIFIED')
    expect(receipt.budgetUsed.tokenMeasurement).toBe('NOT_APPLICABLE_OFFLINE')
    expect(receipt.budgetUsed.tokensUsed).toBe(0)
    expect(receipt.reconnaissance.status).toBe('NOT_PERFORMED')
  })
})
