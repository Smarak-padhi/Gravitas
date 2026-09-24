/**
 * Gravitas Orchestrator — Connector Runtime Type Definitions
 *
 * Wave 12J Architectural Specification
 */

import type {
  ConnectorId,
  ConnectorProviderId,
  ConnectorStatus,
  ConnectorAccountId,
  ConnectorCapability,
  ConnectorDescriptor,
  ConnectorAccount,
  ConnectorExecutionRequest,
  ConnectorExecutionResult,
} from '@gravitas/core'

/**
 * Resolved credentials passed strictly in-memory between CredentialBroker
 * and Adapter during execution. NEVER persisted, logged, or emitted across IPC/HTTP.
 */
export interface ResolvedCredentials {
  readonly accountId: ConnectorAccountId
  readonly provider: ConnectorProviderId
  readonly accessToken: string
  readonly refreshToken?: string | undefined
  readonly expiresAt?: number | undefined // Epoch ms
  readonly tokenType?: string | undefined
  readonly scopes?: readonly string[] | undefined
  readonly clientId?: string | undefined
  readonly clientSecret?: string | undefined
}

/**
 * Persisted credential envelope stored only in secure vault / broker storage.
 */
export interface StoredCredentials {
  readonly accountId: ConnectorAccountId
  readonly provider: ConnectorProviderId
  readonly accessToken: string
  readonly refreshToken?: string | undefined
  readonly expiresAt?: number | undefined
  readonly tokenType?: string | undefined
  readonly scopes?: readonly string[] | undefined
  readonly clientId?: string | undefined
  readonly clientSecret?: string | undefined
  readonly updatedAt: string
}

/**
 * Opaque handle returned to non-privileged subsystems.
 * Contains no secret tokens, only metadata verifying credential existence.
 */
export interface CredentialHandle {
  readonly accountId: ConnectorAccountId
  readonly provider: ConnectorProviderId
  readonly hasAccessToken: boolean
  readonly hasRefreshToken: boolean
  readonly expiresAt?: number | undefined
  readonly isExpired: boolean
  readonly scopes: readonly string[]
}

/**
 * Interface implemented by all connector adapters (Google Calendar, Mock Calendar, etc.)
 */
export interface ConnectorAdapter {
  readonly id: ConnectorId
  readonly provider: ConnectorProviderId
  readonly displayName: string
  readonly version: string
  readonly capabilities: readonly ConnectorCapability[]

  getDescriptor(accounts: readonly ConnectorAccount[]): ConnectorDescriptor

  execute<TInput = unknown, TOutput = unknown>(
    request: ConnectorExecutionRequest<TInput>,
    credentials?: ResolvedCredentials | undefined,
  ): Promise<ConnectorExecutionResult<TOutput>>

  healthCheck(
    credentials?: ResolvedCredentials | undefined,
  ): Promise<{ healthy: boolean; status: ConnectorStatus; message?: string }>
}

/**
 * Audit log entry for all connector interactions.
 * Invariant: payload and error fields must be sanitized (no secrets).
 */
export interface ConnectorAuditLogEntry {
  readonly id: string
  readonly timestamp: string
  readonly connectorId: ConnectorId
  readonly accountId?: ConnectorAccountId | undefined
  readonly capabilityId?: string | undefined
  readonly actorType: 'OPERATOR' | 'JOB' | 'ROLE'
  readonly actorId: string
  readonly authority: string
  readonly action: 'CONNECT' | 'DISCONNECT' | 'EXECUTE' | 'HEALTH_CHECK' | 'TOKEN_REFRESH' | 'AUTH_ERROR'
  readonly success: boolean
  readonly durationMs: number
  readonly sanitizedInputSummary?: string | undefined
  readonly sanitizedOutputSummary?: string | undefined
  readonly errorCode?: string | undefined
  readonly errorMessage?: string | undefined
}

/**
 * Sync state for incremental connector sync runs.
 */
export interface ConnectorSyncState {
  readonly connectorId: ConnectorId
  readonly accountId: ConnectorAccountId
  readonly resourceType: string
  readonly syncToken?: string | undefined
  readonly lastSyncAt: string
  readonly recordCount: number
}
