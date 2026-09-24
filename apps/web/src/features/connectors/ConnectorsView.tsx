import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import type {
  ConnectorDescriptor,
  ConnectorAccount,
  ConnectorAuditLogEntry,
} from '../../api/types.js'

export const ConnectorsView: React.FC = () => {
  const [connectors, setConnectors] = useState<readonly ConnectorDescriptor[]>([])
  const [accountsByConnector, setAccountsByConnector] = useState<Record<string, readonly ConnectorAccount[]>>({})
  const [auditLogs, setAuditLogs] = useState<readonly ConnectorAuditLogEntry[]>([])
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('calendar-mock')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Modals & Panels
  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false)
  const [showAuditDrawer, setShowAuditDrawer] = useState<boolean>(false)
  const [healthStatusMessage, setHealthStatusMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Add Account Form
  const [formProviderAccountId, setFormProviderAccountId] = useState<string>('')
  const [formDisplayLabel, setFormDisplayLabel] = useState<string>('')
  const [formAccessToken, setFormAccessToken] = useState<string>('')
  const [formRefreshToken, setFormRefreshToken] = useState<string>('')
  const [formClientId, setFormClientId] = useState<string>('')
  const [formClientSecret, setFormClientSecret] = useState<string>('')

  const fetchConnectorsData = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await api.listConnectors()
      setConnectors(res.connectors)

      const accountsMap: Record<string, readonly ConnectorAccount[]> = {}
      for (const conn of res.connectors) {
        const accsRes = await api.listConnectorAccounts(conn.id)
        accountsMap[conn.id] = accsRes.accounts
      }
      setAccountsByConnector(accountsMap)

      const auditRes = await api.getConnectorAuditLogs({ limit: 40 })
      setAuditLogs(auditRes.auditLogs)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch connectors')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchConnectorsData()
    const timer = setInterval(fetchConnectorsData, 5000)
    return () => clearInterval(timer)
  }, [fetchConnectorsData])

  const handleHealthCheck = async (connectorId: string) => {
    try {
      setHealthStatusMessage('Running health check...')
      const res = await api.checkConnectorHealth(connectorId)
      setHealthStatusMessage(`Health check: ${res.status} (${res.healthy ? 'OK' : res.message || 'Issue detected'})`)
      await fetchConnectorsData()
      setTimeout(() => setHealthStatusMessage(null), 4000)
    } catch (err) {
      setHealthStatusMessage(`Health check failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleDisconnect = async (connectorId: string, accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account? In-memory tokens will be purged.')) {
      return
    }
    try {
      await api.disconnectConnectorAccount(connectorId, accountId)
      await fetchConnectorsData()
    } catch (err) {
      alert(`Disconnect failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formProviderAccountId.trim() || !formDisplayLabel.trim()) return

    try {
      setIsSubmitting(true)
      const credentials: Record<string, unknown> = {}
      if (formAccessToken.trim()) credentials.accessToken = formAccessToken.trim()
      if (formRefreshToken.trim()) credentials.refreshToken = formRefreshToken.trim()
      if (formClientId.trim()) credentials.clientId = formClientId.trim()
      if (formClientSecret.trim()) credentials.clientSecret = formClientSecret.trim()

      await api.provisionConnectorAccount(selectedConnectorId, {
        id: formProviderAccountId.trim(),
        providerAccountId: formProviderAccountId.trim(),
        displayLabel: formDisplayLabel.trim(),
        grantedScopes: ['calendar.readonly'],
        credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
      })

      setShowAddAccountModal(false)
      setFormProviderAccountId('')
      setFormDisplayLabel('')
      setFormAccessToken('')
      setFormRefreshToken('')
      setFormClientId('')
      setFormClientSecret('')
      await fetchConnectorsData()
    } catch (err) {
      alert(`Provision account failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedConnector = connectors.find((c) => c.id === selectedConnectorId) || connectors[0]
  const selectedAccounts = selectedConnector ? accountsByConnector[selectedConnector.id] || [] : []

  return (
    <div
      data-testid="connectors-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg-canvas, #090d16)',
        color: 'var(--text-primary, #f1f5f9)',
        overflowY: 'auto',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 data-testid="connectors-title" style={{ margin: 0, fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em' }}>
              Connected External Capabilities
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              Wave 12J: Calendar Foundation
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>
            Bounded capability transport layer. Connectors execute with least-privilege authority under strict credential isolation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowAuditDrawer(!showAuditDrawer)}
            data-testid="open-audit-drawer-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '8px 14px',
              color: '#e2e8f0',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            📋 Audit Trail ({auditLogs.length})
          </button>
          <button
            onClick={() => setShowAddAccountModal(true)}
            data-testid="add-account-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
            }}
          >
            {isLoading && (
              <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>Loading...</span>
            )}
            + Connect Account
          </button>
        </div>
      </div>

      {error && (
        <div
          data-testid="connector-error-banner"
          style={{
            marginBottom: '16px',
            padding: '10px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '13px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {healthStatusMessage && (
        <div
          data-testid="health-status-banner"
          style={{
            marginBottom: '16px',
            padding: '10px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#93c5fd',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          ℹ️ {healthStatusMessage}
        </div>
      )}

      {/* Connector Selector Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {connectors.map((c) => {
          const isSelected = c.id === selectedConnectorId
          const accountsCount = (accountsByConnector[c.id] || []).length
          const isConnected = c.status === 'CONNECTED'
          return (
            <div
              key={c.id}
              onClick={() => setSelectedConnectorId(c.id)}
              data-testid={`connector-tab-${c.id}`}
              style={{
                flex: 1,
                maxWidth: '360px',
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: isSelected ? 'rgba(30, 41, 59, 0.8)' : 'rgba(15, 23, 42, 0.5)',
                border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                  {c.id === 'calendar-google' ? '📅 Google Calendar' : '⚙️ Deterministic Calendar Mock'}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '6px',
                    backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                    color: isConnected ? '#34d399' : '#94a3b8',
                    border: isConnected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)',
                  }}
                >
                  {c.status}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '16px' }}>
                <span>{accountsCount} {accountsCount === 1 ? 'Account' : 'Accounts'}</span>
                <span>{c.capabilities.length} Capabilities</span>
                <span>v{c.version}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Area */}
      {selectedConnector && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          {/* Left Column: Accounts & Capabilities */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Accounts Panel */}
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Connected Accounts</h2>
                <button
                  onClick={() => handleHealthCheck(selectedConnector.id)}
                  data-testid="check-health-btn"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: '#cbd5e1',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Check Health
                </button>
              </div>

              {selectedAccounts.length === 0 ? (
                <div
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '13px',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                  }}
                >
                  No accounts connected for this provider. Click "+ Connect Account" above to link an account.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      data-testid={`account-item-${acc.id}`}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                            {acc.displayLabel}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                            }}
                          >
                            {acc.status}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {acc.providerAccountId}
                        </span>
                        {acc.lastSyncAt && (
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Last synced: {new Date(acc.lastSyncAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          onClick={() => handleDisconnect(selectedConnector.id, acc.id)}
                          data-testid={`disconnect-btn-${acc.id}`}
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            color: '#f87171',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Capabilities Table */}
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '20px',
              }}
            >
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Bounded Capabilities</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '8px 12px' }}>Capability</th>
                    <th style={{ padding: '8px 12px' }}>Authority</th>
                    <th style={{ padding: '8px 12px' }}>Context Domain</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedConnector.capabilities.map((cap) => (
                    <tr
                      key={cap.id}
                      data-testid={`capability-item-${cap.id}`}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#e2e8f0' }}>
                        {cap.id}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: cap.authority === 'READ' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: cap.authority === 'READ' ? '#60a5fa' : '#fbbf24',
                          }}
                        >
                          {cap.authority}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>
                        {cap.domain}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: cap.readyInWave === '12J' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                            color: cap.readyInWave === '12J' ? '#34d399' : '#94a3b8',
                          }}
                        >
                          {cap.readyInWave === '12J' ? 'Ready (Wave 12J)' : 'Reserved (Future Wave)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Security Guarantees & Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '20px',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                🔒 Credential Boundary Guarantees
              </h3>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#94a3b8', fontSize: '12px', lineHeight: 1.6 }}>
                <li>Raw OAuth access/refresh tokens are stored in the memory vault only.</li>
                <li>Zero token leakage into agent prompts, public APIs, or UI states.</li>
                <li>Write actions require sovereign human approval; Wave 12J executes strictly READ.</li>
                <li>All executions append sanitized records to SQLite audit log.</li>
              </ul>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '20px',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                ⚡ Zone 5 Server Bay Terminal
              </h3>
              <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '12px', lineHeight: 1.5 }}>
                In 3D HQ, connectors are represented as capability transport terminals at Station 5 (Server Bay). Connectors are bounded bridges, not autonomous agent roles.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Drawer */}
      {showAuditDrawer && (
        <div
          data-testid="audit-trail-drawer"
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: '560px',
            backgroundColor: '#0f172a',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Connector Audit Trail</h2>
            <button
              onClick={() => setShowAuditDrawer(false)}
              data-testid="close-audit-drawer-btn"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '18px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#94a3b8' }}>
            Append-only record of all connector requests. Tokens and credential data are sanitized prior to storage.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {auditLogs.map((log) => (
              <div
                key={log.id}
                data-testid="audit-entry"
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: log.success ? '#34d399' : '#f87171' }}>
                    {log.action} — {log.connectorId}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {log.capabilityId && (
                  <span style={{ fontFamily: 'monospace', color: '#93c5fd' }}>
                    {log.capabilityId}
                  </span>
                )}
                {log.sanitizedOutputSummary && (
                  <span style={{ color: '#cbd5e1' }}>{log.sanitizedOutputSummary}</span>
                )}
                {log.errorMessage && (
                  <span style={{ color: '#f87171' }}>Error: {log.errorMessage}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div
          data-testid="add-account-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '24px',
              width: '480px',
              maxWidth: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                Link {selectedConnector.displayName}
              </h2>
              <button
                onClick={() => setShowAddAccountModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Account Identifier (Email / Username)
                </label>
                <input
                  type="text"
                  required
                  data-testid="input-account-id"
                  placeholder="e.g. operator@company.com"
                  value={formProviderAccountId}
                  onChange={(e) => setFormProviderAccountId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Display Label
                </label>
                <input
                  type="text"
                  required
                  data-testid="input-account-label"
                  placeholder="e.g. Work Calendar"
                  value={formDisplayLabel}
                  onChange={(e) => setFormDisplayLabel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  OAuth Access Token (or Mock Token)
                </label>
                <input
                  type="password"
                  data-testid="input-access-token"
                  placeholder="ya29.xxx or mock-token"
                  value={formAccessToken}
                  onChange={(e) => setFormAccessToken(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  OAuth Refresh Token (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Refresh token for auto-renewal"
                  value={formRefreshToken}
                  onChange={(e) => setFormRefreshToken(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    color: '#cbd5e1',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-account-btn"
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: '#2563eb',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'Linking...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
