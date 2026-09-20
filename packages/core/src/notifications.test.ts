import { describe, expect, it } from 'vitest'
import {
  createApprovalRequiredEvent,
  createRunCompletedEvent,
  createRunFailedEvent,
  createTaskApprovedEvent,
  createTaskCompositionConflictEvent,
  createTaskResultMaterializedEvent,
  createTaskStateChangedEvent,
} from './events.js'
import { deriveNotificationFromEvent } from './notifications.js'

describe('Notification Boundary (notifications.test.ts)', () => {
  it('maps APPROVAL_REQUIRED to ACTION_REQUIRED notification', () => {
    const event = createApprovalRequiredEvent('run_1', 'task_1')
    const notif = deriveNotificationFromEvent(event)
    expect(notif).not.toBeNull()
    expect(notif?.severity).toBe('ACTION_REQUIRED')
    expect(notif?.title).toContain('Human Review Required')
    expect(notif?.taskId).toBe('task_1')
  })

  it('maps TASK_COMPOSITION_CONFLICT to CRITICAL notification', () => {
    const event = createTaskCompositionConflictEvent('run_1', 'task_join', {
      parentCommitShas: ['sha1', 'sha2'],
      conflictDetails: 'Auto-merge failed: file.txt',
    })
    const notif = deriveNotificationFromEvent(event)
    expect(notif).not.toBeNull()
    expect(notif?.severity).toBe('CRITICAL')
    expect(notif?.title).toContain('Composition Blocked')
    expect(notif?.message).toContain('Auto-merge failed')
  })

  it('maps task failure to CRITICAL notification', () => {
    const event = createTaskStateChangedEvent({
      runId: 'run_1',
      taskId: 'task_fail',
      fromState: 'VERIFYING',
      toState: 'FAILED',
      reason: 'Deterministic test exited with 1',
    })
    const notif = deriveNotificationFromEvent(event)
    expect(notif).not.toBeNull()
    expect(notif?.severity).toBe('CRITICAL')
    expect(notif?.message).toContain('Deterministic test exited with 1')
  })

  it('maps task cancellation to IMPORTANT notification', () => {
    const event = createTaskStateChangedEvent({
      runId: 'run_1',
      taskId: 'task_canc',
      fromState: 'BLOCKED',
      toState: 'CANCELLED',
      reason: 'DEPENDENCY_FAILED',
    })
    const notif = deriveNotificationFromEvent(event)
    expect(notif).not.toBeNull()
    expect(notif?.severity).toBe('IMPORTANT')
    expect(notif?.title).toContain('Task Cancelled')
  })

  it('maps RUN_COMPLETED and TASK_APPROVED to IMPORTANT notifications', () => {
    const appEvent = createTaskApprovedEvent('run_1', 'task_1', { reviewer: 'lead_operator' })
    const appNotif = deriveNotificationFromEvent(appEvent)
    expect(appNotif?.severity).toBe('IMPORTANT')
    expect(appNotif?.message).toContain('lead_operator')

    const compEvent = createRunCompletedEvent('run_1')
    const compNotif = deriveNotificationFromEvent(compEvent)
    expect(compNotif?.severity).toBe('IMPORTANT')
  })

  it('filters out internal events (null return)', () => {
    const event = createTaskStateChangedEvent({
      runId: 'run_1',
      taskId: 'task_run',
      fromState: 'READY',
      toState: 'RUNNING',
    })
    const notif = deriveNotificationFromEvent(event)
    expect(notif).toBeNull()
  })
})
