import { describe, it, expect } from 'vitest'
import { deriveAgentStatusMessage } from './statusMapper.js'

describe('Wave 12H: Deterministic Status Message Mapper', () => {
  it('suppresses messages for UNKNOWN or unassigned states (Zero Fake Rule)', () => {
    const msgUnknown = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      currentState: 'UNKNOWN',
    })
    expect(msgUnknown).toBeNull()

    const msgNeutral = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      currentState: 'NEUTRAL',
    })
    expect(msgNeutral).toBeNull()

    const msgEmpty = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      currentState: '',
    })
    expect(msgEmpty).toBeNull()
  })

  it('generates concise message when Frontend Engineer starts working', () => {
    const msg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      taskId: 'T-142',
      taskTitle: 'Implement responsive itinerary cards',
      currentState: 'WORKING',
      runtimePhase: 'WORKER_RUNNING',
    })

    expect(msg).not.toBeNull()
    expect(msg?.roleId).toBe('role:engineering:frontend-engineer')
    expect(msg?.taskId).toBe('T-142')
    expect(msg?.category).toBe('TASK_STARTED')
    expect(msg?.shortText).toContain('Working on T-142')
    expect(msg?.severity).toBe('info')
    expect(msg?.expiresAfterMs).toBeGreaterThanOrEqual(4000)
    expect(msg?.expiresAfterMs).toBeLessThanOrEqual(7000)
  })

  it('generates handoff message when Frontend Engineer completes work', () => {
    const msg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      taskId: 'T-142',
      currentState: 'COMPLETED',
    })

    expect(msg).not.toBeNull()
    expect(msg?.category).toBe('TASK_COMPLETED')
    expect(msg?.shortText).toBe('Implementation finished. Sending T-142 to Review.')
    expect(msg?.severity).toBe('success')
  })

  it('generates receipt message when Independent Reviewer receives handoff', () => {
    const msg = deriveAgentStatusMessage({
      roleId: 'role:quality:independent-reviewer',
      taskId: 'T-142',
      currentState: 'HANDOFF_RECEIVED',
    })

    expect(msg).not.toBeNull()
    expect(msg?.roleId).toBe('role:quality:independent-reviewer')
    expect(msg?.category).toBe('HANDOFF_RECEIVED')
    expect(msg?.shortText).toBe('Got T-142. Running verification.')
    expect(msg?.severity).toBe('info')
  })

  it('generates approval message when verification passes', () => {
    const msg = deriveAgentStatusMessage({
      roleId: 'role:quality:independent-reviewer',
      taskId: 'T-142',
      currentState: 'VERIFICATION_PASSED',
    })

    expect(msg).not.toBeNull()
    expect(msg?.category).toBe('VERIFICATION_PASSED')
    expect(msg?.shortText).toBe('All checks passed. Sending this for your approval.')
    expect(msg?.severity).toBe('success')
  })

  it('generates error return message when verification fails with problem count', () => {
    const msg = deriveAgentStatusMessage({
      roleId: 'role:quality:independent-reviewer',
      taskId: 'T-142',
      currentState: 'VERIFICATION_FAILED',
      errorCount: 2,
    })

    expect(msg).not.toBeNull()
    expect(msg?.category).toBe('VERIFICATION_FAILED')
    expect(msg?.shortText).toBe('Verification found 2 problems. Returning T-142 to Engineering.')
    expect(msg?.severity).toBe('error')
  })

  it('generates dependency wait message when blocked on upstream task', () => {
    const msg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      taskId: 'T-142',
      currentState: 'DEPENDENCY_WAIT',
      dependencyTaskId: 'T-139',
      dependencyRoleName: 'Backend',
    })

    expect(msg).not.toBeNull()
    expect(msg?.category).toBe('DEPENDENCY_WAIT')
    expect(msg?.shortText).toBe('Waiting for T-139 from Backend.')
    expect(msg?.severity).toBe('warning')
  })

  it('generates waiting approval message for human sign-off', () => {
    const msg = deriveAgentStatusMessage({
      roleId: 'role:quality:independent-reviewer',
      taskId: 'T-142',
      currentState: 'WAITING_APPROVAL',
    })

    expect(msg).not.toBeNull()
    expect(msg?.category).toBe('WAITING_APPROVAL')
    expect(msg?.shortText).toBe('T-142 ready for operator review and approval.')
    expect(msg?.severity).toBe('success')
  })

  it('suppresses message for ambient idle states', () => {
    const msg = deriveAgentStatusMessage({
      roleId: 'role:engineering:frontend-engineer',
      currentState: 'IDLE',
    })
    expect(msg).toBeNull()
  })
})
