import React, { useState } from 'react'
import type { GravitasEvent } from '../../api/types.js'
import { deriveTimelineItems } from './timelineDerivation.js'
import { Badge } from '../../design-system/components/Badge.js'
import { EmptyState } from '../../design-system/components/EmptyState.js'

export interface ActivityTimelineProps {
  readonly events: readonly GravitasEvent[]
  readonly onClear?: () => void
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ events, onClear }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL')
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)

  const items = deriveTimelineItems(events)

  const filteredItems = items.filter((item) => {
    if (selectedEventType !== 'ALL') {
      if (selectedEventType === 'RUN' && !item.eventType.startsWith('RUN_')) return false
      if (selectedEventType === 'TASK' && !item.eventType.startsWith('TASK_')) return false
      if (selectedEventType === 'WORKER' && !item.eventType.startsWith('WORKER_')) return false
      if (selectedEventType === 'VERIFY' && !item.eventType.startsWith('VERIFICATION_')) return false
      if (selectedEventType === 'APPROVAL' && !item.eventType.includes('APPROVAL')) return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.eventId.toLowerCase().includes(q) ||
        item.eventType.toLowerCase().includes(q)
      )
    }

    return true
  })

  return (
    <div
      data-testid="activity-timeline-view"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-canvas)',
      }}
    >
      {/* Controls Bar */}
      <div
        style={{
          padding: '12px 20px',
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.4px' }}>
            OPERATIONAL TIMELINE
          </div>
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              backgroundColor: 'var(--bg-panel-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {items.length} EVENTS
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Search Box */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter timeline events..."
            style={{
              padding: '5px 10px',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'inherit',
              width: '180px',
            }}
          />

          {/* Filter Type */}
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            style={{
              padding: '5px 8px',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="RUN">Runs</option>
            <option value="TASK">Tasks</option>
            <option value="WORKER">Workers</option>
            <option value="VERIFY">Verification</option>
            <option value="APPROVAL">Approvals</option>
          </select>

          {onClear && (
            <button
              onClick={onClear}
              style={{
                padding: '5px 10px',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Timeline Stream */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {filteredItems.length === 0 ? (
          <EmptyState
            title="No Events Found"
            description={
              items.length === 0
                ? 'Timeline is currently empty. Events from run creation, execution, and verification will stream here in real time.'
                : 'No events match the current filter or search criteria.'
            }
          />
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedEventId === item.eventId
            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'background-color var(--motion-duration-fast) var(--motion-ease-standard)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge variant={item.badgeVariant}>{item.badgeText}</Badge>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.title}
                    </span>
                  </div>

                  <button
                    onClick={() => setExpandedEventId(isExpanded ? null : item.eventId)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                      padding: '2px 6px',
                    }}
                  >
                    {isExpanded ? 'Hide Raw JSON' : 'Inspect JSON'}
                  </button>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {item.description}
                </div>

                {isExpanded && (
                  <pre
                    style={{
                      marginTop: '6px',
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {JSON.stringify(item.rawEvent, null, 2)}
                  </pre>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
