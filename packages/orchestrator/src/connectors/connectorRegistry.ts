/**
 * Gravitas Orchestrator — Connector Registry
 *
 * Wave 12J Architectural Specification
 *
 * Implements:
 * 1. Adapter registry and capability discovery.
 * 2. Strict authority enforcement: enforces capability constraints, rejects unauthorized writes.
 * 3. Execution pipeline: dispatches to adapter with in-memory resolved credentials.
 * 4. Audit logging: writes sanitized records into SqliteConnectorStore.
 * 5. Sanitized diagnostics: zero token or secret exposure.
 */

import {
  ConnectorError,
  type ConnectorAccount,
  type ConnectorAccountId,
  type ConnectorDescriptor,
  type ConnectorExecutionRequest,
  type ConnectorExecutionResult,
  type ConnectorId,
  type ConnectorStatus,
} from '@gravitas/core'
import type { CredentialBroker } from './credentialBroker.js'
import type { SqliteConnectorStore } from './sqliteConnectorStore.js'
import type { ConnectorAdapter, ConnectorAuditLogEntry, StoredCredentials } from './types.js'

export class ConnectorRegistry {
  private readonly adapters = new Map<ConnectorId, ConnectorAdapter>()

  public constructor(
    private readonly store: SqliteConnectorStore,
    private readonly broker: CredentialBroker,
  ) {}

  public registerAdapter(adapter: ConnectorAdapter): void {
    this.adapters.set(adapter.id, adapter)
  }

  public getAdapter(id: ConnectorId): ConnectorAdapter | null {
    return this.adapters.get(id) ?? null
  }

  public listConnectors(): readonly ConnectorDescriptor[] {
    const descriptors: ConnectorDescriptor[] = []
    for (const adapter of this.adapters.values()) {
      const accounts = this.store.listAccounts(adapter.id)
      descriptors.push(adapter.getDescriptor(accounts))
    }
    return descriptors
  }

  public getConnector(id: ConnectorId): ConnectorDescriptor | null {
    const adapter = this.adapters.get(id)
    if (!adapter) return null
    const accounts = this.store.listAccounts(id)
    return adapter.getDescriptor(accounts)
  }

  public listAccounts(connectorId?: ConnectorId): readonly ConnectorAccount[] {
    return this.store.listAccounts(connectorId)
  }

  public getAccount(id: ConnectorAccountId): ConnectorAccount | null {
    return this.store.getAccount(id)
  }

  public provisionAccount(account: ConnectorAccount, credentials?: StoredCredentials): void {
    this.store.saveAccount(account)
    if (credentials) {
      this.broker.setCredentials(credentials)
    }

    this.store.logAudit({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      connectorId: account.connectorId,
      accountId: account.id,
      actorType: 'OPERATOR',
      actorId: 'operator',
      authority: 'SAFE_WRITE',
      action: 'CONNECT',
      success: true,
      durationMs: 0,
      sanitizedInputSummary: `Provisioned account ${account.displayLabel} (${account.providerAccountId})`,
    })
  }

  public disconnectAccount(accountId: ConnectorAccountId): boolean {
    const account = this.store.getAccount(accountId)
    if (!account) return false

    this.broker.deleteCredentials(accountId)
    const deleted = this.store.deleteAccount(accountId)

    this.store.logAudit({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      connectorId: account.connectorId,
      accountId,
      actorType: 'OPERATOR',
      actorId: 'operator',
      authority: 'SAFE_WRITE',
      action: 'DISCONNECT',
      success: deleted,
      durationMs: 0,
      sanitizedInputSummary: `Disconnected account ${account.displayLabel}`,
    })

    return deleted
  }

  public async checkHealth(
    connectorId: ConnectorId,
    accountId?: ConnectorAccountId,
  ): Promise<{ healthy: boolean; status: ConnectorStatus; message?: string }> {
    const adapter = this.adapters.get(connectorId)
    if (!adapter) {
      return { healthy: false, status: 'ERROR', message: `Connector ${connectorId} not found` }
    }

    let creds = undefined
    if (accountId) {
      creds = (await this.broker.getResolvedCredentials(accountId)) ?? undefined
    } else {
      const accounts = this.store.listAccounts(connectorId)
      const firstAcc = accounts[0]
      if (firstAcc) {
        creds = (await this.broker.getResolvedCredentials(firstAcc.id)) ?? undefined
      }
    }

    const start = Date.now()
    const result = await adapter.healthCheck(creds)
    const durationMs = Date.now() - start

    if (accountId) {
      this.store.updateAccountStatus(accountId, result.status, result.message)
    }

    this.store.logAudit({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      connectorId,
      accountId,
      actorType: 'JOB',
      actorId: 'health_check',
      authority: 'READ',
      action: 'HEALTH_CHECK',
      success: result.healthy,
      durationMs,
      sanitizedOutputSummary: result.message ?? `Health check result: ${result.status}`,
    })

    return result
  }

  public async executeCapability<TInput = unknown, TOutput = unknown>(
    request: ConnectorExecutionRequest<TInput>,
  ): Promise<ConnectorExecutionResult<TOutput>> {
    const start = Date.now()
    const adapter = this.adapters.get(request.connectorId)
    if (!adapter) {
      const err = new ConnectorError({
        code: 'NOT_FOUND',
        message: `Connector ${request.connectorId} is not registered`,
        retryable: false,
      })
      this.recordAuditError(request, err, Date.now() - start)
      throw err
    }

    const capability = adapter.capabilities.find((c) => c.id === request.capabilityId)
    if (!capability) {
      const err = new ConnectorError({
        code: 'NOT_FOUND',
        message: `Capability ${request.capabilityId} not supported by connector ${request.connectorId}`,
        retryable: false,
      })
      this.recordAuditError(request, err, Date.now() - start)
      throw err
    }

    // Invariant: Wave 12J readiness check
    if (capability.readyInWave !== '12J') {
      const err = new ConnectorError({
        code: 'UNAVAILABLE',
        message: `Capability ${request.capabilityId} is reserved for future waves and is NOT_READY in Wave 12J.`,
        retryable: false,
      })
      this.recordAuditError(request, err, Date.now() - start)
      throw err
    }

    // Invariant: Wave 12J only permits READ execution without sovereign human approval
    if (capability.authority !== 'READ' && !request.approvalId) {
      const err = new ConnectorError({
        code: 'PERMISSION_DENIED',
        message: `Capability ${request.capabilityId} requires authority ${capability.authority} and explicit approval.`,
        retryable: false,
      })
      this.recordAuditError(request, err, Date.now() - start)
      throw err
    }

    // Resolve credentials in memory
    const creds = await this.broker.getResolvedCredentials(request.accountId)
    if (!creds && adapter.provider !== 'mock-calendar') {
      const err = new ConnectorError({
        code: 'AUTH_REQUIRED',
        message: `No credentials found or token expired for account ${request.accountId}`,
        retryable: false,
      })
      this.recordAuditError(request, err, Date.now() - start)
      throw err
    }

    try {
      const result = await adapter.execute<TInput, TOutput>(request, creds ?? undefined)
      const durationMs = Date.now() - start

      // Update account lastSyncAt
      const account = this.store.getAccount(request.accountId)
      if (account) {
        this.store.saveAccount({
          ...account,
          status: 'CONNECTED',
          lastSyncAt: new Date().toISOString(),
          lastError: undefined,
          updatedAt: new Date().toISOString(),
        })
      }

      this.store.logAudit({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        connectorId: request.connectorId,
        accountId: request.accountId,
        capabilityId: request.capabilityId,
        actorType: request.actor.type,
        actorId: request.actor.id,
        authority: request.authority,
        action: 'EXECUTE',
        success: true,
        durationMs,
        sanitizedInputSummary: this.summarizeInput(request.input),
        sanitizedOutputSummary: `Read ${result.recordsRead ?? 0} records`,
      })

      return result
    } catch (error) {
      const durationMs = Date.now() - start
      const connErr =
        error instanceof ConnectorError
          ? error
          : new ConnectorError({
              code: 'PROVIDER_ERROR',
              message: (error as Error).message || 'Unknown execution error',
              retryable: false,
            })

      if (connErr.code === 'REAUTH_REQUIRED' || connErr.code === 'AUTH_REQUIRED') {
        this.store.updateAccountStatus(request.accountId, 'REAUTH_REQUIRED', connErr.message)
      } else if (connErr.code === 'PROVIDER_ERROR') {
        this.store.updateAccountStatus(request.accountId, 'ERROR', connErr.message)
      }

      this.recordAuditError(request, connErr, durationMs)
      throw connErr
    }
  }

  public getAuditLogs(filter?: {
    connectorId?: ConnectorId
    accountId?: ConnectorAccountId
    limit?: number
  }): readonly ConnectorAuditLogEntry[] {
    return this.store.getAuditLogs(filter)
  }

  private recordAuditError(request: ConnectorExecutionRequest<unknown>, err: ConnectorError, durationMs: number): void {
    this.store.logAudit({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      connectorId: request.connectorId,
      accountId: request.accountId,
      capabilityId: request.capabilityId,
      actorType: request.actor.type,
      actorId: request.actor.id,
      authority: request.authority,
      action: 'EXECUTE',
      success: false,
      durationMs,
      errorCode: err.code,
      errorMessage: this.broker.redactSensitive(err.message),
      sanitizedInputSummary: this.summarizeInput(request.input),
    })
  }

  private summarizeInput(input: unknown): string {
    if (!input) return '(empty)'
    try {
      const str = JSON.stringify(input)
      const sanitized = this.broker.redactSensitive(str)
      return sanitized.length > 200 ? sanitized.slice(0, 197) + '...' : sanitized
    } catch {
      return '(unserializable input)'
    }
  }
}
