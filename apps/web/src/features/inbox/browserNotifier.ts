/**
 * Browser Notification Adapter
 * Provider-neutral adapter boundary for desktop OS notifications.
 * Strictly adheres to explicit user action:
 * - Permission requested ONLY on explicit user trigger.
 * - NEVER requested automatically on page load.
 * - Adheres strictly to NotificationPolicy.
 */

import type { InboxItem } from './inboxDerivation.js'
import { shouldTriggerNotification } from './notificationPolicy.js'

export interface NotificationAdapter {
  readonly isSupported: () => boolean
  readonly getPermission: () => NotificationPermission | 'unsupported'
  readonly requestPermission: () => Promise<boolean>
  readonly send: (item: InboxItem) => boolean
}

export class BrowserNotificationAdapter implements NotificationAdapter {
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  public getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported'
    return Notification.permission
  }

  /**
   * Explicit operator consent action.
   */
  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false
    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch {
      return false
    }
  }

  /**
   * Dispatches desktop notification if policy permits and permission is granted.
   */
  public send(item: InboxItem): boolean {
    if (!this.isSupported()) return false
    if (Notification.permission !== 'granted') return false
    if (!shouldTriggerNotification(item)) return false

    try {
      new Notification(`[Gravitas] ${item.title}`, {
        body: item.summary,
        tag: item.id, // Deduplicate native notifications
      })
      return true
    } catch {
      return false
    }
  }
}

export const browserNotifier = new BrowserNotificationAdapter()
