/**
 * Provider-Neutral Notification Boundary for Gravitas.
 *
 * Architecture:
 * Gravitas Event
 *   ↓
 * Notification Policy (severity & message derivation)
 *   ↓
 * GravitasNotification
 *   ↓
 * NotificationAdapter (Console, In-App, Browser, future Discord/Telegram/Email/Push)
 *
 * Invariants:
 * 1. Zero external paid API dependencies.
 * 2. Notification routing never blocks orchestration loops.
 * 3. Notification policy filters out noisy scheduler micro-transitions.
 */

import type { GravitasEvent, GravitasEventType } from './types.js'

export type NotificationSeverity = 'ACTION_REQUIRED' | 'CRITICAL' | 'IMPORTANT' | 'FYI'

export interface GravitasNotification {
  readonly id: string
  readonly runId: string
  readonly taskId?: string | undefined
  readonly severity: NotificationSeverity
  readonly title: string
  readonly message: string
  readonly sourceEventType: GravitasEventType
  readonly timestamp: string
  readonly actionUrl?: string | undefined
  readonly metadata?: Readonly<Record<string, unknown>> | undefined
}

/**
 * Provider-neutral adapter interface for external notifications.
 * Implemented by future Discord, Telegram, Webhook, Mobile Push, or Email adapters.
 */
export interface NotificationAdapter {
  readonly id: string
  readonly name: string
  readonly enabled: boolean
  send(notification: GravitasNotification): Promise<void>
}

/**
 * Derives a human-attention notification from an authoritative Gravitas event.
 * Filters out low-level noise and maps to deterministic priority tiers.
 */
export function deriveNotificationFromEvent(event: GravitasEvent): GravitasNotification | null {
  const now = event.timestamp || new Date().toISOString()
  const runId = event.runId
  const taskId = event.taskId

  switch (event.type) {
    case 'APPROVAL_REQUIRED': {
      return {
        id: `notif_${event.eventId}`,
        runId,
        taskId,
        severity: 'ACTION_REQUIRED',
        title: `Human Review Required: Task ${taskId ?? 'Unknown'}`,
        message: 'Independent verification passed all criteria. Code mutation requires operator review and approval.',
        sourceEventType: event.type,
        timestamp: now,
      }
    }

    case 'TASK_COMPOSITION_CONFLICT': {
      const p = event.payload as { parentCommitShas?: string[]; conflictDetails?: string }
      return {
        id: `notif_${event.eventId}`,
        runId,
        taskId,
        severity: 'CRITICAL',
        title: `Composition Blocked: Task ${taskId ?? 'Unknown'}`,
        message: `Upstream tasks passed independently, but their verified changes conflict when composed: ${p.conflictDetails ?? 'Git cherry-pick conflict'}.`,
        sourceEventType: event.type,
        timestamp: now,
        metadata: { parentCommitShas: p.parentCommitShas },
      }
    }

    case 'RUN_FAILED': {
      const p = event.payload as { reason?: string }
      return {
        id: `notif_${event.eventId}`,
        runId,
        severity: 'CRITICAL',
        title: `Run Execution Failed: ${runId}`,
        message: p.reason ? `Run failed: ${p.reason}` : 'One or more tasks encountered a fatal failure or policy rejection.',
        sourceEventType: event.type,
        timestamp: now,
      }
    }

    case 'TASK_STATE_CHANGED': {
      const p = event.payload as { fromState: string; toState: string; reason?: string }
      if (p.toState === 'WAITING_APPROVAL') {
        return {
          id: `notif_${event.eventId}`,
          runId,
          taskId,
          severity: 'ACTION_REQUIRED',
          title: `Action Required: Task ${taskId ?? 'Unknown'}`,
          message: p.reason ?? 'Task requires explicit human approval to materialize result commit.',
          sourceEventType: event.type,
          timestamp: now,
        }
      }
      if (p.toState === 'FAILED') {
        return {
          id: `notif_${event.eventId}`,
          runId,
          taskId,
          severity: 'CRITICAL',
          title: `Task Failed: Task ${taskId ?? 'Unknown'}`,
          message: p.reason ?? 'Task verification failed or scope violation detected.',
          sourceEventType: event.type,
          timestamp: now,
        }
      }
      if (p.toState === 'CANCELLED') {
        return {
          id: `notif_${event.eventId}`,
          runId,
          taskId,
          severity: 'IMPORTANT',
          title: `Task Cancelled: Task ${taskId ?? 'Unknown'}`,
          message: p.reason ?? 'Task was cancelled due to upstream dependency failure.',
          sourceEventType: event.type,
          timestamp: now,
        }
      }
      return null
    }

    case 'RUN_COMPLETED': {
      return {
        id: `notif_${event.eventId}`,
        runId,
        severity: 'IMPORTANT',
        title: `Run Completed: ${runId}`,
        message: 'All tasks in the orchestration plan have completed and materialized successfully.',
        sourceEventType: event.type,
        timestamp: now,
      }
    }

    case 'TASK_APPROVED': {
      const p = event.payload as { reviewer?: string; commitSha?: string }
      return {
        id: `notif_${event.eventId}`,
        runId,
        taskId,
        severity: 'IMPORTANT',
        title: `Task Approved: Task ${taskId ?? 'Unknown'}`,
        message: `Task approved by ${p.reviewer ?? 'operator'}. Result commit materialized.`,
        sourceEventType: event.type,
        timestamp: now,
        metadata: { commitSha: p.commitSha },
      }
    }

    case 'TASK_RESULT_MATERIALIZED': {
      const p = event.payload as { commitSha: string }
      return {
        id: `notif_${event.eventId}`,
        runId,
        taskId,
        severity: 'FYI',
        title: `Result Materialized: Task ${taskId ?? 'Unknown'}`,
        message: `Verified result commit created: ${p.commitSha.slice(0, 7)}.`,
        sourceEventType: event.type,
        timestamp: now,
        metadata: { commitSha: p.commitSha },
      }
    }

    default:
      return null
  }
}
