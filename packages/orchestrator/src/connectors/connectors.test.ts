/**
 * Gravitas Orchestrator — Connector Kernel & Calendar Foundation Tests
 *
 * Wave 12J Test Suite
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ConnectorError,
  type ConnectorAccount,
  type ConnectorExecutionRequest,
  type CalendarEventsPage,
  type CalendarSummary,
  type CalendarEventSummary,
} from '@gravitas/core'
import { CredentialBroker } from './credentialBroker.js'
import { SqliteConnectorStore } from './sqliteConnectorStore.js'
import { MockCalendarProvider } from './calendar/mockCalendarProvider.js'
import { GoogleCalendarAdapter } from './calendar/googleCalendarAdapter.js'
import { ConnectorRegistry } from './connectorRegistry.js'
import { ActionExecutor } from '../jobs/actionExecutor.js'

describe('Wave 12J: Personal OS Connector Kernel & Calendar Operations', () => {
  let broker: CredentialBroker
  let store: SqliteConnectorStore
  let mockProvider: MockCalendarProvider
  let registry: ConnectorRegistry

  beforeEach(() => {
    broker = new CredentialBroker()
    store = new SqliteConnectorStore(':memory:')
    mockProvider = new MockCalendarProvider()
    registry = new ConnectorRegistry(store, broker)
    registry.registerAdapter(mockProvider)
  })

  afterEach(() => {
    store.close()
    broker.clear()
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // 1. Credential Broker & Vault Isolation
  // ==========================================================================

  describe('CredentialBroker & Vault Isolation', () => {
    it('stores credentials and provides opaque handle without leaking secrets', () => {
      broker.setCredentials({
        accountId: 'acc-1',
        provider: 'mock-calendar',
        accessToken: 'secret_mock_access_token_12345',
        refreshToken: 'secret_mock_refresh_token_67890',
        expiresAt: Date.now() + 3600 * 1000,
        clientId: 'mock_client_id',
        clientSecret: 'super_secret_client_secret',
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        updatedAt: new Date().toISOString(),
      })

      expect(broker.hasCredentials('acc-1')).toBe(true)

      const handle = broker.getCredentialHandle('acc-1')
      expect(handle).not.toBeNull()
      expect(handle?.accountId).toBe('acc-1')
      expect(handle?.provider).toBe('mock-calendar')
      expect(handle?.hasAccessToken).toBe(true)
      expect(handle?.hasRefreshToken).toBe(true)
      expect(handle?.isExpired).toBe(false)
      expect(handle?.scopes).toContain('https://www.googleapis.com/auth/calendar.readonly')

      // Handle must NOT contain secret properties
      expect((handle as any).accessToken).toBeUndefined()
      expect((handle as any).refreshToken).toBeUndefined()
      expect((handle as any).clientSecret).toBeUndefined()
    })

    it('resolves live credentials for internal adapter execution', async () => {
      broker.setCredentials({
        accountId: 'acc-1',
        provider: 'mock-calendar',
        accessToken: 'access_val',
        refreshToken: 'refresh_val',
        expiresAt: Date.now() + 3600 * 1000,
        updatedAt: new Date().toISOString(),
      })

      const resolved = await broker.getResolvedCredentials('acc-1')
      expect(resolved).not.toBeNull()
      expect(resolved?.accessToken).toBe('access_val')
      expect(resolved?.refreshToken).toBe('refresh_val')
    })

    it('automatically triggers token refresh when token is expired or near expiry', async () => {
      const refreshHandler = vi.fn().mockResolvedValue({
        accessToken: 'refreshed_access_token_9999',
        expiresAt: Date.now() + 7200 * 1000,
      })

      broker.registerRefreshHandler('mock-calendar', refreshHandler)

      // Token expires in 1 minute (< 5 minute buffer)
      broker.setCredentials({
        accountId: 'acc-refresh',
        provider: 'mock-calendar',
        accessToken: 'old_expiring_access_token',
        refreshToken: 'valid_refresh_token',
        expiresAt: Date.now() + 60 * 1000,
        updatedAt: new Date().toISOString(),
      })

      const resolved = await broker.getResolvedCredentials('acc-refresh')
      expect(refreshHandler).toHaveBeenCalledTimes(1)
      expect(resolved?.accessToken).toBe('refreshed_access_token_9999')

      // Verify vault was updated
      const handle = broker.getCredentialHandle('acc-refresh')
      expect(handle?.isExpired).toBe(false)
    })

    it('redacts sensitive tokens, bearer headers, and query parameters from logs', () => {
      broker.setCredentials({
        accountId: 'acc-redact',
        provider: 'mock-calendar',
        accessToken: 'secret_token_alpha_numeric',
        refreshToken: 'secret_refresh_token_beta',
        clientSecret: 'my_super_secret_key',
        updatedAt: new Date().toISOString(),
      })

      const rawLog = 'Failed calling https://api.com?access_token=secret_token_alpha_numeric with header Authorization: Bearer secret_token_alpha_numeric and secret my_super_secret_key'
      const redacted = broker.redactSensitive(rawLog)

      expect(redacted).not.toContain('secret_token_alpha_numeric')
      expect(redacted).not.toContain('my_super_secret_key')
      expect(redacted).toContain('Bearer [REDACTED]')
      expect(redacted).toContain('[REDACTED]')
    })

    it('deletes credentials upon account disconnect', () => {
      broker.setCredentials({
        accountId: 'acc-del',
        provider: 'mock-calendar',
        accessToken: 'val',
        updatedAt: new Date().toISOString(),
      })

      expect(broker.hasCredentials('acc-del')).toBe(true)
      const deleted = broker.deleteCredentials('acc-del')
      expect(deleted).toBe(true)
      expect(broker.hasCredentials('acc-del')).toBe(false)
      expect(broker.getCredentialHandle('acc-del')).toBeNull()
    })
  })

  // ==========================================================================
  // 2. Sqlite Connector Store & Sanitized Audit Logging
  // ==========================================================================

  describe('SqliteConnectorStore & Persistence', () => {
    it('persists and retrieves connector accounts', () => {
      const account: ConnectorAccount = {
        id: 'acc-test-1',
        connectorId: 'calendar-mock',
        providerAccountId: 'user@test.org',
        displayLabel: 'Test Calendar',
        status: 'CONNECTED',
        grantedScopes: ['calendar.readonly'],
        createdAt: '2026-09-24T00:00:00Z',
        updatedAt: '2026-09-24T00:00:00Z',
      }

      store.saveAccount(account)

      const fetched = store.getAccount('acc-test-1')
      expect(fetched).not.toBeNull()
      expect(fetched?.id).toBe('acc-test-1')
      expect(fetched?.displayLabel).toBe('Test Calendar')
      expect(fetched?.status).toBe('CONNECTED')
      expect(fetched?.grantedScopes).toEqual(['calendar.readonly'])

      const list = store.listAccounts('calendar-mock')
      expect(list.length).toBe(1)
      expect(list[0]?.id).toBe('acc-test-1')
    })

    it('records sanitized audit logs and supports filtered queries', () => {
      store.logAudit({
        id: 'audit-1',
        timestamp: new Date().toISOString(),
        connectorId: 'calendar-mock',
        accountId: 'acc-test-1',
        capabilityId: 'calendar.events.read',
        actorType: 'JOB',
        actorId: 'morning_agenda_job',
        authority: 'READ',
        action: 'EXECUTE',
        success: true,
        durationMs: 42,
        sanitizedInputSummary: 'timeMin=2026-09-24T00:00:00Z',
        sanitizedOutputSummary: 'Read 3 events',
      })

      const logs = store.getAuditLogs({ connectorId: 'calendar-mock' })
      expect(logs.length).toBe(1)
      expect(logs[0]?.action).toBe('EXECUTE')
      expect(logs[0]?.success).toBe(true)
      expect(logs[0]?.sanitizedOutputSummary).toBe('Read 3 events')
    })

    it('tracks sync tokens and incremental sync state', () => {
      store.saveSyncState({
        connectorId: 'calendar-mock',
        accountId: 'acc-test-1',
        resourceType: 'events',
        syncToken: 'token_sync_v1',
        lastSyncAt: new Date().toISOString(),
        recordCount: 15,
      })

      const state = store.getSyncState('calendar-mock', 'acc-test-1', 'events')
      expect(state).not.toBeNull()
      expect(state?.syncToken).toBe('token_sync_v1')
      expect(state?.recordCount).toBe(15)
    })
  })

  // ==========================================================================
  // 3. Mock Calendar Provider & Operations
  // ==========================================================================

  describe('MockCalendarProvider Operations', () => {
    const baseRequest = (capabilityId: string, input: unknown = {}): ConnectorExecutionRequest => ({
      requestId: 'req-1',
      connectorId: 'calendar-mock',
      accountId: 'acc-mock',
      capabilityId,
      authority: 'READ',
      actor: { type: 'OPERATOR', id: 'operator' },
      contextDomains: ['PERSONAL'],
      input,
      requestedAt: new Date().toISOString(),
    })

    it('reads list of calendars', async () => {
      const res = await mockProvider.execute(baseRequest('calendar.calendars.read'))
      expect(res.success).toBe(true)
      const calendars = res.data as CalendarSummary[]
      expect(calendars.length).toBeGreaterThanOrEqual(2)
      expect(calendars[0]?.primary).toBe(true)
      expect(calendars[0]?.timezone).toBe('UTC')
    })

    it('queries calendar events with range and pagination', async () => {
      const res = await mockProvider.execute(
        baseRequest('calendar.events.read', {
          calendarId: 'primary',
          maxResults: 2,
        }),
      )

      expect(res.success).toBe(true)
      const page = res.data as CalendarEventsPage
      expect(page.events.length).toBe(2)
      expect(page.nextPageToken).toBeDefined()
      expect(page.events[0]?.id).toBe('evt-1')

      // Query next page
      const resPage2 = await mockProvider.execute(
        baseRequest('calendar.events.read', {
          calendarId: 'primary',
          maxResults: 2,
          pageToken: page.nextPageToken,
        }),
      )
      const page2 = resPage2.data as CalendarEventsPage
      expect(page2.events.length).toBeGreaterThanOrEqual(1)
      expect(page2.events[0]?.id).toBe('evt-3')
    })

    it('reads a single event by id', async () => {
      const res = await mockProvider.execute(
        baseRequest('calendar.event.read', {
          calendarId: 'primary',
          eventId: 'evt-1',
        }),
      )

      expect(res.success).toBe(true)
      const evt = res.data as CalendarEventSummary
      expect(evt.id).toBe('evt-1')
      expect(evt.title).toBe('Executive Sync & Architecture Review')
      expect(evt.attendeeCount).toBe(4)
    })

    it('rejects write capabilities with UNAVAILABLE / NOT_READY in Wave 12J', async () => {
      await expect(
        mockProvider.execute(baseRequest('calendar.event.create', { title: 'New Event' })),
      ).rejects.toThrow(/NOT_READY in Wave 12J/)
    })

    it('injects deterministic HTTP faults (401, 403, 429, 500)', async () => {
      // 401
      mockProvider.setFaultConfig({ forceStatus: 401 })
      await expect(mockProvider.execute(baseRequest('calendar.calendars.read'))).rejects.toThrow(
        /Unauthorized access/,
      )

      // 403
      mockProvider.setFaultConfig({ forceStatus: 403 })
      await expect(mockProvider.execute(baseRequest('calendar.calendars.read'))).rejects.toThrow(
        /Forbidden access/,
      )

      // 429
      mockProvider.setFaultConfig({ forceStatus: 429, retryAfterMs: 2500 })
      try {
        await mockProvider.execute(baseRequest('calendar.calendars.read'))
        expect.unreachable()
      } catch (err: any) {
        expect(err).toBeInstanceOf(ConnectorError)
        expect(err.code).toBe('RATE_LIMITED')
        expect(err.retryAfterMs).toBe(2500)
      }

      // 500
      mockProvider.setFaultConfig({ forceStatus: 500, forceError: 'Simulated downstream outage' })
      await expect(mockProvider.execute(baseRequest('calendar.calendars.read'))).rejects.toThrow(
        /Simulated downstream outage/,
      )

      mockProvider.resetFaultConfig()
    })
  })

  // ==========================================================================
  // 4. Connector Registry & Execution Pipeline
  // ==========================================================================

  describe('ConnectorRegistry Pipeline & Governance', () => {
    const testAccount: ConnectorAccount = {
      id: 'acc-reg-1',
      connectorId: 'calendar-mock',
      providerAccountId: 'operator@gravitas.internal',
      displayLabel: 'Operator Calendar',
      status: 'CONNECTED',
      grantedScopes: ['calendar.readonly'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    beforeEach(() => {
      registry.provisionAccount(testAccount, {
        accountId: 'acc-reg-1',
        provider: 'mock-calendar',
        accessToken: 'mock_token',
        updatedAt: new Date().toISOString(),
      })
    })

    it('discovers registered connectors, capabilities, and accounts', () => {
      const connectors = registry.listConnectors()
      expect(connectors.length).toBe(1)
      expect(connectors[0]?.id).toBe('calendar-mock')
      expect(connectors[0]?.capabilities.length).toBeGreaterThan(0)
      expect(connectors[0]?.accountIds).toContain('acc-reg-1')

      const accounts = registry.listAccounts('calendar-mock')
      expect(accounts.length).toBe(1)
      expect(accounts[0]?.displayLabel).toBe('Operator Calendar')
    })

    it('dispatches execution and logs audit entry automatically', async () => {
      const res = await registry.executeCapability({
        requestId: 'req-reg-exec',
        connectorId: 'calendar-mock',
        accountId: 'acc-reg-1',
        capabilityId: 'calendar.events.read',
        authority: 'READ',
        actor: { type: 'OPERATOR', id: 'operator' },
        contextDomains: ['PERSONAL'],
        input: { calendarId: 'primary' },
        requestedAt: new Date().toISOString(),
      })

      expect(res.success).toBe(true)
      const data = res.data as CalendarEventsPage
      expect(data.events.length).toBeGreaterThan(0)

      const auditLogs = registry.getAuditLogs({ connectorId: 'calendar-mock' })
      expect(auditLogs.length).toBeGreaterThanOrEqual(2) // 1 for CONNECT, 1 for EXECUTE
      const execLog = auditLogs.find((l) => l.action === 'EXECUTE')
      expect(execLog?.success).toBe(true)
      expect(execLog?.capabilityId).toBe('calendar.events.read')
    })

    it('rejects unregistered capabilities or future write capabilities', async () => {
      await expect(
        registry.executeCapability({
          requestId: 'req-unsupported',
          connectorId: 'calendar-mock',
          accountId: 'acc-reg-1',
          capabilityId: 'calendar.event.create',
          authority: 'SAFE_WRITE',
          actor: { type: 'OPERATOR', id: 'operator' },
          contextDomains: ['PERSONAL'],
          input: {},
          requestedAt: new Date().toISOString(),
        }),
      ).rejects.toThrow(/NOT_READY in Wave 12J/)
    })

    it('runs health check and logs health check audit record', async () => {
      const health = await registry.checkHealth('calendar-mock', 'acc-reg-1')
      expect(health.healthy).toBe(true)
      expect(health.status).toBe('CONNECTED')

      const auditLogs = registry.getAuditLogs({ connectorId: 'calendar-mock' })
      const healthLog = auditLogs.find((l) => l.action === 'HEALTH_CHECK')
      expect(healthLog).toBeDefined()
      expect(healthLog?.success).toBe(true)
    })

    it('disconnects account cleanly and revokes credential handle', () => {
      expect(registry.getAccount('acc-reg-1')).not.toBeNull()
      expect(broker.hasCredentials('acc-reg-1')).toBe(true)

      const disconnected = registry.disconnectAccount('acc-reg-1')
      expect(disconnected).toBe(true)
      expect(registry.getAccount('acc-reg-1')).toBeNull()
      expect(broker.hasCredentials('acc-reg-1')).toBe(false)
    })
  })

  // ==========================================================================
  // 5. ActionExecutor Integration
  // ==========================================================================

  describe('ActionExecutor CONNECTOR_READ Execution', () => {
    it('executes CONNECTOR_READ via ActionExecutor', async () => {
      const account: ConnectorAccount = {
        id: 'acc-exec-1',
        connectorId: 'calendar-mock',
        providerAccountId: 'operator@internal',
        displayLabel: 'Operator Calendar',
        status: 'CONNECTED',
        grantedScopes: ['calendar.readonly'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      registry.provisionAccount(account, {
        accountId: 'acc-exec-1',
        provider: 'mock-calendar',
        accessToken: 'valid_token',
        updatedAt: new Date().toISOString(),
      })

      const executor = new ActionExecutor({
        allowedFileRoots: [process.cwd()],
        registeredRepositories: { repo1: process.cwd() },
        connectorRegistry: registry,
      })

      const actionResult = await executor.execute({
        type: 'CONNECTOR_READ',
        connectorId: 'calendar-mock',
        accountId: 'acc-exec-1',
        capabilityId: 'calendar.events.read',
        parameters: { calendarId: 'primary' },
      })

      expect(actionResult.success).toBe(true)
      expect(actionResult.resultCode).toBe('CONNECTOR_READ_OK')
      expect(actionResult.resultSummary).toContain('Retrieved')
      expect(actionResult.reasoningUsed).toBe(false)
    })

    it('returns structured error when connector reports failure', async () => {
      mockProvider.setFaultConfig({ forceStatus: 401 })
      const executor = new ActionExecutor({
        allowedFileRoots: [process.cwd()],
        registeredRepositories: { repo1: process.cwd() },
        connectorRegistry: registry,
      })

      const actionResult = await executor.execute({
        type: 'CONNECTOR_READ',
        connectorId: 'calendar-mock',
        accountId: 'acc-exec-1',
        capabilityId: 'calendar.events.read',
        parameters: { calendarId: 'primary' },
      })

      expect(actionResult.success).toBe(false)
      expect(actionResult.errorCode).toBe('AUTHORITY_DENIED')
      expect(actionResult.resultSummary).toContain('Unauthorized access')
      mockProvider.resetFaultConfig()
    })
  })

  // ==========================================================================
  // 6. Google Calendar Adapter Mocked Fetch Tests
  // ==========================================================================

  describe('GoogleCalendarAdapter Normalization & OAuth Refresh', () => {
    let googleAdapter: GoogleCalendarAdapter

    beforeEach(() => {
      googleAdapter = new GoogleCalendarAdapter()
    })

    it('refreshes Google OAuth token via token endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new_google_access_token_abc',
          expires_in: 3600,
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const refreshed = await GoogleCalendarAdapter.refreshGoogleToken({
        accountId: 'acc-g',
        provider: 'google-calendar',
        accessToken: 'old_token',
        refreshToken: 'valid_refresh_token',
        clientId: 'g_client_id',
        clientSecret: 'g_client_secret',
        updatedAt: new Date().toISOString(),
      })

      expect(refreshed.accessToken).toBe('new_google_access_token_abc')
      expect(refreshed.expiresAt).toBeGreaterThan(Date.now())
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('fetches and normalizes Google Calendar events', async () => {
      const googleEventsResponse = {
        items: [
          {
            id: 'g-evt-1',
            summary: 'Google Meet Daily Standup',
            start: { dateTime: '2026-09-24T14:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2026-09-24T14:30:00Z', timeZone: 'UTC' },
            location: 'https://meet.google.com/xyz',
            organizer: { email: 'team@company.com' },
            attendees: [{ email: 'dev@company.com' }, { email: 'qa@company.com' }],
            status: 'confirmed',
            updated: '2026-09-23T10:00:00Z',
          },
          {
            id: 'g-evt-2',
            summary: 'Public Holiday',
            start: { date: '2026-09-25' },
            end: { date: '2026-09-26' },
            status: 'confirmed',
          },
        ],
        nextPageToken: 'g_token_next',
        timeZone: 'UTC',
      }

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => googleEventsResponse,
        }),
      )

      const result = await googleAdapter.execute(
        {
          requestId: 'req-g-1',
          connectorId: 'calendar-google',
          accountId: 'acc-g',
          capabilityId: 'calendar.events.read',
          authority: 'READ',
          actor: { type: 'OPERATOR', id: 'operator' },
          contextDomains: ['PERSONAL'],
          input: { calendarId: 'primary' },
          requestedAt: new Date().toISOString(),
        },
        {
          accountId: 'acc-g',
          provider: 'google-calendar',
          accessToken: 'g_access_token_live',
        },
      )

      expect(result.success).toBe(true)
      const data = result.data as CalendarEventsPage
      expect(data.events.length).toBe(2)

      // Verify timed event
      const timed = data.events[0]
      expect(timed?.id).toBe('g-evt-1')
      expect(timed?.title).toBe('Google Meet Daily Standup')
      expect(timed?.allDay).toBe(false)
      expect(timed?.attendeeCount).toBe(2)
      expect(timed?.location).toBe('https://meet.google.com/xyz')

      // Verify all day event
      const allDay = data.events[1]
      expect(allDay?.id).toBe('g-evt-2')
      expect(allDay?.allDay).toBe(true)
      expect(allDay?.start).toBe('2026-09-25')
    })
  })
})
