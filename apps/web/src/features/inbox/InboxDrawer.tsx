import React, { useState } from 'react'
import type { InboxItem, InboxSeverity } from './inboxDerivation.js'
import { browserNotifier } from './browserNotifier.js'
import { Badge, type BadgeVariant } from '../../design-system/components/Badge.js'
import { Button } from '../../design-system/components/Button.js'
import { EmptyState } from '../../design-system/components/EmptyState.js'

export interface InboxDrawerProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly items: readonly InboxItem[]
  readonly onActionClick: (item: InboxItem) => void
  readonly onDismissItem: (itemId: string) => void
}

export const InboxDrawer: React.FC<InboxDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onActionClick,
  onDismissItem,
}) => {
  const [activeFilter, setActiveFilter] = useState<InboxSeverity | 'ALL'>('ALL')
  const [desktopPerm, setDesktopPerm] = useState<string>(browserNotifier.getPermission())

  if (!isOpen) return null

  const filteredItems = activeFilter === 'ALL'
    ? items
    : items.filter((item) => item.severity === activeFilter)

  const handleRequestDesktopPermission = async () => {
    const granted = await browserNotifier.requestPermission()
    setDesktopPerm(granted ? 'granted' : 'denied')
  }

  const getSeverityBadgeVariant = (severity: InboxSeverity): BadgeVariant => {
    switch (severity) {
      case 'CRITICAL':
        return 'failure'
      case 'ACTION_REQUIRED':
        return 'waiting'
      case 'IMPORTANT':
        return 'verifying'
      case 'FYI':
      default:
        return 'muted'
    }
  }

  return (
    <div
      role="region"
      aria-label="Human Inbox Drawer"
      data-testid="human-inbox-drawer"
      style={{
        position: 'fixed',
        top: '52px', // Below top bar
        right: 0,
        bottom: 0,
        width: '420px',
        maxWidth: '100vw',
        backgroundColor: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 'var(--z-drawer)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          backgroundColor: 'var(--bg-panel-elevated)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>📥</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              OPERATOR INBOX
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {items.length} actionable items
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close inbox"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Browser Notification Opt-In Banner */}
      {desktopPerm !== 'granted' && browserNotifier.isSupported() && (
        <div
          style={{
            padding: '8px 14px',
            backgroundColor: 'var(--bg-panel-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>Enable OS alerts for critical gates</span>
          <button
            onClick={() => void handleRequestDesktopPermission()}
            style={{
              padding: '2px 8px',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '10px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Enable
          </button>
        </div>
      )}

      {/* Filter Chips */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto',
          backgroundColor: 'var(--bg-app)',
        }}
      >
        {(['ALL', 'ACTION_REQUIRED', 'CRITICAL', 'IMPORTANT', 'FYI'] as const).map((filter) => {
          const isSelected = activeFilter === filter
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                border: '1px solid',
                borderColor: isSelected ? 'var(--border-focus)' : 'var(--border-subtle)',
                backgroundColor: isSelected ? 'var(--bg-panel-elevated)' : 'transparent',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {filter}
            </button>
          )
        })}
      </div>

      {/* Items List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {filteredItems.length === 0 ? (
          <EmptyState
            title="Inbox Clear"
            description="No pending actions or critical alerts requiring human attention."
          />
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              data-testid={`inbox-item-${item.id}`}
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-panel-elevated)',
                border: `1px solid ${
                  item.severity === 'ACTION_REQUIRED'
                    ? 'var(--state-waiting-border)'
                    : item.severity === 'CRITICAL'
                      ? 'var(--state-failure-border)'
                      : 'var(--border-color)'
                }`,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Badge variant={getSeverityBadgeVariant(item.severity)}>
                  {item.severity}
                </Badge>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                  <button
                    onClick={() => onDismissItem(item.id)}
                    title="Dismiss"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {item.title}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {item.summary}
              </div>

              {item.actionType && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <Button
                    variant={item.actionType === 'APPROVE' ? 'primary' : 'subtle'}
                    size="sm"
                    onClick={() => onActionClick(item)}
                    style={
                      item.actionType === 'APPROVE'
                        ? {
                            backgroundColor: 'var(--state-waiting-border)',
                            borderColor: '#ca8a04',
                            color: '#000',
                            fontWeight: 700,
                          }
                        : undefined
                    }
                  >
                    {item.actionType === 'APPROVE' && '⚠ Review & Approve'}
                    {item.actionType === 'INSPECT_FAILURE' && '✕ Inspect Failure'}
                    {item.actionType === 'VIEW_DIFF' && 'Inspect Diff'}
                    {item.actionType === 'VIEW_TASK' && 'Inspect Task'}
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
