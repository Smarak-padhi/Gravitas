/**
 * Gravitas Orchestrator — Deterministic Mock Calendar Provider
 *
 * Wave 12J Architectural Specification
 *
 * Implements:
 * 1. Deterministic calendar list and events queries.
 * 2. Multi-timezone, all-day, and single-event pagination.
 * 3. Programmable fault injection (401, 403, 429, 500, timeout, token expired).
 * 4. Strictly normalized contracts conforming to @gravitas/core calendar definitions.
 */

import {
  ConnectorError,
  type CalendarEventSummary,
  type CalendarEventsPage,
  type CalendarEventsQuery,
  type CalendarSummary,
  type ConnectorAccount,
  type ConnectorCapability,
  type ConnectorDescriptor,
  type ConnectorExecutionRequest,
  type ConnectorExecutionResult,
  type ConnectorId,
  type ConnectorProviderId,
  type ConnectorStatus,
} from '@gravitas/core'
import type { ConnectorAdapter, ResolvedCredentials } from '../types.js'

export interface MockFaultConfig {
  forceStatus?: number | undefined // e.g. 401, 403, 429, 500
  forceError?: string | undefined
  delayMs?: number | undefined
  tokenExpired?: boolean | undefined
  retryAfterMs?: number | undefined
}

export class MockCalendarProvider implements ConnectorAdapter {
  public readonly id: ConnectorId = 'calendar-mock'
  public readonly provider: ConnectorProviderId = 'mock-calendar'
  public readonly displayName = 'Deterministic Calendar Mock'
  public readonly version = '1.0.0'

  private faultConfig: MockFaultConfig = {}
  private calendars: CalendarSummary[] = [
    {
      id: 'primary',
      name: 'Primary Work Calendar',
      primary: true,
      timezone: 'UTC',
      accessRole: 'owner',
    },
    {
      id: 'personal',
      name: 'Personal Calendar',
      primary: false,
      timezone: 'America/New_York',
      accessRole: 'owner',
    },
  ]

  private events: CalendarEventSummary[] = [
    {
      id: 'evt-1',
      calendarId: 'primary',
      title: 'Executive Sync & Architecture Review',
      start: '2026-09-24T09:00:00Z',
      end: '2026-09-24T10:00:00Z',
      allDay: false,
      timezone: 'UTC',
      location: 'HQ War Room / Meet',
      organizer: 'operator@gravitas.internal',
      attendeeCount: 4,
      status: 'confirmed',
      updatedAt: '2026-09-23T12:00:00Z',
    },
    {
      id: 'evt-2',
      calendarId: 'primary',
      title: 'Personal OS Autonomous Core Standup',
      start: '2026-09-24T10:30:00Z',
      end: '2026-09-24T11:00:00Z',
      allDay: false,
      timezone: 'UTC',
      location: 'Virtual',
      organizer: 'lead@gravitas.internal',
      attendeeCount: 6,
      status: 'confirmed',
      updatedAt: '2026-09-23T14:00:00Z',
    },
    {
      id: 'evt-3',
      calendarId: 'primary',
      title: 'Focus Block: Connector Hardening',
      start: '2026-09-24T13:00:00Z',
      end: '2026-09-24T15:00:00Z',
      allDay: false,
      timezone: 'UTC',
      status: 'confirmed',
      updatedAt: '2026-09-24T08:00:00Z',
    },
    {
      id: 'evt-4',
      calendarId: 'primary',
      title: 'Quarterly Planning All-Hands',
      start: '2026-09-25',
      end: '2026-09-26',
      allDay: true,
      timezone: 'UTC',
      location: 'Main Auditorium',
      organizer: 'executive@gravitas.internal',
      attendeeCount: 150,
      status: 'confirmed',
      updatedAt: '2026-09-20T00:00:00Z',
    },
    {
      id: 'evt-5',
      calendarId: 'personal',
      title: 'Annual Physical & Health Check',
      start: '2026-09-24T18:00:00Z',
      end: '2026-09-24T19:00:00Z',
      allDay: false,
      timezone: 'America/New_York',
      location: 'Medical Center',
      status: 'confirmed',
      updatedAt: '2026-09-21T10:00:00Z',
    },
  ]

  public readonly capabilities: readonly ConnectorCapability[] = [
    {
      id: 'calendar.calendars.read',
      connectorId: 'calendar-mock',
      domain: 'PERSONAL',
      authority: 'READ',
      contextDomains: ['PERSONAL', 'BUSINESS', 'PROJECT'],
      supportsDryRun: true,
      requiresApproval: false,
      readyInWave: '12J',
    },
    {
      id: 'calendar.events.read',
      connectorId: 'calendar-mock',
      domain: 'PERSONAL',
      authority: 'READ',
      contextDomains: ['PERSONAL', 'BUSINESS', 'PROJECT'],
      supportsDryRun: true,
      requiresApproval: false,
      readyInWave: '12J',
    },
    {
      id: 'calendar.event.read',
      connectorId: 'calendar-mock',
      domain: 'PERSONAL',
      authority: 'READ',
      contextDomains: ['PERSONAL', 'BUSINESS', 'PROJECT'],
      supportsDryRun: true,
      requiresApproval: false,
      readyInWave: '12J',
    },
    {
      id: 'calendar.event.create',
      connectorId: 'calendar-mock',
      domain: 'PERSONAL',
      authority: 'SAFE_WRITE',
      contextDomains: ['PERSONAL', 'BUSINESS', 'PROJECT'],
      supportsDryRun: true,
      requiresApproval: true,
      readyInWave: 'FUTURE',
    },
  ]

  public setFaultConfig(config: MockFaultConfig): void {
    this.faultConfig = { ...config }
  }

  public resetFaultConfig(): void {
    this.faultConfig = {}
  }

  public getDescriptor(accounts: readonly ConnectorAccount[]): ConnectorDescriptor {
    let status: ConnectorStatus = 'UNCONFIGURED'
    if (accounts.length > 0) {
      const anyConnected = accounts.some((a) => a.status === 'CONNECTED')
      const anyError = accounts.some((a) => a.status === 'ERROR' || a.status === 'REAUTH_REQUIRED')
      if (anyConnected) {
        status = anyError ? 'DEGRADED' : 'CONNECTED'
      } else {
        status = accounts[0]?.status ?? 'UNCONFIGURED'
      }
    }

    return {
      id: this.id,
      provider: this.provider,
      displayName: this.displayName,
      version: this.version,
      status,
      capabilities: this.capabilities,
      accountIds: accounts.map((a) => a.id),
      lastHealthCheckAt: new Date().toISOString(),
    }
  }

  public async healthCheck(
    credentials?: ResolvedCredentials,
  ): Promise<{ healthy: boolean; status: ConnectorStatus; message?: string }> {
    if (this.faultConfig.forceStatus === 401 || this.faultConfig.tokenExpired) {
      return { healthy: false, status: 'REAUTH_REQUIRED', message: 'Mock credentials expired or unauthorized' }
    }
    if (this.faultConfig.forceStatus && this.faultConfig.forceStatus >= 500) {
      return { healthy: false, status: 'ERROR', message: `Mock downstream error ${this.faultConfig.forceStatus}` }
    }
    if (!credentials) {
      return { healthy: false, status: 'UNCONFIGURED', message: 'No credentials configured' }
    }
    return { healthy: true, status: 'CONNECTED' }
  }

  public async execute<TInput = unknown, TOutput = unknown>(
    request: ConnectorExecutionRequest<TInput>,
    credentials?: ResolvedCredentials,
  ): Promise<ConnectorExecutionResult<TOutput>> {
    if (this.faultConfig.delayMs && this.faultConfig.delayMs > 0) {
      await new Promise((r) => setTimeout(r, this.faultConfig.delayMs))
    }

    // Check fault injections
    if (this.faultConfig.tokenExpired || (credentials?.expiresAt && Date.now() >= credentials.expiresAt)) {
      throw new ConnectorError({
        code: 'REAUTH_REQUIRED',
        message: 'Mock token has expired',
        retryable: false,
        providerStatusCode: 401,
      })
    }

    if (this.faultConfig.forceStatus === 401) {
      throw new ConnectorError({
        code: 'AUTH_REQUIRED',
        message: 'Unauthorized access to mock calendar',
        retryable: false,
        providerStatusCode: 401,
      })
    }

    if (this.faultConfig.forceStatus === 403) {
      throw new ConnectorError({
        code: 'PERMISSION_DENIED',
        message: 'Forbidden access to requested calendar scope',
        retryable: false,
        providerStatusCode: 403,
      })
    }

    if (this.faultConfig.forceStatus === 429) {
      throw new ConnectorError({
        code: 'RATE_LIMITED',
        message: 'Mock rate limit exceeded',
        retryable: true,
        providerStatusCode: 429,
        retryAfterMs: this.faultConfig.retryAfterMs ?? 1000,
      })
    }

    if (this.faultConfig.forceStatus && this.faultConfig.forceStatus >= 500) {
      throw new ConnectorError({
        code: 'PROVIDER_ERROR',
        message: this.faultConfig.forceError ?? `Mock provider failure with HTTP ${this.faultConfig.forceStatus}`,
        retryable: true,
        providerStatusCode: this.faultConfig.forceStatus,
      })
    }

    const nowIso = new Date().toISOString()

    switch (request.capabilityId) {
      case 'calendar.calendars.read': {
        return {
          requestId: request.requestId,
          success: true,
          timestamp: nowIso,
          data: this.calendars as unknown as TOutput,
          recordsRead: this.calendars.length,
          recordsWritten: 0,
        }
      }

      case 'calendar.events.read': {
        const query = (request.input ?? {}) as CalendarEventsQuery
        const calId = query.calendarId ?? 'primary'
        let matched = this.events.filter((e) => e.calendarId === calId || (calId === 'primary' && e.calendarId === 'primary'))

        if (query.timeMin) {
          const tMin = new Date(query.timeMin).getTime()
          matched = matched.filter((e) => new Date(e.end).getTime() >= tMin)
        }
        if (query.timeMax) {
          const tMax = new Date(query.timeMax).getTime()
          matched = matched.filter((e) => new Date(e.start).getTime() <= tMax)
        }

        const maxResults = query.maxResults ?? 10
        let startIndex = 0
        if (query.pageToken) {
          const parsed = parseInt(query.pageToken, 10)
          if (!isNaN(parsed) && parsed >= 0) {
            startIndex = parsed
          }
        }

        const pagedEvents = matched.slice(startIndex, startIndex + maxResults)
        const nextIndex = startIndex + maxResults
        const nextPageToken = nextIndex < matched.length ? String(nextIndex) : undefined

        const resultPage: CalendarEventsPage = {
          events: pagedEvents,
          nextPageToken,
          timeZone: 'UTC',
        }

        return {
          requestId: request.requestId,
          success: true,
          timestamp: nowIso,
          data: resultPage as unknown as TOutput,
          recordsRead: pagedEvents.length,
          recordsWritten: 0,
        }
      }

      case 'calendar.event.read': {
        const { eventId, calendarId = 'primary' } = (request.input ?? {}) as { eventId?: string; calendarId?: string }
        if (!eventId) {
          throw new ConnectorError({
            code: 'INVALID_REQUEST',
            message: 'Missing eventId in input payload',
            retryable: false,
          })
        }
        const event = this.events.find((e) => e.id === eventId && e.calendarId === calendarId)
        if (!event) {
          throw new ConnectorError({
            code: 'NOT_FOUND',
            message: `Event ${eventId} not found in calendar ${calendarId}`,
            retryable: false,
            providerStatusCode: 404,
          })
        }
        return {
          requestId: request.requestId,
          success: true,
          timestamp: nowIso,
          data: event as unknown as TOutput,
          recordsRead: 1,
          recordsWritten: 0,
        }
      }

      case 'calendar.event.create':
      case 'calendar.event.update':
      case 'calendar.event.delete': {
        throw new ConnectorError({
          code: 'UNAVAILABLE',
          message: `Capability ${request.capabilityId} is reserved for future waves and is NOT_READY in Wave 12J.`,
          retryable: false,
        })
      }

      default:
        throw new ConnectorError({
          code: 'INVALID_REQUEST',
          message: `Unsupported capability ${request.capabilityId}`,
          retryable: false,
        })
    }
  }
}
