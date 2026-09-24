# GRAVITAS — CALENDAR OPERATIONS FOUNDATION RUNTIME
## Wave 12J: Deterministic Schedule Plane

**Status**: PRODUCTION REFERENCE
**Phase**: WAVE 12J (Connector Kernel + Calendar Operations Foundation)
**Authority**: PERSONAL OS KERNEL

---

## 1. Executive Summary & Purpose

The Calendar Operations Foundation establishes the first real-world capability domain on top of the Gravitas Connector Kernel. It provides a deterministic single source of schedule truth for the Personal OS.

Key Guarantees:
1. **Zero LLM Daemons**: Calendar polling, conflict detection, and agenda compilation run deterministically with zero token costs or stochastic hallucinations.
2. **Unified Event Normalization**: Events from diverse providers (Google Calendar, mock fixtures, future CalDAV) conform to an immutable, normalized contract.
3. **Multi-Timezone Fidelity**: Preserves explicit IANA timezone identifiers alongside ISO-8601 timestamps.
4. **ActionExecutor Integration**: Bounded background jobs query schedule state through structured `CONNECTOR_READ` actions.

---

## 2. Normalized Domain Contracts (`packages/core/src/connectors.ts`)

```typescript
export interface CalendarSummary {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly timezone: string
  readonly primary?: boolean
  readonly accessRole?: 'reader' | 'writer' | 'owner'
}

export interface CalendarEventSummary {
  readonly id: string
  readonly calendarId: string
  readonly title: string
  readonly description?: string
  readonly start: string // ISO-8601 string
  readonly end: string   // ISO-8601 string
  readonly allDay?: boolean
  readonly timezone: string
  readonly status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'
  readonly location?: string
  readonly htmlLink?: string
  readonly attendeeCount?: number
  readonly organizer?: string
}

export interface CalendarEventsQuery {
  readonly calendarId?: string
  readonly timeMin?: string
  readonly timeMax?: string
  readonly maxResults?: number
  readonly pageToken?: string
  readonly singleEvents?: boolean
  readonly orderBy?: 'startTime' | 'updated'
}
```

---

## 3. Adapters & Providers

### 3.1 Google Calendar Adapter (`GoogleCalendarAdapter`)
- **Connector ID**: `calendar-google`
- **Capabilities**:
  - `calendar.calendars.read`: Enumerates user calendars via `GET https://www.googleapis.com/calendar/v3/users/me/calendarList`.
  - `calendar.events.read`: Queries paginated events with RFC 3339 time boundaries via `GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events`.
  - `calendar.event.read`: Retrieves an individual event by ID.
- **Protocol**: Native Node.js `fetch` without heavyweight client SDKs.
- **Token Management**: Transparently delegates OAuth token refresh to `CredentialBroker`.
- **Fault Handling**: Maps HTTP 401/403/404/429/500 into structured `ConnectorError` codes (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `PROVIDER_FAULT`).

### 3.2 Deterministic Mock Calendar Provider (`MockCalendarProvider`)
- **Connector ID**: `calendar-mock`
- **Purpose**: Provides offline, reproducible fixtures for unit testing, CI pipelines, and visual QA without external network calls.
- **Fixtures**: Preloaded with realistic executive schedules across UTC, America/New_York, Europe/London, and Asia/Tokyo.
- **Simulated Fault Injection**: Supports programmatic injection of 401 Unauthorized, 403 Forbidden, 429 Rate Limited, 500 Provider Fault, and expired access tokens.

---

## 4. Background Automations via `CONNECTOR_READ`

The Personal OS scheduler leverages the connector kernel to run periodic deterministic tasks without human intervention:

```
               [ JobScheduler ]
                      |
           Triggers cron or interval
                      v
              [ JobRunner ]
                      |
             Executes JobAction
                      v
             [ ActionExecutor ]
                      |
            Type: CONNECTOR_READ
                      |
             [ ConnectorRegistry ]
                      |
           Resolves 'calendar.events.read'
                      v
           [ CalendarAdapter.execute() ]
                      |
          Emits Notification if needed
                      v
             [ NotificationBus ]
```

### Seeded Production Jobs
1. **`job-calendar-agenda`** ("Morning Agenda Summary"):
   - Trigger: Daily CRON (`0 8 * * *`)
   - Action: `CONNECTOR_READ` -> `calendar.events.read` on `primary` calendar.
   - Autonomy: L2 (Autonomous Read).
2. **`job-calendar-reminder`** ("Calendar Event Reminder"):
   - Trigger: 15-minute interval (`900s`)
   - Action: `CONNECTOR_READ` -> `calendar.events.read`.
   - Autonomy: L2.
3. **`job-calendar-conflict-check`** ("Calendar Conflict Detection"):
   - Trigger: Hourly interval (`3600s`)
   - Action: `CONNECTOR_READ` -> scans upcoming window for overlapping bookings.
   - Autonomy: L2.

---

## 5. Web UI & Presentation Layer

- **Calendar View (`apps/web/src/features/calendar/CalendarView.tsx`)**:
  - Provides interactive multi-calendar selection.
  - Quick filters: `ALL`, `TODAY`, `UPCOMING`.
  - Chronological timeline with status badges, attendee counts, and locations.
  - Event Inspector detail panel displaying exact timing and organizer metadata.
- **TopBar & Command Palette**:
  - Dedicated `CALENDAR` view tab.
  - Command palette shortcut `Ctrl+7` / `Cmd+7`.
