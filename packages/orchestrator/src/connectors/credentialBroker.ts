/**
 * Gravitas Orchestrator — Credential Broker
 *
 * Wave 12J Architectural Specification
 *
 * Strict Invariants:
 * 1. ZERO raw OAuth tokens in prompts, agent context, public contracts, UI payloads, or runtime projections.
 * 2. Credential resolution is strictly in-process and on-demand.
 * 3. Token refresh happens securely within the broker without exposing refresh tokens outward.
 * 4. Token redaction is applied to all outbound error strings and diagnostic summaries.
 */

import type { ConnectorAccountId, ConnectorProviderId } from '@gravitas/core'
import type { CredentialHandle, ResolvedCredentials, StoredCredentials } from './types.js'

export type TokenRefreshHandler = (
  stored: StoredCredentials,
) => Promise<{ accessToken: string; expiresAt?: number; refreshToken?: string }>

export class CredentialBroker {
  private readonly vault = new Map<ConnectorAccountId, StoredCredentials>()
  private readonly refreshHandlers = new Map<ConnectorProviderId, TokenRefreshHandler>()

  public constructor() {}

  /**
   * Register a provider-specific token refresh handler.
   */
  public registerRefreshHandler(provider: ConnectorProviderId, handler: TokenRefreshHandler): void {
    this.refreshHandlers.set(provider, handler)
  }

  /**
   * Store credentials securely in the memory vault.
   */
  public setCredentials(credentials: StoredCredentials): void {
    this.vault.set(credentials.accountId, { ...credentials })
  }

  /**
   * Remove credentials for an account upon disconnect.
   */
  public deleteCredentials(accountId: ConnectorAccountId): boolean {
    return this.vault.delete(accountId)
  }

  /**
   * Check whether credentials exist without reading secrets.
   */
  public hasCredentials(accountId: ConnectorAccountId): boolean {
    return this.vault.has(accountId)
  }

  /**
   * Return an opaque handle containing ONLY non-sensitive metadata.
   */
  public getCredentialHandle(accountId: ConnectorAccountId): CredentialHandle | null {
    const creds = this.vault.get(accountId)
    if (!creds) return null

    const now = Date.now()
    const isExpired = creds.expiresAt ? now >= creds.expiresAt : false

    return {
      accountId: creds.accountId,
      provider: creds.provider,
      hasAccessToken: Boolean(creds.accessToken && creds.accessToken.length > 0),
      hasRefreshToken: Boolean(creds.refreshToken && creds.refreshToken.length > 0),
      expiresAt: creds.expiresAt,
      isExpired,
      scopes: creds.scopes ?? [],
    }
  }

  /**
   * Resolve live credentials for adapter execution, automatically refreshing if expired
   * or within a 5-minute safety threshold.
   */
  public async getResolvedCredentials(
    accountId: ConnectorAccountId,
    forceRefresh = false,
  ): Promise<ResolvedCredentials | null> {
    const creds = this.vault.get(accountId)
    if (!creds) return null

    const now = Date.now()
    const bufferMs = 5 * 60 * 1000 // 5 minutes safety buffer
    const shouldRefresh = forceRefresh || (creds.expiresAt !== undefined && now + bufferMs >= creds.expiresAt)

    if (shouldRefresh && creds.refreshToken) {
      const handler = this.refreshHandlers.get(creds.provider)
      if (handler) {
        try {
          const refreshed = await handler(creds)
          const updated: StoredCredentials = {
            ...creds,
            accessToken: refreshed.accessToken,
            expiresAt: refreshed.expiresAt,
            refreshToken: refreshed.refreshToken ?? creds.refreshToken,
            updatedAt: new Date().toISOString(),
          }
          this.vault.set(accountId, updated)
          return {
            accountId: updated.accountId,
            provider: updated.provider,
            accessToken: updated.accessToken,
            refreshToken: updated.refreshToken,
            expiresAt: updated.expiresAt,
            tokenType: updated.tokenType,
            scopes: updated.scopes,
            clientId: updated.clientId,
            clientSecret: updated.clientSecret,
          }
        } catch {
          // If refresh fails and token is already expired, return null so caller sees AUTH_REQUIRED / REAUTH_REQUIRED
          if (creds.expiresAt !== undefined && now >= creds.expiresAt) {
            return null
          }
        }
      }
    }

    return {
      accountId: creds.accountId,
      provider: creds.provider,
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken,
      expiresAt: creds.expiresAt,
      tokenType: creds.tokenType,
      scopes: creds.scopes,
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
    }
  }

  /**
   * Redact known secrets (tokens, refresh tokens, client secrets) from any text or logs.
   */
  public redactSensitive(text: string): string {
    if (!text) return text
    let sanitized = text

    // Redact Bearer tokens: Bearer ya29.xxx or Bearer [any-string]
    sanitized = sanitized.replace(/Bearer\s+([A-Za-z0-9_\-\.]+)/gi, 'Bearer [REDACTED]')

    // Redact any actual values in vault
    for (const cred of this.vault.values()) {
      if (cred.accessToken && cred.accessToken.length > 5) {
        sanitized = sanitized.split(cred.accessToken).join('[REDACTED]')
      }
      if (cred.refreshToken && cred.refreshToken.length > 5) {
        sanitized = sanitized.split(cred.refreshToken).join('[REDACTED]')
      }
      if (cred.clientSecret && cred.clientSecret.length > 5) {
        sanitized = sanitized.split(cred.clientSecret).join('[REDACTED]')
      }
    }

    // Generic OAuth/token query params and JSON fields
    sanitized = sanitized.replace(/"access_token"\s*:\s*"[^"]+"/gi, '"access_token": "[REDACTED]"')
    sanitized = sanitized.replace(/"refresh_token"\s*:\s*"[^"]+"/gi, '"refresh_token": "[REDACTED]"')
    sanitized = sanitized.replace(/"client_secret"\s*:\s*"[^"]+"/gi, '"client_secret": "[REDACTED]"')
    sanitized = sanitized.replace(/access_token=[^&\s]+/gi, 'access_token=[REDACTED]')
    sanitized = sanitized.replace(/refresh_token=[^&\s]+/gi, 'refresh_token=[REDACTED]')
    sanitized = sanitized.replace(/client_secret=[^&\s]+/gi, 'client_secret=[REDACTED]')

    return sanitized
  }

  /**
   * Clear all stored credentials (for testing or full reset).
   */
  public clear(): void {
    this.vault.clear()
  }
}
