/**
 * Deterministic Timeline Derivation
 * Converts raw GravitasEvent instances into clear, operational human milestones.
 * Preserves the underlying raw payload for 100% forensic transparency.
 */

import type { GravitasEvent } from '../../api/types.js'
import type { BadgeVariant } from '../../design-system/components/Badge.js'

export interface TimelineItem {
  readonly id: string
  readonly eventId: string
  readonly eventType: string
  readonly timestamp: string
  readonly title: string
  readonly description: string
  readonly badgeText: string
  readonly badgeVariant: BadgeVariant
  readonly runId: string
  readonly taskId?: string | undefined
  readonly rawEvent: GravitasEvent
}

export function formatEventToMilestone(event: GravitasEvent): {
  title: string
  description: string
  badgeText: string
  badgeVariant: BadgeVariant
} {
  const p = event.payload as Record<string, any>

  switch (event.type) {
    case 'RUN_CREATED':
      return {
        title: `Run Initialized`,
        description: `Goal: "${p.goal ?? 'No goal specified'}" (Contract: ${p.contractId ?? 'N/A'})`,
        badgeText: 'RUN_CREATED',
        badgeVariant: 'ready',
      }

    case 'TASK_CREATED':
      return {
        title: `Task Declared: ${p.title ?? event.taskId ?? 'Task'}`,
        description: p.objective ?? 'No objective specified',
        badgeText: 'TASK_CREATED',
        badgeVariant: 'ready',
      }

    case 'WORKER_STARTED':
      return {
        title: `Worker Dispatched [${event.taskId ?? 'Task'}]`,
        description: `Agent harness initiated worktree mutation execution`,
        badgeText: 'WORKING',
        badgeVariant: 'running',
      }

    case 'WORKER_FINISHED':
      return {
        title: `Worker Completed Execution [${event.taskId ?? 'Task'}]`,
        description: `Agent harness concluded execution with status ${p.terminationReason ?? 'COMPLETED'}`,
        badgeText: 'WORKER_DONE',
        badgeVariant: 'running',
      }

    case 'VERIFICATION_STARTED':
      return {
        title: `Independent Verifier Started [${event.taskId ?? 'Task'}]`,
        description: `Shell-free verification runner executing mandatory test commands`,
        badgeText: 'VERIFYING',
        badgeVariant: 'verifying',
      }

    case 'VERIFICATION_FINISHED': {
      const isPassed = p.status === 'PASSED'
      return {
        title: `Verification ${isPassed ? 'Passed' : 'Failed'} [${event.taskId ?? 'Task'}]`,
        description: isPassed
          ? 'All mandatory test commands passed. No unexpected mutations detected.'
          : 'Verification commands failed or out-of-scope mutation was detected.',
        badgeText: isPassed ? 'VERIFY_PASS' : 'VERIFY_FAIL',
        badgeVariant: isPassed ? 'success' : 'failure',
      }
    }

    case 'APPROVAL_REQUIRED':
      return {
        title: `Human Approval Gate Activated [${event.taskId ?? 'Task'}]`,
        description: `Task passed independent verification. Operator review required before merge.`,
        badgeText: 'NEEDS_YOU',
        badgeVariant: 'waiting',
      }

    case 'TASK_APPROVED':
      return {
        title: `Task Approved by Operator [${event.taskId ?? 'Task'}]`,
        description: `Human review completed. Worktree changes approved.`,
        badgeText: 'APPROVED',
        badgeVariant: 'success',
      }

    case 'TASK_REJECTED':
      return {
        title: `Task Rejected by Operator [${event.taskId ?? 'Task'}]`,
        description: `Rejection reason: "${p.reason ?? 'Operator rejection'}"`,
        badgeText: 'REJECTED',
        badgeVariant: 'failure',
      }

    case 'TASK_STATE_CHANGED':
      return {
        title: `Task State: ${p.fromState} → ${p.toState}`,
        description: p.reason ? `Reason: ${p.reason}` : `Transitioned to ${p.toState}`,
        badgeText: p.toState,
        badgeVariant: p.toState === 'FAILED' ? 'failure' : p.toState === 'SUCCEEDED' || p.toState === 'APPROVED' ? 'success' : 'neutral',
      }

    case 'RUN_COMPLETED':
      return {
        title: `Run Succeeded`,
        description: `All tasks successfully executed, verified, and approved.`,
        badgeText: 'COMPLETED',
        badgeVariant: 'success',
      }

    case 'RUN_FAILED':
      return {
        title: `Run Failed`,
        description: `Run terminated due to task execution or verification failure.`,
        badgeText: 'FAILED',
        badgeVariant: 'failure',
      }

    default:
      return {
        title: event.type.replace(/_/g, ' '),
        description: JSON.stringify(event.payload),
        badgeText: event.type,
        badgeVariant: 'neutral',
      }
  }
}

/**
 * Derives sorted, human-readable timeline items from raw events.
 */
export function deriveTimelineItems(events: readonly GravitasEvent[]): readonly TimelineItem[] {
  return events.map((event) => {
    const formatted = formatEventToMilestone(event)
    return {
      id: `timeline_${event.eventId}`,
      eventId: event.eventId,
      eventType: event.type,
      timestamp: event.timestamp,
      title: formatted.title,
      description: formatted.description,
      badgeText: formatted.badgeText,
      badgeVariant: formatted.badgeVariant,
      runId: event.runId,
      taskId: event.taskId,
      rawEvent: event,
    }
  })
}
