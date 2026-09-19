import { describe, expect, it } from 'vitest'
import type { Task, TaskDetailResponse } from '../../api/types.js'
import { deriveInboxItems } from './inboxDerivation.js'
import { shouldTriggerNotification } from './notificationPolicy.js'

describe('Human Inbox Derivation & Policy Invariants (inboxDerivation.test.ts)', () => {
  it('returns empty list when no actionable events or tasks exist', () => {
    const items = deriveInboxItems({
      runs: [],
      tasks: [],
      taskDetail: null,
      events: [],
    })
    expect(items).toEqual([])
  })

  it('surfaces WAITING_APPROVAL as ACTION_REQUIRED priority #1', () => {
    const task: Task = {
      id: 'task-review',
      runId: 'run-1',
      title: 'Fix edge condition',
      objective: 'Obj',
      state: 'WAITING_APPROVAL',
      dependencies: [],
      acceptanceCriteria: [],
      requiresApproval: true,
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:01:00Z',
    }

    const items = deriveInboxItems({
      runs: [],
      tasks: [task],
      taskDetail: null,
      events: [],
    })

    expect(items).toHaveLength(1)
    expect(items[0]!.severity).toBe('ACTION_REQUIRED')
    expect(items[0]!.actionType).toBe('APPROVE')
    expect(items[0]!.taskId).toBe('task-review')
    expect(shouldTriggerNotification(items[0]!)).toBe(true)
  })

  it('surfaces FAILED task as CRITICAL item', () => {
    const task: Task = {
      id: 'task-fail',
      runId: 'run-1',
      title: 'Crash task',
      objective: 'Obj',
      state: 'FAILED',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:01:00Z',
    }

    const items = deriveInboxItems({
      runs: [],
      tasks: [task],
      taskDetail: null,
      events: [],
    })

    expect(items).toHaveLength(1)
    expect(items[0]!.severity).toBe('CRITICAL')
    expect(items[0]!.actionType).toBe('INSPECT_FAILURE')
    expect(shouldTriggerNotification(items[0]!)).toBe(true)
  })

  it('surfaces unauthorized HEAD mutation as CRITICAL item', () => {
    const task: Task = {
      id: 'task-rogue',
      runId: 'run-1',
      title: 'Rogue commit',
      objective: 'Obj',
      state: 'RUNNING',
      dependencies: [],
      acceptanceCriteria: [],
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:01:00Z',
    }

    const taskDetail: TaskDetailResponse = {
      task,
      evidenceAvailable: false,
      mutationSummary: {
        allowedChanges: [],
        unexpectedChanges: [],
        headMutated: true,
        isScopeCompliant: false,
      },
    }

    const items = deriveInboxItems({
      runs: [],
      tasks: [task],
      taskDetail,
      events: [],
    })

    expect(items.some((i) => i.severity === 'CRITICAL' && i.title.includes('HEAD Mutation'))).toBe(true)
  })

  it('policy suppresses FYI notifications from triggering OS alerts', () => {
    const fyiItem = {
      id: 'fyi-1',
      severity: 'FYI' as const,
      title: 'Run complete',
      summary: 'All done',
      runId: 'run-1',
      timestamp: '2026-09-20T00:00:00Z',
    }

    expect(shouldTriggerNotification(fyiItem)).toBe(false)
  })
})
