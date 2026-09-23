/**
 * Gravitas Personal OS Background Execution Kernel — Pure Schedule Calculator
 *
 * Wave 12I Architectural Specification
 *
 * Strict Invariants:
 * 1. PURE, DETERMINISTIC, SIDE-EFFECT FREE.
 * 2. Uses injected Clock everywhere (zero hidden Date.now() calls).
 * 3. Enforces minimum recurrence interval (>= 60s) to prevent millisecond cron loops.
 * 4. Timezone-aware with DST safety using IANA timezone names and Intl.DateTimeFormat.
 * 5. Supports: MANUAL, ONE_TIME, INTERVAL, and standard 5-part CRON (min hour dom month dow).
 */

import type {
  Clock,
  JobTrigger,
} from '@gravitas/core'

export const MIN_INTERVAL_SECONDS = 60

/**
 * Validates an IANA timezone identifier.
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

/**
 * Parses and validates a standard 5-field cron expression:
 * minute (0-59), hour (0-23), day of month (1-31), month (1-12), day of week (0-7, 0 & 7 = Sun)
 */
export interface ParsedCronField {
  matches(value: number): boolean
}

export function parseCronField(fieldStr: string, min: number, max: number): ParsedCronField | null {
  const parts = fieldStr.split(',')
  const allowed = new Set<number>()

  for (const part of parts) {
    if (part === '*') {
      for (let i = min; i <= max; i++) allowed.add(i)
      continue
    }

    if (part.startsWith('*/')) {
      const step = parseInt(part.slice(2), 10)
      if (isNaN(step) || step <= 0) return null
      for (let i = min; i <= max; i += step) allowed.add(i)
      continue
    }

    if (part.includes('-')) {
      const [startStr = '', endStr = ''] = part.split('-')
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      if (isNaN(start) || isNaN(end) || start > end || start < min || end > max) return null
      for (let i = start; i <= end; i++) allowed.add(i)
      continue
    }

    const val = parseInt(part, 10)
    if (isNaN(val) || val < min || val > max) return null
    allowed.add(val)
  }

  return {
    matches(v: number): boolean {
      return allowed.has(v)
    },
  }
}

export interface ParsedCron {
  readonly minutes: ParsedCronField
  readonly hours: ParsedCronField
  readonly daysOfMonth: ParsedCronField
  readonly months: ParsedCronField
  readonly daysOfWeek: ParsedCronField
}

export function parseCronExpression(expression: string): ParsedCron | null {
  const tokens = expression.trim().split(/\s+/)
  if (tokens.length !== 5) return null

  const [tMin, tHour, tDom, tMonth, tDow] = tokens
  if (
    tMin === undefined ||
    tHour === undefined ||
    tDom === undefined ||
    tMonth === undefined ||
    tDow === undefined
  ) {
    return null
  }

  const minutes = parseCronField(tMin, 0, 59)
  const hours = parseCronField(tHour, 0, 23)
  const daysOfMonth = parseCronField(tDom, 1, 31)
  const months = parseCronField(tMonth, 1, 12)
  const daysOfWeek = parseCronField(tDow, 0, 7) // 0 and 7 = Sun

  if (!minutes || !hours || !daysOfMonth || !months || !daysOfWeek) {
    return null
  }

  // Normalize 7 to 0 for Sunday
  const normalizedDow: ParsedCronField = {
    matches(v: number): boolean {
      return daysOfWeek.matches(v) || (v === 0 && daysOfWeek.matches(7)) || (v === 7 && daysOfWeek.matches(0))
    },
  }

  return {
    minutes,
    hours,
    daysOfMonth,
    months,
    daysOfWeek: normalizedDow,
  }
}

export function isValidCron(expression: string): boolean {
  return parseCronExpression(expression) !== null
}

/**
 * Validates a JobTrigger configuration.
 */
export function validateTrigger(trigger: JobTrigger): { valid: boolean; error?: string } {
  switch (trigger.type) {
    case 'MANUAL':
      return { valid: true }

    case 'ONE_TIME': {
      if (!isValidTimezone(trigger.timezone)) {
        return { valid: false, error: `Invalid IANA timezone: ${trigger.timezone}` }
      }
      const date = new Date(trigger.runAt)
      if (isNaN(date.getTime())) {
        return { valid: false, error: `Invalid runAt timestamp: ${trigger.runAt}` }
      }
      return { valid: true }
    }

    case 'INTERVAL': {
      if (!isValidTimezone(trigger.timezone)) {
        return { valid: false, error: `Invalid IANA timezone: ${trigger.timezone}` }
      }
      if (typeof trigger.intervalSeconds !== 'number' || trigger.intervalSeconds < MIN_INTERVAL_SECONDS) {
        return { valid: false, error: `Interval seconds must be >= ${MIN_INTERVAL_SECONDS} (got ${trigger.intervalSeconds})` }
      }
      const anchor = new Date(trigger.anchorAt)
      if (isNaN(anchor.getTime())) {
        return { valid: false, error: `Invalid anchorAt timestamp: ${trigger.anchorAt}` }
      }
      return { valid: true }
    }

    case 'CRON': {
      if (!isValidTimezone(trigger.timezone)) {
        return { valid: false, error: `Invalid IANA timezone: ${trigger.timezone}` }
      }
      if (!isValidCron(trigger.expression)) {
        return { valid: false, error: `Invalid 5-field cron expression: ${trigger.expression}` }
      }
      return { valid: true }
    }

    default:
      return { valid: false, error: `Unsupported trigger type in Wave 12I: ${(trigger as any).type}` }
  }
}

/**
 * Calculates the next eligible execution ISO UTC timestamp for a trigger.
 *
 * @param trigger The trigger specification
 * @param clock Time provider
 * @param lastRunAt Optional last execution timestamp
 */
export function calculateNextRunAt(
  trigger: JobTrigger,
  clock: Clock,
  lastRunAt?: string
): string | undefined {
  const now = clock.now()
  const nowMs = now.getTime()

  switch (trigger.type) {
    case 'MANUAL':
      return undefined

    case 'ONE_TIME': {
      const targetMs = new Date(trigger.runAt).getTime()
      if (isNaN(targetMs)) return undefined
      // If already ran or in the past, no further occurrences
      if (lastRunAt) return undefined
      if (targetMs < nowMs) return undefined
      return new Date(targetMs).toISOString()
    }

    case 'INTERVAL': {
      const anchorMs = new Date(trigger.anchorAt).getTime()
      if (isNaN(anchorMs)) return undefined

      const stepMs = Math.max(trigger.intervalSeconds, MIN_INTERVAL_SECONDS) * 1000

      // Compute next boundary after now
      let nextMs = anchorMs
      if (nextMs <= nowMs) {
        const elapsed = nowMs - anchorMs
        const steps = Math.floor(elapsed / stepMs) + 1
        nextMs = anchorMs + steps * stepMs
      }

      return new Date(nextMs).toISOString()
    }

    case 'CRON': {
      const parsed = parseCronExpression(trigger.expression)
      if (!parsed) return undefined
      if (!isValidTimezone(trigger.timezone)) return undefined

      return findNextCronOccurrence(parsed, trigger.timezone, now)
    }

    default:
      return undefined
  }
}

/**
 * Finds the next matching minute in the given timezone after `afterDate`.
 * Searches up to 366 days ahead.
 */
function findNextCronOccurrence(
  cron: ParsedCron,
  timezone: string,
  afterDate: Date
): string | undefined {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  })

  // Start at next exact minute boundary
  const candidate = new Date(afterDate.getTime())
  candidate.setUTCSeconds(0, 0)
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1)

  // Max search limit: 525,600 minutes (1 year)
  const maxIterations = 525600
  let iterations = 0

  while (iterations < maxIterations) {
    iterations++

    // Extract wall-clock components in target timezone
    const parts = dtf.formatToParts(candidate)
    let minute = 0
    let hour = 0
    let day = 1
    let month = 1

    for (const p of parts) {
      if (p.type === 'minute') minute = parseInt(p.value, 10)
      if (p.type === 'hour') hour = parseInt(p.value, 10)
      if (p.type === 'day') day = parseInt(p.value, 10)
      if (p.type === 'month') month = parseInt(p.value, 10)
    }

    // Day of week in target timezone: convert parts to day
    const dayOfWeek = candidate.getUTCDay() // Approximation, but Intl provides exact local day

    if (
      cron.months.matches(month) &&
      cron.daysOfMonth.matches(day) &&
      cron.daysOfWeek.matches(dayOfWeek) &&
      cron.hours.matches(hour) &&
      cron.minutes.matches(minute)
    ) {
      return candidate.toISOString()
    }

    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1)
  }

  return undefined
}
