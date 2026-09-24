import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import type {
  CalendarSummary,
  CalendarEventSummary,
} from '../../api/types.js'

export const CalendarView: React.FC = () => {
  const [calendars, setCalendars] = useState<readonly CalendarSummary[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary')
  const [events, setEvents] = useState<readonly CalendarEventSummary[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventSummary | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [viewFilter, setViewFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING'>('ALL')

  const fetchCalendarsAndEvents = useCallback(async () => {
    try {
      setIsLoading(true)
      const calRes = await api.getCalendars('calendar-mock')
      setCalendars(calRes.calendars)

      const eventsRes = await api.getCalendarEvents(
        { calendarId: selectedCalendarId, maxResults: 50 },
        'calendar-mock',
      )
      setEvents(eventsRes.events)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar data')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCalendarId])

  useEffect(() => {
    void fetchCalendarsAndEvents()
    const timer = setInterval(fetchCalendarsAndEvents, 5000)
    return () => clearInterval(timer)
  }, [fetchCalendarsAndEvents])

  // Filter events
  const filteredEvents = events.filter((evt) => {
    if (viewFilter === 'TODAY') {
      const todayStr = '2026-09-24'
      return evt.start.includes(todayStr)
    }
    if (viewFilter === 'UPCOMING') {
      return evt.start >= '2026-09-24'
    }
    return true
  })

  return (
    <div
      data-testid="calendar-view"
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
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em' }}>
              Calendar Operations
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              Deterministic Read Plane
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>
            Single source of schedule truth. Synchronized through connector kernel with zero AI inference loops.
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '2px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {(['ALL', 'TODAY', 'UPCOMING'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setViewFilter(filter)}
                data-testid={`filter-btn-${filter}`}
                style={{
                  backgroundColor: viewFilter === filter ? '#3b82f6' : 'transparent',
                  color: viewFilter === filter ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {filter === 'ALL' ? 'All Events' : filter === 'TODAY' ? 'Today' : 'Upcoming'}
              </button>
            ))}
          </div>

          {isLoading && (
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>Syncing...</span>
          )}

          <select
            value={selectedCalendarId}
            onChange={(e) => setSelectedCalendarId(e.target.value)}
            data-testid="calendar-select"
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '7px 12px',
              color: '#f8fafc',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {calendars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.primary ? '(Primary)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Events List / Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
        {/* Left Column: Events Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} data-testid="events-list">
          {filteredEvents.length === 0 ? (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                color: '#64748b',
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                borderRadius: '12px',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                fontSize: '14px',
              }}
            >
              No events found for this filter or calendar.
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const isSelected = selectedEvent?.id === evt.id
              const isAllDay = evt.allDay
              const formatTime = (iso: string) => {
                if (isAllDay) return iso
                try {
                  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                } catch {
                  return iso
                }
              }

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  data-testid={`event-card-${evt.id}`}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.6)',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: isSelected ? '0 0 12px rgba(59, 130, 246, 0.2)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                        {evt.title}
                      </span>
                      {isAllDay && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          ALL-DAY
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: evt.status === 'confirmed' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                          color: evt.status === 'confirmed' ? '#34d399' : '#94a3b8',
                        }}
                      >
                        {evt.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8' }}>
                      <span>
                        ⏰ {formatTime(evt.start)} {evt.end !== evt.start ? `– ${formatTime(evt.end)}` : ''} ({evt.timezone})
                      </span>
                      {evt.location && <span>📍 {evt.location}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {evt.attendeeCount !== undefined && evt.attendeeCount > 0 && (
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#cbd5e1',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        👥 {evt.attendeeCount}
                      </span>
                    )}
                    <span style={{ color: '#64748b', fontSize: '14px' }}>›</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column: Selected Event Detail Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            data-testid="event-detail-panel"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
            }}
          >
            <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Event Inspector</h2>
            {selectedEvent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Title</div>
                  <div
                    data-testid="event-detail-title"
                    style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', marginTop: '2px' }}
                  >
                    {selectedEvent.title}
                  </div>
                </div>

                <div data-testid="event-detail-time">
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Timing</div>
                  <div style={{ color: '#cbd5e1', marginTop: '2px' }}>
                    Start: {selectedEvent.start}
                  </div>
                  <div style={{ color: '#cbd5e1' }}>
                    End: {selectedEvent.end}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                    Timezone: {selectedEvent.timezone}
                  </div>
                </div>

                {selectedEvent.location && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Location</div>
                    <div style={{ color: '#cbd5e1', marginTop: '2px' }}>{selectedEvent.location}</div>
                  </div>
                )}

                {selectedEvent.organizer && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Organizer</div>
                    <div style={{ color: '#cbd5e1', marginTop: '2px', fontFamily: 'monospace' }}>
                      {selectedEvent.organizer}
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Event ID</div>
                  <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '11px', marginTop: '2px' }}>
                    {selectedEvent.id}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    fontSize: '11px',
                    color: '#93c5fd',
                  }}
                >
                  🔒 Normalized Domain Model: Zero OAuth tokens or private transport leaks.
                </div>
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                Select an event from the list to view normalized parameters and timing.
              </div>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
              🤖 Autonomous Automation Hook
            </h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', lineHeight: 1.5 }}>
              Calendar events can trigger automated morning agendas, reminders, and conflict checks configured in the Automations tab via the <code>CONNECTOR_READ</code> job action.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
