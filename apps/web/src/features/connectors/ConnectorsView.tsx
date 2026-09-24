import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import type {
  ConnectorDescriptor,
  ConnectorAccount,
  ConnectorAuditLogEntry,
} from '../../api/types.js'
import { Icons } from '../../design-system/components/Icons.js'

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

  // Add Account Form (Mock / Dev Fixture)
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
      setHealthStatusMessage('Running capability health probe...')
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
        backgroundColor: 'var(--bg-app, #0a0e17)',
        color: 'var(--text-primary, #f1f5f9)',
        overflowY: 'auto',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        padding: '24px 32px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header / Mission Strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          paddingBottom: '20px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1
              data-testid="connectors-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-display, "Space Grotesk", sans-serif)',
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary, #f8fafc)',
              }}
            >
              Connected External Capabilities
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm, 4px)',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--brand-primary, #60a5fa)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              Wave 12J: Calendar Foundation
            </span>
          </div>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '13px',
              color: 'var(--text-secondary, #94a3b8)',
              maxWidth: '720px',
              lineHeight: 1.45,
            }}
          >
            Bounded capability transport layer. Connectors execute with least-privilege authority under strict credential isolation.
            ROLE ≠ HARNESS ≠ PROVIDER/MODEL ≠ CONNECTOR ≠ EXTERNAL ACCOUNT.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowAuditDrawer(!showAuditDrawer)}
            data-testid="open-audit-drawer-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-panel-elevated, #161f33)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
              borderRadius: 'var(--radius-md, 6px)',
              padding: '7px 14px',
              color: 'var(--text-secondary, #cbd5e1)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 150ms ease',
            }}
          >
            <Icons.Shield size={13} color="currentColor" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setShowAddAccountModal(true)}
            data-testid="add-account-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--brand-primary, #3b82f6)',
              border: 'none',
              borderRadius: 'var(--radius-md, 6px)',
              padding: '7px 16px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
              transition: 'background-color 150ms ease',
            }}
          >
            {isLoading && (
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>Syncing...</span>
            )}
            <span>+ Connect Account</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          data-testid="connector-error-banner"
          style={{
            marginBottom: '16px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md, 6px)',
            backgroundColor: 'var(--state-failure-bg, rgba(239, 68, 68, 0.12))',
            border: '1px solid var(--state-failure-border, rgba(239, 68, 68, 0.3))',
            color: 'var(--state-failure-fg, #f87171)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icons.Alert size={14} color="currentColor" />
          <span>{error}</span>
        </div>
      )}

      {healthStatusMessage && (
        <div
          data-testid="health-status-banner"
          style={{
            marginBottom: '16px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md, 6px)',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: 'var(--brand-primary, #93c5fd)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icons.Pulse size={14} color="currentColor" />
          <span>{healthStatusMessage}</span>
        </div>
      )}

      {/* Connector Selector Tabs */}
      <div className="connectors-card-grid" style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
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
                maxWidth: '380px',
                padding: '16px',
                borderRadius: 'var(--radius-md, 6px)',
                backgroundColor: isSelected
                  ? 'var(--bg-panel-elevated, #161f33)'
                  : 'var(--bg-panel, #0f1422)',
                border: isSelected
                  ? '1px solid var(--border-focus, #3b82f6)'
                  : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: isSelected ? '0 0 16px rgba(59, 130, 246, 0.12)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {c.id === 'calendar-google' ? (
                    <Icons.Calendar size={15} color="var(--brand-primary, #60a5fa)" />
                  ) : (
                    <Icons.Connector size={15} color="var(--state-success-fg, #34d399)" />
                  )}
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                    {c.id === 'calendar-google' ? 'Google Calendar' : 'Deterministic Calendar Mock'}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm, 4px)',
                    backgroundColor: isConnected
                      ? 'var(--state-success-bg, rgba(16, 185, 129, 0.15))'
                      : 'rgba(148, 163, 184, 0.12)',
                    color: isConnected ? 'var(--state-success-fg, #34d399)' : 'var(--text-muted, #94a3b8)',
                    border: isConnected
                      ? '1px solid rgba(16, 185, 129, 0.3)'
                      : '1px solid rgba(148, 163, 184, 0.2)',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {c.status}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', display: 'flex', gap: '14px', fontFamily: 'var(--font-mono, monospace)' }}>
                <span>{accountsCount} {accountsCount === 1 ? 'Account' : 'Accounts'}</span>
                <span>•</span>
                <span>{c.capabilities.length} Capabilities</span>
                <span>•</span>
                <span>v{c.version}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Area */}
      {selectedConnector && (
        <div className="connectors-main-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
          {/* Left Column: Accounts & Capabilities */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Accounts Panel */}
            <div
              style={{
                backgroundColor: 'var(--bg-panel, #0f1422)',
                borderRadius: 'var(--radius-md, 6px)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                    Connected Accounts ({selectedAccounts.length})
                  </h2>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                    Opaque identities authenticated via credential boundary.
                  </div>
                </div>
                <button
                  onClick={() => handleHealthCheck(selectedConnector.id)}
                  data-testid="check-health-btn"
                  style={{
                    backgroundColor: 'var(--bg-panel-elevated, #161f33)',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                    borderRadius: 'var(--radius-sm, 4px)',
                    padding: '5px 10px',
                    color: 'var(--text-secondary, #cbd5e1)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Icons.Pulse size={12} color="currentColor" />
                  <span>Check Health</span>
                </button>
              </div>

              {selectedAccounts.length === 0 ? (
                selectedConnector.id === 'calendar-google' ? (
                  /* Google Calendar Production OAuth State: Visibly Unconfigured with clear architecture */
                  <div
                    style={{
                      padding: '24px',
                      backgroundColor: 'var(--bg-panel-subtle, rgba(15, 20, 34, 0.5))',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
                      borderRadius: 'var(--radius-md, 6px)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icons.Lock size={16} color="var(--state-verifying-fg, #fbbf24)" />
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary, #f8fafc)' }}>
                          Google Calendar OAuth 2.0 Integration
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm, 4px)',
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: 'var(--state-verifying-fg, #fbbf24)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      >
                        UNCONFIGURED
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>
                      Production Google Calendar operates under OAuth 2.0 PKCE consent with strict token confidentiality.
                      Raw access and refresh tokens are strictly prohibited from being manually entered into client forms.
                    </p>

                    {/* Architecture Flow Sequence */}
                    <div
                      style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--bg-panel-elevated, #161f33)',
                        borderRadius: 'var(--radius-sm, 4px)',
                        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                        fontSize: '11px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '10px' }}>
                        Intended Production OAuth Flow:
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #cbd5e1)' }}>
                        <span style={{ color: 'var(--brand-primary, #60a5fa)', fontFamily: 'var(--font-mono)' }}>01</span>
                        <span>Operator clicks "Connect Google Calendar" → browser redirects to Google OAuth Consent</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #cbd5e1)' }}>
                        <span style={{ color: 'var(--brand-primary, #60a5fa)', fontFamily: 'var(--font-mono)' }}>02</span>
                        <span>Google verifies scopes (<code>calendar.readonly</code>) & redirects to Gravitas OAuth callback</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #cbd5e1)' }}>
                        <span style={{ color: 'var(--brand-primary, #60a5fa)', fontFamily: 'var(--font-mono)' }}>03</span>
                        <span>Secure Credential Boundary exchanges authorization code & encrypts tokens in isolated memory</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #cbd5e1)' }}>
                        <span style={{ color: 'var(--brand-primary, #60a5fa)', fontFamily: 'var(--font-mono)' }}>04</span>
                        <span>Frontend receives opaque connected-account reference; zero credentials enter web client DOM</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        disabled
                        title="Google OAuth Client ID & Secret must be configured in environment before enabling real OAuth consent"
                        style={{
                          padding: '7px 14px',
                          borderRadius: 'var(--radius-sm, 4px)',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'var(--text-muted, #64748b)',
                          fontSize: '11px',
                          cursor: 'not-allowed',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        Authorize Google Calendar (Requires Cloud Client)
                      </button>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                        For development testing, select Deterministic Calendar Mock.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '32px',
                      textAlign: 'center',
                      color: 'var(--text-muted, #64748b)',
                      fontSize: '13px',
                      border: '1px dashed var(--border-color, rgba(255, 255, 255, 0.1))',
                      borderRadius: 'var(--radius-md, 6px)',
                    }}
                  >
                    No accounts connected for this provider. Click "+ Connect Account" above to link a synthetic fixture.
                  </div>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      data-testid={`account-item-${acc.id}`}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm, 4px)',
                        backgroundColor: 'var(--bg-panel-elevated, #161f33)',
                        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                            {acc.displayLabel}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-sm, 4px)',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: 'var(--state-success-fg, #34d399)',
                              fontFamily: 'var(--font-mono, monospace)',
                            }}
                          >
                            {acc.status}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontFamily: 'var(--font-mono, monospace)' }}>
                          {acc.providerAccountId}
                        </span>
                        {acc.lastSyncAt && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)' }}>
                            Last synchronized: {new Date(acc.lastSyncAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          onClick={() => handleDisconnect(selectedConnector.id, acc.id)}
                          data-testid={`disconnect-btn-${acc.id}`}
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 'var(--radius-sm, 4px)',
                            padding: '4px 10px',
                            color: 'var(--state-failure-fg, #f87171)',
                            fontSize: '11px',
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
              className="responsive-table-scroll"
              style={{
                backgroundColor: 'var(--bg-panel, #0f1422)',
                borderRadius: 'var(--radius-md, 6px)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                padding: '20px',
              }}
            >
              <h2 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                Bounded Capabilities
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '480px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))', textAlign: 'left', color: 'var(--text-muted, #94a3b8)' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Capability</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Authority</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Context Domain</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedConnector.capabilities.map((cap) => (
                    <tr
                      key={cap.id}
                      data-testid={`capability-item-${cap.id}`}
                      style={{
                        borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.04))',
                      }}
                    >
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-primary, #f1f5f9)' }}>
                        {cap.id}
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm, 4px)',
                            backgroundColor: cap.authority === 'READ' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: cap.authority === 'READ' ? 'var(--brand-primary, #60a5fa)' : 'var(--state-verifying-fg, #fbbf24)',
                            fontFamily: 'var(--font-mono, monospace)',
                          }}
                        >
                          {cap.authority}
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px', color: 'var(--text-secondary, #cbd5e1)' }}>
                        {capDomainLabel(cap.domain)}
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-sm, 4px)',
                            backgroundColor: cap.readyInWave === '12J' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                            color: cap.readyInWave === '12J' ? 'var(--state-success-fg, #34d399)' : 'var(--text-muted, #94a3b8)',
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

          {/* Right Column: Security Guarantees & Authority Invariants */}
          <div className="connectors-sidebar-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                backgroundColor: 'var(--bg-panel, #0f1422)',
                borderRadius: 'var(--radius-md, 6px)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                padding: '20px',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Authority & Boundary Invariants
              </h3>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.6 }}>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>ROLE ≠ CONNECTOR:</strong> Connectors are dumb, bounded capability transports. Agents use capabilities through explicit authority grants.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Zero Raw Token Leakage:</strong> Credentials live exclusively in kernel memory. Sanitized audit projections reveal zero secret strings.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>No Speculative Access:</strong> Connectors never poll or read data without an explicit scheduled job or operator intent.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Audit Trail Integrity:</strong> Every capability invocation is deterministically recorded in the hash-linked audit ledger.
                </li>
              </ul>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-panel, #0f1422)',
                borderRadius: 'var(--radius-md, 6px)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                padding: '20px',
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Living HQ Integration
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>
                Connectors are visualized in the 3D Living HQ as physical server machinery inside Server Bay (Zone 5), not humanoid characters. Rack activity LEDs pulse only during active capability execution.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sanitized Audit Trail Drawer */}
      {showAuditDrawer && (
        <div
          data-testid="audit-trail-drawer"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '460px',
            maxWidth: '90vw',
            height: '100%',
            backgroundColor: 'var(--bg-panel, #0f1422)',
            borderLeft: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            zIndex: 100,
            padding: '24px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.5)',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                Connector Audit Trail
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                Deterministic ledger of all capability invocations.
              </div>
            </div>
            <button
              onClick={() => setShowAuditDrawer(false)}
              data-testid="close-audit-drawer-btn"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-secondary, #94a3b8)',
                fontSize: '18px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {auditLogs.map((log) => (
              <div
                key={log.id}
                data-testid="audit-entry"
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  backgroundColor: 'var(--bg-panel-elevated, #161f33)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.05))',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: log.success ? 'var(--state-success-fg, #34d399)' : 'var(--state-failure-fg, #f87171)' }}>
                    {log.action} — {log.connectorId}
                  </span>
                  <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {log.capabilityId && (
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--brand-primary, #93c5fd)' }}>
                    {log.capabilityId}
                  </span>
                )}
                {log.sanitizedOutputSummary && (
                  <span style={{ color: 'var(--text-secondary, #cbd5e1)' }}>{log.sanitizedOutputSummary}</span>
                )}
                {log.errorMessage && (
                  <span style={{ color: 'var(--state-failure-fg, #f87171)' }}>Error: {log.errorMessage}</span>
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
              backgroundColor: 'var(--bg-panel, #111827)',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
              padding: '24px',
              width: '480px',
              maxWidth: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                  {selectedConnector.id === 'calendar-google'
                    ? 'Google Calendar Authorization'
                    : '[DEVELOPMENT / MOCK FIXTURE] Provision Mock Account'}
                </h2>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                  {selectedConnector.id === 'calendar-google'
                    ? 'Production OAuth 2.0 Credential Boundary'
                    : 'Testing fixture for deterministic capability evaluation'}
                </div>
              </div>
              <button
                onClick={() => setShowAddAccountModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-muted, #94a3b8)', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {selectedConnector.id === 'calendar-google' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-sm, 4px)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: 'var(--state-verifying-fg, #fbbf24)',
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Notice:</strong> Production Google Calendar requires OAuth 2.0 credentials (<code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code>) configured on the sovereign backend. Token pasting in client web forms is disabled for security.
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.5 }}>
                  To test calendar synchronization and automation recipes in this environment, switch to the <strong>Deterministic Calendar Mock</strong> connector.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddAccountModal(false)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                      borderRadius: 'var(--radius-sm, 4px)',
                      padding: '7px 14px',
                      color: 'var(--text-secondary, #cbd5e1)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '4px' }}>
                    Account Identifier (Email / ID)
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
                      borderRadius: 'var(--radius-sm, 4px)',
                      backgroundColor: 'var(--bg-panel-subtle, rgba(0, 0, 0, 0.3))',
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                      color: '#f8fafc',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '4px' }}>
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
                      borderRadius: 'var(--radius-sm, 4px)',
                      backgroundColor: 'var(--bg-panel-subtle, rgba(0, 0, 0, 0.3))',
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                      color: '#f8fafc',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '4px' }}>
                    Mock Token (Development Synthetic Credential)
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
                      borderRadius: 'var(--radius-sm, 4px)',
                      backgroundColor: 'var(--bg-panel-subtle, rgba(0, 0, 0, 0.3))',
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                      color: '#f8fafc',
                      fontSize: '12px',
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
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                      borderRadius: 'var(--radius-sm, 4px)',
                      padding: '7px 14px',
                      color: 'var(--text-secondary, #cbd5e1)',
                      fontSize: '12px',
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
                      backgroundColor: 'var(--brand-primary, #2563eb)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm, 4px)',
                      padding: '7px 16px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isSubmitting ? 'Linking...' : 'Save Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function capDomainLabel(domain: string): string {
  switch (domain) {
    case 'calendar':
      return 'Calendar Schedule'
    case 'contacts':
      return 'Contacts Domain'
    default:
      return domain
  }
}
