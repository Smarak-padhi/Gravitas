import { describe, expect, it } from 'vitest'
import type { GravitasEvent } from '../../api/types.js'
import { deriveTimelineItems, formatEventToMilestone } from './timelineDerivation.js'

describe('Activity Timeline Derivation Invariants (timelineDerivation.test.ts)', () => {
  it('formats RUN_CREATED event with goal and contract ID', () => {
    const event: GravitasEvent = {
      eventId: 'evt_1',
      runId: 'run_1',
      type: 'RUN_CREATED',
      timestamp: '2026-09-20T00:00:00Z',
      payload: {
        goal: 'Implement math add',
        contractId: 'contract_1',
      },
    }

    const item = formatEventToMilestone(event)
    expect(item.title).toContain('Run Initialized')
    expect(item.description).toContain('Implement math add')
    expect(item.badgeVariant).toBe('ready')
  })

  it('formats VERIFICATION_FINISHED with PASSED correctly', () => {
    const event: GravitasEvent = {
      eventId: 'evt_2',
      runId: 'run_1',
      taskId: 'task_1',
      type: 'VERIFICATION_FINISHED',
      timestamp: '2026-09-20T00:01:00Z',
      payload: {
        status: 'PASSED',
      },
    }

    const item = formatEventToMilestone(event)
    expect(item.title).toContain('Verification Passed')
    expect(item.badgeVariant).toBe('success')
  })

  it('formats APPROVAL_REQUIRED as NEEDS_YOU waiting state', () => {
    const event: GravitasEvent = {
      eventId: 'evt_3',
      runId: 'run_1',
      taskId: 'task_1',
      type: 'APPROVAL_REQUIRED',
      timestamp: '2026-09-20T00:02:00Z',
      payload: {},
    }

    const item = formatEventToMilestone(event)
    expect(item.title).toContain('Human Approval Gate')
    expect(item.badgeVariant).toBe('waiting')
  })

  it('derives timeline items preserving full rawEvent metadata', () => {
    const rawEvents: GravitasEvent[] = [
      {
        eventId: 'e1',
        runId: 'r1',
        type: 'WORKER_STARTED',
        timestamp: '2026-09-20T00:00:00Z',
        payload: { harness: 'claude-code' },
      },
    ]

    const timeline = deriveTimelineItems(rawEvents)
    expect(timeline).toHaveLength(1)
    expect(timeline[0]!.rawEvent).toBe(rawEvents[0])
    expect(timeline[0]!.title).toContain('Worker Dispatched')
  })

  it('formats Wave 8 multi-task events (RUN_PLAN_CREATED, TASK_SCHEDULED, RESULT_MATERIALIZED)', () => {
    const planEvent: GravitasEvent = {
      eventId: 'evt_plan',
      runId: 'run_1',
      type: 'RUN_PLAN_CREATED',
      timestamp: '2026-09-20T00:00:00Z',
      payload: { taskCount: 3, maxConcurrency: 2, initialReadyCount: 1 },
    }
    const planItem = formatEventToMilestone(planEvent)
    expect(planItem.title).toContain('3 Tasks')
    expect(planItem.title).toContain('Concurrency: 2')
    expect(planItem.badgeText).toBe('PLAN_CREATED')

    const schedEvent: GravitasEvent = {
      eventId: 'evt_sched',
      runId: 'run_1',
      taskId: 't-1',
      type: 'TASK_SCHEDULED',
      timestamp: '2026-09-20T00:01:00Z',
      payload: { slot: 2 },
    }
    const schedItem = formatEventToMilestone(schedEvent)
    expect(schedItem.badgeText).toBe('SLOT_2')
    expect(schedItem.title).toContain('Task Scheduled [t-1]')

    const matEvent: GravitasEvent = {
      eventId: 'evt_mat',
      runId: 'run_1',
      taskId: 't-1',
      type: 'TASK_RESULT_MATERIALIZED',
      timestamp: '2026-09-20T00:02:00Z',
      payload: { commitSha: 'a1b2c3d4e5f6' },
    }
    const matItem = formatEventToMilestone(matEvent)
    expect(matItem.badgeText).toBe('COMMITTED')
    expect(matItem.description).toContain('a1b2c3d4')
  })
})
