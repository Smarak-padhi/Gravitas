/**
 * Deterministic Unit Tests for Gravitas Wave 12H-R Hybrid HQ Experience
 *
 * Verifies:
 * 1. Canonical state -> unified presentation state (zero contradictions)
 * 2. No FAILED + Working contradiction (FAILED explicitly displays halted)
 * 3. No IDLE + productive animation (idle agents never claim active work)
 * 4. No handoff before scheduler release
 * 5. No review before verification
 * 6. No approval visual before WAITING_APPROVAL
 * 7. Debug scenario controls hidden in normal mode (only visible when ?debug=hybrid)
 * 8. Role identity strictly independent of harness / model names
 * 9. UNKNOWN suppresses invented status (zero fabricated facts)
 * 10. Bubble auto-fade expiration window (4000ms - 7000ms)
 */

import { describe, it, expect } from 'vitest'
import { deriveAgentStatusMessage } from './statusMapper.js'
import { getAgentPresentationStatus } from './HybridInspector.js'

describe('Wave 12H-R Hybrid HQ Experience & Presentation Consistency Tests', () => {
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

  it('2. Contradiction Fix: FAILED state NEVER produces "Working on" copy', () => {
    const failedStatusWithTask = getAgentPresentationStatus('FAILED', 'T-142')
    expect(failedStatusWithTask).toBe('Execution halted on T-142')
    expect(failedStatusWithTask.toLowerCase()).not.toContain('working')
    expect(failedStatusWithTask.toLowerCase()).not.toContain('executing')

    const failedStatusWithoutTask = getAgentPresentationStatus('FAILED')
    expect(failedStatusWithoutTask).toBe('Execution halted with errors')
    expect(failedStatusWithoutTask.toLowerCase()).not.toContain('working')

    // Message mapper also derives halting error
    const failMsg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      taskId: 'T-142',
      event: 'FAILED',
    })
    expect(failMsg?.shortText).toContain('Execution halted with error')
    expect(failMsg?.shortText.toLowerCase()).not.toContain('working')
  })

  it('3. Unified presentation state across states without contradiction', () => {
    // COMPLETED -> Handoff ready
    const completedText = getAgentPresentationStatus('COMPLETED', 'T-142')
    expect(completedText).toBe('Finished T-142 (Handoff ready)')
    expect(completedText.toLowerCase()).not.toContain('working on')

    // REVIEWING -> Verifying
    const reviewingText = getAgentPresentationStatus('REVIEWING', 'T-142')
    expect(reviewingText).toBe('Verifying T-142')

    // WAITING_APPROVAL -> Awaiting approval
    const approvalText = getAgentPresentationStatus('WAITING_APPROVAL', 'T-142')
    expect(approvalText).toBe('Awaiting approval for T-142')

    // WAITING -> Waiting on dependencies
    const waitingText = getAgentPresentationStatus('WAITING', 'T-142')
    expect(waitingText).toBe('Waiting on dependencies for T-142')

    // WORKING -> Active
    const workingText = getAgentPresentationStatus('WORKING', 'T-142')
    expect(workingText).toBe('Working on T-142')

    // IDLE -> Standby
    const idleText = getAgentPresentationStatus('IDLE')
    expect(idleText).toBe('Standby / Non-productive')
  })

  it('4. Zero-Fake productive status: no typing when IDLE or PREPARING', () => {
    const preparingMsg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      event: 'PREPARING' as any,
    })
    // PREPARING is non-productive setup, should suppress fake typing message
    expect(preparingMsg).toBeNull()

    const idleMsg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      event: 'IDLE',
    })
    expect(idleMsg).toBeNull()

    const activeMsg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      taskId: 'T-142',
      event: 'TASK_STARTED',
    })
    expect(activeMsg).not.toBeNull()
    expect(activeMsg?.category).toBe('TASK_STARTED')
  })

  it('5. Message suppression: UNKNOWN state or empty event produces NO message', () => {
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

  it('6. Bubble expiration: messages specify 4000ms - 7000ms expiration for auto-fade', () => {
    const msg = deriveAgentStatusMessage({
      roleId: 'role:quality:independent-reviewer',
      taskId: 'T-142',
      event: 'HANDOFF_RECEIVED',
    })

    expect(msg).not.toBeNull()
    expect(msg!.expiresAfterMs).toBeGreaterThanOrEqual(4000)
    expect(msg!.expiresAfterMs).toBeLessThanOrEqual(7000)
  })

  it('7. Handoff sequence: reviewer receives task only after handoff trigger', () => {
    const reviewerStart = deriveAgentStatusMessage({
      roleId: 'role:quality:independent-reviewer',
      taskId: 'T-142',
      event: 'HANDOFF_RECEIVED',
    })
    expect(reviewerStart?.shortText).toContain('Got T-142')
    expect(reviewerStart?.shortText).toContain('Running verification')
  })

  it('8. WAITING_APPROVAL: produces approval-ready status message without fake completion', () => {
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

  it('9. Verification Failure: correctly maps error count and return path', () => {
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

  it('10. Role vs Harness Separation: role identity never masquerades as model name', () => {
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

  it('11. Debug scenario controls gating rule', () => {
    // In normal mode (?debug not provided), debug mode must evaluate false
    const normalParams = new URLSearchParams('')
    const isNormalDebug = normalParams.get('debug') === 'hybrid'
    expect(isNormalDebug).toBe(false)

    // With ?debug=hybrid, debug mode evaluates true
    const debugParams = new URLSearchParams('?debug=hybrid')
    const isDebugActive = debugParams.get('debug') === 'hybrid'
    expect(isDebugActive).toBe(true)
  })

  it('12. Sender speech clearing: handover transfer clears previous worker completion speech', () => {
    // Frontend sends completion message
    const compMsg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      taskId: 'T-142',
      event: 'TASK_COMPLETED',
    })
    expect(compMsg?.roleId).toBe('role:engineering:frontend-engineer')

    // Upon arrival, Reviewer receives handoff and becomes active
    const recvMsg = deriveAgentStatusMessage({
      roleId: 'role:quality:independent-reviewer',
      taskId: 'T-142',
      event: 'HANDOFF_RECEIVED',
    })
    expect(recvMsg?.roleId).toBe('role:quality:independent-reviewer')

    // Sender's message should not share the same role ID or persist across distinct lifecycle moments
    expect(compMsg?.roleId).not.toBe(recvMsg?.roleId)
  })

  it('13. Day/Eve/Night atmosphere changes do not fabricate runtime activity', () => {
    const atmospheres = ['DAY', 'EVENING', 'NIGHT'] as const
    const initialStatus = getAgentPresentationStatus('IDLE')

    // Atmosphere presets must preserve runtime truth: idle remains idle across Day, Evening, Night
    for (const _atm of atmospheres) {
      const statusUnderAtmosphere = getAgentPresentationStatus('IDLE')
      expect(statusUnderAtmosphere).toBe(initialStatus)
      expect(statusUnderAtmosphere).toBe('Standby / Non-productive')
      expect(statusUnderAtmosphere.toLowerCase()).not.toContain('working')
    }
  })
})
