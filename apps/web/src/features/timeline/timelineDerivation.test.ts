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
})
