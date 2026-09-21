import React from 'react'
import type { ConnectionStatus } from '../api/useEvents.js'
import { Tabs, type TabItem } from '../design-system/components/Tabs.js'
import { Button } from '../design-system/components/Button.js'

export type WorkspaceView = 'HQ3D' | 'OFFICE' | 'GRAPH' | 'EVIDENCE' | 'TIMELINE' | 'AGENTS'

export interface TopBarProps {
  readonly connectionStatus: ConnectionStatus
  readonly version: string
  readonly harness: {
    readonly id: string
    readonly status: string
    readonly message?: string | undefined
  }
  readonly gateways?: ReadonlyArray<{
    readonly id: string
    readonly state: string
    readonly version?: string | undefined
  }> | undefined
  readonly onNewRunClick: () => void
  readonly currentView?: WorkspaceView | undefined
  readonly onViewChange?: ((view: WorkspaceView) => void) | undefined
  readonly inboxCount?: number | undefined
  readonly onToggleInbox?: (() => void) | undefined
  readonly onOpenCommandPalette?: (() => void) | undefined
}

export const TopBar: React.FC<TopBarProps> = ({
  connectionStatus,
  version,
  harness,
  gateways,
  onNewRunClick,
  currentView = 'HQ3D',
  onViewChange,
  inboxCount = 0,
  onToggleInbox,
  onOpenCommandPalette,
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

  const viewTabs: TabItem<WorkspaceView>[] = [
    { id: 'HQ3D', label: '🏛️ HQ 3D' },
    { id: 'OFFICE', label: 'OFFICE' },
    { id: 'GRAPH', label: 'GRAPH' },
    { id: 'EVIDENCE', label: 'EVIDENCE' },
    { id: 'TIMELINE', label: 'TIMELINE' },
    { id: 'AGENTS', label: 'AGENTS' },
  ]

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backgroundColor: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-color)',
        minHeight: '52px',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      {/* Left: Brand & Telemetry */}
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
            userSelect: 'none',
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

        {/* Harness Telemetry */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            padding: '3px 8px',
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

        {/* Gateways Telemetry (Infrastructure) */}
        {gateways && gateways.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}
            title={gateways.map((g) => `${g.id}: ${g.state}`).join(', ')}
          >
            <span style={{ color: 'var(--text-muted)' }}>GATEWAY:</span>
            <strong>{gateways[0].id}</strong>
            <span style={{ color: gateways[0].state === 'READY' ? 'var(--state-success-fg)' : 'var(--text-muted)' }}>
              [{gateways[0].state}]
            </span>
          </div>
        )}

        {/* SSE Telemetry */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
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
              fontWeight: 700,
            }}
          >
            {connectionStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Center: View Switcher */}
      {onViewChange && (
        <div data-testid="workspace-view-tabs">
          <Tabs
            items={viewTabs}
            activeId={currentView}
            onChange={onViewChange}
            ariaLabel="Workspace Views"
          />
        </div>
      )}

      {/* Right: Actions & Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Command Palette Trigger */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            data-testid="command-palette-trigger"
            aria-label="Open command palette"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: 'var(--bg-panel-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              transition: 'all var(--motion-duration-fast) var(--motion-ease-standard)',
            }}
          >
            <span>⌘K</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Palette</span>
          </button>
        )}

        {/* Human Inbox Button */}
        {onToggleInbox && (
          <button
            onClick={onToggleInbox}
            data-testid="human-inbox-trigger"
            aria-label="Toggle Operator Inbox"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: inboxCount > 0 ? 'var(--state-waiting-bg)' : 'var(--bg-panel-elevated)',
              border: `1px solid ${inboxCount > 0 ? 'var(--state-waiting-border)' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-md)',
              color: inboxCount > 0 ? 'var(--state-waiting-fg)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              animation: inboxCount > 0 ? 'attentionPulse 2.4s ease-in-out infinite' : 'none',
              transition: 'all var(--motion-duration-fast) var(--motion-ease-standard)',
            }}
          >
            <span>📥 Inbox</span>
            {inboxCount > 0 && (
              <span
                style={{
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--state-waiting-border)',
                  color: '#000',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {inboxCount}
              </span>
            )}
          </button>
        )}

        {/* + New Run Button */}
        <Button variant="primary" size="sm" onClick={onNewRunClick}>
          + New Run
        </Button>
      </div>
    </header>
  )
}
