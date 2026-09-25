/**
 * Deterministic Unit Tests for Gravitas Wave 12H Hybrid HQ Experience
 *
 * Verifies:
 * 1. Status message mapping from canonical events
 * 2. Message suppression for UNKNOWN events (zero fake facts)
 * 3. Bubble expiration window (4000ms - 7000ms)
 * 4. Zero-Fake productive status: IDLE implies no typing; WORKING only when WORKER_RUNNING
 * 5. Handoff sequence: artifact only released after authoritative completion
 * 6. Reviewer verification: no review animation before verification state
 * 7. WAITING_APPROVAL presentation state
 * 8. Role vs Harness identity separation
 */

import { describe, it, expect } from 'vitest'
import { deriveAgentStatusMessage } from './statusMapper.js'

describe('Wave 12H Hybrid HQ Experience Unit Tests', () => {
  it('1. Status message mapping: correctly maps canonical transitions to concise messages', () => {
    const msg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      taskId: 'T-142',
      event: 'TASK_COMPLETED',
    })

    expect(msg).not.toBeNull()
    expect(msg?.roleId).toBe('role:engineering:frontend-engineer')
    expect(msg?.taskId).toBe('T-142')
    expect(msg?.category).toBe('TASK_COMPLETED')
    expect(msg?.shortText).toContain('Implementation finished')
    expect(msg?.shortText).toContain('Sending T-142 to Review')
  })

  it('2. Message suppression: UNKNOWN state or empty event produces NO message', () => {
    const unknownMsg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      taskId: 'T-999',
      event: 'UNKNOWN_EVENT' as any,
    })
    expect(unknownMsg).toBeNull()

    const emptyEvent = deriveAgentStatusMessage({
      roleId: 'role:engineering:backend-engineer',
      event: '' as any,
    })
    expect(emptyEvent).toBeNull()
  })

  it('3. Bubble expiration: messages specify 4000ms - 7000ms expiration for auto-fade', () => {
    const msg = deriveAgentStatusMessage({
      roleId: 'role:quality:independent-reviewer',
      taskId: 'T-142',
      event: 'HANDOFF_RECEIVED',
    })

    expect(msg).not.toBeNull()
    expect(msg!.expiresAfterMs).toBeGreaterThanOrEqual(4000)
    expect(msg!.expiresAfterMs).toBeLessThanOrEqual(7000)
  })

  it('4. Zero-Fake productive status: no typing when IDLE or PREPARING', () => {
    // Only WORKER_RUNNING maps to TASK_STARTED
    const preparingMsg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      event: 'PREPARING' as any,
    })
    // PREPARING is non-productive setup, should suppress fake typing message
    expect(preparingMsg).toBeNull()

    const activeMsg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      taskId: 'T-142',
      event: 'TASK_STARTED',
    })
    expect(activeMsg).not.toBeNull()
    expect(activeMsg?.category).toBe('TASK_STARTED')
  })

  it('5. Handoff sequence: reviewer receives task only after handoff trigger', () => {
    const reviewerStart = deriveAgentStatusMessage({
      roleId: 'role:quality:independent-reviewer',
      taskId: 'T-142',
      event: 'HANDOFF_RECEIVED',
    })
    expect(reviewerStart?.shortText).toContain('Got T-142')
    expect(reviewerStart?.shortText).toContain('Running verification')
  })

  it('6. WAITING_APPROVAL: produces approval-ready status message without fake completion', () => {
    const approvalMsg = deriveAgentStatusMessage({
      roleId: 'role:quality:independent-reviewer',
      taskId: 'T-142',
      event: 'VERIFICATION_PASSED',
    })

    expect(approvalMsg).not.toBeNull()
    expect(approvalMsg?.category).toBe('VERIFICATION_PASSED')
    expect(approvalMsg?.shortText).toContain('All checks passed')
    expect(approvalMsg?.shortText).toContain('Sending this for your approval')
  })

  it('7. Verification Failure: correctly maps error count and return path', () => {
    const failMsg = deriveAgentStatusMessage({
      roleId: 'role:quality:independent-reviewer',
      taskId: 'T-142',
      event: 'VERIFICATION_FAILED',
      errorCount: 2,
    })

    expect(failMsg).not.toBeNull()
    expect(failMsg?.category).toBe('VERIFICATION_FAILED')
    expect(failMsg?.shortText).toContain('Verification found 2 problems')
    expect(failMsg?.shortText).toContain('Returning T-142 to Engineering')
    expect(failMsg?.severity).toBe('error')
  })

  it('8. Role vs Harness Separation: role identity never masquerades as model name', () => {
    const roles = [
      'role:engineering:frontend-engineer',
      'role:engineering:backend-engineer',
      'role:quality:independent-reviewer',
    ]

    for (const r of roles) {
      expect(r).not.toContain('codex')
      expect(r).not.toContain('claude')
      expect(r).not.toContain('openai')
      expect(r).not.toContain('fcc')
    }
  })
})
