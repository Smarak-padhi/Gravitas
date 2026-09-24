/**
 * Personal OS Connector Kernel & Calendar HTTP API Integration Tests.
 * Wave 12J Verification.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { AgentHarness } from '@gravitas/harnesses'
import { GravitasServer } from './server.js'
import { RunService } from './service.js'
import { EventHub } from './events.js'
import { InMemoryRegistry } from './registry.js'

describe('Personal OS Connectors & Calendar API Integration (Wave 12J)', () => {
  let server: GravitasServer
  let service: RunService
  let baseUrl: string
  let tempDir: string
  let dbPath: string

  const createStubHarness = (id: string): AgentHarness => ({
    id,
    availability: async () => ({
      status: 'AVAILABLE',
      installed: true,
      usableNoninteractive: true,
      message: 'Ready',
    }),
    execute: async () => {
      throw new Error('Not implemented for connectors api tests')
    },
  })

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gravitas-connectors-api-'))
    dbPath = join(tempDir, 'jobs.db')

    const registry = new InMemoryRegistry()
    const eventHub = new EventHub(registry)
    const harness = createStubHarness('stub-worker')

    service = new RunService({
      registry,
      eventHub,
      harness,
      runtimeRoot: tempDir,
      jobDbPath: dbPath,
    })

    server = new GravitasServer({
      service,
      eventHub,
    })

    const addr = await server.start({ port: 0 })
    baseUrl = addr.url
  })

  afterEach(async () => {
    await server.stop()
  })

  // ==========================================================================
  // 1. Connectors Discovery & Health
  // ==========================================================================

  it('GET /api/v1/connectors lists registered connectors', async () => {
    const res = await fetch(`${baseUrl}/api/v1/connectors`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { connectors: any[] }
    expect(Array.isArray(body.connectors)).toBe(true)
    const ids = body.connectors.map((c) => c.id)
    expect(ids).toContain('calendar-mock')
    expect(ids).toContain('calendar-google')

    const mockConn = body.connectors.find((c) => c.id === 'calendar-mock')
    expect(mockConn.capabilities.length).toBeGreaterThan(0)
    expect(mockConn.status).toBe('CONNECTED') // default mock account provisioned
  })

  it('GET /api/v1/connectors/:id retrieves specific connector descriptor or 404', async () => {
    const found = await fetch(`${baseUrl}/api/v1/connectors/calendar-mock`)
    expect(found.status).toBe(200)
    const body = await found.json()
    expect(body.id).toBe('calendar-mock')
    expect(body.displayName).toBe('Deterministic Calendar Mock')

    const notFound = await fetch(`${baseUrl}/api/v1/connectors/calendar-unknown`)
    expect(notFound.status).toBe(404)
  })

  it('POST /api/v1/connectors/:id/health performs health check', async () => {
    const res = await fetch(`${baseUrl}/api/v1/connectors/calendar-mock/health`, {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { healthy: boolean; status: string }
    expect(body.healthy).toBe(true)
    expect(body.status).toBe('CONNECTED')
  })

  // ==========================================================================
  // 2. Account Provisioning & Disconnect Boundary
  // ==========================================================================

  it('POST and GET /api/v1/connectors/:id/accounts provisions account without leaking credentials', async () => {
    const createRes = await fetch(`${baseUrl}/api/v1/connectors/calendar-google/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerAccountId: 'corp_user@enterprise.com',
        displayLabel: 'Corporate Google Calendar',
        grantedScopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        credentials: {
          accessToken: 'super_secret_oauth_token_123',
          refreshToken: 'super_secret_refresh_token_456',
          clientId: 'client_id_789',
          clientSecret: 'client_secret_xyz',
        },
      }),
    })

    expect(createRes.status).toBe(201)
    const createBody = (await createRes.json()) as { success: boolean; account: any }
    expect(createBody.success).toBe(true)
    expect(createBody.account.displayLabel).toBe('Corporate Google Calendar')

    // CRITICAL: Raw credentials MUST NOT be in the API response
    expect(createBody.account.accessToken).toBeUndefined()
    expect(createBody.account.refreshToken).toBeUndefined()
    expect(createBody.account.clientSecret).toBeUndefined()
    expect(JSON.stringify(createBody)).not.toContain('super_secret_oauth_token_123')

    // Verify GET list
    const listRes = await fetch(`${baseUrl}/api/v1/connectors/calendar-google/accounts`)
    expect(listRes.status).toBe(200)
    const listBody = (await listRes.json()) as { accounts: any[] }
    expect(listBody.accounts.length).toBe(1)
    expect(listBody.accounts[0].providerAccountId).toBe('corp_user@enterprise.com')
    expect(JSON.stringify(listBody)).not.toContain('super_secret_oauth_token_123')

    // Disconnect
    const delRes = await fetch(
      `${baseUrl}/api/v1/connectors/calendar-google/accounts/${createBody.account.id}`,
      { method: 'DELETE' },
    )
    expect(delRes.status).toBe(200)

    const listAfterDel = await fetch(`${baseUrl}/api/v1/connectors/calendar-google/accounts`)
    const listAfterDelBody = (await listAfterDel.json()) as { accounts: any[] }
    expect(listAfterDelBody.accounts.length).toBe(0)
  })

  // ==========================================================================
  // 3. Sanitized Audit Logs
  // ==========================================================================

  it('GET /api/v1/connectors/audit returns audit records with zero token leakage', async () => {
    const res = await fetch(`${baseUrl}/api/v1/connectors/audit?connectorId=calendar-mock`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { auditLogs: any[] }
    expect(Array.isArray(body.auditLogs)).toBe(true)
    expect(body.auditLogs.length).toBeGreaterThanOrEqual(1)

    const rawStr = JSON.stringify(body)
    expect(rawStr).not.toContain('Bearer mock_local_access_token')
    expect(rawStr).not.toContain('super_secret')
  })

  // ==========================================================================
  // 4. Calendar REST Queries
  // ==========================================================================

  it('GET /api/v1/calendar/calendars returns calendar list', async () => {
    const res = await fetch(`${baseUrl}/api/v1/calendar/calendars`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { calendars: any[] }
    expect(body.calendars.length).toBeGreaterThanOrEqual(2)
    expect(body.calendars[0].primary).toBe(true)
  })

  it('GET /api/v1/calendar/events supports pagination and filters', async () => {
    const res = await fetch(`${baseUrl}/api/v1/calendar/events?maxResults=2`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { events: any[]; nextPageToken?: string }
    expect(body.events.length).toBe(2)
    expect(body.nextPageToken).toBeDefined()
  })

  it('GET /api/v1/calendar/events/:eventId returns specific event', async () => {
    const res = await fetch(`${baseUrl}/api/v1/calendar/events/evt-1`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { id: string; title: string }
    expect(body.id).toBe('evt-1')
    expect(body.title).toBe('Executive Sync & Architecture Review')
  })

  // ==========================================================================
  // 5. Job Action Execution with CONNECTOR_READ
  // ==========================================================================

  it('POST /api/v1/jobs allows creating and running a CONNECTOR_READ background job', async () => {
    const createRes = await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'job-test-calendar-read',
        title: 'Test Calendar Read',
        trigger: { type: 'MANUAL' },
        action: {
          type: 'CONNECTOR_READ',
          connectorId: 'calendar-mock',
          accountId: 'account-mock-default',
          capabilityId: 'calendar.events.read',
          parameters: { calendarId: 'primary' },
        },
      }),
    })

    expect(createRes.status).toBe(201)

    // Trigger run
    const runRes = await fetch(`${baseUrl}/api/v1/jobs/job-test-calendar-read/run`, {
      method: 'POST',
    })
    expect(runRes.status).toBe(200)
    const runBody = await runRes.json()
    expect(runBody.jobRun).toBeDefined()
    expect(runBody.jobRun.status).toBe('SUCCEEDED')
    expect(runBody.jobRun.resultSummary).toContain('Retrieved')
  })

  // ==========================================================================
  // 6. Runtime Projection State
  // ==========================================================================

  it('GET /api/v1/state returns projection containing connectors summary', async () => {
    const res = await fetch(`${baseUrl}/api/v1/state`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.projection.connectors).toBeDefined()
    expect(Array.isArray(body.projection.connectors)).toBe(true)

    const mockProj = body.projection.connectors.find((c: any) => c.connectorId === 'calendar-mock')
    expect(mockProj).toBeDefined()
    expect(mockProj.status).toBe('CONNECTED')
    expect(mockProj.accountsCount).toBeGreaterThanOrEqual(1)
  })
})
