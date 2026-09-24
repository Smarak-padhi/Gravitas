import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client.js'
import type {
  CalendarSummary,
  CalendarEventSummary,
} from '../../api/types.js'
import { Icons } from '../../design-system/components/Icons.js'

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
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (viewFilter === 'TODAY') {
        const todayStr = '2026-09-24'
        return evt.start.includes(todayStr)
      }
      if (viewFilter === 'UPCOMING') {
        return evt.start >= '2026-09-24'
      }
      return true
    })
  }, [events, viewFilter])

  // Conflict calculation (deterministic schedule overlaps)
  const conflictMap = useMemo(() => {
    const conflicts = new Map<string, string[]>()
    const timedEvents = filteredEvents.filter((e) => !e.allDay)
    for (let i = 0; i < timedEvents.length; i++) {
      for (let j = i + 1; j < timedEvents.length; j++) {
        const a = timedEvents[i]
        const b = timedEvents[j]
        const aStart = new Date(a.start).getTime()
        const aEnd = new Date(a.end).getTime()
        const bStart = new Date(b.start).getTime()
        const bEnd = new Date(b.end).getTime()

        if (aStart < bEnd && bStart < aEnd) {
          const listA = conflicts.get(a.id) ?? []
          listA.push(b.title)
          conflicts.set(a.id, listA)

          const listB = conflicts.get(b.id) ?? []
          listB.push(a.title)
          conflicts.set(b.id, listB)
        }
      }
    }
    return conflicts
  }, [filteredEvents])

  // Separate all-day from timed
  const allDayEvents = useMemo(() => filteredEvents.filter((e) => e.allDay), [filteredEvents])

  const formatTime = (iso: string, isAllDay: boolean) => {
    if (isAllDay) return iso
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return iso
    }
  }

  const selectedCal = calendars.find((c) => c.id === selectedCalendarId) || calendars[0]

  return (
    <div
      data-testid="calendar-view"
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
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          paddingBottom: '16px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display, "Space Grotesk", sans-serif)',
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary, #f8fafc)',
              }}
            >
              Calendar Operations
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm, 4px)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--state-success-fg, #34d399)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              Deterministic Read Plane
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm, 4px)',
                backgroundColor: 'var(--bg-panel-elevated, #161f33)',
                color: 'var(--text-muted, #64748b)',
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              [FIXTURE: calendar-mock]
            </span>
          </div>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: 'var(--text-secondary, #94a3b8)',
            }}
          >
            Single source of schedule truth. Synchronized through connector kernel with zero AI inference loops.
          </p>
        </div>

        {/* Filter controls & Calendar select */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-panel, #0f1422)',
              borderRadius: 'var(--radius-md, 6px)',
              padding: '2px',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            }}
          >
            {(['ALL', 'TODAY', 'UPCOMING'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setViewFilter(filter)}
                data-testid={`filter-btn-${filter}`}
                style={{
                  backgroundColor: viewFilter === filter ? 'var(--brand-primary, #3b82f6)' : 'transparent',
                  color: viewFilter === filter ? '#ffffff' : 'var(--text-secondary, #94a3b8)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm, 4px)',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 150ms ease, color 150ms ease',
                }}
              >
                {filter === 'ALL' ? 'All Events' : filter === 'TODAY' ? 'Today' : 'Upcoming'}
              </button>
            ))}
          </div>

          {isLoading && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontFamily: 'var(--font-mono)' }}>
              Syncing...
            </span>
          )}

          <select
            value={selectedCalendarId}
            onChange={(e) => setSelectedCalendarId(e.target.value)}
            data-testid="calendar-select"
            style={{
              backgroundColor: 'var(--bg-panel-elevated, #161f33)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
              borderRadius: 'var(--radius-md, 6px)',
              padding: '6px 12px',
              color: 'var(--text-primary, #f8fafc)',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
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
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm, 4px)',
            backgroundColor: 'var(--state-failure-bg, rgba(239, 68, 68, 0.12))',
            border: '1px solid var(--state-failure-border, rgba(239, 68, 68, 0.3))',
            color: 'var(--state-failure-fg, #f87171)',
            fontSize: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icons.Alert size={14} color="currentColor" />
          <span>{error}</span>
        </div>
      )}

      {/* Operational Day Strip / Time Overview */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          backgroundColor: 'var(--bg-panel, #0f1422)',
          borderRadius: 'var(--radius-md, 6px)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          marginBottom: '20px',
          fontSize: '11px',
          color: 'var(--text-secondary, #cbd5e1)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icons.Calendar size={13} color="var(--brand-primary, #60a5fa)" />
            <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>Thursday, Sep 24, 2026</strong>
          </div>
          <span style={{ color: 'var(--text-muted, #64748b)' }}>•</span>
          <div>
            Events: <strong style={{ color: 'var(--text-primary)' }}>{filteredEvents.length}</strong>
          </div>
          <span style={{ color: 'var(--text-muted, #64748b)' }}>•</span>
          <div>
            All-Day: <strong style={{ color: 'var(--text-primary)' }}>{allDayEvents.length}</strong>
          </div>
          {conflictMap.size > 0 && (
            <>
              <span style={{ color: 'var(--text-muted, #64748b)' }}>•</span>
              <div style={{ color: 'var(--state-verifying-fg, #fbbf24)', fontWeight: 600 }}>
                ⚠️ {conflictMap.size} Conflict detected
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px' }}>
          <span style={{ color: 'var(--text-muted, #64748b)' }}>TIMEZONE:</span>
          <span style={{ color: 'var(--brand-primary, #60a5fa)' }}>UTC / Local Standard</span>
          <span style={{ color: 'var(--text-muted, #64748b)' }}>•</span>
          <span style={{ color: 'var(--state-success-fg, #34d399)' }}>LIVE REFRESH: 5s</span>
        </div>
      </div>

      {/* Main Grid: Events List + Detailed Inspector */}
      <div className="connectors-main-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        {/* Left Column: Events Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} data-testid="events-list">
          {/* All-Day Shelf if any exist */}
          {allDayEvents.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                All-Day Milestones
              </div>
              {allDayEvents.map((evt) => {
                const isSelected = selectedEvent?.id === evt.id
                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    data-testid={`event-card-${evt.id}`}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm, 4px)',
                      backgroundColor: isSelected
                        ? 'var(--bg-panel-elevated, #161f33)'
                        : 'var(--bg-panel, #0f1422)',
                      border: isSelected
                        ? '1px solid var(--border-focus, #3b82f6)'
                        : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-sm, 3px)',
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: 'var(--state-verifying-fg, #fbbf24)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      >
                        ALL-DAY
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                        {evt.title}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontFamily: 'var(--font-mono)' }}>
                      {evt.start}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Timed Events Section */}
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Scheduled Sessions
          </div>

          {filteredEvents.length === 0 ? (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                color: 'var(--text-muted, #64748b)',
                backgroundColor: 'var(--bg-panel, #0f1422)',
                borderRadius: 'var(--radius-md, 6px)',
                border: '1px dashed var(--border-color, rgba(255, 255, 255, 0.1))',
                fontSize: '13px',
              }}
            >
              No events found for this filter or calendar.
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const isSelected = selectedEvent?.id === evt.id
              const isAllDay = evt.allDay
              const conflicts = conflictMap.get(evt.id)

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  data-testid={`event-card-${evt.id}`}
                  style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md, 6px)',
                    backgroundColor: isSelected
                      ? 'var(--bg-panel-elevated, #161f33)'
                      : 'var(--bg-panel, #0f1422)',
                    border: isSelected
                      ? '1px solid var(--border-focus, #3b82f6)'
                      : conflicts
                        ? '1px solid rgba(245, 158, 11, 0.35)'
                        : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                    boxShadow: isSelected ? '0 0 12px rgba(59, 130, 246, 0.15)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                        {evt.title}
                      </span>
                      {isAllDay && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-sm, 3px)',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: 'var(--state-verifying-fg, #fbbf24)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            fontFamily: 'var(--font-mono, monospace)',
                          }}
                        >
                          ALL-DAY
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm, 3px)',
                          backgroundColor:
                            evt.status === 'confirmed'
                              ? 'var(--state-success-bg, rgba(16, 185, 129, 0.12))'
                              : 'rgba(148, 163, 184, 0.12)',
                          color:
                            evt.status === 'confirmed'
                              ? 'var(--state-success-fg, #34d399)'
                              : 'var(--text-muted, #94a3b8)',
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      >
                        {evt.status}
                      </span>

                      {conflicts && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-sm, 3px)',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: 'var(--state-verifying-fg, #fbbf24)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          ⚠️ Conflict: {conflicts.join(', ')}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                        ⏰ {formatTime(evt.start, isAllDay)} {evt.end !== evt.start ? `– ${formatTime(evt.end, isAllDay)}` : ''} ({evt.timezone})
                      </span>
                      {evt.location && <span>📍 {evt.location}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {evt.attendeeCount !== undefined && evt.attendeeCount > 0 && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary, #cbd5e1)',
                          backgroundColor: 'var(--bg-panel-elevated, #161f33)',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm, 4px)',
                          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Icons.Agents size={11} color="currentColor" />
                        <span>{evt.attendeeCount}</span>
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>›</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column: Selected Event Detail Inspector */}
        <div className="calendar-inspector-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            data-testid="event-detail-panel"
            style={{
              backgroundColor: 'var(--bg-panel, #0f1422)',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                Event Inspector
              </h2>
              {selectedEvent && (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm, 3px)',
                    backgroundColor: 'var(--bg-panel-elevated, #161f33)',
                    color: 'var(--text-muted, #64748b)',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {selectedCal?.name || 'Primary'}
                </span>
              )}
            </div>

            {selectedEvent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Title
                  </div>
                  <div
                    data-testid="event-detail-title"
                    style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginTop: '2px' }}
                  >
                    {selectedEvent.title}
                  </div>
                </div>

                <div data-testid="event-detail-time">
                  <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Timing & Boundaries
                  </div>
                  <div style={{ color: 'var(--text-secondary, #cbd5e1)', marginTop: '3px', fontFamily: 'var(--font-mono, monospace)' }}>
                    Start: {selectedEvent.start}
                  </div>
                  <div style={{ color: 'var(--text-secondary, #cbd5e1)', fontFamily: 'var(--font-mono, monospace)' }}>
                    End: {selectedEvent.end}
                  </div>
                  <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '10px', marginTop: '2px' }}>
                    Timezone: {selectedEvent.timezone}
                  </div>
                </div>

                {selectedEvent.location && (
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Location
                    </div>
                    <div style={{ color: 'var(--text-secondary, #cbd5e1)', marginTop: '2px' }}>
                      {selectedEvent.location}
                    </div>
                  </div>
                )}

                {selectedEvent.organizer && (
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Organizer
                    </div>
                    <div style={{ color: 'var(--text-secondary, #cbd5e1)', marginTop: '2px', fontFamily: 'var(--font-mono, monospace)' }}>
                      {selectedEvent.organizer}
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Event ID
                  </div>
                  <div style={{ color: 'var(--text-muted, #64748b)', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', marginTop: '2px' }}>
                    {selectedEvent.id}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm, 4px)',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    fontSize: '11px',
                    color: 'var(--brand-primary, #93c5fd)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Icons.Lock size={12} color="currentColor" />
                  <span>Normalized Domain Model: Zero OAuth tokens or private transport leaks.</span>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>
                Select an event from the timeline to view normalized parameters, location, and conflicts.
              </div>
            )}
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
              Autonomous Automation Recipes
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary, #94a3b8)', fontSize: '12px', lineHeight: 1.5 }}>
              Calendar events can trigger automated morning agendas, reminders, and conflict checks configured in the Automations tab via the <code>CONNECTOR_READ</code> job action.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
