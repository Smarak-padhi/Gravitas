/**
 * Gravitas Orchestrator — SQLite Connector Store
 *
 * Wave 12J Architectural Specification
 *
 * Implements:
 * 1. connector_accounts: tracks provisioned accounts and granted scopes (NO TOKENS).
 * 2. connector_audit_log: strictly sanitized audit trail of all connector interactions.
 * 3. connector_sync_state: incremental sync metadata and syncTokens.
 * 4. WAL mode, foreign keys ON, versioned migrations.
 */

import { DatabaseSync } from 'node:sqlite'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type {
  ConnectorAccount,
  ConnectorAccountId,
  ConnectorId,
  ConnectorStatus,
} from '@gravitas/core'
import type { ConnectorAuditLogEntry, ConnectorSyncState } from './types.js'

interface AccountRow {
  readonly id: string
  readonly connector_id: string
  readonly provider_account_id: string
  readonly display_label: string
  readonly status: string
  readonly granted_scopes_json: string
  readonly created_at: string
  readonly updated_at: string
  readonly last_sync_at: string | null
  readonly last_error: string | null
}

interface AuditLogRow {
  readonly id: string
  readonly timestamp: string
  readonly connector_id: string
  readonly account_id: string | null
  readonly capability_id: string | null
  readonly actor_type: string
  readonly actor_id: string
  readonly authority: string
  readonly action: string
  readonly success: number
  readonly duration_ms: number
  readonly sanitized_input_summary: string | null
  readonly sanitized_output_summary: string | null
  readonly error_code: string | null
  readonly error_message: string | null
}

interface SyncStateRow {
  readonly connector_id: string
  readonly account_id: string
  readonly resource_type: string
  readonly sync_token: string | null
  readonly last_sync_at: string
  readonly record_count: number
}

export class SqliteConnectorStore {
  private readonly db: DatabaseSync
  private readonly ownsDb: boolean

  public constructor(databasePathOrDb: string | DatabaseSync = ':memory:') {
    if (typeof databasePathOrDb === 'string') {
      this.ownsDb = true
      if (databasePathOrDb !== ':memory:') {
        const dir = path.dirname(path.resolve(databasePathOrDb))
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
      }
      this.db = new DatabaseSync(databasePathOrDb)
      this.initPragmas()
    } else {
      this.ownsDb = false
      this.db = databasePathOrDb
    }
    this.runMigrations()
  }

  private initPragmas(): void {
    this.db.exec('PRAGMA foreign_keys = ON;')
    this.db.exec('PRAGMA journal_mode = WAL;')
    this.db.exec('PRAGMA busy_timeout = 5000;')
  }

  private runMigrations(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS connector_accounts (
        id TEXT PRIMARY KEY,
        connector_id TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        display_label TEXT NOT NULL,
        status TEXT NOT NULL,
        granted_scopes_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_sync_at TEXT,
        last_error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_conn_accounts_connector ON connector_accounts(connector_id);
      CREATE INDEX IF NOT EXISTS idx_conn_accounts_status ON connector_accounts(status);

      CREATE TABLE IF NOT EXISTS connector_audit_log (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        connector_id TEXT NOT NULL,
        account_id TEXT,
        capability_id TEXT,
        actor_type TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        authority TEXT NOT NULL,
        action TEXT NOT NULL,
        success INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        sanitized_input_summary TEXT,
        sanitized_output_summary TEXT,
        error_code TEXT,
        error_message TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_conn_audit_conn_id ON connector_audit_log(connector_id);
      CREATE INDEX IF NOT EXISTS idx_conn_audit_account_id ON connector_audit_log(account_id);
      CREATE INDEX IF NOT EXISTS idx_conn_audit_timestamp ON connector_audit_log(timestamp);

      CREATE TABLE IF NOT EXISTS connector_sync_state (
        connector_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        sync_token TEXT,
        last_sync_at TEXT NOT NULL,
        record_count INTEGER NOT NULL,
        PRIMARY KEY (connector_id, account_id, resource_type)
      );
    `)
  }

  // ==========================================================================
  // Accounts
  // ==========================================================================

  public saveAccount(account: ConnectorAccount): void {
    const stmt = this.db.prepare(`
      INSERT INTO connector_accounts (
        id, connector_id, provider_account_id, display_label, status,
        granted_scopes_json, created_at, updated_at, last_sync_at, last_error
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        display_label = excluded.display_label,
        status = excluded.status,
        granted_scopes_json = excluded.granted_scopes_json,
        updated_at = excluded.updated_at,
        last_sync_at = excluded.last_sync_at,
        last_error = excluded.last_error;
    `)

    stmt.run(
      account.id,
      account.connectorId,
      account.providerAccountId,
      account.displayLabel,
      account.status,
      JSON.stringify(account.grantedScopes ?? []),
      account.createdAt,
      account.updatedAt,
      account.lastSyncAt ?? null,
      account.lastError ?? null,
    )
  }

  public getAccount(id: ConnectorAccountId): ConnectorAccount | null {
    const stmt = this.db.prepare('SELECT * FROM connector_accounts WHERE id = ?')
    const row = stmt.get(id) as unknown as AccountRow | undefined
    if (!row) return null
    return this.mapAccountRow(row)
  }

  public listAccounts(connectorId?: ConnectorId): readonly ConnectorAccount[] {
    if (connectorId) {
      const stmt = this.db.prepare('SELECT * FROM connector_accounts WHERE connector_id = ? ORDER BY created_at ASC')
      const rows = stmt.all(connectorId) as unknown as AccountRow[]
      return rows.map((r) => this.mapAccountRow(r))
    }
    const stmt = this.db.prepare('SELECT * FROM connector_accounts ORDER BY created_at ASC')
    const rows = stmt.all() as unknown as AccountRow[]
    return rows.map((r) => this.mapAccountRow(r))
  }

  public deleteAccount(id: ConnectorAccountId): boolean {
    const stmt = this.db.prepare('DELETE FROM connector_accounts WHERE id = ?')
    const res = stmt.run(id) as { changes?: number }
    return (res.changes ?? 0) > 0
  }

  public updateAccountStatus(id: ConnectorAccountId, status: ConnectorStatus, lastError?: string): void {
    const stmt = this.db.prepare(`
      UPDATE connector_accounts
      SET status = ?, last_error = ?, updated_at = ?
      WHERE id = ?
    `)
    stmt.run(status, lastError ?? null, new Date().toISOString(), id)
  }

  // ==========================================================================
  // Audit Logs
  // ==========================================================================

  public logAudit(entry: ConnectorAuditLogEntry): void {
    const stmt = this.db.prepare(`
      INSERT INTO connector_audit_log (
        id, timestamp, connector_id, account_id, capability_id,
        actor_type, actor_id, authority, action, success,
        duration_ms, sanitized_input_summary, sanitized_output_summary,
        error_code, error_message
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `)

    stmt.run(
      entry.id,
      entry.timestamp,
      entry.connectorId,
      entry.accountId ?? null,
      entry.capabilityId ?? null,
      entry.actorType,
      entry.actorId,
      entry.authority,
      entry.action,
      entry.success ? 1 : 0,
      entry.durationMs,
      entry.sanitizedInputSummary ?? null,
      entry.sanitizedOutputSummary ?? null,
      entry.errorCode ?? null,
      entry.errorMessage ?? null,
    )
  }

  public getAuditLogs(filter?: {
    connectorId?: ConnectorId
    accountId?: ConnectorAccountId
    limit?: number
  }): readonly ConnectorAuditLogEntry[] {
    let query = 'SELECT * FROM connector_audit_log'
    const clauses: string[] = []
    const params: (string | number)[] = []

    if (filter?.connectorId) {
      clauses.push('connector_id = ?')
      params.push(filter.connectorId)
    }
    if (filter?.accountId) {
      clauses.push('account_id = ?')
      params.push(filter.accountId)
    }

    if (clauses.length > 0) {
      query += ' WHERE ' + clauses.join(' AND ')
    }

    query += ' ORDER BY timestamp DESC LIMIT ?'
    params.push(filter?.limit ?? 50)

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params) as unknown as AuditLogRow[]
    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      connectorId: r.connector_id,
      accountId: r.account_id ?? undefined,
      capabilityId: r.capability_id ?? undefined,
      actorType: r.actor_type as 'OPERATOR' | 'JOB' | 'ROLE',
      actorId: r.actor_id,
      authority: r.authority,
      action: r.action as ConnectorAuditLogEntry['action'],
      success: Boolean(r.success),
      durationMs: r.duration_ms,
      sanitizedInputSummary: r.sanitized_input_summary ?? undefined,
      sanitizedOutputSummary: r.sanitized_output_summary ?? undefined,
      errorCode: r.error_code ?? undefined,
      errorMessage: r.error_message ?? undefined,
    }))
  }

  // ==========================================================================
  // Sync State
  // ==========================================================================

  public saveSyncState(state: ConnectorSyncState): void {
    const stmt = this.db.prepare(`
      INSERT INTO connector_sync_state (
        connector_id, account_id, resource_type, sync_token, last_sync_at, record_count
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(connector_id, account_id, resource_type) DO UPDATE SET
        sync_token = excluded.sync_token,
        last_sync_at = excluded.last_sync_at,
        record_count = excluded.record_count;
    `)

    stmt.run(
      state.connectorId,
      state.accountId,
      state.resourceType,
      state.syncToken ?? null,
      state.lastSyncAt,
      state.recordCount,
    )
  }

  public getSyncState(
    connectorId: ConnectorId,
    accountId: ConnectorAccountId,
    resourceType: string,
  ): ConnectorSyncState | null {
    const stmt = this.db.prepare(`
      SELECT * FROM connector_sync_state
      WHERE connector_id = ? AND account_id = ? AND resource_type = ?
    `)
    const row = stmt.get(connectorId, accountId, resourceType) as unknown as SyncStateRow | undefined
    if (!row) return null
    return {
      connectorId: row.connector_id,
      accountId: row.account_id,
      resourceType: row.resource_type,
      syncToken: row.sync_token ?? undefined,
      lastSyncAt: row.last_sync_at,
      recordCount: row.record_count,
    }
  }

  public close(): void {
    if (this.ownsDb) {
      this.db.close()
    }
  }

  private mapAccountRow(row: AccountRow): ConnectorAccount {
    return {
      id: row.id,
      connectorId: row.connector_id,
      providerAccountId: row.provider_account_id,
      displayLabel: row.display_label,
      status: row.status as ConnectorStatus,
      grantedScopes: JSON.parse(row.granted_scopes_json || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSyncAt: row.last_sync_at ?? undefined,
      lastError: row.last_error ?? undefined,
    }
  }
}
