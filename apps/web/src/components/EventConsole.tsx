import React, { useState } from 'react'
import type { GravitasEvent } from '../api/types.js'

export interface EventConsoleProps {
  readonly events: readonly GravitasEvent[]
  readonly onClear: () => void
}

export const EventConsole: React.FC<EventConsoleProps> = ({ events, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [pausedEvents, setPausedEvents] = useState<readonly GravitasEvent[]>([])

  const togglePause = () => {
    if (!isPaused) {
      setPausedEvents(events)
      setIsPaused(true)
    } else {
      setIsPaused(false)
    }
  }

  const displayedEvents = isPaused ? pausedEvents : events

  const getEventBadgeColor = (type: string) => {
    if (type.includes('APPROVAL_REQUIRED')) {
      return { fg: 'var(--state-waiting-fg)', bg: 'var(--state-waiting-bg)', border: 'var(--state-waiting-border)' }
    }
    if (type.includes('APPROVED') || type.includes('COMPLETED')) {
      return { fg: 'var(--state-success-fg)', bg: 'var(--state-success-bg)', border: 'var(--state-success-border)' }
    }
    if (type.includes('FAILED') || type.includes('REJECTED')) {
      return { fg: 'var(--state-failure-fg)', bg: 'var(--state-failure-bg)', border: 'var(--state-failure-border)' }
    }
    if (type.includes('STARTED') || type.includes('RUNNING')) {
      return { fg: 'var(--state-running-fg)', bg: 'var(--state-running-bg)', border: 'var(--state-running-border)' }
    }
    return { fg: 'var(--text-secondary)', bg: 'var(--bg-panel-elevated)', border: 'var(--border-subtle)' }
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
      }}
    >
      {/* Console Bar Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 16px',
          backgroundColor: 'var(--bg-panel-elevated)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          userSelect: 'none',
        }}
      >
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
        >
          <span>{isExpanded ? '▼' : '▲'}</span>
          <span style={{ fontWeight: 600 }}>LIVE EVENT STREAM</span>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              backgroundColor: 'var(--bg-app)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
            }}
          >
            {events.length}
          </span>
          {isPaused && (
            <span style={{ color: 'var(--state-verifying-fg)', fontWeight: 600 }}>[PAUSED]</span>
          )}
        </div>

        {isExpanded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={togglePause}
              style={{
                padding: '2px 8px',
                backgroundColor: isPaused ? 'var(--state-verifying-bg)' : 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: isPaused ? 'var(--state-verifying-fg)' : 'var(--text-secondary)',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={onClear}
              style={{
                padding: '2px 8px',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Expanded Console Body */}
      {isExpanded && (
        <div
          style={{
            height: '180px',
            overflowY: 'auto',
            padding: '8px 16px',
            backgroundColor: 'var(--bg-app)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {displayedEvents.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '12px 0' }}>
              No events recorded yet. Events from the Golden Loop stream will appear here in real time.
            </div>
          ) : (
            displayedEvents.map((evt) => {
              const badgeColors = getEventBadgeColor(evt.type)
              return (
                <div
                  key={evt.eventId}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '10px',
                    padding: '2px 0',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <span style={{ color: 'var(--text-dim)', flexShrink: 0, fontSize: '10px' }}>
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: badgeColors.bg,
                      color: badgeColors.fg,
                      border: `1px solid ${badgeColors.border}`,
                      flexShrink: 0,
                    }}
                  >
                    {evt.type}
                  </span>
                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      fontSize: '11px',
                    }}
                  >
                    {JSON.stringify(evt.payload)}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
