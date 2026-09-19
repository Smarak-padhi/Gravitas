/**
 * Provider-Neutral Notification Policy
 * Filters engine events and inbox items to prevent operator alert fatigue.
 * Pure rules engine.
 */

import type { InboxItem, InboxSeverity } from './inboxDerivation.js'

export interface NotificationPolicyConfig {
  readonly allowedSeverities: readonly InboxSeverity[]
  readonly notifyOnApprovalRequired: boolean
  readonly notifyOnCriticalViolation: boolean
  readonly notifyOnFailure: boolean
  readonly notifyOnCompletion: boolean
}

export const DEFAULT_NOTIFICATION_POLICY: NotificationPolicyConfig = {
  allowedSeverities: ['CRITICAL', 'ACTION_REQUIRED'],
  notifyOnApprovalRequired: true,
  notifyOnCriticalViolation: true,
  notifyOnFailure: true,
  notifyOnCompletion: false, // In-app only by default; zero OS spam
}

/**
 * Determines whether an inbox item should trigger an external/OS alert under the policy.
 */
export function shouldTriggerNotification(
  item: InboxItem,
  policy: NotificationPolicyConfig = DEFAULT_NOTIFICATION_POLICY
): boolean {
  if (!policy.allowedSeverities.includes(item.severity)) {
    return false
  }

  if (item.severity === 'ACTION_REQUIRED' && policy.notifyOnApprovalRequired) {
    return true
  }

  if (item.severity === 'CRITICAL' && (policy.notifyOnCriticalViolation || policy.notifyOnFailure)) {
    return true
  }

  return false
}
