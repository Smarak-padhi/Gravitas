/**
 * Gravitas Personal OS Capability Layer — Canonical Connector Domain Contracts
 *
 * Wave 12J Architectural Specification
 *
 * Strict Invariants:
 * 1. ROLE != HARNESS != PROVIDER/MODEL != CONNECTOR != EXTERNAL ACCOUNT
 * 2. Connectors are bounded capability transports, not autonomous agents.
 * 3. NO RAW OAUTH TOKENS IN PUBLIC CONTRACTS, PROMPTS, RUNTIME PROJECTIONS, OR LOGS.
 * 4. No connector can claim autonomy or bypass JobRunner authority.
 * 5. No external write may occur silently; writes require explicit sovereign human approval.
 * 6. Zero persistent LLM loops.
 */

import type { AuthorityClass } from './jobs.js'

// ============================================================================
// 1. Context Domains (Least-Privilege Scoping)
// ============================================================================

export type ContextDomain =
  | 'PROJECT'
  | 'LEARNING'
  | 'BUSINESS'
  | 'COMMUNICATION'
  | 'PERSONAL'
  | 'HEALTH'
  | 'SECRETS'

// ============================================================================
// 2. Connector Identifiers & Status
// ============================================================================

export type ConnectorId = string
export type ConnectorAccountId = string
export type ConnectorProviderId =
  | 'google-calendar'
  | 'mock-calendar'
  | (string & {})

export type ConnectorStatus =
  | 'UNCONFIGURED'
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'REAUTH_REQUIRED'
  | 'DISABLED'
  | 'ERROR'

export type ConnectorCapabilityId =
  | 'calendar.events.read'
  | 'calendar.event.read'
  | 'calendar.calendars.read'
  | 'calendar.event.create' // Future-reserved (NOT_READY in Wave 12J)
  | 'calendar.event.update' // Future-reserved (NOT_READY in Wave 12J)
  | 'calendar.event.delete' // Future-reserved (NOT_READY in Wave 12J)
  | (string & {})

// ============================================================================
// 3. Connector Capabilities & Descriptors
// ============================================================================

export interface ConnectorCapability {
  readonly id: ConnectorCapabilityId
  readonly connectorId: ConnectorId
  readonly domain: ContextDomain
  readonly authority: AuthorityClass
  readonly contextDomains: readonly ContextDomain[]
  readonly supportsDryRun: boolean
  readonly requiresApproval: boolean
  readonly readyInWave: '12J' | 'FUTURE'
  readonly sensitiveInputClasses?: readonly string[] | undefined
  readonly sensitiveOutputClasses?: readonly string[] | undefined
}

export interface ConnectorDescriptor {
  readonly id: ConnectorId
  readonly provider: ConnectorProviderId
  readonly displayName: string
  readonly version: string
  readonly status: ConnectorStatus
  readonly capabilities: readonly ConnectorCapability[]
  readonly accountIds: readonly ConnectorAccountId[]
  readonly lastHealthCheckAt?: string | undefined
  readonly lastSuccessfulSyncAt?: string | undefined
}

export interface ConnectorAccount {
  readonly id: ConnectorAccountId
  readonly connectorId: ConnectorId
  readonly providerAccountId: string
  readonly displayLabel: string
  readonly status: ConnectorStatus
  readonly grantedScopes: readonly string[]
  readonly createdAt: string
  readonly updatedAt: string
  readonly lastSyncAt?: string | undefined
  readonly lastError?: string | undefined
}

// ============================================================================
// 4. Execution Request & Result Contracts (Credentials Stripped)
// ============================================================================

export interface ConnectorActor {
  readonly type: 'OPERATOR' | 'JOB' | 'ROLE'
  readonly id: string
}

export interface ConnectorExecutionRequest<TInput = unknown> {
  readonly requestId: string
  readonly connectorId: ConnectorId
  readonly accountId: ConnectorAccountId
  readonly capabilityId: ConnectorCapabilityId
  readonly authority: AuthorityClass
  readonly actor: ConnectorActor
  readonly contextDomains: readonly ContextDomain[]
  readonly input: TInput
  readonly requestedAt: string
  readonly approvalId?: string | undefined
  readonly idempotencyKey?: string | undefined
}

export type ConnectorErrorCode =
  | 'AUTH_REQUIRED'
  | 'REAUTH_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TIMEOUT'
  | 'UNAVAILABLE'

export interface ConnectorErrorPayload {
  readonly code: ConnectorErrorCode
  readonly message: string
  readonly retryable: boolean
  readonly providerStatusCode?: number | undefined
  readonly retryAfterMs?: number | undefined
}

export class ConnectorError extends Error {
  public readonly code: ConnectorErrorCode
  public readonly retryable: boolean
  public readonly providerStatusCode?: number | undefined
  public readonly retryAfterMs?: number | undefined

  public constructor(payload: ConnectorErrorPayload) {
    super(`[${payload.code}] ${payload.message}`)
    this.name = 'ConnectorError'
    this.code = payload.code
    this.retryable = payload.retryable
    this.providerStatusCode = payload.providerStatusCode
    this.retryAfterMs = payload.retryAfterMs
  }
}

export interface ConnectorExecutionResult<TOutput = unknown> {
  readonly requestId: string
  readonly success: boolean
  readonly timestamp: string
  readonly data?: TOutput | undefined
  readonly error?: ConnectorErrorPayload | undefined
  readonly recordsRead?: number | undefined
  readonly recordsWritten?: number | undefined
}

// ============================================================================
// 5. Normalized Calendar Domain Models (No Provider Leaks)
// ============================================================================

export interface CalendarSummary {
  readonly id: string
  readonly name: string
  readonly primary: boolean
  readonly timezone: string
  readonly accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader'
}

export interface CalendarEventSummary {
  readonly id: string
  readonly calendarId: string
  readonly title: string
  readonly start: string // ISO 8601 UTC or date string (YYYY-MM-DD for all-day)
  readonly end: string // ISO 8601 UTC or date string
  readonly allDay: boolean
  readonly timezone: string
  readonly location?: string | undefined
  readonly organizer?: string | undefined
  readonly attendeeCount?: number | undefined
  readonly status: 'confirmed' | 'tentative' | 'cancelled'
  readonly updatedAt: string
}

export interface CalendarEventsQuery {
  readonly calendarId?: string | undefined // Defaults to primary if omitted
  readonly timeMin?: string | undefined // ISO 8601 UTC
  readonly timeMax?: string | undefined // ISO 8601 UTC
  readonly maxResults?: number | undefined // Maximum bounded ceiling
  readonly pageToken?: string | undefined
  readonly singleEvents?: boolean | undefined
}

export interface CalendarEventsPage {
  readonly events: readonly CalendarEventSummary[]
  readonly nextPageToken?: string | undefined
  readonly timeZone: string
}
