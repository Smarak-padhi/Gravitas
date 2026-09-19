import React from 'react'
import type { ConnectionStatus } from '../api/useEvents.js'

export interface TopBarProps {
  readonly connectionStatus: ConnectionStatus
  readonly version: string
  readonly harness: {
    readonly id: string
    readonly status: string
    readonly message?: string | undefined
  }
  readonly onNewRunClick: () => void
}

export const TopBar: React.FC<TopBarProps> = ({
  connectionStatus,
  version,
  harness,
  onNewRunClick,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'var(--state-success-fg)'
      case 'AUTH_REQUIRED':
        return 'var(--state-verifying-fg)'
      default:
        return 'var(--state-failure-fg)'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'var(--state-success-bg)'
      case 'AUTH_REQUIRED':
        return 'var(--state-verifying-bg)'
      default:
        return 'var(--state-failure-bg)'
    }
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        backgroundColor: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-color)',
        minHeight: '52px',
      }}
    >
      {/* Brand & Version */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '15px',
            letterSpacing: '0.5px',
            color: 'var(--text-primary)',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor:
                connectionStatus === 'connected'
                  ? 'var(--state-success-fg)'
                  : connectionStatus === 'connecting'
                    ? 'var(--state-verifying-fg)'
                    : 'var(--state-failure-fg)',
              boxShadow:
                connectionStatus === 'connected'
                  ? '0 0 8px var(--state-success-fg)'
                  : 'none',
            }}
            title={`Control Plane: ${connectionStatus}`}
          />
          GRAVITAS
        </div>

        <span
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-panel-elevated)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          v{version}
        </span>
      </div>

      {/* Center / Telemetry: Harness Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: getStatusBg(harness.status),
            border: `1px solid ${getStatusColor(harness.status)}`,
            color: getStatusColor(harness.status),
            fontFamily: 'var(--font-mono)',
          }}
          title={harness.message ?? `Harness ${harness.id}: ${harness.status}`}
        >
          <span style={{ color: 'var(--text-secondary)' }}>HARNESS:</span>
          <strong>{harness.id}</strong>
          <span>[{harness.status}]</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>SSE:</span>
          <span
            style={{
              color:
                connectionStatus === 'connected'
                  ? 'var(--state-success-fg)'
                  : 'var(--state-failure-fg)',
            }}
          >
            {connectionStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div>
        <button
          onClick={onNewRunClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            backgroundColor: 'var(--border-focus)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--border-focus)')}
        >
          + New Run
        </button>
      </div>
    </header>
  )
}
