/**
 * Gravitas Orchestrator — Google Calendar Connector Adapter
 *
 * Wave 12J Architectural Specification
 *
 * Implements:
 * 1. Read-only calendar queries via Google Calendar v3 REST API.
 * 2. Token refresh handler for Google OAuth 2.0.
 * 3. Normalization from Google JSON structures into @gravitas/core calendar models.
 * 4. Error mapping and status code normalization.
 * 5. Strict Credential Boundary: Zero token leakage in exceptions, errors, or logs.
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
import type { ConnectorAdapter, ResolvedCredentials, StoredCredentials } from '../types.js'

export class GoogleCalendarAdapter implements ConnectorAdapter {
  public readonly id: ConnectorId = 'calendar-google'
  public readonly provider: ConnectorProviderId = 'google-calendar'
  public readonly displayName = 'Google Calendar'
  public readonly version = '1.0.0'

  public readonly capabilities: readonly ConnectorCapability[] = [
    {
      id: 'calendar.calendars.read',
      connectorId: 'calendar-google',
      domain: 'PERSONAL',
      authority: 'READ',
      contextDomains: ['PERSONAL', 'BUSINESS', 'PROJECT'],
      supportsDryRun: true,
      requiresApproval: false,
      readyInWave: '12J',
    },
    {
      id: 'calendar.events.read',
      connectorId: 'calendar-google',
      domain: 'PERSONAL',
      authority: 'READ',
      contextDomains: ['PERSONAL', 'BUSINESS', 'PROJECT'],
      supportsDryRun: true,
      requiresApproval: false,
      readyInWave: '12J',
    },
    {
      id: 'calendar.event.read',
      connectorId: 'calendar-google',
      domain: 'PERSONAL',
      authority: 'READ',
      contextDomains: ['PERSONAL', 'BUSINESS', 'PROJECT'],
      supportsDryRun: true,
      requiresApproval: false,
      readyInWave: '12J',
    },
    {
      id: 'calendar.event.create',
      connectorId: 'calendar-google',
      domain: 'PERSONAL',
      authority: 'SAFE_WRITE',
      contextDomains: ['PERSONAL', 'BUSINESS', 'PROJECT'],
      supportsDryRun: true,
      requiresApproval: true,
      readyInWave: 'FUTURE',
    },
  ]

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
    if (!credentials || !credentials.accessToken) {
      return { healthy: false, status: 'UNCONFIGURED', message: 'No Google Calendar credentials found' }
    }

    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      })

      if (res.status === 401) {
        return { healthy: false, status: 'REAUTH_REQUIRED', message: 'Google OAuth token expired or revoked' }
      }
      if (!res.ok) {
        return { healthy: false, status: 'ERROR', message: `Google API error HTTP ${res.status}` }
      }

      return { healthy: true, status: 'CONNECTED' }
    } catch (err) {
      return {
        healthy: false,
        status: 'DEGRADED',
        message: `Health check connection failed: ${(err as Error).message}`,
      }
    }
  }

  public async execute<TInput = unknown, TOutput = unknown>(
    request: ConnectorExecutionRequest<TInput>,
    credentials?: ResolvedCredentials,
  ): Promise<ConnectorExecutionResult<TOutput>> {
    if (!credentials || !credentials.accessToken) {
      throw new ConnectorError({
        code: 'AUTH_REQUIRED',
        message: 'No credentials available for Google Calendar execution',
        retryable: false,
      })
    }

    const nowIso = new Date().toISOString()

    switch (request.capabilityId) {
      case 'calendar.calendars.read': {
        const url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList'
        const responseData = await this.fetchGoogleApi<{ items?: Record<string, unknown>[] }>(
          url,
          credentials.accessToken,
        )
        const items = responseData.items ?? []
        const calendars: CalendarSummary[] = items.map((item) => ({
          id: String(item['id'] || ''),
          name: String(item['summary'] || 'Untitled Calendar'),
          primary: Boolean(item['primary']),
          timezone: String(item['timeZone'] || 'UTC'),
          accessRole: (item['accessRole'] as CalendarSummary['accessRole']) || 'reader',
        }))

        return {
          requestId: request.requestId,
          success: true,
          timestamp: nowIso,
          data: calendars as unknown as TOutput,
          recordsRead: calendars.length,
          recordsWritten: 0,
        }
      }

      case 'calendar.events.read': {
        const query = (request.input ?? {}) as CalendarEventsQuery
        const calendarId = encodeURIComponent(query.calendarId ?? 'primary')
        const params = new URLSearchParams()

        if (query.timeMin) params.set('timeMin', query.timeMin)
        if (query.timeMax) params.set('timeMax', query.timeMax)
        if (query.maxResults) params.set('maxResults', String(query.maxResults))
        if (query.pageToken) params.set('pageToken', query.pageToken)
        if (query.singleEvents !== false) params.set('singleEvents', 'true')
        params.set('orderBy', 'startTime')

        const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`
        const responseData = await this.fetchGoogleApi<{
          items?: Record<string, unknown>[]
          nextPageToken?: string
          timeZone?: string
        }>(url, credentials.accessToken)

        const items = responseData.items ?? []
        const events: CalendarEventSummary[] = items.map((item) => this.mapGoogleEvent(item, query.calendarId ?? 'primary'))

        const resultPage: CalendarEventsPage = {
          events,
          nextPageToken: responseData.nextPageToken,
          timeZone: responseData.timeZone || 'UTC',
        }

        return {
          requestId: request.requestId,
          success: true,
          timestamp: nowIso,
          data: resultPage as unknown as TOutput,
          recordsRead: events.length,
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
        const encodedCalId = encodeURIComponent(calendarId)
        const encodedEvtId = encodeURIComponent(eventId)
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalId}/events/${encodedEvtId}`

        const responseData = await this.fetchGoogleApi<Record<string, unknown>>(url, credentials.accessToken)
        const event = this.mapGoogleEvent(responseData, calendarId)

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

  private mapGoogleEvent(item: Record<string, unknown>, calendarId: string): CalendarEventSummary {
    const startObj = ((item['start'] || {}) as Record<string, unknown>)
    const endObj = ((item['end'] || {}) as Record<string, unknown>)

    const allDay = Boolean(startObj['date'] && !startObj['dateTime'])
    const start = String(startObj['dateTime'] || startObj['date'] || '')
    const end = String(endObj['dateTime'] || endObj['date'] || start)
    const timezone = String(startObj['timeZone'] || endObj['timeZone'] || 'UTC')

    const organizerObj = item['organizer'] as Record<string, unknown> | undefined
    const organizer = organizerObj && organizerObj['email'] ? String(organizerObj['email']) : undefined
    const attendees = Array.isArray(item['attendees']) ? item['attendees'] : []

    return {
      id: String(item['id'] || ''),
      calendarId,
      title: String(item['summary'] || '(No title)'),
      start,
      end,
      allDay,
      timezone,
      location: item['location'] ? String(item['location']) : undefined,
      organizer,
      attendeeCount: attendees.length,
      status: (item['status'] as CalendarEventSummary['status']) || 'confirmed',
      updatedAt: String(item['updated'] || new Date().toISOString()),
    }
  }

  private async fetchGoogleApi<T>(url: string, accessToken: string): Promise<T> {
    let res: Response
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      })
    } catch (err) {
      throw new ConnectorError({
        code: 'NETWORK_ERROR',
        message: `Failed to contact Google Calendar API: ${(err as Error).message}`,
        retryable: true,
      })
    }

    if (!res.ok) {
      const status = res.status
      let errorBody = ''
      try {
        errorBody = await res.text()
      } catch {
        // ignore
      }

      if (status === 401) {
        throw new ConnectorError({
          code: 'REAUTH_REQUIRED',
          message: 'Google Calendar OAuth token expired or revoked',
          retryable: false,
          providerStatusCode: 401,
        })
      }
      if (status === 403) {
        throw new ConnectorError({
          code: 'PERMISSION_DENIED',
          message: 'Insufficient permissions for Google Calendar resource',
          retryable: false,
          providerStatusCode: 403,
        })
      }
      if (status === 404) {
        throw new ConnectorError({
          code: 'NOT_FOUND',
          message: 'Google Calendar resource not found',
          retryable: false,
          providerStatusCode: 404,
        })
      }
      if (status === 429) {
        throw new ConnectorError({
          code: 'RATE_LIMITED',
          message: 'Google Calendar rate limit exceeded',
          retryable: true,
          providerStatusCode: 429,
          retryAfterMs: 3000,
        })
      }
      if (status >= 500) {
        throw new ConnectorError({
          code: 'PROVIDER_ERROR',
          message: `Google Calendar internal server error: HTTP ${status}`,
          retryable: true,
          providerStatusCode: status,
        })
      }

      throw new ConnectorError({
        code: 'PROVIDER_ERROR',
        message: `Google API returned error status ${status}${errorBody ? `: ${errorBody.slice(0, 100)}` : ''}`,
        retryable: false,
        providerStatusCode: status,
      })
    }

    return (await res.json()) as T
  }

  /**
   * Static token refresh handler for Google OAuth 2.0.
   */
  public static async refreshGoogleToken(
    stored: StoredCredentials,
  ): Promise<{ accessToken: string; expiresAt?: number; refreshToken?: string }> {
    if (!stored.refreshToken) {
      throw new Error('No refresh token present in stored credentials')
    }
    if (!stored.clientId || !stored.clientSecret) {
      throw new Error('Google OAuth client ID / client Secret missing from stored credentials')
    }

    const params = new URLSearchParams()
    params.set('grant_type', 'refresh_token')
    params.set('client_id', stored.clientId)
    params.set('client_secret', stored.clientSecret)
    params.set('refresh_token', stored.refreshToken)

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      throw new Error(`Google OAuth refresh failed with HTTP ${res.status}`)
    }

    const body = (await res.json()) as {
      access_token: string
      expires_in?: number
      refresh_token?: string
    }

    const now = Date.now()
    const expiresAt = body.expires_in ? now + body.expires_in * 1000 : undefined

    const result: { accessToken: string; expiresAt?: number; refreshToken?: string } = {
      accessToken: body.access_token,
    }
    if (expiresAt !== undefined) {
      result.expiresAt = expiresAt
    }
    if (body.refresh_token !== undefined) {
      result.refreshToken = body.refresh_token
    }

    return result
  }
}
