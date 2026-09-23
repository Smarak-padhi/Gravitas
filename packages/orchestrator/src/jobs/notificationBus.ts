/**
 * Gravitas Personal OS Background Execution Kernel — Notification Bus
 *
 * Wave 12I Architectural Specification
 *
 * Implements:
 * 1. Deterministic notification creation and persistence.
 * 2. Sliding window deduplication by dedupeKey.
 * 3. Timezone-aware Quiet Hours evaluation (supporting overnight spans e.g. 23:00 - 07:00).
 * 4. Separate delivery states: PENDING, DEFERRED, DELIVERED, SUPPRESSED.
 * 5. ACTION_REQUIRED / CRITICAL quiet-hours bypass policy.
 */

import type {
  Clock,
  PersonalOsNotification,
  NotificationDeliveryState,
  NotificationSeverity,
  QuietHoursWindow,
} from '@gravitas/core'
import type { JobStore, NotificationFilter } from './jobStore.js'

export const DEDUPE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

export interface PublishNotificationParams {
  readonly id?: string | undefined
  readonly severity: NotificationSeverity
  readonly title: string
  readonly body: string
  readonly source: {
    readonly type: 'JOB' | 'SYSTEM' | 'OPERATOR'
    readonly id?: string | undefined
    readonly runId?: string | undefined
  }
  readonly jobId?: string | undefined
  readonly runId?: string | undefined
  readonly deliveryPolicy?: 'IMMEDIATE' | 'DIGEST' | 'SILENT' | 'QUIET_HOURS_AWARE' | undefined
  readonly quietHours?: QuietHoursWindow | undefined
  readonly dedupeKey?: string | undefined
}

export class NotificationBus {
  private readonly store: JobStore
  private readonly clock: Clock

  public constructor(store: JobStore, clock: Clock) {
    this.store = store
    this.clock = clock
  }

  public async publish(params: PublishNotificationParams): Promise<PersonalOsNotification> {
    const now = this.clock.now()
    const nowIso = now.toISOString()
    const deliveryPolicy = params.deliveryPolicy ?? 'IMMEDIATE'
    const dedupeKey = params.dedupeKey ?? `${params.source.type}:${params.jobId ?? 'global'}:${params.title}`

    // 1. Deduplication Check
    const sinceIso = new Date(now.getTime() - DEDUPE_WINDOW_MS).toISOString()
    const existing = this.store.findNotificationByDedupeKey(dedupeKey, sinceIso)
    if (existing) {
      return existing
    }

    // 2. Delivery State & Quiet Hours Evaluation
    let deliveryState: NotificationDeliveryState = 'DELIVERED'
    let deliverAfter: string | undefined = undefined

    if (deliveryPolicy === 'SILENT') {
      deliveryState = 'SUPPRESSED'
    } else if (deliveryPolicy === 'QUIET_HOURS_AWARE' && params.quietHours) {
      const qh = params.quietHours
      const isQuietTime = this.isTimeWithinQuietHours(now, qh)

      if (isQuietTime) {
        const canBypass =
          qh.bypassOnActionRequired &&
          (params.severity === 'ACTION_REQUIRED' || params.severity === 'CRITICAL')

        if (canBypass) {
          deliveryState = 'DELIVERED'
        } else {
          deliveryState = 'DEFERRED'
          deliverAfter = this.calculateQuietHoursEndTime(now, qh)
        }
      } else {
        deliveryState = 'DELIVERED'
      }
    }

    const notification: PersonalOsNotification = {
      id: params.id ?? `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      severity: params.severity,
      title: params.title,
      body: params.body,
      source: params.source,
      jobId: params.jobId,
      runId: params.runId,
      createdAt: nowIso,
      readAt: undefined,
      deliveryPolicy,
      deliveryState,
      deliverAfter,
      dedupeKey,
    }

    this.store.saveNotification(notification)
    return notification
  }

  public listNotifications(filter?: NotificationFilter): PersonalOsNotification[] {
    return this.store.listNotifications(filter)
  }

  public getNotification(id: string): PersonalOsNotification | null {
    return this.store.getNotification(id)
  }

  public markRead(id: string): void {
    const nowIso = this.clock.now().toISOString()
    this.store.markNotificationRead(id, nowIso)
  }

  public markAllRead(): number {
    const nowIso = this.clock.now().toISOString()
    return this.store.markAllNotificationsRead(nowIso)
  }

  // ==========================================================================
  // Quiet Hours Math (Timezone-Aware)
  // ==========================================================================

  public isTimeWithinQuietHours(date: Date, qh: QuietHoursWindow): boolean {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: qh.timezone,
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    })

    const parts = dtf.formatToParts(date)
    let currentHour = 0
    let currentMinute = 0
    for (const p of parts) {
      if (p.type === 'hour') currentHour = parseInt(p.value, 10)
      if (p.type === 'minute') currentMinute = parseInt(p.value, 10)
    }

    const currentMinutes = currentHour * 60 + currentMinute

    const [startH = 0, startM = 0] = qh.start.split(':').map((s) => parseInt(s, 10))
    const [endH = 0, endM = 0] = qh.end.split(':').map((s) => parseInt(s, 10))

    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (startMinutes > endMinutes) {
      // Overnight span (e.g. 23:00 to 07:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    } else {
      // Daytime span (e.g. 13:00 to 14:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes
    }
  }

  public calculateQuietHoursEndTime(date: Date, qh: QuietHoursWindow): string {
    // Computes next occurrence when local time reaches qh.end
    const candidate = new Date(date.getTime())

    // Advance minute by minute until outside quiet hours
    let count = 0
    while (this.isTimeWithinQuietHours(candidate, qh) && count < 1440) {
      candidate.setUTCMinutes(candidate.getUTCMinutes() + 1)
      count++
    }

    return candidate.toISOString()
  }
}
