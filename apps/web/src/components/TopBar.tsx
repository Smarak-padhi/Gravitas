import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { ConnectionStatus } from '../api/useEvents.js'
import { Tabs, type TabItem } from '../design-system/components/Tabs.js'
import { Button } from '../design-system/components/Button.js'
import { Icons } from '../design-system/components/Icons.js'

export type WorkspaceView =
  | 'HQ3D'
  | 'CALENDAR'
  | 'CONNECTORS'
  | 'AUTOMATIONS'
  | 'OFFICE'
  | 'GRAPH'
  | 'EVIDENCE'
  | 'TIMELINE'
  | 'AGENTS'

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

/** Label map for the mobile nav sheet */
const VIEW_LABELS: Record<WorkspaceView, { label: string; icon: React.ReactElement }> = {
  HQ3D:        { label: 'HQ 3D',       icon: <Icons.HQ size={16} /> },
  CALENDAR:    { label: 'Calendar',    icon: <Icons.Calendar size={16} /> },
  CONNECTORS:  { label: 'Connectors',  icon: <Icons.Connector size={16} /> },
  AUTOMATIONS: { label: 'Automations', icon: <Icons.Automation size={16} /> },
  OFFICE:      { label: 'Office',      icon: <Icons.Office size={16} /> },
  GRAPH:       { label: 'Graph',       icon: <Icons.Graph size={16} /> },
  EVIDENCE:    { label: 'Evidence',    icon: <Icons.Evidence size={16} /> },
  TIMELINE:    { label: 'Timeline',    icon: <Icons.Timeline size={16} /> },
  AGENTS:      { label: 'Agents',      icon: <Icons.Agents size={16} /> },
}

const NAV_ORDER: WorkspaceView[] = [
  'HQ3D', 'CALENDAR', 'CONNECTORS', 'AUTOMATIONS', 'OFFICE',
  'GRAPH', 'EVIDENCE', 'TIMELINE', 'AGENTS',
]

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
    setTimeout(() => hamburgerRef.current?.focus(), 0)
  }, [])

  // ESC closes mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileMenu()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [mobileMenuOpen, closeMobileMenu])

  // Focus first item when sheet opens
  useEffect(() => {
    if (mobileMenuOpen) {
      const first = sheetRef.current?.querySelector<HTMLElement>('[role="menuitem"]')
      first?.focus()
    }
  }, [mobileMenuOpen])

  const handleMobileNavSelect = useCallback((view: WorkspaceView) => {
    onViewChange?.(view)
    closeMobileMenu()
  }, [onViewChange, closeMobileMenu])

  const getHarnessStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':   return 'var(--state-success-fg, #34d399)'
      case 'AUTH_REQUIRED': return 'var(--state-verifying-fg, #fbbf24)'
      default:            return 'var(--state-failure-fg, #f87171)'
    }
  }

  const getHarnessStatusBg = (status: string) => {
    switch (status) {
      case 'AVAILABLE':   return 'var(--state-success-bg, rgba(52, 211, 153, 0.12))'
      case 'AUTH_REQUIRED': return 'var(--state-verifying-bg, rgba(251, 191, 36, 0.12))'
      default:            return 'var(--state-failure-bg, rgba(248, 113, 113, 0.12))'
    }
  }

  const viewTabs: TabItem<WorkspaceView>[] = [
    { id: 'HQ3D',        label: 'HQ 3D',       icon: <Icons.HQ size={13} /> },
    { id: 'CALENDAR',    label: 'CALENDAR',    icon: <Icons.Calendar size={13} /> },
    { id: 'CONNECTORS',  label: 'CONNECTORS',  icon: <Icons.Connector size={13} /> },
    { id: 'AUTOMATIONS', label: 'AUTOMATIONS', icon: <Icons.Automation size={13} /> },
    { id: 'OFFICE',      label: 'OFFICE',      icon: <Icons.Office size={13} /> },
    { id: 'GRAPH',       label: 'GRAPH',       icon: <Icons.Graph size={13} /> },
    { id: 'EVIDENCE',    label: 'EVIDENCE',    icon: <Icons.Evidence size={13} /> },
    { id: 'TIMELINE',    label: 'TIMELINE',    icon: <Icons.Timeline size={13} /> },
    { id: 'AGENTS',      label: 'AGENTS',      icon: <Icons.Agents size={13} /> },
  ]

  return (
    <>
      {/* ───── TopBar Header ───── */}
      <header
        data-testid="app-shell-topbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          backgroundColor: 'var(--bg-panel, #0f1422)',
          borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          minHeight: '52px',
          height: '52px',
          gap: '8px',
          flexWrap: 'nowrap',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        {/* Left: Brand + Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, minWidth: 0 }}>
          {/* Brand Plinth */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-display, "Space Grotesk", sans-serif)',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.04em',
              color: 'var(--text-primary, #f1f5f9)',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor:
                  connectionStatus === 'connected'
                    ? 'var(--state-success-fg, #34d399)'
                    : connectionStatus === 'connecting'
                      ? 'var(--state-verifying-fg, #fbbf24)'
                      : 'var(--state-failure-fg, #f87171)',
                boxShadow:
                  connectionStatus === 'connected'
                    ? '0 0 8px rgba(52, 211, 153, 0.4)'
                    : 'none',
                transition: 'background-color 200ms ease',
                flexShrink: 0,
              }}
              title={`Control Plane: ${connectionStatus}`}
            />
            <span>GRAVITAS</span>
          </div>

          <span
            style={{
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: 'var(--radius-sm, 4px)',
              backgroundColor: 'var(--bg-panel-elevated, #161f33)',
              color: 'var(--text-muted, #64748b)',
              fontFamily: 'var(--font-mono, monospace)',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
              flexShrink: 0,
            }}
          >
            v{version}
          </span>

          {/* Harness Telemetry */}
          <div
            className="topbar-harness-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm, 4px)',
              backgroundColor: getHarnessStatusBg(harness.status),
              border: `1px solid ${getHarnessStatusColor(harness.status)}`,
              color: getHarnessStatusColor(harness.status),
              fontFamily: 'var(--font-mono, monospace)',
              flexShrink: 0,
            }}
            title={harness.message ?? `Harness ${harness.id}: ${harness.status}`}
          >
            <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>HARNESS:</span>
            <strong>{harness.id}</strong>
            <span style={{ opacity: 0.85 }}>[{harness.status}]</span>
          </div>

          {/* Gateway Telemetry */}
          {gateways && gateways.length > 0 && (
            <div
              className="topbar-gateway-badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm, 4px)',
                backgroundColor: 'var(--bg-panel-elevated, #161f33)',
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
                color: 'var(--text-secondary, #cbd5e1)',
                fontFamily: 'var(--font-mono, monospace)',
                flexShrink: 0,
              }}
              title={gateways.map((g) => `${g.id}: ${g.state}`).join(', ')}
            >
              <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '10px' }}>GATEWAY:</span>
              <strong>{gateways[0].id}</strong>
              <span
                style={{
                  color:
                    gateways[0].state === 'READY'
                      ? 'var(--state-success-fg, #34d399)'
                      : 'var(--text-muted, #64748b)',
                }}
              >
                [{gateways[0].state}]
              </span>
            </div>
          )}

          {/* SSE State */}
          <div
            className="topbar-sse-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              color: 'var(--text-muted, #64748b)',
              fontFamily: 'var(--font-mono, monospace)',
              flexShrink: 0,
            }}
          >
            <span>SSE:</span>
            <span
              style={{
                color:
                  connectionStatus === 'connected'
                    ? 'var(--state-success-fg, #34d399)'
                    : 'var(--state-failure-fg, #f87171)',
                fontWeight: 700,
              }}
            >
              {connectionStatus.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Center: Desktop Tab Strip */}
        {onViewChange && (
          <div
            data-testid="workspace-view-tabs"
            className="topbar-desktop-tabs"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              overflow: 'hidden',
              padding: '0 4px',
            }}
          >
            <Tabs
              items={viewTabs}
              activeId={currentView}
              onChange={onViewChange}
              ariaLabel="Workspace Views"
            />
          </div>
        )}

        {/* Right: Operator Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              data-testid="command-palette-trigger"
              aria-label="Open command palette"
              className="topbar-palette-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 9px',
                backgroundColor: 'var(--bg-panel-elevated, #161f33)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                borderRadius: 'var(--radius-md, 6px)',
                color: 'var(--text-secondary, #cbd5e1)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono, monospace)',
                cursor: 'pointer',
                transition: 'background-color 150ms ease, border-color 150ms ease',
              }}
            >
              <span style={{ color: 'var(--brand-primary, #3b82f6)', fontWeight: 600 }}>⌘K</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)' }}>Palette</span>
            </button>
          )}

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
                backgroundColor:
                  inboxCount > 0
                    ? 'var(--state-waiting-bg, rgba(245, 158, 11, 0.15))'
                    : 'var(--bg-panel-elevated, #161f33)',
                border: `1px solid ${
                  inboxCount > 0
                    ? 'var(--state-waiting-border, rgba(245, 158, 11, 0.4))'
                    : 'var(--border-color, rgba(255, 255, 255, 0.08))'
                }`,
                borderRadius: 'var(--radius-md, 6px)',
                color:
                  inboxCount > 0
                    ? 'var(--state-waiting-fg, #fbbf24)'
                    : 'var(--text-secondary, #cbd5e1)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <Icons.Shield size={12} color="currentColor" />
              <span className="topbar-inbox-label">Inbox</span>
              {inboxCount > 0 && (
                <span
                  style={{
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-sm, 4px)',
                    backgroundColor: 'var(--state-waiting-border, #f59e0b)',
                    color: '#000000',
                    fontSize: '10px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {inboxCount}
                </span>
              )}
            </button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={onNewRunClick}
            className="topbar-newrun-btn"
          >
            + New Run
          </Button>

          {/* Hamburger: mobile only — display:none by default, shown via CSS media query */}
          {onViewChange && (
            <button
              ref={hamburgerRef}
              data-testid="mobile-nav-trigger"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-haspopup="menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="topbar-hamburger"
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                background: 'none',
                border: '1px solid var(--border-color, rgba(255,255,255,0.10))',
                borderRadius: 'var(--radius-sm, 5px)',
                color: 'var(--text-primary, #f1f5f9)',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                {mobileMenuOpen ? (
                  <>
                    <line x1="3" y1="3" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="15" y1="3" x2="3" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* ───── Mobile Navigation Sheet ───── */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            data-testid="mobile-nav-backdrop"
            onClick={closeMobileMenu}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              backgroundColor: 'rgba(5, 7, 11, 0.75)',
              backdropFilter: 'blur(2px)',
            }}
          />
          {/* Sheet */}
          <div
            ref={sheetRef}
            data-testid="mobile-nav-sheet"
            role="menu"
            aria-label="Navigation menu"
            style={{
              position: 'fixed',
              top: '52px',
              left: 0,
              right: 0,
              zIndex: 201,
              backgroundColor: 'var(--bg-panel, #0f1422)',
              borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.10))',
              padding: '8px 0',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            }}
          >
            {NAV_ORDER.map((view) => {
              const entry = VIEW_LABELS[view]
              const isActive = view === currentView
              return (
                <button
                  key={view}
                  role="menuitem"
                  data-testid={`mobile-nav-item-${view}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleMobileNavSelect(view)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 20px',
                    background: isActive
                      ? 'var(--surface-active, rgba(59, 130, 246, 0.12))'
                      : 'none',
                    border: 'none',
                    borderLeft: isActive
                      ? '2px solid var(--brand-primary, #3b82f6)'
                      : '2px solid transparent',
                    color: isActive
                      ? 'var(--text-primary, #f1f5f9)'
                      : 'var(--text-secondary, #94a3b8)',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 400,
                    fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    minHeight: '48px',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      color: isActive ? 'var(--brand-primary, #60a5fa)' : 'inherit',
                      display: 'inline-flex',
                    }}
                  >
                    {entry.icon}
                  </span>
                  <span>{entry.label}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* ───── Responsive CSS ───── */}
      <style>{`
        @media (max-width: 640px) {
          .topbar-desktop-tabs  { display: none !important; }
          .topbar-hamburger     { display: flex !important; }
          .topbar-harness-badge,
          .topbar-gateway-badge,
          .topbar-sse-badge,
          .topbar-palette-btn,
          .topbar-newrun-btn    { display: none !important; }
          .topbar-inbox-label   { display: none; }
        }
        @media (min-width: 641px) and (max-width: 768px) {
          .topbar-gateway-badge { display: none !important; }
          .topbar-sse-badge     { display: none !important; }
        }
      `}</style>
    </>
  )
}
